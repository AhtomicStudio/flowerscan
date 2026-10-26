import { describe, expect, it } from "vitest";
import {
  BreederSchema,
  isSupported,
  LineageSchema,
  SourceSchema,
  TaxonomyTermSchema,
} from "../../src/index";
import {
  breeder,
  expectIssue,
  expectValid,
  source,
  term,
  tracedLineage,
  unknownLineage,
  withFields,
} from "./fixtures";

describe("Source", () => {
  const web = source(["parents"]);

  it("accepts a web source and a print source", () => {
    expectValid(SourceSchema, web);
    expectValid(
      SourceSchema,
      withFields(web, { url: undefined, ref: "Fictional Grower's Handbook, 2nd ed., p. 112" }),
    );
    expectValid(SourceSchema, withFields(web, { supports: [] }));
  });

  it("needs a url or a ref", () => {
    expectIssue(SourceSchema, withFields(web, { url: undefined }), ["url"], "ref");
    expectIssue(SourceSchema, withFields(web, { url: null, ref: null }), ["url"]);
  });

  it("rejects non-http URLs and blank refs", () => {
    expectIssue(SourceSchema, withFields(web, { url: "ftp://example.org/x" }), ["url"]);
    expectIssue(SourceSchema, withFields(web, { url: "not a url" }), ["url"]);
    expectIssue(SourceSchema, withFields(web, { url: undefined, ref: " " }), ["ref"]);
  });

  it("validates title, retrieved, and supports", () => {
    expectIssue(SourceSchema, withFields(web, { title: "" }), ["title"]);
    expectIssue(SourceSchema, withFields(web, { retrieved: "yesterday" }), ["retrieved"]);
    expectIssue(SourceSchema, withFields(web, { supports: ["lineage"] }), ["supports", 0]);
    expectIssue(SourceSchema, withFields(web, { notes: "x" }), []);
  });

  it("isSupported checks which fields sources back", () => {
    const sources = [source(["parents"]), source(["effects", "flavors"])];
    expect(isSupported(sources, "parents")).toBe(true);
    expect(isSupported(sources, "flavors")).toBe(true);
    expect(isSupported(sources, "terpenes")).toBe(false);
    expect(isSupported([], "parents")).toBe(false);
    expect(isSupported(null, "parents")).toBe(false);
    expect(isSupported(undefined, "parents")).toBe(false);
  });
});

describe("Breeder", () => {
  it("accepts a breeder with and without a website", () => {
    expectValid(BreederSchema, breeder);
    expectValid(
      BreederSchema,
      withFields(breeder, { website: "https://example.org", aliases: ["LW Seeds"] }),
    );
    expectValid(BreederSchema, withFields(breeder, { aliases: undefined, sources: undefined }));
  });

  it("rejects bad fields", () => {
    expectIssue(BreederSchema, withFields(breeder, { kind: "strain" }), ["kind"]);
    expectIssue(BreederSchema, withFields(breeder, { id: "Lanternworks Seeds" }), ["id"]);
    expectIssue(BreederSchema, withFields(breeder, { website: "lanternworks" }), ["website"]);
    expectIssue(BreederSchema, withFields(breeder, { name: "" }), ["name"]);
    expectIssue(BreederSchema, withFields(breeder, { updated: "2026-10-01" }), ["updated"]);
    expectIssue(BreederSchema, withFields(breeder, { country: "NL" }), []);
  });
});

