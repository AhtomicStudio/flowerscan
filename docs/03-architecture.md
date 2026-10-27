# Architecture

## Shape of the system

```
                ┌───────────────────────── authoring (humans + data-curator agent) ─────────────────────────┐
                │  data/vault/  (Obsidian vault: strains, landraces, crosses, breeders as Markdown notes)   │
                │  data/taxonomy/taxonomy.yaml                                                              │
                └───────────────────────────────────────┬───────────────────────────────────────────────────┘
                                                        │  pnpm vault:build
                                                        ▼
                ┌─────────────────────────── tools/vault-build (Node) ─────────────────────────┐
                │ parse frontmatter → validate (zod, from @flowerscan/core) → resolve wikilinks │
                │ → detect cycles → compute lineage (core) → emit JSON + validation report      │
                └───────────────────────────────────────┬──────────────────────────────────────┘
                                                        │  apps/web/public/data/<hash>/strains.json, taxonomy.json, manifest.json
                                                        ▼
┌──────────────────────────────────────────── apps/web (React PWA, runs on the phone) ─────────────────────────────────────────────┐
│                                                                                                                                   │
│  Camera (getUserMedia) ──frames──▶ Detection worker (BarcodeDetector | zxing-wasm)  ──payload──┐                                  │
│        │                                                                                       │                                  │
│        └──shutter: cropped frame──▶ OCR worker (Tesseract.js, lazy-loaded) ──raw text─────────┤                                  │
│                                                                                                ▼                                  │
│                                              @flowerscan/core: parseLabelText / classifyQr → candidates → matcher → decision      │
│                                                                                                │                                  │
│                         strains.json (cached by service worker) ───────────────────────────────┤                                  │
│                                                                                                ▼                                  │
│                                              Result screen  ──save──▶ Dexie (IndexedDB journal) ──backup──▶ JSON file            │
│                                                   └──scan another──▶ scanner                                                     │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

No server is needed for the MVP. Everything is static files on a CDN plus on-device compute.
See [ADR-0005](decisions/0005-local-first-no-accounts-in-mvp.md).

## Repository layout (pnpm workspace)

```
FlowerScan/
├── AGENTS.md / CLAUDE.md / GEMINI.md   agent entry points (AGENTS.md is canonical)
├── docs/                               specs, ADRs, glossary — the source of truth
├── tasks/                              the agent work queue (backlog → active → done)
├── apps/
│   └── web/                            React + Vite PWA (UI, camera, workers, storage)
├── packages/
│   └── core/                           @flowerscan/core — pure TypeScript domain logic
├── tools/
│   └── vault-build/                    Node CLI: vault → validated JSON
├── data/
│   ├── vault/                          Obsidian vault — the strain database source
│   ├── taxonomy/                       controlled vocabulary (effects, flavors, terpenes)
│   └── eval/                           golden set of package photos + expected answers
└── .claude/agents/                     sub-agent role definitions
```

Why a workspace rather than a single app: `core` is shared by the web app, the build tool, and the future
Obsidian plugin, and package boundaries enforce the purity rule mechanically.
See [ADR-0002](decisions/0002-monorepo-with-pure-core.md).

## Dependency rules (enforced)

```
apps/web  ─────▶  packages/core  ◀─────  tools/vault-build
   (never the reverse; core imports nothing from the others)
