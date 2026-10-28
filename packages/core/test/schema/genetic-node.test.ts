import { describe, expect, it } from "vitest";
import { GeneticNodeSchema } from "../../src/index";
import { cross, expectIssue, expectValid, landrace, source, strain, withFields } from "./fixtures";

const S = GeneticNodeSchema;

describe("GeneticNode: valid fixtures", () => {
  it("accepts a landrace, a strain, and a cross", () => {
    expect(expectValid(S, landrace).kind).toBe("landrace");
    expect(expectValid(S, strain).kind).toBe("strain");
    expect(expectValid(S, cross).kind).toBe("cross");
  });

  it("accepts the minimal strain (optional fields omitted)", () => {
    expectValid(S, {
      kind: "strain",
      id: "velvet-comet",
      schema_version: 1,
      name: "Velvet Comet",
      parents: ["unknown"],
      reported_type: "unknown",
      verification: "unverified",
      created: "2026-10-20",
      updated: "2026-10-20",
    });
  });

  it("treats null optional fields as empty, as the vault templates write them", () => {
    expectValid(
      S,
      withFields(strain, {
        aliases: null,
        breeder: null,
        effects: null,
        typical_thc_pct: null,
        derivation: null,
      }),
    );
    expectValid(S, withFields(landrace, { base_sativa_pct: null, region: null, sources: [] }));
  });

  it("accepts wikilinks with a display alias", () => {
    expectValid(S, withFields(strain, { parents: ["[[Copper Kite|CK]]", "[[Harbor Lantern]]"] }));
  });

  it("accepts every coarse base value on a landrace (P10)", () => {
    for (const value of [10, 25, 50, 75, 90]) {
      expectValid(S, withFields(landrace, { base_sativa_pct: value }));
    }
  });
});

describe("GeneticNode: structure", () => {
  it("rejects an unknown kind", () => {
    expect(S.safeParse(withFields(strain, { kind: "hybrid" })).success).toBe(false);
  });

  it("rejects unknown and derived fields (no derived fields in the vault)", () => {
    expectIssue(S, withFields(strain, { sativa_pct: 35 }), []);
    expectIssue(S, withFields(strain, { classification: "hybrid" }), []);
  });

  it("requires the required fields", () => {
    for (const field of ["id", "name", "parents", "reported_type", "verification", "created"]) {
      expectIssue(S, withFields(strain, { [field]: undefined }), [field]);
    }
  });

  it("requires schema_version 1", () => {
    expectIssue(S, withFields(strain, { schema_version: 2 }), ["schema_version"]);
  });

  it("validates id as a lowercase kebab slug", () => {
    for (const id of [
      "Moonlit-Fern",
      "moonlit_fern",
      "moonlit--fern",
      "-moonlit",
      "moonlit-",
      "",
    ]) {
      expectIssue(S, withFields(strain, { id }), ["id"]);
    }
  });

  it('reserves the id "unknown" for undisclosed parents', () => {
    expectIssue(S, withFields(strain, { id: "unknown" }), ["id"], "reserved");
  });

  it("rejects a blank name", () => {
    expectIssue(S, withFields(strain, { name: "   " }), ["name"]);
  });

  it("rejects malformed parents", () => {
    for (const parent of [
      "Copper Kite",
      "[[ ]]",
      "[[]]",
      "[[Copper Kite]",
      "[[A#heading]]",
      "Unknown",
    ]) {
      expectIssue(S, withFields(strain, { parents: [parent, "[[Harbor Lantern]]"] }), [
        "parents",
        0,
      ]);
    }
  });

  it("rejects bad enum values", () => {
    expectIssue(S, withFields(strain, { reported_type: "mostly-indica" }), ["reported_type"]);
    expectIssue(S, withFields(strain, { verification: "approved" }), ["verification"]);
    expectIssue(S, withFields(strain, { derivation: "clone" }), ["derivation"]);
  });

  it("validates dates and their order", () => {
    expectIssue(S, withFields(strain, { created: "2026-13-01" }), ["created"]);
    expectIssue(S, withFields(strain, { updated: "20 Oct 2026" }), ["updated"]);
    expectIssue(S, withFields(strain, { updated: "2026-10-19" }), ["updated"], "earlier");
  });

  it("validates taxonomy slugs in tag fields", () => {
    expectIssue(S, withFields(strain, { effects: ["Relaxed"] }), ["effects", 0]);
    expectIssue(S, withFields(strain, { flavors: ["#flavor/pine"] }), ["flavors", 0]);
  });

  it("validates typical_thc_pct as an ordered 0–100 range", () => {
    expectValid(S, withFields(strain, { typical_thc_pct: { min: 18, max: 24 } }));
    expectIssue(S, withFields(strain, { typical_thc_pct: { min: 24, max: 18 } }), [
      "typical_thc_pct",
      "max",
    ]);
    expectIssue(S, withFields(strain, { typical_thc_pct: { min: 18, max: 140 } }), [
      "typical_thc_pct",
      "max",
    ]);
  });

  it("validates the breeder wikilink", () => {
    expectIssue(S, withFields(strain, { breeder: "Lanternworks Seeds" }), ["breeder"]);
  });
});

