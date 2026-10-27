import { describe, expect, it } from "vitest";
import { LineageSchema, REPORTED_TYPES } from "../../src/index";
import {
  ALGO_VERSION,
  CONFIDENCE_THRESHOLDS,
  computeLineage,
  confidenceLevelFor,
  explainLineage,
  GENERATION_DECAY,
  LABEL_BANDS,
  labelFor,
  NO_DECAY_DERIVATIONS,
  REPORTED_CONFIDENCE,
  REPORTED_VALUE,
} from "../../src/lineage";
import { graphOf, landrace, strain } from "./helpers";

describe("constants match docs/05", () => {
  it("ALGO_VERSION is 2 (D15)", () => {
    expect(ALGO_VERSION).toBe(2);
  });

  it("reported-type values", () => {
    expect(REPORTED_VALUE).toEqual({
      sativa: 85,
      "sativa-dominant": 70,
      balanced: 50,
      "indica-dominant": 30,
      indica: 15,
      unknown: null,
    });
    expect(Object.keys(REPORTED_VALUE).sort()).toEqual([...REPORTED_TYPES].sort());
  });

  it("decay, reported confidence, and no-decay derivations (P7)", () => {
    expect(GENERATION_DECAY).toBe(0.97);
    expect(REPORTED_CONFIDENCE).toBe(0.5);
    expect(NO_DECAY_DERIVATIONS).toEqual(["cut", "pheno"]);
  });

  it("label bands and confidence thresholds", () => {
    expect(LABEL_BANDS.map((band) => band.min)).toEqual([80, 51, 50, 21, 0]);
    expect(CONFIDENCE_THRESHOLDS).toEqual([
      { min: 0.75, level: "high" },
      { min: 0.5, level: "medium" },
    ]);
  });
});

// D15 (2026-10-27): < 50 indica, exactly 50 hybrid, > 50 sativa; the sublabel is the strength of the lean.
const BOUNDARIES = [
  [0, "indica", null],
  [20, "indica", null],
  [21, "indica", "indica-dominant"],
  [49, "indica", "indica-dominant"],
  [50, "hybrid", "balanced"],
  [51, "sativa", "sativa-dominant"],
  [79, "sativa", "sativa-dominant"],
  [80, "sativa", null],
  [100, "sativa", null],
] as const;

describe("label bands", () => {
  it.each(BOUNDARIES)("labelFor(%i) → %s / %s", (pct, label, sublabel) => {
    expect(labelFor(pct)).toMatchObject({ label, sublabel });
  });

  it("every value from 0 to 100 gets exactly the D15 label", () => {
    for (let pct = 0; pct <= 100; pct += 1) {
      const expected = pct < 50 ? "indica" : pct === 50 ? "hybrid" : "sativa";
      expect(labelFor(pct).label, String(pct)).toBe(expected);
    }
  });

  it("only exactly 50 is a hybrid", () => {
    const hybrids = LABEL_BANDS.filter((band) => band.label === "hybrid");
    expect(hybrids).toEqual([{ min: 50, label: "hybrid", sublabel: "balanced" }]);
  });

  it("a value below the scale is indica", () => {
    expect(labelFor(-1)).toMatchObject({ label: "indica", sublabel: null });
  });

  it("every band's result passes LineageSchema", () => {
    for (const [pct, label, sublabel] of BOUNDARIES) {
      const lineage = {
        sativa_pct: pct,
        indica_pct: 100 - pct,
        label,
        sublabel,
        confidence: 1,
        confidence_level: "high",
        method: "traced",
        algo_version: ALGO_VERSION,
      };
      expect(LineageSchema.safeParse(lineage).success, String(pct)).toBe(true);
    }
  });

  // End to end: K (10) × T (90) weighted so the value lands on each boundary. 0 and 100 can't be
  // reached this way (P10 landrace values run 10–90), so labelFor covers them above.
  it.each(BOUNDARIES.filter(([pct]) => pct >= 10 && pct <= 90))(
    "a computed %i%% is %s / %s",
    (pct, label, sublabel) => {
      const share = (pct - 10) / 80;
      const graph = graphOf(
        landrace("k", 10),
        landrace("t", 90),
        strain("x", ["k", "t"], { weights: [1 - share, share] }),
      );
      expect(computeLineage(graph, "x")).toMatchObject({
        sativa_pct: pct,
        indica_pct: 100 - pct,
        label,
        sublabel,
      });
    },
  );

  // Weights are exact binary fractions, so the unrounded values are exact.
  it.each([
    [25, 1 / 32, 49.21875, 49, "indica", "indica-dominant"],
    [25, 1 / 64, 49.609375, 50, "hybrid", "balanced"],
    [75, 1 / 64, 50.390625, 50, "hybrid", "balanced"],
    [75, 1 / 32, 50.78125, 51, "sativa", "sativa-dominant"],
  ] as const)(
    "near 50 the band follows the rounded value (50 × %i, share %d)",
    (other, share, value, pct, label, sublabel) => {
      const graph = graphOf(
        landrace("m", 50),
        landrace("o", other),
        strain("x", ["m", "o"], { weights: [1 - share, share] }),
      );
      expect(explainLineage(graph, "x")?.value).toBe(value);
      expect(computeLineage(graph, "x")).toMatchObject({ sativa_pct: pct, label, sublabel });
    },
  );

  // Under D15 the reported-type values land in the matching lean, not in hybrid.
  it.each([
    ["indica", 15, "indica", null],
    ["indica-dominant", 30, "indica", "indica-dominant"],
    ["balanced", 50, "hybrid", "balanced"],
    ["sativa-dominant", 70, "sativa", "sativa-dominant"],
    ["sativa", 85, "sativa", null],
  ] as const)("a reported %s (%i) is %s / %s", (reported, pct, label, sublabel) => {
    const graph = graphOf(strain("x", ["unknown"], { reported }));
    expect(computeLineage(graph, "x")).toMatchObject({
      sativa_pct: pct,
      label,
      sublabel,
      method: "reported",
    });
  });

  it("rounds before banding (12.5 → 13), and only at the end", () => {
    const graph = graphOf(
      landrace("k", 10),
      strain("told", ["unknown"], { reported: "indica" }),
      strain("x", ["k", "told"]),
      // 0.5·12.5 + 0.5·10 = 11.25 from the float 12.5, not 0.5·13 + 0.5·10 = 11.5 (→ 12).
      strain("y", ["x", "k"]),
    );
    expect(computeLineage(graph, "x").sativa_pct).toBe(13);
    expect(computeLineage(graph, "y").sativa_pct).toBe(11);
  });
});

describe("confidence levels", () => {
  it.each([
    [1, "high"],
    [0.75, "high"],
    [0.7499, "medium"],
    [0.5, "medium"],
    [0.4999, "low"],
    [0.0001, "low"],
    [0, "none"],
  ])("confidenceLevelFor(%d) → %s", (confidence, level) => {
    expect(confidenceLevelFor(confidence)).toBe(level);
  });
});
