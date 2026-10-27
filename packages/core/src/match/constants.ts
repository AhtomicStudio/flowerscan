// Tunable matcher constants (docs/06 §4–6). T-012 tunes these against the eval set.

/** Score weights from docs/06 §5. They sum to 1. */
export const SCORE_WEIGHTS = {
  trigramJaccard: 0.45,
  jaroWinkler: 0.35,
  tokenOverlap: 0.1,
  candidateWeight: 0.1,
} as const;

/** An exact name/alias hit (after normalization) scores this, whatever the candidate weight. */
export const EXACT_SCORE = 1;

/** Popularity prior ceiling (docs/06 §5). It only reorders matches whose scores are this close. */
export const POPULARITY_PRIOR_MAX = 0.03;

/** `match` returns at most this many distinct strains (docs/06 §5). */
export const MATCH_MAX_RESULTS = 5;

/** Auto-accept needs a top score of at least this (docs/06 §6). */
export const ACCEPT_THRESHOLD = 0.9;

/** Auto-accept needs the top score to beat the second by at least this (docs/06 §6). */
export const ACCEPT_MIN_GAP = 0.15;

/** A top score of at least this gets the "Which one?" sheet (docs/06 §6). */
export const CHOOSE_THRESHOLD = 0.6;

/** The "Which one?" sheet shows up to this many candidates (docs/06 §6). */
export const CHOOSE_MAX_CANDIDATES = 3;

/**
 * `match` only scores pairs whose upper bound (from trigram overlap, lengths and shared tokens)
 * reaches CHOOSE_THRESHOLD, and returns those scoring at least this, so "Which one?" can offer
 * near misses. Neither cut can change a `decide` outcome: anything it drops scores below
 * CHOOSE_THRESHOLD, and ACCEPT_THRESHOLD − ACCEPT_MIN_GAP is higher than that.
 */
export const MATCH_MIN_SCORE = 0.5;

/** `search` returns this many results unless told otherwise. */
export const SEARCH_DEFAULT_LIMIT = 10;

/** `search` drops results scoring below this. */
export const SEARCH_MIN_SCORE = 0.5;
