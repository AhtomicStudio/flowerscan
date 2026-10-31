// T-010: UPC/EAN check digits, track-and-trace UIDs and the barcode-memory learning rule (P13).
import { describe, expect, it } from "vitest";
import {
  BarcodeMemorySchema,
  CODE_128_LEARNABLE_AFTER,
  classifyBarcode,
  isBarcodeLearnable,
  RETAIL_LEARNABLE_AFTER,
} from "../../src/index";
import { expandUpcE, hasValidCheckDigit } from "../../src/scan/classifyBarcode";

describe("classifyBarcode: UPC/EAN check digits", () => {
  it.each([
    ["upc_a", "036000291452"],
    ["upc_a", "412345678903"],
    ["upc_a", "0036000291452"], // 13-digit UPC-A with a leading 0, as some decoders report it
    ["ean_13", "4006381333931"],
    ["ean_13", "2001234567893"],
    ["ean_8", "96385074"],
    ["upc_e", "01234505"], // last digit 0–2 branch
    ["upc_e", "01234531"], // 3
    ["upc_e", "01234543"], // 4
    ["upc_e", "01234565"], // 5–9
    ["upc_e", "06543217"],
    ["upc_e", "11234562"], // number system 1
  ] as const)("accepts a valid %s %s as retail, learnable on the first scan", (format, value) => {
    expect(classifyBarcode(value, format)).toEqual({
      kind: "retail",
      value,
      format,
      rejected: null,
      storable: true,
      learnable_after: RETAIL_LEARNABLE_AFTER,
    });
  });

  it.each([
    ["upc_a", "412345678904", "check_digit"], // docs/testing/camera-fixtures.md
    ["ean_13", "2001234567890", "check_digit"], // docs/testing/camera-fixtures.md
    ["ean_13", "4006381333932", "check_digit"],
    ["ean_8", "96385075", "check_digit"],
    ["upc_e", "01234566", "check_digit"],
    ["upc_a", "03600029145", "length"],
    ["upc_a", "1036000291452", "length"], // 13 digits without the leading 0
    ["ean_13", "036000291452", "length"],
    ["ean_8", "9638507", "length"],
    ["upc_e", "0123456", "length"],
    ["upc_e", "21234565", "characters"], // number system must be 0 or 1
    ["upc_a", "03600O291452", "characters"], // OCR-style letter O
    ["ean_13", " 4006381333931", "characters"],
    ["ean_13", "", "characters"],
  ] as const)("rejects %s %s (%s): a misread, never stored", (format, value, rejected) => {
    const facts = classifyBarcode(value, format);
    expect(facts).toMatchObject({ kind: "invalid", rejected, storable: false });
    expect(facts.learnable_after).toBeNull();
    expect(isBarcodeLearnable(facts, 99)).toBe(false);
  });

  it("validates with GS1 mod-10 and expands UPC-E the standard way", () => {
    expect(hasValidCheckDigit("036000291452")).toBe(true);
    expect(hasValidCheckDigit("036000291453")).toBe(false);
    expect(expandUpcE("01234565")).toBe("012345000065");
    expect(expandUpcE("01234505")).toBe("012000003455");
    expect(expandUpcE("01234531")).toBe("012300000451");
    expect(expandUpcE("01234543")).toBe("012340000053");
    expect(expandUpcE("21234565")).toBeNull();
    expect(expandUpcE("0123456")).toBeNull();
  });
});

describe("classifyBarcode: track-and-trace UIDs (P13)", () => {
  it.each([
    ["code_128", "1A4050300013FED000097325"], // Metrc tag example (domain review [F 17])
    ["code_128", "1a4050300013fed000097325"], // decoders may lowercase
    ["code_128", "ABCD1234EFGH5678IJKL9012"], // any 24-character letters-and-digits UID
    ["data_matrix", "1A4060300003A2D000012345"],
    ["code_39", "1A4060300003A2D000012345"],
  ] as const)("flags %s %s as a UID that is never stored", (format, value) => {
    const facts = classifyBarcode(value, format);
    expect(facts).toEqual({
      kind: "track_and_trace",
      value,
      format,
      rejected: null,
      storable: false,
      learnable_after: null,
    });
    expect(isBarcodeLearnable(facts, 5)).toBe(false);
  });

  it("does not mistake 24 digits only, or 23 or 25 characters, for a UID", () => {
    expect(classifyBarcode("123456789012345678901234", "code_128").kind).toBe("other");
    expect(classifyBarcode("1A405030001FED000097325", "code_128").kind).toBe("other");
    expect(classifyBarcode("1A4050300013FED0000973256", "code_128").kind).toBe("other");
  });
});

describe("classifyBarcode: other values and the learning rule", () => {
  it("stores other Code 128 values, learnable only after a second separate scan", () => {
    const facts = classifyBarcode("POS-00451-BD", "code_128");
    expect(facts).toEqual({
      kind: "other",
      value: "POS-00451-BD",
      format: "code_128",
      rejected: null,
      storable: true,
      learnable_after: CODE_128_LEARNABLE_AFTER,
    });
    expect(isBarcodeLearnable(facts, 1)).toBe(false);
    expect(isBarcodeLearnable(facts, 2)).toBe(true);
  });

  it.each(["code_39", "data_matrix", "pdf417"] as const)(
    "never makes %s values learnable",
    (format) => {
      const facts = classifyBarcode("STORE 1187", format);
      expect(facts).toMatchObject({ kind: "other", storable: true, learnable_after: null });
      expect(isBarcodeLearnable(facts, 10)).toBe(false);
    },
  );

  it("does not store an empty non-retail value", () => {
    expect(classifyBarcode("  ", "code_128").storable).toBe(false);
  });

  it("makes UPC/EAN learnable once confirmed", () => {
    expect(isBarcodeLearnable(classifyBarcode("036000291452", "upc_a"), 1)).toBe(true);
    expect(isBarcodeLearnable(classifyBarcode("036000291452", "upc_a"), 0)).toBe(false);
  });

  it("agrees with the BarcodeMemorySchema learnable rule", () => {
    const memory = (barcode: string, format: "upc_a" | "code_128" | "pdf417", times: number) => {
      const facts = classifyBarcode(barcode, format);
      return BarcodeMemorySchema.safeParse({
        barcode,
        barcode_format: format,
        strain_id: "blue-dream",
        confirmed_at: "2026-10-29T12:00:00Z",
        times_seen: times,
        learnable: isBarcodeLearnable(facts, times),
      }).success;
    };
    for (const times of [1, 2, 3]) {
      expect(memory("036000291452", "upc_a", times)).toBe(true);
      expect(memory("POS-00451-BD", "code_128", times)).toBe(true);
      expect(memory("STORE 1187", "pdf417", times)).toBe(true);
    }
    // And the schema itself rejects what isBarcodeLearnable refuses.
    expect(
      BarcodeMemorySchema.safeParse({
        barcode: "POS-00451-BD",
        barcode_format: "code_128",
        strain_id: "blue-dream",
        confirmed_at: "2026-10-29T12:00:00Z",
        times_seen: 1,
        learnable: true,
      }).success,
    ).toBe(false);
  });

  it("is deterministic and keeps the raw value", () => {
    expect(classifyBarcode("POS-00451-BD", "code_128")).toEqual(
      classifyBarcode("POS-00451-BD", "code_128"),
    );
    expect(classifyBarcode(" padded ", "code_128").value).toBe(" padded ");
  });
});
