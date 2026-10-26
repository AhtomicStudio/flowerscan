# Review of the Gemini Brief

> Status: reviewed 2026-10-25. This doc records what we kept, what we changed, and why.
> The replacement brief is at the bottom of this file and in [01-product-brief.md](01-product-brief.md).
> **Later founder answers changed parts of this** (separate brand; Obsidian for curation only, so no end-user
> export in the MVP). See [open-questions.md](open-questions.md). Where they conflict, the current docs win.

## Verdict

The brief has good instincts but puts the weight in the wrong place. It specifies the camera UI and the
Obsidian export in detail, and it never specifies the two things the product actually depends on:

1. **The strain database.** Where do strains, aliases, and lineage come from, and how do we keep them accurate?
2. **The classification logic.** How does a name turn into "Indica / Sativa / Hybrid" *based on lineage*?

It also asks for "a complete runnable scanning component with mock data" as step one. That produces a demo
that looks finished while the hard parts are still unsolved, and the mock data tends to leak into
production. We start with the specs and the domain core instead, then put the UI on top of real (small) data.

## Keep

| Item from the brief | Why it's right |
| --- | --- |
| Mobile-first web app | No app-store review for cannabis content, one codebase, installable as a PWA. |
| Three inputs: text, 1D barcode, QR | Packages carry all three; each one is useful in a different way. |
| "Only render verified tags; never pad with filler" | This is the best rule in the brief. We make it a **project-wide rule**: no fabricated data anywhere. |
| Markdown + YAML frontmatter export | Portable, future-proof, works in Obsidian. |
| React + Vite + TypeScript + Tailwind | Fast to build, fast to load, and agents know it well. |
| Local-first | Faster, works offline, and better for privacy (scan history is sensitive). |
| Most of the frontmatter key names | Kept where sound (`strain_name`, `classification`, `barcode`, `qr_payload`, `effects`, `date_scanned`). |

## Missing (the important part)

1. **Data sourcing and licensing.** "Search our database" means nothing until the database exists. Most
   strain sites prohibit scraping, and their descriptions and reviews are copyrighted. We need our own
   curated dataset where every fact cites a source. See [04-data-model.md](04-data-model.md).
2. **A lineage algorithm.** We need a deterministic, tested function: parents → sativa % → label, with a
   confidence score. See [05-classification-algorithm.md](05-classification-algorithm.md).
3. **Name matching.** OCR on packaging is noisy: stylized fonts, curved bags, glare, and the brand name is
   usually bigger than the strain name. Turning "GORILLA GLU3 #4 · 3.5g · INDICA" into the right record is
   the hardest engineering problem in the app. See [06-scan-pipeline.md](06-scan-pipeline.md).
4. **Failure states.** No match, several close matches, camera permission denied, offline, unknown lineage.
   Each needs a designed screen. The no-match screen is where hallucination would creep in, so we design it
   on purpose.
5. **Compliance.** 21+ age gate, no medical claims in effect language, no youth appeal. See
   [09-compliance-and-privacy.md](09-compliance-and-privacy.md).
6. **Privacy.** Cannabis use history is sensitive personal data. Default to on-device processing and no image
   uploads.
7. **Quality bar.** Tests, an OCR accuracy eval on real package photos, performance budgets, accessibility.
   See [10-quality-and-testing.md](10-quality-and-testing.md).

## Change