describe("GeneticNode: parents by kind", () => {
  it("a landrace has no parents", () => {
    expectIssue(S, withFields(landrace, { parents: ["[[Copper Kite]]"], derivation: "s1" }), [
      "parents",
    ]);
  });

  it('a strain needs at least one parent ("unknown" if undisclosed)', () => {
    expectIssue(S, withFields(strain, { parents: [] }), ["parents"], "unknown");
  });

  it("a cross needs at least two parents", () => {
    expectIssue(S, withFields(cross, { parents: ["[[Copper Kite]]"], derivation: "s1" }), [
      "parents",
    ]);
  });
});

describe("GeneticNode: parent_weights", () => {
  it("accepts weights that match parents and sum to 1 within 0.001", () => {
    expectValid(S, withFields(strain, { parent_weights: [0.75, 0.25] }));
    expectValid(S, withFields(strain, { parent_weights: [0.3334, 0.6668] }));
    const threeWay = withFields(cross, {
      parents: ["[[Copper Kite]]", "[[Harbor Lantern]]", "unknown"],
      parent_weights: [0.3333, 0.3333, 0.3334],
    });
    expectValid(S, threeWay);
  });

  it("rejects a length mismatch", () => {
    expectIssue(S, withFields(strain, { parent_weights: [1] }), ["parent_weights"], "entries");
  });

  it("rejects weights that don't sum to 1", () => {
    expectIssue(S, withFields(strain, { parent_weights: [0.6, 0.6] }), ["parent_weights"], "sum");
    expectIssue(S, withFields(strain, { parent_weights: [0.5, 0.498] }), ["parent_weights"], "sum");
  });

  it("rejects zero, negative, or >1 weights", () => {
    expectIssue(S, withFields(strain, { parent_weights: [0, 1] }), ["parent_weights", 0]);
    expectIssue(S, withFields(strain, { parent_weights: [-0.5, 1.5] }), ["parent_weights", 0]);
  });
});

describe("GeneticNode: derivation (P7)", () => {
  const single = (overrides: Record<string, unknown>) =>
    withFields(strain, { parents: ["[[Copper Kite]]"], ...overrides });

  it("is required when there's one named parent", () => {
    expectIssue(S, single({}), ["derivation"], "required");
    expectIssue(S, single({ derivation: null }), ["derivation"], "required");
  });

  it("accepts s1, cut, and pheno for one parent", () => {
    for (const derivation of ["s1", "cut", "pheno"]) expectValid(S, single({ derivation }));
  });

  it("rejects cross for one parent", () => {
    expectIssue(S, single({ derivation: "cross" }), ["derivation"]);
  });

  it('is optional for a lone "unknown" parent', () => {
    expectValid(S, single({ parents: ["unknown"] }));
    expectValid(S, single({ parents: ["unknown"], derivation: "pheno" }));
  });

  it("defaults to cross for two or more parents and rejects anything else", () => {
    expectValid(S, withFields(strain, { derivation: "cross" }));
    expectIssue(S, withFields(strain, { derivation: "s1" }), ["derivation"], "cross");
  });

  it("is not allowed without parents", () => {
    expectIssue(S, withFields(landrace, { derivation: "cut" }), ["derivation"]);
  });
});

describe("GeneticNode: base_sativa_pct (P10)", () => {
  it("rejects values off the coarse scale", () => {
    for (const value of [0, 15, 30, 60, 100, 25.5, "25"]) {
      expectIssue(S, withFields(landrace, { base_sativa_pct: value }), ["base_sativa_pct"]);
    }
  });

  it("is allowed only on landraces", () => {
    expectIssue(S, withFields(strain, { base_sativa_pct: 50 }), ["base_sativa_pct"], "landraces");
    expectIssue(S, withFields(cross, { base_sativa_pct: 50 }), ["base_sativa_pct"], "landraces");
    expectIssue(S, withFields(strain, { region: "Northvale" }), ["region"], "landraces");
  });

  it("needs two sources that support it", () => {
    const oneSource = withFields(landrace, { sources: [source(["base_sativa_pct"])] });
    expectIssue(S, oneSource, ["base_sativa_pct"], "found 1");
    const unrelated = withFields(landrace, {
      sources: [source(["reported_type"]), source(["reported_type"])],
    });
    expectIssue(S, unrelated, ["base_sativa_pct"], "found 0");
    expectIssue(S, withFields(landrace, { sources: undefined }), ["base_sativa_pct"]);
  });
});

