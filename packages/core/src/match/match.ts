// Candidate strings → ranked strain matches (docs/06 §5).
import type { IndexEntry, IndexKey, MatchIndex } from "./build-index";
import {
  CHOOSE_THRESHOLD,
  MATCH_MAX_RESULTS,
  MATCH_MIN_SCORE,
  POPULARITY_PRIOR_MAX,
} from "./constants";
import { CROSS_MARKER } from "./normalize";
import { createScratch, type PreparedQuery, prepareQuery, scoreQuery } from "./score";
import { containsRun } from "./similarity";

/** A candidate string from Extract (docs/06 §3) with its 0–1 weight. */
export interface MatchCandidate {
  readonly text: string;
  readonly weight: number;
}

/** One strain the matcher returned, with the best (candidate, name/alias) pair behind it. */
export interface RankedMatch {
  readonly strain_id: string;
  /** Canonical display name. */
  readonly name: string;
  /** The name or alias that matched, as written in the data. */
  readonly matched_key: string;
  /** The candidate text that matched, as given. */
  readonly candidate: string;
  /** Text score, 0–1. The popularity prior is not included. */
  readonly score: number;
  /** Exact name/alias hit after normalization. */
  readonly exact: boolean;
  /** Candidate and matched key carry different numbers (P5). Blocks auto-accept. */
  readonly number_mismatch: boolean;
  /** Exactly one of candidate and matched key carries a number (P5). Caps at "Which one?". */
  readonly missing_number: boolean;
  /** The candidate contains the cross marker (P4). */
  readonly cross_label: boolean;
  /** This strain is named on one side of an "A x B" candidate: a parent, not a match (P4). */
  readonly parent_of_cross: boolean;
  /** The candidate is one generic token or one letter (docs/06 §4). Blocks auto-accept. */
  readonly generic_only: boolean;
}

/** Score only pairs that could reach "Which one?"; keep those scoring at least MATCH_MIN_SCORE. */
const MATCH_LIMITS = { floor: MATCH_MIN_SCORE, reach: CHOOSE_THRESHOLD } as const;

interface Pair {
  readonly candidate: number;
  readonly key: number;
  readonly score: number;
  readonly exact: boolean;
  readonly numberMismatch: boolean;
  readonly missingNumber: boolean;
}

/**
 * Scores every candidate against the index and returns the top MATCH_MAX_RESULTS distinct strains
 * (docs/06 §5). Each strain keeps its best pair. Pairs below MATCH_MIN_SCORE are dropped.
 *
 * Longest exact match wins (P6): when a candidate hits a name or alias exactly (or exactly after
 * confusion folding), the candidates contained in it don't count for other strains. So
 * `GELATO #33` never also matches `Gelato`, and `White Runtz` never also matches `Runtz`.
 *
 * Deterministic: ties break by name, then id. Only ids from the index are ever returned.
 */
export function match(index: MatchIndex, candidates: readonly MatchCandidate[]): RankedMatch[] {
  const queries = prepareCandidates(candidates);
  if (queries.length === 0 || index.keys.length === 0) return [];
  const scratch = createScratch(index);
  const scoredPerQuery = queries.map((query) => scoreQuery(index, query, MATCH_LIMITS, scratch));
  const strongEntries = scoredPerQuery.map(
    (scored) =>
      new Set(scored.filter((pair) => pair.strong).map((pair) => keyAt(index, pair.key).entry)),
  );
  const coverers = queries.map((query, position) =>
    coveringQueries(queries, strongEntries, query, position),
  );

  const best = new Map<number, Pair>();
  scoredPerQuery.forEach((scored, candidate) => {
    const query = queries[candidate] as PreparedQuery;
    for (const scoredKey of scored) {
      if (scoredKey.score < MATCH_MIN_SCORE) continue;
      const key = keyAt(index, scoredKey.key);
      const covering = coverers[candidate] ?? [];
      if (covering.some((strong) => !strong.has(key.entry))) continue;
      const pair: Pair = {
        candidate,
        key: scoredKey.key,
        score: scoredKey.score,
        exact: scoredKey.exact,
        numberMismatch: query.numbers !== "" && key.numbers !== "" && query.numbers !== key.numbers,
        missingNumber: (query.numbers === "") !== (key.numbers === ""),
      };
      const current = best.get(key.entry);
      if (current === undefined || isBetterPair(pair, current, queries)) best.set(key.entry, pair);
    }
  });

  const crossSides = sidesOfCrosses(queries);
  const ranked = [...best.entries()].map(([entryPosition, pair]) => {
    const entry = index.entries[entryPosition] as IndexEntry;
    const query = queries[pair.candidate] as PreparedQuery;
    const result: RankedMatch = {
      strain_id: entry.id,
      name: entry.name,
      matched_key: keyAt(index, pair.key).text,
      candidate: query.text,
      score: pair.score,
      exact: pair.exact,
      number_mismatch: pair.numberMismatch,
      missing_number: pair.missingNumber,
      cross_label: query.crossLabel,
      parent_of_cross: isParentOfCross(index, entry, crossSides),
      generic_only: query.genericOnly,
    };
    return { result, rank: pair.score + POPULARITY_PRIOR_MAX * entry.popularity };
  });
  ranked.sort(
    (a, b) =>
      b.rank - a.rank ||
      b.result.score - a.result.score ||
      compareText(a.result.name, b.result.name) ||
      compareText(a.result.strain_id, b.result.strain_id),
  );
  return ranked.slice(0, MATCH_MAX_RESULTS).map(({ result }) => result);
}

