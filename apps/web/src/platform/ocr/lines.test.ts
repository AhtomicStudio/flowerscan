import { describe, expect, it } from "vitest";
import { linesFromBlocks, scoreRead, type TessBlock, type TessLine } from "./lines";

function line(
  text: string,
  confidence: number,
  y0: number,
  y1: number,
  words?: string[],
): TessLine {
  return {
    text,
    confidence,
    bbox: { x0: 10, y0, x1: 410, y1 },
    words: (words ?? text.split(" ")).map((word) => ({ text: word, confidence })),
  };
}

const upright = { rotation: 0 as const, scaledWidth: 1000, scaledHeight: 600, scale: 2 };

describe("linesFromBlocks", () => {
  it("flattens blocks → paragraphs → lines in reading order", () => {
    const blocks: TessBlock[] = [
      { paragraphs: [{ lines: [line("EXAMPLE FARMS", 91, 10, 40)] }] },
      {
        paragraphs: [
          { lines: [line("BLUE DREAM\n", 96, 60, 220), line("THC 24.1%", 88, 240, 300)] },
        ],
      },
    ];
    const { lines, words } = linesFromBlocks(blocks, upright);
    expect(lines.map((l) => l.text)).toEqual(["EXAMPLE FARMS", "BLUE DREAM", "THC 24.1%"]);
    expect(words.map((w) => w.text)).toEqual(["EXAMPLE", "FARMS", "BLUE", "DREAM", "THC", "24.1%"]);
  });

  it("reports confidence 0–1 and sizes in input pixels", () => {
    const { lines } = linesFromBlocks(
      [{ paragraphs: [{ lines: [line("BLUE DREAM", 96.4, 60, 220)] }] }],
      upright,
    );
    expect(lines[0]).toEqual({
      text: "BLUE DREAM",
      confidence: 0.96,
      bbox: { x0: 5, y0: 30, x1: 205, y1: 110 },
      height: 80,
    });
  });

  it("measures height along the reading direction when read rotated", () => {
    const rotated = { rotation: 90 as const, scaledWidth: 1000, scaledHeight: 600, scale: 1 };
    const { lines } = linesFromBlocks(
      [{ paragraphs: [{ lines: [line("GELATO", 90, 100, 160)] }] }],
      rotated,
    );
    expect(lines[0]?.height).toBe(60);
    // In the unrotated input the line runs top to bottom: its box is 60 wide and 400 tall.
    expect(lines[0]?.bbox).toEqual({ x0: 100, y0: 190, x1: 160, y1: 590 });
  });

  it("drops blank lines, collapses inner whitespace, and clamps odd confidences", () => {
    const blocks: TessBlock[] = [
      {
        paragraphs: [
          {
            lines: [
              line("   ", 50, 0, 10),
              line("THC  24.1 %", 140, 20, 40),
              line("x", Number.NaN, 50, 60),
            ],
          },
          {},
        ],
      },
      {},
    ];
    const { lines } = linesFromBlocks(blocks, upright);
    expect(lines.map((l) => [l.text, l.confidence])).toEqual([
      ["THC 24.1 %", 1],
      ["x", 0],
    ]);
  });

  it("handles no blocks at all", () => {
    expect(linesFromBlocks(null, upright)).toEqual({ lines: [], words: [] });
  });
});

describe("scoreRead", () => {
  it("scores confident letters and digits", () => {
    const quality = scoreRead([
      { text: "BLUE", confidence: 0.9 },
      { text: "DREAM", confidence: 0.9 },
      { text: "24.1%", confidence: 0.8 },
    ]);
    expect(quality.chars).toBe(12);
    expect(quality.score).toBeCloseTo(4 * 0.9 + 5 * 0.9 + 3 * 0.8);
    expect(quality.weak).toBe(false);
  });

  it("calls sideways noise weak: few letters, low confidence", () => {
    const quality = scoreRead([
      { text: "|il", confidence: 0.31 },
      { text: "=-", confidence: 0.2 },
      { text: "WN", confidence: 0.45 },
    ]);
    expect(quality.chars).toBe(0);
    expect(quality.score).toBe(0);
    expect(quality.weak).toBe(true);
  });

  it("calls a read weak when its average confidence is low, even with enough letters", () => {
    const quality = scoreRead([
      { text: "BLUEDREAM", confidence: 0.55 },
      { text: "EXAMPLEFARM", confidence: 0.6 },
    ]);
    expect(quality.chars).toBe(20);
    expect(quality.weak).toBe(true);
  });

  it("calls an empty read weak", () => {
    expect(scoreRead([])).toEqual({ score: 0, chars: 0, meanConfidence: 0, weak: true });
  });
});
