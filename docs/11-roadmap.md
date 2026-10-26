# Roadmap

Milestones map to task files in [`/tasks`](../tasks/README.md). Time estimates are deliberately left out
until the open questions are answered and T-001 is done.

## Phase 0: Planning ✅ (this commit)
Docs, ADRs, task backlog, agent rules, folder skeleton.

## Phase 1: MVP

| Milestone | Goal | Tasks |
| --- | --- | --- |
| **M0 Foundation** | Repo builds, research and design done, types and tokens exist | T-001 scaffold ✅ · T-020 benchmark research · T-022 domain review · T-023 name shortlist · T-024 test plan · T-021 design spec & mockups · T-002 domain schemas · T-003 taxonomy v1 · T-004 design tokens & UI primitives |
| **M1 Data & engine** | Real strains compile into a real lineage result | T-005 lineage engine · T-006 vault build · T-007 seed dataset · T-008 matcher |
| **M2 Scanner** | Camera → text/barcode/QR → candidates | T-009 camera · T-010 barcode/QR · T-011 OCR + label parser · T-012 eval harness |
| **M3 Result & journal** | The full loop a user sees | T-013 result screen · T-014 search & "Which one?" · T-015 journal · T-016 share link & journal backup |
| **M4 Ship** | Public, compliant, fast, offline | T-017 shell, age gate & compliance pass · T-018 PWA & performance · T-019 deploy & launch checklist |

**Vertical-slice checkpoint (end of M1 + T-013 stub):** typing a strain name shows a real, lineage-derived
result from the seed data. Demo this to Roy before building the scanner.

## Phase 2: Accounts & community
- Firebase Auth (anonymous → email/Apple/Google) + Firestore journal sync across devices.
- Shared barcode → strain mappings (submitted on confirm, moderated, confidence by agreement count).
- "Request a strain" queue that feeds the data-curator workflow.
- Opt-in cloud OCR/vision engine for hard labels (returns text only).
- Lab/COA QR parsing for real potency and terpene numbers per batch.
- Aggregated, anonymous community effect ratings as an additional (labeled) tag source.
- Optional end-user Markdown/Obsidian export ([07-obsidian-spec.md](07-obsidian-spec.md)), if users ask for it.

## Phase 3: Ecosystem
- Obsidian community plugin: two-way sync of strains and scans using `@flowerscan/core`.
- Chemotype view: terpene/cannabinoid profile as a stronger signal than Indica/Sativa.
- Budtender mode / printable QR cards that deep-link to a strain result.
- Optional native wrapper (Capacitor) if PWA camera limits or distribution demand it.
- Cross-promotion with Cannapickforme (separate brands): for example a "Scan → get a pick" handoff.
