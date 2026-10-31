import { describe, expect, it, vi } from "vitest";
import { coreScriptFor, detectWasmFeatures } from "./core-variant";
import { createFakeOcrEngine, fakeOcrLine, fakeOcrResult } from "./fake-ocr-engine";
import { missedText, SYNTHETIC_LABELS } from "./fixtures/synthetic-labels";
import { OCR_CACHE_FORMAT, ocrCacheFileName, toOcrCacheEntry, withOcrRecording } from "./record";

const bitmap = () => ({ width: 10, height: 10, close: vi.fn() }) as unknown as ImageBitmap;

describe("record mode", () => {
  it("builds an ocr-cache entry holding exactly what the engine returned", () => {
    const result = fakeOcrResult(
      [fakeOcrLine("BLUE DREAM", 80), fakeOcrLine("THC 24.1%", 30, 0.88, 1)],
      {
        rotation: 90,
        inverted: true,
      },
    );
    const entry = toOcrCacheEntry("blue-dream-1.jpg", result, "2026-10-29T12:00:00.000Z");
    expect(entry).toEqual({
      format: OCR_CACHE_FORMAT,
      file: "blue-dream-1.jpg",
      engine: result.engine,
      recorded_at: "2026-10-29T12:00:00.000Z",
      image: { width: 1000, height: 600 },
      rotation: 90,
      inverted: true,
      attempts: result.attempts,
      timings_ms: result.timings,
      lines: result.lines,
    });
  });

  it("names the file <photo stem>.<engine id>.json, safely", () => {
    expect(
      ocrCacheFileName("blue-dream-1.jpg", "tesseract.js-7.0.0_eng-4.0.0_best_int_psm-11"),
    ).toBe("blue-dream-1.tesseract.js-7.0.0_eng-4.0.0_best_int_psm-11.json");
    expect(ocrCacheFileName("C:\\photos\\Gelato 33 (2).HEIC", "fake")).toBe(
      "Gelato-33-2-.fake.json",
    );
    expect(ocrCacheFileName("../../etc/passwd", "a/b")).toBe("passwd.a-b.json");
  });

  it("hands every successful read to the recorder and passes it through", async () => {
    const result = fakeOcrResult([fakeOcrLine("GELATO #33")]);
    const engine = createFakeOcrEngine(result);
    const recorded: unknown[] = [];
    const recording = withOcrRecording(engine, (read) => recorded.push(read));
    await recording.prefetch();
    expect(engine.prefetchCount).toBe(1);
    await expect(recording.recognize(bitmap())).resolves.toBe(result);
    expect(recorded).toEqual([result]);
    expect(recording.status).toBe("ready");
  });

  it("records nothing when the read fails", async () => {
    const engine = createFakeOcrEngine(new Error("nope"));
    const onRecord = vi.fn();
    await expect(withOcrRecording(engine, onRecord).recognize(bitmap())).rejects.toThrow("nope");
    expect(onRecord).not.toHaveBeenCalled();
  });
});

describe("fake engine", () => {
  it("answers per call, closes the bitmap and records the options", async () => {
    const engine = createFakeOcrEngine((call) => fakeOcrResult([fakeOcrLine(`call ${call}`)]));
    const image = bitmap();
    const first = await engine.recognize(image, { rotationRetry: false });
    const second = await engine.recognize(bitmap());
    expect(first.lines[0]?.text).toBe("call 0");
    expect(second.lines[0]?.text).toBe("call 1");
    expect(image.close).toHaveBeenCalled();
    expect(engine.calls[0]?.options).toEqual({ rotationRetry: false });
  });
});

describe("core variant", () => {
  it("prefers relaxed SIMD, then SIMD, then the plain build", () => {
    expect(coreScriptFor({ simd: true, relaxedSimd: true })).toBe(
      "tesseract-core-relaxedsimd-lstm.js",
    );
    expect(coreScriptFor({ simd: true, relaxedSimd: false })).toBe("tesseract-core-simd-lstm.js");
    expect(coreScriptFor({ simd: false, relaxedSimd: false })).toBe("tesseract-core-lstm.js");
  });

  it("probes with two different modules and survives a throwing validator", () => {
    const seen: number[] = [];
    const features = detectWasmFeatures((bytes) => {
      seen.push(bytes.length);
      return bytes.length < 33;
    });
    expect(seen).toEqual([31, 36]);
    expect(features).toEqual({ simd: true, relaxedSimd: false });
    expect(
      detectWasmFeatures(() => {
        throw new Error("no wasm");
      }),
    ).toEqual({ simd: false, relaxedSimd: false });
  });
});

describe("synthetic label checks", () => {
  const label = SYNTHETIC_LABELS.find((entry) => entry.id === "dark-bag");

  it("ignores case and spacing when checking what was read", () => {
    if (label === undefined) throw new Error("fixture missing");
    expect(missedText(label, ["blue  dream", "Hybrid", "THC 24.1 %", "NET WT 3.5 g"])).toEqual([]);
    expect(missedText(label, ["BLUE DREAM"])).toEqual(["HYBRID", "THC 24.1%", "3.5g"]);
  });
});
