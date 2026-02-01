/**
 * Tests for mergeWith() method with configurable options.
 *
 * Also includes algebraic property tests for merge operations:
 * - Associativity: (A.merge(B)).merge(C) ≡ A.merge(B.merge(C))
 * - Identity: A.merge(empty) ≡ A ≡ empty.merge(A)
 * - Adapter count invariants
 *
 * @packageDocumentation
 */

import { describe, it, expect, expectTypeOf } from "vitest";
import { createPort, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import type { MergeOptions } from "../src/advanced.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const LoggerPort = createPort<{ log: (msg: string) => void }, "Logger">({ name: "Logger" });
const DatabasePort = createPort<{ query: () => string }, "Database">({ name: "Database" });
const CachePort = createPort<{ get: (key: string) => string }, "Cache">({ name: "Cache" });

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort] as const,
  lifetime: "scoped",
  factory: () => ({ query: () => "result" }),
});

const CacheAdapter = createAdapter({
  provides: CachePort,
  requires: [] as const,
  lifetime: "transient",
  factory: () => ({ get: () => "value" }),
});

// =============================================================================
// mergeWith() Method Tests
// =============================================================================

describe("mergeWith()", () => {
  describe("basic functionality", () => {
    it("merges two graphs with options", () => {
      const graph1 = GraphBuilder.create().provide(LoggerAdapter);
      const graph2 = GraphBuilder.create().provide(CacheAdapter);

      const merged = graph1.mergeWith(graph2, { maxDepth: "first" });

      // Should have both adapters
      expect(merged.adapters).toHaveLength(2);
    });

    it("performs same validation as merge()", () => {
      const graph1 = GraphBuilder.create().provide(LoggerAdapter);
      const graph2 = GraphBuilder.create().provide(DatabaseAdapter);

      const merged = graph1.mergeWith(graph2, {});

      // Should have both adapters
      expect(merged.adapters).toHaveLength(2);
    });
  });

  describe("maxDepth options", () => {
    it("accepts 'first' option", () => {
      const graph1 = GraphBuilder.create().provide(LoggerAdapter);
      const graph2 = GraphBuilder.create().provide(CacheAdapter);

      // Should compile without error
      const merged = graph1.mergeWith(graph2, { maxDepth: "first" });
      expect(merged.adapters).toHaveLength(2);
    });

    it("accepts 'second' option", () => {
      const graph1 = GraphBuilder.create().provide(LoggerAdapter);
      const graph2 = GraphBuilder.create().provide(CacheAdapter);

      // Should compile without error
      const merged = graph1.mergeWith(graph2, { maxDepth: "second" });
      expect(merged.adapters).toHaveLength(2);
    });

    it("accepts 'max' option", () => {
      const graph1 = GraphBuilder.create().provide(LoggerAdapter);
      const graph2 = GraphBuilder.create().provide(CacheAdapter);

      // Should compile without error
      const merged = graph1.mergeWith(graph2, { maxDepth: "max" });
      expect(merged.adapters).toHaveLength(2);
    });

    it("accepts 'min' option", () => {
      const graph1 = GraphBuilder.create().provide(LoggerAdapter);
      const graph2 = GraphBuilder.create().provide(CacheAdapter);

      // Should compile without error
      const merged = graph1.mergeWith(graph2, { maxDepth: "min" });
      expect(merged.adapters).toHaveLength(2);
    });

    it("defaults to 'first' when option not specified", () => {
      const graph1 = GraphBuilder.create().provide(LoggerAdapter);
      const graph2 = GraphBuilder.create().provide(CacheAdapter);

      // Should compile without error with empty options
      const merged = graph1.mergeWith(graph2, {});
      expect(merged.adapters).toHaveLength(2);
    });
  });

  describe("override preservation", () => {
    it("merges override port names from both graphs", () => {
      // Build a parent graph first
      const parentGraph = GraphBuilder.create()
        .provide(LoggerAdapter)
        .provide(CacheAdapter)
        .build();

      // Create override adapters
      const OverrideAdapter1 = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      const OverrideAdapter2 = createAdapter({
        provides: CachePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ get: () => "value" }),
      });

      // Create two child builders with overrides
      const graph1 = GraphBuilder.forParent(parentGraph).override(OverrideAdapter1);

      const graph2 = GraphBuilder.forParent(parentGraph).override(OverrideAdapter2);

      const merged = graph1.mergeWith(graph2, { maxDepth: "max" });

      // Both overrides should be preserved
      expect(merged.overridePortNames.has("Logger")).toBe(true);
      expect(merged.overridePortNames.has("Cache")).toBe(true);
    });
  });
});

// =============================================================================
// Type-Level Tests
// =============================================================================

