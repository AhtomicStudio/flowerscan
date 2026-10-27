import { describe, expect, it } from "vitest";
import {
  parseNote,
  parseWikilink,
  type Result,
  splitFrontmatter,
  type ValidationIssue,
  type YamlParser,
} from "../../src/index";

// YAML is a superset of JSON, so JSON.parse stands in for the injected YAML parser. Names are fictional.
const json: YamlParser = (text) => JSON.parse(text);

const strain = {
  kind: "strain",
  id: "moonlit-fern-4",
  schema_version: 1,
  name: "Moonlit Fern #4",
  aliases: ["MF4"],
  parents: ["[[Northvale Highland]]", "unknown"],
  reported_type: "indica-dominant",
  verification: "unverified",
  created: "2026-10-20",
  updated: "2026-10-21",
};

const breeder = {
  kind: "breeder",
  id: "fictional-seed-co",
  schema_version: 1,
  name: "Fictional Seed Co",
  created: "2026-10-20",
  updated: "2026-10-20",
};

const note = (frontmatter: unknown, body = "# Title\n\nNotes.") =>
  `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n${body}`;

function issuesOf<T>(result: Result<T>): readonly ValidationIssue[] {
  expect(result.ok, "expected a failure").toBe(false);
  return result.ok ? [] : result.issues;
}

describe("splitFrontmatter", () => {
  it("splits frontmatter and body and reports where the body starts", () => {
    const result = splitFrontmatter("---\nkind: strain\nid: a\n---\n# A\nbody");
    expect(result).toEqual({
      ok: true,
      value: { frontmatter: "kind: strain\nid: a", body: "# A\nbody", bodyLine: 5 },
    });
  });

  it("accepts CRLF line endings, a BOM, trailing spaces on fences and a ... closer", () => {
    const result = splitFrontmatter("﻿--- \r\nkind: strain\r\n...\r\nbody\r\n");
    expect(result).toEqual({
      ok: true,
      value: { frontmatter: "kind: strain", body: "body\n", bodyLine: 4 },
    });
  });

  it("allows an empty body", () => {
    expect(splitFrontmatter("---\na: 1\n---")).toEqual({
      ok: true,
      value: { frontmatter: "a: 1", body: "", bodyLine: 4 },
    });
  });

  it("rejects a note without frontmatter", () => {
    expect(issuesOf(splitFrontmatter("# Just a heading\n"))).toEqual([
      { field: "frontmatter", message: expect.stringContaining("missing frontmatter") },
    ]);
    expect(issuesOf(splitFrontmatter(""))[0]?.message).toContain("missing frontmatter");
  });

  it("rejects unclosed frontmatter", () => {
    expect(issuesOf(splitFrontmatter("---\nkind: strain\n"))[0]?.message).toContain("unclosed");
  });
});

