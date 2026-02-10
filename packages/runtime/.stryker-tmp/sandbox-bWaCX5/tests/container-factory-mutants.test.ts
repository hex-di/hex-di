/**
 * Comprehensive mutation-killing tests for src/container/factory.ts
 *
 * Targets all surviving mutants in the factory module:
 * - createLateBindingHooks: beforeResolve/afterResolve iteration order
 * - createContainer: config propagation, hooks holder setup
 * - createUninitializedContainerWrapper: all property values and methods
 * - createInitializedContainerWrapper: all property values and methods
 * - Root container parent accessor throws
 * - ContainerBrand accessor throws
 * - Hook installation via HOOKS_ACCESS
 * - Auto-discovery hook for library inspectors
 * - createChildFromGraph delegation
 * - createChildContainerAsync delegation
 * - createLazyChildContainer delegation
 * - createRootScope delegation
 * - tryInitialize caching
 */
// @ts-nocheck

import { describe, it, expect, vi } from "vitest";
import { port, createAdapter, type Port } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { ADAPTER_ACCESS, INTERNAL_ACCESS, HOOKS_ACCESS } from "../src/inspection/symbols.js";
import { ContainerBrand } from "../src/types.js";
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
const CachePort = port<Cache>()({ name: "Cache" });

function makeLoggerAdapter(lifetime: "singleton" | "transient" | "scoped" = "singleton") {
  return createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime,
    factory: () => ({ log: vi.fn() }),
  });
}

function makeDbAdapter() {
  return createAdapter({
    provides: DatabasePort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ query: vi.fn() }),
  });
}

function makeAsyncDbAdapter() {
  return createAdapter({
    provides: DatabasePort,
    requires: [],
    lifetime: "singleton",
    factoryKind: "async" as const,
    factory: async () => ({ query: vi.fn() }),
  });
}

// =============================================================================
// createContainer - basic property assertions
// =============================================================================

describe("createContainer property assertions", () => {
  it("container.name matches provided name", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });
    expect(container.name).toBe("TestApp");
  });

  it("container.parentName is null for root", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });
    expect(container.parentName).toBeNull();
  });

  it("container.kind is 'root'", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });
    expect(container.kind).toBe("root");
  });

  it("container is frozen", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });
    expect(Object.isFrozen(container)).toBe(true);
  });

  it("container.isInitialized is false for uninitialized root", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });
    expect(container.isInitialized).toBe(false);
  });

  it("container.isDisposed is false initially", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });
    expect(container.isDisposed).toBe(false);
  });

  it("container.isDisposed is true after dispose", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });
    await container.dispose();
    expect(container.isDisposed).toBe(true);
  });
});

// =============================================================================
// createContainer - parent throws
// =============================================================================

describe("root container parent accessor", () => {
  it("accessing parent on uninitialized root throws", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });
    expect(() => container.parent).toThrow();
  });

  it("parent accessor is non-enumerable", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });
    const descriptor = Object.getOwnPropertyDescriptor(container, "parent");
    expect(descriptor?.enumerable).toBe(false);
  });
});

// =============================================================================
// createContainer - resolve methods
// =============================================================================

describe("root container resolution", () => {
  it("resolve returns correct instance", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });

    const logger = container.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("resolveAsync returns correct instance", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });

    const logger = await container.resolveAsync(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("resolve throws for unregistered port", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });

    const resolve = container.resolve as (port: Port<unknown, string>) => unknown;
    expect(() => resolve(DatabasePort)).toThrow();
  });

  it("resolve throws DisposedScopeError after disposal", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });
    await container.dispose();

    expect(() => container.resolve(LoggerPort)).toThrow(DisposedScopeError);
  });

  it("resolve throws ScopeRequiredError for scoped port", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter("scoped")).build();
    const container = createContainer({ graph, name: "TestApp" });

    expect(() => container.resolve(LoggerPort)).toThrow(ScopeRequiredError);
  });
});

// =============================================================================
// createContainer - tryResolve, tryResolveAsync, tryDispose
// =============================================================================

