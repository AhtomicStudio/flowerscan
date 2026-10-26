import { describe, expect, it } from "vitest";
import { SLUG_PATTERN, sanitizeFilename, slugify } from "../../src/index";

describe("slugify (docs/04 ID rules)", () => {
  it.each([
    ["Gorilla Glue #4", "gorilla-glue-4"],
    ["Moonlit Fern #33", "moonlit-fern-33"],
    ["Copper & Kite", "copper-and-kite"],
    ["Copper&Kite", "copper-and-kite"],
    ["Crème Brûlée Haze", "creme-brulee-haze"],
    ["Señorita Ñandú", "senorita-nandu"],
    ["Straße Fern", "strasse-fern"],
    ["Ørsted Kush", "orsted-kush"],
    ["Copper/Kite", "copper-kite"],
    ["Copper\\Kite", "copper-kite"],
    ["Velvet    Comet", "velvet-comet"],
    ["  Velvet Comet  ", "velvet-comet"],
    ["Velvet\tComet\n", "velvet-comet"],
    ["Copper Kite x Harbor Lantern", "copper-kite-x-harbor-lantern"],
    ["Copper Kite × Harbor Lantern", "copper-kite-x-harbor-lantern"],
    ["Jack's Lantern", "jacks-lantern"],
    ["Jack’s Lantern", "jacks-lantern"],
    ["Harbor Lantern 2.0", "harbor-lantern-2-0"],
    ["(Copper) [Kite]!", "copper-kite"],
    ["ＧＧ４", "gg4"],
    ["Velvet--Comet", "velvet-comet"],
  ])("%s → %s", (name, expected) => {
    expect(slugify(name)).toBe(expected);
  });

  it("always produces a valid id", () => {
    for (const name of ["#1", "A & B", "Ü-Bahn Ⅳ", "x × x"]) {
      expect(slugify(name)).toMatch(SLUG_PATTERN);
    }
  });

  it("is deterministic and idempotent", () => {
    const once = slugify("Crème & Copper #7");
    expect(slugify("Crème & Copper #7")).toBe(once);
    expect(slugify(once)).toBe(once);
  });

  it("throws when nothing is left to build an id from", () => {
    expect(() => slugify("")).toThrow(RangeError);
    expect(() => slugify("###")).toThrow(RangeError);
    expect(() => slugify("月光")).toThrow(/Can't derive an id/);
  });
});

describe("sanitizeFilename (docs/04 filename rules)", () => {
  it.each([
    ["Gorilla Glue #4", "Gorilla Glue 4"],
    ["Copper & Kite", "Copper & Kite"],
    ["Crème Brûlée Haze", "Crème Brûlée Haze"],
    ["Copper/Kite", "Copper Kite"],
    ["Copper\\Kite", "Copper Kite"],
    ["Velvet    Comet", "Velvet Comet"],
    ["  Velvet Comet  ", "Velvet Comet"],
    ['Sour: "Velvet" <Comet>?', "Sour Velvet Comet"],
    ["Copper*Kite|Lantern^2", "Copper Kite Lantern 2"],
    ["[[Copper Kite]]", "Copper Kite"],
    ["Copper Kite x Harbor Lantern", "Copper Kite x Harbor Lantern"],
    [".Hidden Fern.", "Hidden Fern"],
    ["Fern\u0000Line", "Fern Line"],
  ])("%s → %s", (name, expected) => {
    expect(sanitizeFilename(name)).toBe(expected);
  });

  it("normalizes to NFC so decomposed input gives the same filename", () => {
    expect(sanitizeFilename("Crème")).toBe("Crème");
    expect(sanitizeFilename("Crème")).toBe(sanitizeFilename("Crème"));
  });

  it("is idempotent", () => {
    const once = sanitizeFilename('Copper: "Kite" #4');
    expect(sanitizeFilename(once)).toBe(once);
  });

  it("throws when nothing usable is left", () => {
    expect(() => sanitizeFilename("")).toThrow(RangeError);
    expect(() => sanitizeFilename("#/?")).toThrow(/Can't derive a filename/);
    expect(() => sanitizeFilename("...")).toThrow(RangeError);
  });
});
