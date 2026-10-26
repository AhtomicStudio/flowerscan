// Refinement rules shared by vault nodes and build output. Internal: not exported from the package.
import { sumOf, WEIGHT_SUM_TOLERANCE } from "./common";
import type { Derivation, NodeKind } from "./enums";

export interface Issue {
  path: PropertyKey[];
  message: string;
}

interface LineageShape {
  kind: NodeKind;
  parentCount: number;
  /** True when the node has exactly one parent and it is `"unknown"`. */
  loneUnknownParent: boolean;
  parentWeights: readonly number[] | null | undefined;
  derivation: Derivation | null | undefined;
}

export function parentCountIssues({ kind, parentCount }: LineageShape): Issue[] {
  if (kind === "landrace" && parentCount > 0) {
    return [
      { path: ["parents"], message: "a landrace has no parents (lineage recursion stops here)" },
    ];
  }
  if (kind === "strain" && parentCount === 0) {
    return [
      { path: ["parents"], message: 'a strain needs parents; use ["unknown"] if undisclosed' },
    ];
  }
  if (kind === "cross" && parentCount < 2) {
    return [{ path: ["parents"], message: "a cross needs at least two parents" }];
  }
  return [];
}

export function weightIssues({ parentCount, parentWeights }: LineageShape): Issue[] {
  if (parentWeights === undefined || parentWeights === null) return [];
  if (parentWeights.length !== parentCount) {
    return [
      {
        path: ["parent_weights"],
        message: `parent_weights has ${parentWeights.length} entries but parents has ${parentCount}`,
      },
    ];
  }
  const total = sumOf(parentWeights);
  if (Math.abs(total - 1) > WEIGHT_SUM_TOLERANCE) {
    return [{ path: ["parent_weights"], message: `parent_weights must sum to 1 (got ${total})` }];
  }
  return [];
}

/**
 * P7: a single-parent node must say how it relates to its parent (s1, cut, or pheno). A lone
 * "unknown" parent means the lineage is undisclosed, so `derivation` may be left empty. With two or
 * more parents the derivation is `cross`. In the vault it may be omitted (the default); `resolved`
 * mode (build output) requires it to be written out.
 */
export function derivationIssues(shape: LineageShape, resolved: boolean): Issue[] {
  const derivation = shape.derivation ?? null;
  const count = shape.parentCount;
  const at = (message: string): Issue[] => [{ path: ["derivation"], message }];
  if (count === 0) {
    return derivation === null ? [] : at("derivation needs at least one parent");
  }
  if (count === 1) {
    if (derivation === "cross") return at("a single-parent node is s1, cut, or pheno");
    if (derivation === null && !shape.loneUnknownParent) {
      return at("derivation is required with one parent: s1, cut, or pheno (P7)");
    }
    return [];
  }
  if (derivation === "cross") return [];
  if (derivation === null && !resolved) return [];
  return at(`derivation must be cross with ${count} parents`);
}

export function lineageShapeIssues(shape: LineageShape, resolved: boolean): Issue[] {
  return [
    ...parentCountIssues(shape),
    ...weightIssues(shape),
    ...derivationIssues(shape, resolved),
  ];
}
