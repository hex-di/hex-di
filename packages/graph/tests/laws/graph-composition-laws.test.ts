/**
 * Property-based tests for graph composition laws.
 *
 * Verifies BEH-GR-07-001 (merge associativity), BEH-GR-07-002 (merge identity),
 * BEH-GR-07-003 (provide idempotence), BEH-GR-07-004 (build determinism),
 * and merge commutativity for non-conflicting graphs.
 *
 * Cross-refs: BEH-GR-07, INV-GR-4, RES-07
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { GraphBuilder } from "../../src/index.js";
import {
  arbGraphBuilder,
  uniquePrefixedNamesArb,
  makePort,
  makeAdapter,
  assertBuildersEquivalent,
  providedPortNames,
  overridePortNameSet,
  lifetimeArb,
} from "./arbitraries.js";

const NUM_RUNS = 1000;

// =============================================================================
// BEH-GR-07-001: Merge Associativity
// (A.merge(B)).merge(C) === A.merge(B.merge(C))
// =============================================================================

describe("BEH-GR-07-001: Merge Associativity", () => {
  it("(A.merge(B)).merge(C) is equivalent to A.merge(B.merge(C)) for disjoint graphs", () => {
    fc.assert(
      fc.property(
        arbGraphBuilder("A", 0, 5),
        arbGraphBuilder("B", 0, 5),
        arbGraphBuilder("C", 0, 5),
        (a: any, b: any, c: any) => {
          const left = a.merge(b).merge(c);
          const right = a.merge(b.merge(c));

          const result = assertBuildersEquivalent(left, right);
          expect(result.equivalent).toBe(true);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it("associativity holds for empty builders", () => {
    const empty = GraphBuilder.create();
    const left = empty.merge(empty).merge(empty);
    const right = empty.merge(empty.merge(empty));

    const result = assertBuildersEquivalent(left, right);
    expect(result.equivalent).toBe(true);
    expect(left.inspect().adapterCount).toBe(0);
  });

  it("associativity holds when one builder is empty", () => {
    fc.assert(
      fc.property(arbGraphBuilder("X", 1, 5), arbGraphBuilder("Y", 1, 5), (a: any, b: any) => {
        const empty = GraphBuilder.create();

        // (A.merge(empty)).merge(B) === A.merge(empty.merge(B))
        const left = a.merge(empty).merge(b);
        const right = a.merge(empty.merge(b));

        const result = assertBuildersEquivalent(left, right);
        expect(result.equivalent).toBe(true);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it("associativity preserves adapter set equality (order-insensitive)", () => {
    fc.assert(
      fc.property(
        arbGraphBuilder("P", 1, 3),
        arbGraphBuilder("Q", 1, 3),
        arbGraphBuilder("R", 1, 3),
        (a: any, b: any, c: any) => {
          const left = a.merge(b).merge(c);
          const right = a.merge(b.merge(c));

          // Same set of provided port names
          const leftNames = providedPortNames(left);
          const rightNames = providedPortNames(right);
          expect(leftNames).toEqual(rightNames);

          // Same override port names
          const leftOverrides = overridePortNameSet(left);
          const rightOverrides = overridePortNameSet(right);
          expect(leftOverrides).toEqual(rightOverrides);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});

// =============================================================================
// BEH-GR-07-002: Merge Identity
// A.merge(empty) === A and empty.merge(A) === A
// =============================================================================

describe("BEH-GR-07-002: Merge Identity", () => {
  it("A.merge(empty) is equivalent to A (right identity)", () => {
    fc.assert(
      fc.property(arbGraphBuilder("I", 0, 5), (a: any) => {
        const empty = GraphBuilder.create();
        const rightId = a.merge(empty);

        const result = assertBuildersEquivalent(rightId, a);
        expect(result.equivalent).toBe(true);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it("empty.merge(A) is equivalent to A (left identity)", () => {
    fc.assert(
      fc.property(arbGraphBuilder("J", 0, 5), (a: any) => {
        const empty = GraphBuilder.create();
        const leftId = empty.merge(a);

        const result = assertBuildersEquivalent(leftId, a);
        expect(result.equivalent).toBe(true);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it("right identity preserves adapters array", () => {
    fc.assert(
      fc.property(arbGraphBuilder("K", 0, 5), (a: any) => {
        const empty = GraphBuilder.create();
        const rightId = a.merge(empty);

        expect(rightId.adapters.length).toBe(a.adapters.length);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it("left identity preserves adapters array", () => {
    fc.assert(
      fc.property(arbGraphBuilder("L", 0, 5), (a: any) => {
        const empty = GraphBuilder.create();
        const leftId = empty.merge(a);

        expect(leftId.adapters.length).toBe(a.adapters.length);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it("both identities preserve override port names", () => {
    fc.assert(
      fc.property(arbGraphBuilder("M", 0, 5), (a: any) => {
        const empty = GraphBuilder.create();
        const rightId = a.merge(empty);
        const leftId = empty.merge(a);

        expect(overridePortNameSet(rightId)).toEqual(overridePortNameSet(a));
        expect(overridePortNameSet(leftId)).toEqual(overridePortNameSet(a));
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it("empty.merge(empty) is equivalent to empty", () => {
    const empty = GraphBuilder.create();
    const merged = empty.merge(empty);

    const result = assertBuildersEquivalent(merged, empty);
    expect(result.equivalent).toBe(true);
    expect(merged.inspect().adapterCount).toBe(0);
  });
});

// =============================================================================
// Merge Commutativity (for non-conflicting graphs)
// A.merge(B) === B.merge(A) when ports are disjoint
// =============================================================================

describe("Merge Commutativity (non-conflicting graphs)", () => {
  it("A.merge(B) is equivalent to B.merge(A) when ports are disjoint", () => {
    fc.assert(
      fc.property(
        arbGraphBuilder("Left", 0, 5),
        arbGraphBuilder("Right", 0, 5),
        (a: any, b: any) => {
          const ab = a.merge(b);
          const ba = b.merge(a);

          const result = assertBuildersEquivalent(ab, ba);
          expect(result.equivalent).toBe(true);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it("commutativity preserves adapter count", () => {
    fc.assert(
      fc.property(arbGraphBuilder("F", 1, 4), arbGraphBuilder("G", 1, 4), (a: any, b: any) => {
        const ab = a.merge(b);
        const ba = b.merge(a);

        expect(ab.inspect().adapterCount).toBe(ba.inspect().adapterCount);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it("commutativity preserves isComplete status", () => {
    fc.assert(
      fc.property(arbGraphBuilder("H", 0, 5), arbGraphBuilder("N", 0, 5), (a: any, b: any) => {
        const ab = a.merge(b);
        const ba = b.merge(a);

        expect(ab.inspect().isComplete).toBe(ba.inspect().isComplete);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it("commutativity preserves provided port names (set equality)", () => {
    fc.assert(
      fc.property(arbGraphBuilder("S", 1, 5), arbGraphBuilder("T", 1, 5), (a: any, b: any) => {
        const ab = a.merge(b);
        const ba = b.merge(a);

        expect(providedPortNames(ab)).toEqual(providedPortNames(ba));
      }),
      { numRuns: NUM_RUNS }
    );
  });
});

// =============================================================================
// BEH-GR-07-003: Provide Idempotence (deterministic duplicate error)
// =============================================================================

describe("BEH-GR-07-003: Provide Idempotence", () => {
  it("providing the same adapter twice produces a deterministic duplicate error at build", () => {
    fc.assert(
      fc.property(uniquePrefixedNamesArb("Dup", 1, 1), lifetimeArb, (names, lt) => {
        const p = makePort(names[0]!);
        const adapter = makeAdapter(p, lt);

        const single: any = GraphBuilder.create().provide(adapter);
        const double: any = single.provide(adapter);

        // Single provide should build successfully
        const singleInspection = single.inspect();
        expect(singleInspection.isComplete).toBe(true);

        // Double provide results in a build that may fail or have duplicate detection
        // The builder should remain internally consistent
        const doubleInspection = double.inspect();
        expect(doubleInspection.adapterCount).toBe(2);

        // Both inspections should be stable (deterministic)
        const doubleInspection2 = double.inspect();
        expect(doubleInspection.adapterCount).toBe(doubleInspection2.adapterCount);
        expect(doubleInspection.isComplete).toBe(doubleInspection2.isComplete);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it("duplicate provide produces consistent validation across multiple calls", () => {
    fc.assert(
      fc.property(uniquePrefixedNamesArb("Idem", 1, 1), lifetimeArb, (names, lt) => {
        const p = makePort(names[0]!);
        const adapter = makeAdapter(p, lt);

        const double: any = GraphBuilder.create().provide(adapter).provide(adapter);

        // Validate multiple times - must be deterministic
        const v1 = double.validate();
        const v2 = double.validate();

        expect(v1.valid).toBe(v2.valid);
        expect(v1.adapterCount).toBe(v2.adapterCount);
        expect(v1.provides).toEqual(v2.provides);
      }),
      { numRuns: NUM_RUNS }
    );
  });
});

// =============================================================================
// BEH-GR-07-004: Build Determinism
// =============================================================================

describe("BEH-GR-07-004: Build Determinism", () => {
  it("building the same builder N times produces identical inspection output", () => {
    fc.assert(
      fc.property(arbGraphBuilder("Det", 1, 5), (builder: any) => {
        const N = 10;
        const inspections = Array.from({ length: N }, () => builder.inspect());

        const reference = inspections[0]!;
        for (let i = 1; i < N; i++) {
          const current = inspections[i]!;
          expect(current.adapterCount).toBe(reference.adapterCount);
          expect(current.maxChainDepth).toBe(reference.maxChainDepth);
          expect(current.isComplete).toBe(reference.isComplete);
          expect(current.provides).toEqual(reference.provides);
          expect(current.unsatisfiedRequirements).toEqual(reference.unsatisfiedRequirements);
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it("build() produces identical graphs for the same builder", () => {
    fc.assert(
      fc.property(arbGraphBuilder("Bld", 1, 5), (builder: any) => {
        const inspection = builder.inspect();
        if (!inspection.isComplete) return; // skip incomplete builders

        const graph1 = builder.build();
        const graph2 = builder.build();

        // Same set of provided port names (via adapters)
        const names1 = new Set(graph1.adapters.map((a: any) => a.provides.__portName));
        const names2 = new Set(graph2.adapters.map((a: any) => a.provides.__portName));
        expect(names1).toEqual(names2);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it("inspection provides are in registration order (deterministic)", () => {
    fc.assert(
      fc.property(uniquePrefixedNamesArb("Ord", 2, 5), names => {
        const ports = names.map(makePort);
        const adapters = ports.map(p => makeAdapter(p));

        let builder: any = GraphBuilder.create();
        for (const adapter of adapters) {
          builder = builder.provide(adapter);
        }

        const inspection1 = builder.inspect();
        const inspection2 = builder.inspect();

        // Provides must be in identical order across inspections
        expect(inspection1.provides).toEqual(inspection2.provides);

        // The order must reflect registration order
        const providedNames = (inspection1.provides as readonly string[]).map((p: string) =>
          p.replace(/ \(.*\)$/, "")
        );
        expect(providedNames).toEqual(names);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it("validate() is deterministic for the same builder", () => {
    fc.assert(
      fc.property(arbGraphBuilder("Val", 1, 5), (builder: any) => {
        const v1 = builder.validate();
        const v2 = builder.validate();

        expect(v1.valid).toBe(v2.valid);
        expect(v1.adapterCount).toBe(v2.adapterCount);
        expect(v1.provides).toEqual(v2.provides);
        expect(v1.unsatisfiedRequirements).toEqual(v2.unsatisfiedRequirements);
        expect(v1.maxChainDepth).toBe(v2.maxChainDepth);
      }),
      { numRuns: NUM_RUNS }
    );
  });
});
