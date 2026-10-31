// T-011: the on-device OCR engine, end to end in a real browser, on synthetic labels.
// The lab page (src/platform/ocr/dev/ocr-lab.html) is dev-only, so this spec builds it with the
// production pipeline (bundled worker, self-hosted assets emitted by `ocrAssets()`) into a temp dir
// and previews that on its own port. No real package photos are involved.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { type Browser, expect, type Page, test } from "@playwright/test";
import { build, type PreviewServer, preview } from "vite";

const PORT = 4174;
const ORIGIN = `https://localhost:${PORT}`;
const LAB = `${ORIGIN}/src/platform/ocr/dev/ocr-lab.html`;
const webDir = resolve(import.meta.dirname, "..");

interface LabRun {
  id: string;
  missed: string[];
  result: {
    rotation: number;
    inverted: boolean;
    lines: { text: string; confidence: number; height: number }[];
    timings: { loadMs: number; preprocessMs: number; recognizeMs: number; totalMs: number };
    attempts: { rotation: number; score: number; weak: boolean; ms: number }[];
  };
}

interface Lab {
  prefetch(): Promise<number>;
  runSynthetic(ids?: string[]): Promise<LabRun[]>;
}

/** The orientation the engine has to read at, for a label drawn rotated `rotate`° clockwise. */
const EXPECTED_ROTATION: Record<string, number> = {
  "dark-bag.png": 0,
  "vertical-jar.png": 270,
  "small-crop.png": 0,
  "upside-down.png": 180,
  "pre-roll-tube.png": 90,
};

let outDir = "";
let server: PreviewServer | null = null;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  test.setTimeout(180_000);
  outDir = mkdtempSync(join(tmpdir(), "flowerscan-ocr-lab-"));
  await build({
    root: webDir,
    configFile: join(webDir, "vite.config.ts"),
    logLevel: "warn",
    publicDir: false,
    build: {
      outDir,
      emptyOutDir: true,
      rolldownOptions: { input: { lab: join(webDir, "src/platform/ocr/dev/ocr-lab.html") } },
    },
  });
  server = await preview({
    root: webDir,
    configFile: join(webDir, "vite.config.ts"),
    logLevel: "warn",
    build: { outDir },
    preview: { port: PORT, strictPort: true, host: "localhost" },
  });
});

test.afterAll(async () => {
  await server?.close();
  if (outDir !== "") rmSync(outDir, { recursive: true, force: true });
});

/** Records every request; fails on any that leaves our origin. */
function watchNetwork(page: Page) {
  const foreign: string[] = [];
  const ocr: { url: string; bytes: number }[] = [];
  page.on("requestfinished", async (request) => {
    const url = new URL(request.url());
    if (url.protocol === "data:" || url.protocol === "blob:") return;
    if (url.origin !== ORIGIN) foreign.push(request.url());
    if (url.pathname.startsWith("/ocr/")) {
      const sizes = await request.sizes().catch(() => null);
      ocr.push({ url: url.pathname, bytes: sizes?.responseBodySize ?? -1 });
    }
  });
  page.on("requestfailed", (request) => {
    if (new URL(request.url()).origin !== ORIGIN) foreign.push(request.url());
  });
  return { foreign, ocr };
}

async function openLab(browser: Browser) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const network = watchNetwork(page);
  await page.goto(LAB);
  await page.waitForFunction(() => (window as { ocrLab?: Lab }).ocrLab !== undefined);
  return { context, page, network };
}

test("reads synthetic labels on-device, from our origin only, with rotation retry", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const { context, page, network } = await openLab(browser);

  // Lazy: nothing OCR-related loads until the engine is asked for.
  await page.waitForTimeout(300);
  expect(network.ocr).toEqual([]);

  const prefetchMs = await page.evaluate(() => (window as { ocrLab?: Lab }).ocrLab?.prefetch());
  const cold = await page.evaluate(() =>
    (window as { ocrLab?: Lab }).ocrLab?.runSynthetic(["small-crop"]),
  );
  const warm =
    (await page.evaluate(() => (window as { ocrLab?: Lab }).ocrLab?.runSynthetic())) ?? [];

  for (const run of warm) {
    expect(run.missed, `${run.id}: ${run.result.lines.map((l) => l.text).join(" / ")}`).toEqual([]);
    expect(run.result.rotation, run.id).toBe(EXPECTED_ROTATION[run.id]);
  }
  expect(warm.find((run) => run.id === "dark-bag.png")?.result.inverted).toBe(true);

  const files = network.ocr.map((entry) => entry.url.split("/").pop());
  expect(files).toContain("worker.min.js");
  expect(files).toContain("eng.traineddata.gz");
  expect(files.some((file) => /^tesseract-core.*-lstm\.wasm$/.test(file ?? ""))).toBe(true);
  expect(network.foreign).toEqual([]);

  // Numbers for the T-011 log (this machine, headless Chromium, warm unless noted).
  console.log(
    JSON.stringify(
      {
        prefetchMs,
        firstRecognizeAfterPrefetchMs: cold?.[0]?.result.timings.totalMs,
        warm: warm.map((run) => ({
          id: run.id,
          ...run.result.timings,
          attempts: run.result.attempts.length,
        })),
        downloaded: network.ocr,
      },
      null,
      1,
    ),
  );
  await context.close();
});

test("a missing traineddata fails the read instead of hanging", async ({ browser }) => {
  test.setTimeout(60_000);
  const { context, page, network } = await openLab(browser);
  await page.route("**/eng.traineddata.gz", (route) => route.fulfill({ status: 404, body: "" }));
  const outcome = await page.evaluate(() =>
    (window as { ocrLab?: Lab }).ocrLab?.runSynthetic(["small-crop"]).then(
      () => "read",
      (error: { code?: string }) => error.code ?? "unknown",
    ),
  );
  expect(outcome).toBe("load_failed");
  expect(network.foreign).toEqual([]);
  await context.close();
});
