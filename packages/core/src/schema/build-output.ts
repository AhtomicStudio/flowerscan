// Build output shipped to the app (docs/04 "Build output"). Written by tools/vault-build (T-006).
import { z } from "zod";
import { NodeIdSchema, NonEmptyStringSchema, SlugSchema, UNKNOWN_PARENT } from "./common";
import {
  DerivationSchema,
  type NodeKind,
  ReportedTypeSchema,
  SearchableKindSchema,
  VerificationSchema,
} from "./enums";
import { type Lineage, LineageSchema } from "./lineage";
import { type Issue, lineageShapeIssues } from "./rules";

/** A cross inlined into a lineage tree. Crosses are tree nodes, never search entries. */
export interface InlineCross {
  kind: "cross";
  id: string;
  name: string;
  parents: LineageParent[];
  parent_weights: number[] | null;
  derivation: "cross";
  reported_type: z.infer<typeof ReportedTypeSchema>;
  verification: z.infer<typeof VerificationSchema>;
  lineage: Lineage;
}

/** A parent in build output: a strain or landrace id, `"unknown"`, or an inlined cross. */
export type LineageParent = string | InlineCross;

function shapeIssues(record: {
  kind: NodeKind;
  parents: readonly LineageParent[];
  parent_weights: readonly number[] | null;
  derivation: z.infer<typeof DerivationSchema> | null;
}): Issue[] {
  return lineageShapeIssues(
    {
      kind: record.kind,
      parentCount: record.parents.length,
      loneUnknownParent: record.parents.length === 1 && record.parents[0] === UNKNOWN_PARENT,
      parentWeights: record.parent_weights,
      derivation: record.derivation,
    },
    true,
  );
}

const ParentWeightsSchema = z.array(z.number().gt(0).max(1)).nullable();

export const InlineCrossSchema: z.ZodType<InlineCross> = z
  .strictObject({
    kind: z.literal("cross"),
    id: NodeIdSchema,
    name: NonEmptyStringSchema,
    get parents() {
      return z.array(LineageParentSchema);
    },
    parent_weights: ParentWeightsSchema,
    derivation: z.literal("cross"),
    reported_type: ReportedTypeSchema,
    verification: VerificationSchema,
    lineage: LineageSchema,
  })
  .check((ctx) => {
    for (const issue of shapeIssues(ctx.value)) {
      ctx.issues.push({ code: "custom", input: ctx.value, ...issue });
    }
  });

export const LineageParentSchema: z.ZodType<LineageParent> = z.union([
  z.literal(UNKNOWN_PARENT),
  NodeIdSchema,
  z.lazy(() => InlineCrossSchema),
]);

/**
 * One search entry in `strains.json`: a strain or a landrace. `parents` reference other entries by
 * id, use `"unknown"`, or inline the intermediate crosses. `typical_thc_pct` is never shipped (P2).
 */
export const StrainRecordSchema = z
  .strictObject({
    id: NodeIdSchema,
    name: NonEmptyStringSchema,
    aliases: z.array(NonEmptyStringSchema),
    kind: SearchableKindSchema,
    parents: z.array(LineageParentSchema),
    parent_weights: ParentWeightsSchema,
    derivation: DerivationSchema.nullable(),
    reported_type: ReportedTypeSchema,
    breeder_id: NodeIdSchema.nullable(),
    effects: z.array(SlugSchema),
    flavors: z.array(SlugSchema),
    terpenes: z.array(SlugSchema),
    verification: VerificationSchema,
    lineage: LineageSchema,
    source_count: z.int().min(0),
  })
  .check((ctx) => {
    for (const issue of shapeIssues(ctx.value)) {
      ctx.issues.push({ code: "custom", input: ctx.value, ...issue });
    }
  });
export type StrainRecord = z.infer<typeof StrainRecordSchema>;

/** The whole `strains.json` file: ids are unique. */
export const StrainsFileSchema = z.array(StrainRecordSchema).check((ctx) => {
  const seen = new Set<string>();
  ctx.value.forEach((record, index) => {
    if (seen.has(record.id)) {
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        path: [index, "id"],
        message: `duplicate strain id ${record.id}`,
      });
    }
    seen.add(record.id);
  });
});
export type StrainsFile = z.infer<typeof StrainsFileSchema>;

/** `manifest.json` (docs/04 "Build output"). */
export const BuildManifestSchema = z.strictObject({
  data_version: NonEmptyStringSchema,
  built_at: z.iso.datetime({ offset: true }),
  algo_version: z.int().min(1),
  taxonomy_version: z.int().min(1),
  counts: z.strictObject({
    strains: z.int().min(0),
    landraces: z.int().min(0),
    crosses: z.int().min(0),
    taxonomy_terms: z.int().min(0),
  }),
  hash: z.string().regex(/^[0-9a-f]{8,64}$/, { error: "must be a lowercase hex content hash" }),
});
export type BuildManifest = z.infer<typeof BuildManifestSchema>;
