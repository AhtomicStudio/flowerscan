// File-system access for the build. Reads only the vault and the two taxonomy files, never
// data/observations/ (P2), and writes only the output folder and the report.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { isNotePath } from "./compile";
import type { EmittedBuild } from "./emit";
import { type PreviousBuild, snapshotsFrom } from "./report";
import type { DataFile, VaultFile } from "./types";
import { parseYaml } from "./yaml";

export class VaultPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VaultPathError";
  }
}

/**
 * Every note in the vault, sorted by path. Paths are vault-relative with `/` separators. Refuses a vault
 * inside an `observations` folder, and never descends into one.
 */
export async function listVaultFiles(vaultDir: string): Promise<VaultFile[]> {
  const root = resolve(vaultDir);
  if (root.split(sep).includes("observations")) {
    throw new VaultPathError(
      `${vaultDir}: the vault can't be inside an observations folder (P2: never read by the app build)`,
    );
  }
  const files: VaultFile[] = [];
  const walk = async (dir: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      const rel = relative(root, full).split(sep).join("/");
      if (entry.isDirectory()) {
        if (
          !entry.name.startsWith(".") &&
          entry.name !== "_templates" &&
          entry.name !== "observations"
        ) {
          await walk(full);
        }
      } else if (entry.isFile() && isNotePath(rel)) {
        files.push({ path: rel, text: await readFile(full, "utf8") });
      }
    }
  };
  await walk(root);
  return files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/** Reads and parses a YAML data file. A read or parse failure is returned as `error`, not thrown. */
export async function readDataFile(path: string, display: string): Promise<DataFile> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    return {
      file: display,
      data: undefined,
      error: `can't read the file (${(error as NodeJS.ErrnoException).code ?? "error"})`,
    };
  }
  try {
    return { file: display, data: parseYaml(text) };
  } catch (error) {
    return { file: display, data: undefined, error: `invalid YAML: ${(error as Error).message}` };
  }
}

/** The build `latest.json` points to, if it can be read. */
export async function readPreviousBuild(outDir: string): Promise<PreviousBuild | null> {
  try {
    const latest: unknown = JSON.parse(await readFile(join(outDir, "latest.json"), "utf8"));
    if (typeof latest !== "object" || latest === null) return null;
    const { hash, data_version: dataVersion } = latest as Record<string, unknown>;
    if (
      typeof hash !== "string" ||
      !/^[0-9a-f]{8,64}$/.test(hash) ||
      typeof dataVersion !== "string"
    )
      return null;
    const records = snapshotsFrom(
      JSON.parse(await readFile(join(outDir, hash, "strains.json"), "utf8")),
    );
    return records === null ? null : { hash, data_version: dataVersion, records };
  } catch {
    return null;
  }
}

/** Writes `<out>/<hash>/*` first and `latest.json` last, so the app never points at a half-written build. */
export async function writeBuild(outDir: string, build: EmittedBuild): Promise<void> {
  const folder = join(outDir, build.hash);
  await mkdir(folder, { recursive: true });
  for (const file of build.files) await writeFile(join(folder, file.name), file.content, "utf8");
  await writeFile(join(outDir, build.latest.name), build.latest.content, "utf8");
}

export async function writeText(path: string, content: string): Promise<void> {
  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(path, content, "utf8");
}
