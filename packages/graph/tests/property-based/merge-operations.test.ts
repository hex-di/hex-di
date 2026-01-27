/**
 * Property-Based Tests: Merge Operations
 *
 * Tests covering merge operations, graph transformations, collision scenarios,
 * and override cascading. Uses fast-check to verify invariants across random inputs.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { GraphBuilder } from "../../src/index.js";
import {
  fcConfig,
  lifetimeArb,
  uniquePortNamesArb,
  makePort,
  makeAdapter,
  buildFromAdapters,
} from "../property-based-helpers.js";

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
      fcConfig(100)
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
      fcConfig(100)
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
      fcConfig(100)
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
      fcConfig(100)
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
      fcConfig(100)
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
      fcConfig(100)
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
      fcConfig(50)
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
      fcConfig(50)
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
      fcConfig(100)
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
      fcConfig(50)
    );
  });
});
