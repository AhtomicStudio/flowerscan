// On-device OCR (docs/06 §2). Import from here, not from the files inside.
//
//   const engine = createTesseractEngine();   // cheap: nothing loads yet
//   engine.prefetch();                        // after the camera opens: loads on idle
//   const { lines } = await engine.recognize(crop);   // crop: ImageBitmap of the reticle (transferred)
//
// `lines` go to `parseLabelText` in @flowerscan/core. OCR text is never a result by itself.
export {
  createFakeOcrEngine,
  type FakeOcrEngine,
  fakeOcrLine,
  fakeOcrResult,
} from "./fake-ocr-engine";
export {
  downloadOcrCacheEntry,
  OCR_CACHE_FORMAT,
  type OcrCacheEntry,
  ocrCacheFileName,
  toOcrCacheEntry,
  withOcrRecording,
} from "./record";
export {
  createTesseractEngine,
  DEFAULT_PSM,
  isOcrSupported,
  type TesseractEngineOptions,
} from "./tesseract-engine";
export {
  type OcrAttempt,
  type OcrBox,
  type OcrEngine,
  type OcrEngineInfo,
  type OcrEngineStatus,
  OcrError,
  type OcrErrorCode,
  type OcrLine,
  type OcrResult,
  type OcrRotation,
  type OcrTimings,
  type RecognizeOptions,
} from "./types";
