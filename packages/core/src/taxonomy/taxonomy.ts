// The controlled vocabulary (data/taxonomy/taxonomy.yaml, docs/04 "Taxonomy term").
import { z } from "zod";
import { fail, issuesFromZod, ok, type Result, type ValidationIssue } from "../markdown/issues";
import type { Facet } from "../schema/enums";
import { type TaxonomyTerm, TaxonomyTermSchema } from "../schema/taxonomy-term";
import { type BannedTerms, findBannedTerms } from "./banned";

const TaxonomyFileSchema = z.strictObject({
  taxonomy_version: z.int().min(1),
  terms: z.array(TaxonomyTermSchema),
});

/** How an input matched a term. */
export type TermMatch = "slug" | "label" | "synonym";

/** A loaded taxonomy. Build it with `loadTaxonomy`; look terms up with `getTerm` and `resolveTerm`. */
export interface Taxonomy {
  readonly version: number;
  /** Every term, in file order (deprecated ones included: slugs are never deleted). */
  readonly terms: readonly TaxonomyTerm[];
  /** @internal slug → term. */
  readonly bySlug: ReadonlyMap<string, TaxonomyTerm>;
  /** @internal lookup key of every slug, label and synonym → the term it names. */
  readonly byKey: ReadonlyMap<string, { readonly slug: string; readonly via: TermMatch }>;
}

/** The result of `resolveTerm`. */
export interface ResolvedTerm {
  /** The term to use: `matched`, or the end of its `replaced_by` chain when it's deprecated. */
  readonly term: TaxonomyTerm;
  /** The term the input named. */
  readonly matched: TaxonomyTerm;
  readonly via: TermMatch;
}

/** Case-, whitespace- and hyphen-insensitive key: "Couch-lock", "couch lock" and "couch  LOCK" agree. */
function lookupKey(text: string): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\s-]+/g, " ")
    .trim();
}

function bannedIssues(terms: readonly TaxonomyTerm[], banned: BannedTerms): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const check = (field: string, text: string) => {
    const terms = new Set(findBannedTerms(text, banned).map((hit) => hit.term));
    for (const term of terms) issues.push({ field, message: `contains the banned term "${term}"` });
  };
  terms.forEach((term, index) => {
    const at = `terms.${index}`;
    // A slug becomes a tag, so it's checked as written and with its hyphens read as spaces.
    check(`${at}.slug`, `${term.slug} ${term.slug.replaceAll("-", " ")}`);
    check(`${at}.label`, term.label);
    check(`${at}.description`, term.description);
    (term.synonyms ?? []).forEach((synonym, i) => {
      check(`${at}.synonyms.${i}`, synonym);
    });
  });
  return issues;
}

/** Follows `replaced_by` to an active term. Returns the chain's problem instead when there is one. */
function followReplacements(
  start: TaxonomyTerm,
  bySlug: ReadonlyMap<string, TaxonomyTerm>,
): TaxonomyTerm | string {
  const visited = [start.slug];
  let current = start;
  while (current.status === "deprecated") {
    const next = bySlug.get(current.replaced_by ?? "");
    if (next === undefined)
      return `replaced_by "${current.replaced_by}" is not a slug in the taxonomy`;
    if (next.facet !== start.facet) {
      return `replaced_by "${next.slug}" is a ${next.facet} term, not ${start.facet}`;
    }
    if (visited.includes(next.slug)) {
      return `replaced_by loops: ${[...visited, next.slug].join(" → ")}`;
    }
    visited.push(next.slug);
    current = next;
  }
  return current;
}

/**
 * Validates a parsed taxonomy.yaml (`{ taxonomy_version, terms }`) against `TaxonomyTermSchema`, then checks
 * the whole vocabulary: unique slugs, every slug, label and synonym names one term only, `replaced_by`
 * chains end at an active term of the same facet, and no slug, label, description or synonym contains a
 * banned term (C2). Core has no YAML parser: pass the already-parsed object.
 */
export function loadTaxonomy(parsed: unknown, banned: BannedTerms): Result<Taxonomy> {
  const result = TaxonomyFileSchema.safeParse(parsed);
  if (!result.success) return fail(issuesFromZod(result.error));
  const { terms } = result.data;

  const issues: ValidationIssue[] = [];
  const bySlug = new Map<string, TaxonomyTerm>();
  const byKey = new Map<string, { slug: string; via: TermMatch }>();

  terms.forEach((term, index) => {
    if (bySlug.has(term.slug)) {
      issues.push({ field: `terms.${index}.slug`, message: `duplicate slug "${term.slug}"` });
      return;
    }
    bySlug.set(term.slug, term);
    byKey.set(lookupKey(term.slug), { slug: term.slug, via: "slug" });
  });

  const claim = (field: string, text: string, term: TaxonomyTerm, via: TermMatch) => {
    const key = lookupKey(text);
    const owner = byKey.get(key);
    if (owner === undefined) {
      byKey.set(key, { slug: term.slug, via });
    } else if (owner.slug !== term.slug) {
      issues.push({ field, message: `"${text}" already names the term "${owner.slug}"` });
    }
  };
  terms.forEach((term, index) => {
    if (bySlug.get(term.slug) !== term) return;
    claim(`terms.${index}.label`, term.label, term, "label");
    (term.synonyms ?? []).forEach((synonym, i) => {
      claim(`terms.${index}.synonyms.${i}`, synonym, term, "synonym");
    });
  });

  terms.forEach((term, index) => {
    if (term.status !== "deprecated" || bySlug.get(term.slug) !== term) return;
    const end = followReplacements(term, bySlug);
    if (typeof end === "string") issues.push({ field: `terms.${index}.replaced_by`, message: end });
  });

  issues.push(...bannedIssues(terms, banned));
  if (issues.length > 0) return fail(issues);
  return ok({ version: result.data.taxonomy_version, terms, bySlug, byKey });
}

/** The term with exactly this slug (deprecated or not), or undefined. */
export function getTerm(taxonomy: Taxonomy, slug: string): TaxonomyTerm | undefined {
  return taxonomy.bySlug.get(slug);
}

/**
 * Looks an input up by slug, label or synonym (ignoring case, extra whitespace and hyphens) and follows
 * `replaced_by` from a deprecated term to the active one. With `facet`, only that facet's terms match.
 */
export function resolveTerm(
  taxonomy: Taxonomy,
  input: string,
  facet?: Facet,
): ResolvedTerm | undefined {
  const found = taxonomy.byKey.get(lookupKey(input));
  if (found === undefined) return undefined;
  const matched = taxonomy.bySlug.get(found.slug) as TaxonomyTerm;
  if (facet !== undefined && matched.facet !== facet) return undefined;
  // loadTaxonomy guarantees every chain ends at an active term.
  const term = followReplacements(matched, taxonomy.bySlug) as TaxonomyTerm;
  return { term, matched, via: found.via };
}
