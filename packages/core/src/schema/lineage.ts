import { z } from "zod";
import { UnitIntervalSchema } from "./common";
import {
  type ClassificationLabel,
  ClassificationLabelSchema,
  ConfidenceLevelSchema,
  LineageMethodSchema,
  type Sublabel,
  SublabelSchema,
} from "./enums";

const PercentSchema = z.int().min(0).max(100);

/**
 * Which sublabels each label allows (D15, 2026-10-27). The sublabel is how strong the lean is: a hybrid
 * (exactly 50) is always `balanced`, an indica or sativa is `*-dominant` or null at the ends of the scale.
 */
const ALLOWED_SUBLABELS: Readonly<Record<ClassificationLabel, readonly (Sublabel | null)[]>> = {
  indica: [null, "indica-dominant"],
  hybrid: ["balanced"],
  sativa: [null, "sativa-dominant"],
  unknown: [null],
};

const SUBLABEL_RULE: Readonly<Record<ClassificationLabel, string>> = {
  indica: "an indica's sublabel is null or indica-dominant",
  hybrid: "a hybrid's sublabel is balanced",
  sativa: "a sativa's sublabel is null or sativa-dominant",
  unknown: "an unknown result has no sublabel",
};

/**
 * The computed lineage result (docs/04 "lineage object", docs/05 Output). Used in build output and in
 * scan snapshots. Only structural consistency is checked here, including which sublabels each label
 * allows; the label bands themselves and confidence thresholds are product-tunable constants that live
 * with the algorithm (T-005).
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

    if (!ALLOWED_SUBLABELS[lineage.label].includes(lineage.sublabel)) {
      issue("sublabel", SUBLABEL_RULE[lineage.label]);
    }

    if ((lineage.confidence === 0) !== (lineage.confidence_level === "none")) {
      issue("confidence_level", "confidence_level is none exactly when confidence is 0");
    }
  });
export type Lineage = z.infer<typeof LineageSchema>;
