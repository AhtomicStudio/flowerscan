import { z } from "zod";
import { UnitIntervalSchema } from "./common";
import {
  ClassificationLabelSchema,
  ConfidenceLevelSchema,
  LineageMethodSchema,
  SublabelSchema,
} from "./enums";

const PercentSchema = z.int().min(0).max(100);

/**
 * The computed lineage result (docs/04 "lineage object", docs/05 Output). Used in build output and in
 * scan snapshots. Only structural consistency is checked here; label bands and confidence thresholds
 * are product-tunable constants that live with the algorithm (T-005).
 */
export const LineageSchema = z
  .strictObject({
    sativa_pct: PercentSchema.nullable(),
    indica_pct: PercentSchema.nullable(),
    label: ClassificationLabelSchema,
    sublabel: SublabelSchema.nullable(),
    confidence: UnitIntervalSchema,
    confidence_level: ConfidenceLevelSchema,
    method: LineageMethodSchema,
    algo_version: z.int().min(1),
  })
  .check((ctx) => {
    const lineage = ctx.value;
    const issue = (path: string, message: string) =>
      ctx.issues.push({ code: "custom", input: lineage, path: [path], message });

    if (lineage.sativa_pct === null) {
      if (lineage.indica_pct !== null)
        issue("indica_pct", "indica_pct must be null when sativa_pct is");
      if (lineage.label !== "unknown")
        issue("label", "label must be unknown when sativa_pct is null");
      if (lineage.method !== "unknown")
        issue("method", "method must be unknown when sativa_pct is null");
      if (lineage.confidence !== 0)
        issue("confidence", "confidence must be 0 when sativa_pct is null");
    } else {
      if (lineage.indica_pct !== 100 - lineage.sativa_pct) {
        issue("indica_pct", "indica_pct must equal 100 - sativa_pct");
      }
      if (lineage.label === "unknown") issue("label", "label can't be unknown with a sativa_pct");
      if (lineage.method === "unknown")
        issue("method", "method can't be unknown with a sativa_pct");
    }

    if (lineage.label === "hybrid" && lineage.sublabel === null) {
      issue("sublabel", "a hybrid needs a sublabel");
    } else if (lineage.label !== "hybrid" && lineage.sublabel !== null) {
      issue("sublabel", "sublabel is only for hybrid");
    }

    if ((lineage.confidence === 0) !== (lineage.confidence_level === "none")) {
      issue("confidence_level", "confidence_level is none exactly when confidence is 0");
    }
  });
export type Lineage = z.infer<typeof LineageSchema>;
