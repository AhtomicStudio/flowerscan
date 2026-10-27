import { describe, expect, it } from "vitest";
import { LineageSchema } from "../../src/index";
import {
  ALGO_VERSION,
  computeAll,
  computeLineage,
  GENERATION_DECAY,
  type LineageNode,
  REPORTED_CONFIDENCE,
} from "../../src/lineage";
import { graphOf, landrace, randomDag, strain, workedExample } from "./helpers";

const lineageOf = (nodes: LineageNode[], id: string) => computeLineage(graphOf(...nodes), id);

describe("landraces", () => {
  it.each([10, 25, 50, 75, 90] as const)("base %i returns its value with confidence 1", (base) => {
    const result = lineageOf([landrace("base-pop", base)], "base-pop");
    expect(result.sativa_pct).toBe(base);
    expect(result.indica_pct).toBe(100 - base);
    expect(result.confidence).toBe(1);
    expect(result.confidence_level).toBe("high");
    expect(result.method).toBe("traced");
  });

  it("without a base value (P10) falls back to its reported_type", () => {
    const result = lineageOf([landrace("bare", null, { reported: "sativa" })], "bare");
    expect(result).toMatchObject({ sativa_pct: 85, confidence: 0.5, method: "reported" });
  });

  it("without a base value or reported_type is unknown", () => {
    expect(lineageOf([landrace("bare", null)], "bare").method).toBe("unknown");
  });

  it("descendants of a landrace without a value fill its share from their own reported_type", () => {
    const result = lineageOf(
      [
        landrace("k", 10),
        landrace("bare", null),
        strain("child", ["k", "bare"], { reported: "indica" }),
      ],
      "child",
    );
    // 0.5·10 + 0.5·15 = 12.5, rounded up to 13.
    expect(result.sativa_pct).toBe(13);
    expect(result.label).toBe("indica");
    expect(result.confidence).toBeCloseTo(0.97 * (0.5 + 0.5 * 0.5), 12);
    expect(result.method).toBe("partial");
  });
});

describe("docs/05 worked example (fictional strains)", () => {
  const graph = workedExample([
    strain("b-cut", ["strain-b"], { derivation: "cut" }),
    strain("b-s1", ["strain-b"], { derivation: "s1" }),
  ]);
  const all = computeAll(graph);

  it("Strain A = K × T: 50%, hybrid (detail balanced), confidence 0.97 (high)", () => {
    expect(all.get("strain-a")).toEqual({
      sativa_pct: 50,
      indica_pct: 50,
      label: "hybrid",
      sublabel: "balanced",
      confidence: 0.97,
      confidence_level: "high",
      method: "traced",
      algo_version: ALGO_VERSION,
    });
  });

  it("Strain B = A × C: 70%, sativa (detail sativa-dominant), confidence ≈ 0.955 (high)", () => {
    const b = all.get("strain-b");
    expect(b).toMatchObject({
      sativa_pct: 70,
      indica_pct: 30,
      label: "sativa",
      sublabel: "sativa-dominant",
      confidence_level: "high",
      method: "traced",
    });
    expect(b?.confidence).toBeCloseTo(0.97 * (0.5 * 0.97 + 0.5 * 1.0), 12);
    expect(b?.confidence).toBeCloseTo(0.955, 3);
  });

  it("a cut of B keeps 70% and ≈ 0.955 (no decay)", () => {
    const cut = all.get("b-cut");
    expect(cut?.sativa_pct).toBe(70);
    expect(cut?.confidence).toBe(all.get("strain-b")?.confidence);
    expect(cut?.confidence).toBeCloseTo(0.955, 3);
  });

  it("an S1 of B keeps 70% at ≈ 0.927 (one generation of decay)", () => {
    const s1 = all.get("b-s1");
    expect(s1?.sativa_pct).toBe(70);
    expect(s1?.confidence).toBeCloseTo(0.927, 3);
    expect(s1?.confidence).toBeCloseTo(
      GENERATION_DECAY * (all.get("strain-b")?.confidence ?? 0),
      12,
    );
  });

  it("with C unknown and B reported sativa-dominant: 60%, sativa, ≈ 0.713 (medium), partial", () => {
    const result = lineageOf(
      [
        landrace("landrace-k", 10),
        landrace("landrace-t", 90),
        strain("strain-a", ["landrace-k", "landrace-t"]),
        strain("strain-b", ["strain-a", "unknown"], { reported: "sativa-dominant" }),
      ],
      "strain-b",
    );
    expect(result).toMatchObject({
      sativa_pct: 60,
      indica_pct: 40,
      label: "sativa",
      sublabel: "sativa-dominant",
      confidence_level: "medium",
      method: "partial",
    });
    expect(result.confidence).toBeCloseTo(0.97 * (0.5 * 0.97 + 0.5 * 0.5), 12);
    expect(result.confidence).toBeCloseTo(0.713, 3);
  });
});

