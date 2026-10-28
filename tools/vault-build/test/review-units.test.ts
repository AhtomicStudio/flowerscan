// vault:review pure logic: the frontmatter edit, the queue, the card and flags (T-029). Names are fictional.
import { ALGO_VERSION, createLineageGraph, type Lineage, type LineageNode } from "@flowerscan/core";
import { describe, expect, it } from "vitest";
import {
  approvedVerification,
  approveNote,
  checkApproved,
  REVIEW_KEYS,
  reviewerProblem,
  setFrontmatterKeys,
  withoutKeys,
} from "../src/review/approve";
import { lineageText, renderCard, renderSessionSummary } from "../src/review/card";
import { addFlag } from "../src/review/flags";
import {
  buildQueue,
  filterQueue,
  isStub,
  precheckState,
  type ReviewNote,
  readyStubs,
  verdictOf,
} from "../src/review/queue";
import { parseFrontmatterYaml, parseYaml } from "../src/yaml";

const approval = { reviewer: "Fictional Founder", today: "2026-10-27" };
const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);

/** A note written the way the vault templates write them. */
const NOTE = [
  "---",
  "kind: strain",
  "id: quiet-fern",
  "schema_version: 1",
  'name: "Quiet Fern"',
  "aliases: []",
  "parents:",
  '  - "[[Northvale Highland]]"',
  "  - unknown",
  "parent_weights: null",
  "reported_type: indica-dominant",
  "breeder: null",
  "effects: [relaxed]",
  "sources:",
  "  - url: https://example.org/quiet-fern",
  '    title: "Fictional: Quiet Fern"',
  "    retrieved: 2026-10-20",
  "    supports: [parents, reported_type, effects]",
  "verification: unverified",
  "created: 2026-10-20",
  "updated: 2026-10-21",
  "---",
  "",
  "# Quiet Fern",
  "",
  "Curator notes: verification: unverified is just text here.",
  "updated: 2020-01-01",
  "",
].join("\n");

const APPROVED = NOTE.replace(
  "verification: unverified\ncreated: 2026-10-20\nupdated: 2026-10-21\n",
  'verification: verified\nreviewed_by: "Fictional Founder"\nreviewed_at: 2026-10-27\ncreated: 2026-10-20\nupdated: 2026-10-27\n',
);

function approved(text: string, a = approval): string {
  const result = approveNote(text, a, parseFrontmatterYaml);
  if (!result.ok) throw new Error(result.problems.join("; "));
  return result.text;
}

