---
id: T-005
title: Lineage classification engine
milestone: M1
status: backlog
owner: unassigned
depends_on: [T-002]
touches: [packages/core/src/lineage/, packages/core/test/lineage/]
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
  name, kind, value, weight, children). No strings formatted for UI here.

## Acceptance criteria
- [ ] Every test in docs/05 "Required unit tests" is implemented and passing.
- [ ] The fictional worked example in docs/05 reproduces exactly (50 / 68 / 60, confidences 0.97 / ≈0.955 / ≈0.713).
- [ ] 5,000-node random DAG computes all nodes in < 50 ms on CI.

## Out of scope
Reading the vault (T-006) and rendering (T-013).

## Log
