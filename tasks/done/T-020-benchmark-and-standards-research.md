---
id: T-020
title: Benchmark apps & design standards research
milestone: M0
status: done
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
- [x] Both notes exist, with a source for every claim.
- [x] A "Top 10 patterns to adopt" list and a "Top 5 things to avoid" list in the benchmark note.
- [x] Any number in docs/08 that the research contradicts is flagged in the Log (the designer updates docs/08).

## Out of scope
Designing screens (T-021). Brand naming (T-023).

## Log
- **2026-10-26 (researcher):** Claimed the task and wrote two notes:
  - `docs/research/2026-10-26-benchmark-apps.md`: Vivino, Yuka, Shazam, Google Lens, Leafly, Weedmaps,
    GREENT, and Kush Scan, plus the Top 10 adopt and Top 5 avoid lists.
  - `docs/research/2026-10-26-design-standards.md`: HIG, Material 3, WCAG 2.2 AA, Core Web Vitals, PWA
    install, plus a row-by-row check of docs/08 "Quality bar."

  No files outside `docs/research/` and this task file were changed. No git commands were run.
  - **docs/08 contradictions and corrections (designer applies in T-021):**
    1. Reduced-motion support is listed under "WCAG 2.2 AA," but it is SC 2.3.3, which is **AAA**. Keep the
       rule, relabel it.
    2. Touch targets: "WCAG 2.2 target size" implies 44/48. The AA requirement (2.5.8) is **24 × 24 CSS px**,
       and 44 is AAA (2.5.5). The 48 px rule itself stays.
    3. Spacing "≥ 8 px" meets Google's 8 dp but is below Apple HIG's **~12 pt padding** around bezeled
       controls. Suggest ≥ 12 px.
    4. PWA row: maskable icons and splash are *recommended*, not install criteria. The actual criteria are
       name/short_name, 192 and 512 px icons, start_url, display, HTTPS, and a 30 s engagement heuristic.
       Chrome's install *prompt* also needs a service-worker `fetch` handler. Safe areas need
       `viewport-fit=cover`. Lighthouse no longer has a PWA category.
    5. Gaps, not wrong numbers: missing AA items 2.5.7 Dragging (sheet drag and swipe-dismiss need tap
       alternatives), 2.4.11 Focus Not Obscured, 4.1.3 Status Messages, 1.3.4 Orientation (no portrait lock),
       1.4.10 Reflow, and 1.4.12 Text Spacing. Also define "large text" as ≥ 24 px regular or ≥ 18.7 px bold.
    - Confirmed correct: 4.5:1 / 3:1 contrast, 200% text, LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 (at p75),
      100 ms feedback, HIG 44 pt, Material 48 dp, body ≥ 16 px, Android-only haptics.
  - **Confidence:**
    - Standards: high for WCAG, CWV, HIG, and iOS 26. Medium for Material 3 (m3.material.io would not render;
      I used the Android component docs instead).
    - Benchmarks: medium. First-run and no-match screens are mostly unknown without hands-on testing, and the
      note lists the checks to run.
  - **Housekeeping:** I could not move or delete files with my tools. This file was written to `tasks/active/`,
    and the original `tasks/backlog/T-020-benchmark-and-standards-research.md` still exists and needs
    deleting.
  - Status set to `review`.
2026-10-26 · coordinator (Claude Code): reviewed against the acceptance criteria. Closed as research input.
  Corrections handed to T-021 (it owns docs/08).