/** Normalizes candidates and merges duplicates (same normalized text), keeping the top weight. */
function prepareCandidates(candidates: readonly MatchCandidate[]): PreparedQuery[] {
  const byNormal = new Map<string, PreparedQuery>();
  for (const candidate of candidates) {
    const query = prepareQuery(candidate.text, candidate.weight);
    if (query === null) continue;
    const existing = byNormal.get(query.normal);
    if (existing === undefined) byNormal.set(query.normal, query);
    else if (query.weight > existing.weight)
      byNormal.set(query.normal, { ...existing, weight: query.weight });
  }
  return [...byNormal.values()];
}

/**
 * The strong-hit entry sets of every longer candidate that contains this one and hits a name
 * or alias exactly. Tokens are compared with the cross marker read as a plain `x`.
 */
function coveringQueries(
  queries: readonly PreparedQuery[],
  strongEntries: readonly ReadonlySet<number>[],
  query: PreparedQuery,
  position: number,
): ReadonlySet<number>[] {
  const inner = plainTokens(query);
  const covering: ReadonlySet<number>[] = [];
  queries.forEach((other, otherPosition) => {
    const strong = strongEntries[otherPosition] as ReadonlySet<number>;
    if (otherPosition === position || strong.size === 0) return;
    const outer = plainTokens(other);
    if (outer.length > inner.length && containsRun(outer, inner)) covering.push(strong);
  });
  return covering;
}

function plainTokens(query: PreparedQuery): string[] {
  return query.tokens.map((token) => (token === CROSS_MARKER ? "x" : token));
}

interface CrossSides {
  readonly normal: readonly (readonly string[])[];
  readonly folded: readonly (readonly string[])[];
}

/** The spans on either side of each cross marker, in normalized and folded tokens. */
function sidesOfCrosses(queries: readonly PreparedQuery[]): CrossSides {
  const normal: string[][] = [];
  const folded: string[][] = [];
  for (const query of queries) {
    if (!query.crossLabel) continue;
    normal.push(...splitAtMarker(query.tokens));
    folded.push(...splitAtMarker(query.foldedTokens));
  }
  return { normal, folded };
}

function splitAtMarker(tokens: readonly string[]): string[][] {
  const sides: string[][] = [[]];
  for (const token of tokens) {
    if (token === CROSS_MARKER) sides.push([]);
    else sides[sides.length - 1]?.push(token);
  }
  return sides.filter((side) => side.length > 0);
}

/** A strain is a parent of a cross label if one of its names sits inside one side of the cross. */
function isParentOfCross(index: MatchIndex, entry: IndexEntry, sides: CrossSides): boolean {
  if (sides.normal.length === 0) return false;
  for (let position = entry.keyStart; position < entry.keyEnd; position += 1) {
    const key = keyAt(index, position);
    if (sides.normal.some((side) => containsRun(side, key.tokens))) return true;
    if (sides.folded.some((side) => containsRun(side, key.foldedTokens))) return true;
  }
  return false;
}

function isBetterPair(pair: Pair, current: Pair, queries: readonly PreparedQuery[]): boolean {
  if (pair.score !== current.score) return pair.score > current.score;
  if (pair.exact !== current.exact) return pair.exact;
  const flags = flagCount(pair, queries);
  const currentFlags = flagCount(current, queries);
  if (flags !== currentFlags) return flags < currentFlags;
  return false;
}

function flagCount(pair: Pair, queries: readonly PreparedQuery[]): number {
  const query = queries[pair.candidate] as PreparedQuery;
  return [pair.numberMismatch, pair.missingNumber, query.crossLabel, query.genericOnly].filter(
    Boolean,
  ).length;
}

function keyAt(index: MatchIndex, position: number): IndexKey {
  return index.keys[position] as IndexKey;
}

/** Locale-independent ordering, so results never depend on the runtime's locale. */
export function compareText(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
