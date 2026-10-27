// docs/research/2026-10-26-domain-review.md §2.4: the 42 naming test cases, table-driven.
// Each row is fed through a stand-in for Extract (n-grams + wrapped-line joins), then match → decide.
// Rows whose spec outcome differs from the review's expectation carry `specNote` (logged in T-008).
import { describe, expect, it } from "vitest";
import { decide, match } from "../../src/match";
import { labelCandidates, namingIndex, slugLine } from "./fixtures";

interface NamingCase {
  readonly n: number;
  /** Label lines as printed / read. */
  readonly lines: readonly string[];
  /** The decision docs/06 produces. */
  readonly decision: "accept" | "choose" | "none";
  /** accept: the accepted id. choose: an id that must be in the "Which one?" candidates. */
  readonly id?: string;
  /** Extra ids for choose that must also be offered. */
  readonly alsoOffered?: readonly string[];
  /** Ids that must never be accepted. */
  readonly never?: readonly string[];
  /** Ids that must not appear in the ranked matches at all. */
  readonly absent?: readonly string[];
  /** Set when docs/06 disagrees with the review's expected decision. */
  readonly specNote?: string;
}

const CASES: readonly NamingCase[] = [
  { n: 1, lines: ["GG4"], decision: "accept", id: "gorilla-glue-4" },
  { n: 2, lines: ["ORIGINAL GLUE"], decision: "accept", id: "gorilla-glue-4" },
  { n: 3, lines: ["GG #5"], decision: "accept", id: "gorilla-glue-5", never: ["gorilla-glue-4"] },
  { n: 4, lines: ["Sister Glue"], decision: "accept", id: "gorilla-glue-1" },
  {
    n: 5,
    lines: ["Gorilla Glue"],
    decision: "choose",
    id: "gorilla-glue-1",
    alsoOffered: ["gorilla-glue-4", "gorilla-glue-5"],
  },
  {
    n: 6,
    lines: ["G0RILLA GLU3 #4"],
    decision: "choose",
    id: "gorilla-glue-4",
    specNote:
      "review expects accept; docs/06 folds no 3↔e, and P5 reads the trailing 3 as a number (mismatch)",
  },
  { n: 7, lines: ["GSC"], decision: "accept", id: "girl-scout-cookies" },
  {
    n: 8,
    lines: ["THIN MINT GSC"],
    decision: "accept",
    id: "thin-mint-gsc",
    never: ["girl-scout-cookies"],
  },
  {
    n: 9,
    lines: ["GSC Forum Cut"],
    decision: "accept",
    id: "gsc-forum-cut",
    never: ["girl-scout-cookies"],
    specNote:
      "review expects choose; the input is an exact hit on the curated name, so docs/06 accepts",
  },
  { n: 10, lines: ["GMO"], decision: "accept", id: "gmo" },
  { n: 11, lines: ["Garlic Cookies (I)"], decision: "accept", id: "gmo" },
  {
    n: 12,
    lines: ["GELATO #33"],
    decision: "accept",
    id: "gelato-33",
    never: ["gelato", "gelato-41", "gelato-43"],
  },
  { n: 13, lines: ["Larry Bird"], decision: "accept", id: "gelato-33" },
  { n: 14, lines: ["Gelato 41"], decision: "accept", id: "gelato-41", never: ["gelato-33"] },
  {
    n: 15,
    lines: ["Gelato"],
    decision: "accept",
    id: "gelato",
    never: ["gelato-33", "gelato-41", "gelato-43"],
  },
  { n: 16, lines: ["TRUE GLTO 33"], decision: "choose", id: "gelato-33" },
  {
    n: 17,
    lines: [slugLine("lot420-gelato33-pre-roll-1x1g")],
    decision: "accept",
    id: "gelato-33",
    specNote:
      "review expects choose; gelato33 splits to the exact key `gelato 33` (P5), so docs/06 accepts",
  },
  { n: 18, lines: ["THE ORIGINAL Z"], decision: "accept", id: "zkittlez" },
  { n: 19, lines: ["Skittlez"], decision: "accept", id: "zkittlez" },
  { n: 20, lines: ["Z"], decision: "none" },
  { n: 21, lines: ["Chem Dog"], decision: "accept", id: "chemdawg" },
  { n: 22, lines: ["CHEM 91"], decision: "accept", id: "chem-91", never: ["chemdawg"] },
  { n: 23, lines: ["Chem D"], decision: "accept", id: "chem-d" },
  { n: 24, lines: ["Chem #4"], decision: "accept", id: "chem-4", never: ["gorilla-glue-4"] },
  { n: 25, lines: ["GREEN CRUSH"], decision: "accept", id: "green-crack" },
  { n: 26, lines: ["Sunset Sherbert"], decision: "accept", id: "sunset-sherbet" },
  { n: 27, lines: ["Sherbert"], decision: "choose", id: "sunset-sherbet" },
  { n: 28, lines: ["Triangle Mints #23"], decision: "accept", id: "wedding-cake" },
  {
    n: 29,
    lines: ["Pink Cookies"],
    decision: "none",
    never: ["wedding-cake"],
    specNote:
      "review expects choose; no name or alias scores ≥ 0.60 against it, so docs/06 says none (never accept holds)",
  },
  { n: 30, lines: ["M.A.C. 1"], decision: "accept", id: "mac-1", never: ["mac"] },
  {
    n: 31,
    lines: ["RUNTZ", "White Runtz", "3.5g"],
    decision: "accept",
    id: "white-runtz",
    never: ["runtz"],
  },
  {
    n: 32,
    lines: ["COOKIES", "Girl Scout Cookies", "HYBRID"],
    decision: "accept",
    id: "girl-scout-cookies",
  },
  {
    n: 33,
    lines: ["Wedding Cake x Gelato 33"],
    decision: "choose",
    id: "wedding-cake",
    alsoOffered: ["gelato-33"],
    never: ["wedding-cake", "gelato-33"],
  },
  {
    n: 34,
    lines: ["Gelato x Zkittlez"],
    decision: "choose",
    id: "gelato",
    alsoOffered: ["zkittlez"],
    never: ["gelato", "zkittlez", "runtz"],
    absent: ["runtz"],
    specNote:
      "review expects none; docs/06 §6 gives a ≥ 0.60 parent-of-a-cross top match 'Which one?' (P4: 'at best')",
  },
  { n: 35, lines: ["BLUE", "DREAM"], decision: "accept", id: "blue-dream" },
  { n: 36, lines: ["5 x 0.5g PRE-ROLLS", "JACK HERER"], decision: "accept", id: "jack-herer" },
  { n: 37, lines: ["AK47"], decision: "accept", id: "ak-47" },
  { n: 38, lines: ["HASH PLANT"], decision: "accept", id: "hash-plant" },
  { n: 39, lines: ["SFV OG"], decision: "accept", id: "sfv-og", never: ["og-kush"] },
  { n: 40, lines: ["OG"], decision: "none" },
  { n: 41, lines: ["PURPIE PUNCH"], decision: "accept", id: "purple-punch" },
  { n: 42, lines: ["GDP"], decision: "accept", id: "granddaddy-purple" },
];

