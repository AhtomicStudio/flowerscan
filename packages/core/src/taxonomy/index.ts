// Public API of the taxonomy module (T-003). Re-exported from the package entry.
export {
  assertNoBannedTerms,
  BANNED_LISTS,
  type BannedEntry,
  type BannedHit,
  type BannedList,
  BannedTermError,
  type BannedTerms,
  findBannedTerms,
  loadBannedTerms,
} from "./banned";
export {
  getTerm,
  loadTaxonomy,
  type ResolvedTerm,
  resolveTerm,
  type Taxonomy,
  type TermMatch,
} from "./taxonomy";