describe("mergeWith() type-level tests", () => {
  it("MergeOptions interface is correctly typed", () => {
    // MergeOptions should accept all valid maxDepth values
    const options1: MergeOptions = { maxDepth: "first" };
    const options2: MergeOptions = { maxDepth: "second" };
    const options3: MergeOptions = { maxDepth: "max" };
    const options4: MergeOptions = { maxDepth: "min" };

    // Should also accept empty options (defaults to 'first')
    const options5: MergeOptions = {};

    // Verify they're defined
    expect(options1.maxDepth).toBe("first");
    expect(options2.maxDepth).toBe("second");
    expect(options3.maxDepth).toBe("max");
    expect(options4.maxDepth).toBe("min");
    expect(options5.maxDepth).toBeUndefined();
  });

  it("returns GraphBuilder on valid merge", () => {
    const graph1 = GraphBuilder.create().provide(LoggerAdapter);
    const graph2 = GraphBuilder.create().provide(CacheAdapter);

    const merged = graph1.mergeWith(graph2, { maxDepth: "first" });

    // Result should be a GraphBuilder (can call provide)
    expectTypeOf(merged.provide).toBeFunction();
  });
});

// =============================================================================
// Algebraic Property Tests for merge()
// =============================================================================
//
// These tests verify the mathematical properties of the merge operation.
// Merge forms a monoid over GraphBuilders:
// - Associativity: (A • B) • C = A • (B • C)
// - Identity element: empty builder (GraphBuilder.create())
//

