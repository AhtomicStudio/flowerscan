# Cannabis domain review of the specs (T-022)

- **Date:** 2026-10-26
- **Author:** cannabis-expert agent
- **Reviewed:** docs/04, docs/05, docs/06, docs/09, docs/glossary, ADR-0004
- **Feeds:** T-002 (schemas), T-005 (lineage), T-007 (seed data), T-008 (matcher), T-011 (label parser), T-003 (taxonomy)

> Not legal advice. State rules below are summaries of the regulation text or of agency pages as read on
> 2026-10-26. Rules change, so re-check them before encoding anything as a hard requirement.

**How to read this note**
- **[F]** is a fact with a numbered source (§8). **[F, excerpt]** means I read it only through a search-result
  excerpt, not the full page. Treat those as leads to re-verify.
- **[O]** is my expert opinion. It isn't sourced. Weigh it as judgment, not fact.
- **P1…P14** are proposals that need a decision (owner in §6). Direct doc edits I made are in §7 and in the
  task Log.
- Lineages are mentioned only where a source says so, and they are marked as reported. This note doesn't set
  any vault fact. That's T-007's job, with sources.

---

## 0. Findings by impact

| # | Severity | Finding | Where | Fix |
| --- | --- | --- | --- | --- |
| 1 | **Wrong** | Ruderalis landraces default to `base_sativa_pct: 50`. That's an invented value, and it makes every autoflower cross drift toward "balanced". It contradicts AGENTS.md non-negotiable 2 (no default 50/50). | docs/05 Rules | **P1** (flagged inline in docs/05) |
| 2 | **Wrong** | The normalizer turns ` x ` / `×` into a space, so `Wedding Cake x Gelato 33` becomes a strong fuzzy match for one parent. That's a false-accept path, the worst failure. Unnamed crosses are commonly sold under "A x B" names [O]. | docs/06 §4 | **P4** (flagged inline) |
| 3 | **Wrong** | Numbered phenos (`#4`, `#33`) and cut names (`Chem 91`, `Chem D`) are **different plants**, not decorations. Nothing in the matcher stops `Gorilla Glue #5` from auto-accepting as `#4` [F 24, 27]. | docs/06 §5–6 | **P5**, test cases in §2.4 |
| 4 | **Wrong** (definition) | The glossary called a pheno/cut "a selected individual plant of a strain". A cut is a clone (same genotype, no new generation). A numbered pheno is a sibling chosen from a seed population, not a child of the seed-line name. | glossary, docs/05 | **Edited** (definitions). Algorithm change is **P7**. |
| 5 | **Misleading** | `sativa_pct` reads like "% C. sativa DNA". Research finds the market indica/sativa labels track aroma (terpene genes) more than genome-wide ancestry [F 1, 2, 5]. Our number is a **lineage-weighted average of curated type values**, not a measurement. | docs/05, UI copy | **Edited** docs/05 and glossary. Copy is **P8**. |
| 6 | **Misleading** | Averaging pulls toward the middle. Two indica-leaning parents (15 and 30) give 22.5, which is "Hybrid · Indica-dominant", so a package that says "Indica" gets a "disagrees" callout even though both sides agree in direction. | docs/05 bands, docs/08 callout | **P8** (direction-aware callout) |
| 7 | **Misleading** | `thc_pct` doesn't say *which* THC. Labels print THC, THCa, and Total THC side by side, and hemp-derived "THCa flower" headlines THCa [F 11, 18, 14, 23]. | docs/04 Scan | **P2** (`thc_basis`) |
| 8 | **Misleading** | `package_says` (`indica \| sativa \| hybrid`) flattens "Indica-dominant hybrid" and "Hybrid (I)", which are common on labels and menus [F 28]. | docs/04, docs/06 §3 | **P3** |
| 9 | **Misleading** | Confidence ignores `verification: disputed`. A disputed tree can still show "high". | docs/05 | **P9** |
| 10 | **Misleading** | Most popular modern strains bottom out at **clone-only cuts with unknown or folklore origins** (Chemdawg, OG Kush-family claims, Haze), not at landraces [F 27, 34]. "Traced to landraces" will be rare. Expect `partial` for most results. | docs/05, docs/08 | Edited docs/05 guidance. Copy is **P8**. |
| 11 | **Could be better** | Noise stripping before matching will eat strain tokens that are also lexicon words: `Hash Plant` (form word "hash"), brand "Cookies" vs. `Girl Scout Cookies`, brand "Runtz" vs. the strain `Runtz` [F 33]. | docs/06 §3 | **P6** |
| 12 | **Could be better** | 1D barcodes on cannabis packages are often a per-package track-and-trace UID, not a product code. They never repeat, so remembering them is useless [F 10, 38, 39]. | docs/06 §3 barcode | **Edited** (note) and **P13** |
| 13 | **Could be better** | QR codes now include Metrc Retail ID (required on every unit in NY since 2026) and state-mandated COA links (NY) [F 18, 19, 20]. These are a distinct QR kind. | docs/06 §3 QR | **Edited** (new QR kind, not a strain decision) |
| 14 | **Could be better** | Strain names are being changed by trademark settlements and child-appeal rules (GG4, The Original Z, GSC; OLCC; CA auditor 2025) [F 21, 22, 24, 25, 26]. Aliases must carry renames, and our own UI may face the same youth-appeal scrutiny. | docs/04 aliases, docs/09 | **Edited** docs/04 alias rule. Legal scrutiny is **P12**. |
| 15 | **Could be better** | Landrace base values have no rubric. Several pedigree "landraces" are really seed-bank lines or broad regional labels (Afghani, Thai, Mexican) [O]. | docs/04, T-007 | **P10** |

---

## 1. Lineage model (docs/05)

### 1.1 What `sativa_pct` can and can't mean

Facts:
- Drug-type "Sativa" and "Indica" are **vernacular** market terms. McPartland & Small (2020) argue that equating
  vernacular "Sativa" with the epithet *C. sativa* (and "Indica" with *C. indica*) is a mistake. They place both
  drug-type groups inside one species, as *C. sativa* subsp. *indica* var. *indica* ("Sativa") and var. *afghanica*
  ("Indica") [F 5]. McPartland (2018) says interbreeding has made the distinction "almost meaningless" [F 4].
- Watts et al. (2021, *Nature Plants*) genotyped commercial samples and found that "sativa"- and "indica"-labelled
  samples **did not differ genetically genome-wide**. The labels instead associated with a few terpenes (myrcene,
  guaiol, β-/γ-eudesmol with "indica"; bergamotene and farnesene with "sativa") [F 1].
- Sawler et al. (2015) found a **moderate** correlation (r² = 0.36) between genetic structure and *reported*
  sativa ancestry. They concluded that a strain's genetic identity "cannot be reliably inferred by its name or by
  its reported ancestry". In 6 of 17 same-name comparisons, samples were more similar to differently named samples [F 2].
