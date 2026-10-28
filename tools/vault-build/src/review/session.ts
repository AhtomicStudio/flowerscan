// `pnpm vault:review`: the founder verification loop (docs/04 "Founder review workflow", T-029).
// Everything that touches the terminal, the clock or the disk is injected, so tests drive it with
// scripted answers. The TTY guard has no bypass: only a person at a terminal can verify notes.
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { NODE_KINDS, type NodeKind, parseNote } from "@flowerscan/core";
import { type CliEnv, defaultEnv } from "../cli";
import { compileVault } from "../compile";
import { listVaultFiles, readDataFile, VaultPathError } from "../fs-io";
import { renderSummary } from "../report";
import { parseFrontmatterYaml, parseYaml } from "../yaml";
import { type Approval, approveNote, checkApproved, reviewerProblem } from "./approve";
import { KEYS_LINE, renderCard, renderSessionSummary } from "./card";
import { addFlag } from "./flags";
import {
  buildQueue,
  filterQueue,
  type PrecheckFile,
  type ReviewItem,
  type ReviewNote,
  readyStubs,
  VERDICT_FILTERS,
  type VerdictFilter,
} from "./queue";

export const NOT_A_PERSON_MESSAGE = [
  "vault:review: only a person can verify notes.",
  "It needs an interactive terminal (stdin and stdout must both be a TTY), so agents, scripts and CI can't",
  "use it. Run `pnpm vault:review` yourself in a terminal window.",
].join("\n");

/** The terminal. `ask` resolves null when input ends (Ctrl+D / Ctrl+Z, or a closed stream). */
export interface ReviewIO {
  readonly stdinIsTTY: boolean;
  readonly stdoutIsTTY: boolean;
  print(text: string): void;
  ask(prompt: string): Promise<string | null>;
  /** Best effort: opens an http(s) URL in the default browser. Never throws. */
  openUrl(url: string): void;
}

/** File access for notes, pre-checks and flags. `readText`/`readDir` return null for a missing path. */
export interface ReviewFiles {
  readBytes(path: string): Promise<Uint8Array>;
  readText(path: string): Promise<string | null>;
  writeFile(path: string, data: Uint8Array | string): Promise<void>;
  readDir(path: string): Promise<string[] | null>;
}

export interface ReviewDeps {
  readonly io: ReviewIO;
  readonly files: ReviewFiles;
  /** Today as `YYYY-MM-DD` (local date). */
  readonly today: () => string;
  /** The default reviewer name (`git config user.name`), or null. */
  readonly defaultReviewer: () => Promise<string | null>;
  readonly sha256: (bytes: Uint8Array) => string;
  readonly env?: CliEnv;
}

export interface ReviewOptions {
  readonly all: boolean;
  readonly approveReadyStubs: boolean;
  readonly kind: NodeKind | null;
  readonly verdict: VerdictFilter | null;
  readonly ids: readonly string[];
  readonly vault: string;
  readonly taxonomy: string;
  /** Folder holding `precheck/` and `flags/` (default data/review). */
  readonly review: string;
}

export const REVIEW_USAGE = [
  "Usage: pnpm vault:review [options]",
  "  --all                   include notes a founder already reviewed",
  "  --kind <kind>           landrace, strain or cross",
  `  --verdict <verdict>     pre-check verdict: ${VERDICT_FILTERS.join(", ")}`,
  "  --id <id>               only this note (repeat, or separate ids with commas)",
  "  --approve-ready-stubs   approve every unreviewed stub with a current `ready` pre-check, after one typed confirmation",
  "  --vault <dir>           vault folder (default data/vault)",
  "  --taxonomy <dir>        folder with taxonomy.yaml and banned.yaml (default data/taxonomy)",
  "  --review <dir>          folder with precheck/ and flags/ (default data/review)",
  `Keys (type one, then Enter): ${KEYS_LINE}`,
].join("\n");

const VALUE_FLAGS = ["--kind", "--verdict", "--id", "--vault", "--taxonomy", "--review"] as const;
type ValueFlag = (typeof VALUE_FLAGS)[number];

