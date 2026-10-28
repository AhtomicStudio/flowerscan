import { type InlineCross, StrainsFileSchema } from "@flowerscan/core";
import { describe, expect, it } from "vitest";
import { isNotePath } from "../src/compile";
import {
  breeder,
  codes,
  compile,
  cross,
  describeIssues,
  fixtureBanned,
  fixtureTaxonomy,
  landrace,
  noteFile,
  strain,
} from "./helpers";

const base = (extra: Record<string, unknown> = {}) => [
  landrace("Northvale Highland", "northvale-highland", {
    base_sativa_pct: 10,
    ...twoSources,
    ...extra,
  }),
  landrace("Southmere Coast", "southmere-coast", { base_sativa_pct: 90, ...twoSources }),
];
const twoSources = {
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
      retrieved: "2026-10-20",
      supports: ["base_sativa_pct"],
    },
  ],
};
const sourced = (...supports: string[]) => ({
  sources: [{ url: "https://example.org/x", title: "X", retrieved: "2026-10-20", supports }],
});

describe("isNotePath", () => {
  it.each([
    ["strains/Moonlit Fern.md", true],
    ["strains/sub/Moonlit Fern.MD", true],
    ["README.md", false],
    ["strains/Moonlit Fern.txt", false],
    ["_templates/strain.md", false],
    [".obsidian/x.md", false],
    ["strains/.trash/x.md", false],
    ["observations/x.md", false],
  ])("%s → %s", (path, expected) => {
    expect(isNotePath(path)).toBe(expected);
  });
});

describe("lineage and records", () => {
  const notes = [
    ...base(),
    strain("Moonlit Fern", "moonlit-fern", ["[[Northvale Highland]]", "[[Southmere Coast]]"]),
    strain("Fern Cut", "fern-cut", ["[[Moonlit Fern]]"], { derivation: "cut" }),
    strain("Fern S1", "fern-s1", ["[[Moonlit Fern]]"], { derivation: "s1" }),
    cross("Moonlit Fern x Southmere Coast", "mf-x-sc", ["[[Moonlit Fern]]", "[[Southmere Coast]]"]),
    cross("Inner x Northvale", "inner-x-nv", [
      "[[Moonlit Fern x Southmere Coast]]",
      "[[Northvale Highland]]",
    ]),
    strain("Copper Lantern", "copper-lantern", ["[[Inner x Northvale]]", "[[Moonlit Fern]]"], {
      parent_weights: [0.25, 0.75],
    }),
    strain("Quiet Harbor", "quiet-harbor", ["unknown", "[[Southmere Coast]]"], {
      reported_type: "indica",
    }),
  ];
  const result = compile(notes);
  const records = result.data?.strains ?? [];
  const byId = (id: string) => {
    const record = records.find((r) => r.id === id);
    if (record === undefined) throw new Error(`no record ${id}`);
    return record;
  };

  it("compiles without issues and validates against StrainsFile", () => {
    expect(describeIssues(result.issues)).toEqual([]);
    expect(StrainsFileSchema.safeParse(records).success).toBe(true);
    expect(records.map((r) => r.id)).toEqual([
      "copper-lantern",
      "fern-cut",
      "fern-s1",
      "moonlit-fern",
      "northvale-highland",
      "quiet-harbor",
      "southmere-coast",
    ]);
  });

  it("computes docs/05 values (ALGO_VERSION 2)", () => {
    expect(byId("moonlit-fern").lineage).toEqual({
      sativa_pct: 50,
      indica_pct: 50,
      label: "hybrid",
      sublabel: "balanced",
      confidence: 0.97,
      confidence_level: "high",
      method: "traced",
      algo_version: 2,
    });
    expect(byId("fern-cut").lineage.confidence).toBeCloseTo(0.97, 10);
    expect(byId("fern-s1").lineage.confidence).toBeCloseTo(0.97 * 0.97, 10);
    // Unknown share filled with reported_type indica (15): 0.5·15 + 0.5·90.
    expect(byId("quiet-harbor").lineage).toMatchObject({
      sativa_pct: 53,
      label: "sativa",
      method: "partial",
    });
    // 0.25·(0.5·70 + 0.5·10) + 0.75·50 = 47.5 → 48.
    expect(byId("copper-lantern").lineage).toMatchObject({
      sativa_pct: 48,
      label: "indica",
      sublabel: "indica-dominant",
    });
  });

  it("resolves derivation and inlines crosses recursively (backcrosses nest)", () => {
    expect(byId("moonlit-fern").derivation).toBe("cross");
    expect(byId("fern-cut").derivation).toBe("cut");
    expect(byId("northvale-highland").derivation).toBeNull();
    const [outer, second] = byId("copper-lantern").parents as [InlineCross, string];
    expect(second).toBe("moonlit-fern");
    expect(outer).toMatchObject({
      kind: "cross",
      id: "inner-x-nv",
      derivation: "cross",
      parent_weights: null,
    });
    const [inner, landraceId] = outer.parents as [InlineCross, string];
    expect(landraceId).toBe("northvale-highland");
    expect(inner).toMatchObject({ id: "mf-x-sc", parents: ["moonlit-fern", "southmere-coast"] });
    expect(inner.lineage.sativa_pct).toBe(70);
    expect(byId("copper-lantern").parent_weights).toEqual([0.25, 0.75]);
    expect(result.data?.counts).toEqual({
      strains: 5,
      landraces: 2,
      crosses: 2,
      taxonomy_terms: 4,
    });
  });

  it("doesn't depend on the order files arrive in", () => {
    const reversed = compile([...notes].reverse());
    expect(JSON.stringify(reversed.data)).toBe(JSON.stringify(result.data));
    expect(reversed.issues).toEqual(result.issues);
  });

  it("uses the latest note date as the data date", () => {
    const later = compile([
      ...notes,
      breeder("Late Seeds", "late-seeds", { updated: "2026-11-02" }),
    ]);
    expect(later.data?.dataDate).toBe("2026-11-02");
    expect(compile([]).data?.dataDate).toBe("1970-01-01");
  });
});

