// Pure pixel steps for OCR preprocessing (docs/06 §2): grayscale → contrast stretch (inverting dark
// crops) → (optional) adaptive threshold, plus the scale plan, 90° rotations and PGM encoding. No DOM, so it's unit-tested
// in jsdom; the worker does the canvas parts (drawing and scaling the bitmap) and calls these.
import type { OcrBox, OcrRotation } from "./types";

export interface GrayImage {
  data: Uint8Array;
  width: number;
  height: number;
}

/** Small crops are upscaled to about this height: Tesseract reads small text poorly. */
export const TARGET_HEIGHT = 1000;
/** Never upscale more than this (it only blurs). */
export const MAX_UPSCALE = 3;
/** Cap the longest side, so huge photos don't cost seconds (the eval photos are full-resolution). */
export const MAX_SIDE = 2400;

export interface ScalePlan {
  scale: number;
  width: number;
  height: number;
}

/** How much to scale a `width × height` crop before reading it. */
export function planScale(width: number, height: number, targetHeight = TARGET_HEIGHT): ScalePlan {
  if (width <= 0 || height <= 0) throw new RangeError("image has no pixels");
  let scale = height < targetHeight ? Math.min(targetHeight / height, MAX_UPSCALE) : 1;
  const longest = Math.max(width, height) * scale;
  if (longest > MAX_SIDE) scale *= MAX_SIDE / longest;
  return {
    scale,
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** RGBA → 8-bit luma (BT.601 weights, integer math). Alpha is ignored. */
export function toGrayscale(rgba: Uint8ClampedArray, width: number, height: number): GrayImage {
  const size = width * height;
  if (rgba.length < size * 4) throw new RangeError("rgba buffer is smaller than width × height");
  const data = new Uint8Array(size);
  for (let i = 0, p = 0; i < size; i++, p += 4) {
    data[i] = ((rgba[p] ?? 0) * 77 + (rgba[p + 1] ?? 0) * 150 + (rgba[p + 2] ?? 0) * 29) >> 8;
  }
  return { data, width, height };
}

/** Percentiles the stretch maps to black and white, so a few specular pixels don't set the range. */
export const STRETCH_LOW = 0.01;
export const STRETCH_HIGH = 0.99;
/** Below this range the image is flat (blank or a solid color): leave its contrast alone. */
export const STRETCH_MIN_RANGE = 16;
/**
 * A crop is "dark" (light text on a dark bag, very common on cannabis packaging) when its median,
 * after the stretch, is below this. Tesseract's LSTM model reads dark-on-light text; it detects
 * inverted lines by itself, but only after a failed first pass on each one, which costs time.
 */
export const DARK_MEDIAN = 110;

/**
 * Linear contrast stretch between the 1st and 99th luminance percentiles, plus an inversion when
 * the stretched crop is mostly dark (`autoInvert`). One histogram and one lookup-table pass.
 */
export function normalizeContrast(
  image: GrayImage,
  { autoInvert = true } = {},
): { image: GrayImage; inverted: boolean } {
  const { data } = image;
  const histogram = new Uint32Array(256);
  for (let i = 0; i < data.length; i++) {
    const value = data[i] ?? 0;
    histogram[value] = (histogram[value] ?? 0) + 1;
  }
  const low = percentile(histogram, data.length, STRETCH_LOW);
  const high = percentile(histogram, data.length, STRETCH_HIGH);
  const stretch = high - low >= STRETCH_MIN_RANGE;
  const lut = new Uint8Array(256);
  for (let v = 0; v < 256; v++) {
    lut[v] = stretch ? Math.max(0, Math.min(255, Math.round(((v - low) * 255) / (high - low)))) : v;
  }
  const median = lut[percentile(histogram, data.length, 0.5)] ?? 0;
  const inverted = autoInvert && median < DARK_MEDIAN;
  if (inverted) for (let v = 0; v < 256; v++) lut[v] = 255 - (lut[v] ?? 0);
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = lut[data[i] ?? 0] ?? 0;
  return { image: { ...image, data: out }, inverted };
}

function percentile(histogram: Uint32Array, total: number, fraction: number): number {
  const target = fraction * total;
  let seen = 0;
  for (let v = 0; v < 256; v++) {
    seen += histogram[v] ?? 0;
    if (seen > target) return v;
  }
  return 255;
}

/**
 * Bradley–Roth adaptive threshold (a mean over a window via an integral image). A pixel turns black
 * when it's `sensitivity` darker than its neighborhood. Optional (docs/06 §2): Tesseract binarizes
 * with Otsu itself, which wins on clean labels; this helps under uneven light.
 */
export function adaptiveThreshold(
  image: GrayImage,
  { windowFraction = 1 / 16, sensitivity = 0.15 } = {},
): GrayImage {
  const { data, width, height } = image;
  const integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      row += data[y * width + x] ?? 0;
      integral[(y + 1) * (width + 1) + x + 1] = (integral[y * (width + 1) + x + 1] ?? 0) + row;
    }
  }
  const half = Math.max(1, Math.round((Math.max(width, height) * windowFraction) / 2));
  const out = new Uint8Array(data.length);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - half);
    const y1 = Math.min(height, y + half + 1);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - half);
      const x1 = Math.min(width, x + half + 1);
      const sum =
        (integral[y1 * (width + 1) + x1] ?? 0) -
        (integral[y0 * (width + 1) + x1] ?? 0) -
        (integral[y1 * (width + 1) + x0] ?? 0) +
        (integral[y0 * (width + 1) + x0] ?? 0);
      const mean = sum / ((x1 - x0) * (y1 - y0));
      out[y * width + x] = (data[y * width + x] ?? 0) < mean * (1 - sensitivity) ? 0 : 255;
    }
  }
  return { data: out, width, height };
}

