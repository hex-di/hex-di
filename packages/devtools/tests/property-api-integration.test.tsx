/**
 * Integration tests for DevTools with property-based API.
 *
 * These tests verify that DevTools correctly uses the property-based API
 * (`container.inspector`, `container.tracer`) where appropriate, and uses
 * the INSPECTOR symbol for full InspectorWithSubscription functionality.
 *
 * The property-based API provides:
 * - `container.inspector` - InspectorAPI for basic inspection
 * - `container.tracer` - TracingAPI for tracing
 *
 * For full DevTools functionality (subscriptions, child discovery), containers
 * need `withInspector` wrapper which provides InspectorWithSubscription via
 * the INSPECTOR symbol.
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { createContainer, pipe, withInspector, hasInspector, INSPECTOR } from "@hex-di/runtime";
import type { Container } from "@hex-di/runtime";
import { createDevToolsFlowRuntime } from "../src/runtime/devtools-flow-runtime.js";
import { buildExportedGraphFromVisualizableAdapters } from "../src/react/utils/build-graph-from-container.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): unknown;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");

/**
 * Creates a test graph with Logger and Database services.
 */
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
    factory: () => ({ query: vi.fn() }),
  });

  return GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
}

// Helper to cast container to inspectable type
type TestContainer = Container<
  typeof LoggerPort | typeof DatabasePort,
  never,
  never,
  "uninitialized"
>;

// =============================================================================
// Tests for Property-Based API
// =============================================================================

