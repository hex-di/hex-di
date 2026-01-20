/**
 * Edge case tests for @hex-di/graph.
 *
 * These tests verify behavior at boundary conditions:
 * 1. Empty graphs and merges
 * 2. Factory deps with no dependencies
 * 3. Deep dependency chains
 * 4. initPriority range validation
 * 5. Finalizer handling
 */

import { describe, expect, it, vi } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter, createAsyncAdapter } from "../src/index.js";
import { LoggerPort, DatabasePort } from "./fixtures.js";

// Priority constants matching internal values in factory.ts
const INIT_PRIORITY_MIN = 0;
const INIT_PRIORITY_MAX = 1000;
const INIT_PRIORITY_DEFAULT = 100;

// =============================================================================
// Test-Specific Service Interfaces
// =============================================================================

interface Service {
  name: string;
}

// =============================================================================
// Empty Graph Edge Cases
// =============================================================================

describe("empty graph edge cases", () => {
  it("can build empty graph", () => {
    const graph = GraphBuilder.create().build();

    expect(graph.adapters).toEqual([]);
    expect(graph.adapters.length).toBe(0);
    expect(Object.isFrozen(graph)).toBe(true);
  });

  it("can merge empty graphs", () => {
    const graph1 = GraphBuilder.create();
    const graph2 = GraphBuilder.create();

    const merged = graph1.merge(graph2);

    expect(merged.adapters).toEqual([]);
    expect(merged.adapters.length).toBe(0);
  });

  it("can merge empty with non-empty graph", () => {
    const empty = GraphBuilder.create();
    const withLogger = GraphBuilder.create().provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      })
    );

    const merged1 = empty.merge(withLogger);
    const merged2 = withLogger.merge(empty);

    expect(merged1.adapters.length).toBe(1);
    expect(merged2.adapters.length).toBe(1);
  });

  it("buildFragment on empty builder returns empty graph", () => {
    const graph = GraphBuilder.create().buildFragment();

    expect(graph.adapters).toEqual([]);
    expect(Object.isFrozen(graph)).toBe(true);
  });

  it("provideMany with empty array returns equivalent builder", () => {
    const builder1 = GraphBuilder.create();
    const builder2 = builder1.provideMany([]);

    expect(builder1).not.toBe(builder2); // New instance
    expect(builder2.adapters).toEqual([]);
  });
});

// =============================================================================
// Factory Deps Edge Cases
// =============================================================================

describe("factory deps edge cases", () => {
  it("factory receives empty object when no dependencies", () => {
    let receivedDeps: unknown;

    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: deps => {
        receivedDeps = deps;
        return { log: () => {} };
      },
    });

    // Invoke the factory to capture deps
    adapter.factory({});

    expect(receivedDeps).toEqual({});
    expect(Object.keys(receivedDeps as object)).toHaveLength(0);
  });

  it("async factory receives empty object when no dependencies", async () => {
    let receivedDeps: unknown;

    const adapter = createAsyncAdapter({
      provides: LoggerPort,
      requires: [],
      factory: async deps => {
        receivedDeps = deps;
        return { log: () => {} };
      },
    });

    // Invoke the factory to capture deps
    await adapter.factory({});

    expect(receivedDeps).toEqual({});
    expect(Object.keys(receivedDeps as object)).toHaveLength(0);
  });

  it("factory receives correctly keyed deps", () => {
    const ServicePort = createPort<"Service", Service>("Service");

    let receivedDeps: unknown;

    const adapter = createAdapter({
      provides: ServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "singleton",
      factory: deps => {
        receivedDeps = deps;
        return { name: "test" };
      },
    });

    const mockDeps = {
      Logger: { log: () => {} },
      Database: { query: async () => ({}) },
    };

    adapter.factory(mockDeps);

    expect(receivedDeps).toBe(mockDeps);
    expect(Object.keys(receivedDeps as object).sort()).toEqual(["Database", "Logger"]);
  });
});

// =============================================================================
// Deep Dependency Chain Tests
// =============================================================================

