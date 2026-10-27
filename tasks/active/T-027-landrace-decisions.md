---
id: T-027
title: Apply the founder landrace decisions and source Acapulco Gold
milestone: M1
status: review
owner: data-curator
depends_on: [T-007]
touches: [data/vault/LANDRACE-RUBRIC.md, data/vault/landraces/, data/vault/SOURCES.md, data/taxonomy/banned.yaml]
docs: [docs/open-questions.md, docs/04-data-model.md, docs/05-classification-algorithm.md, data/vault/LANDRACE-RUBRIC.md]
---

## Goal
The vault and the landrace rubric match the founder decisions of 2026-10-26 (open-questions L1–L5, C1), and
Acapulco Gold has the best sourcing we can honestly find.

## Requirements
- **Rubric (L1, L2):**
  - Make the "judge the specific line cited, not the whole country" interpretation the rule (drop "needs founder
    confirmation").
  - Remove the "sub-tropical origin" clause from the 75 rule, so 75 means documented broad-leaf influence in the
    line described. Update the "Tropical vs. sub-tropical" interpretation bullet to match.
  - Update the Current values table and mark each row "founder-approved value 2026-10-26, awaiting `verified`".
- **Values:** South African landrace → `base_sativa_pct: 90` (L2). Hindu Kush 10 (L3), Thai 90 (L4), Afghan 10
  and Colombian Gold 90 stay. Update each note body's explanation. Leave every note `unverified`: only a founder
  sets `verified`.
- **Acapulco Gold (L5):** the founders call it Sativa based on Jeeter's product information.
  - Read Jeeter's own page for its Acapulco Gold product. If it says Sativa, cite it with
    `supports: [reported_type]` and set `reported_type: sativa`. A product brand backs `reported_type` only, not
    `base_sativa_pct`.
  - Look for backing evidence for a `base_sativa_pct`: a breeder or seed-bank description of an Acapulco Gold line
    (rubric source 2), plus the ethnobotanical source already used. If both exist and fit the rubric, set the
    value they support. If not, leave `base_sativa_pct` empty and log what you searched.
  - Respect the sourcing policy in docs/04: don't cite sites whose terms forbid database use (Leafly, SeedFinder…).
- **banned.yaml (C1, C3):** update the header's open note: strain names and aliases are exempt from the check;
  the check covers taxonomy terms, vault note text and rendered result screens (C2). "anxiety" stays banned.
- Add any new source to `data/vault/SOURCES.md`.

## Acceptance criteria
- [x] Rubric and all 6 landrace notes match L1–L5. No note is `verified`.
- [x] Acapulco Gold: every value cites a source that was actually read, and the Log lists what was searched.
- [x] banned.yaml header updated.
- [x] Lineage values recomputed by hand for Durban Poison (or noted for T-006 to confirm) in the Log.

## Out of scope
New strains (the next seed batch). Flavor and terpene tags (not tagged in the MVP, D3/C4).

## Log

### 2026-10-27 (data-curator; work started 2026-10-26)
Claimed (backlog → active). All six landrace notes stay `unverified`.

**Rubric (`data/vault/LANDRACE-RUBRIC.md`).**
- L1: the specific-line reading is now the rule. Country-level reports go in the note body as context only.
- L2: removed "or a sub-tropical origin" from the 75 rule. **Consequential change, please confirm:** the 90 rule
  also said "from an equatorial or tropical region". With that kept, South Africa couldn't be 90 either, so I
  removed the latitude condition from 90 as well. 90 vs 75 now depends only on documented broad-leaf influence in
  the line cited. The "Tropical vs. sub-tropical" bullet now reads "Origin latitude doesn't decide the value".
- New interpretation bullet, **marked as a proposal needing founder confirmation**: when several lines sold under
  one landrace name disagree, cite the traditional, unhybridised line and put lines that name a broad-leaf parent
  on a `strain` node. Both South African and Acapulco Gold depend on it.
- Source 2 now says a product brand's page backs `reported_type` only (L5 / this task's Requirements).
- Current values table: added a Status column. Five rows are marked "Founder-approved value 2026-10-26, awaiting
  `verified`". Acapulco Gold is marked "Proposed in T-027, not yet founder-approved".

**South African landrace → 90 (L2).** Problem found: the only line source on the note was Dutch Passion's
"Durban X Unknown Indica" (re-read 2026-10-26). Under the new 75 rule, that is documented broad-leaf influence in
the line cited, so with that source the rubric would still give 75. I found a fitting line instead: ACE Seeds'
"Durban Poison 80s" (Khalifa Genetics brand). It is regular seeds from the north coast of Durban, listed as 100%
sativa, 11–15 weeks flowering indoors, and the page says it was never hybridised with a modern strain. Now cited
with `supports: [base_sativa_pct, reported_type]`. Dutch Passion stays on the note with `supports: []` as context
(its dispute lives on `Durban Poison`). Caveat for founders: the ACE line's seeds date from the 1980s, the same
decade McPartland & Small give for Central Asian introductions into South Africa.

