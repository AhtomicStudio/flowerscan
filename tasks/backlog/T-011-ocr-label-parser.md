---
id: T-011
title: OCR engine + label text parser
milestone: M2
status: backlog
owner: unassigned
depends_on: [T-008, T-009]
touches: [apps/web/src/workers/ocr.worker.ts, apps/web/src/platform/ocr/, packages/core/src/scan/parseLabelText.ts, packages/core/src/scan/lexicon/, packages/core/test/scan/]
docs: [docs/06-scan-pipeline.md]
---

## Goal
Shutter → OCR in a worker → `parseLabelText` → candidates + package facts → matcher → decision.

## Requirements
- `OcrEngine` interface (`recognize(image) → { lines: [{text, confidence, bbox, height}] }`) and a
  `TesseractEngine` implementation in a worker. Lazy-load on first use, prefetch when idle after the camera opens.
- Preprocessing per docs/06 §2 (grayscale, contrast, upscale, rotation retry).
- `parseLabelText(lines)` in core, with lexicons in `core/scan/lexicon/` (units, potency, category words,
  product forms, compliance boilerplate, brands, lot/license patterns).
- Captures `package_says` (three values; a lean variant such as "Indica-dominant" maps to its side, bare "hybrid" to `hybrid`; D18 revising P3), `potency_readings`
  (every figure exactly as printed, with analyte, qualifier and unit, never computed, P2), `brand`, `product_form`.
- **Match before stripping** (P6): lexicon tokens are tagged and down-weighted, not deleted, inside a longer
  strain-name match (Cookies, Runtz, Hash Plant).
- Use the lexicon additions in docs/research/2026-10-26-domain-review.md §4.
- Candidate n-grams (1–5 tokens) plus adjacent-large-line joins, weighted by OCR confidence and relative height.
- Raw OCR output saved into `data/eval/ocr-cache/` format when running in dev "record" mode (for T-012).

## Acceptance criteria
- [ ] Unit tests for `parseLabelText` using at least 15 hand-written realistic OCR outputs (messy on purpose).
- [ ] Potency parsing handles `THC 24.1%`, `Total THC: 24.1 %`, `THCa 27%`, `Δ9-THC 0.8%`, `241 mg/g`, `ND`, `<LOQ`,
      `CBD <1%`, and labels printing several side by side (each kept as its own reading).
- [ ] Warm OCR on a reticle crop is ≤ 1200 ms on a mid-range Android (device and timing in the Log).

## Out of scope
Cloud OCR (Phase 2).

## Log
