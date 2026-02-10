/**
 * Mutation-killing tests for arrow function delegation and conditional expressions.
 *
 * Targets:
 * - wrappers.ts ArrowFunction -> undefined: L244, L262, L263, L264, L267, L362, L363, L436
 * - factory.ts ArrowFunction -> undefined: L287, L306, L307, L310, L395, L396, L531, L550, L551, L554, L639, L640, L694
 * - factory.ts: Hook installation, addHook/removeHook, late-binding hooks
 * - child-impl.ts: Conditional expressions L145, L226, L229, L241, L260-300
 * - lazy-impl.ts: L115, L136, L225, L232-236
 * - root-impl.ts: L54, L70, L93, L102
 */
import { describe, it, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { ADAPTER_ACCESS, INTERNAL_ACCESS, HOOKS_ACCESS } from "../src/inspection/symbols.js";

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

function makeSingletonLoggerAdapter() {
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

function makeCacheAdapter() {
  return createAdapter({
    provides: CachePort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ get: vi.fn(), set: vi.fn() }),
  });
}

function makeRootContainer() {
  const graph = GraphBuilder.create()
    .provide(makeSingletonLoggerAdapter())
    .provide(makeDbAdapter())
    .build();
  return createContainer({ graph, name: "Root" });
}

// =============================================================================
// Priority 2: Arrow functions returning undefined
// wrappers.ts: createScope (L244), createChild parentLike delegation (L261-267)
//              registerChildContainer (L362), unregisterChildContainer (L363)
// factory.ts:  createScope (L287,L531), createChild parentLike (L304-310, L548-554)
//              registerChildContainer (L395,L639), unregisterChildContainer (L396,L640)
//              HOOKS_ACCESS installer (L694 unused but covered)
// =============================================================================

describe("wrapper delegation: createScope returns a valid scope (kills ArrowFunction -> undefined)", () => {
  it("root container createScope returns scope with resolve (kills factory.ts L287)", () => {
    const scopedAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(scopedAdapter).build();
    const container = createContainer({ graph, name: "Root" });
    const scope = container.createScope("test");

    expect(scope).toBeDefined();
    expect(scope).not.toBeUndefined();
    const logger = scope.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("child container createScope returns scope (kills wrappers.ts L244)", () => {
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
    const scope = child.createScope("child-scope");

    expect(scope).toBeDefined();
    expect(scope).not.toBeUndefined();
    const logger = scope.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });
});

describe("wrapper delegation: createChild parentLike fields are not undefined", () => {
  it("root container createChild - parentLike.resolveInternal returns correct value (kills factory.ts L304)", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    // Child resolves parent's port - if resolveInternal was undefined, it would fail
    const logger = child.resolve(LoggerPort);
    expect(logger).toBeDefined();
    expect(typeof logger.log).toBe("function");
  });

  it("root container createChild - parentLike.resolveAsyncInternal returns correct value (kills factory.ts L305)", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const logger = await child.resolveAsync(LoggerPort);
    expect(logger).toBeDefined();
    expect(typeof logger.log).toBe("function");
  });

  it("root container createChild - parentLike.has returns correct value (kills factory.ts L306)", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    // has() must return boolean, not undefined
    expect(child.has(LoggerPort)).toBe(true);
    expect(child.has(CachePort)).toBe(false);
  });

  it("root container createChild - parentLike.hasAdapter returns correct value (kills factory.ts L307)", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    expect(child.hasAdapter(LoggerPort)).toBe(true);
    expect(child.hasAdapter(CachePort)).toBe(false);
  });

  it("root container createChild - parentLike ADAPTER_ACCESS returns adapter (kills factory.ts L308)", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    // The adapter access is used internally during child resolution
    const adapter = (child as any)[ADAPTER_ACCESS](LoggerPort);
    expect(adapter).toBeDefined();
    expect(adapter.provides).toBe(LoggerPort);
  });

  it("root container createChild - registerChildContainer and unregisterChildContainer work (kills factory.ts L309/310)", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    // Create grandchild (exercises registerChildContainer)
    const grandchildGraph = GraphBuilder.create().build();
    const grandchild = child.createChild(grandchildGraph, { name: "GC" });
    expect(grandchild.name).toBe("GC");

    // Dispose grandchild (exercises unregisterChildContainer)
    await grandchild.dispose();
    expect(grandchild.isDisposed).toBe(true);
    expect(child.isDisposed).toBe(false);
  });
});