**Afghan 10, Hindu Kush 10 (L3), Thai 90 (L4), Colombian Gold 90.** Values unchanged; explanations updated to
"founder-approved value 2026-10-26, awaiting `verified`". The Hindu Kush and Thai "closest-look" flags are now
"context that doesn't change the value (L1)". Re-read in this session: McPartland & Small (full text, both
halves), ACE Thai Chiang Mai, ACE Pakistan Chitral Kush, World of Seeds Colombian Gold, the Sensi Seeds "31 Best"
post. New founder flag on Colombian Gold: World of Seeds sells it as feminised seeds, "a combination of pure
strains", 65–75 days indoors, which is short for the "late maturing" condition. I also reworded "treats it as" to
"describes it as" in Colombian Gold, because under C2 note text is checked and "treats" is banned.

**Acapulco Gold (L5).**
- `reported_type: sativa`. Jeeter's own pages, all read 2026-10-26: https://www.jeeter.com/products/acapulco-gold
  (quad-infused pre-rolls: "Sativa", FAQ "Acapulco Gold is a Sativa Strain", origin "the area in and around
  Acapulco, Mexico"; this is the one cited), https://www.jeeter.com/products/acapulco-gold-concentrate and
  https://www.jeeter.com/products/aio-vape-acapulco-gold (same claim). No lineage, parents or breeder on any of
  them. Cited with `supports: [reported_type]`.
- **Terms flag:** https://www.jeeter.com/terms-and-conditions (Last Modified 9/2021): §4 allows personal use only;
  §6 bars robots and "any manual process to monitor or copy" site material. There's no explicit database or
  competitor clause. I cited it because L5 names it, and flagged it in SOURCES.md for a founder or Q10 decision.
- `base_sativa_pct: 90` (**proposed, needs founder approval**). The two sources are McPartland & Small 2020
  (regional group only: narrow-leaflet type spread early to the Americas; the paper has no Mexican landraces) and
  The Landrace Team, https://www.tltseeds.com/acapulco-gold/ ("classic sativa" from Guerrero, 16° N,
  1500–2600 m, 12–17 weeks flowering, genetics "Acapulco Gold", no broad-leaf or hybrid influence mentioned). This
  is the same footing as Colombian Gold. `region` was refined to "Guerrero, Mexico (around Acapulco)".
- Arguments against 90, written into the note body: Barney's Farm sells a stabilised line it calls a landrace but
  lists at 70% sativa / 30% indica with 60–70 days flowering, which would point to 75 if that were the line judged.
  It isn't cited (terms, below), and under the rubric it would be a separate `strain` node. A Wikipedia photo
  caption says "Mexican x Nepalese", credited to a seed retailer. TLT gives no collector, year or seed type.
