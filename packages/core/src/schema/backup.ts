import { z } from "zod";
import { BarcodeMemorySchema } from "./barcode-memory";
import { IsoDateTimeSchema } from "./common";
import { SCHEMA_VERSION } from "./enums";
import { ScanSchema } from "./scan";
import { SettingsSchema } from "./settings";

export const BACKUP_FORMAT = "flowerscan-backup";

/**
 * The journal backup file, `flowerscan-backup-YYYY-MM-DD.json` (docs/04 "Journal backup file").
 * A file never holds two scans with the same `id`, or two memories for the same barcode.
 */
export const BackupFileSchema = z
  .strictObject({
    format: z.literal(BACKUP_FORMAT, { error: `not a ${BACKUP_FORMAT} file` }),
    schema_version: z.literal(SCHEMA_VERSION),
    exported_at: IsoDateTimeSchema,
    scans: z.array(ScanSchema),
    barcode_memory: z.array(BarcodeMemorySchema),
    settings: SettingsSchema,
  })
  .check((ctx) => {
    const file = ctx.value;
    const seenScans = new Set<string>();
    file.scans.forEach((scan, index) => {
      if (seenScans.has(scan.id)) {
        ctx.issues.push({
          code: "custom",
          input: file,
          path: ["scans", index, "id"],
          message: `duplicate scan id ${scan.id}`,
        });
      }
      seenScans.add(scan.id);
    });
    const seenBarcodes = new Set<string>();
    file.barcode_memory.forEach((memory, index) => {
      const key = `${memory.barcode_format}:${memory.barcode}`;
      if (seenBarcodes.has(key)) {
        ctx.issues.push({
          code: "custom",
          input: file,
          path: ["barcode_memory", index, "barcode"],
          message: `duplicate barcode ${key}`,
        });
      }
      seenBarcodes.add(key);
    });
  });
export type BackupFile = z.infer<typeof BackupFileSchema>;
