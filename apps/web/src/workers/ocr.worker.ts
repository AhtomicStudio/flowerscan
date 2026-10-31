// OCR worker (docs/06 §2). Receives a cropped frame as an ImageBitmap, preprocesses it on an
// OffscreenCanvas (scale) and in plain JS (grayscale, contrast, rotation), and reads it with
// Tesseract.js. Tesseract runs its own classic worker nested inside this one. Every file it loads
// (worker script, wasm core, eng traineddata) comes from our origin: see `ocrAssets()` in vite.config.ts.
// Text only: this never decides what a strain is.
import Tesseract from "tesseract.js";
import { coreScriptFor, detectWasmFeatures } from "../platform/ocr/core-variant";
import type { TessBlock } from "../platform/ocr/lines";
import { runOcrPipeline } from "../platform/ocr/pipeline";
import { planScale } from "../platform/ocr/preprocess";
import type {
  FromOcrWorker,
  OcrWorkerConfig,
  ToOcrWorker,
  WorkerRead,
} from "../platform/ocr/protocol";
import type { RecognizeOptions } from "../platform/ocr/types";

// The app's tsconfig uses the DOM lib, not WebWorker, so describe the bits of the worker scope we use.
interface WorkerScope {
  postMessage(message: FromOcrWorker): void;
  addEventListener(type: "message", listener: (event: MessageEvent<ToOcrWorker>) => void): void;
}
const scope = self as unknown as WorkerScope;

let engine: Promise<{ tesseract: Tesseract.Worker; core: string; loadMs: number }> | null = null;
// One read at a time: Tesseract is single-threaded, and queuing keeps the timings honest.
let queue: Promise<unknown> = Promise.resolve();

function load(config: OcrWorkerConfig) {
  engine ??= (async () => {
    const start = performance.now();
    if (typeof OffscreenCanvas === "undefined" || typeof Worker === "undefined") {
      throw Object.assign(new Error("This browser can't run OCR in a worker."), {
        code: "unsupported",
      });
    }
    // Privacy and offline: the engine only ever loads from our own origin. Tesseract.js falls back
    // to a CDN for any path left unset, so every path is set, and a foreign directory is refused.
    if (new URL(config.assetDir).origin !== self.location.origin) {
      throw new Error("OCR assets must be served from this origin.");
    }
    const core = coreScriptFor(detectWasmFeatures((bytes) => WebAssembly.validate(bytes)));
    // Tesseract.js only rejects createWorker when the core fails; a failed traineddata fetch reaches
    // errorHandler and leaves the promise pending forever. Race the two so a 404 or offline first use fails.
    let failLoad: (reason: unknown) => void = () => {};
    const failed = new Promise<never>((_, reject) => {
      failLoad = reject;
    });
    const created = Tesseract.createWorker("eng", Tesseract.OEM.LSTM_ONLY, {
      workerPath: `${config.assetDir}worker.min.js`,
      corePath: `${config.assetDir}${core}`,
      langPath: config.assetDir.replace(/\/$/, ""),
      cachePath: config.cachePath,
      // A blob: URL wrapper isn't needed (same origin) and would need `blob:` in a future CSP.
      workerBlobURL: false,
      gzip: true,
      // Without a handler Tesseract.js rethrows inside its message callback. Recognize errors also
      // reject their own promise, so after loading this only matters for the load race.
      errorHandler: (reason: unknown) => failLoad(new Error(`Tesseract: ${String(reason)}`)),
    });
    const tesseract = await Promise.race([created, failed]);
    await tesseract.setParameters({
      ...config.params,
      tessedit_pageseg_mode: config.psm as Tesseract.PSM,
    });
    return { tesseract, core, loadMs: performance.now() - start };
  })();
  engine.catch(() => {
    engine = null; // let the next init retry (e.g. the first use happened offline)
  });
  return engine;
}

async function recognize(image: ImageBitmap, options: RecognizeOptions): Promise<WorkerRead> {
  const loaded = engine;
  if (loaded === null) throw new Error("recognize before init");
  const { tesseract } = await loaded;
  const canvasStart = performance.now();
  const { width, height } = image;
  const plan = planScale(width, height, options.targetHeight);
  const canvas = new OffscreenCanvas(plan.width, plan.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null) throw new Error("no 2D context on OffscreenCanvas");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, plan.width, plan.height);
  image.close();
  const pixels = context.getImageData(0, 0, plan.width, plan.height).data;
  const canvasMs = performance.now() - canvasStart;

  const output = await runOcrPipeline(
    { rgba: pixels, width: plan.width, height: plan.height, scale: plan.scale },
    async (pgm) => {
      const { data } = await tesseract.recognize(
        new Blob([pgm]),
        {},
        { text: false, blocks: true },
      );
      return data.blocks as readonly TessBlock[] | null;
    },
    options,
    () => performance.now(),
  );
  return { ...output, preprocessMs: output.preprocessMs + canvasMs, width, height };
}

function errorMessage(error: unknown): { code: "unsupported" | "load_failed"; message: string } {
  const code =
    typeof error === "object" && error !== null && "code" in error && error.code === "unsupported"
      ? "unsupported"
      : "load_failed";
  return { code, message: error instanceof Error ? error.message : String(error) };
}

scope.addEventListener("message", (event) => {
  const message = event.data;
  if (message.type === "init") {
    load(message.config).then(
      ({ core, loadMs }) => scope.postMessage({ type: "ready", id: message.id, loadMs, core }),
      (error: unknown) =>
        scope.postMessage({ type: "error", id: message.id, ...errorMessage(error) }),
    );
    return;
  }
  const job = queue.then(() => recognize(message.image, message.options));
  queue = job.catch(() => {});
  job.then(
    (read) => scope.postMessage({ type: "result", id: message.id, read }),
    (error: unknown) => {
      message.image.close();
      scope.postMessage({
        type: "error",
        id: message.id,
        code: "recognize_failed",
        message: error instanceof Error ? error.message : String(error),
      });
    },
  );
});
