// A scripted OcrEngine for tests of anything that reads labels (the scan screen, record mode).
import type {
  OcrEngine,
  OcrEngineInfo,
  OcrEngineStatus,
  OcrLine,
  OcrResult,
  RecognizeOptions,
} from "./types";

export const FAKE_ENGINE_INFO: OcrEngineInfo = {
  id: "fake",
  name: "fake",
  version: "0",
  details: {},
};

/** A result with these lines and zeroed timings. */
export function fakeOcrResult(lines: OcrLine[], overrides: Partial<OcrResult> = {}): OcrResult {
  return {
    lines,
    rotation: 0,
    inverted: false,
    width: 1000,
    height: 600,
    attempts: [{ rotation: 0, score: 0, weak: false, ms: 0 }],
    timings: { loadMs: 0, preprocessMs: 0, recognizeMs: 0, totalMs: 0 },
    engine: FAKE_ENGINE_INFO,
    ...overrides,
  };
}

/** A line with a plausible box: `height` px tall, stacked by `index`. */
export function fakeOcrLine(text: string, height = 40, confidence = 0.9, index = 0): OcrLine {
  return {
    text,
    confidence,
    bbox: {
      x0: 20,
      y0: 20 + index * height * 1.5,
      x1: 20 + text.length * height * 0.6,
      y1: 20 + index * height * 1.5 + height,
    },
    height,
  };
}

export interface FakeOcrEngine extends OcrEngine {
  readonly calls: { image: ImageBitmap; options: RecognizeOptions }[];
  prefetchCount: number;
}

type Script = OcrResult | Error | ((call: number) => OcrResult | Error);

/**
 * Answers each `recognize` from `script` (a fixed result, an error, or a function of the call index).
 * Closes the bitmap like the real engine does.
 */
export function createFakeOcrEngine(script: Script, { delayMs = 0 } = {}): FakeOcrEngine {
  let status: OcrEngineStatus = "idle";
  const calls: { image: ImageBitmap; options: RecognizeOptions }[] = [];
  const engine: FakeOcrEngine = {
    calls,
    prefetchCount: 0,
    get status() {
      return status;
    },
    async prefetch() {
      engine.prefetchCount++;
      status = "ready";
    },
    async recognize(image, options = {}) {
      calls.push({ image, options });
      const answer = typeof script === "function" ? script(calls.length - 1) : script;
      image.close?.();
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
      status = "ready";
      if (answer instanceof Error) throw answer;
      return answer;
    },
    dispose() {
      status = "idle";
    },
  };
  return engine;
}
