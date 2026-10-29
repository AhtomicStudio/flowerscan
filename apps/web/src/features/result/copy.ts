// Result view strings (docs/design/screens/result-sheet.md). No numbers, no percentages, no effect promises.
import type { LineageMethod, ReportedType, Sublabel } from "@flowerscan/core";

export const RESULT_COPY = {
  close: "Close",
  back: "Back",
  details: "Details",
  searchAnother: "Search another",
  commonlyReported: "Commonly reported",
  alsoReported: "Also reported",
  effectsLabel: "Commonly reported effects",
  showFewer: "Show fewer",
  more: (n: number) => `+${n} more`,
  howWeKnow: "How we know",
  familyTree: "Family tree",
  unknownParent: "Unknown parent",
  landrace: "Landrace",
  cross: "Cross",
  disputed: "Lineage disputed",
  disputedExplain:
    "Sources disagree about this strain's parents. We show the best-supported version.",
  originsUnknown: (name: string) => `Origins of ${name} are unknown.`,
  landraceEnds: "A landrace is where our family trees stop.",
  noTreeYet: "We don't have its family tree yet.",
  reportedType: "Reported type",
  breeder: "Breeder",
  sources: (n: number) => `${n} source${n === 1 ? "" : "s"}`,
  basedOn: (n: number) => `Based on ${n} source${n === 1 ? "" : "s"}.`,
  disputedCount: (n: number) => `${n} disputed`,
  howClassificationWorks: "How classification works",
  treeSummaryLandrace: "Where family trees stop",
  treeSummaryNone: "No family tree yet",
  unknownParentLower: "unknown parent",
  announce: (name: string, word: string) => `Result: ${name}. ${word}.`,
  notFoundTitle: "We can't find that strain.",
  notFoundBody: "The link may be old, or the strain may have a new name.",
  searchStrains: "Search strains",
} as const;

/** BasisLine (docs/08): one line per method, the term in bold. Never a number. */
export const BASIS: Record<LineageMethod | "landrace", { term: string | null; text: string }> = {
  traced: { term: "Lineage traced", text: "an estimate from its family tree, not a lab test." },
  partial: {
    term: "Partly traced",
    text: "an estimate from part of its family tree, not a lab test.",
  },
  reported: {
    term: "Reported type",
    text: "how sources describe it. We don't have enough of its family tree yet.",
  },
  unknown: { term: null, text: "We don't have enough of its family tree to say." },
  landrace: {
    term: "Landrace",
    text: "a traditional regional population, where our family trees stop.",
  },
};

/** LeanLine (D14): detail only, traced and partial only. */
export const LEAN: Record<Sublabel, { lead: string; term: string }> = {
  "indica-dominant": { lead: "Leans indica", term: "indica-dominant" },
  balanced: { lead: "An even mix", term: "balanced" },
  "sativa-dominant": { lead: "Leans sativa", term: "sativa-dominant" },
};

/** "What this is" inside How we know, by method and confidence level. */
export const WHAT_THIS_IS = {
  traced: {
    high: "Every branch of its family tree is traced to sourced data.",
    medium: "Every branch is traced, but through many generations, so treat it as an estimate.",
    low: "Every branch is traced, but through many generations, so treat it as an estimate.",
  },
  partial: {
    high: "Most of its family tree is traced. Where it ends, we use how sources describe those strains.",
    medium: "Part of its family tree is traced. The rest uses how sources describe it.",
    low: "Only a small part of its family tree is traced, so this is a rough estimate.",
  },
  reported:
    "We don't have enough of its family tree yet, so this is its reported type: how the breeder or published sources describe it.",
  unknown:
    "We don't have enough of its family tree to estimate it, and we only show what our data supports.",
  landrace:
    "A traditional regional population. Its classification follows our written landrace rubric, backed by two sources.",
} as const;

export const ESTIMATE_NOTE =
  "It's a lineage estimate: how its ancestors are usually classified, carried down the family tree. It isn't a DNA or lab test, and it doesn't predict how a strain feels.";

/** How sources describe it (reported_type). `unknown` has no line. */
export const REPORTED_TYPE_WORD: Record<Exclude<ReportedType, "unknown">, string> = {
  indica: "Indica",
  "indica-dominant": "Indica-dominant",
  balanced: "Balanced",
  "sativa-dominant": "Sativa-dominant",
  sativa: "Sativa",
};
