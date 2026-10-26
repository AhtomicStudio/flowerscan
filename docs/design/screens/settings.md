# Screen: Settings (`/settings`)

Tasks: T-015, T-016, T-017 · Flow: [flows.md §8](../flows.md#8-restore-and-erase) · Mockup: `mockups/index.html#/settings`

## Purpose
A short, grouped, boring-on-purpose list. Every setting persists across reloads (F-17).

## Layout

```
┌──────────────────────────────┐
│ Settings                     │  large title
│ APPEARANCE                   │
│ Theme      [System|Dark|Light]│  segmented, 48 px
│ SCANNING                     │
│ Default mode         Auto  › │  menu: Auto / Text / Barcode / QR
│ Haptics                 [●]  │  toggle; ROW HIDDEN where vibrate is unsupported
│ YOUR DATA                    │
│ 42 scans saved on this phone │  caption
│ Back up journal            › │  downloads flowerscan-backup-YYYY-MM-DD.json
│ Last backup: Oct 20          │  caption ("Never" if none)
│ Restore from backup        › │  file picker
│ Erase all data               │  danger text
│ ABOUT                        │
│ How FlowerScan works       › │  /about#classification
│ Privacy                    › │  /about#privacy
│ Responsible use            › │  /about#responsible-use
│ Data version 2026.10 · App 0.1│ caption
└──────────────────────────────┘
  tab bar (Settings active)
```

Rows ≥ 52 px, full-width hit areas, grouped on `surface-2` cards with section headers.

## States

| State | Behavior |
| --- | --- |
| Theme change | Applies instantly (crossfade 150 ms). "System" follows `prefers-color-scheme`. The scanner stays dark. |
| Haptics unsupported (iOS, Firefox) | The row is **not rendered** (a toggle that does nothing is worse than none). |
| Back up | Downloads the file. Toast "Backup saved to your downloads" (iOS: "…to Files"). Updates "Last backup". |
| Back up, empty journal | Still allowed (it also backs up settings and barcode memory). |
| Restore: valid file | Summary sheet: "Restored {n} scans. {d} already here (kept the newer one). {x} couldn't be read." [View journal]. Counts from the real merge. |
| Restore: wrong file | Sheet: "That file isn't a FlowerScan backup. Nothing changed." [OK] |
| Restore: newer schema than the app | "This backup is from a newer version of FlowerScan. Update the app (reload), then try again." |
| Erase all data | Confirm dialog (shared): **"Erase everything on this phone?"** "Your journal, remembered barcodes and settings will be deleted. This can't be undone." [Cancel] [Erase everything]. Then the age gate (fresh start). |
| Storage may be cleared | Under "Your data": "Your browser may clear saved scans when space runs low. Back up to keep them." |
| Storage unavailable | "Your data" group shows: "Saving isn't available in this browser mode." Back up and Restore rows are hidden; Erase stays (it clears caches too). |
| Offline | Everything works. |

## Copy (draft)
See layout. Erase dialog as above. Backup filename `flowerscan-backup-YYYY-MM-DD.json` (docs/04).

## Accessibility
- Theme: `role="radiogroup"`. Haptics: `role="switch"` with `aria-checked`, the whole row is the label.
- Section headers are `<h2>`. The danger row is a button with danger text plus an `alert-triangle` icon (not color alone).
- Restore uses a real `<input type="file" accept="application/json,.json">` behind the row button.
