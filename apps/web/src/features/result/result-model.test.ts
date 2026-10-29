import type { StrainRecord } from "@flowerscan/core";
import { describe, expect, it } from "vitest";
import type { ShippedTerm } from "../../data/load-data";
import { STRAINS, TAXONOMY } from "../../test/fixtures";
import {
  disputedCount,
  effectsFor,
  leanFor,
  originsUnknown,
  parentsSummary,
  resolveParent,
} from "./result-model";

const byId = new Map(STRAINS.map((s) => [s.id, s]));
const strain = (id: string) => byId.get(id) as StrainRecord;
const terms = new Map<string, ShippedTerm>(TAXONOMY.terms.map((t) => [t.slug, t]));

describe("effectsFor", () => {
  it("keeps the data's order, splits negatives, and drops other facets", () => {
    const { chips, negatives } = effectsFor(
      { ...strain("kestrel-haze"), effects: ["creative", "pine", "dry-mouth", "uplifted"] },
      terms,
    );
    expect(chips.map((t) => t.slug)).toEqual(["creative", "uplifted"]);
    expect(negatives.map((t) => t.slug)).toEqual(["dry-mouth"]);
  });

  it("follows replaced_by for a deprecated slug and never shows an unknown slug", () => {
    const withDeprecated = new Map(terms);
    withDeprecated.set("chill", {
      slug: "chill",
      facet: "effect",
      label: "Chill",
      polarity: "positive",
      description: "Old term.",
      status: "deprecated",
      replaced_by: "calm",
    });
    const { chips } = effectsFor(
      { ...strain("kestrel-haze"), effects: ["chill", "calm", "made-up"] },
      withDeprecated,
    );
    expect(chips.map((t) => t.label)).toEqual(["Calm"]);
  });
});

describe("family-tree helpers", () => {
  it("summarizes parents, including unknown ones", () => {
    expect(parentsSummary(strain("kestrel-haze"), byId)).toBe("Strain A × Landrace C");
    expect(parentsSummary(strain("marsh-wren"), byId)).toBe("Strain A × unknown parent");
    expect(parentsSummary(strain("landrace-k"), byId)).toBe("Where family trees stop");
    expect(parentsSummary(strain("teal-finch"), byId)).toBe("Landrace K x Landrace C × Strain A");
  });

  it("counts disputed nodes in the drawn tree, including the strain itself", () => {
    expect(disputedCount(strain("kestrel-haze"), byId)).toBe(1);
    expect(disputedCount(strain("strain-a"), byId)).toBe(1);
    expect(disputedCount(strain("sandpiper"), byId)).toBe(0);
  });

  it("reads an unshipped parent id as unknown, never inventing it", () => {
    expect(resolveParent("not-shipped", byId)).toEqual({ kind: "unknown" });
    expect(originsUnknown(["unknown"])).toBe(true);
    expect(originsUnknown([])).toBe(false);
  });

  it("only gives a lean for traced and partial lineages", () => {
    expect(leanFor(strain("kestrel-haze"))?.lead).toBe("Leans sativa");
    expect(leanFor(strain("goldcrest"))).toBeNull(); // reported
    expect(leanFor(strain("night-heron"))).toBeNull(); // unknown
    expect(leanFor(strain("landrace-c"))).toBeNull(); // landrace
  });
});
