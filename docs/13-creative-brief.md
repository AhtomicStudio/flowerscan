# Creative Brief (for Roy)

Roy owns marketing and creative. This page covers what the tech side needs from him, in what order, and the
rules every creative piece has to follow. It's written so it can be pasted into an AI assistant (Grok, etc.)
as context.

## The product in one breath
FlowerScan *(working name)* is a free, mobile web app. Point your phone at a cannabis package and in about
two seconds it tells you whether the strain is **Indica, Sativa, or Hybrid**, worked out from the strain's
actual family tree, shown as one bold color (Indica, Sativa, or the occasional Hybrid green), with how sure we
are and the tree that proves it. (Updated 2026-10-26: the result no longer shows a percentage or a
package-disagrees note; see open-questions D1–D4.)

**Personality:** honest, fast, a little cheeky. "We show our work." Bold, vibrant, high-contrast, snappy.
**Separate brand** from Cannapickforme (cross-promotion possible later).

## Deliverables, in priority order

| # | Deliverable | Needed by | Notes |
| --- | --- | --- | --- |
| 1 | **Name shortlist → final name** | Before buying a domain (T-019); ideally before T-017 | Candidates and criteria in [12-naming.md](12-naming.md). Check `.com`/`.app`, USPTO, and social handles before falling in love. |
| 2 | **Color palette** | T-004 can start with placeholders; finals before T-017 | Must include: a dark base, 1–2 punchy accents, and **three classification colors** (Indica, Hybrid, Sativa) that are distinct for colorblind users. Text on them must pass WCAG AA contrast (the tech side will check). |
| 3 | **Typography** | Same as palette | A heavy display face for strain names (read at arm's length) plus a clean UI font. Must be web-licensable (Google Fonts is easiest). |
| 4 | **Logo + app icon** | T-018 (PWA icons) | Works at 48 px and as a maskable square icon. Simple shapes. |
| 5 | **Brand voice guide** (1 page) | T-017 (all app copy) | Tone, 5–10 example lines (scan success, no match, empty journal, age gate), words we use/avoid. |
| 6 | **Launch assets** | T-019 | Landing hero line, 3–5 screenshots/mockups, a short screen-recorded demo, social bios. |

Hand-off format: drop files in `docs/brand/` (create it), with a short `docs/brand/README.md` listing what's
final vs. draft. Colors as hex values, fonts as names + links. The tech side turns these into tokens.

## Rules every creative piece must follow (non-negotiable)
Full version: [09-compliance-and-privacy.md](09-compliance-and-privacy.md).
1. **21+ only.** Nothing that could appeal to minors: no cartoon mascots aimed at kids, no candy imagery,
   no youth slang, no school or teen settings.
2. **No health or medical claims.** Never "helps with anxiety / sleep / pain". Say "often described as
   relaxing", "commonly reported", "effects vary, start low".
3. **Indica/Sativa is genetics, not a promise.** Don't say "Indica = sleepy" as a fact.
4. **No sales talk.** We don't sell cannabis, list prices, or push deals. No "buy now".
5. **No other brands' logos or package art** in our marketing, screenshots, or demos (use our own mock packages).
6. **Privacy is a selling point.** We can truthfully say: "Your camera images never leave your phone" and
   "No account needed."

## Messages we can use (all true for the MVP)
- "Point. Scan. Know what's in the family tree."
- "Not just a label. We show our work."
- "Package says Indica? Let's check the genetics."
- "Free. No account. Your scans stay on your phone."

## Messages we can't use (yet or ever)
- Anything medical (ever).
- "100% accurate" / "the truth about your weed" (it's an estimate with a confidence level).
- "Works on every package" (it won't. Say "most popular strains" until the data proves more).
- "Syncs across devices" (Phase 2).