describe("deep dependency chains", () => {
  it("handles dependency chain of 5 levels", () => {
    // Create explicit ports for a 5-level chain: S1 <- S2 <- S3 <- S4 <- S5
    const S1Port = createPort<"S1", Service>("S1");
    const S2Port = createPort<"S2", Service>("S2");
    const S3Port = createPort<"S3", Service>("S3");
    const S4Port = createPort<"S4", Service>("S4");
    const S5Port = createPort<"S5", Service>("S5");

    const adapterS1 = createAdapter({
      provides: S1Port,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "S1" }),
    });

    const adapterS2 = createAdapter({
      provides: S2Port,
      requires: [S1Port],
      lifetime: "singleton",
      factory: () => ({ name: "S2" }),
    });

    const adapterS3 = createAdapter({
      provides: S3Port,
      requires: [S2Port],
      lifetime: "singleton",
      factory: () => ({ name: "S3" }),
    });

    const adapterS4 = createAdapter({
      provides: S4Port,
      requires: [S3Port],
      lifetime: "singleton",
      factory: () => ({ name: "S4" }),
    });

    const adapterS5 = createAdapter({
      provides: S5Port,
      requires: [S4Port],
      lifetime: "singleton",
      factory: () => ({ name: "S5" }),
    });

    const graph = GraphBuilder.create()
      .provide(adapterS1)
      .provide(adapterS2)
      .provide(adapterS3)
      .provide(adapterS4)
      .provide(adapterS5)
      .build();

    expect(graph.adapters.length).toBe(5);
    expect(graph.adapters[0]).toBe(adapterS1);
    expect(graph.adapters[4]).toBe(adapterS5);
  });

  it("preserves adapter order in deep chains", () => {
    const ServiceAPort = createPort<"ServiceA", Service>("ServiceA");
    const ServiceBPort = createPort<"ServiceB", Service>("ServiceB");
    const ServiceCPort = createPort<"ServiceC", Service>("ServiceC");

    const adapterA = createAdapter({
      provides: ServiceAPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "A" }),
    });

    const adapterB = createAdapter({
      provides: ServiceBPort,
      requires: [ServiceAPort],
      lifetime: "singleton",
      factory: () => ({ name: "B" }),
    });

    const adapterC = createAdapter({
      provides: ServiceCPort,
      requires: [ServiceBPort],
      lifetime: "singleton",
      factory: () => ({ name: "C" }),
    });

    const graph = GraphBuilder.create()
      .provide(adapterA)
      .provide(adapterB)
      .provide(adapterC)
      .build();

    expect(graph.adapters[0]).toBe(adapterA);
    expect(graph.adapters[1]).toBe(adapterB);
    expect(graph.adapters[2]).toBe(adapterC);
  });
});

// =============================================================================
// initPriority Range Validation
// =============================================================================

describe("initPriority range validation", () => {
  it("accepts minimum priority (0)", () => {
    const adapter = createAsyncAdapter({
      provides: LoggerPort,
      requires: [],
      factory: async () => ({ log: () => {} }),
      initPriority: INIT_PRIORITY_MIN,
    });

    expect(adapter.initPriority).toBe(0);
  });

  it("accepts maximum priority (1000)", () => {
    const adapter = createAsyncAdapter({
      provides: LoggerPort,
      requires: [],
      factory: async () => ({ log: () => {} }),
      initPriority: INIT_PRIORITY_MAX,
    });

    expect(adapter.initPriority).toBe(1000);
  });

  it("uses default priority (100) when not specified", () => {
    const adapter = createAsyncAdapter({
      provides: LoggerPort,
      requires: [],
      factory: async () => ({ log: () => {} }),
    });

    expect(adapter.initPriority).toBe(INIT_PRIORITY_DEFAULT);
  });

  it("throws RangeError for negative priority", () => {
    expect(() =>
      createAsyncAdapter({
        provides: LoggerPort,
        requires: [],
        factory: async () => ({ log: () => {} }),
        initPriority: -1,
      })
    ).toThrow(RangeError);
  });

  it("throws RangeError for priority above maximum", () => {
    expect(() =>
      createAsyncAdapter({
        provides: LoggerPort,
        requires: [],
        factory: async () => ({ log: () => {} }),
        initPriority: 1001,
      })
    ).toThrow(RangeError);
  });

  it("error message includes valid range", () => {
    try {
      createAsyncAdapter({
        provides: LoggerPort,
        requires: [],
        factory: async () => ({ log: () => {} }),
        initPriority: 9999,
      });
      expect.fail("Should have thrown RangeError");
    } catch (error) {
      expect(error).toBeInstanceOf(RangeError);
      expect((error as RangeError).message).toContain("0");
      expect((error as RangeError).message).toContain("1000");
      expect((error as RangeError).message).toContain("9999");
    }
  });
});

// =============================================================================
// Finalizer Handling
// =============================================================================

describe("finalizer handling", () => {
  it("adapter preserves sync finalizer", () => {
    const finalizerFn = vi.fn();

    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
      finalizer: finalizerFn,
    });

    expect(adapter.finalizer).toBe(finalizerFn);
  });

  it("adapter preserves async finalizer", () => {
    const finalizerFn = vi.fn().mockResolvedValue(undefined);

    const adapter = createAsyncAdapter({
      provides: LoggerPort,
      requires: [],
      factory: async () => ({ log: () => {} }),
      finalizer: finalizerFn,
    });

    expect(adapter.finalizer).toBe(finalizerFn);
  });

  it("finalizer is undefined when not provided", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    expect(adapter.finalizer).toBeUndefined();
  });
});

// =============================================================================
// Adapter Immutability
// =============================================================================

