// Shared enums from docs/04-data-model.md. Each one is exported as a readonly tuple (for UI lists and
// exhaustive checks), a zod schema, and an inferred type. Values must match docs/04 exactly.
import { z } from "zod";

/** Version of the note/record schemas described in docs/04-data-model.md. */
export const SCHEMA_VERSION = 1;

export const NODE_KINDS = ["landrace", "strain", "cross"] as const;
export const NodeKindSchema = z.enum(NODE_KINDS);
export type NodeKind = z.infer<typeof NodeKindSchema>;

/** Kinds that ship as search entries in `strains.json`. Crosses are inlined in lineage trees. */
export const SEARCHABLE_KINDS = ["strain", "landrace"] as const;
export const SearchableKindSchema = z.enum(SEARCHABLE_KINDS);
export type SearchableKind = z.infer<typeof SearchableKindSchema>;

export const DERIVATIONS = ["cross", "s1", "cut", "pheno"] as const;
export const DerivationSchema = z.enum(DERIVATIONS);
export type Derivation = z.infer<typeof DerivationSchema>;

export const REPORTED_TYPES = [
  "indica",
  "indica-dominant",
  "balanced",
  "sativa-dominant",
  "sativa",
  "unknown",
] as const;
export const ReportedTypeSchema = z.enum(REPORTED_TYPES);
export type ReportedType = z.infer<typeof ReportedTypeSchema>;

/** Landrace base values: the coarse scale only (P10). */
export const BASE_SATIVA_PCTS = [10, 25, 50, 75, 90] as const;
export const BaseSativaPctSchema = z.union(
  BASE_SATIVA_PCTS.map((value) => z.literal(value)),
  {
    error: "base_sativa_pct must be one of 10, 25, 50, 75, 90 (P10)",
  },
);
export type BaseSativaPct = (typeof BASE_SATIVA_PCTS)[number];

export const VERIFICATIONS = ["unverified", "verified", "disputed"] as const;
export const VerificationSchema = z.enum(VERIFICATIONS);
export type Verification = z.infer<typeof VerificationSchema>;

export const SOURCE_SUPPORTS = [
  "parents",
  "reported_type",
  "effects",
  "flavors",
  "terpenes",
  "typical_thc_pct",
  "aliases",
  "base_sativa_pct",
] as const;
export const SourceSupportSchema = z.enum(SOURCE_SUPPORTS);
export type SourceSupport = z.infer<typeof SourceSupportSchema>;

export const FACETS = ["effect", "flavor", "terpene"] as const;
export const FacetSchema = z.enum(FACETS);
export type Facet = z.infer<typeof FacetSchema>;

export const POLARITIES = ["positive", "neutral", "negative"] as const;
export const PolaritySchema = z.enum(POLARITIES);
export type Polarity = z.infer<typeof PolaritySchema>;

export const TERM_STATUSES = ["active", "deprecated"] as const;
export const TermStatusSchema = z.enum(TERM_STATUSES);
export type TermStatus = z.infer<typeof TermStatusSchema>;

export const CLASSIFICATION_LABELS = ["indica", "hybrid", "sativa", "unknown"] as const;
export const ClassificationLabelSchema = z.enum(CLASSIFICATION_LABELS);
export type ClassificationLabel = z.infer<typeof ClassificationLabelSchema>;

export const SUBLABELS = ["indica-dominant", "balanced", "sativa-dominant"] as const;
export const SublabelSchema = z.enum(SUBLABELS);
export type Sublabel = z.infer<typeof SublabelSchema>;

export const CONFIDENCE_LEVELS = ["high", "medium", "low", "none"] as const;
export const ConfidenceLevelSchema = z.enum(CONFIDENCE_LEVELS);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

export const LINEAGE_METHODS = ["traced", "partial", "reported", "unknown"] as const;
export const LineageMethodSchema = z.enum(LINEAGE_METHODS);
export type LineageMethod = z.infer<typeof LineageMethodSchema>;

export const SCAN_METHODS = ["text", "barcode", "qr", "manual", "link"] as const;
export const ScanMethodSchema = z.enum(SCAN_METHODS);
export type ScanMethod = z.infer<typeof ScanMethodSchema>;

/** The label claim read from a package: three values only (P3). */
export const PACKAGE_SAYS = ["indica", "sativa", "hybrid"] as const;
export const PackageSaysSchema = z.enum(PACKAGE_SAYS);
export type PackageSays = z.infer<typeof PackageSaysSchema>;

export const PRODUCT_FORMS = [
  "flower",
  "pre-roll",
  "vape",
  "edible",
  "concentrate",
  "other",
] as const;
export const ProductFormSchema = z.enum(PRODUCT_FORMS);
export type ProductForm = z.infer<typeof ProductFormSchema>;

export const POTENCY_ANALYTES = [
  "total_thc",
  "thca",
  "delta9_thc",
  "thc_unspecified",
  "total_cbd",
  "cbda",
  "cbd",
  "total_cannabinoids",
] as const;
export const PotencyAnalyteSchema = z.enum(POTENCY_ANALYTES);
export type PotencyAnalyte = z.infer<typeof PotencyAnalyteSchema>;

export const POTENCY_QUALIFIERS = ["exact", "nd", "below_loq", "less_than"] as const;
export const PotencyQualifierSchema = z.enum(POTENCY_QUALIFIERS);
export type PotencyQualifier = z.infer<typeof PotencyQualifierSchema>;

export const POTENCY_UNITS = ["percent", "mg_per_g"] as const;
export const PotencyUnitSchema = z.enum(POTENCY_UNITS);
export type PotencyUnit = z.infer<typeof PotencyUnitSchema>;

/** Every value, including `user_opt_in`, which the observation schema rejects until Phase 2 (P2). */
export const POTENCY_SOURCES = ["founder_record", "eval_set", "user_opt_in"] as const;
export const PotencySourceSchema = z.enum(POTENCY_SOURCES);
export type PotencySource = z.infer<typeof PotencySourceSchema>;

/** Barcode formats the scanner reports (docs/06 §2), named as the Barcode Detection API names them. */
export const BARCODE_FORMATS = [
  "qr_code",
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "data_matrix",
  "pdf417",
] as const;
export const BarcodeFormatSchema = z.enum(BARCODE_FORMATS);
export type BarcodeFormat = z.infer<typeof BarcodeFormatSchema>;

/** UPC/EAN formats: learnable on the first confirmed scan (P13). */
export const RETAIL_BARCODE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"] as const;

export const THEMES = ["system", "dark", "light"] as const;
export const ThemeSchema = z.enum(THEMES);
export type Theme = z.infer<typeof ThemeSchema>;

/** USPS two-letter codes: the 50 states, DC, and the inhabited territories. */
export const US_STATE_CODES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
  "PR",
  "VI",
  "GU",
  "MP",
  "AS",
] as const;
export const UsStateCodeSchema = z.enum(US_STATE_CODES);
export type UsStateCode = z.infer<typeof UsStateCodeSchema>;
