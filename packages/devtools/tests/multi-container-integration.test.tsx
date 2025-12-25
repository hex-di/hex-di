/**
 * Integration tests for multi-container DevTools support.
 *
 * These tests verify the complete multi-container flow:
 * 1. TracingPlugin and InspectorPlugin work together
 * 2. Plugin inheritance in child containers
 * 3. InspectorPlugin provides snapshots
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { TracingPlugin, TRACING } from "@hex-di/tracing";
import { createInspectorPlugin, getInspectorAPI } from "@hex-di/inspector";

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
 * Creates a test graph with multiple services.
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

// =============================================================================
// Integration Tests
// =============================================================================

describe("Multi-Container DevTools Integration", () => {
  describe("TracingPlugin functionality", () => {
    it("TracingPlugin tracks resolutions in root container", () => {
      const graph = createTestGraph();
      const rootContainer = createContainer(graph, {
        plugins: [TracingPlugin],
      });

      // Resolve services
      rootContainer.resolve(LoggerPort);
      rootContainer.resolve(DatabasePort);

      // Check tracing API
      const tracingAPI = rootContainer[TRACING];
      expect(tracingAPI).toBeDefined();

      const traces = tracingAPI.getTraces();
      expect(traces.length).toBeGreaterThan(0);

      // Find Logger trace
      const loggerTrace = traces.find(t => t.portName === "Logger");
      expect(loggerTrace).toBeDefined();
      expect(loggerTrace?.lifetime).toBe("singleton");
    });

    it("TracingPlugin tracks child resolutions with parent relationship", () => {
      const graph = createTestGraph();
      const rootContainer = createContainer(graph, {
        plugins: [TracingPlugin],
      });

      // Resolve Database (which depends on Logger)
      rootContainer.resolve(DatabasePort);

      const tracingAPI = rootContainer[TRACING];
      const traces = tracingAPI.getTraces();

      // Both Logger and Database should have traces
      const loggerTrace = traces.find(t => t.portName === "Logger");
      const databaseTrace = traces.find(t => t.portName === "Database");

      expect(loggerTrace).toBeDefined();
      expect(databaseTrace).toBeDefined();

      // Database trace should have child IDs (Logger is a dependency)
      expect(databaseTrace!.childIds.length).toBeGreaterThan(0);
    });

    it("TracingPlugin reports cache hits correctly", () => {
      const graph = createTestGraph();
      const rootContainer = createContainer(graph, {
        plugins: [TracingPlugin],
      });

      // Resolve Logger
      rootContainer.resolve(LoggerPort);

      const tracingAPI = rootContainer[TRACING];
      let traces = tracingAPI.getTraces();

      // Find initial Logger trace
      const initialLoggerTraces = traces.filter(t => t.portName === "Logger");
      expect(initialLoggerTraces.length).toBeGreaterThan(0);

      // First resolution should be cache miss
      const firstTrace = initialLoggerTraces[0];
      expect(firstTrace?.isCacheHit).toBe(false);

      // Resolve Logger again
      rootContainer.resolve(LoggerPort);

      // Get traces again
      traces = tracingAPI.getTraces();
      const allLoggerTraces = traces.filter(t => t.portName === "Logger");

      // Should have at least one cache hit
      const cacheHits = allLoggerTraces.filter(t => t.isCacheHit);
      expect(cacheHits.length).toBeGreaterThan(0);
    });
  });

  describe("InspectorPlugin functionality", () => {
    it("InspectorPlugin provides isResolved status", () => {
      const graph = createTestGraph();
      const { plugin: inspectorPlugin, bindContainer } = createInspectorPlugin();
      const rootContainer = createContainer(graph, {
        plugins: [inspectorPlugin],
      });
      bindContainer(rootContainer);

      const inspector = getInspectorAPI(rootContainer);
      expect(inspector).toBeDefined();

      // Before resolving
      expect(inspector!.isResolved("Logger")).toBe(false);
      expect(inspector!.isResolved("Database")).toBe(false);

      // Resolve Logger
      rootContainer.resolve(LoggerPort);

      // After resolving Logger
      expect(inspector!.isResolved("Logger")).toBe(true);
      expect(inspector!.isResolved("Database")).toBe(false);

      // Resolve Database
      rootContainer.resolve(DatabasePort);

      expect(inspector!.isResolved("Logger")).toBe(true);
      expect(inspector!.isResolved("Database")).toBe(true);
    });

    it("InspectorPlugin getSnapshot returns correct singletons", () => {
      const graph = createTestGraph();
      const { plugin: inspectorPlugin, bindContainer } = createInspectorPlugin();
      const rootContainer = createContainer(graph, {
        plugins: [inspectorPlugin],
      });
      bindContainer(rootContainer);

      // Resolve Logger
      rootContainer.resolve(LoggerPort);

      const inspector = getInspectorAPI(rootContainer);
      const snapshot = inspector!.getSnapshot();

      // Check Logger is in singletons
      const loggerEntry = snapshot.singletons.find(s => s.portName === "Logger");
      expect(loggerEntry).toBeDefined();
      expect(loggerEntry?.isResolved).toBe(true);

      // Database should not be resolved yet
      const databaseEntry = snapshot.singletons.find(s => s.portName === "Database");
      expect(databaseEntry?.isResolved).toBe(false);
    });

    it("InspectorPlugin tracks scope creation", () => {
      const graph = createTestGraph();
      const { plugin: inspectorPlugin, bindContainer } = createInspectorPlugin();
      const rootContainer = createContainer(graph, {
        plugins: [inspectorPlugin],
      });
      bindContainer(rootContainer);

      // Create scopes
      rootContainer.createScope();
      rootContainer.createScope();

      const inspector = getInspectorAPI(rootContainer);
      const scopeTree = inspector!.getScopeTree();

      // Should have root + 2 child scopes
      expect(scopeTree.children.length).toBe(2);
    });
  });

  describe("plugin inheritance in child containers", () => {
    it("child container inherits TracingPlugin from parent", () => {
      const graph = createTestGraph();
      const rootContainer = createContainer(graph, {
        plugins: [TracingPlugin],
      });

      // Create child container
      const childGraph = GraphBuilder.create().build();
      const childContainer = rootContainer.createChild(childGraph);

      // Child should have access to parent's tracing API via symbol
      // TypeScript doesn't track plugin augmentation through createChild,
      // but the runtime correctly inherits plugin APIs
      const childAsAny = childContainer as unknown as Record<symbol, unknown>;
      expect(childAsAny[TRACING]).toBeDefined();
      expect(childAsAny[TRACING]).toBe(rootContainer[TRACING]);
    });

    it("child container inherits InspectorPlugin from parent", () => {
      const graph = createTestGraph();
      const { plugin: inspectorPlugin, bindContainer } = createInspectorPlugin();
      const rootContainer = createContainer(graph, {
        plugins: [inspectorPlugin],
      });
      bindContainer(rootContainer);

      // Create child container
      const childGraph = GraphBuilder.create().build();
      const childContainer = rootContainer.createChild(childGraph);

      // Child should be able to get inspector API (inherits from parent)
      const childInspector = getInspectorAPI(childContainer);
      expect(childInspector).toBeDefined();
    });

    it("child container resolutions tracked in parent's TracingPlugin", () => {
      const graph = createTestGraph();
      const rootContainer = createContainer(graph, {
        plugins: [TracingPlugin],
      });

      // Resolve from parent first
      rootContainer.resolve(LoggerPort);

      // Create child container and resolve
      const childGraph = GraphBuilder.create().build();
      const childContainer = rootContainer.createChild(childGraph);
      childContainer.resolve(DatabasePort);

      // All resolutions should be in parent's tracing API
      const tracingAPI = rootContainer[TRACING];
      const traces = tracingAPI.getTraces();

      // Should have traces for Logger and Database
      const loggerTrace = traces.find(t => t.portName === "Logger");
      const databaseTrace = traces.find(t => t.portName === "Database");

      expect(loggerTrace).toBeDefined();
      expect(databaseTrace).toBeDefined();
    });
  });

  describe("combined TracingPlugin and InspectorPlugin", () => {
    it("both plugins work together on same container", () => {
      const graph = createTestGraph();
      const { plugin: inspectorPlugin, bindContainer } = createInspectorPlugin();
      const rootContainer = createContainer(graph, {
        plugins: [TracingPlugin, inspectorPlugin],
      });
      bindContainer(rootContainer);

      // Resolve services
      rootContainer.resolve(LoggerPort);
      rootContainer.resolve(DatabasePort);

      // Check TracingPlugin
      const tracingAPI = rootContainer[TRACING];
      const traces = tracingAPI.getTraces();
      expect(traces.length).toBeGreaterThan(0);

      // Check InspectorPlugin
      const inspector = getInspectorAPI(rootContainer);
      expect(inspector!.isResolved("Logger")).toBe(true);
      expect(inspector!.isResolved("Database")).toBe(true);

      // Both should reflect consistent state
      const snapshot = inspector!.getSnapshot();
      const resolvedSingletons = snapshot.singletons.filter(s => s.isResolved);
      expect(resolvedSingletons.length).toBe(2);
    });
  });
});
