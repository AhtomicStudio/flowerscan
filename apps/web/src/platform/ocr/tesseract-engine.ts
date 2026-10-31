// The main-thread side of the Tesseract engine. Owns workers/ocr.worker.ts: starts it on first use (or
// on an idle prefetch after the camera opens), keeps it warm between scans, and restarts it after a
// failure. Nothing here touches pixels; frames go to the worker as transferred ImageBitmaps.
import { OCR_ASSETS, type OcrAssetManifest } from "virtual:flowerscan-ocr-assets";
import type { FromOcrWorker, OcrWorkerConfig, ToOcrWorker, WorkerRead } from "./protocol";
import {
  type OcrEngine,
  type OcrEngineInfo,
  type OcrEngineStatus,
  OcrError,
  type OcrResult,
  type RecognizeOptions,
} from "./types";

/** The slice of `Worker` the client uses (a fake in tests). */
export interface OcrWorkerPort {
  postMessage(message: ToOcrWorker, transfer: Transferable[]): void;
  onmessage: ((event: MessageEvent<FromOcrWorker>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  terminate(): void;
}

/**
 * Page segmentation mode. 11 (sparse text) finds scattered text in any order, which suits package
 * labels better than 3 (one column of paragraphs); see the T-011 log for the comparison.
 */
export const DEFAULT_PSM = "11";

export interface TesseractEngineOptions {
  psm?: string;
  /** Extra Tesseract variables, for tuning in the lab and T-012 (none by default). */
  params?: Record<string, string>;
  assets?: OcrAssetManifest;
  /** Creates the worker. Defaults to workers/ocr.worker.ts. */
  createWorker?: () => OcrWorkerPort;
  /** Runs a task when the main thread is idle. Defaults to requestIdleCallback (or a timeout). */
  scheduleIdle?: (task: () => void) => void;
  /** True when the device asked to save data: then prefetch waits for the first real use. */
  saveData?: () => boolean;
  now?: () => number;
  /** Whether this browser can run the engine. Defaults to a feature check. */
  supported?: () => boolean;
}

/** Workers, OffscreenCanvas (2D in workers: iOS Safari 16.4+) and WebAssembly. */
export function isOcrSupported(): boolean {
  return (
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof WebAssembly === "object" &&
    typeof createImageBitmap === "function"
  );
}

function defaultWorker(): OcrWorkerPort {
  return new Worker(new URL("../../workers/ocr.worker.ts", import.meta.url), {
    type: "module",
    name: "ocr",
  }) as OcrWorkerPort;
}

function defaultScheduleIdle(task: () => void): void {
  if (typeof requestIdleCallback === "function") requestIdleCallback(task, { timeout: 2000 });
  else setTimeout(task, 200); // Safari has no requestIdleCallback
}

function defaultSaveData(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

export function engineInfo(
  assets: OcrAssetManifest,
  psm: string,
  params: Record<string, string> = {},
): OcrEngineInfo {
  const tuned = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `_${key}-${value}`)
    .join("");
  return {
    id: `tesseract.js-${assets.versions.tesseract}_eng-${assets.model}_psm-${psm}${tuned}`,
    name: "tesseract.js",
    version: assets.versions.tesseract,
    details: {
      core: assets.versions.core,
      lang: "eng",
      model: assets.model,
      oem: "lstm_only",
      psm,
      ...params,
    },
  };
}

interface Pending {
  resolve: (read: WorkerRead) => void;
  reject: (error: OcrError) => void;
}

export function createTesseractEngine(options: TesseractEngineOptions = {}): OcrEngine {
  const psm = options.psm ?? DEFAULT_PSM;
  const params = options.params ?? {};
  const assets = options.assets ?? OCR_ASSETS;
  const createWorker = options.createWorker ?? defaultWorker;
  const scheduleIdle = options.scheduleIdle ?? defaultScheduleIdle;
  const saveData = options.saveData ?? defaultSaveData;
  const now = options.now ?? (() => performance.now());
  const supported = options.supported ?? isOcrSupported;
  const info = engineInfo(assets, psm, params);

  let status: OcrEngineStatus = "idle";
  let worker: OcrWorkerPort | null = null;
  let ready: Promise<void> | null = null;
  let nextId = 1;
  const pending = new Map<number, Pending>();
  let settleReady: { resolve: () => void; reject: (error: OcrError) => void } | null = null;

  const fail = (error: OcrError) => {
    status = "error";
    settleReady?.reject(error);
    settleReady = null;
    for (const job of pending.values()) job.reject(error);
    pending.clear();
    worker?.terminate();
    worker = null;
    ready = null; // the next call starts a fresh worker
  };

  const start = (): Promise<void> => {
    if (ready !== null) return ready;
    if (!supported()) {
      status = "error";
      return Promise.reject(new OcrError("unsupported", "This browser can't run on-device OCR."));
    }
    status = "loading";
    const port = createWorker();
    worker = port;
    ready = new Promise<void>((resolve, reject) => {
      settleReady = { resolve, reject };
    });
    port.onmessage = ({ data }) => {
      if (port !== worker) return;
      if (data.type === "ready") {
        status = "ready";
        settleReady?.resolve();
        settleReady = null;
      } else if (data.type === "result") {
        pending.get(data.id)?.resolve(data.read);
        pending.delete(data.id);
      } else if (data.id === 0) {
        fail(new OcrError(data.code, data.message));
      } else {
        pending.get(data.id)?.reject(new OcrError(data.code, data.message));
        pending.delete(data.id);
      }
    };
    port.onerror = (event) => {
      if (port !== worker) return;
      event.preventDefault();
      fail(new OcrError("load_failed", event.message || "The OCR worker failed to start."));
    };
    const config: OcrWorkerConfig = {
      assetDir: new URL(assets.dir, location.href).href,
      psm,
      params,
      cachePath: `flowerscan-ocr${assets.dir.replace(/\/$/, "")}`,
    };
    port.postMessage({ type: "init", id: 0, config }, []);
    return ready;
  };

  return {
    get status() {
      return status;
    },

    prefetch() {
      if (status === "ready" || saveData()) return (ready ?? Promise.resolve()).catch(() => {});
      return new Promise<void>((resolve) => {
        scheduleIdle(() => {
          start().then(resolve, () => resolve());
        });
      });
    },

    async recognize(image: ImageBitmap, recognizeOptions: RecognizeOptions = {}) {
      const begin = now();
      const wasReady = status === "ready";
      try {
        await start();
      } catch (error) {
        image.close();
        throw error instanceof OcrError ? error : new OcrError("load_failed", String(error));
      }
      const loadMs = wasReady ? 0 : now() - begin;
      const port = worker;
      if (port === null) {
        image.close();
        throw new OcrError("disposed", "The OCR engine was disposed.");
      }
      const id = nextId++;
      const read = await new Promise<WorkerRead>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        port.postMessage({ type: "recognize", id, image, options: recognizeOptions }, [image]);
      });
      const result: OcrResult = {
        lines: read.lines,
        rotation: read.rotation,
        inverted: read.inverted,
        width: read.width,
        height: read.height,
        attempts: read.attempts,
        timings: {
          loadMs: Math.round(loadMs),
          preprocessMs: Math.round(read.preprocessMs),
          recognizeMs: Math.round(read.recognizeMs),
          totalMs: Math.round(now() - begin),
        },
        engine: info,
      };
      return result;
    },

    dispose() {
      if (worker === null && ready === null) return;
      fail(new OcrError("disposed", "The OCR engine was disposed."));
      status = "idle";
    },
  };
}
