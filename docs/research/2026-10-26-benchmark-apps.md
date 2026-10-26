# Benchmark teardown: "point at it, get an answer" apps

- **Task:** T-020 · **Author:** researcher · **Date:** 2026-10-26 · **For:** product-designer (T-021)
- **Method:** desk research only. Official app-store listings, help centers, company blogs, and one public
  strain page. I did not install the apps, sign in, or capture screenshots. Anything a source did not state
  is marked **unknown**, with a hands-on check listed at the end.

## Question

What makes the best camera-to-answer apps (Vivino, Yuka, Shazam, Google Lens) feel fast, trustworthy, and fun?
What do cannabis strain and dispensary apps do that FlowerScan should avoid?

## Short answer

- **Speed comes from fewer steps, not only faster code.** The leaders open on the capture surface and make one
  control dominant: Shazam's single button, Lens's shutter. They also detect on their own where they can, like
  Auto Shazam. Results get saved to history without the user asking.
- **Trust comes from showing the parts behind the verdict.** Yuka publishes its scoring weights and shows
  per-ingredient risk dots. Leafly labels effects as reviewer-reported, with counts. The cannabis apps fail in
  the same way: the type badge and THC number appear with no source or method.
- **Uncertainty gets handled with candidates and a way to contribute, not with a confidence number.** Vivino
  offers close alternatives and manual identification. Yuka and Leafly invite missing-product or
  missing-strain submissions. None of the apps reviewed shows a numeric confidence. FlowerScan's confidence
  chip would be unusual in this space.
- **Cannabis apps are commerce-first and badge-first.** Leafly's strain page shows the type label in the first
  block and the genetics around the 16th of about 20 blocks, with shop modules in between. It also shows
  "conditions" percentages, which are medical-adjacent. Scan-style cannabis apps guess the strain from a photo
  of the bud, put effects behind a paywall, and promise accuracy that "will improve."
- **Recommendation:** adopt the 10 patterns below and treat the 5 anti-patterns as review blockers. The
  trade-off: an answer with sources and candidates is a little slower to read than a bare badge. Keep the hero
  as simple as a badge and keep the proof one tap away.

## Findings

Dates: "listing accessed 2026-10-26" means the App Store page shows a version date without a year. Sources more
than 18 months old are marked **[old]**.

