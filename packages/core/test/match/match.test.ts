import { describe, expect, it } from "vitest";
import {
  buildIndex,
  CROSS_MARKER,
  decide,
  MATCH_MAX_RESULTS,
  type MatchCandidate,
  type MatchDecision,
  match,
  POPULARITY_PRIOR_MAX,
  type RankedMatch,
} from "../../src/match";
import type { StrainRecord } from "../../src/schema/build-output";
import { labelCandidates, NAMING_RECORDS, namingIndex } from "./fixtures";

const one = (text: string, weight = 1): MatchCandidate[] => [{ text, weight }];
const fromLabel = (...lines: string[]): MatchDecision =>
  decide(match(namingIndex, labelCandidates(lines)));
const acceptedId = (decision: MatchDecision): string | null =>
  decision.kind === "accept" ? decision.match.strain_id : null;

describe("match: T-008 acceptance cases", () => {
  it("exact name → 1.0 and accept", () => {
    const [top] = match(namingIndex, one("Blue Dream"));
    expect(top).toMatchObject({ strain_id: "blue-dream", score: 1, exact: true });
    expect(acceptedId(decide(match(namingIndex, one("BLUE DREAM"))))).toBe("blue-dream");
  });

  it("alias (GG4) → 1.0, reports the alias that matched", () => {
    const [top] = match(namingIndex, one("GG4"));
    expect(top).toMatchObject({
      strain_id: "gorilla-glue-4",
      name: "Gorilla Glue #4",
      matched_key: "GG4",
      candidate: "GG4",
      score: 1,
      exact: true,
    });
  });

  it.each(["GELATO #33", "Gelato 33", "gelato#33", "Gelato #033", "GELATO33"])(
    "`#` and digit handling: %j → Gelato #33",
    (text) => {
      expect(acceptedId(decide(match(namingIndex, one(text))))).toBe("gelato-33");
    },
  );

  it("OCR confusions: a misread letter inside a word folds and still accepts", () => {
    expect(acceptedId(fromLabel("G0RILLA GLUE #4"))).toBe("gorilla-glue-4");
    expect(acceptedId(fromLabel("PURPIE PUNCH"))).toBe("purple-punch");
    expect(acceptedId(fromLabel("8LUE DREAM"))).toBe("blue-dream");
  });

  it("OCR confusions: G0RILLA GLU3 offers the Gorilla Glue phenos but never accepts", () => {
    const decision = fromLabel("G0RILLA GLU3");
    expect(decision.kind).toBe("choose");
    if (decision.kind !== "choose") return;
    expect(decision.candidates.map((c) => c.strain_id).sort()).toEqual([
      "gorilla-glue-1",
      "gorilla-glue-4",
      "gorilla-glue-5",
    ]);
    expect(decision.blocked_by).toContain("number_mismatch");
  });

  it("wrapped names: BLUE / DREAM on two lines", () => {
    expect(acceptedId(fromLabel("BLUE", "DREAM"))).toBe("blue-dream");
  });

  it("brand noise: ACME FARMS BLUE DREAM", () => {
    expect(acceptedId(fromLabel("ACME FARMS BLUE DREAM"))).toBe("blue-dream");
    expect(acceptedId(fromLabel("ACME FARMS", "BLUE DREAM", "INDICA 3.5g"))).toBe("blue-dream");
  });

  it("two similar strains → choose, not accept", () => {
    const index = buildIndex([
      { id: "purple-punch", name: "Purple Punch", aliases: [] },
      { id: "purple-punk", name: "Purple Punk", aliases: [] },
    ]);
    const decision = decide(match(index, labelCandidates(["PURPLE PUN"])));
    expect(decision.kind).toBe("choose");
    if (decision.kind !== "choose") return;
    expect(decision.candidates.map((c) => c.strain_id).sort()).toEqual([
      "purple-punch",
      "purple-punk",
    ]);
    expect(decision.blocked_by).toContain("small_gap");
  });

  it.each([["QXZV PLMT 7781"], ["!!!"], [""], ["NET WT 3.5g"], ["GOVERNMENT WARNING"]])(
    "gibberish %j → none",
    (text) => {
      expect(fromLabel(text).kind).toBe("none");
    },
  );
});

