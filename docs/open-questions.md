# Open Questions

Decisions only the founders can make. Agents: don't guess these. If a task depends on one, stop and ask.
Record each answer here with a date, and write an ADR if it affects architecture.

## Still open

| # | Question | Blocks | Default if unanswered |
| --- | --- | --- | --- |
| Q8 | **Domain registrar and domain?** GitHub and Vercel are answered (below). | T-019 | Domain waits for the final name (Q11) |
| Q10 | **Legal review before public launch: who, and when?** Not covered by the small monthly budget (Q9). Scope must include candy-like strain names (P12) and name/trademark clearance (T-023). | T-019 | Required before public launch; not before a private beta |
| Q11 | **Final brand name and visual identity** (Roy). See [12-naming.md](12-naming.md) and [13-creative-brief.md](13-creative-brief.md). | T-004 final tokens, T-017 copy, T-019 domain | Build under "FlowerScan" with swappable tokens |

## Design, landrace and taxonomy decisions (decided 2026-10-26 by the tech lead)

From the founder review of the T-021 mockup, the T-007 landrace values, and the T-003 compliance questions.

**Design (T-021).** The direction is approved **with changes**: simplify hard. T-004 starts once the founder
signs off on the revised mockup.

| # | Topic | Decision | Applied in |
| --- | --- | --- | --- |
| D1 | Result hero | **A solid, bright class color** (Indica / Sativa / Hybrid green) with the strain name and the class word. Keep the result simple. | docs/02, docs/08, docs/design, T-004, T-013 |
| D2 | Percentage | **No % meter and no percentages shown to users.** The engine still computes `sativa_pct` for the label and confidence. Makes Q-D3 moot and removes risk M1 (reading % as potency). | docs/02, docs/08, T-004, T-013 |
| D3 | Flavors and terpenes | **Not shown, and not tagged in the MVP.** The vocabulary stays in taxonomy v1 for later. Effect tags (including negatives) stay. | docs/02, docs/04, T-007 follow-ups, T-013 |
| D4 | "Package says" callout | **Cut from the result.** Supersedes P8's callout. The printed claim is still stored with the scan and may appear as one plain line in "How we know". | docs/02, docs/08, T-013 |
| D5 | Share | **No Share button in the MVP.** Strain pages (`/s/<id>`) stay, reached from search and the family tree. | docs/02, docs/03, T-013, T-016 |
| D6 | Scan another | **Add a "Scan another" action** on the result that goes straight back to the live scanner. | docs/02, docs/08, T-013 |
| D7 | Scanner modes | **Auto only.** No Auto / Text / Barcode / QR control and no "Default mode" setting. | docs/02, docs/08, T-009 |
| D8 | Age gate Leave (Q-D1) | **Blocks the app for 24 hours on this device**, then the gate shows again. Legal review (Q10) may change it. | docs/design, T-017 |
| D9 | "Request it" (Q-D6) | **Cut from the MVP.** | docs/02, T-014 |
| D10 | Reported-only results (Q-D2) | Call them **"Reported type"**, not "Breeder's label". | docs/design, T-013 |
| D11 | Intro card (Q-D5) | **Keep it merged** with the camera card. | docs/08 |
| D12 | Hallway test (Q-D7) | **Keep the pass criteria**, and run it (T-026). | docs/design/hallway-test.md, T-026 |
| D13 | Full-screen answer | **The result takes over the screen in its class color** (Indica / Sativa / Hybrid), so the answer is obvious at a glance. Details sit below the fold or one tap away. | docs/08, docs/design, T-004, T-013 |
| D14 | No "dominant" on the result | **The immediate result shows only Indica, Sativa or Hybrid.** Dominance and other detail appear only when the user opens the strain ("How we know" / strain page). | docs/08, docs/design, T-013 |
| D15 | Hybrid means exactly 50/50 | **Label bands change (ALGO_VERSION 2):** rounded `sativa_pct` < 50 → Indica, exactly 50 → Hybrid, > 50 → Sativa. The old five bands survive only as the detail `sublabel`: ≤ 20 none, 21–49 indica-dominant, 50 balanced, 51–79 sativa-dominant, ≥ 80 none. Supersedes the docs/05 bands. | docs/04, docs/05, core lineage, T-005 follow-up |
| D16 | Result actions | **Scan another sits next to Save** in the always-visible bar (Scan another primary). Approved 2026-10-27. | docs/design, T-013 |
| D17 | "Also reported" (negative effects) | **Only in the details**, away from the answer screen. Approved 2026-10-27. | docs/design, T-013 |
| D18 | Package "X-dominant" wording | **A lean on the package maps to that side** (revises P3, 2026-10-27): "Indica-dominant", "indica hybrid", "hybrid (i)" and "(I)" → `indica`; the sativa equivalents → `sativa`; bare "hybrid", "balanced" and "(H)" → `hybrid`. Matches D15. | docs/06, T-011 |

