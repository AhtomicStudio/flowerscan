// Graph helpers: construction, weights, strongly connected components, and cycle paths.
import { UNKNOWN_PARENT } from "../schema/common";
import type { LineageGraph, LineageNode } from "./types";

/** Builds a graph keyed by node id. Throws on a duplicate id or the reserved id `"unknown"`. */
export function createLineageGraph(nodes: Iterable<LineageNode>): LineageGraph {
  const graph = new Map<string, LineageNode>();
  for (const node of nodes) {
    if (node.id === UNKNOWN_PARENT) {
      throw new Error(`"${UNKNOWN_PARENT}" is reserved for undisclosed parents and can't be an id`);
    }
    if (graph.has(node.id)) throw new Error(`duplicate node id ${node.id}`);
    graph.set(node.id, node);
  }
  return graph;
}

/** `parent_weights`, or an equal split. Throws when the weights don't line up with the parents. */
export function weightsOf(node: LineageNode): readonly number[] {
  const count = node.parents.length;
  const weights = node.parent_weights;
  if (weights === undefined || weights === null) return node.parents.map(() => 1 / count);
  if (weights.length !== count) {
    throw new Error(
      `${node.id}: parent_weights has ${weights.length} entries but parents has ${count}`,
    );
  }
  return weights;
}

/** Parents that are nodes in the graph, in order. `"unknown"` and unresolved ids are not edges. */
function edgesOf(graph: LineageGraph, id: string): string[] {
  const node = graph.get(id);
  if (node === undefined) return [];
  return node.parents.filter((parent) => parent !== UNKNOWN_PARENT && graph.has(parent));
}

interface Frame {
  readonly id: string;
  readonly edges: readonly string[];
  next: number;
}

/**
 * Tarjan's strongly connected components over the nodes reachable from `roots`, iterative so deep
 * lineages can't overflow the stack. Components come out ancestors first: every parent's component is
 * emitted before its child's, which is the evaluation order for docs/05 `S(n)`.
 */
export function componentsFrom(graph: LineageGraph, roots: Iterable<string>): string[][] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const components: string[][] = [];
  const work: Frame[] = [];
  let counter = 0;

  const open = (id: string) => {
    index.set(id, counter);
    low.set(id, counter);
    counter += 1;
    stack.push(id);
    onStack.add(id);
    work.push({ id, edges: edgesOf(graph, id), next: 0 });
  };
  const lower = (id: string, candidate: number) => {
    if (candidate < (low.get(id) ?? candidate)) low.set(id, candidate);
  };

  for (const root of roots) {
    if (!graph.has(root) || index.has(root)) continue;
    open(root);
    while (work.length > 0) {
      const frame = work[work.length - 1] as Frame;
      const parent = frame.edges[frame.next];
      if (parent !== undefined) {
        frame.next += 1;
        const seen = index.get(parent);
        if (seen === undefined) open(parent);
        else if (onStack.has(parent)) lower(frame.id, seen);
        continue;
      }
      work.pop();
      const ownLow = low.get(frame.id) ?? 0;
      if (ownLow === index.get(frame.id)) {
        const component: string[] = [];
        let member: string | undefined;
        do {
          member = stack.pop() as string;
          onStack.delete(member);
          component.push(member);
        } while (member !== frame.id);
        components.push(component);
      }
      const caller = work[work.length - 1];
      if (caller !== undefined) lower(caller.id, ownLow);
    }
  }
  return components;
}

/** A component is a cycle when it has 2+ nodes, or one node that lists itself as a parent. */
export function isCycle(graph: LineageGraph, component: readonly string[]): boolean {
  if (component.length > 1) return true;
  const only = component[0] as string;
  return edgesOf(graph, only).includes(only);
}

/** Shortest path from `start` back to itself inside one component, following parents in order. */
function cyclePath(graph: LineageGraph, component: readonly string[], start: string): string[] {
  const members = new Set(component);
  const previous = new Map<string, string>();
  const queue = [start];
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head] as string;
    for (const parent of edgesOf(graph, current)) {
      if (parent === start) {
        // Walk back from `current` to `start`, then reverse into child → parent order.
        const tail: string[] = [];
        for (let step = current; step !== start; step = previous.get(step) ?? start) {
          tail.push(step);
        }
        return [start, ...tail.reverse(), start];
      }
      if (members.has(parent) && !previous.has(parent)) {
        previous.set(parent, current);
        queue.push(parent);
      }
    }
  }
  // Unreachable: every node of a cycle group lies on a loop back to `start`.
  return [start, start];
}

/**
 * Every cycle in the graph, one path per cycle group, for `vault-build` to report. Each path follows
 * child → parent links and ends where it starts, e.g. `["a", "b", "a"]` means a lists b as a parent and
 * b lists a. Paths start at the group's smallest id and are sorted by it, so output is deterministic.
 * Fix one and rebuild: a group with several loops reports the next one.
 */
export function findCycles(graph: LineageGraph): string[][] {
  const cycles: string[][] = [];
  for (const component of componentsFrom(graph, graph.keys())) {
    if (!isCycle(graph, component)) continue;
    // Default sort compares UTF-16 code units: locale-independent, so deterministic.
    const start = [...component].sort()[0] as string;
    cycles.push(cyclePath(graph, component, start));
  }
  return cycles.sort((a, b) => ((a[0] as string) < (b[0] as string) ? -1 : 1));
}
