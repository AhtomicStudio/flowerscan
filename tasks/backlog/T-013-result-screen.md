---
id: T-013
title: Result screen
milestone: M3
status: backlog
owner: unassigned
depends_on: [T-004, T-005, T-006]
touches: [apps/web/src/features/result/, apps/web/src/data/, apps/web/src/app/routes, apps/web/e2e/]
docs: [docs/08-ux-and-design.md, docs/05-classification-algorithm.md, docs/09-compliance-and-privacy.md]
---

## Goal
The result sheet and the `/s/:strainId` page, driven by real built data, showing every state in docs/08.

## Requirements
- Data loader: fetch `latest.json` → content-hashed `strains.json`, build the in-memory index once, expose `useStrain(id)`.
- **Simplified result (D1–D6, 2026-10-26; follow the revised docs/design specs):**
  - **Full-screen class color** (D13) with the name and the label only. The sublabel (dominance) appears only in
    "How we know" and on the strain page (D14). Labels follow the 50/50 rule (D15, ALGO_VERSION 2). **No percentage anywhere user-facing** (D2):
    no meter, no numbers in the family tree. Add a test that fails if a "%" reaches the result DOM.
  - The method/confidence explanation ("Lineage traced", "Partly traced", "Reported type" (D10)) lives in "How we know".
  - No package-says callout (D4, supersedes P8). No product-form row. No Share button (D5).
- **Never render potency** (P2). Add a test that fails if any THC/CBD value reaches the DOM.
- Disputed ancestors are marked "lineage disputed" in the family tree (P9).
- Strain names render as plain text, with no styling keyed to the name (P12).
- `TagList` for **effects only** (D3; flavors and terpenes aren't shown). No effect tags → no tags section at all.
- "How we know": `explainLineage` tree (3 generations), `unknown` parents shown as "Unknown parent", source count.
- Responsible-use footer.
- Actions: Save (wired in T-015) and **Scan another** (D6), which closes the result and returns to the live scanner.
- Run `assertNoBannedTerms` over the rendered result text, excluding the strain name (C1, C2).
- Unknown strain id → a friendly 404 with search.
- **Vertical-slice stub first:** a plain text input → `search` → result, to demo before M2 lands.

## Acceptance criteria
- [ ] Component tests: traced, partial, reported-only, unknown lineage, zero tags, many tags.
- [ ] E2E: result → Scan another → live scanner.
- [ ] E2E: `/s/<seed-strain-id>` renders the classification from built data.
- [ ] Reviewer confirms no rendered value lacks a data or scan source.

## Out of scope
Saving (T-015). Sharing (cut from the MVP, D5).

## Log
