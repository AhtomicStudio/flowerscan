# Open Questions

Decisions only the founders can make. Agents: don't guess these. If a task depends on one, stop and ask.
Record each answer here with a date, and write an ADR if it affects architecture.

## Still open

| # | Question | Blocks | Default if unanswered |
| --- | --- | --- | --- |
| Q8 | **GitHub org/repo, Vercel team, domain registrar?** | T-001 CI, T-019 | Create when T-001 starts |
| Q10 | **Legal review before public launch: who, and when?** Not covered by the small monthly budget (Q9). | T-019 | Required before public launch; not before a private beta |
| Q11 | **Final brand name and visual identity** (Roy). See [12-naming.md](12-naming.md) and [13-creative-brief.md](13-creative-brief.md). | T-004 final tokens, T-017 copy, T-019 domain | Build under "FlowerScan" with swappable tokens |

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