```

- `packages/core` must not use DOM, browser APIs, React, Node APIs, or the network. Its `tsconfig` omits
  the `DOM` lib, so a violation fails typecheck.
- `core` may depend only on small, pure libraries (for example `zod`, `yaml`).
- Browser-specific code (camera, workers, IndexedDB, clipboard) lives in `apps/web/src/platform/*` behind
  small interfaces, so features can be tested with fakes.

## Stack (proposed, confirm in ADRs as each is adopted)

| Concern | Choice | Why |
| --- | --- | --- |
| Language | TypeScript, `strict` + `noUncheckedIndexedAccess` | Catches data-shape bugs early; agents work better with types. |
| Package manager | pnpm workspaces | Fast, strict about dependencies, good monorepo support. |
| App framework | React 19 + Vite | Brief requirement; fast HMR and small builds. |
| Routing | React Router (library mode) | Simple; only a few routes. |
| Styling | Tailwind CSS v4 + CSS-variable design tokens | Brief requirement; tokens let us theme. |
| Components | shadcn/ui (Radix primitives) + Lucide icons | Accessible primitives that we own the source of. |
| Motion | Motion (formerly Framer Motion) | Spring physics for the snappy feel; respects reduced motion. |
| UI state | Zustand | Small, no boilerplate; one store for the scan session. |
| Persistence | Dexie (IndexedDB) | Journal, settings, local barcode memory. |
| Validation | zod (in core) | One schema used by the vault build, the app, and imports. |
| Barcode / QR | Native `BarcodeDetector`, polyfilled with zxing-wasm (`barcode-detector` package) | Native speed on Android; same API everywhere. |
| OCR | Tesseract.js in a Web Worker, lazy-loaded, behind an `OcrEngine` adapter | Offline and private; can be swapped if it measures poorly. |
| Matching | Custom trigram + Jaro-Winkler matcher in core | We need OCR-aware scoring and full control; it's small and testable. |
| PWA | vite-plugin-pwa (Workbox) | Offline shell + data caching. |
| Lint/format | Biome | One fast tool for lint + format. |
| Tests | Vitest, Testing Library, Playwright (fake camera feed) | See [10-quality-and-testing.md](10-quality-and-testing.md). |
| Hosting | Vercel | Preview deploys per branch; the hobby tier fits the MVP budget. |
| Analytics | A privacy-friendly, cookieless service (choose in T-019) | Fits the small monthly budget (Q9). Aggregate events only. |
| Phase 2 backend | Firebase Auth + Firestore (+ a function for cloud OCR) | Generous free tier; the team already knows it. |

Exact versions are pinned in the pnpm catalog. The versions chosen at scaffold time, and how the
packages are wired, are in [ADR-0006](decisions/0006-toolchain-versions.md).

## apps/web internal layout (planned)

```
apps/web/src/
├── app/            shell, routes, providers, age gate, error boundary
├── features/
│   ├── scan/       viewport, reticle, shutter, scan-session store (Auto only, D7)
│   ├── result/     classification hero, lineage tree, tag list, package-says
│   ├── search/     manual search, "Which one?" sheet
│   ├── journal/    list, detail, rating/notes
│   └── backup/     journal backup/restore
├── platform/       camera, detectors, ocr, storage, clipboard — browser adapters
├── workers/        detection.worker.ts, ocr.worker.ts
├── data/           strain data loader + in-memory index (built from strains.json)
├── ui/             design-system components (Badge, Sheet, Button, ClassHero…)
└── styles/         tokens.css, tailwind entry
```

A feature may import from `ui`, `platform`, `data`, and `@flowerscan/core`. Features never import from
each other's internals; shared things move to `ui` or `core`.

## Performance architecture

- **Main thread stays free:** frame decoding and OCR run in workers. Frames are passed as `ImageBitmap`
  (transferable). Detection is throttled to about 8–10 fps.
- **Lazy-load heavy assets:** the Tesseract worker, WASM, and language data load only on the first text
  scan, are prefetched when idle after the camera opens, and are then cached by the service worker.
- **Data:** a single `strains.json` (expected well under 1 MB gzipped at launch) is loaded once and
  indexed in memory. Switch to sharding when it passes about 2 MB gzipped.
- **Budgets:** see [10-quality-and-testing.md](10-quality-and-testing.md#performance-budgets).

## Phase 2 additions (not MVP)

- Firebase Auth (anonymous → upgradeable) + Firestore for journal sync.
- Firestore collections for crowdsourced `barcode_mappings` and `strain_requests`, with moderation.
- A serverless function for opt-in cloud OCR / vision. It returns **text only**, and the matcher still decides.
- Optional end-user Markdown/Obsidian export per [07-obsidian-spec.md](07-obsidian-spec.md), with
  `core/markdown` serializers. (Phase 3: an Obsidian community plugin in `apps/obsidian-plugin`.)
