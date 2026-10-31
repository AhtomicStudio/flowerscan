// OCR lines → strain-name candidates and package facts (docs/06 §3 "From OCR text", T-011).
//
// Match before stripping (P6): lexicon words (brands, product forms, category words, packaging
// filler) are tagged and down-weighted, not deleted. Candidates are built with every one of them
// present, and a candidate is dropped only when it is made of nothing but lexicon words, so
// `Cookies`, `Runtz`, `Hash Plant` and `Gelato Cake` survive inside longer names. What is never part
// of a strain name is stripped before candidates exist: warning blocks, potency, units and
// quantities, identifiers, dates and contact details.
import type { MatchCandidate } from "../match/match";
import { normalize } from "../match/normalize";
import type { PackageSays, ProductForm } from "../schema/enums";
import { extractPotency } from "./extract-potency";
import {
  QUALIFIER_PATTERNS,
  WARNING_PHRASES,
  WARNING_WORD_MIN,
  WARNING_WORDS,
} from "./lexicon/boilerplate";
import { BRANDS, type BrandEntry } from "./lexicon/brands";
import {
  CATEGORY_LETTER_PATTERN,
  CATEGORY_LETTERS,
  CATEGORY_WORDS,
  FIFTY_FIFTY_PATTERN,
} from "./lexicon/categories";
import {
  CONTACT_PATTERNS,
  LABELED_ID_PATTERN,
  NAMED_PARTY_PATTERN,
  STANDALONE_ID_PATTERNS,
} from "./lexicon/identifiers";
import { containsPhrase, findPhrases, foldedTokens, phraseIndex } from "./lexicon/phrases";
import { FILLER_WORDS, FORM_PRIORITY, FORM_WORDS } from "./lexicon/product-forms";
import { UNIT_PATTERNS } from "./lexicon/units";
import type { LabelFacts, OcrBox, OcrLine } from "./types";
import { MASK, strip, type WorkLine, workLine } from "./work-line";

/** Candidates are contiguous runs of 1 to this many tokens (docs/06 §3). */
export const CANDIDATE_MAX_TOKENS = 5;

/**
 * At most this many candidates (best weight first) go to the matcher, which keeps Extract + match
 * + decide inside the 50 ms budget (docs/06 "Stage budgets") on a 5,000-strain index.
 */
export const LABEL_MAX_CANDIDATES = 120;

/** A line at least this tall, relative to the tallest content line, is "large" (wrapped-name joins). */
export const LARGE_LINE_RATIO = 0.6;

/** How OCR confidence and relative line height blend into a line's weight (docs/06 §3). */
export const CANDIDATE_WEIGHT_BLEND = { confidence: 0.5, height: 0.5 } as const;

/**
 * Down-weighting of lexicon words inside a candidate (P6): weight × (1 − this × share of the
 * candidate's tokens that are lexicon words).
 */
export const SOFT_TOKEN_PENALTY = 0.5;

/** Neighbors of a warning line count as warning text when their heights are this close (min/max). */
const WARNING_NEIGHBOR_HEIGHT_RATIO = 0.75;

/** Field separators inside a line: masked spans, pipes, bullets, colons, commas, spaced dashes. */
const SEGMENT_BREAK = new RegExp(String.raw`[${MASK}|•·:;,]+|\s[/\-–—]+\s`, "u");
const HAS_ALNUM = /[\p{L}\p{N}]/u;
const HAS_LETTER = /\p{L}/u;

type LexiconTag =
  | { readonly kind: "brand"; readonly brand: BrandEntry }
  | { readonly kind: "category"; readonly says: PackageSays }
  | { readonly kind: "form"; readonly form: ProductForm | null }
  | { readonly kind: "filler" };

const LEXICON = phraseIndex<LexiconTag>([
  ...BRANDS.flatMap((brand) =>
    [brand.name, ...(brand.spellings ?? [])].map(
      (text) => [text, { kind: "brand", brand }] as const,
    ),
  ),
  ...CATEGORY_WORDS.map(([text, says]) => [text, { kind: "category", says }] as const),
  ...FORM_WORDS.map(([text, word]) => [text, { kind: "form", form: word.form }] as const),
  ...FILLER_WORDS.map((text) => [text, { kind: "filler" }] as const),
]);

