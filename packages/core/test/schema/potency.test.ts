import { describe, expect, it } from "vitest";
import { POTENCY_SOURCES, PotencyObservationSchema, PotencyReadingSchema } from "../../src/index";
import { expectIssue, expectValid, observation, reading, withFields } from "./fixtures";

describe("PotencyReading (P2: exactly as printed)", () => {
  const R = PotencyReadingSchema;

  it("accepts each way a figure is printed", () => {
    expectValid(R, reading);
    expectValid(R, {
      analyte: "thca",
      value: 27.3,
      qualifier: "exact",
      unit: "percent",
      raw: "THCa 27.3%",
    });
    expectValid(R, {
      analyte: "cbd",
      value: null,
      qualifier: "nd",
      unit: "percent",
      raw: "CBD ND",
    });
    expectValid(R, {
      analyte: "cbda",
      value: null,
      qualifier: "below_loq",
      unit: "percent",
      raw: "CBDa <LOQ",
    });
    expectValid(R, {
      analyte: "cbd",
      value: 1,
      qualifier: "less_than",
      unit: "percent",
      raw: "CBD <1%",
    });
    expectValid(R, {
      analyte: "thc_unspecified",
      value: 241,
      qualifier: "exact",
      unit: "mg_per_g",
      raw: "THC 241 mg/g",
    });
  });

  it("keeps the printed value without rounding", () => {
    expect(expectValid(R, withFields(reading, { value: 24.137 })).value).toBe(24.137);
  });

  it("rejects values that contradict the qualifier", () => {
    expectIssue(R, withFields(reading, { value: null }), ["value"], "needs a value");
    expectIssue(R, withFields(reading, { qualifier: "less_than", value: null }), ["value"]);
    expectIssue(R, withFields(reading, { qualifier: "nd" }), ["value"], "null");
    expectIssue(R, withFields(reading, { qualifier: "below_loq", value: 0 }), ["value"]);
  });

  it("rejects impossible values", () => {
    expectIssue(R, withFields(reading, { value: -1 }), ["value"]);
    expectIssue(R, withFields(reading, { value: 101 }), ["value"], "percent");
    expectIssue(R, withFields(reading, { unit: "mg_per_g", value: 1200 }), ["value"], "mg_per_g");
    expectValid(R, withFields(reading, { unit: "mg_per_g", value: 1000 }));
  });

  it("rejects unknown analytes, qualifiers, units, and an empty raw", () => {
    expectIssue(R, withFields(reading, { analyte: "thc" }), ["analyte"]);
    expectIssue(R, withFields(reading, { qualifier: "approx" }), ["qualifier"]);
    expectIssue(R, withFields(reading, { unit: "mg" }), ["unit"]);
    expectIssue(R, withFields(reading, { raw: "" }), ["raw"]);
    expectIssue(R, withFields(reading, { total: 26 }), []);
  });
});

describe("PotencyObservation", () => {
  const O = PotencyObservationSchema;

  it("accepts eval-set and founder records", () => {
    expectValid(O, observation);
    expectValid(
      O,
      withFields(observation, {
        source: "founder_record",
        recorded_by: "Founder A",
        evidence: null,
        brand: null,
        state: null,
        product_form: null,
        packaged_on: null,
        batch: "B-2026-1001",
      }),
    );
  });

  it("rejects user_opt_in until Phase 2", () => {
    expect(POTENCY_SOURCES).toContain("user_opt_in");
    expectIssue(O, withFields(observation, { source: "user_opt_in" }), ["source"], "Phase 2");
  });

  it("requires readings", () => {
    expectIssue(O, withFields(observation, { readings: [] }), ["readings"]);
    expectIssue(O, withFields(observation, { readings: [{ ...reading, value: null }] }), [
      "readings",
      0,
      "value",
    ]);
  });

  it("validates ids, codes, and dates", () => {
    expectIssue(O, withFields(observation, { id: "obs_123" }), ["id"]);
    expectIssue(O, withFields(observation, { id: "scan_01JB8Z7Q2X4N6P8R0T2V4W6Y8B" }), ["id"]);
    expectIssue(O, withFields(observation, { strain_id: "Moonlit Fern" }), ["strain_id"]);
    expectIssue(O, withFields(observation, { state: "Michigan" }), ["state"]);
    expectIssue(O, withFields(observation, { state: "mi" }), ["state"]);
    expectIssue(O, withFields(observation, { observed_on: "10/25/2026" }), ["observed_on"]);
    expectIssue(O, withFields(observation, { product_form: "cart" }), ["product_form"]);
    expectIssue(O, withFields(observation, { recorded_by: "" }), ["recorded_by"]);
    expectIssue(O, withFields(observation, { batch: undefined }), ["batch"]);
  });

  it("only links evidence from the golden set, never a user photo", () => {
    expectIssue(O, withFields(observation, { evidence: "photos/IMG_0001.jpg" }), ["evidence"]);
    expectIssue(O, withFields(observation, { evidence: "data/eval/../user/IMG.jpg" }), [
      "evidence",
    ]);
  });
});
