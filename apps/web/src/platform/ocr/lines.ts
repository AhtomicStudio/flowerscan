// Turns Tesseract's block tree into flat `OcrLine`s and scores a read, so the worker can tell a weak
// orientation from a good one. Pure: unit-tested with recorded block shapes.
import { mapBoxToSource } from "./preprocess";
import type { OcrLine, OcrRotation } from "./types";

/** The parts of Tesseract.js's `blocks` output we read (a structural subset of its types). */
export interface TessBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
export interface TessWord {
  text: string;
  confidence: number;
}
export interface TessLine {
  text: string;
  confidence: number;
  bbox: TessBox;
  words?: TessWord[];
}
export interface TessBlock {
  paragraphs?: { lines?: TessLine[] }[];
}

export interface ReadGeometry {
  rotation: OcrRotation;
  /** The scaled image size before rotation, and the scale from the input. */
  scaledWidth: number;
  scaledHeight: number;
  scale: number;
}

export interface ReadLines {
  lines: OcrLine[];
  /** Words with their confidence (0–1), for scoring. */
  words: { text: string; confidence: number }[];
}

/** Flattens blocks → paragraphs → lines, in reading order, mapping boxes back to the input image. */
export function linesFromBlocks(
  blocks: readonly TessBlock[] | null,
  geometry: ReadGeometry,
): ReadLines {
  const lines: OcrLine[] = [];
  const words: { text: string; confidence: number }[] = [];
  for (const block of blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        const text = line.text.replace(/\s+/g, " ").trim();
        if (text === "") continue;
        const bbox = mapBoxToSource(
          line.bbox,
          geometry.rotation,
          geometry.scaledWidth,
          geometry.scaledHeight,
          geometry.scale,
        );
        const height = Math.round(((line.bbox.y1 - line.bbox.y0) / geometry.scale) * 10) / 10;
        lines.push({ text, confidence: toUnit(line.confidence), bbox, height });
        for (const word of line.words ?? []) {
          const wordText = word.text.trim();
          if (wordText !== "") words.push({ text: wordText, confidence: toUnit(word.confidence) });
        }
      }
    }
  }
  return { lines, words };
}

function toUnit(confidence: number): number {
  if (!Number.isFinite(confidence)) return 0;
  return Math.round(Math.max(0, Math.min(100, confidence))) / 100;
}

/** A word counts toward the score only at or above this confidence. Rotated text reads as low-confidence noise. */
export const WORD_MIN_CONFIDENCE = 0.5;
/** A read is weak below this many confident letters/digits… */
export const WEAK_MIN_CHARS = 8;
/** …or when its letters/digits average below this confidence. */
export const WEAK_MIN_CONFIDENCE = 0.65;

export interface ReadQuality {
  /** Sum over confident words of (letters + digits) × confidence. Compare attempts with it. */
  score: number;
  /** Letters and digits in confident words. */
  chars: number;
  /** Letter/digit-weighted mean confidence over all words (0 when nothing was read). */
  meanConfidence: number;
  weak: boolean;
}

const ALNUM = /[\p{L}\p{N}]/gu;

export function scoreRead(words: readonly { text: string; confidence: number }[]): ReadQuality {
  let score = 0;
  let chars = 0;
  let allChars = 0;
  let weighted = 0;
  for (const word of words) {
    const n = word.text.match(ALNUM)?.length ?? 0;
    allChars += n;
    weighted += n * word.confidence;
    if (word.confidence >= WORD_MIN_CONFIDENCE) {
      chars += n;
      score += n * word.confidence;
    }
  }
  const meanConfidence = allChars === 0 ? 0 : weighted / allChars;
  return {
    score: Math.round(score * 100) / 100,
    chars,
    meanConfidence: Math.round(meanConfidence * 1000) / 1000,
    weak: chars < WEAK_MIN_CHARS || meanConfidence < WEAK_MIN_CONFIDENCE,
  };
}

/** Rotation retry order when the upright read is weak: vertical jar labels first (docs/06 §2). */
export const RETRY_ROTATIONS: readonly OcrRotation[] = [90, 270, 180];
