// Product-form words (docs/06 §3, domain review §4 "Product forms"). They are tagged and
// down-weighted, never deleted up front (P6): several are also strain tokens (`hash` in Hash Plant).
import type { ProductForm } from "../../schema/enums";

export interface FormWord {
  /** The form this word implies, or null when it is too ambiguous to set `product_form`. */
  readonly form: ProductForm | null;
}

const strong = (form: ProductForm): FormWord => ({ form });
/** Collides with strain names or everyday words (`hash`, `sugar`, `diamonds`): tagged, never inferred. */
const weak: FormWord = { form: null };

/**
 * Product-form wording → `product_form`. Hyphens normalize to spaces (`pre-roll` = `pre roll`).
 * Weak entries are the P6 collisions from the domain review (§4) plus short or everyday words.
 */
export const FORM_WORDS: readonly (readonly [string, FormWord])[] = [
  // Pre-rolls first, so "infused pre-roll" and "live resin pre-roll" read as pre-rolls.
  ["infused pre roll", strong("pre-roll")],
  ["infused pre rolls", strong("pre-roll")],
  ["pre roll", strong("pre-roll")],
  ["pre rolls", strong("pre-roll")],
  ["preroll", strong("pre-roll")],
  ["prerolls", strong("pre-roll")],
  ["joint", strong("pre-roll")],
  ["joints", strong("pre-roll")],
  ["blunt", strong("pre-roll")],
  ["blunts", strong("pre-roll")],
  ["dogwalker", strong("pre-roll")],
  ["dogwalkers", strong("pre-roll")],
  ["pr", weak],
  ["mini", weak],
  ["minis", weak],
  ["pack", weak],
  // Vapes.
  ["all in one", strong("vape")],
  ["aio", strong("vape")],
  ["cart", strong("vape")],
  ["carts", strong("vape")],
  ["cartridge", strong("vape")],
  ["cartridges", strong("vape")],
  ["disposable", strong("vape")],
  ["disposables", strong("vape")],
  ["vape", strong("vape")],
  ["vapes", strong("vape")],
  ["vaporizer", strong("vape")],
  ["pod", weak],
  ["pods", weak],
  ["510", weak],
  // Edibles and other manufactured goods.
  ["edible", strong("edible")],
  ["edibles", strong("edible")],
  ["gummy", strong("edible")],
  ["gummies", strong("edible")],
  ["beverage", strong("edible")],
  ["chews", strong("edible")],
  ["chocolate", weak],
  ["tincture", strong("other")],
  ["topical", strong("other")],
  ["capsule", strong("other")],
  ["capsules", strong("other")],
  // Concentrates.
  ["ice water hash", strong("concentrate")],
  ["bubble hash", strong("concentrate")],
  ["hash rosin", strong("concentrate")],
  ["live resin", strong("concentrate")],
  ["cured resin", strong("concentrate")],
  ["live rosin", strong("concentrate")],
  ["rosin", strong("concentrate")],
  ["badder", strong("concentrate")],
  ["budder", strong("concentrate")],
  ["shatter", strong("concentrate")],
  ["wax", strong("concentrate")],
  ["distillate", strong("concentrate")],
  ["kief", strong("concentrate")],
  ["concentrate", strong("concentrate")],
  ["batter", weak],
  ["crumble", weak],
  ["sugar", weak],
  ["diamonds", weak],
  ["sauce", weak],
  ["hash", weak],
  // Flower.
  ["ground flower", strong("flower")],
  ["small buds", strong("flower")],
  ["flower", strong("flower")],
  ["flowers", strong("flower")],
  ["smalls", strong("flower")],
  ["shake", strong("flower")],
  ["eighth", strong("flower")],
  ["8th", strong("flower")],
  ["ounce", strong("flower")],
  ["bud", weak],
  ["buds", weak],
  ["popcorn", weak],
  ["trim", weak],
  ["quarter", weak],
  ["half", weak],
  ["zip", weak],
];

/**
 * When a label names several forms, the most specific wins: a "live resin cart" is a vape and an
 * "infused pre-roll" is a pre-roll, even though both name a concentrate.
 */
export const FORM_PRIORITY: readonly ProductForm[] = [
  "pre-roll",
  "vape",
  "edible",
  "concentrate",
  "flower",
  "other",
];

/**
 * Packaging words that never name a strain on their own (`Strain:`, `Premium Indoor`). Tagged and
 * down-weighted like the form words, and they set nothing.
 */
export const FILLER_WORDS: readonly string[] = [
  "strain",
  "cultivar",
  "product",
  "product name",
  "type",
  "premium",
  "craft",
  "indoor",
  "outdoor",
  "greenhouse",
  "sun grown",
  "sungrown",
  "light dep",
  "small batch",
  "hand trimmed",
  "cannabis",
  "marijuana",
  "marihuana",
  "hemp",
  "net",
  "wt",
  "weight",
  "genetics",
];