/** Parses arguments. Returns an error message instead of throwing. */
export function parseReviewArgs(argv: readonly string[], env: CliEnv): ReviewOptions | string {
  const args = argv.filter((arg) => arg !== "--");
  let all = false;
  let approveReadyStubs = false;
  const values: Partial<Record<Exclude<ValueFlag, "--id">, string>> = {};
  const ids: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i] as string;
    if (arg === "--all") {
      all = true;
      continue;
    }
    if (arg === "--approve-ready-stubs") {
      approveReadyStubs = true;
      continue;
    }
    const [flag, inline] = arg.includes("=")
      ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)]
      : [arg, undefined];
    if (!(VALUE_FLAGS as readonly string[]).includes(flag)) return `unknown option "${arg}"`;
    const value = inline ?? args[i + 1];
    if (inline === undefined) i += 1;
    if (value === undefined || value === "" || value.startsWith("--"))
      return `${flag} needs a value`;
    if (flag === "--id") ids.push(...value.split(",").filter((id) => id !== ""));
    else values[flag as Exclude<ValueFlag, "--id">] = value;
  }
  const kind = values["--kind"] ?? null;
  if (kind !== null && !(NODE_KINDS as readonly string[]).includes(kind)) {
    return `--kind must be one of ${NODE_KINDS.join(", ")} (got "${kind}")`;
  }
  const verdict = values["--verdict"] ?? null;
  if (verdict !== null && !(VERDICT_FILTERS as readonly string[]).includes(verdict)) {
    return `--verdict must be one of ${VERDICT_FILTERS.join(", ")} (got "${verdict}")`;
  }
  if (approveReadyStubs && (all || verdict !== null)) {
    return "--approve-ready-stubs takes only unreviewed notes with a current ready pre-check: drop --all and --verdict";
  }
  const path = (flag: "--vault" | "--taxonomy" | "--review", fallback: string) => {
    const given = values[flag];
    return given === undefined ? join(env.repoRoot, fallback) : resolve(env.cwd, given);
  };
  return {
    all,
    approveReadyStubs,
    kind: kind as NodeKind | null,
    verdict: verdict as VerdictFilter | null,
    ids,
    vault: path("--vault", join("data", "vault")),
    taxonomy: path("--taxonomy", join("data", "taxonomy")),
    review: path("--review", "data/review"),
  };
}

/** How a path is shown: repo-relative with `/`, or absolute when outside the repo (as in cli.ts). */
const display = (path: string, repoRoot: string) => {
  const rel = relative(repoRoot, path);
  if (rel === "") return ".";
  return (rel.startsWith("..") || isAbsolute(rel) ? path : rel).split(sep).join("/");
};

const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

/** Reads the vault, compiles it with every status shipped, and builds the queue. Null after printing errors. */
async function loadQueue(
  options: ReviewOptions,
  deps: ReviewDeps,
  env: CliEnv,
): Promise<ReviewItem[] | null> {
  const { io, files } = deps;
  let vaultFiles: Awaited<ReturnType<typeof listVaultFiles>>;
  try {
    vaultFiles = await listVaultFiles(options.vault);
  } catch (error) {
    io.print(
      `vault:review: ${error instanceof VaultPathError ? error.message : `can't read the vault ${display(options.vault, env.repoRoot)}`}`,
    );
    return null;
  }
  const taxonomyFile = (name: string) =>
    readDataFile(join(options.taxonomy, name), display(join(options.taxonomy, name), env.repoRoot));
  const [taxonomy, banned] = await Promise.all([
    taxonomyFile("taxonomy.yaml"),
    taxonomyFile("banned.yaml"),
  ]);
  const vaultLabel = display(options.vault, env.repoRoot);
  const result = compileVault({
    notes: vaultFiles,
    vaultLabel,
    taxonomy,
    banned,
    includeUnverified: true,
    parseYaml: parseFrontmatterYaml,
  });
  if (result.data === null) {
    const summary = renderSummary({ command: "check", result, build: null, diff: null });
    io.print(`${summary}\nvault:review: fix the errors above first (pnpm vault:check).`);
    return null;
  }

  const notes: ReviewNote[] = [];
  for (const { path } of vaultFiles) {
    const bytes = await files.readBytes(join(options.vault, path));
    let text: string;
    try {
      text = decoder.decode(bytes);
    } catch {
      io.print(`vault:review: ${vaultLabel}/${path} isn't valid UTF-8: fix it first.`);
      return null;
    }
    const parsed = parseNote(text, parseFrontmatterYaml);
    if (!parsed.ok || parsed.value.frontmatter.kind === "breeder") continue;
    notes.push({
      path,
      file: `${vaultLabel}/${path}`,
      text,
      sha256: deps.sha256(bytes),
      note: parsed.value.frontmatter,
    });
  }

  const precheckDir = join(options.review, "precheck");
  const prechecks = new Map<string, PrecheckFile>();
  for (const name of (await files.readDir(precheckDir)) ?? []) {
    if (!name.endsWith(".yaml")) continue;
    const id = name.slice(0, -".yaml".length);
    const file = display(join(precheckDir, name), env.repoRoot);
    const text = (await files.readText(join(precheckDir, name))) ?? "";
    try {
      prechecks.set(id, { id, file, data: parseYaml(text) });
    } catch (error) {
      prechecks.set(id, {
        id,
        file,
        data: undefined,
        error: `invalid YAML: ${(error as Error).message}`,
      });
    }
  }
  const known = new Set(notes.map((entry) => entry.note.id));
  const orphans = [...prechecks.keys()].filter((id) => !known.has(id)).sort();
  if (orphans.length > 0) {
    io.print(`Note: pre-check records for ids not in the vault (ignored): ${orphans.join(", ")}`);
  }
  return buildQueue({
    notes,
    graph: result.data.graph,
    lineages: result.data.lineages,
    prechecks,
  });
}

