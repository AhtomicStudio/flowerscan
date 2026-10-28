# tools/vault-build

Node CLI that turns the Obsidian vault into the app's data (T-006, [ADR-0003](../../docs/decisions/0003-obsidian-vault-as-strain-source.md)).

```
pnpm vault:check                        # validate only; exits 1 on errors (used in CI). Writes nothing.
pnpm vault:build                        # validate + compute lineage + write apps/web/public/data/<hash>/
pnpm vault:build --include-unverified   # dev build: unverified notes ship too (data_version ends in -dev)
```

Options (both commands): `--vault <dir>` (default `data/vault`), `--taxonomy <dir>` (folder with
`taxonomy.yaml` and `banned.yaml`, default `data/taxonomy`), `--out <dir>` (default `apps/web/public/data`),
`--report <file>` (default `tools/vault-build/build-report.md`), `--built-at <ISO datetime>`. Relative paths
resolve against the folder you ran the command from. Exit codes: 0 OK (warnings allowed), 1 errors, 2 usage.

## Pipeline
1. Read `data/vault/**/*.md`. Skipped: `_templates/`, dot-folders (`.obsidian/`, `.trash/`), any
   `observations/` folder, and files at the vault root (README, LANDRACE-RUBRIC, SOURCES are documentation).
   `data/observations/` is never read (P2), and a vault path inside an `observations` folder is refused.
2. Split the frontmatter and validate it with `@flowerscan/core` (`parseNote`, the docs/04 schemas). YAML is
   parsed here (the `yaml` package, strict YAML 1.2: dates stay strings, duplicate keys are errors), not in core.
3. Resolve `[[wikilinks]]` → ids by **filename**: case-insensitive, with or without `.md`, `[[folder/Name]]`
   for a path. Aliases are never used. Unresolved, ambiguous (same filename in two folders) or wrong-kind
   links (a parent pointing at a breeder, a `breeder` pointing at a strain) are errors.
4. Detect cycles (error, with the path printed: `A (a) → B (b) → A (a)`).
5. Validate tags against `data/taxonomy/taxonomy.yaml` (slug of the right facet; a deprecated slug is
   replaced by its `replaced_by` with a warning). Fail on banned terms. Strip unsourced tags (warning).
6. Apply the shipping policy: `verified` and `disputed` ship; `unverified` ships only with
   `--include-unverified`. Lineage is computed over shipped nodes only, so a parent that doesn't ship is
   written as `"unknown"` (warning), and unreviewed values never shape a shipped result.
7. Compute lineage for every shipped node (core `computeAll`, `ALGO_VERSION` 2).
8. Write `manifest.json`, `strains.json`, `breeders.json`, `taxonomy.json` to `<out>/<hash>/`, then
   `<out>/latest.json`, and write `build-report.md`. `vault:check` runs steps 1–7 and writes nothing.

## Checks
**Errors** (exit 1, each names file and field): unreadable taxonomy/banned file or invalid term; missing or
unclosed frontmatter, invalid YAML; schema errors (unknown fields, P7 single parent without `derivation`,
P10 `base_sativa_pct` off the 10/25/50/75/90 scale or with fewer than two sources, verified-node sourcing, a
`verified` note without `reviewed_by` and `reviewed_at`, or one of those two without the other);
duplicate ids; unresolved/ambiguous/wrong-kind links; cycles; unknown tags; banned terms; an alias that is
also another node's name or alias.

**Banned terms** (C1, C2): `assertNoBannedTerms` rules from `banned.yaml` over taxonomy terms (slug, label,
description, synonyms), tag slugs, and every note body. Strain, landrace, cross and breeder names and aliases
are exempt wherever they appear, so a body heading that repeats the name never fails. Source titles are
citations of others' work and aren't checked.

