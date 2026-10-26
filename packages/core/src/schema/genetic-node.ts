// Genetic nodes as authored in data/vault (docs/04 "Genetic node"). Inputs only: no derived fields.
import { z } from "zod";
import {
  IsoDateSchema,
  NodeIdSchema,
  NonEmptyStringSchema,
  SlugSchema,
  UNKNOWN_PARENT,
  VaultParentSchema,
  vaultOptional,
  WikilinkSchema,
} from "./common";
import {
  BaseSativaPctSchema,
  DerivationSchema,
  ReportedTypeSchema,
  SCHEMA_VERSION,
  VerificationSchema,
} from "./enums";
import { type Issue, lineageShapeIssues } from "./rules";
import { countSupporting, isSupported, type Source, SourceSchema } from "./source";

/** Sources needed before a landrace may carry a `base_sativa_pct` (P10). */
export const BASE_SATIVA_PCT_MIN_SOURCES = 2;

/** A sourced THC range. Internal only, never displayed or shipped (P2). */
export const ThcRangeSchema = z
  .strictObject({
    min: z.number().min(0).max(100),
    max: z.number().min(0).max(100),
  })
  .refine((range) => range.min <= range.max, {
    error: "min must not exceed max",
    path: ["max"],
  });
export type ThcRange = z.infer<typeof ThcRangeSchema>;

const landraceOnly = (field: string) =>
  z.never({ error: `${field} is allowed only on landraces` }).optional();

const nodeFields = {
  id: NodeIdSchema,
  schema_version: z.literal(SCHEMA_VERSION),
  name: NonEmptyStringSchema,
  aliases: vaultOptional(z.array(NonEmptyStringSchema)),
  parents: z.array(VaultParentSchema),
  parent_weights: vaultOptional(z.array(z.number().gt(0).max(1))),
  derivation: vaultOptional(DerivationSchema),
  reported_type: ReportedTypeSchema,
  breeder: vaultOptional(WikilinkSchema),
  effects: vaultOptional(z.array(SlugSchema)),
  flavors: vaultOptional(z.array(SlugSchema)),
  terpenes: vaultOptional(z.array(SlugSchema)),
  typical_thc_pct: vaultOptional(ThcRangeSchema),
  sources: vaultOptional(z.array(SourceSchema)),
  verification: VerificationSchema,
  created: IsoDateSchema,
  updated: IsoDateSchema,
};

export const LandraceNodeSchema = z.strictObject({
  kind: z.literal("landrace"),
  ...nodeFields,
  base_sativa_pct: vaultOptional(BaseSativaPctSchema),
  region: vaultOptional(NonEmptyStringSchema),
});

export const StrainNodeSchema = z.strictObject({
  kind: z.literal("strain"),
  ...nodeFields,
  base_sativa_pct: landraceOnly("base_sativa_pct"),
  region: landraceOnly("region"),
});

export const CrossNodeSchema = z.strictObject({
  kind: z.literal("cross"),
  ...nodeFields,
  base_sativa_pct: landraceOnly("base_sativa_pct"),
  region: landraceOnly("region"),
});

type NodeShape =
  | z.infer<typeof LandraceNodeSchema>
  | z.infer<typeof StrainNodeSchema>
  | z.infer<typeof CrossNodeSchema>;

function sourceIssues(node: NodeShape): Issue[] {
  const issues: Issue[] = [];
  const sources: readonly Source[] = node.sources ?? [];
  if (
    node.kind === "landrace" &&
    node.base_sativa_pct !== undefined &&
    node.base_sativa_pct !== null
  ) {
    const backing = countSupporting(sources, "base_sativa_pct");
    if (backing < BASE_SATIVA_PCT_MIN_SOURCES) {
      issues.push({
        path: ["base_sativa_pct"],
        message: `base_sativa_pct needs ${BASE_SATIVA_PCT_MIN_SOURCES} sources that support it (P10); found ${backing}. No fitting source: leave it empty`,
      });
    }
  }
  if (node.verification !== "verified") return issues;
  if (sources.length === 0) {
    issues.push({ path: ["sources"], message: "a verified node needs sources" });
    return issues;
  }
  const namesParents = node.parents.some((parent) => parent !== UNKNOWN_PARENT);
  if (namesParents && !isSupported(sources, "parents")) {
    issues.push({
      path: ["verification"],
      message: "verified needs a source that supports parents",
    });
  }
  if (node.reported_type !== "unknown" && !isSupported(sources, "reported_type")) {
    issues.push({
      path: ["verification"],
      message: "verified needs a source that supports reported_type",
    });
  }
  return issues;
}

function dateIssues(node: NodeShape): Issue[] {
  // ISO dates compare correctly as strings.
  return node.updated < node.created
    ? [{ path: ["updated"], message: "updated is earlier than created" }]
    : [];
}

/** Every node in the family tree, discriminated on `kind`. */
export const GeneticNodeSchema = z
  .discriminatedUnion("kind", [LandraceNodeSchema, StrainNodeSchema, CrossNodeSchema])
  .check((ctx) => {
    const node = ctx.value;
    const shape = {
      kind: node.kind,
      parentCount: node.parents.length,
      loneUnknownParent: node.parents.length === 1 && node.parents[0] === UNKNOWN_PARENT,
      parentWeights: node.parent_weights,
      derivation: node.derivation,
    };
    const issues = [
      ...lineageShapeIssues(shape, false),
      ...sourceIssues(node),
      ...dateIssues(node),
    ];
    for (const issue of issues) {
      ctx.issues.push({ code: "custom", input: node, path: issue.path, message: issue.message });
    }
  });

export type GeneticNode = z.infer<typeof GeneticNodeSchema>;
export type LandraceNode = Extract<GeneticNode, { kind: "landrace" }>;
export type StrainNode = Extract<GeneticNode, { kind: "strain" }>;
export type CrossNode = Extract<GeneticNode, { kind: "cross" }>;
