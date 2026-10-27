# MVP Scope

MoSCoW for v1. If something isn't listed under **Must**, it doesn't block launch.

## Must

**Scanning**
- Camera viewport with reticle, torch toggle where supported, and a permission-priming screen.
- One automatic mode: live barcode + QR decoding, and tap-to-read OCR on the reticle area. No mode control
  (D7, 2026-10-26).
- Manual "type it" search, reachable in one tap from the scanner.

**Identification**
- Name normalization + fuzzy matching against strain names **and aliases**.
- Decision rule: auto-accept confident matches, show a "Which one?" sheet for close calls, and an honest
  no-match screen otherwise.
- Capture of extra package facts when OCR finds them: label claim (indica/sativa/hybrid) and product form,
  stored with the scan (the result screen doesn't feature them, D4); potency readings exactly as printed,
  **stored but never shown** (P2).
- QR handling: our deep links → result; any other URL → stored as `qr_payload` and scanned for a strain name.
- Barcode handling: decoded and stored; a local memory of "this barcode = this strain" after the user confirms.

**Result** (simplified by the founders, D1–D6, 2026-10-26)
- Classification: **the whole screen floods with the class color** and shows the strain name and one word,
  Indica / Sativa / Hybrid (D13, D14). Hybrid means an exactly 50/50 estimate; any lean picks a side (D15).
  Dominance and other detail appear only when the user opens the details or the strain page.
  **No percentage is shown to users** (the engine still computes it).
- "How we know": an expandable family tree with sources, where the confidence and method are explained.
- Effect tags only, rendered only if verified data exists (0..n, no filler). Flavors and terpenes stay in the
  taxonomy but aren't shown or tagged in the MVP.
- Save (+ optional rating) and **Scan another**, which returns straight to the live scanner.
- Compliance footer copy (effects vary, start low).

**Journal & backup**
- Save scan to a local journal (IndexedDB). List, view, delete, add a personal rating and notes.
- Strain pages at `/s/<strain-id>` (reached from search and the family tree). No Share button in the MVP (D5).
- Journal backup: download the whole journal as one JSON file, and restore it from that file.
- (End-user Obsidian/Markdown export is **not** in the MVP. Obsidian is our curation tool only. See open-questions Q5.)

**Data**
- Obsidian vault source (`data/vault`) → validated, compiled JSON shipped with the app.
- Seed dataset: foundational landraces + the most common strains (target: 150–300 for launch), each with
  sources.
- Effects taxonomy v1 (~40 terms, faceted, no medical terms).

**Platform**
- 21+ age gate, privacy page, about/"how classification works" page.
- PWA: installable, app shell and strain data available offline.
- Deployed on Vercel at a real domain over HTTPS (camera requires a secure context).

## Should
- Recent scans quick-access on the scanner screen.
- Haptic tick on detection (Android; iOS Safari has no Vibration API).
- Light theme in addition to the dark default.

## Could
- Parsing known lab/COA QR formats for potency.
- Lineage tree visual (graph) beyond the nested list.

## Won't (v1) — see [11-roadmap.md](11-roadmap.md)
- Accounts, cloud sync, Firestore.
- Crowdsourced shared barcode database.
- Cloud OCR / LLM vision.
- End-user Markdown/Obsidian export (spec kept in [07-obsidian-spec.md](07-obsidian-spec.md) for Phase 2).
- Obsidian plugin (true two-way sync).
- Dispensary menus, prices, or deals; ads or sponsored placements.
- Native apps.
- Share button (Web Share / copy link) (D5). "Request this strain" (D9). The % meter and the "Package says"
  callout (D2, D4). Displayed flavor and terpene tags (D3).
