---
id: T-020
title: Benchmark apps & design standards research
milestone: M0
status: backlog
owner: researcher
depends_on: []
touches: [docs/research/]
docs: [docs/08-ux-and-design.md, docs/01-product-brief.md]
---

## Goal
Sourced, decision-ready research that the product designer (T-021) can design from: what makes the best
"point at it, get an answer" apps feel fast, trustworthy, and fun, and what the current platform standards require.

## Requirements
- **Benchmark teardown** (`docs/research/<date>-benchmark-apps.md`): Vivino, Yuka, Shazam, and Google Lens, plus
  2–3 cannabis apps (strain lookup or dispensary apps). For each: first-run flow, scan/answer flow, how the
  result is laid out, how they show confidence or uncertainty, failure states, signature delight moments,
  and what to avoid. Describe in words. No screenshots of their apps committed.
- **Standards digest** (`docs/research/<date>-design-standards.md`): the current Apple HIG and Material 3
  guidance on tab bars, bottom sheets, camera UIs, and touch targets; WCAG 2.2 AA items that matter for this
  app; Core Web Vitals thresholds; PWA install criteria. Note anything that changed recently and confirm
  or correct the numbers in docs/08 "Quality bar".
- Each note follows the researcher format (short answer, findings with dated sources, implications, confidence).

## Acceptance criteria
- [ ] Both notes exist, with a source for every claim.
- [ ] A "Top 10 patterns to adopt" list and a "Top 5 things to avoid" list in the benchmark note.
- [ ] Any number in docs/08 that the research contradicts is flagged in the Log (the designer updates docs/08).

## Out of scope
Designing screens (T-021). Brand naming (T-023).

## Log
