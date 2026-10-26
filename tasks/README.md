# Task Queue

Every piece of work is a task file. Agents (and humans) work **only** from task files.

```
tasks/
├── _template.md
├── backlog/   ready or waiting on dependencies
├── active/    claimed: someone is working on it right now
└── done/      finished, with a log
```

## Lifecycle
1. **Pick** a task in `backlog/` whose `depends_on` tasks are all in `done/`.
2. **Claim** it: move the file to `active/`, set `status: active` and `owner: <you / agent role>`.
3. **Work** within `touches:`. If you need to touch other paths, update `touches` and note why in the log.
4. **Finish:** check every acceptance box, meet the Definition of Done
   ([10-quality-and-testing.md](../docs/10-quality-and-testing.md#definition-of-done-every-task)), append to
   `## Log`, set `status: done`, and move the file to `done/`.
5. **Blocked?** Set `status: blocked`, write the question in the log, and leave the file in `active/`.
   If the blocker is a product decision, add it to [open-questions.md](../docs/open-questions.md).

Found new work? Create a new task file (next free ID). Don't silently expand the current one.

## Backlog map

| ID | Title | Milestone | Role | Depends on |
| --- | --- | --- | --- | --- |
| T-001 | Scaffold workspace & tooling ✅ | M0 | core-engineer | — |
| T-002 | Core domain schemas & types | M0 | core-engineer | T-001, T-022 |
| T-003 | Taxonomy v1 + banned terms | M0 | data-curator → cannabis-expert → reviewer | T-002 |
| T-004 | Design tokens & UI primitives | M0 | ui-engineer | T-001, T-021 |
| T-005 | Lineage classification engine | M1 | core-engineer | T-002 |
| T-006 | Vault build tool | M1 | core-engineer | T-002, T-005 |
| T-007 | Seed dataset (landraces + first strains) | M1 | data-curator | T-002 (T-006 to validate) |
| T-008 | Name normalizer & matcher | M1 | core-engineer | T-002 |
| T-009 | Camera viewport & permission flow | M2 | scanner-engineer | T-004 |
| T-010 | Barcode & QR detection | M2 | scanner-engineer | T-009 |
| T-011 | OCR engine + label text parser | M2 | scanner-engineer | T-008, T-009 |
| T-012 | Scan eval harness & golden set | M2 | scanner-engineer + data-curator | T-008, T-011 |
| T-013 | Result screen | M3 | ui-engineer | T-004, T-005, T-006 |
| T-014 | Manual search & "Which one?" sheet | M3 | ui-engineer | T-008, T-013 |
| T-015 | Local journal | M3 | ui-engineer | T-013 |
| T-016 | Share link & journal backup | M3 | ui-engineer | T-002, T-015 |
| T-017 | App shell, age gate & compliance pass | M4 | ui-engineer → reviewer | T-013 |
| T-018 | PWA offline & performance budget | M4 | ui-engineer | T-011, T-013 |
| T-019 | Deploy & launch checklist | M4 | core-engineer | all M4 |
| T-020 | Benchmark apps & design standards research | M0 | researcher | — |
| T-021 | Design spec & clickable mockups | M0 | product-designer | T-020 |
| T-022 | Cannabis domain review of specs | M0 | cannabis-expert | — |
| T-023 | Brand name shortlist with availability checks | M0 | marketing → Roy | — |
| T-024 | Test plan & device matrix | M0 | qa-tester | — |

Roles are defined in [.claude/agents/README.md](../.claude/agents/README.md). Every user-facing task also goes
through **qa-tester** and then **reviewer** before it moves to `done/`.

## Parallel lanes
**Wave 1 (ready now, no file overlap):** T-020 research · T-022 domain review · T-023 name shortlist · T-024 test plan.
Then T-021 design (after T-020) and T-002 schemas (after T-022).

Once T-002 is done, these can run at the same time with no file overlap:
- **Lane A (core):** T-005 → T-006 · T-008
- **Lane B (data):** T-003 · T-007
- **Lane C (UI):** T-004 → T-009 → T-010

**Vertical-slice checkpoint:** after T-005, T-006, T-007, T-008 plus a stub of T-013, typing a strain name
shows a real lineage-derived result. Demo it before building the rest of M2.
