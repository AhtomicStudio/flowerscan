# Data Model

There are two worlds:

- **Reference data** (curated, shared, read-only in the app): strains, landraces, crosses, breeders, taxonomy.
  Authored in `data/vault`, compiled to JSON.
- **User data** (personal, on-device): scans, ratings, notes, local barcode memory. Stored in IndexedDB and
  exported to Markdown.

Field names below are canonical. Zod schemas in `packages/core` (T-002) must match this file exactly. If you
change a field, change this doc in the same commit.

**Validation conventions** (`@flowerscan/core` schemas, T-002):
- Every schema rejects unknown keys, so typos and derived fields fail loudly instead of being ignored.
- In vault notes, an optional field may be omitted or `null` (the templates write `null` for empty fields).
  User data and build output write every key, with `null` for unknown values.
- Required strings must not be blank. Validation never trims or rewrites a value.
- ISO date = `YYYY-MM-DD`. ISO datetime = ISO 8601 with `Z` or a `±hh:mm` offset.

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
| `id` | slug string | ✔ | Lowercase kebab (`^[a-z0-9]+(-[a-z0-9]+)*$`), **immutable** once published. `unknown` is reserved (it marks an undisclosed parent). See ID rules. |
| `schema_version` | int | ✔ | Currently `1`. |
| `name` | string | ✔ | Display name exactly as commonly written, e.g. `Gorilla Glue #4`. |
| `aliases` | string[] | | Native Obsidian property. Other names for **the same plant**: abbreviations, renames (trademark or regulator), nicknames, common misspellings: `["GG4", "Original Glue"]`. Used by the matcher. **Not** for sibling phenos or other cuts (`Chem 91` is not an alias of `Chemdawg`; `Gelato #33` is not an alias of `Gelato`), and not for names used inconsistently across markets. Those stay separate nodes or go to "Which one?". |
| `parents` | (wikilink \| `"unknown"`)[] | ✔ | e.g. `["[[Strain A]]", "[[Strain B]]"]`. Use `"unknown"` for an undisclosed parent. A landrace has `[]` (recursion stops there), a strain has at least one entry (`["unknown"]` if undisclosed), and a cross has at least two. A numbered pheno lists the **seed line's parents** when they're sourced (P7). |
| `parent_weights` | number[] | | Same length as `parents`, each weight in (0, 1], sums to 1 (±0.001). Omit for equal weights. |
| `derivation` | `cross \| s1 \| cut \| pheno` | ✔ if one parent | Default `cross` for 2+ parents (omit it or write `cross`; nothing else is valid there). Single-parent nodes must say which: `s1` (selfed seeds), `cut` (a clone of the parent), `pheno` (a selection whose only parent is its seed line); `cross` is invalid with one parent. Exception: a lone `"unknown"` parent (undisclosed lineage) may omit it. No parents → no `derivation`. Drives generation decay (docs/05, P7). |
| `reported_type` | `indica \| indica-dominant \| balanced \| sativa-dominant \| sativa \| unknown` | ✔ | What the breeder or reliable sources *say*. Used when lineage is incomplete, and shown for comparison. |
| `base_sativa_pct` | `10 \| 25 \| 50 \| 75 \| 90` | landrace only | Coarse scale only, following `data/vault/LANDRACE-RUBRIC.md`, with two sources (P10): a value needs at least two entries in `sources` with `supports: [base_sativa_pct]`, whatever the `verification`. No fitting source → leave it empty. Rejected on strains and crosses. No ruderalis landraces in v1 (P1). |
| `region` | string | landrace only | Where the population comes from, as the sources describe it (in the landrace template). Rejected on strains and crosses. |
| `breeder` | wikilink | | `"[[Breeder Name]]"` |
| `effects` | taxonomy slug[] | | Facet `effect`. Only with a source in `sources` that `supports: [effects]`. |
| `flavors` | taxonomy slug[] | | Facet `flavor`. Same provenance rule. |
| `terpenes` | taxonomy slug[] | | Facet `terpene`. Commonly reported dominant terpenes; same rule. |
| `typical_thc_pct` | `{min, max}` | | Percent, 0–100, `min ≤ max`. Only if sourced. **Internal only, never displayed or shipped** (P2). It may later be filled from the potency table. |
| `sources` | Source[] | ✔ for `verified` | See below. |
| `verification` | `unverified \| verified \| disputed` | ✔ | Only `verified` and `disputed` nodes ship to the app by default. Policy is in T-006. |
| `created` / `updated` | ISO date | ✔ | `updated` is not earlier than `created`. |

