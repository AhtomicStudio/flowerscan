// Structured validation results shared by the markdown and taxonomy modules.
import type { z } from "zod";

/** One problem with an input. `field` is a dotted path (`sources.0.url`), or `(root)` for the whole value. */
export interface ValidationIssue {
  readonly field: string;
  readonly message: string;
}

/** A typed value, or the issues that stopped it. Never both. */
export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly ValidationIssue[] };

export const ROOT_FIELD = "(root)";

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail<T>(issues: readonly ValidationIssue[]): Result<T> {
  return { ok: false, issues };
}

/** A path as a dotted field name: `["sources", 0, "url"]` → `sources.0.url`. */
export function fieldOf(path: readonly PropertyKey[]): string {
  return path.length === 0 ? ROOT_FIELD : path.map((part) => String(part)).join(".");
}

/**
 * zod issues as `ValidationIssue`s, in zod's order. An unknown key names the key itself as the field,
 * so a typo like `parent_weight` reads `parent_weight: unknown field`.
 */
export function issuesFromZod(
  error: z.ZodError,
  prefix: readonly PropertyKey[] = [],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const issue of error.issues) {
    const path = [...prefix, ...issue.path];
    if (issue.code === "unrecognized_keys") {
      for (const key of issue.keys) {
        issues.push({
          field: fieldOf([...path, key]),
          message: "unknown field (field names must match docs/04-data-model.md)",
        });
      }
      continue;
    }
    issues.push({ field: fieldOf(path), message: issue.message });
  }
  return issues;
}
