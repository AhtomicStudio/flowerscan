---
id: T-034
title: Beta 1, the search beta (age gate → search → full-screen result)
milestone: M3
status: review
owner: ui-engineer
depends_on: [T-006, T-021]
touches: [apps/web/src/, apps/web/index.html, apps/web/e2e/, apps/web/package.json, apps/web/vite.config.ts, pnpm-workspace.yaml, pnpm-lock.yaml]
docs: [docs/08-ux-and-design.md, docs/design/README.md, docs/design/screens/, docs/design/tokens-proposal.md, docs/design/mockups/index.html, docs/04-data-model.md, docs/06-scan-pipeline.md, docs/09-compliance-and-privacy.md, docs/open-questions.md]
---

## Goal
A working beta on the live site that a founder can show on a phone: pass the 21+ gate, type a strain name, and
get the full-screen Indica / Sativa / Hybrid answer from the real built data, with details and the family tree.
It's a thin, honest slice of T-004, T-013, T-014 and T-017; those tasks keep their remaining scope.

## Requirements
- **Follow the approved mockup and specs** (docs/design, D1–D18). The mockup is the visual reference; rebuild it in
  React + Tailwind with tokens from `tokens-proposal.md` as CSS variables (placeholders until Roy's identity, Q11).
- **Age gate** (T-017 slice, D8): "Are you 21 or older?" → yes is remembered in localStorage; Leave → exit screen,
  blocked for 24 hours on this device. Every route is behind the gate, including deep links (return to the link
  after yes). The age is one constant.
- **Data loader:** fetch `/data/latest.json` → the manifest → `strains.json`, `taxonomy.json`, `breeders.json`.
  Validate with core schemas where they exist. Show a calm loading state and a clear error state with Retry.
- **Search** (T-014 slice): one big search field as the home screen. Use core's matcher (`buildIndex` + `search`)
  over names and aliases, results as you type, class word pill per row. Empty query shows a short hint. No match →
  "We don't have that strain yet" (no "Request it", D9). Search must work with typos ("blu dream").
- **Result** (T-013 slice, D13–D17): tapping a result opens the **full-screen class-color answer**: strain name,
  class icon, one huge word (Indica / Sativa / Hybrid / Unknown lineage), "Details", and a bar with **Save** next to
  **Scan another** (D16). In this beta there's no scanner, so the primary button reads "Search another" and returns to
  search with the field focused; Save can be a no-op hidden until T-015, so hide it rather than fake it.
  Details: basis line ("Lineage traced: an estimate from its family tree, not a lab test", partly traced, reported
  type, landrace), dominance only here ("Leans sativa (sativa-dominant)"), effect tags (labels from taxonomy.json;
  negatives as one "Also reported" line, D17), and "How we know": the family tree (3 generations, class pills only,
  "Unknown parent", "Lineage disputed" badges) and the source count. **No percentage anywhere** (D2).
  "Effects vary person to person. Start low, go slow." footer. Unknown strain id → friendly "can't find it" page.
- **Strain URLs:** `/s/<id>` opens the result directly (Vercel rewrites already serve index.html).
- **Beta notice:** when the loaded `data_version` ends with `-dev` (a build that includes unverified notes), show a
  small persistent line: "Beta: our strain data is still being reviewed." Never hide that on the result screen's
  details; the answer screen can keep it out of the way (e.g. in the bar), but it must be visible somewhere.
- **About** link (from the search screen): short "How it works" + "What it can't tell you" + responsible use, from
  the mockup's About copy. Strings live in a feature `copy.ts`.
- Accessibility per docs/08 (WCAG 2.2 AA): focus management on route change, 48 px targets, reduced motion
  (crossfade instead of the flood), text + icon not color alone, works at 320 px and 200% text.
- Never render potency or THC (P2). No network calls other than our own `/data/` files. No analytics.
- Routing: no new dependency unless needed; a tiny history-based router is fine. Any new dependency goes in the
  catalog with an exact version and a Log justification.
- Tests: component tests for the gate, search, result states (traced, partial, reported, unknown, landrace, zero
  tags, disputed ancestor) and a "%" / THC filler sweep; Playwright e2e: gate → search "blue dream" → result →
  Details → family tree → Search another; and a deep link `/s/<id>` behind the gate.

## Acceptance criteria
- [x] `pnpm build` + `pnpm test:e2e` green, plus typecheck, lint and test.
- [x] Works on a phone-width viewport (390×844 and 320 px) with no horizontal scroll.
- [x] Every rendered value comes from built data (no filler).

## Out of scope
Camera, barcode, OCR (beta 2: T-009–T-011). Journal and Save (T-015). PWA install and offline (T-018).

## Log

### 2026-10-29 (ui-engineer, Claude Code)
Claimed and built the beta slice. Status `review`: needs qa-tester, reviewer and a founder look on a phone.

**Built** (`apps/web/src/`):
- `app/`: tiny history router (`router.tsx`: `/`, `/s/:id`, `/about`, unknown path page; history `depth` so Close
  and Search another go *back* to search), age gate (`age-gate.ts` logic with injected clock and storage, `MIN_AGE`
  constant, 24 h Leave block, memory fallback when localStorage throws; `AgeGate.tsx` gate + exit screen). The gate
  wraps everything, so no data is fetched before yes, and deep links render in place after yes.
- `data/load-data.ts`: `latest.json` → manifest → strains / taxonomy / breeders, validated with core's
  `BuildManifestSchema` and `StrainsFileSchema`, plus web-side zod schemas for `latest.json`, shipped
  `taxonomy.json` and `breeders.json` (core has none for these shapes). Checks the manifest path, hash, version
  and taxonomy version agree. `data-context.tsx` shares it with loading / error / Retry.
- `features/search/`: home screen, one big field, core `buildIndex` + `search` (limit 20), results as you type,
  ClassPill per row, alias line, word-prefix highlight in `<mark>` (bold, not color), count in the live region,
  tip on empty, "We don't have that strain yet." on no match, query kept in `?q=` so Back restores it.
- `features/result/`: full-screen flood (circle grows from the tapped row, transform only; reduced motion: 150 ms
  crossfade), name, icon, one width-bound word, Details, bar with the beta line, footer and **Search another**
  (Save hidden until T-015). Details: basis line, effect chips + "Also reported" line from taxonomy labels, How we
  know (lean line, method text, family tree to 3 generations with class pills, Unknown parent, "Origins of … are
  unknown.", inline crosses, Lineage disputed badges with the inline explanation, reported type, breeder, source
  count, link to /about#classification). theme-color follows the flood. Escape and × close. Unknown id page.
- `features/about/`: How it works, What it can't tell you, Our data (with the data version), Tags (from
  taxonomy.json), Privacy (beta-accurate: no camera or journal claims), Responsible use.
- `ui/`: icons (the mockup's Lucide-style paths, no icon dependency), ClassPill, BetaNotice, live region,
  skeleton/error, focus and large-text hooks. `styles/tokens.css` holds every placeholder token as a CSS variable.

**Dependencies** (catalog, exact versions): `zod` added to `apps/web` (already in the catalog, already bundled
through core) to validate fetched JSON per AGENTS.md; `@fontsource-variable/archivo` 5.3.0 and
`@fontsource-variable/inter` 5.3.0, the self-hosted placeholder faces from tokens-proposal.md (docs/08: fonts
self-hosted, no font CDN; latin subsets 90 KB + 48 KB woff2, OFL).

**Tailwind note:** Biome's CSS parser rejects Tailwind directives (`@theme`, `@apply`) unless
`css.parser.tailwindDirectives` is set in `biome.json`, which isn't in `touches:`. So tokens are plain `:root`
variables and components use Tailwind's custom-property utilities (`bg-(--color-surface-1)`,
`rounded-(--radius-md)`) plus type-scale classes in `index.css`. A rebrand is still a `tokens.css` edit.

**Deviations to confirm:**
- `/s/:id` is the full-screen answer (as this task says), not the docs/08 / result-sheet.md strain page with the
  rounded hero. docs/08's screen inventory and search.md ("Tap → `/s/:id` (the strain page)") weren't updated,
  because `docs/` isn't in `touches:`.
- The result is a page `<main>` with an `<h1>` (focused on open), not `role="dialog"`: nothing sits behind it in
  the beta. It becomes the modal over the scanner in T-013.
- Reported-type copy: "We don't have **enough of** its family tree yet" (basis line, How we know, About). 18
  reported strains in the data *do* have known parents (e.g. Cereal Milk), so "We don't have its family tree yet"
  would be false for them. result-sheet.md still has the old wording.
- The beta line sits in the result bar (always visible on the answer and over the details), not repeated in the
  panel.
- Breeder name is shown as "Breeder: X." inside How we know (breeders.json had no specified place).

**Checks** (from the repo root, 2026-10-29): `pnpm typecheck` exit 0; `pnpm lint` exit 0 (no warnings);
`pnpm test`: web 60/60 and vault-build 126/126 pass; core 550/551 with only the T-032 5,000-node perf test failing
under the full-suite load (it passes when run alone: `vitest run test/lineage/performance.test.ts`, 3/3);
`pnpm build` exit 0 (JS 373 KB / 114 KB gzip); `pnpm test:e2e` 10/10 (gate → "blue dream" → result → Details →
family tree → Search another, typo search, deep link behind the gate with no data fetched before yes, Leave
across reloads, beta notice vs data_version, no sideways scroll at 390 and 320 px, reduced motion, 200% text,
and a sweep of **every real strain's** result with How we know open for `%`, THC/CBD, potency, N/A and 50/50,
plus a network guard that fails on any cross-origin request).

Screenshots (390×844, plus 320 px, 200% text and light theme sets) are in the session scratchpad, not the repo.
