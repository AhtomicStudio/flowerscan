// The engine's output is the input to `parseLabelText` in @flowerscan/core. Core owns the contract
// (`OcrLine`, `OcrResult`, `OcrEngine`); these assignments fail typecheck if the shapes drift apart.
import type {
  OcrEngine as CoreOcrEngine,
  OcrLine as CoreOcrLine,
  OcrResult as CoreOcrResult,
} from "@flowerscan/core";
import { describe, expect, it } from "vitest";
import { createFakeOcrEngine, fakeOcrLine, fakeOcrResult } from "./fake-ocr-engine";
import type { OcrEngine, OcrLine, OcrResult } from "./types";

describe("core OCR contract", () => {
  it("our lines, results and engine are what core reads", () => {
    const line: OcrLine = fakeOcrLine("BLUE DREAM", 80);
    const coreLine: CoreOcrLine = line;
    const result: OcrResult = fakeOcrResult([line]);
    const coreResult: CoreOcrResult = result;
    const engine: OcrEngine = createFakeOcrEngine(result);
    const coreEngine: CoreOcrEngine<ImageBitmap> = engine;
    expect(coreLine.bbox).toEqual({ x0: 20, y0: 20, x1: 500, y1: 100 });
    expect(coreResult.lines).toHaveLength(1);
    expect(typeof coreEngine.recognize).toBe("function");
  });
});
