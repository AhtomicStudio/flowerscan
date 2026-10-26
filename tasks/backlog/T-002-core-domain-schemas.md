---
id: T-002
title: Core domain schemas & types
milestone: M0
status: backlog
owner: unassigned
depends_on: [T-001, T-022]
touches: [packages/core/src/schema/, packages/core/src/index.ts, packages/core/test/schema/]
docs: [docs/04-data-model.md, docs/07-obsidian-spec.md]
---

## Goal
Zod schemas and inferred TypeScript types for every entity in docs/04, exported from `@flowerscan/core`.

## Requirements
- Schemas: `GeneticNode` (discriminated on `kind`: landrace | strain | cross), `Breeder`, `Source`,
  `TaxonomyTerm`, `Lineage`, `Scan`, `BarcodeMemory`, `Settings`, plus `BuildManifest` and `StrainRecord` (build output).
- Field names and enums exactly as in docs/04. Shared enums (`ReportedType`, `ClassificationLabel`,
  `Sublabel`, `ConfidenceLevel`, `LineageMethod`, `ScanMethod`, `ProductForm`, `Facet`) are exported constants.
- Refinements: `parent_weights` length equals `parents` and sums to 1 (±0.001); `base_sativa_pct` required
  for landraces and forbidden otherwise; `id` matches `^[a-z0-9]+(-[a-z0-9]+)*$`; `verified` requires sources
  backing `parents` and `reported_type`.
- `slugify(name)` and `sanitizeFilename(name)` per the docs/04 ID rules, with tests (including `Gorilla Glue #4`).

## Acceptance criteria
- [ ] Each schema has valid and invalid fixture tests.
- [ ] `slugify` / `sanitizeFilename` cover `#`, `&`, diacritics, slashes, repeated spaces.
- [ ] docs/04 and the schemas agree. Any change to the doc was made in the same commit.

## Out of scope
Parsing Markdown (T-006) and lineage computation (T-005).

## Log
