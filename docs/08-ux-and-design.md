# UX Flows & Design Direction

## Screen inventory (MVP)

| Route | Screen |
| --- | --- |
| `/` | Age gate (first visit) → Scanner |
| `/scan` | Scanner (camera viewport, shutter, search button, recents). Auto only: no mode control. |
| `/s/:strainId` | Strain page, reached from Search and from family-tree rows (no Share in the MVP) |
| `/scan/result` | Scan result: a **full-screen answer** in the class color (Save, Scan another), details below the fold (D13) |
| `/search` | Manual search |
| `/journal`, `/journal/:scanId` | Journal list / scan detail |
| `/about` | How classification works · data sources · privacy · responsible use · "We match the name on the package. We can't confirm what's inside." (P14) |
| `/settings` | Theme, haptics, backup / restore journal, erase all data |

## Core flows

Full flows, per-screen specs (layout, every state, copy, accessibility), placeholder tokens with measured
contrast, and clickable mockups: [design/](design/README.md) (T-021). This section is the summary; the design
docs carry the detail.

### First run
1. **Age gate:** "Are you 21 or older?" [I'm 21 or older] / [Leave]. Remembered locally. [Leave] goes to an
   in-app exit screen with no content, and every route shows only that screen **for 24 hours on this device**;
   then the gate asks again (founder decision Q-D1, 2026-10-26; [design/screens/age-gate.md](design/screens/age-gate.md)).
2. **One camera card** (shown once): "Point at a package. We'll show you what's in its family tree." plus "We use
   your camera to read labels. Photos never leave your phone." [Continue] → browser prompt. A "Type a name
   instead" link is the skip. *(T-021 merged the intro card and the priming screen into one card: one less
   tap before the first answer.)*
   - Opening a `/s/:id` URL directly skips the card; it appears the first time the Scan tab opens.
   - Denied → the scanner becomes a "Camera is off" panel with [Search by name] and browser-specific steps to
     turn the camera on. No camera, camera busy, and "this browser can't open the camera" (in-app browsers) get
     the same panel with their own copy ([design/flows.md §5](design/flows.md#5-camera-unavailable-permission-denied-plus-test-plan-gap-1)).

### Scan → result (happy path)
1. Scanner opens straight to a live viewport. There is **no mode control** (cut 2026-10-26): it always looks for
   barcodes and QR codes, and the shutter, the big thumb-zone button, reads label text.
2. A barcode or QR comes into view → the reticle snaps to it (lock-on), with a haptic tick → the result view floods in.
   With a UPC and a QR both in view, the scanner picks one by priority (our deep link, a remembered barcode, a QR with a
   slug, then an unknown UPC) and locks onto that one ([design/flows.md §2a](design/flows.md#2a-several-codes-in-view-test-plan-gap-6-proposal-for-t-010)).
3. Or the user taps the shutter → frame freeze + "Reading label…" shimmer (≤ 1.5 s) → result view. Slower: the
   copy changes at 1.5 s, the shimmer stops at 5 s with [Keep waiting] [Search instead], and at 15 s (or a worker
   crash) "We couldn't read that label." ([design/flows.md §2b](design/flows.md#2b-ocr-slow-or-failing-test-plan-gap-7)).
4. **Result view** (a **full-screen** modal view over the paused scanner, not a sheet; a close button, Escape and
   browser back dismiss it). Simplified after the founder reviews on 2026-10-26 and 2026-10-27 (open-questions
   D1–D15; [design/screens/result-sheet.md](design/screens/result-sheet.md)):
   - **The answer (D13):** the **whole screen floods with the solid class color**: Indica purple, Sativa orange,
     Hybrid green, gray for Unknown lineage. On it: the strain name, the class icon, and **one huge class word**.
     The goal is that people can say the answer within 2 seconds. At least 91% of the first screen is flat class
     color (measured in the mockup). The flood grows from the lock-on point (reduced motion: a crossfade), and
     `theme-color` follows it.
   - **No dominance on the answer (D14):** no "Sativa-dominant" or other sublabel on the answer or in lists. The
     detail line "Leans sativa (sativa-dominant)" appears only inside How we know and on the strain page and journal
     detail.
   - **Labels (D15):** Indica if the rounded estimate is below 50, Hybrid at exactly 50, Sativa above 50. Hybrid is
     rare by design.
   - **Always reachable without scrolling:** a bottom bar on the flood with the footer line, **[Scan another]**
     (primary) and [Save] (secondary). Everything below sits under the fold, reached by "Details ⌄" or a scroll.
   - **No percentage anywhere.** There is no meter, no number, and no "close to the line" badge. The label is the
     answer; `sativa_pct` stays internal.
   - **Basis line** (first thing in the details), e.g. "**Lineage traced:** an estimate from its family tree,
     not a lab test." The terms are "Lineage traced" / "Partly traced" / "**Reported type**" (replaces "Breeder's
     label") / "Landrace". Unknown lineage: "We don't have enough of its family tree to say." Not a chip, not
     tappable.
   - **Effects only:** "Commonly reported" chips from the `effect` facet, then negative-polarity effects as one
     plain line ("Also reported: dry mouth."). No flavors, no terpenes. Zero effect tags → the section is not
     rendered.
   - **"How we know" (collapsed, in the details):** first the lean line (if any), then a summary row with the parents ("Strain A × Strain B"), sources count and any
     disputed count. Inside: the method explanation and "lineage estimate, not a DNA or lab test", the family tree
     with **class pills only** (no numbers), "Lineage disputed" markers (P9), "Origins of Chemdawg are unknown"
     where the tree ends, "Reported type: …" when sources describe it, the package's printed claim as one plain
     line ("Package says Indica."), sources, and a link to /about#classification.
   - **Package facts:** no "From the package" row and no package-says callout (both cut). The label claim appears
     only as the plain line inside How we know, which keeps docs/02's "label claim shown". **Potency (THC/CBD) is
     never shown** (P2). Product form is still stored with the scan and shown in the journal.
   - **Actions:** [Save] (secondary) and **[Scan another]** (primary), in the bottom bar on the flood. Scan
     another closes the view straight to the live scanner, and the code just used is muted until it leaves the
     view, so the same result doesn't reopen. Save becomes "✓ Saved" with an Undo toast and an optional rating
     row. On `/s/:id` the only action is Save. **No Share** anywhere in the MVP.
   - **Footer:** "Effects vary person to person. Start low, go slow." Always visible in the bottom bar.

### Close call
- "Which one?" sheet with up to 3 candidates (name, breeder if any, class pill with the word only) plus
  [None of these → edit text / search]. Picking one confirms it (and teaches local barcode memory if a
  barcode was involved). No scores are shown. When candidates differ only by a number (P5), the number is
  emphasized. An "A x B" label with no curated cross shows the two parents as "Parent, not a match" (P4).

### No match
- "We couldn't find a strain in that label." Show what we read as editable text, then [Search], [Try again],
  and [Save anyway]. ("Request it" is cut from the MVP, Q-D6.)
- **Never** show a classification here. "Save anyway" stores an unidentified scan with the package facts.
- **Unknown barcode** (not in local memory): "We don't know this barcode yet", with [Scan the label] (mutes that
  code and pulses the shutter) and [Search by name]. A tracking UID, COA QR, or Retail ID QR says what it is ("That's a tracking
  code") and offers the same two actions ([design/flows.md §4b](design/flows.md#4b-barcode-and-qr-dead-ends-test-plan-gap-4)).

### Offline
- The app shell and strain data work offline. The first OCR use needs the language data; if it isn't cached
  yet, say "Text reading needs a one-time download. Barcodes and search work offline."
- No permanent offline banner: we speak up only when something can't work. Online but the download fails: "Text
  reading didn't download. Check your connection and try again. Barcodes and search still work."

### Storage
- Save on a full device: "Your phone is out of space for saved scans." with [Open Journal] [Back up]. IndexedDB
  unavailable (private browsing): "Saving isn't available in this browser mode, like private browsing." The
  journal says the same. If `storage.persist()` is refused, Settings notes that the browser may clear saved scans
  ([design/flows.md §7](design/flows.md#7-save-journal-and-storage-test-plan-gap-8)).

## Component rules

- **TagList** takes `tags: Term[]` and renders 0..n chips. The result passes the `effect` facet only. Wraps to
  new lines; collapses past 8 with "+N more". Negative-polarity effects render as one plain "Also reported" line.
  There is **no** prop for a minimum count and no placeholder chip. Zero tags returns `null`. Tag chips are
  display-only (not tappable); the hedged descriptions live on /about#tags.
- **ResultView** (scan result) floods the whole viewport with the class color and shows the name, icon and answer
  word; **ClassHero** (strain page, journal) is the rounded block version. Neither shows a sublabel (D14).
  `sativa_pct` null renders gray "Unknown lineage", never a 50/50 or any value.
- **LeanLine** maps the detail `sublabel` to "Leans indica (indica-dominant)" / "An even mix (balanced)" / "Leans
  sativa (sativa-dominant)", for traced and partial lineages only. Detail views only.
- **ClassPill** (lists, tree, Which one?) shows the class word only.
- **BasisLine** maps `method` (and landrace `kind`) to one line of copy. It never renders a number. (The
  ClassificationMeter and ConfidenceChip were removed on 2026-10-26.)
- **Sheet** (every bottom sheet): a visible close button, a grabber that is a ≥ 48 px button cycling the
  heights, Escape and browser back close it. Modal, focus trapped and returned (SC 2.5.7, 2.4.11).
- The result view and the strain page share the details (basis line, effects, How we know). The package claim
  and the Scan another action are scan-only.
- Every numeric or tag value on screen traces back to the data or the scan. Reviewers check this.
- **Strain names render as plain text** (P12). No candy imagery, playful fonts, emoji or color treatment keyed
  to names like "Zkittlez" or "Candyland".

## Quality bar: what "modern and professional" means here

The goal (founders, 2026-10-26): competitive with the best modern consumer apps. **Clean, simple, easy to
read, organized**, following published platform standards, and **fun and catchy** enough that people
*want* to use it. Concretely:

**Principle: calm by default, playful in moments.** The everyday UI is quiet, clear, and consistent.
Personality is concentrated in a few signature moments (lock-on, result reveal, save, scan another). Fun never costs clarity or speed.

### Standards we follow
| Area | Standard | Our rule |
| --- | --- | --- |
| Platform patterns | Apple Human Interface Guidelines (iOS) + Material Design 3 (Android) | Use patterns people already know: bottom tab bar (3 tabs max: Scan, Journal, Settings; always visible, labels on every tab), bottom sheets, swipe-down to dismiss, system back/browser back always works. No novel navigation. Search is a scanner button, not a tab (it's the fallback for scanning). Follow the iOS 26 / M3 Expressive *patterns* (floating bottom bar, springy motion), not their native materials, which a PWA can't use. |
| Accessibility | WCAG 2.2 AA | Text contrast ≥ 4.5:1; large text (≥ 24 px regular or ≥ 18.7 px bold) and UI parts ≥ 3:1 (1.4.3, 1.4.11). Never color alone (1.4.1). Works at 200% text zoom (1.4.4), reflows at 320 px with no sideways scroll (1.4.10), survives user text spacing (1.4.12). No orientation lock (1.3.4: no manifest `orientation`). Every drag has a single-tap alternative: sheets have a close button and a tappable grabber (2.5.7). Focused items are never hidden behind sticky bars or sheets (2.4.11). Status changes ("Reading label…", results, "Saved") are announced without moving focus (4.1.3). Full screen-reader labels. |
| Motion | Apple HIG Reduce Motion + WCAG 2.3.3 (**AAA**, we meet it anyway) | `prefers-reduced-motion`: crossfades instead of springs, no z-axis or scale effects. Nothing loops longer than 5 s (2.2.2, AA). |
| Touch targets | HIG 44 pt · Material 48 dp · WCAG 2.5.8 (AA, 24 px) and 2.5.5 (AAA, 44 px) | **48 px minimum** for everything tappable (meets Material, exceeds HIG and both WCAG levels), with **≥ 12 px between adjacent targets** (Apple's ~12 pt padding; also covers Google's 8 dp). Shutter ≥ 72 px (a product choice; no standard sets it). One exception: the 5-star rating row is a single control whose stars abut, the platform convention. |
| Web performance | Core Web Vitals "good", at the 75th percentile, mobile | LCP ≤ 2.5 s (our budget is stricter: 2.0 s), INP ≤ 200 ms, CLS ≤ 0.1. Every tap shows visual feedback within 100 ms. |
| PWA | web.dev install criteria + WebKit (iOS 26) | **Install criteria:** HTTPS, manifest with `name`/`short_name`, 192 and 512 px icons, `start_url`, `display: standalone`; a service worker with a `fetch` handler (Chrome's install prompt needs it, and so does the offline shell). **Recommended, not criteria:** a separate maskable icon, screenshots, a description, `background_color` matching the first paint (Android splash). `viewport-fit=cover` so `env(safe-area-inset-*)` works. iOS 26 opens any Home Screen site as a web app but has no install prompt, so show a one-time "Add to Home Screen" tip there. Lighthouse no longer scores PWAs; check installability in DevTools. |
| Usability | Nielsen's 10 usability heuristics | Used as the design-review checklist (system status, plain language, undo, consistency, error prevention…). |

### Visual system rules
- **Type:** at most 2 typefaces. Body ≥ 16 px (also stops iOS from zooming into inputs; we use 17 px, the iOS
  default), line height 1.4–1.6, a type scale of about 5 steps. Tabular figures for counts and times. Fonts are
  self-hosted (a font CDN would send the user's IP to a third party).
- **Spacing:** a 4/8 px grid. Generous whitespace. One column on phones.
- **Hierarchy:** one primary action per screen. The most important thing is the biggest thing.
  Progressive disclosure: details ("How we know", sources) are one tap away, not on top.
- **Color:** a small palette: neutrals plus 1–2 brand accents plus the 3 classification colors. Dark and
  light themes are both first-class.
- **Iconography:** one icon set (Lucide), one stroke weight, always paired with a label on primary actions.
- **Copy:** plain language, sentence case, buttons are verbs ("Scan", "Save", "Search"). Error messages say
  what happened and what to do next.
- **States:** every screen has designed loading (skeletons, never spinners for < 1 s), empty, error,
  offline, and permission-denied states before it's considered done.

### Benchmarks to study (for patterns, never copying)
Instant-answer "point at it" apps solve the same problem in other categories: **Vivino** (wine-label
scanning → result), **Yuka** (barcode → score), **Shazam** (one button → instant answer), **Google Lens**
(camera-first UI). T-020 studied what makes them feel fast and trustworthy, and reviewed cannabis apps for what
to avoid: [research/2026-10-26-benchmark-apps.md](research/2026-10-26-benchmark-apps.md) (top 10 patterns, top
5 anti-patterns) and [research/2026-10-26-design-standards.md](research/2026-10-26-design-standards.md).

### How we check it
- A design review against this section plus the Nielsen heuristics, before any screen task is done.
- Hallway tests: 5 people try the 3 core flows (scan → result, close call, no match). We measure task
  success and time. Anything 2+ people stumble on gets fixed before launch. Script, pass criteria and results
  template: [design/hallway-test.md](design/hallway-test.md). It also checks that people understand the basis-line
  terms ("Lineage traced", "Reported type") and can get from a result to the next scan with Scan another.

## Design direction

The target is **bold, vibrant, high-contrast**, on a dark base:

- **The camera UI is dark by necessity** (a viewport plus overlays). Use near-black surfaces and vivid,
  saturated accents for controls. That's where "punchy" lives.
- **The result is the color moment, and it takes the whole screen.** "I want the whole screen to light up indica
  sativa or hybrid colors so the answer is immediately evident" (founder, 2026-10-27). Solid color, no gradient,
  no meter, one huge word.
- FlowerScan is a **separate brand** (open-questions Q1). Cannapickforme's tokens don't apply. Roy owns the
  final identity ([13-creative-brief.md](13-creative-brief.md)). Until it lands, build with swappable tokens
  in `apps/web/src/styles/tokens.css`, so the rebrand is a token change, not a refactor.

### Classification colors (draft)

Use the convention people already know, made colorblind-safe by always pairing color with a word and an icon.

| Class | Hue direction | Icon idea | Text always shown |
| --- | --- | --- | --- |
| Indica | bright violet | moon | "Indica" |
| Hybrid | vivid green | half-circle / leaf | "Hybrid" (only for an exactly balanced lineage, D15) |
| Sativa | bright orange | sun | "Sativa" |
| Unknown | neutral gray | question mark | "Unknown lineage" |

All three hues must read as bright and clearly distinct, including under red-green colorblindness (measured in
the tokens proposal). Contrast: we hold all text to ≥ 4.5:1, even large display text (AA
allows 3:1), so a token swap can't silently fail. Text on a class color is always full-strength ink, never
translucent. Placeholder hexes and the measured pairs: [design/tokens-proposal.md](design/tokens-proposal.md#contrast-table-measured).
The brand accent must not be one of the class hues (the placeholder is cyan).

### Typography
A heavy, condensed display face for strain names and the classification word (they need to read at arm's
length), plus a clean sans for UI. Placeholders (T-021 proposal): Archivo at 75% width for display, Inter for UI.
Roy's identity work replaces them. Tokens, type scale, spacing, radii, motion and the measured contrast table:
[design/tokens-proposal.md](design/tokens-proposal.md).

### Micro-interactions (the "snappy" part)
- **Lock-on:** reticle corners spring to the detected code's bounding box (≈ 180 ms), then a pulse.
- **Shutter:** press scales to 0.92 with a spring, the frame freezes with a quick white flash at 8% opacity.
- **Reading:** a shimmer sweeps across the reticle while OCR runs. No spinners. It stops after 5 s (SC 2.2.2).
- **Result flood:** a class-color circle grows from the lock-on point (or the shutter) to fill the screen (340 ms,
  `transform` only), then the name, icon and word fade in and the word rises 8 px. Reduced motion: a 150 ms crossfade.
- **Scan another:** the result view closes, the frame unfreezes, and the reticle corners take one quick "ready" breath.
- **Save:** the button morphs to "✓ Saved" with a small pop, and the optional rating row appears.
- **Haptics:** a 10 ms tick on lock-on, a double-tick on save (Android Chromium only, after the user's first tap;
  silently skipped elsewhere).
- Animate only `transform` and `opacity`. Respect `prefers-reduced-motion` (crossfades instead of springs).

### Ergonomics
- One-thumb: primary actions sit in the bottom 40% of the screen. Shutter ≥ 72 px, other targets ≥ 48 px.
- Usable at arm's length in a dim dispensary: large type, torch button, high contrast.
- Supports dynamic type / zoom up to 200% without breaking the result view (the answer word is sized by width, so it
  can't overflow).

## Copy voice

Short, warm, confident, a little playful, and never clinical or medical. All effect language is hedged
("often described as…"). Full rules: [09-compliance-and-privacy.md](09-compliance-and-privacy.md).
Roy defines the brand voice in [13-creative-brief.md](13-creative-brief.md). Compliance rules override it.
