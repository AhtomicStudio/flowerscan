import { describe, expect, it } from "vitest";
import * as core from "../src/index";

describe("@flowerscan/core public API", () => {
  it("exposes the schema version from docs/04", () => {
    expect(core.SCHEMA_VERSION).toBe(1);
  });

  it("exports a schema for every docs/04 entity", () => {
    for (const name of [
      "GeneticNodeSchema",
      "SourceSchema",
      "BreederSchema",
      "TaxonomyTermSchema",
      "LineageSchema",
      "ScanSchema",
      "PotencyReadingSchema",
      "PotencyObservationSchema",
      "BarcodeMemorySchema",
      "SettingsSchema",
      "BackupFileSchema",
      "StrainRecordSchema",
      "StrainsFileSchema",
      "BuildManifestSchema",
    ]) {
      expect(core, name).toHaveProperty(name);
    }
  });

  it("exports the ID helpers", () => {
    expect(core.slugify("Gorilla Glue #4")).toBe("gorilla-glue-4");
    expect(core.sanitizeFilename("Gorilla Glue #4")).toBe("Gorilla Glue 4");
  });
});
