// Approve = a text edit of the note's frontmatter (docs/04 "Founder review workflow", T-029). Only the
// lines of four top-level keys change; every other byte of the file stays as it was. Pure: no clock, no I/O.
import { type GeneticNode, parseNote, type Verification, type YamlParser } from "@flowerscan/core";

/** The keys approve writes. Nothing else in the file is touched. */
export const REVIEW_KEYS = ["verification", "reviewed_by", "reviewed_at", "updated"] as const;
type ReviewKey = (typeof REVIEW_KEYS)[number];

export interface Approval {
  /** The reviewer's name as confirmed at the start of the session. */
  readonly reviewer: string;
  /** Today, `YYYY-MM-DD` (injected clock). */
  readonly today: string;
}

export type ApproveResult =
  | { readonly ok: true; readonly text: string; readonly verification: Verification }
  | { readonly ok: false; readonly problems: readonly string[] };

/** A line and its terminator (`\n`, `\r\n`, or nothing on the last line). */
interface Line {
  readonly content: string;
  readonly eol: string;
}

const OPEN_FENCE = /^---[ \t]*$/;
const CLOSE_FENCE = /^(?:---|\.\.\.)[ \t]*$/;
const BOM = String.fromCharCode(0xfeff);

function splitLines(text: string): Line[] {
  const lines: Line[] = [];
  const pattern = /([^\n]*?)(\r?\n|$)/g;
  for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
    const [whole, content = "", eol = ""] = match;
    if (whole === "") break;
    lines.push({ content, eol });
  }
  return lines;
}

const joinLines = (lines: readonly Line[]) => lines.map((line) => line.content + line.eol).join("");

/** A reviewer name that can be written as one YAML line: not blank, no control characters. */
export function reviewerProblem(name: string): string | null {
  if (!/\S/.test(name)) return "the name can't be blank";
  const control = [...name].some((ch) => {
    const code = ch.codePointAt(0) ?? 0;
    return code < 0x20 || code === 0x7f || code === 0x2028 || code === 0x2029;
  });
  if (control) return "the name can't contain control characters or line breaks";
  if (name !== name.trim()) return "the name can't start or end with a space";
  if (name.length > 100) return "the name is longer than 100 characters";
  return null;
}

/** `key:` at column 0 (a top-level frontmatter key). */
const keyPattern = (key: string) => new RegExp(`^${key}[ \\t]*:`);

/** True for a line that continues the value above it: indented, or a compact `- ` list item. */
const continues = (line: Line | undefined) =>
  line !== undefined && /^(?:[ \t]+\S|-(?:[ \t]|$))/.test(line.content);

interface Frontmatter {
  readonly lines: Line[];
  /** Index of the first frontmatter line (after the opening fence) and of the closing fence. */
  readonly start: number;
  readonly end: number;
  readonly bom: string;
}

function frontmatterOf(text: string): Frontmatter | string {
  const bom = text.startsWith(BOM) ? BOM : "";
  const lines = splitLines(text.slice(bom.length));
  if (!OPEN_FENCE.test(lines[0]?.content ?? "")) return "the note doesn't start with a --- line";
  const end = lines.findIndex((line, i) => i > 0 && CLOSE_FENCE.test(line.content));
  if (end === -1) return "the frontmatter has no closing --- line";
  return { lines, start: 1, end, bom };
}

/** The line index of a top-level key, null when absent, or a problem when it can't be edited safely. */
function findKey(fm: Frontmatter, key: string): number | null | string {
  const found: number[] = [];
  for (let i = fm.start; i < fm.end; i += 1) {
    if (keyPattern(key).test((fm.lines[i] as Line).content)) found.push(i);
  }
  if (found.length > 1) return `${key} appears ${found.length} times in the frontmatter`;
  const [index] = found;
  if (index === undefined) return null;
  const value = (fm.lines[index] as Line).content.replace(keyPattern(key), "").trim();
  const next = index + 1 < fm.end ? fm.lines[index + 1] : undefined;
  if (value === "" || /^[|>]/.test(value) || continues(next)) {
    return `${key} spans more than one line: edit it by hand`;
  }
  return index;
}

/** Keeps a trailing `# comment` on an unquoted value. Quoted values are replaced whole. */
function trailingComment(content: string, key: string): string {
  const value = content.replace(keyPattern(key), "").trimStart();
  if (value.startsWith('"') || value.startsWith("'")) return "";
  const comment = /[ \t]+#.*$/.exec(value);
  return comment === null ? "" : comment[0];
}

/**
 * Sets top-level keys in the frontmatter text. An existing key's line is rewritten in place; a missing
 * key is inserted on a new line after `after` (which must exist). Returns the new text or a problem.
 */
