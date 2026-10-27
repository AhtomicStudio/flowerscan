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
- **2026-10-27 · product-designer:** Revised the design after the founder's review of the mockup on 2026-10-26
  ("simplify the UI, cut a lot of what we don't need"). `status` stays `review`; founder approval of the
  direction is still the open acceptance box.
  - **Founder decisions applied:**
    - Result and strain page:
      - Kept: a solid, bright class-color hero (name, icon + class word, hybrid sublabel), "How we know" with the
        family tree, sources and disputed badges (collapsed), effect tags, Save with the optional rating, and the
        "Start low, go slow" footer.
      - Cut: the meter and every percentage, "Close to the line", the package-says callout, the "From the package"
        row, flavor and terpene tags, and Share link.
      - Added **Scan another**.
    - Scanner: mode control cut (Auto only). "Default mode" cut from Settings.
    - Q-D1: [Leave] blocks every route for 24 hours on this device, then the gate shows again.
    - Q-D2: "Reported type" everywhere. Q-D3: moot (no percentage anywhere).
    - Q-D5: card stays merged. Q-D6: "Request it" cut entirely.
    - Q-D7: criteria kept; hallway tasks updated to the simplified screens.
    - Share cut from the result, the journal detail and the strain page. `/s/:id` pages stay, reached from Search
      and family-tree rows.
  - **My design decisions (and why):**
    - **Scan another is the primary; Save is secondary.** In a store the usual next step is the next package,
      and most results won't be saved. One primary per screen goes to the repeat action. Save keeps its moment
      (✓ Saved, pop, double haptic, Undo, rating row). On `/s/:id`, Save is the only action and it's the primary.
    - **Honesty info is one basis line under the hero**, e.g. "**Lineage traced:** an estimate from its family
      tree, not a lab test." It isn't a chip, has no info button, and never shows a number. The per-level
      explanation sentences and the "not a DNA or lab test" meaning moved into How we know.
    - **Negative effects stay**, as one plain line: "Also reported: dry mouth, dry eyes." docs/04 says negatives
      are "shown honestly, not hidden", and showing only pleasant effects would read like marketing (docs/09).
      They're plain text, not chips, so they carry less weight. If a strain has only negatives, the line reads
      "Commonly reported: …".
    - **Family-tree rows show class pills only, no numbers**, so no percentage appears anywhere user-facing.
    - **The package's printed type stays as one plain line in How we know** ("Package says Indica."). It costs
      nothing in the default view and keeps docs/02's "label claim shown". No comparison and no warning styling.
    - **Same-code cooldown** (new, for T-010): after a sheet that came from a code closes, that code is ignored
      until it has been out of view for 1.5 s. Without modes, this stops Scan another and "Scan the label" from
      reopening the same sheet. It replaces "Text mode for one shot".
    - **Sheets open at their content height, capped at about 72%**, so a zero-tag result is a short sheet with no
      empty space.
    - **Class hues brightened** (placeholders for Roy): Indica `#A07CFF`, Hybrid `#1FE08A`, Sativa `#FF9419`
      (amber moved toward orange). Ink on each fill is ≥ 6.33:1. The hybrid/sativa colorblind distance improved
      (deuteranopia ΔE 33 → 48, protanopia 20 → 35). The class word went from 44 to 52 px; "Unknown lineage"
      uses 36 px. Solid flood is now a founder decision, so it's off Roy's list.
    - **Result reveal moment without the meter:** the class icon turns in and the class word slides up 8 px.
      Scan another plays a one-beat "ready" breath on the reticle. Both have reduced-motion fallbacks.
    - **24-hour block storage:** a new settings field, `age_declined_at`. The exit copy says "FlowerScan stays
      closed on this device for 24 hours", with no countdown and no "come back tomorrow".
  - **Extra cuts beyond the founder's list (founders: veto any; tracked as Q-D8 in `docs/design/README.md`):**
    1. The parents one-liner on the hero. It moved to the How we know summary row ("Strain A × Landrace C · 5
       sources · 1 disputed"), so the lineage still shows without a tap.
    2. The "From {n} sources · How we know" caption under the tags (How we know sits right below).
    3. The unknown-lineage panel (gray box with a link). The basis line now says "We don't have enough of its
       family tree to say."
    4. The "See all the text we read" disclosure on the no-match sheet. The field holds the best line and the user
       has the package in hand.
    5. Numbers on About and on landrace pages: the band ranges (0–20 …), "a number from 0 to 100", and the landrace
       rubric's "10 / 25 / 50 / 75 / 90". About now lists the five labels in order and says why we show a label,
       not a number.
    6. The extra clauses on the package line ("See the note above", "We can't compare it: the family tree is
       unknown").
    7. The "You can still share the link. [Share]" part of the private-mode save toast (Share is cut).
    8. The Settings "Scanning" group disappears entirely where haptics aren't supported, since Default mode was
       its only other row.
    9. The tag sweep on About is effects-only, to match the result.
  - **Files changed (all inside `touches:`):**
    - `docs/08-ux-and-design.md`: screen inventory, first run (Leave), scan → result, no match, component rules
      (TagList, ClassHero, BasisLine, no meter or chip), signature moments, copy examples, design direction, class
      colors, micro-interactions.
    - `docs/design/README.md` (decisions; Q-D1..Q-D7 marked decided; Q-D8 added) and `flows.md`.
    - `docs/design/screens/`: result-sheet (rewritten), scanner (rewritten), _shared-components, age-gate,
      no-match, search, journal, settings, about, which-one.
    - `docs/design/hallway-test.md` and `docs/design/tokens-proposal.md`.
    - `docs/design/mockups/index.html`: rebuilt the result view, removed the meter, modes, Share, Request it,
      flavor and terpene tags and the chip, added Scan another, the 24-hour block and the cooldown simulation,
      and updated the prototype menu (dead routes removed; new routes: Ready again, Aim at the name, Package
      says otherwise, Landrace page).
    - No git commands, no `pnpm install`.
  - **Verification** (repo Playwright 1.64.1, headless Chromium, 390 × 844 and 320 px, fonts blocked so the
    fallback stack was exercised):
    - 58 routes (every prototype-menu route plus extra strain, journal and About anchors), with every disclosure,
      "+N more" and disputed badge expanded and sheets at large: no page errors and no horizontal overflow at
      either width.
    - Filler sweep: no `undefined/NaN/null/N/A/THC/CBD/mg` in visible text, and no "%" anywhere visible (results,
      strain pages and journal included).
    - Click-through passed: age gate → camera card → live scanner (no mode control in the DOM) → shutter →
      result (basis line present, no "%", no Share) → Save (✓ Saved and the rating row) → Scan another → live
      scanner with focus on the shutter.
    - Barcode tap → result → Scan another → same barcode is muted (cooldown).
    - Leave → `/scan` still shows the exit screen.
    - Fixed during the review: "Unknown lineage" broke mid-word at 320 px with the fallback font (now 36 px,
      breaks only between words). At 320 px the stacked sticky bar took a third of the sheet (now it stays side
      by side and drops the icons).
    - Screenshots are in the session scratchpad, not the repo. Still not opened on a real phone.
  - **Self-review against the docs/08 quality bar and Nielsen (changes only):**
    - #8 Minimalism improves a lot: the hero carries 3 elements (was 5), and the meter, callout, facts row and two
      tag facets are gone from the body.
    - #1 Status: Scan another announces "Ready to scan".
    - #3 Control: Scan another, close, swipe and back all return to the scanner.
    - #2 Real-world language: "Reported type" is plainer than "Breeder's label".
    - Previous finding M1 (meter read as potency) is resolved by removal. M2 (chip wording) carries over to the
      basis-line terms, and the hallway test still checks it. m4 (stacked badges) is resolved.
    - New finding **m5 (minor, unverified):** without the callout, a package that prints the opposite type gets no
      on-screen flag. Fix if 2+ hallway participants are confused: add back one plain line under the basis line.
    - One primary action per screen holds (Scan another in the sheet, Save on the page).
  - **Needs changes outside my `touches:` (for the coordinator):**
    - docs/02:
      - Must: mode control; "percentage bar + confidence level"; the "Package says X comparison"; flavor and
        terpene tags; Share link.
      - Could: "Request this strain".
    - docs/04: Settings drops `default_mode` and adds `age_declined_at`.
    - `packages/core/src/schema/settings.ts` (plus the `ScanMode` enum and the user-data test fixtures).
    - docs/testing/test-plan.md: M-06, M-13, M-19, M-24, F-09, F-10, F-13, F-17, F-21, X-04 (its keyboard path
      ends at share).
    - docs/10 (ClassificationMeter component tests) and docs/03 (mode control, the `share/` module, the Meter
      primitive).
    - docs/open-questions.md: record Q-D1..Q-D8, and update P8, which assumed a package-says callout.
    - Backlog tasks: T-004 (no Meter or ConfidenceChip; add ClassHero and BasisLine), T-009 (no mode control),
      T-010 (cooldown, no mode filters), T-013, T-014 (no Request it), T-016 (backup only), T-017 (24-hour Leave).
- **2026-10-27 (second revision) · product-designer:** Applied the second founder review, open-questions
  **D13–D15**: "More of the screen should be taken up by the result. I want the whole screen to light up … Get rid
  of dominant for the final result." `status` stays `review`.
  - **D13, full-screen answer.**
    - The scan result is now a **full-screen modal view over the paused scanner**, not a sheet. A sheet always
      leaves the frozen camera showing, and the founder asked for the whole screen. It keeps the modal benefits:
      focus trap, a 48 px close button, Escape and back close it, focus returns to the shutter. Sheets stay for
      "Which one?", no match, codes and errors.
    - Above the fold there is only: close, strain name, class icon (64 px), one huge class word, "Details ⌄", the
      footer line, and a bottom bar on the flood with Save (ink outline) and Scan another (ink fill, label in the
      class color). The word is sized `min(23cqw, 7.5rem)` ("Unknown lineage" `min(16cqw, 4.5rem)`), so it can't
      overflow at any width or text size and never breaks inside a word.
    - Details sit below the fold on a theme-colored panel: basis line, learned-barcode note, effects, How we know.
      "Details ⌄" scrolls there and moves focus to the panel heading. The bottom bar never moves, so Save and Scan
      another are always one tap away. After Save, the rating row appears in the bar.
    - Flood moment: a class-color circle grows from the lock-on point or the shutter (340 ms, transform only),
      then the content fades in and the word rises 8 px. Reduced motion: a 150 ms crossfade. `theme-color` follows
      the class color while the view is open.
    - Contrast: only ink sits on the flood, reusing the measured ink/fill pairs (≥ 6.33:1); the class-color label
      on the ink button is the same pair reversed. Never color alone: icon + word in every state.
  - **D14, no dominance on the result.**
    - No sublabel on the answer or in any list. Search rows, journal rows, "Which one?", tree rows and the Recent
      sheet use one ClassPill with the class word only; the "full" pill ("Hybrid · Sativa-dominant") is gone.
    - Dominance appears only as the **lean line**: "**Leans indica** (indica-dominant).", "**An even mix**
      (balanced).", "**Leans sativa** (sativa-dominant)." It's the first line inside How we know on a scan result,
      and directly under the hero on the strain page and journal detail.
    - It's shown for traced and partial lineages only. For reported lineages, the existing "Reported type: …" line
      says it (that line now shows for every method that has a reported type).
  - **D15, new bands.**
    - The mockup's `band()` follows ALGO_VERSION 2: rounded < 50 Indica, exactly 50 Hybrid, > 50 Sativa. The old
      bands are kept as the detail sublabel.
    - Samples now read: Kestrel Haze (70) and Bluebill (70) Sativa, detail sativa-dominant. Goldcrest and Strain G
      (30) and Marsh Wren #4 (40) Indica, detail indica-dominant. Strain A (50) Hybrid. Swiftwing (90) Sativa with no
      detail line.
    - Added **Teal Finch** (fictional, Landrace K × Landrace C = 50, traced) as the Hybrid scan sample, with a
      journal entry and a "Hybrid (exactly balanced)" prototype route.
    - About's label table now lists the three labels with the detail terms in words, no numbers.
  - **Files changed (all inside `touches:`):**
    - `docs/design/screens/result-sheet.md` (rewritten as the result view, same file name so links hold),
      `_shared-components.md` (ResultView, ClassHero for pages, LeanLine, one ClassPill), `scanner.md`,
      `journal.md`, `search.md`, `which-one.md`, `about.md`.
    - `docs/design/flows.md`, `docs/design/hallway-test.md` (new check: the answer is stated within 2 s, ≥ 4 of 5;
      the basis-term question now goes through "Details"; a "Hybrid package answered Sativa/Indica" observation),
      `docs/design/tokens-proposal.md` (`--text-answer`, `--motion-flood`, on-flood button contrast),
      `docs/design/README.md` (decisions, Q-D9, Q-D10).
    - `docs/08-ux-and-design.md` (inventory, scan → result, components, design direction, colors table,
      micro-interactions, ergonomics).
    - `docs/design/mockups/index.html`.
    - No git commands, no `pnpm install`.
  - **Changes and cuts beyond the brief (founders: veto any, Q-D10):**
    1. Lists drop dominance too, not just the answer (one ClassPill everywhere).
    2. The result loses its grabber, detents and swipe-to-dismiss (a full-screen view has close, Escape, back and
       Scan another instead; no drag-only action remains).
    3. The footer moved into the always-visible bottom bar, so it's on screen whether or not details are open.
    4. The rating prompt on the flood is shortened to "Rate it (optional)".
    5. The icon-turn reveal is replaced by the flood moment.
    6. The strain page keeps a rounded hero block rather than flooding full screen: it's a reference page, and the
       flood is reserved for the scan moment. Founders may want the flood there too.
  - **Verification** (repo Playwright 1.64.1, headless Chromium, 390 × 844 and 320 px, fonts blocked so the
    fallback stack was exercised):
    - 59 routes with all disclosures expanded: no page errors and no horizontal overflow. The flood circle is
      clipped by design and excluded from the check.
    - Filler sweep clean: no `undefined/NaN/null/N/A/THC/CBD/mg`, no "%" in any visible text.
    - **Class-color coverage above the fold** (screenshot pixels within a small tolerance of the flat class color;
      every ink pixel counts against it): **91.0–92.8%** across Sativa, Hybrid, Indica (traced, partial, reported,
      many tags), Unknown lineage and zero tags, at both widths. All ≥ 90%.
    - D15 labels asserted on the answer word for 7 variants. No "dominant" text on the answer screen.
    - Click-through passed: age gate → camera card → scanner → shutter → full-screen result → Details (panel
      scrolls in, the bar stays at the bottom, focus on the "Details" heading) → Save (✓ Saved and the rating row) →
      Scan another → live scanner with focus on the shutter. Barcode cooldown and the Leave block also passed.
    - Bugs found and fixed:
      - The rating row showed before Save (a `display: flex` overrode `hidden`).
      - "Details" used `scrollIntoView`, which also scrolled the clipped view and pushed the bottom bar up.
    - Screenshots are in the session scratchpad. Still not checked on a real phone.
  - **Self-review (changes only):**
    - Hierarchy: the answer word is now the biggest element in the app.
    - #8 Minimalism: 7 elements above the fold, one of them decorative.
    - #6 Recognition: the class word in lists matches the answer.
    - #1 Status: the flood plus the "Result: name. Sativa." announcement.
    - New finding **m6 (major for trust, unverified):** under D15 most packages that print "Hybrid" will show
      Sativa or Indica, and with the callout cut (D4) the only hint is "Package says Hybrid." in the details. This
      raises the earlier m5. Founder question Q-D9; the hallway test now records it.
    - New finding **m7 (minor):** the basis line ("not a lab test") is no longer on the first screen. With no
      numbers anywhere the risk is low; the hallway test checks whether people find it through "Details".
  - **Needs changes outside my `touches:` (for the coordinator):**
    - docs/05 and core lineage are being changed by the core-engineer (ALGO_VERSION 2).
    - docs/04: the `label` / `sublabel` semantics.
    - docs/02: the "Classification hero" wording becomes the full-screen answer.
    - docs/testing/test-plan.md: M-13 and F-10 (the hero is now a full-screen view; no sublabel on the answer;
      class-word-only lists).
    - T-004: ResultView, ClassHero for pages, LeanLine, one ClassPill.
    - T-013: full-screen result, `theme-color` handling, details panel.
    - T-014: class-word pills in search and "Which one?".
    - T-015: journal rows.
    - docs/open-questions.md: Q-D9 and Q-D10.