describe("DevTools Property-Based API Integration", () => {
  beforeEach(() => {
    cleanup();
  });

  describe("container.inspector access (built-in InspectorAPI)", () => {
    it("container has inspector property with InspectorAPI", () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" }) as TestContainer;

      // Property-based access (new API)
      expect(container.inspector).toBeDefined();
      expect(typeof container.inspector.getSnapshot).toBe("function");
      expect(typeof container.inspector.getScopeTree).toBe("function");
      expect(typeof container.inspector.listPorts).toBe("function");
      expect(typeof container.inspector.isResolved).toBe("function");
    });

    it("inspector.getSnapshot returns valid container snapshot", () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" }) as TestContainer;

      const snapshot = container.inspector.getSnapshot();

      expect(snapshot).toBeDefined();
      expect(snapshot.kind).toBe("root");
      expect(snapshot.containerName).toBe("Test");
      expect(snapshot.singletons).toBeInstanceOf(Array);
    });

    it("inspector.isResolved tracks service resolution state", () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" }) as TestContainer;

      // Before resolution
      expect(container.inspector.isResolved("Logger")).toBe(false);

      // Resolve service
      container.resolve(LoggerPort);

      // After resolution
      expect(container.inspector.isResolved("Logger")).toBe(true);
    });
  });

  describe("container.tracer access (built-in TracingAPI)", () => {
    it("container has tracer property with TracingAPI", () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" }) as TestContainer;

      // Property-based access (new API)
      expect(container.tracer).toBeDefined();
      expect(typeof container.tracer.getTraces).toBe("function");
      expect(typeof container.tracer.getStats).toBe("function");
      expect(typeof container.tracer.subscribe).toBe("function");
    });

    it("tracer.getStats returns initial statistics", () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" }) as TestContainer;

      // Note: Built-in tracer is separate from resolution hooks
      // Traces are only recorded when withTracing wrapper is applied
      // The built-in tracer provides the API but needs hook integration
      const stats = container.tracer.getStats();
      expect(typeof stats.totalResolutions).toBe("number");
      expect(typeof stats.averageDuration).toBe("number");
      expect(typeof stats.cacheHitRate).toBe("number");
    });
  });

  describe("InspectorPlugin with INSPECTOR symbol (full DevTools functionality)", () => {
    it("withInspector provides InspectorWithSubscription via INSPECTOR symbol", () => {
      const graph = createTestGraph();
      const container = pipe(
        createContainer(graph, { name: "Test" }) as TestContainer,
        withInspector
      );

      // Check using hasInspector type guard (checks for INSPECTOR symbol)
      expect(hasInspector(container)).toBe(true);

      // Access via INSPECTOR symbol provides InspectorWithSubscription
      const inspector = container[INSPECTOR];
      expect(typeof inspector.subscribe).toBe("function");
      expect(typeof inspector.getChildContainers).toBe("function");
      expect(typeof inspector.getGraphData).toBe("function");
    });

    it("DevToolsFlowRuntime works with InspectorWithSubscription from INSPECTOR symbol", async () => {
      const graph = createTestGraph();
      const container = pipe(
        createContainer(graph, { name: "Test" }) as TestContainer,
        withInspector
      );

      // Get inspector via INSPECTOR symbol (the DevTools pattern)
      const inspector = container[INSPECTOR];

      // Create runtime with inspector
      const runtime = createDevToolsFlowRuntime({ inspector });

      expect(runtime).toBeDefined();
      expect(runtime.getSnapshot()).toBeDefined();
      expect(runtime.getRootInspector()).toBe(inspector);

      // Cleanup
      await runtime.dispose();
    });

    it("getGraphData from InspectorWithSubscription enables graph visualization", () => {
      const graph = createTestGraph();
      const container = pipe(
        createContainer(graph, { name: "Test" }) as TestContainer,
        withInspector
      );

      // Access full inspector via INSPECTOR symbol
      const inspector = container[INSPECTOR];

      // getGraphData provides all information for visualization
      const graphData = inspector.getGraphData();
      expect(graphData).toBeDefined();
      expect(graphData.containerName).toBe("Test");
      expect(graphData.adapters.length).toBe(2);

      // Build exported graph from visualizable adapters
      const exportedGraph = buildExportedGraphFromVisualizableAdapters(graphData.adapters);
      expect(exportedGraph.nodes.length).toBe(2);

      // Verify node data
      const loggerNode = exportedGraph.nodes.find(n => n.id === "Logger");
      expect(loggerNode).toBeDefined();
      expect(loggerNode?.lifetime).toBe("singleton");
    });

    it("getChildContainers enables container hierarchy discovery", () => {
      const graph = createTestGraph();
      const container = pipe(
        createContainer(graph, { name: "Parent" }) as TestContainer,
        withInspector
      );

      // Create child containers
      const childGraph = GraphBuilder.create().build();
      container.createChild(childGraph, { name: "Child1" });
      container.createChild(childGraph, { name: "Child2" });

      // Access full inspector via INSPECTOR symbol and get children
      const inspector = container[INSPECTOR];
      const children = inspector.getChildContainers();
      expect(children.length).toBe(2);

      // Each child should also have full inspection capability
      const child1 = children.find(c => c.getSnapshot().containerName === "Child1");
      expect(child1).toBeDefined();
      expect(typeof child1?.getChildContainers).toBe("function");
    });
  });

  describe("type guards for container inspection", () => {
    it("hasInspector type guard detects INSPECTOR symbol presence", () => {
      const graph = createTestGraph();
      const container = pipe(
        createContainer(graph, { name: "Test" }) as TestContainer,
        withInspector
      );

      // hasInspector checks for INSPECTOR symbol
      expect(hasInspector(container)).toBe(true);
    });

    it("hasInspector returns false for container without InspectorPlugin", () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" }) as TestContainer;

      // Basic container without withInspector wrapper
      expect(hasInspector(container)).toBe(false);
    });

    it("hasInspector enables type-safe access to INSPECTOR symbol", () => {
      const graph = createTestGraph();
      const container = pipe(
        createContainer(graph, { name: "Test" }) as TestContainer,
        withInspector
      );

      // Full DevTools compatibility requires hasInspector check
      if (hasInspector(container)) {
        // TypeScript now knows container[INSPECTOR] is InspectorWithSubscription
        const inspector = container[INSPECTOR];
        expect(inspector.getChildContainers).toBeDefined();
        expect(inspector.getGraphData).toBeDefined();
      }
    });
  });

  describe("property API consistency", () => {
    it("inspector property provides consistent snapshots", () => {
      const graph = createTestGraph();
      const container = pipe(
        createContainer(graph, { name: "Test" }) as TestContainer,
        withInspector
      );

      // Property-based access
      const propertySnapshot = container.inspector.getSnapshot();
      expect(propertySnapshot.containerName).toBe("Test");
      expect(propertySnapshot.kind).toBe("root");
    });

    it("tracer property provides TracingAPI access", () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" }) as TestContainer;

      // Property-based access to tracer
      const traces = container.tracer.getTraces();
      expect(traces).toBeDefined();
      expect(Array.isArray(traces)).toBe(true);
    });
  });
});