describe("root container try methods", () => {
  it("tryResolve returns Ok on success", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });

    const result = container.tryResolve(LoggerPort);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(typeof result.value.log).toBe("function");
    }
  });

  it("tryResolve returns Err on failure", () => {
    const failAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => {
        throw new Error("fail");
      },
    });
    const graph = GraphBuilder.create().provide(failAdapter).build();
    const container = createContainer({ graph, name: "TestApp" });

    const result = container.tryResolve(LoggerPort);
    expect(result.isErr()).toBe(true);
  });

  it("tryResolveAsync returns Ok on success", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });

    const result = await container.tryResolveAsync(LoggerPort);
    expect(result.isOk()).toBe(true);
  });

  it("tryDispose returns Ok on success", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });

    const result = await container.tryDispose();
    expect(result.isOk()).toBe(true);
    expect(container.isDisposed).toBe(true);
  });
});

// =============================================================================
// createContainer - has / hasAdapter
// =============================================================================

describe("root container has/hasAdapter", () => {
  it("has returns true for registered singleton port", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });
    expect(container.has(LoggerPort)).toBe(true);
  });

  it("has returns false for unregistered port", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });
    expect(container.has(DatabasePort)).toBe(false);
  });

  it("has returns false for scoped port (from root)", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter("scoped")).build();
    const container = createContainer({ graph, name: "TestApp" });
    // has returns false for scoped ports when called from root container
    expect(container.has(LoggerPort)).toBe(false);
  });

  it("hasAdapter returns true for registered port", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });
    expect(container.hasAdapter(LoggerPort)).toBe(true);
  });

  it("hasAdapter returns false for unregistered port", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });
    expect(container.hasAdapter(DatabasePort)).toBe(false);
  });
});

// =============================================================================
// createContainer - hooks
// =============================================================================

