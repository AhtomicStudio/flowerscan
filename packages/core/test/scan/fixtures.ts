// Fixtures for the scan tests. Brand names other than the seed brands are invented; strain names are
// the matcher's naming fixtures plus a few common names (test data only, not vault facts).
import { buildIndex, type MatchRecord, type OcrLine } from "../../src/index";
import { NAMING_RECORDS } from "../match/fixtures";

/** One printed line: text, cap height in px, OCR confidence 0–1. */
export type LineSpec = string | readonly [text: string, height?: number, confidence?: number];

const DEFAULT_HEIGHT = 20;
const DEFAULT_CONFIDENCE = 0.92;
const LEFT = 40;
const WIDTH = 520;

/**
 * Builds OCR lines stacked top to bottom the way Tesseract reports them: each line's box sits a
 * third of its height below the previous one, all left-aligned in one column.
 */
export function label(...specs: readonly LineSpec[]): OcrLine[] {
  let top = 30;
  return specs.map((spec) => {
    const [text, height = DEFAULT_HEIGHT, confidence = DEFAULT_CONFIDENCE] =
      typeof spec === "string" ? [spec] : spec;
    const line: OcrLine = {
      text,
      confidence,
      height,
      bbox: { x0: LEFT, y0: top, x1: LEFT + WIDTH, y1: top + height },
    };
    top += height + Math.ceil(height / 3);
    return line;
  });
}

/** Lines with no geometry (QR text, unknown layout). */
export function flat(...texts: readonly string[]): OcrLine[] {
  return texts.map((text) => ({
    text,
    confidence: 1,
    height: 0,
    bbox: { x0: 0, y0: 0, x1: 0, y1: 0 },
  }));
}

const extra = (id: string, name: string, aliases: string[] = []): MatchRecord => ({
  id,
  name,
  aliases,
});

/** The naming fixtures plus names the label cases use, including warning-word traps. */
export const SCAN_RECORDS: readonly MatchRecord[] = [
  ...NAMING_RECORDS,
  extra("sour-diesel", "Sour Diesel"),
  extra("durban-poison", "Durban Poison"),
  extra("animal-cookies", "Animal Cookies"),
  extra("gelato-cake", "Gelato Cake"),
  extra("lemon-cherry-gelato", "Lemon Cherry Gelato"),
];

export const scanIndex = buildIndex(SCAN_RECORDS);

/** The CA warning block, wrapped the way it prints on a jar side (tiny text). */
export const CA_WARNING: readonly LineSpec[] = [
  ["GOVERNMENT WARNING: THIS PRODUCT CONTAINS", 8, 0.7],
  ["CANNABIS, A SCHEDULE I CONTROLLED SUBSTANCE.", 8, 0.7],
  ["KEEP OUT OF REACH OF CHILDREN AND ANIMALS.", 8, 0.66],
  ["CANNABIS MAY ONLY BE POSSESSED OR CONSUMED BY", 8, 0.68],
  ["PERSONS 21 YEARS OF AGE OR OLDER UNLESS THE", 8, 0.7],
  ["PERSON IS A QUALIFIED PATIENT. THE INTOXICATING", 8, 0.64],
  ["EFFECTS OF CANNABIS MAY BE DELAYED UP TO TWO", 8, 0.7],
  ["HOURS. CANNABIS USE WHILE PREGNANT MAY BE", 8, 0.69],
  ["HARMFUL. CONSUMPTION OF CANNABIS IMPAIRS YOUR", 8, 0.7],
  ["ABILITY TO DRIVE AND OPERATE MACHINERY. PLEASE", 8, 0.7],
  ["USE EXTREME CAUTION.", 8, 0.71],
];