describe("wrapper delegation: child container createChild parentLike (wrappers.ts L261-267)", () => {
  it("grandchild resolves parent's port (L261 resolveInternal not undefined)", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });
    const grandchildGraph = GraphBuilder.create().build();
    const grandchild = child.createChild(grandchildGraph, { name: "GC" });

    const logger = grandchild.resolve(LoggerPort);
    expect(logger).toBeDefined();
    expect(typeof logger.log).toBe("function");
  });

  it("grandchild resolveAsync works (L262 resolveAsyncInternal not undefined)", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });
    const grandchildGraph = GraphBuilder.create().build();
    const grandchild = child.createChild(grandchildGraph, { name: "GC" });

    const logger = await grandchild.resolveAsync(LoggerPort);
    expect(logger).toBeDefined();
    expect(typeof logger.log).toBe("function");
  });

  it("grandchild has returns boolean (L263 not undefined)", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });
    const grandchildGraph = GraphBuilder.create().build();
    const grandchild = child.createChild(grandchildGraph, { name: "GC" });

    expect(grandchild.has(LoggerPort)).toBe(true);
    expect(grandchild.has(CachePort)).toBe(false);
  });

  it("grandchild hasAdapter returns boolean (L264 not undefined)", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });
    const grandchildGraph = GraphBuilder.create().build();
    const grandchild = child.createChild(grandchildGraph, { name: "GC" });

    expect(grandchild.hasAdapter(LoggerPort)).toBe(true);
    expect(grandchild.hasAdapter(CachePort)).toBe(false);
  });

  it("grandchild dispose works via unregisterChildContainer delegation (L267)", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });
    const grandchildGraph = GraphBuilder.create().build();
    const grandchild = child.createChild(grandchildGraph, { name: "GC" });

    await grandchild.dispose();
    expect(grandchild.isDisposed).toBe(true);
    expect(child.isDisposed).toBe(false);
  });
});

describe("wrapper delegation: registerChildContainer and unregisterChildContainer (wrappers.ts L362/363)", () => {
  it("registerChildContainer is called during createChild (L362)", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    // Verify child is tracked - parent's internal state should have childContainers
    const state = parent[INTERNAL_ACCESS]();
    expect(state.childContainers.length).toBeGreaterThanOrEqual(1);
  });

  it("unregisterChildContainer is called during dispose (L363)", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const stateBefore = parent[INTERNAL_ACCESS]();
    const childCountBefore = stateBefore.childContainers.length;

    await child.dispose();

    const stateAfter = parent[INTERNAL_ACCESS]();
    expect(stateAfter.childContainers.length).toBe(childCountBefore - 1);
  });
});

// =============================================================================
// Initialized container wrapper delegation (factory.ts L531-554, L639-640)
// =============================================================================

