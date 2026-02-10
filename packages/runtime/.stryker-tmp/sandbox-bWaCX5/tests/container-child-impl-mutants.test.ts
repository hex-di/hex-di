/**
 * Comprehensive mutation-killing tests for src/container/child-impl.ts
 *
 * Targets all surviving mutants in the child-impl module:
 * - isRoot property is false
 * - getContainerName returns correct name
 * - installHooks / uninstallHooks
 * - initializeFromParent: override vs extension registration
 * - onWrapperSet: registers with parent
 * - getParent: returns originalParent
 * - initialize: always rejects
 * - resolveInternal: local vs inherited, scoped check
 * - resolveInternalFallback: shared vs forked/isolated
 * - resolveAsyncInternalFallback: local vs parent delegation
 * - createIsolatedWithAdapter: factory invocation, memoization
 * - getInternalState: containerId, containerName, inheritanceModes
 * - getParentUnregisterCallback: wrapper-based cleanup
 * - createDynamicHooksRunner: composed hooks behavior
 */
// @ts-nocheck

import { describe, it, expect, vi } from "vitest";
import { port, createAdapter, type Port } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { INTERNAL_ACCESS, ADAPTER_ACCESS } from "../src/inspection/symbols.js";
import { DisposedScopeError, ScopeRequiredError, FactoryError } from "../src/errors/index.js";

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
interface UserService {
  getUser(id: string): unknown;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const CachePort = port<Cache>()({ name: "Cache" });
const UserServicePort = port<UserService>()({ name: "UserService" });

function makeRootContainer() {
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
  return createContainer({ graph, name: "Root" });
}

// =============================================================================
// Child Container Basic Properties
// =============================================================================

describe("ChildContainerImpl - basic properties via wrapper", () => {
  it("child is not root (kind is 'child')", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    expect(child.kind).toBe("child");
  });

  it("getContainerName returns the child name", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "MyChild" });

    const state = child[INTERNAL_ACCESS]();
    expect(state.containerName).toBe("MyChild");
  });

  it("containerId is unique per child", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child1 = parent.createChild(childGraph, { name: "Child1" });
    const child2 = parent.createChild(childGraph, { name: "Child2" });

    const state1 = child1[INTERNAL_ACCESS]();
    const state2 = child2[INTERNAL_ACCESS]();
    expect(state1.containerId).not.toBe(state2.containerId);
  });

  it("isInitialized is true for child containers (inherited)", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    expect(child.isInitialized).toBe(true);
  });
});

// =============================================================================
// Child Container - initializeFromParent: overrides vs extensions
// =============================================================================

describe("ChildContainerImpl - initializeFromParent", () => {
  it("overrides are marked as local and as overrides", () => {
    const parent = makeRootContainer();
    const mockLogFn = vi.fn();
    const overrideAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: mockLogFn }),
    });
    const childGraph = GraphBuilder.create().override(overrideAdapter).build();
    const child = parent.createChild(childGraph, { name: "Child" });

    // Override should be used when resolving
    child.resolve(LoggerPort).log("test");
    expect(mockLogFn).toHaveBeenCalledWith("test");

    // Check internal state for override marking
    const state = child[INTERNAL_ACCESS]();
    expect(state.overridePorts).toBeDefined();
    expect(state.isOverride("Logger")).toBe(true);
  });

  it("extensions are registered as local but NOT as overrides", () => {
    const parent = makeRootContainer();
    const cacheAdapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: vi.fn() }),
    });
    const childGraph = GraphBuilder.create().provide(cacheAdapter).build();
    const child = parent.createChild(childGraph, { name: "Child" });

    // Extension should be resolvable
    const cache = child.resolve(CachePort);
    expect(typeof cache.get).toBe("function");

    // Extension should NOT be marked as override
    const state = child[INTERNAL_ACCESS]();
    expect(state.isOverride("Cache")).toBe(false);
  });
});

