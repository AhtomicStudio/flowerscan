// Founder review files (docs/04 "Founder review workflow", T-029): pre-check records written by the
// fact-checker agent, and flags written by `vault:review`. Neither ever ships to the app.
import { z } from "zod";
import { IsoDateSchema, NodeIdSchema, NonEmptyStringSchema, vaultOptional } from "./common";

export const PRECHECK_VERDICTS = ["ready", "check", "problem"] as const;
export const PrecheckVerdictSchema = z.enum(PRECHECK_VERDICTS);
export type PrecheckVerdict = z.infer<typeof PrecheckVerdictSchema>;

/** The claims a pre-check looks at: what a note says about the plant. */
export const PRECHECK_CLAIM_FIELDS = [
  "parents",
  "reported_type",
  "base_sativa_pct",
  "effects",
  "aliases",
  "derivation",
] as const;
export const PrecheckClaimFieldSchema = z.enum(PRECHECK_CLAIM_FIELDS);
export type PrecheckClaimField = z.infer<typeof PrecheckClaimFieldSchema>;

export const PRECHECK_CLAIM_STATUSES = [
  "confirmed",
  "not_found",
  "contradicted",
  "unreachable",
  "excluded_source",
] as const;
export const PrecheckClaimStatusSchema = z.enum(PRECHECK_CLAIM_STATUSES);
export type PrecheckClaimStatus = z.infer<typeof PrecheckClaimStatusSchema>;

/** Lowercase hex SHA-256 (64 characters). */
export const Sha256Schema = z
  .string()
  .regex(/^[0-9a-f]{64}$/, { error: "must be a lowercase hex SHA-256 (64 characters)" });

export const PrecheckClaimSchema = z.strictObject({
  field: PrecheckClaimFieldSchema,
  /** The claim as the note makes it, e.g. "Blueberry x Haze". A number (`10`) or a list is accepted too. */
  value: z.union([NonEmptyStringSchema, z.number(), z.array(NonEmptyStringSchema).min(1)]),
  /** The cited url or ref that was checked. */
  source: NonEmptyStringSchema,
  status: PrecheckClaimStatusSchema,
  /** What the source says, in the checker's own words. */
  note: vaultOptional(NonEmptyStringSchema),
});
export type PrecheckClaim = z.infer<typeof PrecheckClaimSchema>;

/**
 * `data/review/precheck/<node-id>.yaml`. `note_sha256` is the hash of the note file's bytes when it was
 * checked: a different hash now means the record is stale. A `ready` verdict must agree with its claims:
 * nothing `contradicted`, and every field it lists has at least one `confirmed` claim.
 */
export const PrecheckRecordSchema = z
  .strictObject({
    id: NodeIdSchema,
    note_sha256: Sha256Schema,
    checked_at: IsoDateSchema,
    checker: NonEmptyStringSchema,
    verdict: PrecheckVerdictSchema,
    claims: z.array(PrecheckClaimSchema),
    summary: NonEmptyStringSchema,
  })
  .check((ctx) => {
    const record = ctx.value;
    if (record.verdict !== "ready") return;
    const push = (path: PropertyKey[], message: string) =>
      ctx.issues.push({ code: "custom", input: record, path, message });
    record.claims.forEach((claim, i) => {
      if (claim.status === "contradicted") {
        push(["claims", i, "status"], "a ready verdict can't have a contradicted claim");
      }
    });
    const fields = [...new Set(record.claims.map((claim) => claim.field))];
    for (const field of fields) {
      const confirmed = record.claims.some(
        (claim) => claim.field === field && claim.status === "confirmed",
      );
      if (!confirmed) {
        push(["verdict"], `a ready verdict needs a confirmed claim for ${field}`);
      }
    }
  });
export type PrecheckRecord = z.infer<typeof PrecheckRecordSchema>;

/** One founder flag: a comment for a curator, written by `vault:review`. */
export const ReviewFlagSchema = z.strictObject({
  reviewer: NonEmptyStringSchema,
  date: IsoDateSchema,
  comment: NonEmptyStringSchema,
});
export type ReviewFlag = z.infer<typeof ReviewFlagSchema>;

/** `data/review/flags/<node-id>.yaml`: every flag on one note, oldest first. */
export const ReviewFlagFileSchema = z.strictObject({
  id: NodeIdSchema,
  flags: z.array(ReviewFlagSchema).min(1, { error: "a flag file needs at least one flag" }),
});
export type ReviewFlagFile = z.infer<typeof ReviewFlagFileSchema>;
