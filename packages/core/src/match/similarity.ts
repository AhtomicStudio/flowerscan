// String similarity measures for the docs/06 §5 score.

/** Distinct character trigrams of `" " + text + " "`, in first-seen order. */
export function trigrams(text: string): string[] {
  const padded = ` ${text} `;
  const seen = new Set<string>();
  for (let index = 0; index + 3 <= padded.length; index += 1) {
    seen.add(padded.slice(index, index + 3));
  }
  return [...seen];
}

/** Jaccard index of two trigram sets, given their sizes and the size of their intersection. */
export function jaccardFromCounts(sizeA: number, sizeB: number, shared: number): number {
  const union = sizeA + sizeB - shared;
  return union === 0 ? 0 : shared / union;
}

/** Jaro similarity (0–1). */
export function jaro(a: string, b: string): number {
  if (a === b) return 1;
  const lengthA = a.length;
  const lengthB = b.length;
  if (lengthA === 0 || lengthB === 0) return 0;
  // Bitmask flags for the common short case (no allocation); typed arrays beyond 31 characters.
  if (lengthA <= 31 && lengthB <= 31) return jaroShort(a, b);
  return jaroLong(a, b);
}

function jaroShort(a: string, b: string): number {
  const lengthA = a.length;
  const lengthB = b.length;
  const window = Math.max(0, Math.floor(Math.max(lengthA, lengthB) / 2) - 1);
  let matchedA = 0;
  let matchedB = 0;
  let matches = 0;
  for (let i = 0; i < lengthA; i += 1) {
    const from = Math.max(0, i - window);
    const to = Math.min(lengthB - 1, i + window);
    const code = a.charCodeAt(i);
    for (let j = from; j <= to; j += 1) {
      if ((matchedB & (1 << j)) === 0 && code === b.charCodeAt(j)) {
        matchedA |= 1 << i;
        matchedB |= 1 << j;
        matches += 1;
        break;
      }
    }
  }
  if (matches === 0) return 0;
  let halfTranspositions = 0;
  let k = 0;
  for (let i = 0; i < lengthA; i += 1) {
    if ((matchedA & (1 << i)) === 0) continue;
    while ((matchedB & (1 << k)) === 0) k += 1;
    if (a.charCodeAt(i) !== b.charCodeAt(k)) halfTranspositions += 1;
    k += 1;
  }
  return jaroFormula(matches, halfTranspositions, lengthA, lengthB);
}

function jaroLong(a: string, b: string): number {
  const lengthA = a.length;
  const lengthB = b.length;
  const window = Math.max(0, Math.floor(Math.max(lengthA, lengthB) / 2) - 1);
  const matchedA = new Uint8Array(lengthA);
  const matchedB = new Uint8Array(lengthB);
  let matches = 0;
  for (let i = 0; i < lengthA; i += 1) {
    const from = Math.max(0, i - window);
    const to = Math.min(lengthB - 1, i + window);
    for (let j = from; j <= to; j += 1) {
      if (matchedB[j] === 0 && a.charCodeAt(i) === b.charCodeAt(j)) {
        matchedA[i] = 1;
        matchedB[j] = 1;
        matches += 1;
        break;
      }
    }
  }
  if (matches === 0) return 0;
  let halfTranspositions = 0;
  let k = 0;
  for (let i = 0; i < lengthA; i += 1) {
    if (matchedA[i] === 0) continue;
    while (matchedB[k] === 0) k += 1;
    if (a.charCodeAt(i) !== b.charCodeAt(k)) halfTranspositions += 1;
    k += 1;
  }
  return jaroFormula(matches, halfTranspositions, lengthA, lengthB);
}

function jaroFormula(
  matches: number,
  halfTranspositions: number,
  lengthA: number,
  lengthB: number,
) {
  const transpositions = halfTranspositions / 2;
  return (matches / lengthA + matches / lengthB + (matches - transpositions) / matches) / 3;
}

/** Jaro–Winkler similarity (0–1), prefix scale 0.1 over at most 4 characters. */
export function jaroWinkler(a: string, b: string): number {
  const base = jaro(a, b);
  let prefix = 0;
  const limit = Math.min(4, a.length, b.length);
  while (prefix < limit && a.charCodeAt(prefix) === b.charCodeAt(prefix)) prefix += 1;
  return base + prefix * 0.1 * (1 - base);
}

/**
 * Upper bound on `jaroWinkler` from the lengths alone: at most `min(|a|, |b|)` characters can
 * match. Lets the matcher skip pairs that can't reach the score floor.
 */
export function jaroWinklerBound(lengthA: number, lengthB: number): number {
  if (lengthA === 0 || lengthB === 0) return 0;
  const shortest = Math.min(lengthA, lengthB);
  const base = (shortest / lengthA + shortest / lengthB + 1) / 3;
  return base + 0.4 * (1 - base);
}

/** Distinct tokens, in first-seen order. */
export function distinct(tokens: readonly string[]): string[] {
  return [...new Set(tokens)];
}

/** Jaccard index of two token lists that are already distinct (see `distinct`). */
export function tokenOverlap(a: readonly string[], b: readonly string[]): number {
  let shared = 0;
  for (const token of a) if (b.includes(token)) shared += 1;
  return jaccardFromCounts(a.length, b.length, shared);
}

/** True if `inner` appears as a contiguous run inside `outer`. */
export function containsRun(outer: readonly string[], inner: readonly string[]): boolean {
  if (inner.length === 0 || inner.length > outer.length) return false;
  for (let start = 0; start + inner.length <= outer.length; start += 1) {
    let same = true;
    for (let offset = 0; offset < inner.length; offset += 1) {
      if (outer[start + offset] !== inner[offset]) {
        same = false;
        break;
      }
    }
    if (same) return true;
  }
  return false;
}
