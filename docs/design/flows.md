# Flows

Owner: product-designer (T-021) · Date: 2026-10-26 · Status: draft for founder review

These flows are what T-009, T-010, T-011, T-013, T-014, T-015 and T-017 build. Screen-level detail (layout,
every state, copy, accessibility) is in [screens/](screens/). The clickable version is
[mockups/index.html](mockups/index.html). Diagrams are Mermaid (GitHub and Obsidian render them).

**Words used below:** a *sheet* is a modal bottom sheet over the frozen scanner. A *screen* is a full route.
Every sheet has a close button and a tappable grabber, and browser back closes it (each sheet pushes one
history entry).

## Navigation map

```mermaid
flowchart LR
  gate["/ Age gate"] --> prime["Camera card (first run)"] --> scan
  subgraph Tabs["Bottom tab bar (3 tabs)"]
    scan["/scan Scanner"]
    journal["/journal Journal"]
    settings["/settings Settings"]
  end
  scan -- "Search button" --> search["/search"]
  scan -- "lock-on / shutter" --> sheet["Result sheet (/scan/result)"]
  scan --> which["'Which one?' sheet"]
  scan --> nomatch["No-match sheet"]
  search --> strain["/s/:id Strain result"]
  journal --> detail["/journal/:scanId"]
  settings --> about["/about"]
  sheet -- "How classification works" --> about
  strain -- "same component as the sheet" --- sheet
```

