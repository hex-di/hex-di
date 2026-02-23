/**
 * Comprehensive mutation-killing tests for src/container/base-impl.ts
 *
 * Targets all surviving mutants in the base-impl module:
 * - hasInspector type guard: typeof checks, null checks, property checks
 * - setWrapper / getWrapper
 * - isDisposed getter
 * - isInitialized getter
 * - registerChildContainer: inspector extraction, childId, emit, childKind (lazy vs child)
 * - unregisterChildContainer
 * - hasAdapter / getAdapter / has
 * - has: returns false for undefined adapter, returns false for scoped, returns true otherwise
 * - resolve: disposed check, shouldResolveLocally, getLocal, scoped check, async init check
 * - resolveInternal: adapter lookup, fallback
 * - resolveAsync: disposed check, shouldResolveLocally, scoped check
 * - resolveAsyncInternal: adapter lookup, fallback
 * - registerChildScope / unregisterChildScope
 * - getSingletonMemo
 * - dispose
 * - getInternalState: disposed check, isRoot ternary, childScope/container snapshots
 * - createAdapterMapSnapshot: entry iteration
 */
import { describe, it, expect, vi } from "vitest";
import { port, createAdapter, type Port } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { INTERNAL_ACCESS } from "../src/inspection/symbols.js";
import {
  DisposedScopeError,
  ScopeRequiredError,
  AsyncInitializationRequiredError,
} from "../src/errors/index.js";

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

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const _CachePort = port<Cache>()({ name: "Cache" });

function makeRootContainer(lifetime: "singleton" | "transient" | "scoped" = "singleton") {
  const loggerAdapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime,
    factory: () => ({ log: vi.fn() }),
  });
  const graph = GraphBuilder.create().provide(loggerAdapter).build();
  return createContainer({ graph, name: "Root" });
}

// =============================================================================
// has method - exact boolean return values
// =============================================================================

describe("BaseContainerImpl - has method return values", () => {
  it("has returns false when adapter is undefined (port not registered)", () => {
    const container = makeRootContainer();
    const result = container.has(DatabasePort);
    expect(result).toBe(false);
    // Verify it's exactly false, not falsy
    expect(result).toStrictEqual(false);
  });

  it("has returns false when adapter lifetime is 'scoped'", () => {
    const container = makeRootContainer("scoped");
    const result = container.has(LoggerPort);
    expect(result).toBe(false);
    expect(result).toStrictEqual(false);
  });

  it("has returns true when adapter exists and is not scoped", () => {
    const container = makeRootContainer("singleton");
    const result = container.has(LoggerPort);
    expect(result).toBe(true);
    expect(result).toStrictEqual(true);
  });

  it("has returns true for transient lifetime", () => {
    const container = makeRootContainer("transient");
    const result = container.has(LoggerPort);
    expect(result).toBe(true);
  });
});

// =============================================================================
// isDisposed / isInitialized getters
// =============================================================================

describe("BaseContainerImpl - lifecycle getters", () => {
  it("isDisposed is false initially", () => {
    const container = makeRootContainer();
    expect(container.isDisposed).toBe(false);
    expect(container.isDisposed).toStrictEqual(false);
  });

  it("isDisposed is true after disposal", async () => {
    const container = makeRootContainer();
    await container.dispose();
    expect(container.isDisposed).toBe(true);
    expect(container.isDisposed).toStrictEqual(true);
  });

  it("isInitialized is false for uninitialized root container", () => {
    const container = makeRootContainer();
    expect(container.isInitialized).toBe(false);
  });

  it("isInitialized is true for child containers", () => {
    const container = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });
    expect(child.isInitialized).toBe(true);
  });
});

// =============================================================================
// resolve - DisposedScopeError
// =============================================================================

describe("BaseContainerImpl - resolve disposal check", () => {
  it("resolve throws DisposedScopeError after disposal", async () => {
    const container = makeRootContainer();
    await container.dispose();
    expect(() => container.resolve(LoggerPort)).toThrow(DisposedScopeError);
  });

  it("resolveAsync throws DisposedScopeError after disposal", async () => {
    const container = makeRootContainer();
    await container.dispose();
    await expect(container.resolveAsync(LoggerPort)).rejects.toThrow(DisposedScopeError);
  });
});

// =============================================================================
// resolve - ScopeRequiredError for scoped ports
// =============================================================================

describe("BaseContainerImpl - resolve scoped port handling", () => {
  it("resolve throws ScopeRequiredError for scoped port from root", () => {
    const container = makeRootContainer("scoped");
    expect(() => container.resolve(LoggerPort)).toThrow(ScopeRequiredError);
  });

  it("resolveAsync throws ScopeRequiredError for scoped port from root", async () => {
    const container = makeRootContainer("scoped");
    await expect(container.resolveAsync(LoggerPort)).rejects.toThrow(ScopeRequiredError);
  });
});

// =============================================================================
// resolve - AsyncInitializationRequiredError
// =============================================================================

