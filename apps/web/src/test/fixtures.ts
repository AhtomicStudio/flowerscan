// FICTIONAL test data (names like the T-021 mockup's). Shapes follow docs/04 build output exactly, and the
// lineage objects follow the D15 bands, so they pass the core schemas. Never real strain facts.
import type { InlineCross, Lineage, StrainRecord } from "@flowerscan/core";
import type { Fetcher } from "../data/load-data";

const HASH = "a1b2c3d4e5f6";

function lineage(
  sativa: number | null,
  method: Lineage["method"],
  level: Lineage["confidence_level"],
): Lineage {
  if (sativa === null) {
    return {
      sativa_pct: null,
      indica_pct: null,
      label: "unknown",
      sublabel: null,
      confidence: 0,
      confidence_level: "none",
      method: "unknown",
      algo_version: 2,
    };
  }
  const label = sativa < 50 ? "indica" : sativa > 50 ? "sativa" : "hybrid";
  const sublabel =
    sativa <= 20 || sativa >= 80
      ? null
      : sativa < 50
        ? "indica-dominant"
        : sativa === 50
          ? "balanced"
          : "sativa-dominant";
  const confidence = level === "high" ? 0.95 : level === "medium" ? 0.6 : 0.3;
  return {
    sativa_pct: sativa,
    indica_pct: 100 - sativa,
    label,
    sublabel,
    confidence,
    confidence_level: level,
    method,
    algo_version: 2,
  };
}

function record(partial: Partial<StrainRecord> & Pick<StrainRecord, "id" | "name">): StrainRecord {
  return {
    aliases: [],
    kind: "strain",
    parents: ["unknown"],
    parent_weights: null,
    derivation: null,
    reported_type: "unknown",
    breeder_id: null,
    effects: [],
    flavors: [],
    terpenes: [],
    verification: "unverified",
    lineage: lineage(null, "unknown", "none"),
    source_count: 1,
    ...partial,
  };
}

const landrace = (id: string, name: string, sativa: number) =>
  record({
    id,
    name,
    kind: "landrace",
    parents: [],
    derivation: null,
    reported_type: sativa > 50 ? "sativa" : "indica",
    lineage: lineage(sativa, "traced", "high"),
    source_count: 2,
  });

const crossKC: InlineCross = {
  kind: "cross",
  id: "landrace-k-x-landrace-c",
  name: "Landrace K x Landrace C",
  parents: ["landrace-k", "landrace-c"],
  parent_weights: null,
  derivation: "cross",
  reported_type: "unknown",
  verification: "unverified",
  lineage: lineage(50, "traced", "high"),
};

export const STRAINS: StrainRecord[] = [
  landrace("landrace-k", "Landrace K", 10),
  landrace("landrace-t", "Landrace T", 90),
  landrace("landrace-c", "Landrace C", 90),
  record({
    id: "strain-a",
    name: "Strain A",
    parents: ["landrace-k", "landrace-t"],
    derivation: "cross",
    reported_type: "balanced",
    verification: "disputed",
    lineage: lineage(50, "traced", "high"),
    source_count: 3,
  }),
  // Sativa, traced, with effects, a negative effect, an alias and a breeder.
  record({
    id: "kestrel-haze",
    name: "Kestrel Haze",
    aliases: ["K. Haze"],
    parents: ["strain-a", "landrace-c"],
    derivation: "cross",
    reported_type: "sativa-dominant",
    breeder_id: "breeder-x",
    effects: ["uplifted", "creative", "dry-mouth"],
    flavors: ["pine"],
    lineage: lineage(70, "traced", "high"),
    source_count: 5,
  }),
  // Indica, partly traced, zero tags, an unknown parent and a disputed ancestor (Strain A).
  record({
    id: "marsh-wren",
    name: "Marsh Wren",
    parents: ["strain-a", "unknown"],
    derivation: "cross",
    reported_type: "balanced",
    lineage: lineage(40, "partial", "medium"),
    source_count: 3,
  }),
  // Reported type only.
  record({
    id: "sandpiper",
    name: "Sandpiper",
    reported_type: "indica",
    effects: ["relaxed", "hungry"],
    lineage: lineage(10, "reported", "medium"),
    source_count: 2,
  }),
  // Unknown lineage.
  record({ id: "night-heron", name: "Night Heron" }),
  // Hybrid (exactly balanced) through an inline cross.
  record({
    id: "teal-finch",
    name: "Teal Finch",
    parents: [crossKC, "strain-a"],
    derivation: "cross",
    reported_type: "balanced",
    effects: ["happy"],
    lineage: lineage(50, "traced", "high"),
    source_count: 4,
  }),
  // Many tags: "+N more".
  record({
    id: "goldcrest",
    name: "Goldcrest",
    reported_type: "indica-dominant",
    effects: [
      "relaxed",
      "calm",
      "happy",
      "euphoric",
      "uplifted",
      "creative",
      "focused",
      "energetic",
      "talkative",
      "giggly",
      "dry-mouth",
      "dry-eyes",
    ],
    lineage: lineage(30, "reported", "medium"),
    source_count: 6,
  }),
];