describe("parseNote", () => {
  it("returns the typed frontmatter and the body of a genetic node", () => {
    const result = parseNote(note(strain, "# Moonlit Fern #4\n\nCurator notes."), json);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.frontmatter).toEqual(strain);
    expect(result.value.body).toBe("# Moonlit Fern #4\n\nCurator notes.");
    expect(result.value.bodyLine).toBe(note(strain).split("\n").indexOf("# Title") + 1);
  });

  it("parses a breeder note", () => {
    const result = parseNote(note(breeder), json);
    expect(result.ok && result.value.frontmatter.kind).toBe("breeder");
  });

  it("never trims or rewrites values", () => {
    const spaced = { ...strain, name: "  Moonlit Fern #4 " };
    const result = parseNote(note(spaced), json);
    expect(result.ok && result.value.frontmatter.name).toBe("  Moonlit Fern #4 ");
  });

  it("passes split errors through", () => {
    expect(issuesOf(parseNote("no frontmatter", json))[0]?.field).toBe("frontmatter");
  });

  it("reports a YAML syntax error with the parser's message", () => {
    const failing: YamlParser = () => {
      throw new Error("bad indentation at line 2");
    };
    expect(issuesOf(parseNote(note(strain), failing))).toEqual([
      { field: "frontmatter", message: "invalid YAML: bad indentation at line 2" },
    ]);
    const throwsString: YamlParser = () => {
      throw "nope";
    };
    expect(issuesOf(parseNote(note(strain), throwsString))[0]?.message).toBe("invalid YAML: nope");
  });

  it.each([
    ["empty", "---\n---\n", () => null],
    ["a list", "---\n[1]\n---\n", json],
    ["a scalar", "---\n3\n---\n", json],
  ] as const)("rejects frontmatter that is %s", (_label, markdown, parser) => {
    expect(issuesOf(parseNote(markdown, parser))[0]?.message).toContain("YAML mapping");
  });

  it.each([undefined, "plant", 3])("rejects a missing or unknown kind (%s)", (kind) => {
    const issues = issuesOf(parseNote(note({ ...strain, kind }), json));
    expect(issues).toEqual([
      { field: "kind", message: expect.stringContaining("landrace, strain") },
    ]);
  });

  it("names the field of a schema error", () => {
    const issues = issuesOf(parseNote(note({ ...strain, id: "Moonlit Fern" }), json));
    expect(issues.map((issue) => issue.field)).toEqual(["id"]);
  });

  it("names nested fields with a dotted path", () => {
    const sourced = {
      ...strain,
      sources: [{ url: "ftp://example.org", title: "T", retrieved: "2026-10-20", supports: [] }],
    };
    expect(issuesOf(parseNote(note(sourced), json)).map((issue) => issue.field)).toContain(
      "sources.0.url",
    );
  });

  it("names an unknown key as the field", () => {
    const issues = issuesOf(parseNote(note({ ...strain, sativa_pct: 50, colour: "x" }), json));
    expect(issues).toEqual([
      { field: "sativa_pct", message: expect.stringContaining("unknown field") },
      { field: "colour", message: expect.stringContaining("unknown field") },
    ]);
  });

  it("reports a single parent without derivation (P7) on the derivation field", () => {
    const issues = issuesOf(
      parseNote(note({ ...strain, parents: ["[[Northvale Highland]]"] }), json),
    );
    expect(issues).toEqual([{ field: "derivation", message: expect.stringContaining("P7") }]);
  });

  it("reports a landrace value off the coarse scale (P10)", () => {
    const landrace = {
      kind: "landrace",
      id: "northvale-highland",
      schema_version: 1,
      name: "Northvale Highland",
      parents: [],
      reported_type: "indica",
      base_sativa_pct: 83,
      verification: "unverified",
      created: "2026-10-20",
      updated: "2026-10-20",
    };
    const issues = issuesOf(parseNote(note(landrace), json));
    expect(issues[0]).toEqual({
      field: "base_sativa_pct",
      message: "base_sativa_pct must be one of 10, 25, 50, 75, 90 (P10)",
    });
  });

  it("reports a breeder refinement on its field", () => {
    const issues = issuesOf(parseNote(note({ ...breeder, updated: "2026-10-01" }), json));
    expect(issues).toEqual([{ field: "updated", message: "updated is earlier than created" }]);
  });
});

describe("parseWikilink", () => {
  it.each([
    ["[[Moonlit Fern 4]]", { target: "Moonlit Fern 4", display: null }],
    [
      "[[Moonlit Fern 4|Moonlit Fern #4]]",
      { target: "Moonlit Fern 4", display: "Moonlit Fern #4" },
    ],
    ["[[Moonlit Fern 4.md]]", { target: "Moonlit Fern 4", display: null }],
    ["[[ Moonlit Fern 4.MD ]]", { target: "Moonlit Fern 4", display: null }],
    ["[[strains/Moonlit Fern 4]]", { target: "strains/Moonlit Fern 4", display: null }],
  ])("parses %s", (link, expected) => {
    expect(parseWikilink(link)).toEqual(expected);
  });

  it.each(["Moonlit Fern 4", "[[ ]]", "[[.md]]", "[[a]] [[b]]", "unknown"])(
    "rejects %s",
    (link) => {
      expect(parseWikilink(link)).toBeNull();
    },
  );
});