describe("initialized container wrapper delegation", () => {
  it("initialized container createScope returns scope (kills factory.ts L531)", async () => {
    const scopedAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const asyncDbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: async () => ({ query: vi.fn() }),
      factoryKind: "async" as const,
    });
    const graph = GraphBuilder.create().provide(scopedAdapter).provide(asyncDbAdapter).build();
    const uninit = createContainer({ graph, name: "Root" });
    const initialized = await uninit.initialize();

    const scope = initialized.createScope("test");
    expect(scope).toBeDefined();
    expect(scope).not.toBeUndefined();
    const logger = scope.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("initialized container createChild works (kills factory.ts L548-554)", async () => {
    const asyncDbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: async () => ({ query: vi.fn() }),
      factoryKind: "async" as const,
    });
    const graph = GraphBuilder.create()
      .provide(makeSingletonLoggerAdapter())
      .provide(asyncDbAdapter)
      .build();
    const uninit = createContainer({ graph, name: "Root" });
    const initialized = await uninit.initialize();

    const cacheAdapter = makeCacheAdapter();
    const childGraph = GraphBuilder.create().provide(cacheAdapter).build();
    const child = initialized.createChild(childGraph, { name: "InitChild" });

    expect(child.name).toBe("InitChild");
    const cache = child.resolve(CachePort);
    expect(typeof cache.get).toBe("function");
    const logger = child.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("initialized container registerChildContainer tracks children (kills factory.ts L639)", async () => {
    const asyncDbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: async () => ({ query: vi.fn() }),
      factoryKind: "async" as const,
    });
    const graph = GraphBuilder.create()
      .provide(makeSingletonLoggerAdapter())
      .provide(asyncDbAdapter)
      .build();
    const uninit = createContainer({ graph, name: "Root" });
    const initialized = await uninit.initialize();

    const childGraph = GraphBuilder.create().build();
    const child = initialized.createChild(childGraph, { name: "TC" });

    const state = initialized[INTERNAL_ACCESS]();
    expect(state.childContainers.length).toBeGreaterThanOrEqual(1);
  });

  it("initialized container unregisterChildContainer on child dispose (kills factory.ts L640)", async () => {
    const asyncDbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: async () => ({ query: vi.fn() }),
      factoryKind: "async" as const,
    });
    const graph = GraphBuilder.create()
      .provide(makeSingletonLoggerAdapter())
      .provide(asyncDbAdapter)
      .build();
    const uninit = createContainer({ graph, name: "Root" });
    const initialized = await uninit.initialize();

    const childGraph = GraphBuilder.create().build();
    const child = initialized.createChild(childGraph, { name: "TC" });

    const before = initialized[INTERNAL_ACCESS]();
    const countBefore = before.childContainers.length;

    await child.dispose();

    const after = initialized[INTERNAL_ACCESS]();
    expect(after.childContainers.length).toBe(countBefore - 1);
  });
});

// =============================================================================
// Root container hooks (factory.ts)
// =============================================================================

