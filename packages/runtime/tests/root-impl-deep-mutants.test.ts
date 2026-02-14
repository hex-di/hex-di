/**
 * Deep mutation-killing tests for src/container/root-impl.ts
 *
 * Targets survived mutants not killed by container-root-impl-mutants.test.ts:
 * - isRoot: exact true value
 * - containerNameValue: exact string
 * - createHooksRunner: null when no hooks, runner when hooks
 * - initializeFromGraph: adapter registration, async adapter tracking, adapterMap entries
 * - onWrapperSet: no-op
 * - getParent: returns undefined
 * - initialize: disposed check, async initializer execution, resolve order
 * - getParentUnregisterCallback: returns undefined
 * - resolveWithInheritance: always throws
 * - resolveInternalFallback: always throws with portName
 * - resolveAsyncInternalFallback: always rejects with portName
 * - getInternalState: containerId === "root"
 */
import { describe, it, expect, vi } from "vitest";
import { port, createAdapter, type Port } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { INTERNAL_ACCESS, ADAPTER_ACCESS } from "../src/inspection/symbols.js";
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

// =============================================================================
// isRoot
// =============================================================================

describe("RootContainerImpl isRoot deep", () => {
  it("isRoot returns exactly true for root container", () => {
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

    expect(container.kind).toBe("root");
    expect(container.kind).toStrictEqual("root");
  });

  it("child container kind is not 'root'", () => {
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
    const parent = createContainer({ graph, name: "Root" });
    const child = parent.createChild(GraphBuilder.create().build(), { name: "Child" });

    expect(child.kind).not.toBe("root");
  });
});

// =============================================================================
// containerNameValue / containerId
// =============================================================================

describe("RootContainerImpl containerId", () => {
  it("root containerId is exactly 'root'", () => {
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

    const state = container[INTERNAL_ACCESS]();
    expect(state.containerId).toBe("root");
    expect(state.containerId).toStrictEqual("root");
    expect(state.containerId).not.toBe("");
    expect(state.containerName).toBe("MyApp");
    expect(state.containerName).toStrictEqual("MyApp");
  });
});

// =============================================================================
// createHooksRunner
// =============================================================================

describe("RootContainerImpl hooks runner creation", () => {
  it("container without hooks resolves correctly (null runner)", () => {
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

    const logger = container.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("container with hooks creates a runner that fires on resolve", () => {
    const before = vi.fn();
    const after = vi.fn();
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "transient",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({
      graph,
      name: "Root",
      hooks: { beforeResolve: before, afterResolve: after },
    });

    container.resolve(LoggerPort);
    expect(before).toHaveBeenCalledTimes(1);
    expect(after).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// initializeFromGraph: adapter registration details
// =============================================================================

describe("RootContainerImpl adapter registration", () => {
  it("all adapters from graph are registered in adapterMap", () => {
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
          requires: [],
          lifetime: "transient",
          factory: () => ({ query: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Root" });

    const state = container[INTERNAL_ACCESS]();
    expect(state.adapterMap.size).toBe(2);

    const portNames: string[] = [];
    for (const [, info] of state.adapterMap) {
      portNames.push(info.portName);
    }
    expect(portNames).toContain("Logger");
    expect(portNames).toContain("Database");
  });

  it("async adapter is tracked separately", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: async () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Root" });

    // Sync resolve should throw AsyncInitializationRequiredError
    expect(() => container.resolve(LoggerPort)).toThrow(AsyncInitializationRequiredError);
  });
});

// =============================================================================
// initialize: async adapters
// =============================================================================

describe("RootContainerImpl initialize with async adapters", () => {
  it("initialize resolves async adapters and makes them sync-resolvable", async () => {
    let factoryCallCount = 0;
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: async () => {
            factoryCallCount++;
            return { log: vi.fn() };
          },
        })
      )
      .build();
    const uninit = createContainer({ graph, name: "Root" });

    // Before init, sync resolve should throw
    expect(() => uninit.resolve(LoggerPort)).toThrow(AsyncInitializationRequiredError);

    const container = await uninit.initialize();

    // After init, the factory was called via resolveAsyncInternal
    expect(factoryCallCount).toBe(1);

    // Sync resolve should now work because the singleton is memoized
    const logger = container.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("initialize throws when disposed", async () => {
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

    await container.dispose();
    await expect(container.initialize()).rejects.toThrow(DisposedScopeError);
  });
});

// =============================================================================
// getParent: returns undefined
// =============================================================================

describe("RootContainerImpl getParent", () => {
  it("parent accessor throws on root", () => {
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

    expect(() => container.parent).toThrow("Root containers do not have a parent");
  });
});

// =============================================================================
// resolveInternalFallback: always throws
// =============================================================================

describe("RootContainerImpl resolveInternalFallback", () => {
  it("throws error with portName for unregistered port", () => {
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
    const resolve = container.resolve as (port: Port<unknown, string>) => unknown;

    expect(() => resolve(DatabasePort)).toThrow();
    try {
      resolve(DatabasePort);
    } catch (e: any) {
      expect(e.message).toContain("Database");
    }
  });

  it("resolveAsync rejects with portName for unregistered port", async () => {
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
    const resolveAsync = container.resolveAsync as (
      port: Port<unknown, string>
    ) => Promise<unknown>;

    try {
      await resolveAsync(DatabasePort);
      expect.unreachable("should have thrown");
    } catch (e: any) {
      expect(e.message).toContain("Database");
    }
  });
});

// =============================================================================
// ADAPTER_ACCESS
// =============================================================================

describe("RootContainerImpl ADAPTER_ACCESS", () => {
  it("returns adapter for registered port", () => {
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

    const adapter = (container as any)[ADAPTER_ACCESS](LoggerPort);
    expect(adapter).toBeDefined();
    expect(adapter.provides).toBe(LoggerPort);
    expect(adapter.lifetime).toBe("singleton");
  });

  it("returns undefined for unregistered port", () => {
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

    const adapter = (container as any)[ADAPTER_ACCESS](DatabasePort);
    expect(adapter).toBeUndefined();
  });
});

// =============================================================================
// getInternalState
// =============================================================================

describe("RootContainerImpl getInternalState deep", () => {
  it("parentState is undefined for root", () => {
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

    const state = container[INTERNAL_ACCESS]();
    expect(state.parentState).toBeUndefined();
  });

  it("inheritanceModes is undefined for root", () => {
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

    const state = container[INTERNAL_ACCESS]();
    expect(state.inheritanceModes).toBeUndefined();
  });

  it("overridePorts is empty for root", () => {
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

    const state = container[INTERNAL_ACCESS]();
    expect(state.overridePorts.size).toBe(0);
  });
});
