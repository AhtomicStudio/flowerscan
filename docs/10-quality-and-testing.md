# Quality & Testing

## Test pyramid

| Layer | Tool | What | Bar |
| --- | --- | --- | --- |
| Unit | Vitest | `packages/core`: lineage, normalize, match, decide, extract, markdown | ≥ 90% line coverage on core; every bug fix adds a test |
| Golden files | Vitest | Lineage snapshot of the seed dataset, journal backup format | Diffs reviewed deliberately |
| Data | `vault-build --check` | Schema validity, link resolution, cycles, banned terms, unsourced tags | Zero errors to merge; warnings tracked |
| Component | Vitest + Testing Library | TagList (0/1/4/12 tags), ClassificationMeter (null/edges), ResultSheet states | All states from 08-ux-and-design.md |
| E2E | Playwright (Chromium with a fake camera feed from `.y4m`/`.mjpeg` fixtures; WebKit for layout) | Scan barcode → result; shutter → OCR → result; close call; no match; permission denied; export | Runs in CI on every PR |
| Eval | `pnpm eval:scan` | OCR + match accuracy on `data/eval` | Top-1 ≥ 85%, top-3 ≥ 95%, false-accept < 1% |
| Device | Manual checklist | Real iPhone (Safari + installed PWA) and a mid-range Android (Chrome) | Before every release |

## Definition of done (every task)
1. Acceptance criteria in the task file are all checked.
2. `pnpm typecheck && pnpm lint && pnpm test` pass. `pnpm vault:check` passes if data was touched.
3. New behavior has tests. UI changes include a screenshot or recording in the task log.
4. Docs updated if behavior, fields, or decisions changed (ADR for decisions).
5. No TODOs without a linked task ID.
6. The task file moves to `tasks/done/` with a short log of what changed.

## Performance budgets

| Metric | Budget |
| --- | --- |
| Initial JS (gzipped, scanner route) | ≤ 170 KB |
| Strain data (gzipped) | ≤ 1 MB at launch |
| OCR assets | Lazy; never on the initial load |
| LCP on mid-range Android, 4G | ≤ 2.0 s |
| INP | ≤ 200 ms |
| Scanner frame rate with detection on | 60 fps UI, detection ≥ 8 fps |
| Stage budgets | See [06-scan-pipeline.md](06-scan-pipeline.md#stage-budgets-mid-range-android-warm) |

CI fails if bundle size exceeds its budget (size-limit or a Vite bundle report check).

## Accessibility (WCAG 2.2 AA)
- Every classification is conveyed by text, not color alone.
- Scanner controls are labeled. Detections and results are announced through an `aria-live` region.
- Full keyboard path on desktop. Focus is trapped in sheets and returned on close.
- Reduced motion respected. Text zoom up to 200%.
- Manual search is a first-class alternative to the camera.

## CI (GitHub Actions, once the repo is on GitHub)
`install → typecheck → lint → test → vault:check → build → size check → e2e (Chromium)` on every PR.
Preview deploy on Vercel per PR.