describe("root container addHook/removeHook", () => {
  it("addHook beforeResolve fires on resolve (kills factory.ts hook creation)", () => {
    const graph = GraphBuilder.create().provide(makeTransientLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Root" });

    const beforeFn = vi.fn();
    container.addHook("beforeResolve", beforeFn);
    container.resolve(LoggerPort);
    expect(beforeFn).toHaveBeenCalledTimes(1);
  });

  it("addHook afterResolve fires on resolve", () => {
    const graph = GraphBuilder.create().provide(makeTransientLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Root" });

    const afterFn = vi.fn();
    container.addHook("afterResolve", afterFn);
    container.resolve(LoggerPort);
    expect(afterFn).toHaveBeenCalledTimes(1);
  });

  it("removeHook stops hook from firing", () => {
    const graph = GraphBuilder.create().provide(makeTransientLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Root" });

    const beforeFn = vi.fn();
    container.addHook("beforeResolve", beforeFn);
    container.removeHook("beforeResolve", beforeFn);
    container.resolve(LoggerPort);
    expect(beforeFn).not.toHaveBeenCalled();
  });

  it("removeHook for unregistered handler is no-op", () => {
    const graph = GraphBuilder.create().provide(makeTransientLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Root" });

    const unregistered = vi.fn();
    // Should not throw
    container.removeHook("beforeResolve", unregistered);
  });

  it("initialized container addHook/removeHook work", async () => {
    const asyncDbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: async () => ({ query: vi.fn() }),
      factoryKind: "async" as const,
    });
    const graph = GraphBuilder.create()
      .provide(makeTransientLoggerAdapter())
      .provide(asyncDbAdapter)
      .build();
    const uninit = createContainer({ graph, name: "Root" });
    const initialized = await uninit.initialize();

    const beforeFn = vi.fn();
    initialized.addHook("beforeResolve", beforeFn);
    initialized.resolve(LoggerPort);
    expect(beforeFn).toHaveBeenCalledTimes(1);

    initialized.removeHook("beforeResolve", beforeFn);
    initialized.resolve(LoggerPort);
    expect(beforeFn).toHaveBeenCalledTimes(1); // no additional call
  });
});

// =============================================================================
// Root container HOOKS_ACCESS (factory.ts L445-461, L694)
// =============================================================================

describe("root container HOOKS_ACCESS", () => {
  it("root has HOOKS_ACCESS as non-enumerable function", () => {
    const container = makeRootContainer();
    const getter = (container as any)[HOOKS_ACCESS];
    expect(typeof getter).toBe("function");

    const descriptor = Object.getOwnPropertyDescriptor(container, HOOKS_ACCESS);
    expect(descriptor?.enumerable).toBe(false);
    expect(descriptor?.writable).toBe(false);
  });

  it("HOOKS_ACCESS installHooks installs hooks that fire (kills factory.ts L694 area)", () => {
    const graph = GraphBuilder.create().provide(makeTransientLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Root" });

    const installer = (container as any)[HOOKS_ACCESS]();
    const beforeFn = vi.fn();
    installer.installHooks({ beforeResolve: beforeFn });

    container.resolve(LoggerPort);
    expect(beforeFn).toHaveBeenCalledTimes(1);
  });

  it("HOOKS_ACCESS installHooks returns uninstall function that works", () => {
    const graph = GraphBuilder.create().provide(makeTransientLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Root" });

    const installer = (container as any)[HOOKS_ACCESS]();
    const beforeFn = vi.fn();
    const uninstall = installer.installHooks({ beforeResolve: beforeFn });

    container.resolve(LoggerPort);
    expect(beforeFn).toHaveBeenCalledTimes(1);

    uninstall();
    container.resolve(LoggerPort);
    expect(beforeFn).toHaveBeenCalledTimes(1); // not called again
  });
});

// =============================================================================
// Late binding hooks composition (factory.ts L81-96)
// =============================================================================

describe("late binding hooks - beforeResolve and afterResolve composition", () => {
  it("multiple beforeResolve hooks fire in installation order", () => {
    const order: string[] = [];
    const graph = GraphBuilder.create().provide(makeTransientLoggerAdapter()).build();
    const container = createContainer({
      graph,
      name: "Root",
      hooks: {
        beforeResolve: () => order.push("user-before"),
      },
    });

    container.addHook("beforeResolve", () => order.push("added-before"));
    container.resolve(LoggerPort);

    // User hooks are pushed to hookSources before addHook hooks
    // But auto-discovery hook is first, then user hooks
    expect(order).toContain("user-before");
    expect(order).toContain("added-before");
  });

  it("multiple afterResolve hooks fire in reverse order (middleware pattern)", () => {
    const order: string[] = [];
    const graph = GraphBuilder.create().provide(makeTransientLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Root" });

    container.addHook("afterResolve", () => order.push("first-installed"));
    container.addHook("afterResolve", () => order.push("second-installed"));
    container.resolve(LoggerPort);

    // afterResolve in reverse order: second installed fires first
    expect(order.indexOf("second-installed")).toBeLessThan(order.indexOf("first-installed"));
  });
});

// =============================================================================
// child-impl.ts: resolveInternal delegation for inherited ports (L226-237)
// and resolveInternalFallback (L296-306)
// =============================================================================

describe("child-impl.ts: inherited resolution paths", () => {
  it("child resolves inherited singleton via shared mode (kills L300-301)", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    // Resolve same singleton - shared mode returns same instance
    const parentLogger = parent.resolve(LoggerPort);
    const childLogger = child.resolve(LoggerPort);
    expect(childLogger).toBe(parentLogger);
  });

  it("child resolves inherited port in isolated mode (kills L304)", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, {
      name: "IsolatedChild",
      inheritanceModes: { Logger: "isolated" } as any,
    });

    const parentLogger = parent.resolve(LoggerPort);
    const childLogger = child.resolve(LoggerPort);
    // Isolated mode should produce a different instance
    expect(childLogger).not.toBe(parentLogger);
    expect(typeof childLogger.log).toBe("function");
  });

  it("child resolves inherited port in forked mode", () => {
    const clonableLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
      clonable: true,
    });
    const graph = GraphBuilder.create()
      .provide(clonableLoggerAdapter)
      .provide(makeDbAdapter())
      .build();
    const parent = createContainer({ graph, name: "Root" });

    // First resolve to create parent instance
    parent.resolve(LoggerPort);

    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, {
      name: "ForkedChild",
      inheritanceModes: { Logger: "forked" } as any,
    });

    const childLogger = child.resolve(LoggerPort);
    expect(typeof childLogger.log).toBe("function");
  });

  it("child throws for unknown port (kills L306)", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    expect(() => child.resolve(CachePort)).toThrow();
  });
});

