// The worker's logic, kept free of `self` so it can be unit-tested: pick an engine (native BarcodeDetector
// when it supports every format we need, else the zxing-wasm polyfill), decode each frame, close it.
import {
  type Box,
  DETECT_FORMATS,
  type DetectedCode,
  type DetectorEngine,
  type FromWorker,
  isBarcodeFormat,
  type ToWorker,
} from "./protocol";

/** What both the native API and the polyfill return per code. */
export interface RawDetection {
  readonly rawValue: string;
  readonly format: string;
  readonly boundingBox: Box;
}

export interface BarcodeDetectorLike {
  detect(image: ImageBitmap): Promise<readonly RawDetection[]>;
}

export interface DetectorFactories {
  /** The native detector if it exists and supports all of DETECT_FORMATS, else null. */
  native(): Promise<BarcodeDetectorLike | null>;
  /** The zxing-wasm polyfill (same API). Loads the self-hosted wasm. */
  polyfill(): Promise<BarcodeDetectorLike>;
  now(): number;
  /** Mean luma of a frame, 0–255, or null if this environment can't read pixels. */
  measureLuma(frame: ImageBitmap): number | null;
}

export type Post = (message: FromWorker) => void;

function toCode(raw: RawDetection): DetectedCode | null {
  if (!isBarcodeFormat(raw.format) || raw.rawValue === "") return null;
  const { x, y, width, height } = raw.boundingBox;
  return { value: raw.rawValue, format: raw.format, box: { x, y, width, height } };
}

/** True when a native detector covers every format we need (docs/06 §2, T-010). */
export function nativeCoversFormats(supported: readonly string[]): boolean {
  const set = new Set(supported);
  return DETECT_FORMATS.every((format) => set.has(format));
}

export function createDetectionHandler(factories: DetectorFactories, post: Post) {
  let engine: { kind: DetectorEngine; detector: BarcodeDetectorLike } | null = null;
  let starting: Promise<{ kind: DetectorEngine; detector: BarcodeDetectorLike }> | null = null;

  async function choose(): Promise<{ kind: DetectorEngine; detector: BarcodeDetectorLike }> {
    let native: BarcodeDetectorLike | null = null;
    try {
      native = await factories.native();
    } catch {
      native = null;
    }
    if (native !== null) return { kind: "native", detector: native };
    return { kind: "polyfill", detector: await factories.polyfill() };
  }

  function ensure() {
    if (engine !== null) return Promise.resolve(engine);
    starting ??= choose().then(
      (chosen) => {
        engine = chosen;
        return chosen;
      },
      (error: unknown) => {
        starting = null;
        throw error;
      },
    );
    return starting;
  }

  async function detect(id: number, frame: ImageBitmap, measureLight: boolean) {
    try {
      let current = await ensure();
      const started = factories.now();
      let raw: readonly RawDetection[];
      try {
        raw = await current.detector.detect(frame);
      } catch (error) {
        // A native detector that fails at runtime (no detection service on the device) is replaced by
        // the polyfill for good. A failing polyfill is a real error.
        if (current.kind !== "native") throw error;
        engine = { kind: "polyfill", detector: await factories.polyfill() };
        current = engine;
        raw = await current.detector.detect(frame);
      }
      const ms = factories.now() - started;
      const luma = measureLight ? factories.measureLuma(frame) : null;
      const codes = raw.map(toCode).filter((code): code is DetectedCode => code !== null);
      post({ type: "result", id, codes, ms, luma, engine: current.kind });
    } catch (error) {
      post({ type: "error", id, message: error instanceof Error ? error.message : String(error) });
    } finally {
      frame.close();
    }
  }

  return async function handle(message: ToWorker): Promise<void> {
    if (message.type === "init") {
      try {
        const chosen = await ensure();
        post({ type: "ready", engine: chosen.kind });
      } catch (error) {
        post({
          type: "error",
          id: null,
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }
    await detect(message.id, message.frame, message.measureLight);
  };
}
