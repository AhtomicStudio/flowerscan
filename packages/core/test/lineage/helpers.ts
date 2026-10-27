// Builders for lineage tests. Every strain and landrace name here is fictional.
import type {
  BaseSativaPct,
  Derivation,
  NodeKind,
  ReportedType,
  Verification,
} from "../../src/index";
import { createLineageGraph, type LineageGraph, type LineageNode } from "../../src/lineage";

interface NodeOptions {
  kind?: NodeKind;
  weights?: number[] | null;
  derivation?: Derivation | null;
  reported?: ReportedType;
  verification?: Verification;
}

const title = (id: string) =>
  id
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export function landrace(
  id: string,
  base: BaseSativaPct | null,
  options: Pick<NodeOptions, "reported" | "verification"> = {},
): LineageNode {
  return {
    id,
    name: title(id),
    kind: "landrace",
    parents: [],
    base_sativa_pct: base,
    reported_type: options.reported ?? "unknown",
    verification: options.verification ?? "verified",
  };
}

export function strain(id: string, parents: string[], options: NodeOptions = {}): LineageNode {
  return {
    id,
    name: title(id),
    kind: options.kind ?? "strain",
    parents,
    parent_weights: options.weights ?? null,
    derivation: options.derivation ?? (parents.length >= 2 ? "cross" : null),
    reported_type: options.reported ?? "unknown",
    verification: options.verification ?? "verified",
  };
}

export const graphOf = (...nodes: LineageNode[]): LineageGraph => createLineageGraph(nodes);

/** The fictional worked example from docs/05: K (10), T (90), C (90), A = K × T, B = A × C. */
export function workedExample(extra: LineageNode[] = []): LineageGraph {
  return graphOf(
    landrace("landrace-k", 10),
    landrace("landrace-t", 90),
    landrace("landrace-c", 90),
    strain("strain-a", ["landrace-k", "landrace-t"]),
    strain("strain-b", ["strain-a", "landrace-c"]),
    ...extra,
  );
}

/** mulberry32: a tiny seeded PRNG, so "random" test graphs are the same on every run. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASES: readonly BaseSativaPct[] = [10, 25, 50, 75, 90];
const REPORTED: readonly ReportedType[] = [
  "indica",
  "indica-dominant",
  "balanced",
  "sativa-dominant",
  "sativa",
  "unknown",
];

/**
 * A random DAG of `size` nodes: the first `landraces` are landraces, and every later node takes 1–3
 * parents from earlier nodes (or "unknown"), so there are no cycles. Deterministic for a given seed.
 */
export function randomDag(size: number, seed: number, landraces = 50): LineageNode[] {
  const random = seededRandom(seed);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;
  const nodes: LineageNode[] = [];
  for (let i = 0; i < size; i += 1) {
    const id = `node-${i}`;
    if (i < landraces) {
      nodes.push(landrace(id, random() < 0.9 ? pick(BASES) : null, { reported: pick(REPORTED) }));
      continue;
    }
    const count = 1 + Math.floor(random() * 3);
    const parents: string[] = [];
    for (let p = 0; p < count; p += 1) {
      parents.push(random() < 0.05 ? "unknown" : `node-${Math.floor(random() * i)}`);
    }
    const derivation: Derivation = count === 1 ? pick<Derivation>(["s1", "cut", "pheno"]) : "cross";
    nodes.push(strain(id, parents, { derivation, reported: pick(REPORTED) }));
  }
  return nodes;
}
