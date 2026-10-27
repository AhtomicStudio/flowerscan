---
id: T-012
title: Scan eval harness & golden set
milestone: M2
status: backlog
owner: unassigned
depends_on: [T-008, T-011]
touches: [data/eval/, tools/scan-eval/, package.json]
docs: [data/eval/README.md, docs/06-scan-pipeline.md]
---

## Goal
`pnpm eval:scan` reports top-1, top-3, false-accept, and no-match rates on a golden set of at least 50 real
package photos, and the decision thresholds are tuned from those results.

## Requirements
- Photos collected per data/eval/README.md, with EXIF stripped. Includes strains not in the DB (expected `null`).
- Fast mode runs on cached OCR outputs (deterministic, CI-friendly). Slow mode re-runs OCR (local only).
- Output: a summary table, per-photo failures with the top-3 candidates, and a line appended to `history.md`.
- Tune the `decide()` thresholds. Record before/after numbers in the Log and update docs/06 if they change.

- Follow-up from T-008: labels that print the strain name plus its lineage ("Runtz (Gelato x Zkittlez)") currently get "Which one?". Include such labels in the golden set and tune whether the curated name should win.

## Acceptance criteria
- [ ] ≥ 50 labeled photos, ≥ 10 of them deliberately hard, ≥ 5 not in the DB.
- [ ] State coverage (P11): labels from CA, MI, NY, WA and CO, plus at least one hemp THCa package. Each entry records `state`.
- [ ] Fast mode runs in CI and fails if false-accept ≥ 1%.
- [ ] Current numbers recorded in `history.md`.

## Out of scope
Changing the OCR engine (open a new task with an ADR if the numbers say we must).

## Log
