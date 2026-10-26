---
id: T-006
title: Vault build tool
milestone: M1
status: backlog
owner: unassigned
depends_on: [T-002, T-005]
touches: [tools/vault-build/, packages/core/src/markdown/parseNote.ts, package.json]
docs: [tools/vault-build/README.md, docs/04-data-model.md, docs/decisions/0003-obsidian-vault-as-strain-source.md]
---

## Goal
`pnpm vault:check` and `pnpm vault:build` work as described in tools/vault-build/README.md.

## Requirements
- `parseNote(markdown)` in core: splits frontmatter and body, parses YAML, and returns typed results or
  structured errors (file, field, message).
- Wikilink resolution by filename (case-insensitive, with or without `.md`, aliases **not** used for resolution).
- Shipping policy: ship `verified` + `disputed`. `unverified` ships only with `--include-unverified` (dev builds).
- Never ship internal data: `typical_thc_pct` is stripped, and `data/observations/` is never read by the app build (P2).
- Warn on possible autoflower/ruderalis nodes (name, aliases or region mentioning "auto", "autoflower" or "ruderalis", P1).
  Flag every landrace `base_sativa_pct` for founder review, and error on values outside 10/25/50/75/90 (P10).
- Error when a single-parent node has no `derivation` (P7).
- Output content-hashed folder plus `apps/web/public/data/latest.json` pointing to it.
- `build-report.md` with counts, errors, warnings, and a classification diff vs. the previous build.
- Fixture vault in `tools/vault-build/test/fixtures/` covering: a valid tree, an unresolved link, a cycle,
  a banned tag, an unsourced tag, a duplicate alias.

- Follow-up from T-002: ship breeder names (e.g. a `breeders.json` or a `breeder_name` on `StrainRecord`), because `breeder_id` alone can't be displayed. Also, `built_at` in the manifest conflicts with byte-identical builds: take it from an input (e.g. the last vault commit date) or leave it out of the content hash.

## Acceptance criteria
- [ ] `vault:check` exits 1 on each error fixture with a readable message naming file and field.
- [ ] `vault:build` on the valid fixture produces JSON that validates against `StrainRecord`.
- [ ] Build is deterministic (same input → byte-identical output and hash).

## Out of scope
Curating real data (T-007).

## Log
