# Screen: Result sheet (`/scan/result`) and strain page (`/s/:strainId`)

Task: T-013 · Flow: [flows.md §2](../flows.md#2-scan--result-happy-paths) · Mockups: `mockups/index.html#/scan/result/traced`
(and `/partial`, `/reported`, `/unknown`, `/zero-tags`, `/disagree`, `/close`), `#/s/traced`

One component (`ResultSheet`, docs/08) renders both: as a modal sheet over the frozen scanner after a scan, and
as a full page for deep links and search results. Package facts and the package-says callout exist only for
scans.

## Purpose
Answer "what is this?" in one glance (the hero), prove it in one tap ("How we know"), and let the user keep or
share it. Lineage sits above the fold (benchmark implication), the method is published (pattern 5), and nothing
is shown that the data doesn't have.

## Layout (medium detent, portrait)

```
┌──────────────────────────────┐
│ ═══ (grabber)            [×] │ ┐
│ Kestrel Haze                 │ │ HERO FLOOD: class fill, ink text
│ ☼◐ Hybrid                    │ │ name (title 26), class word (display 44)
│ Sativa-dominant              │ │ sublabel (headline 20)
│ Strain A × Landrace C        │ │ parents one-liner (footnote), only if known
│ [ ✓ Lineage traced  ⓘ ]      │ ┘ confidence chip (ink outline)
│                              │
│ Indica 30%        Sativa 70% │   meter labels, tabular figures
│ ▕████████████████●█████▏     │   gradient track + knob, band ticks
│ Lineage estimate, not a lab  │   caption + ⓘ   [Close to the line] if ±2
│ test. ⓘ                      │
│ ┌──────────────────────────┐ │
│ │⤨ Package says Indica.    │ │   PACKAGE-SAYS CALLOUT (only when opposite)
│ │  The family tree leans   │ │
│ │  Sativa-dominant.        │ │
│ │  How we got ours ›       │ │
│ └──────────────────────────┘ │
│ ┌────────────┐ ┌───────────┐ │   sticky action bar
│ │   Save     │ │Share link │ │
│ └────────────┘ └───────────┘ │
└──────────────────────────────┘
   … scrolling / large detent:
   From the package: Pre-roll          (scan only, if product_form)
   Commonly reported
     Effects   [Uplifted] [Creative] [Focused] … [+3 more]
     Also reported [Dry mouth]
     Flavors   [Citrus] [Pine]
     Terpenes  [Terpinolene] [Myrcene]
     From 4 sources · How we know ›
   ▸ How we know   Family tree · 6 ancestors · 5 sources · 1 disputed
   Effects vary person to person. Start low, go slow.
```

## Hierarchy
1. **Classification word** (biggest). 2. Strain name (confirms we read the right thing). 3. Meter and number.
4. Confidence chip. 5. Package-says callout (when present, it's the playful "aha"). 6. Save / Share.
7. Tags. 8. How we know (one tap). 9. Footer.

## Hero rules
- Fill = class color (`indica` / `hybrid` / `sativa` / `unknown`), all text full ink (no translucent text,
  contrast table). Icon + word always (never color alone).
- **Name:** plain text in the shared display style, exactly as `name` in the data (P12). Never truncated; wraps.
- **Class word:** "Indica" / "Hybrid" / "Sativa" / "Unknown lineage". For hybrids, the sublabel line:
  "Indica-dominant" / "Balanced" / "Sativa-dominant".
- **Parents one-liner** (`Strain A × Landrace C`): only when the node has ≥ 1 named parent. An unknown parent
  reads "unknown parent" (`Strain F × unknown parent`). Three or more parents: the first two and "+1". No
  parents: the line is omitted.
- **ConfidenceChip:** copy from `method`, explanation from `method` + `confidence_level`:

| method | Chip | Explanation sentence (by level) |
| --- | --- | --- |
| `traced` | Lineage traced | high: "Every branch of its family tree is traced to sourced data." · medium/low: "Every branch is traced, but through many generations, so treat it as an estimate." |
| `partial` | Partly traced | high: "Most of its family tree is traced. Where it ends, we use how sources describe those strains." · medium: "Part of its family tree is traced. The rest uses how sources describe it." · low: "Only a small part of its family tree is traced, so this is a rough estimate." |
| `reported` | Breeder's label | any: "We don't have its family tree yet, so this uses how the breeder or published sources describe it." |
| `unknown` | (no chip: the hero already says "Unknown lineage") | |

The UI never uses the word "confidence" (domain review §1.8).

## Meter rules (see shared ClassificationMeter)
- Number always next to the label (band cliffs, domain review §1.4).
- **Close to the line:** show the badge when `sativa_pct` is within 2 of a band edge, i.e. when
  `|sativa_pct − e| ≤ 2` for any edge `e` in {20.5, 40.5, 59.5, 79.5}. That's 19–22, 39–42, 58–61 and 78–81.
  Explanation: "{n} is close to the cutoff between {lower band} and {upper band}. A small change in the family tree
  would change the label."
- "Lineage estimate, not a lab test." ⓘ explanation: "It's an average of how its ancestors are usually classified,
  carried down the family tree. It isn't a DNA or lab measurement, and it doesn't predict how a strain feels."
  Link: "How classification works" → `/about#classification`.
- **Reported:** shaded band, no knob, no number, caption "Based on how it's described, not its family tree."

## Package-says callout (P8)
- Shown **only when directions are opposite**:
  - `package_says = indica` and `label = sativa` or `sublabel = sativa-dominant`, or
  - `package_says = sativa` and `label = indica` or `sublabel = indica-dominant`.
- Never for `package_says = hybrid`, never for `balanced`, never when the lineage is unknown, never on deep links.
- Copy: "Package says **Indica**." / "The family tree leans **Sativa-dominant**." / link "How we got ours ›"
  (opens and scrolls to How we know).
- Look: `accent-tint` card, `split` icon, 1 px accent left rule. Not an error color: a disagreement is
  information, not a warning.
- **Signature moment:** it slides up 8 px and fades in 150 ms after the meter settles, with a single gentle
  4-degree "tilt" of the icon. Reduced motion: fade only.

## Package facts (scan results only, P2)
- One row: "From the package: **Pre-roll**" (`product_form`), only when present. **Potency is never rendered**,
  not even in the DOM.
- The label claim is shown in How we know (below), so docs/02's "label claim shown" holds without a callout
  for agreeing labels.
- If the user picked a strain for a learnable barcode: "We'll recognize this barcode next time (on this phone)."

## Tags (0..n)
- Section heading "Commonly reported", with facet rows Effects / Also reported (negative polarity) / Flavors /
  Terpenes. Each facet row renders only if it has ≥ 1 tag. **No tags at all → no section, no heading.**
- Past 8 in a facet: "+N more" expands inline.
- Under the chips: "From {source_count} sources · How we know ›". Hidden when `source_count` is 0 (can't
  happen for shipped tags, but the UI doesn't assume).
- Tags stagger in 30 ms apart on reveal (cap 10). Reduced motion: together.

## How we know (collapsed disclosure)
- Summary row (48 px+): "How we know", sub-line "Family tree · {n} ancestors · {source_count} sources", plus
  "{k} disputed" when any ancestor (or the strain itself) is `disputed`.
- Expanded content, in order:
  1. **Family tree** as a nested list (depth 3 by default, "Show older generations" if deeper). Each row:
     name (link to `/s/:id` for strains and landraces), kind word ("Landrace", "Cross" for unnamed crosses),
     mini ClassPill, number (tabular), DisputedBadge if `verification = disputed`.
     - Unknown parents: a row "Unknown parent" (text-2, `circle-help` icon).
     - Where a branch ends without a landrace: a sentence under that node, "Origins of {name} are unknown."
     - Indentation 16 px per level, capped at 3 levels; connectors are decorative (`aria-hidden`).
  2. **What sources say** (when `method` is traced or partial and `reported_type` is known): "Sources describe it
     as {reported type}." Never averaged with ours (docs/05).
  3. **Package** (scans with `package_says`): "Package says {Indica}." If opposite: "…See the note above." If the
     lineage is unknown: "We can't compare it: the family tree is unknown."
  4. "Based on {source_count} sources." · link **How classification works** → `/about#classification`.
- DisputedBadge explanation: "Sources disagree about this strain's parents. We show the best-supported version."

## Actions
- **Save** (primary) and **Share link** (secondary), equal width, sticky at the sheet bottom. At ≥ 150% text the bar
  becomes static at the end of the content (so it can't eat the viewport).
- **Save moment:** the button morphs to "✓ Saved" (icon draws in 200 ms, a small 1.0 → 1.06 → 1.0 pop), double
  haptic, toast "Saved to Journal" [Undo]. Below the bar, a row appears: "Rate it for your journal (optional)" with
  5 stars. Tapping "✓ Saved" again opens the journal entry. Reduced motion: no pop.
- **Share link:** Web Share `{ title: name, url: /s/:id }`. No share sheet → copy to clipboard and toast "Link
  copied". The URL contains only the strain id (M-19).
- On `/s/:id`, Save stores a scan with `scan_method: link` and the same moment plays.

## Footer
"Effects vary person to person. Start low, go slow." (every state, M-17)

## States

| State | Hero | Meter | Chip | Tags | Notes |
| --- | --- | --- | --- | --- | --- |
| **Traced** | class fill | knob + number | Lineage traced | if any | |
| **Partial** | class fill | knob + number | Partly traced | if any | Tree shows "Unknown parent" rows and "Origins of … are unknown." |
| **Reported** | class fill | shaded band, no number | Breeder's label | if any | No tree, How we know shows "We don't have its family tree yet." |
| **Unknown lineage** | gray fill, `circle-help` icon, "Unknown lineage" | **not rendered**; panel: "We don't have enough of its family tree to estimate it." + "How classification works ›" | none | if any | No percentage anywhere (X-02). No callout. |
| **Zero tags** | — | — | — | **section absent** | Sheet is shorter; nothing fills the gap. |
| **Many tags** | — | — | — | "+N more" per facet | |
| **Package disagrees** | — | — | — | — | Callout appears (rules above). |
| **Close to the line** | — | badge | — | — | |
| **Disputed ancestor** | unchanged (P9: no cap) | unchanged | unchanged | — | Badge in the tree, count in the summary row. |
| **Saved** | — | — | — | — | Button shows "✓ Saved"; rating row visible. |
| **Save failed** | | | | | Quota / unavailable, see [flows.md §7](../flows.md#7-save-journal-and-storage-test-plan-gap-8). |
| **Loading** (`/s/:id` before data) | gray skeleton block | skeleton bar | — | — | Only if > 300 ms. |
| **Data failed to load** | — | — | — | — | Page: "Strain data didn't load." "Check your connection and try again." [Try again] |
| **Unknown id** (`/s/does-not-exist`, F-15) | — | — | — | — | Page: "We can't find that strain." "The link may be old, or the strain may have a new name." [Search strains] (primary) [Open scanner]. No classification. |
| **Offline** | works | | | | Share still works (copy fallback). |

## Strain page differences (`/s/:id`)
- Full page, not a sheet: top app bar with Back (`arrow-left`, "Back"; goes to the scanner if there's no history)
  and the same hero below it. No grabber, no close button.
- No package facts, no callout. Tab bar visible (Scan tab active).
- Save / Share sit **right under the meter**, not sticky (the tab bar already owns the bottom edge, and a second
  sticky bar would squeeze the content at large text sizes).
- **Landrace pages** (reachable from tree rows and search): the chip reads **"Landrace"**, explanation "A
  traditional regional population. Its value comes from our landrace rubric, on a coarse 10 / 25 / 50 / 75 / 90
  scale, backed by two sources." How we know says "A landrace is where our family trees stop." instead of a tree.

## Journal detail differences
Same hero and meter, from the **saved lineage snapshot** (X-08), then the user's rating and notes, then tags and
How we know. No Save / Share bar (Share lives in the app bar). See [journal.md](journal.md).

## Accessibility
- Sheet: dialog semantics, focus to the `<h2>` strain name on open (shared component). The page uses `<h1>`.
  Programmatically focused headings (`tabindex="-1"`) show no focus ring: they aren't controls.
- Live region on open: "Result: {name}. {Hybrid, sativa-dominant}. Lineage estimate {70} percent sativa.
  {Lineage traced}." For unknown: "Result: {name}. Unknown lineage."
- The class word and sublabel are one heading-level text, not an image. Icons are `aria-hidden`.
- Chips and badges with explanations are buttons with `aria-expanded` and `aria-controls`; the explanation is an inline region right after the button (no floating popover, so it reflows at 200% text and 320 px, and focus never jumps).
- How we know: a `<button aria-expanded>` controlling the region. The tree is a nested `<ul>`; each `<li>` reads
  "Strain A, hybrid, 50, lineage disputed".
- 200% text: the hero wraps (name and class word on their own lines), the sheet opens at large, the action bar
  un-sticks. 320 px: no horizontal scroll; the tree caps indentation.

## Copy review notes (docs/09)
- "Commonly reported" hedges every effect. No effect copy ties to the class word.
- "Lineage estimate", "family tree leans" (P8). Never "70% sativa genetics".
- "We match the name on the package. We can't confirm what's inside." is **not** here (P14); it's on /about.
