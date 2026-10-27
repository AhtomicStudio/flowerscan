// Serializes a compiled build into its content-hashed files. Deterministic: same data → same bytes.
import { createHash } from "node:crypto";
import { ALGO_VERSION, type BuildManifest, BuildManifestSchema } from "@flowerscan/core";
import type { BuildData } from "./types";

/** Hex characters of the SHA-256 content hash used as the folder name (the schema allows 8–64). */
export const HASH_LENGTH = 12;

export interface OutputFile {
  readonly name: string;
  readonly content: string;
}

export interface EmittedBuild {
  readonly hash: string;
  readonly manifest: BuildManifest;
  /** Files for `<out>/<hash>/`, in write order. */
  readonly files: readonly OutputFile[];
  /** `<out>/latest.json`: points the app at the new folder. */
  readonly latest: OutputFile;
}

export interface EmitOptions {
  /** ISO datetime for `built_at`. Defaults to the vault's latest note date at 00:00 UTC. */
  readonly builtAt?: string | undefined;
  /** Dev builds (`--include-unverified`) get a `-dev` suffix on `data_version`. */
  readonly includeUnverified: boolean;
}

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

/**
 * The hash covers the shipped data files (`strains.json`, `breeders.json`, `taxonomy.json`), which already
 * carry the algorithm version in every lineage. `manifest.json` isn't hashed, so `built_at` can come
 * from an input without changing the folder name.
 */
export function emitBuild(data: BuildData, options: EmitOptions): EmittedBuild {
  const dataFiles: OutputFile[] = [
    { name: "strains.json", content: json(data.strains) },
    { name: "breeders.json", content: json(data.breeders) },
    { name: "taxonomy.json", content: json(data.taxonomy) },
  ];
  const digest = createHash("sha256");
  for (const file of dataFiles) {
    digest.update(`${file.name}\n${Buffer.byteLength(file.content)}\n`);
    digest.update(file.content);
  }
  const hash = digest.digest("hex").slice(0, HASH_LENGTH);

  const builtAt = options.builtAt ?? `${data.dataDate}T00:00:00Z`;
  const date = builtAt.slice(0, 10).replaceAll("-", ".");
  const manifest = BuildManifestSchema.parse({
    data_version: `${date}-${hash.slice(0, 6)}${options.includeUnverified ? "-dev" : ""}`,
    built_at: builtAt,
    algo_version: ALGO_VERSION,
    taxonomy_version: data.taxonomy.taxonomy_version,
    counts: data.counts,
    hash,
  });

  return {
    hash,
    manifest,
    files: [{ name: "manifest.json", content: json(manifest) }, ...dataFiles],
    latest: {
      name: "latest.json",
      content: json({
        data_version: manifest.data_version,
        hash,
        manifest: `${hash}/manifest.json`,
      }),
    },
  };
}
