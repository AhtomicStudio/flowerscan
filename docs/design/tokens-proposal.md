# Design tokens proposal (PLACEHOLDER)

> **Status: placeholder until Roy's identity lands (open-questions Q11).** Every value here is a stand-in that
> T-004 turns into `apps/web/src/styles/tokens.css`. When Roy delivers, swap the values, re-run the contrast
> table, and nothing else should change. **No Cannapickforme tokens are used** (Q1).
>
> Owner: product-designer (T-021) · Date: 2026-10-26 · Consumers: T-004, T-009, T-013, T-015, T-017

## What Roy's identity replaces, and what it doesn't

| Token group | Swappable by Roy? | Fixed by product rules |
| --- | --- | --- |
| Brand accent, neutrals, surfaces | Yes | Every text pair must still pass the contrast table below. |
| Classification hues (Indica / Hybrid / Sativa / Unknown) | Yes, the exact hue | The **direction** (violet / green / amber / gray, docs/08) and the rule that color is always paired with a word and an icon. |
| Display and UI typefaces | Yes | At most 2 families. Body ≥ 16 px (we use 17). Must be web-licensable and **self-hosted in production** (see Fonts). |
| Type scale, spacing, radii, motion | Roy can restyle | Minimums: 48 px targets, 12 px between adjacent targets, 72 px shutter, reduced-motion fallbacks. |
| Logo / app icon | Yes | Works at 48 px and as a maskable icon (T-018). |

## Naming

CSS custom properties, one layer of semantic names. Components only ever read semantic tokens, never raw hex.

```
--color-bg  --color-surface-1  --color-surface-2  --color-surface-3
--color-border  --color-border-strong
--color-text  --color-text-2  --color-text-3
--color-accent  --color-on-accent  --color-accent-text  --color-accent-tint
--color-danger  --color-on-danger  --color-danger-tint
--color-class-indica  --color-class-hybrid  --color-class-sativa  --color-class-unknown   (fills)
--color-class-indica-ink  … (text/icon versions for light surfaces)
--color-on-class          (text on any class fill)
--color-scrim  --color-camera-overlay
--font-display  --font-ui
--text-display … --text-caption   --space-1 … --space-12   --radius-*   --elev-*   --motion-*
```

Themes switch by `:root[data-theme="dark" | "light"]`, with `prefers-color-scheme` as the default. **The
scanner is always dark** (it sits on a camera feed), whatever the theme.

## Palette

### Dark theme (default)

