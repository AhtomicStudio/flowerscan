---
id: T-016
title: Share link & journal backup
milestone: M3
status: backlog
owner: unassigned
depends_on: [T-002, T-015]
touches: [packages/core/src/backup/, packages/core/test/backup/, apps/web/src/features/share/, apps/web/src/platform/clipboard/, apps/web/src/platform/share/, apps/web/src/platform/storage/]
docs: [docs/04-data-model.md, docs/02-mvp-scope.md, docs/decisions/0005-local-first-no-accounts-in-mvp.md]
---

## Goal
Users can share a strain result as a link, and can back up and restore their whole journal as one file.
(Replaces the earlier "Markdown & Obsidian export" task. Obsidian is founder curation only, per open-questions Q5.)

## Requirements
- **Share link:** `/s/<strain-id>` via `navigator.share({ title, url })`, falling back to copying the link plus a toast.
  The shared URL carries only the strain id. Never scan data, ratings, or notes.
- **Backup:** core `serializeBackup`, `parseBackup` (zod-validated), and `mergeBackup` per the backup format in docs/04.
- Settings → "Download backup" saves `flowerscan-backup-YYYY-MM-DD.json` and records `last_backup_at`.
- Settings → "Restore from backup" validates the file, shows a summary ("12 scans, 3 new"), merges by `id`,
  and reports any rejected records instead of dropping them silently.
- The T-015 "export a backup" nudge points here.

## Acceptance criteria
- [ ] Round-trip test: journal → backup → erase → restore gives an identical journal.
- [ ] Merge tests: duplicate ids, newer-wins, invalid records reported, wrong file type rejected with a clear message.
- [ ] E2E: share button on Android Chrome opens the share sheet. Desktop falls back to copy.

## Out of scope
Markdown/Obsidian export (Phase 2, spec in docs/07). Cloud sync (Phase 2).

## Log
