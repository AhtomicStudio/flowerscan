---
id: T-003
title: Taxonomy v1 + banned terms
milestone: M0
status: review
owner: data-curator
depends_on: [T-002]
touches: [data/taxonomy/taxonomy.yaml, data/taxonomy/banned.yaml, packages/core/src/taxonomy/, packages/core/test/taxonomy/]
docs: [docs/04-data-model.md, docs/09-compliance-and-privacy.md]
---

## Goal
A reviewed, compliant controlled vocabulary of about 40 terms across `effect`, `flavor`, and `terpene`, plus
a banned-terms list the build enforces.

## Requirements
- Start from the starter vocabulary in docs/04. Each term gets `slug, facet, label, polarity, description, synonyms, status`.
- Descriptions: one hedged sentence, no medical language.
- `banned.yaml`: medical conditions and therapeutic phrases (pain, insomnia, anxiety relief, depression,
  stress relief, nausea, PTSD, migraine, seizure, inflammation, "treats", "cures", "heals", "relief"…),
  matched case-insensitively as whole words or phrases.
- `core/taxonomy`: `loadTaxonomy(parsed, banned)` (already-parsed YAML; core has no YAML parser), `loadBannedTerms(parsed)`,
  `assertNoBannedTerms(text, banned)` / `findBannedTerms`, and lookup by slug (`getTerm`) or slug/label/synonym (`resolveTerm`).
- Version field at the top of the file (`taxonomy_version: 1`).

## Acceptance criteria
- [x] 35–50 active terms, none banned, all descriptions hedged.
- [x] Unit tests: banned term in a description fails; synonyms resolve; deprecated terms resolve to `replaced_by`.
- [ ] Compliance reviewer sign-off noted in the Log.

## Out of scope
Assigning tags to strains (T-007).

## Log
### 2026-10-26 (data-curator)
**Claimed** and split: data-curator did the data half (`data/taxonomy/taxonomy.yaml`, `data/taxonomy/banned.yaml`).
No files outside `data/taxonomy/**` and this task file were touched.

**Follow-up for core-engineer (not done here, box 2 stays unchecked).** Add `packages/core/src/taxonomy/` with
`loadTaxonomy`, `assertNoBannedTerms` and slug/synonym lookup, plus the unit tests in acceptance box 2. Core has no
YAML parser, so these take an **already-parsed object**, not a YAML string. The Requirements line
`loadTaxonomy(yamlString)` needs that wording change when the core work lands. Shape to expect:
- `taxonomy.yaml`: top-level keys `taxonomy_version` (int) and `terms` (array of `TaxonomyTermSchema`).
- `banned.yaml`: top-level keys `banned_version` (int) and four string lists, `conditions`, `claims`,
  `pharmacology` and `safety`, all checked the same way. The matching rules are in the file header:
  case-insensitive, whole word or phrase (no letter or digit on either side), a space matches any whitespace
  run, no stemming. Run it over slug, label, description and every synonym.
- Suggested extra checks: a label or synonym maps to one slug only, and no synonym equals another term's slug.

