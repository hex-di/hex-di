/**
 * Tests for InspectorPlugin integration with @hex-di/runtime plugin system.
 *
 * These tests verify:
 * 1. InspectorPlugin registration and API access via INSPECTOR symbol
 * 2. Pull-based API methods (getSnapshot, getScopeTree, listPorts, isResolved)
 * 3. Push-based subscription for real-time events
 * 4. Container kind detection
 * 5. Phase detection
 * 6. Scope lifecycle events
 */

import { describe, it, expect, vi } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { createContainer, pipe } from "@hex-di/runtime";
import {
  InspectorPlugin,
  createInspector,
  INSPECTOR,
  hasInspector,
  getInspectorAPI,
  hasSubscription,
  withInspector,
} from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): unknown;
}

interface UserService {
  getUser(id: string): { id: string; name: string };
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({
    log: () => {},
  }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({
    query: () => ({}),
  }),
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: "scoped",
  factory: deps => ({
    getUser: (id: string) => {
      deps.Logger.log(`Getting user ${id}`);
      return { id, name: "Test User" };
    },
  }),
});

function createTestGraph() {
  return GraphBuilder.create()
    .provide(LoggerAdapter)
    .provide(DatabaseAdapter)
    .provide(UserServiceAdapter)
    .build();
}

// =============================================================================
// Plugin Registration Tests
// =============================================================================

describe("InspectorPlugin registration", () => {
  it("registers and provides INSPECTOR symbol access immediately", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withInspector);

    // INSPECTOR symbol should be accessible immediately - no binding needed!
    expect(INSPECTOR in container).toBe(true);

    const inspectorAPI = container[INSPECTOR];
    expect(typeof inspectorAPI.getSnapshot).toBe("function");
    expect(typeof inspectorAPI.getScopeTree).toBe("function");
    expect(typeof inspectorAPI.listPorts).toBe("function");
    expect(typeof inspectorAPI.isResolved).toBe("function");
    expect(typeof inspectorAPI.subscribe).toBe("function");
    expect(typeof inspectorAPI.getContainerKind).toBe("function");
    expect(typeof inspectorAPI.getPhase).toBe("function");
  });

  it("provides isolated state per container via singleton plugin", () => {
    const graph = createTestGraph();

    // Same singleton plugin used for both containers
    const container1 = pipe(createContainer(graph), withInspector);
    const container2 = pipe(createContainer(graph), withInspector);

    container1.resolve(LoggerPort);

    // Each container has independent inspection state via WeakMap
    const snapshot1 = container1[INSPECTOR].getSnapshot();
    const snapshot2 = container2[INSPECTOR].getSnapshot();

    // snapshot1 should show Logger as resolved, snapshot2 should not
    const resolved1 = snapshot1.singletons.find(s => s.portName === "Logger");
    const resolved2 = snapshot2.singletons.find(s => s.portName === "Logger");

    expect(resolved1?.isResolved).toBe(true);
    expect(resolved2?.isResolved).toBe(false);
  });
});

// =============================================================================
// Standalone createInspector Tests
// =============================================================================

describe("standalone createInspector", () => {
  it("creates pull-only inspector without plugin", () => {
    const graph = createTestGraph();
    const container = createContainer(graph);

    // Create inspector directly - no plugin needed for pull-only
    const inspector = createInspector(container);

    expect(typeof inspector.getSnapshot).toBe("function");
    expect(typeof inspector.getScopeTree).toBe("function");
    expect(typeof inspector.listPorts).toBe("function");
    expect(typeof inspector.isResolved).toBe("function");
    expect(typeof inspector.getContainerKind).toBe("function");
    expect(typeof inspector.getPhase).toBe("function");
  });

  it("pull-only inspector does not have subscribe", () => {
    const graph = createTestGraph();
    const container = createContainer(graph);

    const inspector = createInspector(container);

    // subscribe is undefined for pull-only inspector
    expect(inspector.subscribe).toBeUndefined();
    expect(hasSubscription(inspector)).toBe(false);
  });

  it("plugin inspector has subscribe", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withInspector);

    const inspector = container[INSPECTOR];

    expect(inspector.subscribe).toBeDefined();
    expect(hasSubscription(inspector)).toBe(true);
  });

  it("caches inspector instances (returns same instance)", () => {
    const graph = createTestGraph();
    const container = createContainer(graph);

    const inspector1 = createInspector(container);
    const inspector2 = createInspector(container);

    expect(inspector1).toBe(inspector2);
  });
});