**Warnings** (never fail): possible autoflower/ruderalis node (name, alias or region contains "auto" or
"ruderalis", P1), unsourced tags stripped, deprecated tags replaced, flavors/terpenes listed (not tagged in
the MVP, D3), unshipped parent written as unknown, low or no confidence, no sources, duplicate names,
near-duplicate names/aliases (same text after the matcher's `normalize`), an alias repeating the note's own
name, orphan crosses, filename not `sanitizeFilename(name).md`, note outside its kind's folder.

**Founder review** (P10): every landrace and its `base_sativa_pct` is listed, with the number of sources
backing it and its verification.

## Output
- `manifest.json`: `BuildManifest`. `built_at` defaults to the latest `created`/`updated` date in the vault at
  00:00 UTC (or `--built-at`), so the same vault gives byte-identical files. `data_version` is
  `YYYY.MM.DD-<first 6 of hash>`, plus `-dev` for `--include-unverified`.
- `strains.json`: `StrainRecord[]`, sorted by id, validated with `StrainsFileSchema` before writing.
- `breeders.json`: `{ id, name }[]` for every breeder a shipped record names, sorted by id.
- `taxonomy.json`: `{ taxonomy_version, terms }`, every term with `slug, facet, label, polarity, description,
  status, replaced_by` (null when active). Synonyms are import inputs and don't ship.
- `<out>/latest.json`: `{ data_version, hash, manifest: "<hash>/manifest.json" }`, written last.
- The folder name is the first 12 hex characters of a SHA-256 over `strains.json`, `breeders.json` and
  `taxonomy.json`. The manifest isn't hashed, so `--built-at` doesn't change the folder.

## vault:review (founders only)
The founder verification tool (T-029, docs/04 "Founder review workflow"). **Only a person can verify**: it exits 1
unless stdin and stdout are both an interactive terminal, and it has no option to skip that check. Agents never
run it.

```
pnpm vault:review                          # every unreviewed note, highest impact first
pnpm vault:review --kind landrace          # landrace | strain | cross
pnpm vault:review --verdict ready          # pre-check verdict: ready | check | problem | none | stale
pnpm vault:review --id blue-dream,haze     # only these notes (or repeat --id)
pnpm vault:review --all                    # include notes already reviewed (re-review)
pnpm vault:review --approve-ready-stubs    # batch: approve every ready stub after one typed confirmation
```

Also `--vault`, `--taxonomy` (as above) and `--review <dir>` (folder with `precheck/` and `flags/`, default
`data/review`). Exit codes: 0 done, 1 refused (no terminal, vault errors, no name) or a batch approval failed,
2 usage.

1. It compiles the vault with every status included (as `--include-unverified`). Any error stops it: run
   `pnpm vault:check` and fix them first.
2. It asks your name (default: `git config user.name`; press Enter to take it) and asks you to confirm it. That
   name and today's date are what approvals record.
3. Queue: landraces first, then the nodes with the most descendants, then by name. Notes that already have
   `reviewed_by` are left out unless `--all`.
4. Each card shows the name, kind, verification, file, reported type, parents (with weights and derivation),
   the computed label and detail under `ALGO_VERSION` 2 over the whole vault, effects, aliases, each source
   (title, url or ref, supports), the pre-check verdict with each claim's status (`STALE` when the note's bytes
   changed after the check; an invalid record counts as none), and the impact: how many descendants, whether
   approving ships the note, and how many ancestors are still unverified. If approving would fail the schema, the
   card says why.
5. Type a key, then Enter:

   | Key | Does |
   | --- | --- |
   | `y` | Approve: `verification: verified` (a `disputed` note stays `disputed`), `reviewed_by`, `reviewed_at` and `updated` (today). Only those four lines change. It refuses if the file changed since the session started, re-reads and re-validates the note after writing, and restores the original bytes if that fails. |
   | `s` | Skip to the next note. |
   | `f` | Flag: asks for a comment (empty cancels) and appends `{reviewer, date, comment}` to `data/review/flags/<id>.yaml`. |
   | `o` | Open the note's source URLs in your browser (best effort). |
   | `q` | Quit, with a summary of what you approved, flagged and skipped. |

**Batch mode** (`--approve-ready-stubs`): lists the unreviewed stubs (every parent is `unknown`) whose pre-check is
`ready` and not stale, and that would pass the schema once verified. Type exactly `approve <count>` (for example
`approve 42`) to approve them all as `y` does; anything else cancels and writes nothing. It can't be combined with
`--all` or `--verdict`.

On Windows, use Windows Terminal or PowerShell. Old Git Bash (mintty) windows don't present a TTY to Node, so the
tool refuses there; `winpty pnpm vault:review` works around it.

After a session: `pnpm vault:check`, review `git diff data/vault data/review/flags`, and commit.

## Report contents (`build-report.md`, not shipped, gitignored)
Counts by kind and verification · shipped counts · errors and warnings grouped by type · founder review of
landrace values · diff vs. the previous build (the one `latest.json` pointed to): added, removed and changed
classifications (label, sublabel, `sativa_pct`, confidence level, method, algo version).
