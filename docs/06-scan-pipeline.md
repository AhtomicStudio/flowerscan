# Scan Pipeline

```
Capture ─▶ Detect ─▶ Extract ─▶ Normalize ─▶ Match ─▶ Decide ─▶ Result
 (web)     (worker)   (core)      (core)       (core)   (core)    (web)
```

Everything from **Extract** onward is pure `core` code and is unit-tested with recorded inputs.

## 1. Capture (apps/web/platform/camera)

- `getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } } })`.
  Requires HTTPS.
- **Permission priming:** before the browser prompt, show one screen explaining why we need the camera
  and that images stay on the device. If permission is denied, go to manual search with instructions
  for re-enabling.
- Torch toggle via `track.applyConstraints({ advanced: [{ torch: true }] })` where the capability exists
  (mostly Android Chrome). Hide the toggle otherwise.
- Tap-to-focus where `focusMode`/`pointsOfInterest` are supported; otherwise ignore.
- Pause the stream when the tab is hidden or the result sheet covers the viewport. Saves battery.
- Reticle: a rounded rectangle at about 80% width. The OCR crop is the reticle area plus a 10% margin.

## 2. Detect

### Barcode & QR (continuous in Auto, Barcode, QR modes)
- `detection.worker`: receives `ImageBitmap` frames at about 8–10 fps (drop frames while busy).
- Uses native `BarcodeDetector` where available, otherwise the zxing-wasm polyfill. Same API either way.
  (At last check, iOS Safari has no native `BarcodeDetector`. **The polyfill path is the iPhone path**, so
  test it on real iPhones.)
- Formats: `qr_code, ean_13, ean_8, upc_a, upc_e, code_128, code_39, data_matrix, pdf417`.
- **Stability gate:** accept a value only after the same value has been seen in 2 of the last 3 frames.
  This kills misreads.
- On accept: reticle "lock-on" animation to the bounding box, haptic tick (where supported), stop detection.

### Text (Text mode, or the shutter in Auto)
- On shutter: grab the current frame, crop to the reticle, and send it to `ocr.worker`.
- Preprocess in the worker: grayscale → contrast stretch → upscale small crops to about 1000 px height →
  optional adaptive threshold. Try the original orientation first; if the result is weak, retry rotated
  ±90° (labels on vertical jars).
- `OcrEngine` adapter: `recognize(image) → { lines: [{ text, confidence, bbox, height }] }`.
  - v1 implementation: Tesseract.js (`eng`), worker kept warm after first use.
  - Phase 2: `CloudVisionEngine` (opt-in) returns the **same shape**: text only, never a strain decision.
- Line height is kept because the strain name is often (not always) one of the largest text lines.

## 3. Extract (core/scan/extract)

### From OCR text: `parseLabelText(lines) → LabelFacts`
- **Strip noise lines/tokens** using lexicons in `core/scan/lexicon/`:
  - units and quantities: `3.5g`, `1/8 oz`, `28g`, `net wt`, `mg`
  - potency patterns: `THC 24.1%`, `Total THC`, `THCa`, `CBD <1%`, which are **captured**, then stripped
  - category words: `indica`, `sativa`, `hybrid`, which are **captured as `package_says`**, then stripped
  - product forms: `flower`, `pre-roll`, `pre-rolls`, `cart`, `vape`, `live resin`, `rosin`, `badder`…
  - compliance boilerplate: `government warning`, `keep out of reach of children`, `for use only by adults 21`…
  - known brand names (a list we grow over time): **captured as `brand`**, then stripped
  - dates, lot/batch numbers, license numbers, METRC-style tag IDs
- **Candidate generation:** from each remaining line, all contiguous 1–5 token n-grams, plus a
  cross-line join of adjacent large lines (names wrap: "BLUE / DREAM").
- Output: `{ candidates: [{ text, weight }], package_says, thc_pct, cbd_pct, brand, product_form }`.
  The candidate weight blends OCR confidence and relative line height.