// =============================================================================
// Type Guard Tests
// =============================================================================

describe("type guards", () => {
  it("hasInspector returns true for containers with InspectorPlugin", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withInspector);

    expect(hasInspector(container)).toBe(true);
  });

  it("hasInspector returns false for containers without InspectorPlugin", () => {
    const graph = createTestGraph();
    const container = createContainer(graph);

    expect(hasInspector(container)).toBe(false);
  });

  it("getInspectorAPI returns InspectorAPI for containers with plugin", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withInspector);

    const api = getInspectorAPI(container);
    expect(api).toBeDefined();
    expect(typeof api?.getSnapshot).toBe("function");
  });

  it("getInspectorAPI returns undefined for containers without plugin", () => {
    const graph = createTestGraph();
    const container = createContainer(graph);

    const api = getInspectorAPI(container);
    expect(api).toBeUndefined();
  });

  it("hasSubscription distinguishes plugin vs standalone inspector", () => {
    const graph = createTestGraph();

    // Standalone - pull only
    const standaloneContainer = createContainer(graph);
    const pullOnlyInspector = createInspector(standaloneContainer);
    expect(hasSubscription(pullOnlyInspector)).toBe(false);

    // Plugin - push + pull
    const pluginContainer = pipe(createContainer(graph), withInspector);
    const pushPullInspector = pluginContainer[INSPECTOR];
    expect(hasSubscription(pushPullInspector)).toBe(true);
  });
});

// =============================================================================
// Pull-based API Tests
// =============================================================================

describe("pull-based API", () => {
  it("getSnapshot returns container snapshot with discriminated kind", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withInspector);

    const snapshot = container[INSPECTOR].getSnapshot();

    expect(snapshot.kind).toBe("root");
    expect(snapshot.isDisposed).toBe(false);
    expect(Array.isArray(snapshot.singletons)).toBe(true);
    expect(snapshot.scopes).toBeDefined();
  });

  it("listPorts returns all registered port names in alphabetical order", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withInspector);

    const ports = container[INSPECTOR].listPorts();

    expect(ports).toContain("Logger");
    expect(ports).toContain("Database");
    expect(ports).toContain("UserService");
    expect(ports.length).toBe(3);

    // Check alphabetical order
    const sorted = [...ports].sort();
    expect(ports).toEqual(sorted);
  });

  it("isResolved returns boolean for singleton ports", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withInspector);

    // Before resolution
    expect(container[INSPECTOR].isResolved("Logger")).toBe(false);

    // After resolution
    container.resolve(LoggerPort);
    expect(container[INSPECTOR].isResolved("Logger")).toBe(true);
  });

  it("isResolved returns 'scope-required' for scoped ports", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withInspector);

    expect(container[INSPECTOR].isResolved("UserService")).toBe("scope-required");
  });

  it("getScopeTree returns hierarchical scope structure", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withInspector);

    const tree = container[INSPECTOR].getScopeTree();

    expect(tree.id).toBe("container");
    expect(tree.status).toBe("active");
    expect(Array.isArray(tree.children)).toBe(true);
  });

  it("getScopeTree includes child scopes", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withInspector);

    // Create a scope
    const scope = container.createScope();
    scope.resolve(UserServicePort);

    const tree = container[INSPECTOR].getScopeTree();

    // Should have at least one child scope
    expect(tree.children.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Container Kind Detection Tests
// =============================================================================

describe("container kind detection", () => {
  it("detects root container kind", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withInspector);

    expect(container[INSPECTOR].getContainerKind()).toBe("root");
  });

  it("getSnapshot returns root kind for root containers", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withInspector);

    const snapshot = container[INSPECTOR].getSnapshot();

    if (snapshot.kind === "root") {
      expect(snapshot.isInitialized).toBeDefined();
      expect(typeof snapshot.asyncAdaptersTotal).toBe("number");
      expect(typeof snapshot.asyncAdaptersInitialized).toBe("number");
    }
  });
});

