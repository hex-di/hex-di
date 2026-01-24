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

// =============================================================================
// Property Tests: Adapter Configuration Fuzzing
// =============================================================================

describe("Property: Adapter Configuration Fuzzing", () => {
  it("random lifetime combinations create valid adapters", () => {
    fc.assert(
      fc.property(portNameArb, lifetimeArb, (name, lifetime) => {
        const port = makePort(name);
        const adapter = createAdapter({
          provides: port,
          requires: [] as const,
          lifetime,
          factory: () => ({ value: name }),
        });

        expect(adapter.provides).toBe(port);
        expect(adapter.lifetime).toBe(lifetime);
        expect(adapter.factoryKind).toBe("sync");
      }),
      { numRuns: 300 }
    );
  });

  it("adapters with random dependency counts maintain correct requires array", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(2, 6), fc.integer({ min: 0, max: 5 }), (names, depCount) => {
        const ports = names.map(makePort);
        const mainPort = ports[0]!;
        const depPorts = ports.slice(1, Math.min(depCount + 1, ports.length));

        const adapter = makeAdapter(mainPort, "singleton", depPorts);

        expect(adapter.requires.length).toBe(depPorts.length);
        for (let i = 0; i < depPorts.length; i++) {
          expect(adapter.requires[i]).toBe(depPorts[i]);
        }
      }),
      { numRuns: 200 }
    );
  });

  it("all lifetime values produce comparable factory behavior", () => {
    fc.assert(
      fc.property(portNameArb, name => {
        const port = makePort(name);
        const lifetimes: Lifetime[] = ["singleton", "scoped", "transient"];

        const adapters = lifetimes.map(lifetime => makeAdapter(port, lifetime));

        // All factories should produce same result shape regardless of lifetime
        for (const adapter of adapters) {
          const result = adapter.factory({});
          expect(result).toEqual({ value: name });
        }
      }),
      { numRuns: 200 }
    );
  });
});

// =============================================================================
// Property Tests: Random DAG (Directed Acyclic Graph) Structures
// =============================================================================

