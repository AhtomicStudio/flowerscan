# FlowerScan design (T-021)

Status: **draft for founder review** (2026-10-26). Tokens are placeholders until Roy's identity lands (Q11).
docs/08 is the summary and the rules; this folder is the detail engineers build from.

| File | What it is | Main consumers |
| --- | --- | --- |
| [flows.md](flows.md) | Navigation map and flow diagrams: first run, scan → result, several codes in view, slow OCR, close call, no match, barcode dead ends, camera unavailable, offline, storage, restore and erase | everyone |
| [screens/_shared-components.md](screens/_shared-components.md) | Tab bar, buttons, sheet, toast, dialog, chips, meter, tag list, live region, focus, skeletons, large text, orientation | T-004 |
| [screens/age-gate.md](screens/age-gate.md) | Age gate and exit screen | T-017 |
| [screens/scanner.md](screens/scanner.md) | Camera card, scanner and every camera / OCR state | T-009, T-010, T-011 |
| [screens/result-sheet.md](screens/result-sheet.md) | Result sheet, strain page, unknown id | T-013 |
| [screens/which-one.md](screens/which-one.md) | Close call | T-014 |
| [screens/no-match.md](screens/no-match.md) | No match, unknown barcode, tracking code, lab-results QR | T-014, T-010 |
| [screens/search.md](screens/search.md) | Manual search | T-014 |
| [screens/journal.md](screens/journal.md) | Journal list and scan detail | T-015 |
| [screens/settings.md](screens/settings.md) | Settings, backup, restore, erase | T-015, T-016, T-017 |
| [screens/about.md](screens/about.md) | How it works, limits, data, privacy, responsible use | T-017 |
| [tokens-proposal.md](tokens-proposal.md) | Placeholder palette with **measured** contrast, type, spacing, radii, elevation, motion | T-004, Roy |
| [hallway-test.md](hallway-test.md) | 5-person script for the 3 core flows, pass criteria, results template | the task that runs it (unowned, test-plan gap 12) |
| [mockups/index.html](mockups/index.html) | One self-contained clickable prototype of every screen and state | founders, Roy, engineers |

## Opening the mockup on a phone

It's one HTML file with no build step and no assets except Google Fonts (it falls back to system fonts offline).
Navigation uses the URL hash, so the browser's back button works like the app's.

- **Same Wi-Fi, from the dev machine:** run `pnpm dlx http-server docs/design/mockups -p 8080` (or any static
  server) and open `http://<your-LAN-IP>:8080` on the phone. The mockup never uses the real camera, so plain
  HTTP is fine.
- **Android:** you can also send the file to the phone and open it in Chrome.
- **Desktop:** open the file directly. It shows a 390 × 844 phone frame.

Start at the age gate (the default), tap through, then use the pink **PROTOTYPE** tab (right edge) to jump to
any state, switch dark/light, simulate reduced motion, and choose what the shutter or a barcode tap leads to.
On the scanner, **tap the package's barcode** to simulate a code coming into view, or **tap the shutter** to read
text. Everything in it is **fictional sample data** (names like "Kestrel Haze", "Strain A", "Landrace K"); the
numbers follow the docs/05 algorithm so they're internally consistent, but no strain facts are real.

## Design decisions (and why)

1. **One camera card instead of intro + priming.** One tap fewer before the first answer (benchmark pattern 1).
2. **Modal result sheet** with a tappable grabber and a close button. Modal passes WCAG 2.4.11 by construction;
   the button alternatives satisfy 2.5.7.
3. **Three tabs; Search is a scanner button.** Search is the fallback for scanning, and a fourth tab would split
   the "point at it" story. HIG's new search-tab pattern was considered.
4. **Classification is the biggest thing; parents sit in the hero.** Lineage above the fold is our edge over
   badge-first cannabis apps (benchmark implication).
5. **"Breeder's label" results show no percentage**, only the shaded band. The reported values are a convention,
   and printing "85%" would look like a measurement (non-negotiable 2).
6. **Package-says callout only on opposite directions (P8)**, styled as information (accent tint), not a warning.
   The label claim is still listed in "How we know".
7. **Tags are display-only chips**, so the result stays calm; descriptions live on /about#tags.
8. **No permanent offline banner.** Almost everything works offline; we speak up only when something can't.
9. **Cyan placeholder accent**, because violet, green and amber belong to the classifications.
10. **All text ≥ 4.5:1, even large text**, and no translucent text on class colors, so Roy's swap can't silently
    break contrast.
11. **Explanations expand inline**, not as floating popovers: they reflow at 200% and 320 px.
12. **Scanner always dark**, whatever the theme. It sits on a camera feed.

## Open questions

| # | For | Question | Proposal |
| --- | --- | --- | --- |
| Q-D1 | Founders, legal (Q10) | Is "Leave → exit screen for this browser session" enough, or should it block longer? | Session only. Longer blocking punishes mis-taps, and the gate is self-declared anyway. |
| Q-D2 | Founders | The `reported` chip says "Breeder's label", but the source may be a published source, not the breeder. Keep it, or say "Reported type"? | Keep "Breeder's label" (shorter, warmer); the explanation says "the breeder or published sources". Test it in the hallway test. |
| Q-D3 | Founders | OK to hide the percentage for `method: reported`? | Yes (decision 5). |
| Q-D4 | Founders, legal (Q10) | Responsible-use lines on /about (e.g. "Don't drive after using cannabis"). | Drafts; legal review before launch. |
| Q-D5 | Founders | Approve merging the intro card into the camera card (docs/08 changed). | Yes. |
| Q-D6 | Founders | Ship "Request it" (docs/02 Could) in MVP? It only saves locally. | Ship it only if it's cheap in T-014; otherwise omit the line, never show it disabled. |
| Q-D7 | Founders | Hallway-test pass criteria in hallway-test.md. Adjust? | As written. A task to run it is still needed (test-plan gap 12). |
| Roy | Roy | Accent, final class hues, display + UI fonts (self-hostable), hero flood solid vs. gradient, wordmark, voice pass on all copy drafts. | See tokens-proposal.md "Open for Roy". |
| T-010 | Scanner engineer | Code priority when several codes are in view (flows.md §2a) is a proposal. | Confirm or change in T-010. |
| T-009 | Scanner engineer | Verify the "turn the camera on" steps per browser on real devices. | Device pass. |

## Self-review

The review against the docs/08 quality bar and Nielsen's heuristics is in the T-021 task log
(`tasks/active/T-021-design-spec-and-mockups.md`).
