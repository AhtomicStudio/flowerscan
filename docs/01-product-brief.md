# Product Brief

## One-liner

Point your phone at a cannabis package and find out, in about two seconds, whether it's Indica, Sativa,
or Hybrid, plus the family tree that proves it.

## The problem

- Package labels are inconsistent. "Indica" on the bag is often marketing, not genetics.
- Looking a strain up means typing a weird name ("Gelato #33", "GMO", "Zkittlez") into a search engine
  and wading through ads and SEO pages.
- Existing strain sites give you a badge with no reasoning and no indication of how sure they are.

## Who it's for

| Persona | Situation | What they need |
| --- | --- | --- |
| **The shopper** | Standing at a dispensary counter or holding a jar at home. | A fast answer with one hand. No account, no typing. |
| **The curious friend** | Someone handed them a pre-roll with a name on it. | "What is this?" in plain words. |
| **The connoisseur / journaler** | Keeps notes on what they've tried. | Save the scan, rate it, back it up. |
| **The budtender** *(later)* | Answers "is this indica?" fifty times a day. | A trustworthy, shareable result card or link. |

## Core job

> Package → strain identity → lineage-derived classification → honest result → optional save/export.

## Product principles

1. **Two-second answer.** From tapping the shutter (or holding up a barcode) to a result in ≤ 2 s on a
   mid-range phone.
2. **The database decides.** OCR and AI read text. Only our curated data can say what a strain *is*.
3. **Show the work.** Confidence, family tree, sources (no percentage on screen, D2). The trust comes from the transparency.
4. **Never fill silence with fiction.** No synthetic tags, no guessed lineage, no fake confidence. If we
   don't know, say so and offer the next step.
5. **Private by default.** Processing happens on the device. Scan history stays on the device unless the
   user opts in.
6. **Compliant by design.** 21+, no medical claims, no youth appeal. These rules are built into the
   taxonomy and copy rules, not patched on later.
7. **Snappy and joyful.** Bold color, tactile micro-interactions, one-thumb controls, 60 fps.

## MVP promise (what "done" means for v1)

A 21+ visitor opens the site on their phone, grants camera access, and points it at a package. They get
the right strain on the first try for most mainstream strains, see a lineage-derived classification as a
bold class color with a confidence level, see whichever verified effect tags exist, and can save it to a
local journal or scan another package right away. When something fails, they always have a clear path forward (pick from
candidates, type the name, or see an honest "we don't have this strain yet").

Full in/out list: [02-mvp-scope.md](02-mvp-scope.md).

## Success metrics (MVP)

Measured with privacy-friendly aggregate counters only (no strain names, no images, no identifiers):

| Metric | Target to start (revise after real data) |
| --- | --- |
| Time from shutter tap to result, p50 / p90 | ≤ 2.0 s / ≤ 4.0 s |
| Scan → confirmed result rate | ≥ 70% |
| Top-1 strain match accuracy on golden photo set | ≥ 85% |
| Top-3 match accuracy on golden photo set | ≥ 95% |
| "No match" rate on real scans | Tracked; drives which strains get curated next |
| Lighthouse performance (mobile) | ≥ 90 |

## Non-goals

- Selling, delivering, or pricing cannabis. No dispensary menus in MVP.
- Medical guidance of any kind.
- Social features (feeds, comments, follows).
- User accounts in MVP (local-first; accounts are Phase 2).
- Monetization in MVP: no ads, sponsorships, affiliates, or payments (open-questions Q6).
- End-user Obsidian/Markdown export in MVP (Obsidian is our curation tool; Q5).
- Native iOS/Android apps in MVP (PWA first; a Capacitor wrapper is an option later).