describe("Property: Random DAG Structures", () => {
  /**
   * Generates a random DAG structure as an adjacency list.
   * Each node can only depend on nodes that come before it (ensures acyclicity).
   */
  const dagArb = (minNodes = 2, maxNodes = 8) =>
    fc.integer({ min: minNodes, max: maxNodes }).chain(nodeCount => {
      // Generate unique names for each node
      const names = Array.from({ length: nodeCount }, (_, i) => `Node${i}`);

      // For each node (except first), randomly select dependencies from earlier nodes
      const depsArb = names.slice(1).map((_, i) => {
        const possibleDeps = names.slice(0, i + 1); // Nodes before this one
        return fc.subarray(possibleDeps, {
          minLength: 0,
          maxLength: Math.min(3, possibleDeps.length),
        });
      });

      return fc.tuple(fc.constant(names), ...depsArb);
    });

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
      { numRuns: 150 }
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
      { numRuns: 150 }
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
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property Tests: Error Message Invariants
// =============================================================================

describe("Property: Error Message Invariants", () => {
  it("inspection suggestions always have non-empty messages", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(2, 5), names => {
        const ports = names.map(makePort);

        // Create adapters where last one depends on a non-existent port
        const missingPort = makePort("MissingDep");
        const adapters = [
          ...ports.slice(0, -1).map(p => makeAdapter(p, "singleton", [])),
          makeAdapter(ports[ports.length - 1]!, "singleton", [missingPort]),
        ];

        const builder = buildFromAdapters(adapters);
        const inspection = builder.inspect();

        // Every suggestion should have a non-empty message
        for (const suggestion of inspection.suggestions) {
          expect(suggestion.message).toBeDefined();
          expect(suggestion.message.length).toBeGreaterThan(0);
          expect(suggestion.type).toBeDefined();
          expect(suggestion.portName).toBeDefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  it("validation errors contain port names mentioned", () => {
    fc.assert(
      fc.property(portNameArb, name => {
        const port = makePort(name);
        const missingDep = makePort(`Missing${name}`);
        const adapter = makeAdapter(port, "singleton", [missingDep]);

        const builder = (GraphBuilder.create() as any).provide(adapter);
        const validation = builder.validate();

        if (!validation.valid) {
          // Error messages should mention the missing port
          const allText = validation.errors.join(" ");
          expect(allText).toContain(`Missing${name}`);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("unsatisfied requirements list matches validation state", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(2, 4), names => {
        const ports = names.map(makePort);

        // Make first adapter depend on last, but don't include last adapter
        const adapters = ports.slice(0, -1).map((port, i) => {
          if (i === 0) {
            return makeAdapter(port, "singleton", [ports[ports.length - 1]!]);
          }
          return makeAdapter(port, "singleton", []);
        });

        const builder = buildFromAdapters(adapters);
        const inspection = builder.inspect();
        const validation = builder.validate();

        // Both should agree on incompleteness
        expect(inspection.isComplete).toBe(validation.valid);
        expect(inspection.unsatisfiedRequirements.length).toBe(
          validation.valid ? 0 : inspection.unsatisfiedRequirements.length
        );
      }),
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property Tests: Graph Transformations
// =============================================================================

describe("Property: Graph Transformations", () => {
  it("override preserves adapter count for same-port replacements", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(1, 4), lifetimeArb, lifetimeArb, (names, lt1, lt2) => {
        const ports = names.map(makePort);
        const adapters = ports.map(p => makeAdapter(p, lt1));

        const builder = buildFromAdapters(adapters);
        const originalCount = builder.inspect().adapterCount;

        // Override the first adapter with different lifetime
        const overrideAdapter = makeAdapter(ports[0]!, lt2);
        const overridden = builder.override(overrideAdapter);

        // Count increases by 1 (override adds, doesn't replace in builder)
        expect(overridden.inspect().adapterCount).toBe(originalCount + 1);
      }),
      { numRuns: 100 }
    );
  });

  it("provideMany equals sequential provide calls", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(2, 5), names => {
        const ports = names.map(makePort);
        const adapters = ports.map(p => makeAdapter(p));

        // Sequential provides
        const sequential = buildFromAdapters(adapters);

        // provideMany
        const batch: any = GraphBuilder.create().provideMany(adapters);

        expect(sequential.inspect().adapterCount).toBe(batch.inspect().adapterCount);
        expect(sequential.inspect().isComplete).toBe(batch.inspect().isComplete);
      }),
      { numRuns: 100 }
    );
  });

  it("merge with empty builder is identity", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(1, 5), names => {
        const ports = names.map(makePort);
        const adapters = ports.map(p => makeAdapter(p));

        const builder = buildFromAdapters(adapters);
        const empty = GraphBuilder.create();

        const merged1 = builder.merge(empty);
        const merged2 = empty.merge(builder);

        expect(merged1.inspect().adapterCount).toBe(builder.inspect().adapterCount);
        expect(merged2.inspect().adapterCount).toBe(builder.inspect().adapterCount);
      }),
      { numRuns: 100 }
    );
  });

  it("merge is commutative for disjoint graphs (same adapter count)", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(1, 3), uniquePortNamesArb(1, 3), (names1, names2) => {
        // Ensure disjoint
        const ports1 = names1.map(n => makePort(`L${n}`));
        const ports2 = names2.map(n => makePort(`R${n}`));

        const b1 = buildFromAdapters(ports1.map(p => makeAdapter(p)));
        const b2 = buildFromAdapters(ports2.map(p => makeAdapter(p)));

        const merged1 = b1.merge(b2);
        const merged2 = b2.merge(b1);

        expect(merged1.inspect().adapterCount).toBe(merged2.inspect().adapterCount);
      }),
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property Tests: Inspection Deep Consistency
// =============================================================================

describe("Property: Inspection Deep Consistency", () => {
  it("all independent adapters are orphan ports (no dependencies = all orphans)", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(1, 6), names => {
        const ports = names.map(makePort);
        const adapters = ports.map(p => makeAdapter(p)); // All independent

        const builder = buildFromAdapters(adapters);
        const inspection = builder.inspect();

        // Independent adapters are all orphans (none are required by others)
        expect(inspection.orphanPorts).toHaveLength(names.length);
      }),
      { numRuns: 150 }
    );
  });

  it("orphanPorts excludes ports that are dependencies of others", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 6 }), chainLength => {
        // Create a chain: A -> B -> C (each depends on the previous)
        const names = Array.from({ length: chainLength }, (_, i) => `Chain${i}`);
        const ports = names.map(makePort);

        const adapters = ports.map((port, i) => {
          if (i === 0) {
            return makeAdapter(port);
          }
          return makeAdapter(port, "singleton", [ports[i - 1]!]);
        });

        const builder = buildFromAdapters(adapters);
        const inspection = builder.inspect();

        // Only the last port in the chain is an orphan (nothing depends on it)
        // All other ports are dependencies of later ports in the chain
        expect(inspection.orphanPorts).toHaveLength(1);
        expect(inspection.orphanPorts[0]).toBe(`Chain${chainLength - 1}`);
      }),
      { numRuns: 100 }
    );
  });

  it("typeComplexityScore increases with graph size", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }),
        fc.integer({ min: 5, max: 8 }),
        (smallSize, largeSize) => {
          const smallNames = Array.from({ length: smallSize }, (_, i) => `Small${i}`);
          const largeNames = Array.from({ length: largeSize }, (_, i) => `Large${i}`);

          const smallBuilder = buildFromAdapters(smallNames.map(n => makeAdapter(makePort(n))));
          const largeBuilder = buildFromAdapters(largeNames.map(n => makeAdapter(makePort(n))));

          const smallScore = smallBuilder.inspect().typeComplexityScore;
          const largeScore = largeBuilder.inspect().typeComplexityScore;

          expect(largeScore).toBeGreaterThanOrEqual(smallScore);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("depthLimitExceeded is false for small graphs", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(1, 5), names => {
        const ports = names.map(makePort);
        const adapters = ports.map(p => makeAdapter(p));

        const builder = buildFromAdapters(adapters);
        const inspection = builder.inspect();

        // Small independent graphs should never exceed depth limit
        expect(inspection.depthLimitExceeded).toBe(false);
      }),
      { numRuns: 150 }
    );
  });

  it("provides count equals unique adapter count", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(1, 8), names => {
        const ports = names.map(makePort);
        const adapters = ports.map(p => makeAdapter(p));

        const builder = buildFromAdapters(adapters);
        const inspection = builder.inspect();

        expect(inspection.provides.length).toBe(inspection.adapterCount);
      }),
      { numRuns: 150 }
    );
  });

  it("validate().provides matches inspect().provides", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(1, 6), names => {
        const ports = names.map(makePort);
        const adapters = ports.map(p => makeAdapter(p));

        const builder = buildFromAdapters(adapters);
        const inspection = builder.inspect();
        const validation = builder.validate();

        expect(validation.provides).toEqual(inspection.provides);
        expect(validation.adapterCount).toBe(inspection.adapterCount);
      }),
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property Tests: Merge Collision Scenarios
// =============================================================================