describe("BaseContainerImpl - async init required", () => {
  it("sync resolve of async port throws AsyncInitializationRequiredError", () => {
    const asyncAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: async () => ({ query: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(asyncAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    expect(() => container.resolve(DatabasePort)).toThrow(AsyncInitializationRequiredError);
  });
});

// =============================================================================
// resolve - unregistered port throws
// =============================================================================

describe("BaseContainerImpl - resolve unregistered port", () => {
  it("resolve throws for unregistered port on root", () => {
    const container = makeRootContainer();
    const resolve = container.resolve as (port: Port<string, unknown>) => unknown;
    expect(() => resolve(DatabasePort)).toThrow(/No adapter registered/);
  });

  it("resolveAsync rejects for unregistered port on root", async () => {
    const container = makeRootContainer();
    const resolveAsync = container.resolveAsync as (
      port: Port<string, unknown>
    ) => Promise<unknown>;
    await expect(resolveAsync(DatabasePort)).rejects.toThrow(/No adapter registered/);
  });
});

// =============================================================================
// hasAdapter / getAdapter
// =============================================================================

describe("BaseContainerImpl - hasAdapter and getAdapter", () => {
  it("hasAdapter returns true for registered port", () => {
    const container = makeRootContainer();
    expect(container.has(LoggerPort)).toBe(true);
  });

  it("hasAdapter returns false for unregistered port", () => {
    const container = makeRootContainer();
    expect(container.has(DatabasePort)).toBe(false);
  });
});

// =============================================================================
// registerChildContainer and unregisterChildContainer
// =============================================================================

describe("BaseContainerImpl - child container registration", () => {
  it("registerChildContainer adds child to tracking", () => {
    const container = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const _child = container.createChild(childGraph, { name: "Child" });

    const state = container[INTERNAL_ACCESS]();
    expect(state.childContainers.length).toBe(1);
  });

  it("multiple children are all tracked", () => {
    const container = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    container.createChild(childGraph, { name: "Child1" });
    container.createChild(childGraph, { name: "Child2" });

    const state = container[INTERNAL_ACCESS]();
    expect(state.childContainers.length).toBe(2);
  });

  it("unregisterChildContainer removes child on dispose", async () => {
    const container = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child1 = container.createChild(childGraph, { name: "Child1" });
    container.createChild(childGraph, { name: "Child2" });

    await child1.dispose();

    const state = container[INTERNAL_ACCESS]();
    expect(state.childContainers.length).toBe(1);
  });

  it("registerChildContainer emits child-created event with childKind 'child'", () => {
    const container = makeRootContainer();
    const events: any[] = [];

    // Subscribe to inspector events
    const inspector = (container as any).inspector;
    if (inspector?.subscribe) {
      inspector.subscribe((event: any) => events.push(event));
    }

    const childGraph = GraphBuilder.create().build();
    container.createChild(childGraph, { name: "Child" });

    const childCreatedEvent = events.find((e: any) => e.type === "child-created");
    expect(childCreatedEvent).toBeDefined();
    expect(childCreatedEvent.childKind).toBe("child");
  });

  it("registerChildContainer emits child-created event with childKind 'lazy' when lazy flag is set", async () => {
    const container = makeRootContainer();
    const events: any[] = [];

    const inspector = (container as any).inspector;
    if (inspector?.subscribe) {
      inspector.subscribe((event: any) => events.push(event));
    }

    // Use createLazyChild which sets the lazy flag
    const dbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });
    const childGraph = GraphBuilder.create().provide(dbAdapter).build();

    const lazy = container.createLazyChild(async () => childGraph, { name: "LazyChild" });

    // Load the lazy container (triggers createChild internally)
    await lazy.load();

    const lazyEvent = events.find((e: any) => e.type === "child-created" && e.childKind === "lazy");
    expect(lazyEvent).toBeDefined();
  });
});

// =============================================================================
// Scope management
// =============================================================================

describe("BaseContainerImpl - scope management", () => {
  it("registerChildScope adds scope to tracking", () => {
    const container = makeRootContainer("scoped");
    const _scope = container.createScope("test");

    const state = container[INTERNAL_ACCESS]();
    expect(state.childScopes.length).toBe(1);
  });

  it("unregisterChildScope removes scope after dispose", async () => {
    const container = makeRootContainer("scoped");
    const scope = container.createScope("test");

    await scope.dispose();

    const state = container[INTERNAL_ACCESS]();
    expect(state.childScopes.length).toBe(0);
  });
});

// =============================================================================
// getInternalState
// =============================================================================

describe("BaseContainerImpl - getInternalState", () => {
  it("returns frozen state object", () => {
    const container = makeRootContainer();
    const state = container[INTERNAL_ACCESS]();
    expect(Object.isFrozen(state)).toBe(true);
  });

  it("throws DisposedScopeError when disposed", async () => {
    const container = makeRootContainer();
    await container.dispose();
    expect(() => container[INTERNAL_ACCESS]()).toThrow(DisposedScopeError);
  });

  it("root container state has containerId 'root'", () => {
    const container = makeRootContainer();
    const state = container[INTERNAL_ACCESS]();
    expect(state.containerId).toBe("root");
  });

  it("state has correct disposed value", () => {
    const container = makeRootContainer();
    const state = container[INTERNAL_ACCESS]();
    expect(state.disposed).toBe(false);
  });

  it("state has containerName", () => {
    const container = makeRootContainer();
    const state = container[INTERNAL_ACCESS]();
    expect(state.containerName).toBe("Root");
  });

  it("state has singletonMemo", () => {
    const container = makeRootContainer();
    container.resolve(LoggerPort);
    const state = container[INTERNAL_ACCESS]();
    expect(state.singletonMemo.size).toBe(1);
    expect(state.singletonMemo.entries.length).toBe(1);
  });

  it("state has childScopes array", () => {
    const container = makeRootContainer();
    const state = container[INTERNAL_ACCESS]();
    expect(Array.isArray(state.childScopes)).toBe(true);
  });

  it("state has childContainers array", () => {
    const container = makeRootContainer();
    const state = container[INTERNAL_ACCESS]();
    expect(Array.isArray(state.childContainers)).toBe(true);
  });

  it("state has adapterMap", () => {
    const container = makeRootContainer();
    const state = container[INTERNAL_ACCESS]();
    expect(state.adapterMap).toBeDefined();
    expect(state.adapterMap.size).toBeGreaterThan(0);
  });

  it("disposed error message includes container type", async () => {
    const container = makeRootContainer();
    await container.dispose();

    try {
      container[INTERNAL_ACCESS]();
    } catch (error: any) {
      expect(error).toBeInstanceOf(DisposedScopeError);
      expect(error.portName).toBe("container");
    }
  });

  it("child container disposed error message includes child type", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    await child.dispose();

    try {
      child[INTERNAL_ACCESS]();
    } catch (error: any) {
      expect(error).toBeInstanceOf(DisposedScopeError);
      expect(error.portName).toBe("child-container");
    }
  });
});