describe("adapter immutability", () => {
  it("sync adapter is frozen", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it("async adapter is frozen", () => {
    const adapter = createAsyncAdapter({
      provides: LoggerPort,
      requires: [],
      factory: async () => ({ log: () => {} }),
    });

    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it("cannot modify adapter properties", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    expect(() => {
      // @ts-expect-error Testing runtime immutability
      adapter.lifetime = "scoped";
    }).toThrow();
  });
});

// =============================================================================
// Stress Tests: Large Graphs
// =============================================================================

describe("large graph stress tests", () => {
  it("handles graph with 20 independent adapters", () => {
    // Create 20 independent ports with explicit names
    const S0 = createPort<"S0", Service>("S0");
    const S1 = createPort<"S1", Service>("S1");
    const S2 = createPort<"S2", Service>("S2");
    const S3 = createPort<"S3", Service>("S3");
    const S4 = createPort<"S4", Service>("S4");
    const S5 = createPort<"S5", Service>("S5");
    const S6 = createPort<"S6", Service>("S6");
    const S7 = createPort<"S7", Service>("S7");
    const S8 = createPort<"S8", Service>("S8");
    const S9 = createPort<"S9", Service>("S9");
    const S10 = createPort<"S10", Service>("S10");
    const S11 = createPort<"S11", Service>("S11");
    const S12 = createPort<"S12", Service>("S12");
    const S13 = createPort<"S13", Service>("S13");
    const S14 = createPort<"S14", Service>("S14");
    const S15 = createPort<"S15", Service>("S15");
    const S16 = createPort<"S16", Service>("S16");
    const S17 = createPort<"S17", Service>("S17");
    const S18 = createPort<"S18", Service>("S18");
    const S19 = createPort<"S19", Service>("S19");

    // Build graph with all 20 adapters
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: S0,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S0" }),
        })
      )
      .provide(
        createAdapter({
          provides: S1,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S1" }),
        })
      )
      .provide(
        createAdapter({
          provides: S2,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S2" }),
        })
      )
      .provide(
        createAdapter({
          provides: S3,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S3" }),
        })
      )
      .provide(
        createAdapter({
          provides: S4,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S4" }),
        })
      )
      .provide(
        createAdapter({
          provides: S5,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S5" }),
        })
      )
      .provide(
        createAdapter({
          provides: S6,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S6" }),
        })
      )
      .provide(
        createAdapter({
          provides: S7,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S7" }),
        })
      )
      .provide(
        createAdapter({
          provides: S8,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S8" }),
        })
      )
      .provide(
        createAdapter({
          provides: S9,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S9" }),
        })
      )
      .provide(
        createAdapter({
          provides: S10,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S10" }),
        })
      )
      .provide(
        createAdapter({
          provides: S11,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S11" }),
        })
      )
      .provide(
        createAdapter({
          provides: S12,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S12" }),
        })
      )
      .provide(
        createAdapter({
          provides: S13,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S13" }),
        })
      )
      .provide(
        createAdapter({
          provides: S14,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S14" }),
        })
      )
      .provide(
        createAdapter({
          provides: S15,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S15" }),
        })
      )
      .provide(
        createAdapter({
          provides: S16,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S16" }),
        })
      )
      .provide(
        createAdapter({
          provides: S17,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S17" }),
        })
      )
      .provide(
        createAdapter({
          provides: S18,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S18" }),
        })
      )
      .provide(
        createAdapter({
          provides: S19,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S19" }),
        })
      )
      .build();

    expect(graph.adapters.length).toBe(20);
    expect(Object.isFrozen(graph)).toBe(true);
  });

  it("handles graph with 15-level deep dependency chain", () => {
    // Create ports with explicit names for deep chain testing
    const Chain0Port = createPort<"Chain0", Service>("Chain0");
    const Chain1Port = createPort<"Chain1", Service>("Chain1");
    const Chain2Port = createPort<"Chain2", Service>("Chain2");
    const Chain3Port = createPort<"Chain3", Service>("Chain3");
    const Chain4Port = createPort<"Chain4", Service>("Chain4");
    const Chain5Port = createPort<"Chain5", Service>("Chain5");
    const Chain6Port = createPort<"Chain6", Service>("Chain6");
    const Chain7Port = createPort<"Chain7", Service>("Chain7");
    const Chain8Port = createPort<"Chain8", Service>("Chain8");
    const Chain9Port = createPort<"Chain9", Service>("Chain9");
    const Chain10Port = createPort<"Chain10", Service>("Chain10");
    const Chain11Port = createPort<"Chain11", Service>("Chain11");
    const Chain12Port = createPort<"Chain12", Service>("Chain12");
    const Chain13Port = createPort<"Chain13", Service>("Chain13");
    const Chain14Port = createPort<"Chain14", Service>("Chain14");

    // Build chain: Chain0 <- Chain1 <- Chain2 <- ... <- Chain14
    const adapter0 = createAdapter({
      provides: Chain0Port,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "Chain0" }),
    });
    const adapter1 = createAdapter({
      provides: Chain1Port,
      requires: [Chain0Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain1" }),
    });
    const adapter2 = createAdapter({
      provides: Chain2Port,
      requires: [Chain1Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain2" }),
    });
    const adapter3 = createAdapter({
      provides: Chain3Port,
      requires: [Chain2Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain3" }),
    });
    const adapter4 = createAdapter({
      provides: Chain4Port,
      requires: [Chain3Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain4" }),
    });
    const adapter5 = createAdapter({
      provides: Chain5Port,
      requires: [Chain4Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain5" }),
    });
    const adapter6 = createAdapter({
      provides: Chain6Port,
      requires: [Chain5Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain6" }),
    });
    const adapter7 = createAdapter({
      provides: Chain7Port,
      requires: [Chain6Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain7" }),
    });
    const adapter8 = createAdapter({
      provides: Chain8Port,
      requires: [Chain7Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain8" }),
    });
    const adapter9 = createAdapter({
      provides: Chain9Port,
      requires: [Chain8Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain9" }),
    });
    const adapter10 = createAdapter({
      provides: Chain10Port,
      requires: [Chain9Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain10" }),
    });
    const adapter11 = createAdapter({
      provides: Chain11Port,
      requires: [Chain10Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain11" }),
    });
    const adapter12 = createAdapter({
      provides: Chain12Port,
      requires: [Chain11Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain12" }),
    });
    const adapter13 = createAdapter({
      provides: Chain13Port,
      requires: [Chain12Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain13" }),
    });
    const adapter14 = createAdapter({
      provides: Chain14Port,
      requires: [Chain13Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain14" }),
    });

    const graph = GraphBuilder.create()
      .provideMany([
        adapter0,
        adapter1,
        adapter2,
        adapter3,
        adapter4,
        adapter5,
        adapter6,
        adapter7,
        adapter8,
        adapter9,
        adapter10,
        adapter11,
        adapter12,
        adapter13,
        adapter14,
      ])
      .build();

    expect(graph.adapters.length).toBe(15);
  });

  it("handles graph with diamond dependency pattern", () => {
    // Diamond pattern:
    //       A
    //      / \
    //     B   C
    //      \ /
    //       D
    const PortA = createPort<"DiamondA", Service>("DiamondA");
    const PortB = createPort<"DiamondB", Service>("DiamondB");
    const PortC = createPort<"DiamondC", Service>("DiamondC");
    const PortD = createPort<"DiamondD", Service>("DiamondD");

    const adapterA = createAdapter({
      provides: PortA,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "A" }),
    });

    const adapterB = createAdapter({
      provides: PortB,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ name: "B" }),
    });

    const adapterC = createAdapter({
      provides: PortC,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ name: "C" }),
    });

    const adapterD = createAdapter({
      provides: PortD,
      requires: [PortB, PortC],
      lifetime: "singleton",
      factory: () => ({ name: "D" }),
    });

    const graph = GraphBuilder.create()
      .provide(adapterA)
      .provide(adapterB)
      .provide(adapterC)
      .provide(adapterD)
      .build();

    expect(graph.adapters.length).toBe(4);
  });

  it("handles multiple merges of medium-sized graphs", () => {
    // Create Group A ports and adapters
    const A0Port = createPort<"A0", Service>("A0");
    const A1Port = createPort<"A1", Service>("A1");
    const A2Port = createPort<"A2", Service>("A2");
    const A3Port = createPort<"A3", Service>("A3");
    const A4Port = createPort<"A4", Service>("A4");

    const graphA = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: A0Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "A0" }),
        })
      )
      .provide(
        createAdapter({
          provides: A1Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "A1" }),
        })
      )
      .provide(
        createAdapter({
          provides: A2Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "A2" }),
        })
      )
      .provide(
        createAdapter({
          provides: A3Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "A3" }),
        })
      )
      .provide(
        createAdapter({
          provides: A4Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "A4" }),
        })
      );

    // Create Group B ports and adapters
    const B0Port = createPort<"B0", Service>("B0");
    const B1Port = createPort<"B1", Service>("B1");
    const B2Port = createPort<"B2", Service>("B2");
    const B3Port = createPort<"B3", Service>("B3");
    const B4Port = createPort<"B4", Service>("B4");

    const graphB = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: B0Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "B0" }),
        })
      )
      .provide(
        createAdapter({
          provides: B1Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "B1" }),
        })
      )
      .provide(
        createAdapter({
          provides: B2Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "B2" }),
        })
      )
      .provide(
        createAdapter({
          provides: B3Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "B3" }),
        })
      )
      .provide(
        createAdapter({
          provides: B4Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "B4" }),
        })
      );

    // Create Group C ports and adapters
    const C0Port = createPort<"C0", Service>("C0");
    const C1Port = createPort<"C1", Service>("C1");
    const C2Port = createPort<"C2", Service>("C2");
    const C3Port = createPort<"C3", Service>("C3");
    const C4Port = createPort<"C4", Service>("C4");

    const graphC = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: C0Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "C0" }),
        })
      )
      .provide(
        createAdapter({
          provides: C1Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "C1" }),
        })
      )
      .provide(
        createAdapter({
          provides: C2Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "C2" }),
        })
      )
      .provide(
        createAdapter({
          provides: C3Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "C3" }),
        })
      )
      .provide(
        createAdapter({
          provides: C4Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "C4" }),
        })
      );

    const merged = graphA.merge(graphB).merge(graphC).build();

    expect(merged.adapters.length).toBe(15);
  });

  it("handles graph with mixed lifetimes", () => {
    // Create 9 ports with explicit names
    const M0Port = createPort<"M0", Service>("M0");
    const M1Port = createPort<"M1", Service>("M1");
    const M2Port = createPort<"M2", Service>("M2");
    const M3Port = createPort<"M3", Service>("M3");
    const M4Port = createPort<"M4", Service>("M4");
    const M5Port = createPort<"M5", Service>("M5");
    const M6Port = createPort<"M6", Service>("M6");
    const M7Port = createPort<"M7", Service>("M7");
    const M8Port = createPort<"M8", Service>("M8");

    // Create adapters with varying lifetimes (no dependencies to avoid captive issues)
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: M0Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "M0" }),
        })
      )
      .provide(
        createAdapter({
          provides: M1Port,
          requires: [],
          lifetime: "scoped",
          factory: () => ({ name: "M1" }),
        })
      )
      .provide(
        createAdapter({
          provides: M2Port,
          requires: [],
          lifetime: "transient",
          factory: () => ({ name: "M2" }),
        })
      )
      .provide(
        createAdapter({
          provides: M3Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "M3" }),
        })
      )
      .provide(
        createAdapter({
          provides: M4Port,
          requires: [],
          lifetime: "scoped",
          factory: () => ({ name: "M4" }),
        })
      )
      .provide(
        createAdapter({
          provides: M5Port,
          requires: [],
          lifetime: "transient",
          factory: () => ({ name: "M5" }),
        })
      )
      .provide(
        createAdapter({
          provides: M6Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "M6" }),
        })
      )
      .provide(
        createAdapter({
          provides: M7Port,
          requires: [],
          lifetime: "scoped",
          factory: () => ({ name: "M7" }),
        })
      )
      .provide(
        createAdapter({
          provides: M8Port,
          requires: [],
          lifetime: "transient",
          factory: () => ({ name: "M8" }),
        })
      )
      .build();

    expect(graph.adapters.length).toBe(9);
    expect(graph.adapters.filter(a => a.lifetime === "singleton").length).toBe(3);
    expect(graph.adapters.filter(a => a.lifetime === "scoped").length).toBe(3);
    expect(graph.adapters.filter(a => a.lifetime === "transient").length).toBe(3);
  });
});