const effect = (slug: string, label: string, polarity: "positive" | "neutral" | "negative") => ({
  slug,
  facet: "effect" as const,
  label,
  polarity,
  description: `Often described as ${label.toLowerCase()} (test description).`,
  status: "active" as const,
  replaced_by: null,
});

export const TAXONOMY = {
  taxonomy_version: 1,
  terms: [
    effect("relaxed", "Relaxed", "positive"),
    effect("calm", "Calm", "positive"),
    effect("happy", "Happy", "positive"),
    effect("euphoric", "Euphoric", "positive"),
    effect("uplifted", "Uplifted", "positive"),
    effect("creative", "Creative", "positive"),
    effect("focused", "Focused", "positive"),
    effect("energetic", "Energetic", "positive"),
    effect("talkative", "Talkative", "neutral"),
    effect("giggly", "Giggly", "neutral"),
    effect("hungry", "Hungry", "neutral"),
    effect("dry-mouth", "Dry mouth", "negative"),
    effect("dry-eyes", "Dry eyes", "negative"),
    {
      slug: "pine",
      facet: "flavor" as const,
      label: "Pine",
      polarity: "neutral" as const,
      description: "Often described as smelling of pine needles (test description).",
      status: "active" as const,
      replaced_by: null,
    },
  ],
};

export const BREEDERS = [{ id: "breeder-x", name: "Breeder X" }];

export function manifest(dataVersion: string) {
  return {
    data_version: dataVersion,
    built_at: "2026-10-27T00:00:00Z",
    algo_version: 2,
    taxonomy_version: 1,
    counts: { strains: 7, landraces: 3, crosses: 1, taxonomy_terms: TAXONOMY.terms.length },
    hash: HASH,
  };
}

export interface FakeFetch {
  readonly fetcher: Fetcher;
  readonly calls: string[];
  /** Makes the next calls fail (network error) until set back to false. */
  fail: boolean;
}

/** A fetcher that serves the fixture build. `overrides` replaces whole files by name. */
export function fakeFetch(
  options: { dataVersion?: string; overrides?: Partial<Record<string, unknown>> } = {},
): FakeFetch {
  const dataVersion = options.dataVersion ?? `2026.10.27-${HASH.slice(0, 6)}-dev`;
  const files: Record<string, unknown> = {
    "/data/latest.json": {
      data_version: dataVersion,
      hash: HASH,
      manifest: `${HASH}/manifest.json`,
    },
    [`/data/${HASH}/manifest.json`]: manifest(dataVersion),
    [`/data/${HASH}/strains.json`]: STRAINS,
    [`/data/${HASH}/taxonomy.json`]: TAXONOMY,
    [`/data/${HASH}/breeders.json`]: BREEDERS,
  };
  for (const [name, value] of Object.entries(options.overrides ?? {})) {
    const key = Object.keys(files).find((k) => k.endsWith(`/${name}`));
    if (key !== undefined) files[key] = value;
  }
  const state: FakeFetch = {
    calls: [],
    fail: false,
    fetcher: async (url) => {
      state.calls.push(url);
      if (state.fail) throw new TypeError("Failed to fetch");
      const body = files[url];
      return {
        ok: body !== undefined,
        status: body === undefined ? 404 : 200,
        json: async () => structuredClone(body),
      } as Response;
    },
  };
  return state;
}
