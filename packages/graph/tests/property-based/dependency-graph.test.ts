/**
 * Property-Based Tests: Dependency Graph
 *
 * Tests covering dependency chains and random DAG structures.
 * Uses fast-check to verify invariants across random inputs.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  fcConfig,
  dagArb,
  makePort,
  makeAdapter,
  buildFromAdapters,
} from "../property-based-helpers.js";

// =============================================================================
// Property Tests: Dependency Chains
// =============================================================================

describe("Property: Dependency Chains", () => {
  it("linear dependency chain has correct maxChainDepth", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 8 }), chainLength => {
        // Create a chain: A -> B -> C -> ... (each depends on the previous)
        const names = Array.from({ length: chainLength }, (_, i) => `Service${i}`);
        const ports = names.map(makePort);

        const adapters = ports.map((port, i) => {
          if (i === 0) {
            return makeAdapter(port);
          }
          return makeAdapter(port, "singleton", [ports[i - 1]!]);
        });

        const builder = buildFromAdapters(adapters);
        const inspection = builder.inspect();
        // Chain depth is chainLength - 1 (edges, not nodes)
        expect(inspection.maxChainDepth).toBe(chainLength - 1);
      }),
      fcConfig(100)
    );
  });

  it("satisfied dependencies show isComplete = true", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 6 }), chainLength => {
        const names = Array.from({ length: chainLength }, (_, i) => `Svc${i}`);
        const ports = names.map(makePort);

        const adapters = ports.map((port, i) => {
          if (i === 0) {
            return makeAdapter(port);
          }
          return makeAdapter(port, "singleton", [ports[i - 1]!]);
        });

        const builder = buildFromAdapters(adapters);
        expect(builder.inspect().isComplete).toBe(true);
      }),
      fcConfig(100)
    );
  });

  it("missing dependency shows isComplete = false", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 6 }), chainLength => {
        const names = Array.from({ length: chainLength }, (_, i) => `Dep${i}`);
        const ports = names.map(makePort);

        // Create adapters but skip the first one (creates unsatisfied dependency)
        const adapters = ports.slice(1).map((port, i) => {
          return makeAdapter(port, "singleton", [ports[i]!]);
        });

        const builder = buildFromAdapters(adapters);
        const inspection = builder.inspect();
        expect(inspection.isComplete).toBe(false);
        expect(inspection.unsatisfiedRequirements).toContain(ports[0]!.__portName);
      }),
      fcConfig(100)
    );
  });
});

// =============================================================================
// Property Tests: Random DAG (Directed Acyclic Graph) Structures
// =============================================================================

describe("Property: Random DAG Structures", () => {
  it("random DAGs produce complete graphs when all nodes are present", () => {
    fc.assert(
      fc.property(dagArb(2, 6), ([names, ...depArrays]) => {
        const ports = names.map(makePort);
        const portByName = new Map(names.map((n, i) => [n, ports[i]!]));

        const adapters = ports.map((port, i) => {
          if (i === 0) {
            return makeAdapter(port, "singleton", []);
          }
          const deps = (depArrays[i - 1] || []).map(name => portByName.get(name)!);
          return makeAdapter(port, "singleton", deps);
        });

        const builder = buildFromAdapters(adapters);
        const inspection = builder.inspect();

        expect(inspection.isComplete).toBe(true);
        expect(inspection.adapterCount).toBe(names.length);
      }),
      fcConfig(150)
    );
  });

  it("maxChainDepth is bounded by node count minus one", () => {
    fc.assert(
      fc.property(dagArb(2, 8), ([names, ...depArrays]) => {
        const ports = names.map(makePort);
        const portByName = new Map(names.map((n, i) => [n, ports[i]!]));

        const adapters = ports.map((port, i) => {
          if (i === 0) {
            return makeAdapter(port, "singleton", []);
          }
          const deps = (depArrays[i - 1] || []).map(name => portByName.get(name)!);
          return makeAdapter(port, "singleton", deps);
        });

        const builder = buildFromAdapters(adapters);
        const inspection = builder.inspect();

        // Max depth cannot exceed nodeCount - 1 (longest possible chain)
        expect(inspection.maxChainDepth).toBeLessThanOrEqual(names.length - 1);
      }),
      fcConfig(150)
    );
  });

  it("diamond dependency patterns are handled correctly", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), extraNodes => {
        // Diamond: A -> B, A -> C, B -> D, C -> D
        // Plus extra independent nodes
        const baseNames = ["Root", "Left", "Right", "Bottom"];
        const extraNames = Array.from({ length: extraNodes }, (_, i) => `Extra${i}`);
        const allNames = [...baseNames, ...extraNames];

        const ports = allNames.map(makePort);
        const [root, left, right, bottom] = ports;

        const adapters = [
          makeAdapter(root!, "singleton", []),
          makeAdapter(left!, "singleton", [root!]),
          makeAdapter(right!, "singleton", [root!]),
          makeAdapter(bottom!, "singleton", [left!, right!]),
          ...ports.slice(4).map(p => makeAdapter(p, "singleton", [])),
        ];

        const builder = buildFromAdapters(adapters);
        const inspection = builder.inspect();

        expect(inspection.isComplete).toBe(true);
        expect(inspection.adapterCount).toBe(allNames.length);
        // Diamond has depth 2: Root -> Left/Right -> Bottom
        expect(inspection.maxChainDepth).toBe(2);
      }),
      fcConfig(100)
    );
  });
});
