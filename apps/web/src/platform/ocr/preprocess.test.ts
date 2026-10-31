import { describe, expect, it } from "vitest";
import {
  adaptiveThreshold,
  DARK_MEDIAN,
  encodePgm,
  type GrayImage,
  MAX_SIDE,
  MAX_UPSCALE,
  mapBoxToSource,
  normalizeContrast,
  planScale,
  rotateGray,
  TARGET_HEIGHT,
  toGrayscale,
} from "./preprocess";
import type { OcrRotation } from "./types";

function gray(width: number, height: number, values: number[]): GrayImage {
  return { data: Uint8Array.from(values), width, height };
}

describe("planScale", () => {
  it("upscales a small crop to about the target height", () => {
    const plan = planScale(800, 500);
    expect(plan.height).toBe(TARGET_HEIGHT);
    expect(plan.width).toBe(1600);
    expect(plan.scale).toBe(2);
  });

  it("never upscales past the maximum", () => {
    expect(planScale(200, 100).scale).toBe(MAX_UPSCALE);
  });

  it("leaves a tall enough crop alone", () => {
    expect(planScale(1500, 1200)).toEqual({ scale: 1, width: 1500, height: 1200 });
  });

  it("caps the longest side, for full-resolution photos and very wide crops", () => {
    const photo = planScale(4032, 3024);
    expect(Math.max(photo.width, photo.height)).toBe(MAX_SIDE);
    const strip = planScale(2000, 400);
    expect(strip.width).toBe(MAX_SIDE);
    expect(strip.height).toBe(480);
  });

  it("takes a custom target height", () => {
    expect(planScale(1000, 360, 720).height).toBe(720);
  });

  it("rejects an empty image", () => {
    expect(() => planScale(0, 10)).toThrow(RangeError);
  });
});

describe("toGrayscale", () => {
  it("uses BT.601 weights and ignores alpha", () => {
    const rgba = Uint8ClampedArray.from([
      255, 255, 255, 0, 0, 0, 0, 255, 255, 0, 0, 255, 0, 255, 0, 9,
    ]);
    expect([...toGrayscale(rgba, 4, 1).data]).toEqual([255, 0, 76, 149]);
  });

  it("rejects a buffer that is too small", () => {
    expect(() => toGrayscale(new Uint8ClampedArray(4), 2, 1)).toThrow(RangeError);
  });
});

describe("normalizeContrast", () => {
  it("stretches the 1st–99th percentile range to black and white", () => {
    const values = Array.from({ length: 100 }, (_, i) => 100 + i); // 100…199
    const { image, inverted } = normalizeContrast(gray(100, 1, values));
    expect(inverted).toBe(false);
    expect(image.data[0]).toBe(0);
    expect(image.data[99]).toBe(255);
    expect(image.data[50]).toBeGreaterThan(120);
    expect(image.data[50]).toBeLessThan(135);
  });

  it("leaves a flat image's values alone", () => {
    const { image } = normalizeContrast(gray(4, 1, [200, 201, 202, 203]));
    expect([...image.data]).toEqual([200, 201, 202, 203]);
  });

  it("inverts a mostly dark crop (light text on a dark bag)", () => {
    // 90% near-black background, 10% white text.
    const values = Array.from({ length: 100 }, (_, i) => (i < 90 ? 10 : 250));
    const { image, inverted } = normalizeContrast(gray(100, 1, values));
    expect(inverted).toBe(true);
    expect(image.data[0]).toBe(255); // background turns white
    expect(image.data[95]).toBe(0); // text turns black
  });

  it("keeps a light crop the right way round, and can be told not to invert", () => {
    const light = Array.from({ length: 100 }, (_, i) => (i < 90 ? 240 : 20));
    expect(normalizeContrast(gray(100, 1, light)).inverted).toBe(false);
    const dark = Array.from({ length: 100 }, (_, i) => (i < 90 ? 10 : 250));
    expect(normalizeContrast(gray(100, 1, dark), { autoInvert: false }).inverted).toBe(false);
  });

  it("decides on the stretched median", () => {
    // A low-contrast mid-gray crop stretches out; its median lands mid-range, so it isn't "dark".
    const values = Array.from({ length: 100 }, (_, i) => 60 + Math.floor(i / 2));
    const { inverted, image } = normalizeContrast(gray(100, 1, values));
    expect(image.data[50]).toBeGreaterThanOrEqual(DARK_MEDIAN);
    expect(inverted).toBe(false);
  });
});

describe("adaptiveThreshold", () => {
  it("turns a dark stroke black and its light surroundings white", () => {
    const width = 32;
    const values = Array.from({ length: width * width }, (_, i) => (i % width === 16 ? 40 : 220));
    const out = adaptiveThreshold(gray(width, width, values));
    expect(out.data[16]).toBe(0);
    expect(out.data[3]).toBe(255);
  });
});

describe("rotateGray", () => {
  // 3 × 2:  a b c
  //         d e f
  const image = gray(3, 2, [1, 2, 3, 4, 5, 6]);

  it("rotates 90° clockwise", () => {
    const out = rotateGray(image, 90);
    expect([out.width, out.height]).toEqual([2, 3]);
    expect([...out.data]).toEqual([4, 1, 5, 2, 6, 3]);
  });

  it("rotates 180°", () => {
    expect([...rotateGray(image, 180).data]).toEqual([6, 5, 4, 3, 2, 1]);
  });

  it("rotates 270° clockwise", () => {
    const out = rotateGray(image, 270);
    expect([out.width, out.height]).toEqual([2, 3]);
    expect([...out.data]).toEqual([3, 6, 2, 5, 1, 4]);
  });

  it("returns a copy at 0°, and 90° then 270° is the identity", () => {
    const copy = rotateGray(image, 0);
    expect(copy.data).not.toBe(image.data);
    expect([...rotateGray(rotateGray(image, 90), 270).data]).toEqual([...image.data]);
  });
});

describe("mapBoxToSource", () => {
  // A 1-pixel box around source pixel (x, y) in a w × h image, rotated, must map back onto that pixel.
  const w = 7;
  const h = 4;
  const cases: [OcrRotation, number, number][] = [
    [0, 5, 1],
    [90, 5, 1],
    [180, 5, 1],
    [270, 5, 1],
  ];
  for (const [rotation, x, y] of cases) {
    it(`maps a box read at ${rotation}° back to the input`, () => {
      const values = Array.from({ length: w * h }, (_, i) => (i === y * w + x ? 255 : 0));
      const rotated = rotateGray(gray(w, h, values), rotation);
      const index = rotated.data.indexOf(255);
      const rx = index % rotated.width;
      const ry = Math.floor(index / rotated.width);
      const box = mapBoxToSource({ x0: rx, y0: ry, x1: rx + 1, y1: ry + 1 }, rotation, w, h, 1);
      expect(box).toEqual({ x0: x, y0: y, x1: x + 1, y1: y + 1 });
    });
  }

  it("divides by the scale", () => {
    expect(mapBoxToSource({ x0: 20, y0: 10, x1: 60, y1: 30 }, 0, 200, 100, 2)).toEqual({
      x0: 10,
      y0: 5,
      x1: 30,
      y1: 15,
    });
  });
});

describe("encodePgm", () => {
  it("writes a binary P5 header followed by the pixels", () => {
    const bytes = encodePgm(gray(2, 1, [0, 255]));
    const header = new TextDecoder().decode(bytes.slice(0, bytes.length - 2));
    expect(header).toBe("P5\n2 1\n255\n");
    expect([...bytes.slice(-2)]).toEqual([0, 255]);
  });
});
