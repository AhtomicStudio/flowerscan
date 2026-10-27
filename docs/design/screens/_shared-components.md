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
- Hidden while a modal sheet or the full-screen result view is open (they cover it), on the age gate, and on the
  camera card.
- Landscape: same bar, 48 px tall, icon and label side by side.

## Buttons

| Variant | Look | Use | Rule |
| --- | --- | --- | --- |
| Primary | accent fill, `on-accent` text, 52 px tall, `radius-md` | The one main action on a screen or sheet | **One per screen** |
| Secondary | `surface-2` fill, text color, 1 px `border-strong` | Second action | |
| Tertiary | text-only, accent text, 48 px tall hit area | Low-stakes actions ("Save anyway") | Underline on focus |
| Destructive | danger fill (in dialogs) or danger text | Delete, Erase | Always confirmed or undoable |
| Icon button | 48 × 48 px, 24 px icon | Close, back, torch | `aria-label` always |

- Labels are verbs, sentence case ("Save", "Scan another", "Search by name").
- Press: scale 0.97 + darken within 100 ms. Reduced motion: darken only.
- Disabled buttons are avoided. If an action can't run, the button stays enabled and explains why on tap.
- Side-by-side buttons: equal width, 12 px gap.

## Bottom sheet (modal)

Used for "Which one?", no match, unknown barcode, recents, and error sheets. **Not for the scan result**, which is a
full-screen view since D13 (see ResultView below).

