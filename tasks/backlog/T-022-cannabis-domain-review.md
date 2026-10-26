---
id: T-022
title: Cannabis domain review of specs
milestone: M0
status: backlog
owner: cannabis-expert
depends_on: []
touches: [docs/research/, docs/04-data-model.md, docs/05-classification-algorithm.md, docs/06-scan-pipeline.md, docs/glossary.md]
docs: [docs/04-data-model.md, docs/05-classification-algorithm.md, docs/06-scan-pipeline.md, docs/09-compliance-and-privacy.md, docs/glossary.md]
---

## Goal
Domain accuracy before we build: confirm or correct how the specs model genetics, names, packaging, and
cannabis language, so the engineers aren't encoding wrong assumptions.

## Requirements
Write `docs/research/<date>-domain-review.md` covering:
- **Lineage model (docs/05):** do the node kinds (landrace, strain, cross), backcross/S1/pheno handling,
  reported-type values, and label bands make sense? Where does simple averaging mislead, and how should the UI say so?
  Is the landrace `base_sativa_pct` approach defensible? Propose a sourcing approach for those values.
- **Naming (docs/04, docs/06):** common aliases and abbreviations, same-name/different-genetics cases, and
  numbering conventions (#4, #33, "cut", "pheno") that the normalizer and matcher must handle.
  Provide at least 30 realistic test-case names for T-008.
- **US packaging (docs/06 §3):** what labels typically show across a few major legal states (strain, brand,
  category word, THC vs. THCa vs. total THC, batch/lot, license number, warnings, METRC/track-and-trace IDs, COA QR).
  Propose additions to the label-parser lexicons. Cite state rules where possible.
- **Taxonomy (docs/04 starter vocabulary):** terms people actually use, terms to add or drop, wording that's
  non-medical. Feed this into T-003.
- Apply the uncontroversial fixes directly to the docs listed in `touches:`, and list them in the Log. Leave
  bigger changes as proposals.

## Acceptance criteria
- [ ] The review note exists. Facts have sources, and opinions are marked as opinions.
- [ ] ≥ 30 naming test cases handed to T-008 (in the note, as a table).
- [ ] Lexicon additions listed for T-011, and taxonomy suggestions for T-003.
- [ ] Every direct doc edit is listed in the Log.

## Out of scope
Writing vault data (T-007). Final taxonomy (T-003).

## Log
