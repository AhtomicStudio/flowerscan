# 0003. The Obsidian vault is the source of the strain database

- **Status:** Accepted
- **Date:** 2026-10-25

## Context
We need a strain database with lineage, aliases, sources, and review status. It has to be editable by
non-engineers and by AI agents, reviewable in git diffs, and easy to visualize as a family tree. The brief
already wants Obsidian-compatible Markdown.

## Decision
`data/vault/` is an Obsidian vault. Each genetic node (landrace, strain, unnamed cross) and each breeder is
one Markdown note with YAML frontmatter. Parents are `[[wikilinks]]`. `tools/vault-build` validates the vault
with core's zod schemas, resolves links, rejects cycles, computes lineage, and emits JSON for the app.

## Consequences
- ✅ Obsidian's graph view is a free lineage visualizer for curators.
- ✅ Every data change is a reviewable git diff. Agents edit plain text.
- ✅ The same Markdown conventions can power user exports later ([07-obsidian-spec.md](../07-obsidian-spec.md);
  deferred to Phase 2 per open-questions Q5: Obsidian is founder curation only in the MVP).
- ⚠️ Wikilinks resolve by filename, so names with `#`, `/`, and similar characters need sanitized
  filenames (rules in [04-data-model.md](../04-data-model.md)).
- ⚠️ At tens of thousands of strains, a database becomes nicer for querying. If needed, keep the vault as
  the source and add a DB as a build target.
- Derived fields are never written back into the vault, so there is one source of truth.

## Alternatives considered
- **Firestore/Postgres as the source:** needs an admin UI, diffs are hard to review, and curation is
  harder for agents.
- **One big JSON/CSV file:** merge conflicts, no graph view, and painful to edit by hand.
