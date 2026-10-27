---
id: T-008
title: Name normalizer & matcher
milestone: M1
status: done
owner: core-engineer
depends_on: [T-002]
touches: [packages/core/src/match/, packages/core/test/match/, docs/06-scan-pipeline.md]
docs: [docs/06-scan-pipeline.md]
---

## Goal
Given candidate strings (from OCR, QR slugs, or typed search), return ranked strain matches and a decision
(auto-accept / choose / no-match), as specified in docs/06 §4–6.

## Requirements
- `normalize(text)` and `foldConfusions(text)` per docs/06 §4.
- `buildIndex(records)`: trigram inverted index over names + aliases (normal and folded keys).
- `search(index, query, {limit})` for manual search (prefix-friendly, typo-tolerant).
- `match(index, candidates[]) → RankedMatch[]` with the score formula in docs/06 §5. Exact name/alias hit → 1.0.
- `decide(ranked) → { kind: "accept" | "choose" | "none", … }` with thresholds as exported constants.
- Pure, synchronous, no dependencies beyond core.
- Decisions to implement (docs/06 §4–6): the cross-notation marker token, never auto-accepting a single parent (P4);
  numbers as identity, where a mismatch blocks accept and a missing number caps at choose (P5); generic-token-only
  candidates never auto-accept.
- Use the ≥ 30 naming test cases in docs/research/2026-10-26-domain-review.md §2.4 as table-driven tests.

## Acceptance criteria
- [x] Tests: exact, alias (`GG4`), `#` handling, OCR confusions (`G0RILLA GLU3`), wrapped names, brand noise
      ("ACME FARMS BLUE DREAM"), two similar strains (must yield `choose`, not `accept`), gibberish → `none`.
- [x] `match` over a 5,000-entry index with 50 candidates runs in < 20 ms on CI.
- [x] No match result ever contains an id that isn't in the index (property test).

## Out of scope
OCR itself (T-011). Extract/lexicon (T-011).

## Log

### 2026-10-26 (core-engineer)
**Done.** `packages/core/src/match/` implements `normalize`, `foldConfusions`, `buildIndex`, `search`, `match` and
`decide` per docs/06 §4–6. Thresholds and weights are exported constants (`constants.ts`). Public API is exported
from `src/match/index.ts` only. **`src/index.ts` was not touched:** the coordinator wires it in.
No new dependencies. `docs/06-scan-pipeline.md` was added to `touches` (the coordinator approved it) for the clarifications below.

- **Tests:** 187 in `packages/core/test/match/` (9 files), all green. Includes the 42 domain-review §2.4 rows as a
  table, every acceptance case, a seeded property test (200 random indexes and candidate sets: ids only from the
  index, ≤ 5 distinct, sorted, accept only with clean flags), and the performance test.
- **Performance:** 5,000 synthetic entries (6,464 keys), 50 label-like candidates: median **4.3 ms**, max 8.9 ms
  (local, Node 24). Budget 20 ms.
- **Coverage:** 100% of mapped lines in `src/match/` (763/763). `@vitest/coverage-v8` isn't linked into core, so
  this was measured with V8 precise coverage via `node:inspector` and source maps (scratch script, not committed).
- **Matcher design choices** (all written into docs/06 §4–6 as *T-008* notes):
  1. **Longest exact match wins** (follows from P6): a candidate contained in a longer exact hit doesn't count for
     other strains. Without it `GELATO #33` ties `Gelato`, and `White Runtz` ties `Runtz`.
  2. Numbers are compared against the **matched name or alias**, not the canonical name (otherwise the alias
     `Original Glue` would "miss" GG4's number and could never accept, contradicting row 2).
  3. OCR-confusable digits (0 1 5 8) inside or at the start of a ≥ 3-letter word stay glued (`g0rilla`), so a
     misread letter isn't a number. Trailing digits always split (`gg5`, `mac1`).
  4. `parent_of_cross`: a strain whose name sits inside one side of a marker candidate.
  5. Generic-only = a **one-token** candidate that is a generic token (adds `cake` from review §2.2) or a single letter.
  6. Only pairs that can still reach 0.60 are scored, and pairs ≥ 0.50 are returned. Provably no effect on `decide`.
  7. Popularity prior affects ranking only, never `score`. Threshold comparisons are inclusive with 1e-9 slack.
- **Domain-review rows: 37 of 42 pass as written. 5 follow the spec instead (marked `specNote` in the test):**
  - #6 `G0RILLA GLU3 #4`: review says accept, we give **choose** (GG4 on top). docs/06 has no `3↔e` fold, and P5 reads
    the trailing `3` as a number, so it's a mismatch. (`G0RILLA GLUE #4` accepts.)
  - #9 `GSC Forum Cut`: review says choose, we **accept**, because it exactly hits the curated name `GSC (Forum Cut)`.
  - #17 `lot420-gelato33-pre-roll-1x1g`: review says choose, we **accept**, because `gelato33` splits to the exact
    key `gelato 33` (P5).
  - #29 `Pink Cookies`: review says choose, we give **none**. No name or alias scores ≥ 0.60. "Never accept" holds.
  - #34 `Gelato x Zkittlez`: review says none, we give **choose** with both parents flagged `parent_of_cross`. The
    §6 table puts a ≥ 0.60 blocked match in "Which one?". Runtz never appears.
  (#33 and #41 allow either outcome. We give choose and accept.)

**Follow-ups (not created as task files: outside this task's `touches`):**
- Coordinator: export `src/match/index.ts` from `packages/core/src/index.ts`.
- T-012: tune against real labels. In particular: (a) a label printing its name *and* lineage
  (`Wedding Cake` + `Triangle Kush x Animal Mints`) gives "Which one?" because parents count toward the gap;
  (b) rows 6/9/17/29/34 above; (c) `TRUE GLTO 33` sits at 0.61, just over the choose line.
- cannabis-expert / data-curator: confirm or revise the review's expected outcomes for rows 6, 9, 17, 29, 34.
- Tooling (core-engineer): link `@vitest/coverage-v8` into core and add a `test:coverage` script so the ≥ 90%
  target can be checked in CI.
2026-10-26 · coordinator (Claude Code): verified 187 matcher tests; exported the matcher API from packages/core/src/index.ts with a public-API test (439 core tests total). Lineage-label follow-up filed in T-012; coverage tooling tracked in T-018.
