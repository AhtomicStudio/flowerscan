# Open Questions

Decisions only the founders can make. Agents: don't guess these. If a task depends on one, stop and ask.
Record each answer here with a date, and write an ADR if it affects architecture.

## Still open

| # | Question | Blocks | Default if unanswered |
| --- | --- | --- | --- |
| Q8 | **GitHub org/repo, Vercel team, domain registrar?** | T-001 CI, T-019 | Create when T-001 starts |
| Q10 | **Legal review before public launch: who, and when?** Not covered by the small monthly budget (Q9). | T-019 | Required before public launch; not before a private beta |
| Q11 | **Final brand name and visual identity** (Roy). See [12-naming.md](12-naming.md) and [13-creative-brief.md](13-creative-brief.md). | T-004 final tokens, T-017 copy, T-019 domain | Build under "FlowerScan" with swappable tokens |

## Domain proposals from T-022 (pending tech-lead / founder decision)

From the cannabis domain review ([research/2026-10-26-domain-review.md §6](research/2026-10-26-domain-review.md#6-proposals-needing-a-decision)).
Recommended default: **accept all.** Each one makes the product more honest or prevents a false accept.

| # | Proposal (short) | Blocks |
| --- | --- | --- |
| P1 | Ruderalis has no default 50: return unknown (or exclude autoflowers in v1) | T-005, T-007 |
| P2 | Scan stores `thc_basis` (total / thca / delta9 / unspecified), as printed, never computed | **T-002** |
| P3 | Keep the full package label ("Indica-dominant hybrid"), not just the indica/sativa/hybrid word | **T-002**, T-011 |
| P4 | "A x B" cross labels never auto-accept a single parent | T-008, T-007 |
| P5 | Numbers are identity: `#4` ≠ `#5`. A mismatch blocks auto-accept | T-008 |
| P6 | Match before stripping lexicon words (so Cookies, Runtz, Hash Plant survive) | T-011 |
| P7 | Cuts/clones get no generation decay; numbered phenos take the seed line's parents | T-005, T-007 |
| P8 | "Package says" callout only when the *direction* differs; "lineage estimate, not a lab test" copy | T-013, docs/08 |
| P9 | Confidence capped at medium when any ancestor is disputed | T-005 |
| P10 | Landrace values: coarse fixed scale, written rubric, two sources each | T-007 |
| P11 | Golden set covers CA, MI, NY, WA, CO labels plus one hemp THCa package | T-012 |
| P12 | Legal review (Q10) to cover youth-appeal risk of candy-like strain names in the UI | T-019 |
| P13 | Don't learn barcode memory for track-and-trace UIDs | T-010, T-015 |
| P14 | Result copy: "We match the name on the package. We can't confirm what's inside" | T-013 |

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