describe("approveNote: the frontmatter edit", () => {
  it("writes verified, reviewed_by, reviewed_at and updated, and nothing else", () => {
    const after = approved(NOTE);
    expect(after).toBe(APPROVED);
    // The body has the same words, untouched.
    expect(
      after.endsWith(
        "Curator notes: verification: unverified is just text here.\nupdated: 2020-01-01\n",
      ),
    ).toBe(true);
    expect(withoutKeys(after, REVIEW_KEYS)).toBe(withoutKeys(NOTE, REVIEW_KEYS));
    expect(checkApproved(NOTE, after, approval, parseFrontmatterYaml)).toEqual([]);
  });

  it("keeps a disputed note disputed", () => {
    const disputed = NOTE.replace("verification: unverified", "verification: disputed");
    const result = approveNote(disputed, approval, parseFrontmatterYaml);
    expect(result.ok && result.verification).toBe("disputed");
    expect(approved(disputed)).toBe(
      APPROVED.replace("verification: verified", "verification: disputed"),
    );
    expect(approvedVerification("unverified")).toBe("verified");
    expect(approvedVerification("verified")).toBe("verified");
  });

  it("preserves CRLF line endings, a BOM, and a file without a final newline", () => {
    const bom = String.fromCharCode(0xfeff);
    const crlf = bom + NOTE.replaceAll("\n", "\r\n").replace(/\r\n$/, "");
    const after = approved(crlf);
    expect(after).toBe(bom + APPROVED.replaceAll("\n", "\r\n").replace(/\r\n$/, ""));
    expect(after.startsWith(bom)).toBe(true);
  });

  it("rewrites existing reviewed_by / reviewed_at lines in place (a re-review)", () => {
    const reviewed = NOTE.replace(
      "verification: unverified\n",
      'verification: verified\nreviewed_by: "Earlier Founder"\nreviewed_at: 2026-10-22\n',
    );
    expect(approved(reviewed)).toBe(APPROVED);
    const nulls = NOTE.replace(
      "verification: unverified\n",
      "verification: unverified\nreviewed_at: null\nreviewed_by: null\n",
    );
    expect(approved(nulls)).toBe(
      APPROVED.replace(
        'reviewed_by: "Fictional Founder"\nreviewed_at: 2026-10-27\n',
        'reviewed_at: 2026-10-27\nreviewed_by: "Fictional Founder"\n',
      ),
    );
  });

  it("keeps a trailing comment on an unquoted value", () => {
    const commented = NOTE.replace("updated: 2026-10-21", "updated: 2026-10-21  # bump on edits");
    expect(approved(commented)).toBe(
      APPROVED.replace("updated: 2026-10-27", "updated: 2026-10-27  # bump on edits"),
    );
  });

  it("quotes the reviewer name as a YAML string", () => {
    const after = approved(NOTE, { reviewer: 'Jo "JJ" O\'Neil: #1', today: "2026-10-27" });
    expect(after).toContain('reviewed_by: "Jo \\"JJ\\" O\'Neil: #1"');
  });

  it("refuses an approval the schema would reject, and writes nothing", () => {
    const unsourced = NOTE.replace(/sources:\n(?: {2,}.*\n)+/, "sources: []\n");
    const result = approveNote(unsourced, approval, parseFrontmatterYaml);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.join(" ")).toContain("a verified node needs sources");
    const early = approveNote(NOTE, { reviewer: "A", today: "2026-10-19" }, parseFrontmatterYaml);
    expect(!early.ok && early.problems.join(" ")).toContain("updated is earlier than created");
  });

  it("refuses notes it can't read or edit safely", () => {
    const fail = (text: string, a = approval) => {
      const result = approveNote(text, a, parseFrontmatterYaml);
      expect(result.ok).toBe(false);
      return result.ok ? "" : result.problems.join(" ");
    };
    expect(fail("no frontmatter")).toContain("frontmatter");
    expect(fail(NOTE.replace("kind: strain", "kind: strain\nkind: cross"))).toContain(
      "frontmatter",
    );
    expect(fail(NOTE, { reviewer: " ", today: "2026-10-27" })).toContain("blank");
    expect(
      fail(
        "---\nkind: breeder\nid: b\nschema_version: 1\nname: B\ncreated: 2026-10-20\nupdated: 2026-10-20\n---\n",
      ),
    ).toContain("breeder");
    const folded = NOTE.replace(
      "verification: unverified\n",
      "verification: unverified\nreviewed_by: >-\n  Someone\nreviewed_at: 2026-10-22\n",
    );
    expect(fail(folded)).toContain("reviewed_by spans more than one line");
  });
});

describe("setFrontmatterKeys", () => {
  const set = (text: string, key: string, after = "b") =>
    setFrontmatterKeys(text, [{ key, value: "1", after }]);

  it("replaces, inserts after the anchor, and reports what it can't do", () => {
    expect(set("---\na: 0\nb: 0\n---\n", "a")).toEqual({
      ok: true,
      text: "---\na: 1\nb: 0\n---\n",
    });
    expect(set("---\na: 0\nb: 0\n---\nc: 0\n", "c")).toEqual({
      ok: true,
      text: "---\na: 0\nb: 0\nc: 1\n---\nc: 0\n",
    });
    expect(set("---\na: 0\n---\n", "c", "b")).toEqual({
      ok: false,
      problem: "can't add c: b is missing",
    });
    expect(set("---\na: 0\na: 2\n---\n", "a")).toMatchObject({
      ok: false,
      problem: "a appears 2 times in the frontmatter",
    });
    expect(set("---\na:\n  - x\nb: 0\n---\n", "a")).toMatchObject({ ok: false });
    expect(set("---\na: 0\n- x\nb: 0\n---\n", "a")).toMatchObject({ ok: false });
    expect(set("---\nb: 0\n  more\n---\n", "c")).toMatchObject({ ok: false });
    expect(set("---\na: 0\n", "a")).toMatchObject({
      ok: false,
      problem: "the frontmatter has no closing --- line",
    });
    expect(set("a: 0\n", "a")).toMatchObject({ ok: false });
    // A key name that only starts with the wanted key is a different key.
    expect(set("---\nab: 0\nb: 0\n---\n", "a")).toEqual({
      ok: true,
      text: "---\nab: 0\nb: 0\na: 1\n---\n",
    });
  });

  it("withoutKeys needs a frontmatter", () => {
    expect(withoutKeys("plain", ["a"])).toBeNull();
  });
});

