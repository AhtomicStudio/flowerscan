---
id: T-024
title: Test plan & device matrix
milestone: M0
status: review
owner: qa-tester
depends_on: []
touches: [docs/testing/, apps/web/e2e/]
docs: [docs/10-quality-and-testing.md, docs/08-ux-and-design.md, docs/02-mvp-scope.md]
---

## Goal
A written test plan so every user-facing task has a clear way to be tested, and real-device testing has a checklist a human can run.

## Requirements
- `docs/testing/test-plan.md`: each MVP flow and state from docs/08 mapped to how it's tested (unit,
  component, e2e, manual device, hallway test) and to the task that delivers it.
- `docs/testing/device-matrix.md`: minimum devices and browsers (for example a recent iPhone in Safari and as an installed
  PWA, a mid-range Android in Chrome, desktop Chrome/Safari/Firefox for search and deep links), with a
  per-release manual checklist covering camera, torch, permission flows, lighting conditions, and performance timings.
- Fake camera feed plan for Playwright: what fixture videos we need (QR, UPC, label text, blank) and how to generate
  them without using real brands' packaging.
- Run the existing smoke e2e and record the result.

## Acceptance criteria
- [x] Every Must item in docs/02 maps to at least one test in the plan.
- [x] The device checklist is short enough to run in 20 minutes.
- [ ] The tech lead runs the first real-phone check from the checklist (the open box in T-001), and the result is recorded.

## Out of scope
Writing feature e2e tests (each feature task adds its own).

## Log
2026-10-26 · qa-tester (Claude Code)
- Claimed (backlog → active). Wrote `docs/testing/test-plan.md` (27 Must items M-01…M-27 and 22 docs/08 flows/states F-01…F-22, each mapped to test types and the delivering task; 9 cross-cutting checks for privacy, no filler, banned terms, a11y, and perf; e2e harness conventions; 14 coverage gaps), `docs/testing/device-matrix.md` (reference devices, a 20-minute per-release checklist timeboxed 2+6+3+6+2+1 min, an extended pass, and a "first phone check" section), and `docs/testing/camera-fixtures.md` (fixture rules, an 18-fixture inventory, the generation pipeline, failure simulation).
- Fake-camera spike (scratchpad only, nothing added to the repo): Playwright Chromium headless shell 1248 on Windows plays ffmpeg-generated `.mjpeg` and `.y4m` through `--use-file-for-fake-video-capture`. Findings recorded in camera-fixtures.md: `--use-fake-ui-for-media-stream` is required (`permissions: ["camera"]` alone → `NotSupportedError`); the UI flag without the fake-device flag opens the real webcam; no `torch` capability; no native `BarcodeDetector` (so e2e runs the polyfill path); portrait 720×1280 is cropped to 720×1080 under the app's `ideal` constraints; MJPEG plays at a fixed 30 fps, Y4M at its header rate. Couldn't launch `channel: "chromium"` from the sandbox (spawn UNKNOWN), so that variant is unverified.
- `pnpm test:e2e` from the repo root: **1 passed** (`[mobile-chromium] smoke.spec.ts › app shell loads over HTTPS`, 326 ms; 5.2 s total including build + preview). Node 24.22.1, pnpm 12.15.0. No changes to `apps/web/e2e/` were needed.
- Acceptance box 3 stays open: the tech lead runs `docs/testing/device-matrix.md` § "First phone check" and records the result here.
- Gaps needing owners (test-plan §5): camera failure states other than denied; age gate [Leave]; deep-link origin config (Q8/Q11); unknown-barcode screen; disputed-lineage chip; several codes in view; OCR failure/slow; storage unavailable; unnamed Android reference device; no on-device timing instrumentation; PWA/offline untestable on the self-signed dev cert; no task runs the hallway test; intro-card persistence / landscape; iOS standalone camera re-prompt.
