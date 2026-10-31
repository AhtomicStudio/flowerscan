// Token-run lookup for the label lexicons. Phrases and label text are compared as normalized,
// confusion-folded tokens (docs/06 §4), so OCR misreads such as `lNDICA` or `C00KIES` still hit.
import { foldNormalized, tokenize } from "../../match/normalize";

/** Normalized, confusion-folded tokens of `text`. */
export function foldedTokens(text: string): string[] {
  const normal = tokenize(text).join(" ");
  if (normal === "") return [];
  return foldNormalized(normal).split(" ");
}

export interface Phrase<T> {
  readonly tokens: readonly string[];
  readonly value: T;
}

/** Phrases grouped by first token, longest first, so lookups are greedy. */
export type PhraseIndex<T> = ReadonlyMap<string, readonly Phrase<T>[]>;

/** Builds a phrase index. When two entries fold to the same tokens, the first one wins. */
export function phraseIndex<T>(entries: readonly (readonly [string, T])[]): PhraseIndex<T> {
  const byFirst = new Map<string, Phrase<T>[]>();
  const seen = new Set<string>();
  for (const [text, value] of entries) {
    const tokens = foldedTokens(text);
    const key = tokens.join(" ");
    const first = tokens[0];
    if (first === undefined || seen.has(key)) continue;
    seen.add(key);
    const list = byFirst.get(first) ?? [];
    list.push({ tokens, value });
    byFirst.set(first, list);
  }
  for (const list of byFirst.values()) list.sort((a, b) => b.tokens.length - a.tokens.length);
  return byFirst;
}

export interface PhraseHit<T> {
  /** First token of the hit (inclusive). */
  readonly start: number;
  /** One past the last token. */
  readonly end: number;
  readonly value: T;
}

/** Greedy, longest-first, non-overlapping phrase hits over folded tokens, left to right. */
export function findPhrases<T>(tokens: readonly string[], index: PhraseIndex<T>): PhraseHit<T>[] {
  const hits: PhraseHit<T>[] = [];
  let position = 0;
  while (position < tokens.length) {
    const candidates = index.get(tokens[position] ?? "") ?? [];
    const found = candidates.find((phrase) =>
      phrase.tokens.every((token, offset) => tokens[position + offset] === token),
    );
    if (found === undefined) {
      position += 1;
      continue;
    }
    hits.push({ start: position, end: position + found.tokens.length, value: found.value });
    position += found.tokens.length;
  }
  return hits;
}

/** True when `tokens` contains `phrase` as a contiguous run. */
export function containsPhrase(tokens: readonly string[], phrase: readonly string[]): boolean {
  if (phrase.length === 0 || phrase.length > tokens.length) return false;
  for (let start = 0; start + phrase.length <= tokens.length; start += 1) {
    if (phrase.every((token, offset) => tokens[start + offset] === token)) return true;
  }
  return false;
}
