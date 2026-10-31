// Units and quantities (docs/06 §3, domain review §4 "Quantities and units"). Stripped before
// candidates are built: a weight is never part of a strain name. Quantity `x` (`5 x 0.5g`, `1x1g`)
// is stripped here, so the cross marker (P4) only ever sees real crosses.

/** Quantity "x": `5 x 0.5g`, `2x0.5g`, `1x1g` (domain review §4, widened to `gr` and `×`). */
export const QUANTITY_X_PATTERN =
  /(?<![a-z0-9.,])\d+\s*[x×]\s*\d*[.,]?\d+\s*(?:g|gr|mg)(?![a-z])/giu;

/** Masses and volumes: `3.5g`, `3.5 G`, `28g`, `.5g`, `0.125 oz`, `(3.5 g)`, `100mg`, `1 ml`. */
export const MASS_PATTERN =
  /(?<![a-z0-9.,])\(?\s*\d*[.,]?\d+\s*(?:g|gr|grams?|mg|oz|ozs|ounces?|ml|lbs?|kg)\.?\s*\)?(?![a-z0-9])/giu;

/** Fractions of an ounce: `1/8`, `1/8 oz`, `1/4 oz`. */
export const FRACTION_PATTERN =
  /(?<![0-9./])1\s*\/\s*(?:2|4|8|16)(?:\s*(?:oz|ounces?))?(?![0-9a-z])/giu;

/** Counts: `5pk`, `5-pack`, `10 ct`, `2 count`. */
export const COUNT_PATTERN =
  /(?<![a-z0-9.,])\d+\s*-?\s*(?:pk|packs?|ct|count|pcs|pieces)(?![a-z])/giu;

/** `NET WT`, `Net Wt.`, `Net Weight:`, `Net Contents`. */
export const NET_WEIGHT_PATTERN = /(?<![a-z])net\s*(?:wt|weight|contents?)\.?\s*:?/giu;

/** In stripping order. */
export const UNIT_PATTERNS: readonly RegExp[] = [
  NET_WEIGHT_PATTERN,
  QUANTITY_X_PATTERN,
  COUNT_PATTERN,
  FRACTION_PATTERN,
  MASS_PATTERN,
];
