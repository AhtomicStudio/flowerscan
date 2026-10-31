// Messages between the main-thread engine client (tesseract-engine.ts) and workers/ocr.worker.ts.
import type { OcrAttempt, OcrErrorCode, OcrLine, OcrRotation, RecognizeOptions } from "./types";

export interface OcrWorkerConfig {
  /** Absolute URL of the self-hosted asset directory (ends with `/`). */
  assetDir: string;
  /** Tesseract page segmentation mode. */
  psm: string;
  /** Extra Tesseract variables (tuning). */
  params: Record<string, string>;
  /** Key prefix for the traineddata copy Tesseract keeps in IndexedDB (versioned, so upgrades refetch). */
  cachePath: string;
}

export type ToOcrWorker =
  | { type: "init"; id: number; config: OcrWorkerConfig }
  | { type: "recognize"; id: number; image: ImageBitmap; options: RecognizeOptions };

export interface WorkerRead {
  lines: OcrLine[];
  rotation: OcrRotation;
  inverted: boolean;
  width: number;
  height: number;
  attempts: OcrAttempt[];
  preprocessMs: number;
  recognizeMs: number;
}

export type FromOcrWorker =
  | { type: "ready"; id: number; loadMs: number; core: string }
  | { type: "result"; id: number; read: WorkerRead }
  | { type: "error"; id: number; code: OcrErrorCode; message: string };