describe("shipping policy", () => {
  const notes = [
    ...base({ verification: "unverified" }),
    strain("Moonlit Fern", "moonlit-fern", ["[[Northvale Highland]]", "[[Southmere Coast]]"], {
      reported_type: "sativa-dominant",
      breeder: "[[Fictional Seed Co]]",
    }),
    breeder("Fictional Seed Co", "fictional-seed-co"),
    breeder("Other Seeds", "other-seeds"),
  ];

  it("writes a parent that doesn't ship as unknown, with a warning, and computes lineage without it", () => {
    const result = compile(notes);
    expect(describeIssues(result.issues)).toEqual([
      "unshipped-parent vault/strains/Moonlit Fern.md parents.0: Northvale Highland (northvale-highland) is unverified and doesn't ship, so it's written as unknown",
    ]);
    const [record] = result.data?.strains ?? [];
    expect(record?.parents).toEqual(["unknown", "southmere-coast"]);
    // 0.5·70 (reported) + 0.5·90.
    expect(record?.lineage).toMatchObject({ sativa_pct: 80, method: "partial" });
    expect(record?.breeder_id).toBe("fictional-seed-co");
    expect(result.data?.breeders).toEqual([{ id: "fictional-seed-co", name: "Fictional Seed Co" }]);
  });

  it("ships everything with includeUnverified", () => {
    const result = compile(notes, { includeUnverified: true });
    expect(codes(result.issues)).toEqual([]);
    expect(result.data?.strains[0]?.parents).toEqual(["northvale-highland", "southmere-coast"]);
    expect(result.includeUnverified).toBe(true);
  });

  it("counts nodes by kind and verification", () => {
    expect(compile(notes).stats).toEqual({
      notes: 5,
      breeders: 2,
      nodes: {
        landrace: { unverified: 1, verified: 1, disputed: 0 },
        strain: { unverified: 0, verified: 0, disputed: 1 },
        cross: { unverified: 0, verified: 0, disputed: 0 },
      },
    });
  });
});

