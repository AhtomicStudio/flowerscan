// Candidate-vs-key scoring (docs/06 §5), shared by `match` and `search`.
import type { IndexKey, MatchIndex } from "./build-index";
import { EXACT_SCORE, SCORE_WEIGHTS } from "./constants";
import { CROSS_MARKER, foldNormalized, isGenericOnly, numberTokens, tokenize } from "./normalize";
import {
  distinct,
  jaccardFromCounts,
  jaroWinkler,
  jaroWinklerBound,
  tokenOverlap,
  trigrams,
} from "./similarity";

/** @internal A candidate or search query, normalized once. */
export interface PreparedQuery {
  readonly text: string;
  readonly weight: number;
  readonly normal: string;
  readonly folded: string;
  readonly tokens: readonly string[];
  readonly foldedTokens: readonly string[];
  readonly distinctTokens: readonly string[];
  readonly distinctFoldedTokens: readonly string[];
  readonly numbers: string;
  readonly normalTrigrams: readonly string[];
  readonly foldedTrigrams: readonly string[];
  readonly crossLabel: boolean;
  readonly genericOnly: boolean;
}

/** @internal Returns null when nothing is left after normalization. */
export function prepareQuery(text: string, weight: number): PreparedQuery | null {
  const tokens = tokenize(text);
  if (tokens.length === 0) return null;
  const normal = tokens.join(" ");
  const folded = foldNormalized(normal);
  const foldedTokens = folded.split(" ");
  return {
    text,
    weight: clampWeight(weight),
    normal,
    folded,
    tokens,
    foldedTokens,
    distinctTokens: distinct(tokens),
    distinctFoldedTokens: distinct(foldedTokens),
    numbers: numberTokens(tokens).join(" "),
    normalTrigrams: trigrams(normal),
    foldedTrigrams: trigrams(folded),
    crossLabel: tokens.includes(CROSS_MARKER),
    genericOnly: isGenericOnly(tokens),
  };
}

/** @internal A key that scored at or above the floor. */
export interface ScoredKey {
  readonly key: number;
  readonly score: number;
  readonly exact: boolean;
  /** Exact on the normalized key, or on the confusion-folded key. */
  readonly strong: boolean;
}

/** @internal Reusable per-call counters, sized to the index. */
export interface Scratch {
  readonly normalShared: Int32Array;
  readonly foldedShared: Int32Array;
  readonly seen: Uint8Array;
  readonly touched: number[];
}

/** @internal */
export function createScratch(index: MatchIndex): Scratch {
  return {
    normalShared: new Int32Array(index.keys.length),
    foldedShared: new Int32Array(index.keys.length),
    seen: new Uint8Array(index.keys.length),
    touched: [],
  };
}

/** @internal Score thresholds for `scoreQuery`. */
export interface ScoreLimits {
  /** Pairs scoring below this are dropped. */
  readonly floor: number;
  /**
   * Pairs whose upper bound (from trigram overlap and lengths) is below this are skipped without
   * being scored. Must be ≥ floor.
   */
  readonly reach: number;
}

/**
 * Scores `query` against every key that shares a trigram with it (or hits it exactly), keeping
 * pairs at or above `limits.floor`. Exact and folded-exact hits are always kept. Results are in
 * key order.
 */
