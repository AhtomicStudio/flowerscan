---
id: T-007
title: Seed dataset (landraces + first strains)
milestone: M1
status: review
owner: data-curator
depends_on: [T-002]
touches: [data/vault/landraces/, data/vault/strains/, data/vault/crosses/, data/vault/breeders/, data/vault/SOURCES.md, data/vault/LANDRACE-RUBRIC.md]
docs: [data/vault/README.md, docs/04-data-model.md, docs/09-compliance-and-privacy.md]
---

## Goal
A first real dataset: the foundational landraces plus the 50 most commonly sold strains, each sourced,
so the vertical slice runs on real data. (Launch target: 150–300, follow-up tasks.)

## Requirements
- No existing database (Q2 answered 2026-10-25). We build from scratch.
- Choose the 50 strains by how commonly they appear on dispensary menus (document the method in `SOURCES.md`).
- Every `parents` and `reported_type` value cites a source the curator actually read. Prefer breeder sites
  and published references. Respect site terms. No scraping where prohibited.
- Landrace `base_sativa_pct` values: follow `data/vault/LANDRACE-RUBRIC.md` (coarse scale 10/25/50/75/90, two
  sources each, P10). Finalize the rubric wording with sources as part of this task. Document the reasoning in
  each note body. This is the most sensitive data in the system. Flag every value for founder review.
- Decisions to follow: no ruderalis landraces or autoflower strains (P1). Crosses sold under an "A x B" name are
  curated as searchable `strain` nodes (P4). Single-parent nodes set `derivation`, and numbered phenos list the
  seed line's parents when sourced (P7). Aliases cover only the same plant (docs/04).
- Disputed lineages: `verification: disputed`, both versions documented in the body.
- Tags only where a usable source supports them. Leaving `effects: []` is fine and expected.
- `SOURCES.md`: list of sources used, their license/terms notes, and how each was used.
- Status: the agent sets at most `unverified`. Only a human promotes to `verified`.

## Acceptance criteria
- [ ] `pnpm vault:check` passes (after T-006).
- [ ] 50 strain notes plus all ancestors needed to trace them (or explicit `unknown`).
- [ ] A founder has marked each note `verified` or `disputed` (Q4: AI drafts, founders approve), noted in the Log.
- [ ] Lineage snapshot (from T-005 tests) is generated for this dataset and committed.

## Out of scope
UI. Barcode mappings.

## Log
- 2026-10-26 (data-curator): claimed. Scope for this pass: lineage only (`parents`, `derivation`,
  `reported_type`, `breeder`, `aliases`, landrace `base_sativa_pct`). Tags stay `[]` until the taxonomy (T-003)
  lands.
- 2026-10-26 (data-curator): first pass done, `status: review`. No acceptance box is checked yet (details below).
  - **Notes written:** 78 strains, 6 landraces, 3 crosses, 15 breeders (102 files). Every note is `unverified` or
    `disputed`; none is `verified`. `effects`/`flavors`/`terpenes` are `[]` and `typical_thc_pct` is `null` everywhere.
  - **Selection** (method in `data/vault/SOURCES.md`): counted appearances in Headset-based US state and national
    top-seller lists. 30 strains from those lists are curated. The other 48 strain notes are ancestors, including
    classics that are also widely sold (OG Kush, GSC, Granddaddy Purple, Chemdawg, Skunk #1, Haze, Blueberry). 26 of the
    ancestors are stubs with `parents: ["unknown"]` and `reported_type: unknown`, citing the source that named them.
  - **Box 2 (50 strains + ancestors) is not met:** 30 of the target 50 sold strains. Dropped for lack of a usable source:
    Bananas, Brownie Scout, Mule Fuel, Bubba Fett, Lilac Diesel, Crescendo, Glueball, Head Cheese, Blueberry Muffin, Gelato
    Cake. Single-list strains not attempted yet: Gush Mints, Layer Cake, King Louis, Strawberry Banana, Alaskan Thunder
    Fuck, Snoop Dogg OG, Cherry Limeade, Gas Face, Jenny Kush, Kush Cake, LA Kush Cake, Afternoon Delight, Rainbow, Cream,
    Gastro Pop, Gorilla Pie, Florida Kush, Truffle, Star Cookies, Glitter Bomb, Orange 43, Frosted Kush, 92 Cookies,
    Golden Pineapple, OG Chem. Canada-only entries (Pink Kush, Jean Guy and others) were excluded as out of market.
    Proposed: a follow-up task for the next 20.
  - **Disputed (10):** Wedding Cake, Blue Dream, Sour Diesel, OG Kush, Girl Scout Cookies, Durban Poison, Haze,
    Jealousy, Pineapple Express, Pink Panties. Both versions are in each note body.
  - **Landrace values** (all need a founder look; table in `LANDRACE-RUBRIC.md`): Afghan 10, Hindu Kush 10, Thai 90,
    Colombian Gold 90, South African 75, Acapulco Gold left empty (no second fitting source). Closest calls: South
    African (75 vs 90), Thai (90 vs 75 if the 1970s introductions count), Hindu Kush (10 vs 25, Pakistan intermediates).
  - **Rubric:** refined `data/vault/LANDRACE-RUBRIC.md` wording with McPartland & Small (2020), as this task asks, and
    added `LANDRACE-RUBRIC.md` to `touches`. The key new rule for founders to confirm: "documented influence" is judged
    on the line described, not the whole country.
  - **Sources and terms:** Leafly, Cannigma, GreenState, Leaf Magazines and SeedFinder were excluded because their terms
    bar automated access, data mining or building competing databases. I opened three Leaf Magazines articles and one
    Cannigma page before checking their terms. None is cited in a note; two Leaf articles (Headset state lists) did
    shape the selection, which is disclosed in `SOURCES.md`.
  - **Known modelling gaps:** Jack Herer has `unknown` parents (Sensi names three components but not the cross order).
    Northern Lights computes as balanced (Thai x Afghan, equal weights) though the breeder says indica. Gelato #25/#33/#41
    use the P7 fallback (single `pheno` parent `Gelato`).
  - **Not run:** `pnpm vault:check` (stub until T-006). Frontmatter was written against
    `packages/core/src/schema/genetic-node.ts` and `breeder.ts` by hand; every wikilink was checked against a filename.
  - **Remaining boxes:** vault:check (after T-006), founder verification (Q4), lineage snapshot (after T-005).

### 2026-10-26 (coordinator, founder decisions)
Landrace values decided (open-questions L1–L5): specific-line rule; South African 90 (rubric's sub-tropical
clause removed); Hindu Kush 10; Thai 90; Acapulco Gold Sativa per Jeeter, pending a breeder/seed-bank source.
Vault edits are T-027. Flavors and terpenes are not tagged in the MVP (D3), so later seed batches tag effects only.
Notes stay `unverified` until a founder sets `verified` in Obsidian.
