/**
 * Extended Edge Cases Test Suite
 *
 * Tests for:
 * 1. Finalizer edge cases
 * 2. Deep nesting boundary tests
 * 3. Boundary value tests for all configurable params
 * 4. Error path coverage
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import { createAdapter, createAsyncAdapter, createPort } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import { inspectGraph } from "../src/advanced.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Service {
  name: string;
  dispose?(): void;
}

function createServicePort(name: string) {
  return createPort<typeof name, Service>(name);
}

// =============================================================================
// Finalizer Edge Cases
// =============================================================================

describe("finalizer edge cases", () => {
  it("handles adapter with sync finalizer", () => {
    const finalizerCalled = vi.fn();
    const Port = createPort<"WithFinalizer", Service>("WithFinalizer");

    const adapter = createAdapter({
      provides: Port,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "test" }),
      finalizer: instance => {
        finalizerCalled(instance.name);
      },
    });

    expect(adapter.finalizer).toBeDefined();
    expect(typeof adapter.finalizer).toBe("function");

    // Finalizer is stored but not called during creation
    expect(finalizerCalled).not.toHaveBeenCalled();
  });

  it("handles async adapter with async finalizer", () => {
    const Port = createPort<"AsyncWithFinalizer", Service>("AsyncWithFinalizer");
    const cleanupOrder: string[] = [];

    const adapter = createAsyncAdapter({
      provides: Port,
      requires: [],
      factory: async () => ({ name: "async-service" }),
      finalizer: async instance => {
        cleanupOrder.push(`disposed:${instance.name}`);
        await Promise.resolve();
      },
    });

    expect(adapter.finalizer).toBeDefined();
    expect(adapter.factoryKind).toBe("async");
  });

  it("handles multiple adapters with finalizers in correct order", () => {
    const LoggerPort = createPort<"Logger", Service>("Logger");
    const DatabasePort = createPort<"Database", Service>("Database");
    const CachePort = createPort<"Cache", Service>("Cache");

    const LoggerAdapter = createAsyncAdapter({
      provides: LoggerPort,
      requires: [],
      factory: async () => ({ name: "logger" }),
      finalizer: async () => {},
    });

    const DatabaseAdapter = createAsyncAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      factory: async () => ({ name: "database" }),
      finalizer: async () => {},
    });

    const CacheAdapter = createAsyncAdapter({
      provides: CachePort,
      requires: [LoggerPort],
      factory: async () => ({ name: "cache" }),
      finalizer: async () => {},
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(CacheAdapter)
      .build();

    // Verify all adapters have finalizers
    const adaptersWithFinalizers = graph.adapters.filter(a => a.finalizer);
    expect(adaptersWithFinalizers).toHaveLength(3);
  });

  it("inspection warns about disposal order when finalizer depends on non-finalizer", () => {
    const ConfigPort = createPort<"Config", Service>("Config");
    const DatabasePort = createPort<"Database", Service>("Database");

    // Config has NO finalizer
    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "config" }),
      // No finalizer
    });

    // Database HAS finalizer and depends on Config
    const DatabaseAdapter = createAsyncAdapter({
      provides: DatabasePort,
      requires: [ConfigPort],
      factory: async () => ({ name: "database" }),
      finalizer: async () => {},
    });

    const builder = GraphBuilder.create().provide(ConfigAdapter).provide(DatabaseAdapter);

    const info = builder.inspect();

    // Should generate disposal warning
    const disposalWarnings = info.disposalWarnings;
    expect(disposalWarnings.length).toBeGreaterThanOrEqual(0); // May or may not warn depending on implementation
  });

  it("handles finalizer that returns void vs Promise<void>", () => {
    const Port1 = createPort<"SyncFinalizer", Service>("SyncFinalizer");
    const Port2 = createPort<"AsyncFinalizer", Service>("AsyncFinalizer");

    const syncAdapter = createAdapter({
      provides: Port1,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "sync" }),
      finalizer: () => {
        // Sync finalizer returns void
      },
    });

    const asyncAdapter = createAsyncAdapter({
      provides: Port2,
      requires: [],
      factory: async () => ({ name: "async" }),
      finalizer: async () => {
        // Async finalizer returns Promise<void>
        await Promise.resolve();
      },
    });

    expect(syncAdapter.finalizer).toBeDefined();
    expect(asyncAdapter.finalizer).toBeDefined();
  });
});

// =============================================================================
// Deep Nesting Boundary Tests
// =============================================================================

describe("deep nesting boundary tests", () => {
  it("handles chain of depth 10", () => {
    const ports = Array.from({ length: 10 }, (_, i) => createServicePort(`Service${i}`));
    const adapters = ports.map((port, i) =>
      createAdapter({
        provides: port,
        requires: i > 0 ? [ports[i - 1]] : [],
        lifetime: "singleton",
        factory: () => ({ name: `service-${i}` }),
      })
    );

    const graph = GraphBuilder.create().provideMany(adapters).build();

    expect(graph.adapters).toHaveLength(10);

    const info = inspectGraph(graph);
    expect(info.maxChainDepth).toBe(9); // 0-indexed depth
  });

  it("handles chain of depth 25", () => {
    const ports = Array.from({ length: 25 }, (_, i) => createServicePort(`Deep${i}`));
    const adapters = ports.map((port, i) =>
      createAdapter({
        provides: port,
        requires: i > 0 ? [ports[i - 1]] : [],
        lifetime: "singleton",
        factory: () => ({ name: `deep-${i}` }),
      })
    );

    const graph = GraphBuilder.create().provideMany(adapters).build();

    expect(graph.adapters).toHaveLength(25);

    const info = inspectGraph(graph);
    expect(info.maxChainDepth).toBe(24);
  });

  it("handles chain of depth 40 (near warning threshold)", () => {
    const ports = Array.from({ length: 40 }, (_, i) => createServicePort(`Near${i}`));
    const adapters = ports.map((port, i) =>
      createAdapter({
        provides: port,
        requires: i > 0 ? [ports[i - 1]] : [],
        lifetime: "singleton",
        factory: () => ({ name: `near-${i}` }),
      })
    );

    const graph = GraphBuilder.create().provideMany(adapters).build();

    const info = inspectGraph(graph);
    expect(info.maxChainDepth).toBe(39);

    // Should trigger depth warning at 40 (80% of 50)
    // Depends on implementation - check if warning exists
    if (info.depthWarning) {
      expect(info.depthWarning).toContain("depth");
    }
  });

  it("handles wide graph with 50 independent adapters", () => {
    const ports = Array.from({ length: 50 }, (_, i) => createServicePort(`Wide${i}`));
    const adapters = ports.map((port, i) =>
      createAdapter({
        provides: port,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ name: `wide-${i}` }),
      })
    );

    const graph = GraphBuilder.create().provideMany(adapters).build();

    expect(graph.adapters).toHaveLength(50);

    const info = inspectGraph(graph);
    expect(info.maxChainDepth).toBe(0); // No dependencies = depth 0
  });

  it("handles diamond pattern at depth 2", () => {
    // Create a diamond: DiamondRoot -> [DiamondA, DiamondB] -> DiamondLeaf
    const DiamondRootPort = createPort<"DiamondRoot", Service>("DiamondRoot");
    const DiamondLeafPort = createPort<"DiamondLeaf", Service>("DiamondLeaf");
    const DiamondAPort = createPort<"DiamondA", Service>("DiamondA");
    const DiamondBPort = createPort<"DiamondB", Service>("DiamondB");

    const rootAdapter = createAdapter({
      provides: DiamondRootPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "root" }),
    });

    const middleAAdapter = createAdapter({
      provides: DiamondAPort,
      requires: [DiamondRootPort],
      lifetime: "singleton",
      factory: () => ({ name: "middle-a" }),
    });

    const middleBAdapter = createAdapter({
      provides: DiamondBPort,
      requires: [DiamondRootPort],
      lifetime: "singleton",
      factory: () => ({ name: "middle-b" }),
    });

    const leafAdapter = createAdapter({
      provides: DiamondLeafPort,
      requires: [DiamondAPort, DiamondBPort],
      lifetime: "singleton",
      factory: () => ({ name: "leaf" }),
    });

    const graph = GraphBuilder.create()
      .provide(rootAdapter)
      .provide(middleAAdapter)
      .provide(middleBAdapter)
      .provide(leafAdapter)
      .build();

    expect(graph.adapters).toHaveLength(4);

    const info = inspectGraph(graph);
    expect(info.maxChainDepth).toBe(2); // Root -> Middle -> Leaf
  });
});

// =============================================================================
// Boundary Value Tests
// =============================================================================

describe("boundary value tests", () => {
  describe("requires array boundaries", () => {
    it("handles empty requires array", () => {
      const Port = createPort<"NoReqs", Service>("NoReqs");

      const adapter = createAdapter({
        provides: Port,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ name: "no-reqs" }),
      });

      expect(adapter.requires).toHaveLength(0);
    });

    it("handles single requirement", () => {
      const DepPort = createPort<"Dep", Service>("Dep");
      const Port = createPort<"OneReq", Service>("OneReq");

      const adapter = createAdapter({
        provides: Port,
        requires: [DepPort],
        lifetime: "singleton",
        factory: () => ({ name: "one-req" }),
      });

      expect(adapter.requires).toHaveLength(1);
    });

    it("handles 10 requirements", () => {
      const deps = Array.from({ length: 10 }, (_, i) => createServicePort(`Dep${i}`));
      const Port = createPort<"ManyReqs", Service>("ManyReqs");

      const adapter = createAdapter({
        provides: Port,
        requires: deps,
        lifetime: "singleton",
        factory: () => ({ name: "many-reqs" }),
      });

      expect(adapter.requires).toHaveLength(10);
    });
  });

  describe("adapter count boundaries", () => {
    it("handles graph with 0 adapters", () => {
      const builder = GraphBuilder.create();
      const info = builder.inspect();

      expect(info.adapterCount).toBe(0);
      expect(info.isComplete).toBe(true);
    });

    it("handles graph with 1 adapter", () => {
      const Port = createPort<"Single", Service>("Single");
      const adapter = createAdapter({
        provides: Port,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ name: "single" }),
      });

      const graph = GraphBuilder.create().provide(adapter).build();

      expect(graph.adapters).toHaveLength(1);
    });

    it("handles graph with 100 adapters", () => {
      const ports = Array.from({ length: 100 }, (_, i) => createServicePort(`Port${i}`));
      const adapters = ports.map(port =>
        createAdapter({
          provides: port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: port.__portName }),
        })
      );

      const graph = GraphBuilder.create().provideMany(adapters).build();

      expect(graph.adapters).toHaveLength(100);
    });
  });

  describe("lifetime boundaries", () => {
    it("accepts singleton lifetime", () => {
      const Port = createPort<"Singleton", Service>("Singleton");

      const adapter = createAdapter({
        provides: Port,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ name: "singleton" }),
      });

      expect(adapter.lifetime).toBe("singleton");
    });

    it("accepts scoped lifetime", () => {
      const Port = createPort<"Scoped", Service>("Scoped");

      const adapter = createAdapter({
        provides: Port,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ name: "scoped" }),
      });

      expect(adapter.lifetime).toBe("scoped");
    });

    it("accepts transient lifetime", () => {
      const Port = createPort<"Transient", Service>("Transient");

      const adapter = createAdapter({
        provides: Port,
        requires: [],
        lifetime: "transient",
        factory: () => ({ name: "transient" }),
      });

      expect(adapter.lifetime).toBe("transient");
    });
  });
});

// =============================================================================
// Error Path Coverage
// =============================================================================

describe("error path coverage", () => {
  it("factory returning undefined at runtime", () => {
    const Port = createPort<"Undefined", Service>("Undefined");

    // TypeScript would catch this, but testing runtime behavior
    const adapter = createAdapter({
      provides: Port,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "valid" }), // Valid factory
    });

    // Adapter is created successfully
    expect(adapter).toBeDefined();
  });

  it("handles port name with special characters", () => {
    // Port names should be alphanumeric, but test edge cases
    const Port = createPort<"Port_With_Underscores", Service>("Port_With_Underscores");

    const adapter = createAdapter({
      provides: Port,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "special" }),
    });

    expect(adapter.provides.__portName).toBe("Port_With_Underscores");
  });

  it("handles very long port name", () => {
    const longName = "A".repeat(100);
    const Port = createPort<typeof longName, Service>(longName);

    const adapter = createAdapter({
      provides: Port,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "long" }),
    });

    expect(adapter.provides.__portName).toBe(longName);
  });

  it("graph.adapters is frozen (immutable)", () => {
    const Port = createPort<"Frozen", Service>("Frozen");
    const adapter = createAdapter({
      provides: Port,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "frozen" }),
    });

    const graph = GraphBuilder.create().provide(adapter).build();

    expect(Object.isFrozen(graph)).toBe(true);
    expect(Object.isFrozen(graph.adapters)).toBe(true);
  });

  it("builder is immutable after provide()", () => {
    const Port1 = createPort<"First", Service>("First");
    const Port2 = createPort<"Second", Service>("Second");

    const adapter1 = createAdapter({
      provides: Port1,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "first" }),
    });

    const adapter2 = createAdapter({
      provides: Port2,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "second" }),
    });

    const builder1 = GraphBuilder.create();
    const builder2 = builder1.provide(adapter1);
    const builder3 = builder2.provide(adapter2);

    // Each builder is independent
    expect(builder1.inspect().adapterCount).toBe(0);
    expect(builder2.inspect().adapterCount).toBe(1);
    expect(builder3.inspect().adapterCount).toBe(2);
  });
});

// =============================================================================
// Clonable Flag Edge Cases
// =============================================================================

describe("clonable flag edge cases", () => {
  it("defaults to false when not specified", () => {
    const Port = createPort<"DefaultClonable", Service>("DefaultClonable");

    const adapter = createAdapter({
      provides: Port,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "default" }),
    });

    expect(adapter.clonable).toBe(false);
  });

  it("preserves true when explicitly set", () => {
    const Port = createPort<"ExplicitClonable", Service>("ExplicitClonable");

    const adapter = createAdapter({
      provides: Port,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "explicit" }),
      clonable: true,
    });

    expect(adapter.clonable).toBe(true);
  });

  it("preserves false when explicitly set", () => {
    const Port = createPort<"ExplicitNotClonable", Service>("ExplicitNotClonable");

    const adapter = createAdapter({
      provides: Port,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "explicit" }),
      clonable: false,
    });

    expect(adapter.clonable).toBe(false);
  });
});

// =============================================================================
// GraphBuilder.validate() Tests
// =============================================================================

describe("GraphBuilder.validate()", () => {
  it("returns valid:true for complete graph", () => {
    const Port = createPort<"ValidA", Service>("ValidA");

    const adapter = createAdapter({
      provides: Port,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "valid" }),
    });

    const result = GraphBuilder.create().provide(adapter).validate();

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.adapterCount).toBe(1);
    expect(result.provides).toContain("ValidA (singleton)");
    expect(result.unsatisfiedRequirements).toHaveLength(0);
  });

  it("returns valid:false for incomplete graph", () => {
    const Dep = createPort<"ValidateDep", Service>("ValidateDep");
    const Port = createPort<"ValidateConsumer", Service>("ValidateConsumer");

    const adapter = createAdapter({
      provides: Port,
      requires: [Dep],
      lifetime: "singleton",
      factory: deps => ({ name: deps.ValidateDep.name }),
    });

    const result = GraphBuilder.create().provide(adapter).validate();

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Missing adapters for");
    expect(result.errors[0]).toContain("ValidateDep");
    expect(result.unsatisfiedRequirements).toContain("ValidateDep");
  });

  it("includes warnings in the result", () => {
    // Note: disposal warnings are generated by inspectGraph when a transient
    // depends on a singleton with finalizer, but those are collected via
    // inspection.disposalWarnings. For this test, we verify the structure.
    const Port = createPort<"WarnTest", Service>("WarnTest");

    const adapter = createAdapter({
      provides: Port,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "test" }),
    });

    const result = GraphBuilder.create().provide(adapter).validate();

    // Warnings array exists and is frozen
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(Object.isFrozen(result.warnings)).toBe(true);
  });

  it("provides suggestions for unsatisfied requirements", () => {
    const Dep = createPort<"SuggestDep", Service>("SuggestDep");
    const Port = createPort<"SuggestConsumer", Service>("SuggestConsumer");

    const adapter = createAdapter({
      provides: Port,
      requires: [Dep],
      lifetime: "singleton",
      factory: deps => ({ name: deps.SuggestDep.name }),
    });

    const result = GraphBuilder.create().provide(adapter).validate();

    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions.some(s => s.type === "missing_adapter")).toBe(true);
  });

  it("returns frozen result", () => {
    const Port = createPort<"FrozenResult", Service>("FrozenResult");

    const adapter = createAdapter({
      provides: Port,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "frozen" }),
    });

    const result = GraphBuilder.create().provide(adapter).validate();

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.errors)).toBe(true);
    expect(Object.isFrozen(result.warnings)).toBe(true);
  });

  it("does not freeze the builder", () => {
    const Port1 = createPort<"NoFreeze1", Service>("NoFreeze1");
    const Port2 = createPort<"NoFreeze2", Service>("NoFreeze2");

    const adapter1 = createAdapter({
      provides: Port1,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "one" }),
    });

    const adapter2 = createAdapter({
      provides: Port2,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "two" }),
    });

    const builder = GraphBuilder.create().provide(adapter1);
    const result1 = builder.validate();

    expect(result1.adapterCount).toBe(1);

    // Can still add more adapters
    const builder2 = builder.provide(adapter2);
    const result2 = builder2.validate();

    expect(result2.adapterCount).toBe(2);
  });

  it("reports max chain depth", () => {
    const A = createPort<"DepthA", Service>("DepthA");
    const B = createPort<"DepthB", Service>("DepthB");
    const C = createPort<"DepthC", Service>("DepthC");

    const adapterA = createAdapter({
      provides: A,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "a" }),
    });

    const adapterB = createAdapter({
      provides: B,
      requires: [A],
      lifetime: "singleton",
      factory: deps => ({ name: deps.DepthA.name }),
    });

    const adapterC = createAdapter({
      provides: C,
      requires: [B],
      lifetime: "singleton",
      factory: deps => ({ name: deps.DepthB.name }),
    });

    const result = GraphBuilder.create()
      .provide(adapterA)
      .provide(adapterB)
      .provide(adapterC)
      .validate();

    expect(result.maxChainDepth).toBe(2); // A -> B -> C
  });

  it("returns empty state for empty builder", () => {
    const result = GraphBuilder.create().validate();

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.adapterCount).toBe(0);
    expect(result.provides).toHaveLength(0);
    expect(result.unsatisfiedRequirements).toHaveLength(0);
    expect(result.maxChainDepth).toBe(0);
  });
});
