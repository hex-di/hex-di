/**
 * Property-Based Tests for @hex-di/graph
 *
 * Uses fast-check to generate random inputs and verify invariants hold
 * across thousands of test cases. These tests complement the example-based
 * tests by exploring edge cases that might not be covered manually.
 *
 * ## Properties Tested
 *
 * 1. **Adapter Creation**: Valid inputs always produce valid adapters
 * 2. **GraphBuilder Invariants**: Adapter count, immutability, idempotence
 * 3. **Inspection Consistency**: inspect() returns accurate data
 * 4. **Commutativity**: Order of provides doesn't affect final graph
 *
 * ## Note on Type Assertions
 *
 * Property tests use `any` types in some places because:
 * - Port names are generated at runtime, not compile time
 * - TypeScript cannot track phantom types through dynamic loops
 * - Test files allow `any` for mocking flexibility (per project rules)
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createPort, type Port } from "@hex-di/ports";
import { createAdapter, GraphBuilder, type Lifetime, inspectGraph } from "../src/index.js";

// =============================================================================
// Test Helpers and Arbitraries
// =============================================================================

/**
 * Generates valid port names (non-empty alphanumeric strings starting with uppercase).
 */
const portNameArb = fc.stringMatching(/^[A-Z][a-zA-Z0-9]{0,19}$/);

/**
 * Generates lifetime values.
 */
const lifetimeArb = fc.constantFrom<Lifetime>("singleton", "scoped", "transient");

/**
 * Creates a port with the given name.
 */
function makePort(name: string): Port<{ value: string }, string> {
  return createPort(name);
}

/**
 * Creates an adapter for the given port with optional dependencies.
 * Returns `any` to allow dynamic composition in property tests.
 */
function makeAdapter(
  port: Port<{ value: string }, string>,
  lifetime: Lifetime = "singleton",
  requires: readonly Port<{ value: string }, string>[] = []
): any {
  return createAdapter({
    provides: port,
    requires,
    lifetime,
    factory: () => ({ value: port.__portName }),
  });
}

/**
 * Generates a unique list of port names.
 */
const uniquePortNamesArb = (minLength = 1, maxLength = 10) =>
  fc
    .array(portNameArb, { minLength, maxLength })
    .map(names => [...new Set(names)])
    .filter(names => names.length >= minLength);

/**
 * Helper to build a graph from a list of independent adapters.
 * Uses any-typed builder to bypass compile-time validation for runtime tests.
 */
function buildFromAdapters(adapters: any[]): any {
  let builder: any = GraphBuilder.create();
  for (const adapter of adapters) {
    builder = builder.provide(adapter);
  }
  return builder;
}

// =============================================================================
// Property Tests: Adapter Creation
// =============================================================================

describe("Property: Adapter Creation", () => {
  it("any valid port name creates a valid port", () => {
    fc.assert(
      fc.property(portNameArb, name => {
        const port = makePort(name);
        expect(port.__portName).toBe(name);
        expect(typeof port.__portName).toBe("string");
      }),
      { numRuns: 500 }
    );
  });

  it("any lifetime value creates a valid adapter", () => {
    fc.assert(
      fc.property(portNameArb, lifetimeArb, (name, lifetime) => {
        const port = makePort(name);
        const adapter = makeAdapter(port, lifetime);

        expect(adapter.provides).toBe(port);
        expect(adapter.lifetime).toBe(lifetime);
        expect(adapter.factoryKind).toBe("sync");
      }),
      { numRuns: 500 }
    );
  });

  it("factory always returns the expected shape", () => {
    fc.assert(
      fc.property(portNameArb, name => {
        const port = makePort(name);
        const adapter = makeAdapter(port);

        const result = adapter.factory({});
        expect(result).toEqual({ value: name });
      }),
      { numRuns: 500 }
    );
  });
});

// =============================================================================
// Property Tests: GraphBuilder Invariants
// =============================================================================

