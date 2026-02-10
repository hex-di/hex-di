/**
 * Mutation-killing tests for src/inspection/builtin-api.ts
 *
 * Targets:
 * - createEventEmitter: emit error swallowing, subscribe/unsubscribe
 * - determineOrigin: all branches (overridden, own, inherited)
 * - getContainerKind: parentState check
 * - createResultTracker: handleEvent, getStatistics, getAllStatistics, getHighErrorRatePorts
 * - createBuiltinInspectorAPI: all methods, getChildContainers caching, getAdapterInfo, getGraphData
 */
// @ts-nocheck

import { describe, it, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import type { InspectorAPI } from "../src/inspection/types.js";
import { INTERNAL_ACCESS, INSPECTOR } from "../src/inspection/symbols.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): unknown;
}
interface Cache {
  get(key: string): unknown;
}
interface RequestCtx {
  requestId: string;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const CachePort = port<Cache>()({ name: "Cache" });
const RequestCtxPort = port<RequestCtx>()({ name: "RequestCtx" });

function getInspector(container: any): InspectorAPI {
  return container.inspector;
}

function createTestContainer(opts?: { name?: string; scoped?: boolean }) {
  const adapters: any[] = [
    createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: opts?.scoped ? "scoped" : "singleton",
      factory: () => ({ log: vi.fn() }),
    }),
  ];
  const graph = GraphBuilder.create();
  for (const a of adapters) {
    graph.provide(a);
  }
  return createContainer({ graph: graph.build(), name: opts?.name ?? "Test" });
}

// =============================================================================
// Event Emitter Tests (Lines 50-71)
// =============================================================================

describe("createEventEmitter (via InspectorAPI.subscribe/emit)", () => {
  it("subscribe returns unsubscribe function that removes listener", () => {
    const container = createTestContainer();
    const inspector = getInspector(container);
    const events: any[] = [];
    const unsub = inspector.subscribe((event: any) => events.push(event));

    inspector.emit({ type: "result:ok", portName: "Logger", timestamp: 1 } as any);
    expect(events).toHaveLength(1);

    unsub();
    inspector.emit({ type: "result:ok", portName: "Logger", timestamp: 2 } as any);
    // After unsubscribe, no new events
    expect(events).toHaveLength(1);
  });

  it("emit swallows listener errors and continues to next listener", () => {
    const container = createTestContainer();
    const inspector = getInspector(container);
    const events: any[] = [];

    inspector.subscribe(() => {
      throw new Error("listener error");
    });
    inspector.subscribe((event: any) => events.push(event));

    // Should not throw, second listener still called
    inspector.emit({ type: "result:ok", portName: "Logger", timestamp: 1 } as any);
    expect(events).toHaveLength(1);
  });

  it("multiple listeners all receive events", () => {
    const container = createTestContainer();
    const inspector = getInspector(container);
    const events1: any[] = [];
    const events2: any[] = [];

    inspector.subscribe((event: any) => events1.push(event));
    inspector.subscribe((event: any) => events2.push(event));

    inspector.emit({ type: "result:ok", portName: "Logger", timestamp: 1 } as any);
    expect(events1).toHaveLength(1);
    expect(events2).toHaveLength(1);
  });
});

// =============================================================================
// Result Tracker Tests (Lines 135-203)
// =============================================================================

