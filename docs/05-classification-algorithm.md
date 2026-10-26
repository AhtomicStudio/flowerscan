# Lineage Classification Algorithm (v1)

Implemented as pure functions in `packages/core/src/lineage/`. Deterministic: the same graph always gives
the same output. `ALGO_VERSION = 1`. Bump it whenever the output for any input can change.

## Inputs

A graph of genetic nodes (see [04-data-model.md](04-data-model.md)): each node has `parents`
(ids or `unknown`), optional `parent_weights`, `reported_type`, and, for landraces, `base_sativa_pct`.

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

**Label bands** on the final `sativa_pct`:

| sativa_pct | label | sublabel |
| --- | --- | --- |
| ≥ 80 | `sativa` | — |
| 60 – 79 | `hybrid` | `sativa-dominant` |
| 41 – 59 | `hybrid` | `balanced` |
| 21 – 40 | `hybrid` | `indica-dominant` |
| ≤ 20 | `indica` | — |

**Confidence:** `GENERATION_DECAY = 0.97` per generation, `REPORTED_CONFIDENCE = 0.5`.
Levels: high ≥ 0.75, medium ≥ 0.5, low > 0, none = 0.

## Algorithm

Let `S(n)` return `{ value: number | null, confidence: number }` for node `n`.

```
S(n):
  if n is memoized → return memo
  if n is "unknown":            return { value: null, confidence: 0 }
  if n.kind == landrace:        return { value: n.base_sativa_pct, confidence: 1.0 }

  if n.parents is empty:        → fallback(n)

  weights = n.parent_weights ?? equal split
  known   = parents p where S(p).value != null

  if known is empty:            → fallback(n)

  if every parent is known:
     value      = Σ w_p · S(p).value
     confidence = GENERATION_DECAY · Σ w_p · S(p).confidence
     method     = traced (only if every ancestor path is traced, else partial)

  else (some parents unknown):
     # Fill the unknown share with the node's own reported_type, if it has one.
     r = REPORTED_VALUE[n.reported_type]
     if r is null:
        # Renormalize over the known parents, and penalize confidence by the missing share.
        value      = Σ_known w_p · S(p).value / Σ_known w_p
        confidence = GENERATION_DECAY · Σ_known w_p · S(p).confidence     # missing share contributes 0
     else:
        value      = Σ_known w_p · S(p).value + Σ_unknown w_p · r
        confidence = GENERATION_DECAY · (Σ_known w_p · S(p).confidence + Σ_unknown w_p · REPORTED_CONFIDENCE)
     method = partial

fallback(n):
  r = REPORTED_VALUE[n.reported_type]
  if r is null: return { value: null, confidence: 0, method: unknown }
  return { value: r, confidence: REPORTED_CONFIDENCE, method: reported }
```

Then: `sativa_pct = round(value)`, `indica_pct = 100 - sativa_pct`, apply the label bands and confidence levels.
If `value` is null: `label = unknown` and every number is null.

### Rules and edge cases

- **Cycles** are data errors. `vault-build` fails with the cycle path printed. Runtime code assumes a DAG
  but still guards with a visiting-set and returns `unknown` instead of overflowing the stack.
- **Backcrosses** (BX) work naturally through intermediate `cross` nodes:
  `X = A × (A × B)` gives `0.75·A + 0.25·B`.
- **Selections, phenos, cuts, S1s** have one parent with weight 1.0, and so inherit the parent's value
  with one generation of decay.
- **Three-way crosses** must go through a `cross` node (`(A × B) × C`) or explicit `parent_weights`.
- **Ruderalis/autoflower** genetics are out of scope for v1. Treat ruderalis landraces as
  `base_sativa_pct: 50` with a note, and flag them in the build report. Revisit in v2.
- **Traced vs. reported disagreement:** when `method` is `traced` or `partial` and the node has a
  `reported_type`, the UI may show "Breeder says: Indica-dominant". We never average the two silently.
- Rounding happens only at the end. Intermediate values stay floats.

## Worked example (fictional strains)

```
Landrace K  (base_sativa_pct 10)      Landrace T (base 90)      Landrace C (base 85)
        \                               /                            |
         Strain A = K × T   → 0.5·10 + 0.5·90 = 50                   |
                     \                                               /
                      Strain B = A × C  → 0.5·50 + 0.5·85 = 67.5 → 68
```

- Strain A: 50% → `hybrid / balanced`, confidence 0.97 → high
- Strain B: 68% → `hybrid / sativa-dominant`, confidence 0.97 · (0.5·0.97 + 0.5·1.0) ≈ 0.955 → high
- If C were `"unknown"` and B had `reported_type: sativa-dominant` (70):
  B = 0.5·50 + 0.5·70 = 60 → `hybrid / sativa-dominant`, confidence 0.97 · (0.5·0.97 + 0.5·0.5) ≈ 0.713 → medium, method `partial`.

## Required unit tests (T-005)

- Each landrace returns its base value with confidence 1.
- Equal-weight cross, custom weights, single-parent selection.
- Backcross through a cross node.
- One unknown parent with and without `reported_type`.
- All parents unknown → reported fallback → `unknown`.
- Every band boundary: 20/21, 40/41, 59/60, 79/80.
- Cycle detection (build) and the runtime guard.
- Memoization: a 5,000-node random DAG completes in < 50 ms on CI.
- Snapshot: the full seed dataset's outputs, so any algorithm change shows up as a reviewable diff.