**Still waiting on the founder** (details in docs/design/README.md): final sign-off on the T-021 design so T-004 can
start; the designer's extra cuts (Q-D8, Q-D10, e.g. lists drop dominance, the strain page keeps a color block
instead of a full flood); the new Scan another and "answer within 2 s" hallway-test criteria; product form kept in
the journal but off the result; Q-D9 (packages printing "Hybrid" will usually show Sativa or Indica, with only a
"Package says" line in the details).

**Landrace values (T-007, P10).** These set the values in the vault. Each note stays `unverified` until a
founder sets `verification: verified` in Obsidian (agents never do).

| # | Topic | Decision | Applied in |
| --- | --- | --- | --- |
| L1 | How "documented influence" is judged | **By the specific seed line cited**, not the whole country. | LANDRACE-RUBRIC.md |
| L2 | South African landrace | **90.** The rubric's "sub-tropical origin → 75" clause is removed, so 75 now means only documented broad-leaf influence in the line. | LANDRACE-RUBRIC.md, vault (T-027) |
| L3 | Hindu Kush landrace | **10.** | vault |
| L4 | Thai landrace | **90** (follows from L1). | vault |
| L5 | Acapulco Gold | **Sativa**, citing Jeeter's product information as `reported_type`. T-027 found a seed-bank source (The Landrace Team); **`base_sativa_pct` 90 approved 2026-10-27** (90 = strongly sativa on the 10–90 landrace scale). | vault (T-027) |

**Taxonomy compliance (T-003).**

