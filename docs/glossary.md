# Glossary

| Term | Meaning in this project |
| --- | --- |
| **Strain / cultivar** | A named cannabis variety people search for. In the vault: `kind: strain`. |
| **Landrace** | A traditional regional population. Lineage recursion stops here. `kind: landrace`, with `base_sativa_pct`. |
| **Cross** | Breeding two parents (A × B). An *unnamed* intermediate cross is a `kind: cross` note. |
| **Backcross (BX)** | Crossing offspring back to a parent to reinforce traits. |
| **S1 / selfed** | Seeds from a plant pollinating itself. Modeled as one parent, weight 1.0. |
| **Pheno / cut / clone-only** | A selected individual plant of a strain, kept by cloning. Modeled as one parent. |
| **Reported type** | What breeders and sources *say* the strain is (indica…sativa). |
| **Lineage-derived classification** | Our computed sativa % and label from the family tree ([05](05-classification-algorithm.md)). |
| **Package says** | The indica/sativa/hybrid word printed on the package, read by OCR. |
| **Confidence** | 0–1 score of how much of the lineage is traced to well-sourced data. |
| **Chemotype** | The chemical profile (cannabinoids and terpenes). A stronger predictor than indica/sativa; a later phase. |
| **Terpene** | Aromatic compounds (myrcene, limonene, …). Tagged only when sourced. |
| **COA** | Certificate of Analysis, a lab test report for a batch. Often linked by QR on packages. |
| **METRC** | A track-and-trace system used by many US states; package tags carry its IDs. |
| **UPC / EAN** | Retail 1D barcode formats with check digits. |
| **Golden set** | Our labeled package photos for measuring scan accuracy (`data/eval`). |
| **False accept** | The scanner confidently shows the wrong strain. The worst failure; target < 1%. |
| **Vault** | An Obsidian folder of Markdown notes. `data/vault` is our database source. |
| **Taxonomy** | Our controlled vocabulary of effect, flavor, and terpene tags. |
| **ADR** | Architecture Decision Record, in `docs/decisions/`. |
