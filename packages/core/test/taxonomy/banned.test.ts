import { describe, expect, it } from "vitest";
import {
  assertNoBannedTerms,
  BANNED_LISTS,
  BannedTermError,
  findBannedTerms,
  loadBannedTerms,
} from "../../src/index";
import { banned, bannedFile, expectIssue } from "./fixtures";

const terms = (text: string) => findBannedTerms(text, banned).map((hit) => hit.term);

describe("loadBannedTerms", () => {
  it("loads every list with its version", () => {
    expect(banned.version).toBe(1);
    expect(banned.entries.map((entry) => `${entry.list}:${entry.term}`)).toEqual([
      "conditions:alzheimer's",
      "conditions:anxiety",
      "conditions:anxiety disorder",
      "conditions:pain",
      "claims:cures",
      "claims:stress relief",
      "claims:good for",
      "pharmacology:anti-inflammatory",
      "safety:safe",
    ]);
    expect(BANNED_LISTS).toEqual(["conditions", "claims", "pharmacology", "safety"]);
  });

  it("rejects a missing list, an unknown key, and a bad version", () => {
    const { safety: _safety, ...noSafety } = bannedFile;
    expectIssue(loadBannedTerms(noSafety), "safety", "");
    expectIssue(loadBannedTerms({ ...bannedFile, extra: [] }), "extra", "unknown field");
    expectIssue(loadBannedTerms({ ...bannedFile, banned_version: 0 }), "banned_version", "");
    expectIssue(loadBannedTerms("pain"), "(root)", "");
  });

  it.each([
    ["Pain", "lowercase"],
    [" pain", "whitespace"],
    ["   ", "blank"],
  ])("rejects the entry %j", (entry, message) => {
    expectIssue(loadBannedTerms({ ...bannedFile, claims: [entry] }), "claims.0", message);
  });

  it("rejects an entry listed twice", () => {
    const result = loadBannedTerms({ ...bannedFile, safety: ["safe", "pain"] });
    expectIssue(result, "safety.1", "listed twice (also in conditions)");
  });
});

describe("findBannedTerms (banned.yaml matching rules)", () => {
  it("is case-insensitive", () => {
    expect(terms("PAIN")).toEqual(["pain"]);
  });

  it("matches whole words: letters or digits on either side block a match", () => {
    expect(terms("pain-free")).toEqual(["pain"]);
    expect(terms("(pain)")).toEqual(["pain"]);
    expect(terms("paint, Spain, pains, 2pain, pain2")).toEqual([]);
    expect(terms("Pąin pain")).toEqual(["pain"]);
  });

  it("matches a phrase across any run of whitespace", () => {
    expect(terms("STRESS   RELIEF")).toEqual(["stress relief"]);
    expect(terms("stress\nrelief")).toEqual(["stress relief"]);
    expect(terms("stress-relief")).toEqual([]);
  });

  it("does no stemming", () => {
    expect(terms("cure, cured, curing")).toEqual([]);
    expect(terms("it cures")).toEqual(["cures"]);
  });

  it("treats regex characters in entries literally", () => {
    expect(terms("anti-inflammatory")).toEqual(["anti-inflammatory"]);
    expect(terms("antiXinflammatory")).toEqual([]);
  });

  it("matches straight and typographic apostrophes", () => {
    expect(terms("Alzheimer's")).toEqual(["alzheimer's"]);
    expect(terms("Alzheimer’s")).toEqual(["alzheimer's"]);
    expect(terms("Alzheimers")).toEqual([]);
  });

  it("reports every hit in order, including overlapping phrases", () => {
    const hits = findBannedTerms("Safe? Anxiety disorder, good for pain.", banned);
    expect(hits.map((hit) => [hit.term, hit.list, hit.index, hit.text])).toEqual([
      ["safe", "safety", 0, "Safe"],
      ["anxiety", "conditions", 6, "Anxiety"],
      ["anxiety disorder", "conditions", 6, "Anxiety disorder"],
      ["good for", "claims", 24, "good for"],
      ["pain", "conditions", 33, "pain"],
    ]);
  });

  it("is repeatable (the global matchers keep no state between calls)", () => {
    expect(terms("pain")).toEqual(["pain"]);
    expect(terms("pain")).toEqual(["pain"]);
  });

  it("passes hedged effect copy", () => {
    expect(terms("Often described as a loose, unwound feeling. Treat it as an estimate.")).toEqual(
      [],
    );
  });
});

describe("assertNoBannedTerms", () => {
  it("passes clean text", () => {
    expect(() => assertNoBannedTerms("Often described as calm.", banned)).not.toThrow();
  });

  it("throws a BannedTermError listing the hits", () => {
    let caught: unknown;
    try {
      assertNoBannedTerms("Good for pain. Pain!", banned);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(BannedTermError);
    const error = caught as BannedTermError;
    expect(error.name).toBe("BannedTermError");
    expect(error.message).toBe('banned terms found: "good for", "pain"');
    expect(error.hits).toHaveLength(3);
  });

  it("uses the singular for one hit", () => {
    expect(() => assertNoBannedTerms("it cures", banned)).toThrow('banned term found: "cures"');
  });
});