describe("match: numbers are identity (P5)", () => {
  it("flags a number mismatch and never accepts it", () => {
    const phenos = buildIndex([
      { id: "gelato-41", name: "Gelato #41", aliases: [] },
      { id: "gelato-43", name: "Gelato #43", aliases: [] },
    ]);
    const ranked = match(phenos, one("Gelato #47"));
    expect(ranked.map((r) => r.number_mismatch)).toEqual([true, true]);
    const decision = decide(ranked);
    expect(decision.kind === "choose" && decision.blocked_by).toContain("number_mismatch");
    // With the seed line in the index, the unnumbered Gelato wins and is capped instead.
    expect(match(namingIndex, one("Gelato #47"))[0]).toMatchObject({
      strain_id: "gelato",
      missing_number: true,
    });
  });

  it("flags a missing number on either side", () => {
    expect(match(namingIndex, one("Gorilla Glue"))[0]?.missing_number).toBe(true);
    const [top] = match(namingIndex, one("Blue Dream 2"));
    expect(top).toMatchObject({ strain_id: "blue-dream", missing_number: true });
    expect(decide(match(namingIndex, one("Blue Dream 2"))).kind).toBe("choose");
  });

  it("compares numbers with the alias that matched, not the canonical name", () => {
    const [top] = match(namingIndex, one("Original Glue"));
    expect(top).toMatchObject({ strain_id: "gorilla-glue-4", missing_number: false });
  });
});

describe("match: cross notation (P4)", () => {
  const crossIndex = buildIndex([
    ...NAMING_RECORDS,
    { id: "wedding-cake-x-gelato-33", name: "Wedding Cake x Gelato 33", aliases: [] },
  ]);

  it("accepts a curated strain whose name is the cross", () => {
    for (const text of ["Wedding Cake x Gelato 33", "WEDDING CAKE × GELATO #33"]) {
      const ranked = match(crossIndex, labelCandidates([text]));
      const decision = decide(ranked);
      expect(acceptedId(decision)).toBe("wedding-cake-x-gelato-33");
      expect(ranked[0]).toMatchObject({ cross_label: true, parent_of_cross: false });
    }
  });

  it("never auto-accepts a single parent, even with an exact parent hit", () => {
    const ranked = match(namingIndex, one("Wedding Cake x Runtz").concat(one("Wedding Cake")));
    const parent = ranked.find((r) => r.strain_id === "wedding-cake");
    expect(parent).toMatchObject({ exact: true, parent_of_cross: true, cross_label: false });
    expect(decide(ranked).kind).toBe("choose");
  });

  it("does not read a quantity x as a cross", () => {
    const ranked = match(namingIndex, labelCandidates(["5 x 0.5g PRE-ROLLS JACK HERER"]));
    expect(ranked.some((r) => r.cross_label || r.parent_of_cross)).toBe(false);
    expect(normalizeHasMarker("5 x 0.5g")).toBe(false);
  });
});

function normalizeHasMarker(text: string): boolean {
  return match(namingIndex, one(text)).some((r) => r.cross_label) || text.includes(CROSS_MARKER);
}

describe("match: generic tokens", () => {
  const index = buildIndex([
    { id: "kush", name: "Kush", aliases: [] },
    { id: "og-kush", name: "OG Kush", aliases: [] },
  ]);

  it("an exact hit on a generic-only candidate is flagged and capped at choose", () => {
    const ranked = match(index, one("KUSH"));
    expect(ranked[0]).toMatchObject({ strain_id: "kush", exact: true, generic_only: true });
    const decision = decide(ranked);
    expect(decision.kind === "choose" && decision.blocked_by).toEqual(["generic_only"]);
  });

  it("a multi-token name made of generic tokens still accepts", () => {
    expect(acceptedId(decide(match(index, one("OG Kush"))))).toBe("og-kush");
  });
});

describe("match: longest exact match wins (P6)", () => {
  it("a contained exact hit doesn't compete with the longer one", () => {
    const ranked = match(namingIndex, labelCandidates(["RUNTZ", "White Runtz", "3.5g"]));
    expect(ranked[0]).toMatchObject({ strain_id: "white-runtz", exact: true });
    const runtz = ranked.find((r) => r.strain_id === "runtz");
    expect(runtz === undefined || !runtz.exact).toBe(true);
  });

  it("without the longer hit, the short one stands", () => {
    expect(acceptedId(fromLabel("RUNTZ", "3.5g"))).toBe("runtz");
  });
});

