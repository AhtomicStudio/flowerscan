import { z } from "zod";
import { IsoDateSchema, NonEmptyStringSchema, vaultOptional } from "./common";
import { type SourceSupport, SourceSupportSchema } from "./enums";

/**
 * A citation for strain facts (docs/04 "Source"). Online sources have a `url`; book or print sources
 * have a `ref` instead. At least one of the two is required.
 */
export const SourceSchema = z
  .strictObject({
    url: vaultOptional(z.url({ protocol: /^https?$/, error: "must be an http(s) URL" })),
    ref: vaultOptional(NonEmptyStringSchema),
    title: NonEmptyStringSchema,
    retrieved: IsoDateSchema,
    supports: z.array(SourceSupportSchema),
  })
  .check((ctx) => {
    const { url, ref } = ctx.value;
    if ((url === undefined || url === null) && (ref === undefined || ref === null)) {
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        path: ["url"],
        message: "a source needs a url, or a ref for a book or print source",
      });
    }
  });
export type Source = z.infer<typeof SourceSchema>;

/** True when at least one source lists `field` in `supports`. */
export function isSupported(
  sources: readonly Source[] | null | undefined,
  field: SourceSupport,
): boolean {
  return countSupporting(sources, field) > 0;
}

/** How many sources list `field` in `supports`. */
export function countSupporting(
  sources: readonly Source[] | null | undefined,
  field: SourceSupport,
): number {
  if (sources === null || sources === undefined) return 0;
  return sources.filter((source) => source.supports.includes(field)).length;
}
