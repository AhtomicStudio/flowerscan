# Fake Camera Fixtures (Playwright, Chromium)

How e2e tests feed a "camera" without a camera. This is the plan. **T-009** builds the generator and the first
fixtures, and **T-010 / T-011 / T-014** add the ones they need. See [test-plan.md](test-plan.md) for which
test uses which fixture.

## Rules for fixture content

1. **No real brands, packaging, or product barcodes.** Never photograph, trace, or recreate a real package,
   logo, or label layout. Fixtures are drawn from our own templates.
2. **Brand text is obviously fake** and every label carries the watermark `TEST FIXTURE · NOT A REAL PRODUCT`.
   Use one fixture brand, `Fixture Grow Co.`, and keep it out of the production brand lexicon. Unit tests
   inject it when they need brand detection.
3. **Barcodes use GS1 restricted-circulation prefixes**, so they can never be a real product's code:
   UPC-A starting with `4` (in-store use), EAN-13 starting with `200`–`299`, EAN-8 starting with `2`.
4. **URLs use reserved domains only** (RFC 2606/6761): `example.com`, `example.org`, `*.test`. The one exception
   is our own deep link, which uses the origin under test (see "Deep-link origin").
5. **Strain names**: happy-path and close-call fixtures use names from our seed data (strain names are facts,
   not brands). No-match fixtures use invented nonsense with **no** common strain tokens (no "Kush", "Haze",
   "OG", "Cookies", "Dream"), so they can't drift into a close call. Example: `Plinth Marmoset`.
6. No people, faces, hands, or youth-appealing imagery (docs/09).

## How Chromium's fake camera behaves (verified 2026-10-26)

Checked with Playwright's bundled Chromium (headless shell, build 1248) on Windows, using a scratch probe page
that calls `getUserMedia` the way docs/06 §1 does.

| Finding | Consequence for tests |
| --- | --- |
| `--use-fake-device-for-media-stream` + `--use-file-for-fake-video-capture=<file>` plays `.mjpeg` and `.y4m` files; pixel colors arrive intact | Both formats work |
| **`--use-fake-ui-for-media-stream` is required.** Playwright's `permissions: ["camera"]` alone made `getUserMedia` reject with `NotSupportedError` | Always pass all three flags for camera tests |
| Without `--use-fake-device-for-media-stream`, `--use-fake-ui-for-media-stream` opened the dev machine's **real webcam** | Never pass the UI flag alone |
| A missing fixture path → `NotFoundError: Requested device not found` | Tests fail loudly on a bad path. Don't use this to simulate "no camera" (use an init script) |
| Track capabilities have **no `torch`** | Torch-present must be tested at component level with the `CameraService` fake |
| **No native `BarcodeDetector`** on Windows (and none on Linux CI) | E2E exercises the zxing-wasm polyfill path, which is also the iPhone path. Good. Native-path coverage comes from Android devices |
| A 720×1280 file under `ideal: 1920×1080` constraints arrives as **720×1080, cropped** (≈ 100 px off the top and bottom). With no constraints it arrives as 720×1280 | Keep content inside the safe area below |
| MJPEG plays at a fixed **30 fps** whatever it was encoded at. Y4M follows its header (`F15:1` → 15 fps) | Use Y4M when frame timing matters (stability gate, flicker) |
| Size for 2 s at 720×1280: MJPEG ≈ 0.2 MB (0.6 MB with noise), Y4M ≈ 41 MB | Commit MJPEG. Generate Y4M locally and in CI, never commit it |
| `--deny-permission-prompts` has no effect once the fake-UI flag is set | Simulate denial with an init script (below) |

Not verified: the full Chromium build (`channel: "chromium"`, new headless) couldn't be launched from the agent
sandbox. Whether it honors `permissions: ["camera"]` without the fake-UI flag is still open.

## Frame layout

- **Portrait 720×1280**, which matches a phone held upright.
- **Safe area:** everything the test depends on sits inside the centered 720×1080 band, and horizontally inside
  the central **≈ 380 px**. With `object-fit: cover` on a Pixel 7 viewport (412×915), about 67% of the frame width
  is visible, and the reticle (80% of the viewport) covers about 54%. Recalculate if the scanner layout differs
  (T-009 records the final numbers here).
- Codes: about 300 px wide with the standard quiet zone (4 modules for QR, 9× for UPC/EAN), centered.
- Labels: a fictional label card about 360×480 px. The strain name is the largest line. Typical noise: a THC/CBD
  line, a category word, a net-weight line, a lot number, compliance boilerplate, the watermark.