describe("match: weights, ranking and limits", () => {
  it("exact hits score 1.0 whatever the weight; fuzzy scores use it", () => {
    expect(match(namingIndex, one("Blue Dream", 0))[0]?.score).toBe(1);
    const heavy = match(namingIndex, one("Blue Dreem", 1))[0]?.score ?? 0;
    const light = match(namingIndex, one("Blue Dreem", 0.2))[0]?.score ?? 0;
    expect(heavy - light).toBeCloseTo(0.08, 10);
  });

  it("clamps weights to 0–1", () => {
    const score = (weight: number) => match(namingIndex, one("Blue Dreem", weight))[0]?.score;
    expect(score(5)).toBe(score(1));
    expect(score(-1)).toBe(score(0));
    expect(score(Number.NaN)).toBe(score(0));
  });

  it("merges duplicate candidates, keeping the higher weight", () => {
    const merged = match(namingIndex, [
      { text: "Blue Dreem", weight: 0.2 },
      { text: "BLUE  DREEM", weight: 0.9 },
    ]);
    expect(merged[0]?.score).toBe(match(namingIndex, one("Blue Dreem", 0.9))[0]?.score);
    expect(merged[0]?.candidate).toBe("Blue Dreem");
  });

  it("returns at most MATCH_MAX_RESULTS distinct strains, best first", () => {
    const records: StrainRecord[] = Array.from({ length: 12 }, (_, i) => strainRecord(i));
    const ranked = match(buildIndex(records), one("Lemon Haze"));
    expect(ranked).toHaveLength(MATCH_MAX_RESULTS);
    expect(new Set(ranked.map((r) => r.strain_id)).size).toBe(ranked.length);
    expect(ranked[0]?.strain_id).toBe("lemon-haze-0");
    expectSorted(ranked);
  });

  it("offers both same-name strains, ordered by id, and never accepts either", () => {
    const index = buildIndex([
      { id: "wedding-cake-seed-junky", name: "Wedding Cake", aliases: [] },
      { id: "wedding-cake", name: "Wedding Cake", aliases: [] },
    ]);
    const ranked = match(index, one("Wedding Cake"));
    expect(ranked.map((r) => r.strain_id)).toEqual(["wedding-cake", "wedding-cake-seed-junky"]);
    expect(decide(ranked)).toMatchObject({ kind: "choose", blocked_by: ["small_gap"] });
  });

  it("returns nothing for no candidates or an empty index", () => {
    expect(match(namingIndex, [])).toEqual([]);
    expect(match(buildIndex([]), one("Blue Dream"))).toEqual([]);
  });

  it("breaks near-ties by popularity, but never overturns a clearly better match", () => {
    const records = NAMING_RECORDS.map((record) =>
      record.id === "gorilla-glue-5" ? { ...record, popularity: 1 } : record,
    );
    const index = buildIndex(records);
    expect(match(index, one("Gorilla Glue"))[0]?.strain_id).toBe("gorilla-glue-5");
    expect(match(namingIndex, one("Gorilla Glue"))[0]?.strain_id).toBe("gorilla-glue-1");
    const exact = match(index, one("Gorilla Glue #4"));
    expect(exact[0]?.strain_id).toBe("gorilla-glue-4");
    expect((exact[0]?.score ?? 0) - (exact[1]?.score ?? 0)).toBeGreaterThan(POPULARITY_PRIOR_MAX);
  });

  it("is deterministic and independent of candidate order", () => {
    const candidates = labelCandidates(["ACME", "Gelato x Zkittlez", "GG #5", "Sherbert"]);
    const first = match(namingIndex, candidates);
    expect(match(namingIndex, candidates)).toEqual(first);
    const reversed = match(namingIndex, [...candidates].reverse());
    expect(reversed.map((r) => [r.strain_id, r.score])).toEqual(
      first.map((r) => [r.strain_id, r.score]),
    );
  });

  it("accepts StrainRecord objects as they come from strains.json", () => {
    const index = buildIndex([strainRecord(0)]);
    expect(match(index, one("Lemon Haze"))[0]?.strain_id).toBe("lemon-haze-0");
  });
});

function strainRecord(i: number): StrainRecord {
  return {
    id: `lemon-haze-${i}`,
    name: i === 0 ? "Lemon Haze" : `Lemon Haze ${String.fromCharCode(97 + i)}`,
    aliases: [],
    kind: "strain",
    parents: ["unknown"],
    parent_weights: null,
    derivation: null,
    reported_type: "unknown",
    breeder_id: null,
    effects: [],
    flavors: [],
    terpenes: [],
    verification: "unverified",
    lineage: {
      sativa_pct: null,
      indica_pct: null,
      label: "unknown",
      sublabel: null,
      confidence: 0,
      confidence_level: "none",
      method: "unknown",
      algo_version: 1,
    },
    source_count: 0,
  };
}

function expectSorted(ranked: readonly RankedMatch[]): void {
  for (let i = 1; i < ranked.length; i += 1) {
    expect((ranked[i - 1]?.score ?? 0) + POPULARITY_PRIOR_MAX).toBeGreaterThanOrEqual(
      ranked[i]?.score ?? 0,
    );
  }
}
