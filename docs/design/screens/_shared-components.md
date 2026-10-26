# Shared components and patterns

Owner: product-designer (T-021) · For: T-004 (primitives), every screen task · Tokens: [../tokens-proposal.md](../tokens-proposal.md)

Screen specs refer to these by name. If a screen needs something different, its spec says why.

## Bottom tab bar

- 3 tabs: **Scan** (`scan-line` icon), **Journal** (`book-open`), **Settings** (`settings`). Icon + label always.
- Height 64 px + `env(safe-area-inset-bottom)`. Opaque `surface-1` with a top hairline (`border`). Not a
  fake Liquid Glass blur (see design-standards note: follow the pattern, not the native material).
- Active tab: accent-colored icon and label plus a 32 × 4 px indicator above the icon. Never color alone: the
  active tab also gets `aria-current="page"` and a bolder label.
- Each tab ≥ 48 px wide and the full bar height. `<nav aria-label="Main">` with links, not buttons.
- On the scanner the bar sits on `bg` (near-black), so it reads as part of the camera chrome.
- Hidden while a modal sheet is open (the sheet covers it), on the age gate, and on the camera card.
- Landscape: same bar, 48 px tall, icon and label side by side.

## Buttons

| Variant | Look | Use | Rule |
| --- | --- | --- | --- |
| Primary | accent fill, `on-accent` text, 52 px tall, `radius-md` | The one main action on a screen or sheet | **One per screen** |
| Secondary | `surface-2` fill, text color, 1 px `border-strong` | Second action | |
| Tertiary | text-only, accent text, 48 px tall hit area | Low-stakes actions ("Save anyway") | Underline on focus |
| Destructive | danger fill (in dialogs) or danger text | Delete, Erase | Always confirmed or undoable |
| Icon button | 48 × 48 px, 24 px icon | Close, back, torch | `aria-label` always |

- Labels are verbs, sentence case ("Save", "Share link", "Search by name").
- Press: scale 0.97 + darken within 100 ms. Reduced motion: darken only.
- Disabled buttons are avoided. If an action can't run, the button stays enabled and explains why on tap.
- Side-by-side buttons: equal width, 12 px gap.

## Bottom sheet (modal)

Used for the result, "Which one?", no match, unknown barcode, recents, and error sheets.

