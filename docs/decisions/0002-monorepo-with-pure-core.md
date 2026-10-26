# 0002. pnpm workspace with a pure-TypeScript `core` package

- **Status:** Accepted
- **Date:** 2026-10-25

## Context
The same domain logic (schemas, lineage math, name matching, Markdown serialization) is needed by the web
app, the vault build tool, and later an Obsidian plugin. Several AI agents will work in parallel, and they
need hard boundaries that fail loudly instead of conventions they might miss.

## Decision
A pnpm workspace:
- `packages/core` (`@flowerscan/core`): pure TS. Its tsconfig has no `DOM` lib, and it has no React, Node,
  or network dependencies. 100% unit-testable.
- `apps/web`: the PWA. Depends on core.
- `tools/vault-build`: Node CLI. Depends on core.

## Consequences
- ✅ Purity is enforced by the compiler, not by review.
- ✅ The riskiest logic (lineage, matching) can be developed and tested before any UI exists.
- ✅ Agents can work on `core`, `web`, and data in parallel with few conflicts.
- ⚠️ Slightly more setup (workspace config, TS project references). Done once in T-001.

## Alternatives considered
- **Single Vite app with `src/core` + lint rules:** simpler, but nothing stops a DOM import from creeping
  in, and the build tool and plugin would have to reach into the app.
- **Nx / Turborepo:** more power than we need right now. Turborepo can be added later for caching.
