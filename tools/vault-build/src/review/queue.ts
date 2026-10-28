// The review queue (docs/04 "Founder review workflow", T-029): which notes to show, in which order, with
// what context. Pure: file bytes are hashed by the caller (Node), prechecks are parsed by the caller.
import {
  type GeneticNode,
  type Lineage,
  type LineageGraph,
  type NodeKind,
  type PrecheckRecord,
  PrecheckRecordSchema,
  type PrecheckVerdict,
  UNKNOWN_PARENT,
} from "@flowerscan/core";
import { isReviewed } from "./approve";

/** A genetic node note as read from disk. */
export interface ReviewNote {
  /** Vault-relative path, `/` separators. */
  readonly path: string;
  /** The path as shown to the reviewer, e.g. `data/vault/strains/Blue Dream.md`. */
  readonly file: string;
  readonly text: string;
  /** SHA-256 of the file's bytes, lowercase hex. */
  readonly sha256: string;
  readonly note: GeneticNode;
}

/** What the reviewer sees about a note's pre-check record. */
export type PrecheckState =
  | { readonly state: "none" }
  | { readonly state: "invalid"; readonly file: string; readonly problems: readonly string[] }
  | { readonly state: "current" | "stale"; readonly file: string; readonly record: PrecheckRecord };

/** `--verdict` values. `none` covers a missing or unreadable record; `stale` a record of an older note. */
export const VERDICT_FILTERS = ["ready", "check", "problem", "none", "stale"] as const;
export type VerdictFilter = (typeof VERDICT_FILTERS)[number];

export interface ParentView {
  /** Node id, or `"unknown"`. */
  readonly id: string;
  readonly name: string | null;
  readonly kind: NodeKind | null;
}

export interface ReviewItem extends ReviewNote {
  readonly parents: readonly ParentView[];
  /** Computed over the whole vault, unverified notes included (as `--include-unverified`). */
  readonly lineage: Lineage;
  /** Distinct nodes that have this one as an ancestor. */
  readonly descendants: number;
  /** Distinct ancestors that are still `unverified` (they don't ship, so shipped results treat them as unknown). */
  readonly unverifiedAncestors: number;
  readonly precheck: PrecheckState;
  readonly reviewed: boolean;
}

/** A pre-check file as read from `data/review/precheck/`, YAML already parsed (or a parse error). */
export interface PrecheckFile {
  /** File name without `.yaml`: must be the node id. */
  readonly id: string;
  /** As shown to the reviewer. */
  readonly file: string;
  readonly data: unknown;
  readonly error?: string;
}

/** Validates a pre-check file and compares its hash with the note's current bytes. */
export function precheckState(file: PrecheckFile | undefined, noteSha256: string): PrecheckState {
  if (file === undefined) return { state: "none" };
  if (file.error !== undefined)
    return { state: "invalid", file: file.file, problems: [file.error] };
  const parsed = PrecheckRecordSchema.safeParse(file.data);
  if (!parsed.success) {
    return {
      state: "invalid",
      file: file.file,
      problems: parsed.error.issues.map(
        (issue) => `${issue.path.length === 0 ? "(root)" : issue.path.join(".")}: ${issue.message}`,
      ),
    };
  }
  if (parsed.data.id !== file.id) {
    return {
      state: "invalid",
      file: file.file,
      problems: [`id is "${parsed.data.id}" but the file is named for "${file.id}"`],
    };
  }
  return {
    state: parsed.data.note_sha256 === noteSha256 ? "current" : "stale",
    file: file.file,
    record: parsed.data,
  };
}

/** The `--verdict` bucket of a pre-check. */
export function verdictOf(precheck: PrecheckState): VerdictFilter {
  if (precheck.state === "current") return precheck.record.verdict;
  if (precheck.state === "stale") return "stale";
  return "none";
}

/** The current (not stale) verdict, or null. */
export function currentVerdict(precheck: PrecheckState): PrecheckVerdict | null {
  return precheck.state === "current" ? precheck.record.verdict : null;
}

