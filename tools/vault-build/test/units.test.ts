import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadBannedTerms, loadTaxonomy, type StrainRecord } from "@flowerscan/core";
import { describe, expect, it } from "vitest";
import { emitBuild, HASH_LENGTH } from "../src/emit";
import { createLinkIndex } from "../src/links";
import { diffClassifications, renderSummary, snapshotOf, snapshotsFrom } from "../src/report";
import { createYamlParser, parseFrontmatterYaml, parseYaml } from "../src/yaml";
import { compile, landrace, REPO_ROOT } from "./helpers";

describe("createLinkIndex", () => {
  const index = createLinkIndex([
    "strains/Moonlit Fern.md",
    "strains/Fern.md",
    "crosses/Fern.md",
    "landraces/Crème Valley.md",
  ]);

  it("resolves by filename, case-insensitively, with or without .md", () => {
    for (const target of ["Moonlit Fern", "moonlit fern", "MOONLIT FERN.md", "Moonlit Fern.MD"]) {
      expect(index.resolve(target)).toEqual({ ok: true, path: "strains/Moonlit Fern.md" });
    }
  });

  it("compares NFC forms, so a decomposed accent still matches", () => {
    expect(index.resolve("Crème Valley")).toEqual({ ok: true, path: "landraces/Crème Valley.md" });
  });

  it("resolves a folder-qualified target by path", () => {
    expect(index.resolve("crosses/Fern")).toEqual({ ok: true, path: "crosses/Fern.md" });
    expect(index.resolve("/strains/fern.md")).toEqual({ ok: true, path: "strains/Fern.md" });
    expect(index.resolve("breeders/Fern")).toEqual({
      ok: false,
      reason: "unresolved",
      candidates: [],
    });
  });

  it("reports unresolved and ambiguous targets", () => {
    expect(index.resolve("Nowhere")).toEqual({ ok: false, reason: "unresolved", candidates: [] });
    expect(index.resolve("Fern")).toEqual({
      ok: false,
      reason: "ambiguous",
      candidates: ["strains/Fern.md", "crosses/Fern.md"],
    });
  });
});

describe("YAML parsing", () => {
  it("keeps dates as strings and reads YAML 1.2 booleans only", () => {
    expect(parseYaml("created: 2026-10-26\nflag: yes\nok: true\nnone:\n")).toEqual({
      created: "2026-10-26",
      flag: "yes",
      ok: true,
      none: null,
    });
  });

  it("throws one line with the line number, shifted for frontmatter", () => {
    expect(() => parseYaml("a: 1\na: 2\n")).toThrow("Map keys must be unique (line 2, column 1)");
    expect(() => parseFrontmatterYaml("a: 1\na: 2\n")).toThrow(
      "Map keys must be unique (line 3, column 1)",
    );
    expect(() => createYamlParser(10)("a: [1\n")).toThrow(/\(line 1[12], column \d+\)$/);
  });

  it("treats parser warnings as errors", () => {
    expect(() => parseYaml("%FOO bar\n---\na: 1\n")).toThrow();
  });
});

describe("the real taxonomy (data/taxonomy, read only)", () => {
  it("loads cleanly and passes its own banned-term check (T-003)", async () => {
    const read = async (name: string) =>
      parseYaml(await readFile(join(REPO_ROOT, "data", "taxonomy", name), "utf8"));
    const banned = loadBannedTerms(await read("banned.yaml"));
    expect(banned.ok, JSON.stringify(banned.ok ? [] : banned.issues)).toBe(true);
    if (!banned.ok) return;
    const taxonomy = loadTaxonomy(await read("taxonomy.yaml"), banned.value);
    expect(taxonomy.ok, JSON.stringify(taxonomy.ok ? [] : taxonomy.issues)).toBe(true);
    if (!taxonomy.ok) return;
    expect(taxonomy.value.version).toBe(1);
    expect(
      taxonomy.value.terms.filter((term) => term.status === "active").length,
    ).toBeGreaterThanOrEqual(35);
  });
});

