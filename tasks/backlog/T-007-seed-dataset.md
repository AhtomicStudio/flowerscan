---
id: T-007
title: Seed dataset (landraces + first strains)
milestone: M1
status: backlog
owner: unassigned
depends_on: [T-002]
touches: [data/vault/landraces/, data/vault/strains/, data/vault/crosses/, data/vault/breeders/, data/vault/SOURCES.md]
docs: [data/vault/README.md, docs/04-data-model.md, docs/09-compliance-and-privacy.md]
---

## Goal
A first real dataset: the foundational landraces plus the 50 most commonly sold strains, each sourced,
so the vertical slice runs on real data. (Launch target: 150–300, follow-up tasks.)

## Requirements
- No existing database (Q2 answered 2026-10-25). We build from scratch.
- Choose the 50 strains by how commonly they appear on dispensary menus (document the method in `SOURCES.md`).
- Every `parents` and `reported_type` value cites a source the curator actually read. Prefer breeder sites
  and published references. Respect site terms. No scraping where prohibited.
- Landrace `base_sativa_pct` values: follow `data/vault/LANDRACE-RUBRIC.md` (coarse scale 10/25/50/75/90, two
  sources each, P10). Finalize the rubric wording with sources as part of this task. Document the reasoning in
  each note body. This is the most sensitive data in the system. Flag every value for founder review.
- Decisions to follow: no ruderalis landraces or autoflower strains (P1). Crosses sold under an "A x B" name are
  curated as searchable `strain` nodes (P4). Single-parent nodes set `derivation`, and numbered phenos list the
  seed line's parents when sourced (P7). Aliases cover only the same plant (docs/04).
- Disputed lineages: `verification: disputed`, both versions documented in the body.
- Tags only where a usable source supports them. Leaving `effects: []` is fine and expected.
- `SOURCES.md`: list of sources used, their license/terms notes, and how each was used.
- Status: the agent sets at most `unverified`. Only a human promotes to `verified`.

## Acceptance criteria
- [ ] `pnpm vault:check` passes (after T-006).
- [ ] 50 strain notes plus all ancestors needed to trace them (or explicit `unknown`).
- [ ] A founder has marked each note `verified` or `disputed` (Q4: AI drafts, founders approve), noted in the Log.
- [ ] Lineage snapshot (from T-005 tests) is generated for this dataset and committed.

## Out of scope
UI. Barcode mappings.

## Log