/** A stub: a note whose only parents are `"unknown"` (undisclosed lineage). Landraces are never stubs. */
export function isStub(note: GeneticNode): boolean {
  return note.parents.length > 0 && note.parents.every((parent) => parent === UNKNOWN_PARENT);
}

/** For each node, the set of its ancestors (ids), over a graph without cycles. */
function ancestorsOf(graph: LineageGraph): Map<string, Set<string>> {
  const memo = new Map<string, Set<string>>();
  const visit = (id: string, path: Set<string>): Set<string> => {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    const found = new Set<string>();
    path.add(id);
    for (const parent of graph.get(id)?.parents ?? []) {
      if (parent === UNKNOWN_PARENT || !graph.has(parent) || path.has(parent)) continue;
      found.add(parent);
      for (const ancestor of visit(parent, path)) found.add(ancestor);
    }
    path.delete(id);
    memo.set(id, found);
    return found;
  };
  for (const id of graph.keys()) visit(id, new Set());
  return memo;
}

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Queue order: landraces first, then most descendants, then name (case-insensitive), then id. */
export function compareItems(a: ReviewItem, b: ReviewItem): number {
  const rank = (item: ReviewItem) => (item.note.kind === "landrace" ? 0 : 1);
  return (
    rank(a) - rank(b) ||
    b.descendants - a.descendants ||
    compareText(a.note.name.toLowerCase(), b.note.name.toLowerCase()) ||
    compareText(a.note.id, b.note.id)
  );
}

export interface QueueInput {
  readonly notes: readonly ReviewNote[];
  /** Every node, parents resolved to ids (the compile's graph with every status shipped). */
  readonly graph: LineageGraph;
  readonly lineages: ReadonlyMap<string, Lineage>;
  /** Pre-check files by node id. */
  readonly prechecks: ReadonlyMap<string, PrecheckFile>;
}

/** Every genetic node with its review context, in queue order. */
export function buildQueue(input: QueueInput): ReviewItem[] {
  const ancestors = ancestorsOf(input.graph);
  const descendants = new Map<string, number>();
  for (const found of ancestors.values()) {
    for (const id of found) descendants.set(id, (descendants.get(id) ?? 0) + 1);
  }
  const items = input.notes.map((entry): ReviewItem => {
    const { note } = entry;
    const graphNode = input.graph.get(note.id);
    const lineage = input.lineages.get(note.id);
    if (graphNode === undefined || lineage === undefined) {
      throw new Error(`vault:review: ${note.id} is missing from the compiled vault`);
    }
    return {
      ...entry,
      parents: graphNode.parents.map((id) => {
        const parent = id === UNKNOWN_PARENT ? undefined : input.graph.get(id);
        return { id, name: parent?.name ?? null, kind: parent?.kind ?? null };
      }),
      lineage,
      descendants: descendants.get(note.id) ?? 0,
      unverifiedAncestors: [...(ancestors.get(note.id) ?? [])].filter(
        (id) => input.graph.get(id)?.verification === "unverified",
      ).length,
      precheck: precheckState(input.prechecks.get(note.id), entry.sha256),
      reviewed: isReviewed(note),
    };
  });
  return items.sort(compareItems);
}

export interface QueueFilters {
  /** Include notes a founder already reviewed. */
  readonly all: boolean;
  readonly kind: NodeKind | null;
  readonly verdict: VerdictFilter | null;
  /** Only these ids (empty = every id). */
  readonly ids: readonly string[];
}

export function filterQueue(items: readonly ReviewItem[], filters: QueueFilters): ReviewItem[] {
  return items.filter(
    (item) =>
      (filters.all || !item.reviewed) &&
      (filters.kind === null || item.note.kind === filters.kind) &&
      (filters.verdict === null || verdictOf(item.precheck) === filters.verdict) &&
      (filters.ids.length === 0 || filters.ids.includes(item.note.id)),
  );
}

/** Batch mode: unreviewed stubs whose pre-check is `ready` and not stale. */
export function readyStubs(items: readonly ReviewItem[]): ReviewItem[] {
  return items.filter(
    (item) => !item.reviewed && isStub(item.note) && currentVerdict(item.precheck) === "ready",
  );
}