- Smith et al. (2022) analyzed about 90,000 samples from six states and found that labels don't consistently align
  with chemotypes [F 3, excerpt].

What this means for us **[O]**: the algorithm is still a fine product feature. It's explainable and honest
*if we say what it is*. It is **an average of how the ancestors are commonly classified**, carried down the family
tree. It is not a DNA measurement and not an effect prediction. I added a short "What the number means" section to
docs/05 (see §7). The UI should never say "68% sativa genetics". Say "Family tree leans sativa (68)" or
"Lineage estimate: 68% sativa". Wording is in P8.

### 1.2 Node kinds

| Kind | Verdict | Notes |
| --- | --- | --- |
| `landrace` | Keep, tighten | Many pedigree "landraces" are seed-bank stabilizations or broad regional labels, not single traditional populations [O]. See §1.5. |
| `strain` | Keep | Fine. Covers named cultivars, seed lines, numbered phenos, and cuts. Modeling guidance is in §1.3. |
| `cross` | Keep, but see P4 | "Unnamed and not searchable" is right for pure tree plumbing. But many products are **sold** as "A x B" [O]. If a cross is sold under that name, curate it as a `strain` whose `name` is "A x B", so the matcher can find it exactly. Proposed in P4. |

### 1.3 Breeding relationships: genetics vs. our model