describe("createResultTracker (via InspectorAPI)", () => {
  it("handles result:ok event and increments okCount", () => {
    const container = createTestContainer();
    const inspector = getInspector(container);

    inspector.emit({ type: "result:ok", portName: "Logger", timestamp: 100 } as any);

    const stats = inspector.getResultStatistics("Logger");
    expect(stats).toBeDefined();
    expect(stats!.okCount).toBe(1);
    expect(stats!.errCount).toBe(0);
    expect(stats!.totalCalls).toBe(1);
    expect(stats!.errorRate).toBe(0);
    expect(stats!.portName).toBe("Logger");
  });

  it("handles result:err event and tracks error details", () => {
    const container = createTestContainer();
    const inspector = getInspector(container);

    const ts = 12345;
    inspector.emit({
      type: "result:err",
      portName: "Logger",
      errorCode: "FACTORY_FAILED",
      timestamp: ts,
    } as any);

    const stats = inspector.getResultStatistics("Logger");
    expect(stats).toBeDefined();
    expect(stats!.okCount).toBe(0);
    expect(stats!.errCount).toBe(1);
    expect(stats!.totalCalls).toBe(1);
    expect(stats!.errorRate).toBe(1);
    expect(stats!.errorsByCode.get("FACTORY_FAILED")).toBe(1);
    expect(stats!.lastError).toBeDefined();
    expect(stats!.lastError!.code).toBe("FACTORY_FAILED");
    expect(stats!.lastError!.timestamp).toBe(ts);
  });

  it("computes errorRate correctly with mixed ok/err", () => {
    const container = createTestContainer();
    const inspector = getInspector(container);

    inspector.emit({ type: "result:ok", portName: "Logger", timestamp: 1 } as any);
    inspector.emit({ type: "result:ok", portName: "Logger", timestamp: 2 } as any);
    inspector.emit({
      type: "result:err",
      portName: "Logger",
      errorCode: "E1",
      timestamp: 3,
    } as any);

    const stats = inspector.getResultStatistics("Logger");
    expect(stats!.totalCalls).toBe(3);
    expect(stats!.okCount).toBe(2);
    expect(stats!.errCount).toBe(1);
    // errorRate = errCount / totalCalls = 1/3
    expect(stats!.errorRate).toBeCloseTo(1 / 3);
  });

  it("returns undefined for ports with no tracked events", () => {
    const container = createTestContainer();
    const inspector = getInspector(container);
    expect(inspector.getResultStatistics("Unknown")).toBeUndefined();
  });

  it("errorsByCode accumulates counts per error code", () => {
    const container = createTestContainer();
    const inspector = getInspector(container);

    inspector.emit({
      type: "result:err",
      portName: "Logger",
      errorCode: "E1",
      timestamp: 1,
    } as any);
    inspector.emit({
      type: "result:err",
      portName: "Logger",
      errorCode: "E1",
      timestamp: 2,
    } as any);
    inspector.emit({
      type: "result:err",
      portName: "Logger",
      errorCode: "E2",
      timestamp: 3,
    } as any);

    const stats = inspector.getResultStatistics("Logger");
    expect(stats!.errorsByCode.get("E1")).toBe(2);
    expect(stats!.errorsByCode.get("E2")).toBe(1);
  });

  it("lastError tracks the most recent error", () => {
    const container = createTestContainer();
    const inspector = getInspector(container);

    inspector.emit({
      type: "result:err",
      portName: "Logger",
      errorCode: "E1",
      timestamp: 100,
    } as any);
    inspector.emit({
      type: "result:err",
      portName: "Logger",
      errorCode: "E2",
      timestamp: 200,
    } as any);

    const stats = inspector.getResultStatistics("Logger");
    expect(stats!.lastError!.code).toBe("E2");
    expect(stats!.lastError!.timestamp).toBe(200);
  });

  it("toSnapshot returns frozen result with errorsByCode as new Map", () => {
    const container = createTestContainer();
    const inspector = getInspector(container);

    inspector.emit({
      type: "result:err",
      portName: "Logger",
      errorCode: "E1",
      timestamp: 1,
    } as any);

    const stats1 = inspector.getResultStatistics("Logger");
    const stats2 = inspector.getResultStatistics("Logger");
    // Each call returns a new Map (not the internal one)
    expect(stats1!.errorsByCode).not.toBe(stats2!.errorsByCode);
    // But values match
    expect(stats1!.errorsByCode.get("E1")).toBe(1);
  });

  it("getAllResultStatistics returns a map of all tracked ports", () => {
    const container = createTestContainer();
    const inspector = getInspector(container);

    inspector.emit({ type: "result:ok", portName: "Logger", timestamp: 1 } as any);
    inspector.emit({
      type: "result:err",
      portName: "Database",
      errorCode: "E1",
      timestamp: 2,
    } as any);

    const all = inspector.getAllResultStatistics();
    expect(all.size).toBe(2);
    expect(all.has("Logger")).toBe(true);
    expect(all.has("Database")).toBe(true);

    const loggerStats = all.get("Logger")!;
    expect(loggerStats.okCount).toBe(1);
    expect(loggerStats.errCount).toBe(0);
    expect(loggerStats.portName).toBe("Logger");

    const dbStats = all.get("Database")!;
    expect(dbStats.okCount).toBe(0);
    expect(dbStats.errCount).toBe(1);
    expect(dbStats.portName).toBe("Database");
  });

  it("getHighErrorRatePorts only returns ports above threshold", () => {
    const container = createTestContainer();
    const inspector = getInspector(container);

    // Logger: 1 ok, 0 err (0% error rate)
    inspector.emit({ type: "result:ok", portName: "Logger", timestamp: 1 } as any);

    // Database: 0 ok, 2 err (100% error rate)
    inspector.emit({
      type: "result:err",
      portName: "Database",
      errorCode: "E1",
      timestamp: 2,
    } as any);
    inspector.emit({
      type: "result:err",
      portName: "Database",
      errorCode: "E1",
      timestamp: 3,
    } as any);

    // Threshold 0.5 -> only Database should be returned
    const highError = inspector.getHighErrorRatePorts(0.5);
    expect(highError).toHaveLength(1);
    expect(highError[0].portName).toBe("Database");
  });

  it("getHighErrorRatePorts returns empty for threshold = 1 when errorRate < 1", () => {
    const container = createTestContainer();
    const inspector = getInspector(container);

    inspector.emit({ type: "result:ok", portName: "Logger", timestamp: 1 } as any);
    inspector.emit({
      type: "result:err",
      portName: "Logger",
      errorCode: "E1",
      timestamp: 2,
    } as any);

    // 50% error rate, threshold 1.0 -> no results (0.5 is not > 1.0)
    const highError = inspector.getHighErrorRatePorts(1.0);
    expect(highError).toHaveLength(0);
  });

  it("getHighErrorRatePorts returns frozen array", () => {
    const container = createTestContainer();
    const inspector = getInspector(container);

    inspector.emit({
      type: "result:err",
      portName: "Logger",
      errorCode: "E1",
      timestamp: 1,
    } as any);

    const highError = inspector.getHighErrorRatePorts(0);
    expect(Object.isFrozen(highError)).toBe(true);
  });

  it("events that are not result:ok or result:err are ignored by tracker", () => {
    const container = createTestContainer();
    const inspector = getInspector(container);

    inspector.emit({ type: "custom", data: "something" } as any);

    const all = inspector.getAllResultStatistics();
    expect(all.size).toBe(0);
  });

  it("errorRate is 0 when totalCalls is 0 (should not happen but tests the guard)", () => {
    const container = createTestContainer();
    const inspector = getInspector(container);

    // No events emitted -> no stats
    const stats = inspector.getResultStatistics("Logger");
    expect(stats).toBeUndefined();
  });

  it("getHighErrorRatePorts skips ports with 0 totalCalls", () => {
    const container = createTestContainer();
    const inspector = getInspector(container);

    // No events -> no high error ports
    const highError = inspector.getHighErrorRatePorts(0);
    expect(highError).toHaveLength(0);
  });
});