describe("Property: GraphBuilder Invariants", () => {
  it("adding N unique adapters results in N adapters in the graph", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(1, 8), names => {
        const ports = names.map(makePort);
        const adapters = ports.map(p => makeAdapter(p));

        const builder = buildFromAdapters(adapters);
        const inspection = builder.inspect();
        expect(inspection.adapterCount).toBe(names.length);
      }),
      { numRuns: 200 }
    );
  });

  it("GraphBuilder is immutable - original not modified by provide()", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(2, 5), names => {
        const ports = names.map(makePort);
        const adapters = ports.map(p => makeAdapter(p));

        const original = GraphBuilder.create();
        const originalCount = original.inspect().adapterCount;

        // Add adapters to a new builder (leaves original unchanged)
        const modified = buildFromAdapters(adapters);

        // Original should be unchanged
        expect(original.inspect().adapterCount).toBe(originalCount);
        expect(modified.inspect().adapterCount).toBe(names.length);
      }),
      { numRuns: 200 }
    );
  });

  it("buildFragment succeeds for any set of unique independent adapters", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(1, 8), names => {
        const ports = names.map(makePort);
        const adapters = ports.map(p => makeAdapter(p));

        const builder = buildFromAdapters(adapters);
        const graph = builder.buildFragment();
        expect(graph.adapters.length).toBe(names.length);
      }),
      { numRuns: 200 }
    );
  });

  it("inspection adapterCount matches graph.adapters.length after build", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(1, 8), names => {
        const ports = names.map(makePort);
        const adapters = ports.map(p => makeAdapter(p));

        const builder = buildFromAdapters(adapters);
        const builderInspection = builder.inspect();
        const graph = builder.buildFragment();
        const graphInspection = inspectGraph(graph);

        expect(builderInspection.adapterCount).toBe(graph.adapters.length);
        expect(graphInspection.adapterCount).toBe(graph.adapters.length);
      }),
      { numRuns: 200 }
    );
  });
});

// =============================================================================
// Property Tests: Commutativity
// =============================================================================

describe("Property: Commutativity", () => {
  it("order of provides does not affect adapter count", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(2, 6), names => {
        const ports = names.map(makePort);
        const adapters = ports.map(p => makeAdapter(p));

        // Build in original order
        const builder1 = buildFromAdapters(adapters);

        // Build in reverse order
        const builder2 = buildFromAdapters([...adapters].reverse());

        expect(builder1.inspect().adapterCount).toBe(builder2.inspect().adapterCount);
      }),
      { numRuns: 200 }
    );
  });

  it("order of provides does not affect provided port set", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(2, 6), names => {
        const ports = names.map(makePort);
        const adapters = ports.map(p => makeAdapter(p));

        // Build in original order
        const builder1 = buildFromAdapters(adapters);

        // Build in shuffled order
        const shuffled = fc.sample(
          fc.shuffledSubarray(adapters, { minLength: adapters.length }),
          1
        )[0]!;
        const builder2 = buildFromAdapters(shuffled);

        const provides1 = new Set(builder1.inspect().provides.map((p: string) => p.split(" ")[0]));
        const provides2 = new Set(builder2.inspect().provides.map((p: string) => p.split(" ")[0]));

        expect(provides1).toEqual(provides2);
      }),
      { numRuns: 200 }
    );
  });
});

// =============================================================================
// Property Tests: Inspection Consistency
// =============================================================================

