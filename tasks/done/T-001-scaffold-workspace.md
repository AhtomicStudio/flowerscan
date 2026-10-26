---
id: T-001
title: Scaffold workspace & tooling
milestone: M0
status: done
owner: core-engineer (Claude Code)
depends_on: []
touches: [package.json, pnpm-workspace.yaml, pnpm-lock.yaml, .gitattributes, .claude/launch.json, docs/decisions/0006-toolchain-versions.md, docs/03-architecture.md, README.md, AGENTS.md, tsconfig.base.json, biome.json, .gitignore, .editorconfig, .nvmrc, .github/, apps/web/, packages/core/, tools/vault-build/]
docs: [docs/03-architecture.md, docs/decisions/0002-monorepo-with-pure-core.md, docs/10-quality-and-testing.md]
---

## Goal
An empty but fully wired workspace: `pnpm install && pnpm typecheck && pnpm lint && pnpm test && pnpm build`
all pass, and `pnpm dev` serves a blank PWA over HTTPS on the LAN so a phone can open the camera.

## Requirements
- `git init` (if not already), plus `.gitignore` covering node_modules, dist, `apps/web/public/data/`,
  `data/vault/.obsidian/*` (except a shared `app.json` if we decide to share settings), `.env*`.
- pnpm workspace with `apps/web`, `packages/core`, `tools/vault-build`. Pin the Node version in `.nvmrc`.
- `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, project references.
- `packages/core` tsconfig **without** the `DOM` lib. Add a test proving that a DOM global fails to compile
  (or a lint rule that does the same).
- Vite + React + TS + Tailwind v4 in `apps/web`. A blank route that renders the app name.
- HTTPS dev server reachable from a phone on the LAN (for example via `@vitejs/plugin-basic-ssl`), documented in the root README.
- Vitest in core and web, Playwright installed in web with one smoke test.
- Biome configured for lint + format.
- Root scripts: `dev`, `build`, `typecheck`, `lint`, `format`, `test`, `test:e2e`, `vault:check`, `vault:build` (the last two as stubs).
- GitHub Actions workflow running the CI pipeline from docs/10 (if Q8 is answered; otherwise commit the workflow file anyway).
- Pin exact dependency versions. Record any deviation from the docs/03 stack in a new ADR.

## Acceptance criteria
- [x] `pnpm install` → all root scripts pass (verified on the dev machine; CI re-verifies on a fresh clone once the repo is on GitHub).
- [ ] Phone on the same Wi-Fi opens the dev URL over HTTPS. **Needs a human with a phone.** The LAN URL answers HTTPS 200 from the dev machine.
- [x] Importing `document` inside `packages/core` fails typecheck (`scripts/assert-purity.mjs`, run by `pnpm typecheck`).
- [x] AGENTS.md "Commands" section updated to the real commands.

## Out of scope
Any feature code, UI design, or data.

## Log
2026-10-25 · core-engineer (Claude Code)
- Upgraded the dev machine's Node 22.11 → 24.22.1 LTS (winget), since current Vite/Vitest/jsdom need ≥ 22.12. Installed pnpm 12.15.0 globally.
- `git init -b main`. Workspace: apps/web, packages/core, tools/vault-build. Exact versions in the pnpm catalog. See ADR-0006.
- Deviation: no TS project references. Internal packages export TS source, and each package runs its own `tsc` (ADR-0006).
- Core purity guard: tsconfig `lib: [ES2023]`, `types: []`, plus `assert-purity.mjs`, which proves `document`/`navigator`/`process` fail to compile.
- Biome: `biome migrate` applied (`rules.preset`). Markdown and the lockfile are excluded from Biome.
- pnpm 12 fails installs on unapproved build scripts. Approved `esbuild` only (needed by tsx).
- Results: typecheck ✓ · lint ✓ (32 files) · test ✓ (core 1, vault-build 4, web 1) · vault:check/build stubs ✓ · build ✓ (JS 68.7 KB gz) · e2e ✓ (Pixel 7 Chromium over HTTPS).
- Dev server: https://localhost:5173 and the LAN URL both serve. The Claude browser pane rejects the self-signed cert (expected).
- CI workflow at `.github/workflows/ci.yml`. Its first run happens once the repo is on GitHub (Q8).
- Open: real-phone check of the LAN URL (unchecked box above).
