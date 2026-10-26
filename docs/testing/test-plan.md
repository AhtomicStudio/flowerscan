# Test Plan (MVP)

Owner: qa-tester. Source of truth for *what* gets tested *how*, and *which task delivers it*.
Specs win over this file: [02-mvp-scope.md](../02-mvp-scope.md) (what), [08-ux-and-design.md](../08-ux-and-design.md)
(flows and states), [06-scan-pipeline.md](../06-scan-pipeline.md) (pipeline and budgets),
[10-quality-and-testing.md](../10-quality-and-testing.md) (pyramid, budgets, DoD), and
[09-compliance-and-privacy.md](../09-compliance-and-privacy.md) (claims and privacy).

Related: [device-matrix.md](device-matrix.md) (real phones, per-release checklist) ·
[camera-fixtures.md](camera-fixtures.md) (fake camera feeds for Playwright).

**How to use this file.** When you pick up a task, find its ID in the tables below. Every row with your ID
is a test you owe before the task can move to `done/`. If you change a flow, update the row. If a row has no
owner, it's a gap. Raise it, don't skip it.

## Test types

| Code | Type | Tool / where | Runs |
| --- | --- | --- | --- |
| **U** | Unit | Vitest. `packages/core/test/`, `*.test.ts` next to web code | Every PR |
| **G** | Golden file | Vitest snapshot (lineage snapshot, backup format) | Every PR; diffs reviewed |
| **D** | Data check | `pnpm vault:check` / build report | Every PR |
| **C** | Component | Vitest + Testing Library (jsdom) | Every PR |
| **E** | E2E | Playwright, `apps/web/e2e/`. Chromium + fake camera ([camera-fixtures.md](camera-fixtures.md)); WebKit for layout | Every PR |
| **EV** | Eval | `pnpm eval:scan` on `data/eval` (T-012) | Every PR (fast mode) |
| **M** | Manual device | [device-matrix.md](device-matrix.md) checklist on real phones | Per release, plus the tasks that say so |
| **H** | Hallway test | 5 people, the 3 core flows (docs/08 "How we check it"), script from T-021 | Before launch |
| **R** | Review | reviewer agent plus a human, against docs/09 checklist / docs/08 quality bar | Each user-facing task |

## 1. Must items (docs/02) → tests

Every Must item maps to at least one automated test (U/C/D/E/EV) plus manual or review coverage where
automation can't reach (real camera, real share sheet, real install).

### Scanning

| # | Must item | Tests | Task |
| --- | --- | --- | --- |
| M-01 | Camera viewport with reticle | **C** viewport renders reticle at ≈ 80% width; **E** fake camera `blank` fixture → `live` state, `<video>` playing, reticle visible; **M** viewport on iPhone + Android | T-009 |
| M-02 | Torch toggle where supported | **C** with `CameraService` fake: `torch` capability → button shown and calls `setTorch`; absent → no button in DOM; **E** fake camera has no torch capability (verified: Chromium fake device reports none) → button absent; **M** Android torch on/off, iPhone hidden or working | T-009 |
| M-03 | Permission-priming screen | **E** init-script spy on `getUserMedia`: zero calls until the priming CTA is tapped; **E** priming copy says photos stay on the phone; **M** real browser prompt appears only after priming | T-009 |
| M-04 | Live barcode + QR decoding (Auto) | **U** stability gate (2 of 3 frames, alternating values never accept); **E** `qr-deeplink`, `upc-a-unknown`, `ean-13-unknown` fixtures decode in Auto; `qr-flicker` never accepts; **M** iPhone polyfill path decodes UPC-A + QR ≤ 300 ms | T-010 |
| M-05 | Tap-to-read OCR (Text) | **U** `parseLabelText` (≥ 15 messy outputs); **EV** top-1/top-3/false-accept; **E** shutter → fake `OcrEngine` output → result (fast, every PR); **E** `label-happy` fixture through real Tesseract (slow, tagged `@slow`); **M** warm OCR ≤ 1200 ms on Android reference device | T-011, T-012 |
| M-06 | Mode control Auto / Text / Barcode / QR, Auto default | **C** default is Auto; **E** switch to Barcode, reload → still Barcode (persisted); QR mode ignores a UPC fixture; Barcode mode ignores a QR fixture; Text mode doesn't auto-detect | T-009 |
| M-07 | Manual search, one tap from scanner | **E** from `/scan`, one tap → `/search` with focused input; **E** keyboard-only path; **C** results announced via `aria-live` | T-009 (button), T-014 |