- Background: dark mid-gray with a slight gradient, never pure black or flat white (more realistic for
  exposure and thresholding).

## Fixture inventory

`<seed-id>` / `<Seed Name>` = a stable seed strain picked once T-007 lands (prefer a landrace or a well-sourced
classic whose lineage won't be disputed). `<origin>` = the origin under test.

| Fixture | Content | Format | Expected outcome | Used by |
| --- | --- | --- | --- | --- |
| `blank` | Gray gradient + light noise, no code, no text | MJPEG | Live viewport, no detection ever; shutter → no match | T-009 |
| `qr-deeplink` | QR: `<origin>/s/<seed-id>` | MJPEG | Lock-on → `/s/<seed-id>` result | T-010 |
| `qr-deeplink-unknown-id` | QR: `<origin>/s/not-a-real-strain` | MJPEG | Friendly 404 with search, no classification | T-010, T-013 |
| `qr-other-url` | QR: `https://example.com/products/<seed-name-slug>-3-5g` | MJPEG | Slug → candidates → match; `qr_payload` stored | T-010 |
| `qr-coa` | QR: `https://coa.example.org/report/12345` (added to the COA domain list in test config only) | MJPEG | Classified as COA, stored, no strain claimed | T-010 |
| `qr-plain-text` | QR: `Strain: <Seed Name> · Fixture Grow Co.` | MJPEG | Treated like OCR text → match | T-010 |
| `qr-flicker` | QR A and QR B (two deep links) alternating every frame | **Y4M** 15 fps | **Never** accepts (stability gate 2 of 3) | T-010 |
| `upc-a-unknown` | UPC-A `412345678903` (valid check digit, not in memory) | MJPEG | "Unknown barcode" → search; after confirm, the same fixture → direct result | T-010, T-014 |
| `ean-13-unknown` | EAN-13 `2001234567893` | MJPEG | Same as above | T-010 |
| `code-128` | Code 128 `FIXTURE-LOT-0001` | MJPEG | Decoded and stored, no strain claimed | T-010 |
| `qr-and-upc` | QR deep link and UPC side by side | MJPEG | Behavior is **unspecified** (test-plan gap 6). Add once decided | T-010 |
| `label-happy` | Label: `<Seed Name>` (largest), `HYBRID`, `THC 24.1%`, `CBD <1%`, `3.5g`, lot, boilerplate | MJPEG | Shutter → auto-accept → result with THC shown | T-011 |
| `label-disagree` | Same, but the category word contradicts the lineage label | MJPEG | Result with the "Package says" callout | T-011, T-013 |
| `label-close-call` | A name that scores 0.60–0.90 against two seed strains (chosen with the T-008 matcher) | MJPEG | "Which one?" sheet | T-014 |
| `label-no-match` | `Plinth Marmoset`, `INDICA`, `THC 19%` | MJPEG | No-match screen with the read text; no classification | T-014 |
| `label-rotated` | `label-happy` rotated 90° (vertical jar) | MJPEG | Rotation retry finds it | T-011 |
| `label-dim` | `label-happy`, brightness −35%, contrast 0.7, temporal noise | MJPEG | Still matches (if it doesn't, file an eval case, not a flaky e2e) | T-011 (`@slow`) |
| `label-blur` | `label-happy`, Gaussian blur σ = 2 | MJPEG | Same as `label-dim` | T-011 (`@slow`) |

The barcode values above were checked with the UPC/EAN mod-10 rule. For check-digit failures, see "Invalid
check digits" below.

## Generating fixtures

Proposed layout (created by T-009):

```
apps/web/e2e/fixtures/camera/
├── fixtures.json        # manifest: name, template, payload, variant, format
├── templates/           # label-card.html, code-card.html (HTML/CSS, system fonts only)
├── generate.ts          # pnpm --filter @flowerscan/web e2e:fixtures
├── *.mjpeg              # committed (small)
└── .generated/          # *.y4m and intermediate PNGs (gitignored; add the rule in the same task)
```

Pipeline:
1. **Render a still.** Playwright (already a dev dependency) opens the HTML template at 720×1280 with the
   payload filled in, and screenshots it to PNG. Codes are drawn with **`bwip-js`** (pure JS, no install
   scripts, covers QR, UPC-A, EAN-13/8, Code 128, Data Matrix, PDF417). That's a new dev dependency, so the
   task that adds it justifies it in its Log.
2. **Apply variants.** Use CSS filters in the template (`brightness`, `contrast`, `blur`, `rotate`) or ffmpeg filters (below).
3. **Encode** with ffmpeg (verified on ffmpeg 9.0; GitHub `ubuntu-latest` runners ship ffmpeg):

```bash
# still → MJPEG (2 s; Chromium replays it at 30 fps and loops)
ffmpeg -y -loop 1 -framerate 15 -i still.png -t 2 -vf "format=yuvj420p" -q:v 3 -f mjpeg out.mjpeg

# still → Y4M (raw 4:2:0, keeps its frame rate; large, don't commit)
ffmpeg -y -loop 1 -framerate 15 -i still.png -t 2 -pix_fmt yuv420p -f yuv4mpegpipe out.y4m

# dim + sensor noise variant
ffmpeg -y -loop 1 -framerate 15 -i still.png -t 2 \
  -vf "eq=brightness=-0.35:contrast=0.7,noise=alls=12:allf=t,format=yuvj420p" -q:v 3 -f mjpeg out-dim.mjpeg

# blur variant
ffmpeg -y -loop 1 -framerate 15 -i still.png -t 2 -vf "gblur=sigma=2,format=yuvj420p" -q:v 3 -f mjpeg out-blur.mjpeg

# flicker (alternate a.png / b.png every frame) → Y4M so the 15 fps timing holds
ffmpeg -y -framerate 15 -i flicker-%03d.png -pix_fmt yuv420p -f yuv4mpegpipe qr-flicker.y4m
```

   ffmpeg-free fallback for MJPEG: an MJPEG file for Chromium is just JPEG frames concatenated, so the generator
   can write Playwright `type: "jpeg"` screenshots back to back.
4. **Self-check before writing.** The generator decodes every code fixture with the same zxing-wasm build the app
   uses, and fails if the payload differs. For label fixtures, a core unit test pins the label's exact text to its
   expected `decide()` outcome (`accept` / `choose` / `none`). When seed data or thresholds change, the unit test
   fails first, so the e2e doesn't go flaky.
5. **Regenerate deliberately.** Font rendering differs between operating systems, so the output is only stable
   on one OS. That's why the MJPEG files are committed and regenerated only on purpose (review the stills in the
   PR). CI runs the generator only for the `.y4m` files, and the self-check in step 4 guards their content.

## Using a fixture in a test

Launch flags are per browser, and `launchOptions` is worker-scoped in Playwright. So keep **one fixture per spec
file** (or per `describe` with its own `test.use`):

```ts
// apps/web/e2e/scan-qr-deeplink.spec.ts (example; T-010 writes the real one)
import { fileURLToPath } from "node:url";
import { test } from "@playwright/test";

const fixture = fileURLToPath(new URL("./fixtures/camera/qr-deeplink.mjpeg", import.meta.url));

test.use({
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      `--use-file-for-fake-video-capture=${fixture}`,
    ],
  },
});
```

## Simulating camera failures

Fake-device flags can't produce a real denial, so use `page.addInitScript` before navigation:

| State | Init script makes `getUserMedia` reject with | Also stub |
| --- | --- | --- |
| Permission denied | `new DOMException("Permission denied", "NotAllowedError")` | `navigator.permissions.query({name:"camera"})` → `{ state: "denied" }` |
| No camera | `NotFoundError` | `enumerateDevices()` → no `videoinput` |
| Camera in use | `NotReadableError` | none |
| API missing (webview) | delete `navigator.mediaDevices.getUserMedia` | none |

The UI for the last three isn't specified yet (test-plan gap 1).

## Invalid check digits

Barcode decoders (native and zxing) already reject UPC/EAN values with a bad check digit, so a video fixture
can't deliver one to our code. `classifyBarcode` check-digit rejection is tested at the **unit** level only
(for example `412345678904`, `2001234567890`).

## Deep-link origin

The `qr-deeplink` payload must match the origin `classifyQr` treats as "ours". The production domain is still
open (Q8/Q11), so `classifyQr` needs the origin as configuration (test-plan gap 3). The generator writes the
deep-link fixtures for `https://localhost:4173` (the e2e preview origin). Preview and production runs regenerate
those two fixtures with their own origin.

## Printable test cards (for real devices)

The same templates, exported as an A4/Letter PDF (`e2e:fixtures --print`), give the device checklist
([device-matrix.md](device-matrix.md)) a repeatable "package" without real brands: `qr-deeplink`
(production origin), `upc-a-unknown`, `label-happy`, `label-no-match`, and `label-close-call`. Print them in
matte, about 6 cm codes, and keep them with the test phones.