// =============================================================================
// Phase Detection Tests
// =============================================================================

describe("phase detection", () => {
  it("getPhase returns initialized for root containers", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withInspector);

    // Sync-only containers are immediately initialized
    expect(container[INSPECTOR].getPhase()).toBe("initialized");
  });
});

// =============================================================================
// Push-based Subscription Tests
// =============================================================================

describe("push-based subscriptions", () => {
  it("subscribe notifies on resolution events", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withInspector);

    const callback = vi.fn();
    const unsubscribe = container[INSPECTOR].subscribe(callback);

    container.resolve(LoggerPort);

    // Should have received resolution and snapshot-changed events
    expect(callback).toHaveBeenCalled();

    const resolutionEvent = callback.mock.calls.find(call => call[0].type === "resolution");
    expect(resolutionEvent).toBeDefined();
    expect(resolutionEvent?.[0].portName).toBe("Logger");

    unsubscribe();
  });

  it("unsubscribe stops notifications", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withInspector);

    const callback = vi.fn();
    const unsubscribe = container[INSPECTOR].subscribe(callback);

    container.resolve(LoggerPort);
    const callCountAfterFirst = callback.mock.calls.length;

    unsubscribe();
    container.resolve(DatabasePort);

    // Call count should not increase after unsubscribe
    expect(callback.mock.calls.length).toBe(callCountAfterFirst);
  });

  it("emits snapshot-changed events after resolutions", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withInspector);

    const callback = vi.fn();
    container[INSPECTOR].subscribe(callback);

    container.resolve(LoggerPort);

    const snapshotChangedEvents = callback.mock.calls.filter(
      call => call[0].type === "snapshot-changed"
    );
    expect(snapshotChangedEvents.length).toBeGreaterThan(0);
  });

  it("listener errors do not affect other listeners", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withInspector);

    const errorCallback = vi.fn(() => {
      throw new Error("Listener error");
    });
    const successCallback = vi.fn();

    container[INSPECTOR].subscribe(errorCallback);
    container[INSPECTOR].subscribe(successCallback);

    // Should not throw
    expect(() => container.resolve(LoggerPort)).not.toThrow();

    // Both callbacks should have been called
    expect(errorCallback).toHaveBeenCalled();
    expect(successCallback).toHaveBeenCalled();
  });
});

// =============================================================================
// Scope Event Tests
// =============================================================================

describe("scope events", () => {
  // NOTE: This test is skipped because the runtime currently doesn't emit
  // scope-created events through hooks. The hook infrastructure exists but
  // isn't wired up in scope/impl.ts. This is a known limitation.
  it.skip("emits scope-created events when scopes are created", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withInspector);

    const callback = vi.fn();
    container[INSPECTOR].subscribe(callback);

    container.createScope();

    const scopeCreatedEvents = callback.mock.calls.filter(call => call[0].type === "scope-created");
    expect(scopeCreatedEvents.length).toBeGreaterThan(0);
  });

  // Note: This test is skipped because the runtime's emitScopeDisposed
  // is currently not called during scope disposal. This is a known limitation.
  // The hook infrastructure exists but isn't wired up in scope/impl.ts.
  it.skip("emits scope-disposed events when scopes are disposed", async () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withInspector);

    const scope = container.createScope();

    const callback = vi.fn();
    container[INSPECTOR].subscribe(callback);

    await scope.dispose();

    const scopeDisposedEvents = callback.mock.calls.filter(
      call => call[0].type === "scope-disposed"
    );
    expect(scopeDisposedEvents.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// isDisposed Property Tests
// =============================================================================

describe("isDisposed property", () => {
  it("isDisposed is false initially", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withInspector);

    expect(container[INSPECTOR].isDisposed).toBe(false);
  });
});