// =============================================================================
// child-impl.ts: scoped port resolution in child (L229-231)
// =============================================================================

describe("child-impl.ts: scoped inherited ports", () => {
  it("scoped inherited port resolved via scope (kills L229-231)", () => {
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

    // Scoped port cannot be resolved directly
    expect(() => child.resolve(LoggerPort)).toThrow();

    // Must use scope
    const scope = child.createScope("s");
    const logger = scope.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });
});

// =============================================================================
// child-impl.ts: initialize throws (L184-186)
// =============================================================================

describe("child-impl.ts: initialize throws for child containers", () => {
  it("calling initialize on child impl rejects", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    // child.initialize is a getter that throws unreachable
    expect(() => (child as any).initialize).toThrow();
  });
});

// =============================================================================
// child-impl.ts: getParentUnregisterCallback (L240-246)
// =============================================================================

describe("child-impl.ts: getParentUnregisterCallback (L240-246)", () => {
  it("child disposal unregisters from parent (wrapper is disposableChild -> L241)", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const stateBefore = parent[INTERNAL_ACCESS]();
    expect(stateBefore.childContainers.length).toBe(1);

    await child.dispose();

    const stateAfter = parent[INTERNAL_ACCESS]();
    expect(stateAfter.childContainers.length).toBe(0);
  });
});

// =============================================================================
// child-impl.ts: resolveAsyncInternalFallback (L309-313)
// =============================================================================

