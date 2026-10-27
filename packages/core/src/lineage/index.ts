// Public API of the lineage engine (docs/05). Re-exported from the package entry.
export { computeAll, computeLineage, confidenceLevelFor, labelFor } from "./compute";
export {
  ALGO_VERSION,
  CONFIDENCE_THRESHOLDS,
  type ConfidenceThreshold,
  GENERATION_DECAY,
  LABEL_BANDS,
  type LabelBand,
  NO_DECAY_DERIVATIONS,
  REPORTED_CONFIDENCE,
  REPORTED_VALUE,
} from "./constants";
export { explainLineage } from "./explain";
export { createLineageGraph, findCycles } from "./graph";
export type { LineageExplanation, LineageGraph, LineageNode } from "./types";
