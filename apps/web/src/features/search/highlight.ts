// Which parts of a name to bold for a query: the start of each word that a query word starts.
// Display only; matching itself is core's `search`.

export interface Segment {
  readonly text: string;
  readonly hit: boolean;
}

const WORD = /[\p{L}\p{N}]+/gu;

function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Splits `text` into segments, marking each word's prefix that matches a query word ("blu dre" →
 * **Blu**e **Dre**am). Typos that don't share a prefix simply aren't highlighted.
 */
export function highlight(text: string, query: string): Segment[] {
  const words = (fold(query).match(WORD) ?? []).filter((w) => w.length > 0);
  if (words.length === 0) return [{ text, hit: false }];
  const segments: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(WORD)) {
    const start = match.index;
    const token = fold(match[0]);
    let length = 0;
    for (const word of words) {
      if (token.startsWith(word) && word.length > length) length = word.length;
    }
    // Folding can change the length (ligatures); only highlight when it maps one to one.
    if (length === 0 || fold(match[0]).length !== match[0].length) continue;
    if (start > last) segments.push({ text: text.slice(last, start), hit: false });
    segments.push({ text: text.slice(start, start + length), hit: true });
    last = start + length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), hit: false });
  return segments;
}
