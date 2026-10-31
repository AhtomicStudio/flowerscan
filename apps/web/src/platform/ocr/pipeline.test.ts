import { describe, expect, it } from "vitest";
import type { TessBlock } from "./lines";
import { type ReadImage, runOcrPipeline } from "./pipeline";
import type { OcrRotation } from "./types";

/** A blocks answer with one line of `text` at `confidence` (0–100). */
function blocks(text: string, confidence: number): TessBlock[] {
  return [
    {
      paragraphs: [
        {
          lines: [
            {
              text,
              confidence,
              bbox: { x0: 0, y0: 0, x1: 100, y1: 20 },
              words: text.split(" ").map((word) => ({ text: word, confidence })),
            },
          ],
        },
      ],
    },
  ];
}

const STRONG = blocks("GELATO #33 Indica", 93);
const NOISE = blocks("|| =- ~", 25);

/** Decodes the P5 header the reader got, so tests can tell which rotation it was handed. */
function pgmSize(pgm: Uint8Array): [number, number] {
  const header = new TextDecoder().decode(pgm.slice(0, 20)).split("\n")[1] ?? "";
  const [w, h] = header.split(" ").map(Number);
  return [w ?? 0, h ?? 0];
}

/** A reader that answers per call, recording the image sizes it was given. */
function scriptedReader(answers: TessBlock[][]) {
  const sizes: [number, number][] = [];
  const read: ReadImage = async (pgm) => {
    sizes.push(pgmSize(pgm));
    return answers[sizes.length - 1] ?? NOISE;
  };
  return { read, sizes };
}

/** A 4 × 2 light image with a dark pixel, as RGBA. */
function input(dark = false) {
  const rgba = new Uint8ClampedArray(4 * 2 * 4);
  for (let i = 0; i < 8; i++) {
    const value = (i === 5) !== dark ? 20 : 235;
    rgba.set([value, value, value, 255], i * 4);
  }
  return { rgba, width: 4, height: 2, scale: 1 };
}

const clock = () => {
  let t = 0;
  return () => (t += 5);
};

function rotations(attempts: { rotation: OcrRotation }[]) {
  return attempts.map((attempt) => attempt.rotation);
}

describe("runOcrPipeline", () => {
  it("reads once when the upright read is strong", async () => {
    const { read, sizes } = scriptedReader([STRONG]);
    const out = await runOcrPipeline(input(), read, {}, clock());
    expect(rotations(out.attempts)).toEqual([0]);
    expect(out.rotation).toBe(0);
    expect(out.lines.map((line) => line.text)).toEqual(["GELATO #33 Indica"]);
    expect(sizes).toEqual([[4, 2]]);
  });

  it("retries at 90° when upright is weak, and stops at the first strong read", async () => {
    const { read, sizes } = scriptedReader([NOISE, STRONG]);
    const out = await runOcrPipeline(input(), read, {}, clock());
    expect(rotations(out.attempts)).toEqual([0, 90]);
    expect(out.rotation).toBe(90);
    expect(out.attempts.map((attempt) => attempt.weak)).toEqual([true, false]);
    expect(sizes).toEqual([
      [4, 2],
      [2, 4],
    ]);
  });

  it("tries 90°, 270° then 180°, and keeps the best when every read is weak", async () => {
    const better = blocks("BLUE DREA", 60); // weak (low confidence) but the best of a bad lot
    const { read } = scriptedReader([NOISE, NOISE, better, NOISE]);
    const out = await runOcrPipeline(input(), read, {}, clock());
    expect(rotations(out.attempts)).toEqual([0, 90, 270, 180]);
    expect(out.rotation).toBe(270);
    expect(out.lines[0]?.text).toBe("BLUE DREA");
  });

  it("finds an upside-down label on the last retry", async () => {
    const { read } = scriptedReader([NOISE, NOISE, NOISE, STRONG]);
    const out = await runOcrPipeline(input(), read, {}, clock());
    expect(out.rotation).toBe(180);
  });

  it("doesn't retry when rotation retry is off", async () => {
    const { read } = scriptedReader([NOISE, STRONG]);
    const out = await runOcrPipeline(input(), read, { rotationRetry: false }, clock());
    expect(rotations(out.attempts)).toEqual([0]);
  });

  it("returns no lines when nothing was read", async () => {
    const { read } = scriptedReader([[], [], [], []]);
    const out = await runOcrPipeline(input(), read, {}, clock());
    expect(out.lines).toEqual([]);
    expect(out.attempts).toHaveLength(4);
  });

  it("inverts a mostly dark crop before reading, unless told not to", async () => {
    let first: Uint8Array | null = null;
    const read: ReadImage = async (pgm) => {
      first ??= pgm;
      return STRONG;
    };
    const out = await runOcrPipeline(input(true), read, {}, clock());
    expect(out.inverted).toBe(true);
    const pixels = (first as Uint8Array | null)?.slice(-8) ?? new Uint8Array();
    expect(pixels[5]).toBe(0); // the one light pixel (the "text") is now black
    expect(pixels[0]).toBe(255);
    const kept = await runOcrPipeline(input(true), read, { autoInvert: false }, clock());
    expect(kept.inverted).toBe(false);
  });

  it("measures preprocessing and recognition with the injected clock", async () => {
    const { read } = scriptedReader([STRONG]);
    const out = await runOcrPipeline(input(), read, {}, clock());
    expect(out.preprocessMs).toBe(5);
    expect(out.recognizeMs).toBeGreaterThan(0);
  });
});
