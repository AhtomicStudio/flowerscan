// Dev "record" mode (T-011 → T-012): saves what the engine read, in the data/eval/ocr-cache/ format,
// so the eval harness can rerun parse → match → decide on stored text without OCR. Dev only: the
// recording stays on this machine (a file download), it's never uploaded, and production never calls it.
import type { OcrEngine, OcrResult } from "./types";

export const OCR_CACHE_FORMAT = "flowerscan.ocr-cache/1";

/** One cached read: `data/eval/ocr-cache/<photo stem>.<engine id>.json`. */
export interface OcrCacheEntry {
  format: typeof OCR_CACHE_FORMAT;
  /** The photo's file name in data/eval/packages/ (`<slug>-<n>.jpg`). */
  file: string;
  engine: OcrResult["engine"];
  recorded_at: string;
  image: { width: number; height: number };
  rotation: OcrResult["rotation"];
  inverted: boolean;
  attempts: OcrResult["attempts"];
  timings_ms: OcrResult["timings"];
  /** Exactly what `recognize` returned: the input `parseLabelText` gets. */
  lines: OcrResult["lines"];
}

export function toOcrCacheEntry(
  file: string,
  result: OcrResult,
  recordedAt: string,
): OcrCacheEntry {
  return {
    format: OCR_CACHE_FORMAT,
    file,
    engine: result.engine,
    recorded_at: recordedAt,
    image: { width: result.width, height: result.height },
    rotation: result.rotation,
    inverted: result.inverted,
    attempts: result.attempts,
    timings_ms: result.timings,
    lines: result.lines,
  };
}

/** `blue-dream-1.jpg` + `tesseract.js-7.0.0_…` → `blue-dream-1.tesseract.js-7.0.0_….json`. */
export function ocrCacheFileName(file: string, engineId: string): string {
  const base = file.replace(/^.*[\\/]/, "");
  const stem = base.includes(".") ? base.slice(0, base.lastIndexOf(".")) : base;
  const safe = (value: string) => value.replace(/[^A-Za-z0-9._-]+/g, "-");
  return `${safe(stem)}.${safe(engineId)}.json`;
}

/** Wraps an engine so every successful read is also handed to `onRecord`. */
export function withOcrRecording(
  engine: OcrEngine,
  onRecord: (result: OcrResult) => void,
): OcrEngine {
  return {
    get status() {
      return engine.status;
    },
    prefetch: () => engine.prefetch(),
    dispose: () => engine.dispose(),
    async recognize(image, options) {
      const result = await engine.recognize(image, options);
      onRecord(result);
      return result;
    },
  };
}

/** Saves an entry as a local file download (move it into data/eval/ocr-cache/). */
export function downloadOcrCacheEntry(entry: OcrCacheEntry): void {
  const blob = new Blob([`${JSON.stringify(entry, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = ocrCacheFileName(entry.file, entry.engine.id);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