describe("checkApproved: every other byte stays the same", () => {
  it("catches a changed body byte, a changed field, wrong values and an invalid note", () => {
    const after = approved(NOTE);
    const check = (text: string) => checkApproved(NOTE, text, approval, parseFrontmatterYaml);
    expect(check(after.replace("Body", "body").replace("# Quiet Fern", "# Quiet fern"))).toEqual([
      "bytes outside the review fields changed",
    ]);
    expect(check(after.replace("reported_type: indica-dominant", "reported_type: indica"))).toEqual(
      ["a field other than the review fields changed", "bytes outside the review fields changed"],
    );
    expect(check(after.replace("reviewed_at: 2026-10-27", "reviewed_at: 2026-10-26"))).toEqual([
      'reviewed_at is "2026-10-26", expected "2026-10-27"',
    ]);
    expect(check(after.replace("kind: strain", "kind: plant")).join(" ")).toContain("kind");
    expect(check(NOTE).slice(0, 2)).toEqual([
      'verification is "unverified", expected "verified"',
      'reviewed_by is undefined, expected "Fictional Founder"',
    ]);
  });
});

describe("reviewerProblem", () => {
  it("accepts ordinary names and rejects blank, padded, control characters and very long ones", () => {
    expect(reviewerProblem("Fictional Founder")).toBeNull();
    expect(reviewerProblem("Zoë O'Neil")).toBeNull();
    expect(reviewerProblem("")).toContain("blank");
    expect(reviewerProblem(" Jo")).toContain("space");
    expect(reviewerProblem(`Jo${String.fromCharCode(10)}Ann`)).toContain("control");
    expect(reviewerProblem(`Jo${String.fromCharCode(0x2028)}`)).toContain("control");
    expect(reviewerProblem("x".repeat(101))).toContain("100");
  });
});

// --- Queue -------------------------------------------------------------------------------------------

const lineage = (pct: number | null): Lineage =>
  pct === null
    ? {
        sativa_pct: null,
        indica_pct: null,
        label: "unknown",
        sublabel: null,
        confidence: 0,
        confidence_level: "none",
        method: "unknown",
        algo_version: ALGO_VERSION,
      }
    : {
        sativa_pct: pct,
        indica_pct: 100 - pct,
        label: pct < 50 ? "indica" : pct > 50 ? "sativa" : "hybrid",
        sublabel:
          pct === 50
            ? "balanced"
            : pct < 50
              ? pct <= 20
                ? null
                : "indica-dominant"
              : "sativa-dominant",
        confidence: 0.82,
        confidence_level: "high",
        method: "traced",
        algo_version: ALGO_VERSION,
      };

type NodeSpec = Partial<LineageNode> & { id: string; kind: LineageNode["kind"] };
const SPECS: NodeSpec[] = [
  { id: "zeta-strain", kind: "strain", name: "Zeta", parents: ["alpha-land"] },
  { id: "beta-land", kind: "landrace", name: "Beta Land", parents: [] },
  { id: "alpha-land", kind: "landrace", name: "alpha Land", parents: [] },
  {
    id: "mid-cross",
    kind: "cross",
    name: "Zeta x Beta Land",
    parents: ["zeta-strain", "beta-land"],
  },
  { id: "child", kind: "strain", name: "Child", parents: ["mid-cross"], derivation: "pheno" },
  { id: "stub", kind: "strain", name: "Stub", parents: ["unknown"] },
  {
    id: "aaa-reviewed",
    kind: "strain",
    name: "Aaa",
    parents: ["unknown"],
    verification: "verified",
  },
];

