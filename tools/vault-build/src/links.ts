// Wikilink resolution by filename (docs/04, ADR-0003). Aliases are never used for resolution.

export type LinkResolution =
  | { readonly ok: true; readonly path: string }
  | {
      readonly ok: false;
      readonly reason: "unresolved" | "ambiguous";
      readonly candidates: readonly string[];
    };

export interface LinkIndex {
  /** Resolves a link target (from `parseWikilink`) to a vault-relative note path. */
  resolve(target: string): LinkResolution;
}

const key = (text: string) => text.normalize("NFC").toLowerCase();
const withoutMd = (path: string) => path.replace(/\.md$/i, "");

/**
 * Indexes note paths by filename, case-insensitively, with or without `.md`. A target with a `/` is
 * matched against the vault-relative path instead (`[[strains/Name]]`), as Obsidian does.
 */
export function createLinkIndex(paths: readonly string[]): LinkIndex {
  const byName = new Map<string, string[]>();
  const byPath = new Map<string, string>();
  for (const path of paths) {
    const bare = withoutMd(path);
    byPath.set(key(bare), path);
    const name = key(bare.slice(bare.lastIndexOf("/") + 1));
    byName.set(name, [...(byName.get(name) ?? []), path]);
  }
  return {
    resolve(target) {
      const wanted = key(withoutMd(target));
      if (wanted.includes("/")) {
        const path = byPath.get(wanted.replace(/^\/+/, ""));
        return path === undefined
          ? { ok: false, reason: "unresolved", candidates: [] }
          : { ok: true, path };
      }
      const found = byName.get(wanted) ?? [];
      if (found.length === 1) return { ok: true, path: found[0] as string };
      return found.length === 0
        ? { ok: false, reason: "unresolved", candidates: [] }
        : { ok: false, reason: "ambiguous", candidates: found };
    },
  };
}
