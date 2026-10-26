# Data Model

There are two worlds:

- **Reference data** (curated, shared, read-only in the app): strains, landraces, crosses, breeders, taxonomy.
  Authored in `data/vault`, compiled to JSON.
- **User data** (personal, on-device): scans, ratings, notes, local barcode memory. Stored in IndexedDB and
  exported to Markdown.

Field names below are canonical. Zod schemas in `packages/core` (T-002) must match this file exactly. If you
change a field, change this doc in the same commit.

---

## Reference entities

### Genetic node (`kind: landrace | strain | cross`)

Every node in the family tree is one note in the vault.

| Kind | Meaning | Example |
| --- | --- | --- |
| `landrace` | A base population with a curator-assigned base value. Lineage recursion stops here. | an Afghan indica landrace |
| `strain` | A named cultivar that people buy and search for. | most notes |
| `cross` | An **unnamed intermediate** cross, needed so 3-way crosses and backcrosses can be expressed as a tree. Not searchable. | "Strain A x Strain B" |

| Field | Type | Req. | Notes |
| --- | --- | --- | --- |
| `kind` | `landrace \| strain \| cross` | ✔ | |
| `id` | slug string | ✔ | Lowercase kebab, **immutable** once published. See ID rules. |
| `schema_version` | int | ✔ | Currently `1`. |
| `name` | string | ✔ | Display name exactly as commonly written, e.g. `Gorilla Glue #4`. |
| `aliases` | string[] | | Native Obsidian property. Abbreviations, old names, common misspellings: `["GG4", "Original Glue"]`. Used by the matcher. |
| `parents` | (wikilink \| `"unknown"`)[] | ✔ (may be `[]` for landraces) | e.g. `["[[Strain A]]", "[[Strain B]]"]`. Use `"unknown"` for an undisclosed parent. One parent = a selection/pheno/S1. |
| `parent_weights` | number[] | | Same length as `parents`, sums to 1. Omit for equal weights. |
| `reported_type` | `indica \| indica-dominant \| balanced \| sativa-dominant \| sativa \| unknown` | ✔ | What the breeder or reliable sources *say*. Used when lineage is incomplete, and shown for comparison. |
| `base_sativa_pct` | 0–100 | landrace only | Curator-assigned, with a source. |
| `breeder` | wikilink | | `"[[Breeder Name]]"` |
| `effects` | taxonomy slug[] | | Facet `effect`. Only with a source in `sources` that `supports: [effects]`. |
| `flavors` | taxonomy slug[] | | Facet `flavor`. Same provenance rule. |
| `terpenes` | taxonomy slug[] | | Facet `terpene`. Commonly reported dominant terpenes; same rule. |
| `typical_thc_pct` | `{min, max}` | | Only if sourced. Display as "commonly reported". |
| `sources` | Source[] | ✔ for `verified` | See below. |
| `verification` | `unverified \| verified \| disputed` | ✔ | Only `verified` and `disputed` nodes ship to the app by default. Policy is in T-006. |
| `created` / `updated` | ISO date | ✔ | |

The note body is free Markdown (curator notes, history, disputes). It does not ship to the app in MVP.

**No derived fields in the source vault.** The computed lineage (`sativa_pct`, label, confidence) is written
only to build output and user exports, never back into `data/vault`.

### Source

| Field | Type | Notes |
| --- | --- | --- |
| `url` | string | Or `ref` for a book/print source. |
| `title` | string | |
| `retrieved` | ISO date | |
| `supports` | (`parents` \| `reported_type` \| `effects` \| `flavors` \| `terpenes` \| `typical_thc_pct` \| `aliases` \| `base_sativa_pct`)[] | Which fields this source backs. |

### Breeder (`kind: breeder`)

`id`, `name`, `aliases`, `website?`, `sources`. Used for display and to disambiguate strains with the same name.

### Taxonomy term (`data/taxonomy/taxonomy.yaml`)

| Field | Type | Notes |
| --- | --- | --- |
| `slug` | string | Stable, kebab. Becomes the tag `#effect/<slug>`. |
| `facet` | `effect \| flavor \| terpene` | |
| `label` | string | UI text, e.g. "Creative". |
| `polarity` | `positive \| neutral \| negative` | For effects, e.g. `dry-mouth` is negative. Shown honestly, not hidden. |
| `description` | string | One hedged sentence for tooltips. Must pass compliance rules. |
| `synonyms` | string[] | Inputs that map to this term when importing sources. |
| `status` | `active \| deprecated` | Never delete a slug; deprecate and point to `replaced_by`. |

**Starter vocabulary (draft for T-003, reviewed for compliance):**

- **effect:** relaxed, calm, uplifted, happy, euphoric, energetic, focused, creative, talkative, giggly,
  sleepy, hungry, tingly, aroused · negatives: dry-mouth, dry-eyes, dizzy, anxious, paranoid, couch-lock
- **flavor:** earthy, pine, woody, citrus, lemon, orange, berry, grape, tropical, sweet, vanilla, floral,
  herbal, mint, spicy, pepper, diesel, gas, skunk, cheese, coffee, chocolate
- **terpene:** myrcene, limonene, caryophyllene, pinene, linalool, terpinolene, humulene, ocimene

