// T-011: parseLabelText rules (docs/06 §3): what is stripped, what is tagged and down-weighted
// (P6), package_says (P3/D18), product_form, brand, candidate weights and wrapped-line joins.
import { describe, expect, it } from "vitest";
import {
  CANDIDATE_MAX_TOKENS,
  CANDIDATE_WEIGHT_BLEND,
  LABEL_MAX_CANDIDATES,
  normalize,
  type OcrLine,
  parseLabelText,
  SOFT_TOKEN_PENALTY,
} from "../../src/index";
import { CA_WARNING, flat, label } from "./fixtures";

const texts = (lines: readonly OcrLine[]) =>
  parseLabelText(lines).candidates.map((candidate) => candidate.text);
const says = (...lines: string[]) => parseLabelText(label(...lines)).package_says;
const form = (...lines: string[]) => parseLabelText(label(...lines)).product_form;

describe("parseLabelText: empty and trivial input", () => {
  it("returns empty facts for no lines, never placeholders", () => {
    expect(parseLabelText([])).toEqual({
      candidates: [],
      package_says: null,
      potency_readings: [],
      brand: null,
      product_form: null,
    });
  });

  it("ignores lines with no letters or digits", () => {
    expect(parseLabelText(label("—", " ", "|||", "•••")).candidates).toEqual([]);
  });

  it("is deterministic", () => {
    const lines = label(
      ["RUNTZ", 60],
      ["WHITE RUNTZ", 40],
      "HYBRID 3.5g",
      "THC 24%",
      ...CA_WARNING,
    );
    expect(parseLabelText(lines)).toEqual(parseLabelText(lines));
  });
});

describe("parseLabelText: candidate generation", () => {
  it("emits every contiguous 1–5 token run of a field, as printed", () => {
    expect(texts(label("Granddaddy Purple Kush Deluxe Reserve Six")).length).toBe(
      6 + 5 + 4 + 3 + 2,
    );
    const runs = texts(label("A1 B2 C3 D4 E5 F6"));
    expect(runs).toContain("A1 B2 C3 D4 E5");
    expect(runs).not.toContain("A1 B2 C3 D4 E5 F6");
    expect(CANDIDATE_MAX_TOKENS).toBe(5);
  });

  it("drops one-character and number-only candidates", () => {
    const runs = texts(label("Chem D #4"));
    expect(runs).toContain("Chem D");
    expect(runs).toContain("Chem D #4");
    expect(runs).not.toContain("D");
    expect(runs).not.toContain("#4");
  });

  it("splits fields at pipes, bullets, colons, commas and spaced dashes", () => {
    const runs = texts(label("Blue Dream | Kestrel • Larch: Wren, Finch – Heron"));
    expect(runs).toContain("Blue Dream");
    for (const crossing of [
      "Dream Kestrel",
      "Kestrel Larch",
      "Larch Wren",
      "Wren Finch",
      "Finch Heron",
    ]) {
      expect(runs).not.toContain(crossing);
    }
  });

  it("keeps cross notation as one candidate so the matcher sees the marker (P4)", () => {
    const runs = texts(label("Wedding Cake × Gelato 33"));
    expect(runs).toContain("Wedding Cake × Gelato 33");
    expect(normalize("Wedding Cake × Gelato 33")).toBe("wedding cake ⟨x⟩ gelato 33");
  });

  it("drops trademark signs instead of letting NFKD turn ™ into TM", () => {
    expect(texts(label("Kestrel Haze™"))).toContain("Kestrel Haze");
  });

  it("merges duplicate candidates (same normalized text) and keeps the best weight", () => {
    const facts = parseLabelText(label(["KESTREL HAZE", 50], ["Kestrel Haze", 10]));
    const hits = facts.candidates.filter(
      (candidate) => normalize(candidate.text) === "kestrel haze",
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]?.text).toBe("KESTREL HAZE");
  });

  it(`caps the list at ${LABEL_MAX_CANDIDATES}, best weight first`, () => {
    const lines = label(
      ...Array.from({ length: 40 }, (_, row) => `Word${row}a Word${row}b Word${row}c Word${row}d`),
      ["Kestrel Haze", 60],
    );
    const { candidates } = parseLabelText(lines);
    expect(candidates).toHaveLength(LABEL_MAX_CANDIDATES);
    expect(candidates[0]?.text).toBe("Kestrel");
    const weights = candidates.map((candidate) => candidate.weight);
    expect([...weights].sort((a, b) => b - a)).toEqual(weights);
  });
});

