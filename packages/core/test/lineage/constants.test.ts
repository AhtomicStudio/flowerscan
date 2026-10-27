import { describe, expect, it } from "vitest";
import { REPORTED_TYPES } from "../../src/index";
import {
  ALGO_VERSION,
  CONFIDENCE_THRESHOLDS,
  computeLineage,
  confidenceLevelFor,
  GENERATION_DECAY,
  LABEL_BANDS,
  labelFor,
  NO_DECAY_DERIVATIONS,
  REPORTED_CONFIDENCE,
  REPORTED_VALUE,
} from "../../src/lineage";
import { graphOf, landrace, strain } from "./helpers";

describe("constants match docs/05", () => {
  it("ALGO_VERSION is 1", () => {
    expect(ALGO_VERSION).toBe(1);
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
    expect(LABEL_BANDS.map((band) => band.min)).toEqual([80, 60, 41, 21, 0]);
    expect(CONFIDENCE_THRESHOLDS).toEqual([
      { min: 0.75, level: "high" },
      { min: 0.5, level: "medium" },
    ]);
  });
});

describe("label bands", () => {
  it.each([
    [0, "indica", null],
    [20, "indica", null],
    [21, "hybrid", "indica-dominant"],
    [40, "hybrid", "indica-dominant"],
    [41, "hybrid", "balanced"],
    [59, "hybrid", "balanced"],
    [60, "hybrid", "sativa-dominant"],
    [79, "hybrid", "sativa-dominant"],
    [80, "sativa", null],
    [100, "sativa", null],
  ])("labelFor(%i) → %s / %s", (pct, label, sublabel) => {
    expect(labelFor(pct)).toMatchObject({ label, sublabel });
  });

  it("a value below the scale is indica", () => {
    expect(labelFor(-1).label).toBe("indica");
  });

  // End to end: K (10) × T (90) weighted so the value lands on each boundary.
  it.each([
    [20, "indica", null],
    [21, "hybrid", "indica-dominant"],
    [40, "hybrid", "indica-dominant"],
    [41, "hybrid", "balanced"],
    [59, "hybrid", "balanced"],
    [60, "hybrid", "sativa-dominant"],
    [79, "hybrid", "sativa-dominant"],
    [80, "sativa", null],
  ])("a computed %i%% is %s / %s", (pct, label, sublabel) => {
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
