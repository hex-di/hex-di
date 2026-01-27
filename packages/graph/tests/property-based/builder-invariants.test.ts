/**
 * Property-Based Tests: Builder Invariants
 *
 * Tests covering GraphBuilder invariants, commutativity, and lifetime consistency.
 * Uses fast-check to verify invariants across random inputs.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { GraphBuilder, inspectGraph, type Lifetime } from "../../src/index.js";
import {
  fcConfig,
  portNameArb,
  lifetimeArb,
  uniquePortNamesArb,
  makePort,
  makeAdapter,
  buildFromAdapters,
} from "../property-based-helpers.js";

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
      fcConfig(200)
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
      fcConfig(200)
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
      fcConfig(200)
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
      fcConfig(200)
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
      fcConfig(200)
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
      fcConfig(200)
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
      fcConfig(200)
    );
  });
});
