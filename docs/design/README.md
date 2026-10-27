# FlowerScan design (T-021)

Status: **revised after two founder reviews** (2026-10-26, "simplify the UI, cut a lot of what we don't need";
2026-10-27, "I want the whole screen to light up … so the answer is immediately evident", D13–D15 in
docs/open-questions.md); back in review. Tokens are placeholders until Roy's identity lands (Q11).
docs/08 is the summary and the rules; this folder is the detail engineers build from.

| File | What it is | Main consumers |
| --- | --- | --- |
| [flows.md](flows.md) | Navigation map and flow diagrams: first run, scan → result, several codes in view, slow OCR, close call, no match, barcode dead ends, camera unavailable, offline, storage, restore and erase | everyone |
| [screens/_shared-components.md](screens/_shared-components.md) | Tab bar, buttons, sheet, toast, dialog, pills, class hero, basis line, tag list, live region, focus, skeletons, large text, orientation | T-004 |
| [screens/age-gate.md](screens/age-gate.md) | Age gate and exit screen | T-017 |
| [screens/scanner.md](screens/scanner.md) | Camera card, scanner and every camera / OCR state | T-009, T-010, T-011 |
| [screens/result-sheet.md](screens/result-sheet.md) | Full-screen result view (flood, answer word, Save + Scan another, details below the fold), strain page, journal detail, unknown id | T-013 |
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
text. A result floods the whole screen with its class color; **Details** (or a scroll) shows the rest, and **Scan
another** goes straight back to the live scanner. "Result (full screen)" in the Prototype menu has one of each:
Sativa, Hybrid (the only exactly balanced sample), Indica and Unknown lineage. Everything in it is **fictional
sample data** (names like "Kestrel Haze", "Strain A", "Landrace K"); the labels follow the docs/05 algorithm so
they're internally consistent, but no strain facts are real. The [Leave] block is simulated: use the Prototype
menu to jump past it.

## Design decisions (and why)

1. **One camera card instead of intro + priming.** One tap fewer before the first answer (benchmark pattern 1).
   Founders approved (Q-D5).
2. **The scan result is a full-screen modal view, not a sheet** (D13). A sheet always leaves the frozen camera
   showing; the founder wants the whole screen to light up. It keeps the modal benefits (focus trap, close button,
   back closes it). Sheets remain for "Which one?", no match, codes and errors.
3. **Three tabs; Search is a scanner button.** Search is the fallback for scanning, and a fourth tab would split
   the "point at it" story. HIG's new search-tab pattern was considered.
4. **The answer floods the screen:** solid class color edge to edge, the strain name, the class icon and one huge
   word (Indica / Sativa / Hybrid). At least 91% of the first screen is flat class color (measured). Save and Scan
   another sit in a bar on the flood; everything else is below the fold or behind "Details".
   - **No dominance on the answer or in lists** (D14). "Leans sativa (sativa-dominant)" appears only inside How
   we know and on the strain page and journal detail. Lists (search, journal, Which one?, tree, Recent) show the class
   word only.
   - **Hybrid only at exactly 50** (D15). The mockup's fictional data follows the new bands; Teal Finch is the
   Hybrid sample.
5. **No percentage anywhere** on results, strain pages, journal or family tree. The label is what we show; the
   number stays internal (it decides the label). This removes the "meter read as potency" risk and makes Q-D3 moot.
6. **One basis line instead of chips and info buttons:** "Lineage traced / Partly traced / Reported type: …, not a
   lab test." The longer explanation sits in How we know.
7. **Effects only, negatives as one "Also reported" line.** Flavors and terpenes aren't shown in the MVP. Showing
   reported downsides keeps the list honest (docs/04) without equal weight.
8. **Scan another is the primary action on a scan result; Save is secondary.** In a store the common next step is
   the next package, and most results won't be saved. Save keeps its moment (✓ Saved, rating row, Undo).
9. **Auto only, with a same-code cooldown.** No mode control. A code that just produced a sheet is ignored until
   it's been out of view for 1.5 s, so Scan another and "Scan the label" don't loop back to the same sheet.
10. **The package's printed type is one plain line in How we know** ("Package says Indica."). No callout.
11. **No Share, no Request it.** Strain pages still exist, reached from Search and the family tree.
12. **Tags are display-only chips**, so the result stays calm; descriptions live on /about#tags.
13. **No permanent offline banner.** Almost everything works offline; we speak up only when something can't.
14. **Cyan placeholder accent**, because violet, green and orange belong to the classifications.
15. **All text ≥ 4.5:1, even large text**, and no translucent text on class colors, so Roy's swap can't silently
    break contrast.
16. **Scanner always dark**, whatever the theme. It sits on a camera feed.

## Open questions

| # | For | Question | Proposal |
| --- | --- | --- | --- |
| Q-D1 | Founders, legal (Q10) | Is "Leave → exit screen for this browser session" enough, or should it block longer? | **Decided 2026-10-26:** Leave blocks the app for **24 hours on this device**, then the gate shows again. Legal still reviews the copy (Q10). |
| Q-D2 | Founders | "Breeder's label" or "Reported type" for `method: reported`? | **Decided 2026-10-26: "Reported type"**, everywhere. |
| Q-D3 | Founders | OK to hide the percentage for `method: reported`? | **Moot (2026-10-26):** no percentage is shown for any result. |
| Q-D4 | Founders, legal (Q10) | Responsible-use lines on /about (e.g. "Don't drive after using cannabis"). | Open. Drafts; legal review before launch. |
| Q-D5 | Founders | Approve merging the intro card into the camera card (docs/08 changed). | **Decided 2026-10-26:** keep it merged. |
| Q-D6 | Founders | Ship "Request it" (docs/02 Could) in MVP? | **Decided 2026-10-26:** cut entirely from the MVP (no-match sheet and search empty state). |
| Q-D7 | Founders | Hallway-test pass criteria in hallway-test.md. Adjust? | **Decided 2026-10-26:** criteria stay as written; tasks updated to the simplified screens (meter and callout checks dropped, Scan another check added). A task to run it is still needed (test-plan gap 12). |
| Q-D8 | Founders | The extra cuts listed in the T-021 Log (2026-10-26 revision): veto any? | Proposal: keep them all cut. |
| Q-D9 | Founders | D15 makes Hybrid rare, but many packages print "Hybrid". Most "Hybrid" packages will now show Sativa or Indica, with only a plain "Package says Hybrid." line in the details (the callout is cut, D4). Accept that, or show one plain line on the answer screen when the package says something else? | Accept for now and measure it in the hallway test (question 6). If 2+ people are confused, add one ink line under the word ("Package says Hybrid"). |
| Q-D10 | Founders | 2026-10-27 extra cuts and changes (T-021 Log): the basis line moves below the fold, effect tags leave the first screen, and lists drop dominance. Veto any? | Keep. |
| Roy | Roy | Accent, final class hues (brightened placeholders, solid flood decided by the founders), display + UI fonts (self-hostable), wordmark, voice pass on all copy drafts. | See tokens-proposal.md "Open for Roy". |
| T-010 | Scanner engineer | Code priority when several codes are in view (flows.md §2a) is a proposal. | Confirm or change in T-010. |
| T-009 | Scanner engineer | Verify the "turn the camera on" steps per browser on real devices. | Device pass. |

## Self-review

The review against the docs/08 quality bar and Nielsen's heuristics is in the T-021 task log
(`tasks/active/T-021-design-spec-and-mockups.md`).