describe("root container hooks - late-binding", () => {
  it("beforeResolve hooks fire in installation order", () => {
    const order: number[] = [];
    const graph = GraphBuilder.create().provide(makeLoggerAdapter("transient")).build();
    const container = createContainer({ graph, name: "Test" });

    container.addHook("beforeResolve", () => order.push(1));
    container.addHook("beforeResolve", () => order.push(2));
    container.resolve(LoggerPort);

    expect(order).toEqual([1, 2]);
  });

  it("afterResolve hooks fire in reverse order (middleware pattern)", () => {
    const order: number[] = [];
    const graph = GraphBuilder.create().provide(makeLoggerAdapter("transient")).build();
    const container = createContainer({ graph, name: "Test" });

    container.addHook("afterResolve", () => order.push(1));
    container.addHook("afterResolve", () => order.push(2));
    container.resolve(LoggerPort);

    expect(order).toEqual([2, 1]);
  });

  it("user-provided hooks are active from creation", () => {
    const beforeFn = vi.fn();
    const afterFn = vi.fn();
    const graph = GraphBuilder.create().provide(makeLoggerAdapter("transient")).build();
    const container = createContainer({
      graph,
      name: "Test",
      hooks: { beforeResolve: beforeFn, afterResolve: afterFn },
    });

    container.resolve(LoggerPort);
    expect(beforeFn).toHaveBeenCalledTimes(1);
    expect(afterFn).toHaveBeenCalledTimes(1);
  });

  it("user-provided hooks compose with dynamically added hooks", () => {
    const userBefore = vi.fn();
    const dynamicBefore = vi.fn();
    const graph = GraphBuilder.create().provide(makeLoggerAdapter("transient")).build();
    const container = createContainer({
      graph,
      name: "Test",
      hooks: { beforeResolve: userBefore },
    });

    container.addHook("beforeResolve", dynamicBefore);
    container.resolve(LoggerPort);

    expect(dynamicBefore).toHaveBeenCalledTimes(1);
    expect(userBefore).toHaveBeenCalledTimes(1);
  });

  it("addHook with beforeResolve creates correct hooks object", () => {
    const handler = vi.fn();
    const graph = GraphBuilder.create().provide(makeLoggerAdapter("transient")).build();
    const container = createContainer({ graph, name: "Test" });

    container.addHook("beforeResolve", handler);
    container.resolve(LoggerPort);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("addHook with afterResolve creates correct hooks object", () => {
    const handler = vi.fn();
    const graph = GraphBuilder.create().provide(makeLoggerAdapter("transient")).build();
    const container = createContainer({ graph, name: "Test" });

    container.addHook("afterResolve", handler);
    container.resolve(LoggerPort);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("removeHook removes a beforeResolve hook", () => {
    const handler = vi.fn();
    const graph = GraphBuilder.create().provide(makeLoggerAdapter("transient")).build();
    const container = createContainer({ graph, name: "Test" });

    container.addHook("beforeResolve", handler);
    container.removeHook("beforeResolve", handler);
    container.resolve(LoggerPort);

    expect(handler).not.toHaveBeenCalled();
  });

  it("removeHook removes an afterResolve hook", () => {
    const handler = vi.fn();
    const graph = GraphBuilder.create().provide(makeLoggerAdapter("transient")).build();
    const container = createContainer({ graph, name: "Test" });

    container.addHook("afterResolve", handler);
    container.removeHook("afterResolve", handler);
    container.resolve(LoggerPort);

    expect(handler).not.toHaveBeenCalled();
  });

  it("removeHook is no-op for unregistered handler", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter("transient")).build();
    const container = createContainer({ graph, name: "Test" });

    const unregistered = vi.fn();
    container.removeHook("beforeResolve", unregistered); // should not throw
  });

  it("removeHook deletes from handlerToUninstall (no double-uninstall)", () => {
    const handler = vi.fn();
    const graph = GraphBuilder.create().provide(makeLoggerAdapter("transient")).build();
    const container = createContainer({ graph, name: "Test" });

    container.addHook("beforeResolve", handler);
    container.removeHook("beforeResolve", handler);
    // Second removal is no-op
    container.removeHook("beforeResolve", handler);
    container.resolve(LoggerPort);

    expect(handler).not.toHaveBeenCalled();
  });
});

// =============================================================================
// createContainer - HOOKS_ACCESS
// =============================================================================

describe("root container HOOKS_ACCESS", () => {
  it("root container has HOOKS_ACCESS", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });

    const getter = (container as any)[HOOKS_ACCESS];
    expect(typeof getter).toBe("function");
  });

  it("HOOKS_ACCESS is non-enumerable, non-writable, non-configurable", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });

    const descriptor = Object.getOwnPropertyDescriptor(container, HOOKS_ACCESS);
    expect(descriptor?.enumerable).toBe(false);
    expect(descriptor?.writable).toBe(false);
    expect(descriptor?.configurable).toBe(false);
  });

  it("installHooks adds hooks that fire on resolve", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter("transient")).build();
    const container = createContainer({ graph, name: "Test" });

    const installer = (container as any)[HOOKS_ACCESS]();
    const before = vi.fn();
    installer.installHooks({ beforeResolve: before });

    container.resolve(LoggerPort);
    expect(before).toHaveBeenCalledTimes(1);
  });

  it("installHooks uninstall function removes hooks", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter("transient")).build();
    const container = createContainer({ graph, name: "Test" });

    const installer = (container as any)[HOOKS_ACCESS]();
    const before = vi.fn();
    const uninstall = installer.installHooks({ beforeResolve: before });

    container.resolve(LoggerPort);
    expect(before).toHaveBeenCalledTimes(1);

    uninstall();
    container.resolve(LoggerPort);
    expect(before).toHaveBeenCalledTimes(1);
  });

  it("uninstall handles hook not found in array gracefully", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter("transient")).build();
    const container = createContainer({ graph, name: "Test" });

    const installer = (container as any)[HOOKS_ACCESS]();
    const uninstall = installer.installHooks({ beforeResolve: vi.fn() });

    // Uninstall once
    uninstall();
    // Second uninstall should be no-op (hook already removed)
    uninstall();
  });
});