describe("errors", () => {
  it("rejects a duplicate id, keeping the first file in path order", () => {
    const result = compile([
      ...base(),
      strain("Fern B", "fern", ["unknown"]),
      strain("Fern A", "fern", ["unknown"]),
    ]);
    expect(describeIssues(result.issues, "error")).toEqual([
      'duplicate-id vault/strains/Fern B.md id: id "fern" is already used by vault/strains/Fern A.md',
    ]);
    expect(result.data).toBeNull();
  });

  it("allows a breeder and a node to share an id (separate namespaces)", () => {
    expect(
      codes(
        compile([strain("Fern", "fern", ["unknown"]), breeder("Fern Seeds", "fern")]).issues,
        "error",
      ),
    ).toEqual([]);
  });

  it("rejects an ambiguous link and accepts the folder-qualified one", () => {
    const notes = [
      strain("Fern", "fern", ["unknown"]),
      cross("Fern", "fern-cross", ["unknown", "unknown"]),
      strain("Child", "child", ["[[Fern]]", "[[strains/Fern]]"]),
    ];
    expect(describeIssues(compile(notes).issues, "error")).toEqual([
      "ambiguous-link vault/strains/Child.md parents.0: [[Fern]] matches vault/crosses/Fern.md and vault/strains/Fern.md: add the folder, e.g. [[crosses/Fern]]",
    ]);
  });

  it("rejects links to the wrong kind of note", () => {
    const notes = [
      breeder("Fictional Seed Co", "fictional-seed-co"),
      strain("Fern", "fern", ["[[Fictional Seed Co]]", "unknown"], { breeder: "[[Other Fern]]" }),
      strain("Other Fern", "other-fern", ["unknown"]),
    ];
    expect(describeIssues(compile(notes).issues, "error")).toEqual([
      "link-kind vault/strains/Fern.md parents.0: [[Fictional Seed Co]] is a breeder note (vault/breeders/Fictional Seed Co.md), not a genetic node",
      "link-kind vault/strains/Fern.md breeder: [[Other Fern]] is a strain note (vault/strains/Other Fern.md), not a breeder",
    ]);
  });

  it("reports an unresolved breeder link", () => {
    const result = compile([strain("Fern", "fern", ["unknown"], { breeder: "[[Nobody Seeds]]" })]);
    expect(codes(result.issues, "error")).toEqual(["unresolved-link"]);
  });

  it("doesn't cascade: a link to a note that failed to parse reports only that note's error", () => {
    const broken = { path: "strains/Broken.md", text: "no frontmatter" };
    const result = compile([broken, strain("Child", "child", ["[[Broken]]", "unknown"])]);
    expect(describeIssues(result.issues, "error")).toEqual([
      "parse vault/strains/Broken.md frontmatter: missing frontmatter: the note must start with a --- line",
    ]);
  });

  it("reports a self-parent cycle", () => {
    const result = compile([strain("Ouroboros", "ouroboros", ["[[Ouroboros]]", "unknown"])]);
    expect(describeIssues(result.issues, "error")).toEqual([
      "cycle vault/strains/Ouroboros.md parents: cycle: Ouroboros (ouroboros) → Ouroboros (ouroboros). Fix one link and rebuild",
    ]);
  });

  it("rejects unknown tags, synonyms used as slugs, and tags in the wrong facet", () => {
    const result = compile([
      strain("Fern", "fern", ["unknown"], {
        effects: ["sleepy", "chill", "lemon"],
        flavors: ["relaxed"],
        ...sourced("parents", "effects", "flavors"),
      }),
    ]);
    expect(describeIssues(result.issues, "error")).toEqual([
      'unknown-tag vault/strains/Fern.md effects.0: "sleepy" is not a effect slug in taxonomy.yaml',
      'unknown-tag vault/strains/Fern.md effects.1: "chill" is not a effect slug in taxonomy.yaml; did you mean "relaxed"?',
      'unknown-tag vault/strains/Fern.md effects.2: "lemon" is a flavor term, not effect',
      'unknown-tag vault/strains/Fern.md flavors.0: "relaxed" is a effect term, not flavor',
    ]);
  });

  it("fails on a banned term in the body with its line, but not in names or aliases anywhere (C1)", () => {
    const plain = strain("Fern", "fern", ["unknown"]);
    const fern = {
      ...plain,
      text: `${plain.text}# Fern\n\nA cross of Safe Harbor (Pain Train).\nIt cures nothing.\n`,
    };
    const line = fern.text.split("\n").findIndex((text) => text.startsWith("It cures")) + 1;
    const result = compile([
      strain("Safe Harbor", "safe-harbor", ["unknown"], { aliases: ["Pain Train"] }),
      fern,
    ]);
    expect(describeIssues(result.issues, "error")).toEqual([
      `banned-term vault/strains/Fern.md body (line ${line}): banned term "cures" in "cures"`,
    ]);
  });

  it("reports taxonomy and banned-list problems against their files", () => {
    const badTaxonomy = compile([], {
      taxonomy: { file: "tax.yaml", data: { taxonomy_version: 1, terms: [{ slug: "x" }] } },
    });
    expect(codes(badTaxonomy.issues)).toEqual(expect.arrayContaining(["taxonomy"]));
    expect(badTaxonomy.issues[0]?.file).toBe("tax.yaml");

    const badBanned = compile(
      [strain("Fern", "fern", ["unknown"], { effects: ["relaxed"], ...sourced("effects") })],
      {
        banned: { file: "banned.yaml", data: { banned_version: 1 } },
      },
    );
    expect(
      badBanned.issues.filter((i) => i.severity === "error").map((i) => `${i.file} ${i.field}`),
    ).toEqual([
      "banned.yaml conditions",
      "banned.yaml claims",
      "banned.yaml pharmacology",
      "banned.yaml safety",
    ]);
    expect(badBanned.data).toBeNull();

    const banningTaxonomy = compile([], {
      banned: {
        file: "banned.yaml",
        data: { ...(fixtureBanned.data as object), safety: ["relaxed"] },
      },
    });
    expect(describeIssues(banningTaxonomy.issues)).toContain(
      'taxonomy fixtures/taxonomy.yaml terms.0.slug: contains the banned term "relaxed"',
    );

    const unreadable = compile([], {
      taxonomy: { file: "tax.yaml", data: undefined, error: "can't read the file (ENOENT)" },
    });
    expect(describeIssues(unreadable.issues)).toEqual([
      "taxonomy tax.yaml -: can't read the file (ENOENT)",
    ]);
  });
});