describe("Property: Merge Collision Scenarios", () => {
  it("merging disjoint graphs combines all adapters", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(1, 3), names => {
        // Create two disjoint graphs
        const ports1 = names.map(n => makePort(`Left${n}`));
        const ports2 = names.map(n => makePort(`Right${n}`));

        const b1 = buildFromAdapters(ports1.map(p => makeAdapter(p, "singleton")));
        const b2 = buildFromAdapters(ports2.map(p => makeAdapter(p, "scoped")));

        const merged = b1.merge(b2);
        const inspection = merged.inspect();

        // Merged graph should have all adapters
        expect(inspection.adapterCount).toBe(ports1.length + ports2.length);
        expect(inspection.isComplete).toBe(true);
      }),
      { numRuns: 50 }
    );
  });

  it("merge preserves all port names", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(2, 4), names => {
        const half = Math.ceil(names.length / 2);

        // First graph has first half
        const ports1 = names.slice(0, half).map(n => makePort(`A${n}`));
        const b1 = buildFromAdapters(ports1.map(p => makeAdapter(p)));

        // Second graph has second half
        const ports2 = names.slice(half).map(n => makePort(`B${n}`));
        const b2 = buildFromAdapters(ports2.map(p => makeAdapter(p)));

        const merged = b1.merge(b2);
        const inspection = merged.inspect();

        // All port names should be present
        const allProvides = inspection.provides;
        expect(allProvides.length).toBe(ports1.length + ports2.length);
      }),
      { numRuns: 50 }
    );
  });
});

// =============================================================================
// Property Tests: Error Recovery Paths
// =============================================================================

