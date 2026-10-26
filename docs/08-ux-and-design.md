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
| `/about` | How classification works · data sources · privacy · responsible use |
| `/settings` | Theme, haptics, default mode, backup / restore journal, erase all data |

## Core flows

### First run
1. **Age gate:** "You must be 21+ to enter." [I'm 21+] / [Leave]. Remembered locally.
2. **One intro card** (skippable): "Point at a package. We'll tell you what's in the family tree."
3. **Camera priming:** "We use your camera to read labels. Photos never leave your phone." → browser prompt.
   - Denied → Manual search, plus a short how-to for re-enabling the camera in browser settings.

### Scan → result (happy path)
1. Scanner opens straight to a live viewport. Mode **Auto**. The shutter is the big thumb-zone button.
2. A barcode or QR comes into view → the reticle snaps to it (lock-on), with a haptic tick → result sheet springs up.
3. Or the user taps the shutter → frame freeze + "Reading label…" shimmer (≤ 1.5 s) → result sheet.
4. **Result sheet** (bottom sheet, drag up for full screen):
   - **Hero:** strain name, big classification label, sativa↔indica meter with the percentage.
   - **Confidence chip:** "Lineage traced" / "Partly traced" / "Breeder's label" / "Unknown lineage".
   - **Package-says callout** (only if it differs): "Package says **Indica**. The family tree leans **Sativa-dominant**."
   - **Package facts** (only those read): THC %, CBD %, form.
   - **Tags:** effect / flavor / terpene chips, only those that exist. Zero tags → the section is not rendered.
   - **"How we know" (collapsed):** family tree, sources count, link to /about#classification.
   - **Actions:** [Save] [Share link]
   - **Footer:** "Effects vary person to person. Start low, go slow."

### Close call
- "Which one?" sheet with up to 3 candidates (name, breeder if any, mini classification pill) plus
  [None of these → edit text / search]. Picking one confirms it (and teaches local barcode memory if a
  barcode was involved).

### No match
- "We couldn't find a strain in that label." Show what we read as editable text, then [Search], [Try again],
  and "We don't have this strain yet" (Could: [Request it]).
- **Never** show a classification here. "Save anyway" stores an unidentified scan with the package facts.

### Offline
- The app shell and strain data work offline. The first OCR use needs the language data; if it isn't cached
  yet, say "Text reading needs a one-time download. Barcodes and search work offline."

## Component rules

- **TagList** takes `tags: Term[]` and renders 0..n chips. Wraps to new lines; collapses past 8 with
  "+N more". There is **no** prop for a minimum count and no placeholder chip. Zero tags returns `null`.
- **ClassificationMeter** takes `sativa_pct | null`. Null renders "Unknown lineage", never a 50/50 bar.
- **ConfidenceChip** maps `confidence_level` + `method` to copy. Tapping it explains in one sentence.
- **ResultSheet** is the same component for scans and deep links. Package facts are optional props.
- Every numeric or tag value on screen traces back to the data or the scan. Reviewers check this.

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
| Platform patterns | Apple Human Interface Guidelines (iOS) + Material Design 3 (Android) | Use patterns people already know: bottom tab bar (3 tabs max: Scan, Journal, Settings), bottom sheets, swipe-down to dismiss, system back/browser back always works. No novel navigation. |
| Accessibility | WCAG 2.2 AA | Text contrast ≥ 4.5:1 (large text and UI parts ≥ 3:1). Never color alone. Works at 200% text zoom. Full screen-reader labels. Reduced-motion support. |
| Touch targets | HIG 44 pt · Material 48 dp · WCAG 2.2 target size | **48 px minimum** for everything tappable, with ≥ 8 px between targets. Shutter ≥ 72 px. |
| Web performance | Core Web Vitals "good" | LCP ≤ 2.5 s (our budget is stricter: 2.0 s), INP ≤ 200 ms, CLS ≤ 0.1. Every tap shows visual feedback within 100 ms. |
| PWA | web.dev installable-PWA guidance | Manifest, maskable icons, splash, offline shell, honors safe areas (`env(safe-area-inset-*)`). |
| Usability | Nielsen's 10 usability heuristics | Used as the design-review checklist (system status, plain language, undo, consistency, error prevention…). |

### Visual system rules
- **Type:** at most 2 typefaces. Body ≥ 16 px (also stops iOS from zooming into inputs), line height
  1.4–1.6, a type scale of about 5 steps. Tabular figures for percentages and THC numbers.
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
(camera-first UI). The research task (T-020) studies what makes them feel fast and trustworthy, and
also reviews cannabis apps for what to avoid.

### How we check it
- A design review against this section plus the Nielsen heuristics, before any screen task is done.
- Hallway tests: 5 people try the 3 core flows (scan → result, close call, no match). We measure task
  success and time. Anything 2+ people stumble on gets fixed before launch.

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

The meter is a gradient from violet to amber with a marker at the percentage. Contrast: all text ≥ 4.5:1 and
large display text ≥ 3:1 against its background (WCAG 2.2 AA).

### Typography
A heavy, condensed display face for strain names and the classification word (they need to read at arm's
length), plus a clean sans for UI. Placeholders get chosen in T-004, and Roy's identity work replaces them.

### Micro-interactions (the "snappy" part)
- **Lock-on:** reticle corners spring to the detected code's bounding box (≈ 180 ms), then a pulse.
- **Shutter:** press scales to 0.92 with a spring, the frame freezes with a quick white flash at 8% opacity.
- **Reading:** a shimmer sweeps across the reticle while OCR runs. No spinners.
- **Result reveal:** the sheet rises with a spring, the meter fills from center to value (400 ms),
  tags stagger in 30 ms apart.
- **Haptics:** a 10 ms tick on lock-on, a double-tick on save (Android only, silently skipped elsewhere).
- Animate only `transform` and `opacity`. Respect `prefers-reduced-motion` (crossfades instead of springs).

### Ergonomics
- One-thumb: primary actions sit in the bottom 40% of the screen. Shutter ≥ 72 px, other targets ≥ 48 px.
- Usable at arm's length in a dim dispensary: large type, torch button, high contrast.
- Supports dynamic type / zoom up to 200% without breaking the result sheet.

## Copy voice

Short, warm, confident, a little playful, and never clinical or medical. All effect language is hedged
("often described as…"). Full rules: [09-compliance-and-privacy.md](09-compliance-and-privacy.md).
Roy defines the brand voice in [13-creative-brief.md](13-creative-brief.md). Compliance rules override it.
