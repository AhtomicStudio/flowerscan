// The vault build pipeline (tools/vault-build/README.md), as a pure function over files already in memory.
// File-system access lives in fs-io.ts, so everything here is deterministic and testable.
import {
  type BannedTerms,
  type Breeder,
  computeAll,
  createLineageGraph,
  type Derivation,
  type Facet,
  findBannedTerms,
  findCycles,
  type GeneticNode,
  getTerm,
  type InlineCross,
  isSupported,
  type Lineage,
  type LineageNode,
  type LineageParent,
  loadBannedTerms,
  loadTaxonomy,
  NODE_KINDS,
  normalize,
  parseNote,
  parseWikilink,
  resolveTerm,
  type StrainRecord,
  StrainsFileSchema,
  sanitizeFilename,
  type Taxonomy,
  UNKNOWN_PARENT,
  type VaultNote,
  VERIFICATIONS,
  type Verification,
  type YamlParser,
} from "@flowerscan/core";
import { createLinkIndex } from "./links";
import type {
  BreederRecord,
  BuildData,
  CompileResult,
  DataFile,
  ErrorCode,
  Issue,
  LandraceReview,
  TaxonomyOutput,
  VaultFile,
  WarningCode,
} from "./types";

export interface CompileInput {
  /** Every Markdown file under the vault. Non-note paths (see `isNotePath`) are ignored. */
  readonly notes: readonly VaultFile[];
  /** How the vault root is shown in messages, e.g. `data/vault`. */
  readonly vaultLabel: string;
  readonly taxonomy: DataFile;
  readonly banned: DataFile;
  /** Dev builds only: ship `unverified` nodes too. */
  readonly includeUnverified: boolean;
  readonly parseYaml: YamlParser;
}

const KIND_FOLDERS: Readonly<Record<VaultNote["kind"], string>> = {
  landrace: "landraces",
  strain: "strains",
  cross: "crosses",
  breeder: "breeders",
};

/** Folders that never hold notes. `observations` is back-of-house data that never ships (P2). */
const SKIPPED_DIRS = new Set(["_templates", "observations"]);

const TAG_FIELDS = [
  ["effects", "effect"],
  ["flavors", "flavor"],
  ["terpenes", "terpene"],
] as const satisfies readonly (readonly [string, Facet])[];
type TagField = (typeof TAG_FIELDS)[number][0];

/** P1: words that suggest an autoflower or ruderalis node. Plain substrings, so "Autoflowering" counts. */
const AUTOFLOWER_PATTERN = /auto|ruderalis/i;

/**
 * True for a vault-relative path the build reads as a note: a `.md` file inside a folder, outside
 * `_templates/`, dot-folders (`.obsidian/`, `.trash/`) and `observations/`. Files at the vault root
 * (README, LANDRACE-RUBRIC, SOURCES) are documentation, not notes.
 */
export function isNotePath(path: string): boolean {
  if (!/\.md$/i.test(path)) return false;
  const folders = path.split("/").slice(0, -1);
  return (
    folders.length > 0 && folders.every((dir) => !dir.startsWith(".") && !SKIPPED_DIRS.has(dir))
  );
}

class IssueList {
  readonly list: Issue[] = [];

  error(code: ErrorCode, file: string, field: string | null, message: string): void {
    this.list.push({ severity: "error", code, file, field, message });
  }

  warn(code: WarningCode, file: string, field: string | null, message: string): void {
    this.list.push({ severity: "warning", code, file, field, message });
  }

  get hasErrors(): boolean {
    return this.list.some((issue) => issue.severity === "error");
  }
}

interface Entry<T extends VaultNote = VaultNote> {
  readonly path: string;
  readonly file: string;
  readonly note: T;
  readonly body: string;
  readonly bodyLine: number;
}

/** A parent after link resolution. `broken` links are already reported as errors. */
type ParentRef =
  | { readonly kind: "unknown" }
  | { readonly kind: "node"; readonly id: string }
  | { readonly kind: "broken" };

