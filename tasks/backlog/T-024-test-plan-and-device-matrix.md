---
id: T-024
title: Test plan & device matrix
milestone: M0
status: backlog
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
- [ ] Every Must item in docs/02 maps to at least one test in the plan.
- [ ] The device checklist is short enough to run in 20 minutes.
- [ ] The tech lead runs the first real-phone check from the checklist (the open box in T-001), and the result is recorded.

## Out of scope
Writing feature e2e tests (each feature task adds its own).

## Log
