---
id: T-009
title: Camera viewport & permission flow
milestone: M2
status: backlog
owner: unassigned
depends_on: [T-004]
touches: [apps/web/src/platform/camera/, apps/web/src/features/scan/, apps/web/e2e/]
docs: [docs/06-scan-pipeline.md, docs/08-ux-and-design.md]
---

## Goal
The scanner screen: priming → permission → live rear-camera viewport with reticle, mode control, shutter,
torch (where supported), and a search button. It can hand off a cropped frame or a frame stream.

## Requirements
- `CameraService` interface in `platform/camera` (start, stop, capabilities, setTorch, grabFrame, frameStream), plus a fake for tests.
- Priming screen before the first permission prompt. Denied → manual search route with re-enable instructions.
- Pause the stream on `visibilitychange` hidden and while a full-screen sheet is open.
- Mode control: Auto / Text / Barcode / QR, persisted in settings. Auto is the default.
- Shutter: press animation, frame freeze, emits a reticle-cropped `ImageBitmap`.
- Zustand `scanSession` store: `idle → priming → live → capturing → processing → result | choose | none`.
- Playwright e2e with a fake camera feed: priming → live → shutter emits a frame.

## Acceptance criteria
- [ ] Works on a real iPhone (Safari and installed PWA) and an Android phone (Chrome). Note the models in the Log.
- [ ] Torch toggle is shown only when the capability exists.
- [ ] The UI holds 60 fps with the stream running (Performance panel screenshot in the Log).

## Out of scope
Decoding (T-010). OCR (T-011).

## Log