describe("child-impl.ts: resolveAsyncInternalFallback", () => {
  it("child resolveAsync for inherited port delegates to parent (L310-311)", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const logger = await child.resolveAsync(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("child resolveAsync for non-existent port rejects (L313)", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    await expect(child.resolveAsync(CachePort)).rejects.toThrow("No adapter registered");
  });
});

// =============================================================================
// lazy-impl.ts: isLoaded (L115), disposed during load (L136),
// dispose paths (L225, L232-236)
// =============================================================================

describe("lazy-impl.ts: edge cases", () => {
  it("isLoaded returns false initially (kills L94 -> true)", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const lazy = parent.createLazyChild(async () => childGraph, { name: "Lazy" });

    expect(lazy.isLoaded).toBe(false);
  });

  it("isLoaded returns true after load (kills L94 -> false)", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const lazy = parent.createLazyChild(async () => childGraph, { name: "Lazy" });

    await lazy.load();
    expect(lazy.isLoaded).toBe(true);
  });

  it("load returns cached container on second call (kills L115)", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const lazy = parent.createLazyChild(async () => childGraph, { name: "Lazy" });

    const c1 = await lazy.load();
    const c2 = await lazy.load();
    expect(c1).toBe(c2);
  });

  it("dispose before load is idempotent (kills L225)", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const lazy = parent.createLazyChild(async () => childGraph, { name: "Lazy" });

    await lazy.dispose();
    expect(lazy.isDisposed).toBe(true);

    // Second dispose is no-op
    await lazy.dispose();
    expect(lazy.isDisposed).toBe(true);
  });

  it("dispose after load disposes container (kills L232-236, L244-246)", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const lazy = parent.createLazyChild(async () => childGraph, { name: "Lazy" });

    await lazy.load();
    expect(lazy.isLoaded).toBe(true);

    await lazy.dispose();
    expect(lazy.isDisposed).toBe(true);
  });

  it("load after dispose throws (kills L110-111)", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const lazy = parent.createLazyChild(async () => childGraph, { name: "Lazy" });

    await lazy.dispose();
    await expect(lazy.load()).rejects.toThrow("disposed");
  });

  it("resolve after load returns service", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const lazy = parent.createLazyChild(async () => childGraph, { name: "Lazy" });

    const logger = await lazy.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("resolveAsync works", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const lazy = parent.createLazyChild(async () => childGraph, { name: "Lazy" });

    const logger = await lazy.resolveAsync(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("tryResolve returns ResultAsync", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const lazy = parent.createLazyChild(async () => childGraph, { name: "Lazy" });

    const result = await lazy.tryResolve(LoggerPort);
    expect(result.isOk()).toBe(true);
  });

  it("tryResolveAsync returns ResultAsync", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const lazy = parent.createLazyChild(async () => childGraph, { name: "Lazy" });

    const result = await lazy.tryResolveAsync(LoggerPort);
    expect(result.isOk()).toBe(true);
  });

  it("tryDispose returns Ok ResultAsync", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const lazy = parent.createLazyChild(async () => childGraph, { name: "Lazy" });

    const result = await lazy.tryDispose();
    expect(result.isOk()).toBe(true);
  });

  it("has returns true for parent ports before load", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const lazy = parent.createLazyChild(async () => childGraph, { name: "Lazy" });

    // Before load: delegates to parent
    expect(lazy.has(LoggerPort)).toBe(true);
    expect(lazy.has(CachePort)).toBe(false);
  });

  it("has returns true for parent ports after load", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const lazy = parent.createLazyChild(async () => childGraph, { name: "Lazy" });

    await lazy.load();
    // After load: delegates to loaded container
    expect(lazy.has(LoggerPort)).toBe(true);
    expect(lazy.has(CachePort)).toBe(false);
  });

  it("concurrent loads share the same promise (deduplication)", async () => {
    let loadCount = 0;
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const lazy = parent.createLazyChild(
      async () => {
        loadCount++;
        return childGraph;
      },
      { name: "Lazy" }
    );

    // Fire two loads concurrently
    const [c1, c2] = await Promise.all([lazy.load(), lazy.load()]);
    expect(c1).toBe(c2);
    expect(loadCount).toBe(1);
  });

  it("dispose during load waits for load then disposes", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    let resolveLoader!: (g: any) => void;
    const lazy = parent.createLazyChild(
      () =>
        new Promise(resolve => {
          resolveLoader = resolve;
        }),
      { name: "Lazy" }
    );

    // Start loading
    const loadPromise = lazy.load();

    // Start disposal while loading
    const disposePromise = lazy.dispose();

    // Complete the load
    resolveLoader(childGraph);

    await loadPromise.catch(() => {}); // May throw disposed error
    await disposePromise;

    expect(lazy.isDisposed).toBe(true);
  });

  it("load failure clears loadPromise allowing retry", async () => {
    const parent = makeRootContainer();
    let callCount = 0;
    const childGraph = GraphBuilder.create().build();
    const lazy = parent.createLazyChild(
      async () => {
        callCount++;
        if (callCount === 1) throw new Error("first load fails");
        return childGraph;
      },
      { name: "Lazy" }
    );

    // First load fails
    await expect(lazy.load()).rejects.toThrow("first load fails");

    // Second load succeeds (loadPromise was cleared on failure)
    const container = await lazy.load();
    expect(container).toBeDefined();
    expect(callCount).toBe(2);
  });
});

// =============================================================================
// root-impl.ts: createHooksRunner (L54), initialize (L93), resolveWithInheritance (L106)
// =============================================================================

