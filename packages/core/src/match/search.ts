// Manual search: prefix-friendly and typo-tolerant (docs/06 §5, T-014).
import type { IndexEntry, IndexKey, MatchIndex } from "./build-index";
import {
  EXACT_SCORE,
  POPULARITY_PRIOR_MAX,
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MIN_SCORE,
} from "./constants";
import { compareText } from "./match";
import { createScratch, prepareQuery, scoreQuery } from "./score";

/** Whole-key prefix hits score from here up to PREFIX_SCORE + PREFIX_SPAN. */
const PREFIX_SCORE = 0.9;
/** Word-prefix hits ("dream" → "Blue Dream") score from here up to WORD_PREFIX_SCORE + PREFIX_SPAN. */
const WORD_PREFIX_SCORE = 0.8;
const PREFIX_SPAN = 0.05;

export interface SearchOptions {
  /** Maximum results. Defaults to SEARCH_DEFAULT_LIMIT. */
  readonly limit?: number;
}

export interface SearchResult {
  readonly strain_id: string;
  readonly name: string;
  /** The name or alias that matched, as written in the data. */
  readonly matched_key: string;
  /** 0–1. */
  readonly score: number;
}

/**
 * Typed search over names and aliases. An exact name/alias scores 1; a name or alias that starts
 * with the query scores 0.90–0.95; one whose words start with the query's words, in order,
 * 0.80–0.85; anything else uses the docs/06 §5 fuzzy score (weight 1). Results below
 * SEARCH_MIN_SCORE are dropped. One result per strain, best first; ties break by popularity,
 * then name, then id.
 */
export function search(
  index: MatchIndex,
  query: string,
  options: SearchOptions = {},
): SearchResult[] {
  const limit = Math.max(0, Math.floor(options.limit ?? SEARCH_DEFAULT_LIMIT));
  const prepared = prepareQuery(query, 1);
  if (prepared === null || limit === 0) return [];

  const best = new Map<number, { key: number; score: number }>();
  const offer = (position: number, score: number) => {
    const entry = (index.keys[position] as IndexKey).entry;
    const current = best.get(entry);
    if (current === undefined || score > current.score) best.set(entry, { key: position, score });
  };

  for (const scored of scoreQuery(
    index,
    prepared,
    { floor: SEARCH_MIN_SCORE, reach: SEARCH_MIN_SCORE },
    createScratch(index),
  )) {
    offer(scored.key, scored.score);
  }
  index.keys.forEach((key, position) => {
    const prefix = prefixScore(prepared.normal, prepared.tokens, key);
    const folded = prefixScore(prepared.folded, prepared.foldedTokens, {
      normal: key.folded,
      tokens: key.foldedTokens,
    });
    const score = Math.max(prefix, folded);
    if (score > 0) offer(position, score);
  });

  return [...best.entries()]
    .filter(([, hit]) => hit.score >= SEARCH_MIN_SCORE)
    .map(([entryPosition, hit]) => {
      const entry = index.entries[entryPosition] as IndexEntry;
      return {
        result: {
          strain_id: entry.id,
          name: entry.name,
          matched_key: (index.keys[hit.key] as IndexKey).text,
          score: hit.score,
        },
        rank: hit.score + POPULARITY_PRIOR_MAX * entry.popularity,
      };
    })
    .sort(
      (a, b) =>
        b.rank - a.rank ||
        b.result.score - a.result.score ||
        compareText(a.result.name, b.result.name) ||
        compareText(a.result.strain_id, b.result.strain_id),
    )
    .slice(0, limit)
    .map(({ result }) => result);
}

function prefixScore(
  query: string,
  queryTokens: readonly string[],
  key: { readonly normal: string; readonly tokens: readonly string[] },
): number {
  if (key.normal === query) return EXACT_SCORE;
  const coverage = query.length / key.normal.length;
  if (key.normal.startsWith(query)) return PREFIX_SCORE + PREFIX_SPAN * coverage;
  if (wordsStartWith(key.tokens, queryTokens)) return WORD_PREFIX_SCORE + PREFIX_SPAN * coverage;
  return 0;
}

/** Each query word is a prefix of a key word, in order (the last may be partly typed). */
function wordsStartWith(keyTokens: readonly string[], queryTokens: readonly string[]): boolean {
  let next = 0;
  for (const word of queryTokens) {
    while (next < keyTokens.length && !(keyTokens[next] ?? "").startsWith(word)) next += 1;
    if (next === keyTokens.length) return false;
    next += 1;
  }
  return true;
}