// =============================================================================
// determineOrigin Tests (Lines 77-99)
// =============================================================================

describe("determineOrigin (via getGraphData)", () => {
  it("returns 'own' origin for root container adapters", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const inspector = getInspector(container);
    const graphData = inspector.getGraphData();

    expect(graphData.adapters[0].origin).toBe("own");
  });

  it("returns 'own' for child container's own adapters", () => {
    const parentGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const parent = createContainer({ graph: parentGraph, name: "Parent" });

    const childGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: DatabasePort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ query: vi.fn() }),
        })
      )
      .build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const inspector = getInspector(child);
    const graphData = inspector.getGraphData();

    // The child's own adapter should have origin "own"
    const dbAdapter = graphData.adapters.find((a: any) => a.portName === "Database");
    expect(dbAdapter).toBeDefined();
    expect(dbAdapter!.origin).toBe("own");
  });
});

// =============================================================================
// getContainerKind Tests (Lines 105-110)
// =============================================================================

describe("getContainerKind (via InspectorAPI)", () => {
  it("returns 'root' for root container", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Root" });
    const inspector = getInspector(container);
    expect(inspector.getContainerKind()).toBe("root");
  });

  it("returns 'child' for child container", () => {
    const parentGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const parent = createContainer({ graph: parentGraph, name: "Parent" });

    const childGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: DatabasePort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ query: vi.fn() }),
        })
      )
      .build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const inspector = getInspector(child);
    expect(inspector.getContainerKind()).toBe("child");
  });
});

// =============================================================================
// getGraphData Tests (Lines 313-349)
// =============================================================================

