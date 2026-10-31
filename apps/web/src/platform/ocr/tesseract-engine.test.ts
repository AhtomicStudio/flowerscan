import { describe, expect, it, vi } from "vitest";
import type { FromOcrWorker, ToOcrWorker, WorkerRead } from "./protocol";
import { createTesseractEngine, engineInfo, type OcrWorkerPort } from "./tesseract-engine";
import { OcrError } from "./types";

const ASSETS = {
  dir: "/ocr/tjs-7.0.0_core-7.0.0_eng-1.0.0/",
  versions: { tesseract: "7.0.0", core: "7.0.0", eng: "1.0.0" },
  model: "4.0.0_best_int",
  files: [],
};

const READ: WorkerRead = {
  lines: [
    { text: "BLUE DREAM", confidence: 0.96, bbox: { x0: 1, y0: 2, x1: 4, y1: 6 }, height: 4 },
  ],
  rotation: 0,
  inverted: false,
  width: 800,
  height: 400,
  attempts: [{ rotation: 0, score: 9, weak: false, ms: 120 }],
  preprocessMs: 12.4,
  recognizeMs: 120.2,
};

/** A fake worker: records messages; the test answers through `reply`. */
class FakePort implements OcrWorkerPort {
  onmessage: ((event: MessageEvent<FromOcrWorker>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly sent: { message: ToOcrWorker; transfer: Transferable[] }[] = [];
  terminated = false;
  postMessage(message: ToOcrWorker, transfer: Transferable[]) {
    this.sent.push({ message, transfer });
  }
  terminate() {
    this.terminated = true;
  }
  reply(data: FromOcrWorker) {
    this.onmessage?.(new MessageEvent("message", { data }));
  }
  /** Answers the latest recognize message. */
  answer(read: WorkerRead = READ) {
    const last = this.sent.at(-1)?.message;
    if (last?.type !== "recognize") throw new Error("no recognize to answer");
    this.reply({ type: "result", id: last.id, read });
  }
}

function bitmap() {
  return { width: 800, height: 400, close: vi.fn() } as unknown as ImageBitmap;
}

function setup(overrides: Parameters<typeof createTesseractEngine>[0] = {}) {
  const ports: FakePort[] = [];
  const idle: (() => void)[] = [];
  let t = 0;
  const engine = createTesseractEngine({
    assets: ASSETS,
    createWorker: () => {
      const port = new FakePort();
      ports.push(port);
      return port;
    },
    scheduleIdle: (task) => idle.push(task),
    saveData: () => false,
    supported: () => true,
    now: () => (t += 10),
    ...overrides,
  });
  return { engine, ports, idle };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createTesseractEngine", () => {
  it("is lazy: no worker until it's needed", () => {
    const { engine, ports } = setup();
    expect(ports).toHaveLength(0);
    expect(engine.status).toBe("idle");
  });

  it("prefetches on idle, sending an init with absolute same-origin asset URLs", async () => {
    const { engine, ports, idle } = setup({ params: { tessedit_do_invert: "0" } });
    const warm = engine.prefetch();
    expect(ports).toHaveLength(0);
    idle.shift()?.();
    expect(engine.status).toBe("loading");
    const init = ports[0]?.sent[0]?.message;
    expect(init?.type).toBe("init");
    if (init?.type !== "init") return;
    expect(init.config.assetDir).toBe(new URL(ASSETS.dir, location.href).href);
    expect(init.config.psm).toBe("11");
    expect(init.config.params).toEqual({ tessedit_do_invert: "0" });
    expect(init.config.cachePath).toBe("flowerscan-ocr/ocr/tjs-7.0.0_core-7.0.0_eng-1.0.0");
    ports[0]?.reply({ type: "ready", id: 0, loadMs: 300, core: "tesseract-core-simd-lstm.js" });
    await warm;
    expect(engine.status).toBe("ready");
  });

  it("skips the prefetch when the device asks to save data (it still loads on first use)", async () => {
    const { engine, ports, idle } = setup({ saveData: () => true });
    await engine.prefetch();
    expect(idle).toHaveLength(0);
    expect(ports).toHaveLength(0);
  });

  it("recognizes on first use, transferring the bitmap, then stays warm", async () => {
    const { engine, ports } = setup();
    const image = bitmap();
    const first = engine.recognize(image, { rotationRetry: false });
    const port = ports[0];
    port?.reply({ type: "ready", id: 0, loadMs: 300, core: "tesseract-core-lstm.js" });
    await flush();
    const sent = port?.sent[1];
    expect(sent?.message).toMatchObject({ type: "recognize", options: { rotationRetry: false } });
    expect(sent?.transfer).toEqual([image]);
    port?.answer();
    const result = await first;
    expect(result.lines).toEqual(READ.lines);
    expect(result.engine.id).toBe("tesseract.js-7.0.0_eng-4.0.0_best_int_psm-11");
    expect(result.timings.loadMs).toBeGreaterThan(0);
    expect(result.timings.preprocessMs).toBe(12);
    expect(result.timings.recognizeMs).toBe(120);

    const second = engine.recognize(bitmap());
    await flush();
    port?.answer();
    expect((await second).timings.loadMs).toBe(0);
    expect(ports).toHaveLength(1);
  });

  it("answers concurrent reads by id", async () => {
    const { engine, ports } = setup();
    const a = engine.recognize(bitmap());
    const b = engine.recognize(bitmap());
    const port = ports[0];
    port?.reply({ type: "ready", id: 0, loadMs: 1, core: "x" });
    await flush();
    const [first, second] = (port?.sent ?? []).slice(1).map((entry) => entry.message.id);
    port?.reply({ type: "result", id: second ?? -1, read: { ...READ, rotation: 90 } });
    port?.reply({ type: "result", id: first ?? -1, read: READ });
    expect((await a).rotation).toBe(0);
    expect((await b).rotation).toBe(90);
  });

  it("rejects a failed read without dropping the warm worker", async () => {
    const { engine, ports } = setup();
    const read = engine.recognize(bitmap());
    ports[0]?.reply({ type: "ready", id: 0, loadMs: 1, core: "x" });
    await flush();
    const id = ports[0]?.sent[1]?.message.id ?? -1;
    ports[0]?.reply({ type: "error", id, code: "recognize_failed", message: "boom" });
    await expect(read).rejects.toMatchObject({ code: "recognize_failed" });
    expect(engine.status).toBe("ready");
    expect(ports[0]?.terminated).toBe(false);
  });

  it("fails a load cleanly and starts a fresh worker on the next call", async () => {
    const { engine, ports } = setup();
    const image = bitmap();
    const read = engine.recognize(image);
    ports[0]?.reply({
      type: "error",
      id: 0,
      code: "load_failed",
      message: "404 eng.traineddata.gz",
    });
    await expect(read).rejects.toMatchObject({ code: "load_failed" });
    expect(image.close).toHaveBeenCalled();
    expect(engine.status).toBe("error");
    expect(ports[0]?.terminated).toBe(true);

    const retry = engine.recognize(bitmap());
    expect(ports).toHaveLength(2);
    ports[1]?.reply({ type: "ready", id: 0, loadMs: 1, core: "x" });
    await flush();
    ports[1]?.answer();
    await expect(retry).resolves.toMatchObject({ rotation: 0 });
  });

  it("treats a worker crash as a load failure for everything pending", async () => {
    const { engine, ports } = setup();
    const read = engine.recognize(bitmap());
    ports[0]?.onerror?.(new ErrorEvent("error", { message: "script failed" }));
    await expect(read).rejects.toMatchObject({ code: "load_failed", message: "script failed" });
  });

  it("a prefetch never rejects, even when loading fails", async () => {
    const { engine, ports, idle } = setup();
    const warm = engine.prefetch();
    idle.shift()?.();
    ports[0]?.reply({ type: "error", id: 0, code: "load_failed", message: "offline" });
    await expect(warm).resolves.toBeUndefined();
    expect(engine.status).toBe("error");
  });

  it("refuses to start where it can't run, and closes the bitmap", async () => {
    const { engine, ports } = setup({ supported: () => false });
    const image = bitmap();
    const error = await engine.recognize(image).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(OcrError);
    expect((error as OcrError).code).toBe("unsupported");
    expect(image.close).toHaveBeenCalled();
    expect(ports).toHaveLength(0);
  });

  it("dispose stops the worker and rejects pending reads", async () => {
    const { engine, ports } = setup();
    const read = engine.recognize(bitmap());
    ports[0]?.reply({ type: "ready", id: 0, loadMs: 1, core: "x" });
    await flush();
    engine.dispose();
    await expect(read).rejects.toMatchObject({ code: "disposed" });
    expect(ports[0]?.terminated).toBe(true);
    expect(engine.status).toBe("idle");
  });
});

describe("engineInfo", () => {
  it("puts the versions, model, PSM and any tuning in a stable id", () => {
    expect(engineInfo(ASSETS, "3", { b: "2", a: "1" })).toEqual({
      id: "tesseract.js-7.0.0_eng-4.0.0_best_int_psm-3_a-1_b-2",
      name: "tesseract.js",
      version: "7.0.0",
      details: {
        core: "7.0.0",
        lang: "eng",
        model: "4.0.0_best_int",
        oem: "lstm_only",
        psm: "3",
        a: "1",
        b: "2",
      },
    });
  });
});
