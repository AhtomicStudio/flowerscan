---
id: T-017
title: App shell, age gate & compliance pass
milestone: M4
status: backlog
owner: unassigned
depends_on: [T-013]
touches: [apps/web/src/app/, apps/web/src/features/*/copy.ts, apps/web/src/routes/about/, apps/web/src/routes/settings/]
docs: [docs/09-compliance-and-privacy.md, docs/08-ux-and-design.md, docs/open-questions.md]
---

## Goal
Everything a public visitor sees outside the core loop, compliant and polished.

## Requirements
- Age gate: 21+, US (Q3 answered), with the age in a single constant. Remembered locally, blocks all routes, including deep links.
- Copy voice comes from Roy's brand voice (docs/13) once delivered. Compliance rules (docs/09) override it.
- First-run intro card. Navigation between scan / journal / settings.
- `/about`: how classification works (plain-language version of docs/05, including "a lineage estimate, not a lab
  test"), data sources, privacy, responsible use, and "We match the name on the package. We can't confirm what's
  inside." (P14).
- `/settings`: theme, haptics, default mode, backup / restore journal (from T-016), erase all data.
- All user-facing strings collected in `copy.ts` files per feature (easier to review, and to translate later).
- Full compliance review against the checklist in docs/09.

## Acceptance criteria
- [ ] Reviewer agent and a human both sign off on the docs/09 checklist (noted in the Log).
- [ ] Deep link on first visit → age gate → the original deep link.

## Out of scope
Translations. Accounts.

## Log
