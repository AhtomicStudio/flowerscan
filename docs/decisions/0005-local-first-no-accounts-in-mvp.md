# 0005. Local-first, no accounts or backend in the MVP

- **Status:** Accepted
- **Date:** 2026-10-25

## Context
The brief mentions local-first with Firestore sync. Accounts add sign-up friction, security work, privacy
obligations, and backend cost. Scan history is sensitive personal data. The core loop (scan → result →
save → export) needs no server.

## Decision
MVP is static files on a CDN (Vercel) plus on-device compute. The journal lives in IndexedDB (Dexie).
Export is the way to back up and move data. No Firebase in v1. The storage layer sits behind a
`JournalRepository` interface so a Firestore-backed sync can be added in Phase 2 without touching features.

## Consequences
- ✅ Zero sign-up friction, works offline, and nothing sensitive leaves the device.
- ✅ Near-zero hosting cost, small attack surface.
- ⚠️ Data is lost if the user clears browser storage. Mitigations: the export prompt after N saved scans,
  and `navigator.storage.persist()`.
- ⚠️ No cross-device sync until Phase 2.

## Alternatives considered
- **Firebase from day one:** matches the Cannapickforme stack, but adds auth UX, security rules, and
  privacy scope before the core loop is proven.