- Search and URL log:
  1. WebSearch "Jeeter Acapulco Gold sativa": only Weedmaps dispensary menus (excluded, none opened).
  2. WebSearch "jeeter.com Acapulco Gold" (restricted to jeeter.com): the three product pages above, all opened.
  3. WebSearch "jeeter terms of use" (jeeter.com), then opened /terms-and-conditions.
  4. WebSearch "Acapulco Gold seeds breeder landrace Mexico sativa" (Leafly, SeedFinder, Weedmaps, GreenState,
     Cannigma, Leaf Nation blocked). Results: marijuanaseedsforsale.com, primecutsnursery.com, masterseeds.net,
     sacredseedsaustralia.co, firestyleseeds.com, hypnoseeds.com, barneysfarm.com, zamnesia.com (Growers Choice),
     seedbank.com. Opened: https://www.barneysfarm.com/acapulco-gold-26 (feminised: "Central American" genetics,
     70/30, 60–70 days) and https://www.masterseeds.net/seeds/acapulco-gold/ (a retailer page, "Acapulco Gold x
     Landrace", no ratio, 9–11 weeks; not usable). The rest are retailers/resellers, not opened.
  5. WebSearch '"Acapulco Gold" regular seeds landrace preservation Guerrero' (same blocks). Results: 10buds.com,
     jointcommerce.com blog, seedsforme.com, cannapio.com, strainpedia.com, primecutsnursery.com, royalqueenseeds.com
     blog, barneysfarm.com regular, sacredseedsaustralia.co, en.wikipedia.org/wiki/Acapulco_Gold. Opened:
     https://www.barneysfarm.com/us/acapulco-gold-_-regular-seeds-845 (regular, "stabilised to control height",
     70/30, 60–70 days). Pointed to The Landrace Team.
  6. WebSearch "Mexican sativa landrace seeds Guerrero breeder ACE Seeds OR Tropical Seeds OR Cannabiogen": no ACE,
     Tropical Seeds or Cannabiogen Acapulco Gold line. Other Guerrero lines (Mexican Death Sativa, Highland
     Guerrero) aren't Acapulco Gold, so they were not used.
  7. WebSearch "The Landrace Team Acapulco Gold" (tltseeds.com): opened https://www.tltseeds.com/acapulco-gold/
     (cited) and https://www.tltseeds.com/about-us/ (a landrace-preservation seed bank; no terms page). WebSearch
     for its terms found none.
  8. WebSearch "Barney's Farm terms and conditions" (barneysfarm.com): opened https://www.barneysfarm.com/terms
     (effective 2023-09-27; bars use "other than private, personal, family or household use"). So Barney's is not
     cited.
  9. Opened https://en.wikipedia.org/wiki/Acapulco_Gold (2026-10-27): "100% sativa Mexican" with no citation; the
     caption is credited to Seed Supreme. Listed as context with `supports: []`.
  10. For South African: WebSearch "Durban landrace sativa seeds South Africa pure line breeder regular seeds"
      (same blocks): retailers only (seedtiva, whitewidowseedsbank, canaxseeds, cannoptikum/Anesia, Growers Choice,
      seedsupreme, house-of-seeds), none opened. WebSearch "Durban Poison" restricted to tltseeds.com and
      aceseeds.org: opened https://www.tltseeds.com/durban-poison-highland/ (no line data; not used),
      https://www.aceseeds.org/en/seeds/durban-poison-80s-regular-seeds/ (cited) and
      https://www.aceseeds.org/en/khalifa-genetics/ (brand page: Khalifa Genetics is a brand sold by ACE Seeds).
  Never opened or cited: Leafly, SeedFinder, Weedmaps, GreenState, Cannigma, Leaf Nation.

**banned.yaml.** The header now records C1 (strain `name` and `aliases` exempt; P12 still governs display), C2
(automated check covers taxonomy terms, vault strain notes and rendered result screens; other app copy gets a
human pass) and C3 ("anxiety" stays banned; the tag is `anxious`, which exists in taxonomy.yaml). I removed "UI
copy (`copy.ts`)" and "exports" from the "What it's for" list to match C2. No list entries changed.

**Lineage recomputed by hand (docs/05).** Durban Poison has a single parent (South African landrace) and
`derivation: pheno`, so under P7 there is no decay (d = 1.0, not 0.97):

| Node | Before | After |
| --- | --- | --- |
| Durban Poison | 75 → hybrid / sativa-dominant, confidence 1.0 (high), traced | **90 → sativa**, confidence 1.0 (high), traced. Now agrees with its `reported_type: sativa` |
| F1 Durban (unknown + Durban Poison, reported unknown → renormalise) | 75 → hybrid / sativa-dominant, 0.97·0.5·1.0 = 0.485 (low), partial | 90 → sativa, 0.485 (low), partial |
| Acapulco Gold | no base → reported fallback 85 → sativa, 0.5 (medium), reported | 90 → sativa, 1.0 (high), traced |
| Skunk #1 = (Afghan x Colombian Gold = 50, conf 0.97) x Acapulco Gold | 0.5·50 + 0.5·85 = 67.5 → 68, hybrid / sativa-dominant, 0.97·(0.485 + 0.25) = 0.713 (medium), partial | 0.5·50 + 0.5·90 = 70, hybrid / sativa-dominant, 0.97·(0.485 + 0.5) = 0.955 (high), traced |
I cross-checked these with `computeLineage` from `packages/core` (a scratch script outside the repo): identical
results.

Girl Scout Cookies (OG Kush x F1 Durban) also shifts, but it depends on the OG Kush subtree, so T-006
should confirm it in the snapshot.

**Checks.** `pnpm vault:check` is still the T-006 stub. All six landrace frontmatters pass core's
`GeneticNodeSchema` (minimal frontmatter reader in a scratch script; both base values have 2 supporting sources).
A whole-word scan of the six notes and the rubric against banned.yaml (name/aliases excluded, per C1) is clean.
No git commands, no installs.

**Needs a founder:**
1. Approve or change Acapulco Gold's proposed 90 (L5 only set the type). The alternative is 75, if the Barney's
   Farm-type stabilised line is judged instead.
2. Confirm removing the tropical condition from the 90 rule (a consequence of L2).
3. Confirm the "which line to judge when lines disagree" bullet.
4. Decide whether "personal use only" site terms (Jeeter; Barney's Farm) exclude a source (or add it to Q10).
5. Colombian Gold's line flowers in 65–75 days indoors: still 90?
6. Set `verified` on each landrace when satisfied.
