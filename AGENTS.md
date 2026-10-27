# AGENTS.md: rules for every AI agent (and human) working on FlowerScan

This is the canonical agent guide. `CLAUDE.md` and `GEMINI.md` point here. Keep this file short and link
out to the docs. Don't duplicate them.

## What we're building
A mobile-first PWA that scans a cannabis package (OCR text, 1D barcode, or QR), identifies the strain
against our curated database, and shows an honest **Indica / Sativa / Hybrid** result **derived from
lineage**, as a bold class color with a confidence level, the family tree with sources, and only the effect
tags our data verifies. (The engine computes a percentage, but users don't see it: open-questions D2.)
Full context: [docs/README.md](docs/README.md).

**Team:** the tech lead builds with Claude Code and Gemini (the agents reading this file). Roy owns
marketing and creative (name, identity, voice, launch assets; see [docs/13-creative-brief.md](docs/13-creative-brief.md)).
Founders approve data (`verified`) and product decisions ([docs/open-questions.md](docs/open-questions.md)).
AI work is split across specialist roles. See the roster in [.claude/agents/README.md](.claude/agents/README.md).
Gemini and other AIs: when a task's `owner:` names a role, read that role file and follow it.

## Before you start
1. Read [docs/README.md](docs/README.md), then the docs your task lists under `docs:`.
2. Work **only** from a task file. See the workflow in [tasks/README.md](tasks/README.md).
   No task? Ask, or propose one as a new file in `tasks/backlog/`.
3. Check [docs/open-questions.md](docs/open-questions.md). Never guess a founder decision.

## Non-negotiables
1. **The database decides.** OCR, AI, and heuristics only *read* text. Only curated data may say what a
   strain is, its lineage, or its tags.
2. **No filler, ever.** Never render, export, or store invented values: no placeholder tags, no default
   50/50 meter, no "N/A" sections. Missing data → omit it or say "unknown".
3. **Every strain fact cites a source** the agent actually read. No source → `verification: unverified`.
   Agents never set `verified`. Only humans do.
4. **`packages/core` is pure TypeScript.** No DOM, React, Node APIs, network, `Date.now()`, or `Math.random()`
   (inject them). It must stay fully unit-tested.
5. **Compliance:** no medical/therapeutic claims, no youth appeal, 21+, hedged effect language.
   See [docs/09-compliance-and-privacy.md](docs/09-compliance-and-privacy.md).
6. **Privacy:** nothing leaves the device (images, OCR text, scans) without an explicit user opt-in.
7. **Specs first.** If you change behavior, fields, or a decision, update the doc (or write an ADR) in the
   same change. Precedence: ADRs > numbered docs > tasks > code comments.
8. **Stay in your lane.** Modify only the paths in your task's `touches:`. Expanding scope means a new task.

## Repo map
| Path | What lives there |
| --- | --- |
| `docs/` | Specs, ADRs (`docs/decisions/`), glossary, open questions |
| `tasks/` | Work queue: `backlog/` → `active/` → `done/` |
| `packages/core/` | `@flowerscan/core`: schemas, lineage, matching, label parsing, Markdown |
| `apps/web/` | React + Vite PWA: UI, camera, workers, IndexedDB |
| `tools/vault-build/` | Vault → validated JSON for the app |
| `data/vault/` | Obsidian vault: the strain database source |
| `data/taxonomy/` | Controlled tag vocabulary + banned terms |
| `data/eval/` | Golden package photos for scanner accuracy |
| `.claude/agents/` | The agent team: 10 role prompts and the roster ([README](.claude/agents/README.md)) |
| `docs/research/`, `docs/design/`, `docs/brand/` | Research notes, design specs and mockups, brand drafts and finals |

## Commands
Requires Node ≥ 24.15 (`.nvmrc`) and pnpm 12 (`packageManager` in package.json). Run from the repo root.

```
pnpm install        # install (engineStrict: wrong Node fails fast)
pnpm dev            # web app on https://localhost:5173 and your LAN IP (self-signed cert)
pnpm typecheck      # tsc for every package + core purity guard
pnpm lint           # Biome lint + format check (code only; Markdown is excluded)
pnpm format         # Biome auto-fix
pnpm test           # Vitest, all packages
pnpm test:e2e       # Playwright (builds + previews on https://localhost:4173)
pnpm build          # production build
pnpm vault:check    # validate data/vault          (stub until T-006)
pnpm vault:build    # compile data/vault → app data (stub until T-006)
```
`pnpm eval:scan` arrives with T-012.

Dependency versions live in one place: the `catalog:` in `pnpm-workspace.yaml`. Packages reference them
as `"catalog:"`. Packages that need install scripts must be approved (`pnpm approve-builds <pkg>`).

## Conventions
- TypeScript strict. No `any` (use `unknown` + zod). Named exports. Files `kebab-case.ts`, components `PascalCase.tsx`.
- Tests sit next to code (`*.test.ts`) in web; core uses `packages/core/test/`.
- Commit messages: `T-0NN: imperative summary`. One task per branch/PR when on GitHub.
- User-facing strings live in a feature's `copy.ts`.
- New dependency → justify it in the task log. A new *core* dependency needs an ADR.

## Definition of done
See [docs/10-quality-and-testing.md](docs/10-quality-and-testing.md#definition-of-done-every-task).
In short: acceptance boxes checked, typecheck/lint/tests green, docs updated, task log written, file moved to `tasks/done/`.

## When you're unsure
Stop and ask. Write the question in the task's Log, set `status: blocked`. A wrong confident answer is the
worst outcome, in the product and in this repo.
