# Screen: No-match sheet, and barcode / QR dead ends

Tasks: T-014 (no match), T-010 (codes) · Flow: [flows.md §4](../flows.md#4-no-match) · Mockups:
`mockups/index.html#/scan/nomatch`, `#/scan/barcode-unknown`, `#/scan/tracking`

## Purpose
Turn a dead end into a next step (benchmark pattern 10). Show exactly what we read, let the user fix it, and
**never** show a classification for something we didn't match.

## Layout (no match)

```
┌──────────────────────────────┐
│ ═══                      [×] │
│ We couldn't find a strain in │  headline
│ that label.                  │
│ Here's what we read. Fix it  │  body, text-2
│ and search, or try again.    │
│ ┌──────────────────────────┐ │
│ │ PREMIUM FLOWER  ✎        │ │  editable text field (17 px), prefilled
│ └──────────────────────────┘ │
│ ▸ See all the text we read   │  disclosure: every OCR line, read-only
│ ┌────────────┐ ┌───────────┐ │
│ │  Search    │ │ Try again │ │  primary / secondary
│ └────────────┘ └───────────┘ │
│ ─────────────────────────────│
│ We don't have this strain    │  footnote
│ yet?  Request it             │  tertiary (Could)
│ Save anyway                  │  tertiary
└──────────────────────────────┘
```

- Prefill: the highest-weight candidate line from `parseLabelText`, as read (OCR quirks included, so the user
  can see why it failed). Empty if nothing usable was read.
- **No classification, meter, pill, tag, or "nearby" strain** anywhere on this sheet (F-13, X-02).

## States

| State | Behavior |
| --- | --- |
| Default | As above. |
| Nothing read (blank OCR) | Title "We couldn't read any text there." Body "Fill the frame with the strain name, and try the torch." Field empty with placeholder "Type the strain name". [Try again] becomes primary, [Search] secondary. |
| Edit + Search | Opens `/search?q=…` with results. (Re-matching in place was considered; search is the same engine with a better results UI.) |
| Try again | Closes the sheet, scanner in Text mode for one shot (the pill says "Text mode: tap the shutter"), then back to the saved default. |
| Request it (Could) | Stores `{ text, date }` locally. Toast "Request noted on this phone." Nothing is sent (privacy). If not built in MVP, the line is omitted, not shown disabled. |
| Save anyway | Saves an **unidentified scan** (`strain_id: null`) with product form and the read text. Toast "Saved to Journal as unidentified" [Undo]. |
| Offline | Works. |

## Barcode and QR dead ends (test-plan gap 4)

Same sheet shell, different content. Primary action is always **Scan the label**, because the text scan is the
fastest path to a strain and (for learnable codes) teaches the barcode for next time.

| Variant | Title | Body | Actions |
| --- | --- | --- | --- |
| Unknown barcode (UPC/EAN, or Code 128 seen once) | **We don't know this barcode yet** | Cannabis barcodes aren't in any public list, so we learn them on your phone. Scan the strain name once and we'll remember it next time. | **Scan the label** · Search by name |
| Tracking code (UID pattern) | **That's a tracking code** | It's unique to this one package, so it can't tell us the strain. Scan the strain name instead. | **Scan the label** · Search by name |
| Lab-results QR (COA) | **That QR is for lab results** | It doesn't name the strain. Scan the strain name instead. Link: `{domain}` (plain text) | **Scan the label** · Search by name · Open link |
| Retail ID QR | **That QR is a tracking code** | Same as tracking code. Link: `{domain}` | Same as COA |

- "Scan the label" closes the sheet, switches to Text mode for one shot, and pulses the shutter once (reduced
  motion: no pulse) with the pill "Now tap to read the strain name".
- "Open link" opens the URL in a new tab, only on tap. We show the domain first so nobody is surprised where it
  goes. Offline: toast "You're offline. Try the link later."
- The barcode value is shown in small text-3 ("Barcode 0 12345 67890 5") so people trust we read *something*.
  Tracking UIDs are not shown in full (first 4 and last 4 characters only), since they're per-package identifiers.

## Copy (draft)
See tables. Buttons: **Search**, **Try again**, **Request it**, **Save anyway**, **Scan the label**,
**Search by name**, **Open link**.

## Accessibility
- Dialog semantics. Focus to the title. Live region: "No match found" (no match), "Barcode not recognized" (codes).
- The field has a visible label "What we read" (visually small, still present) and `enterkeyhint="search"`;
  Enter searches.
- "See all the text we read" is a disclosure; the lines are a list, read-only.