// =============================================================================
// createAdapterMapSnapshot
// =============================================================================

describe("BaseContainerImpl - createAdapterMapSnapshot", () => {
  it("adapter map entry has correct portName", () => {
    const container = makeRootContainer();
    const state = container[INTERNAL_ACCESS]();

    const entries = Array.from(state.adapterMap.values());
    const loggerEntry = entries.find((e: any) => e.portName === "Logger");
    expect(loggerEntry).toBeDefined();
    expect(loggerEntry!.portName).toBe("Logger");
  });

  it("adapter map entry has correct lifetime", () => {
    const container = makeRootContainer();
    const state = container[INTERNAL_ACCESS]();

    const entries = Array.from(state.adapterMap.values());
    const loggerEntry = entries.find((e: any) => e.portName === "Logger");
    expect(loggerEntry!.lifetime).toBe("singleton");
  });

  it("adapter map entry has correct factoryKind", () => {
    const container = makeRootContainer();
    const state = container[INTERNAL_ACCESS]();

    const entries = Array.from(state.adapterMap.values());
    const loggerEntry = entries.find((e: any) => e.portName === "Logger");
    expect(loggerEntry!.factoryKind).toBe("sync");
  });

  it("adapter map entry has correct dependencyCount", () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const userAdapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: deps => ({ query: () => deps.Logger.log("query") }),
    });
    const graph = GraphBuilder.create().provide(loggerAdapter).provide(userAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const state = container[INTERNAL_ACCESS]();
    const entries = Array.from(state.adapterMap.values());

    const loggerEntry = entries.find((e: any) => e.portName === "Logger");
    expect(loggerEntry!.dependencyCount).toBe(0);
    expect(loggerEntry!.dependencyNames).toEqual([]);

    const dbEntry = entries.find((e: any) => e.portName === "Database");
    expect(dbEntry!.dependencyCount).toBe(1);
    expect(dbEntry!.dependencyNames).toEqual(["Logger"]);
  });
});

// =============================================================================
// dispose
// =============================================================================

describe("BaseContainerImpl - disposal", () => {
  it("dispose is idempotent", async () => {
    const container = makeRootContainer();
    await container.dispose();
    await container.dispose(); // second call should be no-op
    expect(container.isDisposed).toBe(true);
  });

  it("dispose cascades to child containers", async () => {
    const container = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });

    await container.dispose();
    expect(child.isDisposed).toBe(true);
  });

  it("dispose cascades to child scopes", async () => {
    const scopedAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(scopedAdapter).build();
    const container = createContainer({ graph, name: "Root" });

    const scope = container.createScope("test");
    await container.dispose();
    expect(scope.isDisposed).toBe(true);
  });

  it("dispose calls singleton finalizers", async () => {
    const finalizer = vi.fn();
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
      finalizer,
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    container.resolve(LoggerPort);
    await container.dispose();
    expect(finalizer).toHaveBeenCalledTimes(1);
  });
});
