# Screen: About (`/about`)

Task: T-017 · Mockup: `mockups/index.html#/about`

## Purpose
Publish the method (benchmark pattern 5), say plainly what we can and can't know, and explain privacy in words
that match what the app actually does (M-25, X-01). Linked from Settings (consistent place, SC 3.2.6) and from
every result's "How we know".

## Layout
A single scrolling page with an in-page index at the top (links to each section). Pushed under Settings (tab bar
visible, Settings active). Back button in the app bar.

| Anchor | Section | Content (draft) |
| --- | --- | --- |
| `#classification` | **How classification works** | "We look up the strain's family tree in our database and average how its ancestors are usually classified, all the way back to traditional landraces where we can. The result is a **lineage estimate**: a number from 0 (indica) to 100 (sativa) and a label." A small **worked example with fictional strains** (Landrace K 10 × Landrace T 90 → Strain A 50 → …) drawn as the same tree component as the result. Then the bands table (Indica ≤ 20 · Indica-dominant 21–40 · Balanced 41–59 · Sativa-dominant 60–79 · Sativa ≥ 80), and the four chip meanings. |
| `#limits` | **What it can't tell you** | "**We match the name on the package. We can't confirm what's inside.**" (P14) "Indica and sativa describe plant families, not how you'll feel. Effects vary person to person." "Research finds that the market labels \"indica\" and \"sativa\" track aroma more than overall genetics, so treat the label as a guide to family history." "When sources disagree about a strain's parents, we show the best-supported version and mark it \"lineage disputed\"." |
| `#sources` | **Where our data comes from** | Breeder sites, published books, lab data and open datasets we're allowed to use; every fact cites a source; people on our team check each strain before it's marked verified. "No brand pays for results. No ads." (true while Q6 holds) Dataset version and date. |
| `#tags` | **What the tags mean** | The taxonomy terms with their one-line hedged descriptions, grouped by facet (Effects / Flavors / Terpenes). Rendered from `taxonomy.json`, so it's never out of date. |
| `#privacy` | **Privacy** | "Your camera images never leave your phone. Text reading, matching and your journal all happen on this phone." "We don't store photos." "No account. No ads. No trackers." Analytics sentence only if Q9 adds analytics (then exactly what's counted). "Erase all data in Settings deletes everything." Potency sentence: "Some packages print potency numbers. We keep them with your saved scan on this phone, and we don't show them." |
| `#responsible-use` | **Responsible use** | "FlowerScan is for adults 21 and older." "Effects vary person to person. Start low, go slow." "Don't drive or operate machinery after using cannabis." "Follow your state's laws." No medical content. |

## States
| State | Behavior |
| --- | --- |
| Default | As above. Deep links to anchors scroll the heading into view below the app bar (`scroll-margin-top`). |
| Taxonomy not loaded | The `#tags` section shows 3 skeleton lines; on failure, "Tag list didn't load." |
| Offline | Works. |

## Accessibility
- One `<h1>` ("About FlowerScan"), sections as `<h2>` with ids. The index is a `<nav aria-label="On this page">`.
- The worked-example tree is the same accessible nested list as the result.

## Open questions
- **Q-D4 (founders, legal Q10):** the exact responsible-use lines (e.g. the driving sentence) need legal review
  before launch. They're drafts.