const byPath = (a: VaultFile, b: VaultFile) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
const textKey = (text: string) => text.normalize("NFC").trim().toLowerCase();
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const label = (node: { name: string; id: string }) => `${node.name} (${node.id})`;

const EMPTY_BANNED = {
  banned_version: 1,
  conditions: [],
  claims: [],
  pharmacology: [],
  safety: [],
};

function loadVocabulary(input: CompileInput, issues: IssueList) {
  for (const file of [input.banned, input.taxonomy]) {
    if (file.error !== undefined) issues.error("taxonomy", file.file, null, file.error);
  }
  if (input.banned.error !== undefined || input.taxonomy.error !== undefined) {
    return { banned: null, taxonomy: null };
  }
  const bannedResult = loadBannedTerms(input.banned.data);
  if (!bannedResult.ok) {
    for (const issue of bannedResult.issues) {
      issues.error("taxonomy", input.banned.file, issue.field, issue.message);
    }
  }
  const banned = bannedResult.ok ? bannedResult.value : null;
  // Without a valid banned list the taxonomy is still checked for structure.
  const fallback = loadBannedTerms(EMPTY_BANNED);
  const checkWith = banned ?? (fallback.ok ? fallback.value : null);
  let taxonomy: Taxonomy | null = null;
  if (checkWith !== null) {
    const result = loadTaxonomy(input.taxonomy.data, checkWith);
    if (result.ok) taxonomy = result.value;
    else {
      for (const issue of result.issues) {
        issues.error("taxonomy", input.taxonomy.file, issue.field, issue.message);
      }
    }
  }
  return { banned, taxonomy };
}

/**
 * Hides every vault name and alias in `text` (C1: strain and breeder names are proper nouns and exempt
 * from the banned-term check), keeping offsets so line numbers stay right.
 */
