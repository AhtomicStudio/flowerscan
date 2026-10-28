// Founder flags: `data/review/flags/<node-id>.yaml` (docs/04 "Founder review workflow", T-029). A new flag
// is appended to the file's list, so earlier flags (maybe from another founder) are never lost.
import { type ReviewFlag, ReviewFlagFileSchema, type YamlParser } from "@flowerscan/core";
import { stringify } from "yaml";

export type FlagResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly problem: string };

/**
 * The flag file with `flag` appended. `existing` is the current file text, or null when there's none.
 * An existing file that doesn't validate is never overwritten.
 */
export function addFlag(
  existing: string | null,
  id: string,
  flag: ReviewFlag,
  parseYaml: YamlParser,
): FlagResult {
  let flags: ReviewFlag[] = [];
  if (existing !== null) {
    let data: unknown;
    try {
      data = parseYaml(existing);
    } catch (error) {
      return { ok: false, problem: `the flag file isn't valid YAML (${(error as Error).message})` };
    }
    const parsed = ReviewFlagFileSchema.safeParse(data);
    if (!parsed.success) {
      const [issue] = parsed.error.issues;
      return {
        ok: false,
        problem: `the flag file doesn't match the docs/04 format (${issue?.path.join(".") || "(root)"}: ${issue?.message})`,
      };
    }
    if (parsed.data.id !== id) {
      return { ok: false, problem: `the flag file names "${parsed.data.id}", not "${id}"` };
    }
    flags = parsed.data.flags;
  }
  const file = ReviewFlagFileSchema.safeParse({ id, flags: [...flags, flag] });
  if (!file.success) {
    const [issue] = file.error.issues;
    return { ok: false, problem: `${issue?.path.join(".")}: ${issue?.message}` };
  }
  return { ok: true, text: stringify(file.data, { lineWidth: 0 }) };
}
