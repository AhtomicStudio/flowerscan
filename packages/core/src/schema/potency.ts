// Potency as printed on packages (P2). Internal data: never computed, rounded, converted, or shown.
import { z } from "zod";
import {
  IsoDateSchema,
  NodeIdSchema,
  NonEmptyStringSchema,
  OBSERVATION_ID_PATTERN,
} from "./common";
import {
  PotencyAnalyteSchema,
  PotencyQualifierSchema,
  PotencySourceSchema,
  PotencyUnitSchema,
  ProductFormSchema,
  UsStateCodeSchema,
} from "./enums";

/** Upper bound per unit: 100 % or 1000 mg/g. Anything above is a misread. */
const MAX_VALUE = { percent: 100, mg_per_g: 1000 } as const;

/** Qualifiers printed without a number (`ND`, `<LOQ`). */
const VALUELESS_QUALIFIERS: ReadonlySet<string> = new Set(["nd", "below_loq"]);

/** One potency figure exactly as printed on a package (docs/04 "PotencyReading"). */
export const PotencyReadingSchema = z
  .strictObject({
    analyte: PotencyAnalyteSchema,
    value: z.number().min(0).nullable(),
    qualifier: PotencyQualifierSchema,
    unit: PotencyUnitSchema,
    raw: NonEmptyStringSchema,
  })
  .check((ctx) => {
    const reading = ctx.value;
    const issue = (message: string) =>
      ctx.issues.push({ code: "custom", input: reading, path: ["value"], message });
    const valueless = VALUELESS_QUALIFIERS.has(reading.qualifier);
    if (valueless && reading.value !== null) {
      issue(`value must be null when the qualifier is ${reading.qualifier}`);
    } else if (!valueless && reading.value === null) {
      issue(`a ${reading.qualifier} reading needs a value`);
    } else if (reading.value !== null && reading.value > MAX_VALUE[reading.unit]) {
      issue(`value exceeds ${MAX_VALUE[reading.unit]} ${reading.unit}`);
    }
  });
export type PotencyReading = z.infer<typeof PotencyReadingSchema>;

/** Where `evidence` photos live. Never a user photo. */
export const EVIDENCE_PREFIX = "data/eval/";

/**
 * One back-of-house potency observation (docs/04 "Potency observations", P2). `user_opt_in` exists in
 * the enum but is rejected until the Phase 2 opt-in ships.
 */
export const PotencyObservationSchema = z.strictObject({
  id: z.string().regex(OBSERVATION_ID_PATTERN, { error: "must be obs_<ulid>" }),
  strain_id: NodeIdSchema,
  name_on_package: NonEmptyStringSchema,
  brand: NonEmptyStringSchema.nullable(),
  state: UsStateCodeSchema.nullable(),
  product_form: ProductFormSchema.nullable(),
  observed_on: IsoDateSchema,
  packaged_on: NonEmptyStringSchema.nullable(),
  batch: NonEmptyStringSchema.nullable(),
  readings: z.array(PotencyReadingSchema).min(1, { error: "an observation needs readings" }),
  source: PotencySourceSchema.refine((source) => source !== "user_opt_in", {
    error: "user_opt_in is not accepted until the Phase 2 opt-in exists (P2)",
  }),
  recorded_by: NonEmptyStringSchema,
  evidence: z
    .string()
    .refine((path) => path.startsWith(EVIDENCE_PREFIX) && !path.split("/").includes(".."), {
      error: `evidence must be a golden-set photo path under ${EVIDENCE_PREFIX}`,
    })
    .nullable(),
});
export type PotencyObservation = z.infer<typeof PotencyObservationSchema>;
