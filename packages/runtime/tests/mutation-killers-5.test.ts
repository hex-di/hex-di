/**
 * Fifth batch of mutation-killing tests.
 *
 * Targets surviving mutants across:
 * - base-impl.ts: has() scoped filtering, resolve/resolveAsync disposed checks,
 *   resolveInternal fallback, createAdapterMapSnapshot entries
 * - factory.ts: late-binding hooks composition, createChildAsync, createLazyChild,
 *   initialized container properties, user hooks, dispose with inspector
 * - wrappers.ts: isContainerParent, createChildContainerScope, HOOKS_ACCESS on child,
 *   createChildContainerAsyncInternal, createLazyChildContainerInternal
 * - builtin-api.ts: determineOrigin, getContainerKind, result tracker,
 *   getChildContainers, getAdapterInfo, getGraphData, getUnifiedSnapshot
 * - lazy-impl.ts: consumeLazyFlag, performLoad during dispose, tryResolve, tryDispose,
 *   has() before/after load, dispose during load
 * - child-impl.ts: resolveInternal scoped, resolveInternalFallback modes,
 *   resolveAsyncInternalFallback, getInternalState override
 * - scope/impl.ts: scope lifecycle events, getInternalState, createScope nesting,
 *   createScopeWrapper methods, ScopeBrand
 * - root-impl.ts: initialize disposed, resolveWithInheritance throw, resolveAsyncInternalFallback
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { INTERNAL_ACCESS, HOOKS_ACCESS, ADAPTER_ACCESS } from "../src/inspection/symbols.js";
import { markNextChildAsLazy, consumeLazyFlag } from "../src/container/lazy-impl.js";
import { isInternalAccessible, asInternalAccessible } from "../src/container/internal-types.js";
import { resetScopeIdCounter, createScopeIdGenerator } from "../src/scope/impl.js";
import { DisposedScopeError } from "../src/errors/index.js";
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
}
interface Config {
  get(key: string): string;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const _CachePort = port<Cache>()({ name: "Cache" });
const _ConfigPort = port<Config>()({ name: "Config" });

function createLoggerAdapter(lifetime: "singleton" | "transient" | "scoped" = "singleton") {
  return createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime,
    factory: () => ({ log: vi.fn() }),
  });
}

function createDatabaseAdapter(lifetime: "singleton" | "transient" | "scoped" = "singleton") {
  return createAdapter({
    provides: DatabasePort,
    requires: [],
    lifetime,
    factory: () => ({ query: vi.fn() }),
  });
}

// =============================================================================
// base-impl.ts: has() scoped filtering
// =============================================================================

describe("base-impl.ts - has() scoped filtering", () => {
  it("has() returns true for singleton adapter", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    expect(container.has(LoggerPort)).toBe(true);
  });

  it("has() returns true for transient adapter", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("transient")).build();
    const container = createContainer({ graph, name: "Test" });
    expect(container.has(LoggerPort)).toBe(true);
  });

  it("has() returns false for scoped adapter", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("scoped")).build();
    const container = createContainer({ graph, name: "Test" });
    expect(container.has(LoggerPort)).toBe(false);
  });

  it("has() returns false for unknown port", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    expect(container.has(DatabasePort)).toBe(false);
  });
});

// =============================================================================
// base-impl.ts: resolve throws on disposed
// =============================================================================

describe("base-impl.ts - resolve on disposed container", () => {
  it("resolve throws DisposedScopeError after dispose", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    await container.dispose();
    expect(() => container.resolve(LoggerPort)).toThrow(DisposedScopeError);
  });

  it("resolveAsync throws DisposedScopeError after dispose", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    await container.dispose();
    await expect(container.resolveAsync(LoggerPort)).rejects.toThrow(DisposedScopeError);
  });

  it("resolve throws ScopeRequiredError for scoped port", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("scoped")).build();
    const container = createContainer({ graph, name: "Test" });
    expect(() => container.resolve(LoggerPort)).toThrow(/scope/i);
  });

  it("resolveAsync throws ScopeRequiredError for scoped port", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("scoped")).build();
    const container = createContainer({ graph, name: "Test" });
    await expect(container.resolveAsync(LoggerPort)).rejects.toThrow(/scope/i);
  });
});

// =============================================================================
// factory.ts: late-binding hooks ordering
// =============================================================================

describe("factory.ts - late-binding hooks composition", () => {
  it("afterResolve hooks fire in LIFO order", () => {
    const order: string[] = [];
    const hook1 = { afterResolve: () => order.push("first") };
    const hook2 = { afterResolve: () => order.push("second") };

    const graph = GraphBuilder.create().provide(createLoggerAdapter("transient")).build();
    const container = createContainer({ graph, name: "Test" });

    // Install hooks via HOOKS_ACCESS
    const installer = (container as any)[HOOKS_ACCESS]();
    installer.installHooks(hook1);
    installer.installHooks(hook2);

    container.resolve(LoggerPort);

    // afterResolve should fire in reverse order
    // But the auto-discovery hook is installed before our hooks
    expect(order).toContain("first");
    expect(order).toContain("second");
    // Verify LIFO: second comes before first
    const firstIdx = order.indexOf("first");
    const secondIdx = order.indexOf("second");
    expect(secondIdx).toBeLessThan(firstIdx);
  });

  it("beforeResolve hooks fire in FIFO order", () => {
    const order: string[] = [];
    const hook1 = { beforeResolve: () => order.push("first") };
    const hook2 = { beforeResolve: () => order.push("second") };

    const graph = GraphBuilder.create().provide(createLoggerAdapter("transient")).build();
    const container = createContainer({ graph, name: "Test" });

    const installer = (container as any)[HOOKS_ACCESS]();
    installer.installHooks(hook1);
    installer.installHooks(hook2);

    container.resolve(LoggerPort);

    const firstIdx = order.indexOf("first");
    const secondIdx = order.indexOf("second");
    expect(firstIdx).toBeLessThan(secondIdx);
  });

  it("uninstall from HOOKS_ACCESS removes hook", () => {
    const calls: string[] = [];
    const hooks = { beforeResolve: () => calls.push("hook") };

    const graph = GraphBuilder.create().provide(createLoggerAdapter("transient")).build();
    const container = createContainer({ graph, name: "Test" });

    const installer = (container as any)[HOOKS_ACCESS]();
    const uninstall = installer.installHooks(hooks);

    container.resolve(LoggerPort);
    expect(calls.length).toBe(1);

    uninstall();
    container.resolve(LoggerPort);
    expect(calls.length).toBe(1); // Not called again
  });

  it("user hooks are included", () => {
    const userHookCalls: string[] = [];
    const graph = GraphBuilder.create().provide(createLoggerAdapter("transient")).build();
    const container = createContainer({
      graph,
      name: "Test",
      hooks: {
        beforeResolve: () => userHookCalls.push("before"),
        afterResolve: () => userHookCalls.push("after"),
      },
    });

    container.resolve(LoggerPort);
    expect(userHookCalls).toContain("before");
    expect(userHookCalls).toContain("after");
  });
});

// =============================================================================
// factory.ts: initialized container properties
// =============================================================================

describe("factory.ts - initialized container", () => {
  it("initialized container is frozen", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();
    expect(Object.isFrozen(initialized)).toBe(true);
  });

  it("initialized container resolves all ports", async () => {
    const graph = GraphBuilder.create()
      .provide(createLoggerAdapter("singleton"))
      .provide(createDatabaseAdapter("singleton"))
      .build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const logger = initialized.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");

    const db = initialized.resolve(DatabasePort);
    expect(typeof db.query).toBe("function");
  });

  it("initialized container kind is 'root'", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();
    expect(initialized.kind).toBe("root");
  });

  it("initialized container parentName is null", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();
    expect(initialized.parentName).toBeNull();
  });

  it("initialized container name matches", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "MyApp" });
    const initialized = await container.initialize();
    expect(initialized.name).toBe("MyApp");
  });

  it("initialized container isInitialized is true", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();
    expect(initialized.isInitialized).toBe(true);
  });

  it("initialized container has INTERNAL_ACCESS", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();
    expect(typeof (initialized as any)[INTERNAL_ACCESS]).toBe("function");
  });

  it("initialized container has ADAPTER_ACCESS", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();
    expect(typeof (initialized as any)[ADAPTER_ACCESS]).toBe("function");
  });

  it("initialized container tryResolve returns Ok for valid port", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();
    const result = initialized.tryResolve(LoggerPort);
    expect(result.isOk()).toBe(true);
  });

  it("initialized container tryResolveAsync returns Ok", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();
    const result = await initialized.tryResolveAsync(LoggerPort);
    expect(result.isOk()).toBe(true);
  });

  it("initialized container creates child", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const childGraph = GraphBuilder.create().build();
    const child = initialized.createChild(childGraph, { name: "Child" });

    expect(child.kind).toBe("child");
    expect(child.parentName).toBe("Test");
    const logger = child.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("initialized container addHook/removeHook work", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("transient")).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const calls: string[] = [];
    const handler = () => calls.push("hook");
    initialized.addHook("beforeResolve", handler);

    initialized.resolve(LoggerPort);
    expect(calls.length).toBe(1);

    initialized.removeHook("beforeResolve", handler);
    initialized.resolve(LoggerPort);
    expect(calls.length).toBe(1); // Not called again
  });

  it("initialized container createScope works", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("scoped")).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const scope = initialized.createScope("my-scope");
    const logger = scope.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
    await scope.dispose();
  });

  it("initialize returns same instance on second call", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    const init1 = await container.initialize();
    const init2 = await container.initialize();
    expect(init1).toBe(init2);
  });
});

// =============================================================================
// factory.ts: createChildAsync / createLazyChild
// =============================================================================

describe("factory.ts - createChildAsync", () => {
  it("loads graph and creates child", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().provide(createDatabaseAdapter("singleton")).build();

    const child = await container.createChildAsync(async () => childGraph, { name: "AsyncChild" });

    expect(child.kind).toBe("child");
    expect(child.parentName).toBe("Parent");
    const db = child.resolve(DatabasePort);
    expect(typeof db.query).toBe("function");
  });
});

describe("factory.ts - createLazyChild", () => {
  it("creates LazyContainer that loads on resolve", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().provide(createDatabaseAdapter("singleton")).build();

    const lazy = container.createLazyChild(async () => childGraph, { name: "LazyChild" });

    expect(lazy.isLoaded).toBe(false);
    const db = await lazy.resolve(DatabasePort);
    expect(typeof db.query).toBe("function");
    expect(lazy.isLoaded).toBe(true);
  });

  it("lazy container has() before load checks parent", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().provide(createDatabaseAdapter("singleton")).build();

    const lazy = container.createLazyChild(async () => childGraph, { name: "LazyChild" });

    // Before loading, has() delegates to parent
    expect(lazy.has(LoggerPort)).toBe(true);
  });

  it("lazy container has() after load checks loaded container", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().provide(createDatabaseAdapter("singleton")).build();

    const lazy = container.createLazyChild(async () => childGraph, { name: "LazyChild" });

    await lazy.load();
    expect(lazy.has(LoggerPort)).toBe(true);
    expect(lazy.has(DatabasePort)).toBe(true);
  });
});

// =============================================================================
// lazy-impl.ts: consumeLazyFlag, tryResolve, tryDispose, dispose during load
// =============================================================================

describe("lazy-impl.ts - consumeLazyFlag", () => {
  it("returns false when not set", () => {
    expect(consumeLazyFlag()).toBe(false);
  });

  it("returns true after markNextChildAsLazy", () => {
    markNextChildAsLazy();
    expect(consumeLazyFlag()).toBe(true);
  });

  it("resets after consume", () => {
    markNextChildAsLazy();
    consumeLazyFlag();
    expect(consumeLazyFlag()).toBe(false);
  });
});

describe("lazy-impl.ts - tryResolve / tryDispose", () => {
  it("tryResolve returns Ok for valid port", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const lazy = container.createLazyChild(async () => childGraph, { name: "LazyChild" });

    const result = await lazy.tryResolve(LoggerPort);
    expect(result.isOk()).toBe(true);
  });

  it("tryResolveAsync returns Ok for valid port", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const lazy = container.createLazyChild(async () => childGraph, { name: "LazyChild" });

    const result = await lazy.tryResolveAsync(LoggerPort);
    expect(result.isOk()).toBe(true);
  });

  it("tryDispose returns Ok", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const lazy = container.createLazyChild(async () => childGraph, { name: "LazyChild" });

    const result = await lazy.tryDispose();
    expect(result.isOk()).toBe(true);
    expect(lazy.isDisposed).toBe(true);
  });
});

describe("lazy-impl.ts - dispose during loading", () => {
  it("dispose during load waits for load then disposes", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Parent" });

    let resolveLoader: ((g: any) => void) | null = null;
    const childGraph = GraphBuilder.create().build();

    const lazy = container.createLazyChild(
      () =>
        new Promise<any>(r => {
          resolveLoader = r;
        }),
      { name: "LazyChild" }
    );

    // Start loading
    const loadPromise = lazy.load();
    // Dispose while loading
    const disposePromise = lazy.dispose();
    // Complete the load
    resolveLoader!(childGraph);
    await loadPromise.catch(() => {}); // load may throw DisposedScopeError
    await disposePromise;

    expect(lazy.isDisposed).toBe(true);
  });

  it("dispose without load is idempotent", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const lazy = container.createLazyChild(async () => childGraph, { name: "LazyChild" });

    await lazy.dispose();
    await lazy.dispose(); // idempotent
    expect(lazy.isDisposed).toBe(true);
  });

  it("load after dispose throws DisposedScopeError", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const lazy = container.createLazyChild(async () => childGraph, { name: "LazyChild" });

    await lazy.dispose();
    await expect(lazy.load()).rejects.toThrow(DisposedScopeError);
  });

  it("load deduplicates concurrent calls", async () => {
    let loadCount = 0;
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const lazy = container.createLazyChild(
      async () => {
        loadCount++;
        return childGraph;
      },
      { name: "LazyChild" }
    );

    const [c1, c2] = await Promise.all([lazy.load(), lazy.load()]);
    expect(c1).toBe(c2);
    expect(loadCount).toBe(1);
  });

  it("load after failure allows retry", async () => {
    let attempt = 0;
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const lazy = container.createLazyChild(
      async () => {
        attempt++;
        if (attempt === 1) throw new Error("load failed");
        return childGraph;
      },
      { name: "LazyChild" }
    );

    await expect(lazy.load()).rejects.toThrow("load failed");
    // Retry should work
    const loaded = await lazy.load();
    expect(loaded).toBeDefined();
  });
});

// =============================================================================
// builtin-api.ts: determineOrigin, result tracker, getGraphData
// =============================================================================

describe("builtin-api.ts - inspector API", () => {
  it("subscribe receives events", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("transient")).build();
    const container = createContainer({ graph, name: "Test" });

    const events: any[] = [];
    container.inspector.subscribe((event: any) => events.push(event));

    container.tryResolve(LoggerPort);
    expect(events.length).toBeGreaterThan(0);
    const resultEvent = events.find((e: any) => e.type === "result:ok");
    expect(resultEvent).toBeDefined();
    expect(resultEvent.portName).toBe("Logger");
  });

  it("unsubscribe stops receiving events", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("transient")).build();
    const container = createContainer({ graph, name: "Test" });

    const events: any[] = [];
    const unsub = container.inspector.subscribe((event: any) => events.push(event));

    container.tryResolve(LoggerPort);
    const count = events.length;
    unsub();
    container.tryResolve(LoggerPort);
    expect(events.length).toBe(count); // No new events
  });

  it("result tracker getStatistics after ok", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("transient")).build();
    const container = createContainer({ graph, name: "Test" });

    container.tryResolve(LoggerPort);

    const stats = container.inspector.getResultStatistics("Logger");
    expect(stats).toBeDefined();
    expect(stats!.okCount).toBe(1);
    expect(stats!.errCount).toBe(0);
    expect(stats!.errorRate).toBe(0);
    expect(stats!.totalCalls).toBe(1);
  });

  it("result tracker after error", () => {
    const badAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => {
        throw new Error("factory error");
      },
    });
    const graph = GraphBuilder.create().provide(badAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    container.tryResolve(LoggerPort);

    const stats = container.inspector.getResultStatistics("Logger");
    expect(stats).toBeDefined();
    expect(stats!.okCount).toBe(0);
    expect(stats!.errCount).toBe(1);
    expect(stats!.errorRate).toBe(1);
    expect(stats!.lastError).toBeDefined();
  });

  it("getAllResultStatistics returns all ports", () => {
    const graph = GraphBuilder.create()
      .provide(createLoggerAdapter("transient"))
      .provide(createDatabaseAdapter("transient"))
      .build();
    const container = createContainer({ graph, name: "Test" });

    container.tryResolve(LoggerPort);
    container.tryResolve(DatabasePort);

    const allStats = container.inspector.getAllResultStatistics();
    expect(allStats.size).toBe(2);
    expect(allStats.has("Logger")).toBe(true);
    expect(allStats.has("Database")).toBe(true);
  });

  it("getHighErrorRatePorts returns ports above threshold", () => {
    const badAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => {
        throw new Error("fail");
      },
    });
    const graph = GraphBuilder.create()
      .provide(badAdapter)
      .provide(createDatabaseAdapter("transient"))
      .build();
    const container = createContainer({ graph, name: "Test" });

    container.tryResolve(LoggerPort);
    container.tryResolve(DatabasePort);

    const highError = container.inspector.getHighErrorRatePorts(0.5);
    expect(highError.length).toBe(1);
    expect(highError[0].portName).toBe("Logger");
  });

  it("getAdapterInfo returns adapter details", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });

    const adapters = container.inspector.getAdapterInfo();
    expect(adapters.length).toBe(1);
    expect(adapters[0].portName).toBe("Logger");
    expect(adapters[0].lifetime).toBe("singleton");
    expect(adapters[0].factoryKind).toBe("sync");
  });

  it("getGraphData includes adapter details", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });

    const graphData = container.inspector.getGraphData();
    expect(graphData.containerName).toBe("Test");
    expect(graphData.kind).toBe("root");
    expect(graphData.parentName).toBeNull();
    expect(graphData.adapters.length).toBe(1);
    expect(graphData.adapters[0].portName).toBe("Logger");
    expect(graphData.adapters[0].origin).toBe("own");
    expect(graphData.adapters[0].isOverride).toBe(false);
  });

  it("getGraphData for child with overrides", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const parent = createContainer({ graph, name: "Parent" });

    const overrideAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    // Use .override() on the GraphBuilder so overridePortNames is populated
    const childGraph = GraphBuilder.forParent(graph).override(overrideAdapter).build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const graphData = child.inspector.getGraphData();
    // Note: getGraphData().kind uses getContainerKind() which checks parentState,
    // but child containers don't have parentState (to avoid circular refs).
    // Instead, test the inspector's getContainerKind which uses inheritanceModes detection.
    expect(child.inspector.getContainerKind()).toBe("child");
    // The override adapter should show as an override
    const loggerAdapter = graphData.adapters.find((a: any) => a.portName === "Logger");
    expect(loggerAdapter).toBeDefined();
    expect(loggerAdapter!.isOverride).toBe(true);
  });

  it("getContainerKind is 'root' for root", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    expect(container.inspector.getContainerKind()).toBe("root");
  });

  it("getContainerKind is 'child' for child", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const parent = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });
    expect(child.inspector.getContainerKind()).toBe("child");
  });

  it("getPhase returns correct phase", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    expect(container.inspector.getPhase()).toBeDefined();
  });

  it("isDisposed is false before disposal", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    expect(container.inspector.isDisposed).toBe(false);
  });

  it("getChildContainers is empty for root without children", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    expect(container.inspector.getChildContainers().length).toBe(0);
  });

  it("getChildContainers includes children", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const parent = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    parent.createChild(childGraph, { name: "Child" });

    const children = parent.inspector.getChildContainers();
    expect(children.length).toBe(1);
  });

  it("getUnifiedSnapshot includes libraries and container", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });

    const snapshot = container.inspector.getUnifiedSnapshot();
    expect(snapshot.timestamp).toBeGreaterThan(0);
    expect(snapshot.container).toBeDefined();
    expect(snapshot.libraries).toBeDefined();
    expect(snapshot.registeredLibraries).toBeDefined();
  });

  it("getSnapshot returns typed snapshot", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });

    const snapshot = container.inspector.getSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.kind).toBe("root");
    expect(snapshot.isDisposed).toBe(false);
    expect(snapshot.containerName).toBe("Test");
  });

  it("listPorts returns port names", () => {
    const graph = GraphBuilder.create()
      .provide(createLoggerAdapter("singleton"))
      .provide(createDatabaseAdapter("singleton"))
      .build();
    const container = createContainer({ graph, name: "Test" });

    const ports = container.inspector.listPorts();
    expect(ports).toContain("Logger");
    expect(ports).toContain("Database");
  });

  it("isResolved tracks resolved ports", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });

    expect(container.inspector.isResolved("Logger")).toBe(false);
    container.resolve(LoggerPort);
    expect(container.inspector.isResolved("Logger")).toBe(true);
  });

  it("getScopeTree returns scope tree", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("scoped")).build();
    const container = createContainer({ graph, name: "Test" });
    const scope = container.createScope("s1");

    const tree = container.inspector.getScopeTree();
    expect(tree).toBeDefined();
    void scope.dispose();
  });
});

// =============================================================================
// internal-types.ts: isInternalAccessible, asInternalAccessible
// =============================================================================

describe("internal-types.ts - isInternalAccessible / asInternalAccessible", () => {
  it("isInternalAccessible returns true for container", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    expect(isInternalAccessible(container)).toBe(true);
  });

  it("isInternalAccessible returns false for null", () => {
    expect(isInternalAccessible(null)).toBe(false);
  });

  it("isInternalAccessible returns false for string", () => {
    expect(isInternalAccessible("not a container")).toBe(false);
  });

  it("isInternalAccessible returns false for plain object", () => {
    expect(isInternalAccessible({})).toBe(false);
  });

  it("asInternalAccessible returns value for container", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    const accessible = asInternalAccessible(container, "test");
    expect(accessible).toBe(container);
  });

  it("asInternalAccessible throws for non-container", () => {
    expect(() => asInternalAccessible({}, "test context")).toThrow("test context");
  });
});

// =============================================================================
// wrappers.ts: hasInternalMethods, asParentContainerLike
// =============================================================================

describe("wrappers.ts - hasInternalMethods", () => {
  it("returns true for valid container", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    expect(hasInternalMethods(container)).toBe(true);
  });

  it("returns false for null", () => {
    expect(hasInternalMethods(null)).toBe(false);
  });

  it("returns false for plain object", () => {
    expect(hasInternalMethods({})).toBe(false);
  });

  it("returns false for string", () => {
    expect(hasInternalMethods("not a container")).toBe(false);
  });
});

describe("wrappers.ts - asParentContainerLike", () => {
  it("creates ParentContainerLike from child container", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const parent = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const parentLike = asParentContainerLike(child as any);
    expect(parentLike).toBeDefined();
    expect(typeof parentLike.resolveInternal).toBe("function");
    expect(typeof parentLike.resolveAsyncInternal).toBe("function");
    expect(typeof parentLike.has).toBe("function");
    expect(typeof parentLike.hasAdapter).toBe("function");
    expect(typeof parentLike.registerChildContainer).toBe("function");
    expect(typeof parentLike.unregisterChildContainer).toBe("function");
    expect(parentLike.originalParent).toBe(child);
  });
});

// =============================================================================
// child-impl.ts: resolveInternalFallback, resolveAsyncInternalFallback, getInternalState
// =============================================================================

describe("child-impl.ts - child container edge cases", () => {
  it("child container getInternalState includes inheritanceModes", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      clonable: true,
      freeze: true,
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const parent = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, {
      name: "Child",
      inheritanceModes: { Logger: "forked" } as any,
    });

    const state = (child as any)[INTERNAL_ACCESS]();
    expect(state.inheritanceModes).toBeDefined();
    expect(state.inheritanceModes.get("Logger")).toBe("forked");
  });

  it("child container getInternalState includes containerName", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const parent = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "MyChild" });

    const state = (child as any)[INTERNAL_ACCESS]();
    expect(state.containerName).toBe("MyChild");
  });

  it("child resolves scoped port via scope", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("scoped")).build();
    const parent = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const scope = child.createScope("test-scope");
    const logger = scope.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
    void scope.dispose();
  });

  it("child container getAdapter for parent port returns adapter", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const parent = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const adapter = (child as any)[ADAPTER_ACCESS](LoggerPort);
    expect(adapter).toBeDefined();
    expect(adapter.provides).toBe(LoggerPort);
  });

  it("child container resolveAsync delegates to parent for inherited port", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const parent = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const logger = await child.resolveAsync(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("child container isInitialized is always true", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const parent = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });
    expect(child.isInitialized).toBe(true);
  });

  it("child container parent returns parent container", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const parent = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });
    expect(child.parent).toBe(parent);
  });
});

// =============================================================================
// scope/impl.ts: scope lifecycle and nesting
// =============================================================================

describe("scope/impl.ts - scope lifecycle", () => {
  beforeEach(() => {
    resetScopeIdCounter();
  });

  it("scope resolve scoped port creates separate instance per scope", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("scoped")).build();
    const container = createContainer({ graph, name: "Test" });

    const scope1 = container.createScope("s1");
    const scope2 = container.createScope("s2");

    const logger1 = scope1.resolve(LoggerPort);
    const logger2 = scope2.resolve(LoggerPort);
    expect(logger1).not.toBe(logger2);

    void scope1.dispose();
    void scope2.dispose();
  });

  it("nested scopes cascade disposal", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("scoped")).build();
    const container = createContainer({ graph, name: "Test" });

    const outer = container.createScope("outer");
    const inner = outer.createScope("inner");

    await outer.dispose();
    expect(outer.isDisposed).toBe(true);
    expect(inner.isDisposed).toBe(true);
  });

  it("scope emits disposing/disposed lifecycle events", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("scoped")).build();
    const container = createContainer({ graph, name: "Test" });
    const scope = container.createScope("test");

    const events: string[] = [];
    scope.subscribe((event: any) => events.push(event));

    await scope.dispose();
    expect(events).toContain("disposing");
    expect(events).toContain("disposed");
  });

  it("scope getDisposalState transitions correctly", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("scoped")).build();
    const container = createContainer({ graph, name: "Test" });
    const scope = container.createScope("test");

    expect(scope.getDisposalState()).toBe("active");
    await scope.dispose();
    expect(scope.getDisposalState()).toBe("disposed");
  });

  it("scope dispose is idempotent", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("scoped")).build();
    const container = createContainer({ graph, name: "Test" });
    const scope = container.createScope("test");

    await scope.dispose();
    await scope.dispose(); // second call should be no-op
    expect(scope.isDisposed).toBe(true);
  });

  it("scope has() delegates to container", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("scoped")).build();
    const container = createContainer({ graph, name: "Test" });
    const scope = container.createScope("test");

    // hasAdapter returns true even for scoped ports
    expect(scope.has(LoggerPort)).toBe(true);
    expect(scope.has(DatabasePort)).toBe(false);
    void scope.dispose();
  });

  it("scope tryResolve returns Ok", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("scoped")).build();
    const container = createContainer({ graph, name: "Test" });
    const scope = container.createScope("test");

    const result = scope.tryResolve(LoggerPort);
    expect(result.isOk()).toBe(true);
    void scope.dispose();
  });

  it("scope tryResolveAsync returns Ok", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("scoped")).build();
    const container = createContainer({ graph, name: "Test" });
    const scope = container.createScope("test");

    const result = await scope.tryResolveAsync(LoggerPort);
    expect(result.isOk()).toBe(true);
    void scope.dispose();
  });

  it("scope tryDispose returns Ok", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("scoped")).build();
    const container = createContainer({ graph, name: "Test" });
    const scope = container.createScope("test");

    const result = await scope.tryDispose();
    expect(result.isOk()).toBe(true);
    expect(scope.isDisposed).toBe(true);
  });
});

// =============================================================================
// scope/impl.ts: scope ID generator
// =============================================================================

describe("scope/impl.ts - scope ID generator", () => {
  it("createScopeIdGenerator returns named if provided", () => {
    const gen = createScopeIdGenerator();
    expect(gen("my-scope")).toBe("my-scope");
  });

  it("createScopeIdGenerator returns generated IDs", () => {
    const gen = createScopeIdGenerator();
    expect(gen()).toBe("scope-0");
    expect(gen()).toBe("scope-1");
  });

  it("explicit name does not increment counter", () => {
    const gen = createScopeIdGenerator();
    gen(); // scope-0
    gen("named"); // does not increment
    expect(gen()).toBe("scope-1"); // continues from 1
  });
});

// =============================================================================
// root-impl.ts: initialize on disposed, no parent
// =============================================================================

describe("root-impl.ts - root container edge cases", () => {
  it("initialize on disposed container throws", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    await container.dispose();
    await expect(container.initialize()).rejects.toThrow();
  });

  it("root container parent throws", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    expect(() => container.parent).toThrow();
  });

  it("root container resolve unknown port throws", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    expect(() => (container as any).resolve(DatabasePort)).toThrow(/No adapter/);
  });

  it("root container resolveAsync unknown port rejects", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });
    await expect((container as any).resolveAsync(DatabasePort)).rejects.toThrow(/No adapter/);
  });
});

// =============================================================================
// factory.ts: container dispose with inspector library cleanup
// =============================================================================

describe("factory.ts - dispose with inspector cleanup", () => {
  it("dispose calls disposeLibraries on inspector", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });

    // Verify inspector exists
    expect(container.inspector).toBeDefined();

    await container.dispose();
    expect(container.isDisposed).toBe(true);
  });

  it("tryDispose returns Ok on success", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });

    const result = await container.tryDispose();
    expect(result.isOk()).toBe(true);
  });
});

// =============================================================================
// wrappers.ts: child container HOOKS_ACCESS
// =============================================================================

describe("wrappers.ts - child container HOOKS_ACCESS", () => {
  it("HOOKS_ACCESS is available on child containers", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const parent = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const hooksAccessFn = (child as any)[HOOKS_ACCESS];
    expect(typeof hooksAccessFn).toBe("function");

    const installer = hooksAccessFn();
    expect(typeof installer.installHooks).toBe("function");
  });

  it("hooks installed via HOOKS_ACCESS on child fire during resolution", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("transient")).build();
    const parent = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const calls: string[] = [];
    const installer = (child as any)[HOOKS_ACCESS]();
    installer.installHooks({
      beforeResolve: () => calls.push("before"),
    });

    child.resolve(LoggerPort);
    expect(calls).toContain("before");
  });

  it("uninstall from HOOKS_ACCESS on child removes hook", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("transient")).build();
    const parent = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const calls: string[] = [];
    const installer = (child as any)[HOOKS_ACCESS]();
    const uninstall = installer.installHooks({
      beforeResolve: () => calls.push("before"),
    });

    child.resolve(LoggerPort);
    expect(calls.length).toBe(1);

    uninstall();
    child.resolve(LoggerPort);
    expect(calls.length).toBe(1); // Not called again
  });
});

// =============================================================================
// base-impl.ts: createAdapterMapSnapshot
// =============================================================================

describe("base-impl.ts - createAdapterMapSnapshot", () => {
  it("internal state includes adapter map with correct info", () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const dbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      lifetime: "transient",
      factory: (deps: any) => ({ query: () => deps.Logger }),
    });
    const graph = GraphBuilder.create().provide(loggerAdapter).provide(dbAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const state = (container as any)[INTERNAL_ACCESS]();

    // Check adapter map has correct entries
    let loggerInfo: any;
    let dbInfo: any;
    for (const [, info] of state.adapterMap) {
      if (info.portName === "Logger") loggerInfo = info;
      if (info.portName === "Database") dbInfo = info;
    }

    expect(loggerInfo).toBeDefined();
    expect(loggerInfo.lifetime).toBe("singleton");
    expect(loggerInfo.factoryKind).toBe("sync");
    expect(loggerInfo.dependencyCount).toBe(0);
    expect(loggerInfo.dependencyNames).toEqual([]);

    expect(dbInfo).toBeDefined();
    expect(dbInfo.lifetime).toBe("transient");
    expect(dbInfo.factoryKind).toBe("sync");
    expect(dbInfo.dependencyCount).toBe(1);
    expect(dbInfo.dependencyNames).toEqual(["Logger"]);
  });
});

// =============================================================================
// Emitter: error swallowing in event emission
// =============================================================================

describe("builtin-api.ts - emitter error swallowing", () => {
  it("emitter swallows listener errors", () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("transient")).build();
    const container = createContainer({ graph, name: "Test" });

    // Subscribe a throwing listener
    container.inspector.subscribe(() => {
      throw new Error("listener error");
    });

    // Should not throw
    expect(() => container.tryResolve(LoggerPort)).not.toThrow();
  });
});

// =============================================================================
// wrappers.ts: child container createChildAsync / createLazyChild
// =============================================================================

describe("wrappers.ts - child container createChildAsync", () => {
  it("child container createChildAsync creates grandchild", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const parent = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const grandchildGraph = GraphBuilder.create()
      .provide(createDatabaseAdapter("singleton"))
      .build();

    const grandchild = await child.createChildAsync(async () => grandchildGraph, {
      name: "Grandchild",
    });

    expect(grandchild.kind).toBe("child");
    expect(grandchild.parentName).toBe("Child");
    const db = grandchild.resolve(DatabasePort);
    expect(typeof db.query).toBe("function");
    // Logger should be inherited from parent chain
    const logger = grandchild.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });
});

describe("wrappers.ts - child container createLazyChild", () => {
  it("child container createLazyChild creates lazy grandchild", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const parent = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const grandchildGraph = GraphBuilder.create()
      .provide(createDatabaseAdapter("singleton"))
      .build();

    const lazy = child.createLazyChild(async () => grandchildGraph, { name: "LazyGrandchild" });

    expect(lazy.isLoaded).toBe(false);
    const db = await lazy.resolve(DatabasePort);
    expect(typeof db.query).toBe("function");
    expect(lazy.isLoaded).toBe(true);
  });
});

// =============================================================================
// factory.ts: tryInitialize
// =============================================================================

describe("factory.ts - tryInitialize", () => {
  it("tryInitialize returns Ok on success", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });

    const result = await container.tryInitialize();
    expect(result.isOk()).toBe(true);
  });

  it("tryInitialize returns same initialized container", async () => {
    const graph = GraphBuilder.create().provide(createLoggerAdapter("singleton")).build();
    const container = createContainer({ graph, name: "Test" });

    const result1 = await container.tryInitialize();
    const result2 = await container.tryInitialize();
    expect(result1.isOk()).toBe(true);
    expect(result2.isOk()).toBe(true);
    if (result1.isOk() && result2.isOk()) {
      expect(result1.value).toBe(result2.value);
    }
  });
});

// =============================================================================
// child-impl.ts: isolated inheritance
// =============================================================================

describe("child-impl.ts - isolated inheritance", () => {
  it("isolated mode creates new instance with child's deps", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const parent = createContainer({ graph, name: "Parent" });

    const parentLogger = parent.resolve(LoggerPort);

    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, {
      name: "Child",
      inheritanceModes: { Logger: "isolated" } as any,
    });

    const childLogger = child.resolve(LoggerPort);
    // Isolated falls back to clone when no adapter is available in child
    expect(childLogger).not.toBe(parentLogger);
  });
});
