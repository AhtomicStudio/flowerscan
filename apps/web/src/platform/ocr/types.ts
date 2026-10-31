// The OCR engine contract (docs/06 §2 "OcrEngine adapter"). Engines only read text: they never decide
// what a strain is. Every implementation (Tesseract today, an opt-in cloud engine in Phase 2) returns
// this same shape, and the core parser turns it into candidates for the matcher.

/**
 * A box in pixels of the image passed to `recognize`, origin top-left: corners (x0, y0) to (x1, y1).
 * The same shape as `OcrBox` in @flowerscan/core, which `parseLabelText` reads.
 */
export interface OcrBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** One line of text as the engine read it. Nothing is cleaned up or dropped except blank lines. */
export interface OcrLine {
  /** The text exactly as read (trimmed of surrounding whitespace). */
  text: string;
  /** The engine's confidence for the line, 0–1. */
  confidence: number;
  /** Where the line sits in the input image (input pixels, unrotated, so it can be drawn over the crop). */
  bbox: OcrBox;
  /**
   * The text's line height in input pixels, measured along the reading direction. For a label read
   * rotated by 90°, this is the bbox's width (x1 − x0). Compare heights within one result: the strain name is
   * often (not always) one of the largest lines.
   */
  height: number;
}

/** Degrees clockwise the input was rotated before the lines were read. */
export type OcrRotation = 0 | 90 | 180 | 270;

export interface OcrAttempt {
  rotation: OcrRotation;
  /** Higher is better: confident letters and digits read (see `scoreLines`). */
  score: number;
  /** True when this attempt alone looked too weak to trust its orientation. */
  weak: boolean;
  ms: number;
}

export interface OcrTimings {
  /** Waiting for the engine to download and initialize (0 when it was already warm). */
  loadMs: number;
  /** Scaling on the canvas, grayscale, contrast stretch, inversion (once per call). */
  preprocessMs: number;
  /** All recognition attempts together, including rotation retries. */
  recognizeMs: number;
  /** From `recognize()` being called to the result (main-thread clock). */
  totalMs: number;
}

export interface OcrEngineInfo {
  /** A stable id for caches and eval history, e.g. `tesseract.js-7.0.0_eng-4.0.0_best_int_psm-11`. */
  id: string;
  name: string;
  version: string;
  details: Record<string, string>;
}

export interface OcrResult {
  lines: OcrLine[];
  /** The orientation the lines were read in (the best attempt). */
  rotation: OcrRotation;
  /** True when the crop was mostly dark and was inverted before reading. */
  inverted: boolean;
  /** Input image size in pixels. */
  width: number;
  height: number;
  attempts: OcrAttempt[];
  timings: OcrTimings;
  engine: OcrEngineInfo;
}

export interface RecognizeOptions {
  /** Retry at 90°, 270° and 180° when the first read is weak (default true). */
  rotationRetry?: boolean;
  /** Invert mostly dark crops (light text on a dark bag) before reading (default true). */
  autoInvert?: boolean;
  /** Binarize with an adaptive threshold before reading (default false: Tesseract binarizes itself). */
  adaptiveThreshold?: boolean;
  /** Upscale crops shorter than this many px (default `TARGET_HEIGHT`, 1000). A tuning knob for T-012. */
  targetHeight?: number;
}

export type OcrEngineStatus = "idle" | "loading" | "ready" | "error";

export interface OcrEngine {
  /**
   * Reads the text in `image`. Takes ownership of the bitmap: it's transferred to the worker and
   * closed there, so don't use it after the call.
   */
  recognize(image: ImageBitmap, options?: RecognizeOptions): Promise<OcrResult>;
  /**
   * Starts downloading and initializing the engine in the background (on idle). Safe to call often.
   * Resolves when the engine is warm. Never rejects: a load failure surfaces on the next `recognize`.
   */
  prefetch(): Promise<void>;
  readonly status: OcrEngineStatus;
  /** Stops the worker and frees its memory. The next call starts a fresh one. */
  dispose(): void;
}

export type OcrErrorCode = "unsupported" | "load_failed" | "recognize_failed" | "disposed";

export class OcrError extends Error {
  readonly code: OcrErrorCode;
  constructor(code: OcrErrorCode, message: string) {
    super(message);
    this.name = "OcrError";
    this.code = code;
  }
}