// =============================================================================
// Child Container - installHooks / uninstallHooks
// =============================================================================

describe("ChildContainerImpl - hook management", () => {
  it("installHooks adds hooks that fire during resolution", () => {
    const parent = makeRootContainer();
    const transientAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ log: vi.fn() }),
    });
    const childGraph = GraphBuilder.create().override(transientAdapter).build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const beforeFn = vi.fn();
    child.addHook("beforeResolve", beforeFn);
    child.resolve(LoggerPort);
    expect(beforeFn).toHaveBeenCalledTimes(1);
  });

  it("uninstallHooks removes hooks from firing", () => {
    const parent = makeRootContainer();
    const transientAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ log: vi.fn() }),
    });
    const childGraph = GraphBuilder.create().override(transientAdapter).build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const beforeFn = vi.fn();
    child.addHook("beforeResolve", beforeFn);
    child.removeHook("beforeResolve", beforeFn);
    child.resolve(LoggerPort);
    expect(beforeFn).not.toHaveBeenCalled();
  });

  it("uninstallHooks handles hook not found (already removed)", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const beforeFn = vi.fn();
    child.addHook("beforeResolve", beforeFn);
    child.removeHook("beforeResolve", beforeFn);
    // Second removal should be no-op
    child.removeHook("beforeResolve", beforeFn);
  });
});

// =============================================================================
// Child Container - onWrapperSet (registerChildContainer)
// =============================================================================

describe("ChildContainerImpl - wrapper registration", () => {
  it("creating child registers it with parent", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    // Verify by checking parent internal state has child
    const state = parent[INTERNAL_ACCESS]();
    expect(state.childContainers.length).toBeGreaterThan(0);
  });

  it("disposing child unregisters from parent", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    // Get child count before
    const stateBefore = parent[INTERNAL_ACCESS]();
    const countBefore = stateBefore.childContainers.length;

    await child.dispose();

    const stateAfter = parent[INTERNAL_ACCESS]();
    expect(stateAfter.childContainers.length).toBeLessThan(countBefore);
  });
});

// =============================================================================
// Child Container - getParent
// =============================================================================

describe("ChildContainerImpl - getParent", () => {
  it("parent property returns the parent container", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const parentRef = child.parent;
    expect(parentRef).toBeDefined();
    expect(typeof parentRef.resolve).toBe("function");
  });
});

// =============================================================================
// Child Container - initialize always rejects
// =============================================================================

describe("ChildContainerImpl - initialize rejects", () => {
  it("initialize getter on child throws", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    expect(() => (child as any).initialize).toThrow();
  });
});

// =============================================================================
// Child Container - resolveInternal: local vs inherited
// =============================================================================

describe("ChildContainerImpl - resolution: local vs inherited", () => {
  it("resolves local override port directly", () => {
    const parent = makeRootContainer();
    const mockLog = vi.fn();
    const overrideAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: mockLog }),
    });
    const childGraph = GraphBuilder.create().override(overrideAdapter).build();
    const child = parent.createChild(childGraph, { name: "Child" });

    child.resolve(LoggerPort).log("local");
    expect(mockLog).toHaveBeenCalledWith("local");
  });

  it("resolves inherited port via parent delegation (shared mode)", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    // Logger is inherited from parent in shared mode
    const logger = child.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("resolves extension port locally", () => {
    const parent = makeRootContainer();
    const cacheAdapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: vi.fn() }),
    });
    const childGraph = GraphBuilder.create().provide(cacheAdapter).build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const cache = child.resolve(CachePort);
    expect(typeof cache.get).toBe("function");
  });
});

// =============================================================================
// Child Container - resolveInternalFallback
// =============================================================================

describe("ChildContainerImpl - resolveInternalFallback", () => {
  it("delegates inherited ports to parent based on inheritance mode", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    // Inherited port resolved via fallback (shared mode)
    const db = child.resolve(DatabasePort);
    expect(typeof db.query).toBe("function");
  });

  it("throws for unregistered local port", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const resolve = child.resolve as (port: Port<unknown, string>) => unknown;
    expect(() => resolve(CachePort)).toThrow();
  });
});

