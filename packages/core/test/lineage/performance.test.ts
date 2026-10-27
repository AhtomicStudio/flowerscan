import { describe, expect, it } from "vitest";
import { computeAll, findCycles } from "../../src/lineage";
import { graphOf, randomDag, seededRandom } from "./helpers";

const SIZE = 5_000;
const BUDGET_MS = 50;

describe("memoization and performance", () => {
  it("the seeded generator is deterministic", () => {
    const a = seededRandom(2026);
    const b = seededRandom(2026);
    const first = Array.from({ length: 5 }, a);
    expect(Array.from({ length: 5 }, b)).toEqual(first);
    expect(first.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it(`computes a ${SIZE}-node random DAG in < ${BUDGET_MS} ms`, () => {
    const graph = graphOf(...randomDag(SIZE, 20261026));
    // Warm-up, so JIT compilation doesn't count against the budget. Logged for comparison.
    const coldStart = performance.now();
    computeAll(graph);
    const cold = performance.now() - coldStart;

    const timings: number[] = [];
    let result = new Map();
    for (let run = 0; run < 5; run += 1) {
      const start = performance.now();
      result = computeAll(graph);
      timings.push(performance.now() - start);
    }
    timings.sort((x, y) => x - y);
    const median = timings[2] ?? Number.POSITIVE_INFINITY;
    console.info(
      `computeAll on ${SIZE} nodes: median ${median.toFixed(2)} ms, ` +
        `min ${timings[0]?.toFixed(2)} ms, max ${timings[4]?.toFixed(2)} ms, cold ${cold.toFixed(2)} ms`,
    );
    expect(result.size).toBe(SIZE);
    expect(median).toBeLessThan(BUDGET_MS);
  });

  it(`finds no cycles in the ${SIZE}-node DAG in < ${BUDGET_MS} ms`, () => {
    const graph = graphOf(...randomDag(SIZE, 99));
    findCycles(graph);
    const start = performance.now();
    expect(findCycles(graph)).toEqual([]);
    expect(performance.now() - start).toBeLessThan(BUDGET_MS);
  });
});
