import { z } from "zod";
import { NonEmptyStringSchema, SlugSchema } from "./common";
import { FacetSchema, PolaritySchema, TermStatusSchema } from "./enums";

/** One controlled-vocabulary term in data/taxonomy/taxonomy.yaml (docs/04 "Taxonomy term"). */
export const TaxonomyTermSchema = z
  .strictObject({
    slug: SlugSchema,
    facet: FacetSchema,
    label: NonEmptyStringSchema,
    polarity: PolaritySchema,
    description: NonEmptyStringSchema,
    synonyms: z.array(NonEmptyStringSchema).optional(),
    status: TermStatusSchema,
    replaced_by: SlugSchema.optional(),
  })
  .check((ctx) => {
    const term = ctx.value;
    const issue = (message: string) =>
      ctx.issues.push({ code: "custom", input: term, path: ["replaced_by"], message });
    if (term.status === "deprecated" && term.replaced_by === undefined) {
      issue("a deprecated term must point to its replacement");
    } else if (term.status === "active" && term.replaced_by !== undefined) {
      issue("only deprecated terms have replaced_by");
    } else if (term.replaced_by === term.slug) {
      issue("a term can't replace itself");
    }
  });
export type TaxonomyTerm = z.infer<typeof TaxonomyTermSchema>;