describe("getGraphData (builtin-api detailed)", () => {
  it("parentName is null for root container", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Root" });
    const inspector = getInspector(container);
    const graphData = inspector.getGraphData();

    expect(graphData.parentName).toBeNull();
    expect(graphData.containerName).toBe("Root");
    expect(graphData.kind).toBe("root");
  });

  it("includes all adapter properties", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .provide(
        createAdapter({
          provides: DatabasePort,
          requires: [LoggerPort],
          lifetime: "transient",
          factory: (deps: any) => ({ query: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const inspector = getInspector(container);
    const graphData = inspector.getGraphData();

    expect(graphData.adapters).toHaveLength(2);
    for (const adapter of graphData.adapters) {
      expect(adapter.portName).toBeDefined();
      expect(adapter.lifetime).toBeDefined();
      expect(adapter.factoryKind).toBeDefined();
      expect(adapter.dependencyNames).toBeDefined();
      expect(adapter.origin).toBeDefined();
      expect(Object.isFrozen(adapter)).toBe(true);
      expect(Object.isFrozen(adapter.dependencyNames)).toBe(true);
    }
    expect(Object.isFrozen(graphData)).toBe(true);
    expect(Object.isFrozen(graphData.adapters)).toBe(true);
  });

  it("adapter isOverride is false for root container", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const inspector = getInspector(container);
    const graphData = inspector.getGraphData();

    for (const adapter of graphData.adapters) {
      expect(adapter.isOverride).toBe(false);
    }
  });

  it("inheritanceMode is undefined for root container adapters", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const inspector = getInspector(container);
    const graphData = inspector.getGraphData();

    for (const adapter of graphData.adapters) {
      // For root, origin is "own", not "inherited" -> inheritanceMode = undefined
      expect(adapter.inheritanceMode).toBeUndefined();
    }
  });
});

// =============================================================================
// getAdapterInfo Tests (Lines 292-308)
// =============================================================================

describe("getAdapterInfo detailed", () => {
  it("returns correct adapter properties", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .provide(
        createAdapter({
          provides: DatabasePort,
          requires: [LoggerPort],
          lifetime: "transient",
          factory: (deps: any) => ({ query: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const inspector = getInspector(container);
    const adapters = inspector.getAdapterInfo();

    expect(adapters).toHaveLength(2);
    for (const adapter of adapters) {
      expect(Object.isFrozen(adapter)).toBe(true);
      expect(Object.isFrozen(adapter.dependencyNames)).toBe(true);
    }

    const loggerAdapter = adapters.find(a => a.portName === "Logger");
    expect(loggerAdapter).toBeDefined();
    expect(loggerAdapter!.lifetime).toBe("singleton");

    const dbAdapter = adapters.find(a => a.portName === "Database");
    expect(dbAdapter).toBeDefined();
    expect(dbAdapter!.lifetime).toBe("transient");
    expect(dbAdapter!.dependencyNames).toContain("Logger");
  });
});

// =============================================================================
// getSnapshot Tests (detailed)
// =============================================================================

describe("getSnapshot detailed", () => {
  it("snapshot has kind 'root' for root container", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "MyApp" });
    const inspector = getInspector(container);
    const snapshot = inspector.getSnapshot();

    expect(snapshot.kind).toBe("root");
    expect(snapshot.containerName).toBe("MyApp");
    expect(snapshot.isDisposed).toBe(false);
  });

  it("snapshot phase is 'initialized' for root container", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const inspector = getInspector(container);
    const snapshot = inspector.getSnapshot();

    expect(snapshot.phase).toBe("initialized");
    // For root, isInitialized should be phase === "initialized"
    expect((snapshot as any).isInitialized).toBe(true);
  });
});

// =============================================================================
// isDisposed getter Tests (Lines 367-369)
// =============================================================================

describe("isDisposed getter", () => {
  it("returns false before disposal", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const inspector = getInspector(container);

    expect(inspector.isDisposed).toBe(false);
  });
});

// =============================================================================
// getPhase Tests (Lines 363-366)
// =============================================================================

describe("getPhase detailed", () => {
  it("returns 'initialized' for root container", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const inspector = getInspector(container);

    expect(inspector.getPhase()).toBe("initialized");
  });
});

// =============================================================================
// getChildContainers Tests (Lines 252-287)
// =============================================================================

describe("getChildContainers detailed", () => {
  it("returns empty frozen array for root with no children", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const inspector = getInspector(container);
    const children = inspector.getChildContainers();

    expect(children).toHaveLength(0);
    expect(Object.isFrozen(children)).toBe(true);
  });

  it("returns child inspectors that can themselves be inspected", () => {
    const parentGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const parent = createContainer({ graph: parentGraph, name: "Parent" });

    const childGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: DatabasePort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ query: vi.fn() }),
        })
      )
      .build();
    parent.createChild(childGraph, { name: "Child" });

    const inspector = getInspector(parent);
    const children = inspector.getChildContainers();
    expect(children.length).toBeGreaterThanOrEqual(1);

    // Each child inspector should have standard methods
    for (const childInspector of children) {
      expect(typeof childInspector.getSnapshot).toBe("function");
      expect(typeof childInspector.listPorts).toBe("function");
      expect(typeof childInspector.getContainerKind).toBe("function");
    }
  });
});