const WARNING_PHRASE_TOKENS = WARNING_PHRASES.map(foldedTokens);
const WARNING_WORD_SET: ReadonlySet<string> = new Set(
  WARNING_WORDS.map((word) => foldedTokens(word).join(" ")),
);

interface Token {
  readonly raw: string;
  /** A lexicon word (P6): down-weighted, and a candidate of only these is dropped. */
  soft: boolean;
  readonly line: number;
}

interface Segment {
  readonly line: WorkLine;
  readonly tokens: Token[];
}

interface BrandSighting {
  readonly brand: BrandEntry;
  readonly segment: Segment;
  /** Indexes of the segment's tokens the brand covers. */
  readonly covered: readonly number[];
}

/**
 * Reads OCR lines (in reading order) into match candidates and package facts (docs/06 §3):
 *
 * - `candidates`: every contiguous 1–5 token run of each remaining line field, plus runs that cross
 *   from one large line into the next (names wrap: `BLUE` / `DREAM`). Weight = 0.5 × confidence +
 *   0.5 × height relative to the tallest content line, down-weighted for lexicon words (P6).
 * - `package_says`: three values only (P3, D18).
 * - `potency_readings`: exactly as printed (P2).
 * - `brand`: a known brand. A brand that is also a strain token (`Runtz`) counts only where it
 *   stands alone; a second standalone sighting, or one next to another known brand, is a name.
 * - `product_form`: the most specific form named (a "live resin cart" is a vape).
 *
 * Deterministic: the same lines always give the same facts, in the same order.
 */
export function parseLabelText(lines: readonly OcrLine[]): LabelFacts {
  const work = lines.map((line, index) =>
    workLine(index, line.text, line.confidence, line.height, line.bbox),
  );
  markWarnings(work);
  const live = work.filter((line) => !line.boilerplate);

  for (const line of live) {
    for (const pattern of QUALIFIER_PATTERNS) strip(line, pattern);
    for (const pattern of CONTACT_PATTERNS) strip(line, pattern);
    for (const pattern of STANDALONE_ID_PATTERNS) strip(line, pattern);
    strip(line, NAMED_PARTY_PATTERN);
    strip(line, LABELED_ID_PATTERN);
  }
  const potency_readings = extractPotency(live);

  const says: PackageSays[] = [];
  for (const line of live) {
    if (strip(line, FIFTY_FIFTY_PATTERN).length > 0) says.push("hybrid");
    for (const match of strip(line, CATEGORY_LETTER_PATTERN)) {
      const letter = (match[1] ?? match[2] ?? "").toLowerCase();
      const value = CATEGORY_LETTERS[letter];
      if (value !== undefined) says.push(value);
    }
    for (const pattern of UNIT_PATTERNS) strip(line, pattern);
  }

  const segments = live.flatMap(segmentsOf);
  const forms = new Set<ProductForm>();
  const sightings: BrandSighting[] = [];
  for (const segment of segments) tagSegment(segment, says, forms, sightings);
  const brand = resolveBrand(sightings);

  return {
    candidates: buildCandidates(live, segments),
    package_says: resolveSays(says),
    potency_readings,
    brand,
    product_form: FORM_PRIORITY.find((form) => forms.has(form)) ?? null,
  };
}

/** Marks state warning text (docs/06 §3 "compliance boilerplate") as boilerplate. */
function markWarnings(lines: WorkLine[]): void {
  const words = lines.map((line) => {
    const tokens = foldedTokens(line.masked);
    const phrase = WARNING_PHRASE_TOKENS.some((warning) => containsPhrase(tokens, warning));
    const count = tokens.filter((token) => WARNING_WORD_SET.has(token)).length;
    if (phrase || count >= WARNING_WORD_MIN) line.boilerplate = true;
    return count;
  });
  const flagged = lines.map((line) => line.boilerplate);
  lines.forEach((line, index) => {
    if (line.boilerplate) return;
    const before = index > 0 && flagged[index - 1] === true && closeHeights(line, lines[index - 1]);
    const after = flagged[index + 1] === true && closeHeights(line, lines[index + 1]);
    // Sandwiched between warning lines, or next to one and holding a warning word itself.
    if ((before && after) || ((before || after) && (words[index] ?? 0) > 0)) {
      line.boilerplate = true;
    }
  });
}

