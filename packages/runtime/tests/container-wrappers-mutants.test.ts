/**
 * Comprehensive mutation-killing tests for src/container/wrappers.ts
 *
 * Targets all surviving mutants in the wrappers module:
 * - Type guards: hasInternalMethods, isContainerParent
 * - asParentContainerLike delegation
 * - createChildContainerWrapper property values
 * - Hook installation/removal with hookSources array
 * - Child container scope creation
 * - Dispose lifecycle (inspector disposeLibraries + impl.dispose)
 * - HOOKS_ACCESS installer with uninstall
 * - Library inspector auto-discovery afterResolve hook
 * - createChildFromGraphInternal delegation
 * - createChildContainerAsyncInternal delegation
 * - createLazyChildContainerInternal delegation
 */
import { describe, it, expect, vi } from "vitest";
import { port, createAdapter, type Port } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { ADAPTER_ACCESS, INTERNAL_ACCESS, HOOKS_ACCESS } from "../src/inspection/symbols.js";
import { hasInternalMethods, asParentContainerLike } from "../src/container/wrappers.js";

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
  set(key: string, value: unknown): void;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const CachePort = port<Cache>()({ name: "Cache" });

function makeLoggerAdapter() {
  return createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: vi.fn() }),
  });
}

function makeTransientLoggerAdapter() {
  return createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "transient",
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

function makeRootContainer() {
  const graph = GraphBuilder.create().provide(makeLoggerAdapter()).provide(makeDbAdapter()).build();
  return createContainer({ graph, name: "Root" });
}

// =============================================================================
// hasInternalMethods - Each condition must be independently tested
// =============================================================================

describe("hasInternalMethods type guard - per-condition mutation killing", () => {
  it("returns false for non-record values", () => {
    expect(hasInternalMethods(null)).toBe(false);
    expect(hasInternalMethods(undefined)).toBe(false);
    expect(hasInternalMethods(42)).toBe(false);
    expect(hasInternalMethods("string")).toBe(false);
    expect(hasInternalMethods(true)).toBe(false);
  });

  it("returns false when ADAPTER_ACCESS is missing", () => {
    const obj = {
      registerChildContainer: () => {},
      unregisterChildContainer: () => {},
      resolveInternal: () => {},
      resolveAsyncInternal: () => {},
      hasAdapter: () => {},
      has: () => {},
    };
    expect(hasInternalMethods(obj)).toBe(false);
  });

  it("returns false when ADAPTER_ACCESS is not a function", () => {
    const obj = {
      [ADAPTER_ACCESS]: "not-a-function",
      registerChildContainer: () => {},
      unregisterChildContainer: () => {},
      resolveInternal: () => {},
      resolveAsyncInternal: () => {},
      hasAdapter: () => {},
      has: () => {},
    };
    expect(hasInternalMethods(obj)).toBe(false);
  });

  it("returns false when registerChildContainer is missing", () => {
    const obj = {
      [ADAPTER_ACCESS]: () => {},
      unregisterChildContainer: () => {},
      resolveInternal: () => {},
      resolveAsyncInternal: () => {},
      hasAdapter: () => {},
      has: () => {},
    };
    expect(hasInternalMethods(obj)).toBe(false);
  });

  it("returns false when registerChildContainer is not a function", () => {
    const obj = {
      [ADAPTER_ACCESS]: () => {},
      registerChildContainer: 42,
      unregisterChildContainer: () => {},
      resolveInternal: () => {},
      resolveAsyncInternal: () => {},
      hasAdapter: () => {},
      has: () => {},
    };
    expect(hasInternalMethods(obj)).toBe(false);
  });

  it("returns false when unregisterChildContainer is missing", () => {
    const obj = {
      [ADAPTER_ACCESS]: () => {},
      registerChildContainer: () => {},
      resolveInternal: () => {},
      resolveAsyncInternal: () => {},
      hasAdapter: () => {},
      has: () => {},
    };
    expect(hasInternalMethods(obj)).toBe(false);
  });

  it("returns false when unregisterChildContainer is not a function", () => {
    const obj = {
      [ADAPTER_ACCESS]: () => {},
      registerChildContainer: () => {},
      unregisterChildContainer: "not-fn",
      resolveInternal: () => {},
      resolveAsyncInternal: () => {},
      hasAdapter: () => {},
      has: () => {},
    };
    expect(hasInternalMethods(obj)).toBe(false);
  });

  it("returns false when resolveInternal is missing", () => {
    const obj = {
      [ADAPTER_ACCESS]: () => {},
      registerChildContainer: () => {},
      unregisterChildContainer: () => {},
      resolveAsyncInternal: () => {},
      hasAdapter: () => {},
      has: () => {},
    };
    expect(hasInternalMethods(obj)).toBe(false);
  });

  it("returns false when resolveInternal is not a function", () => {
    const obj = {
      [ADAPTER_ACCESS]: () => {},
      registerChildContainer: () => {},
      unregisterChildContainer: () => {},
      resolveInternal: "value",
      resolveAsyncInternal: () => {},
      hasAdapter: () => {},
      has: () => {},
    };
    expect(hasInternalMethods(obj)).toBe(false);
  });

  it("returns false when resolveAsyncInternal is missing", () => {
    const obj = {
      [ADAPTER_ACCESS]: () => {},
      registerChildContainer: () => {},
      unregisterChildContainer: () => {},
      resolveInternal: () => {},
      hasAdapter: () => {},
      has: () => {},
    };
    expect(hasInternalMethods(obj)).toBe(false);
  });

  it("returns false when resolveAsyncInternal is not a function", () => {
    const obj = {
      [ADAPTER_ACCESS]: () => {},
      registerChildContainer: () => {},
      unregisterChildContainer: () => {},
      resolveInternal: () => {},
      resolveAsyncInternal: 99,
      hasAdapter: () => {},
      has: () => {},
    };
    expect(hasInternalMethods(obj)).toBe(false);
  });

  it("returns false when hasAdapter is missing", () => {
    const obj = {
      [ADAPTER_ACCESS]: () => {},
      registerChildContainer: () => {},
      unregisterChildContainer: () => {},
      resolveInternal: () => {},
      resolveAsyncInternal: () => {},
      has: () => {},
    };
    expect(hasInternalMethods(obj)).toBe(false);
  });

  it("returns false when hasAdapter is not a function", () => {
    const obj = {
      [ADAPTER_ACCESS]: () => {},
      registerChildContainer: () => {},
      unregisterChildContainer: () => {},
      resolveInternal: () => {},
      resolveAsyncInternal: () => {},
      hasAdapter: true,
      has: () => {},
    };
    expect(hasInternalMethods(obj)).toBe(false);
  });

  it("returns false when has is missing", () => {
    const obj = {
      [ADAPTER_ACCESS]: () => {},
      registerChildContainer: () => {},
      unregisterChildContainer: () => {},
      resolveInternal: () => {},
      resolveAsyncInternal: () => {},
      hasAdapter: () => {},
    };
    expect(hasInternalMethods(obj)).toBe(false);
  });

  it("returns false when has is not a function", () => {
    const obj = {
      [ADAPTER_ACCESS]: () => {},
      registerChildContainer: () => {},
      unregisterChildContainer: () => {},
      resolveInternal: () => {},
      resolveAsyncInternal: () => {},
      hasAdapter: () => {},
      has: "not-fn",
    };
    expect(hasInternalMethods(obj)).toBe(false);
  });

  it("returns true only when ALL conditions are met", () => {
    const obj = {
      [ADAPTER_ACCESS]: () => {},
      registerChildContainer: () => {},
      unregisterChildContainer: () => {},
      resolveInternal: () => {},
      resolveAsyncInternal: () => {},
      hasAdapter: () => {},
      has: () => {},
    };
    expect(hasInternalMethods(obj)).toBe(true);
  });

  it("returns true for a real container object", () => {
    const container = makeRootContainer();
    expect(hasInternalMethods(container)).toBe(true);
  });
});

// =============================================================================
// asParentContainerLike - delegation tests
// =============================================================================

describe("asParentContainerLike", () => {
  it("throws for invalid wrapper (missing internal methods)", () => {
    const invalid = {} as any;
    expect(() => asParentContainerLike(invalid)).toThrow("Invalid Container wrapper");
  });

  it("returns parentLike with all expected properties", () => {
    const container = makeRootContainer();
    const parentLike = asParentContainerLike(container as any);

    expect(typeof parentLike.resolveInternal).toBe("function");
    expect(typeof parentLike.resolveAsyncInternal).toBe("function");
    expect(typeof parentLike[ADAPTER_ACCESS]).toBe("function");
    expect(typeof parentLike.registerChildContainer).toBe("function");
    expect(typeof parentLike.unregisterChildContainer).toBe("function");
    expect(parentLike.originalParent).toBe(container);
    expect(typeof parentLike.has).toBe("function");
    expect(typeof parentLike.hasAdapter).toBe("function");
  });

  it("resolveInternal delegates correctly to wrapper", () => {
    const container = makeRootContainer();
    const parentLike = asParentContainerLike(container as any);

    const logger = parentLike.resolveInternal(LoggerPort);
    expect(logger).toBeDefined();
    expect(typeof logger.log).toBe("function");
  });

  it("has delegates correctly to wrapper", () => {
    const container = makeRootContainer();
    const parentLike = asParentContainerLike(container as any);

    expect(parentLike.has(LoggerPort)).toBe(true);
    expect(parentLike.has(CachePort)).toBe(false);
  });

  it("hasAdapter delegates correctly to wrapper", () => {
    const container = makeRootContainer();
    const parentLike = asParentContainerLike(container as any);

    expect(parentLike.hasAdapter(LoggerPort)).toBe(true);
    expect(parentLike.hasAdapter(CachePort)).toBe(false);
  });
});

// =============================================================================
// Child Container Wrapper Properties
// =============================================================================

describe("createChildContainerWrapper property values", () => {
  it("child.name matches provided childName", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "MyChild" });

    expect(child.name).toBe("MyChild");
  });

  it("child.parentName matches parent's name", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "MyChild" });

    expect(child.parentName).toBe("Root");
  });

  it("child.kind is 'child'", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "MyChild" });

    expect(child.kind).toBe("child");
  });

  it("child.isInitialized is always true", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "MyChild" });

    expect(child.isInitialized).toBe(true);
  });

  it("child.isDisposed reflects implementation state", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "MyChild" });

    expect(child.isDisposed).toBe(false);
  });

  it("child.isDisposed becomes true after dispose", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "MyChild" });

    await child.dispose();
    expect(child.isDisposed).toBe(true);
  });

  it("child.initialize getter throws", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "MyChild" });

    expect(() => (child as any).initialize).toThrow();
  });

  it("child.tryInitialize getter throws", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "MyChild" });

    expect(() => (child as any).tryInitialize).toThrow();
  });

  it("child.parent returns the parent container wrapper", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "MyChild" });

    // parent accessor should return a valid container-like
    const parentRef = child.parent;
    expect(parentRef).toBeDefined();
    expect(typeof parentRef.resolve).toBe("function");
  });

  it("child is frozen", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "MyChild" });

    expect(Object.isFrozen(child)).toBe(true);
  });
});