export function scoreQuery(
  index: MatchIndex,
  query: PreparedQuery,
  limits: ScoreLimits,
  scratch: Scratch,
): ScoredKey[] {
  const { normalShared, foldedShared, seen, touched } = scratch;
  const exact = new Set(index.exact.get(query.normal) ?? []);
  const foldedExact = new Set(index.foldedExact.get(query.folded) ?? []);
  for (const position of exact) touch(scratch, position);
  for (const position of foldedExact) touch(scratch, position);
  countShared(index.normalPostings, query.normalTrigrams, normalShared, scratch);
  countShared(index.foldedPostings, query.foldedTrigrams, foldedShared, scratch);

  // With Jaro–Winkler and token overlap at their maximum (1), a pair needs at least this trigram
  // Jaccard to reach limits.reach.
  const minJaccard =
    (limits.reach -
      SCORE_WEIGHTS.jaroWinkler -
      SCORE_WEIGHTS.tokenOverlap -
      SCORE_WEIGHTS.candidateWeight * query.weight) /
    SCORE_WEIGHTS.trigramJaccard;
  const scored: ScoredKey[] = [];
  for (const position of touched) {
    if (exact.has(position)) {
      scored.push({ key: position, score: EXACT_SCORE, exact: true, strong: true });
      continue;
    }
    const key = index.keys[position] as IndexKey;
    const strong = foldedExact.has(position);
    const normalJaccard = jaccardFromCounts(
      query.normalTrigrams.length,
      key.normalTrigramCount,
      normalShared[position] ?? 0,
    );
    const foldedJaccard = jaccardFromCounts(
      query.foldedTrigrams.length,
      key.foldedTrigramCount,
      foldedShared[position] ?? 0,
    );
    if (!strong && Math.max(normalJaccard, foldedJaccard) < minJaccard) continue;
    const normalScore = formScore(
      query.weight,
      limits.reach,
      normalJaccard,
      query.normal,
      key.normal,
      query.distinctTokens,
      key.distinctTokens,
    );
    // Folding changes nothing when neither side has a confusable character.
    const sameForms = query.folded === query.normal && key.folded === key.normal;
    const foldedScore = sameForms
      ? normalScore
      : formScore(
          query.weight,
          strong ? 0 : limits.reach,
          foldedJaccard,
          query.folded,
          key.folded,
          query.distinctFoldedTokens,
          key.distinctFoldedTokens,
        );
    const score = Math.min(EXACT_SCORE, Math.max(normalScore, foldedScore));
    if (score >= limits.floor || strong)
      scored.push({ key: position, score, exact: false, strong });
  }
  for (const position of touched) {
    normalShared[position] = 0;
    foldedShared[position] = 0;
    seen[position] = 0;
  }
  touched.length = 0;
  return scored.sort((a, b) => a.key - b.key);
}

/**
 * The docs/06 §5 formula on one key form, or 0 when the length, trigram and token bounds show the
 * pair can't reach `reach`.
 */
function formScore(
  weight: number,
  reach: number,
  trigramJaccard: number,
  queryText: string,
  keyText: string,
  queryTokens: readonly string[],
  keyTokens: readonly string[],
): number {
  const fixed =
    SCORE_WEIGHTS.trigramJaccard * trigramJaccard + SCORE_WEIGHTS.candidateWeight * weight;
  const jwBound = jaroWinklerBound(queryText.length, keyText.length);
  if (fixed + SCORE_WEIGHTS.jaroWinkler * jwBound + SCORE_WEIGHTS.tokenOverlap < reach) return 0;
  const withTokens = fixed + SCORE_WEIGHTS.tokenOverlap * tokenOverlap(queryTokens, keyTokens);
  if (withTokens + SCORE_WEIGHTS.jaroWinkler * jwBound < reach) return 0;
  return withTokens + SCORE_WEIGHTS.jaroWinkler * jaroWinkler(queryText, keyText);
}

function countShared(
  postings: ReadonlyMap<string, readonly number[]>,
  queryTrigrams: readonly string[],
  shared: Int32Array,
  scratch: Scratch,
): void {
  for (const trigram of queryTrigrams) {
    const list = postings.get(trigram);
    if (list === undefined) continue;
    for (const position of list) {
      shared[position] = (shared[position] ?? 0) + 1;
      touch(scratch, position);
    }
  }
}

function touch(scratch: Scratch, position: number): void {
  if (scratch.seen[position] === 1) return;
  scratch.seen[position] = 1;
  scratch.touched.push(position);
}

function clampWeight(weight: number): number {
  if (!Number.isFinite(weight)) return 0;
  return Math.min(1, Math.max(0, weight));
}
