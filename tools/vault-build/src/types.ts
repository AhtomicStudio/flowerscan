// Shared types for the vault build. Field names follow docs/04 "Build output".
import type {
  Facet,
  Lineage,
  LineageGraph,
  NodeKind,
  Polarity,
  StrainRecord,
  TermStatus,
  Verification,
} from "@flowerscan/core";

/** A Markdown file read from the vault. `path` is relative to the vault root, with `/` separators. */
export interface VaultFile {
  readonly path: string;
  readonly text: string;
}

/** A parsed YAML input file (taxonomy.yaml, banned.yaml) and the path to show in messages. */
export interface DataFile {
  readonly file: string;
  readonly data: unknown;
  /** Set when the file couldn't be read or parsed; `data` is then undefined. */
  readonly error?: string;
}

/** Errors fail `vault:check` and `vault:build`. The order here is the report order. */
export const ERROR_CODES = {
  "vault-path": "The vault path is not allowed",
  taxonomy: "Taxonomy or banned-terms file is invalid",
  parse: "Frontmatter can't be read",
  schema: "Frontmatter doesn't match the docs/04 schema",
  "duplicate-id": "Two notes share an id",
  "unresolved-link": "A [[wikilink]] matches no note filename",
  "ambiguous-link": "A [[wikilink]] matches more than one note",
  "link-kind": "A [[wikilink]] points at the wrong kind of note",
  cycle: "The family tree has a cycle",
  "unknown-tag": "A tag isn't an active slug of its facet in taxonomy.yaml",
  "banned-term": "Banned term in a tag or in note text (C1, C2)",
  "duplicate-alias": "An alias is also another node's name or alias",
} as const;

/** Warnings never fail the build. They're for the curator to confirm or fix. */
export const WARNING_CODES = {
  autoflower: "Possible autoflower or ruderalis node: confirm it isn't one (P1)",
  "unsourced-tag": "Tags without a supporting source were stripped",
  "deprecated-tag": "A deprecated tag was replaced with its replaced_by",
  "untagged-facet": "Flavors and terpenes aren't tagged in the MVP (D3, C4)",
  "unshipped-parent": "A shipped node has a parent that doesn't ship: written as unknown",
  "low-confidence": "Shipped result with low or no confidence",
  "missing-sources": "Node has no sources",
  "duplicate-name": "Two nodes share a name (case-insensitive)",
  "near-duplicate": "Names or aliases that normalize to the same text",
  "alias-repeat": "An alias repeats the note's own name or another alias",
  "orphan-cross": "A cross that no node uses as a parent",
  filename: "Filename doesn't follow sanitizeFilename(name)",
  folder: "Note is outside its kind's folder",
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
export type WarningCode = keyof typeof WARNING_CODES;

export type Issue =
  | {
      readonly severity: "error";
      readonly code: ErrorCode;
      readonly file: string;
      readonly field: string | null;
      readonly message: string;
    }
  | {
      readonly severity: "warning";
      readonly code: WarningCode;
      readonly file: string;
      readonly field: string | null;
      readonly message: string;
    };

/** A landrace base value for founder review (P10). Every landrace is listed, with or without a value. */
export interface LandraceReview {
  readonly id: string;
  readonly name: string;
  readonly file: string;
  readonly base_sativa_pct: number | null;
  readonly verification: Verification;
  /** Sources with `supports: [base_sativa_pct]`. */
  readonly supporting: number;
}

/** `breeders.json`: every breeder a shipped record names, sorted by id. */
export interface BreederRecord {
  readonly id: string;
  readonly name: string;
}

/** One term in `taxonomy.json`. Synonyms are import inputs and never ship. */
export interface TaxonomyRecord {
  readonly slug: string;
  readonly facet: Facet;
  readonly label: string;
  readonly polarity: Polarity;
  readonly description: string;
  readonly status: TermStatus;
  readonly replaced_by: string | null;
}

export interface TaxonomyOutput {
  readonly taxonomy_version: number;
  readonly terms: readonly TaxonomyRecord[];
}

export interface BuildCounts {
  readonly strains: number;
  readonly landraces: number;
  readonly crosses: number;
  readonly taxonomy_terms: number;
}

/** Everything a successful compile ships. */
export interface BuildData {
  readonly strains: readonly StrainRecord[];
  readonly breeders: readonly BreederRecord[];
  readonly taxonomy: TaxonomyOutput;
  readonly counts: BuildCounts;
  /** Shipped nodes (crosses too) with parents resolved to ids. For vault:review; never serialized. */
  readonly graph: LineageGraph;
  /** Every shipped node's computed result (`computeAll`), crosses included. */
  readonly lineages: ReadonlyMap<string, Lineage>;
  /** The latest `created`/`updated` date in the vault: the default `built_at` (deterministic). */
  readonly dataDate: string;
}

export interface CompileStats {
  readonly notes: number;
  readonly nodes: Readonly<Record<NodeKind, Readonly<Record<Verification, number>>>>;
  readonly breeders: number;
}

export interface CompileResult {
  readonly issues: readonly Issue[];
  readonly landraces: readonly LandraceReview[];
  readonly stats: CompileStats;
  readonly includeUnverified: boolean;
  /** Null when there are errors. */
  readonly data: BuildData | null;
}
