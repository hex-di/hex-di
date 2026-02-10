/**
 * Deep mutation-killing tests for src/container/child-impl.ts
 *
 * Targets survived mutants not killed by container-child-impl-mutants.test.ts:
 * - ChildContainerImpl.isRoot === false (mutation: true)
 * - getContainerName returns exact string
 * - initializeFromParent: override loop, extension loop, adapter registration order
 * - resolveInternal: local override resolution, inherited fallback
 * - resolveInternalFallback: shared (parent.resolve), forked (shallowClone), isolated
 * - resolveAsyncInternalFallback: parent.resolveAsync delegation
 * - createIsolatedWithAdapter: factory invocation with correct dependencies
 * - getInternalState: all fields including containerId, containerName, inheritanceModes, overridePorts
 * - installHooks/uninstallHooks: hooks runner integration
 * - getSingletonMemo: returns correct memo
 * - dispose: disposes children, clears memo
 * - setWrapper/getWrapper
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
interface Config {
  get(key: string): string;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const CachePort = port<Cache>()({ name: "Cache" });
const ConfigPort = port<Config>()({ name: "Config" });

function makeRoot(...adapters: any[]) {
  let builder: any = GraphBuilder.create();
  for (const a of adapters) {
    builder = builder.provide(a);
  }
  return createContainer({ graph: builder.build(), name: "Root" });
}

// =============================================================================
// isRoot is false
// =============================================================================

describe("ChildContainerImpl isRoot", () => {
  it("child container kind is exactly 'child', not 'root'", () => {
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const parent = makeRoot(loggerAdapter);
    const child = parent.createChild(GraphBuilder.create().build(), { name: "C" });

    expect(child.kind).toBe("child");
    expect(child.kind).not.toBe("root");
    expect(child.kind).not.toBe("scope");
  });
});

// =============================================================================
// getContainerName
// =============================================================================

describe("ChildContainerImpl getContainerName", () => {
  it("returns the exact name string provided", () => {
    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      })
    );
    const child = parent.createChild(GraphBuilder.create().build(), { name: "ExactChildName" });
    const state = child[INTERNAL_ACCESS]();
    expect(state.containerName).toBe("ExactChildName");
    expect(state.containerName).not.toBe("");
  });
});

// =============================================================================
// initializeFromParent: overrides and extensions
// =============================================================================

describe("ChildContainerImpl override vs extension registration", () => {
  it("override adapter replaces parent adapter", () => {
    const parentLog = vi.fn();
    const childLog = vi.fn();

    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: parentLog }),
      })
    );

    const overrideAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: childLog }),
    });
    const child = parent.createChild(GraphBuilder.create().override(overrideAdapter).build(), {
      name: "C",
    });

    child.resolve(LoggerPort).log("test");
    expect(childLog).toHaveBeenCalledWith("test");
    expect(parentLog).not.toHaveBeenCalled();
  });

  it("extension adapter adds new capability", () => {
    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      })
    );

    const dbAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });
    const child = parent.createChild(GraphBuilder.create().provide(dbAdapter).build(), {
      name: "C",
    });

    expect(child.has(DatabasePort)).toBe(true);
    expect(child.has(LoggerPort)).toBe(true);
    expect(child.hasAdapter(DatabasePort)).toBe(true);
  });

  it("override adapter is reflected in overridePorts", () => {
    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      })
    );
    const overrideAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const child = parent.createChild(GraphBuilder.create().override(overrideAdapter).build(), {
      name: "C",
    });
    const state = child[INTERNAL_ACCESS]();
    expect(state.overridePorts.has("Logger")).toBe(true);
  });
});

// =============================================================================
// resolveInternal: local vs parent fallback
// =============================================================================

describe("ChildContainerImpl resolve: local override vs parent fallback", () => {
  it("resolve returns local override when available", () => {
    const parentLog = vi.fn();
    const childLog = vi.fn();

    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: parentLog }),
      })
    );
    const child = parent.createChild(
      GraphBuilder.create()
        .override(
          createAdapter({
            provides: LoggerPort,
            requires: [],
            lifetime: "singleton",
            factory: () => ({ log: childLog }),
          })
        )
        .build(),
      { name: "C" }
    );

    child.resolve(LoggerPort).log("hi");
    expect(childLog).toHaveBeenCalledWith("hi");
    expect(parentLog).not.toHaveBeenCalled();
  });

  it("resolve falls back to parent for non-overridden port", () => {
    const parentLog = vi.fn();
    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: parentLog }),
      })
    );
    const child = parent.createChild(GraphBuilder.create().build(), { name: "C" });

    child.resolve(LoggerPort).log("hi");
    expect(parentLog).toHaveBeenCalledWith("hi");
  });
});

// =============================================================================
// resolveInternalFallback: forked mode
// =============================================================================

describe("ChildContainerImpl forked inheritance mode", () => {
  it("forked mode creates a clone of parent instance", () => {
    const parentLog = vi.fn();
    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        clonable: true,
        factory: () => ({ log: parentLog }),
      })
    );
    // Resolve in parent first to have a cached instance
    const parentLogger = parent.resolve(LoggerPort);

    const child = parent.createChild(GraphBuilder.create().build(), {
      name: "C",
      inheritanceModes: { Logger: "forked" } as any,
    });

    const childLogger = child.resolve(LoggerPort);
    // Forked creates a shallow clone, so it should NOT be the same reference
    expect(childLogger).not.toBe(parentLogger);
    // But it should have the same structure
    expect(typeof childLogger.log).toBe("function");
  });
});

// =============================================================================
// resolveInternalFallback: isolated mode
// =============================================================================

describe("ChildContainerImpl isolated inheritance mode", () => {
  it("isolated mode creates a fresh instance via adapter factory", () => {
    const factoryCallCount = vi.fn();
    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => {
          factoryCallCount();
          return { log: vi.fn() };
        },
      })
    );

    // Resolve in parent first
    parent.resolve(LoggerPort);
    expect(factoryCallCount).toHaveBeenCalledTimes(1);

    const child = parent.createChild(GraphBuilder.create().build(), {
      name: "C",
      inheritanceModes: { Logger: "isolated" } as any,
    });

    child.resolve(LoggerPort);
    // Factory should be called again for isolated mode
    expect(factoryCallCount).toHaveBeenCalledTimes(2);
  });
});

// =============================================================================
// resolveAsync delegates correctly
// =============================================================================

describe("ChildContainerImpl resolveAsync", () => {
  it("resolveAsync returns correct instance for inherited port", async () => {
    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      })
    );
    const child = parent.createChild(GraphBuilder.create().build(), { name: "C" });

    const logger = await child.resolveAsync(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("resolveAsync returns correct instance for own extension port", async () => {
    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      })
    );
    const child = parent.createChild(
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
      { name: "C" }
    );

    const db = await child.resolveAsync(DatabasePort);
    expect(typeof db.query).toBe("function");
  });
});

// =============================================================================
// getInternalState: all fields
// =============================================================================

describe("ChildContainerImpl getInternalState", () => {
  it("returns complete state with all fields", () => {
    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      })
    );
    const child = parent.createChild(
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
      { name: "MyChild" }
    );

    const state = child[INTERNAL_ACCESS]();

    expect(state.containerName).toBe("MyChild");
    expect(state.containerId).toBeDefined();
    expect(state.containerId).not.toBe("root");
    expect(state.containerId).not.toBe("");
    expect(state.disposed).toBe(false);
    expect(state.adapterMap).toBeDefined();
    expect(state.adapterMap.size).toBeGreaterThan(0);
    expect(state.singletonMemo).toBeDefined();
    expect(state.childScopes).toBeDefined();
    expect(state.childContainers).toBeDefined();
    expect(state.overridePorts).toBeDefined();
    expect(state.inheritanceModes).toBeDefined();
  });

  it("containerId is unique per child", () => {
    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      })
    );
    const c1 = parent.createChild(GraphBuilder.create().build(), { name: "C1" });
    const c2 = parent.createChild(GraphBuilder.create().build(), { name: "C2" });

    const s1 = c1[INTERNAL_ACCESS]();
    const s2 = c2[INTERNAL_ACCESS]();

    expect(s1.containerId).not.toBe(s2.containerId);
  });
});

// =============================================================================
// dispose: disposes children and scope
// =============================================================================

describe("ChildContainerImpl dispose cascades", () => {
  it("disposing child disposes its scopes", async () => {
    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: vi.fn() }),
      })
    );
    const child = parent.createChild(GraphBuilder.create().build(), { name: "C" });
    const scope = child.createScope("s1");

    await child.dispose();
    expect(child.isDisposed).toBe(true);
    expect(scope.isDisposed).toBe(true);
  });

  it("disposing child disposes its grandchildren", async () => {
    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      })
    );
    const child = parent.createChild(GraphBuilder.create().build(), { name: "C" });
    const grandchild = child.createChild(GraphBuilder.create().build(), { name: "GC" });

    await child.dispose();
    expect(child.isDisposed).toBe(true);
    expect(grandchild.isDisposed).toBe(true);
  });

  it("resolve throws DisposedScopeError after disposal", async () => {
    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      })
    );
    const child = parent.createChild(GraphBuilder.create().build(), { name: "C" });

    await child.dispose();
    expect(() => child.resolve(LoggerPort)).toThrow(DisposedScopeError);
  });

  it("resolveAsync rejects with DisposedScopeError after disposal", async () => {
    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      })
    );
    const child = parent.createChild(GraphBuilder.create().build(), { name: "C" });

    await child.dispose();
    await expect(child.resolveAsync(LoggerPort)).rejects.toThrow(DisposedScopeError);
  });
});

// =============================================================================
// has: exact return values
// =============================================================================

describe("ChildContainerImpl has() exact return values", () => {
  it("returns true for inherited singleton", () => {
    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      })
    );
    const child = parent.createChild(GraphBuilder.create().build(), { name: "C" });
    expect(child.has(LoggerPort)).toStrictEqual(true);
  });

  it("returns true for extension singleton", () => {
    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      })
    );
    const child = parent.createChild(
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
      { name: "C" }
    );
    expect(child.has(DatabasePort)).toStrictEqual(true);
  });

  it("returns false for unregistered port", () => {
    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      })
    );
    const child = parent.createChild(GraphBuilder.create().build(), { name: "C" });
    expect(child.has(CachePort)).toStrictEqual(false);
  });

  it("returns false for scoped port on root scope", () => {
    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: vi.fn() }),
      })
    );
    const child = parent.createChild(GraphBuilder.create().build(), { name: "C" });
    expect(child.has(LoggerPort)).toStrictEqual(false);
  });
});

// =============================================================================
// ADAPTER_ACCESS
// =============================================================================

describe("ChildContainerImpl ADAPTER_ACCESS", () => {
  it("returns adapter for registered port", () => {
    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      })
    );
    const child = parent.createChild(
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
      { name: "C" }
    );

    const adapter = (child as any)[ADAPTER_ACCESS](DatabasePort);
    expect(adapter).toBeDefined();
    expect(adapter.provides).toBe(DatabasePort);
  });

  it("returns undefined for unregistered port", () => {
    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      })
    );
    const child = parent.createChild(GraphBuilder.create().build(), { name: "C" });

    const adapter = (child as any)[ADAPTER_ACCESS](CachePort);
    expect(adapter).toBeUndefined();
  });
});

// =============================================================================
// hooks via child container
// =============================================================================

describe("ChildContainerImpl hooks via wrapper", () => {
  it("beforeResolve hook fires for transient resolution", () => {
    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => ({ log: vi.fn() }),
      })
    );
    const child = parent.createChild(GraphBuilder.create().build(), { name: "C" });

    const before = vi.fn();
    child.addHook("beforeResolve", before);
    child.resolve(LoggerPort);

    expect(before).toHaveBeenCalledTimes(1);
  });

  it("afterResolve hook fires for transient resolution", () => {
    const parent = makeRoot(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => ({ log: vi.fn() }),
      })
    );
    const child = parent.createChild(GraphBuilder.create().build(), { name: "C" });

    const after = vi.fn();
    child.addHook("afterResolve", after);
    child.resolve(LoggerPort);

    expect(after).toHaveBeenCalledTimes(1);
  });
});
