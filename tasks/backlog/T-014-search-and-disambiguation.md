---
id: T-014
title: Manual search & "Which one?" sheet
milestone: M3
status: backlog
owner: unassigned
depends_on: [T-008, T-013]
touches: [apps/web/src/features/search/, apps/web/src/features/scan/, apps/web/e2e/]
docs: [docs/08-ux-and-design.md, docs/06-scan-pipeline.md]
---

## Goal
Typed search as a first-class path, plus the choose and no-match outcomes of the scan pipeline.

## Requirements
- `/search`: autofocus input, results as you type (≤ 16 ms per keystroke on 5k strains), each row showing name, breeder, and a mini class pill.
- "Which one?" sheet: up to 3 candidates plus "None of these". Choosing one confirms it (and writes barcode memory if a barcode was involved).
- No-match screen: shows the OCR text as editable input, re-runs the match on edit, offers [Search] [Try again] [Save anyway as unidentified].
- Never shows classification or tags for an unmatched name.

## Acceptance criteria
- [ ] E2E for choose and no-match paths (with fake OCR engine output).
- [ ] Keyboard and screen-reader pass on search (results announced via aria-live).

## Out of scope
"Request this strain" (cut, D9). Remote search.

## Log
