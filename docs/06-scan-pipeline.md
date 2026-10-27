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
- **Match before stripping (P6, decided).** Lexicons in `core/scan/lexicon/` *tag* tokens rather than delete
  them up front. Candidates are generated with every token present. A lexicon token is **down-weighted**, and only
  dropped when it isn't part of a longer strain-name match (so `Cookies`, `Runtz`, `Hash Plant` and
  `Gelato Cake` survive). Lexicons:
  - units and quantities: `3.5g`, `1/8 oz`, `28g`, `net wt`, `mg`
  - potency patterns: `THC 24.1%`, `Total THC`, `THCa`, `THC-A`, `Δ9-THC`, `Total Cannabinoids`, `CBD <1%`,
    `ND`, `<LOQ`, `241 mg/g`. Every reading is **captured exactly as printed, with its analyte** (P2, decided).
    Labels often print THC, THCa, and Total THC side by side: keep each one and never compute totals.
    Potency is **never shown to users**. It's stored on the scan for the back-of-house potency table (docs/04).
  - category words: `indica`, `sativa`, `hybrid`, plus variants such as `indica-dominant`, `sativa hybrid`,
    `hybrid (i)`, and single letters **only** in brackets (`(I)`, `(S)`, `(H)`). These are **captured as
    `package_says`** using **three values only** (P3, decided): bare `indica` / `sativa` / `hybrid` map to
    themselves; a variant that names a lean maps to that side (`indica-dominant`, `indica hybrid`, `hybrid (i)`,
    `(I)` → `indica`, and the sativa equivalents → `sativa`); bare `hybrid`, `balanced` and `(H)` → `hybrid`
    (D18, 2026-10-27, revising P3 to match the D15 bands).
  - product forms: `flower`, `smalls`, `shake`, `pre-roll`, `pre-rolls`, `joint`, `blunt`, `cart`, `pod`,
    `disposable`, `vape`, `live resin`, `rosin`, `badder`… Some double as strain tokens (`hash` in
    Hash Plant), which is why matching happens before stripping.
  - compliance boilerplate: state warning blocks, e.g. `government warning`, `schedule i controlled substance`,
    `keep out of reach of children`, `contains marijuana`, `may be habit forming`, `poison control`,
    `1-800-222-1222`, `for use only by persons 21`. Include the spelling `marihuana` (Michigan).
  - known brand names (a list we grow over time): **captured as `brand`**. Some brands are also
    strain tokens (`Cookies`, `Runtz`), so they follow the match-before-strip rule above.
  - dates (`PKG: 02/23/19`), lot/batch/harvest-batch numbers, license numbers (e.g. CA `C11-0000512-LIC`,
    `CCL22-0001771`; MI `AU-R-000524`; WA 9-digit UBI), and track-and-trace IDs (Metrc package UIDs are 24
    characters and have been observed to start with `1A4`). Full lexicon proposals with sources:
    [research/2026-10-26-domain-review.md §4](research/2026-10-26-domain-review.md#4-label-parser-lexicon-additions-for-t-011).
- **Candidate generation:** from each remaining line, all contiguous 1–5 token n-grams, plus a
  cross-line join of adjacent large lines (names wrap: "BLUE / DREAM").
- Output: `{ candidates: [{ text, weight }], package_says, potency_readings, brand, product_form }`.
  The candidate weight blends OCR confidence and relative line height.

### From QR: `classifyQr(payload) → QrFacts`
- **Our deep link** (`https://<our-domain>/s/<strain-id>`) → direct `strain_id`, no matching needed.
- **Lab/COA URL** (domain list grows over time) → `{ kind: "coa", url }`. Phase 2: parse known formats.
  New York requires a COA QR or barcode on every package.
- **Track-and-trace Retail ID** (e.g. Metrc Retail ID, a serialized per-unit QR; required on every unit in NY
  since 2026) → `{ kind: "traceability", url }`. Like a COA, it's **never** a strain decision. Reading the product
  name from its landing page would need the network and an explicit opt-in (Phase 2 at the earliest).
- **Other URL** → slug tokens from the path (`/products/blue-dream-3-5g` → "blue dream") become candidates.
- **Plain text** → treated like OCR text.

### From 1D barcode: `classifyBarcode(value, format)`
- Validate check digits for UPC/EAN. Reject invalid values (they were misreads).
- Look up local barcode memory → `strain_id` if known. Otherwise mark it "unknown barcode" and offer
  text scan or search. Once the user confirms a strain, remember the mapping.
- A Code 128 on a cannabis label is often a **per-package track-and-trace UID** (states require the UID on
  each unit's label) or a store's own POS sticker, not a product code. A UID never repeats across purchases.
- **What gets learned (P13, decided):** UPC/EAN values with valid check digits are learnable. Values matching a
  track-and-trace UID pattern (for example 24-character Metrc UIDs) are recognized and **never** stored in barcode
  memory. Any other Code 128 value is stored as a candidate, and becomes learnable only once it's been seen on a
  second, separate scan.

## 4. Normalize (core/match/normalize)

Applied identically to strain names/aliases at index time and to candidates at query time:
- Unicode NFKD, strip diacritics, lowercase.
- `#4` → `4`, `&` → `and`. Dotted abbreviations join (`M.A.C.` → `mac`). Apostrophes are dropped, not spaced
  (`Chem's` → `chems`).
- **Cross notation (P4, decided):** `×` and a standalone ` x ` between two name-like spans become a **`⟨x⟩`
  marker token**, not a space. Quantity "x" (`5 x 0.5g`, `1x1g`) is a unit, not a cross. A candidate containing
  the marker sets `cross_label: true`. It may match a curated `strain` whose name *is* that cross
  (`Wedding Cake x Gelato 33`), but it **never auto-accepts a single parent**. Without a curated cross, the
  outcome is "Which one?" at best.
  - *T-008 rule:* an `x` is a cross when the tokens since the previous marker contain a letter and the next
    token starts with a letter (`Gelato #33 x Zkittlez` is a cross). A following number makes it a quantity.
  - *T-008 rule:* a strain is a **parent of a cross** (`parent_of_cross`) when one of its names or aliases sits
    inside one side of a marker candidate. `decide()` never auto-accepts a parent.
- **Numbers are identity (P5, decided):** `Gorilla Glue #4` ≠ `#5`, and `Gelato #33` ≠ `#41`. Split letter–digit
  boundaries (`GG4` → `gg 4`) and index both forms. In `decide()`:
  - a **number mismatch** between candidate and entry blocks auto-accept;
  - a **missing number** (candidate `gorilla glue`, entries `#4` and `#5`) caps the outcome at "Which one?".
  - *T-008 clarifications:* both spellings (`gg4`, `GG 4`) normalize to the same split key, so indexing that key
    covers both. Leading zeros are stripped (`#04` → `4`). Numbers are compared as sets of digit tokens between the
    candidate and the **name or alias that matched**, not the canonical name (`Original Glue` carries no number,
    so it doesn't "miss" GG4's `4`). Mismatch: both sides have numbers and they differ. Missing: exactly one side
    has a number.
  - *T-008 exception:* OCR-confusable digits (`0 1 5 8`) inside or at the start of a word with at least three
    letters stay glued (`g0rilla`, `b1ue`, `5unset`), so a misread letter never becomes a number. Folding then
    scores them as letters. Trailing digits always split (`gg5`, `mac1`), and so do short quantity words (`1x1g`,
    `10oz`, `8th`).
- Collapse punctuation and whitespace.
- OCR confusion folding for **scoring only** (a secondary key, not the display text): `0↔o`, `1↔l↔i`,
  `5↔s`, `8↔b`, `rn↔m`, `vv↔w`. (T-008 folds toward the letter: `0→o`, `1→l`, `i→l`, `5→s`, `8→b`, `rn→m`,
  `vv→w`.)
- Keep a list of meaningful short tokens that must not be dropped: `og`, `gg`, `gsc`, `gmo`, `mac`, `gdp`,
  `nl`, `ak`, `sfv`, `bx`, `s1`, `f1`, `ibl`, and single-letter cut suffixes after a name (`chem d`). A candidate
  made only of a generic token (`og`, `kush`, `haze`, `glue`, `cookies`, `cake`, `z`) should not auto-accept (verify
  with the T-008 tests and tune in T-012). *T-008:* "made only of a generic token" means a **one-token** candidate
  that is a generic token or any single letter (`OG Kush` still accepts); `cake` comes from the domain review
  §2.2. The normalizer never drops a token. Naming test cases
  for T-008: [research/2026-10-26-domain-review.md §2.4](research/2026-10-26-domain-review.md#24-naming-test-cases-for-t-008--30).

## 5. Match (core/match)

- **Index** (built once on data load): trigram inverted index over `name` + `aliases` (normalized and
  confusion-folded keys).
- **Score** each (candidate, entry) pair:
  `score = 0.45·trigramJaccard + 0.35·jaroWinkler + 0.10·tokenOverlap + 0.10·candidateWeight`,
  with an exact name/alias hit (after normalization) → `1.0`.
  - *T-008 definitions:* `trigramJaccard` uses the distinct trigrams of the key padded with one space on each
    side. `jaroWinkler` is standard (prefix scale 0.1, up to 4 characters). `tokenOverlap` is the Jaccard index of
    the distinct normalized tokens. `candidateWeight` is clamped to 0–1. The formula runs on the normalized keys
    and on the confusion-folded keys, and the higher result counts, so a folded-exact hit scores
    `0.90 + 0.10·candidateWeight`.
- **Longest exact match wins (T-008, follows from P6):** when a candidate hits a name or alias exactly (or exactly
  after folding), the shorter candidates contained in it don't count for any other strain. `GELATO #33` doesn't
  also match `Gelato`, `White Runtz` doesn't also match `Runtz`, and `THIN MINT GSC` doesn't also match `GSC`.
- Tiny popularity prior (≤ 0.03) only to break near-ties. It must never overturn a clearly better text match.
  *T-008:* entries carry an optional `popularity` (0–1). The ranking key is `score + 0.03·popularity`. The
  reported `score`, and so `decide()`, never include the prior.
- Return the top 5 distinct strains with scores.
  *T-008:* only pairs that could still reach 0.60 (by the trigram, length and token bounds) are scored, and pairs
  scoring at least `MATCH_MIN_SCORE` = 0.50 are returned, so "Which one?" can offer near misses. Neither cut can
  change a `decide()` outcome.

## 6. Decide (core/match/decide)

| Condition | Outcome |
| --- | --- |
| top ≥ 0.90 **and** (top − second) ≥ 0.15, **and** no number mismatch, missing number, single-parent-of-a-cross, or generic-token-only candidate | **Auto-accept** → result |
| top ≥ 0.60 | **"Which one?" sheet** with up to 3 candidates (+ "None of these") |
| otherwise | **No match** → show what we read, an editable text field, search, and "We don't have this strain yet" |

Thresholds are constants and get tuned against the eval set (T-012). **Never** show a strain the matcher
didn't return, and never generate lineage or tags for an unmatched name.

*T-008:* the flags are those of the top match's best pair. Comparisons are inclusive (`≥`), with a 1e-9
floating-point slack. "Which one?" offers the top 3 ranked matches, and `decide()` reports why it didn't accept
(`blocked_by`: `below_accept_threshold`, `small_gap`, `number_mismatch`, `missing_number`, `parent_of_cross`,
`generic_only`).

## 7. Result (apps/web/features/result)

Covered in [08-ux-and-design.md](08-ux-and-design.md). The result receives a `ScanOutcome`:
`{ strain_id | null, candidates, match_score, method, facts: { package_says, potency_readings, brand,
product_form, barcode, barcode_format, qr_payload, ocr_text } }`. The result screen never displays
`potency_readings` (P2).

## Evaluation harness (T-012)

- `data/eval/packages/`: real package photos (taken by us, or with permission) plus `expected.yaml`
  (`file, strain_id, state, package_says?, potency_readings?`). Coverage before launch (P11, decided): labels
  from **CA, MI, NY, WA and CO**, plus at least one **hemp THCa** package. The eval set's potency readings also
  seed the back-of-house potency table (docs/04).
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