function closeHeights(a: WorkLine, b: WorkLine | undefined): boolean {
  if (b === undefined) return false;
  if (a.height === 0 || b.height === 0) return true;
  return (
    Math.min(a.height, b.height) / Math.max(a.height, b.height) >= WARNING_NEIGHBOR_HEIGHT_RATIO
  );
}

function segmentsOf(line: WorkLine): Segment[] {
  return line.masked
    .split(SEGMENT_BREAK)
    .map((text) => ({
      line,
      tokens: text
        .split(/\s+/u)
        .filter((raw) => HAS_ALNUM.test(raw) || raw === "×")
        .map((raw) => ({ raw, soft: false, line: line.index })),
    }))
    .filter((segment) => segment.tokens.length > 0);
}

/** Tags lexicon words in a segment and records the facts they carry. */
function tagSegment(
  segment: Segment,
  says: PackageSays[],
  forms: Set<ProductForm>,
  sightings: BrandSighting[],
): void {
  const folded: string[] = [];
  const owner: number[] = [];
  segment.tokens.forEach((token, index) => {
    for (const piece of foldedTokens(token.raw)) {
      folded.push(piece);
      owner.push(index);
    }
  });
  for (const hit of findPhrases(folded, LEXICON)) {
    const covered: number[] = [];
    segment.tokens.forEach((token, index) => {
      const pieces = owner.flatMap((tokenIndex, piece) => (tokenIndex === index ? [piece] : []));
      if (pieces.length > 0 && pieces.every((piece) => piece >= hit.start && piece < hit.end)) {
        token.soft = true;
        covered.push(index);
      }
    });
    const tag = hit.value;
    if (tag.kind === "category") says.push(tag.says);
    else if (tag.kind === "form" && tag.form !== null) forms.add(tag.form);
    else if (tag.kind === "brand") {
      const standalone = covered.length === segment.tokens.length;
      if (standalone || !tag.brand.strainToken) {
        sightings.push({ brand: tag.brand, segment, covered });
      }
    }
  }
}

/**
 * Picks the brand (docs/06 §3, P6). A brand that is not a strain token wins wherever it is seen;
 * then every standalone sighting of a strain-token brand is a name (a Runtz strain from another
 * brand). Otherwise the tallest strain-token sighting is the brand and any other standalone
 * sighting is a name (`RUNTZ` logo over a `RUNTZ` strain line). Name sightings stop being lexicon
 * words, so they become candidates.
 */
function resolveBrand(sightings: readonly BrandSighting[]): string | null {
  const plain = sightings.filter((sighting) => !sighting.brand.strainToken);
  const pool = plain.length > 0 ? plain : sightings;
  let chosen: BrandSighting | undefined;
  for (const sighting of pool) {
    if (chosen === undefined || sighting.segment.line.height > chosen.segment.line.height) {
      chosen = sighting;
    }
  }
  for (const sighting of sightings) {
    if (sighting === chosen || !sighting.brand.strainToken) continue;
    for (const index of sighting.covered) {
      const token = sighting.segment.tokens[index];
      if (token !== undefined) token.soft = false;
    }
  }
  return chosen?.brand.name ?? null;
}

/** D18: a lean names its side; bare hybrid wording is `hybrid`; both sides named → unknown (null). */
function resolveSays(says: readonly PackageSays[]): PackageSays | null {
  const sides = new Set(says.filter((value) => value !== "hybrid"));
  if (sides.size > 1) return null;
  const [side] = sides;
  if (side !== undefined) return side;
  return says.includes("hybrid") ? "hybrid" : null;
}

