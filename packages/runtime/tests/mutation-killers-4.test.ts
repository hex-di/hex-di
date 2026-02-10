/**
 * Fourth batch of mutation-killing tests.
 *
 * Targets:
 * - resolution/core.ts: getMemoForLifetime, resolveWithMemo, buildDependencies
 * - util/memo-map.ts: dispose LIFO, fork, parent chain, getIfPresent, memoizeOwn
 * - container/id-generator.ts: generation, reset
 * - container/override-builder.ts: OverrideBuilder fluent API
 * - container/wrappers.ts: createChildAsync, createLazyChild wrappers, addHook/removeHook on child
 * - scope/lifecycle-events.ts: ScopeLifecycleEmitter emit/subscribe/clear
 * - resolution/context.ts: ResolutionContext enter/exit/isCircular
 * - container/factory.ts: initialized container hooks composition edge cases
 * - child-impl.ts: getAdapter, hasAdapter, getParent, forked inheritance
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { INTERNAL_ACCESS, HOOKS_ACCESS } from "../src/inspection/symbols.js";
import {
  getMemoForLifetime,
  resolveWithMemo,
  resolveWithMemoAsync,
  buildDependencies,
  buildDependenciesAsync,
} from "../src/resolution/core.js";
import { MemoMap } from "../src/util/memo-map.js";
import {
  createContainerIdGenerator,
  generateChildContainerId,
  resetChildContainerIdCounter,
} from "../src/container/id-generator.js";
import { ResolutionContext } from "../src/resolution/context.js";
import { ScopeLifecycleEmitter } from "../src/scope/lifecycle-events.js";
import { resetScopeIdCounter } from "../src/scope/impl.js";
import { DisposedScopeError, CircularDependencyError } from "../src/errors/index.js";

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

// =============================================================================
// resolution/core.ts
// =============================================================================

describe("resolution/core.ts mutation killers", () => {
  describe("getMemoForLifetime", () => {
    it("returns singletonMemo for 'singleton'", () => {
      const singletonMemo = new MemoMap();
      const scopedMemo = new MemoMap();
      const result = getMemoForLifetime("singleton", singletonMemo, scopedMemo);
      expect(result).toBe(singletonMemo);
    });

    it("returns scopedMemo for 'scoped'", () => {
      const singletonMemo = new MemoMap();
      const scopedMemo = new MemoMap();
      const result = getMemoForLifetime("scoped", singletonMemo, scopedMemo);
      expect(result).toBe(scopedMemo);
    });

    it("returns null for 'transient'", () => {
      const singletonMemo = new MemoMap();
      const scopedMemo = new MemoMap();
      const result = getMemoForLifetime("transient", singletonMemo, scopedMemo);
      expect(result).toBeNull();
    });

    it("throws for unknown lifetime", () => {
      const singletonMemo = new MemoMap();
      const scopedMemo = new MemoMap();
      expect(() => getMemoForLifetime("unknown" as any, singletonMemo, scopedMemo)).toThrow(
        /Unknown lifetime/
      );
    });
  });

  describe("resolveWithMemo", () => {
    it("caches singleton in singletonMemo", () => {
      const singletonMemo = new MemoMap();
      const scopedMemo = new MemoMap();
      const factory = vi.fn(() => "instance");

      const result1 = resolveWithMemo(
        LoggerPort,
        "singleton",
        singletonMemo,
        scopedMemo,
        factory as any
      );
      const result2 = resolveWithMemo(
        LoggerPort,
        "singleton",
        singletonMemo,
        scopedMemo,
        factory as any
      );

      expect(result1).toBe("instance");
      expect(result2).toBe("instance");
      expect(factory).toHaveBeenCalledTimes(1); // Cached after first call
    });

    it("caches scoped in scopedMemo", () => {
      const singletonMemo = new MemoMap();
      const scopedMemo = new MemoMap();
      const factory = vi.fn(() => "scoped-instance");

      const result1 = resolveWithMemo(
        LoggerPort,
        "scoped",
        singletonMemo,
        scopedMemo,
        factory as any
      );
      const result2 = resolveWithMemo(
        LoggerPort,
        "scoped",
        singletonMemo,
        scopedMemo,
        factory as any
      );

      expect(result1).toBe("scoped-instance");
      expect(result2).toBe("scoped-instance");
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("does not cache transient", () => {
      const singletonMemo = new MemoMap();
      const scopedMemo = new MemoMap();
      let callCount = 0;
      const factory = () => {
        callCount++;
        return { log: vi.fn() };
      };

      const result1 = resolveWithMemo(LoggerPort, "transient", singletonMemo, scopedMemo, factory);
      const result2 = resolveWithMemo(LoggerPort, "transient", singletonMemo, scopedMemo, factory);

      expect(result1).not.toBe(result2);
      expect(callCount).toBe(2);
    });
  });

  describe("resolveWithMemoAsync", () => {
    it("caches singleton async", async () => {
      const singletonMemo = new MemoMap();
      const scopedMemo = new MemoMap();
      const factory = vi.fn(async () => "async-singleton");

      const result1 = await resolveWithMemoAsync(
        LoggerPort,
        "singleton",
        singletonMemo,
        scopedMemo,
        factory as any
      );
      const result2 = await resolveWithMemoAsync(
        LoggerPort,
        "singleton",
        singletonMemo,
        scopedMemo,
        factory as any
      );

      expect(result1).toBe("async-singleton");
      expect(result2).toBe("async-singleton");
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("does not cache transient async", async () => {
      const singletonMemo = new MemoMap();
      const scopedMemo = new MemoMap();
      let callCount = 0;
      const factory = async () => {
        callCount++;
        return { log: vi.fn() };
      };

      const result1 = await resolveWithMemoAsync(
        LoggerPort,
        "transient",
        singletonMemo,
        scopedMemo,
        factory
      );
      const result2 = await resolveWithMemoAsync(
        LoggerPort,
        "transient",
        singletonMemo,
        scopedMemo,
        factory
      );

      expect(result1).not.toBe(result2);
      expect(callCount).toBe(2);
    });
  });

  describe("buildDependencies", () => {
    it("builds deps record from required ports", () => {
      const resolve = (p: any) => `resolved-${p.__portName}`;
      const deps = buildDependencies([LoggerPort, DatabasePort], resolve);

      expect(deps["Logger"]).toBe("resolved-Logger");
      expect(deps["Database"]).toBe("resolved-Database");
    });

    it("returns empty record for empty requires", () => {
      const deps = buildDependencies([], vi.fn());
      expect(Object.keys(deps).length).toBe(0);
    });
  });

  describe("buildDependenciesAsync", () => {
    it("builds deps record asynchronously", async () => {
      const resolve = async (p: any) => `async-${p.__portName}`;
      const deps = await buildDependenciesAsync([LoggerPort], resolve);

      expect(deps["Logger"]).toBe("async-Logger");
    });

    it("resolves multiple deps concurrently", async () => {
      const order: string[] = [];
      const resolve = async (p: any) => {
        order.push(p.__portName);
        return `resolved-${p.__portName}`;
      };

      const deps = await buildDependenciesAsync([LoggerPort, DatabasePort], resolve);
      expect(deps["Logger"]).toBe("resolved-Logger");
      expect(deps["Database"]).toBe("resolved-Database");
      // Both should have been started (Promise.all)
      expect(order.length).toBe(2);
    });
  });
});

// =============================================================================
// util/memo-map.ts
// =============================================================================

describe("MemoMap mutation killers", () => {
  describe("has()", () => {
    it("returns false for empty memo", () => {
      const memo = new MemoMap();
      expect(memo.has(LoggerPort)).toBe(false);
    });

    it("returns true after memoize", () => {
      const memo = new MemoMap();
      memo.getOrElseMemoize(LoggerPort, () => ({ log: vi.fn() }), undefined);
      expect(memo.has(LoggerPort)).toBe(true);
    });

    it("returns false for different port", () => {
      const memo = new MemoMap();
      memo.getOrElseMemoize(LoggerPort, () => ({ log: vi.fn() }), undefined);
      expect(memo.has(DatabasePort)).toBe(false);
    });
  });

  describe("has() with parent chain", () => {
    it("returns true when parent has port", () => {
      const parent = new MemoMap();
      parent.getOrElseMemoize(LoggerPort, () => ({ log: vi.fn() }), undefined);

      const child = new MemoMap(parent);
      expect(child.has(LoggerPort)).toBe(true);
    });

    it("returns false when neither child nor parent has port", () => {
      const parent = new MemoMap();
      const child = new MemoMap(parent);
      expect(child.has(LoggerPort)).toBe(false);
    });
  });

  describe("getIfPresent()", () => {
    it("returns undefined for empty memo", () => {
      const memo = new MemoMap();
      expect(memo.getIfPresent(LoggerPort)).toBeUndefined();
    });

    it("returns instance after memoize", () => {
      const memo = new MemoMap();
      const logger = { log: vi.fn() };
      memo.getOrElseMemoize(LoggerPort, () => logger, undefined);
      expect(memo.getIfPresent(LoggerPort)).toBe(logger);
    });

    it("returns from parent when not in child", () => {
      const parent = new MemoMap();
      const logger = { log: vi.fn() };
      parent.getOrElseMemoize(LoggerPort, () => logger, undefined);

      const child = new MemoMap(parent);
      expect(child.getIfPresent(LoggerPort)).toBe(logger);
    });

    it("returns undefined when port not in chain", () => {
      const parent = new MemoMap();
      parent.getOrElseMemoize(LoggerPort, () => ({ log: vi.fn() }), undefined);

      const child = new MemoMap(parent);
      expect(child.getIfPresent(DatabasePort)).toBeUndefined();
    });
  });

  describe("memoizeOwn()", () => {
    it("does not check parent cache", () => {
      const parentLogger = { log: vi.fn() };
      const childLogger = { log: vi.fn() };

      const parent = new MemoMap();
      parent.getOrElseMemoize(LoggerPort, () => parentLogger, undefined);

      const child = new MemoMap(parent);
      const result = child.memoizeOwn(LoggerPort, () => childLogger, undefined);

      expect(result).toBe(childLogger);
      expect(result).not.toBe(parentLogger);
    });

    it("caches in own cache after first call", () => {
      const memo = new MemoMap();
      let callCount = 0;
      const factory = () => {
        callCount++;
        return { log: vi.fn() };
      };

      const result1 = memo.memoizeOwn(LoggerPort, factory, undefined);
      const result2 = memo.memoizeOwn(LoggerPort, factory, undefined);

      expect(result1).toBe(result2);
      expect(callCount).toBe(1);
    });
  });

  describe("fork()", () => {
    it("creates child with parent reference", () => {
      const parent = new MemoMap();
      parent.getOrElseMemoize(LoggerPort, () => ({ log: vi.fn() }), undefined);

      const child = parent.fork();
      expect(child.has(LoggerPort)).toBe(true);
      expect(child.getIfPresent(LoggerPort)).toBe(parent.getIfPresent(LoggerPort));
    });

    it("child has independent cache", () => {
      const parent = new MemoMap();
      const child = parent.fork();

      child.getOrElseMemoize(DatabasePort, () => ({ query: vi.fn() }), undefined);
      expect(child.has(DatabasePort)).toBe(true);
      expect(parent.has(DatabasePort)).toBe(false);
    });
  });

  describe("dispose()", () => {
    it("calls finalizers in LIFO order", async () => {
      const order: string[] = [];
      const memo = new MemoMap();

      memo.getOrElseMemoize(
        LoggerPort,
        () => ({ log: vi.fn() }),
        () => {
          order.push("Logger");
        }
      );
      memo.getOrElseMemoize(
        DatabasePort,
        () => ({ query: vi.fn() }),
        () => {
          order.push("Database");
        }
      );

      await memo.dispose();

      expect(order).toEqual(["Database", "Logger"]); // LIFO
    });

    it("sets isDisposed to true", async () => {
      const memo = new MemoMap();
      expect(memo.isDisposed).toBe(false);
      await memo.dispose();
      expect(memo.isDisposed).toBe(true);
    });

    it("aggregates errors from multiple finalizers", async () => {
      const memo = new MemoMap();
      memo.getOrElseMemoize(
        LoggerPort,
        () => ({ log: vi.fn() }),
        () => {
          throw new Error("Logger fail");
        }
      );
      memo.getOrElseMemoize(
        DatabasePort,
        () => ({ query: vi.fn() }),
        () => {
          throw new Error("DB fail");
        }
      );

      await expect(memo.dispose()).rejects.toThrow(AggregateError);
    });

    it("clears cache after dispose", async () => {
      const memo = new MemoMap();
      memo.getOrElseMemoize(LoggerPort, () => ({ log: vi.fn() }), undefined);

      expect(memo.has(LoggerPort)).toBe(true);
      await memo.dispose();
      expect(memo.has(LoggerPort)).toBe(false);
    });

    it("is fine with no entries", async () => {
      const memo = new MemoMap();
      await memo.dispose();
      expect(memo.isDisposed).toBe(true);
    });
  });

  describe("entries()", () => {
    it("yields entries in creation order", () => {
      const memo = new MemoMap();
      memo.getOrElseMemoize(LoggerPort, () => ({ log: vi.fn() }), undefined);
      memo.getOrElseMemoize(DatabasePort, () => ({ query: vi.fn() }), undefined);

      const entries = [...memo.entries()];
      expect(entries.length).toBe(2);
      expect(entries[0][0]).toBe(LoggerPort);
      expect(entries[1][0]).toBe(DatabasePort);
    });

    it("yields empty for empty memo", () => {
      const memo = new MemoMap();
      const entries = [...memo.entries()];
      expect(entries.length).toBe(0);
    });

    it("entry metadata has resolvedAt and resolutionOrder", () => {
      const memo = new MemoMap();
      memo.getOrElseMemoize(LoggerPort, () => ({ log: vi.fn() }), undefined);

      const entries = [...memo.entries()];
      expect(entries[0][1].resolvedAt).toBeGreaterThan(0);
      expect(entries[0][1].resolutionOrder).toBe(0);
    });
  });

  describe("getOrElseMemoizeAsync()", () => {
    it("caches after first async call", async () => {
      const memo = new MemoMap();
      let callCount = 0;
      const factory = async () => {
        callCount++;
        return { log: vi.fn() };
      };

      const a = await memo.getOrElseMemoizeAsync(LoggerPort, factory, undefined);
      const b = await memo.getOrElseMemoizeAsync(LoggerPort, factory, undefined);
      expect(a).toBe(b);
      expect(callCount).toBe(1);
    });

    it("checks parent cache first", async () => {
      const parent = new MemoMap();
      const logger = { log: vi.fn() };
      parent.getOrElseMemoize(LoggerPort, () => logger, undefined);

      const child = new MemoMap(parent);
      const result = await child.getOrElseMemoizeAsync(
        LoggerPort,
        async () => ({ log: vi.fn() }),
        undefined
      );
      expect(result).toBe(logger);
    });
  });

  describe("MemoMapConfig captureTimestamps", () => {
    it("captures timestamps by default", () => {
      const memo = new MemoMap();
      memo.getOrElseMemoize(LoggerPort, () => ({ log: vi.fn() }), undefined);

      const entries = [...memo.entries()];
      expect(entries[0][1].resolvedAt).toBeGreaterThan(0);
    });

    it("sets resolvedAt to 0 when captureTimestamps is false", () => {
      const memo = new MemoMap(undefined, { captureTimestamps: false });
      memo.getOrElseMemoize(LoggerPort, () => ({ log: vi.fn() }), undefined);

      const entries = [...memo.entries()];
      expect(entries[0][1].resolvedAt).toBe(0);
    });
  });
});

// =============================================================================
// container/id-generator.ts
// =============================================================================

describe("id-generator.ts mutation killers", () => {
  describe("createContainerIdGenerator", () => {
    it("generates sequential IDs starting from 1", () => {
      const gen = createContainerIdGenerator();
      expect(gen()).toBe("child-1");
      expect(gen()).toBe("child-2");
      expect(gen()).toBe("child-3");
    });

    it("isolated generators have independent counters", () => {
      const gen1 = createContainerIdGenerator();
      const gen2 = createContainerIdGenerator();
      expect(gen1()).toBe("child-1");
      expect(gen2()).toBe("child-1");
      expect(gen1()).toBe("child-2");
      expect(gen2()).toBe("child-2");
    });
  });

  describe("generateChildContainerId / resetChildContainerIdCounter", () => {
    beforeEach(() => {
      resetChildContainerIdCounter();
    });

    it("generates from default generator", () => {
      const id1 = generateChildContainerId();
      expect(id1).toBe("child-1");
      const id2 = generateChildContainerId();
      expect(id2).toBe("child-2");
    });

    it("reset restarts counter", () => {
      generateChildContainerId(); // child-1
      generateChildContainerId(); // child-2
      resetChildContainerIdCounter();

      const id = generateChildContainerId();
      expect(id).toBe("child-1");
    });
  });
});

// =============================================================================
// resolution/context.ts - ResolutionContext
// =============================================================================

describe("ResolutionContext mutation killers", () => {
  describe("enter/exit", () => {
    it("enter adds to path", () => {
      const ctx = new ResolutionContext();
      ctx.enter("Logger");
      expect(ctx.getPath()).toContain("Logger");
    });

    it("exit removes from path", () => {
      const ctx = new ResolutionContext();
      ctx.enter("Logger");
      ctx.exit("Logger");
      expect(ctx.getPath()).not.toContain("Logger");
    });

    it("getPath returns empty for non-entered port", () => {
      const ctx = new ResolutionContext();
      expect(ctx.getPath()).toEqual([]);
    });

    it("nested enter/exit works correctly", () => {
      const ctx = new ResolutionContext();
      ctx.enter("Logger");
      ctx.enter("Database");
      expect(ctx.getPath()).toContain("Logger");
      expect(ctx.getPath()).toContain("Database");

      ctx.exit("Database");
      expect(ctx.getPath()).toContain("Logger");
      expect(ctx.getPath()).not.toContain("Database");

      ctx.exit("Logger");
      expect(ctx.getPath()).not.toContain("Logger");
    });
  });

  describe("getPath", () => {
    it("returns current path as array", () => {
      const ctx = new ResolutionContext();
      ctx.enter("Logger");
      ctx.enter("Database");

      const path = ctx.getPath();
      expect(path).toEqual(["Logger", "Database"]);
    });

    it("returns empty array for empty context", () => {
      const ctx = new ResolutionContext();
      expect(ctx.getPath()).toEqual([]);
    });

    it("returns a defensive copy", () => {
      const ctx = new ResolutionContext();
      ctx.enter("Logger");
      const path1 = ctx.getPath();
      const path2 = ctx.getPath();
      expect(path1).toEqual(path2);
      expect(path1).not.toBe(path2); // Different array instances
    });
  });

  describe("circular dependency detection", () => {
    it("throws CircularDependencyError on re-enter", () => {
      const ctx = new ResolutionContext();
      ctx.enter("Logger");
      expect(() => ctx.enter("Logger")).toThrow(CircularDependencyError);
    });

    it("includes full chain in error", () => {
      const ctx = new ResolutionContext();
      ctx.enter("Logger");
      ctx.enter("Database");
      try {
        ctx.enter("Logger");
        expect.unreachable("Should have thrown");
      } catch (err: any) {
        expect(err).toBeInstanceOf(CircularDependencyError);
        expect(err.message).toContain("Logger");
        expect(err.message).toContain("Database");
      }
    });
  });
});

// =============================================================================
// scope/lifecycle-events.ts - ScopeLifecycleEmitter
// =============================================================================

describe("ScopeLifecycleEmitter mutation killers", () => {
  describe("emit and subscribe", () => {
    it("emits events to subscribers", () => {
      const emitter = new ScopeLifecycleEmitter();
      const events: string[] = [];
      emitter.subscribe(event => events.push(event));

      emitter.emit("disposing");
      expect(events).toEqual(["disposing"]);
    });

    it("multiple subscribers all receive events", () => {
      const emitter = new ScopeLifecycleEmitter();
      const events1: string[] = [];
      const events2: string[] = [];
      emitter.subscribe(event => events1.push(event));
      emitter.subscribe(event => events2.push(event));

      emitter.emit("disposing");
      expect(events1).toEqual(["disposing"]);
      expect(events2).toEqual(["disposing"]);
    });

    it("unsubscribe removes listener", () => {
      const emitter = new ScopeLifecycleEmitter();
      const events: string[] = [];
      const unsub = emitter.subscribe(event => events.push(event));

      emitter.emit("disposing");
      expect(events.length).toBe(1);

      unsub();
      emitter.emit("disposed");
      expect(events.length).toBe(1); // Not called again
    });
  });

  describe("getState", () => {
    it("returns 'active' initially", () => {
      const emitter = new ScopeLifecycleEmitter();
      expect(emitter.getState()).toBe("active");
    });
  });

  describe("emit transitions state", () => {
    it("transitions through states correctly", () => {
      const emitter = new ScopeLifecycleEmitter();
      expect(emitter.getState()).toBe("active");

      emitter.emit("disposing");
      expect(emitter.getState()).toBe("disposing");

      emitter.emit("disposed");
      expect(emitter.getState()).toBe("disposed");
    });

    it("disposing event sets state to disposing", () => {
      const emitter = new ScopeLifecycleEmitter();
      emitter.emit("disposing");
      expect(emitter.getState()).toBe("disposing");
    });

    it("disposed event sets state to disposed", () => {
      const emitter = new ScopeLifecycleEmitter();
      emitter.emit("disposed");
      expect(emitter.getState()).toBe("disposed");
    });

    it("swallows listener errors during emit", () => {
      const emitter = new ScopeLifecycleEmitter();
      emitter.subscribe(() => {
        throw new Error("listener error");
      });

      // Should not throw even though listener errors
      expect(() => emitter.emit("disposing")).not.toThrow();
      expect(emitter.getState()).toBe("disposing");
    });
  });

  describe("clear", () => {
    it("removes all listeners", () => {
      const emitter = new ScopeLifecycleEmitter();
      const events: string[] = [];
      emitter.subscribe(event => events.push(event));

      emitter.clear();

      emitter.emit("disposing");
      expect(events.length).toBe(0);
    });
  });
});

// =============================================================================
// wrappers.ts - addHook/removeHook on child containers
// =============================================================================

describe("wrappers.ts - child container addHook/removeHook", () => {
  it("addHook('beforeResolve') fires on child resolution", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });

    const handler = vi.fn();
    child.addHook("beforeResolve", handler);
    child.resolve(LoggerPort);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].portName).toBe("Logger");
  });

  it("addHook('afterResolve') fires on child resolution", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });

    const handler = vi.fn();
    child.addHook("afterResolve", handler);
    child.resolve(LoggerPort);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].portName).toBe("Logger");
    expect(handler.mock.calls[0][0].error).toBeNull();
  });

  it("removeHook stops hook from firing", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });

    const handler = vi.fn();
    child.addHook("beforeResolve", handler);
    child.resolve(LoggerPort);
    expect(handler).toHaveBeenCalledTimes(1);

    child.removeHook("beforeResolve", handler);
    child.resolve(LoggerPort);
    expect(handler).toHaveBeenCalledTimes(1); // Not called again
  });

  it("removeHook for unknown handler is no-op", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Parent" });
    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });

    expect(() => child.removeHook("beforeResolve", vi.fn())).not.toThrow();
  });
});

// =============================================================================
// container/child-impl.ts - forked inheritance
// =============================================================================

describe("child-impl.ts - forked inheritance", () => {
  it("forked singleton creates a shallow clone", () => {
    const logger = { log: vi.fn(), extra: "data" };
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      clonable: true,
      factory: () => logger,
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const parent = createContainer({ graph, name: "Parent" });

    // Resolve in parent first
    const parentLogger = parent.resolve(LoggerPort);
    expect(parentLogger).toBe(logger);

    // Create child with forked inheritance for Logger
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, {
      name: "Child",
      inheritanceModes: { Logger: "forked" } as any,
    });

    const childLogger = child.resolve(LoggerPort);
    // Forked means different identity but same values
    expect(childLogger).not.toBe(parentLogger);
    expect(childLogger.extra).toBe("data");
  });

  it("forked with non-clonable adapter throws NonClonableForkedError", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const parent = createContainer({ graph, name: "Parent" });
    parent.resolve(LoggerPort);

    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, {
      name: "Child",
      inheritanceModes: { Logger: "forked" } as any,
    });

    expect(() => child.resolve(LoggerPort)).toThrow(/clonable/);
  });

  it("shared inheritance uses same instance", () => {
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
      inheritanceModes: { Logger: "shared" } as any,
    });

    const childLogger = child.resolve(LoggerPort);
    expect(childLogger).toBe(parentLogger);
  });
});

// =============================================================================
// Override builder
// =============================================================================

describe("OverrideBuilder mutation killers", () => {
  it("override().build() creates child with override", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Parent" });

    const mockLogger: Logger = { log: () => {} };
    const overrideAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => mockLogger,
    });

    const overridden = container.override(overrideAdapter).build();

    expect(overridden.resolve(LoggerPort)).toBe(mockLogger);
    expect(overridden.kind).toBe("child");
    expect(overridden.parentName).toBe("Parent");
  });

  it("override preserves parent ports", () => {
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
    const container = createContainer({ graph, name: "Parent" });

    const mockLogger: Logger = { log: () => {} };
    const overrideAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => mockLogger,
    });

    const overridden = container.override(overrideAdapter).build();

    expect(overridden.resolve(LoggerPort)).toBe(mockLogger);
    // DatabasePort should still be available from parent
    expect(overridden.has(DatabasePort)).toBe(true);
    expect(typeof overridden.resolve(DatabasePort).query).toBe("function");
  });

  it("override on initialized container works", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Parent" });
    const initialized = await container.initialize();

    const mockLogger: Logger = { log: () => {} };
    const overrideAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => mockLogger,
    });

    const overridden = initialized.override(overrideAdapter).build();
    expect(overridden.resolve(LoggerPort)).toBe(mockLogger);
  });

  it("override on child container works", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });

    const mockLogger: Logger = { log: () => {} };
    const overrideAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => mockLogger,
    });

    const overridden = child.override(overrideAdapter).build();
    expect(overridden.resolve(LoggerPort)).toBe(mockLogger);
    expect(overridden.parentName).toBe("Child");
  });
});

// =============================================================================
// factory.ts - uninitialized container specific paths
// =============================================================================

describe("factory.ts - uninitialized container", () => {
  it("resolve before initialize works for sync adapters", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    // Should work even without initialize()
    const logger = container.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("tryDispose returns Ok before initialization", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = await container.tryDispose();
    expect(result.isOk()).toBe(true);
  });

  it("container.name is exactly what was passed", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();

    const container = createContainer({ graph, name: "Exact-Name-123" });
    expect(container.name).toBe("Exact-Name-123");
  });
});
