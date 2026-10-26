# Device Matrix & Manual Release Checklist

Real-device testing needs a human with phones. Automated coverage is in [test-plan.md](test-plan.md). The
printable test cards are in [camera-fixtures.md](camera-fixtures.md#printable-test-cards-for-real-devices).

## Reference devices

| Tier | Device | Browser / mode | Why | Status |
| --- | --- | --- | --- | --- |
| **Must** | Recent iPhone (iPhone 13 or newer), current iOS | Safari tab **and** installed PWA (Add to Home Screen) | No native `BarcodeDetector` on iOS, so this is the zxing polyfill path (docs/06). Standalone PWA camera behavior differs from Safari tabs | Model to be recorded |
| **Must** | **Android performance reference**: one named mid-range phone (proposal: Samsung Galaxy A54/A55 or Pixel 7a class) | Chrome (current), tab **and** installed PWA | docs/10 and docs/06 budgets say "mid-range Android". Without a named device, numbers from different tasks can't be compared | **Tech lead picks and records it here** |
| **Must** | Desktop Chrome (Windows dev machine) and Firefox | Browser | Search, deep links, keyboard path, share fallback (copy link) | Available |
| Should | Desktop Safari (macOS) | Browser | Deep links and layout in real WebKit. Needs a Mac; until then Playwright WebKit stands in | Needs a Mac |
| Should | Small iPhone (SE 2nd/3rd gen, 375 pt wide) | Safari | Narrowest layout, result sheet at 200% text size | Optional |
| Should | Samsung Internet on the Android reference phone | Browser | Large Android share in the US | Optional |

Record each device once (model, OS version, browser version) in the table above. Re-record when the OS major
version changes.

**What the dev server can't test.** `pnpm dev` uses a self-signed certificate. Pages, the camera, and
`getUserMedia` work once the warning is accepted, but **service workers refuse untrusted certificates**. Installing
the PWA and running offline/airplane-mode checks need a Vercel preview URL (Q8) or a locally trusted CA (mkcert
root installed on the phone). Until one exists, skip sections B3 and C6 and record "skipped: no trusted origin".

## Per-release checklist (≤ 20 minutes)

Run against the release-candidate URL (preview or production). Timeboxes add up to 20 minutes. If a step fails,
note it and keep going; file bugs afterwards (`tasks/backlog/T-NNN-bug-<slug>.md`).

**You need:** both phones charged, the printed test cards (`qr-deeplink`, `upc-a-unknown`, `label-happy`,
`label-close-call`, `label-no-match`), a desk lamp for "dim", a glossy surface or a card in a plastic sleeve
for "glare", and the timing readout. Until the `?debug=perf` overlay exists (test-plan gap 10), screen-record at
60 fps and count frames.

Lighting conditions used below: **Bright** = office or daylight. **Dim** = room lights off, one lamp about 2 m
away (dispensary-like). **Glare** = glossy card under an overhead light at about 30°.

### 0. Setup (2 min)
- [ ] Clear site data on both phones (iPhone: Settings → Apps → Safari → Advanced → Website Data; Android: Chrome → Site settings → All sites → Clear). Remove any installed FlowerScan icon.
- [ ] Note the build/version shown in `/about` (or the commit SHA) and the URL under test.

### A. iPhone, Safari tab (6 min)
- [ ] **A1 Deep link + age gate:** open `<url>/s/<seed-id>` fresh → age gate → [I'm 21+] → that strain's result (not the home screen).
- [ ] **A2 Priming + permission:** go to Scan → priming screen *before* the system prompt → Allow → live viewport. Camera ready ≤ 800 ms (performance reference only; just note the time on iPhone).
- [ ] **A3 Bright, codes:** QR card → lock-on → result. UPC card → "unknown barcode" → search → pick the strain → scan the same UPC again → direct result (barcode memory). Note the QR and UPC detect times (budget ≤ 300 ms).
- [ ] **A4 Dim, text:** shutter on `label-happy` → "Reading label…" shimmer, no spinner → result ≤ 1.5 s. Then `label-no-match` → no-match screen with the read text and **no** classification.
- [ ] **A5 Torch:** the button is hidden, or (if iOS exposes torch) it turns the light on and off.
- [ ] **A6 Save + share:** Save → appears in Journal → Share link → iOS share sheet opens with a `/s/<id>` URL.
- [ ] **A7 Permission denied:** aA menu → Website Settings → Camera → Deny → reload Scan → manual search plus re-enable instructions. Follow the instructions in the app: they must actually work.

### B. iPhone, installed PWA (3 min)
- [ ] **B1 Install:** Share → Add to Home Screen → launch. Standalone (no Safari bars), correct icon and splash, nothing under the notch or home indicator.
- [ ] **B2 Camera in standalone:** go to Scan. Record whether iOS asks for the camera again, and whether it asks again after force-quit and relaunch (test-plan gap 14).
- [ ] **B3 Offline:** airplane mode → relaunch → app shell loads → search → result; QR card → result; shutter shows the "Text reading needs a one-time download…" copy (or works, if OCR was used before).
- [ ] **B4 Backup:** Settings → Download backup → the file lands in Files → Erase all data → Restore from that file → the summary matches and the journal is back.

### C. Android reference phone, Chrome (6 min)
- [ ] **C1 First run:** age gate → intro card (skip) → priming → Allow. Camera ready ≤ 800 ms.
- [ ] **C2 Bright, codes:** QR and UPC cards. Detect ≤ 300 ms each; a haptic tick on lock-on.
- [ ] **C3 Dim + torch:** torch on → off → on (toggle works, icon state matches). Shutter on `label-happy` twice; the **second** (warm) OCR ≤ 1200 ms; extract + match + decide ≤ 50 ms; result visible ≤ 100 ms after the decision.
- [ ] **C4 Glare, close call:** `label-close-call` under glare → "Which one?" sheet with ≤ 3 candidates → pick one → result. Swipe down dismisses the sheet; the system back gesture goes back, it doesn't exit the app.
- [ ] **C5 Permission denied:** lock/tune icon → Permissions → Camera → Block → reload → search plus re-enable instructions → follow them → the camera works again.
- [ ] **C6 Install + offline + share:** Install app → launch standalone → airplane mode → search → result. Turn the network back on → Share link → Android share sheet.

### D. Desktop (2 min)
- [ ] **D1 Chrome:** deep link `/s/<seed-id>` → age gate → result. Keyboard only: Tab to search, type, Enter, Tab to Share → the link is copied with a toast (no share sheet). Focus is visible on every step.
- [ ] **D2 Firefox:** the same deep link and search by keyboard.

### E. Record (1 min)
Append to the release task's Log (or `docs/launch-checklist.md` at launch):

```
YYYY-MM-DD · <tester> · build <sha/version> · <url>
iPhone <model>, iOS <x.y>, Safari: A1 ✓ A2 ✓ (cam 640 ms) A3 ✓ (QR 210 ms, UPC 280 ms) A4 ✓ … B2: re-prompted on relaunch (yes/no)
Android <model>, Android <x>, Chrome <v>: C1 ✓ (cam 520 ms) … C3 OCR warm 980 ms
Desktop: D1 ✓ D2 ✓
Bugs: T-0NN, T-0NN
```

### Extended pass (major releases and launch only, about 30 min more)
Not part of the 20-minute run:
- VoiceOver (iPhone) and TalkBack (Android): scanner controls are labeled, detections and results are announced, focus moves into and out of sheets.
- iOS Text Size at max / Android font size 200%: the result sheet doesn't clip, no horizontal scroll.
- Reduce Motion on: crossfades, no springs.
- Light theme (Should) on both phones.
- A 10-minute scanning session on Android: no thermal throttling warnings, the stream pauses when the tab is hidden (switch apps and back), battery drain noted.
- Lighthouse (mobile) on the production URL from desktop Chrome: performance ≥ 90, LCP ≤ 2.0 s, CLS ≤ 0.1.

---

## First phone check (today, about 5 minutes)

This closes the open box in T-001 and T-024. Only the blank app shell exists right now, so this checks that a
phone can reach the dev server over HTTPS. The camera comes with T-009.

1. **On the PC**, from the repo root (`G:\Projects\FlowerScan`), run:
   ```
   pnpm dev
   ```
   Vite prints two URLs. Copy the **Network** one, for example `https://192.168.1.23:5173/`.
2. **Windows Firewall:** if it asks about Node.js, allow it on **Private networks** only. The Wi-Fi profile on
   the PC must be "Private" (Settings → Network & internet → Wi-Fi → your network → Private network).
3. **On the phone:** join the **same Wi-Fi** as the PC. Not a guest network (they often block device-to-device
   traffic). Turn off any VPN. Don't use mobile data.
4. Open the Network URL in **Safari** (iPhone) or **Chrome** (Android). Type the full `https://…:5173` URL.
5. **Accept the certificate warning** (expected: the certificate is self-signed):
   - iPhone Safari: **Show Details** → **visit this website** → **Visit Website**.
   - Android Chrome: **Advanced** → **Proceed to 192.168.x.x (unsafe)**.
6. **Pass if** the page shows the **FlowerScan** heading, and the address bar shows `https` (with a "Not secure"
   badge, which is expected with a self-signed certificate).
7. If you have both phone types, repeat on the other one.

**If it doesn't load:** check that the IP in the URL is the PC's current Wi-Fi IP (`ipconfig` → Wireless LAN
adapter → IPv4); that the firewall rule allows Node on Private; that the router doesn't have "AP/client
isolation" turned on; and that `pnpm dev` is still running. Then try again.

**Record the result** in `tasks/active/T-024-test-plan-and-device-matrix.md` → Log (and the open box in
`tasks/done/T-001-scaffold-workspace.md`):

```
YYYY-MM-DD · tech lead · first phone check
<phone model>, <iOS/Android version>, <Safari/Chrome version> → <Network URL> → PASS / FAIL
Notes: <cert warning wording, anything odd>
```
