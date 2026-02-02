/**
 * Negative Test Cases for Malformed Configurations
 *
 * Tests for error handling when adapters, ports, or graphs are misconfigured.
 * These tests verify that appropriate errors are thrown with helpful messages.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { port, createAdapter, isAdapter } from "@hex-di/core";
import { GraphBuilder, isGraphBuilder, isGraph } from "../src/index.js";

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
      const Port = port<Service>()({ name: "Minimal" });

      const adapter = createAdapter({
        provides: Port,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ name: "test" }),
      });

      expect(isAdapter(adapter)).toBe(true);
    });

    it("accepts all lifetime values", () => {
      const Port1 = port<Service>()({ name: "Singleton" });
      const Port2 = port<Service>()({ name: "Scoped" });
      const Port3 = port<Service>()({ name: "Transient" });

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
      const Port = port<Service>()({ name: "WithFinalizer" });

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
      const Port = port<Service>()({ name: "Clonable" });

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
// createAdapter Validation
// =============================================================================

describe("createAdapter validation", () => {
  it("sets factoryKind to async", () => {
    const Port = port<Service>()({ name: "AsyncKind" });

    const adapter = createAdapter({
      provides: Port,
      requires: [],
      factory: async () => ({ name: "test" }),
    });

    expect(adapter.factoryKind).toBe("async");
  });

  it("sets lifetime to singleton", () => {
    const Port = port<Service>()({ name: "AsyncLifetime" });

    const adapter = createAdapter({
      provides: Port,
      requires: [],
      factory: async () => ({ name: "test" }),
    });

    expect(adapter.lifetime).toBe("singleton");
  });

  it("accepts clonable option", () => {
    const Port = port<Service>()({ name: "AsyncClonable" });

    const adapter = createAdapter({
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
      const Port = port<Service>()({ name: "ValidProvide" });
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
      const Port1 = port<Service>()({ name: "Many1" });
      const Port2 = port<Service>()({ name: "Many2" });

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
      const Port1 = port<Service>()({ name: "Merge1" });
      const Port2 = port<Service>()({ name: "Merge2" });

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
      const Port = port<Service>()({ name: "OverrideTest" });

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
      const Port = port<Service>()({ name: "OverrideTest" });

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
      const Port = port<Service>()({ name: "ValidAdapter" });
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
    const Dep = port<Service>()({ name: "DupDep" });
    const Port = port<Service>()({ name: "DupReqs" });

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
    const Dep1 = port<Service>()({ name: "MultiDep1" });
    const Dep2 = port<Service>()({ name: "MultiDep2" });
    const Dep3 = port<Service>()({ name: "MultiDep3" });
    const Port = port<Service>()({ name: "MultiReqs" });

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
    const Dep = port<Service>()({ name: "MissingDepValidate" });
    const Port = port<Service>()({ name: "NeedsDepValidate" });

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
    const Port = port<Service>()({ name: longName });

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
    const Port = port<Service>()({ name: specialName });

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
    const Dep = port<Service>()({ name: "CompleteDep" });
    const Port = port<Service>()({ name: "CompleteConsumer" });

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
    const Port = port<Service>()({ name: "Frozen" });

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
    const Port = port<Service>()({ name: "FrozenGraph" });

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
