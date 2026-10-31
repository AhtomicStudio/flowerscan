// Provided by the `ocrAssets()` plugin in apps/web/vite.config.ts.
declare module "virtual:flowerscan-ocr-assets" {
  export interface OcrAssetManifest {
    /** Root-relative directory the OCR files are served from, e.g. `/ocr/tjs-7.0.0_core-7.0.0_eng-1.0.0/`. */
    dir: string;
    versions: { tesseract: string; core: string; eng: string };
    /** The traineddata variant shipped (LSTM-only integer model). */
    model: string;
    files: { name: string; bytes: number }[];
  }
  export const OCR_ASSETS: OcrAssetManifest;
}
