import { describe, expect, it } from "vitest";
import { buildIndex } from "../../src/match";

describe("buildIndex", () => {
  it("indexes each distinct normalized spelling once per entry", () => {
    const index = buildIndex([
      {
        id: "gelato-33",
        name: "Gelato #33",
        aliases: ["Gelato 33", "GELATO33", "Larry Bird", "###"],
      },
    ]);
    expect(index.keys.map((key) => key.normal)).toEqual(["gelato 33", "larry bird"]);
    expect(index.entries[0]).toMatchObject({ id: "gelato-33", keyStart: 0, keyEnd: 2 });
  });

  it("keeps normalized and folded exact keys", () => {
    const index = buildIndex([{ id: "purple-punch", name: "Purple Punch", aliases: [] }]);
    expect(index.exact.get("purple punch")).toEqual([0]);
    expect(index.foldedExact.get("purple punch")).toEqual([0]);
    const withI = buildIndex([{ id: "skittlez", name: "Skittlez", aliases: [] }]);
    expect(withI.foldedExact.get("sklttlez")).toEqual([0]);
  });

  it("rejects duplicate ids", () => {
    expect(() =>
      buildIndex([
        { id: "a", name: "A", aliases: [] },
        { id: "a", name: "B", aliases: [] },
      ]),
    ).toThrow(RangeError);
  });

  it("clamps popularity to 0–1 and defaults it to 0", () => {
    const index = buildIndex([
      { id: "a", name: "A", aliases: [] },
      { id: "b", name: "B", aliases: [], popularity: 7 },
      { id: "c", name: "C", aliases: [], popularity: -1 },
      { id: "d", name: "D", aliases: [], popularity: Number.NaN },
      { id: "e", name: "E", aliases: [], popularity: 0.4 },
    ]);
    expect(index.entries.map((entry) => entry.popularity)).toEqual([0, 1, 0, 0, 0.4]);
  });
});