describe("parseLabelText: weights", () => {
  it("blends confidence and height relative to the tallest content line", () => {
    const facts = parseLabelText(label(["Kestrel Haze", 40, 0.8], ["Larch Wren", 20, 0.6]));
    const weight = (text: string) => facts.candidates.find((c) => c.text === text)?.weight;
    expect(weight("Kestrel Haze")).toBeCloseTo(
      CANDIDATE_WEIGHT_BLEND.confidence * 0.8 + CANDIDATE_WEIGHT_BLEND.height * 1,
    );
    expect(weight("Larch Wren")).toBeCloseTo(
      CANDIDATE_WEIGHT_BLEND.confidence * 0.6 + CANDIDATE_WEIGHT_BLEND.height * 0.5,
    );
  });

  it("ignores warning lines when finding the tallest line, and clamps confidence", () => {
    const facts = parseLabelText(
      label(["GOVERNMENT WARNING: KEEP OUT OF REACH OF CHILDREN", 90], ["Kestrel Haze", 30, 7]),
    );
    expect(facts.candidates.find((c) => c.text === "Kestrel Haze")?.weight).toBeCloseTo(1);
    const low = parseLabelText(label(["Kestrel Haze", 30, Number.NaN]));
    expect(low.candidates.find((c) => c.text === "Kestrel Haze")?.weight).toBeCloseTo(0.5);
  });

  it("counts every line as full height when no line has a height", () => {
    const facts = parseLabelText(flat("Kestrel Haze"));
    expect(facts.candidates.every((candidate) => candidate.weight === 1)).toBe(true);
  });

  it("down-weights lexicon words inside a candidate instead of deleting them (P6)", () => {
    const facts = parseLabelText(label(["Hash Plant", 40, 1]));
    const weight = (text: string) => facts.candidates.find((c) => c.text === text)?.weight;
    expect(weight("Plant")).toBeCloseTo(1);
    expect(weight("Hash Plant")).toBeCloseTo(1 - SOFT_TOKEN_PENALTY / 2);
    expect(weight("Hash")).toBeUndefined();
  });

  it.each([
    ["Gelato Cake Flower", "Gelato Cake"],
    ["Hash Plant Live Rosin", "Hash Plant"],
    ["Sugar Kestrel Badder", "Sugar Kestrel"],
    ["Cookies and Cream Pre-Roll", "Cookies and Cream"],
  ])("keeps lexicon words inside a longer name: %s → %s", (line, name) => {
    expect(texts(label(line))).toContain(name);
  });
});

describe("parseLabelText: wrapped names (cross-line joins)", () => {
  it("joins adjacent large lines, also across three lines", () => {
    const runs = texts(label(["GORILLA", 60], ["GLUE", 60], ["#4", 60]));
    expect(runs).toContain("GORILLA GLUE");
    expect(runs).toContain("GORILLA GLUE #4");
  });

  it("joins from a line's last field into the next line's first field only", () => {
    const runs = texts(label(["Larch | BLUE", 60], ["DREAM | Wren", 60]));
    expect(runs).toContain("BLUE DREAM");
    expect(runs).not.toContain("Larch BLUE DREAM");
    expect(runs).not.toContain("BLUE DREAM Wren");
  });

  it("stops a chain at a line with several fields", () => {
    const runs = texts(label(["KESTREL", 60], ["HAZE | LARCH", 60], ["WREN", 60]));
    expect(runs).toContain("KESTREL HAZE");
    expect(runs).toContain("LARCH WREN");
    expect(runs).not.toContain("KESTREL HAZE LARCH");
  });

  it("doesn't join small lines, or large lines far apart or side by side", () => {
    expect(texts(label(["BLUE", 60], ["DREAM", 20]))).not.toContain("BLUE DREAM");
    const apart: OcrLine[] = [
      { text: "BLUE", confidence: 0.9, height: 60, bbox: { x0: 0, y0: 0, x1: 200, y1: 60 } },
      { text: "DREAM", confidence: 0.9, height: 60, bbox: { x0: 0, y0: 400, x1: 200, y1: 460 } },
    ];
    expect(texts(apart)).not.toContain("BLUE DREAM");
    const sideBySide: OcrLine[] = [
      { text: "BLUE", confidence: 0.9, height: 60, bbox: { x0: 0, y0: 0, x1: 200, y1: 60 } },
      { text: "DREAM", confidence: 0.9, height: 60, bbox: { x0: 300, y0: 70, x1: 500, y1: 130 } },
    ];
    expect(texts(sideBySide)).not.toContain("BLUE DREAM");
  });

  it("joins consecutive lines by order when there is no geometry", () => {
    expect(texts(flat("BLUE", "DREAM"))).toContain("BLUE DREAM");
  });

  it("weights a join by its weakest line", () => {
    const facts = parseLabelText(label(["BLUE", 60, 0.9], ["DREAM", 60, 0.5]));
    expect(facts.candidates.find((c) => c.text === "BLUE DREAM")?.weight).toBeCloseTo(0.75);
  });
});

