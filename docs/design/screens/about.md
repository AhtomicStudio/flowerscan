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
| `#classification` | **How classification works** | "We look up the strain's family tree in our database and average how its ancestors are usually classified, all the way back to traditional landraces where we can. The result is a **lineage estimate**, shown as one of three labels: Indica, Hybrid or Sativa." "We show the label, not a number: a family-tree estimate isn't precise enough for a percentage to mean much." A small **worked example with fictional strains** (Landrace K × Landrace T → Strain A → …) drawn as the same tree component as the result, with class pills only. A three-row label table (pills, no numbers; D15): **Indica**: "Its family tree leans indica. In the details, "indica-dominant" means there's some sativa in it too." · **Hybrid**: "An even mix of indica and sativa ("balanced"). Rare by design." · **Sativa**: "Its family tree leans sativa. In the details, "sativa-dominant" means there's some indica in it too." Then the four terms: **Lineage traced**, **Partly traced**, **Reported type** ("we don't have its family tree yet, so this is how the breeder or published sources describe it"), **Unknown lineage**. |
| `#limits` | **What it can't tell you** | "**We match the name on the package. We can't confirm what's inside.**" (P14) "Indica and sativa describe plant families, not how you'll feel. Effects vary person to person." "Research finds that the market labels \"indica\" and \"sativa\" track aroma more than overall genetics, so treat the label as a guide to family history." "When sources disagree about a strain's parents, we show the best-supported version and mark it \"lineage disputed\"." |
| `#sources` | **Where our data comes from** | Breeder sites, published books, lab data and open datasets we're allowed to use; every fact cites a source; people on our team check each strain before it's marked verified. "No brand pays for results. No ads." (true while Q6 holds) Dataset version and date. |
| `#tags` | **What the tags mean** | The taxonomy terms with their one-line hedged descriptions, for the **effect** facet only (the only tags the app shows), with the "Also reported" ones listed last. Rendered from `taxonomy.json`, so it's never out of date. |
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
