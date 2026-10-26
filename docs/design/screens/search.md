# Screen: Search (`/search`)

Task: T-014 (button on the scanner: T-009) · Mockup: `mockups/index.html#/search`

## Purpose
The free, always-available recovery path (benchmark avoid #5): no camera, denied camera, no match, or just
faster to type. Must work offline and feel instant.

## Layout

```
┌──────────────────────────────┐
│ [←]  [ 🔍 Search strains   ×]│  back button + search field (autofocus), 48 px+
│                              │
│ RECENT                       │  (empty query) last 5 journal strains
│ ☼ Kestrel Haze        Today  │
│ ☾ Strain C        Yesterday  │
│                              │
│ Tip: try a nickname or how   │  footnote, text-3
│ it's spelled on the package. │
│ ───────── typing "kes" ──────│
│ 3 results                    │  caption, also announced
│ Kestrel Haze                 │  result row 64 px+: name (match highlighted
│ [◐ Hybrid · Sativa-dominant] │   in bold, not color), full ClassPill
│ Kestrel Haze #2              │
│ Also called “KH2” · [☾ Indica]│ alias line when the hit was an alias
└──────────────────────────────┘
  tab bar (Scan active)
```

- Pushed screen under the Scan tab (tab bar stays). Back returns to the scanner (or wherever the user came from).
- Results: top 20 from the same matcher as scanning. Tap → `/s/:id`.
- An alias hit shows "Also called “{alias}”" so the user understands why it matched.

## States

| State | Behavior |
| --- | --- |
| Empty query, journal has entries | "Recent" list (last 5 distinct strains), then the tip. |
| Empty query, empty journal | Only the tip, plus "Or scan a package" link back to the scanner. |
| Typing | Results update on each keystroke (debounce 80 ms; matching is ≤ 50 ms). No spinner. |
| Prefilled (`?q=` from no-match) | Field contains the text with the cursor at the end; results already shown. |
| No results | "No strains match “{q}”." "Check the spelling, or try fewer words." Divider. "We don't have this strain yet? **Request it**" (Could; same local behavior as no-match). |
| Data still loading (first visit) | 3 skeleton rows (only if > 300 ms). The field is usable; results appear when data arrives. |
| Data failed | "Strain data didn't load. Check your connection and try again." [Try again] |
| Offline | Works. No banner. |

## Copy (draft)
- Placeholder: Search strains
- Tip: Try a nickname or how it's spelled on the package.
- Results count: {n} results / 1 result
- No results: No strains match “{q}”. Check the spelling, or try fewer words.

## Accessibility
- `<input type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false">`,
  17 px, visible label (visually hidden `<label>` "Search strains" plus the placeholder).
- Results count in the polite live region (M-07), debounced to 500 ms so it isn't chatty.
- Results are a list of links. The highlighted part uses `<mark>` styled bold (not color only).
- Clear button (×) 48 px, `aria-label="Clear search"`. Escape clears, then a second Escape goes back.
