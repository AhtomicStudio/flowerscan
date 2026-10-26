# Landrace Base-Value Rubric (draft)

> **Status: draft** (decision P10, 2026-10-26). T-007 finalizes the wording with sources, and the founders
> approve it. Every landrace's `base_sativa_pct` must follow this file.

Every result in the app ultimately rests on these values, and no study publishes "sativa %" per landrace
([domain review §1.5](../../docs/research/2026-10-26-domain-review.md#15-is-the-landrace-base_sativa_pct-approach-defensible)).
So they're a **documented curatorial convention**: coarse on purpose, written down, sourced, and reviewed.

## Allowed values

Only these five. Fine-grained numbers like 83 imply precision we don't have.

| Value | Rule (draft) |
| --- | --- |
| **90** | Described in ethnobotanical or peer-reviewed literature as a **narrow-leaf drug type**: long-flowering, equatorial or tropical origin. |
| **75** | Described as **mostly narrow-leaf** drug type, with documented broad-leaf influence or a sub-tropical origin. |
| **50** | A source explicitly describes the population as **mixed** or intermediate. Never used as a default. |
| **25** | Described as **mostly broad-leaf** drug type, with documented narrow-leaf influence. |
| **10** | Described as a **broad-leaf drug type** of the Afghanistan/Pakistan hashish region, or an equivalent. |

**No fitting source → no value.** Leave `base_sativa_pct` empty. The landrace's descendants then fall back to
their own `reported_type` and show as partly traced.

## Sources (two per value)
1. An **ethnobotanical or peer-reviewed** source for the region's drug-type group (e.g. Clarke & Merlin 2013;
   Hillig 2005).
2. A **breeder or seed-bank description** of the specific line.

Record both in the note's `sources:` with `supports: [base_sativa_pct]`, and explain the choice in the note body.

## Out of scope
- **Ruderalis / autoflower:** excluded from v1 (P1). No values, no notes.
- **Place-named seed lines** ("Afghani #1", "Durban Poison") are `strain` nodes with a landrace parent, not landraces.

## Review
`vault-build` flags every landrace value in the build report. A founder approves each one by setting
`verification: verified`.
