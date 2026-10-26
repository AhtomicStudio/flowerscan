# UX Flows & Design Direction

## Screen inventory (MVP)

| Route | Screen |
| --- | --- |
| `/` | Age gate (first visit) → Scanner |
| `/scan` | Scanner (camera viewport, mode control, shutter, search button, recents) |
| `/s/:strainId` | Strain result (also the shareable deep link) |
| `/scan/result` | Scan result (strain result plus package facts, Save) |
| `/search` | Manual search |
| `/journal`, `/journal/:scanId` | Journal list / scan detail |
| `/about` | How classification works · data sources · privacy · responsible use · "We match the name on the package. We can't confirm what's inside." (P14) |
| `/settings` | Theme, haptics, default mode, backup / restore journal, erase all data |

## Core flows

Full flows, per-screen specs (layout, every state, copy, accessibility), placeholder tokens with measured
contrast, and clickable mockups: [design/](design/README.md) (T-021). This section is the summary; the design
docs carry the detail.

### First run
1. **Age gate:** "Are you 21 or older?" [I'm 21 or older] / [Leave]. Remembered locally. [Leave] goes to an
   in-app exit screen with no content for the rest of the browser session ([design/screens/age-gate.md](design/screens/age-gate.md)).
2. **One camera card** (shown once): "Point at a package. We'll show you what's in its family tree." plus "We use
   your camera to read labels. Photos never leave your phone." [Continue] → browser prompt. A "Type a name
   instead" link is the skip. *(T-021 merged the intro card and the priming screen into one card: one less
   tap before the first answer.)*
   - Deep links (`/s/:id`) skip the card; it appears the first time the Scan tab opens.
   - Denied → the scanner becomes a "Camera is off" panel with [Search by name] and browser-specific steps to
     turn the camera on. No camera, camera busy, and "this browser can't open the camera" (in-app browsers) get
     the same panel with their own copy ([design/flows.md §5](design/flows.md#5-camera-unavailable-permission-denied-plus-test-plan-gap-1)).

### Scan → result (happy path)
1. Scanner opens straight to a live viewport. Mode **Auto**. The shutter is the big thumb-zone button.
2. A barcode or QR comes into view → the reticle snaps to it (lock-on), with a haptic tick → result sheet springs up.
   With a UPC and a QR both in view, Auto picks one by priority (our deep link, a remembered barcode, a QR with a
   slug, then an unknown UPC) and locks onto that one ([design/flows.md §2a](design/flows.md#2a-several-codes-in-view-test-plan-gap-6-proposal-for-t-010)).
3. Or the user taps the shutter → frame freeze + "Reading label…" shimmer (≤ 1.5 s) → result sheet. Slower: the
   copy changes at 1.5 s, the shimmer stops at 5 s with [Keep waiting] [Search instead], and at 15 s (or a worker
   crash) "We couldn't read that label." ([design/flows.md §2b](design/flows.md#2b-ocr-slow-or-failing-test-plan-gap-7)).
4. **Result sheet** (modal bottom sheet; opens at medium height, the grabber button or a drag takes it to full
   screen; a close button, swipe down, Escape, and browser back all dismiss it):
   - **Hero:** strain name, big classification label (and the hybrid sublabel), the parents in one line when
     known ("Strain A × Strain B"), then the sativa↔indica meter with the percentage, and the line
     "Lineage estimate, not a lab test." When the value is within ±2 of a band edge (edges at 20.5, 40.5, 59.5,
     79.5, so 19–22, 39–42, 58–61, 78–81), add "Close to the line" (P8).
     For `method: reported` the meter shades the reported band and shows **no number** ("Based on how it's
     described, not its family tree."), because the 85/70/50/30/15 values are a convention, not a measurement.
   - **Confidence chip:** "Lineage traced" / "Partly traced" / "Breeder's label". Unknown lineage gets no chip: the
     hero already says "Unknown lineage". Landrace pages say "Landrace". Tapping explains in one sentence, worded
     by method and `confidence_level` ([design/screens/result-sheet.md](design/screens/result-sheet.md)).
   - **Package-says callout** (P8): **only when the directions are opposite**, i.e. the package is on one side
     (Indica) and the lineage leans the other way (Sativa or Sativa-dominant), or the reverse. "Indica" vs.
     "Hybrid · Indica-dominant" agrees, so no callout. A package saying "Hybrid" never triggers it.
     Copy: "Package says **Indica**. The family tree leans **Sativa-dominant**."
   - **Package facts:** product form only ("From the package: Pre-roll"). **Potency (THC/CBD) is never shown**
     (P2): it's stored for our internal potency table, not displayed. The label claim itself is listed inside
     "How we know" ("Package says Hybrid."), so docs/02's "label claim shown" holds without a callout for
     agreeing labels.
   - **Tags:** "Commonly reported" effect / flavor / terpene chips, only those that exist, with negative-polarity
     effects in their own "Also reported" row. Zero tags → the section is not rendered.
   - **"How we know" (collapsed):** family tree, sources count, "Sources describe it as …" (reported type, never
     averaged with ours), link to /about#classification. Disputed ancestors carry a "lineage disputed" marker (P9),
     and the collapsed row counts them. Where the tree ends, say so ("Origins of Chemdawg are unknown").
   - **Actions:** [Save] [Share link], sticky at the bottom of the sheet. Save becomes "✓ Saved" with an Undo toast
     and an optional rating row.
   - **Footer:** "Effects vary person to person. Start low, go slow."

### Close call
- "Which one?" sheet with up to 3 candidates (name, breeder if any, mini classification pill) plus
  [None of these → edit text / search]. Picking one confirms it (and teaches local barcode memory if a
  barcode was involved). No scores are shown. When candidates differ only by a number (P5), the number is
  emphasized. An "A x B" label with no curated cross shows the two parents as "Parent, not a match" (P4).

### No match
- "We couldn't find a strain in that label." Show what we read as editable text, then [Search], [Try again],
  and "We don't have this strain yet" (Could: [Request it]).
- **Never** show a classification here. "Save anyway" stores an unidentified scan with the package facts.
- **Unknown barcode** (not in local memory): "We don't know this barcode yet", with [Scan the label] (Text mode for
  one shot) and [Search by name]. A tracking UID, COA QR, or Retail ID QR says what it is ("That's a tracking
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

- **TagList** takes `tags: Term[]` and renders 0..n chips. Wraps to new lines; collapses past 8 with
  "+N more". There is **no** prop for a minimum count and no placeholder chip. Zero tags returns `null`.
  Tag chips are display-only (not tappable); the hedged descriptions live on /about#tags.
- **ClassificationMeter** takes the `lineage` object. `sativa_pct` null renders "Unknown lineage", never a
  50/50 bar. `method: reported` shades the band with no number.
- **ConfidenceChip** maps `confidence_level` + `method` to copy. Tapping it reveals a one-sentence explanation
  inline (no floating popover, so it reflows at 200% and 320 px).
- **Sheet** (every bottom sheet): a visible close button, a grabber that is a ≥ 48 px button cycling the
  heights, Escape and browser back close it. Modal, focus trapped and returned (SC 2.5.7, 2.4.11).
- **ResultSheet** is the same component for scans and deep links. Package facts are optional props.
- Every numeric or tag value on screen traces back to the data or the scan. Reviewers check this.
- **Strain names render as plain text** (P12). No candy imagery, playful fonts, emoji or color treatment keyed
  to names like "Zkittlez" or "Candyland".

## Quality bar: what "modern and professional" means here

The goal (founders, 2026-10-26): competitive with the best modern consumer apps. **Clean, simple, easy to
read, organized**, following published platform standards, and **fun and catchy** enough that people
*want* to use it. Concretely:

**Principle: calm by default, playful in moments.** The everyday UI is quiet, clear, and consistent.
Personality is concentrated in a few signature moments (lock-on, result reveal, "package says" callout,
save). Fun never costs clarity or speed.

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
  default), line height 1.4–1.6, a type scale of about 5 steps. Tabular figures for percentages. Fonts are
  self-hosted (a font CDN would send the user's IP to a third party).
- **Spacing:** a 4/8 px grid. Generous whitespace. One column on phones.
- **Hierarchy:** one primary action per screen. The most important thing is the biggest thing.
  Progressive disclosure: details ("How we know", sources) are one tap away, not on top.
- **Color:** a small palette: neutrals plus 1–2 brand accents plus the 3 classification colors. Dark and
  light themes are both first-class.
- **Iconography:** one icon set (Lucide), one stroke weight, always paired with a label on primary actions.
- **Copy:** plain language, sentence case, buttons are verbs ("Scan", "Save", "Share"). Error messages say
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
  template: [design/hallway-test.md](design/hallway-test.md). It also checks that people don't read the meter as
  potency and that they understand the chip wording.

## Design direction

The target is **bold, vibrant, high-contrast**, on a dark base:

- **The camera UI is dark by necessity** (a viewport plus overlays). Use near-black surfaces and vivid,
  saturated accents for controls. That's where "punchy" lives.
- **The result is the color moment.** The classification hero floods the sheet header with the
  classification color, with big type and a tactile meter.
- FlowerScan is a **separate brand** (open-questions Q1). Cannapickforme's tokens don't apply. Roy owns the
  final identity ([13-creative-brief.md](13-creative-brief.md)). Until it lands, build with swappable tokens
  in `apps/web/src/styles/tokens.css`, so the rebrand is a token change, not a refactor.

### Classification colors (draft)

Use the convention people already know, made colorblind-safe by always pairing color with a word and an icon.

| Class | Hue direction | Icon idea | Text always shown |
| --- | --- | --- | --- |
| Indica | deep violet | moon | "Indica" |
| Hybrid | vivid green | half-circle / leaf | "Hybrid · Sativa-dominant" etc. |
| Sativa | warm amber/orange | sun | "Sativa" |
| Unknown | neutral gray | question mark | "Unknown lineage" |

The meter is a gradient from violet through green to amber, with faint ticks at the band edges and a white
knob with an ink ring at the percentage. Contrast: we hold all text to ≥ 4.5:1, even large display text (AA
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
- **Result reveal:** the sheet rises with a spring, the meter fills from center to value (400 ms),
  tags stagger in 30 ms apart.
- **Package says:** after the meter settles, the callout slides up 8 px with a small tilt of its icon.
- **Save:** the button morphs to "✓ Saved" with a small pop, and the optional rating row appears.
- **Haptics:** a 10 ms tick on lock-on, a double-tick on save (Android Chromium only, after the user's first tap;
  silently skipped elsewhere).
- Animate only `transform` and `opacity`. Respect `prefers-reduced-motion` (crossfades instead of springs).

### Ergonomics
- One-thumb: primary actions sit in the bottom 40% of the screen. Shutter ≥ 72 px, other targets ≥ 48 px.
- Usable at arm's length in a dim dispensary: large type, torch button, high contrast.
- Supports dynamic type / zoom up to 200% without breaking the result sheet.

## Copy voice

Short, warm, confident, a little playful, and never clinical or medical. All effect language is hedged
("often described as…"). Full rules: [09-compliance-and-privacy.md](09-compliance-and-privacy.md).
Roy defines the brand voice in [13-creative-brief.md](13-creative-brief.md). Compliance rules override it.
