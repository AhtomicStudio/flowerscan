// Trigram inverted index over strain names and aliases (docs/06 §5).
import { foldNormalized, numberTokens, tokenize } from "./normalize";
import { distinct, trigrams } from "./similarity";

/**
 * What the matcher needs from a search entry. `StrainRecord` fits as is. `popularity` (0–1,
 * default 0) feeds the tiny tie-break prior; it never changes a score.
 */
export interface MatchRecord {
  readonly id: string;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly popularity?: number;
}

/** @internal One searchable spelling: a name or an alias of an entry. */
export interface IndexKey {
  readonly entry: number;
  /** The name or alias exactly as written in the data. */
  readonly text: string;
  readonly normal: string;
  readonly folded: string;
  readonly tokens: readonly string[];
  readonly foldedTokens: readonly string[];
  readonly distinctTokens: readonly string[];
  readonly distinctFoldedTokens: readonly string[];
  readonly numbers: string;
  readonly normalTrigramCount: number;
  readonly foldedTrigramCount: number;
}

/** @internal */
export interface IndexEntry {
  readonly id: string;
  readonly name: string;
  readonly popularity: number;
  /** This entry's keys are keys[keyStart] up to (not including) keys[keyEnd]. */
  readonly keyStart: number;
  readonly keyEnd: number;
}

/** Built once on data load with `buildIndex`. Treat it as opaque. */
export interface MatchIndex {
  readonly entries: readonly IndexEntry[];
  readonly keys: readonly IndexKey[];
  /** Normalized key → key positions. */
  readonly exact: ReadonlyMap<string, readonly number[]>;
  /** Confusion-folded key → key positions. */
  readonly foldedExact: ReadonlyMap<string, readonly number[]>;
  readonly normalPostings: ReadonlyMap<string, readonly number[]>;
  readonly foldedPostings: ReadonlyMap<string, readonly number[]>;
}

/**
 * Indexes every entry's name and aliases under their normalized and confusion-folded keys.
 * Spellings that normalize to the same key are indexed once per entry. Throws a RangeError on a
 * duplicate id.
 */
export function buildIndex(records: readonly MatchRecord[]): MatchIndex {
  const entries: IndexEntry[] = [];
  const keys: IndexKey[] = [];
  const exact = new Map<string, number[]>();
  const foldedExact = new Map<string, number[]>();
  const normalPostings = new Map<string, number[]>();
  const foldedPostings = new Map<string, number[]>();
  const ids = new Set<string>();

  for (const record of records) {
    if (ids.has(record.id)) throw new RangeError(`duplicate strain id ${record.id}`);
    ids.add(record.id);
    const entry = entries.length;
    const keyStart = keys.length;

    const seen = new Set<string>();
    for (const text of [record.name, ...record.aliases]) {
      const tokens = tokenize(text);
      const normal = tokens.join(" ");
      if (normal === "" || seen.has(normal)) continue;
      seen.add(normal);
      const folded = foldNormalized(normal);
      const foldedTokens = folded.split(" ");
      const normalTrigrams = trigrams(normal);
      const foldedTrigrams = trigrams(folded);
      const position = keys.length;
      keys.push({
        entry,
        text,
        normal,
        folded,
        tokens,
        foldedTokens,
        distinctTokens: distinct(tokens),
        distinctFoldedTokens: distinct(foldedTokens),
        numbers: numberTokens(tokens).join(" "),
        normalTrigramCount: normalTrigrams.length,
        foldedTrigramCount: foldedTrigrams.length,
      });
      push(exact, normal, position);
      push(foldedExact, folded, position);
      for (const trigram of normalTrigrams) push(normalPostings, trigram, position);
      for (const trigram of foldedTrigrams) push(foldedPostings, trigram, position);
    }
    entries.push({
      id: record.id,
      name: record.name,
      popularity: popularityOf(record.popularity),
      keyStart,
      keyEnd: keys.length,
    });
  }
  return { entries, keys, exact, foldedExact, normalPostings, foldedPostings };
}

function push(map: Map<string, number[]>, key: string, value: number): void {
  const list = map.get(key);
  if (list === undefined) map.set(key, [value]);
  else list.push(value);
}

function popularityOf(popularity: number | undefined): number {
  if (popularity === undefined || !Number.isFinite(popularity)) return 0;
  return Math.min(1, Math.max(0, popularity));
}
