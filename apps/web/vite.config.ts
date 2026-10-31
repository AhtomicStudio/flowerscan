import { createReadStream, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

const OCR_VIRTUAL_ID = "virtual:flowerscan-ocr-assets";
/** The LSTM-only integer eng model (Tesseract.js's own default for LSTM). */
const OCR_MODEL = "4.0.0_best_int";

const CONTENT_TYPES: Record<string, string> = {
  ".js": "text/javascript; charset=utf-8",
  ".wasm": "application/wasm",
  ".gz": "application/octet-stream",
  ".md": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

/**
 * Self-hosts the OCR engine (T-011): Tesseract.js's worker script, its wasm cores and the eng
 * traineddata are served from our own origin under `/ocr/<versions>/`, never from a CDN (privacy and
 * offline). Files come straight from node_modules, so the lockfile pins them and nothing binary is
 * committed: the dev server streams them, and the build emits them into dist. The directory name
 * carries the versions, so an upgrade changes every URL. The app reads the directory and file sizes
 * from the `virtual:flowerscan-ocr-assets` module.
 */
function ocrAssets(): Plugin {
  const require = createRequire(import.meta.url);
  const packageDir = (name: string) => dirname(require.resolve(`${name}/package.json`));
  const versionOf = (dir: string) =>
    (JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { version: string }).version;
  const tesseract = packageDir("tesseract.js");
  const core = packageDir("tesseract.js-core");
  const eng = packageDir("@tesseract.js-data/eng");
  const versions = { tesseract: versionOf(tesseract), core: versionOf(core), eng: versionOf(eng) };
  const dir = `ocr/tjs-${versions.tesseract}_core-${versions.core}_eng-${versions.eng}/`;
  const sources: Record<string, string> = {
    "worker.min.js": join(tesseract, "dist/worker.min.js"),
    // The split LSTM-only cores: plain, SIMD and relaxed SIMD (see src/platform/ocr/core-variant.ts).
    ...Object.fromEntries(
      readdirSync(core)
        .filter((file) => /^tesseract-core(-simd|-relaxedsimd)?-lstm\.(js|wasm)$/.test(file))
        .map((file) => [file, join(core, file)]),
    ),
    "eng.traineddata.gz": join(eng, OCR_MODEL, "eng.traineddata.gz"),
    "LICENSE-tesseract.js.md": join(tesseract, "LICENSE.md"),
    "LICENSE-tesseract.js-worker.txt": join(tesseract, "dist/worker.min.js.LICENSE.txt"),
    "LICENSE-tesseract.js-core.txt": join(core, "LICENSE"),
  };
  let base = "/";

  return {
    name: "flowerscan-ocr-assets",
    configResolved(config) {
      base = config.base;
    },
    resolveId(id) {
      return id === OCR_VIRTUAL_ID ? `\0${OCR_VIRTUAL_ID}` : undefined;
    },
    load(id) {
      if (id !== `\0${OCR_VIRTUAL_ID}`) return undefined;
      const files = Object.entries(sources)
        .filter(([name]) => !name.startsWith("LICENSE"))
        .map(([name, path]) => ({ name, bytes: statSync(path).size }));
      const manifest = { dir: `${base}${dir}`, versions, model: OCR_MODEL, files };
      return `export const OCR_ASSETS = ${JSON.stringify(manifest)};`;
    },
    configureServer(server) {
      const prefix = `${base}${dir}`;
      server.middlewares.use((request, response, next) => {
        const path = (request.url ?? "").split("?")[0] ?? "";
        if (!path.startsWith(prefix)) return next();
        const source = sources[path.slice(prefix.length)];
        if (source === undefined) {
          response.statusCode = 404;
          response.end();
          return;
        }
        const extension = source.slice(source.lastIndexOf("."));
        response.setHeader("Content-Type", CONTENT_TYPES[extension] ?? "application/octet-stream");
        response.setHeader("Content-Length", statSync(source).size);
        response.setHeader("Cache-Control", "no-cache");
        createReadStream(source).pipe(response);
      });
    },
    generateBundle() {
      for (const [name, path] of Object.entries(sources)) {
        this.emitFile({ type: "asset", fileName: `${dir}${name}`, source: readFileSync(path) });
      }
    },
  };
}

export default defineConfig({
  // basicSsl: the camera API only works in a secure context, so dev and preview run on HTTPS
  // with a self-signed certificate. Phones on the LAN must accept the certificate warning once.
  plugins: [react(), tailwindcss(), basicSsl(), ocrAssets()],
  server: {
    host: true,
    port: 5173,
  },
  // The OCR worker imports tesseract.js (CommonJS). Pre-bundle it up front: discovered on the first
  // scan instead, the dev server would reload the page mid-scan.
  optimizeDeps: {
    include: ["tesseract.js"],
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
  },
});
