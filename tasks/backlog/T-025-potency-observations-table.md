---
id: T-025
title: Back-of-house potency observations table
milestone: M1
status: backlog
owner: core-engineer
depends_on: [T-002]
touches: [data/observations/, tools/observations/, package.json, docs/04-data-model.md]
docs: [docs/04-data-model.md, docs/09-compliance-and-privacy.md, docs/open-questions.md]
---

## Goal
An internal, never-shipped table of reported potency per strain across brands, states and time (decision P2),
built only from data the founders record, ready to accept opt-in user data in Phase 2.

## Requirements
- `data/observations/potency/`: one YAML file per observation, using the `PotencyObservation` schema in docs/04
  (validated with the zod schema from T-002).
- `tools/observations` CLI (Node, uses `@flowerscan/core`):
  - `pnpm obs:check`: validate every file, and check that `strain_id` resolves in the vault.
  - `pnpm obs:import-eval`: create observations from `data/eval/expected.yaml` entries that have potency readings
    (`source: eval_set`, `evidence` = photo path).
  - `pnpm obs:import-backup <file>`: create observations from a **founder's** journal backup file
    (`source: founder_record`). It prompts for `recorded_by` and the state, and imports only scans with a
    `strain_id` and potency readings. It never imports OCR text or notes.
  - `pnpm obs:report`: write `data/observations/report.md`: per strain, readings grouped by analyte, brand and
    state, with count, min, median, max and date range. Analytes are never mixed (THCa ≠ Total THC), and
    nothing is computed across analytes.
- Make sure `vault-build` and the web build never read `data/observations/` (add a test).
- No user data: `source: user_opt_in` is rejected until the Phase 2 opt-in exists.

## Acceptance criteria
- [ ] Fixture observations validate. Bad ones (unknown strain, mixed units, `user_opt_in`) fail with clear messages.
- [ ] The report groups by analyte and never combines different analytes.
- [ ] The web bundle contains no observation data (test or bundle check).
- [ ] docs/04 updated if any field changes.

## Out of scope
The Phase 2 user opt-in flow and backend. Showing potency anywhere in the app.

## Log
