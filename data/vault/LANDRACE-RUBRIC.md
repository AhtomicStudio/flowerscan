# Landrace Base-Value Rubric

> **Status: rules decided** (P10, then L1 and L2 on 2026-10-26; applied in T-027). T-007 refined the wording with
> sources (see "Sources behind the rubric" and "Interpretation" below). Each value below still needs a founder to
> set `verification: verified` on its note. Every landrace's `base_sativa_pct` must follow this file.

Every result in the app ultimately rests on these values, and no study publishes "sativa %" per landrace
([domain review §1.5](../../docs/research/2026-10-26-domain-review.md#15-is-the-landrace-base_sativa_pct-approach-defensible)).
So they're a **documented curatorial convention**: coarse on purpose, written down, sourced, and reviewed.

## Allowed values

Only these five. Fine-grained numbers like 83 imply precision we don't have.

| Value | Rule |
| --- | --- |
| **90** | Described in ethnobotanical or peer-reviewed literature as belonging to the **narrow-leaf drug type** (McPartland & Small's var. *indica*, the vernacular "Sativa"): late maturing / long-flowering, **and** the line described shows no documented broad-leaf influence. |
| **75** | Narrow-leaf drug type as above, **but** with documented broad-leaf influence in the line described. |
| **50** | A source explicitly describes the population as **mixed** or intermediate. Never used as a default. |
| **25** | Described as **mostly broad-leaf** drug type, with documented narrow-leaf influence in the line described. |
| **10** | Described as the **broad-leaf drug type** (var. *afghanica*, the vernacular "Indica") of the Afghanistan / Pakistan / Turkestan hashish region, or an equivalent, with no documented narrow-leaf influence in the line described. |

**No fitting source → no value.** Leave `base_sativa_pct` empty. The landrace's descendants then fall back to
their own `reported_type` and show as partly traced.

## Sources (two per value)
1. An **ethnobotanical or peer-reviewed** source for the region's drug-type group.
2. A **breeder or seed-bank description** of the specific line (a magazine profile alone doesn't count; it can
   still back `reported_type`). A product brand's page (e.g. a pre-roll brand) is not a line description either:
   it can back `reported_type` only.

Record both in the note's `sources:` with `supports: [base_sativa_pct]`, and explain the choice in the note body.

## Sources behind the rubric
- **McPartland J.M., Small E. (2020).** *A classification of endangered high-THC cannabis (Cannabis sativa subsp.
  indica) domesticates and their wild relatives.* PhytoKeys 144:81–112. Open access, CC BY 4.0.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC7148385 (read 2026-10-26 in T-007, re-read 2026-10-26 in T-027). What
  it supports:
  - The vernacular "Sativa" = var. *indica*: a South Asian, narrow-leaflet domesticate, generally late maturing,
    originally cultivated in India and spread early to Southeast Asia, Africa and the Americas.
  - The vernacular "Indica" = var. *afghanica*: a Central Asian, wide-leaflet domesticate, generally early
    maturing, limited before the 1970s to Afghanistan, Pakistan and Turkestan.
  - It uses Hillig's (2005) narrow-leaflet (NLD) and wide-leaflet (WLD) drug-type terms for the same split.
  - Caveats it documents: intermediate forms are common in specimens from Pakistan; Central Asian landraces were
    introduced into Thailand, Jamaica and Nepal in the 1970s and into South Africa in the 1980s.
  - Limits: it doesn't discuss Colombian or Mexican landraces (Mexico appears only in a citation about importing
    "Mexican Gold" into Afghanistan and in a synonym list), so for the Americas it supports the regional group only.
- **Not read** (so not used): Hillig 2005 (*Genetic Resources and Crop Evolution*), Clarke & Merlin 2013
  (*Cannabis: Evolution and Ethnobotany*). Both PDFs found were not readable as text in this session.

## Interpretation
- **Documented influence is judged on the specific line cited, not the whole country** (L1, decided 2026-10-26).
  Country-level reports, such as McPartland & Small's 1970s introductions into Thailand or 1980s introductions
  into South Africa, go in the note body as context but don't change the value. Example: ACE Seeds' Chiang Mai
  line shows no broad-leaf influence, so the Thai landrace gets 90.
- **Origin latitude doesn't decide the value** (L2, decided 2026-10-26). There is no tropical vs. sub-tropical
  test any more: a narrow-leaf landrace from outside the tropics (e.g. Durban, about 30° S) gets 90 unless the line
  cited shows documented broad-leaf influence, and only then 75.
- **When several lines are sold under one landrace name and disagree** (T-027 proposal, needs founder
  confirmation): cite the line that the breeder or seed bank presents as a traditional, unhybridised population
  (typically regular seeds), and describe the other lines in the note body. A line that names a broad-leaf parent
  or a cross belongs on a `strain` node (see Durban Poison), not on the landrace.
- **Named traditional landraces** ("Colombian Gold", "Acapulco Gold") are landrace nodes when sources treat them as
  imported traditional populations. Their modern seed packs are separate `strain` nodes.

## Current values (all `unverified`: a founder sets `verified`)

| Landrace | Value | Ethnobotanical source | Line source | Status | Closest call |
| --- | --- | --- | --- | --- | --- |
| Afghan landrace | 10 | McPartland & Small 2020 | Sensi Seeds (Afghani #1, Afghan Kush) | Founder-approved value 2026-10-26, awaiting `verified` | |
| Hindu Kush landrace | 10 | McPartland & Small 2020 | ACE Seeds (Pakistan Chitral Kush) | Founder-approved value 2026-10-26 (L3), awaiting `verified` | Pakistan intermediates are country-level (L1) |
| Thai landrace | 90 | McPartland & Small 2020 | ACE Seeds (Thai Chiang Mai) | Founder-approved value 2026-10-26 (L4), awaiting `verified` | 1970s introductions are country-level (L1) |
| Colombian Gold | 90 | McPartland & Small 2020 | World of Seeds (Colombian Gold) | Founder-approved value 2026-10-26, awaiting `verified` | Regional source only; the line lists 65–75 days indoors |
| South African landrace | 90 | McPartland & Small 2020 | ACE Seeds / Khalifa Genetics (Durban Poison 80s) | Founder-approved value 2026-10-26 (L2), awaiting `verified` | Dutch Passion's line names an indica parent: a `strain`-level dispute |
| Acapulco Gold | 90 | McPartland & Small 2020 | The Landrace Team (Acapulco Gold) | Founder-approved value 2026-10-27, awaiting `verified` | Regional source only; other seed lines differ (see note) |

## Out of scope
- **Ruderalis / autoflower:** excluded from v1 (P1). No values, no notes.
- **Place-named seed lines** ("Afghani #1", "Durban Poison") are `strain` nodes with a landrace parent, not landraces.

## Review
`vault-build` flags every landrace value in the build report. A founder approves each one by setting
`verification: verified`.
