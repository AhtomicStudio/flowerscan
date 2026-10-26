import { z } from "zod";
import { IsoDateTimeSchema, NodeIdSchema, NonEmptyStringSchema } from "./common";
import { RETAIL_BARCODE_FORMATS } from "./enums";
import { ScanBarcodeFormatSchema } from "./scan";

const RETAIL_FORMATS: ReadonlySet<string> = new Set(RETAIL_BARCODE_FORMATS);

/** Times a Code 128 value must be seen, on separate scans, before it becomes learnable (P13). */
export const CODE_128_LEARNABLE_AFTER = 2;

function learnableIssue(format: string, timesSeen: number): string | null {
  if (RETAIL_FORMATS.has(format)) return null;
  if (format !== "code_128") {
    return `${format} values are never learnable (only UPC/EAN and repeated Code 128)`;
  }
  return timesSeen < CODE_128_LEARNABLE_AFTER
    ? `a code_128 value becomes learnable only after ${CODE_128_LEARNABLE_AFTER} separate scans`
    : null;
}

/**
 * A remembered barcode → strain mapping (docs/04 "Local barcode memory", P13). UPC/EAN values are
 * learnable once confirmed. Code 128 values become learnable only after a second, separate scan.
 * Other formats never are. Track-and-trace UIDs are never stored (T-010 filters them out).
 */
export const BarcodeMemorySchema = z
  .strictObject({
    barcode: NonEmptyStringSchema,
    barcode_format: ScanBarcodeFormatSchema,
    strain_id: NodeIdSchema,
    confirmed_at: IsoDateTimeSchema,
    times_seen: z.int().min(1),
    learnable: z.boolean(),
  })
  .check((ctx) => {
    const memory = ctx.value;
    if (!memory.learnable) return;
    const message = learnableIssue(memory.barcode_format, memory.times_seen);
    if (message !== null) {
      ctx.issues.push({ code: "custom", input: memory, path: ["learnable"], message });
    }
  });
export type BarcodeMemory = z.infer<typeof BarcodeMemorySchema>;
