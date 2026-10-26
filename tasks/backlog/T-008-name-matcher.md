---
id: T-008
title: Name normalizer & matcher
milestone: M1
status: backlog
owner: unassigned
depends_on: [T-002]
touches: [packages/core/src/match/, packages/core/test/match/]
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

## Acceptance criteria
- [ ] Tests: exact, alias (`GG4`), `#` handling, OCR confusions (`G0RILLA GLU3`), wrapped names, brand noise
      ("ACME FARMS BLUE DREAM"), two similar strains (must yield `choose`, not `accept`), gibberish → `none`.
- [ ] `match` over a 5,000-entry index with 50 candidates runs in < 20 ms on CI.
- [ ] No match result ever contains an id that isn't in the index (property test).

## Out of scope
OCR itself (T-011). Extract/lexicon (T-011).

## Log
