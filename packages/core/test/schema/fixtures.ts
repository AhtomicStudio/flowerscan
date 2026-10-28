// Valid fixtures for every schema. All strain, breeder and place names are fictional.
import { expect } from "vitest";
import type { z } from "zod";
import type { SourceSupport } from "../../src/index";

/** Asserts the input is rejected with an issue at `path` whose message contains `message`. */
export function expectIssue(
  schema: z.ZodType,
  input: unknown,
  path: readonly PropertyKey[],
  message?: string,
): void {
  const result = schema.safeParse(input);
  expect(result.success, `expected a failure at ${path.join(".")}`).toBe(false);
  if (result.success) return;
  const match = result.error.issues.find(
    (issue) =>
      issue.path.join(".") === path.join(".") &&
      (message === undefined || issue.message.includes(message)),
  );
  expect(
    match,
    `no issue at "${path.join(".")}"${message ? ` containing "${message}"` : ""}. Got: ${JSON.stringify(result.error.issues)}`,
  ).toBeDefined();
}

/** Asserts the input parses and returns the parsed value. */
export function expectValid<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  expect(result.success, result.success ? "" : JSON.stringify(result.error.issues)).toBe(true);
  return result.data as z.infer<T>;
}

/** Shallow copy with `overrides` applied. A value of `undefined` deletes the key. */
export function withFields(
  base: Record<string, unknown>,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete copy[key];
    else copy[key] = value;
  }
  return copy;
}

export const source = (
  supports: SourceSupport[],
  url = "https://example.org/fictional-source",
) => ({
  url,
  title: "Fictional breeder notes",
  retrieved: "2026-10-20",
  supports,
});

export const landrace = {
  kind: "landrace",
  id: "northvale-highland",
  schema_version: 1,
  name: "Northvale Highland",
  aliases: [],
  parents: [],
  reported_type: "indica",
  base_sativa_pct: 25,
  region: "Northvale (fictional)",
  sources: [
    source(["base_sativa_pct", "reported_type"], "https://example.org/a"),
    source(["base_sativa_pct"], "https://example.org/b"),
  ],
  verification: "unverified",
  created: "2026-10-20",
  updated: "2026-10-21",
};

export const strain = {
  kind: "strain",
  id: "moonlit-fern-4",
  schema_version: 1,
  name: "Moonlit Fern #4",
  aliases: ["MF4"],
  parents: ["[[Copper Kite]]", "[[Harbor Lantern]]"],
  parent_weights: null,
  reported_type: "indica-dominant",
  breeder: "[[Lanternworks Seeds]]",
  effects: ["relaxed"],
  flavors: ["pine"],
  terpenes: ["myrcene"],
  typical_thc_pct: null,
  sources: [source(["parents", "reported_type", "effects", "flavors", "terpenes"])],
  verification: "verified",
  reviewed_by: "Fictional Founder",
  reviewed_at: "2026-10-20",
  created: "2026-10-20",
  updated: "2026-10-20",
};

export const cross = {
  kind: "cross",
  id: "copper-kite-x-harbor-lantern",
  schema_version: 1,
  name: "Copper Kite x Harbor Lantern",
  parents: ["[[Copper Kite]]", "[[Harbor Lantern]]"],
  parent_weights: null,
  reported_type: "unknown",
  sources: [source(["parents"])],
  verification: "unverified",
  created: "2026-10-20",
  updated: "2026-10-20",
};

export const breeder = {
  kind: "breeder",
  id: "lanternworks-seeds",
  schema_version: 1,
  name: "Lanternworks Seeds",
  aliases: [],
  website: null,
  sources: [],
  created: "2026-10-20",
  updated: "2026-10-20",
};

export const term = {
  slug: "relaxed",
  facet: "effect",
  label: "Relaxed",
  polarity: "positive",
  description: "Often described as relaxing.",
  synonyms: ["chill"],
  status: "active",
};

export const tracedLineage = {
  sativa_pct: 35,
  indica_pct: 65,
  label: "indica",
  sublabel: "indica-dominant",
  confidence: 0.94,
  confidence_level: "high",
  method: "traced",
  algo_version: 2,
};

export const unknownLineage = {
  sativa_pct: null,
  indica_pct: null,
  label: "unknown",
  sublabel: null,
  confidence: 0,
  confidence_level: "none",
  method: "unknown",
  algo_version: 2,
};

export const reading = {
  analyte: "total_thc",
  value: 24.1,
  qualifier: "exact",
  unit: "percent",
  raw: "Total THC 24.1%",
};

export const scan = {
  id: "scan_01JB8Z7Q2X4N6P8R0T2V4W6Y8A",
  schema_version: 1,
  date_scanned: "2026-10-25T18:42:11-07:00",
  scan_method: "text",
  strain_id: "moonlit-fern-4",
  strain_name: "Moonlit Fern #4",
  lineage: tracedLineage,
  data_version: "2026.10.25-a1b2c3",
  match_score: 0.96,
  package_says: "indica",
  potency_readings: [reading],
  brand: null,
  product_form: "flower",
  barcode: null,
  barcode_format: null,
  qr_payload: null,
  ocr_text: "MOONLIT FERN #4\nTotal THC 24.1%",
  rating: 4,
  notes: "",
};

export const barcodeMemory = {
  barcode: "036000291452",
  barcode_format: "upc_a",
  strain_id: "moonlit-fern-4",
  confirmed_at: "2026-10-25T18:42:11-07:00",
  times_seen: 1,
  learnable: true,
};

export const settings = {
  age_confirmed_at: "2026-10-25T18:40:00-07:00",
  age_declined_at: null,
  theme: "dark",
  haptics: true,
  last_backup_at: null,
};

export const observation = {
  id: "obs_01JB8Z7Q2X4N6P8R0T2V4W6Y8B",
  strain_id: "moonlit-fern-4",
  name_on_package: "MOONLIT FERN #4",
  brand: "Fictional Farms",
  state: "MI",
  product_form: "flower",
  observed_on: "2026-10-25",
  packaged_on: "PKG: 10/01/26",
  batch: null,
  readings: [reading],
  source: "eval_set",
  recorded_by: "eval-import",
  evidence: "data/eval/packages/mi-moonlit-fern-4.jpg",
};
