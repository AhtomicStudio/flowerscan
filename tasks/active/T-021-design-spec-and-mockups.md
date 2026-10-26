---
id: T-021
title: Design spec & clickable mockups for the core flows
milestone: M0
status: review
owner: product-designer
depends_on: [T-020]
touches: [docs/design/, docs/08-ux-and-design.md]
docs: [docs/08-ux-and-design.md, docs/04-data-model.md, docs/05-classification-algorithm.md, docs/09-compliance-and-privacy.md, docs/13-creative-brief.md, docs/research/]
---

## Goal
A design the engineers can build without guessing: flows, screen specs, and clickable HTML mockups for the
MVP screens, meeting the docs/08 quality bar and reviewed by the founders before T-004 builds the primitives.

## Requirements
- Read the T-020 research first, and apply its top patterns where they fit.
- Apply the T-020 corrections to the docs/08 quality bar (see the T-020 Log): reduced motion is WCAG AAA
  (keep the rule, fix the label), target spacing ≥ 12 px, the updated PWA criteria (iOS 26, Lighthouse), and the
  missing AA items (2.5.7 dragging alternatives: sheets need a close button, plus 2.4.11, 4.1.3, 1.3.4, 1.4.10, 1.4.12).
- Design the states the T-024 test plan found unspecified (docs/testing/test-plan.md "coverage gaps"):
  no camera / camera in use / API missing, the age-gate [Leave] destination, unknown barcode, "lineage disputed",
  UPC and QR both in view, OCR failure or slowness, storage full or unavailable.
- Follow the domain-review copy guidance (open-questions P8, P14): "lineage estimate", the package-says rule.
- `docs/design/flows.md`: the first-run, scan → result, close call, no match, permission denied, and offline flows.
- `docs/design/screens/*.md`: one spec per screen (age gate, scanner, result sheet, "Which one?", no match,
  search, journal list/detail, settings, about). Each covers layout, hierarchy, every state, copy draft (hedged,
  compliant), and accessibility notes.
- `docs/design/tokens-proposal.md`: placeholder palette (with measured contrast ratios), type scale, spacing,
  radii, elevation, motion specs. Clearly marked as placeholder until Roy's identity lands (Q11).
- `docs/design/mockups/`: self-contained HTML mockups at phone width for the scanner, result (traced,
  partial, unknown lineage, zero tags, many tags, package disagrees), and journal. Fictional strain names only.
- A self-review against the docs/08 quality bar and Nielsen's heuristics, written into the Log.
- Update docs/08 wherever the design deliberately changes it.

## Acceptance criteria
- [x] Every MVP screen and state listed in docs/08 has a spec.
- [x] Mockups open on a phone and are clickable between the core flows.
- [ ] Founders approve the direction (noted in the Log) before T-004 starts.
- [x] A hallway-test script for the 3 core flows is ready in `docs/design/hallway-test.md`.

## Out of scope
Production code (T-004, T-013). Final brand identity (Roy, Q11).

