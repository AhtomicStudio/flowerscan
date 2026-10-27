// Name normalization (docs/06 §4). Applied identically to strain names/aliases at index time and to
// candidates at query time.

/** The token a cross "x" / "×" becomes (P4). Never a space. */
export const CROSS_MARKER = "⟨x⟩";

/**
 * Meaningful short tokens (docs/06 §4). `normalize` never drops a token, so these always survive
 * matching. Exported for the label parser (T-011), which must not strip them as noise.
 */
export const KEEP_SHORT_TOKENS: readonly string[] = [
  "og",
  "gg",
  "gsc",
  "gmo",
  "mac",
  "gdp",
  "nl",
  "ak",
  "sfv",
  "bx",
  "bx1",
  "bx2",
  "bx3",
  "s1",
  "f1",
  "ibl",
];

/** A candidate made only of one of these (or of a single letter) never auto-accepts (docs/06 §4). */
export const GENERIC_TOKENS: readonly string[] = [
  "og",
  "kush",
  "haze",
  "glue",
  "cookies",
  "cake",
  "z",
];

/** Letters that Unicode NFKD doesn't decompose into ASCII (same table as `slugify`). */
const TRANSLITERATIONS: Readonly<Record<string, string>> = {
  ß: "ss",
  æ: "ae",
  œ: "oe",
  ø: "o",
  ł: "l",
  đ: "d",
  ð: "d",
  þ: "th",
  ı: "i",
};

/** OCR confusions folded for scoring only (docs/06 §4). Digits fold to the letter they resemble. */
const CHARACTER_FOLDS: Readonly<Record<string, string>> = {
  "0": "o",
  "1": "l",
  i: "l",
  "5": "s",
  "8": "b",
};

/** Digits OCR commonly reads in place of a letter (the digits in CHARACTER_FOLDS). */
const CONFUSABLE_DIGITS = /^[0158]+$/;

const COMBINING_MARKS = /\p{M}/gu;
const APOSTROPHES = /['‘’ʼ`]/g;
/** `m.a.c.` / `M.A.C` / `o.g.`: two or more single letters joined by dots. */
const DOTTED_ABBREVIATION = /(?<![a-z0-9])(?:[a-z]\.){2,}(?:[a-z](?![a-z0-9]))?/g;
const NOT_WORD = /[^a-z0-9×]+/g;
const RUNS = /[a-z]+|[0-9]+/g;
const DIGITS = /^[0-9]+$/;
const HAS_LETTER = /[a-z]/;
const STARTS_WITH_LETTER = /^[a-z]/;

/**
 * Normalizes a name or candidate into space-separated tokens (docs/06 §4):
 * NFKD, diacritics stripped, lowercase; `M.A.C.` → `mac`; apostrophes dropped; `&` → `and`;
 * `#4` → `4`; other punctuation and whitespace collapse to one space; letter–digit boundaries
 * split (`gg4` → `gg 4`, `gelato33` → `gelato 33`) with leading zeros stripped (`04` → `4`);
 * a cross `x` / `×` between two names becomes the CROSS_MARKER token, while a quantity `x`
 * (`5 x 0.5g`, `1x1g`) stays a plain `x`.
 *
 * One exception to the letter–digit split: OCR-confusable digits (0, 1, 5, 8) inside or at the
 * start of a word with at least three letters stay glued (`g0rilla`, `b1ue`, `5unset`), so a
 * misread letter never becomes a number (P5). Folding then scores them as letters. Trailing
 * digits always split (`gg5`, `mac1`), and so do short quantity words (`1x1g`, `10oz`, `8th`).
 *
 * Idempotent: `normalize(normalize(s)) === normalize(s)`.
 */
export function normalize(text: string): string {
  return tokenize(text).join(" ");
}

/** `normalize` as a token array. */
export function tokenize(text: string): string[] {
  const cleaned = text
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[ßæœøłđðþı]/g, (letter) => TRANSLITERATIONS[letter] ?? letter)
    .replaceAll(CROSS_MARKER, " × ")
    .replace(DOTTED_ABBREVIATION, (abbreviation) => abbreviation.replaceAll(".", ""))
    .replace(APOSTROPHES, "")
    .replaceAll("&", " and ")
    .replaceAll("×", " × ")
    .replace(NOT_WORD, " ");
  const tokens: string[] = [];
  for (const word of cleaned.split(" ")) {
    if (word !== "") tokens.push(...splitLetterDigit(word));
  }
  return markCrosses(tokens);
}