const notes = [
  landrace("Northvale Highland", "northvale-highland", {
    base_sativa_pct: 10,
    sources: [
      {
        url: "https://example.org/a",
        title: "A",
        retrieved: "2026-10-20",
        supports: ["base_sativa_pct", "reported_type"],
      },
      {
        url: "https://example.org/b",
        title: "B",
        retrieved: "2026-10-21",
        supports: ["base_sativa_pct"],
      },
    ],
  }),
];
const data = (() => {
  const result = compile(notes);
  if (result.data === null) throw new Error("fixture failed");
  return result.data;
})();

describe("emitBuild", () => {
  it("hashes the data files, not the manifest", () => {
    const plain = emitBuild(data, { includeUnverified: false });
    const stamped = emitBuild(data, {
      builtAt: "2027-01-01T12:00:00+01:00",
      includeUnverified: false,
    });
    expect(plain.hash).toHaveLength(HASH_LENGTH);
    expect(stamped.hash).toBe(plain.hash);
    expect(plain.manifest.built_at).toBe("2026-10-20T00:00:00Z");
    expect(stamped.manifest.data_version).toBe(`2027.01.01-${plain.hash.slice(0, 6)}`);
    expect(plain.files.map((file) => file.name)).toEqual([
      "manifest.json",
      "strains.json",
      "breeders.json",
      "taxonomy.json",
    ]);
    expect(
      plain.files.every((file) => file.content.endsWith("}\n") || file.content.endsWith("]\n")),
    ).toBe(true);
  });

  it("changes the hash when shipped data changes", () => {
    const other = { ...data, breeders: [{ id: "x", name: "X" }] };
    expect(emitBuild(other, { includeUnverified: false }).hash).not.toBe(
      emitBuild(data, { includeUnverified: false }).hash,
    );
  });

  it("marks dev builds", () => {
    expect(emitBuild(data, { includeUnverified: true }).manifest.data_version).toMatch(/-dev$/);
  });
});

describe("classification diff", () => {
  const record = data.strains[0] as StrainRecord;

  it("reads a previous strains.json, and rejects anything else", () => {
    expect(snapshotsFrom([record])).toEqual([snapshotOf(record)]);
    expect(snapshotsFrom({})).toBeNull();
    expect(snapshotsFrom([{ id: "x" }])).toBeNull();
    expect(
      snapshotsFrom([{ ...record, lineage: { ...record.lineage, sativa_pct: "10" } }]),
    ).toBeNull();
  });

  it("finds added, removed and changed records", () => {
    const before = snapshotOf(record);
    const gone = { ...before, id: "gone", name: "Gone" };
    const diff = diffClassifications(
      { hash: "abcdef012345", data_version: "v", records: [{ ...before, algo_version: 1 }, gone] },
      [record, { ...record, id: "new-one" }],
    );
    expect(diff.previous).toEqual({ hash: "abcdef012345", data_version: "v" });
    expect(diff.added.map((s) => s.id)).toEqual(["new-one"]);
    expect(diff.removed.map((s) => s.id)).toEqual(["gone"]);
    expect(diff.changed).toEqual([{ before: { ...before, algo_version: 1 }, after: before }]);
    expect(diffClassifications(null, [record])).toMatchObject({
      previous: null,
      added: [before],
      removed: [],
      changed: [],
    });
  });
});

describe("console summary", () => {
  it("states the result and the shipped counts", () => {
    const result = compile(notes);
    const text = renderSummary({ command: "check", result, build: null, diff: null });
    expect(text).toContain(
      "vault-build check: 1 note (1 landraces, 0 strains, 0 crosses, 0 breeders)",
    );
    expect(text).toContain(
      "Northvale Highland (northvale-highland): 10, 2 sources backing it, verified",
    );
    expect(text).toContain("Ships: 0 strains, 1 landrace, 0 crosses.");
    expect(text.endsWith("OK: 0 warnings.")).toBe(true);
  });
});
