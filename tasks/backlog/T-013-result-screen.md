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
- Hero: name, label + sublabel, `ClassificationMeter`, `ConfidenceChip`.
- Package-says callout only when it differs from the label. Package facts only those present.
- `TagList` per facet. A facet with no tags renders nothing. All facets empty → no tags section at all.
- "How we know": `explainLineage` tree (3 generations), `unknown` parents shown as "Unknown parent", source count.
- Responsible-use footer.
- Actions row (Save / Share link) as slots; wired in T-015/T-016.
- Unknown strain id → a friendly 404 with search.
- **Vertical-slice stub first:** a plain text input → `search` → result, to demo before M2 lands.

## Acceptance criteria
- [ ] Component tests: traced, partial, reported-only, unknown lineage, zero tags, many tags, package disagrees.
- [ ] E2E: `/s/<seed-strain-id>` renders the classification from built data.
- [ ] Reviewer confirms no rendered value lacks a data or scan source.

## Out of scope
Saving (T-015). Sharing (T-016).

## Log