**Banned from the taxonomy entirely:** medical conditions and therapeutic claims (pain, insomnia,
anxiety relief, depression, stress relief, nausea, PTSD, appetite stimulant as a medical claim, etc.).
See [09-compliance-and-privacy.md](09-compliance-and-privacy.md).

### ID and filename rules

- `id`: derived from `name` at creation. Lowercase, ASCII, `[a-z0-9-]`; `#4` → `4`; `&` → `and`.
  Example: `Gorilla Glue #4` → `gorilla-glue-4`. **Never changes** after it ships (exports and links
  depend on it). On a collision, add the breeder slug: `blue-dream-<breeder>`.
- Vault filename: `name` with Obsidian-unsafe characters removed (`\ / : * ? " < > | # ^ [ ]`),
  e.g. `Gorilla Glue 4.md`, and the exact name kept in `name` and `aliases`.
- Cross notes: `Strain A x Strain B.md`, `kind: cross`.

---

## Build output (`apps/web/public/data/<content-hash>/`)

- `manifest.json`: `{ data_version, built_at, algo_version, taxonomy_version, counts, hash }`
- `strains.json`: the array of searchable nodes (strains plus landraces) with `id, name, aliases, kind,
  parents (as ids), reported_type, breeder_id, effects, flavors, terpenes, typical_thc_pct,
  verification, lineage{…}, source_count`. Crosses are inlined as lineage tree nodes, not search entries.
- `taxonomy.json`
- `build-report.md` (not shipped): warnings such as missing parents, unresolved links, unsourced tags,
  near-duplicate names, cycles (cycles are errors).

`lineage` object (also used in exports):

| Field | Type | Notes |
| --- | --- | --- |
| `sativa_pct` | 0–100 int \| null | null when unknown |
| `indica_pct` | 0–100 int \| null | `100 - sativa_pct` |
| `label` | `indica \| hybrid \| sativa \| unknown` | |
| `sublabel` | `indica-dominant \| balanced \| sativa-dominant \| null` | Only for `hybrid` |
| `confidence` | 0–1 | |
| `confidence_level` | `high \| medium \| low \| none` | |
| `method` | `traced \| partial \| reported \| unknown` | How the number was produced |
| `algo_version` | int | |

Algorithm: [05-classification-algorithm.md](05-classification-algorithm.md).

---

## User data (IndexedDB via Dexie)

### Scan

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | `scan_<ulid>` |
| `schema_version` | int | |
| `date_scanned` | ISO datetime with offset | |
| `scan_method` | `text \| barcode \| qr \| manual \| link` | |
| `strain_id` | string \| null | null = saved as "unidentified" |
| `strain_name` | string | Snapshot of the display name at scan time |
| `lineage` | lineage object | Snapshot at scan time, so exports stay stable when the data updates |
| `data_version` | string | Which dataset produced the result |
| `match_score` | 0–1 | |
| `package_says` | `indica \| sativa \| hybrid \| null` | Label claim read from the package |
| `thc_pct` / `cbd_pct` | number \| null | Read from the package (batch-specific) |
| `brand` | string \| null | If detected or entered |
| `product_form` | `flower \| pre-roll \| vape \| edible \| concentrate \| other \| null` | |
| `barcode` | string \| null | Raw value |
| `barcode_format` | string \| null | e.g. `upc_a`, `ean_13`, `code_128` |
| `qr_payload` | string \| null | Raw value |
| `ocr_text` | string \| null | Raw OCR text; kept locally for debugging and re-matching. Never uploaded. |
| `rating` | 1–5 \| null | User's |
| `notes` | string | User's Markdown |

Scan images are **not** stored by default. An opt-in "keep photo" setting may come later.

### Local barcode memory

`{ barcode, barcode_format, strain_id, confirmed_at, times_seen }`. Used to skip OCR next time.
Phase 2 can optionally contribute these to a shared, moderated mapping.

### Settings

`{ age_confirmed_at, theme, default_mode, haptics, last_backup_at }`

### Journal backup file

`flowerscan-backup-YYYY-MM-DD.json`: `{ format: "flowerscan-backup", schema_version, exported_at,
scans: Scan[], barcode_memory: BarcodeMemory[], settings: Settings }`. Restoring validates it with zod, merges
by `id` (newer `date_scanned` wins on conflict), and never silently drops records.

---

## Data sourcing & licensing policy

1. **Facts, not copy.** Lineage and names are facts. Descriptions, reviews, and photos from other sites are
   copyrighted, and we never copy them. Effect and flavor tags must come from sources we may use, or from
   our own aggregated user ratings (Phase 2).
2. **Respect terms of service.** Do not scrape sites whose terms forbid it. Prefer breeder sites,
   published books, lab data, and open datasets with compatible licenses (for example check Cannlytics
   datasets and their license per dataset).
3. **Every fact has a source.** A node can ship as `verified` only if `parents` and `reported_type`
   are each backed by at least one source (two independent sources preferred). Tags without a
   supporting source are stripped by the build.
4. **Disagreement is data.** If sources conflict, mark `verification: disputed`, record both in the body,
   choose the best-supported lineage, and let the UI say "lineage disputed".
5. **AI-assisted curation is allowed, AI-invented facts are not.** An agent may find and summarize
   sources. It may never fill in a field without a source URL it actually read.
6. Get a legal review of the data plan before public launch (see [open-questions.md](open-questions.md)).
