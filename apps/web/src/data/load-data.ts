// Loads the built strain data (docs/04 "Build output"): latest.json → manifest → strains, taxonomy, breeders.
// Everything is validated before the UI sees it. Only our own /data/ files are fetched (no other network).
import {
  type BuildManifest,
  BuildManifestSchema,
  buildIndex,
  FacetSchema,
  type MatchIndex,
  NodeIdSchema,
  PolaritySchema,
  SlugSchema,
  type StrainRecord,
  StrainsFileSchema,
  TermStatusSchema,
} from "@flowerscan/core";
import { z } from "zod";

const HASH = /^[0-9a-f]{8,64}$/;
const NonBlank = z.string().regex(/\S/, { error: "must not be blank" });

/** `latest.json`. Core has no schema for it (or for the two below), so they live here, shaped by docs/04. */
export const LatestSchema = z.strictObject({
  data_version: NonBlank,
  hash: z.string().regex(HASH),
  manifest: z.string(),
});

/** One term in the shipped `taxonomy.json` (`synonyms` don't ship; `replaced_by` is null when active). */
export const ShippedTermSchema = z.strictObject({
  slug: SlugSchema,
  facet: FacetSchema,
  label: NonBlank,
  polarity: PolaritySchema,
  description: NonBlank,
  status: TermStatusSchema,
  replaced_by: SlugSchema.nullable(),
});
export type ShippedTerm = z.infer<typeof ShippedTermSchema>;

export const ShippedTaxonomySchema = z.strictObject({
  taxonomy_version: z.int().min(1),
  terms: z.array(ShippedTermSchema),
});

export const ShippedBreedersSchema = z.array(z.strictObject({ id: NodeIdSchema, name: NonBlank }));

/** Everything the screens need, validated and indexed once. */
export interface StrainData {
  readonly manifest: BuildManifest;
  /** True for builds that include unverified notes (data_version ends with "-dev", D19). */
  readonly isBeta: boolean;
  readonly strains: readonly StrainRecord[];
  readonly byId: ReadonlyMap<string, StrainRecord>;
  readonly terms: ReadonlyMap<string, ShippedTerm>;
  /** Taxonomy terms in file order (for /about#tags). */
  readonly termList: readonly ShippedTerm[];
  readonly breeders: ReadonlyMap<string, string>;
  readonly index: MatchIndex;
}

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export class DataLoadError extends Error {
  override readonly name = "DataLoadError";
}

async function getJson(fetcher: Fetcher, url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetcher(url, init);
  if (!response.ok) throw new DataLoadError(`${url}: HTTP ${response.status}`);
  return response.json();
}

function parse<T>(schema: z.ZodType<T>, value: unknown, what: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new DataLoadError(`${what} failed validation: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/** Fetches and validates one build. Throws DataLoadError on any network, HTTP or validation problem. */
export async function loadStrainData(fetcher: Fetcher, base = "/data"): Promise<StrainData> {
  // latest.json changes with every build; the hashed folder never does.
  const latest = parse(
    LatestSchema,
    await getJson(fetcher, `${base}/latest.json`, { cache: "no-cache" }),
    "latest.json",
  );
  if (latest.manifest !== `${latest.hash}/manifest.json`) {
    throw new DataLoadError("latest.json points at an unexpected manifest path");
  }
  const folder = `${base}/${latest.hash}`;
  const manifest = parse(
    BuildManifestSchema,
    await getJson(fetcher, `${base}/${latest.manifest}`),
    "manifest.json",
  );
  if (manifest.hash !== latest.hash || manifest.data_version !== latest.data_version) {
    throw new DataLoadError("manifest.json doesn't match latest.json");
  }

  const [strainsRaw, taxonomyRaw, breedersRaw] = await Promise.all([
    getJson(fetcher, `${folder}/strains.json`),
    getJson(fetcher, `${folder}/taxonomy.json`),
    getJson(fetcher, `${folder}/breeders.json`),
  ]);
  const strains = parse(StrainsFileSchema, strainsRaw, "strains.json");
  const taxonomy = parse(ShippedTaxonomySchema, taxonomyRaw, "taxonomy.json");
  const breeders = parse(ShippedBreedersSchema, breedersRaw, "breeders.json");
  if (taxonomy.taxonomy_version !== manifest.taxonomy_version) {
    throw new DataLoadError("taxonomy.json doesn't match the manifest");
  }

  return {
    manifest,
    isBeta: manifest.data_version.endsWith("-dev"),
    strains,
    byId: new Map(strains.map((strain) => [strain.id, strain])),
    terms: new Map(taxonomy.terms.map((term) => [term.slug, term])),
    termList: taxonomy.terms,
    breeders: new Map(breeders.map((breeder) => [breeder.id, breeder.name])),
    index: buildIndex(strains),
  };
}