### Identification

| # | Must item | Tests | Task |
| --- | --- | --- | --- |
| M-08 | Normalization + fuzzy matching on names **and aliases** | **U** T-008 list (exact, alias `GG4`, `#`, OCR confusions, wrapped names, brand noise, similar strains, gibberish); **U** property test: no id outside the index; **U** perf: 5k entries × 50 candidates < 20 ms; **EV** | T-008, T-012 |
| M-09 | Decision rule: accept / "Which one?" / no match | **U** boundary tests at exactly 0.90, 0.8999, gap 0.15 vs 0.1499, 0.60 vs 0.5999; **U** each camera fixture's text pinned to its expected decision (see camera-fixtures.md); **E** choose and no-match paths with fake OCR output; **EV** false-accept < 1%; **H** | T-008, T-014, T-012 |
| M-10 | Package facts: label claim, THC %, CBD % | **U** `parseLabelText` potency forms (`THC 24.1%`, `Total THC: 24.1 %`, `THCa 27%`, `<LOQ`, `CBD <1%`); **C** facts render only those present (0, 1, all); **E** `label-happy` → THC shown with tabular figures | T-011, T-013 |
| M-11 | QR: our deep link → result; other URL → `qr_payload` + slug candidates | **U** `classifyQr`: own deep link, COA-style, other URL, plain text, malformed URL, our domain with an unknown id; **E** `qr-deeplink` → `/s/<id>`; **E** `qr-other-url` → `qr_payload` stored on save, slug matched | T-010 |
| M-12 | Barcode: decode, store, local memory after confirm | **U** `classifyBarcode` valid/invalid check digits (unit only: decoders reject bad check digits before we see them); **U** `BarcodeMemoryRepository` fake + Dexie; **E** `upc-a-unknown` → "unknown barcode" → search → pick → rescan same fixture → direct result | T-010, T-014 |

### Result

| # | Must item | Tests | Task |
| --- | --- | --- | --- |
| M-13 | Classification hero: label + meter + confidence | **U** lineage engine (docs/05 required tests, worked example); **C** `ClassificationMeter` at 0/20/21/50/79/80/100/null (null → "Unknown lineage", never 50/50); **C** `ConfidenceChip` all 4 copies, tap explains; **E** `/s/<seed-id>` renders label from built data; **R** text not color alone | T-005, T-004, T-013 |
| M-14 | "How we know": expandable family tree with sources | **U** `explainLineage` depth 3, unknown parents; **C** collapsed by default, "Unknown parent" rows, source count; **E** expand on `/s/<seed-id>`, link to `/about#classification` resolves | T-005, T-013 |
| M-15 | "Package says X" when the package disagrees | **C** differs → callout; same → none; `package_says` null → none; **E** `label-disagree` fixture → callout shows both words | T-013 |
| M-16 | Dynamic tags only from verified data, 0..n | **D** build strips unsourced tags (T-006 fixture); **C** `TagList` 0/1/4/8/9/12 (0 → `null`, > 8 → "+N more"); **C** all facets empty → no tags section; **E** a zero-tag seed strain has no tags heading in the DOM | T-003, T-006, T-004, T-013 |
| M-17 | Compliance footer (effects vary, start low) | **C** footer on ResultSheet in every state; **E** footer present on `/s/:id` and `/scan/result`; **R** docs/09 checklist | T-013, T-017 |

### Journal, sharing, backup

| # | Must item | Tests | Task |
| --- | --- | --- | --- |
| M-18 | Save to journal; list, view, delete, rating, notes | **U** `JournalRepository` fake + Dexie (fake-indexeddb), migrations; **E** scan → save → in list → rate → reload → still there → delete; **E** unidentified scan listed and labeled; **E** empty journal state | T-015 |
| M-19 | Share link `/s/<id>` via Web Share, copy fallback | **U** shared URL contains only the strain id (no rating, notes, scan data); **E** desktop: `navigator.share` absent → copy + toast (clipboard permission granted in context); **E** stubbed `navigator.share` receives `{title, url}`; **M** Android + iPhone share sheet opens | T-016 |
| M-20 | Backup download + restore | **U** round trip journal → backup → erase → restore = identical; merge: duplicate ids, newer wins, invalid records reported, wrong file rejected; **G** backup format; **E** download (`page.waitForEvent("download")`, filename `flowerscan-backup-YYYY-MM-DD.json`) → erase → restore via `setInputFiles` → summary → journal restored; **M** iPhone Safari download lands in Files and restores from Files | T-016 |

### Data

