import { describe, expect, it } from "vitest";
import {
  PRECHECK_CLAIM_FIELDS,
  PRECHECK_CLAIM_STATUSES,
  PRECHECK_VERDICTS,
  PrecheckRecordSchema,
  ReviewFlagFileSchema,
  Sha256Schema,
} from "../../src/index";
import { expectIssue, expectValid, withFields } from "./fixtures";

const S = PrecheckRecordSchema;
const SHA = "a".repeat(64);

const claim = (overrides: Record<string, unknown> = {}) =>
  withFields(
    {
      field: "parents",
      value: "Copper Kite x Harbor Lantern",
      source: "https://example.org/fictional-source",
      status: "confirmed",
      note: "Names both parents.",
    },
    overrides,
  );

/** The docs/04 example, with fictional names. */
const record = {
  id: "moonlit-fern-4",
  note_sha256: SHA,
  checked_at: "2026-10-27",
  checker: "fact-checker agent",
  verdict: "ready",
  claims: [claim(), claim({ field: "reported_type", value: "indica-dominant" })],
  summary: "Every claim is backed by a cited source.",
};

describe("PrecheckRecord", () => {
  it("matches the docs/04 enums", () => {
    expect(PRECHECK_VERDICTS).toEqual(["ready", "check", "problem"]);
    expect(PRECHECK_CLAIM_FIELDS).toEqual([
      "parents",
      "reported_type",
      "base_sativa_pct",
      "effects",
      "aliases",
      "derivation",
    ]);
    expect(PRECHECK_CLAIM_STATUSES).toEqual([
      "confirmed",
      "not_found",
      "contradicted",
      "unreachable",
      "excluded_source",
    ]);
  });

  it("accepts the docs/04 example", () => {
    expect(expectValid(S, record).verdict).toBe("ready");
  });

  it("accepts a number or a list as a claim value, and a claim without a note", () => {
    expectValid(
      S,
      withFields(record, {
        claims: [
          claim({ field: "base_sativa_pct", value: 25 }),
          claim({ field: "effects", value: ["relaxed", "happy"], note: undefined }),
          claim({ field: "aliases", value: "MF4", note: null }),
        ],
      }),
    );
  });

  it("accepts a record with no claims (a stub with nothing to confirm)", () => {
    expectValid(S, withFields(record, { claims: [] }));
  });

  it("rejects unknown keys and missing fields", () => {
    expectIssue(S, withFields(record, { reviewer: "x" }), []);
    for (const field of ["id", "note_sha256", "checked_at", "checker", "verdict", "summary"]) {
      expectIssue(S, withFields(record, { [field]: undefined }), [field]);
    }
    expectIssue(S, withFields(record, { claims: [claim({ extra: 1 })] }), ["claims", 0]);
  });

  it("validates the id, the hash and the date", () => {
    expectIssue(S, withFields(record, { id: "Moonlit Fern" }), ["id"]);
    expectIssue(S, withFields(record, { id: "unknown" }), ["id"], "reserved");
    for (const hash of ["A".repeat(64), "a".repeat(63), `${"a".repeat(63)}g`, ""]) {
      expectIssue(S, withFields(record, { note_sha256: hash }), ["note_sha256"]);
    }
    expectIssue(S, withFields(record, { checked_at: "Oct 27" }), ["checked_at"]);
  });

  it("rejects values off the enums", () => {
    expectIssue(S, withFields(record, { verdict: "ok" }), ["verdict"]);
    expectIssue(S, withFields(record, { claims: [claim({ field: "flavors" })] }), [
      "claims",
      0,
      "field",
    ]);
    expectIssue(S, withFields(record, { claims: [claim({ status: "maybe" })] }), [
      "claims",
      0,
      "status",
    ]);
  });

  it("rejects blank claim text", () => {
    expectIssue(S, withFields(record, { claims: [claim({ value: " " })] }), ["claims", 0, "value"]);
    expectIssue(S, withFields(record, { claims: [claim({ value: [] })] }), ["claims", 0, "value"]);
    expectIssue(S, withFields(record, { claims: [claim({ source: "" })] }), [
      "claims",
      0,
      "source",
    ]);
  });

  it("a ready verdict can't have a contradicted claim", () => {
    const claims = [claim(), claim({ status: "contradicted", source: "https://example.org/b" })];
    expectIssue(S, withFields(record, { claims }), ["claims", 1, "status"], "contradicted");
    expectValid(S, withFields(record, { claims, verdict: "problem" }));
  });

  it("a ready verdict needs a confirmed claim for every field it lists", () => {
    const claims = [claim(), claim({ field: "reported_type", status: "not_found" })];
    expectIssue(S, withFields(record, { claims }), ["verdict"], "reported_type");
    expectValid(S, withFields(record, { claims, verdict: "check" }));
    // One confirming source is enough when another doesn't mention it.
    const split = [claim({ status: "unreachable" }), claim({ source: "https://example.org/b" })];
    expectValid(S, withFields(record, { claims: split }));
  });
});

describe("Sha256Schema", () => {
  it("accepts lowercase hex of length 64 only", () => {
    expect(Sha256Schema.safeParse("0123456789abcdef".repeat(4)).success).toBe(true);
    expect(Sha256Schema.safeParse(SHA.toUpperCase()).success).toBe(false);
  });
});

describe("ReviewFlagFile", () => {
  const flag = { reviewer: "Fictional Founder", date: "2026-10-27", comment: "Check the breeder." };

  it("accepts flags in order", () => {
    const file = expectValid(ReviewFlagFileSchema, { id: "moonlit-fern-4", flags: [flag, flag] });
    expect(file.flags).toHaveLength(2);
  });

  it("validates every field", () => {
    const F = ReviewFlagFileSchema;
    expectIssue(F, { id: "moonlit-fern-4", flags: [] }, ["flags"], "at least one");
    expectIssue(F, { id: "Bad Id", flags: [flag] }, ["id"]);
    expectIssue(F, { id: "x", flags: [withFields(flag, { comment: "  " })] }, [
      "flags",
      0,
      "comment",
    ]);
    expectIssue(F, { id: "x", flags: [withFields(flag, { date: "today" })] }, ["flags", 0, "date"]);
    expectIssue(F, { id: "x", flags: [withFields(flag, { reviewer: undefined })] }, [
      "flags",
      0,
      "reviewer",
    ]);
    expectIssue(F, { id: "x", flags: [flag], extra: true }, []);
  });
});
