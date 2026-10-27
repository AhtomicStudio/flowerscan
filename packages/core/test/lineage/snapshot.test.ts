// Golden output for a fixture dataset, so any algorithm change shows up as a reviewable diff.
// All names are fictional. The real seed dataset (T-007) gets its own snapshot once vault-build (T-006)
// can load it.
import { describe, expect, it } from "vitest";
import { computeAll, explainLineage, findCycles } from "../../src/lineage";
import { graphOf, landrace, strain } from "./helpers";

const fixture = graphOf(
  landrace("northvale-highland", 25, { reported: "indica" }),
  landrace("coastal-reed", 90, { reported: "sativa" }),
  landrace("amber-steppe", 10, { reported: "indica" }),
  landrace("river-delta", 75),
  landrace("cloud-terrace", null, { reported: "sativa-dominant" }),
  landrace("salt-plain", null),
  strain("copper-kite", ["northvale-highland", "coastal-reed"], { reported: "balanced" }),
  strain("harbor-lantern", ["amber-steppe", "river-delta"], { reported: "indica-dominant" }),
  strain("copper-kite-x-harbor-lantern", ["copper-kite", "harbor-lantern"], {
    kind: "cross",
    verification: "unverified",
  }),
  strain("moonlit-fern", ["copper-kite-x-harbor-lantern", "coastal-reed"], {
    reported: "sativa-dominant",
  }),
  strain("moonlit-fern-4", ["moonlit-fern"], { derivation: "pheno", reported: "sativa" }),
  strain("moonlit-fern-s1", ["moonlit-fern"], { derivation: "s1" }),
  strain("velvet-comet", ["unknown"], { reported: "indica" }),
  strain("velvet-comet-cut", ["velvet-comet"], { derivation: "cut" }),
  strain("quiet-orchard", ["velvet-comet", "unknown"], {
    reported: "balanced",
    verification: "disputed",
  }),
  strain("paper-moth", ["harbor-lantern", "unknown"]),
  strain("cloud-runner", ["cloud-terrace", "copper-kite"]),
  strain("salt-runner", ["salt-plain", "amber-steppe"], { reported: "indica" }),
  strain("mystery-haze", ["unknown", "unknown"]),
  strain("backcross-kite", ["copper-kite", "copper-kite-x-harbor-lantern"]),
  strain("heavy-kite", ["northvale-highland", "coastal-reed", "amber-steppe"], {
    weights: [0.5, 0.3, 0.2],
  }),
);

describe("lineage snapshot (fixture dataset)", () => {
  it("has no cycles", () => {
    expect(findCycles(fixture)).toEqual([]);
  });

  it("matches the golden output", async () => {
    const output = Object.fromEntries(computeAll(fixture));
    await expect(`${JSON.stringify(output, null, 2)}\n`).toMatchFileSnapshot(
      "./__snapshots__/fixture-lineage.json",
    );
  });

  it("matches the golden explanation tree", async () => {
    const tree = explainLineage(fixture, "moonlit-fern-4");
    await expect(`${JSON.stringify(tree, null, 2)}\n`).toMatchFileSnapshot(
      "./__snapshots__/fixture-explain-moonlit-fern-4.json",
    );
  });
});
