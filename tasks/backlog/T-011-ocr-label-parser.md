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
- Captures `package_says`, `thc_pct`, `cbd_pct`, `brand`, `product_form`.
- Candidate n-grams (1–5 tokens) plus adjacent-large-line joins, weighted by OCR confidence and relative height.
- Raw OCR output saved into `data/eval/ocr-cache/` format when running in dev "record" mode (for T-012).

## Acceptance criteria
- [ ] Unit tests for `parseLabelText` using at least 15 hand-written realistic OCR outputs (messy on purpose).
- [ ] THC parsing handles `THC 24.1%`, `Total THC: 24.1 %`, `THCa 27%` (record the THCa caveat), `<LOQ`.
- [ ] Warm OCR on a reticle crop is ≤ 1200 ms on a mid-range Android (device and timing in the Log).

## Out of scope
Cloud OCR (Phase 2).

## Log
