// T-011 acceptance: every potency form in the task list, each kept as its own reading, exactly as
// printed, never computed (P2, docs/04 "PotencyReading").
import { describe, expect, it } from "vitest";
import { type PotencyReading, PotencyReadingSchema, parseLabelText } from "../../src/index";
import { label } from "./fixtures";

const readings = (...lines: string[]) => parseLabelText(label(...lines)).potency_readings;

const reading = (
  analyte: PotencyReading["analyte"],
  qualifier: PotencyReading["qualifier"],
  value: number | null,
  unit: PotencyReading["unit"],
  raw: string,
): PotencyReading => ({ analyte, qualifier, value, unit, raw });

describe("potency: the T-011 acceptance forms", () => {
  it.each([
    ["THC 24.1%", reading("thc_unspecified", "exact", 24.1, "percent", "THC 24.1%")],
    ["Total THC: 24.1 %", reading("total_thc", "exact", 24.1, "percent", "Total THC: 24.1 %")],
    ["THCa 27%", reading("thca", "exact", 27, "percent", "THCa 27%")],
    ["Δ9-THC 0.8%", reading("delta9_thc", "exact", 0.8, "percent", "Δ9-THC 0.8%")],
    ["Total THC 241 mg/g", reading("total_thc", "exact", 241, "mg_per_g", "Total THC 241 mg/g")],
    ["CBD ND", reading("cbd", "nd", null, "percent", "CBD ND")],
    ["CBD <LOQ", reading("cbd", "below_loq", null, "percent", "CBD <LOQ")],
    ["CBD <1%", reading("cbd", "less_than", 1, "percent", "CBD <1%")],
  ])("reads %s", (text, expected) => {
    expect(readings(text)).toEqual([expected]);
    expect(PotencyReadingSchema.safeParse(expected).success).toBe(true);
  });

  it("keeps several figures printed side by side as separate readings, never a computed total", () => {
    expect(
      readings("THC 0.8%  THCa 27.1%  Total THC 24.6%  CBD <1%  Total Cannabinoids 31.2%"),
    ).toEqual([
      reading("thc_unspecified", "exact", 0.8, "percent", "THC 0.8%"),
      reading("thca", "exact", 27.1, "percent", "THCa 27.1%"),
      reading("total_thc", "exact", 24.6, "percent", "Total THC 24.6%"),
      reading("cbd", "less_than", 1, "percent", "CBD <1%"),
      reading("total_cannabinoids", "exact", 31.2, "percent", "Total Cannabinoids 31.2%"),
    ]);
  });

  it("never adds a Total THC that isn't printed", () => {
    const found = readings("THC 0.8%  THCa 27.1%");
    expect(found.map((entry) => entry.analyte)).toEqual(["thc_unspecified", "thca"]);
  });
});

describe("potency: label spellings", () => {
  it.each([
    ["THCA 27%", "thca"],
    ["THC-A 27%", "thca"],
    ["thca: 27%", "thca"],
    ["D9-THC 0.8%", "delta9_thc"],
    ["Delta-9 THC 0.8%", "delta9_thc"],
    ["Delta 9: 0.8%", "delta9_thc"],
    ["∆9-THC 0.8%", "delta9_thc"],
    ["A9-THC 0.8%", "delta9_thc"], // OCR's usual read of Δ
    ["TOTAL THC 24%", "total_thc"],
    ["Total Δ9-THC 24%", "total_thc"],
    ["Total Potential THC 24%", "total_thc"],
    ["Total CBD 0.5%", "total_cbd"],
    ["CBDA 0.5%", "cbda"],
    ["CBD-A 0.5%", "cbda"],
    ["TAC 31%", "total_cannabinoids"],
    ["Total Active Cannabinoids 31%", "total_cannabinoids"],
  ])("maps %s to %s", (text, analyte) => {
    expect(readings(text).map((entry) => entry.analyte)).toEqual([analyte]);
  });

  it("recognizes analytes the schema can't store (Δ8, THCV, CBG, CBN) without storing or matching them", () => {
    const facts = parseLabelText(label("Δ8-THC 1.2%  THCV 0.3%  CBG 1.1%  CBN 0.2%  THC 20%"));
    expect(facts.potency_readings).toEqual([
      reading("thc_unspecified", "exact", 20, "percent", "THC 20%"),
    ]);
    expect(facts.candidates).toEqual([]);
  });
});