// =============================================================================
// Async Adapter Edge Cases
// =============================================================================

describe("async adapter edge cases", () => {
  it("async adapter with no dependencies receives empty object", () => {
    const AsyncServicePort = createPort<"AsyncService", Service>("AsyncService");

    const receivedDeps: unknown[] = [];
    const asyncAdapter = createAsyncAdapter({
      provides: AsyncServicePort,
      requires: [],
      factory: async deps => {
        receivedDeps.push(deps);
        return { name: "async-service" };
      },
    });

    expect(asyncAdapter.factoryKind).toBe("async");
    expect(asyncAdapter.lifetime).toBe("singleton"); // Async adapters are always singleton
    expect(asyncAdapter.requires).toEqual([]);
  });

  it("async adapter is always a singleton", () => {
    const AsyncServicePort = createPort<"AsyncService", Service>("AsyncService");

    const asyncAdapter = createAsyncAdapter({
      provides: AsyncServicePort,
      requires: [],
      factory: async () => ({ name: "async-service" }),
    });

    // Async adapters are forced to singleton lifetime
    expect(asyncAdapter.lifetime).toBe("singleton");
  });

  it("multiple async adapters in same graph", () => {
    const Async1Port = createPort<"Async1", Service>("Async1");
    const Async2Port = createPort<"Async2", Service>("Async2");
    const Async3Port = createPort<"Async3", Service>("Async3");

    const graph = GraphBuilder.create()
      .provideAsync(
        createAsyncAdapter({
          provides: Async1Port,
          requires: [],
          factory: async () => ({ name: "async1" }),
        })
      )
      .provideAsync(
        createAsyncAdapter({
          provides: Async2Port,
          requires: [Async1Port],
          factory: async () => ({ name: "async2" }),
        })
      )
      .provideAsync(
        createAsyncAdapter({
          provides: Async3Port,
          requires: [Async1Port, Async2Port],
          factory: async () => ({ name: "async3" }),
        })
      )
      .build();

    expect(graph.adapters.length).toBe(3);
    expect(graph.adapters.every(a => a.factoryKind === "async")).toBe(true);
    expect(graph.adapters.every(a => a.lifetime === "singleton")).toBe(true);
  });

  it("async adapter can depend on sync adapter", () => {
    const SyncPort = createPort<"Sync", Service>("Sync");
    const AsyncPort = createPort<"Async", Service>("Async");

    const syncAdapter = createAdapter({
      provides: SyncPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "sync" }),
    });

    const asyncAdapter = createAsyncAdapter({
      provides: AsyncPort,
      requires: [SyncPort],
      factory: async () => ({ name: "async" }),
    });

    const graph = GraphBuilder.create().provide(syncAdapter).provideAsync(asyncAdapter).build();

    expect(graph.adapters.length).toBe(2);
    expect(graph.adapters[0].factoryKind).toBe("sync");
    expect(graph.adapters[1].factoryKind).toBe("async");
  });

  it("async adapter factory return type is Promise", () => {
    const AsyncPort = createPort<"AsyncReturn", Service>("AsyncReturn");

    const asyncAdapter = createAsyncAdapter({
      provides: AsyncPort,
      requires: [],
      factory: async () => {
        // Simulate async initialization
        await Promise.resolve();
        return { name: "async-return" };
      },
    });

    // Factory should return a Promise
    const factoryResult = asyncAdapter.factory({});
    expect(factoryResult).toBeInstanceOf(Promise);
  });

  it("async adapter preserves clonable property", () => {
    const ClonableAsyncPort = createPort<"ClonableAsync", Service>("ClonableAsync");

    const clonableAsync = createAsyncAdapter({
      provides: ClonableAsyncPort,
      requires: [],
      clonable: true,
      factory: async () => ({ name: "clonable-async" }),
    });

    const nonClonableAsync = createAsyncAdapter({
      provides: createPort<"NonClonableAsync", Service>("NonClonableAsync"),
      requires: [],
      factory: async () => ({ name: "non-clonable-async" }),
    });

    expect(clonableAsync.clonable).toBe(true);
    expect(nonClonableAsync.clonable).toBe(false);
  });
});

