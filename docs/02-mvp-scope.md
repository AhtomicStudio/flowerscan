# MVP Scope

MoSCoW for v1. If something isn't listed under **Must**, it doesn't block launch.

## Must

**Scanning**
- Camera viewport with reticle, torch toggle where supported, and a permission-priming screen.
- Live barcode + QR decoding (Auto mode).
- Tap-to-read OCR on the reticle area (Text).
- Mode control: Auto / Text / Barcode / QR (Auto is the default and should rarely need changing).
- Manual "type it" search, reachable in one tap from the scanner.

**Identification**
- Name normalization + fuzzy matching against strain names **and aliases**.
- Decision rule: auto-accept confident matches, show a "Which one?" sheet for close calls, and an honest
  no-match screen otherwise.
- Capture of extra package facts when OCR finds them: label claim (indica/sativa/hybrid), THC %, CBD %.
- QR handling: our deep links → result; any other URL → stored as `qr_payload` and scanned for a strain name.
- Barcode handling: decoded and stored; a local memory of "this barcode = this strain" after the user confirms.

**Result**
- Classification hero: label + sativa/indica percentage bar + confidence level.
- "How we know": an expandable family tree with sources.
- "Package says X" comparison when the package label disagrees with the lineage.
- Dynamic tags: effects / flavors / terpenes, rendered only if verified data exists (0..n, no filler).
- Compliance footer copy (effects vary, start low).

**Journal, sharing & backup**
- Save scan to a local journal (IndexedDB). List, view, delete, add a personal rating and notes.
- Share a strain result as a link (`/s/<strain-id>`) via the Web Share API, falling back to copy-link.
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
- "Request this strain" button on no-match, saved locally for an export or email-style report.
- Lineage tree visual (graph) beyond the nested list.

## Won't (v1) — see [11-roadmap.md](11-roadmap.md)
- Accounts, cloud sync, Firestore.
- Crowdsourced shared barcode database.
- Cloud OCR / LLM vision.
- End-user Markdown/Obsidian export (spec kept in [07-obsidian-spec.md](07-obsidian-spec.md) for Phase 2).
- Obsidian plugin (true two-way sync).
- Dispensary menus, prices, or deals; ads or sponsored placements.
- Native apps.
