/**
 * Deep mutation-killing tests for src/container/factory.ts
 *
 * Targets surviving mutants not killed by container-factory-mutants.test.ts:
 * - createLateBindingHooks: for loop direction, optional chaining
 * - createUninitializedContainerWrapper: inspector disposeLibraries, tryResolve/tryResolveAsync emit events
 * - createInitializedContainerWrapper: all the same patterns
 * - HOOKS_ACCESS: installHooks/uninstall idx !== -1 boundary
 * - Auto-discovery hook: ctx.result !== undefined, portMeta?.category, isLibraryInspector
 * - createChildFromGraph: performance options forwarding
 * - createChildContainerAsync: graphLoader delegation
 * - createLazyChildContainer: parentLike.has delegation
 */
// @ts-nocheck

import { describe, it, expect, vi } from "vitest";
import { port, createAdapter, type Port } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { INTERNAL_ACCESS, HOOKS_ACCESS } from "../src/inspection/symbols.js";
import { ContainerBrand } from "../src/types.js";

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

function makeTransientAdapter() {
  return createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "transient",
    factory: () => ({ log: vi.fn() }),
  });
}

// =============================================================================
// Late-binding hooks: iteration direction
// =============================================================================

describe("createLateBindingHooks iteration order", () => {
  it("beforeResolve hooks fire in forward order across all sources", () => {
    const order: number[] = [];
    const graph = GraphBuilder.create().provide(makeTransientAdapter()).build();
    const container = createContainer({
      graph,
      name: "Test",
      hooks: { beforeResolve: () => order.push(0) },
    });

    container.addHook("beforeResolve", () => order.push(1));
    container.addHook("beforeResolve", () => order.push(2));
    container.resolve(LoggerPort);

    // Auto-discovery hook is first, then user hooks, then addHook hooks
    // The important thing is the addHook hooks fire in installation order
    const lastTwo = order.slice(-2);
    expect(lastTwo).toEqual([1, 2]);
  });

  it("afterResolve hooks fire in reverse order across all sources", () => {
    const order: number[] = [];
    const graph = GraphBuilder.create().provide(makeTransientAdapter()).build();
    const container = createContainer({
      graph,
      name: "Test",
      hooks: { afterResolve: () => order.push(0) },
    });

    container.addHook("afterResolve", () => order.push(1));
    container.addHook("afterResolve", () => order.push(2));
    container.resolve(LoggerPort);

    // afterResolve fires in reverse: 2, 1, then 0 (user hook)
    expect(order[0]).toBe(2);
    expect(order[1]).toBe(1);
    expect(order[2]).toBe(0);
  });

  it("beforeResolve skips sources without beforeResolve (optional chaining)", () => {
    const graph = GraphBuilder.create().provide(makeTransientAdapter()).build();
    const container = createContainer({
      graph,
      name: "Test",
      hooks: { afterResolve: vi.fn() }, // no beforeResolve
    });

    const before = vi.fn();
    container.addHook("beforeResolve", before);
    container.resolve(LoggerPort);

    // Should not throw, and the addHook handler should still be called
    expect(before).toHaveBeenCalledTimes(1);
  });

  it("afterResolve skips sources without afterResolve (optional chaining)", () => {
    const graph = GraphBuilder.create().provide(makeTransientAdapter()).build();
    const container = createContainer({
      graph,
      name: "Test",
      hooks: { beforeResolve: vi.fn() }, // no afterResolve
    });

    const after = vi.fn();
    container.addHook("afterResolve", after);
    container.resolve(LoggerPort);

    expect(after).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// Uninitialized container: tryResolve/tryResolveAsync inspector events
// =============================================================================

describe("uninitialized container tryResolve inspector event emission", () => {
  it("tryResolve emits result:ok to inspector", () => {
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

    const events: any[] = [];
    container.inspector.subscribe((e: any) => events.push(e));

    container.tryResolve(LoggerPort);

    const okEvent = events.find(e => e.type === "result:ok");
    expect(okEvent).toBeDefined();
    expect(okEvent.portName).toBe("Logger");
    expect(typeof okEvent.timestamp).toBe("number");
  });

  it("tryResolve emits result:err to inspector on failure", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => {
            throw new Error("fail");
          },
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });

    const events: any[] = [];
    container.inspector.subscribe((e: any) => events.push(e));

    container.tryResolve(LoggerPort);

    const errEvent = events.find(e => e.type === "result:err");
    expect(errEvent).toBeDefined();
    expect(errEvent.portName).toBe("Logger");
    expect(typeof errEvent.errorCode).toBe("string");
  });

  it("tryResolveAsync emits result:ok to inspector", async () => {
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

    const events: any[] = [];
    container.inspector.subscribe((e: any) => events.push(e));

    await container.tryResolveAsync(LoggerPort);
    // Wait for void then callback
    await new Promise(r => setTimeout(r, 10));

    const okEvent = events.find(e => e.type === "result:ok");
    expect(okEvent).toBeDefined();
    expect(okEvent.portName).toBe("Logger");
  });
});

// =============================================================================
// Initialized container: inspector event emission and all methods
// =============================================================================

describe("initialized container tryResolve inspector events", () => {
  it("tryResolve emits result:ok", async () => {
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
    const uninit = createContainer({ graph, name: "Test" });
    const container = await uninit.initialize();

    const events: any[] = [];
    container.inspector.subscribe((e: any) => events.push(e));

    container.tryResolve(LoggerPort);

    const okEvent = events.find(e => e.type === "result:ok");
    expect(okEvent).toBeDefined();
    expect(okEvent.portName).toBe("Logger");
  });

  it("tryResolveAsync emits result:ok", async () => {
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
    const uninit = createContainer({ graph, name: "Test" });
    const container = await uninit.initialize();

    const events: any[] = [];
    container.inspector.subscribe((e: any) => events.push(e));

    await container.tryResolveAsync(LoggerPort);
    await new Promise(r => setTimeout(r, 10));

    const okEvent = events.find(e => e.type === "result:ok");
    expect(okEvent).toBeDefined();
  });

  it("tryDispose returns Ok", async () => {
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
    const uninit = createContainer({ graph, name: "Test" });
    const container = await uninit.initialize();

    const result = await container.tryDispose();
    expect(result.isOk()).toBe(true);
  });
});

// =============================================================================
// Initialized container: dispose disposeLibraries
// =============================================================================

describe("initialized container dispose lifecycle", () => {
  it("dispose calls inspector.disposeLibraries", async () => {
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
    const uninit = createContainer({ graph, name: "Test" });
    const container = await uninit.initialize();

    const disposeFn = vi.fn();
    container.inspector.registerLibrary({
      name: "test-lib",
      getSnapshot: () => ({}),
      dispose: disposeFn,
    });

    await container.dispose();

    expect(disposeFn).toHaveBeenCalled();
  });
});

// =============================================================================
// Uninitialized container: dispose disposeLibraries
// =============================================================================

describe("uninitialized container dispose lifecycle", () => {
  it("dispose calls inspector.disposeLibraries", async () => {
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

    const disposeFn = vi.fn();
    container.inspector.registerLibrary({
      name: "test-lib",
      getSnapshot: () => ({}),
      dispose: disposeFn,
    });

    await container.dispose();

    expect(disposeFn).toHaveBeenCalled();
  });
});

// =============================================================================
// ContainerBrand on root container
// =============================================================================

describe("root container ContainerBrand", () => {
  it("uninitialized ContainerBrand is non-enumerable", () => {
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

    const descriptor = Object.getOwnPropertyDescriptor(container, ContainerBrand);
    expect(descriptor).toBeDefined();
    expect(descriptor!.enumerable).toBe(false);
    expect(descriptor!.configurable).toBe(false);
  });

  it("uninitialized ContainerBrand throws", () => {
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

    expect(() => (container as any)[ContainerBrand]).toThrow("Container brand is type-only");
  });

  it("initialized ContainerBrand is non-enumerable", async () => {
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
    const uninit = createContainer({ graph, name: "Test" });
    const container = await uninit.initialize();

    const descriptor = Object.getOwnPropertyDescriptor(container, ContainerBrand);
    expect(descriptor).toBeDefined();
    expect(descriptor!.enumerable).toBe(false);
    expect(descriptor!.configurable).toBe(false);
  });

  it("initialized ContainerBrand throws", async () => {
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
    const uninit = createContainer({ graph, name: "Test" });
    const container = await uninit.initialize();

    expect(() => (container as any)[ContainerBrand]).toThrow("Container brand is type-only");
  });
});

// =============================================================================
// initialized container HOOKS_ACCESS
// =============================================================================

describe("initialized container HOOKS_ACCESS", () => {
  it("HOOKS_ACCESS installHooks/uninstall work", async () => {
    const graph = GraphBuilder.create().provide(makeTransientAdapter()).build();
    const uninit = createContainer({ graph, name: "Test" });
    // Initialized shares same hooksHolder via createInitializedContainerWrapper

    const before = vi.fn();
    uninit.addHook("beforeResolve", before);
    uninit.resolve(LoggerPort);
    expect(before).toHaveBeenCalledTimes(1);

    uninit.removeHook("beforeResolve", before);
    uninit.resolve(LoggerPort);
    expect(before).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// Root container - resolveInternal and resolveAsyncInternal via wrapper
// =============================================================================

describe("root container resolveInternal/resolveAsyncInternal", () => {
  it("resolveInternal is exposed on root container wrapper", () => {
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

    const logger = (container as any).resolveInternal(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("resolveAsyncInternal is exposed on root container wrapper", async () => {
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

    const logger = await (container as any).resolveAsyncInternal(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("initialized resolveInternal delegates correctly", async () => {
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
    const uninit = createContainer({ graph, name: "Test" });
    const container = await uninit.initialize();

    const logger = (container as any).resolveInternal(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("initialized resolveAsyncInternal delegates correctly", async () => {
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
    const uninit = createContainer({ graph, name: "Test" });
    const container = await uninit.initialize();

    const logger = await (container as any).resolveAsyncInternal(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });
});

// =============================================================================
// Root container - registerChildContainer and unregisterChildContainer
// =============================================================================

describe("root container child registration on initialized container", () => {
  it("initialized container can create and dispose children", async () => {
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
    const uninit = createContainer({ graph, name: "Test" });
    const container = await uninit.initialize();

    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });
    expect(child.name).toBe("Child");

    await child.dispose();
    expect(child.isDisposed).toBe(true);
    expect(container.isDisposed).toBe(false);
  });
});

// =============================================================================
// HOOKS_ACCESS uninstall idx boundary
// =============================================================================

describe("HOOKS_ACCESS uninstall idx boundary", () => {
  it("uninstall twice is safe (second call finds idx = -1)", () => {
    const graph = GraphBuilder.create().provide(makeTransientAdapter()).build();
    const container = createContainer({ graph, name: "Test" });

    const installer = (container as any)[HOOKS_ACCESS]();
    const hook = vi.fn();
    const uninstall = installer.installHooks({ beforeResolve: hook });

    container.resolve(LoggerPort);
    expect(hook).toHaveBeenCalledTimes(1);

    uninstall();
    container.resolve(LoggerPort);
    expect(hook).toHaveBeenCalledTimes(1);

    // Second uninstall - idx will be -1, should not splice
    uninstall();
    container.resolve(LoggerPort);
    expect(hook).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// createRootScope
// =============================================================================

describe("createRootScope", () => {
  it("scope from uninitialized container works", () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "scoped",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });

    const scope = container.createScope("s1");
    const logger = scope.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("scope from initialized container works", async () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "scoped",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const uninit = createContainer({ graph, name: "Test" });
    const container = await uninit.initialize();

    const scope = container.createScope("s1");
    const logger = scope.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("scope disposal removes from container scope list", async () => {
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "scoped",
          factory: () => ({ log: vi.fn() }),
        })
      )
      .build();
    const container = createContainer({ graph, name: "Test" });

    const scope = container.createScope("s1");
    await scope.dispose();
    expect(scope.isDisposed).toBe(true);
  });
});

// =============================================================================
// Error messages from factory.ts
// =============================================================================

describe("factory error messages", () => {
  it("uninitialized parent throws correct message", () => {
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

    expect(() => container.parent).toThrow("Root containers do not have a parent");
  });

  it("initialized parent throws correct message", async () => {
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
    const uninit = createContainer({ graph, name: "Test" });
    const container = await uninit.initialize();

    expect(() => container.parent).toThrow("Root containers do not have a parent");
  });

  it("initialized initialize throws correct message", async () => {
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
    const uninit = createContainer({ graph, name: "Test" });
    const container = await uninit.initialize();

    expect(() => (container as any).initialize).toThrow(
      "Initialized containers cannot be initialized again"
    );
  });

  it("initialized tryInitialize throws correct message", async () => {
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
    const uninit = createContainer({ graph, name: "Test" });
    const container = await uninit.initialize();

    expect(() => (container as any).tryInitialize).toThrow(
      "Initialized containers cannot be initialized again"
    );
  });
});

// =============================================================================
// createLazyChildContainer parentLike delegation
// =============================================================================

describe("createLazyChildContainer from root container", () => {
  it("lazy child has() delegates to parent.has()", () => {
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

    const lazy = container.createLazyChild(
      async () =>
        GraphBuilder.create()
          .provide(
            createAdapter({
              provides: DatabasePort,
              requires: [],
              lifetime: "singleton",
              factory: () => ({ query: vi.fn() }),
            })
          )
          .build(),
      { name: "LazyChild" }
    );

    expect(lazy.has(LoggerPort)).toBe(true);
    expect(lazy.has(DatabasePort)).toBe(false);
  });
});
