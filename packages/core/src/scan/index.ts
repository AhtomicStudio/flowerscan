// Public API of the scan extractors (docs/06 §3, T-010, T-011). Re-exported by the package entry.

export {
  BARCODE_KINDS,
  type BarcodeFacts,
  type BarcodeKind,
  type BarcodeRejection,
  classifyBarcode,
  isBarcodeLearnable,
  RETAIL_LEARNABLE_AFTER,
} from "./classifyBarcode";
export { classifyQr, QR_KINDS, type QrFacts, type QrKind, type QrOptions } from "./classifyQr";
export { isTrackAndTraceUid } from "./lexicon/identifiers";
export {
  CANDIDATE_MAX_TOKENS,
  CANDIDATE_WEIGHT_BLEND,
  LABEL_MAX_CANDIDATES,
  LARGE_LINE_RATIO,
  parseLabelText,
  SOFT_TOKEN_PENALTY,
} from "./parseLabelText";
export type { LabelFacts, OcrBox, OcrEngine, OcrLine, OcrResult } from "./types";
