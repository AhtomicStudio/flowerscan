// Messages between the scanner and detection.worker.ts. Frames go in as transferred ImageBitmaps (never
// copied, never sent anywhere else); only decoded values and boxes come back.
import { BARCODE_FORMATS, type BarcodeFormat } from "@flowerscan/core";

/** The formats we ask for (docs/06 §2). The Barcode Detection API uses the same names. */
export const DETECT_FORMATS: readonly BarcodeFormat[] = BARCODE_FORMATS;

const KNOWN = new Set<string>(BARCODE_FORMATS);

export function isBarcodeFormat(value: string): value is BarcodeFormat {
  return KNOWN.has(value);
}

export type DetectorEngine = "native" | "polyfill";

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** One decoded code, its box in the coordinates of the frame it came from. */
export interface DetectedCode {
  readonly value: string;
  readonly format: BarcodeFormat;
  readonly box: Box;
}

export type ToWorker =
  | { readonly type: "init" }
  | {
      readonly type: "detect";
      readonly id: number;
      readonly frame: ImageBitmap;
      /** Also report the frame's mean brightness (for the "More light" hint). */
      readonly measureLight: boolean;
    };

export type FromWorker =
  | { readonly type: "ready"; readonly engine: DetectorEngine }
  | {
      readonly type: "result";
      readonly id: number;
      readonly codes: readonly DetectedCode[];
      /** Decode time inside the worker, ms. */
      readonly ms: number;
      /** Mean luma 0–255, or null when not measured or not measurable. */
      readonly luma: number | null;
      readonly engine: DetectorEngine;
    }
  | { readonly type: "error"; readonly id: number | null; readonly message: string };
