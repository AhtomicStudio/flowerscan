# Open Questions

Decisions only the founders can make. Agents: don't guess these. If a task depends on one, stop and ask.
Record each answer here with a date, and write an ADR if it affects architecture.

## Still open

| # | Question | Blocks | Default if unanswered |
| --- | --- | --- | --- |
| Q8 | **GitHub org/repo, Vercel team, domain registrar?** | T-001 CI, T-019 | Create when T-001 starts |
| Q10 | **Legal review before public launch: who, and when?** Not covered by the small monthly budget (Q9). Scope must include candy-like strain names (P12) and name/trademark clearance (T-023). | T-019 | Required before public launch; not before a private beta |
| Q11 | **Final brand name and visual identity** (Roy). See [12-naming.md](12-naming.md) and [13-creative-brief.md](13-creative-brief.md). | T-004 final tokens, T-017 copy, T-019 domain | Build under "FlowerScan" with swappable tokens |

## Domain decisions from T-022 (decided 2026-10-26 by the tech lead)

Proposals from the cannabis domain review ([research/2026-10-26-domain-review.md §6](research/2026-10-26-domain-review.md#6-proposals-needing-a-decision)).
Specs and tasks were updated to match in the same change.

| # | Topic | Decision | Applied in |
| --- | --- | --- | --- |
| P1 | Ruderalis / autoflowers | **Exclude autoflowers from v1.** No ruderalis landraces or autoflower strains in the vault, so no invented 50/50 value. Revisit in v2. | docs/05, T-005, T-006, T-007 |
| P2 | THC on packages | **Record every potency figure exactly as printed, with its type** (Total THC, THCa, Δ9-THC, CBD…). Never compute totals. **Not user-facing:** users never see THC numbers. Readings feed a **back-of-house potency table** (strain × brand × state over time) for our own database and future projects. **Source now:** packages the founders record (eval photo set, founder scans). **Later (Phase 2):** anonymous user opt-in. | docs/04, docs/06, docs/08, docs/09, T-002, T-011, T-013, T-025 |
| P3 | Package label wording | **Keep the 3 words only** (`indica` / `sativa` / `hybrid`). "Indica-dominant hybrid" and similar variants map to `hybrid`. | docs/06, T-011 |
| P4 | "A x B" cross labels | **Never auto-accept a single parent.** Cross notation stays a marker token. A cross sold under an "A x B" name is curated as its own `strain` node, otherwise "Which one?". | docs/06, T-007, T-008 |
| P5 | Numbers in names | **Numbers are identity.** A number mismatch blocks auto-accept. A missing number caps the outcome at "Which one?". | docs/06, T-008 |
| P6 | Brand/product words inside strain names | **Match before stripping.** Lexicon words are down-weighted, not deleted, inside a longer strain-name match. | docs/06, T-011 |
| P7 | Clones and numbered phenos | **Cuts (clones) get no generation decay. Numbered phenos take the seed line's parents** when sourced. S1s keep the decay. | docs/04, docs/05, T-002, T-005, T-007 |
| P8 | "Package says" callout | **Only when direction is opposite** (indica-side vs. sativa-side). Result copy says "Lineage estimate, not a lab test", plus a "close to the line" note within ±2 of a band edge. | docs/08, T-013 |
| P9 | Disputed lineage | **No confidence cap.** Disputed ancestors are marked in the family tree ("lineage disputed") instead. | docs/05, docs/08, T-005, T-013 |
| P10 | Landrace base values | **Coarse scale (10 / 25 / 50 / 75 / 90), a written rubric, two sources each.** No source means no value. Place-named seed lines are `strain` nodes with a landrace parent. Founders approve every value. | docs/04, docs/05, T-007 |
| P11 | Golden photo set | **Cover CA, MI, NY, WA, CO labels plus one hemp THCa package** before launch. | data/eval, T-012 |
| P12 | Candy-like strain names | **Show them as plain text** (no candy imagery or playful styling around them), and **add the question to the legal review scope** (Q10). | docs/09, T-017, T-019 |
| P13 | Tracking barcodes | **Don't learn barcode memory for track-and-trace UIDs.** Only UPC/EAN, plus Code 128 values seen more than once. | docs/06, T-010, T-015 |
| P14 | "Can't confirm what's inside" | **About page only** ("We match the name on the package. We can't confirm what's inside."), not on the result screen. | docs/08, T-017 |

## Answered (2026-10-25)

| # | Question | Answer | Effect on the plan |
| --- | --- | --- | --- |
| Q1 | Cannapickforme feature or separate brand? | **Separate brand.** | Own name, domain, tokens, and voice. Cannapickforme tokens don't apply. Cross-promotion stays possible later. Name/identity becomes Q11 (Roy). |
| Q2 | Existing strain database? | **No. Build from scratch.** | T-007 curates our own vault: landraces + the 50 most common strains first, 150–300 by launch. |
| Q3 | Launch market? | **US, 21+.** | Age gate is a fixed 21+. Keep the age in one constant so other markets are possible later. |
| Q4 | Who approves data? | **AI drafts, founders approve.** | The data-curator agent researches with sources and sets `unverified`/`disputed`. Only a founder sets `verified`. |
| Q5 | Who is Obsidian for? | **Just us (curation).** | The Obsidian vault stays the database source (ADR-0003). **End-user Obsidian export leaves the MVP.** Users get a share link and a journal backup file instead (T-016 rewritten). User-facing Markdown export moves to Phase 2 as an option. |
| Q6 | Monetization? | **Free for now.** | No ads, sponsorships, affiliates, or payments in the MVP. Revisit after real usage. |
| Q7 | Team and tools? | **Tech lead** (the user) builds with Claude Code + Gemini. **Roy** owns marketing and creative and uses Grok. | AGENTS.md targets Claude and Gemini coding agents. Roy's deliverables (name, identity, voice, launch assets) are scoped in [13-creative-brief.md](13-creative-brief.md). No GROK.md needed, since Roy isn't working in the code. |
| Q9 | Budget? | **Small monthly budget** (about $20–50/month). | Covers a domain plus privacy-friendly cookieless analytics, and Vercel Pro if we outgrow hobby limits. Cloud OCR stays out unless the eval (T-012) proves it's needed and it fits the budget. Legal review is outside this budget (see Q10). |