describe("TaxonomyTerm", () => {
  it("accepts active terms in every facet", () => {
    expectValid(TaxonomyTermSchema, term);
    expectValid(
      TaxonomyTermSchema,
      withFields(term, { slug: "dry-mouth", polarity: "negative", synonyms: undefined }),
    );
    expectValid(
      TaxonomyTermSchema,
      withFields(term, { slug: "pine", facet: "flavor", label: "Pine", polarity: "neutral" }),
    );
    expectValid(TaxonomyTermSchema, withFields(term, { slug: "myrcene", facet: "terpene" }));
  });

  it("accepts a deprecated term that points to its replacement", () => {
    expectValid(
      TaxonomyTermSchema,
      withFields(term, { slug: "chilled", status: "deprecated", replaced_by: "relaxed" }),
    );
  });

  it("rejects replaced_by rules", () => {
    expectIssue(TaxonomyTermSchema, withFields(term, { status: "deprecated" }), ["replaced_by"]);
    expectIssue(TaxonomyTermSchema, withFields(term, { replaced_by: "calm" }), ["replaced_by"]);
    expectIssue(
      TaxonomyTermSchema,
      withFields(term, { status: "deprecated", replaced_by: "relaxed" }),
      ["replaced_by"],
      "itself",
    );
  });

  it("rejects bad fields", () => {
    expectIssue(TaxonomyTermSchema, withFields(term, { facet: "condition" }), ["facet"]);
    expectIssue(TaxonomyTermSchema, withFields(term, { polarity: "good" }), ["polarity"]);
    expectIssue(TaxonomyTermSchema, withFields(term, { polarity: undefined }), ["polarity"]);
    expectIssue(TaxonomyTermSchema, withFields(term, { slug: "Dry Mouth" }), ["slug"]);
    expectIssue(TaxonomyTermSchema, withFields(term, { description: "" }), ["description"]);
    expectIssue(TaxonomyTermSchema, withFields(term, { status: "deleted" }), ["status"]);
  });
});

describe("Lineage", () => {
  const L = LineageSchema;

  it("accepts traced, reported, pure, and unknown results", () => {
    expectValid(L, tracedLineage);
    expectValid(L, unknownLineage);
    expectValid(
      L,
      withFields(tracedLineage, {
        sativa_pct: 85,
        indica_pct: 15,
        label: "sativa",
        sublabel: null,
        confidence: 0.5,
        confidence_level: "medium",
        method: "reported",
      }),
    );
    expectValid(
      L,
      withFields(tracedLineage, {
        sativa_pct: 0,
        indica_pct: 100,
        label: "indica",
        sublabel: null,
        confidence: 1,
      }),
    );
  });

  it("checks ranges and integers", () => {
    expectIssue(L, withFields(tracedLineage, { sativa_pct: 35.5, indica_pct: 64.5 }), [
      "sativa_pct",
    ]);
    expectIssue(L, withFields(tracedLineage, { sativa_pct: 101, indica_pct: -1 }), ["sativa_pct"]);
    expectIssue(L, withFields(tracedLineage, { confidence: 1.2 }), ["confidence"]);
    expectIssue(L, withFields(tracedLineage, { algo_version: 0 }), ["algo_version"]);
    expectIssue(L, withFields(tracedLineage, { method: "guessed" }), ["method"]);
  });

  it("indica_pct is 100 - sativa_pct", () => {
    expectIssue(L, withFields(tracedLineage, { indica_pct: 60 }), ["indica_pct"]);
    expectIssue(L, withFields(tracedLineage, { indica_pct: null }), ["indica_pct"]);
    expectIssue(L, withFields(unknownLineage, { indica_pct: 50 }), ["indica_pct"]);
  });

  it("an unknown value means label unknown, method unknown, and confidence 0", () => {
    expectIssue(L, withFields(unknownLineage, { label: "hybrid", sublabel: "balanced" }), [
      "label",
    ]);
    expectIssue(L, withFields(unknownLineage, { method: "partial" }), ["method"]);
    expectIssue(L, withFields(unknownLineage, { confidence: 0.5, confidence_level: "medium" }), [
      "confidence",
    ]);
    expectIssue(L, withFields(tracedLineage, { label: "unknown", sublabel: null }), ["label"]);
    expectIssue(L, withFields(tracedLineage, { method: "unknown" }), ["method"]);
  });

  it("sublabel is set exactly for hybrids", () => {
    expectIssue(L, withFields(tracedLineage, { sublabel: null }), ["sublabel"]);
    expectIssue(
      L,
      withFields(tracedLineage, {
        sativa_pct: 85,
        indica_pct: 15,
        label: "sativa",
        sublabel: "sativa-dominant",
      }),
      ["sublabel"],
    );
    expectIssue(L, withFields(tracedLineage, { sublabel: "mostly-indica" }), ["sublabel"]);
  });

  it("confidence_level is none exactly when confidence is 0", () => {
    expectIssue(L, withFields(tracedLineage, { confidence_level: "none" }), ["confidence_level"]);
    expectIssue(L, withFields(unknownLineage, { confidence_level: "low" }), ["confidence_level"]);
  });
});
