// The enum values are the docs/04 contract. A change here must come with a docs/04 change.
import { describe, expect, it } from "vitest";
import {
  BASE_SATIVA_PCTS,
  BaseSativaPctSchema,
  CLASSIFICATION_LABELS,
  CONFIDENCE_LEVELS,
  DERIVATIONS,
  FACETS,
  LINEAGE_METHODS,
  NODE_KINDS,
  PACKAGE_SAYS,
  POTENCY_ANALYTES,
  POTENCY_QUALIFIERS,
  POTENCY_UNITS,
  PRODUCT_FORMS,
  REPORTED_TYPES,
  ReportedTypeSchema,
  SCAN_METHODS,
  SOURCE_SUPPORTS,
  SUBLABELS,
  US_STATE_CODES,
  VERIFICATIONS,
} from "../../src/index";

describe("shared enums match docs/04", () => {
  it("has the documented values", () => {
    expect(NODE_KINDS).toEqual(["landrace", "strain", "cross"]);
    expect(DERIVATIONS).toEqual(["cross", "s1", "cut", "pheno"]);
    expect(REPORTED_TYPES).toEqual([
      "indica",
      "indica-dominant",
      "balanced",
      "sativa-dominant",
      "sativa",
      "unknown",
    ]);
    expect(BASE_SATIVA_PCTS).toEqual([10, 25, 50, 75, 90]);
    expect(VERIFICATIONS).toEqual(["unverified", "verified", "disputed"]);
    expect(SOURCE_SUPPORTS).toEqual([
      "parents",
      "reported_type",
      "effects",
      "flavors",
      "terpenes",
      "typical_thc_pct",
      "aliases",
      "base_sativa_pct",
    ]);
    expect(FACETS).toEqual(["effect", "flavor", "terpene"]);
    expect(CLASSIFICATION_LABELS).toEqual(["indica", "hybrid", "sativa", "unknown"]);
    expect(SUBLABELS).toEqual(["indica-dominant", "balanced", "sativa-dominant"]);
    expect(CONFIDENCE_LEVELS).toEqual(["high", "medium", "low", "none"]);
    expect(LINEAGE_METHODS).toEqual(["traced", "partial", "reported", "unknown"]);
    expect(SCAN_METHODS).toEqual(["text", "barcode", "qr", "manual", "link"]);
    expect(PACKAGE_SAYS).toEqual(["indica", "sativa", "hybrid"]);
    expect(PRODUCT_FORMS).toEqual(["flower", "pre-roll", "vape", "edible", "concentrate", "other"]);
    expect(POTENCY_ANALYTES).toEqual([
      "total_thc",
      "thca",
      "delta9_thc",
      "thc_unspecified",
      "total_cbd",
      "cbda",
      "cbd",
      "total_cannabinoids",
    ]);
    expect(POTENCY_QUALIFIERS).toEqual(["exact", "nd", "below_loq", "less_than"]);
    expect(POTENCY_UNITS).toEqual(["percent", "mg_per_g"]);
    expect(US_STATE_CODES).toHaveLength(56);
    expect(new Set(US_STATE_CODES).size).toBe(56);
  });

  it("schemas accept members and reject everything else", () => {
    expect(ReportedTypeSchema.safeParse("balanced").success).toBe(true);
    expect(ReportedTypeSchema.safeParse("hybrid").success).toBe(false);
    expect(BaseSativaPctSchema.safeParse(75).success).toBe(true);
    const offScale = BaseSativaPctSchema.safeParse(70);
    expect(offScale.success).toBe(false);
    expect(offScale.error?.issues[0]?.message).toContain("10, 25, 50, 75, 90");
  });
});