function queueFixture(
  prechecks: Map<string, { id: string; file: string; data: unknown }> = new Map(),
) {
  const graph = createLineageGraph(
    SPECS.map((spec) => ({
      name: spec.id,
      parents: [],
      reported_type: "unknown" as const,
      verification: "unverified" as const,
      ...spec,
    })),
  );
  const notes: ReviewNote[] = SPECS.map((spec) => ({
    path: `strains/${spec.id}.md`,
    file: `vault/strains/${spec.id}.md`,
    text: "",
    sha256: SHA_A,
    note: {
      kind: spec.kind,
      id: spec.id,
      schema_version: 1,
      name: spec.name ?? spec.id,
      aliases: ["Alt"],
      parents: (spec.parents ?? []).map((p) => (p === "unknown" ? p : `[[${p}]]`)),
      parent_weights: null,
      derivation: spec.derivation ?? null,
      reported_type: "unknown",
      effects: [],
      sources: [
        { url: "https://example.org/s", title: "Fictional", retrieved: "2026-10-20", supports: [] },
      ],
      verification: spec.verification ?? "unverified",
      ...(spec.verification === "verified"
        ? { reviewed_by: "Founder", reviewed_at: "2026-10-26" }
        : {}),
      created: "2026-10-20",
      updated: "2026-10-20",
    } as ReviewNote["note"],
  }));
  const lineages = new Map(
    SPECS.map((spec) => [spec.id, lineage(spec.kind === "landrace" ? 10 : null)]),
  );
  return buildQueue({ notes, graph, lineages, prechecks });
}

const precheck = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  note_sha256: SHA_A,
  checked_at: "2026-10-27",
  checker: "fact-checker agent",
  verdict: "ready",
  claims: [
    {
      field: "reported_type",
      value: "unknown",
      source: "https://example.org/s",
      status: "confirmed",
      note: "Names the strain.",
    },
  ],
  summary: "Fine.",
  ...overrides,
});

describe("buildQueue", () => {
  it("orders landraces first, then most descendants, then name", () => {
    const queue = queueFixture();
    expect(queue.map((item) => [item.note.id, item.descendants])).toEqual([
      ["alpha-land", 3],
      ["beta-land", 2],
      ["zeta-strain", 2],
      ["mid-cross", 1],
      ["aaa-reviewed", 0],
      ["child", 0],
      ["stub", 0],
    ]);
  });

  it("resolves parents and counts unverified ancestors", () => {
    const child = queueFixture().find((item) => item.note.id === "child");
    expect(child?.parents).toEqual([{ id: "mid-cross", name: "Zeta x Beta Land", kind: "cross" }]);
    expect(child?.unverifiedAncestors).toBe(4);
    const stub = queueFixture().find((item) => item.note.id === "stub");
    expect(stub?.parents).toEqual([{ id: "unknown", name: null, kind: null }]);
  });

  it("fails loudly when the compile is missing a note", () => {
    const graph = createLineageGraph([]);
    expect(() =>
      buildQueue({
        notes: [
          { path: "", file: "", text: "", sha256: SHA_A, note: { id: "x" } as ReviewNote["note"] },
        ],
        graph,
        lineages: new Map(),
        prechecks: new Map(),
      }),
    ).toThrow("missing");
  });
});

