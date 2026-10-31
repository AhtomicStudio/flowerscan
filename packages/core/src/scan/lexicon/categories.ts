// Category words: captured as `package_says` (docs/06 §3, P3 revised by D18), never as candidates.
// Sources: docs/06 §3 and docs/research/2026-10-26-domain-review.md §4 "Category words".
import type { PackageSays } from "../../schema/enums";

/**
 * Category wording and what it maps to (D18, 2026-10-27): a wording that names a lean maps to that
 * side; bare `hybrid`, `balanced` and `50/50` map to `hybrid`. Hyphens and slashes normalize to
 * spaces, so `indica-dominant` and `hybrid/indica` are covered by the spaced forms.
 */
export const CATEGORY_WORDS: readonly (readonly [string, PackageSays])[] = [
  ["indica dominant hybrid", "indica"],
  ["sativa dominant hybrid", "sativa"],
  ["indica dominant", "indica"],
  ["sativa dominant", "sativa"],
  ["indica dom", "indica"],
  ["sativa dom", "sativa"],
  ["indica leaning", "indica"],
  ["sativa leaning", "sativa"],
  ["indica hybrid", "indica"],
  ["sativa hybrid", "sativa"],
  ["hybrid indica", "indica"],
  ["hybrid sativa", "sativa"],
  ["indica", "indica"],
  ["sativa", "sativa"],
  ["hybrid", "hybrid"],
  ["balanced", "hybrid"],
];

/**
 * Single category letters, read **only** inside brackets or between pipes (`(I)`, `[H]`, `| S |`),
 * never bare: OCR produces stray letters. A bracketed lowercase `l` is OCR's usual misread of `I`.
 * The lookbehind keeps plural markers such as `Pre-Roll(s)` out.
 */
export const CATEGORY_LETTER_PATTERN =
  /(?<![a-z0-9])[([]\s*([ishl])\s*[)\]]|(?<![a-z0-9])\|\s*([ish])\s*\|/giu;

/** `50/50` printed as a category (domain review §4). */
export const FIFTY_FIFTY_PATTERN = /(?<![0-9./])50\s*\/\s*50(?![0-9])/gu;

/** What each bracketed letter says. */
export const CATEGORY_LETTERS: Readonly<Record<string, PackageSays>> = {
  i: "indica",
  l: "indica",
  s: "sativa",
  h: "hybrid",
};
