// Compliance boilerplate (docs/06 §3, domain review §3.1 and §4). State warning blocks are dropped
// as whole lines: they never hold a strain name, and their words would otherwise become candidates.

/**
 * Warning phrases. A line containing one (as normalized, confusion-folded tokens) is boilerplate.
 * Phrases are the state warnings quoted in the domain review §3.1 (CA, CO, WA, MI, NY) and §4, plus
 * the hemp disclaimers that carry a legal Δ9-THC limit rather than a reading.
 */
export const WARNING_PHRASES: readonly string[] = [
  "government warning",
  "schedule i controlled substance",
  "controlled substance",
  "keep out of reach",
  "out of reach of children",
  "keep away from children",
  "and animals",
  "and pets",
  "contains marijuana",
  "contains marihuana",
  "this product contains cannabis",
  "produced without regulatory oversight",
  "regulatory oversight",
  "health safety or efficacy",
  "may be habit forming",
  "habit forming",
  "unlawful outside",
  "smoking is hazardous",
  "hazardous to your health",
  "hazardous to health",
  "illegal to drive",
  "operate machinery",
  "operate a motor vehicle",
  "under the influence",
  "poison control",
  "poison center",
  "1 800 222 1222",
  "pregnant or breastfeeding",
  "while pregnant",
  "years of age or older",
  "registered qualifying patients",
  "qualifying patient",
  "qualified patient",
  "for use only by persons 21",
  "for use by individuals 21",
  "persons 21 years",
  "for medical use only",
  "intoxicating effects",
  "may be delayed",
  "impairs your ability",
  "use extreme caution",
  "dry weight basis",
  "farm bill",
  "food and drug administration",
  "evaluated by the fda",
];

/**
 * Warning vocabulary. A line with at least WARNING_WORD_MIN of these words is boilerplate even when
 * OCR broke the phrase (warning blocks wrap mid-sentence).
 */
export const WARNING_WORDS: readonly string[] = [
  "cannabis",
  "marijuana",
  "marihuana",
  "children",
  "pets",
  "animals",
  "pregnant",
  "pregnancy",
  "breastfeeding",
  "machinery",
  "intoxicating",
  "intoxication",
  "impair",
  "impairs",
  "impairment",
  "harmful",
  "hazardous",
  "warning",
  "consumed",
  "consumption",
  "possessed",
  "possession",
  "vehicle",
  "poison",
  "unlawful",
  "illegal",
  "habit",
  "persons",
  "individuals",
  "regulatory",
  "oversight",
  "efficacy",
  "influence",
  "patient",
  "patients",
  "delayed",
  "caution",
  "minors",
  "substance",
  "controlled",
  "drive",
  "driving",
  "operate",
  "older",
  "health",
  "safety",
];

/** Lines with at least this many warning words are boilerplate. */
export const WARNING_WORD_MIN = 2;

/**
 * Potency qualifiers (domain review §4): stripped where they appear, the rest of the line is kept
 * (MI prints them next to the reading itself).
 */
export const QUALIFIER_PATTERNS: readonly RegExp[] = [
  /as\s+reported\s+by\s+(?:the\s+)?(?:testing\s+)?lab(?:oratory)?/giu,
  /(?:the\s+)?actual\s+value\s+may\s+vary[^|)]*\)?/giu,
  /(?<![a-z])per\s+(?:package|serving|unit|container)(?![a-z])/giu,
];
