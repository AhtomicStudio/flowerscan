# Screen: Result view (`/scan/result`) and strain page (`/s/:strainId`)

Task: T-013 · Flow: [flows.md §2](../flows.md#2-scan--result-happy-paths) · Mockups: `mockups/index.html#/scan/result/traced`
(and `/hybrid`, `/partial`, `/reported`, `/unknown`, `/zero-tags`, `/many`, `/package-differs`), `#/s/kestrel-haze`

(The file keeps its old name so links don't break. The result is no longer a sheet.)

**Revision history**
- 2026-10-26, first founder review: simplify hard. The meter and every percentage, the confidence chip, "Close to
  the line", the package-says callout, the package facts row, flavors and terpenes, and Share are all cut.
- 2026-10-27, second founder review (open-questions **D13–D15**): "More of the screen should be taken up by the
  result. I want the whole screen to light up indica sativa or hybrid colors so the answer is immediately evident.
  Get rid of dominant for the final result."
  - **D13:** the answer floods the whole screen.
  - **D14:** no dominance on the answer.
  - **D15:** the label is Indica below 50, Hybrid at exactly 50, Sativa above 50.

## Purpose
Deliver a yes/no moment: in under 2 seconds the user knows **Indica, Sativa or Hybrid**. Two actions stay in reach
(Scan another, Save). Everything else, including why we think so, is one tap or one scroll away for the curious.

## Decision: a full-screen view, not a sheet
The scan result is a **full-screen modal view over the paused scanner** (like an iOS full-screen cover or an M3
full-screen dialog). Why:
- A sheet always leaves the frozen camera showing above it. The founder asked for the *whole screen* to light up.
- Nothing behind it needs to stay visible: the camera is paused while a result is open (docs/06).
- It keeps the modal benefits: focus is trapped, the close button is always there, and browser back closes it.

Sheets stay for everything else over the scanner ("Which one?", no match, codes, errors, Recent).

## Layout (portrait, 390 × 844)

```
┌──────────────────────────────┐ ← flood runs under the status bar (theme-color = class color)
│                          [×] │  close, 48 px, ink
│                              │
│                              │
│ Kestrel Haze                 │  strain name, display 30 px, ink
│ ☼                            │  class icon, 64 px, ink
│ Sativa                       │  ANSWER WORD, display, as wide as the screen allows
│                              │  (≈ 104 px at 390 wide with Archivo condensed)
│                              │
│          Details ⌄           │  ink text button, scrolls to the details
│ Effects vary person to       │  footer, caption, ink (always visible)
│ person. Start low, go slow.  │
│ ┌────────────┐ ┌───────────┐ │  bottom bar on the flood, always visible:
│ │ ☐ Save     │ │⌖ Scan     │ │  Save = ink outline · Scan another = ink fill
│ └────────────┘ └───────────┘ │
└──────────────────────────────┘
  ↓ below the fold (the answer area fills the first screen exactly)
┌──────────────────────────────┐
│ Details                      │  surface-1 panel, rounded top, theme colors
│ Lineage traced: an estimate  │  basis line
│ from its family tree, not a  │
│ lab test.                    │
│ Commonly reported [Uplifted]…│  effects (0..n), "Also reported: …"
│ ▸ How we know                │  collapsed: dominance, family tree, sources
│   Strain A × Landrace C · 5 sources
└──────────────────────────────┘
```

- **Above the fold** there is only: close, name, icon, answer word, "Details", the footer line, and the two
  actions. Measured in the mockup at 390 and 320 px, **≥ 91% of the viewport is the flat class color**, counting
  every ink pixel (text, icon, buttons) against it.
- The bottom bar (footer, rating row after Save, actions) stays fixed on the flood while the details scroll
  underneath, so Scan another and Save are never more than a tap away.

## Hierarchy
1. **The answer word** (the biggest thing on any screen in the app). 2. Strain name (confirms we read the right
thing). 3. **Scan another** (primary) and Save. 4. Details (one tap). 5. Footer.

## The answer (above the fold)
- **Flood:** the whole view is the solid class color: Indica `--color-class-indica` (purple), Sativa
  `--color-class-sativa` (orange), Hybrid `--color-class-hybrid` (green), Unknown lineage
  `--color-class-unknown` (gray). No gradient. All text, icons and controls on it are full ink
  (`--color-on-class`), never translucent. Ink on each flood is ≥ 6.33:1 (tokens contrast table).
- While the view is open, set `<meta name="theme-color">` to the class color so the Android status bar and
  browser chrome light up too. Restore it on close.
- **Answer word:** "Indica" / "Sativa" / "Hybrid", or "Unknown lineage". Display face, sized to the screen width
  (`min(23cqw, 7.5rem)`), so it's as big as it can be without overflowing at any width or text size. "Unknown
  lineage" is two words: `min(16cqw, 4.5rem)`, wrapping between them. It never breaks inside a word and never
  truncates.
- **Never color alone:** the class icon (moon / sun / half circle / question mark, 64 px) sits above the word, and the
  word is always there.
- **No dominance here (D14):** no "Sativa-dominant", no sublabel, no basis line, no tags above the fold.
- **Strain name:** plain text in the display style, exactly as `name` (P12). Wraps, never truncated.
- Under D15, **Hybrid only appears for an exactly balanced lineage (rounded `sativa_pct` = 50).** It's rare by
  design. Nothing on the answer screen hints at "how close" a result was (no numbers, D2).

## Flood moment (signature)
- The flood is a class-color circle that grows from the lock-on point, or from the shutter for text reads, to
  cover the screen (`--motion-flood`, 340 ms, `transform: scale` only). The name, icon and word fade in from
  200 ms; the word rises 8 px. A 10 ms haptic plays as the flood starts (Android).
- **Reduced motion:** a 150 ms crossfade to the finished screen. No circle, no rise.
- Live region (polite): "Result: Kestrel Haze. Sativa." For unknown: "Result: Night Heron. Unknown lineage."

## Bottom bar (always visible on the flood)
- **Scan another** (primary): ink fill, label in the class color (same contrast as ink on the flood), `scan-line`
  icon. It closes the view to the **live** scanner. Focus goes to the shutter; live region "Ready to scan". The
  code just used is muted until it has been out of view for 1.5 s ([scanner.md](scanner.md#same-code-cooldown)).
  The reticle does one "ready" breath (reduced motion: none).
- **Save** (secondary): 2 px ink outline, ink label, `bookmark` icon. On tap it morphs to "✓ Saved" (pop, double
  haptic) and shows the toast "Saved to Journal" [Undo], placed above the bar. A rating row appears in the bar,
  above the buttons: "Rate it (optional)" with 5 ink stars. Tapping "✓ Saved" opens the journal entry.
- Footer line above the buttons: "Effects vary person to person. Start low, go slow." Every result shows it (M-17).
- Why Scan another is primary: in a store the usual next step is the next package (founder decision pending; see
  README).
- ≤ 340 px: the buttons stay side by side and drop their icons. At ≥ 150% text the bar keeps the two buttons
  stacked (Scan another on top) and moves the footer line into the details panel, so the answer area keeps at
  least half the screen.

## Details (below the fold, or one tap)
- **"Details ⌄"** (ink text button, 48 px tall) scrolls the view to the panel and moves focus to its "Details"
  heading. Scrolling works too.
- The panel uses the normal theme surfaces (`surface-1`, rounded top). In order:
  1. **Basis line** (one line, term in bold):

     | Case | Basis line |
     | --- | --- |
     | `traced` | **Lineage traced:** an estimate from its family tree, not a lab test. |
     | `partial` | **Partly traced:** an estimate from part of its family tree, not a lab test. |
     | `reported` | **Reported type:** how sources describe it. We don't have its family tree yet. |
     | `unknown` | We don't have enough of its family tree to say. |
     | landrace page | **Landrace:** a traditional regional population, where our family trees stop. |

  2. **Learned barcode** (if it applies): "We'll recognize this barcode next time (on this phone)."
  3. **Effects (0..n):** "Commonly reported" chips (`effect` facet only, positive and neutral polarity, "+N more"
     past 8), then "Also reported: dry mouth, dry eyes." for negative polarity (or "Commonly reported: …" when
     there are only negatives). Zero tags → no section, no heading.
  4. **How we know** (collapsed disclosure; summary: "Strain A × Landrace C · 5 sources · 1 disputed"). Expanded,
     in order:
     - **The lean line (D14, the only place dominance appears on a scan):** see the table below.
     - What this is (by `method` and `confidence_level`, unchanged from the previous revision), plus for traced and
       partial: "It's a lineage estimate: how its ancestors are usually classified, carried down the family tree. It
       isn't a DNA or lab test, and it doesn't predict how a strain feels."
     - The family tree: nested list, class pills only (word, no numbers), "Lineage disputed" badges with an inline
       explanation, "Unknown parent" rows, "Origins of {name} are unknown."
     - "Reported type: {Sativa-dominant}." whenever sources give one (all methods except unknown and landrace).
     - "Package says {Hybrid}." (scans with a printed claim only), one plain line.
     - "Based on {n} sources." · How classification works → `/about#classification`.

### Lean line copy (detail only)
Built from the detail `sublabel` (D15's old five bands). Only for `traced` and `partial`; for `reported` the
"Reported type: …" line already says it.

| sublabel | Lean line |
| --- | --- |
| `indica-dominant` (21–49) | **Leans indica** (indica-dominant). |
| `balanced` (50) | **An even mix** (balanced). |
| `sativa-dominant` (51–79) | **Leans sativa** (sativa-dominant). |
| none (≤ 20 or ≥ 80) | No line. Nothing to add beyond the answer, so nothing is shown (no filler). |

Why this wording: "Leans sativa" is plain language. The industry term in brackets keeps it recognizable to people
who know "sativa-dominant" from packages. "An even mix" avoids "Hybrid · balanced", which would just repeat the
answer.

## Closing
Close (×, top-right, 48 px), Escape, browser back (the view pushes one history entry), and Scan another all return to
the live scanner. There's no swipe-to-dismiss on a full-screen view, so no drag-only action exists (SC 2.5.7).
Focus returns to the control that started the scan (usually the shutter).

## States

| State | Above the fold | Details |
| --- | --- | --- |
| **Sativa / Indica, traced** | flood + word | Lineage traced; lean line in How we know if 21–49 or 51–79 |
| **Hybrid** (exactly 50) | green flood, "Hybrid" | lean line "An even mix (balanced)" |
| **Partial** | flood + word | Partly traced; tree with "Unknown parent", "Origins of … are unknown." |
| **Reported** | flood + word (from the reported value) | Reported type line; "We don't have its family tree yet." |
| **Unknown lineage** | gray flood, `circle-help`, "Unknown lineage" | "We don't have enough of its family tree to say." Never any value. |
| **Zero tags** | — | no effects section |
| **Many tags** | — | "+N more" |
| **Package says otherwise** | unchanged | "Package says Hybrid." line in How we know (no callout, D4) |
| **Disputed ancestor** | unchanged (P9) | badge on the row, count in the summary |
| **Learned barcode** | — | the one-line note at the top of the panel |
| **Saved** | "✓ Saved", rating row in the bar | — |
| **Save failed** | sheet over the view, see [flows.md §7](../flows.md#7-save-journal-and-storage-test-plan-gap-8) | |
| **Offline** | works | works |

## Strain page (`/s/:id`) and journal detail
These are the "click into the strain" places, where detail is expected (D14).
- Reached from Search, family-tree rows, a journal entry, or a typed URL. Full page with the tab bar (Scan tab
  active) and a Back button.
- **Hero block** (rounded, `radius-lg`): name, icon and class word (display 52 px; "Unknown lineage" 36 px). No
  full-screen flood here: this is a reference page, not the scan moment.
- **Directly under the hero, visible without a tap:** the lean line (if any), then the basis line.
- Then **Save** (primary, inline; the page has no Scan another), the rating row after saving, effects, How we know
  (without the lean line, already shown above), and the footer.
- No package line (there's no package), except on journal entries that saved one.
- **Landrace pages:** basis line "Landrace: …"; How we know says "A landrace is where our family trees stop." and "Its
  classification follows our written landrace rubric, backed by two sources." (no rubric numbers).
- **Journal detail:** same hero, lean line and basis line from the **saved snapshot** (X-08), then rating and notes,
  effects, How we know, the scan details, "See today's version" if the data changed, and Delete. No Share.
- **Unknown id** (`/s/does-not-exist`): "We can't find that strain." "The link may be old, or the strain may have a
  new name." [Search strains] (primary) [Open scanner].
- **Loading:** skeleton hero (only after 300 ms). **Data failed:** "Strain data didn't load." [Try again].

## Accessibility
- The view is `role="dialog"` `aria-modal="true"`, labelled by the strain name (`<h2>`, focused on open, no
  visible ring since it isn't a control). Focus is trapped while open and returned on close.
- The answer word is real text (not an image). Icons are `aria-hidden`; the word carries the meaning.
- Focus rings on the flood are ink (≥ 6.33:1). Targets: close 48 px, Details 48 px tall, buttons 52 px, stars 48 px.
- 200% text: the word stays width-bound (`cqw`), so it can't overflow; the name wraps; see the bottom-bar rule above.
- 320 px: no horizontal scroll (verified). Landscape: the answer area is the left two thirds, the bar sits on the
  right edge, and details scroll as usual.
- Never color alone: icon + word everywhere, including the gray Unknown state.

## Copy review notes (docs/09)
- The answer is a genetics label, not an effect promise. No effect copy sits on the flood.
- "Commonly reported" / "Also reported" hedge every effect. "Lineage estimate", "not a lab test" (P8). No
  percentages anywhere (D2).
- "We match the name on the package. We can't confirm what's inside." stays on /about (P14).
