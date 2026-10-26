---
id: T-004
title: Design tokens & UI primitives
milestone: M0
status: backlog
owner: unassigned
depends_on: [T-001, T-021]
touches: [apps/web/src/styles/, apps/web/src/ui/, apps/web/src/app/dev-gallery/]
docs: [docs/08-ux-and-design.md, docs/09-compliance-and-privacy.md]
---

## Goal
The visual foundation: CSS-variable tokens (dark default, light variant), classification colors, type scale,
motion presets, and the primitives the result and scanner screens need.

## Requirements
- Separate brand (Q1 answered). Roy's final identity isn't delivered yet (Q11), so build **placeholder** FlowerScan
  tokens that are easy to swap: every color, font, and radius comes from `tokens.css`, never hard-coded.
  Don't use Cannapickforme tokens.
- Implement the approved design from T-021 (`docs/design/tokens-proposal.md` and the screen specs). Don't redesign while building.
- Tokens: surfaces, text, accents, `--class-indica`, `--class-hybrid`, `--class-sativa`, `--class-unknown`,
  radii, spacing, shadows, motion durations/springs. Tailwind v4 `@theme` maps to them.
- Contrast: verify every text/background pair meets WCAG 2.2 AA. List the pairs in the Log.
- Primitives: `Button` (primary/secondary/ghost, ≥48px), `Sheet` (bottom sheet, drag, focus trap),
  `Chip`, `TagList` (0..n, collapse >8, returns null for 0), `ClassificationMeter` (null → "Unknown lineage"),
  `ConfidenceChip`, `Toast`, `IconButton`.
- A dev-only `/dev/gallery` route showing every primitive in every state (TagList with 0/1/4/12 tags, meter
  at 0/20/21/50/79/80/100/null).
- `prefers-reduced-motion` supported in all motion presets.

## Acceptance criteria
- [ ] Gallery renders all states in dark and light themes.
- [ ] Component tests for TagList and ClassificationMeter edge cases.
- [ ] Screenshots of the gallery (mobile width) attached to the Log.

## Out of scope
Real screens (T-009, T-013).

## Log
