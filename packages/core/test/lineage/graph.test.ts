import { describe, expect, it } from "vitest";
import {
  computeAll,
  computeLineage,
  createLineageGraph,
  explainLineage,
  findCycles,
} from "../../src/lineage";
import { graphOf, landrace, randomDag, strain } from "./helpers";

describe("createLineageGraph", () => {
  it("keys nodes by id, in input order", () => {
    const graph = createLineageGraph([landrace("b", 10), landrace("a", 90)]);
    expect([...graph.keys()]).toEqual(["b", "a"]);
  });

  it("rejects duplicate ids", () => {
    expect(() => createLineageGraph([landrace("a", 10), landrace("a", 90)])).toThrow(
      /duplicate node id a/,
    );
  });

  it('rejects the reserved id "unknown"', () => {
    expect(() => createLineageGraph([landrace("unknown", 10)])).toThrow(/reserved/);
  });
});

describe("findCycles (build)", () => {
  it("finds none in a DAG", () => {
    expect(findCycles(graphOf(...randomDag(500, 11)))).toEqual([]);
  });

  it("ignores unknown and unresolved parents", () => {
    expect(findCycles(graphOf(strain("a", ["unknown", "missing"])))).toEqual([]);
  });

  it("reports a self-loop", () => {
    expect(findCycles(graphOf(strain("a", ["a"], { derivation: "s1" })))).toEqual([["a", "a"]]);
  });

  it("reports a cycle path in child → parent order, from the smallest id", () => {
    const graph = graphOf(
      landrace("k", 10),
      strain("c", ["a", "k"]),
      strain("b", ["c", "k"]),
      strain("a", ["b", "k"]),
      strain("tail", ["a", "k"]),
    );
    expect(findCycles(graph)).toEqual([["a", "b", "c", "a"]]);
  });

  it("reports one path per cycle group, sorted by start id", () => {
    const graph = graphOf(
      strain("y", ["z"], { derivation: "s1" }),
      strain("z", ["y"], { derivation: "s1" }),
      strain("m", ["n"], { derivation: "s1" }),
      strain("n", ["m"], { derivation: "s1" }),
    );
    expect(findCycles(graph)).toEqual([
      ["m", "n", "m"],
      ["y", "z", "y"],
    ]);
  });

  it("reports the shortest loop through the smallest id of a group with several loops", () => {
    // a → b → c → d → a, and a → d → a.
    const graph = graphOf(
      strain("a", ["b", "d"]),
      strain("b", ["c"], { derivation: "s1" }),
      strain("c", ["d"], { derivation: "s1" }),
      strain("d", ["a"], { derivation: "s1" }),
    );
    expect(findCycles(graph)).toEqual([["a", "d", "a"]]);
  });
});

describe("runtime cycle guard", () => {
  const cyclic = graphOf(
    landrace("k", 10),
    strain("a", ["b", "k"], { reported: "sativa" }),
    strain("b", ["c", "k"]),
    strain("c", ["a", "b"]),
    strain("child", ["a", "k"]),
    strain("loop", ["loop"], { derivation: "cut", reported: "indica" }),
  );

  it("returns unknown for every node in a cycle, even with a reported_type", () => {
    for (const id of ["a", "b", "c", "loop"]) {
      expect(computeLineage(cyclic, id).method, id).toBe("unknown");
    }
  });

  it("is order-independent: computeAll agrees with each single computeLineage", () => {
    const all = computeAll(cyclic);
    for (const id of cyclic.keys()) expect(all.get(id)).toEqual(computeLineage(cyclic, id));
  });

  it("treats a cyclic parent as unknown for its descendants", () => {
    expect(computeLineage(cyclic, "child")).toMatchObject({ sativa_pct: 10, method: "partial" });
  });

  it("explainLineage terminates on a cycle, even with unlimited depth", () => {
    const tree = explainLineage(cyclic, "a", Number.POSITIVE_INFINITY);
    const b = tree?.children[0];
    const c = b?.children[0];
    expect(c?.children.map((node) => node.id)).toEqual(["a", "b"]);
    expect(c?.children[0]).toMatchObject({ id: "a", truncated: true, children: [] });
  });

  it("doesn't overflow the stack on a very deep lineage", () => {
    const nodes = [landrace("root", 90)];
    for (let i = 1; i <= 20_000; i += 1) {
      nodes.push(strain(`gen-${i}`, [i === 1 ? "root" : `gen-${i - 1}`], { derivation: "cut" }));
    }
    expect(computeLineage(graphOf(...nodes), "gen-20000")).toMatchObject({
      sativa_pct: 90,
      confidence: 1,
      method: "traced",
    });
  });
});