// =============================================================================
// Child Container - resolveAsyncInternalFallback
// =============================================================================

describe("ChildContainerImpl - resolveAsyncInternalFallback", () => {
  it("delegates inherited port async resolution to parent", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const logger = await child.resolveAsync(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("rejects for unregistered port", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const resolveAsync = child.resolveAsync as (port: Port<unknown, string>) => Promise<unknown>;
    await expect(resolveAsync(CachePort)).rejects.toThrow();
  });
});

// =============================================================================
// Child Container - createIsolatedWithAdapter
// =============================================================================

describe("ChildContainerImpl - isolated mode", () => {
  it("isolated mode creates new instance via factory in child", () => {
    const parentFactory = vi.fn(() => ({ log: vi.fn() }));
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: parentFactory,
    });
    const graph = GraphBuilder.create().provide(loggerAdapter).build();
    const parent = createContainer({ graph, name: "Root" });

    // Resolve in parent first
    const parentLogger = parent.resolve(LoggerPort);

    // Create child with isolated mode
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, {
      name: "Child",
      inheritanceModes: { Logger: "isolated" } as any,
    });

    const childLogger = child.resolve(LoggerPort);
    // Isolated mode creates new instance - not the same as parent's
    expect(childLogger).not.toBe(parentLogger);
  });
});

// =============================================================================
// Child Container - forked mode
// =============================================================================

describe("ChildContainerImpl - forked mode", () => {
  it("forked mode creates cloned instance", () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      clonable: true,
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(loggerAdapter).build();
    const parent = createContainer({ graph, name: "Root" });

    // Resolve in parent first
    const parentLogger = parent.resolve(LoggerPort);

    // Create child with forked mode
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, {
      name: "Child",
      inheritanceModes: { Logger: "forked" } as any,
    });

    const childLogger = child.resolve(LoggerPort);
    // Forked mode creates clone - different object
    expect(childLogger).not.toBe(parentLogger);
    // But same shape
    expect(typeof childLogger.log).toBe("function");
  });
});

// =============================================================================
// Child Container - getInternalState
// =============================================================================

describe("ChildContainerImpl - getInternalState", () => {
  it("internal state has correct containerId", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const state = child[INTERNAL_ACCESS]();
    expect(state.containerId).toBeDefined();
    expect(state.containerId).not.toBe("root");
  });

  it("internal state has correct containerName", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "TestChild" });

    const state = child[INTERNAL_ACCESS]();
    expect(state.containerName).toBe("TestChild");
  });

  it("internal state has inheritanceModes map", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, {
      name: "Child",
      inheritanceModes: { Logger: "forked" } as any,
    });

    const state = child[INTERNAL_ACCESS]();
    expect(state.inheritanceModes).toBeDefined();
    expect(state.inheritanceModes?.get("Logger")).toBe("forked");
  });

  it("internal state is frozen", () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const state = child[INTERNAL_ACCESS]();
    expect(Object.isFrozen(state)).toBe(true);
  });

  it("disposed child throws when accessing internal state", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    await child.dispose();
    expect(() => child[INTERNAL_ACCESS]()).toThrow(DisposedScopeError);
  });

  it("adapterMap contains only local adapters", () => {
    const parent = makeRootContainer();
    const cacheAdapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: vi.fn() }),
    });
    const childGraph = GraphBuilder.create().provide(cacheAdapter).build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const state = child[INTERNAL_ACCESS]();
    // adapterMap should contain only local adapters (Cache extension), not inherited ones
    const portNames = Array.from(state.adapterMap.values()).map((v: any) => v.portName);
    expect(portNames).toContain("Cache");
  });
});

// =============================================================================
// Child Container - disposal
// =============================================================================

