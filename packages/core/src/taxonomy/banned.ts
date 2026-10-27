// Banned-term check (T-003, docs/09, decisions C1–C3). The list lives in data/taxonomy/banned.yaml; its header
// defines the matching rules implemented here.
import { z } from "zod";
import { fail, issuesFromZod, ok, type Result, type ValidationIssue } from "../markdown/issues";

/** The lists in banned.yaml. All four are checked the same way; the grouping only helps review. */
export const BANNED_LISTS = ["conditions", "claims", "pharmacology", "safety"] as const;
export type BannedList = (typeof BANNED_LISTS)[number];

const EntrySchema = z
  .string()
  .regex(/\S/, { error: "must not be blank" })
  .refine((entry) => entry === entry.trim(), { error: "must not start or end with whitespace" })
  .refine((entry) => entry === entry.toLowerCase(), { error: "must be lowercase" });

const BannedFileSchema = z.strictObject({
  banned_version: z.int().min(1),
  conditions: z.array(EntrySchema),
  claims: z.array(EntrySchema),
  pharmacology: z.array(EntrySchema),
  safety: z.array(EntrySchema),
});

export interface BannedEntry {
  readonly term: string;
  readonly list: BannedList;
  /** Compiled matcher. Use `findBannedTerms`; don't run it directly (it's global and stateful). */
  readonly pattern: RegExp;
}

/** A loaded banned.yaml. Build it with `loadBannedTerms`. */
export interface BannedTerms {
  readonly version: number;
  readonly entries: readonly BannedEntry[];
}

/** One banned entry found in a text. */
export interface BannedHit {
  readonly term: string;
  readonly list: BannedList;
  /** UTF-16 offset of the match in the checked text. */
  readonly index: number;
  /** The matched text exactly as written. */
  readonly text: string;
}

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;
const APOSTROPHE_CLASS = "['‘’ʼ]";

/**
 * The banned.yaml rules: case-insensitive, whole word or phrase (no letter or digit on either side), a
 * space matches any run of whitespace, no stemming. One clarification: an apostrophe in an entry also
 * matches the typographic apostrophes (’ ‘ ʼ), so "alzheimer's" can't slip through as "Alzheimer’s".
 */
function compile(term: string): RegExp {
  const body = term
    .replace(REGEX_SPECIAL, "\\$&")
    .replace(/'/g, APOSTROPHE_CLASS)
    .replace(/\s+/g, "\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, "giu");
}

/** Validates a parsed banned.yaml and compiles its matchers. An entry may appear in one list only. */
export function loadBannedTerms(parsed: unknown): Result<BannedTerms> {
  const result = BannedFileSchema.safeParse(parsed);
  if (!result.success) return fail(issuesFromZod(result.error));

  const issues: ValidationIssue[] = [];
  const entries: BannedEntry[] = [];
  const seen = new Map<string, BannedList>();
  for (const list of BANNED_LISTS) {
    result.data[list].forEach((term, index) => {
      const earlier = seen.get(term);
      if (earlier !== undefined) {
        issues.push({
          field: `${list}.${index}`,
          message: `"${term}" is listed twice (also in ${earlier})`,
        });
        return;
      }
      seen.set(term, list);
      entries.push({ term, list, pattern: compile(term) });
    });
  }
  if (issues.length > 0) return fail(issues);
  return ok({ version: result.data.banned_version, entries });
}

/** Every banned entry in `text`, ordered by position, then by term. Overlapping entries all count. */
export function findBannedTerms(text: string, banned: BannedTerms): BannedHit[] {
  const hits: BannedHit[] = [];
  for (const entry of banned.entries) {
    for (const found of text.matchAll(entry.pattern)) {
      hits.push({ term: entry.term, list: entry.list, index: found.index, text: found[0] });
    }
  }
  return hits.sort((a, b) => a.index - b.index || (a.term < b.term ? -1 : a.term > b.term ? 1 : 0));
}

/** Thrown by `assertNoBannedTerms`. `hits` lists every match. */
export class BannedTermError extends Error {
  readonly hits: readonly BannedHit[];

  constructor(hits: readonly BannedHit[]) {
    const terms = [...new Set(hits.map((hit) => `"${hit.term}"`))].join(", ");
    super(`banned term${hits.length === 1 ? "" : "s"} found: ${terms}`);
    this.name = "BannedTermError";
    this.hits = hits;
  }
}

/**
 * Throws a `BannedTermError` when `text` contains a banned entry. Run it on text we author (taxonomy terms,
 * vault note text, rendered result screens: C2). Strain names and aliases are exempt (C1), and so is OCR
 * input read from packages.
 */
export function assertNoBannedTerms(text: string, banned: BannedTerms): void {
  const hits = findBannedTerms(text, banned);
  if (hits.length > 0) throw new BannedTermError(hits);
}
