// Fixtures for the matcher tests. Names and aliases come from docs/research/2026-10-26-domain-review.md
// §2.1/§2.4 (test fixtures only; the vault still needs sources for every alias).
import { buildIndex, type MatchCandidate, type MatchRecord } from "../../src/match";

const strain = (id: string, name: string, aliases: string[] = []): MatchRecord => ({
  id,
  name,
  aliases,
});

/** Every canonical name in the §2.4 table plus the siblings its "why" column names. */
export const NAMING_RECORDS: readonly MatchRecord[] = [
  strain("gorilla-glue-1", "Gorilla Glue #1", ["GG1", "Sister Glue"]),
  strain("gorilla-glue-4", "Gorilla Glue #4", ["GG4", "Original Glue"]),
  strain("gorilla-glue-5", "Gorilla Glue #5", ["GG5", "New Glue"]),
  strain("girl-scout-cookies", "Girl Scout Cookies", ["GSC"]),
  strain("thin-mint-gsc", "Thin Mint GSC"),
  strain("gsc-forum-cut", "GSC (Forum Cut)"),
  strain("gmo", "GMO", ["Garlic Cookies"]),
  strain("gelato", "Gelato"),
  strain("gelato-33", "Gelato #33", ["Larry Bird"]),
  strain("gelato-41", "Gelato #41"),
  strain("gelato-43", "Gelato #43"),
  strain("zkittlez", "Zkittlez", ["The Original Z", "Skittlez"]),
  strain("chemdawg", "Chemdawg", ["Chem Dog"]),
  strain("chem-91", "Chem 91"),
  strain("chem-d", "Chem D"),
  strain("chem-4", "Chem 4"),
  strain("chems-sister", "Chem's Sister"),
  strain("green-crack", "Green Crack", ["Green Crush", "Mango Crack"]),
  strain("sunset-sherbet", "Sunset Sherbet", ["Sunset Sherbert"]),
  strain("sherbet", "Sherbet"),
  strain("wedding-cake", "Wedding Cake", ["Triangle Mints #23"]),
  strain("mac", "MAC", ["Miracle Alien Cookies"]),
  strain("mac-1", "MAC 1"),
  strain("runtz", "Runtz"),
  strain("white-runtz", "White Runtz"),
  strain("blue-dream", "Blue Dream"),
  strain("jack-herer", "Jack Herer"),
  strain("ak-47", "AK-47"),
  strain("hash-plant", "Hash Plant"),
  strain("sfv-og", "SFV OG"),
  strain("og-kush", "OG Kush"),
  strain("purple-punch", "Purple Punch"),
  strain("granddaddy-purple", "Granddaddy Purple", ["GDP"]),
];

export const namingIndex = buildIndex(NAMING_RECORDS);

/**
 * A stand-in for Extract (docs/06 §3, T-011): every contiguous 1–5 token n-gram of each line, plus
 * each pair of adjacent lines joined (wrapped names). Every candidate has weight 1.
 */
export function labelCandidates(lines: readonly string[]): MatchCandidate[] {
  const texts: string[] = [];
  for (const line of lines) {
    const tokens = line.split(/\s+/).filter((token) => token !== "");
    for (let size = 1; size <= 5; size += 1) {
      for (let start = 0; start + size <= tokens.length; start += 1) {
        texts.push(tokens.slice(start, start + size).join(" "));
      }
    }
  }
  for (let line = 0; line + 1 < lines.length; line += 1) {
    texts.push(`${lines[line]} ${lines[line + 1]}`);
  }
  return texts.map((text) => ({ text, weight: 1 }));
}

/** A URL slug as Extract would read it: path separators become spaces. */
export function slugLine(slug: string): string {
  return slug.replace(/[-_/]+/g, " ");
}

/** Mulberry32: a tiny seeded PRNG, so generated tests are deterministic. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = [
  "amber",
  "apple",
  "banana",
  "berry",
  "black",
  "blue",
  "bubba",
  "burger",
  "candy",
  "cherry",
  "chem",
  "citrus",
  "cookie",
  "cream",
  "crimson",
  "diesel",
  "dream",
  "durban",
  "fire",
  "frost",
  "fruit",
  "funk",
  "garlic",
  "gelato",
  "ghost",
  "ginger",
  "glue",
  "golden",
  "grape",
  "green",
  "haze",
  "honey",
  "ice",
  "jack",
  "jelly",
  "kush",
  "lemon",
  "lime",
  "mango",
  "maple",
  "melon",
  "mint",
  "moon",
  "mountain",
  "nebula",
  "night",
  "ocean",
  "orange",
  "papaya",
  "peach",
  "pepper",
  "pine",
  "pink",
  "plum",
  "punch",
  "purple",
  "queen",
  "rain",
  "red",
  "river",
  "rose",
  "royal",
  "sage",
  "silver",
  "skunk",
  "smoke",
  "snow",
  "sour",
  "space",
  "spice",
  "star",
  "storm",
  "sugar",
  "sun",
  "sunset",
  "sweet",
  "tangie",
  "thunder",
  "tropic",
  "truffle",
  "velvet",
  "violet",
  "walker",
  "white",
  "wild",
  "wonder",
  "zest",
  "zkittle",
  "breath",
  "cake",
];

/** `count` synthetic strains with deterministic names: 2–3 words, sometimes a `#N` pheno. */
export function syntheticRecords(count: number, seed: number): MatchRecord[] {
  const random = seededRandom(seed);
  const pick = () => WORDS[Math.floor(random() * WORDS.length)] as string;
  const records: MatchRecord[] = [];
  const names = new Set<string>();
  while (records.length < count) {
    const words = [pick(), pick()];
    if (random() < 0.4) words.push(pick());
    let name = words.map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ");
    if (random() < 0.25) name += ` #${1 + Math.floor(random() * 99)}`;
    if (names.has(name)) continue;
    names.add(name);
    const aliases =
      random() < 0.3
        ? [
            words
              .map((word) => word.slice(0, 1))
              .join("")
              .toUpperCase(),
          ]
        : [];
    records.push({
      id: `s-${records.length}`,
      name,
      aliases,
      popularity: Math.floor(random() * 100) / 100,
    });
  }
  return records;
}