/**
 * Folds OCR confusions into a secondary scoring key (docs/06 §4): `0→o`, `1→l`, `i→l`, `5→s`,
 * `8→b`, `rn→m`, `vv→w`. Normalizes first, so it accepts raw text. Never use it as display text.
 */
export function foldConfusions(text: string): string {
  return foldNormalized(normalize(text));
}

/** `foldConfusions` for text that is already normalized. */
export function foldNormalized(normal: string): string {
  return normal
    .replaceAll("rn", "m")
    .replaceAll("vv", "w")
    .replace(/[01i58]/g, (character) => CHARACTER_FOLDS[character] ?? character);
}

/** The number tokens of a normalized token list, sorted and unique (P5: numbers are identity). */
export function numberTokens(tokens: readonly string[]): string[] {
  return [...new Set(tokens.filter((token) => DIGITS.test(token)))].sort();
}

/** True for a one-token candidate that is only a generic token or a single letter (docs/06 §4). */
export function isGenericOnly(tokens: readonly string[]): boolean {
  if (tokens.length !== 1) return false;
  const [token = ""] = tokens;
  return GENERIC_TOKENS.includes(token) || /^[a-z]$/.test(token);
}

function splitLetterDigit(word: string): string[] {
  if (word === "×") return [word];
  const runs = word.match(RUNS) ?? [];
  const pieces: string[] = [];
  let index = 0;
  while (index < runs.length) {
    const run = runs[index] ?? "";
    let end = index;
    // A glued word starts with letters, or with confusable digits at the very start (`5unset`).
    const leadingDigits =
      index === 0 && CONFUSABLE_DIGITS.test(run) && HAS_LETTER.test(runs[1] ?? "");
    if (leadingDigits) end = 1;
    if (leadingDigits || HAS_LETTER.test(run)) {
      // Extend over letter, confusable-digit, letter, … sequences. It always ends on letters, so
      // trailing digits (`gg5`, `mac1`) are numbers.
      while (CONFUSABLE_DIGITS.test(runs[end + 1] ?? "") && HAS_LETTER.test(runs[end + 2] ?? "")) {
        end += 2;
      }
    }
    const group = runs.slice(index, end + 1);
    const letters = group.filter((piece) => HAS_LETTER.test(piece)).join("").length;
    if (group.length > 1 && letters >= 3) {
      pieces.push(group.join(""));
    } else {
      for (const piece of group) pieces.push(DIGITS.test(piece) ? stripLeadingZeros(piece) : piece);
    }
    index = end + 1;
  }
  return pieces;
}

function stripLeadingZeros(digits: string): string {
  return digits.replace(/^0+(?=\d)/, "");
}

/**
 * A standalone `x` / `×` is a cross when a name-like span sits on both sides: the tokens since the
 * previous marker contain a letter, and the next token starts with a letter. A following number
 * means a quantity (`5 x 0.5g`).
 */
function markCrosses(tokens: readonly string[]): string[] {
  const out: string[] = [];
  let spanHasLetter = false;
  tokens.forEach((token, index) => {
    if (token === "x" || token === "×") {
      const next = tokens[index + 1] ?? "";
      const isCross = spanHasLetter && STARTS_WITH_LETTER.test(next) && next !== "x";
      if (isCross) {
        out.push(CROSS_MARKER);
        spanHasLetter = false;
        return;
      }
      out.push("x");
      spanHasLetter = true;
      return;
    }
    out.push(token);
    if (HAS_LETTER.test(token)) spanHasLetter = true;
  });
  return out;
}