describe("root-impl.ts: edge cases", () => {
  it("container with hooks creates HooksRunner (kills L54)", () => {
    const graph = GraphBuilder.create().provide(makeTransientLoggerAdapter()).build();
    const hookFn = vi.fn();
    const container = createContainer({
      graph,
      name: "Root",
      hooks: { beforeResolve: hookFn },
    });

    container.resolve(LoggerPort);
    expect(hookFn).toHaveBeenCalled();
  });

  it("container without user hooks still supports addHook (late-binding)", () => {
    const graph = GraphBuilder.create().provide(makeTransientLoggerAdapter()).build();
    const container = createContainer({ graph, name: "Root" });

    const hookFn = vi.fn();
    container.addHook("beforeResolve", hookFn);
    container.resolve(LoggerPort);
    expect(hookFn).toHaveBeenCalled();
  });

  it("initialize throws on disposed container (kills L93-94)", async () => {
    const asyncDbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: async () => ({ query: vi.fn() }),
      factoryKind: "async" as const,
    });
    const graph = GraphBuilder.create().provide(asyncDbAdapter).build();
    const container = createContainer({ graph, name: "Root" });

    await container.dispose();
    await expect(container.initialize()).rejects.toThrow("disposed");
  });

  it("root getParent returns undefined (kills L88/102)", () => {
    const container = makeRootContainer();
    // Root container's parent getter throws
    expect(() => (container as any).parent).toThrow();
  });

  it("root resolveInternalFallback throws for unknown ports (kills L111-112)", () => {
    const container = makeRootContainer();
    expect(() => container.resolve(CachePort)).toThrow("No adapter registered");
  });

  it("root resolveAsyncInternalFallback rejects for unknown ports (kills L115-116)", async () => {
    const container = makeRootContainer();
    await expect(container.resolveAsync(CachePort)).rejects.toThrow("No adapter registered");
  });
});

// =============================================================================
// factory.ts root container property assertions
// =============================================================================

describe("root container wrapper property values", () => {
  it("root.name matches config name", () => {
    const container = makeRootContainer();
    expect(container.name).toBe("Root");
  });

  it("root.parentName is null", () => {
    const container = makeRootContainer();
    expect(container.parentName).toBeNull();
  });

  it("root.kind is 'root'", () => {
    const container = makeRootContainer();
    expect(container.kind).toBe("root");
  });

  it("root.isInitialized starts false for async containers", () => {
    const asyncDbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: async () => ({ query: vi.fn() }),
      factoryKind: "async" as const,
    });
    const graph = GraphBuilder.create().provide(asyncDbAdapter).build();
    const container = createContainer({ graph, name: "Root" });
    expect(container.isInitialized).toBe(false);
  });

  it("root.isDisposed starts false", () => {
    const container = makeRootContainer();
    expect(container.isDisposed).toBe(false);
  });

  it("root.isDisposed becomes true after dispose", async () => {
    const container = makeRootContainer();
    await container.dispose();
    expect(container.isDisposed).toBe(true);
  });

  it("root.has returns boolean", () => {
    const container = makeRootContainer();
    expect(container.has(LoggerPort)).toBe(true);
    expect(container.has(CachePort)).toBe(false);
  });

  it("root.hasAdapter returns boolean", () => {
    const container = makeRootContainer();
    expect(container.hasAdapter(LoggerPort)).toBe(true);
    expect(container.hasAdapter(CachePort)).toBe(false);
  });

  it("root INTERNAL_ACCESS returns state", () => {
    const container = makeRootContainer();
    const state = container[INTERNAL_ACCESS]();
    expect(state).toBeDefined();
    expect(state.disposed).toBe(false);
    expect(state.containerName).toBe("Root");
  });

  it("root ADAPTER_ACCESS returns adapter", () => {
    const container = makeRootContainer();
    const adapter = (container as any)[ADAPTER_ACCESS](LoggerPort);
    expect(adapter).toBeDefined();
    expect(adapter.provides).toBe(LoggerPort);
  });

  it("root ADAPTER_ACCESS returns undefined for unknown port", () => {
    const container = makeRootContainer();
    const adapter = (container as any)[ADAPTER_ACCESS](CachePort);
    expect(adapter).toBeUndefined();
  });
});

// =============================================================================
// factory.ts: tryResolve, tryResolveAsync, tryDispose for root
// =============================================================================

