// T-011 acceptance: hand-written, deliberately messy OCR outputs (wrapped lines, 0/O and 1/l
// confusions, warning blocks, brand names, several potency figures side by side), each run through
// the whole core pipeline: parseLabelText → match → decide against a fixture index.
import { describe, expect, it } from "vitest";
import {
  decide,
  type LabelFacts,
  type MatchDecision,
  match,
  type OcrLine,
  type PotencyReading,
  parseLabelText,
} from "../../src/index";
import { CA_WARNING, label, scanIndex } from "./fixtures";

interface LabelCase {
  readonly name: string;
  readonly lines: readonly OcrLine[];
  readonly decision: MatchDecision["kind"];
  /** accept: the accepted id. choose: an id that must be offered. */
  readonly id?: string;
  /** Ids that must never be accepted. */
  readonly never?: readonly string[];
  readonly facts?: Partial<Omit<LabelFacts, "candidates" | "potency_readings">>;
  /** Readings as [analyte, qualifier, value, unit, raw]. */
  readonly readings?: readonly (readonly [
    PotencyReading["analyte"],
    PotencyReading["qualifier"],
    number | null,
    PotencyReading["unit"],
    string,
  ])[];
}

const CASES: readonly LabelCase[] = [
  {
    name: "CA jar: unknown brand, numbered pheno, potency trio, UID, wrapped warning block",
    lines: label(
      ["NORTHFIELD FARMS", 34],
      ["GELATO #33", 52],
      ["HYBRID  |  FLOWER  3.5G", 18],
      ["Total THC: 27.43%  THC 0.61%  THCa 30.58%", 12],
      ["PKG: 02/23/26   UID 1A4060300003A2D000012345", 9],
      ...CA_WARNING,
    ),
    decision: "accept",
    id: "gelato-33",
    never: ["gelato"],
    facts: { package_says: "hybrid", product_form: "flower", brand: null },
    readings: [
      ["total_thc", "exact", 27.43, "percent", "Total THC: 27.43%"],
      ["thc_unspecified", "exact", 0.61, "percent", "THC 0.61%"],
      ["thca", "exact", 30.58, "percent", "THCa 30.58%"],
    ],
  },
  {
    name: "MI compliance sticker: label prefix, alias, MI qualifier and statutory spelling",
    lines: label(
      ["Strain: GG4", 14],
      ["THC 22.6% CBD 0.05% (the actual value may vary from the reported value by 10%)", 9],
      ["Package Tag: 1A4050300013FED000097325", 9],
      ["It is illegal to drive a motor vehicle while under the influence of marihuana.", 8],
      ["National Poison Control Center 1-800-222-1222", 8],
      ["Producer: Lakeshore Growers LLC  License AU-R-000524", 8],
    ),
    decision: "accept",
    id: "gorilla-glue-4",
    facts: { package_says: null, brand: null, product_form: null },
    readings: [
      ["thc_unspecified", "exact", 22.6, "percent", "THC 22.6%"],
      ["cbd", "exact", 0.05, "percent", "CBD 0.05%"],
    ],
  },
  {
    name: "OCR confusions: G0RILLA with a zero, lNDICA with a lowercase L",
    lines: label(["G0RILLA GLUE #4", 46, 0.71], ["lNDICA", 18, 0.62], ["1g", 12]),
    decision: "accept",
    id: "gorilla-glue-4",
    never: ["gorilla-glue-1", "gorilla-glue-5"],
    facts: { package_says: "indica" },
  },
  {
    name: "Name wrapped over two big lines, lean wording",
    lines: label(["WEDDING", 64], ["CAKE", 64], ["Indica-Dominant Hybrid", 16], ["7g", 12]),
    decision: "accept",
    id: "wedding-cake",
    facts: { package_says: "indica" },
  },
  {
    name: "Brand that is a strain token, logo above a longer strain name (P6)",
    lines: label(
      ["RUNTZ", 70],
      ["WHITE RUNTZ", 44],
      ["3.5g · HYBRID", 16],
      ["THC 0.9%   THCA 29.1%   TOTAL THC 26.4%", 11],
    ),
    decision: "accept",
    id: "white-runtz",
    never: ["runtz"],
    facts: { brand: "Runtz", package_says: "hybrid" },
    readings: [
      ["thc_unspecified", "exact", 0.9, "percent", "THC 0.9%"],
      ["thca", "exact", 29.1, "percent", "THCA 29.1%"],
      ["total_thc", "exact", 26.4, "percent", "TOTAL THC 26.4%"],
    ],
  },
  {
    name: "Cookies brand over Girl Scout Cookies: the brand never eats the strain token",
    lines: label(["COOKIES®", 58], ["Girl Scout Cookies", 40], ["HYBRID", 18]),
    decision: "accept",
    id: "girl-scout-cookies",
    facts: { brand: "Cookies", package_says: "hybrid" },
  },
  {
    name: "Product-form word inside a strain name: Hash Plant live resin cart",
    lines: label(["HASH PLANT", 48], ["LIVE RESIN CART  1g", 18], ["(I)", 14]),
    decision: "accept",
    id: "hash-plant",
    facts: { product_form: "vape", package_says: "indica" },
  },
  {
    name: "Pre-roll pack: quantity x is not cross notation",
    lines: label(["5 x 0.5g PRE-ROLLS", 18], ["JACK HERER", 44], ["SATIVA", 20]),
    decision: "accept",
    id: "jack-herer",
    facts: { product_form: "pre-roll", package_says: "sativa" },
  },
  {
    name: "Unnamed cross: never auto-accepts a parent (P4)",
    lines: label(["WEDDING CAKE x GELATO 33", 40], ["HYBRID", 18]),
    decision: "choose",
    id: "wedding-cake",
    never: ["wedding-cake", "gelato-33"],
  },
  {
    name: "Hemp THCa flower: legal Δ9 disclaimer is boilerplate, the printed Δ9 reading is kept",
    lines: label(
      ["THCa FLOWER", 22],
      ["PURPLE PUNCH", 46],
      ["THCa 27.6%  Δ9-THC <0.3%", 13],
      ["Contains less than 0.3% Δ9-THC on a dry weight basis.", 8],
      ["Farm Bill compliant hemp. Not evaluated by the FDA.", 8],
    ),
    decision: "accept",
    id: "purple-punch",
    facts: { product_form: "flower" },
    readings: [
      ["thca", "exact", 27.6, "percent", "THCa 27.6%"],
      ["delta9_thc", "less_than", 0.3, "percent", "Δ9-THC <0.3%"],
    ],
  },
  {
    name: "Strain not in the database: no match, nothing invented",
    lines: label(["ACME FARMS", 30], ["PLINTH MARMOSET", 44], ["INDICA", 18], ["THC 21%", 12]),
    decision: "none",
    facts: { package_says: "indica", brand: null },
  },
  {
    name: "Strain-token brand with an unknown strain: the brand alone is never a candidate",
    lines: label(["RUNTZ", 70], ["PLINTH MARMOSET", 40], ["HYBRID", 18]),
    decision: "none",
    never: ["runtz"],
    facts: { brand: "Runtz" },
  },
  {
    name: "Digit and letter confusions inside the name and the category word",
    lines: label(["B1ue Dream", 50, 0.68], ["SATlVA", 20, 0.58], ["NET WT 3.5 G", 12]),
    decision: "accept",
    id: "blue-dream",
    facts: { package_says: "sativa" },
  },
  {
    name: "CO label: warnings, harvest batch, Total THC and Total CBD side by side",
    lines: label(
      ["SOUR DIESEL", 44],
      ["Total THC: 19.8%   Total CBD: 0.1%", 12],
      ["Harvest Batch: HB-2026-0412   Lic. 403-00123", 9],
      ["Contains Marijuana. Keep away from children.", 8],
      ["This product was produced without regulatory oversight for", 8],
      ["health, safety, or efficacy.", 8],
    ),
    decision: "accept",
    id: "sour-diesel",
    readings: [
      ["total_thc", "exact", 19.8, "percent", "Total THC: 19.8%"],
      ["total_cbd", "exact", 0.1, "percent", "Total CBD: 0.1%"],
    ],
  },
  {
    name: "NY label: nickname alias, COA line, expiry, NY warnings",
    lines: label(
      ["LARRY BIRD", 48],
      ["Total THC 24.9%", 13],
      ["Scan for COA   Exp: 2027-10-01", 9],
      ["This product contains cannabis and THC.", 8],
      ["KEEP OUT OF REACH OF CHILDREN AND PETS.", 8],
      ["For use only by persons 21 years and older.", 8],
      ["Poison Center 1-800-222-1222", 8],
      ["Warning: Smoking or vaping is hazardous to health.", 8],
    ),
    decision: "accept",
    id: "gelato-33",
    readings: [["total_thc", "exact", 24.9, "percent", "Total THC 24.9%"]],
  },
  {
    name: "WA label: UBI, lot, WA warnings, a <LOQ reading without a unit",
    lines: label(
      ["M.A.C. 1", 46],
      ["TOTAL THC 23.8%   TOTAL CBD <LOQ", 12],
      ["UBI 603-123-456   Lot # 1234567", 9],
      ["Warning – May be habit forming.", 8],
      ["Unlawful outside Washington State.", 8],
      ["Smoking is hazardous to your health.", 8],
    ),
    decision: "accept",
    id: "mac-1",
    never: ["mac"],
    readings: [
      ["total_thc", "exact", 23.8, "percent", "TOTAL THC 23.8%"],
      ["total_cbd", "below_loq", null, "percent", "TOTAL CBD <LOQ"],
    ],
  },
  {
    name: "Retail euphemism with a bracketed category letter",
    lines: label(["Garlic Cookies (I)", 42], ["SMALLS  14g", 16]),
    decision: "accept",
    id: "gmo",
    facts: { package_says: "indica", product_form: "flower" },
  },
  {
    name: "Type-scale graphic names both sides: package_says is unknown, not a guess",
    lines: label(["DURBAN POISON", 44], ["INDICA   HYBRID   SATIVA", 14]),
    decision: "accept",
    id: "durban-poison",
    facts: { package_says: null },
  },
  {
    name: "Glare noise lines and a retail euphemism",
    lines: label(
      ["~ ,. ;  |||", 10, 0.21],
      ["GREEN CRUSH", 44, 0.83],
      ["lI1 .", 9, 0.18],
      ["SATIVA HYBRID", 16],
    ),
    decision: "accept",
    id: "green-crack",
    facts: { package_says: "sativa" },
  },
  {
    name: "Known brand plus a brand-coined abbreviation: a close call",
    lines: label(["SHERBINSKIS", 40], ["TRUE GLTO 33", 46], ["LIVE RESIN AIO  HYBRID 0.5g", 14]),
    decision: "choose",
    id: "gelato-33",
    facts: { brand: "Sherbinskis", product_form: "vape", package_says: "hybrid" },
  },
  {
    name: "Strain-token brand printed twice: logo plus the strain line",
    lines: label(["RUNTZ", 66], ["RUNTZ", 42], ["HYBRID  3.5G", 16]),
    decision: "accept",
    id: "runtz",
    facts: { brand: "Runtz", package_says: "hybrid" },
  },
  {
    name: "Another known brand selling a strain-token strain: the strain line is a name",
    lines: label(["SHERBINSKIS", 36], ["RUNTZ", 46], ["INDICA", 16]),
    decision: "accept",
    id: "runtz",
    facts: { brand: "Sherbinskis", package_says: "indica" },
  },
  {
    name: "Warning trap: 'children and animals' never reaches Animal Cookies",
    lines: label(["GELATO CAKE", 46], ...CA_WARNING),
    decision: "accept",
    id: "gelato-cake",
    never: ["animal-cookies", "gelato"],
  },
];