// =============================================================================
// createContainer - INTERNAL_ACCESS and ADAPTER_ACCESS
// =============================================================================

describe("root container internal access symbols", () => {
  it("INTERNAL_ACCESS returns correct state", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });

    const state = container[INTERNAL_ACCESS]();
    expect(state.disposed).toBe(false);
    expect(state.containerName).toBe("TestApp");
    expect(state.containerId).toBe("root");
  });

  it("ADAPTER_ACCESS returns adapter for registered port", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });

    const adapter = (container as any)[ADAPTER_ACCESS](LoggerPort);
    expect(adapter).toBeDefined();
    expect(adapter.provides).toBe(LoggerPort);
  });

  it("ADAPTER_ACCESS returns undefined for unregistered port", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });

    const adapter = (container as any)[ADAPTER_ACCESS](DatabasePort);
    expect(adapter).toBeUndefined();
  });

  it("registerChildContainer delegates to impl", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });

    // Creating a child exercises registerChildContainer
    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });
    expect(child).toBeDefined();
  });

  it("unregisterChildContainer delegates to impl on child dispose", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "TestApp" });

    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });

    await child.dispose();
    expect(child.isDisposed).toBe(true);
    // Parent should still be alive
    expect(container.isDisposed).toBe(false);
  });
});

// =============================================================================
// createContainer - initialize and tryInitialize
// =============================================================================

describe("root container initialize", () => {
  it("initialize returns initialized container", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();
    expect(initialized).toBeDefined();
    expect(initialized.name).toBe("Test");
  });

  it("initialized container has kind 'root'", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();
    expect(initialized.kind).toBe("root");
  });

  it("initialized container has parentName null", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();
    expect(initialized.parentName).toBeNull();
  });

  it("initialized container is frozen", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();
    expect(Object.isFrozen(initialized)).toBe(true);
  });

  it("multiple initialize calls return the same container", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });

    const init1 = await container.initialize();
    const init2 = await container.initialize();
    expect(init1).toBe(init2);
  });

  it("initialized container.initialize getter throws", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();
    expect(() => (initialized as any).initialize).toThrow();
  });

  it("initialized container.tryInitialize getter throws", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();
    expect(() => (initialized as any).tryInitialize).toThrow();
  });

  it("initialized container parent accessor throws", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();
    expect(() => initialized.parent).toThrow();
  });

  it("initialized container parent accessor is non-enumerable", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });

    const initialized = await container.initialize();
    const descriptor = Object.getOwnPropertyDescriptor(initialized, "parent");
    expect(descriptor?.enumerable).toBe(false);
  });

  it("initialize rejects when disposed", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });

    await container.dispose();
    await expect(container.initialize()).rejects.toThrow();
  });
});

// =============================================================================
// tryInitialize
// =============================================================================

describe("tryInitialize", () => {
  it("returns Ok on success", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });

    const result = await container.tryInitialize();
    expect(result.isOk()).toBe(true);
  });

  it("multiple tryInitialize calls return the same container", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });

    const result1 = await container.tryInitialize();
    const result2 = await container.tryInitialize();

    if (result1.isOk() && result2.isOk()) {
      expect(result1.value).toBe(result2.value);
    }
  });

  it("returns Err when disposed", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });

    await container.dispose();
    const result = await container.tryInitialize();
    expect(result.isErr()).toBe(true);
  });
});

// =============================================================================
// Initialized container - all methods
// =============================================================================

