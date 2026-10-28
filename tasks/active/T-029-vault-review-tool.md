---
id: T-029
title: vault:review, the founder verification tool
milestone: M1
status: review
owner: core-engineer
depends_on: [T-006]
touches: [tools/vault-build/, packages/core/src/schema/, packages/core/test/schema/, packages/core/src/index.ts, packages/core/test/index.test.ts, package.json, docs/04-data-model.md, tools/vault-build/README.md, AGENTS.md]
docs: [docs/04-data-model.md, tools/vault-build/README.md, docs/05-classification-algorithm.md]
---

## Goal
A founder can verify the vault quickly and safely: `pnpm vault:review` walks the notes most important first,
shows everything needed to decide, and writes the approval to the note. Spec: docs/04 "Founder review workflow".

## Requirements
- **Schema:** add `reviewed_by` (non-empty string) and `reviewed_at` (ISO date) to genetic nodes, both optional,
  but required together, and required when `verification: verified`. Update fixtures and tests, and accept
  existing notes (none has them yet).
- **Pre-check records:** a core zod schema for `data/review/precheck/<id>.yaml` (format in docs/04). The tool reads
  them and shows `stale` when `note_sha256` doesn't match the current file bytes.
- **`pnpm vault:review`** (root script → vault-build package):
  - **Refuses to run without an interactive TTY** (stdin and stdout), with a message saying only a person can
    verify. At start it asks the reviewer's name (default: `git config user.name`) and confirms it.
  - Queue order: landraces first, then nodes by number of descendants (desc), then name. Skips notes already
    reviewed unless `--all`. Filters: `--kind`, `--verdict ready|check|problem|none|stale`, `--id`.
  - Card: name, kind, type, parents (and weights/derivation), the computed label + detail under ALGO_VERSION 2
    (over the whole vault, as `--include-unverified` would), effects, aliases, each source (title, url, supports),
    the pre-check verdict with each claim's status, and impact ("N descendants; approving ships this note").
  - Keys: `y` approve, `s` skip, `f` flag (prompts a comment → `data/review/flags/<id>.yaml` with reviewer, date,
    comment), `o` open the source URLs in the browser (optional, best effort), `q` quit with a summary.
  - **Approve** edits the frontmatter text in place, preserving the rest of the file byte-for-byte:
    `verification: verified` (a `disputed` note stays `disputed`), `reviewed_by`, `reviewed_at` (today), and
    `updated` (today). Then it re-validates that note with the schema and reverts if it fails.
  - **Batch mode** `--approve-ready-stubs`: lists the stub notes (only `unknown` parents) whose pre-check is `ready`
    and not stale, asks for one typed confirmation ("approve 42"), then approves them all as above.
  - Pure logic (queue, card rendering, frontmatter edit) is unit-tested; the TTY loop is a thin shell. Inject the
    clock and the prompt for tests.
- `vault:check` treats a `verified` note without `reviewed_by`/`reviewed_at` as an error (after this lands).
- Docs: tools/vault-build/README.md (usage), AGENTS.md command list (one line), docs/04 if anything differs.

## Acceptance criteria
- [x] Running without a TTY exits 1 with the "only a person can verify" message (test).
- [x] Approve/flag/batch tested on fixtures; an approved note keeps every other byte.
- [x] Stale pre-checks are detected (test).
- [ ] typecheck, lint, test and vault:check green.

## Out of scope
Running the review (founders). Writing pre-checks (T-030).

## Log
- 2026-10-27 · core-engineer · Implemented T-029.
  - **Core schema:** `reviewed_by` (non-blank string) and `reviewed_at` (ISO date) on genetic nodes, optional
    (`null` = absent), required together on any verification, and required for `verified`. New
    `packages/core/src/schema/review.ts`: `PrecheckRecordSchema` (docs/04 format, enums exported) and
    `ReviewFlagFileSchema`, exported from `index.ts`. Fixtures updated (core `strain` fixture, the vault-build
    `valid/` notes and the `landrace` helper now carry `reviewed_by`/`reviewed_at`).
  - **vault-build:** `BuildData` now also exposes `graph` and `lineages` (in memory, never serialized; output bytes
    and hashes unchanged). New `src/review/`: `approve.ts` (pure line edit of four top-level keys and a
    before/after check), `queue.ts` (order, filters, stale detection, stubs), `card.ts`, `flags.ts`,
    `session.ts` (the loop over injected IO, files, clock, git name and hasher), `node-io.ts` (real terminal,
    disk, `git config user.name`, URL opener with no shell), `main.ts`. Root script `pnpm vault:review`.
  - **Safety:** the TTY check (stdin and stdout) is the first thing `runReview` does, before parsing args or
    reading files, and there's no option to skip it. Checked: `pnpm vault:review < /dev/null` exits 1 with the
    message. I never ran the interactive tool on the real vault.
  - **Decisions (docs/04 updated):** pre-check `value` may be a string, a number or a list of strings; a claim's
    `note` is optional; `claims` may be empty; a `ready` record with a `contradicted` claim, or a field with no
    `confirmed` claim, is invalid. An invalid record shows as INVALID and counts as `none` for `--verdict`. A
    record whose `id` doesn't match its file name is invalid. Flags are appended to a list per node
    (`{id, flags: [{reviewer, date, comment}]}`), so two founders' flags never overwrite each other. A
    coordinator note on verdicts (disputed note that documents the contradiction → `check`) is now in docs/04.
    Keys are typed and then Enter (line input), so a stray keypress can't approve. Ctrl+C or Ctrl+D quits with
    the summary. `--approve-ready-stubs` also skips stubs that would fail the schema once verified (listed as
    skipped) and can't be combined with `--all`/`--verdict`.
  - **Checked against real data (read-only):** all 81 records in `data/review/precheck/` (39 ready, 42 check)
    validate with the new schema; none was stale.
  - **Tests:** core 551 (incl. new `test/schema/review.test.ts` and the review-field cases), vault-build 126
    (49 new across `review-units.test.ts` and `review-session.test.ts`, plus 2 in `compile.test.ts`), web 1.
  - **Gates:** `pnpm typecheck` 0. `pnpm vault:check` 0 (OK, 22 warnings). `pnpm lint` exit 1, only on 6
    fact-checker YAML files in `data/review/precheck/` (not mine; everything outside `data/` is clean) → T-033.
    `pnpm test` exit 1, only on the two wall-clock perf tests in `test/lineage/performance.test.ts` while other
    agents load the machine; they pass alone and in a serial core run (551/551) → T-032. So the last box stays
    open until T-032 and T-033 land.
  - **Follow-ups:** T-032 (perf tests flaky under load), T-033 (data/review YAML vs Biome). Coverage wasn't
    measured: `@vitest/coverage-v8` isn't a workspace dependency.
