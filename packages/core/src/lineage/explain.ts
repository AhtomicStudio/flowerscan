// The "How we know" tree (docs/05, P9). Data only: the UI formats it.
import { UNKNOWN_PARENT } from "../schema/common";
import type { Derivation } from "../schema/enums";
import { scoreFrom, toLineage, UNKNOWN_SCORE } from "./compute";
import { weightsOf } from "./graph";
import type { LineageExplanation, LineageGraph, LineageNode } from "./types";

/** Resolved derivation, as in build output: `cross` for 2+ parents. */
function resolvedDerivation(node: LineageNode): Derivation | null {
  if (node.parents.length >= 2) return node.derivation ?? "cross";
  return node.derivation ?? null;
}

/**
 * The family tree of `nodeId`, `depth` generations deep (0 = the node alone, default 3). Every node
 * carries its `verification` so disputed ancestors are visible (P9). A node already on the path from
 * the root (a cycle) isn't expanded again. Returns null when `nodeId` isn't in the graph.
 */
export function explainLineage(
  graph: LineageGraph,
  nodeId: string,
  depth = 3,
): LineageExplanation | null {
  if (Number.isNaN(depth) || depth < 0 || (Number.isFinite(depth) && !Number.isInteger(depth))) {
    throw new RangeError(`depth must be a whole number ≥ 0 (got ${depth})`);
  }
  if (!graph.has(nodeId)) return null;
  const scores = scoreFrom(graph, [nodeId]);
  const path = new Set<string>();

  const build = (id: string, weight: number, remaining: number): LineageExplanation => {
    const node = id === UNKNOWN_PARENT ? undefined : graph.get(id);
    if (node === undefined) {
      return {
        id,
        name: null,
        kind: null,
        derivation: null,
        verification: null,
        value: null,
        weight,
        lineage: toLineage(UNKNOWN_SCORE),
        children: [],
        truncated: false,
      };
    }
    const score = scores.get(id) ?? UNKNOWN_SCORE;
    const hasParents = node.parents.length > 0;
    const expand = hasParents && remaining > 0 && !path.has(id);
    let children: LineageExplanation[] = [];
    if (expand) {
      const weights = weightsOf(node);
      path.add(id);
      children = node.parents.map((parent, i) => build(parent, weights[i] ?? 0, remaining - 1));
      path.delete(id);
    }
    return {
      id,
      name: node.name,
      kind: node.kind,
      derivation: resolvedDerivation(node),
      verification: node.verification,
      value: score.value,
      weight,
      lineage: toLineage(score),
      children,
      truncated: hasParents && !expand,
    };
  };

  return build(nodeId, 1, depth);
}