The note body is free Markdown (curator notes, history, disputes). It does not ship to the app in MVP.

**No derived fields in the source vault.** The computed lineage (`sativa_pct`, label, confidence) is written
only to build output and user exports, never back into `data/vault`.

### Source

| Field | Type | Notes |
| --- | --- | --- |
| `url` | http(s) URL | Or `ref` for a book/print source. At least one of `url` and `ref` is required. |
| `ref` | string | Citation for a book or print source. |
| `title` | string | |
| `retrieved` | ISO date | |
| `supports` | (`parents` \| `reported_type` \| `effects` \| `flavors` \| `terpenes` \| `typical_thc_pct` \| `aliases` \| `base_sativa_pct`)[] | Which fields this source backs. May be empty while drafting (the source then backs nothing). |

### Breeder (`kind: breeder`)

`kind: breeder`, `id`, `schema_version`, `name`, `aliases?`, `website?` (http(s) URL), `sources?`, `created`, `updated`
(as in `data/vault/_templates/breeder.md`). Used for display and to disambiguate strains with the same name.

### Taxonomy term (`data/taxonomy/taxonomy.yaml`)

| Field | Type | Notes |
| --- | --- | --- |
| `slug` | string | Stable, kebab. Becomes the tag `#effect/<slug>`. |
| `facet` | `effect \| flavor \| terpene` | |
| `label` | string | UI text, e.g. "Creative". |
| `polarity` | `positive \| neutral \| negative` | Required on every term (T-003). For effects, e.g. `dry-mouth` is negative. Shown honestly, not hidden. Flavors and terpenes are normally `neutral`. |
| `description` | string | One hedged sentence for tooltips. Must pass compliance rules. |
| `synonyms` | string[] | Optional. Inputs that map to this term when importing sources. |
| `status` | `active \| deprecated` | Never delete a slug; deprecate and point to `replaced_by`. |
| `replaced_by` | slug | Required when `deprecated`, absent when `active`. Never the term's own slug. |

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

- `id`: derived from `name` at creation with `slugify(name)`. Lowercase, ASCII, `[a-z0-9-]`; `#4` → `4`; `&` → `and`;
  `×` → `x`; diacritics are stripped (`Crème` → `creme`, `ß` → `ss`, `ø` → `o`); apostrophes are dropped
  (`Jack's` → `jacks`); every other run of non-alphanumeric characters becomes one `-`, with none at the ends.
  Example: `Gorilla Glue #4` → `gorilla-glue-4`. A name with no Latin letters or digits can't be slugified,
  so the curator picks the id. **Never changes** after it ships (exports and links
  depend on it). On a collision, add the breeder slug: `blue-dream-<breeder>`.
- Vault filename: `sanitizeFilename(name)` + `.md`. Each Obsidian-unsafe character (`\ / : * ? " < > | # ^ [ ]`)
  and each control character becomes a space, runs of whitespace collapse to one space, leading and trailing
  dots and spaces are dropped, and the result is NFC-normalized: `Gorilla Glue 4.md`, and `Strain A/B` →
  `Strain A B.md`. The exact name is kept in `name` and `aliases`.
- Cross notes: `Strain A x Strain B.md`, `kind: cross`. Keep the parent order the source gives (by
  convention the mother, or seed parent, comes first). Don't reorder alphabetically.

---

## Build output (`apps/web/public/data/<content-hash>/`)

- `manifest.json` (`BuildManifest`): `{ data_version, built_at, algo_version, taxonomy_version, counts, hash }`.
  `data_version` is a non-blank string (e.g. `2026.10.25-a1b2c3`), `built_at` an ISO datetime, `algo_version`
  and `taxonomy_version` ints ≥ 1, `counts` is `{ strains, landraces, crosses, taxonomy_terms }` (ints ≥ 0), and
  `hash` is the lowercase hex content hash (8–64 characters).
- `strains.json` (`StrainRecord[]`, ids unique): the array of searchable nodes (strains plus landraces) with
  `id, name, aliases, kind, parents, parent_weights, derivation, reported_type, breeder_id, effects, flavors,
  terpenes, verification, lineage{…}, source_count`. Crosses are inlined as lineage tree nodes, not search
  entries. `typical_thc_pct` is **not** shipped (P2: potency is never user-facing), and neither are
  `sources`, `base_sativa_pct`, or `region`.
- `taxonomy.json`
- `build-report.md` (not shipped): warnings such as missing parents, unresolved links, unsourced tags,
  near-duplicate names, cycles (cycles are errors).

