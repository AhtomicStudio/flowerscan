import { describe, expect, it } from "vitest";
import { buildIndex, SEARCH_DEFAULT_LIMIT, SEARCH_MIN_SCORE, search } from "../../src/match";
import { NAMING_RECORDS, namingIndex } from "./fixtures";

const ids = (query: string, limit?: number) =>
  search(namingIndex, query, limit === undefined ? {} : { limit }).map((r) => r.strain_id);

describe("search (manual search, T-014)", () => {
  it("returns nothing for an empty query or a zero limit", () => {
    expect(search(namingIndex, "")).toEqual([]);
    expect(search(namingIndex, "  #!  ")).toEqual([]);
    expect(search(namingIndex, "blue", { limit: 0 })).toEqual([]);
  });

  it("an exact name or alias scores 1 and reports what matched", () => {
    expect(search(namingIndex, "gg4")[0]).toEqual({
      strain_id: "gorilla-glue-4",
      name: "Gorilla Glue #4",
      matched_key: "GG4",
      score: 1,
    });
  });

  it("is prefix-friendly while typing", () => {
    expect(ids("b")[0]).toBe("blue-dream");
    expect(ids("blu")[0]).toBe("blue-dream");
    expect(ids("gela").slice(0, 4).sort()).toEqual([
      "gelato",
      "gelato-33",
      "gelato-41",
      "gelato-43",
    ]);
    expect(ids("gelato")[0]).toBe("gelato");
  });

  it("matches word prefixes in order", () => {
    expect(ids("dream")).toContain("blue-dream");
    expect(ids("sun sher")[0]).toBe("sunset-sherbet");
    expect(ids("sher sun")).not.toContain("sunset-sherbet");
  });

  it("is typo-tolerant", () => {
    expect(ids("jak herer")[0]).toBe("jack-herer");
    expect(ids("granddady purple")[0]).toBe("granddaddy-purple");
    expect(ids("purpie")[0]).toBe("purple-punch");
  });

  it("returns one result per strain, best first, within the limit", () => {
    const results = search(namingIndex, "g");
    expect(results.length).toBeLessThanOrEqual(SEARCH_DEFAULT_LIMIT);
    expect(new Set(results.map((r) => r.strain_id)).size).toBe(results.length);
    for (let i = 1; i < results.length; i += 1) {
      expect(results[i - 1]?.score).toBeGreaterThanOrEqual((results[i]?.score ?? 0) - 0.03);
    }
    expect(ids("g", 2)).toHaveLength(2);
    for (const result of results) expect(result.score).toBeGreaterThanOrEqual(SEARCH_MIN_SCORE);
  });

  it("orders same-name strains by id", () => {
    const index = buildIndex([
      { id: "wedding-cake-seed-junky", name: "Wedding Cake", aliases: [] },
      { id: "wedding-cake", name: "Wedding Cake", aliases: [] },
    ]);
    expect(search(index, "wedding").map((r) => r.strain_id)).toEqual([
      "wedding-cake",
      "wedding-cake-seed-junky",
    ]);
  });

  it("ignores gibberish", () => {
    expect(search(namingIndex, "qxzv plmt")).toEqual([]);
  });

  it("only returns ids from the index, deterministically", () => {
    const known = new Set(NAMING_RECORDS.map((record) => record.id));
    for (const query of ["g", "chem", "cookies", "x", "og", "1"]) {
      const first = search(namingIndex, query);
      expect(search(namingIndex, query)).toEqual(first);
      for (const result of first) expect(known.has(result.strain_id)).toBe(true);
    }
  });

  it("lets popularity break exact ties only", () => {
    const index = buildIndex([
      { id: "a", name: "Lemon Haze", aliases: [], popularity: 0 },
      { id: "b", name: "Lemon Haze Kush", aliases: [], popularity: 1 },
      { id: "c", name: "Lemon Hazy", aliases: [], popularity: 1 },
    ]);
    expect(search(index, "lemon haze").map((r) => r.strain_id)[0]).toBe("a");
  });
});
