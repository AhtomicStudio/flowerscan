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

  it("exports the lineage engine (T-005)", () => {
    for (const name of [
      "computeLineage",
      "computeAll",
      "findCycles",
      "explainLineage",
      "createLineageGraph",
    ]) {
      expect(typeof (core as Record<string, unknown>)[name], name).toBe("function");
    }
    expect(core.ALGO_VERSION).toBe(2);
    // D15: hybrid is exactly 50; either side of it is the lean.
    expect([49, 50, 51].map((pct) => core.labelFor(pct).label)).toEqual([
      "indica",
      "hybrid",
      "sativa",
    ]);
  });

  it("exports the name matcher (T-008)", () => {
    for (const name of ["normalize", "buildIndex", "search", "match", "decide"]) {
      expect(typeof (core as Record<string, unknown>)[name], name).toBe("function");
    }
  });
});