function nameMasker(names: readonly string[]): (text: string) => string {
  const unique = [...new Set(names.map((name) => name.trim()).filter((name) => name !== ""))].sort(
    (a, b) => b.length - a.length || (a < b ? -1 : 1),
  );
  if (unique.length === 0) return (text) => text;
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${unique.map(escapeRegExp).join("|")})(?![\\p{L}\\p{N}])`,
    "giu",
  );
  return (text) => text.replace(pattern, (found) => " ".repeat(found.length));
}

function lineAt(text: string, index: number, firstLine: number): number {
  let line = firstLine;
  for (let i = 0; i < index; i += 1) if (text.charCodeAt(i) === 10) line += 1;
  return line;
}

function emptyStats(): Record<GeneticNode["kind"], Record<Verification, number>> {
  const stats = {} as Record<GeneticNode["kind"], Record<Verification, number>>;
  for (const kind of NODE_KINDS) {
    const row = {} as Record<Verification, number>;
    for (const verification of VERIFICATIONS) row[verification] = 0;
    stats[kind] = row;
  }
  return stats;
}

/** Runs the whole pipeline: validate, resolve, check, apply the shipping policy, compute lineage. */
export function compileVault(input: CompileInput): CompileResult {
  const issues = new IssueList();
  const fileOf = (path: string) => `${input.vaultLabel}/${path}`;
  const { banned, taxonomy } = loadVocabulary(input, issues);

  // 1. Parse every note.
  const files = input.notes.filter((file) => isNotePath(file.path)).sort(byPath);
  const entries: Entry[] = [];
  for (const { path, text } of files) {
    const result = parseNote(text, input.parseYaml);
    if (!result.ok) {
      for (const issue of result.issues) {
        issues.error(
          issue.field === "frontmatter" ? "parse" : "schema",
          fileOf(path),
          issue.field,
          issue.message,
        );
      }
      continue;
    }
    const { frontmatter: note, body, bodyLine } = result.value;
    entries.push({ path, file: fileOf(path), note, body, bodyLine });
  }

  // 2. Ids are unique per namespace (genetic nodes, breeders). The first file in path order keeps it.
  const nodes = new Map<string, Entry<GeneticNode>>();
  const breeders = new Map<string, Entry<Breeder>>();
  const usable = new Map<string, Entry>();
  for (const entry of entries) {
    const ids: Map<string, Entry> = entry.note.kind === "breeder" ? breeders : nodes;
    const first = ids.get(entry.note.id);
    if (first !== undefined) {
      issues.error(
        "duplicate-id",
        entry.file,
        "id",
        `id "${entry.note.id}" is already used by ${first.file}`,
      );
      continue;
    }
    ids.set(entry.note.id, entry);
    usable.set(entry.path, entry);
  }

  // 3. Resolve wikilinks by filename.
  const links = createLinkIndex(files.map((file) => file.path));
  const resolveLink = (entry: Entry, field: string, link: string): Entry | null => {
    const target = parseWikilink(link);
    const resolution = target === null ? null : links.resolve(target.target);
    if (resolution === null || !resolution.ok) {
      if (resolution?.ok === false && resolution.reason === "ambiguous") {
        const [first = ""] = resolution.candidates;
        issues.error(
          "ambiguous-link",
          entry.file,
          field,
          `${link} matches ${resolution.candidates.map(fileOf).join(" and ")}: add the folder, e.g. [[${first.replace(/\.md$/i, "")}]]`,
        );
      } else {
        issues.error(
          "unresolved-link",
          entry.file,
          field,
          `${link} matches no note filename (links resolve by filename, case-insensitive; aliases don't count)`,
        );
      }
      return null;
    }
    // A target that failed to parse, or lost its id to a duplicate, already has its own error.
    return usable.get(resolution.path) ?? null;
  };

  const parentRefs = new Map<string, ParentRef[]>();
  const breederIds = new Map<string, string | null>();
  for (const entry of nodes.values()) {
    const { note } = entry;
    parentRefs.set(
      note.id,
      note.parents.map((parent, i): ParentRef => {
        if (parent === UNKNOWN_PARENT) return { kind: "unknown" };
        const target = resolveLink(entry, `parents.${i}`, parent);
        if (target === null) return { kind: "broken" };
        if (target.note.kind === "breeder") {
          issues.error(
            "link-kind",
            entry.file,
            `parents.${i}`,
            `${parent} is a breeder note (${target.file}), not a genetic node`,
          );
          return { kind: "broken" };
        }
        return { kind: "node", id: target.note.id };
      }),
    );
    let breederId: string | null = null;
    if (note.breeder !== undefined && note.breeder !== null) {
      const target = resolveLink(entry, "breeder", note.breeder);
      if (target !== null && target.note.kind !== "breeder") {
        issues.error(
          "link-kind",
          entry.file,
          "breeder",
          `${note.breeder} is a ${target.note.kind} note (${target.file}), not a breeder`,
        );
      } else if (target !== null) {
        breederId = target.note.id;
      }
    }
    breederIds.set(note.id, breederId);
  }

  // 4. Cycles are errors, printed as a path (docs/05).
  const fullGraph = createLineageGraph(
    [...nodes.values()].map(({ note }) =>
      toLineageNode(note, parentRefs.get(note.id) ?? [], () => true),
    ),
  );
  for (const cycle of findCycles(fullGraph)) {
    const path = cycle.map((id) => label(nodes.get(id)?.note ?? { id, name: id }));
    const start = nodes.get(cycle[0] as string) as Entry<GeneticNode>;
    issues.error(
      "cycle",
      start.file,
      "parents",
      `cycle: ${path.join(" → ")}. Fix one link and rebuild`,
    );
  }

  // 5. Tags: taxonomy slugs of the right facet, banned terms, deprecated slugs, sourcing.
  const tags = new Map<string, Record<TagField, string[]>>();
  for (const { file, note } of nodes.values()) {
    const kept = { effects: [], flavors: [], terpenes: [] } as Record<TagField, string[]>;
    for (const [field, facet] of TAG_FIELDS) {
      const listed = note[field] ?? [];
      if (listed.length > 0 && field !== "effects") {
        issues.warn(
          "untagged-facet",
          file,
          field,
          `${field} are kept in taxonomy v1 but not tagged in the MVP (D3, C4): ${listed.join(", ")}`,
        );
      }
      listed.forEach((slug, i) => {
        const at = `${field}.${i}`;
        if (banned !== null) {
          const hits = new Set(
            findBannedTerms(`${slug} ${slug.replaceAll("-", " ")}`, banned).map((hit) => hit.term),
          );
          for (const term of hits)
            issues.error(
              "banned-term",
              file,
              at,
              `tag "${slug}" contains the banned term "${term}"`,
            );
          if (hits.size > 0) return;
        }
        if (taxonomy === null) return;
        const term = getTerm(taxonomy, slug);
        if (term === undefined) {
          const guess = resolveTerm(taxonomy, slug, facet);
          const hint = guess === undefined ? "" : `; did you mean "${guess.term.slug}"?`;
          issues.error(
            "unknown-tag",
            file,
            at,
            `"${slug}" is not a ${facet} slug in taxonomy.yaml${hint}`,
          );
          return;
        }
        if (term.facet !== facet) {
          issues.error("unknown-tag", file, at, `"${slug}" is a ${term.facet} term, not ${facet}`);
          return;
        }
        let use = term.slug;
        if (term.status === "deprecated") {
          use = resolveTerm(taxonomy, slug)?.term.slug ?? term.slug;
          issues.warn("deprecated-tag", file, at, `"${slug}" is deprecated: using "${use}"`);
        }
        if (!kept[field].includes(use)) kept[field].push(use);
      });
      if (kept[field].length > 0 && !isSupported(note.sources, field)) {
        issues.warn(
          "unsourced-tag",
          file,
          field,
          `stripped ${kept[field].join(", ")}: no source has supports: [${field}]`,
        );
        kept[field] = [];
      }
    }
    tags.set(note.id, kept);
  }

  // 6. Banned terms in note text (C2). Names and aliases are exempt (C1), wherever they appear.
  if (banned !== null) {
    checkBodies(usable, banned, issues);
  }

  // 7. Names and aliases.
  checkNames(nodes, issues);

  // 8. Curator warnings: autoflower (P1), filenames, folders, sources, orphan crosses.
  const usedAsParent = new Set<string>();
  for (const refs of parentRefs.values()) {
    for (const ref of refs) if (ref.kind === "node") usedAsParent.add(ref.id);
  }
  for (const entry of usable.values()) {
    const { note, file, path } = entry;
    const folder = path.split("/")[0];
    if (folder !== KIND_FOLDERS[note.kind]) {
      issues.warn(
        "folder",
        file,
        "kind",
        `a ${note.kind} note belongs in ${KIND_FOLDERS[note.kind]}/`,
      );
    }
    const expected = safeFilename(note.name);
    const actual = path
      .slice(path.lastIndexOf("/") + 1)
      .replace(/\.md$/i, "")
      .normalize("NFC");
    if (expected !== null && expected !== actual) {
      issues.warn(
        "filename",
        file,
        "name",
        `expected the file to be "${expected}.md" for the name "${note.name}"`,
      );
    }
    if (note.kind === "breeder") continue;
    const mentions: [string, string][] = [["name", note.name]];
    (note.aliases ?? []).forEach((alias, i) => {
      mentions.push([`aliases.${i}`, alias]);
    });
    if (note.kind === "landrace" && note.region !== undefined && note.region !== null) {
      mentions.push(["region", note.region]);
    }
    for (const [field, text] of mentions) {
      if (AUTOFLOWER_PATTERN.test(text)) {
        issues.warn(
          "autoflower",
          file,
          field,
          `"${text}" mentions auto/ruderalis: autoflowers are excluded from v1 (P1). Confirm this isn't one`,
        );
      }
    }
    if ((note.sources ?? []).length === 0) {
      issues.warn(
        "missing-sources",
        file,
        "sources",
        "no sources: every fact needs one (docs/04 sourcing policy)",
      );
    }
    if (note.kind === "cross" && !usedAsParent.has(note.id)) {
      issues.warn("orphan-cross", file, "parents", "no node lists this cross as a parent");
    }
  }

  // 9. Founder review of every landrace value (P10), and counts.
  const landraces: LandraceReview[] = [];
  const stats = emptyStats();
  for (const { note, file } of nodes.values()) {
    stats[note.kind][note.verification] += 1;
    if (note.kind !== "landrace") continue;
    landraces.push({
      id: note.id,
      name: note.name,
      file,
      base_sativa_pct: note.base_sativa_pct ?? null,
      verification: note.verification,
      supporting: (note.sources ?? []).filter((source) =>
        source.supports.includes("base_sativa_pct"),
      ).length,
    });
  }
  const statsOut = { notes: files.length, nodes: stats, breeders: breeders.size };

  if (issues.hasErrors) {
    return {
      issues: issues.list,
      landraces,
      stats: statsOut,
      includeUnverified: input.includeUnverified,
      data: null,
    };
  }

  const data = ship({
    nodes,
    breeders,
    parentRefs,
    breederIds,
    tags,
    taxonomy: taxonomy as Taxonomy,
    input,
    issues,
  });
  return {
    issues: issues.list,
    landraces,
    stats: statsOut,
    includeUnverified: input.includeUnverified,
    data,
  };
}