`StrainRecord` fields (every key present):

| Field | Type | Notes |
| --- | --- | --- |
| `id`, `name` | as in the vault | |
| `aliases`, `effects`, `flavors`, `terpenes` | string[] | `[]` when empty. Tags are only the sourced ones (the build strips the rest). |
| `kind` | `strain \| landrace` | Crosses are never search entries. |
| `parents` | (id \| `"unknown"` \| inline cross)[] | Wikilinks resolved to ids. An unnamed `cross` parent is inlined as an object (below), so the tree can be drawn without crosses being search entries. Same count rules as the vault. |
| `parent_weights` | number[] \| null | As in the vault; `null` for equal weights. |
| `derivation` | `cross \| s1 \| cut \| pheno \| null` | **Resolved:** `cross` is written out for 2+ parents. `null` only with no parents or a lone `"unknown"` parent. |
| `breeder_id` | id \| null | The breeder note's `id`. |
| `verification`, `reported_type` | as in the vault | |
| `lineage` | lineage object | Computed by the build (docs/05). |
| `source_count` | int ≥ 0 | Number of sources on the vault note. |

**Inline cross** (a parent entry): `{ kind: "cross", id, name, parents, parent_weights, derivation: "cross",
reported_type, verification, lineage }`, with the same `parents` rules, recursively (backcrosses nest).

`lineage` object (also used in exports):

| Field | Type | Notes |
| --- | --- | --- |
| `sativa_pct` | 0–100 int \| null | null when unknown |
| `indica_pct` | 0–100 int \| null | `100 - sativa_pct`; null exactly when `sativa_pct` is |
| `label` | `indica \| hybrid \| sativa \| unknown` | `unknown` exactly when `sativa_pct` is null |
| `sublabel` | `indica-dominant \| balanced \| sativa-dominant \| null` | Set for `hybrid`, null otherwise |
| `confidence` | 0–1 | `0` when unknown (not null) |
| `confidence_level` | `high \| medium \| low \| none` | `none` exactly when `confidence` is 0 |
| `method` | `traced \| partial \| reported \| unknown` | How the number was produced; `unknown` exactly when `sativa_pct` is null |
| `algo_version` | int ≥ 1 | |

The schema checks these consistency rules only. Label bands and confidence thresholds are product-tunable
constants in `core/src/lineage/constants.ts` (T-005), so they're tested there, not in the schema.

Algorithm: [05-classification-algorithm.md](05-classification-algorithm.md).

---

## User data (IndexedDB via Dexie)

### Scan

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | `scan_<ulid>` (26-character Crockford base32, uppercase) |
| `schema_version` | int | Currently `1` |
| `date_scanned` | ISO datetime with offset | |
| `scan_method` | `text \| barcode \| qr \| manual \| link` | |
| `strain_id` | string \| null | null = saved as "unidentified", and then `lineage.label` is `unknown` |
| `strain_name` | string | Snapshot of the display name at scan time |
| `lineage` | lineage object | Snapshot at scan time, so exports stay stable when the data updates |
| `data_version` | string | Which dataset produced the result |
| `match_score` | 0–1 | |
| `package_says` | `indica \| sativa \| hybrid \| null` | Label claim read from the package. Three values only (P3): "dominant" variants map to `hybrid`. |
| `potency_readings` | PotencyReading[] | Every potency figure printed on the package, **exactly as printed** (P2). Batch-specific. **Never shown in the UI.** |
| `brand` | string \| null | If detected or entered |
| `product_form` | `flower \| pre-roll \| vape \| edible \| concentrate \| other \| null` | |
| `barcode` | string \| null | Raw value. Required when `scan_method` is `barcode`. |
| `barcode_format` | string \| null | One of the docs/06 formats except `qr_code`: `ean_13 \| ean_8 \| upc_a \| upc_e \| code_128 \| code_39 \| data_matrix \| pdf417`. Set exactly when `barcode` is. |
| `qr_payload` | string \| null | Raw value. Required when `scan_method` is `qr`. |
| `ocr_text` | string \| null | Raw OCR text; kept locally for debugging and re-matching. Never uploaded. |
| `rating` | 1–5 int \| null | User's |
| `notes` | string | User's Markdown |

Scan images are **not** stored by default. An opt-in "keep photo" setting may come later.

### PotencyReading