describe("warnings", () => {
  it("replaces deprecated tags, dedupes, and keeps sourced tags", () => {
    const result = compile([
      strain("Fern", "fern", ["unknown"], {
        effects: ["mellow", "relaxed", "dry-mouth"],
        ...sourced("parents", "effects"),
      }),
    ]);
    expect(describeIssues(result.issues)).toEqual([
      'deprecated-tag vault/strains/Fern.md effects.0: "mellow" is deprecated: using "relaxed"',
      "low-confidence vault/strains/Fern.md lineage: lineage unknown (none)",
    ]);
    expect(result.data?.strains[0]?.effects).toEqual(["relaxed", "dry-mouth"]);
  });

  it("warns that flavors and terpenes aren't tagged in the MVP (D3), and strips them when unsourced", () => {
    const result = compile([strain("Fern", "fern", ["unknown"], { flavors: ["lemon"] })]);
    expect(codes(result.issues)).toEqual(["untagged-facet", "unsourced-tag", "low-confidence"]);
    expect(result.data?.strains[0]?.flavors).toEqual([]);
  });

  it("warns on possible autoflower nodes by name, alias or region (P1)", () => {
    const result = compile([
      strain("Auto Fern", "auto-fern", ["unknown"], { aliases: ["Fern Ruderalis"] }),
      landrace("Northvale Highland", "northvale-highland", {
        region: "Autoflowering hills (fictional)",
      }),
    ]);
    expect(describeIssues(result.issues).filter((line) => line.startsWith("autoflower"))).toEqual([
      'autoflower vault/landraces/Northvale Highland.md region: "Autoflowering hills (fictional)" mentions auto/ruderalis: autoflowers are excluded from v1 (P1). Confirm this isn\'t one',
      'autoflower vault/strains/Auto Fern.md name: "Auto Fern" mentions auto/ruderalis: autoflowers are excluded from v1 (P1). Confirm this isn\'t one',
      'autoflower vault/strains/Auto Fern.md aliases.0: "Fern Ruderalis" mentions auto/ruderalis: autoflowers are excluded from v1 (P1). Confirm this isn\'t one',
    ]);
  });

  it("warns on filenames, folders, missing sources and orphan crosses", () => {
    const misplaced = strain("Fern Two", "fern-2", ["unknown"], { name: "Fern #2", sources: [] });
    const result = compile([
      { ...misplaced, path: "landraces/Fern Two.md" },
      cross("Lonely Cross", "lonely-cross", ["unknown", "unknown"]),
    ]);
    expect(
      describeIssues(result.issues).filter((line) => !line.startsWith("low-confidence")),
    ).toEqual([
      "orphan-cross vault/crosses/Lonely Cross.md parents: no node lists this cross as a parent",
      "folder vault/landraces/Fern Two.md kind: a strain note belongs in strains/",
      'filename vault/landraces/Fern Two.md name: expected the file to be "Fern 2.md" for the name "Fern #2"',
      "missing-sources vault/landraces/Fern Two.md sources: no sources: every fact needs one (docs/04 sourcing policy)",
    ]);
  });

  it("warns on duplicate names, near-duplicates and repeated aliases", () => {
    const result = compile([
      strain("Fern", "fern", ["unknown"], { aliases: ["fern", "Big Fern", "BIG FERN"] }),
      strain("Fern B", "fern-b", ["unknown"], { name: "Fern" }),
      strain("Gelato 33", "gelato-33", ["unknown"], { name: "Gelato #33" }),
      strain("Gelato 33 Other", "gelato-33-other", ["unknown"], { name: "Gelato 33" }),
    ]);
    expect(
      describeIssues(result.issues).filter((line) => !/^(low-confidence|filename)/.test(line)),
    ).toEqual([
      'alias-repeat vault/strains/Fern.md aliases.0: "fern" repeats the name or another alias of this note',
      'alias-repeat vault/strains/Fern.md aliases.2: "BIG FERN" repeats the name or another alias of this note',
      // "Fern B.md" sorts before "Fern.md" (a space comes before a dot), so it keeps the name.
      'duplicate-name vault/strains/Fern.md name: "Fern" is also the name of fern-b (vault/strains/Fern B.md)',
      'near-duplicate vault/strains/Gelato 33 Other.md name: "Gelato 33" (gelato-33-other), "Gelato #33" (gelato-33) normalize to the same text: the matcher can\'t tell them apart',
    ]);
  });
});

