# Landrace Base-Value Rubric (draft)

> **Status: draft** (decision P10, 2026-10-26). T-007 refined the wording with sources on 2026-10-26 (see
> "Sources behind the rubric" and "Interpretation" below). The founders approve the rubric and every value.
> Every landrace's `base_sativa_pct` must follow this file.

Every result in the app ultimately rests on these values, and no study publishes "sativa %" per landrace
([domain review §1.5](../../docs/research/2026-10-26-domain-review.md#15-is-the-landrace-base_sativa_pct-approach-defensible)).
So they're a **documented curatorial convention**: coarse on purpose, written down, sourced, and reviewed.

## Allowed values

Only these five. Fine-grained numbers like 83 imply precision we don't have.

| Value | Rule |
| --- | --- |
| **90** | Described in ethnobotanical or peer-reviewed literature as belonging to the **narrow-leaf drug type** (McPartland & Small's var. *indica*, the vernacular "Sativa"): late maturing / long-flowering, from an equatorial or tropical region, **and** the line described shows no documented broad-leaf influence. |
| **75** | Narrow-leaf drug type as above, **but** with documented broad-leaf influence in the line described, **or** a sub-tropical origin (outside the tropics). |
| **50** | A source explicitly describes the population as **mixed** or intermediate. Never used as a default. |
| **25** | Described as **mostly broad-leaf** drug type, with documented narrow-leaf influence in the line described. |
| **10** | Described as the **broad-leaf drug type** (var. *afghanica*, the vernacular "Indica") of the Afghanistan / Pakistan / Turkestan hashish region, or an equivalent, with no documented narrow-leaf influence in the line described. |

**No fitting source → no value.** Leave `base_sativa_pct` empty. The landrace's descendants then fall back to
their own `reported_type` and show as partly traced.

## Sources (two per value)
1. An **ethnobotanical or peer-reviewed** source for the region's drug-type group.
2. A **breeder or seed-bank description** of the specific line (a magazine profile alone doesn't count; it can
   still back `reported_type`).

Record both in the note's `sources:` with `supports: [base_sativa_pct]`, and explain the choice in the note body.

## Sources behind the rubric
- **McPartland J.M., Small E. (2020).** *A classification of endangered high-THC cannabis (Cannabis sativa subsp.
  indica) domesticates and their wild relatives.* PhytoKeys 144:81–112. Open access, CC BY 4.0.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC7148385 (read 2026-10-26). What it supports:
  - The vernacular "Sativa" = var. *indica*: a South Asian, narrow-leaflet domesticate, generally late maturing,
    originally cultivated in India and spread early to Southeast Asia, Africa and the Americas.
  - The vernacular "Indica" = var. *afghanica*: a Central Asian, wide-leaflet domesticate, generally early
    maturing, limited before the 1970s to Afghanistan, Pakistan and Turkestan.
  - It uses Hillig's (2005) narrow-leaflet (NLD) and wide-leaflet (WLD) drug-type terms for the same split.
  - Caveats it documents: intermediate forms are common in specimens from Pakistan; Central Asian landraces were
    introduced into Thailand, Jamaica and Nepal in the 1970s and into South Africa in the 1980s.
  - Limits: it doesn't discuss Colombia or Mexico by name, so for the Americas it supports the regional group only.
- **Not read** (so not used): Hillig 2005 (*Genetic Resources and Crop Evolution*), Clarke & Merlin 2013
  (*Cannabis: Evolution and Ethnobotany*). Both PDFs found were not readable as text in this session.

## Interpretation (T-007, needs founder confirmation)
- **"Documented influence" is judged on the line described**, not the whole country. Example: McPartland & Small
  report 1970s introductions into Thailand, but ACE Seeds' Chiang Mai line shows no broad-leaf influence, so the
  Thai landrace gets 90. If founders prefer the country-level reading, Thai becomes 75.
- **Tropical vs. sub-tropical** is by latitude of the stated origin (inside the tropics → may be 90).
- **Named traditional landraces** ("Colombian Gold", "Acapulco Gold") are landrace nodes when sources treat them as
  imported traditional populations. Their modern seed packs are separate `strain` nodes.

## Current values (all `unverified`, founder review required)

| Landrace | Value | Ethnobotanical source | Line source | Closest call |
| --- | --- | --- | --- | --- |
| Afghan landrace | 10 | McPartland & Small 2020 | Sensi Seeds (Afghani #1, Afghan Kush) | |
| Hindu Kush landrace | 10 | McPartland & Small 2020 | ACE Seeds (Pakistan Chitral Kush) | Pakistan intermediates (25?) |
| Thai landrace | 90 | McPartland & Small 2020 | ACE Seeds (Thai Chiang Mai) | 1970s introductions (75?) |
| Colombian Gold | 90 | McPartland & Small 2020 | World of Seeds (Colombian Gold) | Regional source only |
| South African landrace | 75 | McPartland & Small 2020 | Dutch Passion (Durban Poison) | **Closest: 75 vs 90** |
| Acapulco Gold | none | McPartland & Small 2020 | none found | No second source |

## Out of scope
- **Ruderalis / autoflower:** excluded from v1 (P1). No values, no notes.
- **Place-named seed lines** ("Afghani #1", "Durban Poison") are `strain` nodes with a landrace parent, not landraces.

## Review
`vault-build` flags every landrace value in the build report. A founder approves each one by setting
`verification: verified`.
