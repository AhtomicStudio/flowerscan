// Small fictional taxonomy and banned list, shaped like data/taxonomy/*.yaml after YAML parsing.
import { expect } from "vitest";
import { type BannedTerms, loadBannedTerms, type Result } from "../../src/index";

export const bannedFile = {
  banned_version: 1,
  conditions: ["alzheimer's", "anxiety", "anxiety disorder", "pain"],
  claims: ["cures", "stress relief", "good for"],
  pharmacology: ["anti-inflammatory"],
  safety: ["safe"],
};

export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.issues)}`);
  return result.value;
}

export const banned: BannedTerms = unwrap(loadBannedTerms(bannedFile));

export const term = (overrides: Record<string, unknown> = {}) => ({
  slug: "relaxed",
  facet: "effect",
  label: "Relaxed",
  polarity: "positive",
  description: "Often described as a loose, unwound feeling.",
  synonyms: ["chill"],
  status: "active",
  ...overrides,
});

export const taxonomyFile = () => ({
  taxonomy_version: 1,
  terms: [
    term(),
    term({
      slug: "couch-lock",
      label: "Couch-lock",
      polarity: "neutral",
      description: "Some people report a heavy, hard-to-move feeling.",
      synonyms: ["couch locked"],
    }),
    term({
      slug: "lemon",
      facet: "flavor",
      label: "Lemon",
      polarity: "neutral",
      description: "A sharp lemon note.",
      synonyms: ["lemony"],
    }),
    term({
      slug: "citrus-zest",
      facet: "flavor",
      label: "Citrus zest",
      polarity: "neutral",
      description: "Older name for a lemon note.",
      synonyms: undefined,
      status: "deprecated",
      replaced_by: "lemon",
    }),
    term({
      slug: "zesty",
      facet: "flavor",
      label: "Zesty",
      polarity: "neutral",
      description: "Older name, replaced twice.",
      synonyms: ["zingy"],
      status: "deprecated",
      replaced_by: "citrus-zest",
    }),
  ],
});

/** Asserts a failed result with an issue at `field` whose message contains `message`. */
export function expectIssue<T>(result: Result<T>, field: string, message: string): void {
  expect(result.ok, "expected a failure").toBe(false);
  if (result.ok) return;
  expect(
    result.issues.some((issue) => issue.field === field && issue.message.includes(message)),
    `no issue at ${field} containing "${message}". Got: ${JSON.stringify(result.issues)}`,
  ).toBe(true);
}
