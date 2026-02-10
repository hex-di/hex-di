/**
 * Tests for property-based API (`container.inspector`).
 *
 * These tests verify that the inspector API is available as a direct
 * readonly property on containers, following the recommendation from
 * the DI Container Architect for maximum discoverability and zero ceremony.
 *
 * @packageDocumentation
 */
// @ts-nocheck

import { describe, it, expect, vi, expectTypeOf } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../../src/container/factory.js";
import type { InspectorAPI } from "../../src/inspection/types.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): unknown;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });

function createTestGraph() {
  const LoggerAdapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: vi.fn() }),
  });

  const DatabaseAdapter = createAdapter({
    provides: DatabasePort,
    requires: [LoggerPort],
    lifetime: "singleton",
    factory: ({ Logger }) => ({ query: () => Logger }),
  });

  return GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
}

function createChildGraph(parentGraph: ReturnType<typeof createTestGraph>) {
  const LoggerOverride = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: vi.fn() }),
  });

  return GraphBuilder.forParent(parentGraph).override(LoggerOverride).build();
}

// =============================================================================
// Property-Based API Tests
// =============================================================================

describe("Property-Based API", () => {
  describe("container.inspector property", () => {
    it("exists and returns InspectorAPI", () => {
      const graph = createTestGraph();
      const container = createContainer({ graph: graph, name: "TestContainer" });

      expect(container.inspector).toBeDefined();

      // Verify it has the expected InspectorAPI methods
      const inspector = container.inspector;
      expect(typeof inspector.getSnapshot).toBe("function");
      expect(typeof inspector.getScopeTree).toBe("function");
      expect(typeof inspector.listPorts).toBe("function");
      expect(typeof inspector.isResolved).toBe("function");
      expect(typeof inspector.getContainerKind).toBe("function");
      expect(typeof inspector.getPhase).toBe("function");
      expect(typeof inspector.isDisposed).toBe("boolean");
    });

    it("is non-enumerable", () => {
      const graph = createTestGraph();
      const container = createContainer({ graph: graph, name: "TestContainer" });

      const propertyDescriptor = Object.getOwnPropertyDescriptor(container, "inspector");
      expect(propertyDescriptor).toBeDefined();
      expect(propertyDescriptor?.enumerable).toBe(false);
    });

    it("is frozen/immutable", () => {
      const graph = createTestGraph();
      const container = createContainer({ graph: graph, name: "TestContainer" });

      const inspector = container.inspector;
      expect(Object.isFrozen(inspector)).toBe(true);
    });
  });

  describe("child container properties", () => {
    it("child containers have inspector property", () => {
      const graph = createTestGraph();
      const container = createContainer({ graph: graph, name: "ParentContainer" });
      const childGraph = createChildGraph(graph);
      const child = container.createChild(childGraph, { name: "ChildContainer" });

      expect(child.inspector).toBeDefined();
      expect(typeof child.inspector.getSnapshot).toBe("function");
      expect(typeof child.inspector.getContainerKind).toBe("function");

      // Child container should report as "child" kind
      expect(child.inspector.getContainerKind()).toBe("child");
    });

    it("child container properties are non-enumerable and frozen", () => {
      const graph = createTestGraph();
      const container = createContainer({ graph: graph, name: "ParentContainer" });
      const childGraph = createChildGraph(graph);
      const child = container.createChild(childGraph, { name: "ChildContainer" });

      // Inspector
      const inspectorDescriptor = Object.getOwnPropertyDescriptor(child, "inspector");
      expect(inspectorDescriptor?.enumerable).toBe(false);
      expect(Object.isFrozen(child.inspector)).toBe(true);
    });
  });

  describe("type inference", () => {
    it("container.inspector.getSnapshot() return type is correctly inferred", () => {
      const graph = createTestGraph();
      const container = createContainer({ graph: graph, name: "TestContainer" });

      // This test passes if it compiles - verifies type inference
      const snapshot = container.inspector.getSnapshot();

      // Runtime verification that snapshot has expected shape
      expect(snapshot).toBeDefined();
      expect("kind" in snapshot).toBe(true);
      expect("containerName" in snapshot).toBe(true);
      expect(snapshot.containerName).toBe("TestContainer");
    });
  });
});

// =============================================================================
// Type-Level Tests (compile-time verification)
// =============================================================================

describe("Type-Level Property API Tests", () => {
  it("Container type includes inspector property", () => {
    const graph = createTestGraph();
    const container = createContainer({ graph: graph, name: "TestContainer" });

    // This compiles only if container.inspector is InspectorAPI
    expectTypeOf(container.inspector).toMatchTypeOf<InspectorAPI>();
  });

  it("child container types include inspector property", () => {
    const graph = createTestGraph();
    const container = createContainer({ graph: graph, name: "ParentContainer" });
    const childGraph = createChildGraph(graph);
    const child = container.createChild(childGraph, { name: "ChildContainer" });

    expectTypeOf(child.inspector).toMatchTypeOf<InspectorAPI>();
  });
});
