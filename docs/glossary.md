# Glossary

| Term | Meaning in this project |
| --- | --- |
| **Strain / cultivar** | A named cannabis variety people search for. In the vault: `kind: strain`. |
| **Landrace** | A traditional regional population. Lineage recursion stops here. `kind: landrace`, with `base_sativa_pct`. |
| **Cross** | Breeding two parents (A × B). An *unnamed* intermediate cross is a `kind: cross` note. |
| **F1 / F2** | First-generation offspring of a cross (F1), and offspring of two F1 siblings (F2). F2 siblings vary a lot. |
| **Backcross (BX, BX1, BX2…)** | Crossing offspring back to a parent to reinforce traits. The expected parent share is 75%, then 87.5%, and so on. |
| **S1 / selfed** | Seeds from a plant pollinating itself (often a feminized self). A new seed generation. Modeled as one parent, weight 1.0. |
| **IBL** | Inbred line: a seed line bred until offspring are fairly uniform. |
| **Seed line** | A population sold as seeds under one name (e.g. "Gelato"). Its plants differ from each other. |
| **Pheno (numbered selection)** | One individual plant picked from a seed population, often given a number (`Gorilla Glue #4`, `Gelato #33`). It's a *sibling* of the other numbered phenos, not a child of the seed-line name. The number is part of its identity. |
| **Cut / clone-only** | A clone of one selected plant, passed on as cuttings, not seeds. Genetically the same plant as its source, with no new generation. Distinct cut names (`Chem 91`, `Chem D`, "Forum Cut") are different plants, not aliases. |
| **Polyhybrid** | A strain with many founders in uncertain proportions (e.g. Haze). |
| **Indica / Sativa (vernacular)** | Market terms for drug-type cannabis, roughly the broad-leaf and narrow-leaf types. Research finds the labels track aroma more than genome-wide ancestry ([domain review §1.1](research/2026-10-26-domain-review.md#11-what-sativa_pct-can-and-cant-mean)). We use them to label a lineage *estimate*, never to predict effects. |
| **Reported type** | What breeders and sources *say* the strain is (indica…sativa). |
| **Lineage-derived classification** | Our computed sativa % and label from the family tree ([05](05-classification-algorithm.md)): an average of how the ancestors are classified, not a DNA measurement. |
| **Package says** | The indica/sativa/hybrid word printed on the package, read by OCR. |
| **Confidence** | 0–1 score of how much of the lineage is traced to well-sourced data. It measures coverage, not whether the label is "right". |
| **Chemotype** | The chemical profile (cannabinoids and terpenes). A stronger predictor than indica/sativa; a later phase. |
| **Terpene** | Aromatic compounds (myrcene, limonene, …). Tagged only when sourced. |
| **THCa (THCA)** | The acid form of THC that dominates raw flower. It converts to THC when heated. |
| **Δ9-THC** | Delta-9 THC, the neutral form. On flower labels it's usually a small number next to a large THCa number. |
| **Total THC** | Δ9-THC + 0.877 × THCA, the basis most state labels use. Labels may print THC, THCa, and Total THC side by side. |
| **ND / LOQ / LOD** | Lab shorthand: not detected / below the limit of quantitation / limit of detection. |
| **Hemp-derived THCa flower** | Flower sold as "hemp" under the delta-9-only federal definition. Federal law redefines hemp by total THC from 2026-11-12. |
| **COA** | Certificate of Analysis, a lab test report for a batch. Often linked by QR on packages (required in NY). |
| **METRC (Metrc)** | A track-and-trace system used by many, but not all, US states (Washington uses its own CCRS). Package tags carry 24-character UIDs. |
| **UID / package tag** | The track-and-trace ID printed on a package. It's unique per package, so it never identifies a strain. |
| **Retail ID** | Metrc's serialized per-unit QR code. Scanning it shows origin and lab data. It isn't a strain decision. |
| **Lot / batch number** | The producer's or harvest's batch identifier on the label. It's noise for matching. |
| **Brand vs. breeder** | The brand on a package is usually the grower or processor. The breeder who made the genetics is rarely printed. |
| **UPC / EAN** | Retail 1D barcode formats with check digits. |
| **Golden set** | Our labeled package photos for measuring scan accuracy (`data/eval`). |
| **False accept** | The scanner confidently shows the wrong strain. The worst failure; target < 1%. |
| **Vault** | An Obsidian folder of Markdown notes. `data/vault` is our database source. |
| **Taxonomy** | Our controlled vocabulary of effect, flavor, and terpene tags. |
| **ADR** | Architecture Decision Record, in `docs/decisions/`. |