- **Modal**, with a 60% scrim over the frozen scanner. Modal is chosen over non-modal because it passes SC 2.4.11
  (focus not obscured) by construction and the camera is paused behind it anyway (docs/06).
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` = the sheet's heading. Focus moves to the heading on
  open, is trapped while open, and returns to the control that opened it (usually the shutter) on close.
- **Detents:** `medium` (at most about 72% of the viewport) and `large` (full height minus the top safe area and
  12 px). Every sheet opens at its **content height, capped at medium**. If the content doesn't fit at medium
  (large text, landscape), it opens at large.
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

- Bottom, above the tab bar, the sheet's action bar or the result view's bottom bar, `surface-3`, `radius-pill`, at most one line of text
  plus one action ("Undo", "Reload").
- `role="status"` (polite). Auto-hides after 4 s, or 6 s when it has an action. Pauses while focused or hovered.
- Never the only place important information appears.

## Dialog (confirm)

Native-feeling centered dialog for destructive confirmations only (Erase all data). `role="alertdialog"`.
Cancel on the left, the destructive verb on the right ("Erase everything"). Focus starts on Cancel.

## Chips and pills

| Component | Look | Interactive? |
| --- | --- | --- |
| **ClassPill** | Class fill, ink text, icon + the class word only: "Indica" / "Sativa" / "Hybrid" / "Unknown" | No |
| **Tag chip** | `surface-3`, text color, `radius-sm`, 36 px tall | **No** (display only) |
| **"+N more"** | Tertiary button styled like a chip, 48 px hit area | Yes |
| **DisputedBadge** | Outlined (`border-strong`), `git-fork` icon + "Lineage disputed". Only inside How we know. | Yes: inline one-sentence explanation |

**Lists show the class word only** (D14, 2026-10-27): search results, journal rows, "Which one?" candidates, family-tree
rows and the Recent sheet use the one ClassPill. The old "full" pill ("Hybrid · Sativa-dominant") is removed;
dominance lives only in the detail (LeanLine).

Removed in the 2026-10-26 simplification: the **ConfidenceChip** (its wording moved into the BasisLine, its
explanation into How we know) and the **CloseToLineBadge** (there's no number left to be close to a line).

Why tag chips aren't tappable: tappable chips would each need 48 px height and 12 px gaps, turning a light list
into a wall of buttons. Tags are hedged by their heading ("Commonly reported"), and the taxonomy's one-line
descriptions live on /about. This is a deliberate trade-off: less detail on tap, a much calmer result.

## ResultView (the full-screen answer, D13)

- A full-screen modal view over the paused scanner: `role="dialog"`, `aria-modal`, labelled by the strain name,
  focus trapped and returned. Close button (48 px, top-right), Escape and browser back close it. No swipe needed.
- The whole view floods with the solid class color (no gradient). Above the fold: close, name, class icon, the
  **answer word** (`min(23cqw, 7.5rem)`; "Unknown lineage" `min(16cqw, 4.5rem)`), "Details ⌄", the footer line,
  and the bottom bar (Save + Scan another, rating row after Save). Details sit below the fold on a theme-colored
  panel. Full spec: [result-sheet.md](result-sheet.md).
- **On-flood controls:** primary = ink fill with a class-color label; secondary = 2 px ink outline with an ink label;
  text buttons and focus rings in ink. All ≥ 6.33:1 because they reuse the ink/flood pair.
- Motion: the flood circle grows from the lock-on point or the shutter (`--motion-flood`, transform only), then the
  content fades in. Reduced motion: 150 ms crossfade.
- While open, `theme-color` = the class color.

## ClassHero (pages)

- The rounded class-color block at the top of the strain page and journal detail: name, icon + class word. **No
  sublabel** (D14). Solid fill, full-ink text. Display 52 px; "Unknown lineage" 36 px; never breaks inside a word.

## LeanLine (detail only, D14)

- Input: `lineage.sublabel` and `method`. Output, for `traced` and `partial` only: "**Leans indica**
  (indica-dominant).", "**An even mix** (balanced).", "**Leans sativa** (sativa-dominant)." No sublabel → nothing.
- Where: first line inside How we know on a scan result; directly under the hero on the strain page and journal
  detail. **Never on the answer screen and never in lists.**

## BasisLine (replaces the ClassificationMeter and the ConfidenceChip)

- Input: `lineage.method` (and `kind` for landraces). Output: one line of plain footnote text (`text-2`) right
  in the details (scan result) or under the hero and LeanLine (pages), with the term in bold: "**Lineage traced:** an estimate from its family tree, not a lab test."
  Full copy table in [result-sheet.md](result-sheet.md#details-below-the-fold-or-one-tap).
- Not interactive: no button, no `info` icon, no popover. The longer explanation is in How we know.
- **Never renders a number.** No percentage, no score, no "close to the line", for any method. `sativa_pct` stays in
  the data (it decides the label) but is not displayed anywhere (founder decision, 2026-10-26).
- `method: unknown` renders "We don't have enough of its family tree to say." Never a 50/50 or any default.

**Why the meter was cut:** the founder asked for a much simpler result ("Just a solid Indica bright color, or
Sativa bright color, and the occasional Hybrid Green."). It also removes the biggest comprehension risk from the
first T-021 review (M1: people reading the percentage as potency or a lab result) and makes Q-D3 moot (the
reported values can't look like measurements if no value is shown).

## TagList

- Props: `tags: Term[]`. The result passes the **`effect` facet only**; flavors and terpenes aren't displayed in
  the MVP. Renders 0..n chips, wraps, collapses past 8 with "+N more" (expands inline, then "Show fewer").
  **Zero tags returns null** (no heading, no empty state).
- Order: as the data gives it. Positive- and neutral-polarity effects are chips. Negative-polarity effects render
  as one plain line, "Also reported: dry mouth, dizzy.", so they're shown honestly (docs/04) without the same
  weight as the main list.

## Live region

One app-wide polite live region (`role="status"`), plus `role="alert"` only for errors that block the task.
Messages (SC 4.1.3): "Starting camera", "Barcode found", "Reading label", "Still reading", "Taking longer than
usual", "Result: …", "3 possible matches", "No match found", "Saved to Journal", "Ready to scan", "5 results".

## Focus

2 px accent outline, 2 px offset (on class fills: ink outline). Visible on keyboard focus only
(`:focus-visible`). Scroll containers with sticky bars set `scroll-padding-bottom` so focus is never hidden.

## Skeletons

`surface-2` blocks matching the final layout, with a soft 1.2 s shimmer that stops after 5 s (SC 2.2.2). Used
when data takes > 300 ms. Under 300 ms, show nothing (avoids flashes). No spinners for anything under 1 s.

## Large text and small screens

- At root font size ≥ 150%: sticky action bars become static (end of content) and side-by-side buttons stack,
  the primary on top.
- At width ≤ 340 px: side-by-side buttons stack, except the result view's bottom bar (Save / Scan another), which
  stays side by side and drops its icons so both labels fit (see result-sheet spec).
- Everything reflows at 320 CSS px with no horizontal scroll (SC 1.4.10). The family tree caps indentation
  at 3 levels.

## Orientation

No orientation lock (SC 1.3.4; manifest has no `orientation`). Portrait-first. In landscape the scanner moves its
controls to a trailing-edge column, and sheets open at large, centered, max 640 px wide.
