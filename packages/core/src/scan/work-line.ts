// A label line while it is being read: the OCR text plus a masked copy where every span already
// claimed by a lexicon (potency, units, identifiers…) is blanked out with MASK.
import type { OcrBox } from "./types";

/** Fills claimed spans. A private-use character: never in label text, never a word or a space. */
export const MASK = "";

/** Trademark signs are dropped (NFKD would turn `™` into the letters `TM`). Same length, so offsets hold. */
const MARKS = /[™®©℠]/gu;

export interface WorkLine {
  /** Position in the OCR output. */
  readonly index: number;
  /** The OCR text, untouched. Potency `raw` values are cut from it. */
  readonly original: string;
  /** `original` with claimed spans replaced by MASK, character for character. */
  masked: string;
  /** 0–1. */
  readonly confidence: number;
  /** Pixels; 0 when unknown. */
  readonly height: number;
  readonly bbox: OcrBox;
  boilerplate: boolean;
}

export function workLine(
  index: number,
  text: string,
  confidence: number,
  height: number,
  bbox: OcrBox,
): WorkLine {
  return {
    index,
    original: text,
    masked: text.replace(MARKS, " "),
    confidence: clampUnit(confidence),
    height: Number.isFinite(height) && height > 0 ? height : 0,
    bbox,
    boilerplate: false,
  };
}

/** Blanks out `[start, end)` of the masked text. */
export function consume(line: WorkLine, start: number, end: number): void {
  if (end <= start) return;
  line.masked = line.masked.slice(0, start) + MASK.repeat(end - start) + line.masked.slice(end);
}

/** Blanks out every match of `pattern` (a global regex) and returns the matches. */
export function strip(line: WorkLine, pattern: RegExp): RegExpExecArray[] {
  const matches = [...line.masked.matchAll(pattern)];
  for (const match of matches) consume(line, match.index, match.index + match[0].length);
  return matches;
}

export function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
