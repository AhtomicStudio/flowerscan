---
id: T-031
title: Fix the curator errors found by the T-030 pre-check
milestone: M1
status: backlog
owner: data-curator
depends_on: [T-030]
touches: [data/vault/strains/, data/vault/landraces/, data/vault/crosses/, data/vault/SOURCES.md]
docs: [docs/04-data-model.md, data/vault/SOURCES.md, data/review/precheck/]
---

## Goal
Correct the factual and tagging mistakes the fact-checkers found, so those notes can come back as `ready`.

## Requirements
Fix each item, citing only sources you actually read, then ask for a re-check (the edit makes the old pre-check
`stale`). Never set `verified`.
- **Body text not backed by its source:**
  - Blue Dream: "clone-only" isn't in a cited source.
  - Animal Face: High Times ties Fig Farms to Blue Face, not Animal Face.
  - Colombian Gold: the Sensi Skunk #1 article doesn't call Colombian Gold a landrace. High Times "25 Greatest"
    (already in the vault) does.
  - South African landrace: add the ACE/Khalifa page's "origins are unclear".
  - Garlic Breath: the listing does say "Breeder: ACC".
  - Glitter Bomb: the "Grape Gas #10" detail is Seeds Here Now quoting Leafly (excluded). Drop or reword it.
  - Cookies and Cream: High Times names Exotic Genetix; the Oreoz sentence points at an uncited listing.
  - Gelato 25: "Mother of Biscotti" overstates the source.
- **`supports:` tags that back the competing version:** Blue Dream (Cannabis Now names Super Silver Haze),
  Pineapple Express (G13), Orange 43 (Klutch), Pink Panties (2023 High Times mother), Wedding Cake (the
  reported_type source describes the other lineage). Move each to the version it supports, or drop the tag.
- **Unsourced field:** Thin Mint GSC `breeder: [[Cookie Fam Genetics]]`.
- **OG Kush:** the High Times 2016 version is an S1 of Chem 91 (its own node), not Chemdawg.
- **Strawberry Banana:** an effect source makes medical claims; apply the same rule used for Seeds Here Now.
- **Source titles:** replace "Theory Wellness" with "Theory (theorywellness.org)" in source titles, to match bodies.

## Acceptance criteria
- [ ] Every item fixed or explained in the Log.
- [ ] `pnpm vault:check` passes.

## Out of scope
New strains. Founder decisions (personal-use terms, disputes).

## Log
