// A saved scan (docs/04 "Scan"). On-device user data.
import { z } from "zod";
import {
  IsoDateTimeSchema,
  NodeIdSchema,
  NonEmptyStringSchema,
  SCAN_ID_PATTERN,
  UnitIntervalSchema,
} from "./common";
import {
  BarcodeFormatSchema,
  PackageSaysSchema,
  ProductFormSchema,
  SCHEMA_VERSION,
  ScanMethodSchema,
} from "./enums";
import { LineageSchema } from "./lineage";
import { PotencyReadingSchema } from "./potency";

/** 1D and non-QR 2D formats. QR content goes to `qr_payload`, not `barcode`. */
export const ScanBarcodeFormatSchema = BarcodeFormatSchema.exclude(["qr_code"]);
export type ScanBarcodeFormat = z.infer<typeof ScanBarcodeFormatSchema>;

/** One saved scan. Every key is present; unknown values are `null`, never invented. */
export const ScanSchema = z
  .strictObject({
    id: z.string().regex(SCAN_ID_PATTERN, { error: "must be scan_<ulid>" }),
    schema_version: z.literal(SCHEMA_VERSION),
    date_scanned: IsoDateTimeSchema,
    scan_method: ScanMethodSchema,
    strain_id: NodeIdSchema.nullable(),
    strain_name: z.string(),
    lineage: LineageSchema,
    data_version: NonEmptyStringSchema,
    match_score: UnitIntervalSchema,
    package_says: PackageSaysSchema.nullable(),
    potency_readings: z.array(PotencyReadingSchema),
    brand: NonEmptyStringSchema.nullable(),
    product_form: ProductFormSchema.nullable(),
    barcode: NonEmptyStringSchema.nullable(),
    barcode_format: ScanBarcodeFormatSchema.nullable(),
    qr_payload: NonEmptyStringSchema.nullable(),
    ocr_text: z.string().nullable(),
    rating: z.int().min(1).max(5).nullable(),
    notes: z.string(),
  })
  .check((ctx) => {
    const scan = ctx.value;
    const issue = (path: string, message: string) =>
      ctx.issues.push({ code: "custom", input: scan, path: [path], message });
    if (scan.strain_id === null && scan.lineage.label !== "unknown") {
      issue("lineage", "an unidentified scan (strain_id null) has an unknown lineage");
    }
    if ((scan.barcode === null) !== (scan.barcode_format === null)) {
      issue("barcode_format", "barcode and barcode_format are set together");
    }
    if (scan.scan_method === "barcode" && scan.barcode === null) {
      issue("barcode", "a barcode scan needs the barcode value");
    }
    if (scan.scan_method === "qr" && scan.qr_payload === null) {
      issue("qr_payload", "a QR scan needs the QR payload");
    }
  });
export type Scan = z.infer<typeof ScanSchema>;
