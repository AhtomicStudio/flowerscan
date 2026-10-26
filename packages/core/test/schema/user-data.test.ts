import { describe, expect, it } from "vitest";
import {
  BACKUP_FORMAT,
  BackupFileSchema,
  BarcodeMemorySchema,
  CODE_128_LEARNABLE_AFTER,
  ScanSchema,
  SettingsSchema,
} from "../../src/index";
import {
  barcodeMemory,
  expectIssue,
  expectValid,
  scan,
  settings,
  unknownLineage,
  withFields,
} from "./fixtures";

describe("Scan", () => {
  const S = ScanSchema;

  it("accepts an identified text scan", () => {
    expectValid(S, scan);
  });

  it("accepts an unidentified scan with an unknown lineage", () => {
    expectValid(
      S,
      withFields(scan, {
        strain_id: null,
        strain_name: "",
        lineage: unknownLineage,
        match_score: 0,
        package_says: null,
        potency_readings: [],
        product_form: null,
        rating: null,
      }),
    );
  });

  it("accepts barcode and QR scans with their raw values", () => {
    expectValid(
      S,
      withFields(scan, {
        scan_method: "barcode",
        barcode: "036000291452",
        barcode_format: "upc_a",
      }),
    );
    expectValid(
      S,
      withFields(scan, {
        scan_method: "qr",
        qr_payload: "https://example.org/products/moonlit-fern-4",
      }),
    );
    expectValid(S, withFields(scan, { scan_method: "link" }));
    expectValid(S, withFields(scan, { scan_method: "manual", ocr_text: null }));
  });

  it("requires every key (unknown values are null, not omitted)", () => {
    for (const field of ["brand", "barcode", "ocr_text", "rating", "potency_readings", "notes"]) {
      expectIssue(S, withFields(scan, { [field]: undefined }), [field]);
    }
  });

  it("package_says has three values only (P3)", () => {
    for (const value of ["indica", "sativa", "hybrid", null]) {
      expectValid(S, withFields(scan, { package_says: value }));
    }
    expectIssue(S, withFields(scan, { package_says: "indica-dominant" }), ["package_says"]);
    expectIssue(S, withFields(scan, { package_says: "unknown" }), ["package_says"]);
  });

  it("validates ids, dates, scores, and ratings", () => {
    expectIssue(S, withFields(scan, { id: "scan_01jb8z7q2x4n6p8r0t2v4w6y8a" }), ["id"]);
    expectIssue(S, withFields(scan, { id: "01JB8Z7Q2X4N6P8R0T2V4W6Y8A" }), ["id"]);
    expectIssue(S, withFields(scan, { date_scanned: "2026-10-25T18:42:11" }), ["date_scanned"]);
    expectIssue(S, withFields(scan, { date_scanned: "2026-10-25" }), ["date_scanned"]);
    expectValid(S, withFields(scan, { date_scanned: "2026-10-26T01:42:11Z" }));
    expectIssue(S, withFields(scan, { match_score: 1.01 }), ["match_score"]);
    expectIssue(S, withFields(scan, { rating: 0 }), ["rating"]);
    expectIssue(S, withFields(scan, { rating: 4.5 }), ["rating"]);
    expectIssue(S, withFields(scan, { scan_method: "camera" }), ["scan_method"]);
    expectIssue(S, withFields(scan, { product_form: "smalls" }), ["product_form"]);
    expectIssue(S, withFields(scan, { data_version: "" }), ["data_version"]);
    expectIssue(S, withFields(scan, { schema_version: 0 }), ["schema_version"]);
  });

  it("validates the lineage snapshot and potency readings", () => {
    expectIssue(S, withFields(scan, { lineage: { ...unknownLineage, label: "hybrid" } }), [
      "lineage",
      "label",
    ]);
    expectIssue(S, withFields(scan, { potency_readings: [{ analyte: "thc" }] }), [
      "potency_readings",
      0,
      "analyte",
    ]);
  });

  it("an unidentified scan never carries a lineage", () => {
    expectIssue(S, withFields(scan, { strain_id: null }), ["lineage"], "unidentified");
  });

  it("barcode and barcode_format go together", () => {
    expectIssue(S, withFields(scan, { barcode: "036000291452" }), ["barcode_format"]);
    expectIssue(S, withFields(scan, { barcode_format: "upc_a" }), ["barcode_format"]);
    expectIssue(S, withFields(scan, { barcode: "x", barcode_format: "qr_code" }), [
      "barcode_format",
    ]);
  });

  it("barcode and QR scans keep their raw value", () => {
    expectIssue(S, withFields(scan, { scan_method: "barcode" }), ["barcode"]);
    expectIssue(S, withFields(scan, { scan_method: "qr" }), ["qr_payload"]);
  });
});