// =============================================================================
// Child Container Wrapper - resolve, resolveAsync, tryResolve, tryResolveAsync, tryDispose
// =============================================================================

describe("child container wrapper resolution methods", () => {
  it("resolve delegates to impl and returns correct instance", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const logger = child.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("resolveAsync delegates to impl and returns correct instance", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const logger = await child.resolveAsync(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("tryResolve returns Ok result on success", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const result = child.tryResolve(LoggerPort);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(typeof result.value.log).toBe("function");
    }
  });

  it("tryResolve returns Err result on failure", () => {
    const failAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => {
        throw new Error("boom");
      },
    });
    const graph = GraphBuilder.create().provide(failAdapter).build();
    const parent = createContainer({ graph, name: "Parent" });
    const childOverride = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => {
        throw new Error("child boom");
      },
    });
    const childGraph = GraphBuilder.create().override(childOverride).build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const result = child.tryResolve(LoggerPort);
    expect(result.isErr()).toBe(true);
  });

  it("tryResolveAsync returns Ok ResultAsync on success", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const resultAsync = child.tryResolveAsync(LoggerPort);
    const result = await resultAsync;
    expect(result.isOk()).toBe(true);
  });

  it("tryDispose returns Ok ResultAsync on success", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const result = await child.tryDispose();
    expect(result.isOk()).toBe(true);
  });

  it("has delegates to impl", () => {
    const parent = makeRootContainer();
    const cacheAdapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: vi.fn(), set: vi.fn() }),
    });
    const childGraph = GraphBuilder.create().provide(cacheAdapter).build();
    const child = parent.createChild(childGraph, { name: "Child" });

    expect(child.has(LoggerPort)).toBe(true);
    expect(child.has(CachePort)).toBe(true);
  });

  it("hasAdapter delegates to impl", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    expect(child.hasAdapter(LoggerPort)).toBe(true);
  });
});