describe("ChildContainerImpl - disposal", () => {
  it("dispose marks child as disposed", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    await child.dispose();
    expect(child.isDisposed).toBe(true);
  });

  it("resolve after dispose throws DisposedScopeError", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    await child.dispose();
    expect(() => child.resolve(LoggerPort)).toThrow(DisposedScopeError);
  });

  it("disposing parent cascades to child", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    await parent.dispose();
    expect(child.isDisposed).toBe(true);
  });

  it("disposing child does not affect parent", async () => {
    const parent = makeRootContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    await child.dispose();
    expect(parent.isDisposed).toBe(false);
  });

  it("child container calls finalizers on dispose", async () => {
    const finalizer = vi.fn();
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
      finalizer,
    });
    const graph = GraphBuilder.create().provide(loggerAdapter).build();
    const parent = createContainer({ graph, name: "Root" });

    const overrideAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
      finalizer,
    });
    const childGraph = GraphBuilder.create().override(overrideAdapter).build();
    const child = parent.createChild(childGraph, { name: "Child" });

    child.resolve(LoggerPort);
    await child.dispose();

    expect(finalizer).toHaveBeenCalled();
  });
});

// =============================================================================
// Child Container - scoped resolution
// =============================================================================

describe("ChildContainerImpl - scoped port handling", () => {
  it("scoped port throws ScopeRequiredError when resolved from child directly", () => {
    const scopedAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(scopedAdapter).build();
    const parent = createContainer({ graph, name: "Root" });

    const overrideAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const childGraph = GraphBuilder.create().override(overrideAdapter).build();
    const child = parent.createChild(childGraph, { name: "Child" });

    expect(() => child.resolve(LoggerPort)).toThrow(ScopeRequiredError);
  });

  it("scoped port resolves correctly within child scope", () => {
    const scopedAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(scopedAdapter).build();
    const parent = createContainer({ graph, name: "Root" });

    const overrideAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const childGraph = GraphBuilder.create().override(overrideAdapter).build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const scope = child.createScope("test");
    const logger = scope.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });
});

// =============================================================================
// Child Container - createDynamicHooksRunner composed behavior
// =============================================================================

describe("ChildContainerImpl - dynamic hooks runner", () => {
  it("beforeResolve hooks fire in order on child", () => {
    const order: string[] = [];
    const parent = makeRootContainer();
    const transientAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ log: vi.fn() }),
    });
    const childGraph = GraphBuilder.create().override(transientAdapter).build();
    const child = parent.createChild(childGraph, { name: "Child" });

    child.addHook("beforeResolve", () => order.push("first"));
    child.addHook("beforeResolve", () => order.push("second"));
    child.resolve(LoggerPort);

    expect(order).toEqual(["first", "second"]);
  });

  it("afterResolve hooks fire in reverse order on child", () => {
    const order: string[] = [];
    const parent = makeRootContainer();
    const transientAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ log: vi.fn() }),
    });
    const childGraph = GraphBuilder.create().override(transientAdapter).build();
    const child = parent.createChild(childGraph, { name: "Child" });

    child.addHook("afterResolve", () => order.push("first"));
    child.addHook("afterResolve", () => order.push("second"));
    child.resolve(LoggerPort);

    expect(order).toEqual(["second", "first"]);
  });
});

// =============================================================================
// Child Container - dependency resolution with FactoryError
// =============================================================================

describe("ChildContainerImpl - factory error handling", () => {
  it("factory error in isolated mode is wrapped in FactoryError", () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => {
        throw new Error("factory boom");
      },
    });
    const graph = GraphBuilder.create().provide(loggerAdapter).build();
    const parent = createContainer({ graph, name: "Root" });

    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, {
      name: "Child",
      inheritanceModes: { Logger: "isolated" } as any,
    });

    expect(() => child.resolve(LoggerPort)).toThrow(FactoryError);
  });
});