function safeFilename(name: string): string | null {
  try {
    return sanitizeFilename(name);
  } catch {
    return null;
  }
}

function toLineageNode(
  note: GeneticNode,
  refs: readonly ParentRef[],
  ships: (id: string) => boolean,
): LineageNode {
  return {
    id: note.id,
    name: note.name,
    kind: note.kind,
    parents: refs.map((ref) => (ref.kind === "node" && ships(ref.id) ? ref.id : UNKNOWN_PARENT)),
    parent_weights: note.parent_weights ?? null,
    derivation: note.derivation ?? null,
    reported_type: note.reported_type,
    verification: note.verification,
    base_sativa_pct: note.kind === "landrace" ? (note.base_sativa_pct ?? null) : null,
  };
}

function checkBodies(
  usable: ReadonlyMap<string, Entry>,
  banned: BannedTerms,
  issues: IssueList,
): void {
  const names: string[] = [];
  for (const { note } of usable.values()) names.push(note.name, ...(note.aliases ?? []));
  const mask = nameMasker(names);
  for (const entry of usable.values()) {
    const masked = mask(entry.body);
    for (const hit of findBannedTerms(masked, banned)) {
      const line = lineAt(masked, hit.index, entry.bodyLine);
      const original = entry.body.slice(hit.index, hit.index + hit.text.length);
      issues.error(
        "banned-term",
        entry.file,
        `body (line ${line})`,
        `banned term "${hit.term}" in "${original}"`,
      );
    }
  }
}