/** Rotates clockwise by a multiple of 90°. Returns a new image (or a copy for 0°). */
export function rotateGray(image: GrayImage, rotation: OcrRotation): GrayImage {
  const { data, width: w, height: h } = image;
  if (rotation === 0) return { data: data.slice(), width: w, height: h };
  const out = new Uint8Array(data.length);
  if (rotation === 180) {
    for (let i = 0, n = data.length; i < n; i++) out[n - 1 - i] = data[i] ?? 0;
    return { data: out, width: w, height: h };
  }
  // 90° clockwise: source (x, y) → (h - 1 - y, x) in an h × w image. 270°: (y, w - 1 - x).
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const target = rotation === 90 ? x * h + (h - 1 - y) : (w - 1 - x) * h + y;
      out[target] = data[y * w + x] ?? 0;
    }
  }
  return { data: out, width: h, height: w };
}

/**
 * Maps a box read in the rotated, scaled image back to the input image. `scaledWidth/Height` are the
 * scaled image's size before rotation; `scale` is the factor from `planScale`.
 */
export function mapBoxToSource(
  box: { x0: number; y0: number; x1: number; y1: number },
  rotation: OcrRotation,
  scaledWidth: number,
  scaledHeight: number,
  scale: number,
): OcrBox {
  const corners: [number, number][] = [
    [box.x0, box.y0],
    [box.x1, box.y1],
  ];
  const mapped = corners.map(([x, y]): [number, number] => {
    if (rotation === 90) return [y, scaledHeight - x];
    if (rotation === 180) return [scaledWidth - x, scaledHeight - y];
    if (rotation === 270) return [scaledWidth - y, x];
    return [x, y];
  });
  const xs = mapped.map(([x]) => x / scale);
  const ys = mapped.map(([, y]) => y / scale);
  return {
    x0: round1(Math.min(...xs)),
    y0: round1(Math.min(...ys)),
    x1: round1(Math.max(...xs)),
    y1: round1(Math.max(...ys)),
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Binary PGM (P5): Leptonica reads it straight from memory, with no PNG encode/decode per call. */
export function encodePgm(image: GrayImage): Uint8Array<ArrayBuffer> {
  const header = new TextEncoder().encode(`P5\n${image.width} ${image.height}\n255\n`);
  const out = new Uint8Array(header.length + image.data.length);
  out.set(header, 0);
  out.set(image.data, header.length);
  return out;
}
