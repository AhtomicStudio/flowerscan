// Test helpers. Every strain, breeder and place name in the fixtures is fictional.
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type CliEnv, run } from "../src/cli";
import { type CompileInput, compileVault } from "../src/compile";
import type { CompileResult, DataFile, Issue, VaultFile } from "../src/types";
import { parseFrontmatterYaml, parseYaml } from "../src/yaml";

export const TOOL_DIR = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
export const REPO_ROOT = resolve(TOOL_DIR, "..", "..");
export const FIXTURES = join(TOOL_DIR, "test", "fixtures");
export const FIXTURE_TAXONOMY = join(FIXTURES, "taxonomy");

export const env: CliEnv = { cwd: TOOL_DIR, repoRoot: REPO_ROOT };

export async function tempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "vault-build-test-"));
}

/** Runs the CLI against a fixture vault with the fixture taxonomy. */
export function runFixture(command: "check" | "build", fixture: string, ...extra: string[]) {
  return run(
    [command, "--vault", join(FIXTURES, fixture), "--taxonomy", FIXTURE_TAXONOMY, ...extra],
    env,
  );
}

async function dataFile(name: string): Promise<DataFile> {
  return {
    file: `fixtures/${name}`,
    data: parseYaml(await readFile(join(FIXTURE_TAXONOMY, name), "utf8")),
  };
}

export const fixtureTaxonomy = await dataFile("taxonomy.yaml");
export const fixtureBanned = await dataFile("banned.yaml");

/** A note file from a frontmatter object (JSON is valid YAML) and a body. */
export function noteFile(path: string, frontmatter: Record<string, unknown>, body = ""): VaultFile {
  return { path, text: `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n${body}` };
}

const DATES = { created: "2026-10-20", updated: "2026-10-20" };

export const landrace = (name: string, id: string, extra: Record<string, unknown> = {}) =>
  noteFile(`landraces/${name}.md`, {
    kind: "landrace",
    id,
    schema_version: 1,
    name,
    parents: [],
    reported_type: "indica",
    verification: "verified",
    reviewed_by: "Fictional Founder",
    reviewed_at: "2026-10-20",
    sources: [
      {
        url: "https://example.org/l",
        title: "Fictional",
        retrieved: "2026-10-20",
        supports: ["reported_type"],
      },
    ],
    ...DATES,
    ...extra,
  });

export const strain = (
  name: string,
  id: string,
  parents: string[],
  extra: Record<string, unknown> = {},
) =>
  noteFile(`strains/${name}.md`, {
    kind: "strain",
    id,
    schema_version: 1,
    name,
    parents,
    reported_type: "unknown",
    verification: "disputed",
    sources: [
      {
        url: "https://example.org/s",
        title: "Fictional",
        retrieved: "2026-10-20",
        supports: ["parents"],
      },
    ],
    ...DATES,
    ...extra,
  });

export const cross = (
  name: string,
  id: string,
  parents: string[],
  extra: Record<string, unknown> = {},
) =>
  noteFile(`crosses/${name}.md`, {
    kind: "cross",
    id,
    schema_version: 1,
    name,
    parents,
    reported_type: "unknown",
    verification: "disputed",
    sources: [
      {
        url: "https://example.org/c",
        title: "Fictional",
        retrieved: "2026-10-20",
        supports: ["parents"],
      },
    ],
    ...DATES,
    ...extra,
  });

export const breeder = (name: string, id: string, extra: Record<string, unknown> = {}) =>
  noteFile(`breeders/${name}.md`, {
    kind: "breeder",
    id,
    schema_version: 1,
    name,
    ...DATES,
    ...extra,
  });

export function compile(notes: VaultFile[], overrides: Partial<CompileInput> = {}): CompileResult {
  return compileVault({
    notes,
    vaultLabel: "vault",
    taxonomy: fixtureTaxonomy,
    banned: fixtureBanned,
    includeUnverified: false,
    parseYaml: parseFrontmatterYaml,
    ...overrides,
  });
}

/** Issues as compact `code file field: message` strings, for readable assertions. */
export function describeIssues(issues: readonly Issue[], severity?: Issue["severity"]): string[] {
  return issues
    .filter((issue) => severity === undefined || issue.severity === severity)
    .map((issue) => `${issue.code} ${issue.file} ${issue.field ?? "-"}: ${issue.message}`);
}

export const codes = (issues: readonly Issue[], severity?: Issue["severity"]) =>
  issues
    .filter((issue) => severity === undefined || issue.severity === severity)
    .map((issue) => issue.code);