describe("domain-review §2.4 naming cases", () => {
  it("covers all 42 rows", () => {
    expect(CASES.map((row) => row.n)).toEqual(Array.from({ length: 42 }, (_, i) => i + 1));
  });

  it.each(
    CASES.map((row) => [
      `#${row.n} ${row.lines.join(" / ")} → ${row.decision}${row.specNote ? " [spec differs from review]" : ""}`,
      row,
    ]),
  )("%s", (_title, row) => {
    const ranked = match(namingIndex, labelCandidates(row.lines));
    const decision = decide(ranked);
    expect(decision.kind).toBe(row.decision);

    if (decision.kind === "accept") expect(decision.match.strain_id).toBe(row.id);
    if (decision.kind === "choose") {
      const offered = decision.candidates.map((candidate) => candidate.strain_id);
      for (const id of [row.id, ...(row.alsoOffered ?? [])]) expect(offered).toContain(id);
    }
    if (decision.kind === "accept") {
      for (const id of row.never ?? []) expect(decision.match.strain_id).not.toBe(id);
    }
    for (const id of row.absent ?? []) {
      expect(ranked.map((result) => result.strain_id)).not.toContain(id);
    }
  });

  it("labels both parents of an unnamed cross as parents, not matches (#33)", () => {
    const ranked = match(namingIndex, labelCandidates(["Wedding Cake x Gelato 33"]));
    const parents = ranked.filter((result) => result.parent_of_cross).map((r) => r.strain_id);
    expect(parents).toEqual(expect.arrayContaining(["wedding-cake", "gelato-33"]));
    const decision = decide(ranked);
    expect(decision.kind === "choose" && decision.blocked_by).toContain("parent_of_cross");
  });

  it("caps the unnumbered seed-line name at choose because of the missing number (#5)", () => {
    const decision = decide(match(namingIndex, labelCandidates(["Gorilla Glue"])));
    expect(decision.kind === "choose" && decision.blocked_by).toContain("missing_number");
  });

  it("blocks the OCR-damaged #4 on the number mismatch, not on score alone (#6)", () => {
    const [top] = match(namingIndex, labelCandidates(["G0RILLA GLU3 #4"]));
    expect(top?.strain_id).toBe("gorilla-glue-4");
    expect(top?.number_mismatch).toBe(true);
  });
});