### From QR: `classifyQr(payload) → QrFacts`
- **Our deep link** (`https://<our-domain>/s/<strain-id>`) → direct `strain_id`, no matching needed.
- **Lab/COA URL** (domain list grows over time) → `{ kind: "coa", url }`. Phase 2: parse known formats.
- **Other URL** → slug tokens from the path (`/products/blue-dream-3-5g` → "blue dream") become candidates.
- **Plain text** → treated like OCR text.

### From 1D barcode: `classifyBarcode(value, format)`
- Validate check digits for UPC/EAN. Reject invalid values (they were misreads).
- Look up local barcode memory → `strain_id` if known. Otherwise mark it "unknown barcode" and offer
  text scan or search. Once the user confirms a strain, remember the mapping.

## 4. Normalize (core/match/normalize)

Applied identically to strain names/aliases at index time and to candidates at query time:
- Unicode NFKD, strip diacritics, lowercase.
- `#4` → `4`, `&` → `and`, `×` / ` x ` (cross notation) → space.
- Collapse punctuation and whitespace.
- OCR confusion folding for **scoring only** (a secondary key, not the display text): `0↔o`, `1↔l↔i`,
  `5↔s`, `8↔b`, `rn↔m`, `vv↔w`.
- Keep a list of meaningful short tokens that must not be dropped: `og`, `gg`, `gsc`, `bx`, `s1`, `f1`.

## 5. Match (core/match)

- **Index** (built once on data load): trigram inverted index over `name` + `aliases` (normalized and
  confusion-folded keys).
- **Score** each (candidate, entry) pair:
  `score = 0.45·trigramJaccard + 0.35·jaroWinkler + 0.10·tokenOverlap + 0.10·candidateWeight`,
  with an exact name/alias hit (after normalization) → `1.0`.
- Tiny popularity prior (≤ 0.03) only to break near-ties. It must never overturn a clearly better text match.
- Return the top 5 distinct strains with scores.

## 6. Decide (core/match/decide)

| Condition | Outcome |
| --- | --- |
| top ≥ 0.90 **and** (top − second) ≥ 0.15 | **Auto-accept** → result |
| top ≥ 0.60 | **"Which one?" sheet** with up to 3 candidates (+ "None of these") |
| otherwise | **No match** → show what we read, an editable text field, search, and "We don't have this strain yet" |

Thresholds are constants and get tuned against the eval set (T-012). **Never** show a strain the matcher
didn't return, and never generate lineage or tags for an unmatched name.

## 7. Result (apps/web/features/result)

Covered in [08-ux-and-design.md](08-ux-and-design.md). The result receives a `ScanOutcome`:
`{ strain_id | null, candidates, match_score, method, facts: { package_says, thc_pct, cbd_pct, brand,
product_form, barcode, barcode_format, qr_payload, ocr_text } }`.

## Evaluation harness (T-012)

- `data/eval/packages/`: real package photos (taken by us, or with permission) plus `expected.yaml`
  (`file, strain_id, package_says?, thc_pct?`).
- `pnpm eval:scan` runs the core pipeline on stored OCR outputs (fast, deterministic), and optionally
  re-runs OCR on the images (slow, for engine comparison).
- Reports top-1/top-3 accuracy, no-match rate, false-accept rate (auto-accepted wrong strain, **the worst
  failure**), and per-stage timing. Track over time in `data/eval/history.md`.
- **False-accept target: < 1%.** Showing a confident wrong answer is worse than asking "Which one?".

## Stage budgets (mid-range Android, warm)

| Stage | Budget |
| --- | --- |
| Camera ready after tap | ≤ 800 ms |
| Barcode/QR detect after the code is in view | ≤ 300 ms |
| OCR (warm worker) on reticle crop | ≤ 1200 ms |
| Extract + match + decide | ≤ 50 ms |
| Result sheet visible after decision | ≤ 100 ms |
