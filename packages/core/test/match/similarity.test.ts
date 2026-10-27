// Internal similarity measures behind the docs/06 §5 score.
import { describe, expect, it } from "vitest";
import {
  containsRun,
  distinct,
  jaccardFromCounts,
  jaro,
  jaroWinkler,
  jaroWinklerBound,
  tokenOverlap,
  trigrams,
} from "../../src/match/similarity";
import { seededRandom } from "./fixtures";

describe("trigrams", () => {
  it("pads with one space on each side and keeps distinct trigrams", () => {
    expect(trigrams("og")).toEqual([" og", "og "]);
    expect(trigrams("z")).toEqual([" z "]);
    expect(trigrams("")).toEqual([]);
    expect(trigrams("aaaa")).toEqual([" aa", "aaa", "aa "]);
  });
});

describe("jaro / jaroWinkler", () => {
  it.each([
    ["martha", "marhta", 0.9444, 0.9611],
    ["dwayne", "duane", 0.8222, 0.84],
    ["dixon", "dicksonx", 0.7667, 0.8133],
    ["abc", "xyz", 0, 0],
    ["", "abc", 0, 0],
    ["same", "same", 1, 1],
  ])("%j vs %j", (a, b, expectedJaro, expectedWinkler) => {
    expect(jaro(a, b)).toBeCloseTo(expectedJaro, 4);
    expect(jaroWinkler(a, b)).toBeCloseTo(expectedWinkler, 4);
    expect(jaro(b, a)).toBeCloseTo(jaro(a, b), 10);
  });

  it("handles strings longer than 31 characters", () => {
    const long = "abcdefghijklmnopqrstuvwxyz0123456789ABCD"; // 40 distinct characters
    expect(jaro(long, `${long.slice(0, 39)}#`)).toBeCloseTo((39 / 40 + 39 / 40 + 1) / 3, 10);
    const swapped = `${long.slice(0, 10)}${long[11]}${long[10]}${long.slice(12)}`;
    expect(jaro(long, swapped)).toBeCloseTo((1 + 1 + 39 / 40) / 3, 10);
    expect(jaro(long, "zzzz")).toBe(jaro("zzzz", long));
    expect(jaro(`${long}!`, "?".repeat(41))).toBe(0);
  });

  it("never exceeds the length bound (seeded property)", () => {
    const random = seededRandom(3);
    const word = () => {
      let text = "";
      const length = 1 + Math.floor(random() * 45);
      for (let i = 0; i < length; i += 1) text += "abcde "[Math.floor(random() * 6)];
      return text;
    };
    for (let i = 0; i < 2000; i += 1) {
      const a = word();
      const b = word();
      const score = jaroWinkler(a, b);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(jaroWinklerBound(a.length, b.length) + 1e-12);
    }
    expect(jaroWinklerBound(0, 3)).toBe(0);
  });
});

describe("token helpers", () => {
  it("computes Jaccard from counts", () => {
    expect(jaccardFromCounts(0, 0, 0)).toBe(0);
    expect(jaccardFromCounts(4, 4, 2)).toBeCloseTo(1 / 3, 10);
  });

  it("measures token overlap over distinct tokens", () => {
    expect(distinct(["runtz", "white", "runtz"])).toEqual(["runtz", "white"]);
    expect(tokenOverlap(["blue", "dream"], ["blue", "dream"])).toBe(1);
    expect(tokenOverlap(["gelato", "33"], ["gelato", "41"])).toBeCloseTo(1 / 3, 10);
    expect(tokenOverlap([], [])).toBe(0);
  });

  it("finds contiguous runs", () => {
    expect(containsRun(["white", "runtz", "3"], ["white", "runtz"])).toBe(true);
    expect(containsRun(["white", "runtz", "3"], ["runtz", "3"])).toBe(true);
    expect(containsRun(["white", "big", "runtz"], ["white", "runtz"])).toBe(false);
    expect(containsRun(["a"], [])).toBe(false);
    expect(containsRun(["a"], ["a", "b"])).toBe(false);
  });
});