describe("BarcodeMemory (P13)", () => {
  const B = BarcodeMemorySchema;

  it("UPC/EAN values are learnable on the first confirmed scan", () => {
    expectValid(B, barcodeMemory);
    expectValid(
      B,
      withFields(barcodeMemory, { barcode: "4006381333931", barcode_format: "ean_13" }),
    );
  });

  it("a Code 128 value becomes learnable only after a second scan", () => {
    const code128 = withFields(barcodeMemory, {
      barcode: "STORE-0042",
      barcode_format: "code_128",
    });
    expectValid(B, withFields(code128, { learnable: false, times_seen: 1 }));
    expectIssue(B, withFields(code128, { times_seen: 1 }), ["learnable"], "code_128");
    expectValid(B, withFields(code128, { times_seen: CODE_128_LEARNABLE_AFTER }));
  });

  it("other formats are never learnable", () => {
    const code39 = withFields(barcodeMemory, { barcode: "LOT42", barcode_format: "code_39" });
    expectValid(B, withFields(code39, { learnable: false }));
    expectIssue(B, withFields(code39, { times_seen: 5 }), ["learnable"], "never");
  });

  it("rejects bad fields", () => {
    expectIssue(B, withFields(barcodeMemory, { learnable: undefined }), ["learnable"]);
    expectIssue(B, withFields(barcodeMemory, { times_seen: 0 }), ["times_seen"]);
    expectIssue(B, withFields(barcodeMemory, { strain_id: null }), ["strain_id"]);
    expectIssue(B, withFields(barcodeMemory, { barcode: "" }), ["barcode"]);
    expectIssue(B, withFields(barcodeMemory, { barcode_format: "qr_code" }), ["barcode_format"]);
    expectIssue(B, withFields(barcodeMemory, { confirmed_at: "yesterday" }), ["confirmed_at"]);
  });
});

describe("Settings", () => {
  it("accepts settings before and after the age gate", () => {
    expectValid(SettingsSchema, settings);
    expectValid(
      SettingsSchema,
      withFields(settings, { age_confirmed_at: null, theme: "system", default_mode: "text" }),
    );
    expectValid(
      SettingsSchema,
      withFields(settings, {
        theme: "light",
        haptics: false,
        last_backup_at: "2026-10-25T19:00:00Z",
      }),
    );
  });

  it("rejects bad fields", () => {
    expectIssue(SettingsSchema, withFields(settings, { theme: "neon" }), ["theme"]);
    expectIssue(SettingsSchema, withFields(settings, { default_mode: "search" }), ["default_mode"]);
    expectIssue(SettingsSchema, withFields(settings, { haptics: "on" }), ["haptics"]);
    expectIssue(SettingsSchema, withFields(settings, { age_confirmed_at: undefined }), [
      "age_confirmed_at",
    ]);
    expectIssue(SettingsSchema, withFields(settings, { birth_year: 1990 }), []);
  });
});

describe("BackupFile", () => {
  const backup = {
    format: BACKUP_FORMAT,
    schema_version: 1,
    exported_at: "2026-10-25T19:00:00-07:00",
    scans: [scan],
    barcode_memory: [barcodeMemory],
    settings,
  };

  it("accepts a backup, including an empty journal", () => {
    expect(BACKUP_FORMAT).toBe("flowerscan-backup");
    expectValid(BackupFileSchema, backup);
    expectValid(BackupFileSchema, withFields(backup, { scans: [], barcode_memory: [] }));
  });

  it("rejects a file of the wrong type", () => {
    expectIssue(BackupFileSchema, withFields(backup, { format: "other-app" }), ["format"], "not a");
    expectIssue(BackupFileSchema, { hello: "world" }, ["format"]);
    expectIssue(BackupFileSchema, withFields(backup, { schema_version: 2 }), ["schema_version"]);
  });

  it("reports invalid records at their index", () => {
    const broken = withFields(backup, { scans: [scan, { ...scan, id: "scan_bad" }] });
    expectIssue(BackupFileSchema, broken, ["scans", 1, "id"]);
    expectIssue(BackupFileSchema, withFields(backup, { settings: undefined }), ["settings"]);
  });

  it("rejects duplicate scan ids and duplicate barcodes", () => {
    expectIssue(BackupFileSchema, withFields(backup, { scans: [scan, scan] }), ["scans", 1, "id"]);
    expectIssue(
      BackupFileSchema,
      withFields(backup, { barcode_memory: [barcodeMemory, { ...barcodeMemory, times_seen: 3 }] }),
      ["barcode_memory", 1, "barcode"],
    );
    // The same digits in a different format are a different barcode.
    expectValid(
      BackupFileSchema,
      withFields(backup, {
        barcode_memory: [
          barcodeMemory,
          { ...barcodeMemory, barcode_format: "code_128", learnable: false },
        ],
      }),
    );
  });
});
