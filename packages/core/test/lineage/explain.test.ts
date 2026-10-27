import { describe, expect, it } from "vitest";
import { computeLineage, explainLineage, type LineageExplanation } from "../../src/lineage";
import { graphOf, landrace, strain, workedExample } from "./helpers";

const ids = (node: LineageExplanation | null | undefined) =>
  node?.children.map((child) => child.id);

describe("explainLineage", () => {
  const graph = workedExample([
    strain("b-cut", ["strain-b"], { derivation: "cut", verification: "unverified" }),
  ]);

  it("returns the family tree with values, weights, and lineage per node", () => {
    const tree = explainLineage(graph, "strain-b");
    expect(tree).toMatchObject({
      id: "strain-b",
      name: "Strain B",
      kind: "strain",
      derivation: "cross",
      verification: "verified",
      value: 70,
      weight: 1,
      truncated: false,
    });
    expect(tree?.lineage).toEqual(computeLineage(graph, "strain-b"));
    expect(ids(tree)).toEqual(["strain-a", "landrace-c"]);
    const [a, c] = tree?.children ?? [];
    expect(a).toMatchObject({ value: 50, weight: 0.5, kind: "strain" });
    expect(c).toMatchObject({ value: 90, weight: 0.5, kind: "landrace", derivation: null });
    expect(c?.lineage.confidence).toBe(1);
    expect(ids(a)).toEqual(["landrace-k", "landrace-t"]);
    expect(a?.children[0]).toMatchObject({ value: 10, children: [], truncated: false });
  });

  it("reports verification for every node, so a disputed ancestor is visible (P9)", () => {
    const disputed = graphOf(
      landrace("k", 10, { verification: "disputed" }),
      landrace("t", 90),
      strain("a", ["k", "t"], { verification: "unverified" }),
    );
    const tree = explainLineage(disputed, "a");
    expect(tree?.verification).toBe("unverified");
    expect(tree?.children.map((child) => child.verification)).toEqual(["disputed", "verified"]);
    // No confidence cap for disputed ancestors.
    expect(tree?.lineage.confidence).toBe(0.97);
  });

  it("resolves single-parent derivations", () => {
    expect(explainLineage(graph, "b-cut")).toMatchObject({
      derivation: "cut",
      verification: "unverified",
      value: 70,
    });
  });

  it("stops at the depth limit and marks the cut-off nodes as truncated", () => {
    const rootOnly = explainLineage(graph, "b-cut", 0);
    expect(rootOnly).toMatchObject({ children: [], truncated: true });

    const two = explainLineage(graph, "b-cut", 2);
    const b = two?.children[0];
    expect(ids(b)).toEqual(["strain-a", "landrace-c"]);
    expect(b?.children[0]).toMatchObject({ id: "strain-a", children: [], truncated: true });
    expect(b?.children[1]).toMatchObject({ id: "landrace-c", truncated: false });
  });

  it("defaults to three generations", () => {
    const tree = explainLineage(graph, "b-cut");
    const a = tree?.children[0]?.children[0];
    expect(ids(a)).toEqual(["landrace-k", "landrace-t"]);
  });

  it("shows unknown and unresolved parents as nodes without data", () => {
    const partial = graphOf(
      landrace("k", 10),
      strain("x", ["k", "unknown", "missing-note"], { weights: [0.5, 0.25, 0.25] }),
    );
    const tree = explainLineage(partial, "x");
    expect(tree?.children.slice(1)).toEqual([
      expect.objectContaining({ id: "unknown", name: null, kind: null, verification: null }),
      expect.objectContaining({ id: "missing-note", value: null, weight: 0.25, children: [] }),
    ]);
    expect(tree?.children[1]?.lineage.label).toBe("unknown");
    expect(tree?.derivation).toBe("cross");
  });

  it("resolves an omitted derivation to cross for 2+ parents, as in build output", () => {
    const omitted = { ...strain("x", ["k", "t"]), derivation: undefined };
    const tree = explainLineage(graphOf(landrace("k", 10), landrace("t", 90), omitted), "x");
    expect(tree?.derivation).toBe("cross");
  });

  it("a lone unknown parent has no derivation", () => {
    const tree = explainLineage(graphOf(strain("x", ["unknown"])), "x");
    expect(tree).toMatchObject({ derivation: null, value: null, truncated: false });
    expect(ids(tree)).toEqual(["unknown"]);
  });

  it("returns null for an id that isn't in the graph", () => {
    expect(explainLineage(graph, "nope")).toBeNull();
  });

  it.each([-1, 1.5, Number.NaN])("rejects depth %d", (depth) => {
    expect(() => explainLineage(graph, "strain-b", depth)).toThrow(RangeError);
  });
});