describe("realistic OCR labels → parseLabelText → match → decide", () => {
  it("has at least 15 hand-written label cases (T-011)", () => {
    expect(CASES.length).toBeGreaterThanOrEqual(15);
  });

  for (const testCase of CASES) {
    it(testCase.name, () => {
      const facts = parseLabelText(testCase.lines);
      const ranked = match(scanIndex, facts.candidates);
      const decision = decide(ranked);

      expect(decision.kind, JSON.stringify(ranked.slice(0, 3))).toBe(testCase.decision);
      if (decision.kind === "accept") expect(decision.match.strain_id).toBe(testCase.id);
      if (decision.kind === "choose" && testCase.id !== undefined) {
        expect(decision.candidates.map((candidate) => candidate.strain_id)).toContain(testCase.id);
      }
      for (const id of testCase.never ?? []) {
        expect(decision.kind === "accept" && decision.match.strain_id === id, id).toBe(false);
      }
      if (testCase.facts !== undefined) expect(facts).toMatchObject(testCase.facts);
      if (testCase.readings !== undefined) {
        expect(
          facts.potency_readings.map((reading) => [
            reading.analyte,
            reading.qualifier,
            reading.value,
            reading.unit,
            reading.raw,
          ]),
        ).toEqual(testCase.readings);
      }
    });
  }
});
