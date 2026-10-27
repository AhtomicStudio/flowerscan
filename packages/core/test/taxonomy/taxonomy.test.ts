import { describe, expect, it } from "vitest";
import { getTerm, loadTaxonomy, resolveTerm, type Taxonomy } from "../../src/index";
import { banned, expectIssue, taxonomyFile, term, unwrap } from "./fixtures";

const taxonomy: Taxonomy = unwrap(loadTaxonomy(taxonomyFile(), banned));

const withTerms = (...terms: Record<string, unknown>[]) => ({ taxonomy_version: 1, terms });

describe("loadTaxonomy", () => {
  it("loads the version and every term in file order", () => {
    expect(taxonomy.version).toBe(1);
    expect(taxonomy.terms.map((t) => t.slug)).toEqual([
      "relaxed",
      "couch-lock",
      "lemon",
      "citrus-zest",
      "zesty",
    ]);
  });

  it("rejects a file that isn't { taxonomy_version, terms }", () => {
    expectIssue(loadTaxonomy(null, banned), "(root)", "");
    expectIssue(loadTaxonomy({ terms: [] }, banned), "taxonomy_version", "");
    expectIssue(loadTaxonomy({ ...withTerms(), notes: "x" }, banned), "notes", "unknown field");
  });

  it("validates every term against TaxonomyTermSchema", () => {
    expectIssue(
      loadTaxonomy(withTerms(term({ polarity: "good" })), banned),
      "terms.0.polarity",
      "",
    );
    expectIssue(
      loadTaxonomy(withTerms(term({ status: "deprecated" })), banned),
      "terms.0.replaced_by",
      "must point to its replacement",
    );
  });

  it("rejects a duplicate slug", () => {
    const result = loadTaxonomy(withTerms(term(), term({ label: "Loose", synonyms: [] })), banned);
    expectIssue(result, "terms.1.slug", 'duplicate slug "relaxed"');
  });

  it("rejects a label or synonym that already names another term", () => {
    const result = loadTaxonomy(
      withTerms(
        term(),
        term({ slug: "calm", label: "Calm", synonyms: ["CHILL"] }),
        term({ slug: "settled", label: "Relaxed", synonyms: [] }),
        term({ slug: "quiet", label: "Quiet", synonyms: ["calm"] }),
      ),
      banned,
    );
    expectIssue(result, "terms.1.synonyms.0", '"CHILL" already names the term "relaxed"');
    expectIssue(result, "terms.2.label", '"Relaxed" already names the term "relaxed"');
    expectIssue(result, "terms.3.synonyms.0", '"calm" already names the term "calm"');
  });

  it("rejects a synonym equal to a later term's slug (slugs are claimed first)", () => {
    const result = loadTaxonomy(
      withTerms(term({ synonyms: ["calm"] }), term({ slug: "calm", label: "Calm", synonyms: [] })),
      banned,
    );
    expectIssue(result, "terms.0.synonyms.0", 'already names the term "calm"');
  });

  it("rejects replaced_by chains that break", () => {
    const deprecated = (slug: string, replacedBy: string, facet = "effect") =>
      term({
        slug,
        label: slug,
        synonyms: [],
        facet,
        status: "deprecated",
        replaced_by: replacedBy,
      });
    const result = loadTaxonomy(
      withTerms(
        term(),
        deprecated("old-a", "missing"),
        deprecated("old-b", "relaxed", "flavor"),
        deprecated("loop-a", "loop-b"),
        deprecated("loop-b", "loop-a"),
      ),
      banned,
    );
    expectIssue(result, "terms.1.replaced_by", '"missing" is not a slug');
    expectIssue(result, "terms.2.replaced_by", "is a effect term, not flavor");
    expectIssue(result, "terms.3.replaced_by", "loops: loop-a → loop-b → loop-a");
  });

  it("fails a banned term in a description, label, synonym or slug (C2)", () => {
    const result = loadTaxonomy(
      withTerms(
        term({ description: "Some people say it's good for pain." }),
        term({ slug: "eased", label: "Stress relief", synonyms: ["anxiety"] }),
        term({ slug: "pain-free", label: "Free", synonyms: [] }),
        term({ slug: "stress-relief", label: "Unwind", synonyms: [] }),
      ),
      banned,
    );
    expectIssue(result, "terms.0.description", 'banned term "good for"');
    expectIssue(result, "terms.0.description", 'banned term "pain"');
    expectIssue(result, "terms.1.label", 'banned term "stress relief"');
    expectIssue(result, "terms.1.synonyms.0", 'banned term "anxiety"');
    expectIssue(result, "terms.2.slug", 'banned term "pain"');
    // A slug's hyphens also read as spaces, so a banned phrase can't hide in a slug.
    expectIssue(result, "terms.3.slug", 'banned term "stress relief"');
  });

  it("passes hedged, compliant terms", () => {
    expect(loadTaxonomy(taxonomyFile(), banned).ok).toBe(true);
  });
});

describe("getTerm", () => {
  it("finds a term by its exact slug, deprecated or not", () => {
    expect(getTerm(taxonomy, "relaxed")?.label).toBe("Relaxed");
    expect(getTerm(taxonomy, "citrus-zest")?.status).toBe("deprecated");
    expect(getTerm(taxonomy, "Relaxed")).toBeUndefined();
    expect(getTerm(taxonomy, "chill")).toBeUndefined();
  });
});

describe("resolveTerm", () => {
  it("resolves a slug, a label and a synonym", () => {
    expect(resolveTerm(taxonomy, "relaxed")).toMatchObject({
      term: { slug: "relaxed" },
      via: "slug",
    });
    expect(resolveTerm(taxonomy, "Relaxed")?.via).toBe("slug");
    expect(resolveTerm(taxonomy, "Couch-lock")).toMatchObject({
      term: { slug: "couch-lock" },
      via: "slug",
    });
    expect(resolveTerm(taxonomy, "lemony")).toMatchObject({
      term: { slug: "lemon" },
      via: "synonym",
    });
    expect(resolveTerm(taxonomy, "Zesty")?.via).toBe("slug");
  });

  it("ignores case, extra whitespace and hyphens", () => {
    expect(resolveTerm(taxonomy, "  COUCH   locked ")?.term.slug).toBe("couch-lock");
    expect(resolveTerm(taxonomy, "couch lock")?.term.slug).toBe("couch-lock");
    expect(resolveTerm(taxonomy, "CHILL")?.term.slug).toBe("relaxed");
  });

  it("resolves a deprecated term to its replaced_by, following the chain", () => {
    const once = resolveTerm(taxonomy, "citrus-zest");
    expect(once?.term.slug).toBe("lemon");
    expect(once?.matched.slug).toBe("citrus-zest");
    const twice = resolveTerm(taxonomy, "zingy");
    expect(twice).toMatchObject({
      term: { slug: "lemon" },
      matched: { slug: "zesty" },
      via: "synonym",
    });
  });

  it("filters by facet", () => {
    expect(resolveTerm(taxonomy, "lemon", "flavor")?.term.slug).toBe("lemon");
    expect(resolveTerm(taxonomy, "lemon", "effect")).toBeUndefined();
  });

  it("returns undefined for an unknown input", () => {
    expect(resolveTerm(taxonomy, "garlic")).toBeUndefined();
  });
});
