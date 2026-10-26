---
id: T-003
title: Taxonomy v1 + banned terms
milestone: M0
status: backlog
owner: unassigned
depends_on: [T-002]
touches: [data/taxonomy/taxonomy.yaml, data/taxonomy/banned.yaml, packages/core/src/taxonomy/, packages/core/test/taxonomy/]
docs: [docs/04-data-model.md, docs/09-compliance-and-privacy.md]
---

## Goal
A reviewed, compliant controlled vocabulary of about 40 terms across `effect`, `flavor`, and `terpene`, plus
a banned-terms list the build enforces.

## Requirements
- Start from the starter vocabulary in docs/04. Each term gets `slug, facet, label, polarity, description, synonyms, status`.
- Descriptions: one hedged sentence, no medical language.
- `banned.yaml`: medical conditions and therapeutic phrases (pain, insomnia, anxiety relief, depression,
  stress relief, nausea, PTSD, migraine, seizure, inflammation, "treats", "cures", "heals", "relief"…),
  matched case-insensitively as whole words or phrases.
- `core/taxonomy`: `loadTaxonomy(yamlString)`, `assertNoBannedTerms(text)`, and lookup by slug.
- Version field at the top of the file (`taxonomy_version: 1`).

## Acceptance criteria
- [ ] 35–50 active terms, none banned, all descriptions hedged.
- [ ] Unit tests: banned term in a description fails; synonyms resolve; deprecated terms resolve to `replaced_by`.
- [ ] Compliance reviewer sign-off noted in the Log.

## Out of scope
Assigning tags to strains (T-007).

## Log
