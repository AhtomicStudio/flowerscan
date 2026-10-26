# packages/core: `@flowerscan/core`

> Not scaffolded yet. Created in **T-001/T-002**. This README describes the intended shape.

Pure TypeScript domain logic shared by the web app, the vault build tool, and (later) the Obsidian plugin.

## Hard rules
- **No DOM, no React, no Node built-ins, no network, no timers, no randomness without an injected source.**
  The tsconfig omits the `DOM` lib, so violations fail typecheck.
- Every exported function is deterministic and unit-tested. Coverage ≥ 90%.
- Allowed dependencies: `zod`, `yaml`. Add others only via an ADR.

## Planned modules

```
src/
├── schema/      zod schemas + inferred types: GeneticNode, Breeder, Source, TaxonomyTerm, Scan, Lineage
├── lineage/     computeLineage(graph), constants (bands, reported values), ALGO_VERSION
├── taxonomy/    load/validate taxonomy, banned-term check
├── match/       normalize, trigram index, scorers, decide()
├── scan/        parseLabelText(), classifyQr(), classifyBarcode(), lexicon/
├── markdown/    parseNote(), sanitizeFilename() (MVP) · toStrainNote(), toScanNote(), mergeUserNotes() (Phase 2)
├── backup/      serializeBackup(), parseBackup(), mergeBackup() (journal backup file, docs/04)
└── index.ts     public API (anything not exported here is internal)
test/
├── lineage/     unit + snapshot of the seed dataset
├── match/       recorded OCR outputs → expected matches
└── markdown/__golden__/
```

Specs: [04-data-model.md](../../docs/04-data-model.md), [05-classification-algorithm.md](../../docs/05-classification-algorithm.md),
[06-scan-pipeline.md](../../docs/06-scan-pipeline.md), [07-obsidian-spec.md](../../docs/07-obsidian-spec.md).
