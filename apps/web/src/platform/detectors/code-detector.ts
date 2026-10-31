// The scanner's view of detection: hand over a frame, get codes back. The real one runs in
// detection.worker.ts; FakeDetector scripts results for tests.
import type { DetectedCode, DetectorEngine, FromWorker, ToWorker } from "./protocol";

export interface DetectionResult {
  readonly codes: readonly DetectedCode[];
  /** Decode time in the worker, ms. */
  readonly ms: number;
  readonly luma: number | null;
  readonly engine: DetectorEngine;
}

export interface CodeDetector {
  /** Starts the engine (loads the polyfill's wasm if needed) and says which one runs. */
  ready(): Promise<DetectorEngine>;
  /** Decodes one frame. The frame is transferred: it's unusable afterwards. */
  detect(frame: ImageBitmap, options?: { measureLight?: boolean }): Promise<DetectionResult>;
  dispose(): void;
}

/** The parts of Worker we use, so tests can pass a fake. */
export interface WorkerLike {
  postMessage(message: ToWorker, transfer: Transferable[]): void;
  addEventListener(type: "message", listener: (event: MessageEvent<FromWorker>) => void): void;
  addEventListener(type: "error", listener: (event: Event) => void): void;
  terminate(): void;
}

function spawnDetectionWorker(): WorkerLike {
  return new Worker(new URL("../../workers/detection.worker.ts", import.meta.url), {
    type: "module",
    name: "detection",
  }) as unknown as WorkerLike;
}

interface Pending {
  resolve(result: DetectionResult): void;
  reject(error: Error): void;
}

/** A detector backed by the detection worker. The worker starts on first use and stays warm. */
export function createWorkerDetector(spawn: () => WorkerLike = spawnDetectionWorker): CodeDetector {
  let worker: WorkerLike | null = null;
  let nextId = 1;
  const pending = new Map<number, Pending>();
  let readyPromise: Promise<DetectorEngine> | null = null;
  let resolveReady: ((engine: DetectorEngine) => void) | null = null;
  let rejectReady: ((error: Error) => void) | null = null;

  function failAll(error: Error) {
    for (const entry of pending.values()) entry.reject(error);
    pending.clear();
    rejectReady?.(error);
    readyPromise = null;
    resolveReady = null;
    rejectReady = null;
    worker?.terminate();
    worker = null;
  }

  function ensureWorker(): WorkerLike {
    if (worker !== null) return worker;
    const created = spawn();
    created.addEventListener("message", (event: MessageEvent<FromWorker>) => {
      const message = event.data;
      if (message.type === "ready") {
        resolveReady?.(message.engine);
        return;
      }
      if (message.type === "error" && message.id === null) {
        // The engine couldn't start (for example the wasm didn't load). Start fresh on the next call.
        failAll(new Error(message.message));
        return;
      }
      const id = message.id;
      if (id === null) return;
      const entry = pending.get(id);
      if (entry === undefined) return;
      pending.delete(id);
      if (message.type === "error") entry.reject(new Error(message.message));
      else {
        entry.resolve({
          codes: message.codes,
          ms: message.ms,
          luma: message.luma,
          engine: message.engine,
        });
      }
    });
    created.addEventListener("error", () => failAll(new Error("detection worker crashed")));
    worker = created;
    return created;
  }

  return {
    ready() {
      if (readyPromise !== null) return readyPromise;
      readyPromise = new Promise<DetectorEngine>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      ensureWorker().postMessage({ type: "init" }, []);
      return readyPromise;
    },

    detect(frame, options = {}) {
      const target = ensureWorker();
      const id = nextId++;
      return new Promise<DetectionResult>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        target.postMessage(
          { type: "detect", id, frame, measureLight: options.measureLight ?? false },
          [frame],
        );
      });
    },

    dispose() {
      failAll(new Error("detector disposed"));
    },
  };
}
