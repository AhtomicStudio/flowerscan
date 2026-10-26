---
id: T-022
title: Cannabis domain review of specs
milestone: M0
status: review
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
- [x] The review note exists. Facts have sources, and opinions are marked as opinions.
- [x] ≥ 30 naming test cases handed to T-008 (in the note, as a table).
- [x] Lexicon additions listed for T-011, and taxonomy suggestions for T-003.
- [x] Every direct doc edit is listed in the Log.

## Out of scope
Writing vault data (T-007). Final taxonomy (T-003).

## Log
### 2026-10-26: cannabis-expert
- Claimed the task (backlog → active). **Note:** this agent had no shell, so the file was re-created in
  `tasks/active/` and the old copy at `tasks/backlog/T-022-cannabis-domain-review.md` still needs deleting
  (`git mv` or delete) by whoever has a shell.
- Wrote `docs/research/2026-10-26-domain-review.md`. Contents:
  - Findings ordered by impact.
  - Lineage model review with the science on what indica/sativa labels track (Watts 2021, Sawler 2015,
    McPartland 2018/2020).
  - Breeding-relationship table and the landrace sourcing rubric (P10).
  - 42 naming test cases for T-008.
  - State packaging comparison: CA, CO, WA, MI, NY, plus OR name rules and the federal hemp redefinition
    effective 2026-11-12.
  - T-011 lexicon additions with regex starting points.
  - T-003 taxonomy suggestions and banned-list additions.
  - 14 proposals (P1–P14) needing decisions.
  - 39 sources, each marked full-read or excerpt-only.
- Direct doc edits (clarifying or additive; no algorithm or schema behavior changed):
  - `docs/glossary.md`:
    - Replaced the "Pheno / cut / clone-only" row with accurate **Pheno (numbered selection)**,
      **Cut / clone-only**, and **Seed line** rows.
    - Added **F1/F2**, **IBL**, **Polyhybrid**, **Indica / Sativa (vernacular)**, **THCa**, **Δ9-THC**,
      **Total THC**, **ND/LOQ/LOD**, **Hemp-derived THCa flower**, **UID / package tag**, **Retail ID**,
      **Lot / batch number**, and **Brand vs. breeder**.
    - Expanded **Backcross** (expected shares) and **S1** (new generation).
    - Clarified **Lineage-derived classification** (an average, not a DNA measurement) and **Confidence**
      (coverage, not correctness).
    - Corrected **METRC** (not every state; WA uses CCRS; 24-character UIDs).
    - Noted that NY requires COA QR codes.
  - `docs/05-classification-algorithm.md`:
    - Added a "What the number means" section with citations.
    - Added a modeling note under the phenos/cuts/S1 bullet (S1 = new generation, cut = clone, numbered pheno
      takes the seed line's parents; the decay question is P7).
    - Added edge cases: **reciprocal crosses** and **folklore/undisclosed lineages**.
    - Flagged the ruderalis `50` default as open (P1). The rule itself is unchanged.
  - `docs/04-data-model.md`:
    - `aliases` row now says aliases are only for the same plant (renames yes; sibling phenos, other cuts, and
      inconsistent names no).
    - Added a cross-note parent-order convention (keep the source's order; mother first by convention).
  - `docs/06-scan-pipeline.md`:
    - §3: extended the lexicon examples (THC-A, Δ9-THC, Total Cannabinoids, ND, <LOQ, mg/g; category variants
      and bracketed letters; more product forms; state warning phrases incl. "marihuana"; license and
      track-and-trace ID examples). Added cautions on brand and form-word collisions (P6), the THC basis (P2),
      and sublabel loss (P3).
    - §3 QR: noted that NY requires COA QR codes. Added a **track-and-trace Retail ID** QR kind (never a strain
      decision).
    - §3 barcode: noted that Code 128 is often a per-package UID (P13).
    - §4: flagged cross-notation folding as open (P4). Added a number-identity note (P5). Added short tokens
      (`gmo`, `mac`, `gdp`, `nl`, `ak`, `sfv`, `ibl`, cut suffixes) and a generic-token caution. Linked the
      T-008 test cases.
- Proposals needing a decision (details in note §6):
  - Before **T-002**: P2 (`thc_basis`) and P3 (`package_says` raw/sublabel).
  - Before **T-005**: P1 (ruderalis) and P7 (cut decay).
  - Before **T-008**: P4 and P5.
  - Before **T-011**: P6.
  - Before **T-013**: P8 and P14 (copy and callout logic).
  - Before **T-007**: P10 (landrace rubric).
  - For legal review **Q10**: P12 (youth-appeal of displayed strain names).
- Didn't touch the vault, other docs, or the benchmark/design-standards research files. No git commands.
- Status → `review`. The acceptance boxes are checked for the note's content. Source quality varies: state rules
  were read in full where possible, while many strain-naming facts come from trade or retailer pages and are
  marked "excerpt" or "secondary" in the note. Those need data-curator verification before any vault use.
