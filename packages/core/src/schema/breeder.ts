import { z } from "zod";
import { IsoDateSchema, NonEmptyStringSchema, SlugSchema, vaultOptional } from "./common";
import { SCHEMA_VERSION } from "./enums";
import { SourceSchema } from "./source";

/** A breeder note in data/vault/breeders (docs/04 "Breeder"). */
export const BreederSchema = z
  .strictObject({
    kind: z.literal("breeder"),
    id: SlugSchema,
    schema_version: z.literal(SCHEMA_VERSION),
    name: NonEmptyStringSchema,
    aliases: vaultOptional(z.array(NonEmptyStringSchema)),
    website: vaultOptional(z.url({ protocol: /^https?$/, error: "must be an http(s) URL" })),
    sources: vaultOptional(z.array(SourceSchema)),
    created: IsoDateSchema,
    updated: IsoDateSchema,
  })
  .refine((breeder) => breeder.updated >= breeder.created, {
    error: "updated is earlier than created",
    path: ["updated"],
  });
export type Breeder = z.infer<typeof BreederSchema>;
