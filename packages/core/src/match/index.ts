// Public API of the name matcher (docs/06 §4–6). Wired into the package entry by the coordinator.

export { buildIndex, type MatchIndex, type MatchRecord } from "./build-index";
export {
  ACCEPT_MIN_GAP,
  ACCEPT_THRESHOLD,
  CHOOSE_MAX_CANDIDATES,
  CHOOSE_THRESHOLD,
  EXACT_SCORE,
  MATCH_MAX_RESULTS,
  MATCH_MIN_SCORE,
  POPULARITY_PRIOR_MAX,
  SCORE_WEIGHTS,
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MIN_SCORE,
} from "./constants";
export { ACCEPT_BLOCKERS, type AcceptBlocker, decide, type MatchDecision } from "./decide";
export { type MatchCandidate, match, type RankedMatch } from "./match";
export {
  CROSS_MARKER,
  foldConfusions,
  GENERIC_TOKENS,
  KEEP_SHORT_TOKENS,
  normalize,
} from "./normalize";
export { type SearchOptions, type SearchResult, search } from "./search";