describe("potency: value spellings", () => {
  it.each([
    ["THC 24.1 %", 24.1, "exact", "percent"],
    ["THC .8%", 0.8, "exact", "percent"],
    ["THC 0.0%", 0, "exact", "percent"],
    ["THC 24,1%", 24.1, "exact", "percent"], // decimal comma
    ["THC 2O.5%", 20.5, "exact", "percent"], // OCR O for 0
    ["THC l9.2%", 19.2, "exact", "percent"], // OCR l for 1
    ["THC 241mg/g", 241, "exact", "mg_per_g"],
    ["THC 241 MG / G", 241, "exact", "mg_per_g"],
    ["THC < 0.3%", 0.3, "less_than", "percent"],
    ["THC less than 0.3%", 0.3, "less_than", "percent"],
    ["CBD N.D.", null, "nd", "percent"],
    ["CBD not detected", null, "nd", "percent"],
    ["CBD <LOD", null, "nd", "percent"],
    ["CBD < LOQ", null, "below_loq", "percent"],
    ["CBD LOQ", null, "below_loq", "percent"],
    ["CBD ND mg/g", null, "nd", "mg_per_g"],
  ])("reads %s", (text, value, qualifier, unit) => {
    expect(readings(text)).toMatchObject([{ value, qualifier, unit }]);
  });

  it("borrows the unit for ND / LOQ from the same line, then from the label (docs/06)", () => {
    expect(readings("THC 241 mg/g  CBD ND")[1]).toMatchObject({
      qualifier: "nd",
      unit: "mg_per_g",
    });
    expect(readings("Total THC 241 mg/g", "CBD <LOQ")[1]).toMatchObject({
      qualifier: "below_loq",
      unit: "mg_per_g",
    });
  });

  it("drops misreads above the docs/04 bounds instead of fixing them", () => {
    expect(readings("THC 241%")).toEqual([]);
    expect(readings("THC 1241 mg/g")).toEqual([]);
  });

  it("ignores a plain number, a weight or a per-package mg figure (not storable units)", () => {
    expect(readings("THC 24")).toEqual([]);
    expect(readings("THC 100mg")).toEqual([]);
  });
});

describe("potency: layouts", () => {
  it("pairs value-first wording", () => {
    expect(readings("24.1% THC  0.5% CBD")).toEqual([
      reading("thc_unspecified", "exact", 24.1, "percent", "24.1% THC"),
      reading("cbd", "exact", 0.5, "percent", "0.5% CBD"),
    ]);
  });

  it("pairs a trailing value-first reading after label-first ones", () => {
    expect(readings("THC 0.8%  27% THCA").map((entry) => [entry.analyte, entry.value])).toEqual([
      ["thc_unspecified", 0.8],
      ["thca", 27],
    ]);
  });

  it("pairs a header line of labels with the line of values below it", () => {
    expect(readings("THC   THCA   CBD", "0.8%   27.1%   <LOQ")).toEqual([
      reading("thc_unspecified", "exact", 0.8, "percent", "THC\n0.8%"),
      reading("thca", "exact", 27.1, "percent", "THCA\n27.1%"),
      reading("cbd", "below_loq", null, "percent", "CBD\n<LOQ"),
    ]);
  });

  it("pairs a big value printed above its small label", () => {
    expect(parseLabelText(label(["27.4%", 40], ["TOTAL THC", 12])).potency_readings).toEqual([
      reading("total_thc", "exact", 27.4, "percent", "27.4%\nTOTAL THC"),
    ]);
  });

  it("doesn't zip lines whose counts differ", () => {
    expect(readings("THC   THCA   CBD", "0.8%   27.1%")).toEqual([]);
  });

  it("strips a qualifier between label and value but keeps the printed text as raw", () => {
    expect(readings("Total THC (as reported by the laboratory): 24.1%")).toEqual([
      reading(
        "total_thc",
        "exact",
        24.1,
        "percent",
        "Total THC (as reported by the laboratory): 24.1%",
      ),
    ]);
  });

  it("won't pair across words", () => {
    expect(readings("THC content of this jar 24%")).toEqual([]);
  });

  it("leaves a bare ND alone when there is no potency label (it may be a state)", () => {
    const facts = parseLabelText(label(["DURBAN POISON", 40], "Bismarck, ND"));
    expect(facts.potency_readings).toEqual([]);
    expect(facts.candidates.map((candidate) => candidate.text)).toContain("ND");
  });

  it("reads nothing from warning boilerplate", () => {
    expect(readings("Contains less than 0.3% Δ9-THC on a dry weight basis.")).toEqual([]);
  });
});
