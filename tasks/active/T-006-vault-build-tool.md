---
id: T-006
title: Vault build tool
milestone: M1
status: review
owner: core-engineer
depends_on: [T-002, T-003, T-005]
touches: [tools/vault-build/, packages/core/src/markdown/, packages/core/test/markdown/, packages/core/src/taxonomy/, packages/core/test/taxonomy/, packages/core/src/index.ts, packages/core/test/index.test.ts, package.json, pnpm-workspace.yaml, pnpm-lock.yaml, tasks/active/T-003-taxonomy-v1.md, docs/04-data-model.md, AGENTS.md]
docs: [tools/vault-build/README.md, docs/04-data-model.md, docs/decisions/0003-obsidian-vault-as-strain-source.md]
---

## Goal
`pnpm vault:check` and `pnpm vault:build` work as described in tools/vault-build/README.md.

## Requirements
- `parseNote(markdown, parseYaml)` in core: splits frontmatter and body, parses YAML with the injected parser
  (core has no YAML parser), and returns typed results or structured errors (field, message; the build adds the file).
- Wikilink resolution by filename (case-insensitive, with or without `.md`, aliases **not** used for resolution).
- Shipping policy: ship `verified` + `disputed`. `unverified` ships only with `--include-unverified` (dev builds).
- Never ship internal data: `typical_thc_pct` is stripped, and `data/observations/` is never read by the app build (P2).
- Warn on possible autoflower/ruderalis nodes (name, aliases or region mentioning "auto", "autoflower" or "ruderalis", P1).
  Flag every landrace `base_sativa_pct` for founder review, and error on values outside 10/25/50/75/90 (P10).
- Error when a single-parent node has no `derivation` (P7).
- Output content-hashed folder plus `apps/web/public/data/latest.json` pointing to it.
- `build-report.md` with counts, errors, warnings, and a classification diff vs. the previous build.
- Banned-term check (C1, C2, 2026-10-26): run `assertNoBannedTerms` over taxonomy terms and vault note text
  (body and tag descriptions). **Strain names and aliases are exempt.**
- Fixture vault in `tools/vault-build/test/fixtures/` covering: a valid tree, an unresolved link, a cycle,
  a banned tag, an unsourced tag, a duplicate alias.

- Follow-up from T-002: ship breeder names (e.g. a `breeders.json` or a `breeder_name` on `StrainRecord`), because `breeder_id` alone can't be displayed. Also, `built_at` in the manifest conflicts with byte-identical builds: take it from an input (e.g. the last vault commit date) or leave it out of the content hash.

- **Includes the core half of T-003** (added 2026-10-27): `packages/core/src/taxonomy/` with `loadTaxonomy(parsed)`
  (takes the already-parsed YAML object; core has no YAML parser), `assertNoBannedTerms(text, banned)`, and lookup by
  slug/synonym, plus the T-003 box-2 unit tests. Then tick T-003 box 2 and note it in T-003's Log.
- Run `pnpm vault:check` on the real `data/vault` and record the result in the Log (data fixes belong to the data-curator).

## Acceptance criteria
- [x] `vault:check` exits 1 on each error fixture with a readable message naming file and field.
- [x] `vault:build` on the valid fixture produces JSON that validates against `StrainRecord`.
- [x] Build is deterministic (same input → byte-identical output and hash).

## Out of scope
Curating real data (T-007).

## Log
### 2026-10-27 (core-engineer)
**Claimed** (backlog → active), implemented, status → `review`. Touches expanded (noted here): `docs/04-data-model.md`
(build-output contract: breeders.json, taxonomy.json shape, latest.json, built_at/hash/data_version rules, shipping
policy) and the two `AGENTS.md` command comments, both as briefed.

**Core (pure, no new core dependency, no ADR needed).**
- `src/markdown/`: `splitFrontmatter`, `parseNote(markdown, parseYaml)` (YAML parser injected; validates with
  `GeneticNodeSchema` / `BreederSchema` by `kind`), `parseWikilink`, `Result` / `ValidationIssue` (`field` is a dotted
  path; unknown keys name the key itself). Requirement wording updated from `parseNote(markdown)`.
- `src/taxonomy/`: `loadBannedTerms`, `findBannedTerms`, `assertNoBannedTerms` (throws `BannedTermError`),
  `loadTaxonomy(parsed, banned)`, `getTerm`, `resolveTerm` (slug/label/synonym, follows `replaced_by` chains).
  `loadTaxonomy` takes the banned list as a required second argument so the compliance check can't be skipped.
  Matching follows the banned.yaml header; one clarification: an apostrophe in an entry also matches ’ ‘ ʼ.
  Slugs are checked as written and with hyphens read as spaces.
- Exported through `src/index.ts`; public-API tests added.

