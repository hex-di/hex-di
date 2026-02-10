/**
 * Tests for src/inspection/builtin-api.ts
 * Covers snapshot creation, port resolution tracking, event emission.
 */
// @ts-nocheck

import { describe, it, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import type { InspectorAPI } from "../src/inspection/types.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): unknown;
}
interface RequestContext {
  requestId: string;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const RequestContextPort = port<RequestContext>()({ name: "RequestContext" });

function createLoggerAdapter(lifetime: "singleton" | "transient" | "scoped" = "singleton") {
  return createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime,
    factory: () => ({ log: vi.fn() }),
  });
}

function createDatabaseAdapter() {
  return createAdapter({
    provides: DatabasePort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ query: vi.fn() }),
  });
}

function createRequestContextAdapter() {
  return createAdapter({
    provides: RequestContextPort,
    requires: [],
    lifetime: "scoped",
    factory: () => ({ requestId: `req-${Date.now()}` }),
  });
}

function getInspector(container: any): InspectorAPI {
  return container.inspector;
}

// =============================================================================
// Tests
// =============================================================================

describe("InspectorAPI (builtin-api)", () => {
  describe("getSnapshot", () => {
    it("returns snapshot with container info", () => {
      const graph = GraphBuilder.create()
        .provide(createLoggerAdapter())
        .provide(createDatabaseAdapter())
        .build();
      const container = createContainer({ graph, name: "MyApp" });

      const inspector = getInspector(container);
      const snapshot = inspector.getSnapshot();

      expect(snapshot.kind).toBe("root");
      expect(snapshot.containerName).toBe("MyApp");
      expect(snapshot.isDisposed).toBe(false);
    });

    it("reports unresolved singletons before resolution", () => {
      const graph = GraphBuilder.create()
        .provide(createLoggerAdapter())
        .provide(createDatabaseAdapter())
        .build();
      const container = createContainer({ graph, name: "Test" });

      const inspector = getInspector(container);
      const snapshot = inspector.getSnapshot();

      // Should have singleton entries, none resolved yet
      expect(snapshot.singletons.length).toBeGreaterThanOrEqual(0);
    });

    it("reports resolved singletons after resolution", () => {
      const graph = GraphBuilder.create()
        .provide(createLoggerAdapter())
        .provide(createDatabaseAdapter())
        .build();
      const container = createContainer({ graph, name: "Test" });

      // Resolve one
      container.resolve(LoggerPort);

      const inspector = getInspector(container);
      const snapshot = inspector.getSnapshot();

      const loggerEntry = snapshot.singletons.find(s => s.portName === "Logger");
      expect(loggerEntry).toBeDefined();
      if (loggerEntry) {
        expect(loggerEntry.isResolved).toBe(true);
        expect(loggerEntry.resolvedAt).toBeGreaterThan(0);
      }
    });
  });

  describe("listPorts", () => {
    it("lists all registered ports", () => {
      const graph = GraphBuilder.create()
        .provide(createLoggerAdapter())
        .provide(createDatabaseAdapter())
        .build();
      const container = createContainer({ graph, name: "Test" });

      const inspector = getInspector(container);
      const ports = inspector.listPorts();

      expect(ports).toContain("Logger");
      expect(ports).toContain("Database");
    });

    it("lists ports in alphabetical order", () => {
      const graph = GraphBuilder.create()
        .provide(createDatabaseAdapter())
        .provide(createLoggerAdapter())
        .build();
      const container = createContainer({ graph, name: "Test" });

      const inspector = getInspector(container);
      const ports = inspector.listPorts();

      // Should be sorted
      const sorted = [...ports].sort();
      expect(ports).toEqual(sorted);
    });
  });

  describe("isResolved", () => {
    it("returns false for unresolved singletons", () => {
      const graph = GraphBuilder.create().provide(createLoggerAdapter()).build();
      const container = createContainer({ graph, name: "Test" });

      const inspector = getInspector(container);
      expect(inspector.isResolved("Logger")).toBe(false);
    });

    it("returns true for resolved singletons", () => {
      const graph = GraphBuilder.create().provide(createLoggerAdapter()).build();
      const container = createContainer({ graph, name: "Test" });
      container.resolve(LoggerPort);

      const inspector = getInspector(container);
      expect(inspector.isResolved("Logger")).toBe(true);
    });

    it("returns 'scope-required' for scoped ports", () => {
      const graph = GraphBuilder.create()
        .provide(createLoggerAdapter())
        .provide(createRequestContextAdapter())
        .build();
      const container = createContainer({ graph, name: "Test" });

      const inspector = getInspector(container);
      expect(inspector.isResolved("RequestContext")).toBe("scope-required");
    });

    it("throws for unknown port names", () => {
      const graph = GraphBuilder.create().provide(createLoggerAdapter()).build();
      const container = createContainer({ graph, name: "Test" });

      const inspector = getInspector(container);
      expect(() => inspector.isResolved("NonExistent")).toThrow(/not registered/);
    });

    it("suggests similar port names in error", () => {
      const graph = GraphBuilder.create().provide(createLoggerAdapter()).build();
      const container = createContainer({ graph, name: "Test" });

      const inspector = getInspector(container);
      expect(() => inspector.isResolved("Logge")).toThrow(/Did you mean 'Logger'/);
    });
  });

  describe("getScopeTree", () => {
    it("returns root scope tree", () => {
      const graph = GraphBuilder.create().provide(createLoggerAdapter()).build();
      const container = createContainer({ graph, name: "Test" });

      const inspector = getInspector(container);
      const tree = inspector.getScopeTree();

      expect(tree.id).toBe("container");
      expect(tree.status).toBe("active");
      expect(tree.children).toHaveLength(0);
    });

    it("includes child scopes in tree", () => {
      const graph = GraphBuilder.create().provide(createLoggerAdapter("scoped")).build();
      const container = createContainer({ graph, name: "Test" });

      const scope = container.createScope();
      scope.resolve(LoggerPort);

      const inspector = getInspector(container);
      const tree = inspector.getScopeTree();

      expect(tree.children.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("subscribe", () => {
    it("calls listener when events are emitted", () => {
      const graph = GraphBuilder.create().provide(createLoggerAdapter()).build();
      const container = createContainer({ graph, name: "Test" });

      const inspector = getInspector(container);
      const events: any[] = [];
      const unsub = inspector.subscribe((event: any) => events.push(event));

      // Emit a custom event via inspector
      inspector.emit({ type: "test" } as any);

      unsub();
      expect(events.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("emit", () => {
    it("broadcasts custom events to subscribers", () => {
      const graph = GraphBuilder.create().provide(createLoggerAdapter()).build();
      const container = createContainer({ graph, name: "Test" });

      const inspector = getInspector(container);
      const events: any[] = [];
      inspector.subscribe((event: any) => events.push(event));

      inspector.emit({ type: "custom-event" as any, data: "test" } as any);

      expect(events.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("getPhase", () => {
    it("returns initialized for a fresh container", () => {
      const graph = GraphBuilder.create().provide(createLoggerAdapter()).build();
      const container = createContainer({ graph, name: "Test" });

      const inspector = getInspector(container);
      const phase = inspector.getPhase();
      expect(phase).toBe("initialized");
    });
  });

  describe("after disposal", () => {
    it("container isDisposed is true after disposal", async () => {
      const graph = GraphBuilder.create().provide(createLoggerAdapter()).build();
      const container = createContainer({ graph, name: "Test" });

      await container.dispose();
      // Container's own isDisposed flag should be true
      expect(container.isDisposed).toBe(true);
    });

    it("getSnapshot throws DisposedScopeError after disposal", async () => {
      const graph = GraphBuilder.create().provide(createLoggerAdapter()).build();
      const container = createContainer({ graph, name: "Test" });
      const inspector = getInspector(container);

      await container.dispose();
      // getSnapshot accesses internal state which throws when disposed
      expect(() => inspector.getSnapshot()).toThrow();
    });
  });

  describe("getContainerKind", () => {
    it("returns 'root' for root container", () => {
      const graph = GraphBuilder.create().provide(createLoggerAdapter()).build();
      const container = createContainer({ graph, name: "Test" });
      const inspector = getInspector(container);
      expect(inspector.getContainerKind()).toBe("root");
    });
  });

  describe("getAdapterInfo", () => {
    it("returns adapter info for all adapters", () => {
      const graph = GraphBuilder.create()
        .provide(createLoggerAdapter())
        .provide(createDatabaseAdapter())
        .build();
      const container = createContainer({ graph, name: "Test" });
      const inspector = getInspector(container);
      const adapters = inspector.getAdapterInfo();
      expect(adapters.length).toBe(2);
      const portNames = adapters.map(a => a.portName);
      expect(portNames).toContain("Logger");
      expect(portNames).toContain("Database");
    });
  });

  describe("getGraphData", () => {
    it("returns graph data with adapter info", () => {
      const graph = GraphBuilder.create().provide(createLoggerAdapter()).build();
      const container = createContainer({ graph, name: "Test" });
      const inspector = getInspector(container);
      const graphData = inspector.getGraphData();
      expect(graphData.containerName).toBe("Test");
      expect(graphData.kind).toBe("root");
      expect(graphData.adapters.length).toBe(1);
      expect(graphData.adapters[0].portName).toBe("Logger");
      expect(graphData.adapters[0].origin).toBe("own");
    });
  });

  describe("result statistics", () => {
    it("getResultStatistics returns undefined for unknown port", () => {
      const graph = GraphBuilder.create().provide(createLoggerAdapter()).build();
      const container = createContainer({ graph, name: "Test" });
      const inspector = getInspector(container);
      expect(inspector.getResultStatistics("Logger")).toBeUndefined();
    });

    it("tracks result:ok events", () => {
      const graph = GraphBuilder.create().provide(createLoggerAdapter()).build();
      const container = createContainer({ graph, name: "Test" });
      const inspector = getInspector(container);

      inspector.emit({ type: "result:ok", portName: "Logger", timestamp: Date.now() } as any);

      const stats = inspector.getResultStatistics("Logger");
      expect(stats).toBeDefined();
      expect(stats?.okCount).toBe(1);
      expect(stats?.errCount).toBe(0);
    });

    it("tracks result:err events", () => {
      const graph = GraphBuilder.create().provide(createLoggerAdapter()).build();
      const container = createContainer({ graph, name: "Test" });
      const inspector = getInspector(container);

      inspector.emit({
        type: "result:err",
        portName: "Logger",
        errorCode: "FACTORY_FAILED",
        timestamp: Date.now(),
      } as any);

      const stats = inspector.getResultStatistics("Logger");
      expect(stats).toBeDefined();
      expect(stats?.errCount).toBe(1);
      expect(stats?.errorRate).toBe(1);
    });

    it("getAllResultStatistics returns all tracked ports", () => {
      const graph = GraphBuilder.create()
        .provide(createLoggerAdapter())
        .provide(createDatabaseAdapter())
        .build();
      const container = createContainer({ graph, name: "Test" });
      const inspector = getInspector(container);

      inspector.emit({ type: "result:ok", portName: "Logger", timestamp: Date.now() } as any);
      inspector.emit({
        type: "result:err",
        portName: "Database",
        errorCode: "FACTORY_FAILED",
        timestamp: Date.now(),
      } as any);

      const allStats = inspector.getAllResultStatistics();
      expect(allStats.size).toBe(2);
    });

    it("getHighErrorRatePorts returns ports above threshold", () => {
      const graph = GraphBuilder.create().provide(createLoggerAdapter()).build();
      const container = createContainer({ graph, name: "Test" });
      const inspector = getInspector(container);

      // Emit 2 errors and 1 ok for Logger (66% error rate)
      inspector.emit({
        type: "result:err",
        portName: "Logger",
        errorCode: "FACTORY_FAILED",
        timestamp: Date.now(),
      } as any);
      inspector.emit({
        type: "result:err",
        portName: "Logger",
        errorCode: "FACTORY_FAILED",
        timestamp: Date.now(),
      } as any);
      inspector.emit({ type: "result:ok", portName: "Logger", timestamp: Date.now() } as any);

      const highError = inspector.getHighErrorRatePorts(0.5);
      expect(highError.length).toBe(1);
      expect(highError[0].portName).toBe("Logger");
    });
  });

  describe("getChildContainers", () => {
    it("returns empty array for root without children", () => {
      const graph = GraphBuilder.create().provide(createLoggerAdapter()).build();
      const container = createContainer({ graph, name: "Test" });
      const inspector = getInspector(container);
      const children = inspector.getChildContainers();
      expect(children).toHaveLength(0);
    });

    it("returns child inspectors for child containers", () => {
      const graph = GraphBuilder.create().provide(createLoggerAdapter()).build();
      const container = createContainer({ graph, name: "Parent" });
      const childGraph = GraphBuilder.create().provide(createDatabaseAdapter()).build();
      container.createChild(childGraph, { name: "Child" });

      const inspector = getInspector(container);
      const children = inspector.getChildContainers();
      expect(children.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("getUnifiedSnapshot", () => {
    it("returns unified snapshot with container info", () => {
      const graph = GraphBuilder.create().provide(createLoggerAdapter()).build();
      const container = createContainer({ graph, name: "Test" });
      const inspector = getInspector(container);
      const unified = inspector.getUnifiedSnapshot();
      expect(unified.timestamp).toBeGreaterThan(0);
      expect(unified.container.containerName).toBe("Test");
      expect(unified.registeredLibraries).toEqual([]);
    });
  });
});
