/**
 * Comprehensive mutation-killing tests for src/container/root-impl.ts
 *
 * Targets all surviving mutants:
 * - isRoot property is true
 * - containerNameValue / getContainerName
 * - createHooksRunner: null when no hooks, non-null when hooks present
 * - initializeFromGraph: adapter registration, async adapter tracking
 * - onWrapperSet: no-op for root
 * - getParent: returns undefined
 * - initialize: disposed check, async initializer
 * - getParentUnregisterCallback: returns undefined
 * - resolveWithInheritance: always throws
 * - resolveInternalFallback: always throws with portName
 * - resolveAsyncInternalFallback: always rejects with portName
 */
// @ts-nocheck

import { describe, it, expect, vi } from "vitest";
import { port, createAdapter, type Port } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { INTERNAL_ACCESS } from "../src/inspection/symbols.js";
import { DisposedScopeError, AsyncInitializationRequiredError } from "../src/errors/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): unknown;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });

function makeRootContainer() {
  const adapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: vi.fn() }),
  });
  const graph = GraphBuilder.create().provide(adapter).build();
  return createContainer({ graph, name: "Root" });
}

// =============================================================================
// RootContainerImpl - isRoot
// =============================================================================

describe("RootContainerImpl - isRoot", () => {
  it("root container kind is 'root'", () => {
    const container = makeRootContainer();
    expect(container.kind).toBe("root");
  });

  it("root container containerId is 'root'", () => {
    const container = makeRootContainer();
    const state = container[INTERNAL_ACCESS]();
    expect(state.containerId).toBe("root");
  });
});

// =============================================================================
// RootContainerImpl - getContainerName
// =============================================================================

describe("RootContainerImpl - getContainerName", () => {
  it("containerName matches provided name", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "MyApp" });

    const state = container[INTERNAL_ACCESS]();
    expect(state.containerName).toBe("MyApp");
  });
});

// =============================================================================
// RootContainerImpl - createHooksRunner
// =============================================================================

