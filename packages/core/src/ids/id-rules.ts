// ID and filename rules from docs/04 "ID and filename rules".

/** Letters that Unicode NFKD doesn't decompose into ASCII. */
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

const COMBINING_MARKS = /\p{M}/gu;
const APOSTROPHES = /['‘’ʼ`]/g;
const NON_SLUG = /[^a-z0-9]+/g;

/**
 * Derives a node `id` from a display name: lowercase ASCII kebab-case.
 * `#4` → `4`, `&` → `and`, `×` → `x`, diacritics stripped, apostrophes dropped, anything else
 * separates words. Example: `Gorilla Glue #4` → `gorilla-glue-4`.
 *
 * Throws a RangeError if the name has no letters or digits left to build an id from.
 */
export function slugify(name: string): string {
  const ascii = name
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[ßæœøłđðþı]/g, (letter) => TRANSLITERATIONS[letter] ?? letter);
  const slug = ascii
    .replace(/&/g, " and ")
    .replace(/×/g, " x ")
    .replace(APOSTROPHES, "")
    .replace(NON_SLUG, "-")
    .replace(/^-+|-+$/g, "");
  if (slug === "") {
    throw new RangeError(`Can't derive an id from the name ${JSON.stringify(name)}`);
  }
  return slug;
}

/** Characters Obsidian can't use in a note filename (docs/04). */
const UNSAFE_FILENAME = /[\\/:*?"<>|#^[\]]/g;
// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control characters is the point.
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;

/**
 * Turns a display name into a vault filename (without `.md`). Each Obsidian-unsafe character
 * (`\ / : * ? " < > | # ^ [ ]`) becomes a space, then runs of whitespace collapse to one space.
 * Leading dots and trailing dots are dropped (hidden files, Windows). The result is NFC-normalized.
 * Example: `Gorilla Glue #4` → `Gorilla Glue 4`.
 *
 * Throws a RangeError if nothing usable is left.
 */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .normalize("NFC")
    .replace(CONTROL_CHARACTERS, " ")
    .replace(UNSAFE_FILENAME, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .replace(/[.\s]+$/, "")
    .trim();
  if (cleaned === "") {
    throw new RangeError(`Can't derive a filename from the name ${JSON.stringify(name)}`);
  }
  return cleaned;
}
