# Gemini Review & Coin-Flip Simplification (2026-10-31)

This document summarizes the founder/Gemini project review on 2026-10-31, the founder's policy updates (D20–D23 in [open-questions.md](open-questions.md)), and the code, data, and test changes applied across the monorepo. **Claude and all agents: read this before touching the scanner, result view, or vault.**

---

## 1. The Founder's Vision ("Coin-Flip Simplicity")

FlowerScan is designed around the effortless simplicity of a coin-flip app:
1. **Point the camera at a cannabis bag** (label text, QR code, or barcode).
2. **Immediately get a full-screen, high-contrast color flood** for one of three outcomes:
   - **Indica** (`#3F3A82` indigo)
   - **Sativa** (`#B34118` warm amber-orange)
   - **Hybrid** (`#1D6A46` forest green — reserved strictly for a 50/50 lineage balance, `Math.round(sativa_pct) === 50`)

---

## 2. Founder Decisions (D20–D23)

| Decision | Summary |
| --- | --- |
| **D20 — Community strain databases allowed** | **Leafly** (`leafly.com`), **SeedFinder** (`en.seedfinder.eu`), **AllBud** (`allbud.com`), and **Wikileaf** (`wikileaf.com`) are now approved sources in [`data/vault/SOURCES.md`](../data/vault/SOURCES.md) for factual strain data (`parents`, `reported_type`, `aliases`, `breeder`, `effects`), with no copied prose. |
| **D21 — Sourced verification without mandatory human sign-off** | Notes with valid `sources` backing their claims (`parents`, `reported_type`) can be marked `verification: verified` and shipped without requiring human review (`reviewed_by` and `reviewed_at` are optional in `@flowerscan/core`). Supersedes Q4's human-only `verified` gate. |
| **D22 — Non-blocking barcode / QR detection** | Unrecognized barcodes, Metrc/BioTrack tracking codes, and COA/traceability QRs **never** freeze the camera or open a blocking `CodeSheet`. Instead, the scanner mutes the code in `cooldown`, silently remembers learnable barcodes in `pendingBarcode`, pulses the shutter, and sets the hint to `"Now tap to read the strain name"` while keeping the live camera open. |
| **D23 — `package_says` full-screen class-color fallback** | When OCR reads a bag whose strain isn't in our database yet (`outcome.kind === "none"`), if `parseLabelText` extracted `package_says` (`"indica" | "sativa" | "hybrid"`), the app opens the full-screen class-color `ResultScreen` (`/s/__package__`) with the read strain name (or `"Package label"`) and the honest basis line `"Printed on package: read from the label. This strain isn't in our lineage database yet."` |

---

## 3. What Was Changed

### Fix #1: Wired the OCR Engine + `parseLabelText` into the Scanner (`T-011`)
- Previously, `apps/web/src/features/scan/deps.tsx` still defaulted `readLabel` to `readLabelUnavailable`, so tapping the shutter always threw `"unavailable"`.
- Implemented `createOcrReadLabel(engine)` in [`apps/web/src/features/scan/read-label.ts`](../apps/web/src/features/scan/read-label.ts), connecting `createTesseractEngine()` (`apps/web/src/platform/ocr/tesseract-engine.ts`) with `@flowerscan/core`'s `parseLabelText()`.
- Wired `createOcrReadLabel()` and `prefetchOcr` into [`apps/web/src/features/scan/deps.tsx`](../apps/web/src/features/scan/deps.tsx) and triggered `deps.prefetchOcr?.()` when the camera enters `live` in [`apps/web/src/features/scan/ScannerScreen.tsx`](../apps/web/src/features/scan/ScannerScreen.tsx).

