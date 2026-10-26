# 0004. Classification is computed from lineage, with confidence

- **Status:** Accepted
- **Date:** 2026-10-25

## Context
The founders want Indica/Sativa/Hybrid "based off the lineage". Labels on packages and websites are
inconsistent, and the indica/sativa split is a weak predictor of chemistry. Users still ask for it.

## Decision
Compute `sativa_pct` deterministically by recursive weighted averaging over the lineage graph down to
curated landrace base values, falling back to sourced `reported_type` where lineage is missing. Output a
label from fixed bands, plus a confidence score and method. Algorithm spec:
[05-classification-algorithm.md](../05-classification-algorithm.md). The algorithm is versioned
(`algo_version`).

## Consequences
- ✅ Explainable: we can show the tree and the math.
- ✅ Testable and stable: snapshot tests catch any change in results.
- ✅ "Package says X, lineage says Y" becomes a feature.
- ⚠️ Accuracy depends on curated landrace base values and lineage data, so data quality is the product.
- ⚠️ Simple averaging ignores real genetic inheritance variance (phenotypes differ). We present the result
  as an estimate, never a guarantee.

## Alternatives considered
- **Use the reported label only:** no differentiator, no transparency.
- **ML classifier on terpene/cannabinoid profiles:** a better long-term signal, but needs lab data we don't
  have yet. Phase 3.
