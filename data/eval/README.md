# Scan Eval (golden set)

Measures how well the scanner identifies real packages. Spec:
[06-scan-pipeline.md](../../docs/06-scan-pipeline.md#evaluation-harness-t-012). Built in **T-012**.

```
data/eval/
├── packages/        photos: <slug>-<n>.jpg (our own photos or used with permission; not published)
├── ocr-cache/       stored OCR outputs per photo + engine, so match evals are fast and deterministic
├── expected.yaml    - file, strain_id (or null for "not in DB"), package_says?, thc_pct?, notes?
└── history.md       one line per eval run: date, data_version, engine, top1, top3, false_accept, no_match
```

## Collecting photos
- Aim for variety: bags, jars, pre-roll tubes, boxes. Glossy, matte, curved, dim light, angled, partial.
- Include hard cases on purpose: brand name bigger than strain name, stylized fonts, strains not in our DB
  (expected `null`, to test that we *don't* false-accept).
- Strip EXIF location before committing.
- Start with 50 photos, then grow to 200+.
