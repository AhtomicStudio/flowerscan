// Potency patterns (docs/06 §3, P2; domain review §3.3 and §4 "Potency"). Every reading is captured
// exactly as printed, with its analyte, and never computed, converted or rounded.
import type { PotencyAnalyte, PotencyQualifier, PotencyUnit } from "../../schema/enums";

/**
 * Analyte labels, most specific first (the regex alternation is ordered). `null` marks analytes
 * the docs/04 PotencyReading enum has no value for (Δ8-THC, THCV, CBG, CBN…): they are recognized
 * and stripped so they never become candidates, but no reading is stored for them.
 */
export const ANALYTE_LABELS: readonly (readonly [PotencyAnalyte | null, string])[] = [
  ["total_cannabinoids", String.raw`total\s*(?:active\s*)?cannabinoids|t\.?a\.?c\.?`],
  ["total_cbd", String.raw`total\s*(?:potential\s*)?cbd`],
  ["total_thc", String.raw`total\s*(?:potential\s*)?(?:(?:δ|∆|delta|d)\s*-?\s*9\s*-?\s*)?thc`],
  [null, String.raw`(?:δ|∆|delta|d)\s*-?\s*(?:8|10)\s*-?\s*thc`],
  ["delta9_thc", String.raw`(?:δ|∆|delta|d|a)\s*-?\s*9\s*-?\s*thc|(?:δ|∆|delta)\s*-?\s*9`],
  ["thca", String.raw`thc\s*-\s*a|thca`],
  [null, String.raw`thcva?|thc\s*-\s*[op]|thc[op]|hhc|cbga|cbg|cbn|cbc|cbdva?`],
  ["cbda", String.raw`cbd\s*-\s*a|cbda`],
  ["thc_unspecified", "thc"],
  ["cbd", "cbd"],
];

/** Matches any analyte label. Group `n + 1` is set when ANALYTE_LABELS[n] matched. */
export const ANALYTE_PATTERN = new RegExp(
  String.raw`(?<![a-z0-9])(?:${ANALYTE_LABELS.map(([, pattern]) => `(${pattern})`).join("|")})(?![a-z])`,
  "giu",
);

/**
 * A printed number. OCR's `O`/`o` for 0 and `I`/`l` for 1 are allowed inside it as long as it holds
 * at least one real digit (`2O.5`), and a decimal comma reads as a point (`24,1`).
 */
const NUMBER = String.raw`(?=[0-9OoIl.,]*[0-9])(?:[0-9OoIl]{1,4}(?:[.,][0-9OoIl]{1,3})?|[.,][0-9OoIl]{1,3})`;
const UNIT = String.raw`%|mg\s*\/\s*g`;

/**
 * A potency value: `ND` / `N.D.` / `not detected` / `<LOD` (→ `nd`), `<LOQ` / `LOQ` (→ `below_loq`),
 * `<1%` / `less than 0.3%` (→ `less_than`), or `24.1%` / `24.1 %` / `241 mg/g` (→ `exact`).
 * A plain number without `%` or `mg/g` is not a potency value.
 */
export const VALUE_PATTERN = new RegExp(
  [
    String.raw`(?<![a-z0-9])(?:(?<nd>n\.?\s?d\.?|not\s+detected|<\s*lod|lod)|(?<loq><\s*l?loq|l?loq))(?![a-z0-9])(?:\s*(?<unit1>${UNIT}))?`,
    String.raw`(?<lt><|less\s+than)\s*(?<num1>${NUMBER})\s*(?<unit2>${UNIT})`,
    String.raw`(?<![0-9.,])(?<num2>${NUMBER})\s*(?<unit3>${UNIT})`,
  ].join("|"),
  "giu",
);

/** What may sit between a label and its value (`Total THC: 24.1 %`, `THC - 24%`, `THC (24%)`). */
export const PAIR_GAP = /^[\s:=\-–—|.~(),]*$/u;

/** Upper bounds per unit (docs/04): anything above is a misread and is dropped, never "fixed". */
export const POTENCY_MAX: Readonly<Record<PotencyUnit, number>> = { percent: 100, mg_per_g: 1000 };

/**
 * The unit stored for `ND` / `<LOQ` when the label prints none next to it: the unit of another
 * reading on the same line, else of the first reading on the label that has one, else this
 * (docs/04 makes `unit` required; the value is null either way, so nothing is converted).
 */
export const VALUELESS_DEFAULT_UNIT: PotencyUnit = "percent";

export function unitOf(text: string | undefined): PotencyUnit | null {
  if (text === undefined) return null;
  return text.includes("%") ? "percent" : "mg_per_g";
}

export function qualifierOf(
  groups: Readonly<Record<string, string | undefined>>,
): PotencyQualifier {
  if (groups.nd !== undefined) return "nd";
  if (groups.loq !== undefined) return "below_loq";
  if (groups.lt !== undefined) return "less_than";
  return "exact";
}

/** Reads a printed number: OCR letters back to digits, a decimal comma to a point. No rounding. */
export function readNumber(text: string): number {
  return Number(
    text
      .replace(/[Oo]/g, "0")
      .replace(/[IiLl]/g, "1")
      .replace(",", "."),
  );
}