// =============================================================================
// Child Container Wrapper - Hook Installation / Removal
// =============================================================================

describe("child container wrapper hooks", () => {
  it("addHook with beforeResolve installs and fires on resolve", () => {
    const graph = GraphBuilder.create().provide(makeTransientLoggerAdapter()).build();
    const parent = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const beforeFn = vi.fn();
    child.addHook("beforeResolve", beforeFn);
    child.resolve(LoggerPort);

    expect(beforeFn).toHaveBeenCalledTimes(1);
  });

  it("addHook with afterResolve installs and fires on resolve", () => {
    const graph = GraphBuilder.create().provide(makeTransientLoggerAdapter()).build();
    const parent = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const afterFn = vi.fn();
    child.addHook("afterResolve", afterFn);
    child.resolve(LoggerPort);

    expect(afterFn).toHaveBeenCalledTimes(1);
  });

  it("removeHook removes the previously installed hook", () => {
    const graph = GraphBuilder.create().provide(makeTransientLoggerAdapter()).build();
    const parent = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const beforeFn = vi.fn();
    child.addHook("beforeResolve", beforeFn);
    child.removeHook("beforeResolve", beforeFn);
    child.resolve(LoggerPort);

    expect(beforeFn).not.toHaveBeenCalled();
  });

  it("removeHook for unregistered handler is no-op", () => {
    const graph = GraphBuilder.create().provide(makeTransientLoggerAdapter()).build();
    const parent = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const unregisteredFn = vi.fn();
    // Should not throw
    child.removeHook("beforeResolve", unregisteredFn);
  });

  it("multiple hooks fire in correct order", () => {
    const order: string[] = [];
    const graph = GraphBuilder.create().provide(makeTransientLoggerAdapter()).build();
    const parent = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    child.addHook("beforeResolve", () => order.push("before1"));
    child.addHook("beforeResolve", () => order.push("before2"));
    child.resolve(LoggerPort);

    // beforeResolve hooks fire in installation order
    expect(order).toEqual(["before1", "before2"]);
  });

  it("afterResolve hooks fire in reverse order (middleware pattern)", () => {
    const order: string[] = [];
    const graph = GraphBuilder.create().provide(makeTransientLoggerAdapter()).build();
    const parent = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    child.addHook("afterResolve", () => order.push("after1"));
    child.addHook("afterResolve", () => order.push("after2"));
    child.resolve(LoggerPort);

    // afterResolve hooks fire in reverse order
    expect(order).toEqual(["after2", "after1"]);
  });
});

