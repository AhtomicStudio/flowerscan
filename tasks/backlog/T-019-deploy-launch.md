---
id: T-019
title: Deploy & launch checklist
milestone: M4
status: backlog
owner: unassigned
depends_on: [T-017, T-018]
touches: [vercel.json, docs/launch-checklist.md, .github/workflows/]
docs: [docs/09-compliance-and-privacy.md, docs/10-quality-and-testing.md, docs/12-naming.md, docs/open-questions.md]
---

## Goal
Production deploy on the chosen domain, with preview deploys per PR and a completed launch checklist.

## Requirements
- Vercel project with production and preview environments. `vault:build` runs in the build step.
- Security headers: CSP (allowing only our origin plus the WASM/worker needs), `Permissions-Policy: camera=(self)`,
  HSTS, `Referrer-Policy: strict-origin-when-cross-origin`.
- Privacy-friendly analytics wired to the aggregate events in docs/09 (if Q9 allows), or none.
- `docs/launch-checklist.md`: device matrix pass, eval numbers, compliance sign-off, legal review status (Q10,
  including candy-like strain names (P12) and name/trademark clearance),
  domain/trademark check (Q1), privacy page live, rollback plan.

## Acceptance criteria
- [ ] Production URL serves the app over HTTPS with the headers verified (securityheaders-style check in the Log).
- [ ] Every launch checklist item checked or explicitly waived by a founder.

## Out of scope
Marketing site. App-store wrappers.

## Log
