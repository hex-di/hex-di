/**
 * Negative Test Cases for Malformed Configurations
 *
 * Tests for error handling when adapters, ports, or graphs are misconfigured.
 * These tests verify that appropriate errors are thrown with helpful messages.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/ports";
import {
  GraphBuilder,
  createAdapter,
  createAsyncAdapter,
  isAdapter,
  isGraphBuilder,
  isGraph,
} from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Service {
  name: string;
}

// =============================================================================
// createAdapter Malformed Configurations
// =============================================================================

describe("createAdapter validation", () => {
  describe("valid configurations", () => {
    it("accepts minimal valid configuration", () => {
      const Port = createPort<"Minimal", Service>("Minimal");

      const adapter = createAdapter({
        provides: Port,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ name: "test" }),
      });

      expect(isAdapter(adapter)).toBe(true);
    });

    it("accepts all lifetime values", () => {
      const Port1 = createPort<"Singleton", Service>("Singleton");
      const Port2 = createPort<"Scoped", Service>("Scoped");
      const Port3 = createPort<"Transient", Service>("Transient");

      expect(
        createAdapter({
          provides: Port1,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "singleton" }),
        }).lifetime
      ).toBe("singleton");

      expect(
        createAdapter({
          provides: Port2,
          requires: [],
          lifetime: "scoped",
          factory: () => ({ name: "scoped" }),
        }).lifetime
      ).toBe("scoped");

      expect(
        createAdapter({
          provides: Port3,
          requires: [],
          lifetime: "transient",
          factory: () => ({ name: "transient" }),
        }).lifetime
      ).toBe("transient");
    });
  });

  describe("adapter with optional fields", () => {
    it("accepts finalizer function", () => {
      const Port = createPort<"WithFinalizer", Service>("WithFinalizer");

      const adapter = createAdapter({
        provides: Port,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ name: "test" }),
        finalizer: () => {},
      });

      expect(adapter.finalizer).toBeDefined();
    });

    it("accepts clonable flag", () => {
      const Port = createPort<"Clonable", Service>("Clonable");

      const adapter = createAdapter({
        provides: Port,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ name: "test" }),
        clonable: true,
      });

      expect(adapter.clonable).toBe(true);
    });
  });
});

// =============================================================================
// createAsyncAdapter Validation
// =============================================================================

describe("createAsyncAdapter validation", () => {
  it("sets factoryKind to async", () => {
    const Port = createPort<"AsyncKind", Service>("AsyncKind");

    const adapter = createAsyncAdapter({
      provides: Port,
      requires: [],
      factory: async () => ({ name: "test" }),
    });

    expect(adapter.factoryKind).toBe("async");
  });

  it("sets lifetime to singleton", () => {
    const Port = createPort<"AsyncLifetime", Service>("AsyncLifetime");

    const adapter = createAsyncAdapter({
      provides: Port,
      requires: [],
      factory: async () => ({ name: "test" }),
    });

    expect(adapter.lifetime).toBe("singleton");
  });

  it("accepts clonable option", () => {
    const Port = createPort<"AsyncClonable", Service>("AsyncClonable");

    const adapter = createAsyncAdapter({
      provides: Port,
      requires: [],
      factory: async () => ({ name: "test" }),
      clonable: true,
    });

    expect(adapter.clonable).toBe(true);
  });
});

// =============================================================================
// GraphBuilder Configurations
// =============================================================================

describe("GraphBuilder configurations", () => {
  describe("provide() with valid adapters", () => {
    it("accepts a valid adapter", () => {
      const Port = createPort<"ValidProvide", Service>("ValidProvide");
      const adapter = createAdapter({
        provides: Port,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ name: "test" }),
      });

      const builder = GraphBuilder.create().provide(adapter);
      expect(builder.inspect().adapterCount).toBe(1);
    });
  });

  describe("provideMany() behavior", () => {
    it("handles empty array gracefully", () => {
      const builder = GraphBuilder.create().provideMany([]);
      expect(builder.inspect().adapterCount).toBe(0);
    });

    it("accepts array of valid adapters", () => {
      const Port1 = createPort<"Many1", Service>("Many1");
      const Port2 = createPort<"Many2", Service>("Many2");

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

      const builder = GraphBuilder.create().provideMany([adapter1, adapter2]);
      expect(builder.inspect().adapterCount).toBe(2);
    });
  });

  describe("merge() behavior", () => {
    it("merges two valid builders", () => {
      const Port1 = createPort<"Merge1", Service>("Merge1");
      const Port2 = createPort<"Merge2", Service>("Merge2");

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

      const builder1 = GraphBuilder.create().provide(adapter1);
      const builder2 = GraphBuilder.create().provide(adapter2);

      const merged = builder1.merge(builder2);
      expect(merged.inspect().adapterCount).toBe(2);
    });
  });

  describe("override() behavior", () => {
    it("marks adapter as override when used with forParent()", () => {
      const Port = createPort<"OverrideTest", Service>("OverrideTest");

      const originalAdapter = createAdapter({
        provides: Port,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ name: "original" }),
      });

      const overrideAdapter = createAdapter({
        provides: Port,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ name: "replacement" }),
      });

      // Create parent graph that provides the port
      const parentGraph = GraphBuilder.create().provide(originalAdapter).build();

      // Override creates a new builder with the adapter marked for override
      const builder = GraphBuilder.forParent(parentGraph).override(overrideAdapter);
      const info = builder.inspect();

      expect(info.adapterCount).toBe(1);
    });

    it("override without forParent() still creates builder at runtime (type error is compile-time only)", () => {
      const Port = createPort<"OverrideTest", Service>("OverrideTest");

      const adapter = createAdapter({
        provides: Port,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ name: "replacement" }),
      });

      // At runtime, override() still returns a GraphBuilder
      // The HEX009 error message is a TYPE-LEVEL construct only
      // (type-state builder pattern duality)
      // Note: This line produces a compile-time type error (HEX009) but runs fine
      const result = GraphBuilder.create().override(adapter) as unknown;

      // At runtime it's still a builder object (the type error is compile-time only)
      expect(typeof result).toBe("object");
      expect(isGraphBuilder(result)).toBe(true);
    });
  });
});

// =============================================================================
// Type Guard Edge Cases
// =============================================================================

describe("type guard edge cases", () => {
  describe("isAdapter", () => {
    it("returns false for null", () => {
      expect(isAdapter(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isAdapter(undefined)).toBe(false);
    });

    it("returns false for primitives", () => {
      expect(isAdapter("string")).toBe(false);
      expect(isAdapter(123)).toBe(false);
      expect(isAdapter(true)).toBe(false);
      expect(isAdapter(Symbol("test"))).toBe(false);
    });

    it("returns false for plain objects", () => {
      expect(isAdapter({})).toBe(false);
      expect(isAdapter({ provides: "fake" })).toBe(false);
    });

    it("returns false for arrays", () => {
      expect(isAdapter([])).toBe(false);
    });

    it("returns false for functions", () => {
      expect(isAdapter(() => {})).toBe(false);
    });

    it("returns true for valid adapter", () => {
      const Port = createPort<"ValidAdapter", Service>("ValidAdapter");
      const adapter = createAdapter({
        provides: Port,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ name: "test" }),
      });

      expect(isAdapter(adapter)).toBe(true);
    });
  });

  describe("isGraphBuilder", () => {
    it("returns false for null", () => {
      expect(isGraphBuilder(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isGraphBuilder(undefined)).toBe(false);
    });

    it("returns false for plain objects", () => {
      expect(isGraphBuilder({})).toBe(false);
      expect(isGraphBuilder({ provide: () => {} })).toBe(false);
    });

    it("returns true for GraphBuilder instance", () => {
      expect(isGraphBuilder(GraphBuilder.create())).toBe(true);
    });
  });

  describe("isGraph", () => {
    it("returns false for null", () => {
      expect(isGraph(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isGraph(undefined)).toBe(false);
    });

    it("returns false for plain objects", () => {
      expect(isGraph({})).toBe(false);
      expect(isGraph({ adapters: [] })).toBe(false);
    });

    it("returns true for built graph", () => {
      const graph = GraphBuilder.create().build();
      expect(isGraph(graph)).toBe(true);
    });

    // Note: GraphBuilder and Graph share the brand symbol,
    // so isGraph returns true for both. This is by design.
    it("also returns true for GraphBuilder (shares brand)", () => {
      expect(isGraph(GraphBuilder.create())).toBe(true);
    });
  });
});

// =============================================================================
// Port Validation Edge Cases
// =============================================================================

describe("port validation edge cases", () => {
  it("handles duplicate ports in requires array", () => {
    const Dep = createPort<"DupDep", Service>("DupDep");
    const Port = createPort<"DupReqs", Service>("DupReqs");

    // Duplicate in requires - now throws a runtime error at adapter creation
    expect(() =>
      createAdapter({
        provides: Port,
        requires: [Dep, Dep], // Same port twice
        lifetime: "singleton",
        factory: deps => ({ name: deps.DupDep.name }),
      })
    ).toThrow("Duplicate port 'DupDep' in requires array");
  });

  it("adapter can reference multiple different ports", () => {
    const Dep1 = createPort<"MultiDep1", Service>("MultiDep1");
    const Dep2 = createPort<"MultiDep2", Service>("MultiDep2");
    const Dep3 = createPort<"MultiDep3", Service>("MultiDep3");
    const Port = createPort<"MultiReqs", Service>("MultiReqs");

    const adapter = createAdapter({
      provides: Port,
      requires: [Dep1, Dep2, Dep3],
      lifetime: "singleton",
      factory: deps => ({
        name: `${deps.MultiDep1.name}-${deps.MultiDep2.name}-${deps.MultiDep3.name}`,
      }),
    });

    expect(adapter.requires).toHaveLength(3);
  });
});

// =============================================================================
// Edge Cases in Graph Building
// =============================================================================

describe("graph building edge cases", () => {
  it("validates incomplete graph before build", () => {
    const Dep = createPort<"MissingDepValidate", Service>("MissingDepValidate");
    const Port = createPort<"NeedsDepValidate", Service>("NeedsDepValidate");

    const adapter = createAdapter({
      provides: Port,
      requires: [Dep],
      lifetime: "singleton",
      factory: deps => ({ name: deps.MissingDepValidate.name }),
    });

    const builder = GraphBuilder.create().provide(adapter);
    const result = builder.validate();

    // Validate returns structured result with missing dependencies
    expect(result.valid).toBe(false);
    expect(result.unsatisfiedRequirements).toContain("MissingDepValidate");
  });

  it("handles very long port names", () => {
    const longName = "A".repeat(1000);
    const Port = createPort<typeof longName, Service>(longName);

    const adapter = createAdapter({
      provides: Port,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "test" }),
    });

    const graph = GraphBuilder.create().provide(adapter).build();

    expect(isGraph(graph)).toBe(true);
  });

  it("handles special characters in port names", () => {
    // Note: Port names should generally be valid identifiers,
    // but we test edge cases for robustness
    const specialName = "Port-With_Special.Chars$123";
    const Port = createPort<typeof specialName, Service>(specialName);

    const adapter = createAdapter({
      provides: Port,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "test" }),
    });

    const graph = GraphBuilder.create().provide(adapter).build();

    expect(isGraph(graph)).toBe(true);
  });

  it("complete graph builds successfully", () => {
    const Dep = createPort<"CompleteDep", Service>("CompleteDep");
    const Port = createPort<"CompleteConsumer", Service>("CompleteConsumer");

    const depAdapter = createAdapter({
      provides: Dep,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "dep" }),
    });

    const consumerAdapter = createAdapter({
      provides: Port,
      requires: [Dep],
      lifetime: "singleton",
      factory: deps => ({ name: deps.CompleteDep.name }),
    });

    const graph = GraphBuilder.create().provide(depAdapter).provide(consumerAdapter).build();

    expect(isGraph(graph)).toBe(true);
  });
});

// =============================================================================
// Frozen Object Mutation Attempts
// =============================================================================

describe("frozen object mutation attempts", () => {
  it("adapter is frozen and cannot be mutated", () => {
    const Port = createPort<"Frozen", Service>("Frozen");

    const adapter = createAdapter({
      provides: Port,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "test" }),
    });

    expect(Object.isFrozen(adapter)).toBe(true);

    // Mutation should fail silently in non-strict mode or throw in strict mode
    expect(() => {
      // @ts-expect-error - intentionally testing runtime behavior
      adapter.lifetime = "transient";
    }).toThrow();
  });

  it("graph is frozen and cannot be mutated", () => {
    const Port = createPort<"FrozenGraph", Service>("FrozenGraph");

    const adapter = createAdapter({
      provides: Port,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "test" }),
    });

    const graph = GraphBuilder.create().provide(adapter).build();

    if (isGraph(graph)) {
      expect(Object.isFrozen(graph)).toBe(true);
      expect(Object.isFrozen(graph.adapters)).toBe(true);

      expect(() => {
        // @ts-expect-error - intentionally testing runtime behavior
        graph.adapters.push(adapter);
      }).toThrow();
    }
  });

  it("validation result is frozen", () => {
    const result = GraphBuilder.create().validate();

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.errors)).toBe(true);
    expect(Object.isFrozen(result.warnings)).toBe(true);

    expect(() => {
      // @ts-expect-error - intentionally testing runtime behavior
      result.valid = false;
    }).toThrow();
  });
});