| Token | Hex | Use |
| --- | --- | --- |
| `--color-bg` | `#0B0D0C` | App background (already the scaffold's placeholder) |
| `--color-surface-1` | `#141816` | Sheets, screens |
| `--color-surface-2` | `#1C211F` | Cards, list rows, inputs |
| `--color-surface-3` | `#262C29` | Tag chips, pressed state, toasts |
| `--color-border` | `#39413D` | Decorative dividers only (not a boundary anyone needs to see) |
| `--color-border-strong` | `#6B746F` | Input, toggle-off, and empty-star outlines (meets 3:1) |
| `--color-text` | `#F1F4F2` | Primary text |
| `--color-text-2` | `#B4BDB8` | Secondary text |
| `--color-text-3` | `#8C9690` | Tertiary text (timestamps, captions) |
| `--color-accent` | `#5CE1FF` | Placeholder brand accent ("signal cyan"): primary buttons, links, focus ring, lock-on |
| `--color-on-accent` | `#04161B` | Text on accent buttons |
| `--color-accent-tint` | `#1B2C2D` | Callout background (accent 10% over surface-1) |
| `--color-danger` | `#FF6B5E` | Destructive text and buttons |
| `--color-on-danger` | `#0B0D0C` | Text on danger buttons |
| `--color-class-indica` | `#A88BFF` | Indica fill and dark-theme text |
| `--color-class-hybrid` | `#3EDB7A` | Hybrid fill and dark-theme text |
| `--color-class-sativa` | `#FFB547` | Sativa fill and dark-theme text |
| `--color-class-unknown` | `#A3ACA7` | Unknown lineage fill and text |
| `--color-on-class` | `#0B0D0C` | All text and icons on a class fill |
| `--color-scrim` | `rgba(0,0,0,0.6)` | Behind any text on the camera feed, and behind modal sheets |

Why a cyan accent: the three classification hues own violet, green and amber, so the brand accent must not
read as a classification. Cyan is the free, high-energy hue left. Roy may pick another, as long as it can't be
mistaken for a class color.

### Light theme

| Token | Hex | Notes |
| --- | --- | --- |
| `--color-bg` | `#F5F7F6` | |
| `--color-surface-1` | `#FFFFFF` | |
| `--color-surface-2` | `#EEF1EF` | |
| `--color-surface-3` | `#E2E6E4` | |
| `--color-border` | `#D3D9D5` | Decorative |
| `--color-border-strong` | `#7C8681` | |
| `--color-text` | `#101412` | |
| `--color-text-2` | `#4A534E` | |
| `--color-text-3` | `#5F6964` | |
| `--color-accent` / `--color-accent-text` | `#006E87` | Buttons use white text on it. The vivid cyan stays in the (always dark) scanner. |
| `--color-on-accent` | `#FFFFFF` | |
| `--color-accent-tint` | `#EBF3F5` | |
| `--color-danger` | `#B42318` | White text on it |
| Class fills | same as dark | Fills always carry `--color-on-class` ink text, so they work on both themes. |
| `--color-class-indica-ink` | `#6A48E0` | Class-colored **text/icons** on light surfaces |
| `--color-class-hybrid-ink` | `#17733D` | (`#1A7F43` failed on surface-2 at 4.44:1, so it was darkened) |
| `--color-class-sativa-ink` | `#9A5A00` | |
| `--color-class-unknown-ink` | `#5F6964` | |

## Contrast table (measured)

Measured 2026-10-26 with the WCAG 2.x relative-luminance formula (sRGB, `(L1 + 0.05) / (L2 + 0.05)`), by a
script run on these exact hex values. Blended values (tints, scrims) were computed by alpha-compositing first.
Thresholds: text 4.5:1; large text (≥ 24 px regular or ≥ 18.7 px bold) 3:1; UI parts and meaningful graphics
3:1 (SC 1.4.11). **We hold all text to 4.5:1, including large text**, so a token swap can't silently drop a
heading below AA.

### Dark theme

| Foreground | Background | Ratio | Need | Result |
| --- | --- | --- | --- | --- |
| text `#F1F4F2` | bg `#0B0D0C` | 17.61 | 4.5 | Pass |
| text | surface-1 `#141816` | 16.18 | 4.5 | Pass |
| text | surface-2 `#1C211F` | 14.74 | 4.5 | Pass |
| text | surface-3 `#262C29` | 12.86 | 4.5 | Pass |
| text-2 `#B4BDB8` | bg | 10.13 | 4.5 | Pass |
| text-2 | surface-1 | 9.31 | 4.5 | Pass |
| text-2 | surface-2 | 8.48 | 4.5 | Pass |
| text-2 | surface-3 | 7.40 | 4.5 | Pass |
| text-3 `#8C9690` | surface-1 | 5.87 | 4.5 | Pass |
| text-3 | surface-2 | 5.35 | 4.5 | Pass |
| text-3 | surface-3 | 4.67 | 4.5 | Pass (lowest dark pair; don't darken surface-3) |
| accent `#5CE1FF` (links) | surface-1 | 11.66 | 4.5 | Pass |
| accent | surface-2 | 10.62 | 4.5 | Pass |
| accent | surface-3 (toast action) | 9.27 | 4.5 | Pass |
| on-accent `#04161B` | accent | 12.04 | 4.5 | Pass |
| text | accent-tint `#1B2C2D` (callout) | 13.13 | 4.5 | Pass |
| text-2 | accent-tint | 7.55 | 4.5 | Pass |
| danger `#FF6B5E` | surface-1 | 6.41 | 4.5 | Pass |
| on-danger `#0B0D0C` | danger | 6.98 | 4.5 | Pass |
| text | danger-tint `#352420` | 13.31 | 4.5 | Pass |
| class-indica `#A88BFF` (text) | surface-1 | 6.66 | 4.5 | Pass |
| class-indica | surface-2 | 6.06 | 4.5 | Pass |
| class-hybrid `#3EDB7A` | surface-1 | 9.91 | 4.5 | Pass |
| class-hybrid | surface-2 | 9.03 | 4.5 | Pass |
| class-sativa `#FFB547` | surface-1 | 10.20 | 4.5 | Pass |
| class-sativa | surface-2 | 9.29 | 4.5 | Pass |
| class-unknown `#A3ACA7` | surface-1 | 7.69 | 4.5 | Pass |
| class-unknown | surface-2 | 7.01 | 4.5 | Pass |
| border-strong `#6B746F` (UI) | surface-1 | 3.71 | 3 | Pass |
| border-strong (UI) | surface-2 | 3.38 | 3 | Pass |
| accent (toggle on, focus ring) | surface-2 | 10.62 | 3 | Pass |
| accent (focus ring) | bg | 12.69 | 3 | Pass |
| sativa (filled star) | surface-1 | 10.20 | 3 | Pass |

### Class fills (both themes): text on the hero flood, pills, and mini pills

| Foreground | Background | Ratio | Need | Result |
| --- | --- | --- | --- | --- |
| on-class `#0B0D0C` | indica `#A88BFF` | 7.24 | 4.5 | Pass |
| on-class | hybrid `#3EDB7A` | 10.79 | 4.5 | Pass |
| on-class | sativa `#FFB547` | 11.10 | 4.5 | Pass |
| on-class | unknown `#A3ACA7` | 8.37 | 4.5 | Pass |
| on-class | ink 12% chip over indica `#957CE2` | 5.81 | 4.5 | Pass |
| on-class | ink 12% chip over hybrid `#38C26D` | 8.45 | 4.5 | Pass |
| on-class | ink 12% chip over sativa `#E2A140` | 8.73 | 4.5 | Pass |
| on-class | ink 12% chip over unknown `#919994` | 6.67 | 4.5 | Pass |
| on-class focus ring (UI) | any class fill | ≥ 7.24 | 3 | Pass |
| ink 72% (rejected) | indica | 4.59 | 4.5 | Barely passes. **Rule: no translucent text on a class fill.** Use full ink and vary size/weight instead. |

### Light theme

| Foreground | Background | Ratio | Need | Result |
| --- | --- | --- | --- | --- |
| text `#101412` | bg `#F5F7F6` | 17.26 | 4.5 | Pass |
| text | surface-1 `#FFFFFF` | 18.57 | 4.5 | Pass |
| text | surface-2 `#EEF1EF` | 16.33 | 4.5 | Pass |
| text | surface-3 `#E2E6E4` | 14.74 | 4.5 | Pass |
| text-2 `#4A534E` | surface-1 | 7.96 | 4.5 | Pass |
| text-2 | surface-2 | 7.00 | 4.5 | Pass |
| text-2 | surface-3 | 6.32 | 4.5 | Pass |
| text-3 `#5F6964` | surface-1 | 5.69 | 4.5 | Pass |
| text-3 | surface-2 | 5.00 | 4.5 | Pass |
| text-3 | surface-3 | 4.52 | 4.5 | Pass (lowest light pair) |
| accent-text `#006E87` | surface-1 | 5.87 | 4.5 | Pass |
| accent-text | surface-2 | 5.16 | 4.5 | Pass |
| on-accent `#FFFFFF` | accent `#006E87` | 5.87 | 4.5 | Pass |
| text | accent-tint `#EBF3F5` | 16.51 | 4.5 | Pass |
| text-2 | accent-tint | 7.08 | 4.5 | Pass |
| danger `#B42318` | surface-1 | 6.57 | 4.5 | Pass |
| white | danger | 6.57 | 4.5 | Pass |
| indica-ink `#6A48E0` | surface-1 | 5.81 | 4.5 | Pass |
| indica-ink | surface-2 | 5.11 | 4.5 | Pass |
| hybrid-ink `#17733D` | surface-1 | 5.91 | 4.5 | Pass |
| hybrid-ink | surface-2 | 5.19 | 4.5 | Pass |
| hybrid-ink (first try `#1A7F43`) | surface-2 | 4.44 | 4.5 | **Fail → replaced** |
| sativa-ink `#9A5A00` | surface-1 | 5.47 | 4.5 | Pass |
| sativa-ink | surface-2 | 4.81 | 4.5 | Pass |
| unknown-ink `#5F6964` | surface-1 | 5.69 | 4.5 | Pass |
| border-strong `#7C8681` (UI) | surface-1 | 3.76 | 3 | Pass |
| border-strong (UI) | surface-2 | 3.31 | 3 | Pass |
| accent (focus ring) | bg | 5.45 | 3 | Pass |
| class fills as meter track | surface-1 white | 1.76–2.69 | 3 | **Fail → the light-theme track gets a 1 px `border-strong` outline (3.76:1).** |

### Camera overlays (always dark)

The feed is unpredictable (a white label, a dark jar), so overlays are designed for the worst case.

| Element | Worst-case background | Ratio | Need | Rule |
| --- | --- | --- | --- | --- |
| White text on a 60% black scrim pill | white label → composite `#666666` | 5.74 | 4.5 | **Every word on the feed sits on a ≥ 60% scrim pill.** |
| White text on a 50% scrim (rejected) | composite `#808080` | 3.95 | 4.5 | Fails. Don't go below 60%. |
| Reticle corners: white 3 px stroke | black feed | 21.00 | 3 | Pass |
| Reticle corners: 1 px ink outline around the stroke | white label | 19.50 | 3 | The outline makes the reticle visible on white. |
| Lock-on: accent stroke + ink outline | mid-gray feed `#808080` | 4.94 (outline) | 3 | Accent alone is 2.57 on mid-gray, so the ink outline is required. |
| Shutter: white ring + ink outline | any | ≥ 19.5 | 3 | Same double-stroke rule. |

### Meter marker

The marker is a white knob with a 2 px ink ring. Ink ring vs. every track color ≥ 7.24:1, white knob vs. ink ring
19.50:1, so it meets 1.4.11 anywhere on the gradient. The **number is always printed as text**, so the meter
never carries meaning by position or color alone.

## Typography

| Role | Placeholder family | Settings | Why |
| --- | --- | --- | --- |
| Display (classification word, strain names, big numbers) | **Archivo** (Google Fonts, variable `wdth` 62–125, `wght` 100–900) | `font-stretch: 75%`, weight 800 | A heavy condensed face that reads at arm's length, from one variable file. |
| UI (everything else) | **Inter** (Google Fonts, variable `opsz`, `wght`) | weights 400 / 500 / 600 / 700, `font-feature-settings: "tnum"` on numbers | Excellent small-size legibility, tabular figures for percentages. |

Fallbacks: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Condensed fallback:
`"Arial Narrow", "Roboto Condensed", system-ui`.

**Fonts must be self-hosted in production** (bundled WOFF2 files, served from our origin). Loading from
fonts.googleapis.com sends the user's IP to a third party, which conflicts with docs/09 "no third-party
trackers" and the e2e `networkGuard` (X-01) that fails on cross-origin requests. The mockups use Google Fonts
only because they're throwaway prototypes.

**Strain names (P12):** every strain name uses the same display style. No per-name font, color, emoji, or
imagery, ever.

### Type scale (5 steps + one display)

All sizes in `rem` (1 rem = 16 px at default), so they scale with the user's text size. Line heights are
unitless. No fixed heights on anything containing text (SC 1.4.12).

| Token | Size | Line height | Weight | Use |
| --- | --- | --- | --- | --- |
| `--text-display` | 2.75 rem (44 px) | 1.05 | Archivo 800, 75% width | Classification word in the hero |
| `--text-title` | 1.625 rem (26 px) | 1.15 | Archivo 800, 75% width | Strain name in the hero, screen titles |
| `--text-headline` | 1.25 rem (20 px) | 1.3 | Inter 600 | Section headings, sheet titles, big percentage label |
| `--text-body` | 1.0625 rem (17 px) | 1.5 | Inter 400 / 600 | Body, buttons, list rows, inputs (≥ 16 px stops iOS input zoom) |
| `--text-footnote` | 0.9375 rem (15 px) | 1.45 | Inter 400 / 500 | Secondary lines, chips, captions under meters |
| `--text-caption` | 0.8125 rem (13 px) | 1.4 | Inter 500 | Timestamps, tab labels, overlines (never for sentences people must read to act) |

The tab label at 13 px is above Apple's 11 pt minimum and matches the platform tab-bar convention.

## Spacing

4 px base, 8 px rhythm: `--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-5` 20 ·
`--space-6` 24 · `--space-8` 32 · `--space-10` 40 · `--space-12` 48.

- Screen side padding: 20 px (16 px below 360 px width).
- Between sections in a sheet: 24 px. Between related rows: 12 px.
- **Between adjacent tappable targets: ≥ 12 px** (docs/08, from Apple's ~12 pt padding guidance).
- Bottom padding on scroll containers = the height of any sticky bar + 16 px (`scroll-padding-bottom`), so a
  focused element is never hidden behind it (SC 2.4.11).

## Sizes

| Token | Value | Use |
| --- | --- | --- |
| `--size-target` | 48 px | Minimum for anything tappable |
| `--size-shutter` | 76 px | Shutter (≥ 72 px rule) |
| `--size-tabbar` | 64 px + bottom safe area | Bottom tab bar (M3 Expressive height) |
| `--size-grabber-hit` | 48 × 48 px | Sheet grabber button (visual bar 36 × 5 px) |
| `--size-sheet-max` | 640 px | Sheet max width on wide screens and landscape |
| `--size-reticle` | 80% of viewport width, 5:3 | docs/06 |

## Radii

`--radius-sm` 8 px (tags, mini pills) · `--radius-md` 14 px (buttons, cards, inputs) · `--radius-lg` 24 px (sheet
top corners, hero) · `--radius-pill` 999 px (chips, segmented control, toasts).

## Elevation

Dark themes show depth with lighter surfaces, not shadows. Shadows are for things floating over the camera.

| Token | Value | Use |
| --- | --- | --- |
| `--elev-0` | none, surface-1 | Screens |
| `--elev-1` | surface-2 | Cards, list rows |
| `--elev-2` | surface-3 + `0 8px 24px rgba(0,0,0,.35)` | Toasts |
| `--elev-3` | surface-1 + `0 -12px 40px rgba(0,0,0,.55)` + scrim behind | Bottom sheets |

## Motion

| Token | Value | Use |
| --- | --- | --- |
| `--motion-instant` | 100 ms, ease-out | Press feedback (must start within 100 ms of the tap) |
| `--motion-fast` | 180 ms, `cubic-bezier(.2,.9,.3,1.2)` (slight overshoot) | Lock-on corner snap, chip pop |
| `--motion-standard` | 260 ms, `cubic-bezier(.2,.8,.2,1)` | Screen and sheet transitions, crossfades |
| `--motion-sheet` | 420 ms spring (`linear()` spring, or `cubic-bezier(.16,1.1,.3,1)` fallback) | Result sheet rising |
| `--motion-meter` | 400 ms, `cubic-bezier(.2,.8,.2,1)` | Meter fill from center to value |
| `--motion-stagger` | 30 ms | Tag chips staggering in (cap at 10 items, so ≤ 300 ms total) |
| `--motion-shimmer` | 1.2 s loop | "Reading label…" sweep. **Stops after 5 s** (SC 2.2.2): the copy changes instead. |

Rules:
- Animate only `transform` and `opacity`.
- `prefers-reduced-motion: reduce` (Apple HIG Reduce Motion; WCAG 2.3.3, which is AAA, and we meet it anyway):
  springs become 150 ms crossfades, the meter appears at its value, the shimmer becomes a static
  "Reading label…" label, tags appear together, no z-axis or scale effects. The 10 ms haptic stays.
- Haptics: 10 ms tick on lock-on, `[10, 40, 10]` on save. Android Chromium only (`navigator.vibrate` needs a prior
  tap; it doesn't exist on iOS). Gated by the Settings toggle.

## Iconography

Lucide, 1.75 px stroke at 24 px, always with a text label on primary actions. Class icons (placeholders):
Indica `moon`, Hybrid `circle-half` (Lucide `contrast`), Sativa `sun`, Unknown `circle-help`. Disputed marker:
`git-fork` plus the words "Lineage disputed". Package-says callout: `split` (two diverging arrows).

## Open for Roy

1. Brand accent (cyan is a placeholder chosen to avoid the class hues).
2. Final class hues. Keep violet / green / amber / gray directions and re-run this table.
3. Display and UI families (Archivo + Inter are placeholders). Must be self-hostable.
4. Whether the hero flood is solid (proposed, predictable contrast) or a gradient of the class hue.
5. Logo lockup for the age gate and the scanner's top bar (the mockups use a plain wordmark).