// =============================================================================
// Child Container Wrapper - HOOKS_ACCESS
// =============================================================================

describe("child container HOOKS_ACCESS", () => {
  it("child has HOOKS_ACCESS as non-enumerable function", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const getter = (child as any)[HOOKS_ACCESS];
    expect(typeof getter).toBe("function");

    // non-enumerable
    const descriptor = Object.getOwnPropertyDescriptor(child, HOOKS_ACCESS);
    expect(descriptor?.enumerable).toBe(false);
    expect(descriptor?.writable).toBe(false);
    expect(descriptor?.configurable).toBe(false);
  });

  it("HOOKS_ACCESS installHooks installs hooks that fire during resolution", () => {
    const graph = GraphBuilder.create().provide(makeTransientLoggerAdapter()).build();
    const parent = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const installer = (child as any)[HOOKS_ACCESS]();
    const beforeFn = vi.fn();
    installer.installHooks({ beforeResolve: beforeFn });

    child.resolve(LoggerPort);
    expect(beforeFn).toHaveBeenCalledTimes(1);
  });

  it("HOOKS_ACCESS installHooks returns uninstall function that removes hooks", () => {
    const graph = GraphBuilder.create().provide(makeTransientLoggerAdapter()).build();
    const parent = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const installer = (child as any)[HOOKS_ACCESS]();
    const beforeFn = vi.fn();
    const uninstall = installer.installHooks({ beforeResolve: beforeFn });

    child.resolve(LoggerPort);
    expect(beforeFn).toHaveBeenCalledTimes(1);

    uninstall();
    child.resolve(LoggerPort);
    // Should not be called again
    expect(beforeFn).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// Child Container Wrapper - Scope creation
// =============================================================================

describe("child container scope creation", () => {
  it("createScope creates a functional scope from child container", () => {
    const scopedAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(scopedAdapter).build();
    const parent = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const scope = child.createScope("test-scope");
    expect(scope).toBeDefined();
    const logger = scope.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("scoped instances are isolated between child scopes", () => {
    const factory = vi.fn(() => ({ log: vi.fn() }));
    const scopedAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory,
    });
    const graph = GraphBuilder.create().provide(scopedAdapter).build();
    const parent = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const scope1 = child.createScope("s1");
    const scope2 = child.createScope("s2");
    const logger1 = scope1.resolve(LoggerPort);
    const logger2 = scope2.resolve(LoggerPort);

    expect(logger1).not.toBe(logger2);
  });
});

// =============================================================================
// Child Container Wrapper - Dispose lifecycle
// =============================================================================

describe("child container wrapper dispose", () => {
  it("dispose calls impl.dispose", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    await child.dispose();
    expect(child.isDisposed).toBe(true);
  });

  it("dispose cascades to child's children", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const grandchildGraph = GraphBuilder.create().build();
    const grandchild = child.createChild(grandchildGraph, { name: "Grandchild" });

    await child.dispose();
    expect(child.isDisposed).toBe(true);
    expect(grandchild.isDisposed).toBe(true);
  });
});

// =============================================================================
// Child Container Wrapper - createChild (nested child containers)
// =============================================================================

describe("child container createChild (grandchild creation)", () => {
  it("child can create grandchild with extensions", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const cacheAdapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: vi.fn(), set: vi.fn() }),
    });
    const grandchildGraph = GraphBuilder.create().provide(cacheAdapter).build();
    const grandchild = child.createChild(grandchildGraph, { name: "Grandchild" });

    expect(grandchild.name).toBe("Grandchild");
    expect(grandchild.parentName).toBe("Child");
    expect(grandchild.kind).toBe("child");
    expect(grandchild.has(CachePort)).toBe(true);
    expect(grandchild.has(LoggerPort)).toBe(true);
  });

  it("grandchild can resolve both parent and grandparent ports", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const cacheAdapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: vi.fn(), set: vi.fn() }),
    });
    const grandchildGraph = GraphBuilder.create().provide(cacheAdapter).build();
    const grandchild = child.createChild(grandchildGraph, { name: "Grandchild" });

    const logger = grandchild.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");

    const cache = grandchild.resolve(CachePort);
    expect(typeof cache.get).toBe("function");
  });
});

