---
id: T-002
title: Core domain schemas & types
milestone: M0
status: done
owner: core-engineer
depends_on: [T-001, T-022]
touches: [packages/core/src/schema/, packages/core/src/ids/, packages/core/src/index.ts, packages/core/test/, packages/core/package.json, packages/core/README.md, pnpm-workspace.yaml, pnpm-lock.yaml, docs/04-data-model.md]
docs: [docs/04-data-model.md, docs/07-obsidian-spec.md]
---

## Goal
Zod schemas and inferred TypeScript types for every entity in docs/04, exported from `@flowerscan/core`.

## Requirements
- Schemas: `GeneticNode` (discriminated on `kind`: landrace | strain | cross), `Breeder`, `Source`,
  `TaxonomyTerm`, `Lineage`, `Scan`, `BarcodeMemory`, `Settings`, plus `BuildManifest` and `StrainRecord` (build output).
- Field names and enums exactly as in docs/04. Shared enums (`ReportedType`, `ClassificationLabel`,
  `Sublabel`, `ConfidenceLevel`, `LineageMethod`, `ScanMethod`, `ProductForm`, `Facet`) are exported constants.
- Domain decisions (docs/open-questions.md P1–P14) are already in docs/04. In particular: `derivation`
  (required when there's one parent, P7), `base_sativa_pct` limited to 10/25/50/75/90 (P10), `package_says`
  with three values (P3), `PotencyReading` and `potency_readings` on Scan (P2), `BarcodeMemory.learnable` (P13),
  and the internal `PotencyObservation` schema (P2, used by T-025).
- Refinements: `parent_weights` length equals `parents` and sums to 1 (±0.001); `base_sativa_pct` is
  allowed only on landraces and only from the coarse scale (it may be empty); `id` matches `^[a-z0-9]+(-[a-z0-9]+)*$`; `verified` requires sources
  backing `parents` and `reported_type`.
- `slugify(name)` and `sanitizeFilename(name)` per the docs/04 ID rules, with tests (including `Gorilla Glue #4`).

## Acceptance criteria
- [x] Each schema has valid and invalid fixture tests.
- [x] `slugify` / `sanitizeFilename` cover `#`, `&`, diacritics, slashes, repeated spaces.
- [x] docs/04 and the schemas agree. Any change to the doc was made in the same commit.

## Out of scope
Parsing Markdown (T-006) and lineage computation (T-005).

## Log
### 2026-10-26 (core-engineer)
**Built.** `zod` **4.6.7** (latest stable, `npm view zod version`) added to the catalog and to core as `"catalog:"`;
`pnpm install` needed no build-script approval. Modules: `src/schema/` (enums, common, source, genetic-node,
breeder, taxonomy-term, lineage, potency, scan, barcode-memory, settings, backup, build-output, internal rules)
and `src/ids/id-rules.ts`. Public API via `src/index.ts` only: `GeneticNodeSchema`, `SourceSchema`,
`BreederSchema`, `TaxonomyTermSchema`, `LineageSchema`, `ScanSchema`, `PotencyReadingSchema`,
`PotencyObservationSchema`, `BarcodeMemorySchema`, `SettingsSchema`, `BackupFileSchema`, `StrainRecordSchema`,
`StrainsFileSchema`, `InlineCrossSchema`, `LineageParentSchema`, `BuildManifestSchema`, their inferred types,
every enum as a `CONST` tuple + `*Schema` + type, `SlugSchema`/`NodeIdSchema`/`WikilinkSchema`, `isSupported`,
`slugify`, `sanitizeFilename`, and constants (`SCHEMA_VERSION`, `UNKNOWN_PARENT`, `WEIGHT_SUM_TOLERANCE`,
`BASE_SATIVA_PCT_MIN_SOURCES`, `CODE_128_LEARNABLE_AFTER`, `BACKUP_FORMAT`, `EVIDENCE_PREFIX`).

**Tests.** 145 in core (schema 102, ids 40, public API 3), all fictional names. Coverage measured with a
temporary `@vitest/coverage-v8` 5.0.5 install (reverted afterwards, so no new dependency): 100% statements,
lines, and functions; 99.4% branches (one unreachable `??` fallback). `pnpm typecheck` (purity guard OK),
`pnpm lint`, and `pnpm test` are green.

**docs/04 changes (same change, clarifications where docs/04 was silent or ambiguous):**
- Validation conventions: unknown keys rejected everywhere; vault optionals may be `null` (templates write
  `null`); strings never trimmed; ISO date/datetime formats.
- Genetic node: parent counts by kind (landrace `[]`, strain ≥ 1, cross ≥ 2); weights in (0, 1]; `derivation`
  rules spelled out, including that a lone `"unknown"` parent may omit it (requiring it would force curators
  to invent a relation); `base_sativa_pct` needs two supporting sources at any verification (P10); `region`
  documented (it was already in the landrace template); `id` `unknown` reserved; `typical_thc_pct` range; `updated ≥ created`.
- Source: `ref` row, `url` must be http(s), one of the two required. Breeder: `schema_version`/`created`/`updated` (per template).
- Taxonomy: `replaced_by` row; `polarity` required on every term (T-003 lists it per term).
- Sourcing policy 3: `verified` requires backing only for claims actually made (named parents, non-`unknown`
  `reported_type`), plus at least one source. Otherwise crosses (almost always `reported_type: unknown`)
  could never be verified, and so would never ship.
- Lineage: consistency rules (unknown ⇔ null pct ⇔ method unknown, confidence 0 ⇔ level none, sublabel ⇔ hybrid).
- Build output: `StrainRecord` table. `parents` hold ids, `"unknown"`, or **inline cross objects** (my reading of
  "crosses are inlined as lineage tree nodes"). `parent_weights` added (needed for the tree), `derivation`
  written out in resolved form. `StrainsFile` ids unique. Manifest field types and `counts` keys defined.
- Scan / memory / settings / backup / observation types: `barcode_format` uses the docs/06 format list
  (minus `qr_code`); Settings `theme: system|dark|light`, `default_mode: auto|text|barcode|qr`; backup files
  have no duplicate ids; observation `state` = USPS codes, `readings` ≥ 1, `evidence` under `data/eval/`.
- ID rules: exact `slugify`/`sanitizeFilename` behavior. Unsafe filename characters now become a **space**
  (then collapse) instead of being removed, so `A/B` → `A B`, not `AB`. `Gorilla Glue 4.md` is unchanged.

**Follow-ups (not created; outside this task's touches):**
- docs/05 says "every number is null" for unknown results, but docs/04 types `confidence` as 0–1. The schema uses
  `confidence: 0`. T-005 should align the docs/05 wording.
- T-006: `strains.json` carries `breeder_id`, but no breeder file ships, so the UI can't show breeder names.
  Also, `built_at` conflicts with "byte-identical output". Decide how to derive it or exclude it from the hash.
- T-025: the "mixed units" rejection isn't in the observation schema. Add it there if it's meant per observation.
- Tooling: add `@vitest/coverage-v8` (catalog) plus a `test:coverage` script so the ≥ 90% core target is enforced in CI.
2026-10-26 · coordinator (Claude Code): verified typecheck/lint/test (145 core tests). Repaired docs/04: a `$`+backtick sequence in the `id` row regex had pasted a duplicate of the file header into the table (lines 37–73). Removed the stray `packages/core/.vitest/` report and gitignored `.vitest/`. Follow-ups filed in T-005, T-006, T-018, T-025.