describe("crosses", () => {
  it("equal-weight cross averages its parents", () => {
    const result = lineageOf([landrace("k", 10), landrace("t", 90), strain("x", ["k", "t"])], "x");
    expect(result.sativa_pct).toBe(50);
    expect(result.confidence).toBe(GENERATION_DECAY);
  });

  it("custom parent_weights weight the average", () => {
    const result = lineageOf(
      [landrace("k", 10), landrace("t", 90), strain("x", ["k", "t"], { weights: [0.75, 0.25] })],
      "x",
    );
    expect(result.sativa_pct).toBe(30); // 0.75·10 + 0.25·90
    expect(result).toMatchObject({ label: "indica", sublabel: "indica-dominant" });
    expect(result.confidence).toBeCloseTo(GENERATION_DECAY, 12);
  });

  it("splits three parents equally", () => {
    const result = lineageOf(
      [landrace("a", 10), landrace("b", 50), landrace("c", 90), strain("x", ["a", "b", "c"])],
      "x",
    );
    expect(result.sativa_pct).toBe(50);
    expect(result.confidence).toBeCloseTo(GENERATION_DECAY, 12);
  });

  it("backcross X = P × (P × Q) through a cross node gives 0.75·P + 0.25·Q", () => {
    const result = lineageOf(
      [
        landrace("p", 90),
        landrace("q", 10),
        strain("p-x-q", ["p", "q"], { kind: "cross", verification: "unverified" }),
        strain("bx", ["p", "p-x-q"]),
      ],
      "bx",
    );
    expect(result.sativa_pct).toBe(0.75 * 90 + 0.25 * 10);
    expect(result.confidence).toBeCloseTo(0.97 * (0.5 * 1 + 0.5 * 0.97), 12);
    expect(result.method).toBe("traced");
  });

  it("reciprocal crosses (A × B vs. B × A) give the same result", () => {
    const graph = graphOf(
      landrace("k", 25),
      landrace("t", 90),
      strain("k-x-t", ["k", "t"]),
      strain("t-x-k", ["t", "k"]),
    );
    expect(computeLineage(graph, "k-x-t")).toEqual(computeLineage(graph, "t-x-k"));
  });

  it("a cross is traced only when every ancestor path is traced", () => {
    const all = computeAll(
      graphOf(
        landrace("k", 10),
        strain("told", ["unknown"], { reported: "sativa" }),
        strain("mixed", ["k", "told"]),
        strain("grandchild", ["mixed", "k"]),
      ),
    );
    expect(all.get("told")?.method).toBe("reported");
    expect(all.get("mixed")).toMatchObject({ sativa_pct: 48, method: "partial" }); // 0.5·10 + 0.5·85
    expect(all.get("mixed")?.confidence).toBeCloseTo(0.97 * (0.5 * 1 + 0.5 * 0.5), 12);
    expect(all.get("grandchild")?.method).toBe("partial");
  });
});

describe("single-parent nodes by derivation (P7)", () => {
  const base = [landrace("k", 10), landrace("t", 90), strain("line", ["k", "t"])];
  const child = (derivation: "s1" | "cut" | "pheno" | null) =>
    lineageOf([...base, strain("child", ["line"], { derivation })], "child");

  it("s1 decays one generation", () => {
    expect(child("s1").confidence).toBeCloseTo(GENERATION_DECAY * GENERATION_DECAY, 12);
  });

  it("cut doesn't decay", () => {
    expect(child("cut").confidence).toBe(GENERATION_DECAY);
  });

  it("pheno with a single seed-line parent doesn't decay", () => {
    expect(child("pheno").confidence).toBe(GENERATION_DECAY);
  });

  it("each inherits the parent's value and method", () => {
    for (const derivation of ["s1", "cut", "pheno"] as const) {
      expect(child(derivation)).toMatchObject({ sativa_pct: 50, method: "traced" });
    }
  });

  it("an undeclared derivation is treated as a new generation", () => {
    expect(child(null).confidence).toBeCloseTo(GENERATION_DECAY * GENERATION_DECAY, 12);
  });

  it("a pheno listing its seed line's parents is computed like a cross, with decay", () => {
    const pheno = lineageOf(
      [landrace("k", 10), landrace("t", 90), strain("pheno-33", ["k", "t"])],
      "pheno-33",
    );
    expect(pheno.confidence).toBe(GENERATION_DECAY);
  });

  it("a cut of a reported strain is reported-backed, so partial", () => {
    const result = lineageOf(
      [
        strain("told", ["unknown"], { reported: "indica-dominant" }),
        strain("clone", ["told"], { derivation: "cut" }),
      ],
      "clone",
    );
    expect(result).toMatchObject({ sativa_pct: 30, confidence: 0.5, method: "partial" });
  });
});

