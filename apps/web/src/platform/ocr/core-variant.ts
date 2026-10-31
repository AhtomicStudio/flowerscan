// Picks which Tesseract wasm build to load. We serve the split `.js` + `.wasm` LSTM-only builds (the
// `.wasm` streams and compiles while it downloads, and skips the base64 copy in `*.wasm.js`), so the
// SIMD check Tesseract.js normally does from a directory `corePath` happens here instead.

// The same probe modules wasm-feature-detect 1.8.0 validates (the check Tesseract.js 7 uses).
const SIMD_PROBE = [
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15,
  253, 98, 11,
];
const RELAXED_SIMD_PROBE = [
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 15, 1, 13, 0, 65, 1, 253, 15,
  65, 2, 253, 15, 253, 128, 2, 11,
];

export interface WasmFeatures {
  simd: boolean;
  relaxedSimd: boolean;
}

export function detectWasmFeatures(
  validate: (bytes: Uint8Array<ArrayBuffer>) => boolean,
): WasmFeatures {
  const check = (bytes: number[]) => {
    try {
      return validate(new Uint8Array(bytes));
    } catch {
      return false;
    }
  };
  return { simd: check(SIMD_PROBE), relaxedSimd: check(RELAXED_SIMD_PROBE) };
}

/** The core script for these features. Its `.wasm` sits next to it and is found by name. */
export function coreScriptFor(features: WasmFeatures): string {
  if (features.relaxedSimd) return "tesseract-core-relaxedsimd-lstm.js";
  if (features.simd) return "tesseract-core-simd-lstm.js";
  return "tesseract-core-lstm.js";
}
