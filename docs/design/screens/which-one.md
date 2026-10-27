# Screen: "Which one?" sheet (close call)

Task: T-014 · Flow: [flows.md §3](../flows.md#3-close-call-which-one) · Mockup: `mockups/index.html#/scan/which`

## Purpose
When the matcher is close but not sure (docs/06 §6), ask instead of guessing. A wrong confident answer is the
worst failure (false accept < 1%), so this sheet must be fast to answer and honest about what we read.

## Layout

```
┌──────────────────────────────┐
│ ═══                      [×] │
│ Which one is it?             │  headline (sheet title)
│ We read “STRAIN A”. Pick the │  body, text-2; read text in quotes, as read
│ one on your package.         │
│ ┌──────────────────────────┐ │
│ │ Strain A #4          ›   │ │  candidate row, 64 px+: name (number emphasized)
│ │ Breeder X · [◐ Hybrid]   │ │  breeder if any · mini ClassPill
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ Strain A #5          ›   │ │
│ │ [☾ Indica]               │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ Strain A             ›   │ │
│ │ [? Unknown lineage]      │ │
│ └──────────────────────────┘ │
│  None of these               │  secondary button, full width
└──────────────────────────────┘
```

- Up to **3** candidates, in matcher order. No scores shown (users have no model for them; benchmark note).
- Rows are full-width buttons, ≥ 64 px tall, 12 px apart.
- The ClassPill shows only the label word (Indica / Hybrid / Sativa / Unknown lineage, D15 labels), from the candidate's
  lineage. It helps people recognize the right one ("the package says indica, so probably #5"), but it isn't a
  result: no percentage, no tags.

## States

| State | Behavior |
| --- | --- |
| 2–3 candidates | As above. |
| 1 candidate (top ≥ 0.60 but blocked from auto-accept) | Title "Is it this one?", one row, plus "None of these". |
| Candidates differ only by number (P5) | The number is set in the display face (`#4`) so the difference is visible at a glance. |
| "A x B" label with no curated cross (P4) | Title "That looks like a cross of two strains". Body "We don't have this cross yet. Here are its parents." Rows show the parents with the line "Parent, not a match". Tap → that parent's `/s/:id` page (not a scan result, nothing remembered). "None of these" stays. |
| Barcode involved | Footnote under the list: "We'll remember your pick for this barcode, on this phone." Only for learnable codes (P13). |
| Pick | The sheet closes and the full-screen result view floods in (one history entry). Back returns to the list. |
| None of these | Opens the no-match sheet with the read text prefilled. |
| Close / back / Escape | Back to the live scanner. Nothing saved, nothing remembered. |
| Offline | Works (all local). |

## Copy (draft)
- Title: **Which one is it?** (1 candidate: **Is it this one?**)
- Body: We read “{text as read}”. Pick the one on your package.
- Button: **None of these**
- Barcode footnote: We'll remember your pick for this barcode, on this phone.

## Accessibility
- Dialog semantics (shared sheet). Focus to the title. Live region: "{n} possible matches".
- Each row is one `<button>` whose accessible name is "Strain A number 4, Breeder X, hybrid".
- The read text is in a `<q>` so screen readers voice it as a quote.

## Hallway-test focus
Do people pick confidently, and does anyone pick a wrong one because the pill misled them? (hallway-test.md task 2)