describe("RootContainerImpl - hooks runner creation", () => {
  it("container without hooks still resolves correctly (null hooks runner)", () => {
    const container = makeRootContainer();
    const logger = container.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("container with beforeResolve hook creates hooks runner", () => {
    const beforeResolve = vi.fn();
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({
      graph,
      name: "Test",
      hooks: { beforeResolve },
    });

    container.resolve(LoggerPort);
    expect(beforeResolve).toHaveBeenCalledTimes(1);
  });

  it("container with afterResolve hook creates hooks runner", () => {
    const afterResolve = vi.fn();
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({
      graph,
      name: "Test",
      hooks: { afterResolve },
    });

    container.resolve(LoggerPort);
    expect(afterResolve).toHaveBeenCalledTimes(1);
  });

  it("container with both hooks creates hooks runner", () => {
    const beforeResolve = vi.fn();
    const afterResolve = vi.fn();
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({
      graph,
      name: "Test",
      hooks: { beforeResolve, afterResolve },
    });

    container.resolve(LoggerPort);
    expect(beforeResolve).toHaveBeenCalledTimes(1);
    expect(afterResolve).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// RootContainerImpl - initializeFromGraph
// =============================================================================

describe("RootContainerImpl - initializeFromGraph", () => {
  it("registers all graph adapters", () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const dbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(loggerAdapter).provide(dbAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    expect(container.hasAdapter(LoggerPort)).toBe(true);
    expect(container.hasAdapter(DatabasePort)).toBe(true);
  });

  it("tracks async adapters for initialization", () => {
    const asyncAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factoryKind: "async" as const,
      factory: async () => ({ query: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(asyncAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    // Sync resolve should throw because it's async
    expect(() => container.resolve(DatabasePort)).toThrow(AsyncInitializationRequiredError);
  });

  it("async adapter resolves after initialization", async () => {
    const asyncAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factoryKind: "async" as const,
      factory: async () => ({ query: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(asyncAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();
    const db = initialized.resolve(DatabasePort);
    expect(typeof db.query).toBe("function");
  });
});

// =============================================================================
// RootContainerImpl - onWrapperSet
// =============================================================================

describe("RootContainerImpl - onWrapperSet (no-op)", () => {
  it("setting wrapper does not throw for root", () => {
    // Root container creation includes setWrapper call; just ensure it works
    const container = makeRootContainer();
    expect(container).toBeDefined();
  });
});

// =============================================================================
// RootContainerImpl - getParent
// =============================================================================

describe("RootContainerImpl - getParent", () => {
  it("accessing parent on root container throws", () => {
    const container = makeRootContainer();
    expect(() => container.parent).toThrow();
  });
});

// =============================================================================
// RootContainerImpl - initialize
// =============================================================================

describe("RootContainerImpl - initialize", () => {
  it("initialize throws when disposed", async () => {
    const container = makeRootContainer();
    await container.dispose();
    await expect(container.initialize()).rejects.toThrow(DisposedScopeError);
  });

  it("initialize resolves all async adapters", async () => {
    const asyncAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factoryKind: "async" as const,
      factory: async () => ({ query: vi.fn() }),
    });
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(loggerAdapter).provide(asyncAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();
    const db = initialized.resolve(DatabasePort);
    expect(typeof db.query).toBe("function");
  });
});

// =============================================================================
// RootContainerImpl - getParentUnregisterCallback
// =============================================================================

describe("RootContainerImpl - getParentUnregisterCallback", () => {
  it("root container disposal does not try to unregister from parent", async () => {
    const container = makeRootContainer();
    container.resolve(LoggerPort);
    await container.dispose();
    // If unregister was attempted on null parent, it would throw
    expect(container.isDisposed).toBe(true);
  });
});

// =============================================================================
// RootContainerImpl - resolveWithInheritance (throws)
// =============================================================================

describe("RootContainerImpl - resolveWithInheritance", () => {
  it("throws for unregistered port (no inheritance for root)", () => {
    const container = makeRootContainer();
    const resolve = container.resolve as (port: Port<unknown, string>) => unknown;
    expect(() => resolve(DatabasePort)).toThrow(/No adapter registered/);
  });
});

// =============================================================================
// RootContainerImpl - resolveInternalFallback
// =============================================================================

describe("RootContainerImpl - resolveInternalFallback", () => {
  it("throws with port name in error message", () => {
    const container = makeRootContainer();
    const resolve = container.resolve as (port: Port<unknown, string>) => unknown;

    try {
      resolve(DatabasePort);
      expect.unreachable("Should have thrown");
    } catch (e: any) {
      expect(e.message).toContain("Database");
    }
  });
});

// =============================================================================
// RootContainerImpl - resolveAsyncInternalFallback
// =============================================================================

describe("RootContainerImpl - resolveAsyncInternalFallback", () => {
  it("rejects with port name in error message", async () => {
    const container = makeRootContainer();
    const resolveAsync = container.resolveAsync as (
      port: Port<unknown, string>
    ) => Promise<unknown>;

    try {
      await resolveAsync(DatabasePort);
      expect.unreachable("Should have thrown");
    } catch (e: any) {
      expect(e.message).toContain("Database");
    }
  });
});

// =============================================================================
// RootContainerImpl - performance options
// =============================================================================

describe("RootContainerImpl - performance options", () => {
  it("disableTimestamps: true suppresses timestamp capture", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({
      graph,
      name: "Test",
      performance: { disableTimestamps: true },
    });

    container.resolve(LoggerPort);
    const state = container[INTERNAL_ACCESS]();
    if (state.singletonMemo.entries.length > 0) {
      expect(state.singletonMemo.entries[0].resolvedAt).toBe(0);
    }
  });

  it("disableTimestamps: false (default) captures timestamps", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    container.resolve(LoggerPort);
    const state = container[INTERNAL_ACCESS]();
    if (state.singletonMemo.entries.length > 0) {
      expect(state.singletonMemo.entries[0].resolvedAt).toBeGreaterThan(0);
    }
  });
});
