# Lineage Classification Algorithm (v2)

Implemented as pure functions in `packages/core/src/lineage/`. Deterministic: the same graph always gives
the same output. `ALGO_VERSION = 2`. Bump it whenever the output for any input can change.

**Changelog.** v2 (D15, 2026-10-27): new label bands. **Hybrid means exactly 50.** Below 50 is Indica and
above 50 is Sativa. The old five bands survive only as the detail `sublabel`. Values, confidence and
everything else are unchanged from v1.

## What the number means (read before writing copy)

`sativa_pct` is **an average of how a strain's ancestors are classified**, carried down the family tree to
curated landrace values (or to sourced `reported_type` where the tree ends). It is **not** a measured share of
"sativa DNA", and it does not predict effects.
- The market terms "Sativa" and "Indica" are vernacular. Research finds that commercial "sativa" and "indica"
  samples didn't differ genome-wide, and that the labels tracked a few aroma (terpene) genes instead (Watts et al.
  2021). Reported ancestry correlates only moderately with genetic structure (r² = 0.36, Sawler et al. 2015).
- So the output is a documented, explainable **estimate**. Copy says "lineage estimate" or "family tree leans…",
  never "68% sativa genetics". Sources and discussion:
  [research/2026-10-26-domain-review.md §1](research/2026-10-26-domain-review.md#1-lineage-model-docs05).

## Inputs

A graph of genetic nodes (see [04-data-model.md](04-data-model.md)): each node has `parents`
(ids or `unknown`), optional `parent_weights`, `reported_type`, `derivation` (for single-parent nodes),
`verification`, and, for landraces, `base_sativa_pct` (one of 10 / 25 / 50 / 75 / 90, per P10).

## Output

A `lineage` object: `sativa_pct`, `indica_pct`, `label`, `sublabel`, `confidence`, `confidence_level`,
`method`, `algo_version`.

## Constants (product-tunable, live in `core/src/lineage/constants.ts`)

**Reported-type values**, used when we have to fall back on what sources *say*:

| `reported_type` | sativa value |
| --- | --- |
| `sativa` | 85 |
| `sativa-dominant` | 70 |
| `balanced` | 50 |
| `indica-dominant` | 30 |
| `indica` | 15 |
| `unknown` | — (no value) |

**Label bands** on the final rounded `sativa_pct` (D15, 2026-10-27; supersedes the v1 bands):

| sativa_pct | label | sublabel |
| --- | --- | --- |
| ≥ 80 | `sativa` | — (null) |
| 51 – 79 | `sativa` | `sativa-dominant` |
| 50 | `hybrid` | `balanced` |
| 21 – 49 | `indica` | `indica-dominant` |
| ≤ 20 | `indica` | — (null) |

The `label` is the lean: < 50 → `indica`, exactly 50 → `hybrid`, > 50 → `sativa`. The `sublabel` says how
strong the lean is. The immediate result shows only the label; the sublabel appears only in the strain
detail ("How we know" / strain page, D14). Under these bands the reported-type values land in their own
lean: `indica-dominant` (30) → Indica, `balanced` (50) → Hybrid, `sativa-dominant` (70) → Sativa.

**Confidence:** `GENERATION_DECAY = 0.97` per generation, `REPORTED_CONFIDENCE = 0.5`.
Levels: high ≥ 0.75, medium ≥ 0.5, low > 0, none = 0.

## Algorithm

Let `S(n)` return `{ value: number | null, confidence: number }` for node `n`.

```
S(n):
  if n is memoized → return memo
  if n is "unknown":            return { value: null, confidence: 0 }
  if n.kind == landrace and n.base_sativa_pct != null:
                                return { value: n.base_sativa_pct, confidence: 1.0 }
  # A landrace with no sourced base value falls through: parents is [], so fallback(n) applies.

  if n.parents is empty:        → fallback(n)

  weights = n.parent_weights ?? equal split
  known   = parents p where S(p).value != null

  if known is empty:            → fallback(n)

  # P7: a clone (cut) is the same plant as its source, and a pheno whose only parent is its seed line
  # belongs to that same population. Neither is a new generation, so neither decays.
  d = 1.0 if (len(n.parents) == 1 and n.derivation in {cut, pheno}) else GENERATION_DECAY

  if every parent is known:
     value      = Σ w_p · S(p).value
     confidence = d · Σ w_p · S(p).confidence
     method     = traced (only if every ancestor path is traced, else partial)

  else (some parents unknown):
     # Fill the unknown share with the node's own reported_type, if it has one.
     r = REPORTED_VALUE[n.reported_type]
     if r is null:
        # Renormalize over the known parents, and penalize confidence by the missing share.
        value      = Σ_known w_p · S(p).value / Σ_known w_p
        confidence = d · Σ_known w_p · S(p).confidence     # missing share contributes 0
     else:
        value      = Σ_known w_p · S(p).value + Σ_unknown w_p · r
        confidence = d · (Σ_known w_p · S(p).confidence + Σ_unknown w_p · REPORTED_CONFIDENCE)
     method = partial

fallback(n):
  r = REPORTED_VALUE[n.reported_type]
  if r is null: return { value: null, confidence: 0, method: unknown }
  return { value: r, confidence: REPORTED_CONFIDENCE, method: reported }
```

Then: `sativa_pct = round(value)`, `indica_pct = 100 - sativa_pct`, and apply the label bands to the
**rounded** `sativa_pct`: < 50 → `indica`, exactly 50 → `hybrid`, > 50 → `sativa`, with the sublabel from
the same table (D15). So 49.6 rounds to 50 and is a hybrid, and 50.8 rounds to 51 and is a sativa. Then
apply the confidence levels.
If `value` is null, the result is unknown: `sativa_pct`, `indica_pct` and `sublabel` are null, `label` and
`method` are `unknown`, `confidence` is `0` (not null) and `confidence_level` is `none`, as `LineageSchema`
and the docs/04 lineage object require.

### Rules and edge cases

- **Cycles** are data errors. `vault-build` fails with the cycle path printed. Runtime code assumes a DAG
  but still guards with a visiting-set and returns `unknown` instead of overflowing the stack.
- **Backcrosses** (BX) work naturally through intermediate `cross` nodes:
  `X = A × (A × B)` gives `0.75·A + 0.25·B`.
- **Single-parent nodes** inherit the parent's value (weight 1.0). Their `derivation` decides the decay (P7, decided):
  - **`s1`** (selfed seeds) is a real new seed generation, so one generation of decay.
  - **`cut`** (a clone, the same plant as its source) gets **no decay**.
  - **`pheno`** (a numbered selection like `Gelato #33`, a sibling picked from the seed population): when the
    seed line's parents are sourced, the pheno lists **those parents** and is computed like a normal cross
    (with decay). Only when they aren't sourced does it take the seed-line node as its single parent, with **no decay**.
- **Three-way crosses** must go through a `cross` node (`(A × B) × C`) or explicit `parent_weights`.
- **Reciprocal crosses** (`A × B` vs. `B × A`) give the same value. Keep the parent order the source uses.
- **Folklore or undisclosed lineages** (e.g. Haze, Chemdawg) are common among foundational strains. Don't pick
  one story or invent weights to complete a tree. Use `"unknown"` parents or `verification: disputed` per the
  sourcing policy in [04](04-data-model.md#data-sourcing--licensing-policy). Expect many popular strains to come
  out `partial`.
- **Ruderalis/autoflower genetics are excluded from v1** (P1, decided). Ruderalis isn't on the indica–sativa
  axis, and any fixed value would be invented. The vault holds no ruderalis landraces or autoflower strains.
  `vault-build` warns on any node whose name, aliases or region mention "auto", "autoflower" or "ruderalis",
  so a curator confirms it isn't one. Revisit in v2.
- **Landrace base values** (P10, decided) come from a coarse scale only: **10 / 25 / 50 / 75 / 90**. Each value
  follows the written rubric in `data/vault/LANDRACE-RUBRIC.md` and needs two sources. No sources means no value,
  and the landrace's descendants fall back to `reported_type`. Place-named seed lines ("Afghani #1",
  "Durban Poison") are `strain` nodes with a landrace parent, not landraces.
- **Disputed lineage** (P9, decided): no confidence cap. `explainLineage` returns each node's `verification`,
  and the UI marks disputed ancestors in the family tree ("lineage disputed").
- **Traced vs. reported disagreement:** when `method` is `traced` or `partial` and the node has a
  `reported_type`, the UI may show "Breeder says: Indica-dominant". We never average the two silently.
- Rounding happens only at the end. Intermediate values stay floats.

## Worked example (fictional strains)

```
Landrace K  (base_sativa_pct 10)      Landrace T (base 90)      Landrace C (base 90)
        \                               /                            |
         Strain A = K × T   → 0.5·10 + 0.5·90 = 50                   |
                     \                                               /
                      Strain B = A × C  → 0.5·50 + 0.5·90 = 70
```

- Strain A: 50% → **Hybrid** (detail `balanced`), confidence 0.97 → high
- Strain B: 70% → **Sativa** (detail `sativa-dominant`), confidence 0.97 · (0.5·0.97 + 0.5·1.0) ≈ 0.955 → high
- A clone of B (`derivation: cut`): 70%, confidence ≈ 0.955 (no decay). An S1 of B: 70%, confidence ≈ 0.927.
- If C were `"unknown"` and B had `reported_type: sativa-dominant` (70):
  B = 0.5·50 + 0.5·70 = 60 → **Sativa** (detail `sativa-dominant`), confidence 0.97 · (0.5·0.97 + 0.5·0.5) ≈ 0.713 → medium, method `partial`.

## Required unit tests (T-005)

- Each landrace returns its base value with confidence 1.
- Equal-weight cross, custom weights.
- Single parent by derivation: `s1` decays, `cut` doesn't, `pheno` with a single seed-line parent doesn't.
- `explainLineage` reports `verification` for every node (a disputed ancestor is visible).
- Backcross through a cross node.
- One unknown parent with and without `reported_type`.
- All parents unknown → reported fallback → `unknown`.
- Every band boundary (D15): 20/21, 49/50, 50/51, 79/80, plus 0 and 100, and rounding next to 50
  (a value that rounds to 50 is a hybrid, one that rounds to 49 or 51 isn't).
- `LineageSchema` accepts exactly the label/sublabel pairs in the band table (plus `unknown` / null) and
  rejects every other pair.
- Cycle detection (build) and the runtime guard.
- Memoization: a 5,000-node random DAG completes in < 50 ms on CI.
- Snapshot: the full seed dataset's outputs, so any algorithm change shows up as a reviewable diff.
