# Screen: Scanner (`/scan`)

Tasks: T-009 (viewport, permission), T-010 (barcode/QR), T-011 (OCR) · Flows: [flows.md §1, §2, §5, §6](../flows.md)
· Mockup: `mockups/index.html#/scan` (plus `#/camera-card`, `#/camera/denied` …)

## Purpose
The home of the app. Open straight onto a live camera with one dominant control (benchmark pattern 1). Codes
are read on their own; the shutter reads text. Search is one tap away for when the camera can't help.

## Layout (portrait)

```
┌──────────────────────────────┐ ← safe-area top
│ FlowerScan            [torch]│  top bar on a 60% → 0% scrim gradient; torch only if supported
│                              │
│   ┌──────────────────────┐   │
│   │                      │   │  reticle: 80% width, 5:3, corners only
│   │                      │   │  (white 3 px + 1 px ink outline)
│   └──────────────────────┘   │
│  ( Point at the strain name  │  hint pill on a 60% scrim, always visible
│     or a barcode )           │
│                              │
│  [ Auto | Text | Barcode | QR]│  segmented mode control, 48 px tall
│                              │
│ (Search)   ( SHUTTER )  (Recent)│  56 px side buttons with labels, 76 px shutter
│ ─────────────────────────────│
│  Scan     Journal   Settings │  tab bar
└──────────────────────────────┘
```

- Live video fills the screen behind everything (`object-fit: cover`). Overlays are translucent; every word sits
  on a ≥ 60% scrim pill (contrast table).
- The shutter, mode control, Search and Recent are all in the bottom 40%.
- **Recent** (docs/02 Should) opens a small sheet with the last 5 journal entries (class icon, name, time). If the
  journal is empty, the slot shows nothing and the row stays balanced.
- **Landscape:** the reticle centers in the remaining space; mode control, Search, shutter and Recent stack in a
  trailing-edge column; the tab bar stays at the bottom at 48 px.

## Hierarchy
1. The live view and reticle (what to do). 2. The shutter (how to do it). 3. The hint (if unsure).
4. Search and Recent. 5. Mode control (rarely needed; Auto is the default).

## Modes
| Mode | Detection | Shutter |
| --- | --- | --- |
| **Auto** (default) | Barcode + QR continuously | Reads text |
| Text | None | Reads text |
| Barcode | 1D codes only | Replaced by a non-interactive pulsing ring labelled "Looking for a barcode" |
| QR | QR only | Same, "Looking for a QR code" |

The chosen mode persists (`default_mode` in settings). At ≥ 150% text or ≤ 340 px width the control becomes one
"Mode: Auto" button opening a menu.

## States