describe("unknown parents", () => {
  const known = [landrace("k", 10), landrace("t", 90), strain("a", ["k", "t"])];

  it("one unknown parent with reported_type fills the unknown share with it", () => {
    const result = lineageOf(
      [...known, strain("x", ["a", "unknown"], { reported: "indica" })],
      "x",
    );
    expect(result.sativa_pct).toBe(33); // 0.5·50 + 0.5·15 = 32.5 → 33
    expect(result.confidence).toBeCloseTo(0.97 * (0.5 * 0.97 + 0.5 * REPORTED_CONFIDENCE), 12);
    expect(result.method).toBe("partial");
  });

  it("one unknown parent without reported_type renormalizes and penalizes confidence", () => {
    const result = lineageOf([...known, strain("x", ["a", "unknown"])], "x");
    expect(result.sativa_pct).toBe(50);
    expect(result.confidence).toBeCloseTo(0.97 * 0.5 * 0.97, 12);
    expect(result.confidence_level).toBe("low");
    expect(result.method).toBe("partial");
  });

  it("renormalizes custom weights over the known parents", () => {
    const result = lineageOf(
      [
        landrace("k", 10),
        landrace("t", 90),
        strain("x", ["k", "t", "unknown"], { weights: [0.25, 0.25, 0.5] }),
      ],
      "x",
    );
    expect(result.sativa_pct).toBe(50);
    expect(result.confidence).toBeCloseTo(0.97 * 0.5, 12);
  });

  it("an unresolved parent id counts as unknown", () => {
    const result = lineageOf([...known, strain("x", ["a", "not-in-vault"])], "x");
    expect(result.sativa_pct).toBe(50);
    expect(result.method).toBe("partial");
  });

  it("all parents unknown falls back to reported_type", () => {
    const result = lineageOf([strain("x", ["unknown", "unknown"], { reported: "balanced" })], "x");
    expect(result).toMatchObject({
      sativa_pct: 50,
      label: "hybrid",
      sublabel: "balanced",
      confidence: REPORTED_CONFIDENCE,
      confidence_level: "medium",
      method: "reported",
    });
  });

  it("a lone unknown parent falls back to reported_type", () => {
    expect(lineageOf([strain("x", ["unknown"], { reported: "sativa" })], "x")).toMatchObject({
      sativa_pct: 85,
      label: "sativa",
      method: "reported",
    });
  });

  it("all parents unknown and no reported_type is unknown, with confidence 0", () => {
    expect(lineageOf([strain("x", ["unknown"])], "x")).toEqual({
      sativa_pct: null,
      indica_pct: null,
      label: "unknown",
      sublabel: null,
      confidence: 0,
      confidence_level: "none",
      method: "unknown",
      algo_version: ALGO_VERSION,
    });
  });

  it("a non-landrace with no parents falls back to reported_type", () => {
    expect(lineageOf([strain("x", [], { reported: "indica" })], "x").method).toBe("reported");
  });

  it("parents that are all unknown-valued (not just literal unknown) fall back", () => {
    const result = lineageOf(
      [strain("blank", ["unknown"]), strain("x", ["blank", "unknown"], { reported: "indica" })],
      "x",
    );
    expect(result).toMatchObject({ sativa_pct: 15, method: "reported" });
  });

  it("the reported_type is never averaged in when every parent is known", () => {
    const result = lineageOf([...known, strain("x", ["a", "k"], { reported: "sativa" })], "x");
    expect(result.sativa_pct).toBe(30);
    expect(result.method).toBe("traced");
  });
});

describe("input handling", () => {
  it("an id that isn't in the graph is unknown", () => {
    expect(computeLineage(graphOf(landrace("k", 10)), "nope").label).toBe("unknown");
  });

  it("throws when parent_weights don't line up with parents", () => {
    const graph = graphOf(
      landrace("k", 10),
      landrace("t", 90),
      strain("x", ["k", "t"], { weights: [1] }),
    );
    expect(() => computeLineage(graph, "x")).toThrow(/parent_weights has 1 entries/);
  });

  it("computeAll returns every node, in graph order", () => {
    const graph = workedExample();
    expect([...computeAll(graph).keys()]).toEqual([...graph.keys()]);
  });

  it("computeAll agrees with computeLineage for every node", () => {
    const graph = graphOf(...randomDag(400, 7));
    const all = computeAll(graph);
    for (const id of graph.keys()) expect(all.get(id)).toEqual(computeLineage(graph, id));
  });

  it("every result satisfies LineageSchema", () => {
    const all = computeAll(graphOf(...randomDag(1000, 42)));
    const methods = new Set<string>();
    for (const lineage of all.values()) {
      expect(LineageSchema.safeParse(lineage).success).toBe(true);
      methods.add(lineage.method);
    }
    expect([...methods].sort()).toEqual(["partial", "reported", "traced", "unknown"]);
  });

  it("is deterministic: the same graph gives the same output", () => {
    const first = computeAll(graphOf(...randomDag(500, 3)));
    const second = computeAll(graphOf(...randomDag(500, 3)));
    expect([...second.entries()]).toEqual([...first.entries()]);
  });
});
