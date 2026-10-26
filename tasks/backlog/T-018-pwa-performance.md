---
id: T-018
title: PWA offline & performance budget
milestone: M4
status: backlog
owner: unassigned
depends_on: [T-011, T-013]
touches: [apps/web/vite.config.ts, apps/web/src/app/sw/, apps/web/public/manifest.webmanifest, apps/web/public/icons/, .github/workflows/]
docs: [docs/10-quality-and-testing.md, docs/03-architecture.md]
---

## Goal
Installable, works offline after first visit, meets every budget in docs/10, and the budgets are enforced in CI.

## Requirements
- vite-plugin-pwa: precache the app shell. Runtime-cache the data folder (cache-first, keyed by content hash)
  and the OCR assets (cache on first use).
- Web app manifest, icons (maskable), theme colors, standalone display.
- Update flow: "New version available. Refresh" toast. Never hot-swap mid-scan.
- Bundle size check in CI (scanner route ≤ 170 KB gz). Lighthouse CI (mobile) ≥ 90 performance.
- Offline copy for OCR-not-yet-downloaded (docs/08).
- Coverage gate in CI (follow-up from T-002): add `@vitest/coverage-v8` via the catalog and fail CI when `packages/core` drops below 90% line coverage (docs/10).

## Acceptance criteria
- [ ] Airplane-mode test: barcode → result and search → result work. Note the device in the Log.
- [ ] CI fails when the bundle budget is exceeded (demonstrated once).
- [ ] Lighthouse report attached to the Log.

## Out of scope
Push notifications. Background sync.

## Log