## Log
- **2026-10-26 · product-designer:** Claimed the task (backlog → active), designed the MVP, set `status: review`.
  Waiting on founder approval of the direction before T-004 starts.
  - **Files.** Everything is in `docs/design/`, with `README.md` as the index:
    - `flows.md`: flows 1–8.
    - `screens/`: `_shared-components`, `age-gate`, `scanner`, `result-sheet`, `which-one`, `no-match`, `search`,
      `journal`, `settings`, `about`.
    - `tokens-proposal.md`: placeholder tokens and the measured contrast table.
    - `hallway-test.md`.
    - `mockups/index.html`: one self-contained clickable prototype, 47 routes.
    - I also changed `docs/08-ux-and-design.md`. No other paths were touched, and I ran no git commands and no
      `pnpm install`.
  - **T-020 corrections applied to the docs/08 quality bar:**
    - Reduced motion is now labeled HIG + WCAG 2.3.3 (AAA), and it has its own Motion row.
    - Touch targets: 48 px, cited against WCAG 2.5.8 (24 px, AA) and 2.5.5 (44 px, AAA). Adjacent targets now need
      ≥ 12 px between them.
    - PWA row: real install criteria vs. recommendations, the `fetch` handler, `viewport-fit=cover`, the iOS 26
      Add-to-Home-Screen tip, and "Lighthouse no longer scores PWAs".
    - Added the missing AA items 2.5.7, 2.4.11, 4.1.3, 1.3.4, 1.4.10 and 1.4.12, plus a definition of "large text".
    - Core Web Vitals now say "p75, mobile". Body text is 17 px. Fonts are self-hosted.
  - **docs/08 design changes:**
    - Intro card and camera priming merged into one card.
    - New age-gate copy, and [Leave] goes to an exit screen.
    - Result sheet: parents one-liner in the hero, close-to-line edges defined, `reported` results show no
      percentage, no chip for unknown lineage, a "Landrace" chip, label claim listed in How we know, "Also
      reported" row for negative effects.
    - Tag chips are display-only.
    - New rules for the sheet component and for code priority when several codes are in view.
    - New sections: OCR slow/fail, unknown barcode, tracking/COA codes, camera failure states, storage.
    - Micro-interactions for the callout and Save moments.
  - **Test-plan coverage gaps designed:**
    - 1: camera states.
    - 2: Leave.
    - 4: unknown barcode.
    - 5: disputed lineage.
    - 6: several codes in view (a proposal for T-010).
    - 7: OCR slow or failing.
    - 8: storage.
    - 13: intro-card persistence and landscape.
    - 14: iOS re-prompt ("Start camera" state).
    - 12 (nobody runs the hallway test) is still unowned and needs a task.
  - **How the mockup was checked:** headless Chromium (repo Playwright, mobile 390 × 844 and 320 px).
    - No page errors on any of the 47 routes.
    - No horizontal overflow at 320 px on 7 key routes.
    - A filler sweep with every disclosure expanded found no `undefined/NaN/null/N/A/THC/CBD/mg` text.
    - A click-through passed: age gate → camera card → shutter → result → Save → Escape.
    - Screenshots were kept in the session scratchpad, not committed.
    - **Not yet opened on a real phone.** Someone needs to do that during founder review; `docs/design/README.md`
      explains how.
  - **The design skills (`frontend-design`, `impeccable`) weren't available this session.** I worked from docs/08
    and the T-020 research.
  - **Self-review against the docs/08 quality bar:**
    - Platform patterns: pass. 3 labeled tabs, modal sheets, browser back closes sheets (hash routes).
    - WCAG AA:
      - Contrast: pass, measured on every pair. The 3 failing candidates were replaced or given outlines.
      - Not color alone: pass. Icon + word everywhere.
      - 2.5.7, 2.4.11 and 4.1.3: pass. Close button and grabber button on every sheet, modal sheets, one live
        region.
      - 1.4.10 at 320 px: pass (automated).
      - 200% text and landscape: spec only, not mocked. See finding m1.
    - Targets: pass. Swept for < 40 px visual targets. One real miss (the settings switch) was fixed. The star row
      exception is documented.
    - Motion: pass. Reduced-motion mode, and the shimmer stops before 5 s.
    - Visual system: pass. 2 families, a 5-step scale plus display, one primary action per screen.
    - States: every screen spec has a states table.
  - **Self-review against Nielsen's heuristics:**
    - #1 Status: pass. Lock-on, "Still reading", download progress, "Saved", announcements.
    - #2 Real-world language: at risk. See M1 and M2.
    - #3 Control: pass. Close/back everywhere, Undo on Save, Save anyway, and Delete; Erase is confirmed.
    - #4 Consistency: pass. One ResultSheet and one sheet shell. The one deliberate difference: actions are sticky in
      the sheet and inline on the page.
    - #5 Error prevention: pass. Close calls ask, no swipe-delete, Erase is confirmed.
    - #6 Recognition: pass. Recent on the scanner, recents in Search, class pills in "Which one?".
    - #7 Flexibility: pass. Modes, Search, Recent.
    - #8 Minimalism: pass, with m4.
    - #9 Error recovery: pass. Every error says what happened and what to do next.
    - #10 Help: pass. A persistent hint, How we know, /about in a consistent place.
  - **Findings by severity, each with its fix:**
    - **M1 (major, unverified).** People may read the meter's percentage as potency or a lab result.
      Mitigation: the "Lineage estimate, not a lab test." line, and no THC anywhere. Fix if 2 or more hallway
      participants misread it: change the end labels to "Family tree leans indica / sativa", or drop the
      indica-side number.
    - **M2 (major, unverified).** Chip wording ("Partly traced", "Breeder's label") is new to users (benchmark
      note). Fix if 2 or more misunderstand it: test the alternative copy from Q-D2.
    - **m1 (minor).** The mockup doesn't show the ≥ 150% text adaptations or landscape. They're in the specs.
      Fix: T-004 and T-013 cover them with the X-04 zoom tests and one landscape screenshot each.
    - **m2 (minor).** The Save toast briefly covers sheet content. It's now anchored above the action bar and the
      rating row. Fix in T-004: the toast component takes an anchor element.
    - **m3 (minor).** The prototype tab overlaps content at the right edge. It's prototype chrome only and can be
      hidden from the menu.
    - **m4 (minor).** One result can stack the chip, "Close to the line" and the callout. Fix: in the hallway test,
      watch whether the callout still gets read, and if not, move "Close to the line" into the meter caption only.
  - **Fixed during the review:**
    - Two CSS class collisions that broke the layout.
    - A duplicate clear button in Search.
    - Programmatic heading focus showed a focus ring.
    - The callout was cut off at medium height: the sheet is now about 70%, and the spec states the rule.
    - The disputed badge pushed the ancestor's number onto a new line.
    - Toasts stayed on screen across routes.
    - "Share link" wrapped at 320 px.
    - The settings switch target was under 48 px.
  - **Deliberate convention breaks:**
    - A "Type a name instead" link on the camera pre-prompt, against HIG's one-button rule. Reason: web.dev asks for
      a non-camera path.
    - The rating stars sit closer than 12 px apart, as a single control.
    - No offline banner.
    - Search isn't a tab.
  - **Open questions:** Q-D1 to Q-D7 (founders, legal) and Roy's items are in `docs/design/README.md`.
    Founders: please record approval or changes here.
