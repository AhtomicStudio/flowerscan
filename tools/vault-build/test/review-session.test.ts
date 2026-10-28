// vault:review end to end with injected IO, on a temp vault (T-029). Every name is fictional.
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { REVIEW_KEYS, withoutKeys } from "../src/review/approve";
import { localToday, nodeFiles, nodeIO } from "../src/review/node-io";
import {
  NOT_A_PERSON_MESSAGE,
  parseReviewArgs,
  type ReviewDeps,
  type ReviewFiles,
  runReview,
} from "../src/review/session";
import { env, FIXTURE_TAXONOMY, REPO_ROOT, tempDir } from "./helpers";

const temps: string[] = [];
afterEach(async () => {
  await Promise.all(temps.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const sha256 = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");

interface NoteSpec {
  kind?: string;
  id: string;
  name: string;
  parents: string[];
  derivation?: string;
  reportedType?: string;
  verification?: string;
  reviewed?: boolean;
  supports?: string[];
  noSources?: boolean;
}

/** A note in the vault templates' style: block YAML, one key per line. */
function note(spec: NoteSpec): string {
  const lines = [
    "---",
    `kind: ${spec.kind ?? "strain"}`,
    `id: ${spec.id}`,
    "schema_version: 1",
    `name: "${spec.name}"`,
    "aliases: []",
    spec.parents.length === 0 ? "parents: []" : "parents:",
    ...spec.parents.map((parent) => (parent === "unknown" ? "  - unknown" : `  - "[[${parent}]]"`)),
    `reported_type: ${spec.reportedType ?? "unknown"}`,
    ...(spec.derivation === undefined ? [] : [`derivation: ${spec.derivation}`]),
    ...(spec.noSources
      ? ["sources: []"]
      : [
          "sources:",
          `  - url: https://example.org/${spec.id}?a=1&b=2`,
          `    title: "Fictional: ${spec.name}"`,
          "    retrieved: 2026-10-20",
          `    supports: [${(spec.supports ?? ["parents", "reported_type"]).join(", ")}]`,
        ]),
    `verification: ${spec.verification ?? "unverified"}`,
    ...(spec.reviewed ? ['reviewed_by: "Earlier Founder"', "reviewed_at: 2026-10-25"] : []),
    "created: 2026-10-20",
    "updated: 2026-10-21",
    "---",
    "",
    `# ${spec.name}`,
    "",
    "Curator notes in the founders' own words.",
    "",
  ];
  return lines.join("\n");
}

const NOTES: Record<string, NoteSpec> = {
  "landraces/Northvale Highland.md": {
    kind: "landrace",
    id: "northvale-highland",
    name: "Northvale Highland",
    parents: [],
    reportedType: "indica",
    supports: ["reported_type"],
  },
  "strains/Quiet Fern.md": {
    id: "quiet-fern",
    name: "Quiet Fern",
    parents: ["Northvale Highland", "unknown"],
    reportedType: "indica-dominant",
  },
  "strains/Fern Child.md": {
    id: "fern-child",
    name: "Fern Child",
    parents: ["Quiet Fern"],
    derivation: "pheno",
  },
  "strains/Stub One.md": {
    id: "stub-one",
    name: "Stub One",
    parents: ["unknown"],
    reportedType: "sativa",
    supports: ["reported_type"],
  },
  "strains/Stub Two.md": {
    id: "stub-two",
    name: "Stub Two",
    parents: ["unknown"],
    reportedType: "indica",
    supports: ["reported_type"],
  },
  "strains/Unsourced Stub.md": {
    id: "unsourced-stub",
    name: "Unsourced Stub",
    parents: ["unknown"],
    reportedType: "indica",
    noSources: true,
  },
  "strains/Disputed Fern.md": {
    id: "disputed-fern",
    name: "Disputed Fern",
    parents: ["Northvale Highland", "Stub One"],
    verification: "disputed",
  },
  "strains/Reviewed Fern.md": {
    id: "reviewed-fern",
    name: "Reviewed Fern",
    parents: ["unknown"],
    verification: "verified",
    reviewed: true,
    supports: [],
  },
};

function precheckYaml(id: string, hash: string, verdict = "ready"): string {
  return [
    `id: ${id}`,
    `note_sha256: ${hash}`,
    "checked_at: 2026-10-27",
    "checker: fact-checker agent",
    `verdict: ${verdict}`,
    "claims: []",
    'summary: "The cited source names the strain."',
    "",
  ].join("\n");
}

interface Setup {
  root: string;
  vault: string;
  review: string;
  read(path: string): Promise<string>;
}

async function setup(extra: Record<string, string> = {}): Promise<Setup> {
  const root = await tempDir();
  temps.push(root);
  const vault = join(root, "vault");
  const review = join(root, "review");
  const texts: Record<string, string> = {};
  for (const [path, spec] of Object.entries(NOTES)) texts[path] = note(spec);
  Object.assign(texts, extra);
  for (const [path, text] of Object.entries(texts)) {
    await mkdir(join(vault, path, ".."), { recursive: true });
    await writeFile(join(vault, path), text);
  }
  const precheck = join(review, "precheck");
  await mkdir(precheck, { recursive: true });
  const hashOf = (path: string) => sha256(texts[path] as string);
  await writeFile(
    join(precheck, "stub-one.yaml"),
    precheckYaml("stub-one", hashOf("strains/Stub One.md")),
  );
  await writeFile(join(precheck, "stub-two.yaml"), precheckYaml("stub-two", "f".repeat(64)));
  await writeFile(
    join(precheck, "unsourced-stub.yaml"),
    precheckYaml("unsourced-stub", hashOf("strains/Unsourced Stub.md")),
  );
  await writeFile(
    join(precheck, "quiet-fern.yaml"),
    precheckYaml("quiet-fern", hashOf("strains/Quiet Fern.md"), "check"),
  );
  await writeFile(join(precheck, "northvale-highland.yaml"), "id: [broken");
  await writeFile(join(precheck, "ghost.yaml"), precheckYaml("ghost", "c".repeat(64)));
  await writeFile(join(precheck, "README.txt"), "not a record");
  return { root, vault, review, read: (path) => readFile(join(vault, path), "utf8") };
}

type Answer = string | null | (() => Promise<string> | string);

interface Harness {
  deps: ReviewDeps;
  printed: string[];
  prompts: string[];
  opened: string[];
  output(): string;
}

function harness(
  answers: Answer[],
  options: { tty?: [boolean, boolean]; files?: ReviewFiles; reviewer?: string | null } = {},
): Harness {
  const printed: string[] = [];
  const prompts: string[] = [];
  const opened: string[] = [];
  const [stdinIsTTY, stdoutIsTTY] = options.tty ?? [true, true];
  const queue = [...answers];
  const deps: ReviewDeps = {
    io: {
      stdinIsTTY,
      stdoutIsTTY,
      print: (text) => {
        printed.push(text);
      },
      ask: async (prompt) => {
        prompts.push(prompt);
        if (queue.length === 0) return null;
        const next = queue.shift() as Answer;
        return typeof next === "function" ? await next() : next;
      },
      openUrl: (url) => {
        opened.push(url);
      },
    },
    files: options.files ?? nodeFiles,
    today: () => "2026-10-27",
    defaultReviewer: async () =>
      options.reviewer === undefined ? "Fictional Founder" : options.reviewer,
    sha256,
    env,
  };
  return { deps, printed, prompts, opened, output: () => printed.join("\n") };
}

const args = (s: Setup, ...extra: string[]) => [
  "--vault",
  s.vault,
  "--taxonomy",
  FIXTURE_TAXONOMY,
  "--review",
  s.review,
  ...extra,
];

/** Files that throw on any access: proves the guard refuses before touching anything. */
const untouchable: ReviewFiles = {
  readBytes: () => Promise.reject(new Error("touched")),
  readText: () => Promise.reject(new Error("touched")),
  writeFile: () => Promise.reject(new Error("touched")),
  readDir: () => Promise.reject(new Error("touched")),
};

describe("the TTY guard: only a person can verify", () => {
  for (const tty of [
    [false, false],
    [false, true],
    [true, false],
  ] as [boolean, boolean][]) {
    it(`exits 1 without touching anything when stdin/stdout TTY = ${tty.join("/")}`, async () => {
      const h = harness(["Fictional Founder", "y", "y"], { tty, files: untouchable });
      const code = await runReview(["--approve-ready-stubs", "--all"], h.deps);
      expect(code).toBe(1);
      expect(h.output()).toBe(NOT_A_PERSON_MESSAGE);
      expect(h.output()).toContain("only a person can verify notes");
      expect(h.prompts).toEqual([]);
    });
  }

  it("has no option that skips it", () => {
    for (const flag of ["--yes", "--force", "--no-tty", "--ci", "--non-interactive"]) {
      expect(parseReviewArgs([flag], env)).toBe(`unknown option "${flag}"`);
    }
  });
});

describe("arguments", () => {
  it("parses filters and paths", () => {
    const options = parseReviewArgs(
      [
        "--",
        "--all",
        "--kind",
        "landrace",
        "--verdict=stale",
        "--id",
        "a,b",
        "--id=c",
        "--vault",
        "v",
      ],
      env,
    );
    expect(options).toMatchObject({
      all: true,
      approveReadyStubs: false,
      kind: "landrace",
      verdict: "stale",
      ids: ["a", "b", "c"],
      vault: join(env.cwd, "v"),
      taxonomy: join(REPO_ROOT, "data", "taxonomy"),
      review: join(REPO_ROOT, "data", "review"),
    });
  });

  it("rejects bad values with usage (exit 2)", async () => {
    expect(parseReviewArgs(["--kind", "breeder"], env)).toContain("--kind must be one of");
    expect(parseReviewArgs(["--verdict", "ok"], env)).toContain("--verdict must be one of");
    expect(parseReviewArgs(["--id"], env)).toBe("--id needs a value");
    expect(parseReviewArgs(["--id", "--all"], env)).toBe("--id needs a value");
    expect(parseReviewArgs(["--approve-ready-stubs", "--all"], env)).toContain("drop --all");
    expect(parseReviewArgs(["--approve-ready-stubs", "--verdict", "ready"], env)).toContain(
      "drop --all and --verdict",
    );
    const h = harness([]);
    expect(await runReview(["--kind", "x"], h.deps)).toBe(2);
    expect(h.output()).toContain("Usage: pnpm vault:review");
  });
});

describe("loading", () => {
  it("refuses a vault with errors, like vault:check (verified without reviewed_by is one)", async () => {
    const s = await setup({
      "strains/Bad Fern.md": note({
        id: "bad-fern",
        name: "Bad Fern",
        parents: ["unknown"],
        verification: "verified",
        supports: [],
      }),
    });
    const h = harness([]);
    expect(await runReview(args(s), h.deps)).toBe(1);
    expect(h.output()).toContain("reviewed_by");
    expect(h.output()).toContain("fix the errors above first");
    expect(h.prompts).toEqual([]);
  });

  it("reports an unreadable vault", async () => {
    const h = harness([]);
    expect(await runReview(["--vault", join(REPO_ROOT, "no-such-vault")], h.deps)).toBe(1);
    expect(h.output()).toContain("can't read the vault");
  });

  it("says when nothing matches, without asking for a name", async () => {
    const s = await setup();
    const h = harness([]);
    expect(await runReview(args(s, "--id", "nope"), h.deps)).toBe(0);
    expect(h.output()).toContain("No genetic node with id: nope");
    expect(h.output()).toContain("Nothing to review");
    expect(h.prompts).toEqual([]);
  });

  it("stops when no reviewer name is given", async () => {
    const s = await setup();
    const h = harness([], { reviewer: null });
    expect(await runReview(args(s), h.deps)).toBe(1);
    expect(h.output()).toContain("no reviewer name, nothing was written");
  });
});

describe("an interactive session", () => {
  it("asks and confirms the name, then approves, flags, opens, skips and quits", async () => {
    const s = await setup();
    const before = await s.read("landraces/Northvale Highland.md");
    const h = harness([
      "", // default name
      "n", // not me
      "  ", // blank, no: falls back to the default again
      "y",
      "y", // approve Northvale Highland
      "o", // open Quiet Fern's sources
      "f",
      "", // empty comment: not flagged
      "f",
      "Which unknown parent? Check the breeder page.",
      "??", // unknown key
      "s", // skip Stub One
      "q",
    ]);
    const code = await runReview(args(s), h.deps);
    expect(code).toBe(0);
    expect(h.prompts.slice(0, 2)).toEqual([
      "Reviewer name [Fictional Founder]: ",
      'Approvals will record reviewed_by: "Fictional Founder", reviewed_at: 2026-10-27. Is that you? [y/n]: ',
    ]);
    const out = h.output();
    expect(out).toContain("Note: pre-check records for ids not in the vault (ignored): ghost");
    expect(out).toContain("=== 1/7  Northvale Highland  (northvale-highland)");
    expect(out).toContain("Pre-check: INVALID record");
    expect(out).toContain("Impact: 3 descendants; approving ships this note.");

    // Approve: the four review lines change, every other byte stays.
    const after = await s.read("landraces/Northvale Highland.md");
    expect(after).toBe(
      before.replace(
        "verification: unverified\ncreated: 2026-10-20\nupdated: 2026-10-21\n",
        'verification: verified\nreviewed_by: "Fictional Founder"\nreviewed_at: 2026-10-27\ncreated: 2026-10-20\nupdated: 2026-10-27\n',
      ),
    );
    expect(withoutKeys(after, REVIEW_KEYS)).toBe(withoutKeys(before, REVIEW_KEYS));

    // Quiet Fern: second in the queue, opened then flagged.
    expect(out).toContain("=== 2/7  Quiet Fern  (quiet-fern)");
    expect(out).toContain("Pre-check: CHECK (fact-checker agent, 2026-10-27)");
    expect(h.opened).toEqual(["https://example.org/quiet-fern?a=1&b=2"]);
    expect(out).toContain("Not flagged.");
    const flag = await readFile(join(s.review, "flags", "quiet-fern.yaml"), "utf8");
    expect(flag).toBe(
      "id: quiet-fern\nflags:\n  - reviewer: Fictional Founder\n    date: 2026-10-27\n    comment: Which unknown parent? Check the breeder page.\n",
    );
    expect(await s.read("strains/Quiet Fern.md")).toBe(
      note(NOTES["strains/Quiet Fern.md"] as NoteSpec),
    );

    expect(out).toContain("Type y, s, f, o or q, then Enter.");
    expect(out).toContain(
      "Session for Fictional Founder: 1 approved, 1 flagged, 1 skipped, 4 left.",
    );
    // Reviewed Fern is already reviewed, so it isn't in the queue without --all.
    expect(out).not.toContain("(reviewed-fern)");
  });

  it("keeps a disputed note disputed and shows a stale pre-check", async () => {
    const s = await setup();
    const h = harness(["Other Founder", "y", "y", "q"]);
    await runReview(args(s, "--id", "disputed-fern"), h.deps);
    const text = await s.read("strains/Disputed Fern.md");
    expect(text).toContain(
      'verification: disputed\nreviewed_by: "Other Founder"\nreviewed_at: 2026-10-27\n',
    );
    const h2 = harness(["", "y", "s"]);
    await runReview(args(s, "--verdict", "stale"), h2.deps);
    expect(h2.output()).toContain("Stub Two");
    expect(h2.output()).toContain("| STALE: the note changed after this check");
  });

  it("refuses an approval the schema rejects and leaves the note alone", async () => {
    const s = await setup();
    const before = await s.read("strains/Unsourced Stub.md");
    const h = harness(["", "y", "y", "s"]);
    await runReview(args(s, "--id", "unsourced-stub"), h.deps);
    expect(h.output()).toContain("Can't approve as is:");
    expect(h.output()).toContain("Not approved:\n  sources: a verified node needs sources");
    expect(h.output()).toContain("1 failed");
    expect(await s.read("strains/Unsourced Stub.md")).toBe(before);
  });

  it("re-validates after writing and reverts to the original bytes on failure", async () => {
    const s = await setup();
    const path = join(s.vault, "strains", "Stub One.md");
    const before = await readFile(path);
    const corrupting: ReviewFiles = {
      ...nodeFiles,
      // A disk (or another program) that changes the bytes on their way out.
      writeFile: (target, data) =>
        nodeFiles.writeFile(
          target,
          typeof data === "string"
            ? data.replace("reported_type: sativa", "reported_type: indica")
            : data,
        ),
    };
    const h = harness(["", "y", "y", "q"], { files: corrupting });
    await runReview(args(s, "--id", "stub-one"), h.deps);
    expect(h.output()).toContain("a field other than the review fields changed");
    expect(h.output()).toContain("the note was reverted to its original bytes");
    expect((await readFile(path)).equals(before)).toBe(true);
  });

  it("won't approve a note that changed on disk after the session started", async () => {
    const s = await setup();
    const path = join(s.vault, "strains", "Stub One.md");
    const h = harness([
      "",
      "y",
      async () => {
        await writeFile(path, `${await readFile(path, "utf8")}\nA curator edit.\n`);
        return "y";
      },
      "q",
    ]);
    await runReview(args(s, "--id", "stub-one"), h.deps);
    expect(h.output()).toContain("the note changed on disk after the review started");
    expect(await readFile(path, "utf8")).toContain("verification: unverified");
  });

  it("won't overwrite an unreadable flag file", async () => {
    const s = await setup();
    await mkdir(join(s.review, "flags"), { recursive: true });
    await writeFile(join(s.review, "flags", "stub-one.yaml"), "id: [");
    const h = harness(["", "y", "f", "A comment", "q"]);
    await runReview(args(s, "--id", "stub-one"), h.deps);
    expect(h.output()).toContain("Not flagged: the flag file isn't valid YAML");
    expect(await readFile(join(s.review, "flags", "stub-one.yaml"), "utf8")).toBe("id: [");
  });

  it("treats the end of input as quit", async () => {
    const s = await setup();
    const h = harness(["", "y"]);
    expect(await runReview(args(s, "--kind", "landrace"), h.deps)).toBe(0);
    expect(h.output()).toContain("0 approved, 0 flagged, 0 skipped, 1 left.");
  });
});

describe("batch mode --approve-ready-stubs", () => {
  it("lists the ready stubs, needs the exact phrase, then approves them", async () => {
    const s = await setup();
    const cancelled = harness(["", "y", "approve 2"]);
    expect(await runReview(args(s, "--approve-ready-stubs"), cancelled.deps)).toBe(0);
    const out = cancelled.output();
    // Stub Two's pre-check is stale and Unsourced Stub can't be verified, so only Stub One is listed.
    expect(out).toContain("Skipped unsourced-stub: sources: a verified node needs sources");
    expect(out).toContain("Stubs (only unknown parents) with a current ready pre-check (1):");
    expect(out).toContain("  Stub One (stub-one): sativa, unverified, checked 2026-10-27");
    expect(out).not.toContain("Stub Two (stub-two)");
    expect(cancelled.prompts.at(-1)).toBe(
      'Type "approve 1" to approve all of them (anything else cancels): ',
    );
    expect(out).toContain("Cancelled: nothing was written.");
    expect(await s.read("strains/Stub One.md")).toContain("verification: unverified");

    const confirmed = harness(["", "y", "approve 1"]);
    expect(await runReview(args(s, "--approve-ready-stubs"), confirmed.deps)).toBe(0);
    expect(confirmed.output()).toContain("1 approved");
    const text = await s.read("strains/Stub One.md");
    expect(text).toContain(
      'verification: verified\nreviewed_by: "Fictional Founder"\nreviewed_at: 2026-10-27\n',
    );
    expect(withoutKeys(text, REVIEW_KEYS)).toBe(
      withoutKeys(note(NOTES["strains/Stub One.md"] as NoteSpec), REVIEW_KEYS),
    );

    // Its pre-check is now stale (the bytes changed) and it's reviewed: nothing is left.
    const again = harness(["", "y"]);
    await runReview(args(s, "--approve-ready-stubs"), again.deps);
    expect(again.output()).toContain("No unreviewed stubs with a current ready pre-check.");
  });

  it("exits 1 when an approval fails", async () => {
    const s = await setup();
    const failing: ReviewFiles = {
      ...nodeFiles,
      writeFile: (target, data) =>
        nodeFiles.writeFile(target, typeof data === "string" ? `${data}x: [` : data),
    };
    const h = harness(["", "y", "approve 1"], { files: failing });
    expect(await runReview(args(s, "--approve-ready-stubs"), h.deps)).toBe(1);
    expect(h.output()).toContain("Not approved stub-one");
    expect(await s.read("strains/Stub One.md")).toBe(
      note(NOTES["strains/Stub One.md"] as NoteSpec),
    );
  });
});

describe("node platform helpers", () => {
  it("formats the local date", () => {
    expect(localToday(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("returns null for missing files and folders", async () => {
    const missing = join(REPO_ROOT, "no-such-folder-t029");
    expect(await nodeFiles.readText(join(missing, "x.yaml"))).toBeNull();
    expect(await nodeFiles.readDir(missing)).toBeNull();
  });

  it("reports the test runner's stdio as not a terminal, and never asks", async () => {
    const io = nodeIO();
    // Vitest workers have no TTY, which is exactly the case the guard refuses.
    expect(io.stdinIsTTY && io.stdoutIsTTY).toBe(false);
    expect(await io.ask("?")).toBeNull();
    io.close();
  });
});