| State | What the user sees | Notes |
| --- | --- | --- |
| **Camera card** (first run, permission state `prompt`) | Full-screen card over a dark background: icon, **"Point at a package. We'll show you what's in its family tree."**, then **"We use your camera to read labels. Photos never leave your phone."** [Continue] (primary). Text link: "Type a name instead". | Shown once (`intro_seen`). Continue fires `getUserMedia`. One primary button, "Continue" not "Allow" (HIG). |
| **Start camera** (permission `prompt`, card already seen) | Dark viewport, reticle outline, center button **[Start camera]**, hint "Your browser will ask for camera access." | Handles iOS standalone re-prompts (test-plan gap 14) and keeps the prompt behind a tap. |
| **Starting** | Black viewport, reticle drawn, hint "Starting camera…". | Budget ≤ 800 ms. No spinner. |
| **Live** | As in the layout. Hint: "Point at the strain name or a barcode." | |
| **Coaching** | Hint pill swaps to: "Move closer" (code too small), "More light. Try the torch." (dark frame, torch supported), "More light" (no torch), "Hold steady" (blur). | One message at a time, held ≥ 1.5 s so it can be read. Announced politely once. |
| **Lock-on** | Corners spring to the code's bounding box (180 ms), turn accent with ink outline, one pulse. 10 ms haptic. Then the result sheet rises. | Reduced motion: corners jump, no pulse. Live region: "Barcode found" / "QR code found". |
| **Reading** (after shutter) | Shutter press scales to 0.92, frame freezes with an 8% white flash, a shimmer sweeps the reticle, pill "Reading label…". | Budget ≤ 1.5 s. |
| **Still reading** | 1.5–5 s: pill "Still reading. Hold on…". At 5 s the shimmer stops and the pill shows "This is taking longer than usual." [Keep waiting] [Search instead]. | SC 2.2.2: no motion longer than 5 s. |
| **Read failed** (15 s, or worker crash) | Error sheet: **"We couldn't read that label."** "Fill the frame with the strain name, and try the torch." [Try again] (primary) [Search by name]. | `role="alert"`. |
| **Text reading download** (first OCR use, online) | Determinate progress pill: "Getting text reading ready (one-time, {size})…". Codes still detect meanwhile. | Size from the real asset. |
| **Download failed** (online) | Sheet: "Text reading didn't download. Check your connection and try again. Barcodes and search still work." [Try again] [Search by name] | |
| **Offline, OCR not cached** | On shutter tap: sheet "Text reading needs a one-time download. Barcodes and search work offline." [Search by name] [OK] | docs/08 copy. Codes keep working. |
| **Camera off** (denied) | Viewport area becomes a `surface-1` panel: camera-off icon, **"Camera is off for FlowerScan"**, "You can still search by name. To scan, turn the camera on:", browser-specific steps (below), [Search by name] (primary), [Try again] (secondary). Tab bar stays. | Never re-prompts on its own. Try again checks `permissions.query` first; still denied → inline "Still off. Change the setting, then try again." |
| **No camera** (`NotFoundError`) | Same panel: **"We can't find a camera on this device."** "Search works just as well." [Search by name] | |
| **Camera busy** (`NotReadableError` / `AbortError`) | **"Your camera is busy."** "Another app might be using it. Close it, then try again." [Try again] (primary) [Search by name] | |
| **Can't use the camera here** (API missing, in-app browser, insecure context) | **"This browser can't open the camera."** "Open FlowerScan in Safari or Chrome to scan. In an app like Instagram, tap ••• and choose Open in browser." [Search by name] (primary) [Copy link] | Copy link → toast "Link copied". |
| **Tab hidden / sheet open** | Stream paused (docs/06). Returning resumes without a prompt; "Starting camera…" if it takes > 300 ms. | |
| **Update ready** | Toast "A new version is ready. [Reload]" only in Live or Camera-off states, never during Reading or with a sheet open (X-09). | |

### "Turn the camera on" steps (verify each on a device in T-009)
- **iPhone, Safari:** Tap **aA** in the address bar → **Website Settings** → **Camera** → **Allow**.
- **iPhone, Home Screen app:** Open the **Settings** app → **Apps** → **Safari** → **Camera** → **Allow**, then reopen FlowerScan.
- **Android, Chrome:** Tap the **settings icon** left of the address → **Permissions** → **Camera** → **Allow**.
- **Other browsers:** Open this site's settings in your browser and allow the camera.

## Copy (draft)
- Hint: Point at the strain name or a barcode.
- Mode labels: Auto · Text · Barcode · QR
- Buttons: Search · Recent · (shutter has no visible label; `aria-label="Read label text"`)
- Torch: `aria-label="Turn on torch"` / `"Turn off torch"`, `aria-pressed`.

## Accessibility
- Shutter: `<button aria-label="Read label text">`, 76 px. Barcode/QR-mode ring: not a button, `aria-hidden`, its
  state is announced by the live region instead.
- Mode control: `role="radiogroup"` with 4 radios (arrow keys move), label "Scan mode".
- The video is decorative to assistive tech (`aria-hidden`); the hint is a real text node.
- All announcements through the app live region (shared components). Lock-on and result are announced; frame-by-
  frame detections are not.
- Keyboard (desktop): Space/Enter on the shutter, `S` doesn't exist (no single-key shortcuts, SC 2.1.4).
- Targets: 56 px side buttons, 76 px shutter, ≥ 12 px apart. Torch 48 px.
- Haptics only after the user's first tap (sticky activation), Android Chromium only, gated by Settings.

## Not in MVP (noted so nobody builds it)
Tap-to-select a region (Lens), continuous "budtender" mode, multi-package shelf scan.
