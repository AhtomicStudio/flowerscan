// Ranked matches → accept / "Which one?" / no match (docs/06 §6).
import {
  ACCEPT_MIN_GAP,
  ACCEPT_THRESHOLD,
  CHOOSE_MAX_CANDIDATES,
  CHOOSE_THRESHOLD,
} from "./constants";
import type { RankedMatch } from "./match";

/** Why the top match was not auto-accepted, in the order `decide` checks them. */
export const ACCEPT_BLOCKERS = [
  "below_accept_threshold",
  "small_gap",
  "number_mismatch",
  "missing_number",
  "parent_of_cross",
  "generic_only",
] as const;
export type AcceptBlocker = (typeof ACCEPT_BLOCKERS)[number];

export type MatchDecision =
  | { readonly kind: "accept"; readonly match: RankedMatch }
  | {
      readonly kind: "choose";
      /** Up to CHOOSE_MAX_CANDIDATES matches, best first. The UI adds "None of these". */
      readonly candidates: readonly RankedMatch[];
      readonly blocked_by: readonly AcceptBlocker[];
    }
  | { readonly kind: "none" };

/**
 * The docs/06 §6 table. `ranked` is `match` output (best first).
 * - accept: top ≥ ACCEPT_THRESHOLD, top − second ≥ ACCEPT_MIN_GAP, and the top match has no number
 *   mismatch, missing number, parent-of-a-cross, or generic-only flag;
 * - choose: otherwise, when top ≥ CHOOSE_THRESHOLD;
 * - none: otherwise.
 */
export function decide(ranked: readonly RankedMatch[]): MatchDecision {
  const [top, second] = ranked;
  if (top === undefined || !atLeast(top.score, CHOOSE_THRESHOLD)) return { kind: "none" };
  const blocked = new Set<AcceptBlocker>();
  if (!atLeast(top.score, ACCEPT_THRESHOLD)) blocked.add("below_accept_threshold");
  if (!atLeast(top.score - (second?.score ?? 0), ACCEPT_MIN_GAP)) blocked.add("small_gap");
  if (top.number_mismatch) blocked.add("number_mismatch");
  if (top.missing_number) blocked.add("missing_number");
  if (top.parent_of_cross) blocked.add("parent_of_cross");
  if (top.generic_only) blocked.add("generic_only");
  if (blocked.size === 0) return { kind: "accept", match: top };
  return {
    kind: "choose",
    candidates: ranked.slice(0, CHOOSE_MAX_CANDIDATES),
    blocked_by: ACCEPT_BLOCKERS.filter((blocker) => blocked.has(blocker)),
  };
}

/** Floating-point slack, so `0.95 − 0.80` still counts as a gap of 0.15. */
const SCORE_EPSILON = 1e-9;

/** `value ≥ threshold`, inclusive as docs/06 §6 writes it, despite floating-point rounding. */
function atLeast(value: number, threshold: number): boolean {
  return value + SCORE_EPSILON >= threshold;
}