export function setFrontmatterKeys(
  text: string,
  changes: readonly { readonly key: string; readonly value: string; readonly after: string }[],
): { ok: true; text: string } | { ok: false; problem: string } {
  const fm = frontmatterOf(text);
  if (typeof fm === "string") return { ok: false, problem: fm };
  for (const { key, value, after } of changes) {
    const index = findKey(fm, key);
    if (typeof index === "string") return { ok: false, problem: index };
    if (index !== null) {
      const line = fm.lines[index] as Line;
      fm.lines[index] = {
        content: `${key}: ${value}${trailingComment(line.content, key)}`,
        eol: line.eol,
      };
      continue;
    }
    const anchor = findKey(fm, after);
    if (typeof anchor === "string") return { ok: false, problem: anchor };
    if (anchor === null) return { ok: false, problem: `can't add ${key}: ${after} is missing` };
    const anchorLine = fm.lines[anchor] as Line;
    // The anchor is inside the frontmatter, so it always has a line break after it.
    fm.lines.splice(anchor + 1, 0, { content: `${key}: ${value}`, eol: anchorLine.eol });
    (fm as { end: number }).end += 1;
  }
  return { ok: true, text: fm.bom + joinLines(fm.lines) };
}

/** The file without the lines of `keys` in its frontmatter. Approve must leave this identical. */
export function withoutKeys(text: string, keys: readonly string[]): string | null {
  const fm = frontmatterOf(text);
  if (typeof fm === "string") return null;
  const kept = fm.lines.filter(
    (line, i) =>
      i < fm.start || i >= fm.end || !keys.some((key) => keyPattern(key).test(line.content)),
  );
  return fm.bom + joinLines(kept);
}

/** Stable JSON (sorted keys), to compare parsed frontmatter. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

function rawFrontmatter(text: string, parseYaml: YamlParser): Record<string, unknown> | null {
  const fm = frontmatterOf(text);
  if (typeof fm === "string") return null;
  try {
    const data = parseYaml(joinLines(fm.lines.slice(fm.start, fm.end)));
    return typeof data === "object" && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** The verification a note gets on approval: `disputed` stays `disputed`, anything else becomes `verified`. */
export const approvedVerification = (current: Verification): Verification =>
  current === "disputed" ? "disputed" : "verified";

/**
 * Checks an approved text against the original: it parses and passes the schema, only the four review
 * keys changed (to the expected values), and every other byte is the same. Returns the problems found.
 */
export function checkApproved(
  before: string,
  after: string,
  approval: Approval,
  parseYaml: YamlParser,
): string[] {
  const parsed = parseNote(after, parseYaml);
  if (!parsed.ok) return parsed.issues.map((issue) => `${issue.field}: ${issue.message}`);
  const node = parsed.value.frontmatter;
  if (node.kind === "breeder") return ["the note is a breeder, not a genetic node"];
  const problems: string[] = [];
  const original = rawFrontmatter(before, parseYaml);
  const edited = rawFrontmatter(after, parseYaml);
  if (original === null || edited === null) return ["can't read the frontmatter"];
  const expected: Record<ReviewKey, unknown> = {
    verification: approvedVerification(original.verification as Verification),
    reviewed_by: approval.reviewer,
    reviewed_at: approval.today,
    updated: approval.today,
  };
  for (const key of REVIEW_KEYS) {
    if (edited[key] !== expected[key]) {
      problems.push(
        `${key} is ${JSON.stringify(edited[key])}, expected ${JSON.stringify(expected[key])}`,
      );
    }
  }
  const rest = (data: Record<string, unknown>) =>
    canonical(
      Object.fromEntries(
        Object.entries(data).filter(([k]) => !(REVIEW_KEYS as readonly string[]).includes(k)),
      ),
    );
  if (rest(original) !== rest(edited))
    problems.push("a field other than the review fields changed");
  if (withoutKeys(before, REVIEW_KEYS) !== withoutKeys(after, REVIEW_KEYS)) {
    problems.push("bytes outside the review fields changed");
  }
  return problems;
}

/**
 * The approved text of a note: `verification: verified` (a `disputed` note stays `disputed`),
 * `reviewed_by`, `reviewed_at` and `updated` set to the reviewer and today. The result is checked with
 * `checkApproved` before it's returned, so a failure here means nothing should be written.
 */
export function approveNote(
  text: string,
  approval: Approval,
  parseYaml: YamlParser,
): ApproveResult {
  const nameProblem = reviewerProblem(approval.reviewer);
  if (nameProblem !== null) return { ok: false, problems: [`reviewer: ${nameProblem}`] };
  const current = parseNote(text, parseYaml);
  if (!current.ok) {
    return {
      ok: false,
      problems: current.issues.map((issue) => `${issue.field}: ${issue.message}`),
    };
  }
  const note = current.value.frontmatter;
  if (note.kind === "breeder") return { ok: false, problems: ["breeder notes aren't reviewed"] };
  const verification = approvedVerification(note.verification);
  const edit = setFrontmatterKeys(text, [
    ...(verification === note.verification
      ? []
      : [{ key: "verification", value: verification, after: "verification" }]),
    { key: "reviewed_by", value: JSON.stringify(approval.reviewer), after: "verification" },
    { key: "reviewed_at", value: approval.today, after: "reviewed_by" },
    { key: "updated", value: approval.today, after: "updated" },
  ]);
  if (!edit.ok) return { ok: false, problems: [edit.problem] };
  const problems = checkApproved(text, edit.text, approval, parseYaml);
  return problems.length > 0
    ? { ok: false, problems }
    : { ok: true, text: edit.text, verification };
}

/** True when a founder has reviewed the note. */
export const isReviewed = (note: GeneticNode) =>
  note.reviewed_by !== undefined && note.reviewed_by !== null;