interface NameOwner {
  readonly id: string;
  readonly file: string;
  readonly text: string;
  readonly isName: boolean;
  readonly searchable: boolean;
}

function checkNames(nodes: ReadonlyMap<string, Entry<GeneticNode>>, issues: IssueList): void {
  const owners = new Map<string, NameOwner[]>();
  const add = (key: string, owner: NameOwner) =>
    owners.set(key, [...(owners.get(key) ?? []), owner]);
  const aliasKeys = new Map<string, { index: number; text: string; key: string }[]>();

  for (const { note, file } of nodes.values()) {
    const searchable = note.kind !== "cross";
    const nameKey = textKey(note.name);
    add(nameKey, { id: note.id, file, text: note.name, isName: true, searchable });
    const own = new Set([nameKey]);
    const kept: { index: number; text: string; key: string }[] = [];
    (note.aliases ?? []).forEach((alias, index) => {
      const key = textKey(alias);
      if (own.has(key)) {
        issues.warn(
          "alias-repeat",
          file,
          `aliases.${index}`,
          `"${alias}" repeats the name or another alias of this note`,
        );
        return;
      }
      own.add(key);
      kept.push({ index, text: alias, key });
      add(key, { id: note.id, file, text: alias, isName: false, searchable });
    });
    aliasKeys.set(note.id, kept);
  }

  // An alias names the same plant (docs/04), so it can't belong to two nodes.
  for (const { note, file } of nodes.values()) {
    for (const alias of aliasKeys.get(note.id) ?? []) {
      const others = (owners.get(alias.key) ?? []).filter((owner) => owner.id !== note.id);
      if (others.length === 0) continue;
      const where = others.map(
        (o) => `${o.isName ? "the name" : "an alias"} of ${o.id} (${o.file})`,
      );
      issues.error(
        "duplicate-alias",
        file,
        `aliases.${alias.index}`,
        `alias "${alias.text}" is also ${where.join(" and ")}`,
      );
    }
  }

  // Same name twice is allowed only for different breeders (docs/04 id collisions), so it's a warning.
  for (const group of owners.values()) {
    const names = group.filter((owner) => owner.isName);
    for (const later of names.slice(1)) {
      const first = names[0] as NameOwner;
      issues.warn(
        "duplicate-name",
        later.file,
        "name",
        `"${later.text}" is also the name of ${first.id} (${first.file})`,
      );
    }
  }

  // Near-duplicates: different spellings that the matcher normalizes to the same text (docs/06 §4).
  const normalized = new Map<string, NameOwner[]>();
  for (const group of owners.values()) {
    for (const owner of group) {
      if (!owner.searchable) continue;
      const key = normalize(owner.text);
      if (key !== "") normalized.set(key, [...(normalized.get(key) ?? []), owner]);
    }
  }
  for (const group of normalized.values()) {
    const ids = new Set(group.map((owner) => owner.id));
    const spellings = new Set(group.map((owner) => textKey(owner.text)));
    if (ids.size < 2 || spellings.size < 2) continue;
    const first = group[0] as NameOwner;
    const list = group.map((owner) => `"${owner.text}" (${owner.id})`).join(", ");
    issues.warn(
      "near-duplicate",
      first.file,
      first.isName ? "name" : "aliases",
      `${list} normalize to the same text: the matcher can't tell them apart`,
    );
  }
}

