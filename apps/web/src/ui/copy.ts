// Strings shared by more than one feature (class words, the beta notice, data states, the responsible-use line).
import type { ClassificationLabel } from "@flowerscan/core";

/** The answer word (result) and the hero word. "Unknown lineage" never becomes a value or a 50/50. */
export const CLASS_WORD: Record<ClassificationLabel, string> = {
  indica: "Indica",
  hybrid: "Hybrid",
  sativa: "Sativa",
  unknown: "Unknown lineage",
};

/** ClassPill text (lists, family tree): the class word only (D14). */
export const CLASS_PILL_WORD: Record<ClassificationLabel, string> = {
  indica: "Indica",
  hybrid: "Hybrid",
  sativa: "Sativa",
  unknown: "Unknown",
};

export const BETA_NOTICE = "Beta: our strain data is still being reviewed.";

/** Every result shows it (docs/09). */
export const RESPONSIBLE_FOOTER = "Effects vary person to person. Start low, go slow.";

export const DATA_COPY = {
  loading: "Loading strain data",
  errorTitle: "Strain data didn't load.",
  errorBody: "Check your connection and try again.",
  retry: "Try again",
} as const;