### Fix #2: Eliminated All 55 Gray `"Unknown lineage"` Strains & Promoted Sourced Notes to `verified`
- Previously, 55 of 128 strains (43% of the database) compiled to `lineage.label === "unknown"` (rendering a gray `"Unknown lineage"` screen), because 49 ancestor stubs had `reported_type: unknown` and 6 popular strains depended on them.
- Using Leafly, SeedFinder, AllBud, and existing sources (D20), curated accurate `reported_type` values and sources for all 55 strains in `data/vault/strains/`, and resolved all open T-031 pre-check findings.
- Updated `reviewIssues()` in [`packages/core/src/schema/genetic-node.ts`](../packages/core/src/schema/genetic-node.ts) so `verification: "verified"` no longer requires `reviewed_by` / `reviewed_at` (D21), while keeping `sourceIssues()` strict (every `verified` claim must still be backed by `sources`).
- Promoted all sourced `unverified` notes to `verification: verified` and set `BETA = false` in [`scripts/vercel-build.mjs`](../scripts/vercel-build.mjs).
- **Resulting production dataset (`pnpm vault:build`):**
  - **128 searchable strains/landraces shipped** (116 `verified`, 12 `disputed`, 0 `unverified`)
  - **Indica:** 74 (57.8%)
  - **Sativa:** 36 (28.1%)
  - **Hybrid:** 18 (14.1%)
  - **Unknown:** **0 (0.0%)**

### Fix #3: Non-Blocking Barcode & QR Detection (`D22`)
- Updated `onStable()` in [`apps/web/src/features/scan/ScannerScreen.tsx`](../apps/web/src/features/scan/ScannerScreen.tsx) so `unknown-barcode`, `tracking`, `coa`, and `traceability` codes do not freeze the video feed or open `CodeSheet`.
- Instead, the code is muted in `cooldown`, learnable UPC/EAN/Code-128 barcodes are saved to `pendingBarcode` (so when the user taps the shutter to read the strain name, the barcode is still learned in IndexedDB for next time!), `aim` is set to `true` (`"Now tap to read the strain name"`), and `shutterPulse` increments.

### Fix #4: Full-Screen Class-Color Fallback for Unlisted Strains (`D23`)
- Added `package-says` outcome to [`apps/web/src/features/scan/scan-outcome.ts`](../apps/web/src/features/scan/scan-outcome.ts) when `decide()` returns `none` (or no strain name candidates were read) and `packageSays` (`"indica" | "sativa" | "hybrid"`) was read from the package label.
- Added `PACKAGE_RESULT_ID = "__package__"` and `recordFromPackageSays()` in [`apps/web/src/features/result/result-model.ts`](../apps/web/src/features/result/result-model.ts), `BASIS.package` in [`apps/web/src/features/result/copy.ts`](../apps/web/src/features/result/copy.ts), and `packageResult` history state in [`apps/web/src/app/router.tsx`](../apps/web/src/app/router.tsx).

### Fix #5: Restored Test Suite after T-009 Route Table Switch
- Updated [`apps/web/src/app/App.test.tsx`](../apps/web/src/app/App.test.tsx), [`apps/web/src/features/search/SearchScreen.test.tsx`](../apps/web/src/features/search/SearchScreen.test.tsx), [`apps/web/src/features/result/ResultScreen.test.tsx`](../apps/web/src/features/result/ResultScreen.test.tsx), and [`apps/web/e2e/beta.spec.ts`](../apps/web/e2e/beta.spec.ts) to reflect `/` rendering `ScannerScreen`, `/search` rendering `SearchScreen`, and `"Scan another"` as the primary result action.
- Added `canGoBack` tracking in [`apps/web/src/app/router.tsx`](../apps/web/src/app/router.tsx) so `goBack()` (`Escape` / `×`) always returns to `/search` even when a user or test entered the app directly at `/search`.
- Added unit tests in [`apps/web/src/features/scan/scan-outcome.test.ts`](../apps/web/src/features/scan/scan-outcome.test.ts) and [`apps/web/src/features/result/result-model.test.ts`](../apps/web/src/features/result/result-model.test.ts) covering `createOcrReadLabel`, `outcomeFor` (`package-says`), and `recordFromPackageSays`.