/** Asks for the reviewer's name and confirms it. Null when input ends. */
async function askReviewer(deps: ReviewDeps, today: string): Promise<string | null> {
  const { io } = deps;
  const fallback = await deps.defaultReviewer();
  for (;;) {
    const answer = await io.ask(`Reviewer name${fallback === null ? "" : ` [${fallback}]`}: `);
    if (answer === null) return null;
    const name = answer.trim() === "" ? (fallback ?? "") : answer.trim();
    const problem = reviewerProblem(name);
    if (problem !== null) {
      io.print(`Please type your name: ${problem}.`);
      continue;
    }
    const confirm = await io.ask(
      `Approvals will record reviewed_by: "${name}", reviewed_at: ${today}. Is that you? [y/n]: `,
    );
    if (confirm === null) return null;
    if (confirm.trim().toLowerCase() === "y") return name;
  }
}

type Outcome = { readonly ok: true } | { readonly ok: false; readonly problems: readonly string[] };

/** Approves one note on disk: checks it didn't change, writes, re-reads, re-validates, reverts on failure. */
async function approveOnDisk(
  item: ReviewItem,
  approval: Approval,
  options: ReviewOptions,
  deps: ReviewDeps,
): Promise<Outcome> {
  const path = join(options.vault, item.path);
  const bytes = await deps.files.readBytes(path);
  if (deps.sha256(bytes) !== item.sha256) {
    return {
      ok: false,
      problems: ["the note changed on disk after the review started: run vault:review again"],
    };
  }
  const result = approveNote(item.text, approval, parseFrontmatterYaml);
  if (!result.ok) return result;
  await deps.files.writeFile(path, result.text);
  let problems: string[];
  try {
    problems = checkApproved(
      item.text,
      decoder.decode(await deps.files.readBytes(path)),
      approval,
      parseFrontmatterYaml,
    );
  } catch (error) {
    problems = [`can't read the note back (${(error as Error).message})`];
  }
  if (problems.length === 0) return { ok: true };
  await deps.files.writeFile(path, bytes);
  return { ok: false, problems: [...problems, "the note was reverted to its original bytes"] };
}

async function writeFlag(
  item: ReviewItem,
  reviewer: string,
  comment: string,
  options: ReviewOptions,
  deps: ReviewDeps,
): Promise<Outcome & { file?: string }> {
  const dir = join(options.review, "flags");
  const path = join(dir, `${item.note.id}.yaml`);
  const existing = await deps.files.readText(path);
  const result = addFlag(
    existing,
    item.note.id,
    { reviewer, date: deps.today(), comment },
    parseYaml,
  );
  if (!result.ok) return { ok: false, problems: [result.problem] };
  await deps.files.writeFile(path, result.text);
  return { ok: true, file: display(path, (deps.env ?? defaultEnv()).repoRoot) };
}

interface Tally {
  reviewer: string;
  approved: string[];
  flagged: string[];
  skipped: string[];
  failed: string[];
  notSeen: number;
}

async function interactive(
  queue: readonly ReviewItem[],
  approval: Approval,
  options: ReviewOptions,
  deps: ReviewDeps,
  tally: Tally,
): Promise<void> {
  const { io } = deps;
  for (const [index, item] of queue.entries()) {
    const dryRun = approveNote(item.text, approval, parseFrontmatterYaml);
    io.print(
      `\n${renderCard(item, {
        position: index + 1,
        total: queue.length,
        approveProblems: dryRun.ok ? [] : dryRun.problems,
      })}`,
    );
    for (;;) {
      const answer = await io.ask(`${KEYS_LINE} > `);
      const key = answer === null ? "q" : answer.trim().toLowerCase();
      if (key === "q") {
        tally.notSeen = queue.length - index;
        return;
      }
      if (key === "s") {
        tally.skipped.push(item.note.id);
        break;
      }
      if (key === "y") {
        const outcome = await approveOnDisk(item, approval, options, deps);
        if (outcome.ok) {
          tally.approved.push(item.note.id);
          io.print(`Approved ${item.note.id}: ${item.file}`);
          break;
        }
        io.print(`Not approved:\n${outcome.problems.map((p) => `  ${p}`).join("\n")}`);
        if (!tally.failed.includes(item.note.id)) tally.failed.push(item.note.id);
        continue;
      }
      if (key === "f") {
        const comment = await io.ask("Comment for the curator (empty to cancel): ");
        if (comment === null || comment.trim() === "") {
          io.print("Not flagged.");
          continue;
        }
        const outcome = await writeFlag(item, approval.reviewer, comment.trim(), options, deps);
        if (outcome.ok) {
          tally.flagged.push(item.note.id);
          io.print(`Flagged ${item.note.id}: ${outcome.file}`);
          break;
        }
        io.print(`Not flagged: ${outcome.problems.join("; ")}`);
        continue;
      }
      if (key === "o") {
        const urls = (item.note.sources ?? []).flatMap((source) =>
          source.url === undefined || source.url === null ? [] : [source.url],
        );
        for (const url of urls) io.openUrl(url);
        io.print(
          urls.length === 0
            ? "No source URLs (print sources only)."
            : `Opened ${urls.length} source URL(s).`,
        );
        continue;
      }
      io.print("Type y, s, f, o or q, then Enter.");
    }
  }
}