- **Three tabs, labels always on** (docs/08, HIG, M3). Search is a button on the scanner, not a tab: it's a
  fallback for scanning, docs/02 requires it one tap from the scanner, and a fourth tab would split the
  "point at it" story. (HIG's new dedicated search tab was considered and rejected for that reason.)
- **About** is reached from Settings (always in the same place, SC 3.2.6) and from every result's "How we know".
- The tab bar stays visible on every top-level route. Sheets cover it while open (HIG: a modal may cover it).

## 1. First run

```mermaid
flowchart TD
  A([Opens any URL: /, /scan, /s/:id, /journal…]) --> B{age_confirmed_at saved?}
  B -- yes --> R([Original route])
  B -- no --> G["Age gate: Are you 21 or older?"]
  G -- "I'm 21 or older" --> S[Save age_confirmed_at] --> D{Was it a deep link?}
  D -- "yes (/s/:id, /journal…)" --> R
  D -- "no (/ or /scan)" --> P{Camera permission state}
  G -- Leave --> L["Exit screen: FlowerScan is for adults 21+.<br/>No content. Gate stays for this session."]
  P -- granted --> LIVE([Scanner, live])
  P -- "prompt / unknown" --> C["Camera card: Point at a package…<br/>Photos never leave your phone.<br/>[Continue] · Type a name instead"]
  P -- denied --> DEN([Camera-off state, see §5])
  C -- Continue --> BP[Browser camera prompt] -- Allow --> LIVE
  BP -- Block --> DEN
  C -- "Type a name instead" --> SR([/search])
```

Decisions (docs/08 updated):
- **The intro card and the camera pre-prompt are one card.** docs/08 had three first-run steps (gate, intro,
  priming). Merging intro and priming removes a tap before the first answer, the thing the best apps optimize
  (benchmark pattern 1). The card is "skippable" through "Type a name instead".
- **Show the card once.** It's marked seen when either button is tapped (`intro_seen`, stored with settings).
  After that, if the browser forgets the permission (iOS standalone PWAs can re-ask, test-plan gap 14), the
  scanner shows a "Start camera" button instead of the card, so the browser prompt still follows a tap.
- **One primary button, "Continue", not "Allow"** (HIG Privacy). We add a secondary text link to a non-camera
  path because web.dev's permission guidance asks for one. This breaks HIG's "no escape" rule for native
  pre-alerts on purpose: a PWA user who doesn't want the camera should still get value.
- **Deep links skip the camera card.** Someone opening a shared `/s/:id` link wants that strain, not a camera.
  They meet the card the first time they open the Scan tab.
- **[Leave]** goes to an in-app exit screen with no content (not an external site, which would be a
  cross-origin navigation we don't need). For the rest of the browser session the app shows only that screen
  (`sessionStorage`); a new session asks again. Founder/legal check: Q-D1 in the screen spec.

## 2. Scan → result (happy paths)

```mermaid
flowchart TD
  LIVE([Scanner live, mode Auto]) --> X{What happens?}
  X -- "Code in view (Auto, Barcode, QR)" --> ST{Stable in 2 of 3 frames?}
  ST -- no --> LIVE
  ST -- yes --> PICK["Pick one code (priority below)"] --> LOCK["Lock-on: corners snap to the code (180 ms),<br/>haptic tick, live region: Barcode found"]
  LOCK --> K{Code kind}
  K -- "Our deep link QR" --> RES
  K -- "Barcode in local memory" --> RES
  K -- "Other URL QR with a slug" --> MATCH
  K -- "Unknown UPC/EAN, other Code 128" --> UB([Unknown-barcode sheet, §4b])
  K -- "Tracking UID / COA / Retail ID QR" --> TC([Not-a-strain-code sheet, §4b])
  X -- "Shutter tap (Auto, Text)" --> FR["Frame freezes, 8% white flash.<br/>Shimmer over reticle: Reading label…"]
  FR --> OCR{OCR}
  OCR -- "text in ≤ 1.5 s" --> MATCH[Match + decide]
  OCR -- "slow / fails" --> SLOW([§2b])
  MATCH -- "auto-accept" --> RES["Result sheet rises (spring), meter fills (400 ms),<br/>tags stagger in. Live region announces the result."]
  MATCH -- "close call" --> WH([Which one? §3])
  MATCH -- "no match" --> NM([No match §4])
  RES --> ACT{User}
  ACT -- Save --> SV["Button becomes Saved ✓ (double haptic), toast: Saved to Journal · Undo.<br/>Optional rating row appears."]
  ACT -- "Share link" --> SH[Web Share sheet, or Link copied toast]
  ACT -- "Close / swipe down / back" --> LIVE
```

### 2a. Several codes in view (test-plan gap 6, proposal for T-010)

Packages often carry a UPC and a QR side by side. In **Auto**, the detector collects every value that passes the
stability gate within the same 3-frame window and picks **one**, in this order:

1. Our own deep-link QR (definitive).
2. A barcode already in local barcode memory (the user confirmed it before).
3. A QR whose URL yields slug candidates.
4. An unknown UPC/EAN (leads to the unknown-barcode sheet, which offers the text scan).
5. Everything else (COA or tracking QRs, unrecognized Code 128).

The reticle locks to the winner only, so the user sees which code was used. No chooser: asking "which code?"
would be a question the user can't answer. In **Barcode** or **QR** mode, only that kind is considered.

### 2b. OCR slow or failing (test-plan gap 7)

| Time since shutter / event | What the user sees | Live region |
| --- | --- | --- |
| 0–1.5 s | Frozen frame, shimmer over the reticle, "Reading label…" | "Reading label" |
| 1.5–5 s | Same, copy changes to "Still reading. Hold on…" | — |
| 5 s | Shimmer stops (SC 2.2.2). Pill: "This is taking longer than usual." with [Keep waiting] [Search instead] | "Taking longer than usual" |
| 15 s, or the worker crashes | Error sheet: "We couldn't read that label." [Try again] (primary) [Search by name]. Tip: "Fill the frame with the strain name, and try the torch." | "Couldn't read the label" |
| First OCR use, online, data not cached | Determinate progress pill: "Getting text reading ready (one-time, 4 MB)…" then continues normally. Barcodes keep working meanwhile. | "Downloading text reading, one time" |
| Same, download fails online | "Text reading didn't download. Check your connection and try again. Barcodes and search still work." [Try again] [Search] | same text |
| Same, offline | "Text reading needs a one-time download. Barcodes and search work offline." [Search] [OK] (docs/08 copy) | same text |

The size in the download pill comes from the real asset size at build time. "4 MB" in the mockup is a sample.

## 3. Close call: "Which one?"

```mermaid
flowchart TD
  M["Decide: top ≥ 0.60 but not auto-accept<br/>(close scores, number missing, A x B label, generic token)"] --> W["Which one? sheet<br/>We read 'STRAIN A'. Pick the one on your package."]
  W --> C1["Candidate row (≤ 3): name, breeder if any, mini class pill"]
  C1 -- tap --> CONF{Was a barcode involved?}
  CONF -- yes --> MEM["Remember barcode → strain (if learnable, P13)"] --> RES([Result sheet])
  CONF -- no --> RES
  W -- "None of these" --> NM([No-match sheet, prefilled with what we read])
  W -- "Close / back" --> LIVE([Scanner])
```

- The sheet **replaces its own content** with the result after a pick (one sheet at a time, HIG), and back
  returns to the list.
- Numbers are identity (P5): when candidates differ only by a number, the number is set in the display face so
  it stands out ("Strain A **#4**", "Strain A **#5**").
- An "A x B" label (P4) shows the curated cross only if it exists. Otherwise the sheet title becomes "That looks
  like a cross of two strains" and the two parents appear with the line "Parents, not a match". Picking one goes
  to that parent's **strain page** (`/s/:id`), never to a scan result, and nothing is remembered.

## 4. No match

```mermaid
flowchart TD
  D["Decide: top < 0.60"] --> N["No-match sheet: We couldn't find a strain in that label."]
  N --> E["What we read (editable, prefilled with the best line)"]
  E -- "Edit + Search" --> S([/search?q=…])
  N -- "Try again" --> LIVE([Scanner, Text mode for one shot])
  N -- "We don't have this strain yet → Request it" --> RQ["Saved on this phone (Could). Toast: Request noted"]
  N -- "Save anyway" --> UN["Unidentified scan saved with product form and what we read.<br/>No classification anywhere."]
```

Never show a classification, meter, tag, or "close" strain here. The editable text is the *only* thing derived
from the package.

### 4b. Barcode and QR dead ends (test-plan gap 4)

| Code | Sheet title | Body | Actions |
| --- | --- | --- | --- |
| Unknown UPC/EAN, or a Code 128 not seen before | "We don't know this barcode yet" | "Cannabis barcodes aren't in any public list, so we learn them on your phone. Scan the strain name once and we'll remember it next time." | **[Scan the label]** (Text mode, shutter pulses) · [Search by name] |
| Tracking UID (e.g. a 24-character package tag) | "That's a tracking code" | "It's unique to this one package, so it can't tell us the strain. Scan the strain name instead." | **[Scan the label]** · [Search by name] |
| COA or Retail-ID QR | "That QR is for lab results" (COA) / "That QR is a tracking code" (Retail ID) | "It doesn't name the strain. Scan the strain name instead." Shows the link's domain in plain text. | **[Scan the label]** · [Search by name] · "Open link" (opens the domain shown, in a new tab, only on tap) |

After the user picks a strain from a learnable barcode's follow-up (scan or search), the result sheet shows the
one-line note "We'll recognize this barcode next time (on this phone)."

## 5. Camera unavailable (permission denied, plus test-plan gap 1)

```mermaid
flowchart TD
  T["getUserMedia / Permissions API result"] --> K{Cause}
  K -- "NotAllowedError or permissions.query = denied" --> DEN["Camera is off for FlowerScan<br/>How to turn it on: steps for this browser"]
  K -- "NotFoundError" --> NF["We can't find a camera on this device"]
  K -- "NotReadableError / AbortError" --> BUSY["Your camera is busy<br/>Close other apps using it, then try again"]
  K -- "API missing (in-app browser, old browser) or insecure context" --> UNS["This browser can't open the camera<br/>Open FlowerScan in Safari or Chrome"]
  DEN & NF & BUSY & UNS --> SRCH["Primary action everywhere: [Search by name] → /search"]
  DEN --> RT["[Try again] re-checks permission state; never re-prompts on its own"]
  BUSY --> RT2["[Try again] calls getUserMedia again"]
  UNS --> CP["[Copy link] so it can be pasted into a real browser"]
```

- All four states share one layout (the scanner area becomes a calm panel; tab bar and Search stay) and one
  primary action, **Search by name**, so a failed camera never strands anyone.
- The "turn it on" steps are browser-specific, picked by user agent, with a generic fallback (exact copy in
  [screens/scanner.md](screens/scanner.md)).
- We never call `getUserMedia` again by ourselves after a denial (web.dev). [Try again] reads
  `permissions.query` first. If it's still `denied`, it says "Still off. Change the setting, then come back."

## 6. Offline

```mermaid
flowchart TD
  O([Device offline]) --> W{What does the user try?}
  W -- "Open app (after one online visit)" --> OK1[Shell + strain data load from cache. No banner.]
  W -- "Barcode / QR scan" --> OK2[Works. Deep-link QR and remembered barcodes resolve offline.]
  W -- "Shutter, OCR cached" --> OK3[Works.]
  W -- "Shutter, OCR not cached" --> MSG["Text reading needs a one-time download.<br/>Barcodes and search work offline."]
  W -- "Search / Journal / Settings" --> OK4[Work.]
  W -- "Share link" --> SH["Web Share still opens (the link is just a URL). Copy fallback works."]
  W -- "Open link on a COA QR" --> NET["Toast: You're offline. Try the link later."]
  W -- "First-ever visit while offline" --> NONE[Browser's own offline page. Nothing we can do.]
```

- **No permanent offline banner.** Everything except OCR's first download and external links works offline, so a
  banner would warn about nothing (Nielsen: visibility of status, without noise). We speak up only at the
  moment something can't work.
- An app update downloaded while scanning waits. The toast "A new version is ready. [Reload]" appears only on
  the scanner's idle state or another tab, never mid-scan (X-09).

## 7. Save, journal, and storage (test-plan gap 8)

```mermaid
flowchart TD
  SAVE[Tap Save] --> DB{IndexedDB write}
  DB -- ok --> T1["Saved ✓ · toast: Saved to Journal [Undo] (6 s)"]
  DB -- "QuotaExceededError" --> Q["Sheet: Your phone is out of space for saved scans.<br/>Back up your journal and delete old scans, or free up space.<br/>[Open Journal] [Back up]"]
  DB -- "IndexedDB unavailable (private mode, blocked)" --> P["Toast: Saving isn't available in this browser mode, like private browsing. You can still share the link. [Share]"]
  T1 --> FIRST{First save ever?}
  FIRST -- yes --> PERS["Call storage.persist(). If refused, Settings shows: Your browser may clear saved scans when space runs low. Back up to keep them."]
```

- Rating and notes save automatically on change (no Save button on the detail screen). The status line reads
  "Saved" after each write, announced politely.
- Delete is on the detail screen only, with an Undo toast (no swipe-to-delete, so there's no drag-only action,
  SC 2.5.7).

## 8. Restore and erase

```mermaid
flowchart TD
  RS[Settings → Restore from backup] --> FP[File picker] --> V{Valid flowerscan-backup?}
  V -- no --> BAD["That file isn't a FlowerScan backup. Nothing changed."]
  V -- yes --> SUM["Restored 38 scans. 2 already here (kept the newer one). 1 couldn't be read.<br/>[View journal]"]
  ER[Settings → Erase all data] --> CF["Dialog: Erase everything on this phone?<br/>Your journal, remembered barcodes and settings will be deleted. This can't be undone.<br/>[Cancel] [Erase everything]"]
  CF -- erase --> GATE([Age gate, fresh start])
```

Counts in the restore summary come from the real merge result. The numbers above are examples.