describe("initialized container methods", () => {
  it("resolve returns correct instance", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const logger = initialized.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("resolveAsync returns correct instance", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const logger = await initialized.resolveAsync(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("tryResolve returns Ok", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const result = initialized.tryResolve(LoggerPort);
    expect(result.isOk()).toBe(true);
  });

  it("tryResolveAsync returns Ok", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const result = await initialized.tryResolveAsync(LoggerPort);
    expect(result.isOk()).toBe(true);
  });

  it("tryDispose returns Ok", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const result = await initialized.tryDispose();
    expect(result.isOk()).toBe(true);
  });

  it("has returns true for registered port", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    expect(initialized.has(LoggerPort)).toBe(true);
    expect(initialized.has(DatabasePort)).toBe(false);
  });

  it("hasAdapter returns true for registered port", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    expect(initialized.hasAdapter(LoggerPort)).toBe(true);
    expect(initialized.hasAdapter(DatabasePort)).toBe(false);
  });

  it("dispose works", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    await initialized.dispose();
    expect(initialized.isDisposed).toBe(true);
  });

  it("isInitialized is true", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    expect(initialized.isInitialized).toBe(true);
  });

  it("isDisposed is false initially", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    expect(initialized.isDisposed).toBe(false);
  });

  it("createScope works", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter("scoped")).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const scope = initialized.createScope("test-scope");
    expect(scope).toBeDefined();
    const logger = scope.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("createChild works", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const childGraph = GraphBuilder.create().build();
    const child = initialized.createChild(childGraph, { name: "Child" });
    expect(child.name).toBe("Child");
    expect(child.resolve(LoggerPort)).toBeDefined();
  });

  it("createChildAsync works", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const dbAdapter = makeDbAdapter();
    const childGraph = GraphBuilder.create().provide(dbAdapter).build();

    const child = await initialized.createChildAsync(async () => childGraph, {
      name: "AsyncChild",
    });
    expect(child.name).toBe("AsyncChild");
  });

  it("createLazyChild works", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const dbAdapter = makeDbAdapter();
    const childGraph = GraphBuilder.create().provide(dbAdapter).build();

    const lazy = initialized.createLazyChild(async () => childGraph, { name: "LazyChild" });
    expect(lazy.isLoaded).toBe(false);
  });

  it("override returns OverrideBuilder", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const mockAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const builder = initialized.override(mockAdapter);
    expect(typeof builder.build).toBe("function");
  });

  it("addHook/removeHook work on initialized container", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter("transient")).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const before = vi.fn();
    initialized.addHook("beforeResolve", before);
    initialized.resolve(LoggerPort);
    expect(before).toHaveBeenCalledTimes(1);

    initialized.removeHook("beforeResolve", before);
    initialized.resolve(LoggerPort);
    expect(before).toHaveBeenCalledTimes(1);
  });

  it("INTERNAL_ACCESS works on initialized container", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const state = (initialized as any)[INTERNAL_ACCESS]();
    expect(state.containerName).toBe("Test");
    expect(state.disposed).toBe(false);
  });

  it("ADAPTER_ACCESS works on initialized container", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const adapter = (initialized as any)[ADAPTER_ACCESS](LoggerPort);
    expect(adapter).toBeDefined();
  });
});

// =============================================================================
// createContainer - scope creation
// =============================================================================

describe("root container scope creation", () => {
  it("createScope creates functional scope", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter("scoped")).build();
    const container = createContainer({ graph, name: "Test" });

    const scope = container.createScope("my-scope");
    expect(scope).toBeDefined();
    const logger = scope.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("createScope without name works", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter("scoped")).build();
    const container = createContainer({ graph, name: "Test" });

    const scope = container.createScope();
    expect(scope).toBeDefined();
  });
});

// =============================================================================
// createContainer - child container creation
// =============================================================================

describe("root container createChild", () => {
  it("createChild creates child with correct parentName", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Root" });

    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });

    expect(child.parentName).toBe("Root");
  });

  it("createChild child can resolve parent ports", () => {
    const graph = GraphBuilder.create()
      .provide(makeLoggerAdapter())
      .provide(makeDbAdapter())
      .build();
    const container = createContainer({ graph, name: "Root" });

    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });

    const logger = child.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("createChild with extensions", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Root" });

    const cacheAdapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: vi.fn() }),
    });
    const childGraph = GraphBuilder.create().provide(cacheAdapter).build();
    const child = container.createChild(childGraph, { name: "Child" });

    expect(child.has(CachePort)).toBe(true);
    const cache = child.resolve(CachePort);
    expect(typeof cache.get).toBe("function");
  });

  it("createChild with overrides", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Root" });

    const mockLog = vi.fn();
    const overrideAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: mockLog }),
    });
    const childGraph = GraphBuilder.create().override(overrideAdapter).build();
    const child = container.createChild(childGraph, { name: "Child" });

    child.resolve(LoggerPort).log("test");
    expect(mockLog).toHaveBeenCalledWith("test");
  });
});

