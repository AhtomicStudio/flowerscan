---
id: T-021
title: Design spec & clickable mockups for the core flows
milestone: M0
status: backlog
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
- [ ] Every MVP screen and state listed in docs/08 has a spec.
- [ ] Mockups open on a phone and are clickable between the core flows.
- [ ] Founders approve the direction (noted in the Log) before T-004 starts.
- [ ] A hallway-test script for the 3 core flows is ready in `docs/design/hallway-test.md`.

## Out of scope
Production code (T-004, T-013). Final brand identity (Roy, Q11).

## Log
