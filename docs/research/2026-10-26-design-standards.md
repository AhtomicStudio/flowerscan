# Design standards digest: HIG, Material 3, WCAG 2.2 AA, Core Web Vitals, PWA install

- **Task:** T-020 · **Author:** researcher · **Date:** 2026-10-26 · **For:** product-designer (T-021), ui-engineer (T-004, T-017, T-018)
- **Method:** primary sources only where reachable: Apple HIG (read through its JSON data endpoint, since the HTML
  is rendered client-side), W3C, web.dev, Chrome, WebKit, MDN, Google, and the Android Material component docs.
  m3.material.io renders client-side and returned no content, so Material 3 guidance comes from Google's Android
  Material component docs and Google's accessibility help instead. This is noted where it matters.

## Question

What do the current platform and web standards say about tab bars, bottom sheets, camera UIs, touch targets,
accessibility, performance, and installability? Are the numbers in docs/08 "Quality bar" correct?

## Short answer

- **Most docs/08 numbers are right.** Contrast 4.5:1 / 3:1, 200% text resize, LCP ≤ 2.5 s, INP ≤ 200 ms,
  CLS ≤ 0.1, 44 pt / 48 dp targets, and 8 dp spacing all check out. Our 48 px rule beats WCAG 2.2's AA minimum,
  which is only **24 × 24 CSS px**.
- **Three statements need correcting.** (1) Reduced-motion support is WCAG **AAA** (2.3.3), not AA. Keep the
  rule, but label it correctly. (2) "Maskable icons, splash" are not install criteria. The actual criteria are
  name, 192 and 512 px icons, `start_url`, `display`, and HTTPS, plus a `fetch` handler for Chrome's install
  prompt. (3) Apple asks for about **12 pt of padding** around bezeled controls, more than our 8 px.
- **The AA list in docs/08 is missing items that hit our exact UI.** 2.5.7 Dragging Movements: the sheet drag
  and swipe-to-dismiss need a tap alternative. 4.1.3 Status Messages: "Reading label…" and the result arriving
  must be announced. 2.4.11 Focus Not Obscured: the sheet and bottom bar must not hide focus. 1.3.4 Orientation:
  don't lock the manifest to portrait. Also 1.4.11 (3:1 for the meter marker and reticle), 1.4.10 Reflow at
  320 px, and 1.4.12 Text Spacing.
- **Recent changes to design for:** iOS 26 opens *any* Home Screen site as a web app (2025-06-09). Apple's
  tab bar is now a floating Liquid Glass bar that can shrink on scroll (HIG, 2025–2026). Material 3 Expressive
  (2025-05-13) shortens the navigation bar to 64 dp. Lighthouse dropped its PWA category. Haptics through
  `navigator.vibrate` still do nothing on iOS.
- **Recommendation:** keep docs/08's standards table, apply the corrections in the table below, and add the 7
  WCAG items to the design-review checklist. The trade-off: honoring 2.5.7 and 1.3.4 means extra controls (a
  close button and a tappable grabber) and a landscape layout. That's a little more design work for every sheet
  and screen.

## Findings

