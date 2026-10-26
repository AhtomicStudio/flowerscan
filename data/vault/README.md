# FlowerScan Strain Vault

This folder is an **Obsidian vault** and the source of truth for the strain database
([ADR-0003](../../docs/decisions/0003-obsidian-vault-as-strain-source.md)). Open it in Obsidian with
"Open folder as vault".

## Layout

```
data/vault/
├── _templates/   note templates (Obsidian core "Templates" plugin → set folder to _templates)
├── landraces/    kind: landrace   (lineage recursion stops here)
├── strains/      kind: strain     (named, searchable cultivars)
├── crosses/      kind: cross      (unnamed intermediate crosses, "A x B")
└── breeders/     kind: breeder
```

## Rules for every note
1. Use the matching template. Field names and meanings: [04-data-model.md](../../docs/04-data-model.md).
2. **Every fact needs a source** in `sources:` with `supports:` listing the fields it backs.
   No source → `verification: unverified`.
3. **Never invent.** If you can't find the parents, write `parents: ["unknown"]`, not a guess.
4. **No derived fields** (no `sativa_pct`, no `classification`). The build computes those.
5. Filenames: strip `\ / : * ? " < > | # ^ [ ]`. Keep the exact name in `name` and `aliases`.
6. `id` never changes once the note has shipped.
7. Don't copy descriptions or reviews from other websites into the body. Write your own words or link out.
8. Run `pnpm vault:check` before committing.

## Recommended Obsidian settings (`.obsidian/` is gitignored except as noted)
- Files & links → "Automatically update internal links": **on** (renames keep parents linked).
- Templates core plugin → template folder: `_templates`.
- Optional community plugins for curators: Dataview (queries like "strains with no sources").