describe("merge() algebraic properties", () => {
  // Additional ports for algebraic tests
  const PortE = createPort<{ value: number }>({ name: "E" });
  const PortF = createPort<{ value: number }>({ name: "F" });

  const AdapterE = createAdapter({
    provides: PortE,
    requires: [] as const,
    lifetime: "singleton",
    factory: () => ({ value: 5 }),
  });

  const AdapterF = createAdapter({
    provides: PortF,
    requires: [] as const,
    lifetime: "singleton",
    factory: () => ({ value: 6 }),
  });

  describe("associativity", () => {
    it("(A.merge(B)).merge(C) has same adapter count as A.merge(B.merge(C))", () => {
      const A = GraphBuilder.create().provide(LoggerAdapter);
      const B = GraphBuilder.create().provide(CacheAdapter);
      const C = GraphBuilder.create().provide(DatabaseAdapter);

      // Left association: (A • B) • C
      const leftAssoc = A.merge(B).merge(C);

      // Right association: A • (B • C)
      const rightAssoc = A.merge(B.merge(C));

      // Adapter counts should be equal
      expect(leftAssoc.adapters.length).toBe(rightAssoc.adapters.length);
      expect(leftAssoc.adapters.length).toBe(3);
    });

    it("(A.merge(B)).merge(C) has same port names as A.merge(B.merge(C))", () => {
      const A = GraphBuilder.create().provide(LoggerAdapter);
      const B = GraphBuilder.create().provide(CacheAdapter);
      const C = GraphBuilder.create().provide(AdapterE);

      const leftAssoc = A.merge(B).merge(C);
      const rightAssoc = A.merge(B.merge(C));

      // Extract port names
      const leftPortNames = new Set(leftAssoc.adapters.map(a => a.provides.__portName));
      const rightPortNames = new Set(rightAssoc.adapters.map(a => a.provides.__portName));

      // Port names should be identical
      expect(leftPortNames).toEqual(rightPortNames);
      expect(leftPortNames).toEqual(new Set(["Logger", "Cache", "E"]));
    });

    it("associativity holds for 4-way merge", () => {
      const A = GraphBuilder.create().provide(LoggerAdapter);
      const B = GraphBuilder.create().provide(CacheAdapter);
      const C = GraphBuilder.create().provide(AdapterE);
      const D = GraphBuilder.create().provide(AdapterF);

      // Various association orders
      const order1 = A.merge(B).merge(C).merge(D); // ((A•B)•C)•D
      const order2 = A.merge(B).merge(C.merge(D)); // (A•B)•(C•D)
      const order3 = A.merge(B.merge(C).merge(D)); // A•((B•C)•D)
      const order4 = A.merge(B.merge(C.merge(D))); // A•(B•(C•D))

      // All should have same adapter count
      const expectedCount = 4;
      expect(order1.adapters.length).toBe(expectedCount);
      expect(order2.adapters.length).toBe(expectedCount);
      expect(order3.adapters.length).toBe(expectedCount);
      expect(order4.adapters.length).toBe(expectedCount);

      // All should have same port names
      const expectedPorts = new Set(["Logger", "Cache", "E", "F"]);
      expect(new Set(order1.adapters.map(a => a.provides.__portName))).toEqual(expectedPorts);
      expect(new Set(order2.adapters.map(a => a.provides.__portName))).toEqual(expectedPorts);
      expect(new Set(order3.adapters.map(a => a.provides.__portName))).toEqual(expectedPorts);
      expect(new Set(order4.adapters.map(a => a.provides.__portName))).toEqual(expectedPorts);
    });

    it("associativity preserves override port names", () => {
      const parentGraph = GraphBuilder.create()
        .provide(LoggerAdapter)
        .provide(CacheAdapter)
        .build();

      const OverrideLogger = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      const OverrideCache = createAdapter({
        provides: CachePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ get: () => "value" }),
      });

      const A = GraphBuilder.forParent(parentGraph).override(OverrideLogger);
      const B = GraphBuilder.forParent(parentGraph).override(OverrideCache);
      const C = GraphBuilder.create().provide(AdapterE);

      const leftAssoc = A.merge(B).merge(C);
      const rightAssoc = A.merge(B.merge(C));

      // Override port names should be same
      expect(leftAssoc.overridePortNames).toEqual(rightAssoc.overridePortNames);
      expect(leftAssoc.overridePortNames.has("Logger")).toBe(true);
      expect(leftAssoc.overridePortNames.has("Cache")).toBe(true);
    });
  });

  describe("identity element", () => {
    it("A.merge(empty) has same adapters as A", () => {
      const A = GraphBuilder.create().provide(LoggerAdapter).provide(CacheAdapter);
      const empty = GraphBuilder.create();

      const result = A.merge(empty);

      expect(result.adapters.length).toBe(A.adapters.length);
      expect(result.adapters.length).toBe(2);

      // Port names should be same
      const aPortNames = new Set(A.adapters.map(a => a.provides.__portName));
      const resultPortNames = new Set(result.adapters.map(a => a.provides.__portName));
      expect(resultPortNames).toEqual(aPortNames);
    });

    it("empty.merge(A) has same adapters as A", () => {
      const A = GraphBuilder.create().provide(LoggerAdapter).provide(CacheAdapter);
      const empty = GraphBuilder.create();

      const result = empty.merge(A);

      expect(result.adapters.length).toBe(A.adapters.length);
      expect(result.adapters.length).toBe(2);

      // Port names should be same
      const aPortNames = new Set(A.adapters.map(a => a.provides.__portName));
      const resultPortNames = new Set(result.adapters.map(a => a.provides.__portName));
      expect(resultPortNames).toEqual(aPortNames);
    });

    it("empty.merge(empty) is empty", () => {
      const empty1 = GraphBuilder.create();
      const empty2 = GraphBuilder.create();

      const result = empty1.merge(empty2);

      expect(result.adapters.length).toBe(0);
    });
  });

  describe("adapter count invariants", () => {
    it("merge always produces sum of adapter counts", () => {
      const A = GraphBuilder.create().provide(LoggerAdapter); // 1 adapter
      const B = GraphBuilder.create().provide(CacheAdapter).provide(AdapterE); // 2 adapters

      const merged = A.merge(B);

      expect(merged.adapters.length).toBe(A.adapters.length + B.adapters.length);
      expect(merged.adapters.length).toBe(3);
    });

    it("merge with provideMany maintains invariant", () => {
      const A = GraphBuilder.create().provide(LoggerAdapter);
      const B = GraphBuilder.create().provideMany([CacheAdapter, AdapterE, AdapterF]);

      const merged = A.merge(B);

      expect(merged.adapters.length).toBe(1 + 3);
      expect(merged.adapters.length).toBe(4);
    });
  });

  describe("ordering (non-commutativity)", () => {
    it("A.merge(B) may differ from B.merge(A) in adapter order", () => {
      const A = GraphBuilder.create().provide(LoggerAdapter);
      const B = GraphBuilder.create().provide(CacheAdapter);

      const ab = A.merge(B);
      const ba = B.merge(A);

      // Both should have same adapter count
      expect(ab.adapters.length).toBe(ba.adapters.length);

      // Both should have same port names (set equality)
      const abPorts = new Set(ab.adapters.map(a => a.provides.__portName));
      const baPorts = new Set(ba.adapters.map(a => a.provides.__portName));
      expect(abPorts).toEqual(baPorts);

      // But adapter ORDER should be different (demonstrating non-commutativity)
      // A.merge(B): [Logger, Cache]
      // B.merge(A): [Cache, Logger]
      expect(ab.adapters[0].provides.__portName).toBe("Logger");
      expect(ab.adapters[1].provides.__portName).toBe("Cache");
      expect(ba.adapters[0].provides.__portName).toBe("Cache");
      expect(ba.adapters[1].provides.__portName).toBe("Logger");
    });
  });
});
