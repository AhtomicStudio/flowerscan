// The two detection engines, as seen from inside the worker. Native BarcodeDetector where it covers our
// formats (Android Chrome), else the zxing-wasm polyfill (iPhone, desktop Windows/Linux). The polyfill's wasm
// is served from our own origin: its default would fetch it from a CDN, which docs/09 forbids.
import { BarcodeDetector as PolyfillDetector, prepareZXingModule } from "barcode-detector/ponyfill";
import wasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";
import type { BarcodeDetectorLike, DetectorFactories } from "./detection-handler";
import { nativeCoversFormats } from "./detection-handler";
import { DETECT_FORMATS } from "./protocol";

interface NativeDetectorClass {
  new (options: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats(): Promise<string[]>;
}

function nativeClass(): NativeDetectorClass | null {
  const candidate = (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector;
  return typeof candidate === "function" ? (candidate as NativeDetectorClass) : null;
}

async function native(): Promise<BarcodeDetectorLike | null> {
  const Native = nativeClass();
  if (Native === null) return null;
  const supported = await Native.getSupportedFormats();
  if (!nativeCoversFormats(supported)) return null;
  return new Native({ formats: [...DETECT_FORMATS] });
}

let polyfillReady: Promise<BarcodeDetectorLike> | null = null;

function polyfill(): Promise<BarcodeDetectorLike> {
  polyfillReady ??= (async () => {
    // Resolve the wasm against the worker's own URL, so it works in dev, preview and production.
    const absolute = new URL(wasmUrl, self.location.href).href;
    await prepareZXingModule({
      overrides: {
        locateFile: (path: string, prefix: string) =>
          path.endsWith(".wasm") ? absolute : prefix + path,
      },
      fireImmediately: true,
    });
    return new PolyfillDetector({ formats: [...DETECT_FORMATS] });
  })().catch((error: unknown) => {
    polyfillReady = null;
    throw error;
  });
  return polyfillReady;
}

let lumaCanvas: OffscreenCanvas | null = null;

/** Mean luma of the frame, sampled at 16×16 (about 0.1 ms). Null without OffscreenCanvas. */
function measureLuma(frame: ImageBitmap): number | null {
  if (typeof OffscreenCanvas === "undefined") return null;
  try {
    lumaCanvas ??= new OffscreenCanvas(16, 16);
    const context = lumaCanvas.getContext("2d", { willReadFrequently: true });
    if (context === null) return null;
    context.drawImage(frame, 0, 0, 16, 16);
    const { data } = context.getImageData(0, 0, 16, 16);
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += 0.2126 * (data[i] ?? 0) + 0.7152 * (data[i + 1] ?? 0) + 0.0722 * (data[i + 2] ?? 0);
    }
    return sum / (data.length / 4);
  } catch {
    return null;
  }
}

export const workerFactories: DetectorFactories = {
  native,
  polyfill,
  now: () => performance.now(),
  measureLuma,
};
