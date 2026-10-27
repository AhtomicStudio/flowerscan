// T-008 acceptance: no match result ever contains an id that isn't in the index.
// Seeded and deterministic: the same seeds generate the same indexes and candidates every run.
import { describe, expect, it } from "vitest";
import {
  buildIndex,
  CHOOSE_MAX_CANDIDATES,
  decide,
  MATCH_MAX_RESULTS,
  MATCH_MIN_SCORE,
  type MatchCandidate,
  match,
  POPULARITY_PRIOR_MAX,
  search,
} from "../../src/match";
import { NAMING_RECORDS, seededRandom, syntheticRecords } from "./fixtures";

const NOISE = ["#", "x", "×", " ", "0", "1", "5", "8", "3.5g", "-", "&", "(I)", "ACME", "THC"];

/** Label-like candidates: real names mutated (case, typos, glued digits, noise) plus gibberish. */
function randomCandidates(names: readonly string[], random: () => number): MatchCandidate[] {
  const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)] as T;
  const count = 1 + Math.floor(random() * 60);
  const candidates: MatchCandidate[] = [];
  for (let i = 0; i < count; i += 1) {
    let text = random() < 0.85 ? pick(names) : "";
    const edits = Math.floor(random() * 4);
    for (let e = 0; e < edits; e += 1) {
      const at = Math.floor(random() * (text.length + 1));
      const roll = random();
      if (roll < 0.4) text = text.slice(0, at) + pick(NOISE) + text.slice(at);
      else if (roll < 0.7) text = text.slice(0, at) + text.slice(at + 1);
      else text = random() < 0.5 ? text.toUpperCase() : text.replaceAll(" ", "");
    }
    if (random() < 0.2) text = `${text} x ${pick(names)}`;
    const weight = random() < 0.1 ? Number.NaN : random() * 1.2 - 0.1;
    candidates.push({ text, weight });
  }
  return candidates;
}

describe("match property: results come only from the index", () => {
  it("holds for 200 seeded (index, candidates) pairs", () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const random = seededRandom(seed);
      const records = [
        ...syntheticRecords(20 + Math.floor(random() * 200), seed),
        ...(seed % 2 === 0 ? NAMING_RECORDS : []),
      ];
      const ids = new Set(records.map((record) => record.id));
      const index = buildIndex(records);
      // Draw from names in and out of the index so misses are exercised too.
      const names = [...records.map((record) => record.name), "Gelato x Zkittlez", "Unlisted Haze"];
      const ranked = match(index, randomCandidates(names, random));

      expect(ranked.length).toBeLessThanOrEqual(MATCH_MAX_RESULTS);
      expect(new Set(ranked.map((result) => result.strain_id)).size).toBe(ranked.length);
      ranked.forEach((result, position) => {
        expect(ids.has(result.strain_id), `seed ${seed}: ${result.strain_id}`).toBe(true);
        expect(result.score).toBeGreaterThanOrEqual(MATCH_MIN_SCORE);
        expect(result.score).toBeLessThanOrEqual(1);
        const next = ranked[position + 1];
        if (next) expect(result.score + POPULARITY_PRIOR_MAX).toBeGreaterThanOrEqual(next.score);
      });

      const decision = decide(ranked);
      if (decision.kind === "accept") {
        expect(decision.match).toBe(ranked[0]);
        expect(decision.match).toMatchObject({
          number_mismatch: false,
          missing_number: false,
          parent_of_cross: false,
          generic_only: false,
        });
      }
      if (decision.kind === "choose") {
        expect(decision.candidates.length).toBeLessThanOrEqual(CHOOSE_MAX_CANDIDATES);
        for (const candidate of decision.candidates) expect(ranked).toContain(candidate);
      }

      const query = names[Math.floor(random() * names.length)]?.slice(0, 1 + (seed % 8)) ?? "";
      for (const result of search(index, query)) expect(ids.has(result.strain_id)).toBe(true);
    }
  });

  it("is deterministic for a seed", () => {
    const run = () => {
      const random = seededRandom(99);
      const records = syntheticRecords(300, 99);
      return match(
        buildIndex(records),
        randomCandidates(
          records.map((r) => r.name),
          random,
        ),
      );
    };
    expect(run()).toEqual(run());
  });
});