**Validation.** Both files parsed (PyYAML, scratchpad only, not a repo dependency), and every term was checked
against the real `TaxonomyTermSchema` from `packages/core/src/schema/taxonomy-term.ts` using tsx. Result: 0 errors.
Also checked: unique slugs, no label or synonym mapping to two terms, one sentence per description, a hedge opener
on every description, and banned lists that are sorted, lowercase and duplicate-free. A throwaway whole-word
matcher found **no banned term** in any slug, label, description or synonym. Sanity cases: "Pain-free" hits,
"paint" and "Spain" don't, "STRESS   RELIEF" hits, "treat it as an estimate" doesn't. I also ran the matcher over
`docs/design/screens/*.md`, docs/08 and the mockup HTML: the only hits are spec prose and CSS (`safe-area`, "No
medical content", "color treatment"), and the mockup's visible copy has none. No code changed, so
typecheck/lint/test were not run.

**Counts: 50 active terms** (the 35–50 cap; README's target is about 40, see decisions below).
| Facet | Positive | Neutral | Negative | Total |
| --- | --- | --- | --- | --- |
| effect | 8 | 7 | 7 | 22 |
| flavor | | 20 | | 20 |
| terpene | | 8 | | 8 |

**Versus the docs/04 starter list (50 terms).**
- Effects. Dropped `aroused` (domain review §5: invites sexual-performance readings). Added `body-high`, `racy`
  and `foggy` (synonym `groggy`). Re-filed as `neutral`: `couch-lock` (domain review), plus `sleepy`, `hungry`,
  `talkative`, `tingly` and `giggly`, because Stith 2020 Table 3 classes Sleepy, Hungry, Couchlocked, Talkative,
  Tingly and Silly as "context-specific". Neutral is also the safer choice for compliance: a `positive` sleepy or
  hungry reads close to a sleep-aid or appetite claim.
- Flavors. Added `chemical`. Folded `vanilla` into a synonym of `sweet` to stay within 50. Dropped outright:
  `coffee` and `chocolate`. `chocolate` had no source among those read; `coffee`
  is in Gilbert 2018 but lost on budget. `pepper` and `spicy` stay separate (Isaacson 2025 lists Pepper and Baking
  spices as distinct terms).
- Terpenes: the 8 starter terms, unchanged.
- Considered but deferred (budget or no primary source read this session): `heady` (synonyms only from the domain
  review, overlaps `euphoric`/`uplifted`), `groggy` as a slug (it's a `foggy` synonym), `garlic` (backed only by
  the domain review's retailer listings [F 28]; Oswald 2023 uses "garlic" only in variety names, not as a
  descriptor), `sour`, `hash`, `cream`, `nutty`, `incense`, `cherry`, `farnesene` (Watts 2021 is paywalled, so not
  verified), `bisabolol` (sourced in Smith 2022 and Wikipedia, but over budget), `guaiol`. As synonyms instead:
  grapefruit and lime → `citrus`; mango and pineapple → `tropical`; blueberry, strawberry and mixed berry → `berry`;
  lavender, rose and violet → `floral`; tea and sage → `herbal`; candy → `sweet`.

**Sources** (all retrieved 2026-10-26; also listed in the `taxonomy.yaml` header, with per-term `# src:` comments):
- Domain review §5, `docs/research/2026-10-26-domain-review.md` (internal): additions, synonyms, terpene spellings.
- Gilbert & DiVerdi 2018, PLOS ONE, doi:10.1371/journal.pone.0192247, CC BY. Table 1, 48 odor descriptors
  (https://pmc.ncbi.nlm.nih.gov/articles/PMC5798829/). Backs `chemical` and most flavor synonyms.
- Isaacson et al. 2025, PLOS ONE, doi:10.1371/journal.pone.0335125, CC BY. Table 1, 25-term aroma lexicon
  (https://pmc.ncbi.nlm.nih.gov/articles/PMC12539713/). Backs `chemical`, gas/fuel, pepper vs. spices.
- Oswald et al. 2023, ACS Omega, doi:10.1021/acsomega.3c04496, CC BY-NC-ND, facts only
  (https://pmc.ncbi.nlm.nih.gov/articles/PMC10601067/). Backs gas = gasoline, chemical, tangerine.
- Stith et al. 2020, J Cannabis Res, doi:10.1186/s42238-020-00051-z, CC BY. Table 3, effect polarity
  (https://pmc.ncbi.nlm.nih.gov/articles/PMC7819324/). Backs `foggy`, neutral polarities, and effect synonyms.
  It's a medically framed study, used **only** for effect words and their positive/negative/context-specific class.
- LaFrance et al. 2020, J Cannabis Res, doi:10.1186/s42238-019-0013-x, CC BY. Table 2, adverse reactions
  (https://pmc.ncbi.nlm.nih.gov/articles/PMC7819287/). Backs `racy` (Racing Heart), `body-high` (Body Humming),
  and the `dizzy` synonyms.
- Smith et al. 2022, PLOS ONE, doi:10.1371/journal.pone.0267498, CC BY (https://pmc.ncbi.nlm.nih.gov/articles/PMC9119530/).
  Backs the terpene names and lab spellings.
- PubChem odor fields (CIDs 22311, 31253, 5281515, 6654, 6549, 11463, 18756), read via PUG-View, which permits
  programmatic access. Backs the terpene aroma descriptions.
- Wikipedia "Humulene", CC BY-SA. Backs the humulene/hops description.
Descriptions are my own wording. Nothing was copied from strain sites. `data/vault/SOURCES.md` doesn't exist yet and
`data/vault/` is out of scope, so the source log lives in the YAML header for now.

**Banned list: 209 entries**: `conditions` 87, `claims` 76, `pharmacology` 32, `safety` 14. It covers everything
in the task, docs/04 and docs/09, plus every domain-review §5 addition. Deliberately left out: bare "treat",
because current result/About copy uses it as a verb ("treat it as an estimate"); bare "stress", "sleep" and
"appetite" (only the claim phrases are listed); and acronyms that collide with ordinary words ("add", "ms").

**Needs a decision (compliance reviewer / founders):**
1. **Strain names vs. the banned list.** A real strain name containing a banned word would fail
   `assertNoBannedTerms` on rendered result screens (test-plan X-03). Decide whether strain names are exempt.
   The banned.yaml header marks this as open.
2. **"safe" as a whole word.** This blocks harmless copy such as "keep your backup file safe" on the Privacy or
   Backup screens. Keep it (docs/09 lists "Safe" as a Don't) and have copy avoid it, or narrow it to phrases.
3. **Broad phrases** "good for", "great for", "prevent" and "immune" can collide with neutral UI copy. They're
   currently banned, so copywriters must avoid them.
4. **"anxiety" is banned as a bare word**, to catch "great for anxiety"-style claims. The negative tag uses
   `anxious` / "uneasy or on edge" instead, so "anxiety" can't be a synonym.
5. **"candy" as an import-only synonym of `sweet`** (domain review §5). It's never displayed, but compliance should
   confirm. Youth-appeal words (candy, dessert) aren't banned here: that list is medical-only by task scope.
6. **Polarity re-files** (sleepy, hungry, talkative, tingly, giggly → neutral): cannabis-expert to confirm.
7. **50 is the cap.** Adding garlic, sour or hash (all strong menu words) means swapping a term out. Cannabis-expert
   to pick.

**Follow-ups outside my lane:** core taxonomy module and tests (above). Docs/04's starter list now differs from v1:
someone with `docs/` scope should point it at `taxonomy.yaml` as the source of truth, or update the list.

Status → `review`. Awaiting cannabis-expert and compliance reviewer sign-off. The core work is a separate follow-up.

### 2026-10-26 (coordinator, founder decisions)
Founder answers to the "Needs a decision" list, recorded in docs/open-questions.md (C1–C4):
1. Strain names (and aliases) are **exempt** from `assertNoBannedTerms` (C1).
2. and 3. The automated check runs on taxonomy terms, vault strain notes and rendered result screens only (C2).
   Other app copy gets a reviewer compliance pass, so "safe", "good for", "prevent" and "immune" can stay on the
   list without blocking UI copy like "keep your backup file safe".
4. "anxiety" **stays banned** (C3).
5. and 7. Flavors and terpenes are **kept in v1 but not shown or tagged in the MVP** (D3/C4), so the "candy"
   synonym and the 50-term cap no longer block anything.
6. Polarity re-files: still waiting on the cannabis-expert.
The banned.yaml header note moves to T-027. The core loader/check (box 2) lands with T-006.

### 2026-10-27 (core-engineer, via T-006)
**Box 2 done.** `packages/core/src/taxonomy/` landed with T-006: `loadBannedTerms`, `findBannedTerms`,
`assertNoBannedTerms` (throws `BannedTermError`), `loadTaxonomy(parsed, banned)`, `getTerm`, `resolveTerm`. Tests in
`packages/core/test/taxonomy/` (33): a banned term in a description, label, synonym or slug fails; synonyms and labels
resolve (case, whitespace and hyphen-insensitive); deprecated terms resolve to `replaced_by`, following chains.
`loadTaxonomy` also enforces the suggested extra checks: unique slugs, and every slug, label and synonym names one
term only (slugs are claimed first, so no synonym can equal another term's slug); `replaced_by` must exist, stay in
its facet, and not loop. Matching follows the banned.yaml header, with one clarification: an apostrophe in an entry
also matches the typographic ones (’ ‘ ʼ). A vault-build test loads the real `taxonomy.yaml` and `banned.yaml`: both
pass, with no banned hits. Requirements wording updated (the loader takes the parsed object plus the banned list).
Box 3 (compliance reviewer sign-off) is still open.