function buildCandidates(
  lines: readonly WorkLine[],
  segments: readonly Segment[],
): MatchCandidate[] {
  const content = lines.filter((line) => segments.some((segment) => segment.line === line));
  const tallest = Math.max(0, ...content.map((line) => line.height));
  const weights = new Map<number, number>();
  const large = new Set<number>();
  for (const line of content) {
    const relative = tallest === 0 ? 1 : line.height / tallest;
    weights.set(
      line.index,
      CANDIDATE_WEIGHT_BLEND.confidence * line.confidence +
        CANDIDATE_WEIGHT_BLEND.height * relative,
    );
    if (relative >= LARGE_LINE_RATIO) large.add(line.index);
  }

  const found = new Map<string, { text: string; weight: number; order: number }>();
  const offer = (tokens: readonly Token[]) => {
    const text = tokens.map((token) => token.raw).join(" ");
    const key = normalize(text);
    if (key.replaceAll(" ", "").length < 2 || !tokens.some((token) => HAS_LETTER.test(token.raw))) {
      return;
    }
    const soft = tokens.filter((token) => token.soft).length;
    if (soft === tokens.length) return;
    const lineWeight = Math.min(...tokens.map((token) => weights.get(token.line) ?? 0));
    const weight = lineWeight * (1 - (SOFT_TOKEN_PENALTY * soft) / tokens.length);
    const current = found.get(key);
    if (current === undefined) found.set(key, { text, weight, order: found.size });
    else if (weight > current.weight) found.set(key, { ...current, weight });
  };

  for (const segment of segments) {
    forEachRun(segment.tokens, (run) => offer(run));
  }
  for (const chain of wrappedChains(content, segments, large)) {
    forEachRun(chain, (run) => {
      const first = run[0];
      if (first !== undefined && run.some((token) => token.line !== first.line)) offer(run);
    });
  }

  return [...found.values()]
    .sort((a, b) => b.weight - a.weight || a.order - b.order)
    .slice(0, LABEL_MAX_CANDIDATES)
    .map(({ text, weight }) => ({ text, weight }));
}

function forEachRun(tokens: readonly Token[], visit: (run: readonly Token[]) => void): void {
  for (let start = 0; start < tokens.length; start += 1) {
    for (let size = 1; size <= CANDIDATE_MAX_TOKENS && start + size <= tokens.length; size += 1) {
      visit(tokens.slice(start, start + size));
    }
  }
}

/**
 * Token streams across adjacent large lines (docs/06 §3 cross-line join). A line passes a name on
 * from its last field and receives it into its first field, so a middle line must be one field.
 */
function wrappedChains(
  content: readonly WorkLine[],
  segments: readonly Segment[],
  large: ReadonlySet<number>,
): Token[][] {
  const fieldsOf = (line: WorkLine) => segments.filter((segment) => segment.line === line);
  const chains: Token[][] = [];
  let chain: { line: WorkLine; tokens: readonly Token[] }[] = [];
  const flush = () => {
    if (chain.length > 1) chains.push(chain.flatMap((part) => part.tokens));
  };
  for (const line of content) {
    const fields = fieldsOf(line);
    const firstField = fields[0]?.tokens ?? [];
    const lastField = fields.at(-1)?.tokens ?? [];
    const previous = chain.at(-1);
    if (previous !== undefined && joinable(previous.line, line, large)) {
      chain.push({ line, tokens: firstField });
      if (fields.length > 1) {
        flush();
        chain = [{ line, tokens: lastField }];
      }
    } else {
      flush();
      chain = [{ line, tokens: lastField }];
    }
  }
  flush();
  return chains;
}

function joinable(top: WorkLine, bottom: WorkLine, large: ReadonlySet<number>): boolean {
  if (!large.has(top.index) || !large.has(bottom.index)) return false;
  if (!validBox(top.bbox) || !validBox(bottom.bbox)) return true;
  const tall = Math.max(
    top.height,
    bottom.height,
    top.bbox.y1 - top.bbox.y0,
    bottom.bbox.y1 - bottom.bbox.y0,
  );
  const gap = bottom.bbox.y0 - top.bbox.y1;
  const overlap = Math.min(top.bbox.x1, bottom.bbox.x1) - Math.max(top.bbox.x0, bottom.bbox.x0);
  return gap >= -tall / 2 && gap <= tall && overlap > 0;
}

function validBox(box: OcrBox): boolean {
  return (
    [box.x0, box.y0, box.x1, box.y1].every(Number.isFinite) && box.x1 > box.x0 && box.y1 > box.y0
  );
}
