# Compliance & Privacy

> This is a product policy, not legal advice. Get a review from a lawyer familiar with cannabis
> advertising and privacy law in our launch markets before public launch.

## Audience
- **21+ only** (US default). The age gate blocks all content on first visit. If we launch in markets with a
  different legal age (for example parts of Canada), the gate reads the age from a market config.
- Nothing that could appeal to minors: no cartoon mascots aimed at kids, no candy-style imagery, no
  youth slang or meme formats in marketing.

## Claims
**Never** state or imply that a strain treats, cures, prevents, or helps with any medical condition.

| Don't | Do |
| --- | --- |
| "Great for anxiety" | "Often described as calming" |
| "Helps you sleep" | "A popular pick for winding down at night" |
| "Pain relief" | *(not in the taxonomy at all)* |
| "This will make you creative" | "Commonly reported: creative" |
| "Safe" / "no side effects" | "Effects vary person to person. Start low, go slow." |

- The classification label describes **genetics**, not effects. Copy must not say "Indica = sleepy" as a fact.
- The taxonomy (`data/taxonomy/taxonomy.yaml`) excludes medical terms. The build fails if a banned term
  appears (banned list maintained in T-003).
- Every result shows the responsible-use footer.

## Commerce & advertising
- MVP has **no** ads, sponsored placements, affiliate links, prices, or sales.
- If sponsored content is ever added: it must be labeled "Sponsored", kept visually separate, and it must
  **never** influence matching or classification (same rule as Cannapickforme).

## Privacy
- **On-device by default:** camera frames, OCR, matching, and the journal never leave the phone.
- **No images stored** unless the user opts in. **No images uploaded** unless the user opts in to cloud
  OCR (Phase 2), with clear, per-feature consent.
- **Analytics:** privacy-friendly and cookieless; aggregate events only (`scan_started`, `scan_result`
  `{method, outcome, latency_bucket}`). No strain names, no OCR text, no barcodes, no IP-based location,
  no user IDs. Respect Do Not Track / Global Privacy Control.
- **No third-party trackers** or ad SDKs.
- **Deletion:** Settings → "Erase all data" clears IndexedDB, caches, and settings.
- **Privacy page** in plain language: what stays on the device, what (if anything) is sent, and why.
- Phase 2 accounts: data minimization, Firestore security rules scoped per user, account deletion that
  actually deletes.

## Data & IP
- See the sourcing policy in [04-data-model.md](04-data-model.md#data-sourcing--licensing-policy).
- Don't use other companies' logos or package art in the app or marketing. Golden-set photos stay in the
  repo for testing only and are not published.
- Trademark-check the final product name before buying ads or printing anything.

## Platform notes
- A web app avoids app-store cannabis restrictions for now. If we wrap it later (Capacitor), review
  Apple/Google policies at that time. Informational cannabis apps are generally allowed, while facilitating
  sales is restricted.

## Compliance review checklist (for the reviewer agent)
- [ ] No medical or therapeutic wording in UI copy, taxonomy, notes, or exports.
- [ ] Effect language hedged ("often described", "commonly reported").
- [ ] Responsible-use footer present on result screens and exports.
- [ ] No youth-appealing imagery or language.
- [ ] No data leaves the device without an explicit opt-in.
- [ ] Nothing rendered that isn't backed by data or scan input (no filler).