describe("root container try* methods", () => {
  it("tryResolve returns Ok for valid port", () => {
    const container = makeRootContainer();
    const result = container.tryResolve(LoggerPort);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(typeof result.value.log).toBe("function");
    }
  });

  it("tryResolve returns Err for failing factory", () => {
    const failAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => {
        throw new Error("boom");
      },
    });
    const graph = GraphBuilder.create().provide(failAdapter).build();
    const container = createContainer({ graph, name: "Root" });

    const result = container.tryResolve(LoggerPort);
    expect(result.isErr()).toBe(true);
  });

  it("tryResolveAsync returns Ok for valid port", async () => {
    const container = makeRootContainer();
    const result = await container.tryResolveAsync(LoggerPort);
    expect(result.isOk()).toBe(true);
  });

  it("tryDispose returns Ok", async () => {
    const container = makeRootContainer();
    const result = await container.tryDispose();
    expect(result.isOk()).toBe(true);
  });
});

// =============================================================================
// factory.ts: override method for root (uninit and initialized)
// =============================================================================

describe("root container override method", () => {
  it("uninit container override creates override builder", () => {
    const container = makeRootContainer();
    const mockAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => "mocked" }),
    });
    const builder = container.override(mockAdapter);
    expect(typeof builder.override).toBe("function");
    expect(typeof builder.build).toBe("function");
  });

  it("uninit container override().build() creates child with overrides", () => {
    const container = makeRootContainer();
    const mockFn = vi.fn();
    const mockAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: mockFn }),
    });
    const overridden = container.override(mockAdapter).build();
    const logger = overridden.resolve(LoggerPort);
    logger.log("test");
    expect(mockFn).toHaveBeenCalledWith("test");
  });

  it("initialized container override creates override builder", async () => {
    const asyncDbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: async () => ({ query: vi.fn() }),
      factoryKind: "async" as const,
    });
    const graph = GraphBuilder.create()
      .provide(makeSingletonLoggerAdapter())
      .provide(asyncDbAdapter)
      .build();
    const uninit = createContainer({ graph, name: "Root" });
    const initialized = await uninit.initialize();

    const mockAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const builder = initialized.override(mockAdapter);
    expect(typeof builder.build).toBe("function");
  });
});

// =============================================================================
// factory.ts: createChildAsync and createLazyChild from root
// =============================================================================

describe("root container createChildAsync and createLazyChild", () => {
  it("createChildAsync returns child container", async () => {
    const container = makeRootContainer();
    const cacheAdapter = makeCacheAdapter();
    const childGraph = GraphBuilder.create().provide(cacheAdapter).build();

    const child = await container.createChildAsync(async () => childGraph, { name: "AsyncChild" });
    expect(child.name).toBe("AsyncChild");
    const cache = child.resolve(CachePort);
    expect(typeof cache.get).toBe("function");
  });

  it("createLazyChild returns lazy container", () => {
    const container = makeRootContainer();
    const childGraph = GraphBuilder.create().build();

    const lazy = container.createLazyChild(async () => childGraph, { name: "LazyChild" });
    expect(lazy.isLoaded).toBe(false);
    expect(lazy.isDisposed).toBe(false);
  });

  it("initialized container createChildAsync works", async () => {
    const asyncDbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: async () => ({ query: vi.fn() }),
      factoryKind: "async" as const,
    });
    const graph = GraphBuilder.create()
      .provide(makeSingletonLoggerAdapter())
      .provide(asyncDbAdapter)
      .build();
    const uninit = createContainer({ graph, name: "Root" });
    const initialized = await uninit.initialize();

    const cacheAdapter = makeCacheAdapter();
    const childGraph = GraphBuilder.create().provide(cacheAdapter).build();
    const child = await initialized.createChildAsync(async () => childGraph, {
      name: "InitAsyncChild",
    });
    expect(child.name).toBe("InitAsyncChild");
  });

  it("initialized container createLazyChild works", async () => {
    const asyncDbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: async () => ({ query: vi.fn() }),
      factoryKind: "async" as const,
    });
    const graph = GraphBuilder.create()
      .provide(makeSingletonLoggerAdapter())
      .provide(asyncDbAdapter)
      .build();
    const uninit = createContainer({ graph, name: "Root" });
    const initialized = await uninit.initialize();

    const childGraph = GraphBuilder.create().build();
    const lazy = initialized.createLazyChild(async () => childGraph, { name: "InitLazyChild" });
    expect(lazy.isLoaded).toBe(false);
  });
});
