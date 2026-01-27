/**
 * Tests for parent-child graph scenarios.
 *
 * These tests verify the hierarchical container support including:
 * - Child graph creation with forParent()
 * - Valid override detection
 * - Invalid override detection with validateOverride()
 * - Mixed lifetime scenarios
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { createAdapter, GraphBuilder } from "../src/index.js";
import { LoggerPort, DatabasePort, CachePort, validateOverride } from "./fixtures.js";
import { TestGraphBuilder, createChildGraphBuilder } from "./test-builder.js";

describe("parent-child graphs", () => {
  describe("TestGraphBuilder.parentChild()", () => {
    it("should create a parent graph with Logger and Database", () => {
      const scenario = TestGraphBuilder.parentChild();

      expect(scenario.parentGraph.adapters).toHaveLength(2);

      const portNames = scenario.parentGraph.adapters.map(a => a.provides.__portName);
      expect(portNames).toContain("Logger");
      expect(portNames).toContain("Database");
    });

    it("should create a child builder from parent", () => {
      const scenario = TestGraphBuilder.parentChild();
      const childBuilder = scenario.createChild();

      // Child starts empty but has parent reference
      expect(childBuilder).toBeDefined();
    });

    it("should create a child builder with override", () => {
      const scenario = TestGraphBuilder.parentChild();

      const MockLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      // Use forParent with properly typed adapter for compile-time validation
      const childGraph = GraphBuilder.forParent(scenario.parentGraph)
        .override(MockLoggerAdapter)
        .build();

      expect(childGraph.adapters).toHaveLength(1);
      expect(childGraph.overridePortNames.has("Logger")).toBe(true);
    });
  });

  describe("TestGraphBuilder.parentChildWithLifetimes()", () => {
    it("should create a parent with mixed lifetimes", () => {
      const scenario = TestGraphBuilder.parentChildWithLifetimes();

      const lifetimes = scenario.parentGraph.adapters.map(a => ({
        port: a.provides.__portName,
        lifetime: a.lifetime,
      }));

      expect(lifetimes).toEqual(
        expect.arrayContaining([
          { port: "Logger", lifetime: "singleton" },
          { port: "Database", lifetime: "scoped" },
          { port: "Config", lifetime: "transient" },
        ])
      );
    });

    it("should allow creating child with scoped override", () => {
      const scenario = TestGraphBuilder.parentChildWithLifetimes();

      // Override adapter with no requirements (parent provides Logger)
      const ScopedDatabaseAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ query: async () => ({ overridden: true }) }),
      });

      // Use forParent with properly typed adapter for compile-time validation
      const childGraph = GraphBuilder.forParent(scenario.parentGraph)
        .override(ScopedDatabaseAdapter)
        .build();

      expect(childGraph.overridePortNames.has("Database")).toBe(true);
    });
  });

  describe("validateOverride()", () => {
    it("should return valid for override of existing port", () => {
      const scenario = TestGraphBuilder.parentChild();

      const LoggerOverride = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      const result = validateOverride(scenario.parentGraph, LoggerOverride);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return invalid for override of non-existent port", () => {
      const scenario = TestGraphBuilder.parentChild();

      const CacheOverride = createAdapter({
        provides: CachePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({
          get: () => undefined,
          set: () => {},
        }),
      });

      const result = validateOverride(scenario.parentGraph, CacheOverride);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Cache");
      expect(result.error).toContain("not provided by parent graph");
    });

    it("should list available ports in error message", () => {
      const scenario = TestGraphBuilder.parentChild();

      const CacheOverride = createAdapter({
        provides: CachePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({
          get: () => undefined,
          set: () => {},
        }),
      });

      const result = validateOverride(scenario.parentGraph, CacheOverride);
      expect(result.error).toContain("Logger");
      expect(result.error).toContain("Database");
    });
  });

  describe("createChildGraphBuilder()", () => {
    it("should create a child builder from parent graph", () => {
      const parentGraph = GraphBuilder.create()
        .provide(
          createAdapter({
            provides: LoggerPort,
            requires: [],
            lifetime: "singleton",
            factory: () => ({ log: () => {} }),
          })
        )
        .build();

      const childBuilder = createChildGraphBuilder(parentGraph);
      expect(childBuilder).toBeDefined();
    });

    it("should allow overrides via the child builder", () => {
      const parentGraph = GraphBuilder.create()
        .provide(
          createAdapter({
            provides: LoggerPort,
            requires: [],
            lifetime: "singleton",
            factory: () => ({ log: () => {} }),
          })
        )
        .build();

      const MockLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      const childGraph = createChildGraphBuilder(parentGraph).override(MockLoggerAdapter).build();

      expect(childGraph.overridePortNames.has("Logger")).toBe(true);
    });
  });
});