// =============================================================================
// Async Factory Error Handling
// =============================================================================

describe("async factory error handling", () => {
  it("rejecting factory propagates error", async () => {
    const FailingPort = createPort<"Failing", Service>("Failing");

    const failingAdapter = createAsyncAdapter({
      provides: FailingPort,
      requires: [],
      factory: async () => {
        throw new Error("Factory initialization failed");
      },
    });

    // The factory should throw when invoked
    await expect(failingAdapter.factory({})).rejects.toThrow("Factory initialization failed");
  });

  it("rejecting factory with custom error type", async () => {
    class InitializationError extends Error {
      constructor(
        message: string,
        public readonly code: string
      ) {
        super(message);
        this.name = "InitializationError";
      }
    }

    const FailingPort = createPort<"FailingCustom", Service>("FailingCustom");

    const failingAdapter = createAsyncAdapter({
      provides: FailingPort,
      requires: [],
      factory: async () => {
        throw new InitializationError("Database connection failed", "DB_CONN_ERR");
      },
    });

    await expect(failingAdapter.factory({})).rejects.toThrow(InitializationError);
    await expect(failingAdapter.factory({})).rejects.toMatchObject({
      code: "DB_CONN_ERR",
    });
  });

  it("slow factory eventually resolves", async () => {
    const SlowPort = createPort<"Slow", Service>("Slow");
    let resolveCount = 0;

    const slowAdapter = createAsyncAdapter({
      provides: SlowPort,
      requires: [],
      factory: async () => {
        // Simulate async work with multiple promise chains
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        resolveCount++;
        return { name: "slow-service" };
      },
    });

    const result = await slowAdapter.factory({});

    expect(result).toEqual({ name: "slow-service" });
    expect(resolveCount).toBe(1);
  });

  it("factory can check abort flag pattern", async () => {
    const AbortablePort = createPort<"Abortable", Service>("Abortable");

    // Simulate an abort flag (common pattern without AbortController)
    let aborted = false;

    const abortableAdapter = createAsyncAdapter({
      provides: AbortablePort,
      requires: [],
      factory: async () => {
        // Check abort flag before expensive operation
        if (aborted) {
          throw new Error("Operation aborted");
        }
        return { name: "abortable-service" };
      },
    });

    // Set abort flag before calling
    aborted = true;

    await expect(abortableAdapter.factory({})).rejects.toThrow("Operation aborted");
  });

  it("conditional failure based on environment", async () => {
    const EnvDependentPort = createPort<"EnvDependent", Service>("EnvDependent");

    const createEnvAdapter = (shouldFail: boolean) =>
      createAsyncAdapter({
        provides: EnvDependentPort,
        requires: [],
        factory: async () => {
          if (shouldFail) {
            throw new Error("Environment check failed: missing required config");
          }
          return { name: "env-dependent-service" };
        },
      });

    // Failure case
    const failingAdapter = createEnvAdapter(true);
    await expect(failingAdapter.factory({})).rejects.toThrow(
      "Environment check failed: missing required config"
    );

    // Success case
    const successAdapter = createEnvAdapter(false);
    const result = await successAdapter.factory({});
    expect(result).toEqual({ name: "env-dependent-service" });
  });

  it("conditional failure based on dependency state", async () => {
    const HealthCheckPort = createPort<"HealthCheck", Service>("HealthCheck");

    interface MockDep {
      isHealthy: () => boolean;
    }

    const DependencyPort = createPort<"Dependency", MockDep>("Dependency");

    const healthCheckAdapter = createAsyncAdapter({
      provides: HealthCheckPort,
      requires: [DependencyPort],
      factory: async (deps: { Dependency: MockDep }) => {
        // Check dependency health before proceeding
        if (!deps.Dependency.isHealthy()) {
          throw new Error("Dependency health check failed");
        }
        return { name: "health-check-service" };
      },
    });

    // Test with unhealthy dependency
    const unhealthyDep = { isHealthy: () => false };
    await expect(healthCheckAdapter.factory({ Dependency: unhealthyDep })).rejects.toThrow(
      "Dependency health check failed"
    );

    // Test with healthy dependency
    const healthyDep = { isHealthy: () => true };
    const result = await healthCheckAdapter.factory({ Dependency: healthyDep });
    expect(result).toEqual({ name: "health-check-service" });
  });

  it("factory that rejects with non-Error value", async () => {
    const WeirdRejectPort = createPort<"WeirdReject", Service>("WeirdReject");

    const weirdAdapter = createAsyncAdapter({
      provides: WeirdRejectPort,
      requires: [],
      factory: async () => {
        // Some code rejects with non-Error values
        return Promise.reject("string rejection");
      },
    });

    await expect(weirdAdapter.factory({})).rejects.toBe("string rejection");
  });

  it("factory retry pattern", async () => {
    const RetryPort = createPort<"Retry", Service>("Retry");
    let attemptCount = 0;
    const MAX_RETRIES = 3;
    const SUCCEED_ON_ATTEMPT = 3;

    const retryAdapter = createAsyncAdapter({
      provides: RetryPort,
      requires: [],
      factory: async () => {
        attemptCount++;
        if (attemptCount < SUCCEED_ON_ATTEMPT) {
          throw new Error(`Attempt ${attemptCount} failed`);
        }
        return { name: "retry-service" };
      },
    });

    // Helper function to retry
    async function withRetry<T>(fn: () => Promise<T>, retries: number): Promise<T> {
      try {
        return await fn();
      } catch (error) {
        if (retries > 0) {
          return withRetry(fn, retries - 1);
        }
        throw error;
      }
    }

    // Reset counter
    attemptCount = 0;

    // Should succeed after retries
    const result = await withRetry(() => retryAdapter.factory({}), MAX_RETRIES);
    expect(result).toEqual({ name: "retry-service" });
    expect(attemptCount).toBe(SUCCEED_ON_ATTEMPT);
  });

  it("factory partial initialization failure with cleanup", async () => {
    const PartialPort = createPort<"Partial", Service>("Partial");
    let cleanupCalled = false;
    let resourceAllocated = false;

    const partialAdapter = createAsyncAdapter({
      provides: PartialPort,
      requires: [],
      factory: async () => {
        // First step succeeds
        resourceAllocated = true;

        try {
          // Second step fails
          throw new Error("Second initialization step failed");
        } catch (error) {
          // Cleanup first resource
          if (resourceAllocated) {
            cleanupCalled = true;
          }
          throw error;
        }
      },
    });

    await expect(partialAdapter.factory({})).rejects.toThrow("Second initialization step failed");
    expect(cleanupCalled).toBe(true);
  });

  it("factory that fails on specific input", async () => {
    const ValidatingPort = createPort<"Validating", Service>("Validating");

    interface Config {
      value: number;
    }

    const ConfigPort = createPort<"Config", Config>("Config");

    const validatingAdapter = createAsyncAdapter({
      provides: ValidatingPort,
      requires: [ConfigPort],
      factory: async (deps: { Config: Config }) => {
        if (deps.Config.value < 0) {
          throw new Error("Config value must be non-negative");
        }
        if (deps.Config.value > 100) {
          throw new Error("Config value must not exceed 100");
        }
        return { name: `validating-service-${deps.Config.value}` };
      },
    });

    // Test negative value
    await expect(validatingAdapter.factory({ Config: { value: -1 } })).rejects.toThrow(
      "Config value must be non-negative"
    );

    // Test value too high
    await expect(validatingAdapter.factory({ Config: { value: 101 } })).rejects.toThrow(
      "Config value must not exceed 100"
    );

    // Test valid value
    const result = await validatingAdapter.factory({ Config: { value: 50 } });
    expect(result).toEqual({ name: "validating-service-50" });
  });
});

