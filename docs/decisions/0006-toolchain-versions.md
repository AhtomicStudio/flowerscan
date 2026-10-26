# 0006. Toolchain versions and workspace wiring

- **Status:** Accepted
- **Date:** 2026-10-25
- **Deciders:** tech lead (T-001)

## Context
T-001 scaffolds the workspace. Several tools had new major versions since the docs/03 stack was drafted, and
current Vite/Vitest/jsdom no longer support Node 22.11 (the machine's previous version).

## Decision
- **Node 24 LTS** (`.nvmrc` = `24`, `engines.node` ≥ 24.15, `engineStrict: true`). Installed v24.22.1.
- **pnpm 12.15.0**, pinned via `packageManager`. All dependency versions are exact and live in the
  pnpm **catalog** (`pnpm-workspace.yaml`); packages reference `"catalog:"`.
- **TypeScript 7.0** (the native compiler), **Vite 8**, **Vitest 5**, **React 19.3**, **Tailwind 4.3**,
  **Biome 2.6**, **Playwright 1.64**, jsdom 30, tsx 4.
- **Internal packages export TypeScript source** (`"exports": { ".": "./src/index.ts" }`). No build step and
  no TS project references between packages. Vite, Vitest and tsx consume the source directly, and each
  package runs its own `tsc`. This replaces the "project references" idea in T-001.
- **Core purity:** `packages/core/tsconfig.json` uses `lib: ["ES2023"]` and `types: []`.
  `scripts/assert-purity.mjs` compiles a deliberately impure fixture and fails `typecheck` if `document`,
  `navigator` or `process` ever become available.
- **Biome lints and formats code only.** Markdown is excluded (Biome 2.6 can format Markdown, but it would
  rewrite docs and Obsidian templates), and so is the lockfile.
- **Install scripts are opt-in:** pnpm 12 fails installs on unapproved build scripts. Only `esbuild`
  (needed by tsx) is approved (`allowBuilds` in `pnpm-workspace.yaml`).
- **HTTPS dev/preview** via `@vitejs/plugin-basic-ssl` (self-signed), with `host: true` for phone testing.

## Consequences
- ✅ Current, supported majors from day one. One place to bump versions.
- ✅ Purity is enforced by the compiler and proven by a check that fails loudly.
- ⚠️ TypeScript 7 is new. If an editor or tool can't handle it, pin the 6.x line in the catalog (one-line
  change) and record it here.
- ⚠️ The self-signed certificate triggers a browser warning on phones (documented in README). The
  in-app Claude browser pane refuses it entirely, so preview with Playwright (`ignoreHTTPSErrors`) or a
  real browser.
- ⚠️ Source-exported packages can't be published to npm as-is. That's fine, since they're private.

## Alternatives considered
- **Stay on Node 22.11 with older majors** (Vite 6, Vitest 3): rejected, as it starts the project behind.
- **Build `core` to `dist/` with project references:** more moving parts, no benefit while all consumers are bundler- or tsx-based.