| Field | Type | Notes |
| --- | --- | --- |
| `analyte` | `total_thc \| thca \| delta9_thc \| thc_unspecified \| total_cbd \| cbda \| cbd \| total_cannabinoids` | What the label called it. `thc_unspecified` when it just says "THC". |
| `value` | number \| null | null exactly for `nd` / `below_loq`. ≥ 0, and at most 100 (`percent`) or 1000 (`mg_per_g`). |
| `qualifier` | `exact \| nd \| below_loq \| less_than` | How it was printed (`<1%` → `less_than`) |
| `unit` | `percent \| mg_per_g` | As printed. Never converted. |
| `raw` | string | The exact OCR text it came from |

Never computed (no Total THC from THCa), never rounded, never shown to users.

### Local barcode memory

`{ barcode, barcode_format, strain_id, confirmed_at, times_seen, learnable }`: `barcode` (raw string),
`barcode_format` (as on Scan), `strain_id` (the confirmed strain), `confirmed_at` (ISO datetime), `times_seen`
(int ≥ 1, separate scans), `learnable` (boolean). Used to skip OCR next time.
Track-and-trace UIDs are never stored. UPC/EAN values are learnable once confirmed. Other Code 128 values become
`learnable` only after a second, separate scan (`times_seen ≥ 2`), and other formats never are (P13, docs/06).
Phase 2 can optionally contribute these to a shared, moderated mapping.

### Settings

`{ age_confirmed_at, theme, default_mode, haptics, last_backup_at }`: `age_confirmed_at` (ISO datetime, or `null`
until the age gate is passed), `theme` (`system | dark | light`), `default_mode` (`auto | text | barcode | qr`,
the scanner modes in docs/02), `haptics` (boolean), `last_backup_at` (ISO datetime or `null`). Defaults belong
to T-017.

### Journal backup file

`flowerscan-backup-YYYY-MM-DD.json`: `{ format: "flowerscan-backup", schema_version, exported_at,
scans: Scan[], barcode_memory: BarcodeMemory[], settings: Settings }`. `exported_at` is an ISO datetime. A file
never holds two scans with the same `id`, or two memories for the same `barcode_format` + `barcode`. Restoring
validates it with zod, merges by `id` (newer `date_scanned` wins on conflict), and never silently drops records.

---

## Back-of-house data (internal, never shipped to the app)

### Potency observations (`data/observations/potency/`, P2)

An internal table of reported potency per strain, across brands, states and time, for our own database and
future projects. **Not user-facing**, and `vault-build` never ships it.

One YAML file per observation, `YYYY-MM-DD-<strain-id>-<brand-slug>.yaml`:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | `obs_<ulid>` |
| `strain_id` | string | Must resolve in the vault |
| `name_on_package` | string | Exactly as printed |
| `brand` | string \| null | As printed |
| `state` | US state code \| null | Where the package was sold. Uppercase USPS code: the 50 states, `DC`, and the territories (`PR VI GU MP AS`). |
| `product_form` | as in Scan | |
| `observed_on` | ISO date | When the package was recorded |
| `packaged_on` / `batch` | string \| null | If printed |
| `readings` | PotencyReading[] | Exactly as printed. At least one. |
| `source` | `founder_record \| eval_set \| user_opt_in` | `user_opt_in` only exists from Phase 2: the schema **rejects** it until the opt-in ships. |
| `recorded_by` | string | Founder name or `eval-import` |
| `evidence` | string \| null | Repo-relative path to a golden-set photo under `data/eval/`, if any (no `..`). Never a user photo. |

**Sources:** now, only packages the founders record: golden-set photos (`data/eval`) and founders' own scans,
imported from a founder's journal backup file. Phase 2 adds an anonymous, explicit **user opt-in** (no photo,
no identity, no location finer than state). See [09-compliance-and-privacy.md](09-compliance-and-privacy.md).
Tooling: T-025.

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
   supporting source are stripped by the build. The schema enforces this for claims that are actually
   made: a `verified` node needs at least one source, a source with `supports: [parents]` when it names a
   parent (anything but `"unknown"`), and one with `supports: [reported_type]` when `reported_type` isn't
   `unknown`. "Unknown" isn't a fact, so it needs no source, and a landrace (no parents) only needs the
   `reported_type` backing. A landrace `base_sativa_pct` needs two sources regardless (P10).
4. **Disagreement is data.** If sources conflict, mark `verification: disputed`, record both in the body,
   choose the best-supported lineage, and let the UI say "lineage disputed".
5. **AI-assisted curation is allowed, AI-invented facts are not.** An agent may find and summarize
   sources. It may never fill in a field without a source URL it actually read.
6. Get a legal review of the data plan before public launch (see [open-questions.md](open-questions.md)).
