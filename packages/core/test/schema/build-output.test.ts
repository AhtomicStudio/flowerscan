import { describe, expect, it } from "vitest";
import {
  BuildManifestSchema,
  InlineCrossSchema,
  LineageParentSchema,
  StrainRecordSchema,
  StrainsFileSchema,
} from "../../src/index";
import { expectIssue, expectValid, tracedLineage, unknownLineage, withFields } from "./fixtures";

const balanced = {
  ...tracedLineage,
  sativa_pct: 50,
  indica_pct: 50,
  label: "hybrid",
  sublabel: "balanced",
  confidence: 0.97,
};

const inlineCross = {
  kind: "cross",
  id: "copper-kite-x-harbor-lantern",
  name: "Copper Kite x Harbor Lantern",
  parents: ["copper-kite", "harbor-lantern"],
  parent_weights: null,
  derivation: "cross",
  reported_type: "unknown",
  verification: "verified",
  lineage: balanced,
};

const record = {
  id: "moonlit-fern-4",
  name: "Moonlit Fern #4",
  aliases: ["MF4"],
  kind: "strain",
  parents: [inlineCross, "copper-kite"],
  parent_weights: null,
  derivation: "cross",
  reported_type: "indica-dominant",
  breeder_id: "lanternworks-seeds",
  effects: ["relaxed"],
  flavors: [],
  terpenes: [],
  verification: "verified",
  lineage: tracedLineage,
  source_count: 2,
};

const landraceRecord = {
  ...record,
  id: "northvale-highland",
  name: "Northvale Highland",
  aliases: [],
  kind: "landrace",
  parents: [],
  derivation: null,
  reported_type: "indica",
  breeder_id: null,
  effects: [],
  lineage: { ...tracedLineage, sativa_pct: 25, indica_pct: 75, confidence: 1 },
};

describe("StrainRecord", () => {
  const R = StrainRecordSchema;

  it("accepts a strain with an inlined cross, and a landrace", () => {
    const parsed = expectValid(R, record);
    expect(parsed.parents[0]).toMatchObject({ kind: "cross", id: inlineCross.id });
    expectValid(R, landraceRecord);
  });

  it("accepts nested crosses (backcrosses go through cross nodes)", () => {
    const backcross = withFields(inlineCross, {
      id: "copper-kite-x-ck-x-hl",
      name: "Copper Kite x (Copper Kite x Harbor Lantern)",
      parents: ["copper-kite", inlineCross],
    });
    expectValid(R, withFields(record, { parents: [backcross, "unknown"] }));
  });

  it("accepts single-parent and undisclosed lineages", () => {
    expectValid(R, withFields(record, { parents: ["copper-kite"], derivation: "cut" }));
    expectValid(
      R,
      withFields(record, { parents: ["unknown"], derivation: null, lineage: unknownLineage }),
    );
  });

  it("never ships typical_thc_pct (P2) or vault-only fields", () => {
    expectIssue(R, withFields(record, { typical_thc_pct: { min: 18, max: 24 } }), []);
    expectIssue(R, withFields(record, { sources: [] }), []);
    expectIssue(R, withFields(record, { base_sativa_pct: 25 }), []);
  });

  it("crosses are not search entries", () => {
    expectIssue(R, withFields(record, { kind: "cross" }), ["kind"]);
  });

  it("writes the derivation out: cross for 2+ parents, required for one named parent", () => {
    expectIssue(R, withFields(record, { derivation: null }), ["derivation"], "cross");
    expectIssue(R, withFields(record, { parents: ["copper-kite"], derivation: null }), [
      "derivation",
    ]);
    expectIssue(R, withFields(landraceRecord, { derivation: "cross" }), ["derivation"]);
  });

  it("applies the parent rules to records and inlined crosses", () => {
    expectIssue(R, withFields(record, { parents: [] }), ["parents"]);
    expectIssue(R, withFields(landraceRecord, { parents: ["copper-kite"], derivation: "s1" }), [
      "parents",
    ]);
    expectIssue(R, withFields(record, { parent_weights: [0.9, 0.2] }), ["parent_weights"]);
    expectValid(R, withFields(record, { parent_weights: [0.25, 0.75] }));
    const lonelyCross = withFields(inlineCross, { parents: ["copper-kite"] });
    expectIssue(R, withFields(record, { parents: [lonelyCross, "copper-kite"] }), ["parents", 0]);
  });

  it("parents are ids, not wikilinks", () => {
    expectIssue(R, withFields(record, { parents: ["[[Copper Kite]]", "copper-kite"] }), [
      "parents",
      0,
    ]);
  });

  it("rejects bad fields", () => {
    expectIssue(R, withFields(record, { breeder_id: "[[Lanternworks Seeds]]" }), ["breeder_id"]);
    expectIssue(R, withFields(record, { source_count: -1 }), ["source_count"]);
    expectIssue(R, withFields(record, { effects: ["Relaxed"] }), ["effects", 0]);
    expectIssue(R, withFields(record, { lineage: { ...tracedLineage, indica_pct: 1 } }), [
      "lineage",
      "indica_pct",
    ]);
    expectIssue(R, withFields(record, { aliases: undefined }), ["aliases"]);
  });
});

describe("InlineCross and LineageParent", () => {
  it("parses on their own", () => {
    expectValid(InlineCrossSchema, inlineCross);
    expectValid(LineageParentSchema, "unknown");
    expectValid(LineageParentSchema, "copper-kite");
    expectIssue(InlineCrossSchema, withFields(inlineCross, { derivation: "s1" }), ["derivation"]);
    expect(LineageParentSchema.safeParse("Copper Kite").success).toBe(false);
  });
});

describe("StrainsFile", () => {
  it("accepts unique ids and rejects duplicates", () => {
    expectValid(StrainsFileSchema, [record, landraceRecord]);
    expectValid(StrainsFileSchema, []);
    expectIssue(StrainsFileSchema, [record, landraceRecord, record], [2, "id"], "duplicate");
  });
});

describe("BuildManifest", () => {
  const manifest = {
    data_version: "2026.10.25-a1b2c3",
    built_at: "2026-10-25T12:00:00Z",
    algo_version: 1,
    taxonomy_version: 1,
    counts: { strains: 2, landraces: 1, crosses: 1, taxonomy_terms: 40 },
    hash: "a1b2c3d4e5f6",
  };

  it("accepts a manifest", () => {
    expectValid(BuildManifestSchema, manifest);
  });

  it("rejects bad fields", () => {
    expectIssue(BuildManifestSchema, withFields(manifest, { hash: "A1B2C3D4" }), ["hash"]);
    expectIssue(BuildManifestSchema, withFields(manifest, { hash: "abc" }), ["hash"]);
    expectIssue(BuildManifestSchema, withFields(manifest, { built_at: "today" }), ["built_at"]);
    expectIssue(BuildManifestSchema, withFields(manifest, { algo_version: 1.5 }), ["algo_version"]);
    expectIssue(BuildManifestSchema, withFields(manifest, { taxonomy_version: "1" }), [
      "taxonomy_version",
    ]);
    expectIssue(
      BuildManifestSchema,
      withFields(manifest, { counts: { ...manifest.counts, strains: -1 } }),
      ["counts", "strains"],
    );
    expectIssue(
      BuildManifestSchema,
      withFields(manifest, { counts: { ...manifest.counts, breeders: 3 } }),
      ["counts"],
    );
    expectIssue(BuildManifestSchema, withFields(manifest, { data_version: "" }), ["data_version"]);
  });
});
