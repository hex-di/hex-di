/**
 * Override tracking tests for child containers.
 *
 * Tests the runtime's ability to track which ports have been overridden
 * in child containers, enabling DevTools to distinguish between:
 * - own: Adapter registered directly in the container
 * - inherited: Adapter from parent container
 * - overridden: Child override of parent adapter
 *
 * @packageDocumentation
 */

import { describe, test, expect, vi } from "vitest";
import { createPort, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer, INTERNAL_ACCESS } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): unknown;
}

interface Config {
  getValue(key: string): string;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const ConfigPort = createPort<"Config", Config>("Config");

// =============================================================================
// Override Tracking Tests
// =============================================================================

describe("Override Tracking", () => {
  describe("overridePorts Set population", () => {
    test("overridePorts Set is populated when child container uses override adapters", () => {
      const ParentLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });

      const ChildLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });

      const graph = GraphBuilder.create().provide(ParentLoggerAdapter).build();
      const container = createContainer(graph, { name: "Parent" });

      // Create child with override
      const childGraph = GraphBuilder.forParent(graph).override(ChildLoggerAdapter).build();
      const childContainer = container.createChild(childGraph, { name: "Child" });

      // Access internal state to verify overridePorts
      const internalState = childContainer[INTERNAL_ACCESS]();

      expect(internalState.overridePorts).toBeDefined();
      expect(internalState.overridePorts).toBeInstanceOf(Set);
      expect(internalState.overridePorts.has("Logger")).toBe(true);
    });

    test("overridePorts Set is empty when child container has no overrides", () => {
      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });

      const graph = GraphBuilder.create().provide(LoggerAdapter).build();
      const container = createContainer(graph, { name: "Parent" });

      // Create empty child (no overrides)
      const childGraph = GraphBuilder.create().build();
      const childContainer = container.createChild(childGraph, { name: "Child" });

      const internalState = childContainer[INTERNAL_ACCESS]();

      expect(internalState.overridePorts).toBeDefined();
      expect(internalState.overridePorts.size).toBe(0);
    });

    test("overridePorts contains only overridden ports, not extended ports", () => {
      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });

      const ChildLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });

      const ConfigAdapter = createAdapter({
        provides: ConfigPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ getValue: () => "value" }),
      });

      const graph = GraphBuilder.create().provide(LoggerAdapter).build();
      const container = createContainer(graph, { name: "Parent" });

      // Create child with override AND extension
      const childGraph = GraphBuilder.forParent(graph)
        .override(ChildLoggerAdapter)
        .provide(ConfigAdapter)
        .build();
      const childContainer = container.createChild(childGraph, { name: "Child" });

      const internalState = childContainer[INTERNAL_ACCESS]();

      // Logger is overridden (exists in parent)
      expect(internalState.overridePorts.has("Logger")).toBe(true);
      // Config is extended (new port, not in parent) - should NOT be in overridePorts
      expect(internalState.overridePorts.has("Config")).toBe(false);
    });
  });

  describe("isOverride method", () => {
    test("isOverride returns true for overridden ports", () => {
      const ParentLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });

      const ChildLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });

      const graph = GraphBuilder.create().provide(ParentLoggerAdapter).build();
      const container = createContainer(graph, { name: "Parent" });

      const childGraph = GraphBuilder.forParent(graph).override(ChildLoggerAdapter).build();
      const childContainer = container.createChild(childGraph, { name: "Child" });

      const internalState = childContainer[INTERNAL_ACCESS]();

      expect(internalState.isOverride("Logger")).toBe(true);
    });

    test("isOverride returns false for inherited (non-overridden) ports", () => {
      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });

      const DatabaseAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: vi.fn() }),
      });

      const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
      const container = createContainer(graph, { name: "Parent" });

      // Override only Logger, not Database
      const ChildLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });

      const childGraph = GraphBuilder.forParent(graph).override(ChildLoggerAdapter).build();
      const childContainer = container.createChild(childGraph, { name: "Child" });

      const internalState = childContainer[INTERNAL_ACCESS]();

      // Logger is overridden
      expect(internalState.isOverride("Logger")).toBe(true);
      // Database is inherited (not overridden)
      expect(internalState.isOverride("Database")).toBe(false);
    });

    test("isOverride returns false for extended (new) ports", () => {
      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });

      const ConfigAdapter = createAdapter({
        provides: ConfigPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ getValue: () => "value" }),
      });

      const graph = GraphBuilder.create().provide(LoggerAdapter).build();
      const container = createContainer(graph, { name: "Parent" });

      // Extend with Config (new port)
      const childGraph = GraphBuilder.create().provide(ConfigAdapter).build();
      const childContainer = container.createChild(childGraph, { name: "Child" });

      const internalState = childContainer[INTERNAL_ACCESS]();

      // Config is extended, not overridden
      expect(internalState.isOverride("Config")).toBe(false);
    });
  });

  describe("multi-level override tracking", () => {
    test("override tracking works across multiple child container levels", () => {
      const RootLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });

      const ChildLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });

      const GrandchildLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });

      // Root container
      const rootGraph = GraphBuilder.create().provide(RootLoggerAdapter).build();
      const rootContainer = createContainer(rootGraph, { name: "Root" });

      // Child container overrides Logger
      const childGraph = GraphBuilder.forParent(rootGraph).override(ChildLoggerAdapter).build();
      const childContainer = rootContainer.createChild(childGraph, { name: "Child" });

      // Grandchild container overrides Logger (from child)
      const grandchildGraph = GraphBuilder.forParent(childGraph)
        .override(GrandchildLoggerAdapter)
        .build();
      const grandchildContainer = childContainer.createChild(grandchildGraph, {
        name: "Grandchild",
      });

      // Verify child's override tracking
      const childState = childContainer[INTERNAL_ACCESS]();
      expect(childState.isOverride("Logger")).toBe(true);

      // Verify grandchild's override tracking
      const grandchildState = grandchildContainer[INTERNAL_ACCESS]();
      expect(grandchildState.isOverride("Logger")).toBe(true);
    });

    test("grandchild override tracking is independent from parent override tracking", () => {
      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });

      const DatabaseAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: vi.fn() }),
      });

      const ChildLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });

      const GrandchildDatabaseAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: vi.fn() }),
      });

      // Root: Logger + Database
      const rootGraph = GraphBuilder.create()
        .provide(LoggerAdapter)
        .provide(DatabaseAdapter)
        .build();
      const rootContainer = createContainer(rootGraph, { name: "Root" });

      // Child: overrides Logger only
      const childGraph = GraphBuilder.forParent(rootGraph).override(ChildLoggerAdapter).build();
      const childContainer = rootContainer.createChild(childGraph, { name: "Child" });

      // Grandchild: overrides Database only (inherits child's Logger override)
      const grandchildGraph = GraphBuilder.forParent(rootGraph)
        .override(GrandchildDatabaseAdapter)
        .build();
      const grandchildContainer = childContainer.createChild(grandchildGraph, {
        name: "Grandchild",
      });

      // Child should only have Logger as override
      const childState = childContainer[INTERNAL_ACCESS]();
      expect(childState.isOverride("Logger")).toBe(true);
      expect(childState.isOverride("Database")).toBe(false);

      // Grandchild should only have Database as override (Logger was overridden by parent)
      const grandchildState = grandchildContainer[INTERNAL_ACCESS]();
      expect(grandchildState.isOverride("Database")).toBe(true);
      // Logger is NOT an override in grandchild - it's inherited from child
      expect(grandchildState.isOverride("Logger")).toBe(false);
    });
  });
});