| # | Must item | Tests | Task |
| --- | --- | --- | --- |
| M-21 | Vault → validated, compiled JSON | **U** `parseNote`, link resolution; **D** each error fixture exits 1 with file + field; **U** deterministic build (byte-identical hash) | T-006 |
| M-22 | Seed dataset with sources (150–300 at launch) | **D** `vault:check` green, every `parents`/`reported_type` sourced; **G** lineage snapshot committed; **R** founder marks each note `verified`/`disputed` (human only); launch gate: build report count ≥ 150 | T-007, T-019 |
| M-23 | Effects taxonomy v1, no medical terms | **U** banned term in a description fails; synonyms and `replaced_by` resolve; **D** build fails on a banned term; **E** banned-term scan of rendered text on every route (cross-cutting X-03) | T-003 |

### Platform

| # | Must item | Tests | Task |
| --- | --- | --- | --- |
| M-24 | 21+ age gate | **E** first visit to each route (`/`, `/scan`, `/s/<id>`, `/journal`, `/search`) → gate; [I'm 21+] → original route (deep link preserved); reload → no gate; [Leave] → not the app; **C** age comes from the single constant; **R** | T-017 |
| M-25 | Privacy page, about / "how classification works" | **E** `/about` renders the sections, `#classification` anchor works, reachable from the result; **R** plain-language privacy copy matches actual behavior (cross-check X-01) | T-017 |
| M-26 | PWA: installable, shell + strain data offline | **E** after first load and SW `activated`: `context.setOffline(true)` → reload → shell + `/s/<id>` + search work; OCR-not-cached copy shown on shutter; **E** manifest fields + maskable icon present; Lighthouse CI installable; **M** airplane mode on both phones; install on both phones | T-018 |
| M-27 | Deployed on Vercel at a real domain over HTTPS | **E** smoke against the preview/production URL; headers check (CSP, `Permissions-Policy: camera=(self)`, HSTS, Referrer-Policy); **M** device checklist runs against the production URL | T-019 |

## 2. docs/08 flows and states → tests

| # | Flow / state (docs/08) | Tests | Task |
| --- | --- | --- | --- |
| F-01 | **Age gate** on first visit, remembered | M-24 | T-017 |
| F-02 | **Deep link on first visit** → gate → original deep link | **E** `/s/<id>` in a fresh context → gate → `/s/<id>` with the result | T-017 |
| F-03 | **Intro card** (one, skippable) | **E** shown once on first run, Skip works, not shown after reload | T-017 |
| F-04 | **Camera priming** → browser prompt | M-03 | T-009 |
| F-05 | **Permission denied** → manual search + re-enable how-to | **E** init script makes `getUserMedia` reject with `NotAllowedError` (and `permissions.query` return `denied`) → search route + how-to; **M** real deny on iPhone + Android, then re-enable using the in-app instructions | T-009 |
| F-06 | **Happy path, barcode/QR lock-on** → haptic → result sheet | **E** `qr-deeplink` → lock-on class/state → result; `navigator.vibrate` stub called once (10 ms) where present; **M** feel of lock-on and haptic on Android | T-010, T-013 |
| F-07 | **Happy path, shutter** → freeze + "Reading label…" shimmer (≤ 1.5 s) → result | **E** fake OCR with a 1 s delay: shimmer visible, no spinner; result appears; **M** timing on device | T-009, T-011 |
| F-08 | **Result sheet**: hero, chip, package-says, facts, tags, How we know, actions, footer | M-13 to M-17; **E** drag up to full screen, swipe down to dismiss, browser back closes the sheet | T-013 |
| F-09 | **Confidence chip** variants: Lineage traced / Partly traced / Breeder's label / Unknown lineage | **C** each `method` + level → copy; tap → one-sentence explanation | T-004, T-013 |
| F-10 | **Unknown lineage** | **C** meter null → "Unknown lineage", gray, `?` icon, no percentage; **E** a seed strain with `unknown` lineage shows no number anywhere | T-013 |
| F-11 | **Zero tags** | M-16 (section absent from the DOM, not just hidden) | T-013 |
| F-12 | **Close call** "Which one?" ≤ 3 candidates + None of these | **E** `label-close-call` (or fake OCR text) → sheet with ≤ 3 rows, each with name, breeder if any, mini pill; pick → result; with a barcode → memory written; "None of these" → editable text / search; **H** | T-014 |
| F-13 | **No match** | **E** `label-no-match` → "We couldn't find a strain in that label.", editable text, [Search] [Try again]; **no** classification, meter, or tags in the DOM; edit text → re-match; [Save anyway] → unidentified scan with facts; **H** | T-014 |
| F-14 | **Offline** shell + data; OCR not cached message | M-26 | T-018 |
| F-15 | **Unknown strain id** deep link → friendly 404 with search | **E** `/s/does-not-exist` → 404 copy + search, no classification | T-013 |
| F-16 | **Journal** list / detail / empty / unidentified | M-18 | T-015 |
| F-17 | **Settings**: theme, haptics, default mode, backup/restore, erase all | **E** each setting persists across reload; erase all (with confirmation) clears journal, barcode memory, settings, caches → age gate shows again | T-015, T-016, T-017 |
| F-18 | **Restore from backup** | M-20; **E** invalid file → clear message, nothing changed; partial rejects listed | T-016 |
| F-19 | **Every screen's loading / empty / error / offline / permission-denied states** | **C** per screen; **E** skeletons, never spinners for < 1 s; design review per T-021 spec | each screen task |
| F-20 | **Navigation**: bottom tab bar (Scan, Journal, Settings), back always works | **E** tabs on every top-level route; browser back from result, sheet, search returns to the previous screen | T-017 |
| F-21 | **Share** | M-19 | T-016 |
| F-22 | **Hallway test** of scan → result, close call, no match | **H** 5 people, task success + time; fix anything 2+ stumble on | script: T-021; run: **unowned** (see gaps) |

## 3. Cross-cutting checks (automated wherever possible)

| # | Rule | How | Task |
| --- | --- | --- | --- |
| X-01 | **Privacy:** nothing leaves the device (images, OCR text, scans, barcodes) | **E** a shared `networkGuard` fixture on every e2e test: records every request; fails on any cross-origin request, any non-GET to our origin, any request body or URL containing a barcode value, OCR text, or `data:image` / image MIME. Allow-list only the analytics endpoint (if Q9 adds one) with payload keys `event, method, outcome, latency_bucket` | T-009 adds the fixture; every feature task uses it |
| X-02 | **No filler**: no invented values, no default 50/50, no "N/A" | **E** `noFiller` assertion on every rendered result: page text has no `N/A`, `undefined`, `null`, `NaN`, `[object`, `TBD`, `Lorem`; unknown lineage shows no `%`; **C** state matrix; **R** each value traces to data or scan | T-013, reviewer |
| X-03 | **No medical wording / hedged effects** | **E** collect `innerText` of every route and every result state; run `assertNoBannedTerms` (core, T-003) over it; **U** on all `copy.ts` files; **R** docs/09 checklist | T-003, T-017 |
| X-04 | **Accessibility (WCAG 2.2 AA)** | **E** `@axe-core/playwright` scan on each route and sheet state (new dev dep, justify in the task that adds it); **E** keyboard-only path: search → result → share; focus trapped in sheets and returned on close; **E** `emulateMedia({ reducedMotion: "reduce" })` → no transform animations (crossfades only); **E** 200% text zoom (root `font-size: 200%` and a 320 px viewport) → no clipped hero text, no horizontal scroll; **E** touch targets: every interactive element ≥ 48×48 px, shutter ≥ 72 px; **M** VoiceOver + TalkBack pass | T-004, T-013, T-014, T-017 |
| X-05 | **Contrast** | **C/E** axe color-contrast rule in dark and light themes; T-004 lists measured pairs | T-004 |
| X-06 | **Performance budgets** (docs/10, docs/06) | **CI** bundle size check (scanner route ≤ 170 KB gz, data ≤ 1 MB gz); **E** OCR assets absent from the initial-load network log; Lighthouse CI mobile ≥ 90, LCP ≤ 2.0 s, CLS ≤ 0.1; **E** match + decide ≤ 50 ms via `performance.measure`; **M** stage budgets on the Android reference device (camera ready ≤ 800 ms, detect ≤ 300 ms, OCR ≤ 1200 ms, result ≤ 100 ms, INP ≤ 200 ms) | T-018, T-009, T-010, T-011 |
| X-07 | **Safe areas, one-thumb layout** | **E** WebKit iPhone project: primary actions in the bottom 40% of the viewport; **M** notch/home-indicator overlap on iPhone, installed PWA | T-004, T-017 |
| X-08 | **Data versioning**: journal snapshots survive a data update | **E** save with data v1 → load v2 build → journal entry still shows the v1 lineage | T-015 |
| X-09 | **Update flow** never hot-swaps mid-scan | **E** new SW waiting during `processing` → no reload; toast after | T-018 |

## 4. E2E harness conventions

The scaffold has one project (`mobile-chromium`, Pixel 7) and one smoke test. Feature tasks extend it like this,
so tests stay consistent:

- **Projects:** `mobile-chromium` (Pixel 7, default, all camera tests), `mobile-webkit` (iPhone 15, layout and
  safe-area tests only; WebKit has no fake camera), `desktop-chromium` and `desktop-firefox` (search, deep links,
  keyboard, share fallback). docs/10 already expects WebKit for layout. The first UI task (T-004 or T-013) adds it.
- **Helpers** in `apps/web/e2e/support/`: `fakeCamera(fixtureName)` (launch args, see camera-fixtures.md),
  `denyCamera()` / `noCamera()` / `cameraInUse()` (init scripts rejecting with `NotAllowedError` /
  `NotFoundError` / `NotReadableError`), `confirmAge()` (clicks through the gate once, then saves
  `storageState` with `indexedDB: true`), `networkGuard` (auto fixture, X-01), `noFiller(page)` (X-02),
  `fakeOcr(lines)` (injects canned `OcrEngine` output through the dev-only engine switch the scanner tasks provide).
- **Tags:** `@slow` for real-Tesseract runs (excluded on PRs, run nightly or before release), `@camera` for
  fake-camera specs.
- **Local gotcha:** `reuseExistingServer` is on outside CI. If `pnpm preview` is already running from an old build,
  `pnpm test:e2e` tests that stale build. Stop it first, or run with `CI=1`.

## 5. Coverage gaps: unspecified or untestable

Things the specs don't define, so no one can write a pass/fail test yet. Each needs an owner decision
(spec author or founder). Listed here, not guessed.

1. **Camera failure states other than "denied"** aren't specified: no camera (`NotFoundError`), camera in use
   by another app (`NotReadableError`), `getUserMedia` missing (in-app browsers such as Instagram/Facebook
   webviews, old browsers), and an insecure context. docs/08 "States" requires a permission-denied state but
   defines nothing for these. Proposal: treat them all like "denied" (go to search) with cause-specific copy. → T-021/T-009.
2. **Age gate [Leave]**: the destination and the "under 21" behavior (re-ask? block for the session?) are
   unspecified. → T-021/T-017.
3. **"Our domain" for deep-link QR** depends on Q8/Q11. `classifyQr` must take the origin as config so tests can
   use `https://localhost:4173` and preview URLs. → T-010.
4. **Unknown-barcode screen** ("offer text scan or search", docs/06 §3) has no UX flow in docs/08. → T-021.
5. **Disputed lineage**: docs/04 says the UI shows "lineage disputed", but docs/08 lists only 4 confidence-chip
   variants. → T-021/T-013.
6. **Several codes in view** (a UPC and a QR on the same package is common): which one wins in Auto is unspecified. → T-010.
7. **OCR failure or slowness**: OCR > 1.5 s, the worker crashing, or the language-data download failing while
   *online*. Only the offline copy is defined. → T-011/T-018.
8. **Storage unavailable or full**: IndexedDB blocked (private browsing), quota exceeded on save,
   `storage.persist()` refused. No copy or behavior is defined. → T-015.
9. **The "mid-range Android, 4G" reference device isn't named**, so budget numbers from different tasks can't be
   compared. Proposal in [device-matrix.md](device-matrix.md#reference-devices). → tech lead.
10. **No on-device timing instrumentation is specified.** iOS remote inspection needs a Mac, and the dev machine
    is Windows, so stage budgets on iPhone can only be read from an in-app readout. Proposal: standard
    `performance.mark` names (`camera:request`, `camera:ready`, `detect:accept`, `ocr:start`, `ocr:end`,
    `decide:end`, `result:visible`) plus a dev-only `?debug=perf` overlay. → T-009/T-018.
11. **Installed PWA and offline can't be tested on the dev server**: service workers refuse self-signed
    certificates, so "Add to Home Screen" and airplane mode need a Vercel preview URL (Q8) or a locally trusted CA
    (mkcert root installed on the phone). → T-018/T-019.
12. **Hallway test has a script (T-021) but no task that runs it** and records results. → needs a task before launch.
13. **Intro card persistence** (shown once, or until dismissed?) and **landscape orientation** behavior are
    unspecified. → T-021.
14. **iOS standalone PWA camera permission**: iOS may ask again on each launch of an installed PWA. The UX for
    repeated prompts is unspecified. Check it in the first device pass and decide. → T-009.
