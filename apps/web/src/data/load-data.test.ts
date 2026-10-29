import { describe, expect, it } from "vitest";
import { fakeFetch, STRAINS } from "../test/fixtures";
import { DataLoadError, loadStrainData } from "./load-data";

describe("loadStrainData", () => {
  it("loads latest → manifest → the three files, validated and indexed", async () => {
    const fetch = fakeFetch();
    const data = await loadStrainData(fetch.fetcher);
    expect(fetch.calls[0]).toBe("/data/latest.json");
    expect(fetch.calls[1]).toBe("/data/a1b2c3d4e5f6/manifest.json");
    expect(fetch.calls.slice(2).sort()).toEqual([
      "/data/a1b2c3d4e5f6/breeders.json",
      "/data/a1b2c3d4e5f6/strains.json",
      "/data/a1b2c3d4e5f6/taxonomy.json",
    ]);
    expect(data.strains).toHaveLength(STRAINS.length);
    expect(data.byId.get("kestrel-haze")?.name).toBe("Kestrel Haze");
    expect(data.breeders.get("breeder-x")).toBe("Breeder X");
    expect(data.terms.get("dry-mouth")?.polarity).toBe("negative");
    expect(data.isBeta).toBe(true);
  });

  it("is not a beta build without the -dev suffix", async () => {
    const data = await loadStrainData(fakeFetch({ dataVersion: "2026.10.27-a1b2c3" }).fetcher);
    expect(data.isBeta).toBe(false);
  });

  it("rejects a manifest path outside the hashed folder", async () => {
    const fetch = fakeFetch({
      overrides: {
        "latest.json": {
          data_version: "x-dev",
          hash: "a1b2c3d4e5f6",
          manifest: "../elsewhere/manifest.json",
        },
      },
    });
    await expect(loadStrainData(fetch.fetcher)).rejects.toBeInstanceOf(DataLoadError);
  });

  it("rejects strains that fail the core schema (e.g. a shipped potency field)", async () => {
    const [first, ...rest] = STRAINS;
    const fetch = fakeFetch({
      overrides: { "strains.json": [{ ...first, typical_thc_pct: { min: 18, max: 24 } }, ...rest] },
    });
    await expect(loadStrainData(fetch.fetcher)).rejects.toThrow(/strains.json failed validation/);
  });

  it("rejects a manifest that doesn't match latest.json", async () => {
    const fetch = fakeFetch({ overrides: { "manifest.json": { bad: true } } });
    await expect(loadStrainData(fetch.fetcher)).rejects.toThrow(/manifest.json/);
  });

  it("fails on HTTP errors and network errors", async () => {
    const missing = fakeFetch({ overrides: { "taxonomy.json": undefined } });
    await expect(loadStrainData(missing.fetcher)).rejects.toThrow(/HTTP 404/);
    const offline = fakeFetch();
    offline.fail = true;
    await expect(loadStrainData(offline.fetcher)).rejects.toThrow(/Failed to fetch/);
  });
});