### 1. Navigation: tab bar / navigation bar
- **Apple HIG, Tab bars** ([HIG](https://developer.apple.com/design/human-interface-guidelines/tab-bars), changelog
  latest 2026-06-08; Liquid Glass guidance added 2025-07-28, updated 2025-12-16):
  - Tabs are for navigation, not actions.
  - Keep the bar visible across sections. A modal may temporarily cover it.
  - Use the fewest tabs that work, and avoid a "More" overflow tab.
  - Don't disable or hide tabs. Explain empty content instead.
  - Labels should be short, ideally single words. Use badges sparingly.
  - In iOS 26 the bar **floats over content on Liquid Glass**. It can minimize on scroll, carry an accessory
    above it, and include a **dedicated search tab** at the trailing end.
  - Avoid tab-bar colors that resemble the content underneath.
- **Material 3 navigation bar** ([Material Components Android: Navigation bar](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/components/BottomNavigation.md), undated, read 2026-10-26):
  - **3 to 5 destinations.** With 3 or fewer items, labels show on all of them by default.
  - The M3 Expressive style shortens the bar **from 80 dp to 64 dp**, with less item padding and a smaller
    active indicator.
  - Every item needs a title so screen readers can announce it.
- **Material 3 Expressive** was announced 2025-05-13 for Android 16 and Wear OS 6. It brings spring-based
  motion, bolder type and color, and new or updated components ([Gigazine summary of the Google blog post](https://gigazine.net/gsc_news/en/20250514-android-16-wear-6-material-3-expressive), 2025-05-14;
  [Android Developers Blog](https://android-developers.googleblog.com/2025/05/whats-new-in-wear-os-6.html), May 2025).
  Secondary source for the Android announcement; the primary blog.google post was not retrieved.

### 2. Bottom sheets
- **Apple HIG, Sheets** ([HIG](https://developer.apple.com/design/human-interface-guidelines/sheets), latest change 2026-03-24):
  - Sheets are for a scoped task tied to the current context. Show one sheet at a time.
  - Detents: `medium` is about half height and `large` is full. On iPhone, medium suits progressive disclosure.
  - Show a **grabber** on resizable sheets. **Tapping it cycles through detents**, and it works with VoiceOver.
  - **Support swipe-down to dismiss.** If there are unsaved changes, confirm first.
  - Cancel/Close dismisses without saving and Done saves. Pair Done with Cancel or Back, never all three.
  - Nonmodal sheets can leave the parent view interactive. The page does not mention Liquid Glass.
- **Material bottom sheets** ([Material Components Android: Bottom sheet](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/components/BottomSheet.md), undated, read 2026-10-26):
  - *Standard* sheets coexist with the content behind them and have no scrim. *Modal* sheets add a scrim and
    block the content behind.
  - The drag handle is **at least 48 × 48 dp**. With TalkBack, Switch Access, or Voice Access, tapping it
    expands or collapses the sheet.
  - Modal sheets dismiss by tapping outside or dragging down, and they support predictive back.
  - Default max width is **640 dp**. A half-expanded state is available.

### 3. Camera UI and permissions
- **Neither the HIG nor M3 has a page on viewfinder design for third-party apps.** The HIG's "Camera Control"
  material covers the iPhone 16 hardware button, which only native apps can use ([Apple AVFoundation doc](https://developer.apple.com/tutorials/data/documentation/avfoundation/enhancing-your-app-experience-with-the-camera-control.md), seen via search). Not applicable to a PWA.
- **Google's Material ML patterns (Material 2, beta) for barcode scanning and live-camera object detection:**
  - Treat the camera as a substitute for typing.
  - Give onboarding plus **persistent** instructions.
  - Keep controls along the top and bottom edges and make non-actionable overlays translucent, so the feed
    stays visible.
  - The reticle can animate to show state.
  - Give guidance when image quality is poor ([m2.material.io barcode scanning](https://m2.material.io/design/machine-learning/barcode-scanning.html) and
    [object detection](https://m2.material.io/design/machine-learning/object-detection-live-camera.html), circa 2019,
    **[old]**, read via search excerpts because the pages render client-side).
  - The companion showcase app adds an aiming-frame size setting, a **"Move closer"** prompt when the code is
    too small, and a delayed-result state ([firebase/mlkit-material-android](https://github.com/firebase/mlkit-material-android),
    archived 2024-06-14 **[old]**).
- **Asking for camera permission on the web** ([web.dev permissions best practices](https://web.dev/articles/permissions-best-practices), 2024-06-17):
  - Ask in context, after a user gesture.
  - Use a pre-prompt and fire the browser prompt only on a "yes."
  - Offer a non-camera alternative.
  - Read the permission state with the Permissions API and show browser-specific steps when it's blocked.
  - Don't re-prompt after a denial.
- **Apple HIG, Privacy** ([HIG](https://developer.apple.com/design/human-interface-guidelines/privacy), 2023-06-21 **[old but stable]**):
  - A pre-alert screen is allowed only if it has **one button**, such as "Continue," and no "Allow" wording.
  - No Cancel/Close escape, no incentives, and no imitation of the system alert.
  - Ask only when the feature is used, not at launch.
  - These are App Review rules for native apps. They're useful as a standard for our PWA (interpretation).

### 4. Touch targets and type
- **Apple HIG, Accessibility** ([HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility), 2025-03-07 rewrite, latest 2025-06-09):
  - iOS control size is **44 × 44 pt default and 28 × 28 pt minimum**.
  - Spacing: about **12 pt of padding around bezeled controls and about 24 pt around non-bezeled ones**.
  - Contrast follows WCAG AA. Check both light and dark modes.
  - Text should enlarge to **200%**.
  - Under Reduce Motion: tighten springs, replace axis movement with fades, and avoid z-axis motion and blur
    animations.
- **Apple HIG, Typography** ([HIG](https://developer.apple.com/design/human-interface-guidelines/typography), alert dated 2025-12-16):
  - iOS **default text is 17 pt, minimum 11 pt**.
  - Avoid Ultralight, Thin, and Light weights.
  - Use as few typefaces as possible.
  - At large text sizes, keep the hierarchy and prioritize content.
- **Google (Android accessibility help)** ([Touch target size](https://support.google.com/accessibility/android/answer/7101858?hl=en), undated):
  - **At least 48 × 48 dp** (about 9 mm), separated by **8 dp or more**.
- **WCAG 2.2, 2.5.8 Target Size (Minimum), AA** ([Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), updated 2026-05-11):
  - **24 × 24 CSS px**, or enough spacing that 24 px circles don't overlap.
  - Exceptions: an equivalent control elsewhere, inline links, browser-native controls, and essential cases.
  - 44 × 44 is the AAA criterion (2.5.5).
- **iOS input zoom:** Safari zooms into inputs with a font size under 16 px. Using ≥ 16 px avoids this without
  disabling pinch zoom ([Telerik KB](https://docs.telerik.com/devtools/aspnet-ajax/knowledge-base/common-disable-autozoom-input-safari-iphone), undated;
  [Rick Strahl](https://weblog.west-wind.com/posts/2023/Apr/17/Preventing-iOS-Textbox-Auto-Zooming-and-ViewPort-Sizing), 2023-04-17).
  This is secondary-source, long-standing behavior. WebKit does not document it.

### 5. WCAG 2.2 AA items that matter for FlowerScan
WCAG 2.2 is a W3C Recommendation (current edition 2024-12-12). It added 9 success criteria (6 at A/AA) and
removed 4.1.1 Parsing ([WCAG 2.2](https://www.w3.org/TR/WCAG22/), 2024-12-12).

| SC (level) | Requirement (paraphrased) | Where it bites us |
| --- | --- | --- |
| 1.4.3 Contrast (AA) | Text 4.5:1. Large text (≥ 18 pt, or ≥ 14 pt bold) 3:1. | Classification-colored hero, text on camera overlays. In CSS px, 18 pt = 24 px and 14 pt = about 18.7 px (conversion, 1 pt = 4/3 px). |
| 1.4.11 Non-text Contrast (AA) | UI parts and meaningful graphics 3:1 against neighbors. | Meter marker, reticle corners, chip outlines, shutter ring on a live feed. |
| 1.4.1 Use of Color (A) | Color alone can't carry meaning. | Classification colors always paired with word and icon (already in docs/08). |
| 1.4.4 Resize Text (AA) | 200% text without loss. | Result sheet at 200% (already in docs/08). |
| 1.4.10 Reflow (AA) | No 2-D scrolling at 320 CSS px width. | Meter and family tree on small or zoomed screens. |
| 1.4.12 Text Spacing (AA) | Survives user line-height 1.5×, paragraph 2×, letter 0.12×, word 0.16×. | Fixed-height chips and pills. |
| 1.3.4 Orientation (AA) | Don't lock orientation unless essential. | Don't set manifest `orientation: portrait`. The scanner and result need a landscape layout. |
| 2.4.7 Focus Visible (AA) | A visible focus indicator. | Keyboard and switch users on the sheet. |
| **2.4.11 Focus Not Obscured (Min) (AA, new)** | A focused item can't be entirely hidden by author content. Sticky footers need scroll padding. Modal dialogs pass ([Understanding](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), updated 2026-06-15). | Tab bar, shutter bar, and a non-modal result sheet covering focused items. |
| **2.5.7 Dragging Movements (AA, new)** | Anything done by dragging must also work with a single pointer and no path gesture ([Understanding](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html), updated 2026-08-10). | "Drag up for full screen" needs a tappable grabber or button. "Swipe down to dismiss" needs a close button. |
| **2.5.8 Target Size (Min) (AA, new)** | 24 × 24 CSS px (above). | Our 48 px rule exceeds it. |
| 4.1.2 Name, Role, Value (A) | Programmatic names and roles. | Shutter, mode control, meter (needs a text value). |
| **4.1.3 Status Messages (AA)** | Status updates announced without moving focus. Examples include "Searching…", result counts, and "Saved" ([Understanding](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), updated 2026-05-11). | "Reading label…", lock-on, "Saved", no-match. |
| 2.2.2 Pause, Stop, Hide (A) | Auto-moving content over 5 s must be pausable. | A shimmer or pulse that loops longer than 5 s. |
| 2.3.3 Animation from Interactions (**AAA**) | Interaction-triggered motion can be turned off. | Our `prefers-reduced-motion` rule goes beyond AA. Keep it. |

3.3.8 Accessible Authentication (AA) doesn't apply to us yet (no accounts in MVP). 3.2.6 Consistent Help (A)
means the /about link should stay in a consistent place.

### 6. Core Web Vitals (all at the 75th percentile, mobile and desktop separately)
| Metric | Good | Needs improvement | Poor | Source |
| --- | --- | --- | --- | --- |
| LCP | ≤ 2.5 s | 2.5–4.0 s | > 4.0 s | [web.dev LCP](https://web.dev/articles/lcp), 2025-09-04 |
| INP | ≤ 200 ms | 200–500 ms | > 500 ms | [web.dev INP](https://web.dev/articles/inp), 2025-09-02 |
| CLS | ≤ 0.1 | 0.1–0.25 | > 0.25 | [web.dev CLS](https://web.dev/articles/cls), 2023-04-12 |

INP replaced FID on **2024-03-12** ([web.dev](https://web.dev/blog/inp-cwv-march-12), 2024-01-31). The CWV
overview confirms the three metrics and the 75th percentile ([web.dev Vitals](https://web.dev/articles/vitals),
2024-10-31). The "feedback within 100 ms" rule in docs/08 matches Nielsen's 0.1 s limit for a response that
feels instant ([NN/g](https://www.nngroup.com/articles/response-times-3-important-limits/), 1993, updated 2014 **[old but foundational]**).

### 7. PWA installability
- **Chrome criteria** ([web.dev install criteria](https://web.dev/articles/install-criteria), 2024-09-19 **[old for a fast-moving topic]**):
  - Not already installed.
  - The user clicked or tapped at least once and spent **30 s** on the page.
  - HTTPS.
  - A manifest with `name` or `short_name`, **192 px and 512 px icons**, `start_url`, a `display` of
    fullscreen, standalone, minimal-ui, or window-controls-overlay, and `prefer_related_applications` not true.
  - Screenshots and a description are recommended for the richer install UI.
- **Service worker:** Chrome dropped the service-worker requirement for installing from the **menu** (Chrome
  108 mobile, 112 desktop). The **automatic install prompt still needs a `fetch` handler**. Lighthouse
  **removed its PWA category**, and installability checks now live in DevTools
  ([Chrome blog](https://developer.chrome.com/blog/update-install-criteria), 2023-12-05 **[old]**).
- **Splash screen on Android Chrome** is generated from `name`, `background_color`, and icons. Set
  `background_color` to match the first paint ([web.dev manifest](https://web.dev/articles/add-manifest), 2024-09-18).
  **The current iOS splash behavior is unknown** from primary sources. Check WebKit docs or test on a device.
- **Maskable icons** are optional. Keep the logo inside a centered circle with a 40% radius, and declare them
  with `"purpose": "maskable"` as a separate icon entry ([web.dev](https://web.dev/articles/maskable-icon), 2019-12-19 **[old]**).
- **iOS / iPadOS 26:** every site added to the Home Screen opens as a web app by default, manifest or not. The
  user can switch off "Open as Web App." Manifest icons and service-worker offline behavior apply, and SVG icons
  are supported ([WebKit, News from WWDC25](https://webkit.org/?p=16993), 2025-06-09). The WebKit post describes only the
  user-driven Add to Home Screen sheet. `beforeinstallprompt` appears only in Chrome's docs. So plan in-app
  "Add to Home Screen" instructions for iOS (interpretation; confirm on a device that iOS Safari has no
  install prompt).
- **Safe areas:** `env(safe-area-inset-*)` is 0 unless the viewport is non-rectangular or UI occupies it
  ([MDN env()](https://developer.mozilla.org/en-US/docs/Web/CSS/env), 2026-10-08). Laying out under the notch
  and home indicator requires `viewport-fit=cover` in the viewport meta tag ([WebKit](https://webkit.org/blog/7929/designing-websites-for-iphone-x/),
  2017-09-22 **[old but still the defining doc]**).

### 8. Haptics
`navigator.vibrate` needs sticky user activation ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate),
2025-11-30). It is **not supported in any version of iOS Safari** through 27.x, and also not in Firefox for
Android ([caniuse](https://caniuse.com/vibration), accessed 2026-10-26). This confirms docs/08's "Android only,
silently skipped." In practice it means Chrome-based Android browsers only, and a lock-on tick before the user's
first tap will not fire (interpretation from the sticky-activation rule).

### 9. Usability heuristics
Nielsen's 10 heuristics were published 1994-04-24 and last reviewed 2024-01-30
([NN/g](https://www.nngroup.com/articles/ten-usability-heuristics/)). They're still current as a review checklist.

## docs/08 "Quality bar" check

| docs/08 row / claim | Verdict | Suggested correction (designer applies) |
| --- | --- | --- |
| Platform: bottom tab bar, 3 tabs max | **Consistent.** Material allows 3–5; HIG says use the fewest that work. | Add: keep the bar visible (HIG), with labels on every tab. Consider whether Search deserves a tab, since HIG now has a dedicated search-tab pattern (design decision, not a contradiction). |
| Platform: swipe-down to dismiss | **Consistent** with HIG and Material, but **incomplete for WCAG 2.5.7**. | Every sheet also gets a visible close control, and the grabber is a ≥ 48 px button that cycles heights on tap. |
| Accessibility: 4.5:1, 3:1 for large text and UI | **Correct** (1.4.3, 1.4.11). | Define "large" in px: ≥ 24 px regular or ≥ 18.7 px bold. |
| Accessibility: 200% text zoom | **Correct** (1.4.4; HIG also asks for 200%). | Add 1.4.10 Reflow at 320 px and 1.4.12 Text Spacing. |
| Accessibility: reduced-motion support under "WCAG 2.2 AA" | **Mislabeled.** 2.3.3 is AAA. | Keep the rule, cite it as HIG Reduce Motion plus WCAG 2.3.3 (AAA). |
| Accessibility: missing AA items | **Gap.** | Add 2.5.7, 2.4.11, 4.1.3, 1.3.4 (see section 5). |
| Touch targets: "HIG 44 pt" | **Correct** as Apple's default. Apple's minimum is 28 pt. | No change. |
| Touch targets: "WCAG 2.2 target size" | **Imprecise.** The AA requirement is 24 × 24 CSS px. 44 is AAA (2.5.5). | Say "exceeds WCAG 2.5.8 (24 px) and meets 2.5.5 AAA (44 px)." |
| Touch targets: 48 px minimum | **Correct.** Meets Material 48 dp and exceeds HIG 44 pt. | No change. |
| Touch targets: ≥ 8 px between targets | **Meets Google (8 dp), below Apple's ~12 pt padding guidance.** | Suggest ≥ 12 px between adjacent bezeled targets (one rule for both platforms). |
| Touch targets: shutter ≥ 72 px | No standard sets this. It's a product choice. | No change. |
| Web perf: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 | **Correct.** | Add "at p75, mobile." The 2.0 s internal budget is fine. |
| Web perf: feedback within 100 ms | **Consistent** with NN/g's 0.1 s limit. | No change. |
| PWA: "Manifest, maskable icons, splash, offline shell, safe areas" | **Partly wrong as "install criteria."** Maskable icons and splash are recommendations. | List the real criteria (section 7). Add a service worker with a `fetch` handler (needed for Chrome's prompt and for offline), `viewport-fit=cover` for safe areas, no `orientation` lock, and iOS Add-to-Home-Screen instructions. Note Lighthouse no longer has a PWA score. |
| Type: body ≥ 16 px | **Correct** for avoiding iOS input zoom. | Optional: 17 px body to match the iOS default (HIG). |
| Micro-interactions: haptics Android only | **Correct.** iOS Safari doesn't support Vibration. | Note it needs a prior user tap. |

## Implications for FlowerScan

- **Result sheet (T-021, T-013):** design it as a sheet with a tappable grabber (≥ 48 px), a close button, and
  two heights. Decide modal vs. non-modal. A modal sheet passes 2.4.11 most easily. A non-modal one needs focus
  management (interpretation from the Understanding doc).
- **Scanner (T-009):**
  - The pre-prompt follows HIG's one-button rule. Use "Continue," not "Allow." docs/08's draft copy already
    fits.
  - Keep a persistent aiming hint and quality coaching ("Move closer," "More light").
  - Use translucent overlays at the top and bottom edges.
  - Announce state changes through a polite live region (4.1.3).
- **Landscape:** 1.3.4 means no portrait lock. The scanner can still be designed portrait-first, as long as
  landscape stays usable.
- **Install (T-018):**
  - Manifest with 192 and 512 icons plus a separate maskable icon, and screenshots.
  - A real `fetch` handler, which the offline shell needs anyway.
  - A custom "Install" affordance only after engagement. A one-time "Add to Home Screen" tip on iOS.
- **Liquid Glass and M3 Expressive** are native-platform looks. A PWA can't use the system materials and
  shouldn't fake them (interpretation). Follow the patterns (floating bottom bar, springy motion), not the
  materials.

## Confidence

**High** for WCAG, Core Web Vitals, HIG numbers, and the iOS 26 web app change. All of these were read directly
from primary pages updated 2024–2026.

**Medium** for Material 3: m3.material.io didn't render, so I used the Android component docs and Google's
accessibility help, plus secondary coverage of M3 Expressive.

**Medium-low** for camera-UI guidance: the only official source is Material 2's ML patterns from about 2019,
which are archived.

**What would change it:**
- Reading m3.material.io in a real browser (bottom sheets, navigation bar, accessibility pages).
- A current WebKit statement on iOS splash and startup images.
- Checking Chrome's install criteria against current Chrome release notes, since the web.dev page is from 2024
  and Chrome planned to relax manifest requirements.

## Sources

All accessed 2026-10-26. Dates are last-update or publication dates where shown.

- Apple HIG, Tab bars (2026-06-08): https://developer.apple.com/design/human-interface-guidelines/tab-bars
- Apple HIG, Sheets (2026-03-24): https://developer.apple.com/design/human-interface-guidelines/sheets
- Apple HIG, Accessibility (2025-06-09): https://developer.apple.com/design/human-interface-guidelines/accessibility
- Apple HIG, Typography (2025-12-16): https://developer.apple.com/design/human-interface-guidelines/typography
- Apple HIG, Privacy (2023-06-21): https://developer.apple.com/design/human-interface-guidelines/privacy
- Apple HIG, Loading (2025-06-09): https://developer.apple.com/design/human-interface-guidelines/loading. Show something right away, and use progress indicators past a moment or two. Consistent with docs/08's "shimmer, no spinner."
- Material Components Android, Navigation bar (undated): https://raw.githubusercontent.com/material-components/material-components-android/master/docs/components/BottomNavigation.md
- Material Components Android, Bottom sheet (undated): https://raw.githubusercontent.com/material-components/material-components-android/master/docs/components/BottomSheet.md
- Google Android accessibility help, touch targets (undated): https://support.google.com/accessibility/android/answer/7101858?hl=en
- Gigazine on M3 Expressive (2025-05-14): https://gigazine.net/gsc_news/en/20250514-android-16-wear-6-material-3-expressive
- Android Developers Blog, Wear OS 6 (May 2025): https://android-developers.googleblog.com/2025/05/whats-new-in-wear-os-6.html
- Material 2 ML barcode scanning (circa 2019, old): https://m2.material.io/design/machine-learning/barcode-scanning.html
- Material 2 ML object detection, live camera (circa 2019, old): https://m2.material.io/design/machine-learning/object-detection-live-camera.html
- ML Kit Material showcase (archived 2024-06-14): https://github.com/firebase/mlkit-material-android
- web.dev, Permissions best practices (2024-06-17): https://web.dev/articles/permissions-best-practices
- W3C WCAG 2.2 (2024-12-12): https://www.w3.org/TR/WCAG22/
- W3C Understanding 2.5.8 (2026-05-11): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- W3C Understanding 2.5.7 (2026-08-10): https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
- W3C Understanding 2.4.11 (2026-06-15): https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- W3C Understanding 4.1.3 (2026-05-11): https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- web.dev Web Vitals (2024-10-31): https://web.dev/articles/vitals
- web.dev LCP (2025-09-04): https://web.dev/articles/lcp
- web.dev INP (2025-09-02): https://web.dev/articles/inp
- web.dev CLS (2023-04-12): https://web.dev/articles/cls
- web.dev, INP becomes a CWV on March 12 (2024-01-31): https://web.dev/blog/inp-cwv-march-12
- NN/g, Response times (1993, updated 2014): https://www.nngroup.com/articles/response-times-3-important-limits/
- NN/g, 10 usability heuristics (reviewed 2024-01-30): https://www.nngroup.com/articles/ten-usability-heuristics/
- web.dev, Install criteria (2024-09-19): https://web.dev/articles/install-criteria
- Chrome blog, Revisiting installability criteria (2023-12-05): https://developer.chrome.com/blog/update-install-criteria
- web.dev, Add a manifest (2024-09-18): https://web.dev/articles/add-manifest
- web.dev, Maskable icons (2019-12-19): https://web.dev/articles/maskable-icon
- WebKit, News from WWDC25 (2025-06-09): https://webkit.org/?p=16993
- WebKit, Designing websites for iPhone X (2017-09-22): https://webkit.org/blog/7929/designing-websites-for-iphone-x/
- MDN, env() (2026-10-08): https://developer.mozilla.org/en-US/docs/Web/CSS/env
- MDN, Navigator.vibrate (2025-11-30): https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate
- caniuse, Vibration API (accessed 2026-10-26): https://caniuse.com/vibration
- Telerik KB, iOS input auto-zoom (undated): https://docs.telerik.com/devtools/aspnet-ajax/knowledge-base/common-disable-autozoom-input-safari-iphone
- Rick Strahl, Preventing iOS textbox auto-zooming (2023-04-17): https://weblog.west-wind.com/posts/2023/Apr/17/Preventing-iOS-Textbox-Auto-Zooming-and-ViewPort-Sizing
- Apple AVFoundation, Camera Control (undated, seen via search): https://developer.apple.com/tutorials/data/documentation/avfoundation/enhancing-your-app-experience-with-the-camera-control.md