describe("filterQueue, stubs and verdicts", () => {
  const prechecks = new Map([
    ["stub", { id: "stub", file: "p/stub.yaml", data: precheck("stub") }],
    [
      "child",
      { id: "child", file: "p/child.yaml", data: precheck("child", { note_sha256: SHA_B }) },
    ],
    [
      "zeta-strain",
      {
        id: "zeta-strain",
        file: "p/z.yaml",
        data: precheck("zeta-strain", { verdict: "problem" }),
      },
    ],
    ["aaa-reviewed", { id: "aaa-reviewed", file: "p/a.yaml", data: precheck("aaa-reviewed") }],
  ]);
  const queue = queueFixture(prechecks);
  const ids = (filters: Partial<Parameters<typeof filterQueue>[1]>) =>
    filterQueue(queue, { all: false, kind: null, verdict: null, ids: [], ...filters }).map(
      (item) => item.note.id,
    );

  it("skips reviewed notes unless --all", () => {
    expect(ids({})).not.toContain("aaa-reviewed");
    expect(ids({ all: true })).toContain("aaa-reviewed");
  });

  it("filters by kind, verdict and id", () => {
    expect(ids({ kind: "landrace" })).toEqual(["alpha-land", "beta-land"]);
    expect(ids({ verdict: "ready" })).toEqual(["stub"]);
    expect(ids({ verdict: "stale" })).toEqual(["child"]);
    expect(ids({ verdict: "problem" })).toEqual(["zeta-strain"]);
    expect(ids({ verdict: "check" })).toEqual([]);
    expect(ids({ verdict: "none" })).toEqual(["alpha-land", "beta-land", "mid-cross"]);
    expect(ids({ ids: ["child", "stub"] })).toEqual(["child", "stub"]);
  });

  it("readyStubs takes unreviewed stubs with a current ready pre-check only", () => {
    expect(readyStubs(queue).map((item) => item.note.id)).toEqual(["stub"]);
    const stubNote = queue.find((item) => item.note.id === "stub")?.note;
    const land = queue.find((item) => item.note.id === "alpha-land")?.note;
    expect(stubNote && isStub(stubNote)).toBe(true);
    expect(land && isStub(land)).toBe(false);
  });
});

describe("precheckState: stale detection", () => {
  const file = (data: unknown, extra: Record<string, unknown> = {}) => ({
    id: "stub",
    file: "p/stub.yaml",
    data,
    ...extra,
  });

  it("is current when note_sha256 matches the note bytes, stale when it doesn't", () => {
    expect(precheckState(file(precheck("stub")), SHA_A).state).toBe("current");
    const stale = precheckState(file(precheck("stub")), SHA_B);
    expect(stale.state).toBe("stale");
    expect(verdictOf(stale)).toBe("stale");
  });

  it("is none without a record, invalid for a bad one (counted as none)", () => {
    expect(precheckState(undefined, SHA_A)).toEqual({ state: "none" });
    const bad = precheckState(file({ ...precheck("stub"), verdict: "great" }), SHA_A);
    expect(bad.state).toBe("invalid");
    expect(verdictOf(bad)).toBe("none");
    expect(precheckState(file(undefined, { error: "invalid YAML: x" }), SHA_A)).toMatchObject({
      state: "invalid",
      problems: ["invalid YAML: x"],
    });
    expect(precheckState(file(precheck("other")), SHA_A)).toMatchObject({
      state: "invalid",
      problems: ['id is "other" but the file is named for "stub"'],
    });
    expect(precheckState(file(null), SHA_A)).toMatchObject({
      state: "invalid",
      problems: [expect.stringContaining("(root)")],
    });
  });
});

// --- Card --------------------------------------------------------------------------------------------