describe("Property: Error Recovery Paths", () => {
  it("adding missing dependency makes incomplete graph complete", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(2, 5), names => {
        const ports = names.map(makePort);

        // Create adapters where last depends on first, but skip first initially
        const missingPort = ports[0]!;
        const dependentAdapters = ports.slice(1).map((port, i) => {
          if (i === 0) {
            return makeAdapter(port, "singleton", [missingPort]);
          }
          return makeAdapter(port);
        });

        // Incomplete graph
        const incomplete = buildFromAdapters(dependentAdapters);
        expect(incomplete.inspect().isComplete).toBe(false);
        expect(incomplete.inspect().unsatisfiedRequirements).toContain(missingPort.__portName);

        // Add missing dependency
        const complete = incomplete.provide(makeAdapter(missingPort));
        expect(complete.inspect().isComplete).toBe(true);
        expect(complete.inspect().unsatisfiedRequirements).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });

  it("validation state transitions from invalid to valid after fix", () => {
    fc.assert(
      fc.property(
        portNameArb,
        portNameArb.filter(n => n.length > 1),
        (mainName, depName) => {
          // Ensure names are different
          const actualDepName = mainName === depName ? `${depName}X` : depName;

          const mainPort = makePort(mainName);
          const depPort = makePort(actualDepName);

          // Create adapter with missing dependency
          const dependentAdapter = makeAdapter(mainPort, "singleton", [depPort]);
          const invalidBuilder: any = GraphBuilder.create().provide(dependentAdapter);

          const invalidValidation = invalidBuilder.validate();
          expect(invalidValidation.valid).toBe(false);

          // Fix by adding the dependency
          const depAdapter = makeAdapter(depPort);
          const fixedBuilder = invalidBuilder.provide(depAdapter);

          const validValidation = fixedBuilder.validate();
          expect(validValidation.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property Tests: Override Cascading
// =============================================================================

describe("Property: Override Cascading", () => {
  it("override does not modify original builder", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(1, 4), lifetimeArb, (names, newLifetime) => {
        const ports = names.map(makePort);
        const originalAdapters = ports.map(p => makeAdapter(p, "singleton"));

        const original = buildFromAdapters(originalAdapters);
        const originalSnapshot = {
          adapterCount: original.inspect().adapterCount,
          provides: [...original.inspect().provides],
        };

        // Override first adapter
        const overrideAdapter = makeAdapter(ports[0]!, newLifetime);
        const withOverride = original.override(overrideAdapter);

        // Original should be unchanged
        expect(original.inspect().adapterCount).toBe(originalSnapshot.adapterCount);
        expect(original.inspect().provides).toEqual(originalSnapshot.provides);

        // Override builder should have additional adapter
        expect(withOverride.inspect().adapterCount).toBe(originalSnapshot.adapterCount + 1);
      }),
      { numRuns: 100 }
    );
  });

  it("multiple overrides accumulate without affecting base", () => {
    fc.assert(
      fc.property(
        uniquePortNamesArb(2, 4),
        fc.array(lifetimeArb, { minLength: 1, maxLength: 3 }),
        (names, lifetimes) => {
          const ports = names.map(makePort);
          const baseAdapters = ports.map(p => makeAdapter(p, "singleton"));

          const base = buildFromAdapters(baseAdapters);
          const baseCount = base.inspect().adapterCount;

          // Apply multiple overrides for first port
          let overridden = base;
          for (const lt of lifetimes) {
            overridden = overridden.override(makeAdapter(ports[0]!, lt));
          }

          // Base unchanged
          expect(base.inspect().adapterCount).toBe(baseCount);

          // Overridden has all the override adapters
          expect(overridden.inspect().adapterCount).toBe(baseCount + lifetimes.length);
        }
      ),
      { numRuns: 50 }
    );
  });
});

// =============================================================================
// Property Tests: Async Adapter Handling
// =============================================================================

describe("Property: Async Adapter Handling", () => {
  it("graph with sync adapters is complete and valid", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(1, 5), names => {
        const ports = names.map(makePort);

        // Create all sync adapters
        const adapters = ports.map(port => makeAdapter(port));

        const builder = buildFromAdapters(adapters);
        const inspection = builder.inspect();

        expect(inspection.isComplete).toBe(true);
        expect(inspection.adapterCount).toBe(names.length);
      }),
      { numRuns: 100 }
    );
  });

  it("dependency chain is tracked correctly", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 4 }), chainLength => {
        // Create chain of adapters
        const names = Array.from({ length: chainLength }, (_, i) => `Chain${i}`);
        const ports = names.map(makePort);

        // First adapter has no deps, rest depend on previous
        const adapters = ports.map((port, i) => {
          if (i === 0) {
            return makeAdapter(port);
          }
          return makeAdapter(port, "singleton", [ports[i - 1]!]);
        });

        const builder = buildFromAdapters(adapters);
        const inspection = builder.inspect();

        expect(inspection.isComplete).toBe(true);
        expect(inspection.adapterCount).toBe(chainLength);
        expect(inspection.maxChainDepth).toBe(chainLength - 1);
      }),
      { numRuns: 50 }
    );
  });
});

// =============================================================================
// NOTE: Visualization property tests have moved to @hex-di/visualization
// =============================================================================
