---
id: T-030
title: Pre-check the vault's sources (fact-checker)
milestone: M1
status: active
owner: fact-checker
depends_on: [T-028]
touches: [data/review/precheck/]
docs: [docs/04-data-model.md, data/vault/SOURCES.md, data/vault/LANDRACE-RUBRIC.md, docs/09-compliance-and-privacy.md]
---

## Goal
Every genetic node has a pre-check record (docs/04 "Founder review workflow"), so founders can approve the
"ready" pile fast and spend their time on the rest.

## Requirements
- One `data/review/precheck/<node-id>.yaml` per landrace, cross and strain, in the docs/04 format.
- Order: landraces, crosses, strains with sourced parents (sold strains first), then stubs.
- For each claim the note makes (`parents`, `reported_type`, `base_sativa_pct`, `effects`, `aliases`,
  `derivation`), open the cited source(s) and record what the source actually says. Summaries in your own words,
  no copied text. A source on the SOURCES.md excluded list → `excluded_source`.
- Also flag compliance issues in the note body (medical wording) and filler.
- Compute `note_sha256` from the file bytes at check time.
- Never edit `data/vault/`. Problems go in the record; curators fix them in a separate task.

## Acceptance criteria
- [ ] A record for every landrace, cross and non-stub strain (batch 1); stubs in batch 2.
- [ ] Each record validates against the docs/04 format (core schema once T-029 lands).
- [ ] Summary table in the Log: counts by verdict, and the list of `problem` notes with reasons.

## Out of scope
Fixing notes. Setting `verified` (only founders, via `vault:review`).

## Log
- **2026-10-27 (coordinator, batch 1 collected):** Three fact-checker agents wrote 81 records (6 landraces,
  8 crosses, 67 strains with sourced parents): **39 ready, 42 check, 0 problem** (counted from the files).
  Scoring rule applied to all three batches: a contradiction that a `disputed` note already documents accurately
  is `check` (claim `contradicted`), not `problem`.
  - **Landraces:** Afghan, Hindu Kush and Thai ready. Acapulco Gold check (regional paper plus one seed-bank page;
    Jeeter terms open). Colombian Gold check (cited line is a 65-75 day feminised blend; body misattributes the
    landrace claim to Sensi). South African check (body omits the line page's "origins unclear").
  - **Common `check` reasons:** a single weak source (review blog, retailer listing, dispensary page); type taken
    only from a category tag; sources that are really one site; DNA Genetics / Jeeter "personal use only" terms
    (OG #18 would have no source without DNA).
  - **Unreachable:** Humboldt Seed Company 2026 catalog PDF (over the 10 MB fetch limit); Sensi "at 40" post timed
    out (no claim depends on it alone).
  - **Curator errors found** are collected in T-031.
  - **Batch 2** (the 55 stub strains) is still to do.