describe("parseLabelText: stripped spans (never candidates)", () => {
  it.each([
    [
      "units and quantities",
      "Kestrel 3.5g 1/8 oz 28G .5g NET WT. 0.125 oz (3.5 g) 5 x 0.5g 1x1g 5pk 10 ct 100mg",
    ],
    [
      "identifiers",
      "Kestrel Lot #: 0423 Batch GG4-0423 PKG: 02/23/19 UID 1A4050300013FED000097325",
    ],
    [
      "licenses",
      "Kestrel C11-0000512-LIC CCL22-0001771 DCC-12345678 AU-R-000524 PC-000123 License # 4033",
    ],
    ["dates and numbers", "Kestrel 2026-10-29 04/2026 10/02/26 603-123-456 0123456789"],
    [
      "contact details",
      "Kestrel www.example.com https://example.org/x hi@example.com @kestrelco example.co",
    ],
    [
      "named parties",
      "Kestrel | Tested by Larch Labs | Packaged by Wren Farms LLC | Lab: Heron Analytics",
    ],
    ["bare UID", "Kestrel ABCD1234EFGH5678IJKL9012"],
  ])("strips %s", (_, line) => {
    expect(texts(label(line))).toEqual(["Kestrel"]);
  });

  it("strips the label alone only when it ends with : or #", () => {
    expect(texts(label("Harvest Moon"))).toContain("Harvest Moon");
    expect(texts(label("Harvest: Moon"))).toEqual(["Moon"]);
  });

  it("drops whole warning lines, including wrapped fragments between them", () => {
    expect(texts(label(["KESTREL HAZE", 40], ...CA_WARNING))).toEqual([
      "KESTREL",
      "KESTREL HAZE",
      "HAZE",
    ]);
  });

  it("catches warning vocabulary even when OCR broke the phrase", () => {
    expect(texts(label("Kestrel", "the intoxicating effects of cannabis")).join(" ")).not.toMatch(
      /intoxicating|cannabis/,
    );
    expect(texts(label("Kestrel", "chi1dren and pregnant"))).toEqual(["Kestrel"]);
  });

  it("keeps a one-warning-word strain line that isn't next to warnings", () => {
    expect(texts(label(["DURBAN POISON", 40], "INDICA"))).toContain("DURBAN POISON");
  });

  it("drops a fragment next to a warning line when it holds a warning word itself", () => {
    expect(
      texts(
        label(["Kestrel", 30], ["GOVERNMENT WARNING: THIS PRODUCT", 8], ["CONTAINS CANNABIS", 8]),
      ),
    ).toEqual(["Kestrel"]);
  });
});

