import type {
  BaseSativaPct,
  Derivation,
  LineageMethod,
  NodeKind,
  ReportedType,
  Verification,
} from "../schema/enums";
import type { Lineage } from "../schema/lineage";

/**
 * A genetic node (docs/04) with its parents resolved to ids. `parents` holds node ids or `"unknown"`.
 * A vault `GeneticNode` becomes one by replacing its wikilinks with the target ids (T-006).
 */
export interface LineageNode {
  readonly id: string;
  readonly name: string;
  readonly kind: NodeKind;
  readonly parents: readonly string[];
  readonly parent_weights?: readonly number[] | null | undefined;
  readonly derivation?: Derivation | null | undefined;
  readonly reported_type: ReportedType;
  readonly verification: Verification;
  readonly base_sativa_pct?: BaseSativaPct | null | undefined;
}

/** Nodes keyed by id. Build one with `createLineageGraph`. */
export type LineageGraph = ReadonlyMap<string, LineageNode>;

/**
 * One node of the "How we know" tree from `explainLineage`. Data only, no UI strings. An undisclosed
 * (`"unknown"`) or unresolved parent has `name`, `kind` and `verification` set to null.
 */
export interface LineageExplanation {
  /** Node id, or the literal parent entry (`"unknown"` or an unresolved id). */
  readonly id: string;
  readonly name: string | null;
  readonly kind: NodeKind | null;
  /** Resolved: `cross` for 2+ parents, null with no parents or a lone `"unknown"` parent. */
  readonly derivation: Derivation | null;
  /** Shown per node so the UI can mark disputed ancestors (P9). */
  readonly verification: Verification | null;
  /** Unrounded sativa value for this node, or null when unknown. */
  readonly value: number | null;
  /** This node's share of its child's value (1 for the root). */
  readonly weight: number;
  /** The node's full result: rounded percentages, label, confidence, and method. */
  readonly lineage: Lineage;
  readonly children: readonly LineageExplanation[];
  /** True when the node has parents that were left out (depth limit, or a cycle back to an ancestor). */
  readonly truncated: boolean;
}

/** Internal per-node result of `S(n)` in docs/05. */
export interface Score {
  readonly value: number | null;
  readonly confidence: number;
  readonly method: LineageMethod;
}
