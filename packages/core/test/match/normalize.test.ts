import { describe, expect, it } from "vitest";
import {
  CROSS_MARKER,
  foldConfusions,
  GENERIC_TOKENS,
  KEEP_SHORT_TOKENS,
  normalize,
} from "../../src/match";
import { NAMING_RECORDS, seededRandom } from "./fixtures";

const X = CROSS_MARKER;

describe("normalize (docs/06 §4)", () => {
  it.each([
    // Case, diacritics, transliteration, compatibility forms.
    ["Blue Dream", "blue dream"],
    ["Crème Brûlée Haze", "creme brulee haze"],
    ["Straße Kush", "strasse kush"],
    ["Ørsted Kush", "orsted kush"],
    ["ＧＧ４", "gg 4"],
    // `#`, `&`, punctuation, whitespace.
    ["Gorilla Glue #4", "gorilla glue 4"],
    ["gelato#33", "gelato 33"],
    ["Copper & Kite", "copper and kite"],
    ["  Blue\tDream!!\n", "blue dream"],
    ["GSC (Forum Cut)", "gsc forum cut"],
    ["AK-47", "ak 47"],
    ["###", ""],
    ["", ""],
    // Apostrophes are dropped, not spaced.
    ["Chem's Sister", "chems sister"],
    ["Chem’s Sister", "chems sister"],
    // Dotted abbreviations join.
    ["M.A.C. 1", "mac 1"],
    ["M.A.C", "mac"],
    ["S.F.V. O.G.", "sfv og"],
    // Letter–digit split, leading zeros (P5).
    ["GG4", "gg 4"],
    ["gelato33", "gelato 33"],
    ["AK47KUSH", "ak 47 kush"],
    ["Chem #04", "chem 4"],
    ["Chem 91", "chem 91"],
    ["#0", "0"],
    ["lot420", "lot 420"],
    // OCR-confusable digits inside a word stay glued; elsewhere they split.
    ["G0RILLA", "g0rilla"],
    ["B1UE DREAM", "b1ue dream"],
    ["C00K1ES", "c00k1es"],
    ["5UNSET 8LUE", "5unset 8lue"],
    ["GLU3", "glu 3"],
    ["GG5", "gg 5"],
    ["MAC1", "mac 1"],
    ["x1g", "x 1 g"],
    ["10oz", "10 oz"],
    ["8th", "8 th"],
    ["1000mg", "1000 mg"],
    // Cross notation (P4) vs quantity x.
    ["Wedding Cake x Gelato 33", `wedding cake ${X} gelato 33`],
    ["Gelato × Zkittlez", `gelato ${X} zkittlez`],
    ["Gelato×Zkittlez", `gelato ${X} zkittlez`],
    ["Gelato #33 X Zkittlez", `gelato 33 ${X} zkittlez`],
    ["A x B x C", `a ${X} b ${X} c`],
    ["5 x 0.5g", "5 x 0 5 g"],
    ["5×0.5g", "5 x 0 5 g"],
    ["1x1g", "1 x 1 g"],
    ["2 x Jack Herer", "2 x jack herer"],
    ["x Gelato", "x gelato"],
    ["Gelato x", "gelato x"],
    ["Gelato x x Zkittlez", `gelato x ${X} zkittlez`],
  ])("%j → %j", (input, expected) => {
    expect(normalize(input)).toBe(expected);
  });

  it("is idempotent on the table, the fixture names and random text", () => {
    const random = seededRandom(7);
    const alphabet = "abcxyz XO0158#&×.'-éß ";
    const samples = [
      ...NAMING_RECORDS.flatMap((record) => [record.name, ...record.aliases]),
      "Wedding Cake x Gelato 33",
      "5 x 0.5g",
      "G0RILLA GLU3 #4",
    ];
    for (let i = 0; i < 500; i += 1) {
      let text = "";
      const length = 1 + Math.floor(random() * 20);
      for (let j = 0; j < length; j += 1) text += alphabet[Math.floor(random() * alphabet.length)];
      samples.push(text);
    }
    for (const sample of samples) {
      const once = normalize(sample);
      expect(normalize(once), JSON.stringify(sample)).toBe(once);
      expect(once).toMatch(/^(?:[a-z0-9]+|⟨x⟩)?(?: (?:[a-z0-9]+|⟨x⟩))*$/);
    }
  });

  it("never drops a meaningful short token", () => {
    for (const token of KEEP_SHORT_TOKENS) {
      const kept = normalize(token);
      expect(kept).not.toBe("");
      expect(normalize(`Blue Dream ${token}`)).toBe(`blue dream ${kept}`);
    }
  });

  it("lists the generic tokens from docs/06 §4 and the domain review (cake)", () => {
    expect([...GENERIC_TOKENS].sort()).toEqual(
      ["cake", "cookies", "glue", "haze", "kush", "og", "z"].sort(),
    );
  });
});

describe("foldConfusions (docs/06 §4)", () => {
  it.each([
    ["G0RILLA GLUE", "gorllla glue"],
    ["PURPIE PUNCH", "purple punch"],
    ["Burnt", "bumt"],
    ["Vvhite Widow", "whlte wldow"],
    ["5UNSET 5HERBET", "sunset sherbet"],
    ["8LUE DREAM", "blue dream"],
    ["GG #5", "gg s"],
  ])("%j → %j", (input, expected) => {
    expect(foldConfusions(input)).toBe(expected);
  });

  it("folds the misread and the true spelling to the same key", () => {
    expect(foldConfusions("G0RILLA GLUE #4")).toBe(foldConfusions("Gorilla Glue #4"));
    expect(foldConfusions("PURPIE PUNCH")).toBe(foldConfusions("Purple Punch"));
    expect(foldConfusions("Bubba Kurnt")).toBe(foldConfusions("Bubba Kumt"));
  });

  it("gives the same key for raw and already-normalized text", () => {
    expect(foldConfusions(normalize("Gelato #41"))).toBe(foldConfusions("Gelato #41"));
  });

  it("leaves the cross marker alone", () => {
    expect(foldConfusions("Gelato x Zkittlez")).toBe(`gelato ${X} zklttlez`);
  });
});
