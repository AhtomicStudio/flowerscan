# Scan Eval (golden set)

Measures how well the scanner identifies real packages. Spec:
[06-scan-pipeline.md](../../docs/06-scan-pipeline.md#evaluation-harness-t-012). Built in **T-012**.

```
data/eval/
├── packages/        photos: <slug>-<n>.jpg (our own photos or used with permission; not published)
├── ocr-cache/       stored OCR outputs per photo + engine, so match evals are fast and deterministic
├── expected.yaml    - file, strain_id (or null for "not in DB"), state, package_says?, potency_readings?, notes?
└── history.md       one line per eval run: date, data_version, engine, top1, top3, false_accept, no_match
```

## Collecting photos
- Aim for variety: bags, jars, pre-roll tubes, boxes. Glossy, matte, curved, dim light, angled, partial.
- Include hard cases on purpose: brand name bigger than strain name, stylized fonts, strains not in our DB
  (expected `null`, to test that we *don't* false-accept).
- Strip EXIF location before storing. Photos stay on the founders' machines: `data/eval/packages/` is gitignored
  because the repo is public. Only the OCR cache (text, no images) is committed, so CI can run fast mode.
- **Required state coverage before launch (P11):** labels from **CA, MI, NY, WA and CO**, plus at least one
  **hemp THCa** package. Record the state in `expected.yaml`.
- Record every potency figure printed on the label in `expected.yaml`. It doubles as input to the internal
  potency table (`data/observations/`, T-025).
- Start with 50 photos, then grow to 200+.
