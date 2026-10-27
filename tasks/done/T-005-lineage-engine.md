---
id: T-005
title: Lineage classification engine
milestone: M1
status: done
owner: core-engineer
depends_on: [T-002]
touches: [packages/core/src/lineage/, packages/core/test/lineage/, docs/05-classification-algorithm.md]
docs: [docs/05-classification-algorithm.md, docs/decisions/0004-lineage-derived-classification.md]
---

## Goal
`computeLineage(graph, nodeId) → Lineage` and `computeAll(graph) → Map<id, Lineage>`, implemented exactly
as specified in docs/05.

## Requirements
- Constants in `constants.ts`: reported-type values, label bands, decay, reported confidence, confidence levels, `ALGO_VERSION = 1`.
- Memoized, iterative or recursive with a visiting-set guard. A cycle → `unknown` at runtime.
- `findCycles(graph)` exported for the build tool, returning the cycle paths.
- `method` per docs/05: traced / partial / reported / unknown.
- `explainLineage(graph, nodeId, depth=3)` returns a tree structure for the "How we know" UI (node id,
  name, kind, derivation, verification, value, weight, children). No strings formatted for UI here.
- Decisions to implement (docs/05): no decay for `cut`, and for `pheno` with a single seed-line parent (P7); no
  confidence cap for disputed ancestors, which are exposed via `verification` instead (P9); no ruderalis
  handling at all, since autoflowers are excluded from v1 (P1).

- Follow-up from T-002: docs/05 says every number is null for an unknown result, but `LineageSchema` uses `confidence: 0` with `confidence_level: none`. Align the docs/05 wording with the schema.

## Acceptance criteria
- [x] Every test in docs/05 "Required unit tests" is implemented and passing.
- [x] The fictional worked example in docs/05 reproduces exactly (50 / 70 / 60, confidences 0.97 / ≈0.955 / ≈0.713,
      cut of B ≈0.955, S1 of B ≈0.927).
- [x] 5,000-node random DAG computes all nodes in < 50 ms on CI.

## Out of scope
Reading the vault (T-006) and rendering (T-013).

## Log
- 2026-10-26 (core-engineer): Implemented `packages/core/src/lineage/` (constants, graph, compute, explain,
  index). Public API from `src/lineage/index.ts` (coordinator wires it into `src/index.ts`): `computeLineage`,
  `computeAll`, `findCycles`, `explainLineage`, `createLineageGraph`, `labelFor`, `confidenceLevelFor`, the
  constants (`ALGO_VERSION`, `REPORTED_VALUE`, `GENERATION_DECAY`, `REPORTED_CONFIDENCE`,
  `NO_DECAY_DERIVATIONS`, `LABEL_BANDS`, `CONFIDENCE_THRESHOLDS`) and types `LineageNode`, `LineageGraph`,
  `LineageExplanation`, `LabelBand`, `ConfidenceThreshold`. Reuses the T-002 enums, `Lineage` and `UNKNOWN_PARENT`.
  - Tests: 105 in `packages/core/test/lineage/` (6 files), all docs/05 required tests, worked example exact.
    Coverage of `src/lineage`: 99.4% lines, 92.1% branches, 100% functions. `@vitest/coverage-v8` isn't a
    declared dependency, so this was measured with the copy already in the pnpm store.
  - Performance: 5,000-node seeded random DAG (mulberry32 in the test), `computeAll` median of 5 warm runs
    12–21 ms, cold first run about 33 ms, on the dev machine. `findCycles` on 5,000 nodes is under 50 ms.
  - Snapshot: golden JSON for a fictional fixture dataset (`test/lineage/__snapshots__/`). The real seed
    dataset has no notes yet (T-007), so its snapshot comes once T-006 can load the vault.
  - docs/05: the unknown-result wording now matches `LineageSchema` (`confidence: 0`, `confidence_level: none`).
  - Resolved ambiguities (no behavior beyond docs/05):
    - A landrace without `base_sativa_pct` (P10) falls back to its own `reported_type` (method `reported`,
      0.5), or is unknown. The pseudocode's landrace line assumes a value; suggested docs/05 follow-up: write
      `if n.kind == landrace and n.base_sativa_pct != null`.
    - Cycles: every node in a cycle group (strongly connected component) is `unknown`, whatever order nodes are
      computed in, so results are deterministic. A descendant treats a cyclic parent like an unknown one.
      `findCycles` returns one shortest path per group (`["a","b","a"]`, child → parent), starting at the
      group's smallest id, sorted.
    - A parent id that isn't in the graph (unresolved link) counts as an unknown parent. An id that isn't in
      the graph gives the unknown lineage (`computeLineage`) or null (`explainLineage`).
    - A single parent without `derivation` (schema-invalid except for a lone `"unknown"`) decays like `s1`.
    - `parent_weights` whose length differs from `parents` throws (schema-invalid input, never silently fixed).
    - `confidence` is not rounded. Only `sativa_pct` is rounded, at the end (Math.round, so 12.5 → 13).
    - `explainLineage` depth counts graph edges (0 = the node alone). Nodes carry `lineage` (the full result)
      plus `truncated` for cut-off parents. A node already on the path isn't expanded again (cycle-safe).
2026-10-26 · coordinator (Claude Code): verified 105 lineage tests + core typecheck. Fixed the docs/05 landrace pseudocode (no base value → fallback). Exported the lineage API from packages/core/src/index.ts with a public-API test. Seed-dataset snapshot waits on T-006/T-007; coverage tooling is tracked in T-018.
