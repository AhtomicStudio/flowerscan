// The shutter's seam to text reading (T-011). The scanner hands over the reticle crop and gets matcher
// candidates back; it never sees OCR output as a result (docs/06 §2: OCR only reads text). T-011 plugs in
// OcrEngine.recognize → core parseLabelText behind this one function.
import { type MatchCandidate, type PackageSays, parseLabelText } from "@flowerscan/core";
import { createTesseractEngine, type OcrEngine, OcrError } from "../../platform/ocr";

export interface LabelReading {
  /** Matcher candidates from parseLabelText (core). Empty when no text was read. */
  readonly candidates: readonly MatchCandidate[];
  /** What we read, kept on the device (Scan.ocr_text). Never sent anywhere. */
  readonly text: string;
  /** Category printed on the package (Indica / Sativa / Hybrid), if any (P3, D18). */
  readonly packageSays?: PackageSays | null | undefined;
}

export type ReadFailure =
  /** No text engine is wired in yet (until T-011 lands). */
  | "unavailable"
  /** Offline and the one-time OCR download isn't cached. */
  | "offline"
  /** Online, but the one-time download failed. */
  | "download-failed"
  /** The engine crashed or the 15 s limit passed. */
  | "failed";

export class ReadLabelError extends Error {
  override readonly name = "ReadLabelError";
  constructor(
    readonly kind: ReadFailure,
    message: string = kind,
  ) {
    super(message);
  }
}

export interface DownloadProgress {
  readonly loaded: number;
  readonly total: number;
}

export interface ReadLabelOptions {
  /** Aborted at 15 s, on "Search instead", or when the scanner closes. */
  readonly signal: AbortSignal;
  /** First use only: the one-time language-data download (determinate progress pill). */
  readonly onDownload?: ((progress: DownloadProgress) => void) | undefined;
}

/** Owns `frame`: it must close or transfer it. */
export type ReadLabel = (frame: ImageBitmap, options: ReadLabelOptions) => Promise<LabelReading>;

/** Fallback when OCR is explicitly disabled in a test. */
export const readLabelUnavailable: ReadLabel = async (frame) => {
  frame.close();
  throw new ReadLabelError("unavailable");
};

function mapOcrError(error: unknown): ReadLabelError {
  if (error instanceof ReadLabelError) return error;
  if (error instanceof OcrError) {
    if (error.code === "unsupported") return new ReadLabelError("unavailable", error.message);
    if (error.code === "load_failed") {
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      return new ReadLabelError(offline ? "offline" : "download-failed", error.message);
    }
    return new ReadLabelError("failed", error.message);
  }
  return new ReadLabelError("failed", error instanceof Error ? error.message : String(error));
}

/**
 * Wires the on-device Tesseract worker (`createTesseractEngine`) to `@flowerscan/core`'s `parseLabelText`.
 * Lazy: the worker only starts on `prefetch()` (after the camera is live) or on the first shutter tap.
 */
export function createOcrReadLabel(engine: OcrEngine = createTesseractEngine()): {
  readonly readLabel: ReadLabel;
  readonly prefetch: () => Promise<void>;
} {
  const readLabel: ReadLabel = async (frame, { signal }) => {
    if (signal.aborted) {
      frame.close();
      throw new ReadLabelError("failed", "aborted");
    }
    try {
      const result = await engine.recognize(frame);
      const facts = parseLabelText(result.lines);
      const text = result.lines.map((line) => line.text).join("\n");
      return {
        candidates: facts.candidates,
        text,
        packageSays: facts.package_says,
      };
    } catch (error) {
      throw mapOcrError(error);
    }
  };
  return {
    readLabel,
    prefetch: () => engine.prefetch(),
  };
}
