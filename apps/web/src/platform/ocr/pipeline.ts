// The worker-side read loop (docs/06 §2): preprocess once (inverting light-on-dark crops), read upright, and when that read is weak
// retry at 90°, 270° and 180°, keeping the best. The Tesseract call and the clock are injected, so the
// retry logic is unit-tested without a browser.
import {
  linesFromBlocks,
  RETRY_ROTATIONS,
  type ReadQuality,
  scoreRead,
  type TessBlock,
} from "./lines";
import {
  adaptiveThreshold,
  encodePgm,
  type GrayImage,
  normalizeContrast,
  rotateGray,
  toGrayscale,
} from "./preprocess";
import type { OcrAttempt, OcrLine, OcrRotation, RecognizeOptions } from "./types";

/** Reads an encoded grayscale image and returns Tesseract's blocks. */
export type ReadImage = (pgm: Uint8Array<ArrayBuffer>) => Promise<readonly TessBlock[] | null>;

export interface PipelineInput {
  /** RGBA pixels of the input, already scaled per `planScale`. */
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  scale: number;
}

export interface PipelineOutput {
  lines: OcrLine[];
  rotation: OcrRotation;
  /** True when the crop was mostly dark and was inverted before reading. */
  inverted: boolean;
  attempts: OcrAttempt[];
  preprocessMs: number;
  recognizeMs: number;
}

export async function runOcrPipeline(
  input: PipelineInput,
  read: ReadImage,
  options: RecognizeOptions,
  now: () => number,
): Promise<PipelineOutput> {
  const preprocessStart = now();
  const normalized = normalizeContrast(toGrayscale(input.rgba, input.width, input.height), {
    autoInvert: options.autoInvert !== false,
  });
  const { inverted } = normalized;
  let gray: GrayImage = normalized.image;
  if (options.adaptiveThreshold) gray = adaptiveThreshold(gray);
  const preprocessMs = now() - preprocessStart;

  const attempts: OcrAttempt[] = [];
  const kept: { best: { lines: OcrLine[]; rotation: OcrRotation; quality: ReadQuality } | null } = {
    best: null,
  };
  const recognizeStart = now();

  const attempt = async (rotation: OcrRotation) => {
    const start = now();
    const image = rotation === 0 ? gray : rotateGray(gray, rotation);
    const blocks = await read(encodePgm(image));
    const { lines, words } = linesFromBlocks(blocks, {
      rotation,
      scaledWidth: gray.width,
      scaledHeight: gray.height,
      scale: input.scale,
    });
    const quality = scoreRead(words);
    attempts.push({ rotation, score: quality.score, weak: quality.weak, ms: now() - start });
    if (kept.best === null || quality.score > kept.best.quality.score) {
      kept.best = { lines, rotation, quality };
    }
    return quality;
  };

  const upright = await attempt(0);
  if (upright.weak && options.rotationRetry !== false) {
    for (const rotation of RETRY_ROTATIONS) {
      const quality = await attempt(rotation);
      // A strong read that beats upright settles the orientation; don't spend time on the rest.
      if (!quality.weak && quality.score > upright.score) break;
    }
  }

  return {
    lines: kept.best?.lines ?? [],
    rotation: kept.best?.rotation ?? 0,
    inverted,
    attempts,
    preprocessMs,
    recognizeMs: now() - recognizeStart,
  };
}