async function batch(
  queue: readonly ReviewItem[],
  approval: Approval,
  options: ReviewOptions,
  deps: ReviewDeps,
  tally: Tally,
): Promise<void> {
  const { io } = deps;
  const stubs = readyStubs(queue);
  const approvable: ReviewItem[] = [];
  for (const item of stubs) {
    const dryRun = approveNote(item.text, approval, parseFrontmatterYaml);
    if (dryRun.ok) approvable.push(item);
    else io.print(`Skipped ${item.note.id}: ${dryRun.problems.join("; ")}`);
  }
  if (approvable.length === 0) {
    io.print("No unreviewed stubs with a current ready pre-check.");
    return;
  }
  io.print(`Stubs (only unknown parents) with a current ready pre-check (${approvable.length}):`);
  for (const item of approvable) {
    const record = item.precheck.state === "current" ? item.precheck.record : null;
    io.print(
      `  ${item.note.name} (${item.note.id}): ${item.note.reported_type}, ${item.note.verification}, checked ${record?.checked_at ?? "?"}`,
    );
  }
  const phrase = `approve ${approvable.length}`;
  const answer = await io.ask(`Type "${phrase}" to approve all of them (anything else cancels): `);
  if (answer === null || answer.trim() !== phrase) {
    io.print("Cancelled: nothing was written.");
    tally.notSeen = approvable.length;
    return;
  }
  for (const item of approvable) {
    const outcome = await approveOnDisk(item, approval, options, deps);
    if (outcome.ok) tally.approved.push(item.note.id);
    else {
      tally.failed.push(item.note.id);
      io.print(`Not approved ${item.note.id}: ${outcome.problems.join("; ")}`);
    }
  }
}

/** Runs a review session. Returns the exit code: 0 done, 1 refused or failed, 2 usage. */
export async function runReview(argv: readonly string[], deps: ReviewDeps): Promise<number> {
  const { io } = deps;
  // The guard comes first and has no bypass (AGENTS.md rule 3: only humans verify).
  if (!io.stdinIsTTY || !io.stdoutIsTTY) {
    io.print(NOT_A_PERSON_MESSAGE);
    return 1;
  }
  const env = deps.env ?? defaultEnv();
  const options = parseReviewArgs(argv, env);
  if (typeof options === "string") {
    io.print(`vault:review: ${options}\n${REVIEW_USAGE}`);
    return 2;
  }
  const items = await loadQueue(options, deps, env);
  if (items === null) return 1;
  const queue = filterQueue(items, {
    all: options.all,
    kind: options.kind,
    verdict: options.verdict,
    ids: options.ids,
  });
  const unknownIds = options.ids.filter((id) => !items.some((item) => item.note.id === id));
  if (unknownIds.length > 0) io.print(`No genetic node with id: ${unknownIds.join(", ")}`);
  if (queue.length === 0) {
    const reviewed = items.filter((item) => item.reviewed).length;
    io.print(
      `Nothing to review: no note matches (${items.length} notes, ${reviewed} already reviewed${options.all ? "" : "; --all includes them"}).`,
    );
    return 0;
  }
  io.print(
    options.approveReadyStubs
      ? `Batch mode: ${queue.length} notes match the filters.`
      : `${queue.length} notes to review, highest impact first. ${REVIEW_USAGE.split("\n").at(-1)}`,
  );

  const today = deps.today();
  const reviewer = await askReviewer(deps, today);
  if (reviewer === null) {
    io.print("vault:review: no reviewer name, nothing was written.");
    return 1;
  }
  const approval: Approval = { reviewer, today };
  const tally: Tally = { reviewer, approved: [], flagged: [], skipped: [], failed: [], notSeen: 0 };
  if (options.approveReadyStubs) await batch(queue, approval, options, deps, tally);
  else await interactive(queue, approval, options, deps, tally);
  io.print(`\n${renderSessionSummary(tally)}`);
  return options.approveReadyStubs && tally.failed.length > 0 ? 1 : 0;
}
