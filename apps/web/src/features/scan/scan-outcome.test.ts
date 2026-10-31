import { buildIndex } from "@flowerscan/core";
import { describe, expect, it } from "vitest";
import type { OcrEngine } from "../../platform/ocr/types";
import { STRAINS } from "../../test/fixtures";
import { createOcrReadLabel } from "./read-label";
import { outcomeFor } from "./scan-outcome";

const index = buildIndex(STRAINS);

describe("outcomeFor", () => {
  it("accepts a direct strain match even when packageSays is present", () => {
    const out = outcomeFor(index, [{ text: "Kestrel Haze", weight: 1 }], "indica");
    expect(out).toEqual({ kind: "accept", strainId: "kestrel-haze", read: "Kestrel Haze" });
  });

  it("falls back to package-says when no strain matches in the database", () => {
    const out = outcomeFor(index, [{ text: "Uncharted Mystery", weight: 1 }], "sativa");
    expect(out).toEqual({
      kind: "package-says",
      packageSays: "sativa",
      read: "Uncharted Mystery",
    });
  });

  it("falls back to package-says even when no candidate text was read", () => {
    const out = outcomeFor(index, [], "indica");
    expect(out).toEqual({
      kind: "package-says",
      packageSays: "indica",
      read: "",
    });
  });

  it("returns none when neither a database match nor package_says is found", () => {
    const out = outcomeFor(index, [{ text: "Uncharted Mystery", weight: 1 }], null);
    expect(out).toEqual({ kind: "none", read: "Uncharted Mystery" });
  });
});

describe("createOcrReadLabel", () => {
  it("parses OCR lines through parseLabelText and returns candidates + packageSays", async () => {
    const fakeEngine: OcrEngine = {
      status: "ready",
      prefetch: async () => {},
      dispose: () => {},
      recognize: async () => ({
        lines: [
          {
            text: "BLUE DREAM",
            confidence: 0.92,
            bbox: { x0: 0, y0: 0, x1: 100, y1: 20 },
            height: 20,
          },
          {
            text: "SATIVA",
            confidence: 0.95,
            bbox: { x0: 0, y0: 30, x1: 80, y1: 48 },
            height: 18,
          },
          {
            text: "NET WT 3.5g",
            confidence: 0.9,
            bbox: { x0: 0, y0: 60, x1: 90, y1: 75 },
            height: 15,
          },
        ],
        rotation: 0,
        inverted: false,
        width: 200,
        height: 100,
        attempts: [{ rotation: 0, score: 10, weak: false, ms: 50 }],
        timings: { loadMs: 0, preprocessMs: 5, recognizeMs: 50, totalMs: 55 },
        engine: { id: "fake", name: "fake", version: "1.0.0", details: {} },
      }),
    };
    const { readLabel } = createOcrReadLabel(fakeEngine);
    const frame: ImageBitmap = {
      width: 10,
      height: 10,
      close: () => {},
    };
    const res = await readLabel(frame, { signal: new AbortController().signal });
    expect(res.candidates.map((c) => c.text)).toContain("BLUE DREAM");
    expect(res.packageSays).toBe("sativa");
  });
});