- **Modal**, with a 60% scrim over the frozen scanner. Modal is chosen over non-modal because it passes SC 2.4.11
  (focus not obscured) by construction and the camera is paused behind it anyway (docs/06).
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` = the sheet's heading. Focus moves to the heading on
  open, is trapped while open, and returns to the control that opened it (usually the shutter) on close.
- **Detents:** `medium` (about 70% of the viewport: tall enough that the hero, the meter and any package-says callout are visible without scrolling at default text size) and `large` (full height minus the top safe area and 12 px).
  The result sheet opens at medium; small sheets open at their content height. If the hero doesn't fit at
  medium (large text, landscape), it opens at large.
- **Grabber:** a visible 36 × 5 px bar inside a **48 × 48 px button** (`aria-label="Expand"` / `"Collapse"`,
  `aria-expanded`). **Tapping it cycles the detents** (HIG, M3, SC 2.5.7).
- **Close button:** 48 × 48 px, top-right, `aria-label="Close"`. Required on every sheet (SC 2.5.7: swipe-down
  is never the only way out).
- Also closes with: swipe down, tap on the scrim, **Escape**, and **browser back** (each sheet pushes one history
  entry, so back closes the sheet before leaving the route).
- Sheet content scrolls inside the sheet. Scrolling up at medium expands to large (standard platform behavior).
- Max width 640 px, centered on wide screens and in landscape.
- Motion: rises with `--motion-sheet`. Reduced motion: 150 ms fade.

## Toast

- Bottom, above the tab bar or the sheet's action bar, `surface-3`, `radius-pill`, at most one line of text
  plus one action ("Undo", "Reload", "Share").
- `role="status"` (polite). Auto-hides after 4 s, or 6 s when it has an action. Pauses while focused or hovered.
- Never the only place important information appears.

## Dialog (confirm)

Native-feeling centered dialog for destructive confirmations only (Erase all data). `role="alertdialog"`.
Cancel on the left, the destructive verb on the right ("Erase everything"). Focus starts on Cancel.

## Chips and pills

| Component | Look | Interactive? |
| --- | --- | --- |
| **ClassPill** (full) | Class fill, ink text, icon + "Hybrid · Sativa-dominant" | No |
| **ClassPill** (mini) | Class fill, ink text, icon + "Hybrid" (or Indica / Sativa / Unknown) | No |
| **ConfidenceChip** | On the hero flood: ink 1.5 px outline, ink text, icon + method copy + `info` icon | **Yes**: reveals a one-sentence explanation inline, right below it. 48 px tall hit area. |
| **Tag chip** | `surface-3`, text color, `radius-sm`, 36 px tall | **No** (display only) |
| **"+N more"** | Tertiary button styled like a chip, 48 px hit area | Yes |
| **DisputedBadge** | Outlined (`border-strong`), `git-fork` icon + "Lineage disputed" | Yes: inline one-sentence explanation |
| **CloseToLineBadge** | Outlined, `ruler` icon + "Close to the line" | Yes: inline one-sentence explanation |

Why tag chips aren't tappable: tappable chips would each need 48 px height and 12 px gaps, turning a light list
into a wall of buttons. Tags are hedged by their heading ("Commonly reported"), and the taxonomy's one-line
descriptions live on /about. This is a deliberate trade-off: less detail on tap, a much calmer result.

## ClassificationMeter

- Input: `lineage` object (docs/04). Track 12 px tall, `radius-pill`, gradient indica → hybrid → sativa
  (violet → green → amber). Light theme adds a 1 px `border-strong` outline (contrast table).
- Faint tick marks at the band edges (20.5, 40.5, 59.5, 79.5), so "close to the line" is visible.
- Marker: 24 px white knob with a 2 px ink ring at `sativa_pct`.
- Labels above the track: left "Indica **30%**", right "Sativa **70%**", tabular figures. The side the tree
  leans toward is bold.
- Line under the track: "Lineage estimate, not a lab test." plus an `info` icon button.
- **method = reported** (Breeder's label): no knob and no percentage. The band for the reported type is shaded
  (e.g. 60–79 for sativa-dominant) and the caption reads "Based on how it's described, not its family tree."
  Reason: the reported values (85/70/50/30/15) are a product convention, and printing "85%" would look like a
  measurement we don't have (AGENTS.md non-negotiable 2). See open question Q-D3.
- **sativa_pct null:** the meter is not rendered. The unknown panel replaces it (see result-sheet spec).
  Never a 50/50 bar.
- Motion: knob slides from center to value in 400 ms. Reduced motion: appears at value.
- Accessibility: the visual is `aria-hidden`; a visually hidden sentence carries the value: "Lineage estimate:
  70% sativa, 30% indica."

## TagList

- Props: `tags: Term[]`, facet label. Renders 0..n chips, wraps, collapses past 8 with "+N more" (expands inline,
  then "Show fewer"). **Zero tags returns null** (no heading, no empty state).
- Order: as the data gives it. Negative-polarity effects render in their own row headed "Also reported" so
  they're shown honestly but not mixed with the rest.

## Live region

One app-wide polite live region (`role="status"`), plus `role="alert"` only for errors that block the task.
Messages (SC 4.1.3): "Starting camera", "Barcode found", "Reading label", "Still reading", "Taking longer than
usual", "Result: …", "3 possible matches", "No match found", "Saved to Journal", "Link copied", "5 results".

## Focus

2 px accent outline, 2 px offset (on class fills: ink outline). Visible on keyboard focus only
(`:focus-visible`). Scroll containers with sticky bars set `scroll-padding-bottom` so focus is never hidden.

## Skeletons

`surface-2` blocks matching the final layout, with a soft 1.2 s shimmer that stops after 5 s (SC 2.2.2). Used
when data takes > 300 ms. Under 300 ms, show nothing (avoids flashes). No spinners for anything under 1 s.

## Large text and small screens

- At root font size ≥ 150% or width ≤ 340 px: sticky action bars become static (end of content), the mode
  control collapses to a "Mode: Auto" menu button, side-by-side buttons stack.
- Everything reflows at 320 CSS px with no horizontal scroll (SC 1.4.10). The family tree caps indentation
  at 3 levels.

## Orientation

No orientation lock (SC 1.3.4; manifest has no `orientation`). Portrait-first. In landscape the scanner moves its
controls to a trailing-edge column, and sheets open at large, centered, max 640 px wide.