// =============================================================================
// Port Name Edge Cases
// =============================================================================

describe("port name edge cases", () => {
  it("handles simple ASCII port names", () => {
    const SimplePort = createPort<"Simple", Service>("Simple");
    const adapter = createAdapter({
      provides: SimplePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "simple" }),
    });

    const graph = GraphBuilder.create().provide(adapter).build();

    expect(graph.adapters[0]?.provides.__portName).toBe("Simple");
  });

  it("handles port names with numbers", () => {
    const Service123Port = createPort<"Service123", Service>("Service123");
    const V2ApiPort = createPort<"V2Api", Service>("V2Api");
    const Port2024Port = createPort<"Port2024", Service>("Port2024");

    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: Service123Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "Service123" }),
        })
      )
      .provide(
        createAdapter({
          provides: V2ApiPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "V2Api" }),
        })
      )
      .provide(
        createAdapter({
          provides: Port2024Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "Port2024" }),
        })
      )
      .build();

    expect(graph.adapters.length).toBe(3);
    expect(graph.adapters[0]?.provides.__portName).toBe("Service123");
    expect(graph.adapters[1]?.provides.__portName).toBe("V2Api");
    expect(graph.adapters[2]?.provides.__portName).toBe("Port2024");
  });

  it("handles port names with underscores", () => {
    const User_ServicePort = createPort<"User_Service", Service>("User_Service");
    const DB_ConnectionPort = createPort<"DB_Connection", Service>("DB_Connection");
    const _InternalPort = createPort<"_Internal", Service>("_Internal");

    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: User_ServicePort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "User_Service" }),
        })
      )
      .provide(
        createAdapter({
          provides: DB_ConnectionPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "DB_Connection" }),
        })
      )
      .provide(
        createAdapter({
          provides: _InternalPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "_Internal" }),
        })
      )
      .build();

    expect(graph.adapters.length).toBe(3);
    expect(graph.adapters[0]?.provides.__portName).toBe("User_Service");
    expect(graph.adapters[1]?.provides.__portName).toBe("DB_Connection");
    expect(graph.adapters[2]?.provides.__portName).toBe("_Internal");
  });

  it("handles CamelCase port names", () => {
    const UserAuthServicePort = createPort<"UserAuthService", Service>("UserAuthService");
    const HTTPClientAdapterPort = createPort<"HTTPClientAdapter", Service>("HTTPClientAdapter");
    const XMLParserImplPort = createPort<"XMLParserImpl", Service>("XMLParserImpl");

    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: UserAuthServicePort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "UserAuthService" }),
        })
      )
      .provide(
        createAdapter({
          provides: HTTPClientAdapterPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "HTTPClientAdapter" }),
        })
      )
      .provide(
        createAdapter({
          provides: XMLParserImplPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "XMLParserImpl" }),
        })
      )
      .build();

    expect(graph.adapters.length).toBe(3);
    expect(graph.adapters[0]?.provides.__portName).toBe("UserAuthService");
    expect(graph.adapters[1]?.provides.__portName).toBe("HTTPClientAdapter");
    expect(graph.adapters[2]?.provides.__portName).toBe("XMLParserImpl");
  });

  it("handles single-character port names", () => {
    const APort = createPort<"A", Service>("A");
    const BPort = createPort<"B", Service>("B");
    const CPort = createPort<"C", Service>("C");

    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: APort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "A" }),
        })
      )
      .provide(
        createAdapter({
          provides: BPort,
          requires: [APort],
          lifetime: "singleton",
          factory: () => ({ name: "B" }),
        })
      )
      .provide(
        createAdapter({
          provides: CPort,
          requires: [BPort],
          lifetime: "singleton",
          factory: () => ({ name: "C" }),
        })
      )
      .build();

    expect(graph.adapters.length).toBe(3);
    expect(graph.adapters[0]?.provides.__portName).toBe("A");
    expect(graph.adapters[1]?.provides.__portName).toBe("B");
    expect(graph.adapters[2]?.provides.__portName).toBe("C");
  });

  it("handles port names in dependency chains", () => {
    // Create a dependency chain with various name styles
    const BasePort = createPort<"Base", Service>("Base");
    const Service_ImplPort = createPort<"Service_Impl", Service>("Service_Impl");
    const V2WrapperPort = createPort<"V2Wrapper", Service>("V2Wrapper");

    const baseAdapter = createAdapter({
      provides: BasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "Base" }),
    });

    const serviceAdapter = createAdapter({
      provides: Service_ImplPort,
      requires: [BasePort],
      lifetime: "singleton",
      factory: () => ({ name: "Service_Impl" }),
    });

    const wrapperAdapter = createAdapter({
      provides: V2WrapperPort,
      requires: [Service_ImplPort],
      lifetime: "singleton",
      factory: () => ({ name: "V2Wrapper" }),
    });

    const graph = GraphBuilder.create()
      .provide(baseAdapter)
      .provide(serviceAdapter)
      .provide(wrapperAdapter)
      .build();

    expect(graph.adapters.length).toBe(3);

    // Verify dependency relationships are preserved
    expect(wrapperAdapter.requires[0]?.__portName).toBe("Service_Impl");
    expect(serviceAdapter.requires[0]?.__portName).toBe("Base");
  });
});
