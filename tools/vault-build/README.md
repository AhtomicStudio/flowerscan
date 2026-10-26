# tools/vault-build

> Not scaffolded yet. Created in **T-006**.

Node CLI that turns the Obsidian vault into the app's data.

```
pnpm vault:check   # validate only; exits non-zero on errors (used in CI)
pnpm vault:build   # validate + compute lineage + write apps/web/public/data/<hash>/
```

## Pipeline
1. Read `data/vault/**/*.md` (skip `_templates/`, `.obsidian/`).
2. Parse frontmatter and validate it with `@flowerscan/core` schemas.
3. Resolve `[[wikilinks]]` → ids. Unresolved link = error.
4. Detect cycles (error, with the path printed).
5. Validate tags against `data/taxonomy/taxonomy.yaml`. Fail on banned terms, strip unsourced tags (warning).
6. Apply the shipping policy (which `verification` statuses ship).
7. Compute lineage for every node (`core/lineage`).
8. Write `manifest.json`, `strains.json`, `taxonomy.json` to a content-hashed folder, and write `build-report.md`.

## Report contents
Counts by kind and verification · errors · warnings (missing sources, near-duplicate names/aliases,
orphan crosses, low-confidence strains) · diff vs. the previous build (added/removed/changed classifications).