### Vivino (wine label → rating)
| Aspect | What the sources say |
| --- | --- |
| First run | **Unknown.** The privacy section lists name, email, and identifiers, which suggests accounts ([App Store](https://apps.apple.com/us/app/vivino-buy-the-right-wine/id414461255), accessed 2026-10-26). The "Match for You" verdict unlocks after you rate 5 wines, so personalization is earned gradually ([vivino.com/app](https://www.vivino.com/app), undated, accessed 2026-10-26). |
| Scan → answer | Take a photo of a label. It also scans restaurant wine lists, and the newest version adds a **Shelf Scanner** that recognizes several bottles in one photo (App Store, v2026.43.0). Historically, label matching used image recognition and wine lists used OCR, with results expected "in seconds" ([diginomica](https://diginomica.com/2016/02/26/uncorking-wine-information-with-ocr-technology-at-vivino/), 2016-02-25 **[old]**). |
| Result layout | Rating and reviews, tasting notes, food pairings, a thumbs-up/down "Match for You," and whether you can buy it on Vivino (vivino.com/app; App Store). |
| Confidence / uncertainty | No confidence shown. Reviewers report it often hands you a short list of close alternatives to pick from, and that vintages sometimes need correcting (Jancis Robinson reviews, 2015–2016, seen only as search excerpts **[old]**). |
| Failure states | Older listing text, seen only in a search excerpt **[old]**: labels it can't recognize get identified manually by Vivino's team, and offline scans are kept and resumed when you reconnect. **Current behavior unknown.** |
| Delight | Multi-bottle shelf scan; a personal match verdict. |
| Avoid | Shopping woven into the answer; a confident result with a wrong detail (vintage). |

### Yuka (barcode → health score)
| Aspect | What the sources say |
| --- | --- |
| First run | **Unknown.** Accounts exist (the terms cover account rules), but the sources don't say whether scanning needs one ([Yuka terms, EU/UK](https://help.yuka.io/l/en/article/nui6tegnjw), "updated 3 weeks ago," accessed 2026-10-26). |
| Scan → answer | Scan a barcode and get a score with a detail sheet that explains how it was reached. A color code in history shows each product's rating at a glance ([yuka.io/en/app](https://yuka.io/en/app), undated, accessed 2026-10-26). |
| Result layout | Score out of 100. The food score weighs nutrition (Nutri-Score) at 60%, additives at 30%, and organic at 10%. A high-risk additive caps the score at 49. Each additive gets one of 4 risk dots (green/yellow/orange/red), and the scientific sources are viewable in the app ([Yuka help: how food is rated](https://help.yuka.io/l/en/article/ijzgfvi1jq), "updated 3 months ago," accessed 2026-10-26). Poorly rated products get suggested alternatives ([App Store](https://apps.apple.com/us/app/yuka-food-cosmetic-scanner/id1092799236), v5.8 "New Liquid Glass design," accessed 2026-10-26). |
| Confidence / uncertainty | No per-scan confidence. Trust rests on a published method plus an independence claim: no brand funding, no ads (yuka.io/en/app; App Store). The exact score bands vary between third-party sources, so the band cut-offs are **unconfirmed** from a primary source. |
| Failure states | Products not in the database can be contributed with your own packaging photos, and food data may go to Open Food Facts (Yuka terms). An App Store review says the app prompts you to enter missing products (single anecdote). |
| Delight | A color-coded history; "here's a better one" alternatives. |
| Avoid | Search-by-name and offline mode are **Premium-only** ([Yuka help: financing](https://help.yuka.io/l/en/article/zrgtb8f2ka), "updated 4 months ago," accessed 2026-10-26). For FlowerScan those are core recovery paths and must stay free. Also avoid one opaque number: Yuka's organic bonus has drawn criticism from nutritionists (search excerpt only). |

### Shazam (one button → song)
| Aspect | What the sources say |
| --- | --- |
| First run | **Unknown** from official sources. |
| Scan → answer | Tap the Shazam button, or touch and hold the home-screen icon to start. Touch and hold the in-app button to turn on **Auto Shazam**, which keeps identifying in the background ([Apple Shazam guide: identify a song](https://support.apple.com/guide/shazam/dev9748744b6/web), undated, © 2026). |
| Result layout | The track screen opens and the song is **saved automatically**. The artist's top songs and concerts appear below, with streaming links and synced lyrics (same guide; [App Store](https://apps.apple.com/us/app/shazam-find-music-concerts/id284993459), v27.2, accessed 2026-10-26). |
| Confidence / uncertainty | None shown. The answer is presented as a match or no match. |
| Failure states | Offline: the request is held, then identified and added to your library once you're back online, with an optional notification ([Apple Shazam guide: offline](https://support.apple.com/guide/shazam/devad6c028a7/web), undated, © 2026). **The no-match screen is not documented (unknown).** |
| Delight | One giant control; zero-effort history; offline queueing. v27.2 adapts to any orientation (App Store). |
| Avoid | Nothing major for us. A match/no-match model only works because audio fingerprints are near-binary. Strain identity from label text is not. |

### Google Lens (camera-first visual search)
| Aspect | What the sources say |
| --- | --- |
| First run | **Unknown.** |
| Scan → answer | Open the camera, then tap the shutter. **Hold the shutter to ask a question** by voice or text ([search.google: Lens](https://search.google/ways-to-search/lens/), undated, accessed 2026-10-26). Tapping a non-text area opens "select part of the image" with an adjustable crop, and a viewfinder chip lets you go back and search again ([9to5Google](https://9to5google.com/2021/07/02/google-lens-tweaks/), 2021-07-02 **[old]**). |
| Result layout | An AI Overview comes first, then links ([Google blog: Lens tips](https://blog.google/products-and-platforms/products/search/google-lens-tips-2025/), 2025-01-07). Action chips (copy text, translate) sit above a bottom sheet of results (9to5Google 2021 **[old]**). In AI Mode, the image is split into objects and several searches run at once ([Google blog: multimodal AI Mode](https://blog.google/products/search/ai-mode-multimodal-search/), April 2025, seen via search excerpt). |
| Confidence / uncertainty | It shows several results rather than one verdict. An unreleased "Live" mode was labeled experimental, with a "can make mistakes" warning ([9to5Google teardown](https://9to5google.com/2025/05/05/google-ai-mode-live-lens-teardown/), 2025-05-05, search excerpt). |
| Failure states | **Unknown.** |
| Delight | Tap-to-select a region; hold-to-ask. |
| Avoid | Letting a generated summary be the answer. That breaks FlowerScan's rule that the database decides. |

### Leafly (strain lookup + marketplace)
| Aspect | What the sources say |
| --- | --- |
| First run | The app is rated 18+ and lists Age Assurance controls ([App Store](https://apps.apple.com/us/app/leafly-find-weed-near-you/id416456429), v9.3.3, accessed 2026-10-26). On the web, a strain page opens with a cookie banner and a location picker ([Blue Dream page](https://www.leafly.com/strains/blue-dream), fetched 2026-10-26; reviews dated up to 2026-10-17). |
| Result layout (strain page) | Name, a **Hybrid** label, THC/CBD %, and a star rating at the top. Then top effects, flavors, and terpenes, and a long overview paragraph. Shop modules for buying similar strains come next. After that: reported effects with reporter counts, **"conditions" with percentages** (stress, anxiety, depression) plus a medical disclaimer, lab-sourced terpenes, then **genetics (parents/children) around the 16th of about 20 blocks**, and grow info. |
| Confidence / uncertainty | Mixed. Effects are attributed to reviewers, with counts. Terpenes are attributed to certified labs. **The type label, THC/CBD figures, average price, and grow stats show no source or method** (same page). Reviewers on Leafly's own pages note the type disagrees with retailers' labels (leafly.ca review pages, search excerpt, 2026). |
| Failure states | A "suggest a missing strain" link. Several shop modules were still showing "Loading…" placeholders when fetched. |
| Delight | Rich terpene and flavor vocabulary. |
| Avoid | An unsourced badge first and lineage buried; condition percentages (barred by our compliance rules); commerce interleaved with facts; visible loading placeholders. |

### Weedmaps (dispensary marketplace)
| Aspect | What the sources say |
| --- | --- |
| First run | Rated 18+. The description says users must be 21+ (or the local legal age) or a registered patient, but **how age is verified is not stated** ([App Store](https://apps.apple.com/us/app/id350189835), v11.147.0, accessed 2026-10-26). |
| Result layout | You browse strains by genetics label (indica/sativa/hybrid), effects, and flavors. Products have reviews. Deals, maps, delivery, and pickup ordering are the core of the app (same listing). |
| Confidence / uncertainty | No source or method shown in the listing for the genetics labels. |
| Failure states | **Unknown.** Reviews complain about stale dispensary menus and filters that don't persist (same listing). |
| Avoid | A commerce-first navigation model; deal push notifications; release notes that say nothing ("bug fixes"). |

### Camera-based cannabis apps: GREENT and Kush Scan
| Aspect | What the sources say |
| --- | --- |
| GREENT (package scan) | Two photos (front and label) go through an "AI-powered product scanner." It returns lineage, terpenes, effects, and **"potential symptom relief."** It says accuracy will improve with more data, and it uses email/password accounts. It has 4 ratings ([App Store](https://apps.apple.com/us/app/-/id6736573173), v4.3.0, history back to 2025-05-15). |
| Kush Scan (photo of bud) | From a photo of dry flower it returns a strain name, THC level, sativa/indica, the 3 most similar strains, and **effects predicted from the sativa/indica label**. It calls itself entertainment and not 100% accurate. Subscriptions start at $7.99 a week ([App Store](https://apps.apple.com/us/app/kush-scan-thc-weed-identifier/id1462406146), v1.68, accessed 2026-10-26). |
| Takeaway | This is the closest competition, and both apps are built on what FlowerScan forbids: identity guessed from an image or AI, effects inferred from a type label, and medical-adjacent copy. That gap is the positioning opportunity (interpretation). |

## Top 10 patterns to adopt

1. **Open straight onto the viewfinder with one dominant control.** (Shazam's button, Lens's shutter.) Matches docs/08.
2. **Detect on its own, and keep a manual shutter as fallback.** Barcode or QR lock-on with no tap needed. Later,
   possibly a continuous mode like Auto Shazam for budtenders.
3. **Keep a short aiming instruction on screen and coach on quality** ("Move closer," "More light"). This comes
   from Google's ML Kit barcode showcase. See the standards note.
4. **Verdict first, breakdown one tap away.** (Yuka's score plus detail sheet; Lens's overview plus links.) Our
   hero, then "How we know."
5. **Publish the method and show the parts that make up the result.** (Yuka's public weights and additive dots.)
   For us: parents, their classes, and how the percentage was derived, in plain words on /about.
6. **Put the source next to each kind of fact.** (Leafly does this for effects and terpenes only.) Do it for
   *every* fact: lineage, tags, THC read from the package.
7. **When unsure, offer candidates instead of guessing.** (Vivino's alternatives, Kush Scan's top 3, Lens's
   result list.) This is our "Which one?" sheet. Keep it to 3.
8. **Save results to history automatically or with one tap, with an at-a-glance color code.** (Shazam
   auto-saves; Yuka's history is color-coded.) Save stays opt-in per docs/08, but the journal list should show
   the classification color and icon.
9. **Never strand the user offline: queue or explain.** (Shazam and Vivino resume later.) For us this is the
   one-time OCR download message, with barcode and search still working.
10. **Make the dead end a contribution path.** (Yuka's product contributions, Leafly's suggest-a-strain,
    Vivino's manual identification.) "We don't have this strain yet" plus [Request it], sending nothing without
    opt-in.

Honorable mentions: tap-to-select a region of the frozen frame (Lens), and a plain independence statement such
as "no brand pays for results" (Yuka). The second fits open-questions Q6 (no monetization in MVP).

## Top 5 things to avoid

1. **A badge with no reasoning.** Leafly's type and THC, and Weedmaps' genetics labels, show no source or method.
   That's exactly the gap docs/01 says we fill.
2. **Guessing identity or effects.** Kush Scan works from bud photos and predicts effects from the type label.
   GREENT uses AI-written effects. Both break non-negotiable #1.
3. **Medical or condition framing.** Leafly's condition percentages and GREENT's "symptom relief" are barred by
   docs/09.
4. **Commerce, promos, or loading placeholders inside the answer.** Leafly's shop modules, Vivino's shop, and
   Weedmaps' deals. Also out of MVP scope (docs/01 non-goals).
5. **Paywalling or account-gating the recovery paths.** Yuka puts search and offline behind Premium, Kush Scan
   charges weekly, and GREENT's login fails per a review. Search, "Which one?", and offline must be free and
   need no account.

## Implications for FlowerScan

- **Our confidence chip is a differentiator, and also unproven.** None of the apps reviewed shows confidence
  per scan, so users have no learned model for it. The hallway tests in docs/08 should check that people
  understand the chip's wording (interpretation).
- **Lineage has to sit above the fold in some form.** Leafly buries it, which is the opening. Recommendation for
  T-021: a one-line lineage summary in the hero (e.g., "Blueberry × Haze") with the full tree in "How we know."
  That one line must only appear when lineage data exists.
- **Delight should live in moments, not chrome.** The memorable moments here are behaviors (lock-on, auto-save,
  an offline queue, a shelf full of bottles recognized at once), not decoration. That supports docs/08's
  "calm by default, playful in moments."
- **Package scanning is a thin field.** The only package-scan cannabis app found (GREENT) has 4 ratings and AI
  identification. A database-decides scanner has little direct competition (interpretation, based on one
  App Store search).

## Confidence

**Medium.** The listings and help pages are current (2025–2026). Vivino's failure handling and Lens's UI rest
on sources older than 18 months or on search excerpts. First-run flows and no-match screens are mostly
**unknown**, because they are rarely documented and I did not install the apps.

**What would change it:** a 30-minute hands-on session per app on a current iPhone and Android phone (no sign-in
beyond what the app forces), recording:
1. first-run screens, and whether an account or age gate appears;
2. the camera permission pre-prompt wording;
3. the no-match / no-result screen;
4. any visible confidence or "did you mean" UI;
5. time from launch to first answer.

Record notes in words only. This would turn most of the unknowns into facts.

## Sources

All accessed 2026-10-26 unless noted. Dates are publication or last-update dates where shown.

- Vivino App Store listing, v2026.43.0: https://apps.apple.com/us/app/vivino-buy-the-right-wine/id414461255
- Vivino app page (undated): https://www.vivino.com/app
- diginomica, Vivino OCR (2016-02-25, old): https://diginomica.com/2016/02/26/uncorking-wine-information-with-ocr-technology-at-vivino/
- Jancis Robinson label-scanner reviews (2015–2016, old; search excerpt only, page returned 403): https://www.jancisrobinson.com/articles/best-wine-labelscanning-apps-2016
- Yuka App Store listing, v5.8: https://apps.apple.com/us/app/yuka-food-cosmetic-scanner/id1092799236
- Yuka "How are food products rated?" (updated ~3 months before access): https://help.yuka.io/l/en/article/ijzgfvi1jq
- Yuka financing / Premium (updated ~4 months before access): https://help.yuka.io/l/en/article/zrgtb8f2ka
- Yuka Terms EU/UK (updated ~3 weeks before access): https://help.yuka.io/l/en/article/nui6tegnjw
- Yuka app page (undated): https://yuka.io/en/app
- Apple Shazam guide, identify a song (undated, © 2026): https://support.apple.com/guide/shazam/dev9748744b6/web
- Apple Shazam guide, offline (undated, © 2026): https://support.apple.com/guide/shazam/devad6c028a7/web
- Shazam App Store listing, v27.2: https://apps.apple.com/us/app/shazam-find-music-concerts/id284993459
- Google Lens overview (undated): https://search.google/ways-to-search/lens/
- Google blog, Lens tips (2025-01-07): https://blog.google/products-and-platforms/products/search/google-lens-tips-2025/
- Google blog, multimodal AI Mode (April 2025, search excerpt): https://blog.google/products/search/ai-mode-multimodal-search/
- 9to5Google, Lens UI tweaks (2021-07-02, old): https://9to5google.com/2021/07/02/google-lens-tweaks/
- 9to5Google, AI Mode Live teardown (2025-05-05, search excerpt): https://9to5google.com/2025/05/05/google-ai-mode-live-lens-teardown/
- Leafly App Store listing, v9.3.3: https://apps.apple.com/us/app/leafly-find-weed-near-you/id416456429
- Leafly Blue Dream strain page (fetched 2026-10-26): https://www.leafly.com/strains/blue-dream
- Weedmaps App Store listing, v11.147.0: https://apps.apple.com/us/app/id350189835
- GREENT App Store listing, v4.3.0: https://apps.apple.com/us/app/-/id6736573173
- Kush Scan App Store listing, v1.68: https://apps.apple.com/us/app/kush-scan-thc-weed-identifier/id1462406146