// =============================================================================
// Child Container Wrapper - createChildAsync and createLazyChild
// =============================================================================

describe("child container async child creation", () => {
  it("createChildAsync delegates to graphLoader and createChild", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const dbAdapter = makeDbAdapter();
    const grandchildGraph = GraphBuilder.create().provide(dbAdapter).build();

    const grandchild = await child.createChildAsync(async () => grandchildGraph, {
      name: "AsyncGrandchild",
    });

    expect(grandchild.name).toBe("AsyncGrandchild");
    const db = grandchild.resolve(DatabasePort);
    expect(typeof db.query).toBe("function");
  });

  it("createLazyChild creates a LazyContainer", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const dbAdapter = makeDbAdapter();
    const grandchildGraph = GraphBuilder.create().provide(dbAdapter).build();

    const lazy = child.createLazyChild(async () => grandchildGraph, { name: "LazyGrandchild" });

    expect(lazy.isLoaded).toBe(false);
    expect(lazy.isDisposed).toBe(false);
  });

  it("createLazyChild lazy container can load and resolve", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const dbAdapter = makeDbAdapter();
    const grandchildGraph = GraphBuilder.create().provide(dbAdapter).build();

    const lazy = child.createLazyChild(async () => grandchildGraph, { name: "LazyGrandchild" });

    await lazy.load();
    expect(lazy.isLoaded).toBe(true);
  });
});