describe("GeneticNode: verified needs sources", () => {
  it("rejects verified without sources", () => {
    expectIssue(S, withFields(strain, { sources: [] }), ["sources"]);
    expectIssue(S, withFields(strain, { sources: null }), ["sources"]);
  });

  it("rejects verified without a source for parents", () => {
    const sources = [source(["reported_type"])];
    expectIssue(S, withFields(strain, { sources }), ["verification"], "parents");
  });

  it("rejects verified without a source for reported_type", () => {
    const sources = [source(["parents"])];
    expectIssue(S, withFields(strain, { sources }), ["verification"], "reported_type");
  });

  it("accepts the backing split across several sources", () => {
    const sources = [source(["parents"]), source(["reported_type"])];
    expectValid(S, withFields(strain, { sources }));
  });

  it("doesn't require backing for claims that aren't made", () => {
    // Undisclosed parents and an unknown reported type aren't facts, so they need no source.
    const undisclosed = withFields(strain, {
      parents: ["unknown"],
      reported_type: "unknown",
      sources: [source([])],
    });
    expectValid(S, undisclosed);
    const verifiedLandrace = withFields(landrace, {
      verification: "verified",
      reviewed_by: "Fictional Founder",
      reviewed_at: "2026-10-21",
    });
    expectValid(S, verifiedLandrace);
  });

  it("applies only to verified (unverified and disputed may lack sources)", () => {
    expectValid(S, withFields(strain, { verification: "unverified", sources: [] }));
    expectValid(S, withFields(strain, { verification: "disputed", sources: undefined }));
  });
});

describe("GeneticNode: founder review (reviewed_by, reviewed_at)", () => {
  const unreviewed = withFields(strain, { reviewed_by: undefined, reviewed_at: undefined });

  it("accepts notes without them unless verified (no vault note has them yet)", () => {
    for (const verification of ["unverified", "disputed"]) {
      expectValid(S, withFields(unreviewed, { verification }));
      expectValid(
        S,
        withFields(unreviewed, { verification, reviewed_by: null, reviewed_at: null }),
      );
    }
    expectValid(S, withFields(cross, { reviewed_by: null, reviewed_at: null }));
  });

  it("accepts a reviewed note of any verification", () => {
    expect(expectValid(S, strain).reviewed_by).toBe("Fictional Founder");
    const reviewed = { reviewed_by: "Fictional Founder", reviewed_at: "2026-10-27" };
    expectValid(S, withFields(cross, reviewed));
    expectValid(S, withFields(landrace, { ...reviewed, verification: "disputed" }));
  });

  it("rejects a verified note without them", () => {
    expectIssue(S, unreviewed, ["reviewed_by"], "vault:review");
    expectIssue(S, unreviewed, ["reviewed_at"], "vault:review");
    expectIssue(S, withFields(strain, { reviewed_by: null }), ["reviewed_by"], "verified");
    expectIssue(S, withFields(strain, { reviewed_at: undefined }), ["reviewed_at"], "verified");
  });

  it("requires them together", () => {
    const byOnly = withFields(unreviewed, { verification: "disputed", reviewed_by: "Founder" });
    expectIssue(S, byOnly, ["reviewed_at"], "required with reviewed_by");
    const atOnly = withFields(unreviewed, {
      verification: "unverified",
      reviewed_at: "2026-10-27",
    });
    expectIssue(S, atOnly, ["reviewed_by"], "required with reviewed_at");
  });

  it("validates their values", () => {
    expectIssue(S, withFields(strain, { reviewed_by: "  " }), ["reviewed_by"], "blank");
    expectIssue(S, withFields(strain, { reviewed_by: 42 }), ["reviewed_by"]);
    expectIssue(S, withFields(strain, { reviewed_at: "27 Oct 2026" }), ["reviewed_at"]);
    expectIssue(S, withFields(strain, { reviewed_at: "2026-10-27T10:00:00Z" }), ["reviewed_at"]);
  });
});
