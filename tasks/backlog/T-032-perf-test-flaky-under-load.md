---
id: T-032
title: Make the core lineage performance tests stable under parallel load
milestone: M1
status: backlog
owner: core-engineer
depends_on: [T-005]
touches: [packages/core/test/lineage/performance.test.ts, packages/core/vitest.config.ts, docs/10-quality-and-testing.md]
docs: [docs/05-classification-algorithm.md, docs/10-quality-and-testing.md]
---

## Goal
`pnpm test` doesn't fail on a busy machine just because the wall clock is slow, while still catching a real
performance regression in `computeAll` / `findCycles`.

## Context
Found during T-029 (2026-10-27). `test/lineage/performance.test.ts` ("computes a 5000-node random DAG in < 50 ms"
and "finds no cycles in the 5000-node DAG in < 50 ms") failed in 3 of 3 full `pnpm test` runs while other agents
were running (median ~90 ms). They pass when run alone (3 of 3) and in a serial run (`vitest run --no-file-parallelism`,
551/551). `pnpm -r test` stops at the first failing package, so tools/vault-build and apps/web tests don't run after it.

## Requirements
- Pick one: run the perf file in its own serial project/pool, or measure relative to a calibration loop, or keep
  the 50 ms budget behind an opt-in `PERF=1` run with a looser default bound. Document the choice in docs/10.
- The budget from docs/05 stays a tested constant somewhere.

## Acceptance criteria
- [ ] `pnpm test` passes 5 runs in a row with other heavy processes running.
- [ ] A deliberate 10x slowdown in `computeAll` still fails a test.
- [ ] Definition of Done met (docs/10-quality-and-testing.md)

## Out of scope
- Changing the lineage algorithm.

## Log
<!-- Append-only. Date · who · what changed · decisions · follow-up task IDs -->
- 2026-10-27 · core-engineer (T-029) · created from the T-029 test runs.
