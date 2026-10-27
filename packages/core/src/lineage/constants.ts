// Product-tunable constants for the lineage algorithm (docs/05 "Constants"). Changing any value here can
// change the output for some input, so bump ALGO_VERSION in the same change.
import type {
  ClassificationLabel,
  ConfidenceLevel,
  Derivation,
  ReportedType,
  Sublabel,
} from "../schema/enums";

/** Version of the algorithm in docs/05. Bump it whenever the output for any input can change. */
export const ALGO_VERSION = 1;

/** Sativa value used when we fall back on what sources say. `unknown` has no value. */
export const REPORTED_VALUE: Readonly<Record<ReportedType, number | null>> = {
  sativa: 85,
  "sativa-dominant": 70,
  balanced: 50,
  "indica-dominant": 30,
  indica: 15,
  unknown: null,
};

/** Confidence multiplier per new generation. */
export const GENERATION_DECAY = 0.97;

/** Confidence of a value that comes from a `reported_type` instead of a traced lineage. */
export const REPORTED_CONFIDENCE = 0.5;

/**
 * Single-parent derivations that are not a new generation, so they get no decay (P7): a `cut` is the
 * same plant as its source, and a `pheno` belongs to its seed line's population.
 */
export const NO_DECAY_DERIVATIONS: readonly Derivation[] = ["cut", "pheno"];

export interface LabelBand {
  /** Lowest rounded `sativa_pct` in the band, inclusive. Bands run up to the next band's `min`. */
  readonly min: number;
  readonly label: Exclude<ClassificationLabel, "unknown">;
  readonly sublabel: Sublabel | null;
}

/** Label bands on the final rounded `sativa_pct`, highest first. */
export const LABEL_BANDS: readonly LabelBand[] = [
  { min: 80, label: "sativa", sublabel: null },
  { min: 60, label: "hybrid", sublabel: "sativa-dominant" },
  { min: 41, label: "hybrid", sublabel: "balanced" },
  { min: 21, label: "hybrid", sublabel: "indica-dominant" },
  { min: 0, label: "indica", sublabel: null },
];

export interface ConfidenceThreshold {
  /** Lowest confidence for the level, inclusive. */
  readonly min: number;
  readonly level: Exclude<ConfidenceLevel, "none" | "low">;
}

/** high ≥ 0.75, medium ≥ 0.5. Anything else above 0 is `low`, and exactly 0 is `none`. */
export const CONFIDENCE_THRESHOLDS: readonly ConfidenceThreshold[] = [
  { min: 0.75, level: "high" },
  { min: 0.5, level: "medium" },
];
