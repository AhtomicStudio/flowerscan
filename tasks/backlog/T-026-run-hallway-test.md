---
id: T-026
title: Run the hallway test on the built core flows
milestone: M3
status: backlog
owner: qa-tester
depends_on: [T-013, T-014, T-015, T-017]
touches: [docs/design/hallway-test.md, docs/testing/]
docs: [docs/design/hallway-test.md, docs/testing/test-plan.md, docs/08-ux-and-design.md]
---

## Goal
Five people who haven't seen FlowerScan try the 3 core flows on a real phone, and the results decide whether
the open design risks (chip wording, result copy) need the fallback copy. Closes test-plan gap 12 (D12).

## Requirements
- Use the script and pass criteria in `docs/design/hallway-test.md` as written (D12, 2026-10-26).
- The qa-tester prepares the session kit: build URL, device checklist, consent wording (no recordings of faces,
  no personal data kept), and a results sheet. A founder runs the sessions in person.
- Participants are 21+. No product is used during the test; real or printed sample packages only.
- Record per-participant results against each criterion, without names.
- For each failed criterion, propose the fix the hallway-test doc names and file it as a backlog task.

## Acceptance criteria
- [ ] 5 sessions completed on at least one iPhone and one Android phone.
- [ ] Results table and a pass/fail per criterion added to `docs/testing/` (dated note).
- [ ] Follow-up tasks filed for every failed criterion.

## Out of scope
Changing the design or code (follow-up tasks do that).

## Log