// =============================================================================
// createContainer - async and lazy child creation
// =============================================================================

describe("root container createChildAsync", () => {
  it("createChildAsync loads graph and creates child", async () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Root" });

    const dbAdapter = makeDbAdapter();
    const childGraph = GraphBuilder.create().provide(dbAdapter).build();

    const child = await container.createChildAsync(async () => childGraph, { name: "AsyncChild" });

    expect(child.name).toBe("AsyncChild");
    const db = child.resolve(DatabasePort);
    expect(typeof db.query).toBe("function");
  });
});

describe("root container createLazyChild", () => {
  it("createLazyChild creates lazy container", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Root" });

    const dbAdapter = makeDbAdapter();
    const childGraph = GraphBuilder.create().provide(dbAdapter).build();

    const lazy = container.createLazyChild(async () => childGraph, { name: "LazyChild" });

    expect(lazy.isLoaded).toBe(false);
  });

  it("lazy child has method delegates to parent before load", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Root" });

    const dbAdapter = makeDbAdapter();
    const childGraph = GraphBuilder.create().provide(dbAdapter).build();

    const lazy = container.createLazyChild(async () => childGraph, { name: "LazyChild" });

    expect(lazy.has(LoggerPort)).toBe(true);
    expect(lazy.has(DatabasePort)).toBe(false);
  });
});

// =============================================================================
// Performance options
// =============================================================================

describe("performance options", () => {
  it("disableTimestamps: true disables timestamp capture", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({
      graph,
      name: "Test",
      performance: { disableTimestamps: true },
    });

    container.resolve(LoggerPort);
    const state = container[INTERNAL_ACCESS]();
    const entries = state.singletonMemo.entries;
    if (entries.length > 0) {
      expect(entries[0].resolvedAt).toBe(0);
    }
  });

  it("without disableTimestamps, timestamps are captured", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });

    container.resolve(LoggerPort);
    const state = container[INTERNAL_ACCESS]();
    const entries = state.singletonMemo.entries;
    if (entries.length > 0) {
      expect(entries[0].resolvedAt).toBeGreaterThan(0);
    }
  });

  it("child container inherits performance options", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({
      graph,
      name: "Root",
      performance: { disableTimestamps: true },
    });

    const overrideAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const childGraph = GraphBuilder.create().override(overrideAdapter).build();
    const child = container.createChild(childGraph, {
      name: "Child",
      performance: { disableTimestamps: true },
    });

    child.resolve(LoggerPort);
    const state = child[INTERNAL_ACCESS]();
    const entries = state.singletonMemo.entries;
    if (entries.length > 0) {
      expect(entries[0].resolvedAt).toBe(0);
    }
  });
});

// =============================================================================
// Override method
// =============================================================================

describe("root container override", () => {
  it("override returns OverrideBuilder with override and build", () => {
    const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Test" });

    const mockAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const builder = container.override(mockAdapter);
    expect(typeof builder.override).toBe("function");
    expect(typeof builder.build).toBe("function");
  });

  it("override().build() creates child with correct override", () => {
    const originalLog = vi.fn();
    const mockLog = vi.fn();
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: originalLog }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });

    const overridden = container
      .override(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: mockLog }),
        })
      )
      .build();

    overridden.resolve(LoggerPort).log("test");
    expect(mockLog).toHaveBeenCalledWith("test");
    expect(originalLog).not.toHaveBeenCalled();
  });
});