describe("parseLabelText: package_says (P3, D18)", () => {
  it.each([
    ["INDICA", "indica"],
    ["Sativa", "sativa"],
    ["HYBRID", "hybrid"],
    ["Balanced", "hybrid"],
    ["50/50", "hybrid"],
    ["Indica-Dominant", "indica"],
    ["indica dominant", "indica"],
    ["Indica Dom.", "indica"],
    ["Sativa-Leaning", "sativa"],
    ["Indica Hybrid", "indica"],
    ["Sativa Hybrid", "sativa"],
    ["Hybrid-Indica", "indica"],
    ["hybrid/sativa", "sativa"],
    ["Hybrid (i)", "indica"],
    ["HYBRID [S]", "sativa"],
    ["(I)", "indica"],
    ["(l)", "indica"], // OCR l for I inside brackets
    ["[H]", "hybrid"],
    ["| S |", "sativa"],
    ["lNDICA", "indica"], // OCR confusion folding
    ["SATlVA", "sativa"],
    ["HYBR1D", "hybrid"],
  ])("%s → %s", (text, expected) => {
    expect(says(text)).toBe(expected);
  });

  it.each([
    ["Kestrel Haze"],
    ["I S H"], // bare letters never count
    ["Pre-Roll(s)"], // a plural marker is not a category letter
    ["CBD 1:1"], // not a type
    ["INDICA  SATIVA"], // both sides: unknown, not a guess
    ["Indica-Dominant", "Sativa"],
  ])("%s → null", (...lines) => {
    expect(says(...lines)).toBeNull();
  });

  it("lets a lean win over bare hybrid wording on another line", () => {
    expect(says("HYBRID", "Indica-Dominant")).toBe("indica");
  });

  it("never reads category words from warning text", () => {
    expect(says("Kestrel", "GOVERNMENT WARNING: INDICA CANNABIS")).toBeNull();
  });

  it("doesn't turn category words into candidates", () => {
    expect(texts(label("Kestrel Haze", "INDICA HYBRID", "(I)"))).not.toContain("INDICA");
  });
});

describe("parseLabelText: product_form", () => {
  it.each([
    [["Flower 3.5g"], "flower"],
    [["SMALLS"], "flower"],
    [["Eighth"], "flower"],
    [["PRE-ROLL 1g"], "pre-roll"],
    [["Preroll"], "pre-roll"],
    [["2 x 0.5g Joints"], "pre-roll"],
    [["Live Resin Infused Pre-Roll"], "pre-roll"],
    [["Live Resin Cart"], "vape"],
    [["510 Cartridge"], "vape"],
    [["All-in-one disposable"], "vape"],
    [["LIVE ROSIN"], "concentrate"],
    [["Badder"], "concentrate"],
    [["Bubble Hash"], "concentrate"],
    [["Gummies 10pk"], "edible"],
    [["Tincture 30 ml"], "other"],
    [["Flower", "Rosin"], "concentrate"],
  ])("%j → %s", (lines, expected) => {
    expect(form(...lines)).toBe(expected);
  });

  it.each([["Hash Plant"], ["Sugar Black Rose"], ["Chocolate Thai"], ["Diamonds"], ["Kestrel"]])(
    "doesn't infer a form from the collision word in %s",
    (line) => {
      expect(form(line)).toBeNull();
    },
  );
});

describe("parseLabelText: brand", () => {
  it("captures a known brand in its display spelling, OCR-folded", () => {
    expect(parseLabelText(label("C00KIES", "Kestrel Haze")).brand).toBe("Cookies");
    expect(parseLabelText(label("sherbinski's", "Kestrel Haze")).brand).toBe("Sherbinskis");
    expect(parseLabelText(label("SEED JUNKY GENETICS", "Kestrel Haze")).brand).toBe("Seed Junky");
  });

  it("doesn't read a strain-token brand inside a strain name as the brand", () => {
    expect(parseLabelText(label("Girl Scout Cookies")).brand).toBeNull();
    expect(parseLabelText(label("White Runtz")).brand).toBeNull();
  });

  it("reads a plain brand anywhere in a line", () => {
    expect(parseLabelText(label("Sherbinskis Kestrel Haze")).brand).toBe("Sherbinskis");
    expect(texts(label("Sherbinskis Kestrel Haze"))).not.toContain("Sherbinskis");
  });

  it("takes the tallest strain-token sighting as the brand and reads the other as a name", () => {
    const facts = parseLabelText(label(["Runtz", 30], ["COOKIES", 70]));
    expect(facts.brand).toBe("Cookies");
    expect(facts.candidates.map((candidate) => candidate.text)).toContain("Runtz");
    expect(facts.candidates.map((candidate) => candidate.text)).not.toContain("COOKIES");
  });

  it("never offers the chosen brand alone as a candidate", () => {
    expect(texts(label(["RUNTZ", 70], ["Kestrel Haze", 40]))).not.toContain("RUNTZ");
  });
});
