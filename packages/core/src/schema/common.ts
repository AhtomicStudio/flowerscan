// Shared primitives for the docs/04 schemas.
import { z } from "zod";

/** `id` rule from docs/04: lowercase ASCII kebab. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** ULID in Crockford base32 (no I, L, O, U). */
const ULID = "[0-9A-HJKMNP-TV-Z]{26}";
export const SCAN_ID_PATTERN = new RegExp(`^scan_${ULID}$`);
export const OBSERVATION_ID_PATTERN = new RegExp(`^obs_${ULID}$`);

/** The literal used for an undisclosed parent. */
export const UNKNOWN_PARENT = "unknown";

/** `[[Target]]` or `[[Target|Display]]`. The target can't be blank or contain `[ ] | # ^`. */
const WIKILINK_PATTERN = /^\[\[(?!\s*(?:\||\]\]))[^[\]|#^]+(?:\|[^[\]]+)?\]\]$/;

export const SlugSchema = z
  .string()
  .regex(SLUG_PATTERN, { error: "must be lowercase kebab-case ([a-z0-9] words joined by -)" });

/** A node id: a slug other than `unknown`, which is reserved for undisclosed parents. */
export const NodeIdSchema = SlugSchema.refine((id) => id !== UNKNOWN_PARENT, {
  error: `"${UNKNOWN_PARENT}" is reserved for undisclosed parents and can't be an id`,
});

/** A string with at least one non-space character. Never transformed: values stay exactly as given. */
export const NonEmptyStringSchema = z.string().regex(/\S/, { error: "must not be blank" });

export const WikilinkSchema = z
  .string()
  .regex(WIKILINK_PATTERN, { error: 'must be a wikilink like "[[Strain Name]]"' });

/** A vault parent: a wikilink, or `"unknown"` for an undisclosed parent. */
export const VaultParentSchema = z.union([z.literal(UNKNOWN_PARENT), WikilinkSchema], {
  error: 'must be a wikilink like "[[Strain Name]]" or "unknown"',
});

/** `YYYY-MM-DD`. */
export const IsoDateSchema = z.iso.date({ error: "must be an ISO date (YYYY-MM-DD)" });

/** ISO 8601 datetime with a `Z` or `±hh:mm` offset. */
export const IsoDateTimeSchema = z.iso.datetime({
  offset: true,
  error: "must be an ISO datetime with offset, e.g. 2026-10-25T18:42:11-07:00",
});

/** A 0–1 score or confidence. */
export const UnitIntervalSchema = z.number().min(0).max(1);

/** Weights that are compared against 1 tolerate this much floating-point error (docs/04). */
export const WEIGHT_SUM_TOLERANCE = 0.001;

/** Sum of weights, in order, so the result is deterministic. */
export function sumOf(values: readonly number[]): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

/** Optional in the vault: YAML templates write `null` for empty fields, so null means "absent". */
export function vaultOptional<T extends z.ZodType>(schema: T) {
  return schema.nullable().optional();
}