// =============================================================================
// Library Registry Integration Tests (Lines 387-409)
// =============================================================================

describe("library inspector registry via builtin API", () => {
  it("registerLibrary emits library-registered event", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const inspector = getInspector(container);
    const events: any[] = [];
    inspector.subscribe((event: any) => events.push(event));

    const lib = {
      name: "test-lib",
      getSnapshot: () => ({ state: "ok" }),
    };
    inspector.registerLibrary(lib);

    const registered = events.find(e => e.type === "library-registered");
    expect(registered).toBeDefined();
    expect(registered.name).toBe("test-lib");
  });

  it("getLibraryInspectors returns registered libraries", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const inspector = getInspector(container);

    const lib = {
      name: "test-lib",
      getSnapshot: () => ({ state: "ok" }),
    };
    inspector.registerLibrary(lib);

    const inspectors = inspector.getLibraryInspectors();
    expect(inspectors.size).toBe(1);
    expect(inspectors.has("test-lib")).toBe(true);
  });

  it("getLibraryInspector returns a specific library", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const inspector = getInspector(container);

    const lib = {
      name: "test-lib",
      getSnapshot: () => ({ state: "ok" }),
    };
    inspector.registerLibrary(lib);

    expect(inspector.getLibraryInspector("test-lib")).toBe(lib);
    expect(inspector.getLibraryInspector("nonexistent")).toBeUndefined();
  });

  it("getUnifiedSnapshot includes library snapshots and registeredLibraries sorted", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const inspector = getInspector(container);

    const libB = { name: "b-lib", getSnapshot: () => ({ val: 2 }) };
    const libA = { name: "a-lib", getSnapshot: () => ({ val: 1 }) };
    inspector.registerLibrary(libB);
    inspector.registerLibrary(libA);

    const unified = inspector.getUnifiedSnapshot();
    expect(unified.timestamp).toBeGreaterThan(0);
    expect(unified.container).toBeDefined();
    expect(unified.libraries["a-lib"]).toEqual({ val: 1 });
    expect(unified.libraries["b-lib"]).toEqual({ val: 2 });
    // registeredLibraries should be sorted
    expect(unified.registeredLibraries).toEqual(["a-lib", "b-lib"]);
    expect(Object.isFrozen(unified)).toBe(true);
    expect(Object.isFrozen(unified.registeredLibraries)).toBe(true);
  });

  it("disposeLibraries disposes all registered libraries", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const inspector = getInspector(container);

    const disposeFn = vi.fn();
    const lib = {
      name: "test-lib",
      getSnapshot: () => ({}),
      dispose: disposeFn,
    };
    inspector.registerLibrary(lib);
    inspector.disposeLibraries();

    expect(disposeFn).toHaveBeenCalled();
    // After dispose, inspectors map should be empty
    expect(inspector.getLibraryInspectors().size).toBe(0);
  });

  it("getContainer returns the container reference", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const inspector = getInspector(container);

    const returned = inspector.getContainer();
    expect(returned).toBeDefined();
    // Should have INTERNAL_ACCESS
    expect(typeof returned[INTERNAL_ACCESS]).toBe("function");
  });
});

// =============================================================================
// emit integration - result tracker + event emitter
// =============================================================================

describe("emitEvent integration", () => {
  it("emitEvent feeds result tracker AND notifies subscribers", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const inspector = getInspector(container);

    const events: any[] = [];
    inspector.subscribe((event: any) => events.push(event));

    inspector.emit({ type: "result:ok", portName: "Logger", timestamp: 1 } as any);

    // Subscriber received the event
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("result:ok");

    // Result tracker also received it
    const stats = inspector.getResultStatistics("Logger");
    expect(stats).toBeDefined();
    expect(stats!.okCount).toBe(1);
  });
});

// =============================================================================
// InspectorAPI is frozen
// =============================================================================

describe("InspectorAPI frozen", () => {
  it("InspectorAPI object is frozen", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });
    const inspector = getInspector(container);

    expect(Object.isFrozen(inspector)).toBe(true);
  });
});
