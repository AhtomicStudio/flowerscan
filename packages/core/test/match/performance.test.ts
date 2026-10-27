// T-008 acceptance: `match` over a 5,000-entry index with 50 candidates runs in < 20 ms.
import { describe, expect, it } from "vitest";
import { buildIndex, decide, type MatchCandidate, match } from "../../src/match";
import { labelCandidates, seededRandom, syntheticRecords } from "./fixtures";

// Core's tsconfig has no DOM/Node lib, but the test runner provides a high-resolution clock.
const clock = (globalThis as unknown as { performance: { now(): number } }).performance;

const BUDGET_MS = 20;

/** 50 candidates shaped like a real label read: n-grams of a name, noise, and typos. */
function labelLikeCandidates(names: readonly string[], seed: number): MatchCandidate[] {
  const random = seededRandom(seed);
  const name = names[Math.floor(random() * names.length)] as string;
  const typo = name.replace(/[aeiou]/, "0");
  const lines = [
    "ACME FARMS",
    name,
    "INDICA 3.5g NET WT",
    "THC 24.1% CBD <1%",
    "GOVERNMENT WARNING KEEP OUT OF REACH",
    typo,
  ];
  return labelCandidates(lines).slice(0, 50);
}

describe("match performance", () => {
  const records = syntheticRecords(5000, 42);
  const index = buildIndex(records);
  const names = records.map((record) => record.name);

  it("uses exactly 50 candidates against 5,000 entries", () => {
    expect(index.entries).toHaveLength(5000);
    expect(labelLikeCandidates(names, 1)).toHaveLength(50);
  });

  it(`matches 50 candidates in < ${BUDGET_MS} ms (median of 15 label reads)`, () => {
    const runs: number[] = [];
    for (let seed = 0; seed < 20; seed += 1) {
      const candidates = labelLikeCandidates(names, seed);
      const started = clock.now();
      decide(match(index, candidates));
      const elapsed = clock.now() - started;
      if (seed >= 5) runs.push(elapsed); // the first reads warm up the JIT
    }
    runs.sort((a, b) => a - b);
    const median = runs[Math.floor(runs.length / 2)] ?? Number.POSITIVE_INFINITY;
    console.info(
      `match: median ${median.toFixed(2)} ms, max ${(runs.at(-1) ?? 0).toFixed(2)} ms over ${runs.length} reads`,
    );
    expect(median).toBeLessThan(BUDGET_MS);
  });
});
