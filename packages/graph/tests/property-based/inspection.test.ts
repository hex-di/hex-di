/**
 * Property-Based Tests: Inspection
 *
 * Tests covering inspection consistency and deep inspection properties.
 * Uses fast-check to verify invariants across random inputs.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { inspectGraph } from "../../src/advanced.js";
import {
  fcConfig,
  uniquePortNamesArb,
  makePort,
  makeAdapter,
  buildFromAdapters,
} from "../property-based-helpers.js";

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
      fcConfig(200)
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
      fcConfig(200)
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
      fcConfig(200)
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
      fcConfig(200)
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
      fcConfig(150)
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
      fcConfig(100)
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
      fcConfig(100)
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
      fcConfig(150)
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
      fcConfig(150)
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
      fcConfig(100)
    );
  });
});
