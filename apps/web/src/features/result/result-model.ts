// Pure helpers that turn a StrainRecord into what the result shows. Nothing here invents a value:
// every output is derived from the record, the taxonomy, or the other shipped records.
import {
  type InlineCross,
  type LineageParent,
  type StrainRecord,
  UNKNOWN_PARENT,
} from "@flowerscan/core";
import type { ShippedTerm, StrainData } from "../../data/load-data";
import { BASIS, LEAN, REPORTED_TYPE_WORD, RESULT_COPY, WHAT_THIS_IS } from "./copy";

/** Ancestor generations drawn under the strain (root + 3 levels, docs/design). */
export const TREE_GENERATIONS = 3;

/** Chips shown before "+N more". */
export const TAG_COLLAPSE_AFTER = 8;

export function basisFor(record: StrainRecord): { term: string | null; text: string } {
  if (record.kind === "landrace") return BASIS.landrace;
  return BASIS[record.lineage.method];
}

/** "Leans sativa (sativa-dominant)" for traced and partial lineages with a sublabel; otherwise null. */
export function leanFor(record: StrainRecord): { lead: string; term: string } | null {
  const { method, sublabel } = record.lineage;
  if (record.kind === "landrace") return null;
  if (method !== "traced" && method !== "partial") return null;
  return sublabel === null ? null : LEAN[sublabel];
}

export function whatThisIs(record: StrainRecord): string {
  if (record.kind === "landrace") return WHAT_THIS_IS.landrace;
  const { method, confidence_level: level } = record.lineage;
  if (method === "reported") return WHAT_THIS_IS.reported;
  if (method === "unknown") return WHAT_THIS_IS.unknown;
  const byLevel = WHAT_THIS_IS[method];
  return level === "none" ? byLevel.medium : byLevel[level];
}

/** True when How we know adds the "lineage estimate, not a DNA or lab test" note. */
export function isEstimate(record: StrainRecord): boolean {
  return (
    record.kind !== "landrace" &&
    (record.lineage.method === "traced" || record.lineage.method === "partial")
  );
}

/** "Reported type: Sativa-dominant." when sources give one (not for landraces or unknown). */
export function reportedTypeWord(record: StrainRecord): string | null {
  if (record.kind === "landrace" || record.reported_type === "unknown") return null;
  return REPORTED_TYPE_WORD[record.reported_type];
}

/**
 * Effect tags from the taxonomy (effect facet only). A deprecated slug follows replaced_by to its active
 * term; a slug the taxonomy doesn't know is dropped rather than shown raw. Negatives go to one plain line.
 */
export function effectsFor(
  record: StrainRecord,
  terms: ReadonlyMap<string, ShippedTerm>,
): { chips: ShippedTerm[]; negatives: ShippedTerm[] } {
  const seen = new Set<string>();
  const chips: ShippedTerm[] = [];
  const negatives: ShippedTerm[] = [];
  for (const slug of record.effects) {
    let term = terms.get(slug);
    const visited = new Set<string>();
    while (term !== undefined && term.status === "deprecated" && term.replaced_by !== null) {
      if (visited.has(term.slug)) {
        term = undefined;
        break;
      }
      visited.add(term.slug);
      term = terms.get(term.replaced_by);
    }
    if (term === undefined || term.facet !== "effect" || term.status !== "active") continue;
    if (seen.has(term.slug)) continue;
    seen.add(term.slug);
    (term.polarity === "negative" ? negatives : chips).push(term);
  }
  return { chips, negatives };
}

/** A parent as the tree draws it. */
export type TreeNode =
  | { readonly kind: "unknown" }
  | { readonly kind: "record"; readonly record: StrainRecord }
  | { readonly kind: "cross"; readonly cross: InlineCross };

export function resolveParent(parent: LineageParent, byId: StrainData["byId"]): TreeNode {
  if (typeof parent !== "string") return { kind: "cross", cross: parent };
  if (parent === UNKNOWN_PARENT) return { kind: "unknown" };
  const record = byId.get(parent);
  // A parent id that isn't shipped can't be described, so it reads as unknown (never invented).
  return record === undefined ? { kind: "unknown" } : { kind: "record", record };
}

function nodeName(node: TreeNode): string {
  if (node.kind === "unknown") return RESULT_COPY.unknownParentLower;
  return node.kind === "cross" ? node.cross.name : node.record.name;
}

/** "Blueberry × Haze", "Where family trees stop" (landrace) or "No family tree yet". */
export function parentsSummary(record: StrainRecord, byId: StrainData["byId"]): string {
  if (record.parents.length === 0) {
    return record.kind === "landrace"
      ? RESULT_COPY.treeSummaryLandrace
      : RESULT_COPY.treeSummaryNone;
  }
  const names = record.parents.slice(0, 2).map((p) => nodeName(resolveParent(p, byId)));
  const rest = record.parents.length - 2;
  return names.join(" × ") + (rest > 0 ? ` +${rest}` : "");
}

/** Disputed nodes in the drawn tree (the strain itself and up to TREE_GENERATIONS of ancestors). */
export function disputedCount(record: StrainRecord, byId: StrainData["byId"]): number {
  let count = 0;
  const walk = (verification: string, parents: readonly LineageParent[], depth: number) => {
    if (verification === "disputed") count += 1;
    if (depth >= TREE_GENERATIONS) return;
    for (const parent of parents) {
      const node = resolveParent(parent, byId);
      if (node.kind === "record") walk(node.record.verification, node.record.parents, depth + 1);
      if (node.kind === "cross") walk(node.cross.verification, node.cross.parents, depth + 1);
    }
  };
  walk(record.verification, record.parents, 0);
  return count;
}

/** True when every parent is unknown: the tree ends here with "Origins of … are unknown." */
export function originsUnknown(parents: readonly LineageParent[]): boolean {
  return parents.length > 0 && parents.every((p) => p === UNKNOWN_PARENT);
}
