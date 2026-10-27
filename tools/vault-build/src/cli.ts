import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { BuildManifestSchema } from "@flowerscan/core";
import { compileVault } from "./compile";
import { emitBuild } from "./emit";
import {
  listVaultFiles,
  readDataFile,
  readPreviousBuild,
  VaultPathError,
  writeBuild,
  writeText,
} from "./fs-io";
import { diffClassifications, renderReport, renderSummary } from "./report";
import { parseFrontmatterYaml } from "./yaml";

export type Command = "check" | "build";

export interface CliResult {
  exitCode: number;
  message: string;
}

export interface CliOptions {
  readonly command: Command;
  readonly includeUnverified: boolean;
  readonly vault: string;
  /** Folder holding taxonomy.yaml and banned.yaml. */
  readonly taxonomy: string;
  readonly out: string;
  readonly report: string;
  readonly builtAt: string | undefined;
}

export interface CliEnv {
  /** Relative paths in arguments resolve against this (pnpm's INIT_CWD: where the user ran the command). */
  readonly cwd: string;
  /** Defaults and message paths are relative to the repo root. */
  readonly repoRoot: string;
}

export const USAGE = [
  "Usage: vault-build <check|build> [options]",
  "  --include-unverified   ship unverified notes too (dev builds only)",
  "  --vault <dir>          vault folder (default data/vault)",
  "  --taxonomy <dir>       folder with taxonomy.yaml and banned.yaml (default data/taxonomy)",
  "  --out <dir>            output folder (default apps/web/public/data)",
  "  --report <file>        build report (default tools/vault-build/build-report.md)",
  "  --built-at <datetime>  ISO datetime for manifest built_at (default: latest note date, 00:00 UTC)",
].join("\n");

const REPO_ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..");

export function defaultEnv(): CliEnv {
  return { cwd: process.env.INIT_CWD ?? process.cwd(), repoRoot: REPO_ROOT };
}

const VALUE_FLAGS = ["--vault", "--taxonomy", "--out", "--report", "--built-at"] as const;
type ValueFlag = (typeof VALUE_FLAGS)[number];

/** Parses arguments. Returns an error message (shown with the usage) instead of throwing. */
export function parseArgs(argv: readonly string[], env: CliEnv): CliOptions | string {
  const [command, ...rest] = argv.filter((arg) => arg !== "--");
  if (command !== "check" && command !== "build")
    return command === undefined ? "missing command" : `unknown command "${command}"`;
  const values: Partial<Record<ValueFlag, string>> = {};
  let includeUnverified = false;
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i] as string;
    if (arg === "--include-unverified") {
      includeUnverified = true;
      continue;
    }
    const [flag, inline] = arg.includes("=")
      ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)]
      : [arg, undefined];
    if (!(VALUE_FLAGS as readonly string[]).includes(flag)) return `unknown option "${arg}"`;
    const value = inline ?? rest[i + 1];
    if (inline === undefined) i += 1;
    if (value === undefined || value === "") return `${flag} needs a value`;
    values[flag as ValueFlag] = value;
  }
  const builtAt = values["--built-at"];
  if (builtAt !== undefined && !BuildManifestSchema.shape.built_at.safeParse(builtAt).success) {
    return `--built-at must be an ISO datetime with an offset, e.g. 2026-10-27T00:00:00Z (got "${builtAt}")`;
  }
  const path = (flag: ValueFlag, fallback: string) => {
    const given = values[flag];
    return given === undefined ? join(env.repoRoot, fallback) : resolve(env.cwd, given);
  };
  return {
    command,
    includeUnverified,
    vault: path("--vault", join("data", "vault")),
    taxonomy: path("--taxonomy", join("data", "taxonomy")),
    out: path("--out", join("apps", "web", "public", "data")),
    report: path("--report", join("tools", "vault-build", "build-report.md")),
    builtAt,
  };
}

/** How a path is shown in messages: repo-relative with `/`, or absolute when outside the repo. */
function display(path: string, repoRoot: string): string {
  const rel = relative(repoRoot, path);
  if (rel === "") return ".";
  return (rel.startsWith("..") || isAbsolute(rel) ? path : rel).split(sep).join("/");
}

/** Runs `check` (validate only, writes nothing) or `build` (validate, compute, write output and report). */
export async function run(argv: readonly string[], env: CliEnv = defaultEnv()): Promise<CliResult> {
  const options = parseArgs(argv, env);
  if (typeof options === "string")
    return { exitCode: 2, message: `vault-build: ${options}\n${USAGE}` };

  let notes: Awaited<ReturnType<typeof listVaultFiles>>;
  try {
    notes = await listVaultFiles(options.vault);
  } catch (error) {
    const reason =
      error instanceof VaultPathError
        ? error.message
        : `can't read the vault ${display(options.vault, env.repoRoot)} (${(error as NodeJS.ErrnoException).code ?? error})`;
    return { exitCode: 1, message: `vault-build ${options.command}: ${reason}` };
  }
  const taxonomyFile = (name: string) =>
    readDataFile(join(options.taxonomy, name), display(join(options.taxonomy, name), env.repoRoot));
  const [taxonomy, banned] = await Promise.all([
    taxonomyFile("taxonomy.yaml"),
    taxonomyFile("banned.yaml"),
  ]);

  const result = compileVault({
    notes,
    vaultLabel: display(options.vault, env.repoRoot),
    taxonomy,
    banned,
    includeUnverified: options.includeUnverified,
    parseYaml: parseFrontmatterYaml,
  });
  const failed = result.issues.some((issue) => issue.severity === "error");

  if (options.command === "check") {
    return {
      exitCode: failed ? 1 : 0,
      message: renderSummary({ command: "check", result, build: null, diff: null }),
    };
  }

  const build =
    result.data === null
      ? null
      : emitBuild(result.data, {
          builtAt: options.builtAt,
          includeUnverified: options.includeUnverified,
        });
  let diff = null;
  if (build !== null && result.data !== null) {
    diff = diffClassifications(await readPreviousBuild(options.out), result.data.strains);
    await writeBuild(options.out, build);
  }
  await writeText(options.report, renderReport({ command: "build", result, build, diff }));
  const summary = renderSummary({ command: "build", result, build, diff });
  return {
    exitCode: failed ? 1 : 0,
    message: `${summary}\nReport: ${display(options.report, env.repoRoot)}${build === null ? "" : `\nOutput: ${display(join(options.out, build.hash), env.repoRoot)}`}`,
  };
}
