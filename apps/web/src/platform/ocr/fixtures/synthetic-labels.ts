// Synthetic package labels for proving the OCR engine reads (T-011). Drawn onto a canvas at runtime,
// so no image files are committed and no real package photo is involved. Brands and lot numbers are
// invented; strain names are real so the parser half has something realistic to chew on later.
import type { OcrRotation } from "../types";

export interface SyntheticLine {
  text: string;
  /** Font size in px. */
  size: number;
  weight?: 400 | 700 | 900;
  color?: string;
}

export interface SyntheticLabel {
  id: string;
  /** Upright label size in px (before `rotate`). */
  width: number;
  height: number;
  background: string;
  foreground: string;
  /** Degrees clockwise the label sits in the frame, e.g. 90 for a jar held sideways. */
  rotate: OcrRotation;
  lines: SyntheticLine[];
  /** Text the engine must read (compared ignoring case and whitespace). */
  mustRead: string[];
}

const WARNING = [
  "GOVERNMENT WARNING: THIS PACKAGE CONTAINS CANNABIS.",
  "KEEP OUT OF REACH OF CHILDREN. FOR USE ONLY BY ADULTS 21+.",
];

export const SYNTHETIC_LABELS: readonly SyntheticLabel[] = [
  {
    id: "dark-bag",
    width: 1200,
    height: 760,
    background: "#111111",
    foreground: "#f4f4f4",
    rotate: 0,
    lines: [
      { text: "EXAMPLE FARMS CO.", size: 30, weight: 700 },
      { text: "BLUE DREAM", size: 110, weight: 900 },
      { text: "HYBRID", size: 44, weight: 700, color: "#9fe0a8" },
      { text: "THC 24.1%   CBD <1%", size: 40, weight: 700 },
      { text: "NET WT 3.5g (1/8 oz)", size: 32 },
      ...WARNING.map((text) => ({ text, size: 20 })),
    ],
    mustRead: ["BLUE DREAM", "HYBRID", "THC 24.1%", "3.5g"],
  },
  {
    id: "vertical-jar",
    width: 1000,
    height: 560,
    background: "#ffffff",
    foreground: "#1b1b1b",
    rotate: 90,
    lines: [
      { text: "GELATO #33", size: 96, weight: 900 },
      { text: "Indica-Dominant Hybrid", size: 40, weight: 700 },
      { text: "Total THC: 27.8 %", size: 36 },
      { text: "THCa 30.2%   Δ9-THC 0.8%", size: 36 },
      { text: "Batch: EX-0000-G33", size: 28 },
    ],
    mustRead: ["GELATO #33", "Indica-Dominant", "Total THC: 27.8"],
  },
  {
    id: "small-crop",
    width: 540,
    height: 170,
    background: "#f3ecdc",
    foreground: "#2a2016",
    rotate: 0,
    lines: [
      { text: "WEDDING CAKE", size: 52, weight: 900 },
      { text: "Sativa  |  241 mg/g THC", size: 22, weight: 700 },
    ],
    mustRead: ["WEDDING CAKE", "241 mg/g"],
  },
  {
    id: "upside-down",
    width: 1100,
    height: 640,
    background: "#fafafa",
    foreground: "#202020",
    rotate: 180,
    lines: [
      { text: "Sample Grove Farms", size: 34, weight: 700 },
      { text: "Sour Diesel", size: 100, weight: 900 },
      { text: "Sativa (S)", size: 44, weight: 700 },
      { text: "Total Cannabinoids 31.2%", size: 36 },
      { text: "Lic. C11-0000512-LIC", size: 28 },
    ],
    mustRead: ["Sour Diesel", "Sativa", "Total Cannabinoids 31.2%"],
  },
  {
    id: "pre-roll-tube",
    width: 1300,
    height: 420,
    background: "#e7f0ff",
    foreground: "#0f2a52",
    rotate: 270,
    lines: [
      { text: "PURPLE PUNCH", size: 96, weight: 900 },
      { text: "Pre-Roll 1g   Indica", size: 40, weight: 700 },
      { text: "THC 19.5%   CBD ND", size: 36 },
    ],
    mustRead: ["PURPLE PUNCH", "Pre-Roll", "THC 19.5%"],
  },
];

/** The text read, normalized for `mustRead` checks: uppercase, no whitespace. */
export function normalizeForCheck(text: string): string {
  return text.toUpperCase().replace(/\s+/g, "");
}

/** Which `mustRead` items the engine missed. */
export function missedText(label: SyntheticLabel, linesRead: readonly string[]): string[] {
  const read = normalizeForCheck(linesRead.join("\n"));
  return label.mustRead.filter((text) => !read.includes(normalizeForCheck(text)));
}

const FONT_STACK = "Arial, Helvetica, 'DejaVu Sans', sans-serif";

/** Draws the label (rotated as it would sit in the frame) and returns it as an ImageBitmap. */
export async function renderSyntheticLabel(label: SyntheticLabel): Promise<ImageBitmap> {
  const upright = new OffscreenCanvas(label.width, label.height);
  const context = upright.getContext("2d");
  if (context === null) throw new Error("no 2D context");
  context.fillStyle = label.background;
  context.fillRect(0, 0, label.width, label.height);
  context.textBaseline = "top";
  const gap = 0.45;
  const total = label.lines.reduce((sum, line) => sum + line.size * (1 + gap), 0);
  let y = Math.max(16, (label.height - total) / 2);
  for (const line of label.lines) {
    context.font = `${line.weight ?? 400} ${line.size}px ${FONT_STACK}`;
    context.fillStyle = line.color ?? label.foreground;
    context.fillText(line.text, Math.round(label.width * 0.06), y);
    y += line.size * (1 + gap);
  }
  if (label.rotate === 0) return createImageBitmap(upright);
  const quarter = label.rotate === 90 || label.rotate === 270;
  const out = new OffscreenCanvas(
    quarter ? label.height : label.width,
    quarter ? label.width : label.height,
  );
  const outContext = out.getContext("2d");
  if (outContext === null) throw new Error("no 2D context");
  outContext.translate(out.width / 2, out.height / 2);
  outContext.rotate((label.rotate * Math.PI) / 180);
  outContext.drawImage(upright, -label.width / 2, -label.height / 2);
  return createImageBitmap(out);
}
