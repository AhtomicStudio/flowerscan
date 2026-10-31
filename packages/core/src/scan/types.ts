// Shapes shared by the scan extractors (docs/06 §2–3).
import type { MatchCandidate } from "../match/match";
import type { PackageSays, ProductForm } from "../schema/enums";
import type { PotencyReading } from "../schema/potency";

/** A line's bounding box in image pixels (Tesseract's shape: left, top, right, bottom). */
export interface OcrBox {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** One recognized text line (docs/06 §2 `OcrEngine`). */
export interface OcrLine {
  readonly text: string;
  /**
   * 0–1. Engines that report 0–100 (Tesseract.js) divide by 100 in their adapter. Values outside
   * 0–1 are clamped.
   */
  readonly confidence: number;
  readonly bbox: OcrBox;
  /** Text height in pixels. The strain name is often one of the tallest lines. 0 when unknown. */
  readonly height: number;
}

/** What an OCR engine returns (docs/06 §2). The same shape for every engine. */
export interface OcrResult {
  readonly lines: readonly OcrLine[];
}

/**
 * The OCR adapter contract (docs/06 §2). Core only defines it; `apps/web/src/platform/ocr`
 * implements it (Tesseract.js in a worker now, an opt-in cloud engine in Phase 2). Engines return
 * text only, never a strain decision.
 */
export interface OcrEngine<TImage> {
  recognize(image: TImage): Promise<OcrResult>;
}

/** What Extract reads from label text (docs/06 §3, `parseLabelText`). */
export interface LabelFacts {
  /** Strain-name candidates for `match`, best weight first. */
  readonly candidates: MatchCandidate[];
  /** The label's category claim, three values only (P3, D18), or null when absent or conflicting. */
  readonly package_says: PackageSays | null;
  /** Every potency figure, exactly as printed (P2). Never shown to users. */
  readonly potency_readings: PotencyReading[];
  /** A known brand (display spelling), or null. */
  readonly brand: string | null;
  readonly product_form: ProductForm | null;
}
