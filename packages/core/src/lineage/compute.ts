// docs/05 `S(n)`, the label bands, and the confidence levels.
import { UNKNOWN_PARENT } from "../schema/common";
import type { ConfidenceLevel } from "../schema/enums";
import type { Lineage } from "../schema/lineage";
import {
  ALGO_VERSION,
  CONFIDENCE_THRESHOLDS,
  GENERATION_DECAY,
  LABEL_BANDS,
  type LabelBand,
  NO_DECAY_DERIVATIONS,
  REPORTED_CONFIDENCE,
  REPORTED_VALUE,
} from "./constants";
import { componentsFrom, isCycle, weightsOf } from "./graph";
import type { LineageGraph, LineageNode, Score } from "./types";

export const UNKNOWN_SCORE: Score = { value: null, confidence: 0, method: "unknown" };

/** The band for a rounded `sativa_pct` (0–100). */
export function labelFor(sativaPct: number): LabelBand {
  for (const band of LABEL_BANDS) {
    if (sativaPct >= band.min) return band;
  }
  return LABEL_BANDS[LABEL_BANDS.length - 1] as LabelBand;
}

/** high ≥ 0.75, medium ≥ 0.5, low > 0, none = 0. */
export function confidenceLevelFor(confidence: number): ConfidenceLevel {
  if (confidence <= 0) return "none";
  for (const threshold of CONFIDENCE_THRESHOLDS) {
    if (confidence >= threshold.min) return threshold.level;
  }
  return "low";
}

/** Turns a score into the shipped lineage object. Rounding happens only here. */
export function toLineage(score: Score): Lineage {
  if (score.value === null) {
    return {
      sativa_pct: null,
      indica_pct: null,
      label: "unknown",
      sublabel: null,
      confidence: 0,
      confidence_level: "none",
      method: "unknown",
      algo_version: ALGO_VERSION,
    };
  }
  const sativaPct = Math.round(score.value);
  const band = labelFor(sativaPct);
  return {
    sativa_pct: sativaPct,
    indica_pct: 100 - sativaPct,
    label: band.label,
    sublabel: band.sublabel,
    confidence: score.confidence,
    confidence_level: confidenceLevelFor(score.confidence),
    method: score.method,
    algo_version: ALGO_VERSION,
  };
}

function fallback(node: LineageNode): Score {
  const reported = REPORTED_VALUE[node.reported_type];
  if (reported === null) return UNKNOWN_SCORE;
  return { value: reported, confidence: REPORTED_CONFIDENCE, method: "reported" };
}

/** `S(n)` for one node, given the scores of every parent already in `scores`. */
function scoreNode(node: LineageNode, scores: ReadonlyMap<string, Score>): Score {
  if (node.kind === "landrace") {
    const base = node.base_sativa_pct;
    // P10: a landrace without a sourced base value has no value of its own.
    if (base === undefined || base === null) return fallback(node);
    return { value: base, confidence: 1, method: "traced" };
  }
  if (node.parents.length === 0) return fallback(node);

  const weights = weightsOf(node);
  let knownValue = 0;
  let knownConfidence = 0;
  let knownWeight = 0;
  let knownCount = 0;
  let unknownWeight = 0;
  let unknownCount = 0;
  let allTraced = true;
  node.parents.forEach((parent, i) => {
    const weight = weights[i] ?? 0;
    // `"unknown"`, an unresolved id, or a parent in a cycle: no value.
    const score = parent === UNKNOWN_PARENT ? undefined : scores.get(parent);
    if (score === undefined || score.value === null) {
      unknownWeight += weight;
      unknownCount += 1;
      return;
    }
    knownValue += weight * score.value;
    knownConfidence += weight * score.confidence;
    knownWeight += weight;
    knownCount += 1;
    if (score.method !== "traced") allTraced = false;
  });

  if (knownCount === 0) return fallback(node);

  // P7: a cut, and a pheno whose only parent is its seed line, are not a new generation.
  const derivation = node.derivation ?? null;
  const decay =
    node.parents.length === 1 && derivation !== null && NO_DECAY_DERIVATIONS.includes(derivation)
      ? 1
      : GENERATION_DECAY;

  if (unknownCount === 0) {
    return {
      value: knownValue,
      confidence: decay * knownConfidence,
      method: allTraced ? "traced" : "partial",
    };
  }

  const reported = REPORTED_VALUE[node.reported_type];
  if (reported === null) {
    // Renormalize over the known parents; the missing share contributes no confidence.
    return {
      value: knownValue / knownWeight,
      confidence: decay * knownConfidence,
      method: "partial",
    };
  }
  return {
    value: knownValue + unknownWeight * reported,
    confidence: decay * (knownConfidence + unknownWeight * REPORTED_CONFIDENCE),
    method: "partial",
  };
}

/**
 * Scores every node reachable from `roots`, each exactly once (memoized), ancestors first. Nodes in a
 * cycle are a data error: they score `unknown`, whatever order they're reached in.
 */
export function scoreFrom(graph: LineageGraph, roots: Iterable<string>): Map<string, Score> {
  const scores = new Map<string, Score>();
  for (const component of componentsFrom(graph, roots)) {
    const cyclic = isCycle(graph, component);
    for (const id of component) {
      const node = graph.get(id) as LineageNode;
      scores.set(id, cyclic ? UNKNOWN_SCORE : scoreNode(node, scores));
    }
  }
  return scores;
}

/**
 * The lineage of one node (docs/05). An id that isn't in the graph, or a node in a cycle, gives the
 * `unknown` result. Throws when a node's `parent_weights` don't line up with its parents.
 */
export function computeLineage(graph: LineageGraph, nodeId: string): Lineage {
  const score = scoreFrom(graph, [nodeId]).get(nodeId) ?? UNKNOWN_SCORE;
  return toLineage(score);
}

/** The lineage of every node, keyed by id in the graph's order. Each node is computed once. */
export function computeAll(graph: LineageGraph): Map<string, Lineage> {
  const scores = scoreFrom(graph, graph.keys());
  const result = new Map<string, Lineage>();
  for (const id of graph.keys()) result.set(id, toLineage(scores.get(id) ?? UNKNOWN_SCORE));
  return result;
}
