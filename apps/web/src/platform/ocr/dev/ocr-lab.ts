// Dev-only OCR lab (T-011). Open https://localhost:5173/src/platform/ocr/dev/ocr-lab.html with
// `pnpm dev`. It isn't a build input, so it never ships. The e2e OCR spec drives `window.ocrLab`.
import {
  missedText,
  renderSyntheticLabel,
  SYNTHETIC_LABELS,
  type SyntheticLabel,
} from "../fixtures/synthetic-labels";
import { downloadOcrCacheEntry, toOcrCacheEntry } from "../record";
import { createTesseractEngine } from "../tesseract-engine";
import type { OcrEngine, OcrResult, RecognizeOptions } from "../types";

export interface LabRun {
  id: string;
  missed: string[];
  result: OcrResult;
}

export interface OcrLab {
  /** Warms the engine; resolves with how long that took. */
  prefetch(): Promise<number>;
  runSynthetic(ids?: string[], overrides?: RecognizeOptions): Promise<LabRun[]>;
  /** Restarts the engine with this PSM and Tesseract variables. */
  setPsm(psm: string, params?: Record<string, string>): void;
  engineStatus(): string;
}

declare global {
  interface Window {
    ocrLab?: OcrLab;
  }
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = $<HTMLDivElement>("status");
const runs = $<HTMLDivElement>("runs");
const psmSelect = $<HTMLSelectElement>("psm");

let engine: OcrEngine = createTesseractEngine({ psm: psmSelect.value });

let overrides: RecognizeOptions = {};

function options(): RecognizeOptions {
  return {
    rotationRetry: $<HTMLInputElement>("rotation").checked,
    autoInvert: $<HTMLInputElement>("invert").checked,
    adaptiveThreshold: $<HTMLInputElement>("threshold").checked,
    ...overrides,
  };
}

function say(text: string) {
  status.textContent = text;
}

async function preview(bitmapSource: () => Promise<ImageBitmap>): Promise<HTMLCanvasElement> {
  const bitmap = await bitmapSource();
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas;
}

function show(
  title: string,
  canvas: HTMLCanvasElement,
  result: OcrResult,
  missed: string[] | null,
) {
  const run = document.createElement("section");
  run.className = "run";
  run.dataset.id = title;
  const heading = document.createElement("strong");
  heading.textContent =
    missed === null
      ? title
      : `${title}: ${missed.length === 0 ? "PASS" : `MISSED ${missed.join(" | ")}`}`;
  if (missed !== null) heading.className = missed.length === 0 ? "pass" : "fail";
  const t = result.timings;
  const meta = document.createElement("div");
  meta.textContent =
    `rotation ${result.rotation}°${result.inverted ? " · inverted" : ""} · total ${t.totalMs} ms (load ${t.loadMs}, preprocess ${t.preprocessMs}, ` +
    `recognize ${t.recognizeMs}) · attempts ${result.attempts
      .map((a) => `${a.rotation}°=${a.score}${a.weak ? " weak" : ""} ${Math.round(a.ms)}ms`)
      .join(", ")}`;
  const table = document.createElement("table");
  for (const line of result.lines) {
    const row = table.insertRow();
    row.insertCell().textContent = line.text;
    row.insertCell().textContent = line.confidence.toFixed(2);
    row.insertCell().textContent = `h ${line.height}`;
  }
  run.append(heading, meta, canvas, table);
  runs.prepend(run);
}

async function recognizeAndShow(
  name: string,
  source: () => Promise<ImageBitmap>,
  label: SyntheticLabel | null,
): Promise<LabRun> {
  const canvas = await preview(source);
  const result = await engine.recognize(await source(), options());
  const missed =
    label === null
      ? []
      : missedText(
          label,
          result.lines.map((line) => line.text),
        );
  show(name, canvas, result, label === null ? null : missed);
  if ($<HTMLInputElement>("record").checked) {
    downloadOcrCacheEntry(toOcrCacheEntry(name, result, new Date().toISOString()));
  }
  return { id: name, missed, result };
}

const lab: OcrLab = {
  async prefetch() {
    const start = performance.now();
    say("loading…");
    await engine.prefetch();
    const ms = Math.round(performance.now() - start);
    say(`engine ${engine.status} after ${ms} ms`);
    return ms;
  },
  async runSynthetic(ids, runOverrides = {}) {
    overrides = runOverrides;
    const out: LabRun[] = [];
    for (const label of SYNTHETIC_LABELS) {
      if (ids !== undefined && !ids.includes(label.id)) continue;
      say(`reading ${label.id}…`);
      out.push(await recognizeAndShow(`${label.id}.png`, () => renderSyntheticLabel(label), label));
    }
    const passed = out.filter((run) => run.missed.length === 0).length;
    overrides = {};
    say(`synthetic: ${passed}/${out.length} pass`);
    return out;
  },
  setPsm(psm, params = {}) {
    engine.dispose();
    psmSelect.value = psm;
    engine = createTesseractEngine({ psm, params });
  },
  engineStatus: () => engine.status,
};
window.ocrLab = lab;

$("prefetch").addEventListener("click", () => void lab.prefetch());
$("synthetic").addEventListener("click", () => void lab.runSynthetic());
psmSelect.addEventListener("change", () => lab.setPsm(psmSelect.value));
$<HTMLInputElement>("files").addEventListener("change", async (event) => {
  const files = [...((event.target as HTMLInputElement).files ?? [])];
  for (const file of files) {
    say(`reading ${file.name}…`);
    await recognizeAndShow(file.name, () => createImageBitmap(file), null);
  }
  say(`read ${files.length} file(s)`);
});
