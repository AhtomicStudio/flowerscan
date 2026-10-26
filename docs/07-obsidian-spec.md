# Obsidian Markdown Spec (v1)

> **Scope update (2026-10-25, open-questions Q5):** Obsidian is for **founder curation only** in the MVP.
> Role 1 below (the curation vault) is in force. Role 2 (user exports) is **deferred to Phase 2**. Keep this
> spec as the design for that phase, but don't build it in MVP tasks.

Obsidian plays two roles, and they use the same conventions:

1. **Curation vault** (`data/vault/`): the source of the strain database. Inputs only, no derived fields.
   Covered by [04-data-model.md](04-data-model.md) and the templates in `data/vault/_templates/`.
2. **User exports**: notes the app generates for a person's own vault, with derived fields included.
   This doc specifies those.

Serialization lives in `packages/core/src/markdown/` (`toStrainNote`, `toScanNote`, `parseNote`), so the
web app, the build tool, and the future Obsidian plugin produce byte-identical output.

## General rules

- UTF-8, LF line endings, a trailing newline.
- Frontmatter is YAML between `---` lines. Keys are `snake_case` and appear in the order listed below.
- Wikilinks inside properties are quoted: `strain: "[[Blue Dream]]"` (Obsidian requires the quotes).
- Lists use YAML block style (`- item`), which Obsidian's property editor round-trips cleanly.
- Dates: `YYYY-MM-DD`. Datetimes: ISO 8601 with offset, e.g. `2026-10-25T18:42:11-07:00`.
- Unknown values are written as `null`, not omitted, so Dataview queries behave predictably.
- Tags live in the `tags` property **without** `#`, nested with `/`:
  `type/hybrid`, `effect/creative`, `flavor/citrus`, `terpene/myrcene`, `flowerscan/scan`.
- Every generated note has `schema_version` and a stable `id`. The re-export/merge logic keys on `id`.

## Export folder layout

```
<Vault>/FlowerScan/
├── Strains/
│   └── Gorilla Glue 4.md
└── Scans/
    └── 2026/
        └── 2026-10-25 1842 Gorilla Glue 4.md
```

The folder name `FlowerScan` comes from settings (`export_folder_name`), so it can follow the final brand.

## Strain note (export)

```markdown
---
kind: strain
id: gorilla-glue-4
schema_version: 1
name: "Gorilla Glue #4"
aliases:
  - GG4
  - Original Glue
classification: hybrid
classification_detail: indica-dominant
sativa_pct: 35
indica_pct: 65
lineage_confidence: high
lineage_method: traced
parents:
  - "[[Parent Strain A]]"
  - "[[Parent Strain B]]"
reported_type: indica-dominant
breeder: "[[Breeder Name]]"
effects:
  - relaxed
  - euphoric
flavors:
  - diesel
  - pine
terpenes:
  - caryophyllene
data_version: "2026.10.25-a1b2c3"
algo_version: 1
source_url: "https://<our-domain>/s/gorilla-glue-4"
tags:
  - flowerscan/strain
  - type/hybrid
  - type/indica-dominant
  - effect/relaxed
  - effect/euphoric
  - flavor/diesel
  - flavor/pine
  - terpene/caryophyllene
updated: 2026-10-25
---

# Gorilla Glue #4

**Hybrid · Indica-dominant** · 65% indica / 35% sativa · confidence: high (lineage fully traced)

## Lineage
- [[Parent Strain A]]
  - [[Grandparent 1]]
  - [[Grandparent 2]]
- [[Parent Strain B]]

## Commonly reported
- Effects: #effect/relaxed #effect/euphoric
- Flavors: #flavor/diesel #flavor/pine
- Terpenes: #terpene/caryophyllene

> Effects vary from person to person. Start low and go slow. Not medical advice.

%% flowerscan:user-notes %%
## My notes

```

> The example values above are illustrative, not verified data.

**Section rules:**
- The **Lineage** list goes 3 generations deep at most, with `unknown` rendered as plain text "Unknown parent".
- The "Commonly reported" subsections appear **only if that facet has tags**. With no tags, the whole
  section is omitted. No placeholders, no "N/A".
- Everything above `%% flowerscan:user-notes %%` is app-owned. Everything below it belongs to the user.

## Scan note (export)

```markdown
---
kind: scan
id: scan_01JB8Z7Q2X4N6P8R0T2V4W6Y8A
schema_version: 1
strain_name: "Gorilla Glue #4"
strain: "[[Gorilla Glue 4]]"
strain_id: gorilla-glue-4
classification: hybrid
classification_detail: indica-dominant
sativa_pct: 35
lineage_confidence: high
package_says: indica
thc_pct: 26.4
cbd_pct: null
brand: null
product_form: flower
scan_method: text
match_score: 0.96
barcode: null
barcode_format: null
qr_payload: null
effects:
  - relaxed
  - euphoric
rating: 4
date_scanned: 2026-10-25T18:42:11-07:00
data_version: "2026.10.25-a1b2c3"
algo_version: 1
tags:
  - flowerscan/scan
  - type/hybrid
  - effect/relaxed
  - effect/euphoric
---

# Gorilla Glue #4 · scanned 2026-10-25

**Hybrid · Indica-dominant** (35% sativa) · Package says: **Indica** · THC 26.4%

Strain note: [[Gorilla Glue 4]]

%% flowerscan:user-notes %%
## My notes
Rating: ★★★★☆

```

- `thc_pct` / `cbd_pct` come from the package (this batch), not from the strain.
- An unidentified scan has `strain_id: null`, `strain: null`, `classification: unknown`, and its body
  shows the raw text we read. It never contains guessed values.

## Re-export and merge (idempotency)

When a note with the same `id` already exists (zip import, or the plugin later):
1. Replace the frontmatter and the app-owned body above the marker.
2. Keep everything below `%% flowerscan:user-notes %%` byte-for-byte.
3. If the marker is missing (the user deleted it), don't touch the body. Update the frontmatter only.

## Delivery methods

| Method | MVP | Notes |
| --- | --- | --- |
| Copy Markdown | ✔ | Clipboard API. Toast "Copied". |
| Download `.md` | ✔ | Blob download with the sanitized filename. |
| Download `.zip` (whole journal) | ✔ | Folder layout as above; strain notes deduplicated. |
| Open in Obsidian | ✔ | `obsidian://new?vault=<name>&file=<path>&content=<md>`. The vault name comes from settings. Very long notes may exceed URL limits, so fall back to copy and tell the user. |
| Web Share (file) | Should | `navigator.share({ files })` where supported. |
| Obsidian plugin sync | Phase 3 | True two-way sync via the user's account. |

## Golden-file tests (T-016)

`packages/core/test/markdown/__golden__/` holds expected `.md` outputs for: a fully traced strain, a
partial-lineage strain, a strain with zero tags, an unidentified scan, a scan with all package facts,
and a merge that preserves user notes. Serializer changes must update these files deliberately.