| The brief says | The problem | We do instead |
| --- | --- | --- |
| Mode toggle: Auto / Text / Barcode / QR | Running OCR on every frame drains the battery, heats the phone, and is slow. | **Auto** decodes barcodes and QR codes live, and reads text when you tap the shutter. The explicit modes stay as a secondary control. A "type it" search is always one tap away. |
| `@zxing/library` or `html5-qrcode` | Both have seen little active development (verify at scaffold time). | Use the native `BarcodeDetector` API where it exists, with a `zxing-wasm` based polyfill (for example the `barcode-detector` package) everywhere else, iOS Safari included. Decode in a Web Worker. |
| Tesseract.js / canvas OCR | It works offline, but expect weak accuracy on stylized labels. | Hide OCR behind an **adapter interface**. Tesseract.js runs on-device as the default. An opt-in cloud vision engine can be added later. We choose based on measured accuracy on a golden set of real package photos. |
| `thc_cbd_range` on the strain | THC/CBD belong to a **batch**, not a strain. The same strain can test 17% or 29%. | Potency goes on the **scan record** (read from the package when possible). A strain may carry a "typically reported range" only when a source backs it. |
| "Bi-directional syncing into an Obsidian vault" | A mobile web app can't write into a vault folder on disk. | **MVP:** one-way export: copy Markdown, download `.md`, download a `.zip` of the journal, and an "Open in Obsidian" link (`obsidian://new`). **Later:** an Obsidian community plugin for true sync. |
| (Not in the brief) | — | **Use an Obsidian vault as the source of the strain database.** Each strain is a note, its parents are `[[wikilinks]]`, and Obsidian's graph view *is* the family tree. A build tool compiles the vault into the app's data. See [ADR-0003](decisions/0003-obsidian-vault-as-strain-source.md). |
| QR codes "pointing back to our web tool" | Most QR codes on real packages link to lab certificates (COAs) or brand sites, not to us. | Handle three QR kinds: **our deep links** → open the result; **lab/COA links** → keep the URL now, parse potency/strain later; **other URLs** → try to pull a strain name from the URL. |
| 1D barcodes (UPC/SKU) | There is no public UPC → strain database for cannabis. Barcodes are brand- or batch-specific. | MVP: decode, and remember locally which strain the user confirmed for that barcode. Phase 2: a shared, moderated barcode → strain mapping that users build up over time. |
| "100-term effect taxonomy" | No data source is named. Effects are subjective reported experiences, and the best-known datasets are licensed. 100 flat terms is a lot. | A **faceted** vocabulary (effects / flavors / terpenes), about 40 terms to start, capped at 100, **no medical conditions**, and each tag on a strain carries provenance. |
| `#strain/indica`, `#effects/creative` | Inconsistent namespaces. | `#type/indica`, `#effect/creative`, `#flavor/citrus`: singular, predictable. |
| "Generate the complete runnable component with mock data first" | Builds the demo before the foundation. | Specs → domain core + lineage engine with tests → data pipeline → scanner → UI. Mock data lives only in clearly named test fixtures. |
| Brand naming, 5–8 names | Fine, but you already own **Cannapickforme**, and Gemini even suggested "CannaPick". | Decide first whether this is a Cannapickforme feature or a standalone brand. See [12-naming.md](12-naming.md) and [open-questions.md](open-questions.md). |

## The reframe

> **FlowerScan is a lineage engine with a camera in front of it.**

The promise: *point at a package and get an honest answer about what it is and how we know.*

What sets it apart is **transparency**. Most apps put an "Indica" badge on a strain and stop there. We show:
- a percentage (for example 62% sativa / 38% indica), not just a word,
- the family tree that produced the number,
- a confidence level ("lineage fully traced" vs. "based on breeder's label"),
- and the case where **the package label disagrees with the lineage**. This is a fun, shareable moment: "Package says Indica, family tree says Sativa-dominant."

### A note on the science

Indica/Sativa is more a naming convention than a reliable predictor of chemistry. Nearly all modern
commercial strains are hybrids, and peer-reviewed analyses of commercial products (for example Smith et al.,
*Nature Plants*, 2022) found the labels match chemical profiles poorly. That is no reason to drop the label,
since it is what people ask for. It is a reason to:
1. show a percentage plus a label instead of a hard category,
2. show confidence and sources,
3. never imply the label predicts how someone will feel,
4. plan for chemotype data (terpenes, cannabinoids) as a later, stronger signal.

## Proposed replacement brief (paste-able)

Use this instead of the original prompt when briefing any AI (Claude, Gemini, Codex). It points the agent at
the repo docs instead of trying to say everything in one message.

```text
You are working on FlowerScan, a mobile-first PWA that scans a cannabis package (text via OCR,
1D barcode, or QR), identifies the strain against our curated database, and shows an honest
Indica / Sativa / Hybrid result derived from the strain's lineage, with a percentage, a
confidence level, the family tree, and only the effect/flavor tags our data actually verifies.

Before doing anything, read AGENTS.md and docs/README.md. The repo docs are the source of
truth; this message is not. Work only from a task file in tasks/. Follow its acceptance
criteria and touch only the paths it lists.

Non-negotiables:
- The database decides. OCR and AI only read text. Never invent strain data, lineage, or tags.
- Every strain fact in data/vault cites a source or is marked unverified.
- packages/core stays pure TypeScript (no DOM, no React) and fully unit-tested.
- No medical claims, no youth appeal, 21+ only (docs/09-compliance-and-privacy.md).
- Scan data stays on the device by default. No image uploads without explicit opt-in.

Stack: React + Vite + TypeScript (strict) + Tailwind + shadcn/ui, pnpm workspaces,
Vitest + Playwright, BarcodeDetector + zxing-wasm, Tesseract.js in a Web Worker,
Dexie (IndexedDB), vite-plugin-pwa. Deploy on Vercel.
```
