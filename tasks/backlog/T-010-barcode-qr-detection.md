---
id: T-010
title: Barcode & QR detection
milestone: M2
status: backlog
owner: unassigned
depends_on: [T-009]
touches: [apps/web/src/workers/detection.worker.ts, apps/web/src/platform/detectors/, packages/core/src/scan/classifyQr.ts, packages/core/src/scan/classifyBarcode.ts, packages/core/test/scan/, apps/web/e2e/]
docs: [docs/06-scan-pipeline.md]
---

## Goal
Live detection of QR and 1D barcodes in a worker, with the stability gate, lock-on feedback, and payload
classification in core.

## Requirements
- Worker uses native `BarcodeDetector` when `getSupportedFormats()` includes what we need, else the zxing-wasm polyfill.
- Throttled to about 8–10 fps, frames dropped while busy, `ImageBitmap` transferred (not copied).
- Stability gate: the same value in 2 of the last 3 frames.
- `classifyQr(payload)`: own deep link / COA-style URL / other URL (slug candidates) / plain text, per docs/06.
- `classifyBarcode(value, format)`: UPC/EAN check-digit validation.
- Local barcode memory lookup through a `BarcodeMemoryRepository` (Dexie implementation + in-memory fake).
- Learning rule (P13): never store track-and-trace UIDs (e.g. 24-character Metrc UIDs). UPC/EAN are learnable.
  Other Code 128 values become learnable only after a second, separate scan.
- QR kinds include `traceability` (Metrc Retail ID), which is never a strain decision (docs/06).
- Lock-on animation (reticle to bounding box) and haptic tick where supported.

- After a result sheet opened from a code closes (Scan another or close), ignore that same code until it has been out
  of view for 1.5 s, so the result doesn't reopen while the package is still in frame (docs/design/screens/scanner.md, D6).

## Acceptance criteria
- [ ] Unit tests for `classifyQr` and `classifyBarcode` (valid/invalid check digits, every QR kind).
- [ ] E2E: fake camera feed with a QR of our deep link → result route opens.
- [ ] Manual test on iPhone confirms the polyfill path decodes UPC-A and QR within the 300 ms budget (note the timing in the Log).

## Out of scope
COA parsing (Phase 2). Shared barcode DB (Phase 2).

## Log
