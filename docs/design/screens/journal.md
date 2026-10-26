# Screens: Journal list (`/journal`) and scan detail (`/journal/:scanId`)

Task: T-015 · Flow: [flows.md §7](../flows.md#7-save-journal-and-storage-test-plan-gap-8) · Mockups:
`mockups/index.html#/journal`, `#/journal/j1`, `#/journal/j4` (unidentified), `#/journal-empty`

## Purpose
A personal, private record: what you tried, what it was, and what you thought. Color-coded at a glance
(benchmark pattern 8), and clearly "on this phone only".

## List layout

```
┌──────────────────────────────┐
│ Journal                      │  large title (display 26)
│ Saved on this phone only.    │  caption, text-3 · "Back up" link → Settings
│                              │
│ TODAY                        │  section header (caption, uppercase)
│ ┌──────────────────────────┐ │
│ │▌☼ Kestrel Haze        ›  │ │  row 72 px: 4 px class-color edge + icon,
│ │▌ Hybrid · Sativa-dom… ★★★★☆│ │  name, class text, rating (if any)
│ │▌ Pre-roll · 2:14 PM      │ │  product form (if any) · time · method icon
│ └──────────────────────────┘ │
│ THIS WEEK                    │
│  … Strain C (Indica) …       │
│ EARLIER                      │
│ ┌──────────────────────────┐ │
│ │▌? Unidentified scan    › │ │  gray edge, "?" icon
│ │▌ “PREMIUM FLOWER”        │ │  what we read, in quotes
│ └──────────────────────────┘ │
└──────────────────────────────┘
  tab bar (Journal active)
```

- Newest first, grouped Today / This week / Earlier (then by month after 3 months).
- The class color is an edge bar plus icon plus words, never color alone. Unknown lineage uses the gray edge and
  the words "Unknown lineage".
- No swipe actions (SC 2.5.7). Delete lives on the detail screen.
- No search or filter in MVP. Revisit when real journals pass ~50 entries (noted, not designed).

## List states

| State | Behavior |
| --- | --- |
| Has entries | As above. |
| **Empty** | Centered: `book-open` icon, **"Your saved scans show up here."** "Scan a package and tap Save." [Scan a package] (primary). Caption: "Everything stays on this phone." |
| Loading (IndexedDB slow) | 3 skeleton rows, only if > 300 ms. |
| **Storage unavailable** (private mode, blocked) | Panel: **"Your journal isn't available in this browser mode."** "Private browsing and some settings block saving. Open FlowerScan in a normal tab to keep a journal." No buttons except [Scan a package]. |
| Storage may be cleared (`persist()` refused) | One-time dismissible note at the top: "Your browser may clear saved scans when space runs low. Back up to keep them." [Back up] [Dismiss]. |
| Offline | Works. |

## Detail layout

```
┌──────────────────────────────┐
│ [← Journal]         [Share]  │  app bar
│ (same hero as the result:    │  ResultSheet in page mode, from the
│  class fill, name, class     │  lineage SNAPSHOT saved with the scan (X-08)
│  word, meter, chip)          │
│ ┌──────────────────────────┐ │
│ │ Your rating  ☆☆☆☆☆        │ │  5 stars, 48 px hit areas (see Rating note)
│ │ Notes                    │ │
│ │ [ textarea …           ] │ │  autosaves; status "Saved" under it
│ └──────────────────────────┘ │
│ Scanned Oct 26, 2:14 PM      │  meta: date, method ("Read from label text"),
│ Read from the label · Pre-roll│  product form, package says
│ Package says Indica          │
│ ▸ How we know  (as result)   │
│ Data from Oct 2026. [See today's version] │ only if data_version differs
│ Delete from journal          │  destructive text button
│ Effects vary person to person. Start low, go slow.
└──────────────────────────────┘
```

- **Rating:** 5 star buttons, each 48 × 48 px with 4 px visual gap (each star's hit area abuts the next). This is the
  one place we go under the 12 px spacing rule: a rating row is a single control (a radio group) where adjacent
  hits change the value by one, which is the platform convention (App Store, Play). Tapping the current rating
  again clears it; there's also a "Clear" text button.
- **Notes:** plain textarea (Markdown stored, rendered as plain text in MVP), autosaves 600 ms after typing stops;
  status line "Saved" (polite live region).
- **Snapshot (X-08):** the hero shows the lineage saved at scan time. When the current dataset has a different
  result for the strain, a line appears: "This is how it looked when you saved it. [See today's version]" →
  `/s/:id`.
- **Delete:** tap → entry removed, back to the list, toast "Deleted" [Undo] (6 s). No confirm dialog (undo
  is better than a confirm, Nielsen #3).

## Detail states

| State | Behavior |
| --- | --- |
| Identified | As above. |
| **Unidentified** | No hero, no meter, no class. Header (surface-2): `circle-help` icon, **"Unidentified scan"**, "We couldn't match this one." "What we read: “PREMIUM FLOWER”". [Search for it] → `/search?q=…`. Rating and notes work. |
| Unknown lineage | Gray hero as in the result sheet. |
| Not found (`/journal/bad-id`) | "That scan isn't in your journal." [Open Journal] |
| Save failed (quota) | Notes status line: "Couldn't save. Your phone is out of space." (`role="alert"`) |

## Copy (draft)
- Title: Journal · Subtitle: Saved on this phone only. **Back up**
- Empty: Your saved scans show up here. / Scan a package and tap Save. / Everything stays on this phone.
- Method lines: Read from the label · Barcode · QR code · Searched · Opened from a link
- Unidentified: Unidentified scan / We couldn't match this one.

## Accessibility
- List rows are links; accessible name: "Kestrel Haze, hybrid, sativa-dominant, rated 4 of 5, today 2:14 PM".
- Section headers are `<h2>`.
- Stars: `role="radiogroup"` "Your rating", radios "1 star" … "5 stars"; arrow keys change the value.
- Textarea has a visible label "Notes".