| Term | What it is genetically | Current model | Verdict |
| --- | --- | --- | --- |
| **F1 cross** (A × B) | Each offspring gets exactly half of its nuclear genome from each parent. The 50/50 split is exact at the parent level. Grandparent shares are only *expected* values (recombination varies them). [O, standard Mendelian genetics] | Equal weights | Correct. |
| **F2 / later filial** | Siblings segregate widely, and a selected keeper can lean either way. [O] | Same as F1 | Fine as an expected value. The UI must say "estimate". |
| **Backcross (BX1, BX2…)** | Expected recurrent-parent share is 75%, 87.5%, … [O] | Via `cross` nodes | Correct as an expectation. |
| **S1 (selfed)** | A new seed generation from one parent (often a feminized self). [O] | One parent, weight 1, one decay step | Correct. |
| **Numbered pheno** (GG #4, Gelato #33) | One individual chosen from a seed population. It is a **sibling** of other numbered phenos, not a child of the seed-line name. GG Strains' #1, #4, and #5 are different selections renamed GG1/Sister Glue, GG4/Original Glue, and GG5/New Glue [F 24]. Sherbinskis lists #41, #43, #47, and #49 as distinct Gelato phenos [F 28, excerpt]. | One parent ("Gelato"), weight 1, one decay step | Numerically harmless, genetically imprecise. **Guidance (edited into docs/05):** a pheno's `parents` should be the seed line's parents when sourced. The decay question is **P7**. |
| **Cut / clone-only** (Chem 91, Chem D, "Forum Cut") | A clone. It is the *same plant* as its source, with no new generation. Distinct cut names are **distinct selections**: Chem 91, Chem's Sister, Chem D, and Chem 4 are different plants from different seeds of the same bag [F 27, excerpt]. | Same as pheno | Never put a cut's name into another node's `aliases` (**edited** into docs/04). Decay is **P7**. |
| **Polyhybrid** (e.g. Haze) | Many founders in uncertain proportions. Haze's composition is folklore (Mexican, Colombian, and Thai, sometimes Indian, with the story itself called hearsay) [F 34, excerpt]. | Cross nodes and weights | Don't make up weights to complete a tree. Use `unknown` or `disputed` (edited into docs/05). |
| **Reciprocal cross** (A × B vs. B × A) | Same expected nuclear share. Maternal organelles differ. [O] | Not mentioned | Same value. Keep the order the source gives (mother first by convention) (edited into docs/04). |

### 1.4 Where simple averaging misleads, and how to say so

1. **Regression to the middle.** Each cross averages, so a deep polyhybrid lands near the parents' midpoint. The
   result for two parents at 15 and 30 is 22.5 (Hybrid · Indica-dominant). A package saying "Indica" is
   *directionally consistent* with that. [O] The callout should fire only when **direction** differs (P8).
2. **Selection bias.** A named keeper was *selected* from many siblings, often for the traits behind its
   reported type. Its true makeup can differ a lot from the cross's average. [O] Say it is an estimate.
3. **Band cliffs.** 20 → "Indica", 21 → "Hybrid · Indica-dominant". [O] Always show the number next to the
   label. Consider "close to the line" copy within ±2 of a boundary (UI decision, P8).
4. **Unknown or legendary roots.** Most of the result comes from the `reported_type` of clone-only ancestors.
   [O] The tree should visibly *end* there ("Origins of Chemdawg are unknown").
5. **Same name, different plant.** Sawler found same-name samples that were not genetically alike [F 2]. Runtz
   is widely counterfeited on illicit packaging [F 33, excerpt]. [O] Copy: "We match the name on the package. We
   can't confirm what's inside."

Suggested hedged lines (all **[O]**, for docs/08 and copy review):
- "Lineage estimate, based on how its ancestors are usually classified. Not a lab test."
- "Package says Indica. The family tree leans Sativa-dominant." (only when direction differs)
- "Traced back to Chemdawg. Its own origins are unknown."
- "Effects vary person to person. Indica and sativa describe plant families, not how you'll feel."

### 1.5 Is the landrace `base_sativa_pct` approach defensible?

**As a documented curatorial convention, yes. As science, only loosely.** [O] Facts that bound it:
- Genomic work places domestication in East Asia and splits accessions into basal, hemp-type, drug-type feral, and
  drug-type groups [F 6]. No published study gives "sativa %" values per landrace. [O, I found none]
- The narrow-leaf / broad-leaf drug-type split (Hillig 2005, allozymes) is the closest scientific analogue to
  vernacular sativa/indica [F 7, excerpt only]. Clarke & Merlin (2013) is the standard ethnobotanical reference
  for regional landraces [F 8, not read; recommended for T-007].

**Proposed sourcing approach (P10) [O]:**
1. **A fixed, coarse scale.** Allow only 10 / 25 / 50 / 75 / 90 (or similar). Fine-grained values like 83 imply
   precision we don't have.
2. **A rubric per value.** "90 = population described in ethnobotanical or peer-reviewed literature as a
   narrow-leaf drug type, long-flowering, equatorial or tropical origin." "10 = broad-leaf drug type of the
   Afghanistan/Pakistan hashish region." Mixed or unclear regions get 50 only with a source that says *mixed*.
   Otherwise no value (unknown).
3. **Two sources per value:** one ethnobotanical or peer-reviewed source for the region's drug-type group, and one
   breeder or seed-bank description of the specific line.
4. **Landrace-derived seed lines are `strain` nodes.** Seed-bank stabilizations named after a place (e.g.
   "Afghani #1", "Durban Poison") should be `strain` nodes with a landrace parent, not landraces themselves.
   Exact lineages must come from the breeder's own page (T-007).
5. **Every value is flagged for founder review** in the build report (T-007 already says so).

### 1.6 Ruderalis (P1)

docs/05 says to treat ruderalis as `base_sativa_pct: 50`. That is a placeholder number, and AGENTS.md
non-negotiable 2 forbids invented values and a default 50/50. Ruderalis isn't on the indica–sativa axis at all.
[O] **Proposal:** a ruderalis landrace returns `value: null` (behaving like `unknown`), so autoflower crosses
become `partial` and fall back to their own `reported_type`. Or exclude autoflowers from v1. I flagged this inline
in docs/05. The rule itself is unchanged pending a decision.

### 1.7 Reported-type values and bands

The 85/70/50/30/15 mapping is internally consistent with the bands (85 → sativa, 15 → indica). [O] Keep it. It is
a product convention and should be described that way in copy. The bigger issue is the callout logic (P8), not
the numbers.

### 1.8 Confidence semantics (P9)

Confidence measures **how much of the tree is traced**, not "how likely the label is right". [O] It should be
capped at `medium` if any contributing ancestor is `disputed`. The chip copy ("Lineage traced" / "Partly
traced") is already good. Avoid the word "confidence" in UI.

---

## 2. Naming (docs/04, docs/06 §4–6)

### 2.1 Patterns the matcher must handle

| Pattern | Examples | Basis |
| --- | --- | --- |
| **Trademark renames** | Gorilla Glue #4 → GG4 / Original Glue; #5 → GG5 / New Glue; #1 → GG1 / Sister Glue (2017 settlement) | [F 24] |
| | Zkittlez → The Original Z (2023 Mars Wrigley settlement) | [F 25, excerpt] |
| | Girl Scout Cookies → GSC (Girl Scouts cease-and-desist letters) | [F 26, excerpt; secondary sources] |
| **Regulator-driven renames** | OLCC (2016) refused labels with strain names such as Girl Scout Cookies, Candyland, and Charlotte's Web, plus Star Wars references (Skywalker, Jedi Kush, Death Star) | [F 21] |
| | CA State Auditor (Aug 2025) recommended regulating flavor-suggestive strain names, citing Cherry Pie, Tropicana Punch, and Lemon Cherry Gelato | [F 22, excerpt] |
| **Retail euphemisms** | GMO sold as Garlic Cookies; Green Crack sold as Green Crush / Mango Crack (and Cush / Green Cush) | [F 28, 29] |
| **Nicknames** | Gelato #33 = "Larry Bird"; MAC = Miracle Alien Cookies / M.A.C.; MAC 1 = "Cap's Cut"; Wedding Cake = Triangle Mints #23 (Seed Junky) | [F 28, 32, 30; all excerpt or secondary] |
| **Spelling variants** | Sunset Sherbet / Sunset Sherbert / Sherbert; Zkittlez / Skittlez | [F 31, 25] |
| **Abbreviations** | GG4, GSC, GMO, MAC, GLTO (on a Sherbinskis product listing: "TRUE GLTO 33") | [F 24, 26, 28] |
| **Numbered phenos** (identity, not decoration) | GG #1/#4/#5; Gelato #33/#41/#43/#47/#49 | [F 24, 28] |
| **Cut names** (identity) | Chem 91, Chem's Sister, Chem D, Chem 4; GSC "forum cut"; "Thin Mint" GSC | [F 27, 28] |
| **Same name, inconsistent use** | "Pink Cookies" is Wedding Cake in Canada per Leafly, but used inconsistently per Weedmaps. "Wedding Cake" seed lines with GSC × Cherry Pie parentage exist alongside Seed Junky's cut. | [F 30] |
| **Name = brand** | Runtz (strain and brand); Cookies (brand) vs. "Cookies" inside strain names | [F 33] |
| **Glued digits in slugs and menus** | `lot420-gelato33-pre-roll-1x1g`, `wavvy-gelato-33-h-flower-3-5g` | [F 28] |
| **Category in brackets** | "Garlic Cookies (I)", "-h-flower" | [F 28] |

**Breeder vs. brand [O]:** packages print the **brand/producer** (grower or processor), rarely the **breeder**.
docs/04 plans to disambiguate same-name strains by breeder, which won't work from a package photo. For same-name
conflicts, prefer **one canonical node with `verification: disputed`** and both lineages in the body. Split by
breeder only when the product names actually differ ("Wedding Cake (Seed Junky)"), and then make sure "Which one?"
shows both.

### 2.2 Normalizer and matcher implications (T-008)

- **Letter–digit boundaries [O] (P5):** `gelato33`, `gg4`, `ak47`, and `chem91` need splitting to match
  `Gelato #33`, `GG4`, `AK-47`, and `Chem 91`. Index both split and joined forms. Strip leading zeros (`#04` → `4`).
- **Numbers are identity [O] (P5):** if the candidate and the entry carry different number tokens, the pair must
  not auto-accept. If one has a number and the other doesn't, cap at "Which one?".
- **Cross notation [O] (P4):** keep ` x ` / `×` as a marker token (don't turn it into a space). Flag it, and never
  auto-accept a single parent of an "A x B" label. Don't confuse it with quantity "x": `5 x 0.5g`, `1x1g`.
- **Short tokens to keep (edited into docs/06 §4):** add `gmo`, `mac`, `gdp`, `nl`, `ak`, `sfv`, `bx1`–`bx3`, `ibl`.
- **Generic tokens alone never accept [O]:** `og`, `kush`, `haze`, `glue`, `cookies`, `cake`, `z`. A one-token
  candidate that is only a generic token goes to "none" or "Which one?".

### 2.3 Aliases rule (edited into docs/04)

`aliases` are for **the same plant under another name** (renames, abbreviations, spellings, nicknames). They are
**not** for sibling phenos or other cuts. `Chem 91` is not an alias of `Chemdawg`. `Gelato #33` is not an alias of
`Gelato`. Inconsistent names like "Pink Cookies" shouldn't be aliases at all [O]. Let them hit "Which one?" through
fuzzy matching.

### 2.4 Naming test cases for T-008 (≥ 30)

Fixture assumption: the test index contains every canonical name in this table, plus the siblings named in the
"why" column. "Accept" means `decide` → `accept`. "Choose" means "Which one?" with the canonical name in the top 3.
"None" means no match. Rows marked **[O]** rest on my judgment, not on a source. The data-curator must source those
aliases before they go into the vault. The tests can still use them as fixtures.

| # | Input (as printed / OCR / slug) | Expected canonical | Expected decision | Why it's tricky | Basis |
| --- | --- | --- | --- | --- | --- |
| 1 | `GG4` | Gorilla Glue #4 | accept | Post-settlement abbreviation; short token | [F 24] |
| 2 | `ORIGINAL GLUE` | Gorilla Glue #4 | accept | Rename shares no tokens with the name | [F 24] |
| 3 | `GG #5` | Gorilla Glue #5 | accept (never #4) | Number is identity; must not fold into GG4 | [F 24] |
| 4 | `Sister Glue` | Gorilla Glue #1 | accept | Rename; "glue" alone is generic | [F 24] |
| 5 | `Gorilla Glue` | GG1 / GG4 / GG5 | choose | Unnumbered seed-line name is ambiguous | [F 24] + [O] |
| 6 | `G0RILLA GLU3 #4` | Gorilla Glue #4 | accept | OCR folding (0→o, 3→e) plus `#` | spec |
| 7 | `GSC` | Girl Scout Cookies* | accept | Abbreviation is the common shelf name | [F 26] |
| 8 | `THIN MINT GSC` | Thin Mint GSC | accept (never GSC) | Cut name; superset of an alias | [F 28] + [O] |
| 9 | `GSC Forum Cut` | GSC (Forum Cut)* | choose | Cut name; `cut` must not be stripped | [F 28] + [O] |
| 10 | `GMO` | GMO | accept | Also an everyday acronym; short token kept | [F 28] |
| 11 | `Garlic Cookies (I)` | GMO | accept; `package_says: indica` | Retail euphemism; bracketed category letter | [F 28] |
| 12 | `GELATO #33` | Gelato #33 | accept | `#` handling; siblings #41/#43 in index | [F 28] |
| 13 | `Larry Bird` | Gelato #33 | accept | Nickname with no shared tokens | [F 28, excerpt] |
| 14 | `Gelato 41` | Gelato #41 | accept (never #33) | Missing `#`; sibling pheno | [F 28] |
| 15 | `Gelato` | Gelato | accept the seed line, never a numbered pheno | Exact hit vs. strong fuzzy siblings | [O] |
| 16 | `TRUE GLTO 33` | Gelato #33 | choose | Brand-coined abbreviation; product-line word "TRUE" | [F 28] |
| 17 | `lot420-gelato33-pre-roll-1x1g` (QR slug) | Gelato #33 | choose | Glued digits; brand prefix; `1x1g` is not cross notation | [F 28] |
| 18 | `THE ORIGINAL Z` | Zkittlez | accept | Settlement rename | [F 25] |
| 19 | `Skittlez` | Zkittlez | accept (alias) | Spelling variant tied to the trademark | [F 25] + [O] |
| 20 | `Z` | — | none | Single letter left after stripping | [O] |
| 21 | `Chem Dog` | Chemdawg | accept | Spacing and spelling variant | [F 27] |
| 22 | `CHEM 91` | Chem 91 | accept (never Chemdawg) | Distinct cut, not an alias | [F 27] |
| 23 | `Chem D` | Chem D | accept | One-letter cut suffix must be kept | [F 27] |
| 24 | `Chem #4` | Chem 4 | accept (never GG4) | Same number as GG4; different base | [F 27] |
| 25 | `GREEN CRUSH` | Green Crack | accept | Retail euphemism | [F 29] |
| 26 | `Sunset Sherbert` | Sunset Sherbet* | accept | Spelling variant | [F 31] |
| 27 | `Sherbert` | Sunset Sherbet | choose | Truncated name; "Sherbet" is also a separate breeder line | [F 31] + [O] |
| 28 | `Triangle Mints #23` | Wedding Cake | accept | Breeder's original name | [F 30, excerpt] |
| 29 | `Pink Cookies` | Wedding Cake / others | choose, never accept | Inconsistently used name | [F 30] |
| 30 | `M.A.C. 1` | MAC 1 | accept | Dotted abbreviation plus number | [F 32] |
| 31 | `RUNTZ  White Runtz  3.5g` | White Runtz | accept (not Runtz) | Brand equals strain token | [F 33] + [O] |
| 32 | `COOKIES  Girl Scout Cookies  HYBRID` | Girl Scout Cookies | accept; `brand: Cookies` | Brand stripping must not eat the strain's own token | [F 33] + [O] |
| 33 | `Wedding Cake x Gelato 33` | — (unless sold as a named node) | none, or choose with both parents labelled "parents, not a match" | Unnamed cross; false-accept trap | [O] |
| 34 | `Gelato x Zkittlez` | — | none (never auto-infer Runtz) | Reported Runtz parentage must not turn into a match | [F 33] + [O] |
| 35 | `BLUE` / `DREAM` (two large lines) | Blue Dream | accept | Wrapped name | spec |
| 36 | `5 x 0.5g PRE-ROLLS  JACK HERER` | Jack Herer | accept | Quantity "x" is not cross notation | [O] |
| 37 | `AK47` | AK-47 | accept | Letter–digit split; hyphen | [O] |
| 38 | `HASH PLANT` | Hash Plant | accept | "hash" is also a product-form word | [O] |
| 39 | `SFV OG` | SFV OG | accept (never OG Kush) | Prefix cut name; `og` short token | [O] |
| 40 | `OG` | — | none | Generic token alone | [O] |
| 41 | `PURPIE PUNCH` | Purple Punch | accept, or choose (tune) | OCR `l`→`I` confusion | spec |
| 42 | `GDP` | Granddaddy Purple | accept | Abbreviation; alias needs a source | [O] |

\* Display-name choice (e.g. "Girl Scout Cookies" vs. "GSC", "Sunset Sherbet" vs. "Sherbert") is a curation
decision for T-007. Both forms belong in `name` + `aliases`. The test only checks that the input resolves to the
node.

---

## 3. US packaging (docs/06 §3)

### 3.1 State comparison (flower and pre-rolls)

| Element | California | Colorado | Washington | Michigan | New York |
| --- | --- | --- | --- | --- | --- |
| **Strain name required?** | No. The primary panel needs a generic "product identity" (e.g. "flower", "pre-roll") [F 9] | Not a required flower element [F 13] | Not in the flower list [F 14] | **Yes**: "Name of strain, if applicable" [F 16] | Not in §128.5 as read [F 18] |
| **Potency** | Total THC as % for non-manufactured goods [F 11]. Lab formula: acid × 0.877 + neutral [F 12, excerpt]. The DCC checklist describes Total THC as the sum of THC, Δ8-THC, and THCA [F 9]. Wording differs; re-check. | "% total THC and CBD" for the harvest batch, bold and outlined or highlighted [F 13] | Total THC (per WAC 314-55-102 formula) and total CBD [F 14] | THC and CBD "as reported by the laboratory", plus "the actual value may vary from the reported value by 10%" [F 16] | Total THC = THC + THCA × 0.877; per-package mg in bold; % for non-edibles [F 18] |
| **Track-and-trace on label** | UID required on the label itself [F 10] (Metrc state) | Harvest Batch Number [F 13] | Lot number matching the transport manifest [F 14]. WA uses CCRS, not Metrc [F 15, excerpt] | Package tag from the statewide monitoring system [F 16]. Example Metrc tags: `1A4050300013FED000097325` [F 17] | Lot UID, lot number, or barcode [F 18]. Metrc Retail Item ID QR on every unit since 2026 [F 19, excerpt] |
| **License / business ID** | Licensee name plus phone or website (no number listed for flower) [F 9] | Cultivation and store license numbers [F 13] | Business name plus 9-digit UBI [F 14] | Name and state license number of the cultivator/producer and packager [F 16] | Processor name, location, license number [F 18] |
| **Dates** | Packaging date, e.g. "PKG: 02/23/19" [F 9] | Date of sale (store-applied) [F 13] | Harvest date optional [F 14] | Harvest date; lab test date [F 16] | Expiration and use-by date [F 18] |
| **COA / QR** | QR or web links can't replace required label info [F 9] | Not mentioned; extra info allowed if consistent [F 13] | Pesticide statement via link, web address, or QR is required [F 14] | Lab name and test date [F 16] | **Scannable barcode or QR to a downloadable COA is required** [F 18] |
| **Warnings (key phrases for the lexicon)** | "GOVERNMENT WARNING: THIS PRODUCT CONTAINS CANNABIS, A SCHEDULE I CONTROLLED SUBSTANCE…" [F 10] | "Contains Marijuana. Keep away from children."; "This product was produced without regulatory oversight for health, safety, or efficacy." [F 13] | "Warning – May be habit forming"; "Unlawful outside Washington State"; "Smoking is hazardous to your health." [F 14] | "It is illegal to drive a motor vehicle while under the influence of marihuana."; "National Poison Control Center 1-800-222-1222"; "For use by individuals 21 years of age or older or registered qualifying patients only." [F 16] | "This product contains cannabis and THC"; "KEEP OUT OF REACH OF CHILDREN AND PETS. For use only by persons 21 years and older"; "Poison Center 1-800-222-1222"; "Warning: Smoking or vaping is hazardous to health" [F 18] |
| **Name / appeal limits** | No child appeal; no "candy"/"candies" wording [F 9]. Auditor flagged strain names (2025) [F 22] | — | "Especially appealing to persons under 21" includes names resembling products marketed to minors [F 14] | — | — |

Also:
- **Oregon:** OLCC's 2016 temporary rule rejected labels with child-appealing strain names [F 21].
- **Hemp-derived "THCa flower":** sold nationally under the delta-9 hemp definition. P.L. 119-37 (Nov 2025)
  redefines hemp by **total THC including THCA**, effective **Nov 12, 2026** [F 23]. That's about two weeks from
  this note. Labels that headline "THCa 28%" next to "Δ9-THC <0.3%" are common [O]. After the effective date these
  products may vanish or change. The parser should still handle old stock.

### 3.2 What's on a typical jar, bag, or tube [O]

From front to back: **brand** (largest or logo) → **strain name** (often the largest *text* line, but sometimes
smaller than the brand) → **category word or letter** ("Indica", "Hybrid", "(S)", "Indica-Dominant") → **form and
weight** ("Flower 3.5g", "Pre-Roll 1g", "5 × 0.5g") → **potency block** (THC, THCa, Total THC, CBD, sometimes
Total Cannabinoids and top terpenes) → compliance sticker on side or bottom (UID / lot / batch / license / dates /
lab) → **state warning block** → **universal symbol** → **QR** (COA, Retail ID, or brand site) and often a
**1D barcode** (POS SKU or track-and-trace UID). Dispensaries frequently add their own **exit/POS sticker** with a
second product name, which may be the menu name rather than the grower's spelling.

### 3.3 Potency: THC vs. THCa vs. Total THC

- Raw flower is mostly THCA. **Total THC = Δ9-THC + 0.877 × THCA** is the formula NY writes into its label rule
  [F 18], and the one CA's testing rule describes for acid forms [F 12, excerpt].
- Labels may show all three, or Total THC only (CO, WA), or "THC" ambiguously (MI) [F 13, 14, 16].
- Parser rule **[O]**: capture what's printed **with its basis**, prefer Total THC, and **never compute** a total
  ourselves (no derived values on the user's record). See P2.
- Tokens: `ND` (not detected), `<LOQ` (below limit of quantitation), `LOD`, `mg/g`, `%`, per-package `mg`.

### 3.4 Barcodes and QR codes

- CA requires the UID on each unit's label [F 10]. A vendor template encodes the Metrc UID as Code 128 [F 38,
  weak]. A DCC page (now 404) said the 24-character UID from the package tag must be printed on each unit's label
  [F 39, excerpt]. **Implication:** a Code 128 value that looks like a Metrc UID is per-package. It never repeats
  across purchases, so barcode memory can't learn from it (P13).
- Metrc **Retail ID** is a serialized per-unit QR live in 21 markets (June 2025). A scan shows origin, test
  results, COA, and potency [F 20]. **It is not a strain decision.** It could become a Phase 2 source of the
  product name, but only with network opt-in.
- NY requires a QR or barcode to the COA [F 18]. WA requires a link or QR to pesticide information [F 14].

---

## 4. Label-parser lexicon additions (for T-011)

Regexes are **[O]** starting points to test against the golden set, not specs.

**Potency (capture, then strip)**
- Labels: `THC`, `THCa`, `THCA`, `THC-A`, `Δ9-THC`, `D9-THC`, `Delta-9 THC`, `Delta 9`, `Δ8-THC`, `Total THC`,
  `TOTAL THC`, `Total Cannabinoids`, `TAC`, `Total Active Cannabinoids`, `CBD`, `CBDA`, `CBD-A`, `Total CBD`,
  `CBG`, `CBGA`, `CBN`, `THCV`.
- Values: `24.1%`, `24.1 %`, `241 mg/g`, `ND`, `<LOQ`, `< LOQ`, `LOQ`, `<LOD`, `<0.3%`, `<1%`, `0.0%`.
- Qualifiers to strip: `as reported by the laboratory`, `actual value may vary` (MI), `per package`, `per serving`,
  `per unit`.

**Category words (capture as `package_says`, plus raw text per P3)**
- `indica`, `sativa`, `hybrid`, `indica-dominant`, `indica dominant`, `sativa-dominant`, `indica hybrid`,
  `sativa hybrid`, `hybrid-indica`, `hybrid/indica`, `hybrid (i)`, `balanced`, `50/50`.
- Single letters `I`, `S`, `H` **only** inside brackets or after a delimiter: `(I)`, `[H]`, `| S |`, `-h-` in slugs.
  Never bare, because OCR produces stray letters [F 28 for usage; restriction is O].
- Not a type, ignore for `package_says`: `CBD`, `1:1`, `high CBD`.

**Product forms (strip, but see P6)**
- Flower: `flower`, `bud`, `buds`, `smalls`, `small buds`, `popcorn`, `shake`, `trim`, `ground flower`, `eighth`,
  `quarter`, `half`, `ounce`, `zip`.
- Pre-rolls: `pre-roll`, `preroll`, `pre roll`, `pre-rolls`, `PR`, `joint`, `joints`, `blunt`, `infused pre-roll`,
  `mini`, `minis`, `dogwalker`, `pack`, `5pk`, `5-pack`.
- Vapes: `cart`, `cartridge`, `510`, `pod`, `disposable`, `AIO`, `all-in-one`, `vape`.
- Concentrates: `live resin`, `cured resin`, `live rosin`, `rosin`, `badder`, `batter`, `budder`, `sugar`,
  `shatter`, `wax`, `crumble`, `diamonds`, `sauce`, `hash`, `bubble hash`, `ice water hash`, `kief`, `distillate`.
- Others: `edible`, `gummies`, `chocolate`, `beverage`, `tincture`, `topical`, `capsule`.
- **Collisions to protect (P6):** `hash` (Hash Plant), `sugar`, `diamonds`, `cake`, `cookies`, `punch`, `pie`,
  `mints`, `diesel`, `kush`.

**Quantities and units (strip)**
- `3.5g`, `3.5 G`, `1/8 oz`, `1/8`, `7g`, `14g`, `28g`, `1g`, `1.0g`, `.5g`, `0.5g`, `NET WT`, `Net Wt.`, `NET WT.
  0.125 oz (3.5 g)` [F 9 format], `5 x 0.5g`, `2 x 0.5g`, `1x1g`, `ct`, `count`.
- Quantity `x` pattern (not a cross): `\b\d+\s?[x×]\s?\d*\.?\d+\s?(g|mg)\b`.

**Compliance boilerplate (strip; exact phrases above)**
- Words: `GOVERNMENT WARNING`, `SCHEDULE I CONTROLLED SUBSTANCE`, `KEEP OUT OF REACH OF CHILDREN`, `AND ANIMALS`,
  `AND PETS`, `Contains Marijuana`, `Keep away from children`, `produced without regulatory oversight`,
  `May be habit forming`, `Unlawful outside Washington State`, `Smoking is hazardous`, `illegal to drive`,
  `operate machinery`, `Poison Control`, `1-800-222-1222`, `pregnant or breastfeeding`, `21 years of age or older`,
  `registered qualifying patients`, `This product contains cannabis and THC`, `For use only by persons 21`,
  `FOR MEDICAL USE ONLY`.
- Spellings: `cannabis`, `marijuana`, `marihuana` (MI statutory spelling) [F 16].

**Identifiers (strip; never candidates)**
- Labels: `UID`, `Package ID`, `Pkg ID`, `Package Tag`, `METRC`, `Metrc`, `Retail ID`, `Lot`, `Lot #`, `Lot No`,
  `Batch`, `Batch #`, `Harvest Batch`, `HB`, `Harvest`, `Harvest Date`, `PKG`, `Packaged`, `Pkg Date`, `Test Date`,
  `Tested`, `Tested by`, `Exp`, `Use by`, `Best by`, `License`, `Lic`, `Lic #`, `UBI`, `COA`,
  `Certificate of Analysis`.
- Metrc UID (observed in MI): `\b1A4[0-9A-Z]{21}\b` [F 17; regex is O]. Generic fallback: any standalone
  24-character uppercase alphanumeric token (track-and-trace IDs are 24 characters per [F 39, excerpt]).
- CA licenses: `\bC\d{1,2}-\d{7}-(LIC|APP)\b`, `\bCCL\d{2}-\d{7}\b`, `\bDCC-\d{8}\b` [F 35, third-party lookup].
- MI licenses: `\bAU-[A-Z]{1,2}(-[A-Z])?-\d{6}\b`, `\bPC-\d{6}\b` [F 36].
- WA UBI: `\b\d{3}[ -]?\d{3}[ -]?\d{3}\b` near `UBI` [F 14 for 9 digits].
- Dates: `\b\d{1,2}/\d{1,2}/\d{2,4}\b`, ISO dates, `PKG:` prefix.

**Brands** (a list that grows; capture as `brand`)
- Seed the list from the golden set (T-012), not from memory. Flag brand tokens that are also strain tokens
  (`Cookies`, `Runtz`, `Seed Junky`) so P6 protects them.

---

## 5. Taxonomy suggestions (for T-003)

All **[O]** unless noted. Compliance follows docs/09. Every description must be hedged.

**Effects**
- **Keep:** relaxed, calm, uplifted, happy, euphoric, energetic, focused, creative, talkative, giggly, sleepy,
  hungry, tingly. Negatives: dry-mouth, dry-eyes, dizzy, anxious, paranoid.
- **Drop `aroused`.** It invites sexual-performance readings, which sit close to therapeutic claims, and adds
  little. If kept, the description must be very plain.
- **Re-file `couch-lock`** as `polarity: neutral`. Many users seek it, others avoid it. Description: "Often
  described as a heavy, hard-to-get-up feeling."
- **Consider adding:** `heavy` / `body-high` (synonyms "body buzz", "heavy body") and `heady` / `cerebral`
  (synonyms "head high"). These are very common menu words. Negatives: `racy` (synonyms "racing heart", "jittery")
  and `groggy` (morning-after). Skip `headache`: it's symptom language and collides with the banned-term matcher
  (migraine).
- **Example descriptions:** "Sleepy: Commonly reported as drowsy, especially later in the day." "Hungry: Often
  reported to bring on the munchies." "Focused: Some people describe feeling locked in on a task." Never
  "helps", "for", or "relief".

**Flavors**
- **Add:** `garlic` (GMO family [F 28]), `sour`, `grapefruit`, `lime`, `mango`, `cherry`, `strawberry`,
  `blueberry`, `cream`, `nutty`, `hash` (synonyms "kushy", "hashy"), `incense`, `lavender`, `tea`, `chemical`
  (synonym "chem").
- **Synonyms:** `gas` ← "fuel", "gassy", "jet fuel". `diesel` stays separate (Sour Diesel family usage).
  `skunk` ← "skunky", "funk". `berry` ← "mixed berry".
- **Avoid `candy`, `candies`, and dessert or kid-treat terms** as flavor slugs. CA bans "candy" wording on labels
  [F 9], and the CA auditor flagged flavor-suggestive names [F 22]. Map them as synonyms to `sweet`.

**Terpenes**
- **Keep:** myrcene, limonene, caryophyllene, pinene, linalool, terpinolene, humulene, ocimene.
- **Add:** `farnesene` and `bisabolol` (both on many COAs; farnesene is in Watts' label-associated set [F 1]).
  Optionally `guaiol`.
- **Synonyms:** β-caryophyllene, beta-caryophyllene, b-caryophyllene, trans-caryophyllene, BCP → caryophyllene;
  α-pinene, β-pinene, alpha-pinene, a-pinene → pinene; d-limonene → limonene; α-humulene → humulene;
  α-bisabolol → bisabolol; β-myrcene → myrcene; trans-β-ocimene → ocimene.
- **Terpene descriptions** stay aroma-only ("Also found in hops; often described as earthy"). No "anti-" or
  pharmacology words.

**Banned-list additions (T-003)**
- medicinal, therapeutic, therapy, treatment, remedy, cure, heal, relief, symptom, sedative, anxiolytic,
  antidepressant, analgesic, anti-inflammatory, antiemetic, neuroprotective, appetite stimulant, sleep aid,
  "safe", "no side effects", "non-addictive".
- **Scope note:** the banned check applies to *our* copy, tags, and exports, **not** to OCR text. MI warnings
  legitimately contain "patients" [F 16].

---

## 6. Proposals needing a decision

| # | Proposal | Decides | Blocks |
| --- | --- | --- | --- |
| **P1** | Ruderalis: no default 50. Return null (unknown) or exclude autoflowers in v1. | Tech lead + founders | T-005, T-007 |
| **P2** | Scan schema: add `thc_basis: total \| thca \| delta9 \| unspecified` (and optional `thca_pct`). Store as printed, never compute. | Tech lead | **T-002** |
| **P3** | Keep `package_says_raw` (string), or extend `package_says` with a sublabel, so "Indica-dominant hybrid" isn't lost. | Tech lead | **T-002**, T-011 |
| **P4** | Keep cross notation as a token. Flag `cross_label`. Never auto-accept a single parent of an "A x B" label. Crosses sold under an "A x B" name are curated as searchable `strain` nodes. | Tech lead | T-008, T-007 |
| **P5** | Numbers are identity: a number mismatch blocks accept, and a missing number caps at choose. Split letter–digit boundaries; index both forms. | Tech lead | T-008 |
| **P6** | Match before strip: lexicon tokens are down-weighted, not deleted, when they sit inside a longer strain-name match. | Tech lead | T-011 |
| **P7** | Cuts/clones: no generation decay. Numbered phenos take the seed line's parents when sourced. S1 keeps its decay. Requires `ALGO_VERSION` care if T-005 has shipped. | Tech lead | T-005, T-007 |
| **P8** | Copy: "Lineage estimate… not a lab test". Package-says callout only when **direction** differs (indica-side vs. sativa-side), not on indica vs. hybrid/indica-dominant. Optional "close to the line" note within ±2 of a band edge. | Founders + product-designer | T-013, docs/08 |
| **P9** | Confidence level capped at `medium` when any contributing ancestor is `disputed`. | Tech lead | T-005 |
| **P10** | Landrace values: coarse fixed scale, written rubric, two sources each. Landrace-derived seed lines are `strain` nodes. | Founders (data approval) | T-007 |
| **P11** | Golden set covers at least CA, MI, NY, WA, CO labels plus one hemp THCa package. | Tech lead | T-012 |
| **P12** | Legal review (Q10) should cover whether showing names like "Zkittlez", "Candyland", or "Girl Scout Cookies" in our UI raises youth-appeal issues under docs/09, given state label restrictions [F 21, 22]. | Founders (Q10) | T-019 |
| **P13** | Barcode memory: don't learn mappings for values matching a track-and-trace UID pattern. Only UPC/EAN (and repeat-seen Code 128) are learnable. | Tech lead | T-010, T-015 |
| **P14** | Result copy: "We match the name on the package. We can't confirm what's inside" (counterfeit packaging exists [F 33]). | Founders + compliance reviewer | T-013 |

---

## 7. Direct doc edits made in this task

Every edit is clarifying or additive, with no algorithm or schema behavior change. Each is also listed in the
T-022 Log.

1. **docs/glossary.md:** split "Pheno / cut / clone-only" into accurate rows (Pheno, Cut/clone-only, Seed line).
   Added F1/F2, IBL, Polyhybrid, Indica/Sativa (vernacular), THCa, Total THC, Δ9-THC, ND/LOQ, UID/package tag,
   Retail ID, Lot/batch, Hemp-derived THCa flower, Brand vs. breeder. Corrected the METRC row (not every state
   uses it; WA uses CCRS).
2. **docs/05-classification-algorithm.md:** added "What the number means" with citations. Added a modeling note to
   the phenos/cuts/S1 bullet. Added edge cases for reciprocal crosses and folklore lineages. Flagged the ruderalis
   default as open (P1).
3. **docs/04-data-model.md:** clarified the `aliases` rule (same plant only; renames yes, sibling phenos and cuts
   no). Added a cross-note parent-order convention.
4. **docs/06-scan-pipeline.md:** extended the lexicon examples (potency, category variants, identifiers, state
   boilerplate). Added a traceability/Retail ID QR kind (not a strain decision). Added a note on Code 128
   track-and-trace barcodes. Added short tokens, a generic-token caution, and a number-identity note (scoring
   left to P5). Flagged cross-notation folding as open (P4). Added brand/form-word collision cautions (P6).

---

## 8. Sources

Retrieved 2026-10-26. "excerpt" = read via a search-result excerpt only.

1. Watts S. et al. (2021). *Cannabis labelling is associated with genetic variation in terpene synthase genes.*
   Nature Plants 7:1330–1334. doi:10.1038/s41477-021-01003-y. https://research.wur.nl/en/publications/cannabis-labelling-is-associated-with-genetic-variation-in-terpen/ (excerpt)
2. Sawler J. et al. (2015). *The Genetic Structure of Marijuana and Hemp.* PLOS ONE 10(8):e0133292.
   https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0133292
3. Smith C.J., Vergara D., Keegan B., Jikomes N. (2022). *The phytochemical diversity of commercial Cannabis in the
   United States.* PLOS ONE. doi:10.1371/journal.pone.0267498 (excerpt)
4. McPartland J.M. (2018). *Cannabis Systematics at the Levels of Family, Genus, and Species.* Cannabis and
   Cannabinoid Research 3(1):203–212. doi:10.1089/can.2018.0039 (excerpt)
5. McPartland J.M., Small E. (2020). PhytoKeys. https://phytokeys.pensoft.net/article_preview.php?id=46700 (excerpt)
6. Ren G. et al. (2021). *Large-scale whole-genome resequencing unravels the domestication history of Cannabis
   sativa.* Science Advances 7(29):eabg2286. doi:10.1126/sciadv.abg2286 (excerpt)
7. Hillig K.W. (2005). *Genetic evidence for speciation in Cannabis.* Genetic Resources and Crop Evolution
   52:161–180 (secondary references only)
8. Clarke R.C., Merlin M.D. (2013). *Cannabis: Evolution and Ethnobotany.* University of California Press (not
   read; recommended for T-007)
9. California DCC, *Labeling requirements: Non-manufactured products in final form.*
   https://www.cannabis.ca.gov/licensees/cannaconnect-compliance-hub/labeling/non-manufactured-final-form
10. Cal. Code Regs. tit. 4, § 17406. https://www.law.cornell.edu/regulations/california/4-CCR-17406
11. Cal. Code Regs. tit. 4, § 17407. https://law.cornell.edu/regulations/california/4-CCR-17407
12. Cal. Code Regs. tit. 4, § 15724. https://law.cornell.edu/regulations/california/4-CCR-15724 (excerpt)
13. 1 CCR 212-3, Rule 3-1010 (Colorado). https://www.law.cornell.edu/regulations/colorado/1-CCR-212-3-3-1010
14. WAC 314-55-105 (Washington). https://app.leg.wa.gov/wac/default.aspx?cite=314-55-105
15. WSLCB, CCRS. https://lcb.wa.gov/ccrs (excerpt)
16. Mich. Admin. Code R 420.504. https://www.law.cornell.edu/regulations/michigan/Mich-Admin-Code-R-420-504
17. Michigan CRA, formal complaint ENF 2600320 (Metrc tag examples).
    https://www.michigan.gov/cra/-/media/Project/Websites/cra/Link-Page/2026/Ground-Control-Michigan-dba-GCM-Waypoint-ENF-2600320--Formal-Complaint.pdf (excerpt)
18. 9 NYCRR § 128.5 (New York). https://www.law.cornell.edu/regulations/new-york/9-NYCRR-128.5
19. Cova Software, *Cannabis tracking labels explained.* https://www.covasoftware.com/blog/cannabis-tracking-labels-explained-rfid-package-ids-and-metrc-retail-id;
    Distru, NY Retail ID. https://www.distru.com/cannabis-blog/metrc-package-tags-vs-retail-id-ny-compliance-made-simple (excerpt)
20. Metrc press release, Retail ID in 21 markets (2025-06-11).
    https://www.metrc.com/news/metrc-retail-id-achieves-1-million-weekly-run-rate-of-qr-codes-across-21-markets-an-unprecedented-pace-for-cannabis-supply-chain-technology/
21. Cannabis Industry Journal, OLCC strain-name rule (2016-10-06). https://cannabisindustryjournal.com/tag/strain-name
22. California State Auditor, Report 2024-105 (Aug 2025). https://www.auditor.ca.gov/reports/2024-105; coverage:
    https://ganjapreneur.com/california-state-auditor-says-cannabis-packaging-is-too-attractive-to-children-calls-cannabis-agency-rules-unclear/ (excerpt)
23. UNC School of Government, *Winter 2026 Cannabis Update* (P.L. 119-37).
    https://nccriminallaw.sog.unc.edu/2026/01/14/winter-2026-cannabis-update/
24. Ganjapreneur, *Gorilla Glue trademark infringement lawsuit settled.*
    https://www.ganjapreneur.com/gorilla-glue-trademark-infringement-lawsuit-settled/ (excerpt)
25. Ganjapreneur, *Zkittlez creator Terphogz releases statement on settlement with Wrigley.*
    https://ganjapreneur.com/zkittlez-cannabis-creator-terphogz-releases-statement-on-settlement-with-skittles-candy-maker-wrigley (excerpt)
26. Vice Munchies, *How an LA weed dispensary pissed off the Girl Scouts.*
    https://munchies.vice.com/articles/how-an-la-weed-dispensary-pissed-off-the-girl-scouts; KGNU
    https://kgnu.org/?p=95617 (excerpt; secondary)
27. Leaf Magazines, *Cannthropology: Chemdog.* https://leafmagazines.com/culture/cannthropology-chemdog/ (excerpt)
28. Weedmaps retailer listings: GMO / Garlic Cookies
    https://weedmaps.com/dispensaries/the-jointme/menu/eighth-gmo-i-h-paul-s-boutique-4fdcba06-688d-48ab-a2d0-0dbf9af2adc5;
    Gelato 33 / Larry Bird / Sherbinskis phenos https://weedmaps.com/dispensaries/tge/menu/wavvy-gelato-33-h-flower-3-5g;
    "TRUE GLTO 33" https://weedmaps.com/deliveries/kindling-cannabis-dundas-delivery/menu/sherbinskis-true-glto-33-pure-live-resin-aio-hybrid-0-5g;
    slug https://weedmaps.com/dispensaries/cannabis-hut-2255/menu/lot420-gelato33-pre-roll-1x (excerpt; retailer copy, not breeder)
29. Leafly, *Green Crack.* https://www.leafly.com/strains/green-crack (excerpt)
30. Cannigma, *Wedding Cake.* https://cannigma.com/strains/wedding-cake/; Weedmaps, *Pink Cookies.*
    https://weedmaps.com/strains/pink-cookies (excerpt)
31. Weedmaps *Sherbet* https://weedmaps.com/strains/sherbet; Greenstate https://greenstate.com/reviews/sunset-sherbet-strain (excerpt)
32. Leaf Magazines, *Capulator: 10 years of the MAC.* https://leafmagazines.com/profiles/capulator-10-years-of-the-mac/; Weedmaps https://weedmaps.com/strains/mac (excerpt)
33. Leafly, *Runtz: 2020 Leafly strain of the year.* https://www.leafly.com/news/strains-products/runtz-2020-leafly-strain-of-the-year (excerpt)
34. Leafly, *Haze.* https://www.leafly.com/strains/haze; Leaf Magazines, *Behind the strain: Original Haze.*
    https://leafmagazines.com/learn/behind-the-strain-original-haze/ (excerpt)
35. HigherOrigins license lookup (third-party, DCC-derived): https://higherorigins.com/license-search/C11-0000512-LIC,
    https://www.higherorigins.com/license-search/CCL22-0001771 (excerpt)
36. Michigan CRA disciplinary documents with license numbers, e.g.
    https://www.michigan.gov/-/media/Project/Websites/cra/Disciplinary-Actions/2026/February/CP-Investment-Group-LLC-dba-Puff-AUR000524-Consent-Order-and-Stipulation-and-Formal-Complaint.pdf (excerpt)
37. Connecticut DCP, *How is total THC calculated.* https://portal.ct.gov/cannabis/knowledge-base/articles/how-is-total-thc-calculated (excerpt)
38. Cleverence, *Cannabis Compliance Label (Metrc-style) template.* https://www.cleverence.com/label/templates/gallery-cannabis-metrc-compliance (vendor; weak)
39. California DCC, *Reminder: packaging and labeling compliance* (2019).
    https://cannabis.ca.gov/2019/06/reminder-packaging-and-labeling-compliance-for-cannabis-and-cannabis-products (excerpt; page now returns 404)