**Tool (`tools/vault-build/src/`).** `compile.ts` (pure pipeline), `links.ts`, `emit.ts` (node:crypto hash),
`report.ts`, `fs-io.ts`, `yaml.ts`, `cli.ts`. Behavior is documented in tools/vault-build/README.md. Decisions:
- Shipping: verified + disputed; unverified only with `--include-unverified` (`data_version` gets `-dev`). Lineage is
  computed over shipped nodes only; an unshipped parent is written as `"unknown"` with a warning.
- P1 warning (substring "auto"/"ruderalis" in name, aliases, region). P10: off-scale values and too few sources are
  schema errors; every landrace is listed for founder review. P7 is the schema's derivation error. P2:
  `typical_thc_pct`, `sources`, `base_sativa_pct` and `region` never ship; `observations/` is never read, and a vault
  inside one is refused.
- C1/C2: banned check over taxonomy terms, tag slugs and every note body. All vault names and aliases are masked
  first, so a body heading repeating the name passes. Source titles aren't checked (citations).
- Duplicate alias = error (alias equal to another node's name or alias, case-insensitive). Same name twice and
  near-duplicates (same `normalize`) are warnings.
- Unsourced tag = warning + strip (README/docs/04), not an error: the `unsourced-tag` fixture exits 0.
- T-002 follow-ups: breeder names ship in `breeders.json` (`{id, name}`; `StrainRecord` is strict and the schema
  isn't in this task's touches). `built_at` defaults to the latest note date at 00:00Z (or `--built-at`) and the
  manifest is outside the content hash, so builds are byte-identical.
- `build-report.md` goes to `tools/vault-build/` (gitignored there), not under `public/` where it would ship.

**Dependency.** `yaml` 2.9.1 (catalog, exact), tools only: zero dependencies, YAML 1.2 core schema (dates stay
strings, `yes` isn't a boolean), duplicate-key errors, line positions. The lockfile also re-resolves vite's optional
`yaml` peer to it.

**Tests.** Core +67 (markdown 32, taxonomy 33, public API 2): 533 total. vault-build 75 (was 3): fixtures under
`test/fixtures/` (valid tree, unresolved link incl. an alias link, 3-node cycle, banned tag + banned body + exempt
names, unsourced tag, duplicate alias, P7, P10, bad frontmatter) plus in-memory compile tests. Coverage (measured
with the pnpm-store `@vitest/coverage-v8` 5.0.5, temporarily linked, then removed): core `src/markdown` +
`src/taxonomy` 100% statements/lines/functions, 94.4% branches; vault-build `src` 97.9% statements, 92.1% branches.
`pnpm typecheck` exit 0 (purity guard OK), `pnpm lint` exit 0, `pnpm test` exit 0 (core 533, vault-build 75, web 1).

**Real vault** (`pnpm vault:check`, and `pnpm vault:build --include-unverified`, both exit 1; data/ not edited;
the curator's T-028 batch was in progress): 118 notes (6 landraces, 84 strains, 3 crosses, 25 breeders), 9 errors,
0 warnings. The `--include-unverified` flag passes through pnpm.
- `unresolved-link` (8), no note or alias exists for any target (new notes not written yet, not a spec issue):
  Blueberry Muffin → Purple Panty Dropper, Razzle Berry; Cherry Limeade → Black Lime Reserve, Cherry Pie;
  Gas Face → `Face Off OG x Kush Mints`, `Biscotti x Sherb BX1` (cross notes needed); Gush Mints →
  `F1 Durb x Gushers` (cross note needed; the existing note is "F1 Durban", and there's no Gushers note);
  Layer Cake → `GMO x (Triangle Kush x Skunk 1)` (needs two nested cross notes).
- `banned-term` (1): `strains/Sour Diesel.md` body line 48 "High Times (2018) treats it as a sativa". It's a verb,
  but "treats" is listed in banned.yaml; rephrase (e.g. "calls it").
- Founder review (P10): all 6 landrace values flagged (Acapulco Gold 90, Afghan 10, Colombian Gold 90, Hindu Kush
  10, South African 90, Thai 90), each with 2 backing sources, all unverified.
- Earlier snapshot (102 notes, Sour Diesel fixed in a scratch copy only): no errors. Dev build: 62 `low-confidence`
  warnings (32 unknown, 30 low), nothing else. Default policy: the 10 `disputed` strains ship, with 13
  `unshipped-parent` and 5 `low-confidence` warnings.

**Needs a founder decision.** `disputed` ships by default, but agents may set `disputed` (Q4), so agent-curated
notes no founder has reviewed would ship (10 today). Options: ship `verified` only, or require founder review of
`disputed` too.

**Follow-ups (not done, outside touches).** Core `BreederRecord`/`TaxonomyFile` schemas for the web app; the docs/05
seed-dataset lineage snapshot (core test, once the vault is clean); `packages/core/README.md` still lists `yaml` as
an allowed core dependency (core doesn't use it); prune old `public/data/<hash>/` folders (T-018); a CI
`test:coverage` script (T-018).