describe("fixture vocabulary", () => {
  it("loads", () => {
    expect(fixtureTaxonomy.data).toMatchObject({ taxonomy_version: 1 });
    expect(compile([noteFile("strains/x.md", {})]).issues[0]?.code).toBe("schema");
  });
});

describe("founder review fields (T-029)", () => {
  it("errors on a verified note without reviewed_by and reviewed_at", () => {
    const result = compile([
      landrace("Northvale Highland", "northvale-highland", {
        reviewed_by: undefined,
        reviewed_at: null,
      }),
    ]);
    expect(describeIssues(result.issues, "error")).toEqual([
      expect.stringMatching(
        /^schema vault\/landraces\/Northvale Highland\.md reviewed_by: a verified node needs/,
      ),
      expect.stringMatching(
        /^schema vault\/landraces\/Northvale Highland\.md reviewed_at: a verified node needs/,
      ),
    ]);
    expect(result.data).toBeNull();
  });

  it("accepts unreviewed unverified and disputed notes, and exposes the graph for vault:review", () => {
    const result = compile(
      [
        landrace("Northvale Highland", "northvale-highland", {
          verification: "unverified",
          reviewed_by: null,
          reviewed_at: null,
        }),
        strain("Quiet Fern", "quiet-fern", ["[[Northvale Highland]]", "unknown"]),
      ],
      { includeUnverified: true },
    );
    expect(codes(result.issues, "error")).toEqual([]);
    expect(result.data?.graph.get("quiet-fern")?.parents).toEqual([
      "northvale-highland",
      "unknown",
    ]);
    expect(result.data?.lineages.get("northvale-highland")?.label).toBe("indica");
  });
});