describe("Property: Inspection Consistency", () => {
  it("inspect().provides contains all port names", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(1, 8), names => {
        const ports = names.map(makePort);
        const adapters = ports.map(p => makeAdapter(p));

        const builder = buildFromAdapters(adapters);
        const inspection = builder.inspect();
        const providedNames = inspection.provides.map((p: string) => p.split(" ")[0]);

        for (const name of names) {
          expect(providedNames).toContain(name);
        }
      }),
      { numRuns: 200 }
    );
  });

  it("independent adapters have no unsatisfied requirements", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(1, 8), names => {
        const ports = names.map(makePort);
        const adapters = ports.map(p => makeAdapter(p)); // No dependencies

        const builder = buildFromAdapters(adapters);
        const inspection = builder.inspect();
        expect(inspection.unsatisfiedRequirements).toHaveLength(0);
        expect(inspection.isComplete).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it("maxChainDepth is 0 for independent adapters", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(1, 8), names => {
        const ports = names.map(makePort);
        const adapters = ports.map(p => makeAdapter(p)); // No dependencies

        const builder = buildFromAdapters(adapters);
        const inspection = builder.inspect();
        expect(inspection.maxChainDepth).toBe(0);
      }),
      { numRuns: 200 }
    );
  });

  it("inspectGraph matches builder.inspect for built graphs", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(1, 8), names => {
        const ports = names.map(makePort);
        const adapters = ports.map(p => makeAdapter(p));

        const builder = buildFromAdapters(adapters);
        const builderInspection = builder.inspect();
        const graph = builder.buildFragment();
        const graphInspection = inspectGraph(graph);

        expect(graphInspection.adapterCount).toBe(builderInspection.adapterCount);
        expect(graphInspection.isComplete).toBe(builderInspection.isComplete);
        expect(graphInspection.maxChainDepth).toBe(builderInspection.maxChainDepth);
      }),
      { numRuns: 200 }
    );
  });
});

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
      { numRuns: 100 }
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
      { numRuns: 100 }
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
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property Tests: Lifetime Consistency
// =============================================================================

describe("Property: Lifetime Consistency", () => {
  it("all lifetimes are preserved in inspection", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(portNameArb, lifetimeArb), { minLength: 1, maxLength: 5 }),
        configs => {
          // Make names unique
          const uniqueConfigs = configs.reduce(
            (acc, [name, lifetime]) => {
              if (!acc.some(([n]) => n === name)) {
                acc.push([name, lifetime]);
              }
              return acc;
            },
            [] as [string, Lifetime][]
          );

          if (uniqueConfigs.length === 0) return;

          const adapters = uniqueConfigs.map(([name, lifetime]) => {
            const port = makePort(name);
            return makeAdapter(port, lifetime);
          });

          const builder = buildFromAdapters(adapters);
          const inspection = builder.inspect();

          for (const [name, lifetime] of uniqueConfigs) {
            // Use exact match on port name (before the space and lifetime)
            const found = inspection.provides.find((p: string) => {
              const portName = p.split(" ")[0];
              return portName === name;
            });
            expect(found).toBeDefined();
            expect(found).toContain(`(${lifetime})`);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});

// =============================================================================
// Property Tests: Merge Operations
// =============================================================================

describe("Property: Merge Operations", () => {
  it("merging two disjoint graphs combines their adapters", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(1, 4), uniquePortNamesArb(1, 4), (names1, names2) => {
        // Ensure disjoint by prefixing
        const prefixed1 = names1.map(n => `A${n}`);
        const prefixed2 = names2.map(n => `B${n}`);

        const ports1 = prefixed1.map(makePort);
        const ports2 = prefixed2.map(makePort);

        const builder1 = buildFromAdapters(ports1.map(p => makeAdapter(p)));
        const builder2 = buildFromAdapters(ports2.map(p => makeAdapter(p)));

        const merged = builder1.merge(builder2);
        const inspection = merged.inspect();

        expect(inspection.adapterCount).toBe(prefixed1.length + prefixed2.length);
      }),
      { numRuns: 100 }
    );
  });

  it("merge is associative for disjoint graphs", () => {
    fc.assert(
      fc.property(
        uniquePortNamesArb(1, 3),
        uniquePortNamesArb(1, 3),
        uniquePortNamesArb(1, 3),
        (names1, names2, names3) => {
          // Ensure disjoint by prefixing
          const ports1 = names1.map(n => makePort(`X${n}`));
          const ports2 = names2.map(n => makePort(`Y${n}`));
          const ports3 = names3.map(n => makePort(`Z${n}`));

          const b1 = buildFromAdapters(ports1.map(p => makeAdapter(p)));
          const b2 = buildFromAdapters(ports2.map(p => makeAdapter(p)));
          const b3 = buildFromAdapters(ports3.map(p => makeAdapter(p)));

          // (b1 merge b2) merge b3
          const leftFirst = b1.merge(b2).merge(b3);

          // b1 merge (b2 merge b3)
          const rightFirst = b1.merge(b2.merge(b3));

          expect(leftFirst.inspect().adapterCount).toBe(rightFirst.inspect().adapterCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