describe("renderCard", () => {
  const prechecks = new Map([
    [
      "child",
      {
        id: "child",
        file: "p/child.yaml",
        data: precheck("child", {
          note_sha256: SHA_B,
          verdict: "check",
          claims: [
            {
              field: "parents",
              value: ["Zeta", "Beta Land"],
              source: "https://example.org/s",
              status: "not_found",
            },
          ],
        }),
      },
    ],
    ["stub", { id: "stub", file: "p/stub.yaml", data: { id: "stub" } }],
  ]);
  const queue = queueFixture(prechecks);
  const card = (id: string, problems: string[] = []) => {
    const item = queue.find((entry) => entry.note.id === id);
    if (item === undefined) throw new Error(id);
    return renderCard(item, { position: 2, total: 7, approveProblems: problems });
  };

  it("shows the facts, the computed result, the sources, the pre-check and the impact", () => {
    const text = card("alpha-land");
    expect(text).toContain("=== 2/7  alpha Land  (alpha-land)");
    expect(text).toContain("Kind: landrace | Verification: unverified");
    expect(text).toContain("Parents: none (landrace: lineage stops here)");
    expect(text).toContain(
      `Computed (ALGO_VERSION ${ALGO_VERSION}, whole vault incl. unverified): indica, 10% sativa, confidence high (0.82), method traced`,
    );
    expect(text).toContain("Aliases: Alt");
    expect(text).toContain(
      "  1. Fictional\n     https://example.org/s\n     supports: none | retrieved 2026-10-20",
    );
    expect(text).toContain("Pre-check: none");
    expect(text).toContain("Impact: 3 descendants; approving ships this note.");
  });

  it("marks a stale pre-check and lists each claim", () => {
    const text = card("child", ["verification: verified needs a source that supports parents"]);
    expect(text).toContain("Pre-check: CHECK (fact-checker agent, 2026-10-27) | STALE");
    expect(text).toContain("??  parents: Zeta, Beta Land | not_found | https://example.org/s");
    expect(text).toContain("Parents: Zeta x Beta Land (mid-cross, unnamed cross)");
    expect(text).toContain("equal weights, derivation pheno");
    expect(text).toContain(
      "Impact: 0 descendants; approving ships this note. 4 ancestors are still unverified",
    );
    expect(text).toContain(
      "Can't approve as is:\n  verification: verified needs a source that supports parents",
    );
  });

  it("shows an invalid pre-check and an undisclosed parent", () => {
    const text = card("stub");
    expect(text).toContain("Pre-check: INVALID record p/stub.yaml (treated as none)");
    expect(text).toContain("Parents: unknown (undisclosed)");
    expect(text).toContain("derivation none (undisclosed)");
    expect(card("aaa-reviewed")).toContain("Reviewed by Founder on 2026-10-26");
    expect(card("aaa-reviewed")).toContain("it already ships as verified");
  });

  it("formats an unknown result", () => {
    expect(lineageText(lineage(null))).toBe("unknown (no value), confidence none, method unknown");
    expect(lineageText(lineage(50))).toContain("hybrid (balanced), 50% sativa");
  });
});

describe("renderSessionSummary", () => {
  it("counts every decision", () => {
    const text = renderSessionSummary({
      reviewer: "Fictional Founder",
      approved: ["a"],
      flagged: ["b"],
      skipped: ["c", "d"],
      failed: ["e"],
      notSeen: 3,
    });
    expect(text).toContain(
      "Session for Fictional Founder: 1 approved, 1 flagged, 2 skipped, 1 failed, 3 left.",
    );
    expect(text).toContain("Approved: a");
    expect(text).toContain("Next: pnpm vault:check");
    expect(
      renderSessionSummary({
        reviewer: "R",
        approved: [],
        flagged: [],
        skipped: [],
        failed: [],
        notSeen: 0,
      }),
    ).toBe("Session for R: 0 approved, 0 flagged, 0 skipped, 0 left.");
  });
});

// --- Flags -------------------------------------------------------------------------------------------

describe("addFlag", () => {
  const flag = {
    reviewer: "Fictional Founder",
    date: "2026-10-27",
    comment: "Second parent: which cut?",
  };

  it("creates a file, then appends to it", () => {
    const first = addFlag(null, "quiet-fern", flag, parseYaml);
    expect(first).toEqual({
      ok: true,
      text: 'id: quiet-fern\nflags:\n  - reviewer: Fictional Founder\n    date: 2026-10-27\n    comment: "Second parent: which cut?"\n',
    });
    if (!first.ok) return;
    const second = addFlag(
      first.text,
      "quiet-fern",
      { ...flag, comment: "Also the breeder." },
      parseYaml,
    );
    expect(second.ok && (parseYaml(second.text) as { flags: unknown[] }).flags).toHaveLength(2);
  });

  it("never overwrites a file it can't read", () => {
    expect(addFlag("id: [", "quiet-fern", flag, parseYaml)).toMatchObject({ ok: false });
    expect(addFlag("id: quiet-fern\nflags: []\n", "quiet-fern", flag, parseYaml)).toMatchObject({
      ok: false,
      problem: expect.stringContaining("docs/04"),
    });
    expect(
      addFlag(
        "id: other\nflags:\n  - {reviewer: R, date: 2026-10-27, comment: c}\n",
        "quiet-fern",
        flag,
        parseYaml,
      ),
    ).toMatchObject({ ok: false, problem: expect.stringContaining("other") });
    expect(addFlag(null, "quiet-fern", { ...flag, comment: " " }, parseYaml)).toMatchObject({
      ok: false,
    });
  });
});
