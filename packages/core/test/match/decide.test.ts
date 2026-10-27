import { describe, expect, it } from "vitest";
import {
  ACCEPT_BLOCKERS,
  ACCEPT_MIN_GAP,
  ACCEPT_THRESHOLD,
  CHOOSE_MAX_CANDIDATES,
  CHOOSE_THRESHOLD,
  decide,
  type RankedMatch,
} from "../../src/match";

const ranked = (score: number, overrides: Partial<RankedMatch> = {}): RankedMatch => ({
  strain_id: `s-${score}`,
  name: `S ${score}`,
  matched_key: `S ${score}`,
  candidate: `S ${score}`,
  score,
  exact: score === 1,
  number_mismatch: false,
  missing_number: false,
  cross_label: false,
  parent_of_cross: false,
  generic_only: false,
  ...overrides,
});

describe("decide (docs/06 §6)", () => {
  it("uses the documented thresholds", () => {
    expect(ACCEPT_THRESHOLD).toBe(0.9);
    expect(ACCEPT_MIN_GAP).toBe(0.15);
    expect(CHOOSE_THRESHOLD).toBe(0.6);
    expect(CHOOSE_MAX_CANDIDATES).toBe(3);
  });

  it("no matches → none", () => {
    expect(decide([])).toEqual({ kind: "none" });
  });

  it("top below CHOOSE_THRESHOLD → none", () => {
    expect(decide([ranked(0.59)])).toEqual({ kind: "none" });
  });

  it("top at CHOOSE_THRESHOLD → choose", () => {
    expect(decide([ranked(0.6)])).toMatchObject({
      kind: "choose",
      blocked_by: ["below_accept_threshold"],
    });
  });

  it("accepts at the exact boundaries (inclusive, despite float rounding)", () => {
    const top = ranked(0.95);
    expect(decide([top, ranked(0.8)])).toEqual({ kind: "accept", match: top });
    expect(decide([ranked(0.9)])).toMatchObject({ kind: "accept" });
  });

  it("a lone match only needs the score", () => {
    expect(decide([ranked(1)])).toMatchObject({ kind: "accept" });
  });

  it("small gap → choose", () => {
    expect(decide([ranked(1), ranked(0.86)])).toMatchObject({
      kind: "choose",
      blocked_by: ["small_gap"],
    });
  });

  it.each([
    ["number_mismatch", { number_mismatch: true }],
    ["missing_number", { missing_number: true }],
    ["parent_of_cross", { parent_of_cross: true }],
    ["generic_only", { generic_only: true }],
  ] as const)("%s blocks accept", (blocker, flags) => {
    expect(decide([ranked(1, flags)])).toMatchObject({ kind: "choose", blocked_by: [blocker] });
  });

  it("a cross label on its own doesn't block accept", () => {
    expect(decide([ranked(1, { cross_label: true })])).toMatchObject({ kind: "accept" });
  });

  it("reports every blocker in ACCEPT_BLOCKERS order", () => {
    const decision = decide([
      ranked(0.7, {
        number_mismatch: true,
        missing_number: true,
        parent_of_cross: true,
        generic_only: true,
      }),
      ranked(0.69),
    ]);
    expect(decision).toMatchObject({ kind: "choose", blocked_by: [...ACCEPT_BLOCKERS] });
  });

  it("offers at most CHOOSE_MAX_CANDIDATES, best first", () => {
    const list = [ranked(0.8), ranked(0.75), ranked(0.7), ranked(0.65), ranked(0.62)];
    const decision = decide(list);
    expect(decision.kind === "choose" && decision.candidates).toEqual(list.slice(0, 3));
  });
});
