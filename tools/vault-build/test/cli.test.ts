import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BuildManifestSchema, StrainRecordSchema, StrainsFileSchema } from "@flowerscan/core";
import { afterEach, describe, expect, it } from "vitest";
import { parseArgs, run, USAGE } from "../src/cli";
import { env, FIXTURES, REPO_ROOT, runFixture, tempDir } from "./helpers";

const temps: string[] = [];
async function scratch(): Promise<string> {
  const dir = await tempDir();
  temps.push(dir);
  return dir;
}
afterEach(async () => {
  await Promise.all(temps.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

/** Builds a fixture into a fresh folder and returns the folder plus the CLI result. */
async function build(fixture: string, ...extra: string[]) {
  const out = await scratch();
  const report = join(out, "report", "build-report.md");
  const result = await runFixture("build", fixture, "--out", out, "--report", report, ...extra);
  return { out, report, result };
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

const vault = (fixture: string) => `tools/vault-build/test/fixtures/${fixture}`;

describe("arguments", () => {
  it("rejects a missing or unknown command with usage (exit 2)", async () => {
    for (const argv of [
      [],
      ["deploy"],
      ["check", "--nope"],
      ["check", "--vault"],
      ["build", "--out="],
    ]) {
      const result = await run(argv, env);
      expect(result.exitCode, argv.join(" ")).toBe(2);
      expect(result.message).toContain(USAGE);
    }
  });

  it("rejects a --built-at that isn't an ISO datetime with offset", async () => {
    const result = await run(["build", "--built-at", "2026-10-27"], env);
    expect(result.exitCode).toBe(2);
    expect(result.message).toContain("--built-at must be an ISO datetime");
  });

  it("defaults paths to the repo and resolves given paths against the caller's cwd", () => {
    const defaults = parseArgs(["check"], env);
    expect(defaults).toMatchObject({
      command: "check",
      includeUnverified: false,
      vault: join(REPO_ROOT, "data", "vault"),
      taxonomy: join(REPO_ROOT, "data", "taxonomy"),
      out: join(REPO_ROOT, "apps", "web", "public", "data"),
      report: join(REPO_ROOT, "tools", "vault-build", "build-report.md"),
      builtAt: undefined,
    });
    const given = parseArgs(
      ["--", "build", "--vault=../v", "--include-unverified", "--built-at", "2026-10-27T00:00:00Z"],
      {
        cwd: join(REPO_ROOT, "data"),
        repoRoot: REPO_ROOT,
      },
    );
    expect(given).toMatchObject({
      command: "build",
      vault: join(REPO_ROOT, "v"),
      includeUnverified: true,
      builtAt: "2026-10-27T00:00:00Z",
    });
  });

  it("fails readably when the vault doesn't exist", async () => {
    const result = await runFixture("check", "no-such-vault");
    expect(result.exitCode).toBe(1);
    expect(result.message).toContain(`can't read the vault ${vault("no-such-vault")} (ENOENT)`);
  });

  it("refuses a vault inside an observations folder (P2)", async () => {
    const result = await runFixture("check", join("valid", "observations"));
    expect(result.exitCode).toBe(1);
    expect(result.message).toContain("can't be inside an observations folder");
  });

  it("reports an unreadable taxonomy folder as an error naming the file", async () => {
    const result = await run(
      ["check", "--vault", join(FIXTURES, "valid"), "--taxonomy", join(FIXTURES, "nowhere")],
      env,
    );
    expect(result.exitCode).toBe(1);
    expect(result.message).toContain(
      "tools/vault-build/test/fixtures/nowhere/taxonomy.yaml: can't read the file (ENOENT)",
    );
    expect(result.message).toContain(
      "tools/vault-build/test/fixtures/nowhere/banned.yaml: can't read the file (ENOENT)",
    );
  });
});

describe("vault:check on the error fixtures exits 1 with file and field", () => {
  it.each([
    [
      "unresolved-link",
      [
        `${vault("unresolved-link")}/strains/Lost Fern.md: parents.0: [[Nowhere Valley]] matches no note filename`,
        // Aliases are never used for resolution.
        `${vault("unresolved-link")}/strains/Lost Fern.md: parents.1: [[MF]] matches no note filename`,
      ],
    ],
    [
      "cycle",
      [
        `${vault("cycle")}/strains/Loop A.md: parents: cycle: Loop A (loop-a) → Loop B (loop-b) → Loop C (loop-c) → Loop A (loop-a)`,
      ],
    ],
    [
      "banned-tag",
      [
        `${vault("banned-tag")}/strains/Achy Fern.md: effects.0: tag "pain-relief" contains the banned term "pain"`,
        `${vault("banned-tag")}/strains/Achy Fern.md: effects.0: tag "pain-relief" contains the banned term "pain relief"`,
        `${vault("banned-tag")}/strains/Night Fern.md: body (line 16): banned term "insomnia" in "insomnia"`,
      ],
    ],
    [
      "duplicate-alias",
      [
        `${vault("duplicate-alias")}/strains/Misty Fern.md: aliases.0: alias "mf" is also an alias of moonlit-fern`,
        `${vault("duplicate-alias")}/strains/Misty Fern.md: aliases.1: alias "Moonlit Fern" is also the name of moonlit-fern`,
        `${vault("duplicate-alias")}/strains/Moonlit Fern.md: aliases.0: alias "MF" is also an alias of misty-fern`,
      ],
    ],
    [
      "missing-derivation",
      [
        `${vault("missing-derivation")}/strains/Fern Pheno.md: derivation: derivation is required with one parent: s1, cut, or pheno (P7)`,
      ],
    ],
    [
      "landrace-value",
      [
        `${vault("landrace-value")}/landraces/Northvale Highland.md: base_sativa_pct: base_sativa_pct must be one of 10, 25, 50, 75, 90 (P10)`,
      ],
    ],
    [
      "bad-frontmatter",
      [
        `${vault("bad-frontmatter")}/strains/Broken Yaml.md: frontmatter: invalid YAML: Missing closing "quote (line 5, column 11)`,
        `${vault("bad-frontmatter")}/strains/No Frontmatter.md: frontmatter: missing frontmatter`,
        `${vault("bad-frontmatter")}/strains/Twice.md: frontmatter: invalid YAML: Map keys must be unique (line 4, column 1)`,
      ],
    ],
  ])("%s", async (fixture, expected) => {
    const result = await runFixture("check", fixture);
    expect(result.exitCode).toBe(1);
    for (const line of expected) expect(result.message).toContain(line);
    const errorCount = Number(/FAILED: (\d+) errors?/.exec(result.message)?.[1]);
    expect(errorCount).toBe(expected.length);
  });

  it("exempts strain names and aliases from the banned-term check, in the frontmatter and the body (C1)", async () => {
    const result = await runFixture("check", "banned-tag");
    expect(result.message).not.toContain("Safe Harbor.md: body");
    expect(result.message).not.toContain("Safe Harbor.md: name");
  });

  it("build fails on errors too, writes the report, and writes no output", async () => {
    const { out, report, result } = await build("cycle");
    expect(result.exitCode).toBe(1);
    expect(await readdir(out)).toEqual(["report"]);
    const text = await readFile(report, "utf8");
    expect(text).toContain("- Result: **FAILED**, 1 error,");
    expect(text).toContain("### `cycle`: The family tree has a cycle (1)");
    expect(text).toContain("Not computed (`vault-build check`, or the build failed).");
  });
});

describe("vault:check on the valid fixture", () => {
  it("passes with no errors or warnings under the default policy", async () => {
    const result = await runFixture("check", "valid");
    expect(result.exitCode).toBe(0);
    expect(result.message).toContain(
      "vault-build check: 12 notes (3 landraces, 6 strains, 1 crosses, 2 breeders)",
    );
    expect(result.message).toContain("OK: 0 warnings.");
    expect(result.message).toContain("Ships: 5 strains, 2 landraces, 1 cross.");
  });

  it("flags every landrace value for founder review (P10)", async () => {
    const result = await runFixture("check", "valid");
    expect(result.message).toContain("Founder review (P10): 2 landrace base values");
    expect(result.message).toContain(
      "Northvale Highland (northvale-highland): 10, 2 sources backing it, verified",
    );
    expect(result.message).toContain(
      "Southmere Coast (southmere-coast): 90, 2 sources backing it, verified",
    );
  });

  it("writes nothing", async () => {
    const out = await scratch();
    const result = await runFixture("check", "valid", "--out", out, "--report", join(out, "r.md"));
    expect(result.exitCode).toBe(0);
    expect(await readdir(out)).toEqual([]);
  });
});

describe("vault:build on the valid fixture", () => {
  it("writes a content-hashed folder and latest.json pointing to it", async () => {
    const { out, result } = await build("valid");
    expect(result.exitCode).toBe(0);
    const latest = (await readJson(join(out, "latest.json"))) as Record<string, string>;
    expect(latest).toEqual({
      data_version: expect.stringMatching(/^2026\.10\.22-[0-9a-f]{6}$/),
      hash: expect.stringMatching(/^[0-9a-f]{12}$/),
      manifest: `${latest.hash}/manifest.json`,
    });
    expect((await readdir(join(out, latest.hash as string))).sort()).toEqual([
      "breeders.json",
      "manifest.json",
      "strains.json",
      "taxonomy.json",
    ]);
    expect(result.message).toContain(`Wrote ${latest.hash}/`);
  });

  it("produces JSON that validates against StrainRecord, StrainsFile and BuildManifest", async () => {
    const { out } = await build("valid");
    const { hash } = (await readJson(join(out, "latest.json"))) as { hash: string };
    const strains = (await readJson(join(out, hash, "strains.json"))) as unknown[];
    for (const record of strains) expect(StrainRecordSchema.safeParse(record).success).toBe(true);
    expect(StrainsFileSchema.safeParse(strains).success).toBe(true);
    const manifest = BuildManifestSchema.parse(await readJson(join(out, hash, "manifest.json")));
    expect(manifest).toEqual({
      data_version: `2026.10.22-${hash.slice(0, 6)}`,
      built_at: "2026-10-22T00:00:00Z",
      algo_version: 2,
      taxonomy_version: 1,
      counts: { strains: 5, landraces: 2, crosses: 1, taxonomy_terms: 4 },
      hash,
    });
  });

  it("ships verified and disputed nodes only, and never typical_thc_pct, sources, base value or region", async () => {
    const { out } = await build("valid");
    const { hash } = (await readJson(join(out, "latest.json"))) as { hash: string };
    const text = await readFile(join(out, hash, "strains.json"), "utf8");
    const strains = JSON.parse(text) as { id: string; verification: string }[];
    expect(strains.map((s) => s.id)).toEqual([
      "copper-lantern",
      "fern-cut",
      "fern-s1",
      "moonlit-fern",
      "moonlit-fern-4",
      "northvale-highland",
      "southmere-coast",
    ]);
    expect(strains.every((s) => s.verification !== "unverified")).toBe(true);
    for (const banned of [
      "typical_thc_pct",
      "sources",
      "base_sativa_pct",
      "region",
      "Northvale (fictional)",
    ]) {
      expect(text).not.toContain(banned);
    }
  });

  it("ships breeder names in breeders.json and the taxonomy without synonyms", async () => {
    const { out } = await build("valid");
    const { hash } = (await readJson(join(out, "latest.json"))) as { hash: string };
    expect(await readJson(join(out, hash, "breeders.json"))).toEqual([
      { id: "fictional-seed-co", name: "Fictional Seed Co" },
    ]);
    const taxonomy = (await readJson(join(out, hash, "taxonomy.json"))) as {
      taxonomy_version: number;
      terms: unknown[];
    };
    expect(taxonomy.taxonomy_version).toBe(1);
    expect(taxonomy.terms[0]).toEqual({
      slug: "relaxed",
      facet: "effect",
      label: "Relaxed",
      polarity: "positive",
      description: "Often described as a loose, unwound feeling in the body.",
      status: "active",
      replaced_by: null,
    });
    expect(JSON.stringify(taxonomy)).not.toContain("synonyms");
  });

  it("never reads _templates, dot-folders, observations or root documentation", async () => {
    // Each of those holds a file that would fail parsing; the valid fixture still has no errors.
    const result = await runFixture("check", "valid");
    expect(result.exitCode).toBe(0);
    expect(result.message).not.toContain("observations");
    expect(result.message).not.toContain("_templates");
  });

  it("is deterministic: same input → byte-identical output and hash", async () => {
    const first = await build("valid");
    const second = await build("valid");
    const latest = await readFile(join(first.out, "latest.json"), "utf8");
    expect(await readFile(join(second.out, "latest.json"), "utf8")).toBe(latest);
    const { hash } = JSON.parse(latest) as { hash: string };
    for (const name of ["manifest.json", "strains.json", "breeders.json", "taxonomy.json"]) {
      expect(await readFile(join(second.out, hash, name), "utf8"), name).toBe(
        await readFile(join(first.out, hash, name), "utf8"),
      );
    }
    expect(await readFile(second.report, "utf8")).toBe(await readFile(first.report, "utf8"));
  });

  it("takes built_at from --built-at without changing the content hash", async () => {
    const plain = await build("valid");
    const stamped = await build("valid", "--built-at", "2026-10-27T09:30:00-07:00");
    const a = (await readJson(join(plain.out, "latest.json"))) as { hash: string };
    const b = (await readJson(join(stamped.out, "latest.json"))) as {
      hash: string;
      data_version: string;
    };
    expect(b.hash).toBe(a.hash);
    expect(b.data_version).toBe(`2026.10.27-${a.hash.slice(0, 6)}`);
    const manifest = (await readJson(join(stamped.out, b.hash, "manifest.json"))) as {
      built_at: string;
    };
    expect(manifest.built_at).toBe("2026-10-27T09:30:00-07:00");
  });

  it("ships unverified nodes only with --include-unverified, marked as a dev build", async () => {
    const { out, result } = await build("valid", "--include-unverified");
    expect(result.exitCode).toBe(0);
    const { hash, data_version } = (await readJson(join(out, "latest.json"))) as {
      hash: string;
      data_version: string;
    };
    expect(data_version).toMatch(/-dev$/);
    const strains = (await readJson(join(out, hash, "strains.json"))) as { id: string }[];
    expect(strains.map((s) => s.id)).toContain("quiet-harbor");
    expect(strains.map((s) => s.id)).toContain("eastfold-valley");
    expect(result.message).toContain(
      "Quiet Harbor.md: lineage: confidence 0.485, method partial (low)",
    );
  });

  it("strips unsourced tags with a warning (unsourced-tag fixture)", async () => {
    const { out, result } = await build("unsourced-tag", "--include-unverified");
    expect(result.exitCode).toBe(0);
    expect(result.message).toContain(
      `${vault("unsourced-tag")}/strains/Plain Fern.md: effects: stripped relaxed: no source has supports: [effects]`,
    );
    const { hash } = (await readJson(join(out, "latest.json"))) as { hash: string };
    const [plain] = (await readJson(join(out, hash, "strains.json"))) as { effects: string[] }[];
    expect(plain?.effects).toEqual([]);
  });

  it("writes a report with counts, warnings, landrace review and a classification diff", async () => {
    const out = await scratch();
    const report = join(out, "build-report.md");
    const args = ["--out", out, "--report", report];
    await runFixture("build", "valid", ...args);
    const first = await readFile(report, "utf8");
    expect(first).toContain("| strain | 1 | 4 | 1 | 6 |");
    expect(first).toContain("| landrace | 1 | 2 | 0 | 3 |");
    expect(first).toContain("| Northvale Highland (`northvale-highland`) | 10 | 2 | verified |");
    expect(first).toContain("No previous build found: every record is new.");
    expect(first).toContain("### Added (7)");
    expect(first).toContain(
      "- Copper Lantern (`copper-lantern`): sativa (sativa-dominant), sativa_pct 60, high, traced, algo v2",
    );

    // Same data again: nothing changed.
    await runFixture("build", "valid", ...args);
    expect(await readFile(report, "utf8")).toContain("No changes.");

    // A dev build adds the unverified nodes.
    await runFixture("build", "valid", ...args, "--include-unverified");
    const dev = await readFile(report, "utf8");
    expect(dev).toContain("### Added (2)");
    expect(dev).toContain(
      "- Eastfold Valley (`eastfold-valley`): indica (indica-dominant), sativa_pct 30, medium, reported, algo v2",
    );
    expect(dev).toContain("- Quiet Harbor (`quiet-harbor`)");

    // Back to the default policy: they're removed again.
    await runFixture("build", "valid", ...args);
    expect(await readFile(report, "utf8")).toContain("### Removed (2)");
  });

  it("reports changed classifications against the previous build", async () => {
    const out = await scratch();
    const args = ["--out", out, "--report", join(out, "build-report.md")];
    await runFixture("build", "valid", ...args);
    // Simulate an older build whose Copper Lantern result was different.
    const { hash } = (await readJson(join(out, "latest.json"))) as { hash: string };
    const path = join(out, hash, "strains.json");
    const strains = (await readJson(path)) as { id: string; lineage: Record<string, unknown> }[];
    const lantern = strains.find((s) => s.id === "copper-lantern");
    if (lantern === undefined) throw new Error("fixture changed");
    lantern.lineage = { ...lantern.lineage, label: "hybrid", sublabel: "balanced", sativa_pct: 50 };
    await writeFile(path, JSON.stringify(strains));
    await runFixture("build", "valid", ...args);
    const report = await readFile(join(out, "build-report.md"), "utf8");
    expect(report).toContain("### Changed (1)");
    expect(report).toContain(
      "- Copper Lantern (`copper-lantern`): hybrid (balanced), sativa_pct 50, high, traced, algo v2 → sativa (sativa-dominant), sativa_pct 60, high, traced, algo v2",
    );
  });
});
