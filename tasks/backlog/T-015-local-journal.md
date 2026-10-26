---
id: T-015
title: Local journal
milestone: M3
status: backlog
owner: unassigned
depends_on: [T-013]
touches: [apps/web/src/platform/storage/, apps/web/src/features/journal/, apps/web/src/features/result/]
docs: [docs/04-data-model.md, docs/decisions/0005-local-first-no-accounts-in-mvp.md]
---

## Goal
Save scans to IndexedDB and browse, rate, annotate, and delete them.

## Requirements
- `JournalRepository` interface + Dexie implementation + in-memory fake. Schema versioning with migrations.
- Save snapshots `lineage`, `strain_name`, and `data_version` on the scan (per docs/04), so later data updates don't rewrite history.
- `/journal` list (newest first, class pill, date, rating) and `/journal/:scanId` detail with rating and Markdown notes.
- Unidentified scans are listed and labeled as such.
- Call `navigator.storage.persist()` after the first save. Show an "export a backup" nudge after 10 saves.
- Settings → "Erase all data" clears the journal, barcode memory, and settings (with confirmation).

## Acceptance criteria
- [ ] Repository tests against the fake and against Dexie (fake-indexeddb).
- [ ] E2E: scan → save → appears in the journal → rate → reload → still there.

## Out of scope
Cloud sync (Phase 2).

## Log
