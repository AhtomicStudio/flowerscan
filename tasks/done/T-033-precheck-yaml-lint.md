---
id: T-033
title: Keep data/review YAML from failing pnpm lint
milestone: M1
status: done
owner: core-engineer
depends_on: [T-029]
touches: [biome.json, .claude/agents/fact-checker.md, data/review/precheck/]
docs: [docs/04-data-model.md, docs/10-quality-and-testing.md]
---

## Goal
`pnpm lint` passes with the pre-check records and founder flags in the repo.

## Context
Found during T-029 (2026-10-27). Biome formats YAML, and 6 of the 81 records in `data/review/precheck/` written by the
fact-checker agents (T-030) fail `biome check` (it prefers single quotes for strings containing `"`): cherry-limeade,
cookies-and-cream, f1-durban, garlic-breath, gas-face, glitter-bomb. Everything outside `data/` is lint-clean.
`vault:review` writes flag files with the `yaml` package's style, which may also differ from Biome's.

## Requirements
- Decide: exclude `data/review/**` from Biome (it's data, like the Markdown vault), or keep it and have the
  fact-checker run `pnpm format` on its records (update `.claude/agents/fact-checker.md`). Reformatting a record
  changes no value, so `note_sha256` stays valid (the hash is of the vault note, not the record).
- All 81 records still validate with `PrecheckRecordSchema` afterwards.

## Acceptance criteria
- [ ] `pnpm lint` exits 0 with the current records and a sample flag file.
- [ ] Definition of Done met (docs/10-quality-and-testing.md)

## Out of scope
- Changing what any record says.

## Log
<!-- Append-only. Date · who · what changed · decisions · follow-up task IDs -->
- 2026-10-27 · core-engineer (T-029) · created from the T-029 lint run.
- **2026-10-27 (coordinator):** Excluded `data/review/**` from Biome in `biome.json` (it's data, like the Markdown
  vault, and `pnpm lint` is documented as code only). Records are unchanged, so they still validate.
