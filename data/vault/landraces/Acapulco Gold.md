---
kind: landrace
id: acapulco-gold
schema_version: 1
name: "Acapulco Gold"
aliases: []
parents: []
reported_type: sativa
base_sativa_pct: 90
region: "Guerrero, Mexico (around Acapulco)"
sources:
  - url: https://www.jeeter.com/products/acapulco-gold
    title: "Jeeter: Acapulco Gold Quad-Infused (product page)"
    retrieved: 2026-10-26
    supports: [reported_type]
  - url: https://www.tltseeds.com/acapulco-gold/
    title: "The Landrace Team: Acapulco Gold"
    retrieved: 2026-10-26
    supports: [base_sativa_pct, reported_type]
  - url: https://pmc.ncbi.nlm.nih.gov/articles/PMC7148385
    title: "McPartland & Small (2020), A classification of endangered high-THC cannabis (Cannabis sativa subsp. indica) domesticates and their wild relatives, PhytoKeys 144:81-112 (CC BY 4.0)"
    retrieved: 2026-10-26
    supports: [base_sativa_pct]
  - url: https://hightimes.com/grow/25-greatest-strains-of-all-time/
    title: "High Times: 25 Greatest Strains of All Time (N. Escondido, 2014-10-09)"
    retrieved: 2026-10-26
    supports: [reported_type]
  - url: https://en.wikipedia.org/wiki/List_of_cannabis_strains
    title: "Wikipedia: List of cannabis strains (CC BY-SA)"
    retrieved: 2026-10-26
    supports: []
  - url: https://en.wikipedia.org/wiki/Acapulco_Gold
    title: "Wikipedia: Acapulco Gold (CC BY-SA, last edited 2026-10-04)"
    retrieved: 2026-10-27
    supports: []
verification: unverified
created: 2026-10-26
updated: 2026-10-27
---

# Acapulco Gold

## Curator notes
A named Mexican landrace. High Times (2014) lists it as a native North American landrace and a sativa;
Wikipedia's list says the name comes from its place of origin and typical colour. It is the third landrace in
Skunk #1 (Sensi Seeds' account of Sam the Skunkman's work).

**Type: sativa (decision L5, 2026-10-26).** The founders call it Sativa based on Jeeter's product information.
Jeeter's own product pages for its Acapulco Gold pre-rolls, cartridge and all-in-one vape all list it as Sativa
and say the strain comes from the area around Acapulco. Jeeter is a product brand describing its own products, so
it backs `reported_type` only, not the base value. High Times and The Landrace Team also call it a sativa.

**Why 90 (proposed in T-027, value approved by the founders 2026-10-27).** Rubric value 90: narrow-leaf
drug type, late maturing, and no documented broad-leaf influence in the line cited.
- McPartland & Small (2020): the South Asian narrow-leaflet domesticate (var. *indica*, the vernacular "Sativa",
  generally late maturing) spread early to the Americas. The paper doesn't discuss Mexican landraces, so this is
  the regional group only, the same footing as Colombian Gold.
- The Landrace Team, a seed bank that works on preserving landraces, sells an Acapulco Gold line it describes as a
  classic sativa from the state of Guerrero (latitude 16° N, 1500 to 2600 m), with 16 to 20 weeks of vegetative
  growth and 12 to 17 weeks of flowering. It lists the genetics only as "Acapulco Gold" and mentions no broad-leaf
  or hybrid influence. That is the line this value is judged on (L1).

**Why this could be argued down (founder check).**
- Other seed lines sold under the name differ. A stabilised commercial line from another breeder lists a minority
  indica share and a much shorter flowering time; it isn't cited because that site's terms limit use to personal
  use (see SOURCES.md). Under the rubric, such a line would be a separate `strain` node.
- Wikipedia's article calls Acapulco Gold a 100% sativa Mexican landrace (that sentence has no citation), but a
  photo caption labels one plant "Mexican x Nepalese", credited to a seed retailer. Not a usable source either way.
- The Landrace Team's page gives no collector, collection year or seed type.
