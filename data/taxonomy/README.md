# Taxonomy

`taxonomy.yaml` (created in **T-003**) is the controlled vocabulary for tags: facets `effect`, `flavor`,
`terpene`. Field definitions and the starter list are in
[04-data-model.md](../../docs/04-data-model.md#taxonomy-term-datataxonomytaxonomyyaml).

Rules:
- Slugs are permanent. Deprecate with `replaced_by`, never delete or rename.
- **No medical conditions or therapeutic claims.** `banned.yaml` lists forbidden terms, and the build fails
  if any appear in tags or descriptions.
- Descriptions are one hedged sentence ("Often described as…"). Reviewed by the compliance reviewer.
- Target about 40 terms at v1; hard cap 100 across all facets.