interface ShipInput {
  readonly nodes: ReadonlyMap<string, Entry<GeneticNode>>;
  readonly breeders: ReadonlyMap<string, Entry<Breeder>>;
  readonly parentRefs: ReadonlyMap<string, readonly ParentRef[]>;
  readonly breederIds: ReadonlyMap<string, string | null>;
  readonly tags: ReadonlyMap<string, Record<TagField, string[]>>;
  readonly taxonomy: Taxonomy;
  readonly input: CompileInput;
  readonly issues: IssueList;
}

/**
 * Shipping policy (T-006): `verified` and `disputed` ship; `unverified` ships only in dev builds
 * (`--include-unverified`). Lineage is computed over shipped nodes only, so unreviewed data never
 * shapes a shipped result: a parent that doesn't ship is written as `"unknown"`.
 */
function ship({
  nodes,
  breeders,
  parentRefs,
  breederIds,
  tags,
  taxonomy,
  input,
  issues,
}: ShipInput): BuildData {
  const ships = (id: string) => {
    const node = nodes.get(id)?.note;
    return node !== undefined && (input.includeUnverified || node.verification !== "unverified");
  };
  const shipped = [...nodes.keys()].filter(ships).sort();

  for (const id of shipped) {
    const entry = nodes.get(id) as Entry<GeneticNode>;
    (parentRefs.get(id) ?? []).forEach((ref, i) => {
      if (ref.kind !== "node" || ships(ref.id)) return;
      const parent = (nodes.get(ref.id) as Entry<GeneticNode>).note;
      issues.warn(
        "unshipped-parent",
        entry.file,
        `parents.${i}`,
        `${label(parent)} is ${parent.verification} and doesn't ship, so it's written as unknown`,
      );
    });
  }

  const graph = createLineageGraph(
    shipped.map((id) =>
      toLineageNode((nodes.get(id) as Entry<GeneticNode>).note, parentRefs.get(id) ?? [], ships),
    ),
  );
  const lineages = computeAll(graph);
  const lineageOf = (id: string) => lineages.get(id) as Lineage;
  const parentIds = (id: string) => (graph.get(id) as LineageNode).parents;
  const derivationOf = (note: GeneticNode): Derivation | null => {
    if (note.parents.length >= 2) return "cross";
    return note.derivation ?? null;
  };

  const crosses = new Map<string, InlineCross>();
  const parentsOut = (id: string): LineageParent[] =>
    parentIds(id).map((parentId) => {
      if (parentId === UNKNOWN_PARENT) return UNKNOWN_PARENT;
      const parent = (nodes.get(parentId) as Entry<GeneticNode>).note;
      return parent.kind === "cross" ? inline(parent) : parentId;
    });
  const inline = (cross: GeneticNode): InlineCross => {
    const cached = crosses.get(cross.id);
    if (cached !== undefined) return cached;
    const record: InlineCross = {
      kind: "cross",
      id: cross.id,
      name: cross.name,
      parents: parentsOut(cross.id),
      parent_weights: cross.parent_weights ? [...cross.parent_weights] : null,
      derivation: "cross",
      reported_type: cross.reported_type,
      verification: cross.verification,
      lineage: lineageOf(cross.id),
    };
    crosses.set(cross.id, record);
    return record;
  };

  const strains: StrainRecord[] = [];
  for (const id of shipped) {
    const { note, file } = nodes.get(id) as Entry<GeneticNode>;
    if (note.kind === "cross") continue;
    const nodeTags = tags.get(id) as Record<TagField, string[]>;
    const record: StrainRecord = {
      id: note.id,
      name: note.name,
      aliases: [...(note.aliases ?? [])],
      kind: note.kind,
      parents: parentsOut(id),
      parent_weights: note.parent_weights ? [...note.parent_weights] : null,
      derivation: derivationOf(note),
      reported_type: note.reported_type,
      breeder_id: breederIds.get(id) ?? null,
      effects: nodeTags.effects,
      flavors: nodeTags.flavors,
      terpenes: nodeTags.terpenes,
      verification: note.verification,
      lineage: lineageOf(id),
      source_count: (note.sources ?? []).length,
    };
    strains.push(record);
    const { confidence_level: level, confidence, method } = record.lineage;
    if (level === "low" || level === "none") {
      const detail =
        level === "none"
          ? "lineage unknown"
          : `confidence ${confidence.toFixed(3)}, method ${method}`;
      issues.warn("low-confidence", file, "lineage", `${detail} (${level})`);
    }
  }

  // Validate before anything is written. A failure here is a bug in this tool, not in the data.
  const checked = StrainsFileSchema.safeParse(strains);
  if (!checked.success) {
    throw new Error(
      `vault-build produced invalid strains.json: ${JSON.stringify(checked.error.issues)}`,
    );
  }

  const breederList: BreederRecord[] = [...new Set(strains.map((record) => record.breeder_id))]
    .filter((id): id is string => id !== null)
    .sort()
    .map((id) => ({ id, name: (breeders.get(id) as Entry<Breeder>).note.name }));

  const taxonomyOut: TaxonomyOutput = {
    taxonomy_version: taxonomy.version,
    terms: taxonomy.terms.map((term) => ({
      slug: term.slug,
      facet: term.facet,
      label: term.label,
      polarity: term.polarity,
      description: term.description,
      status: term.status,
      replaced_by: term.replaced_by ?? null,
    })),
  };

  let dataDate = "1970-01-01";
  for (const entry of [...nodes.values(), ...breeders.values()]) {
    for (const date of [entry.note.created, entry.note.updated])
      if (date > dataDate) dataDate = date;
  }

  return {
    strains,
    breeders: breederList,
    taxonomy: taxonomyOut,
    counts: {
      strains: strains.filter((record) => record.kind === "strain").length,
      landraces: strains.filter((record) => record.kind === "landrace").length,
      crosses: crosses.size,
      taxonomy_terms: taxonomyOut.terms.length,
    },
    dataDate,
  };
}