| # | Topic | Decision | Applied in |
| --- | --- | --- | --- |
| C1 | Strain names vs. banned terms | **Strain names are exempt** from `assertNoBannedTerms` (they're proper nouns). P12 still covers how they're displayed. | banned.yaml, docs/09, T-006, test plan X-03 |
| C2 | Where the automated check runs | **Taxonomy terms, vault strain notes, and rendered result screens.** Other app copy (backup, privacy, settings) gets a human/reviewer compliance pass instead, so "keep your backup file safe" isn't blocked. | docs/09, T-006, T-013, test plan |
| C3 | "anxiety" | **Stays banned** as a bare word. The negative tag is `anxious`. | banned.yaml |
| C4 | Flavors and terpenes | **Kept in taxonomy v1, not tagged in the MVP** (same as D3). | taxonomy.yaml, T-007 follow-ups |

Still open from T-003, for the cannabis-expert: the polarity re-files (sleepy, hungry, talkative, tingly, giggly →
neutral). The 50-term cap and the "candy" synonym matter less now that flavors aren't shown.

## Domain decisions from T-022 (decided 2026-10-26 by the tech lead)

Proposals from the cannabis domain review ([research/2026-10-26-domain-review.md §6](research/2026-10-26-domain-review.md#6-proposals-needing-a-decision)).
Specs and tasks were updated to match in the same change.

| # | Topic | Decision | Applied in |
| --- | --- | --- | --- |
| P1 | Ruderalis / autoflowers | **Exclude autoflowers from v1.** No ruderalis landraces or autoflower strains in the vault, so no invented 50/50 value. Revisit in v2. | docs/05, T-005, T-006, T-007 |
| P2 | THC on packages | **Record every potency figure exactly as printed, with its type** (Total THC, THCa, Δ9-THC, CBD…). Never compute totals. **Not user-facing:** users never see THC numbers. Readings feed a **back-of-house potency table** (strain × brand × state over time) for our own database and future projects. **Source now:** packages the founders record (eval photo set, founder scans). **Later (Phase 2):** anonymous user opt-in. | docs/04, docs/06, docs/08, docs/09, T-002, T-011, T-013, T-025 |
| P3 | Package label wording | **Keep the 3 words only** (`indica` / `sativa` / `hybrid`). **Revised by D18 (2026-10-27):** a dominant/lean variant maps to its side; only bare "hybrid"-style wording maps to `hybrid`. | docs/06, T-011 |
| P4 | "A x B" cross labels | **Never auto-accept a single parent.** Cross notation stays a marker token. A cross sold under an "A x B" name is curated as its own `strain` node, otherwise "Which one?". | docs/06, T-007, T-008 |
| P5 | Numbers in names | **Numbers are identity.** A number mismatch blocks auto-accept. A missing number caps the outcome at "Which one?". | docs/06, T-008 |
| P6 | Brand/product words inside strain names | **Match before stripping.** Lexicon words are down-weighted, not deleted, inside a longer strain-name match. | docs/06, T-011 |
| P7 | Clones and numbered phenos | **Cuts (clones) get no generation decay. Numbered phenos take the seed line's parents** when sourced. S1s keep the decay. | docs/04, docs/05, T-002, T-005, T-007 |
| P8 | "Package says" callout | **Superseded by D4 (2026-10-26): the callout is cut from the result.** Original decision: **only when direction is opposite** (indica-side vs. sativa-side). Result copy says "Lineage estimate, not a lab test", plus a "close to the line" note within ±2 of a band edge. | docs/08, T-013 |
| P9 | Disputed lineage | **No confidence cap.** Disputed ancestors are marked in the family tree ("lineage disputed") instead. | docs/05, docs/08, T-005, T-013 |
| P10 | Landrace base values | **Coarse scale (10 / 25 / 50 / 75 / 90), a written rubric, two sources each.** No source means no value. Place-named seed lines are `strain` nodes with a landrace parent. Founders approve every value. | docs/04, docs/05, T-007 |
| P11 | Golden photo set | **Cover CA, MI, NY, WA, CO labels plus one hemp THCa package** before launch. | data/eval, T-012 |
| P12 | Candy-like strain names | **Show them as plain text** (no candy imagery or playful styling around them), and **add the question to the legal review scope** (Q10). | docs/09, T-017, T-019 |
| P13 | Tracking barcodes | **Don't learn barcode memory for track-and-trace UIDs.** Only UPC/EAN, plus Code 128 values seen more than once. | docs/06, T-010, T-015 |
| P14 | "Can't confirm what's inside" | **About page only** ("We match the name on the package. We can't confirm what's inside."), not on the result screen. | docs/08, T-017 |

## Answered (2026-10-27)

| # | Question | Answer | Effect on the plan |
| --- | --- | --- | --- |
| Q8a | GitHub home and visibility? | **Public repo at [github.com/AhtomicStudio/flowerscan](https://github.com/AhtomicStudio/flowerscan)**, all rights reserved (no license). History was rewritten before the first push to use the GitHub no-reply email. | Kept local and gitignored: `docs/brand/drafts/` (unannounced names), `data/observations/` (P2 potency data), eval package photos. The strain vault is public. Vercel builds from `vercel.json`: previews include unverified notes, production uses the default shipping policy. |
| Q8b | Vercel? | **The tech lead's personal Vercel account**, project `flowerscan`, Root Directory = repo root. Production: [flowerscan-vgh8.vercel.app](https://flowerscan-vgh8.vercel.app). Branch and PR previews are behind Vercel login (Deployment Protection). | Every push to `main` deploys production; every PR gets a preview. |

## Answered (2026-10-25)

| # | Question | Answer | Effect on the plan |
| --- | --- | --- | --- |
| Q1 | Cannapickforme feature or separate brand? | **Separate brand.** | Own name, domain, tokens, and voice. Cannapickforme tokens don't apply. Cross-promotion stays possible later. Name/identity becomes Q11 (Roy). |
| Q2 | Existing strain database? | **No. Build from scratch.** | T-007 curates our own vault: landraces + the 50 most common strains first, 150–300 by launch. |
| Q3 | Launch market? | **US, 21+.** | Age gate is a fixed 21+. Keep the age in one constant so other markets are possible later. |
| Q4 | Who approves data? | **AI drafts, founders approve.** | The data-curator agent researches with sources and sets `unverified`/`disputed`. Only a founder sets `verified`. |
| Q5 | Who is Obsidian for? | **Just us (curation).** | The Obsidian vault stays the database source (ADR-0003). **End-user Obsidian export leaves the MVP.** Users get a journal backup file instead (T-016 rewritten). The share link was later cut from the MVP (D5). User-facing Markdown export moves to Phase 2 as an option. |
| Q6 | Monetization? | **Free for now.** | No ads, sponsorships, affiliates, or payments in the MVP. Revisit after real usage. |
| Q7 | Team and tools? | **Tech lead** (the user) builds with Claude Code + Gemini. **Roy** owns marketing and creative and uses Grok. | AGENTS.md targets Claude and Gemini coding agents. Roy's deliverables (name, identity, voice, launch assets) are scoped in [13-creative-brief.md](13-creative-brief.md). No GROK.md needed, since Roy isn't working in the code. |
| Q9 | Budget? | **Small monthly budget** (about $20–50/month). | Covers a domain plus privacy-friendly cookieless analytics, and Vercel Pro if we outgrow hobby limits. Cloud OCR stays out unless the eval (T-012) proves it's needed and it fits the budget. Legal review is outside this budget (see Q10). |