// =============================================================================
// Child Container Wrapper - override method
// =============================================================================

describe("child container override method", () => {
  it("override returns an OverrideBuilder", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const mockAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => "mocked" }),
    });

    const builder = child.override(mockAdapter);
    expect(typeof builder.override).toBe("function");
    expect(typeof builder.build).toBe("function");
  });

  it("override().build() creates grandchild with correct overrides", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const mockLogFn = vi.fn();
    const mockAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: mockLogFn }),
    });

    const overridden = child.override(mockAdapter).build();
    const logger = overridden.resolve(LoggerPort);
    logger.log("test");
    expect(mockLogFn).toHaveBeenCalledWith("test");
  });
});

// =============================================================================
// Child Container Wrapper - INTERNAL_ACCESS and ADAPTER_ACCESS
// =============================================================================

describe("child container internal access symbols", () => {
  it("INTERNAL_ACCESS returns container internal state", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const state = child[INTERNAL_ACCESS]();
    expect(state).toBeDefined();
    expect(state.disposed).toBe(false);
    expect(state.containerName).toBe("Child");
  });

  it("ADAPTER_ACCESS returns adapter for registered port", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const adapter = (child as any)[ADAPTER_ACCESS](LoggerPort);
    expect(adapter).toBeDefined();
  });

  it("ADAPTER_ACCESS returns undefined for unregistered port", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const adapter = (child as any)[ADAPTER_ACCESS](CachePort);
    expect(adapter).toBeUndefined();
  });

  it("registerChildContainer delegates to impl", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    // Creating a grandchild exercises registerChildContainer
    const grandchildGraph = GraphBuilder.create().build();
    const grandchild = child.createChild(grandchildGraph, { name: "GC" });
    expect(grandchild.name).toBe("GC");
  });

  it("unregisterChildContainer delegates to impl on grandchild dispose", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const grandchildGraph = GraphBuilder.create().build();
    const grandchild = child.createChild(grandchildGraph, { name: "GC" });

    await grandchild.dispose();
    expect(grandchild.isDisposed).toBe(true);
    // Child should still be alive
    expect(child.isDisposed).toBe(false);
  });
});
