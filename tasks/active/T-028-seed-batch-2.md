---
id: T-028
title: Seed dataset batch 2 (next 20 sold strains)
milestone: M1
status: review
owner: data-curator
depends_on: [T-007]
touches: [data/vault/strains/, data/vault/crosses/, data/vault/breeders/, data/vault/SOURCES.md]
docs: [data/vault/README.md, docs/04-data-model.md, docs/05-classification-algorithm.md, docs/09-compliance-and-privacy.md, docs/open-questions.md]
---

## Goal
Bring the sold-strain count from 30 toward the T-007 target of 50 by curating the next 20 commonly sold strains
(plus any ancestors they need), with the same sourcing bar as T-007.

## Requirements
- Pick from the T-007 Log's leftover list: first retry the 10 dropped for lack of a source (Bananas, Brownie Scout,
  Mule Fuel, Bubba Fett, Lilac Diesel, Crescendo, Glueball, Head Cheese, Blueberry Muffin, Gelato Cake), then the
  single-list strains (Gush Mints, Layer Cake, Cherry Limeade, Gas Face, Kush Cake, Gorilla Pie, Truffle, Orange 43,
  92 Cookies, Golden Pineapple, OG Chem…). Skip any you can't source honestly, and log why.
- Same rules as T-007: every `parents` / `reported_type` value cites a source actually read; respect site terms
  (Leafly, SeedFinder, Cannigma, GreenState, Leaf Magazines and the other T-007/T-027 exclusions stay out); P1 (no
  autoflowers), P4 (A x B names as their own `strain` node), P7 (`derivation` on single-parent nodes; phenos list
  the seed line's parents when sourced); aliases cover only the same plant; disputed lineages get
  `verification: disputed` with both versions in the body.
- **Tags:** effects only, and only where a usable source supports them (D3/C4: flavors and terpenes aren't tagged in
  the MVP). Effect slugs must exist in `data/taxonomy/taxonomy.yaml`. `effects: []` is fine.
- Strain names are exempt from the banned-term check (C1), but note bodies are not (C2): no medical wording.
- Reuse existing ancestor notes; add stubs (`parents: ["unknown"]`) only when a source names the ancestor.
- Never set `verified`. Notes are `unverified` or `disputed`.
- Validate every new note against `GeneticNodeSchema` / `BreederSchema` (scratch script outside the repo), and run
  `pnpm vault:check` if T-006 has landed by the time you finish.

## Acceptance criteria
- [x] Up to 20 new sold strains, each sourced; skipped strains listed with the reason.
- [x] Every wikilink resolves to a file; every new note passes the schema.
- [x] `SOURCES.md` updated with each new source and its terms note.
- [x] Log lists each new strain with its computed label under the D15 bands (by hand or via core's `computeLineage`).

## Out of scope
Changing landrace values or the rubric (T-027). Flavor and terpene tags.

## Log
- 2026-10-27 (data-curator): claimed (moved from backlog, `status: active`).
- 2026-10-27 (data-curator): done, `status: review`.
  - **Notes added (59):** 20 sold strains, 24 ancestor stubs, 5 crosses, 10 breeders. Every new note is `unverified`
    or `disputed`; none is `verified`. No flavors or terpenes; `typical_thc_pct` is null everywhere.
    - Stubs: Purple Panty Dropper, Razzle Berry, F1 Durb, Gushers (parents Gelato #41 x Triangle Kush, weak), Black
      Lime Reserve, Cherry Pie, Kosher Kush, Platinum Girl Scout Cookies, WIFI 43, Orange Juice Bud, Banana Kush,
      Bubble Gum, Golden Goat, Pineapple Kush, LA Confidential, Apples & Bananas, Grape Gasoline (Grape Pie x Jet Fuel
      Gelato, alias Grape Gas), Grape Pie, Jet Fuel Gelato, OGKB Blueberry Headband, Mendo Montage, Snowball, Amnesia
      Haze, Rare Dankness #2.
    - Crosses: F1 Durb x Gushers; GMO x (Triangle Kush x Skunk #1); Triangle Kush x Skunk #1; Face Off OG x Kush Mints;
      Biscotti x Sherb BX1.
    - Breeders: Humboldt Seed Company, Purple City Genetics, Swamp Boys Seeds, Mean Gene, Green Thumb Industries,
      Ethos Genetics, Franchise Genetics, Compound Genetics, Thug Pug Genetics, Rare Dankness Seeds.
    - Changed: `strains/Sour Diesel.md` body ("treats" → "calls", banned term flagged by vault:check, per the
      coordinator).
  - **Labels (core `computeLineage`, ALGO_VERSION 2, all notes included regardless of verification):**

    | Strain | sativa_pct | Label (sublabel) | Confidence | Method |
    | --- | --- | --- | --- | --- |
    | Gelato Cake | 41 | Indica (indica-dominant) | 0.464 low | partial |
    | Blueberry Muffin | 30 | Indica (indica-dominant) | 0.500 medium | reported |
    | Brownie Scout (disputed) | 30 | Indica (indica-dominant) | 0.500 medium | reported |
    | Mule Fuel | 38 | Indica (indica-dominant) | 0.471 low | partial |
    | Lilac Diesel | 70 | Sativa (sativa-dominant) | 0.500 medium | reported |
    | Crescendo | 70 | Sativa (sativa-dominant) | 0.500 medium | reported |
    | Glueball | 50 | Hybrid (balanced) | 0.417 low | partial |
    | Gush Mints | 41 | Indica (indica-dominant) | 0.295 low | partial |
    | Layer Cake | 44 | Indica (indica-dominant) | 0.462 low | partial |
    | Cherry Limeade | 50 | Hybrid (balanced) | 0.500 medium | reported |
    | Gas Face | 37 | Indica (indica-dominant) | 0.280 low | partial |
    | Kush Cake | 30 | Indica (indica-dominant) | 0.485 low | partial |
    | LA Kush Cake | 30 | Indica (indica-dominant) | 0.485 low | partial |
    | Orange 43 (disputed) | 30 | Indica (indica-dominant) | 0.500 medium | reported |
    | Golden Pineapple | 70 | Sativa (sativa-dominant) | 0.500 medium | reported |
    | King Louis | 30 | Indica (indica-dominant) | 0.478 low | partial |
    | Strawberry Banana | 30 | Indica (indica-dominant) | 0.500 medium | reported |
    | Gastro Pop | 30 | Indica (indica-dominant) | 0.242 low | partial |
    | Glitter Bomb | 30 | Indica (indica-dominant) | 0.485 low | partial |
    | Jenny Kush | null | unknown | 0 none | unknown |

    Glueball is Hybrid only because GG4's traced value and Snowball's gap (filled with the node's own
    sativa-dominant) average to exactly 50. Most of these rest on `reported_type` because the new ancestors are
    stubs. With the default shipping policy none of the new notes ship until a founder verifies them.
  - **Skipped, and why:** Bananas and Afternoon Delight (several different strains share each name); Bubba Fett
    (only a Seeds Here Now blog was usable, the Westword article returned 403, and sources say the name covers
    different cultivars); Head Cheese, 92 Cookies, OG Chem, Gorilla Pie, Star Cookies, Frosted Kush, Florida Kush (no
    usable source; only Leafly, Weedmaps, GrowDiaries or SEO blogs); Truffle (ambiguous; sources cover White Truffle
    and other "Truffle" lines); Snoop Dogg OG (the name covers more than one cultivar); Alaskan Thunder Fuck (lineage
    undocumented, and some listings claim ruderalis parentage, P1); Rainbow and Cream (generic names, not attempted).
  - **Disputed (2):** Brownie Scout (Kosher Kush x Platinum GSC per High Times 2019, vs. Platinum GSC x Stardawg Guava
    per Theory) and Orange 43 (WIFI 43 x Orange Juice Bud per Willamette Week, vs. White Fire 43 x Orange per Klutch).
    Both versions are in each body.
  - **Weak or single-source (founder priority):** Mule Fuel and Glueball (one source each); Golden Pineapple, Kush
    Cake, Jenny Kush (one review site); type values taken from review category tags (Gelato Cake, Cherry Limeade,
    Kush Cake, King Louis, Golden Pineapple, Grape Gasoline). Gas Face's two sources write the father side
    differently ("Face Mints" vs. Face Off OG x Kush Mints); kept `unverified`, not disputed, pending a breeder source.
  - **Parents left `unknown` on purpose:** Crescendo and Lilac Diesel (components named, cross order not), and all 22
    parentless stubs.
  - **Effects:** tagged only where two pages by different authors name the effect (rule in `SOURCES.md`): Gush Mints
    `focused`; Layer Cake, Gas Face, King Louis, Gastro Pop `relaxed`; Crescendo `relaxed, euphoric, happy`;
    Strawberry Banana `creative`. All others `[]`. Effect words were checked against the downloaded page text,
    which dropped one candidate (Lilac Diesel "uplifted" wasn't in either page).
  - **Sources added to `SOURCES.md`:** Theory Wellness, Humboldt Seed Company (catalog PDF), Willamette Week, Klutch
    Cannabis, Swamp Boys Seeds; updated rows for The Highest Critic, High Times, Seeds Here Now, MiCannaCast and DNA
    Genetics. Newly excluded: Ethos Genetics (terms bar non-interface access and derivative works), JointCommerce
    (SEO copy), Westword (403).
  - **Validation:** a scratch tsx script outside the repo ran every note through core's `parseNote`
    (`GeneticNodeSchema` / `BreederSchema`), checked `id == slugify(name)`, filename == `sanitizeFilename(name)`, and
    every parent and breeder link against filenames: 0 errors. `pnpm vault:check` (T-006 landed mid-task): exit 0,
    "OK: 22 warnings" (17 unshipped-parent, 5 low-confidence, all on shipped T-007 notes or the two new disputed
    notes whose parents don't ship).
  - **For founders:** (1) whether "personal use only" terms exclude a source: it now affects DNA Genetics (Strawberry
    Banana; the note says what changes) as well as Jeeter; (2) the effect-tag rule above; (3) possible merges once
    sourced: Kush Cake / LA Kush Cake, F1 Durb / F1 Durban, P.P.D. / Purple Panty Dropper, King Louie XIII as a King
    Louis alias; (4) Theory Wellness as a heavily used source whose terms text couldn't be read.
