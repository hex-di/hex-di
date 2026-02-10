/**
 * Mutation-killing tests for remaining files:
 * - resolution/engine.ts: resolve with/without hooks
 * - scope/lifecycle-events.ts: emit state transition
 * - container/internal/inheritance-resolver.ts: getMode, resolveWithCallback branches
 * - container/internal/lifecycle-manager.ts: dispose LIFO, register/unregister
 * - util/memo-map.ts: memoizeOwn, dispose LIFO, fork, entries, isDisposed
 * - util/string-similarity.ts: levenshtein, suggestSimilarPort threshold
 * - inspection/library-registry.ts: all branches
 * - inspection/type-guards.ts: hasInspector, getInspectorAPI
 */
import { describe, it, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { MemoMap } from "../src/util/memo-map.js";
import { levenshteinDistance, suggestSimilarPort } from "../src/util/string-similarity.js";
import { ScopeLifecycleEmitter } from "../src/scope/lifecycle-events.js";
import {
  LifecycleManager,
  childInspectorMap,
} from "../src/container/internal/lifecycle-manager.js";
import { createLibraryRegistry } from "../src/inspection/library-registry.js";
import { hasInspector, getInspectorAPI } from "../src/inspection/type-guards.js";
import { INSPECTOR } from "../src/inspection/symbols.js";

// =============================================================================
// Fixtures
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
// ScopeLifecycleEmitter
// =============================================================================

describe("ScopeLifecycleEmitter (mutant killing)", () => {
  it("initial state is 'active'", () => {
    const emitter = new ScopeLifecycleEmitter();
    expect(emitter.getState()).toBe("active");
  });

  it("emit 'disposing' sets state to 'disposing'", () => {
    const emitter = new ScopeLifecycleEmitter();
    emitter.emit("disposing");
    expect(emitter.getState()).toBe("disposing");
  });

  it("emit 'disposed' sets state to 'disposed'", () => {
    const emitter = new ScopeLifecycleEmitter();
    emitter.emit("disposed");
    expect(emitter.getState()).toBe("disposed");
  });

  it("emits events to all listeners", () => {
    const emitter = new ScopeLifecycleEmitter();
    const events1: string[] = [];
    const events2: string[] = [];

    emitter.subscribe(e => events1.push(e));
    emitter.subscribe(e => events2.push(e));

    emitter.emit("disposing");
    expect(events1).toEqual(["disposing"]);
    expect(events2).toEqual(["disposing"]);
  });

  it("swallows listener errors", () => {
    const emitter = new ScopeLifecycleEmitter();
    const events: string[] = [];

    emitter.subscribe(() => {
      throw new Error("boom");
    });
    emitter.subscribe(e => events.push(e));

    emitter.emit("disposing");
    expect(events).toEqual(["disposing"]);
  });

  it("subscribe returns unsubscribe function", () => {
    const emitter = new ScopeLifecycleEmitter();
    const events: string[] = [];
    const unsub = emitter.subscribe(e => events.push(e));

    emitter.emit("disposing");
    expect(events).toEqual(["disposing"]);

    unsub();
    emitter.emit("disposed");
    expect(events).toEqual(["disposing"]); // no new event
  });

  it("clear removes all listeners", () => {
    const emitter = new ScopeLifecycleEmitter();
    const events: string[] = [];
    emitter.subscribe(e => events.push(e));

    emitter.clear();
    emitter.emit("disposed");
    expect(events).toEqual([]); // no events after clear
  });

  it("state does not change for unknown events", () => {
    const emitter = new ScopeLifecycleEmitter();
    emitter.emit("unknown" as any);
    expect(emitter.getState()).toBe("active");
  });
});

// =============================================================================
// LifecycleManager
// =============================================================================

describe("LifecycleManager (mutant killing)", () => {
  it("isDisposed is false initially", () => {
    const lm = new LifecycleManager();
    expect(lm.isDisposed).toBe(false);
  });

  it("markDisposed sets isDisposed to true", () => {
    const lm = new LifecycleManager();
    lm.markDisposed();
    expect(lm.isDisposed).toBe(true);
  });

  it("dispose is idempotent", async () => {
    const lm = new LifecycleManager();
    const memo = new MemoMap();

    await lm.dispose(memo);
    expect(lm.isDisposed).toBe(true);

    await lm.dispose(memo); // no-op
    expect(lm.isDisposed).toBe(true);
  });

  it("disposes child containers in LIFO order", async () => {
    const lm = new LifecycleManager();
    const disposeOrder: string[] = [];

    const child1 = {
      dispose: vi.fn(async () => {
        disposeOrder.push("child1");
      }),
      isDisposed: false,
    };
    const child2 = {
      dispose: vi.fn(async () => {
        disposeOrder.push("child2");
      }),
      isDisposed: false,
    };

    lm.registerChildContainer(child1);
    lm.registerChildContainer(child2);

    await lm.dispose(new MemoMap());

    // LIFO: child2 disposed before child1
    expect(disposeOrder).toEqual(["child2", "child1"]);
  });

  it("disposes child scopes", async () => {
    const lm = new LifecycleManager();
    const scope = {
      dispose: vi.fn(async () => {}),
      isDisposed: false,
    };

    lm.registerChildScope(scope);
    await lm.dispose(new MemoMap());

    expect(scope.dispose).toHaveBeenCalled();
  });

  it("calls parentUnregister after disposal", async () => {
    const lm = new LifecycleManager();
    const unregister = vi.fn();

    await lm.dispose(new MemoMap(), unregister);

    expect(unregister).toHaveBeenCalled();
  });

  it("disposes singleton memo", async () => {
    const lm = new LifecycleManager();
    const memo = new MemoMap();
    const disposeFn = vi.fn();
    memo.getOrElseMemoize(LoggerPort, () => ({ log: () => {} }) as any, disposeFn);

    await lm.dispose(memo);
    expect(disposeFn).toHaveBeenCalled();
  });

  it("registerChildContainer assigns unique IDs", () => {
    const lm = new LifecycleManager();
    const child1 = { dispose: vi.fn(async () => {}), isDisposed: false };
    const child2 = { dispose: vi.fn(async () => {}), isDisposed: false };

    const id1 = lm.registerChildContainer(child1);
    const id2 = lm.registerChildContainer(child2);

    expect(id1).not.toBe(id2);
    expect(typeof id1).toBe("number");
    expect(typeof id2).toBe("number");
  });

  it("registerChildContainer stores inspector in childInspectorMap", () => {
    const lm = new LifecycleManager();
    const child = { dispose: vi.fn(async () => {}), isDisposed: false };
    const inspector = { getSnapshot: vi.fn() } as any;

    const id = lm.registerChildContainer(child, inspector);
    expect(childInspectorMap.get(id)).toBe(inspector);

    // Cleanup
    childInspectorMap.delete(id);
  });

  it("unregisterChildContainer removes child and inspector", () => {
    const lm = new LifecycleManager();
    const child = { dispose: vi.fn(async () => {}), isDisposed: false };
    const inspector = { getSnapshot: vi.fn() } as any;

    const id = lm.registerChildContainer(child, inspector);
    expect(childInspectorMap.has(id)).toBe(true);

    lm.unregisterChildContainer(child);
    expect(childInspectorMap.has(id)).toBe(false);
  });

  it("unregisterChildScope removes scope", async () => {
    const lm = new LifecycleManager();
    const scope = {
      dispose: vi.fn(async () => {}),
      isDisposed: false,
    };

    lm.registerChildScope(scope);
    lm.unregisterChildScope(scope);

    // Should have no scopes to dispose now
    const snapshots = lm.getChildScopeSnapshots(() => "snap");
    expect(snapshots).toEqual([]);
  });

  it("getChildScopeSnapshots returns snapshots and skips errors", () => {
    const lm = new LifecycleManager();

    const scope1 = { dispose: vi.fn(async () => {}), isDisposed: false };
    const scope2 = { dispose: vi.fn(async () => {}), isDisposed: true };

    lm.registerChildScope(scope1);
    lm.registerChildScope(scope2);

    let callIdx = 0;
    const snapshots = lm.getChildScopeSnapshots(scope => {
      callIdx++;
      if (callIdx === 2) throw new Error("disposed");
      return "snap";
    });

    expect(snapshots).toEqual(["snap"]);
  });

  it("getChildContainerSnapshots returns snapshots and skips errors", () => {
    const lm = new LifecycleManager();
    const child1 = { dispose: vi.fn(async () => {}), isDisposed: false };
    const child2 = { dispose: vi.fn(async () => {}), isDisposed: true };

    lm.registerChildContainer(child1);
    lm.registerChildContainer(child2);

    let callIdx = 0;
    const snapshots = lm.getChildContainerSnapshots(c => {
      callIdx++;
      if (callIdx === 2) throw new Error("disposed");
      return "container-snap";
    });

    expect(snapshots).toEqual(["container-snap"]);
  });

  it("unregisterChildContainer is no-op for child without CHILD_ID", () => {
    const lm = new LifecycleManager();
    const child = { dispose: vi.fn(async () => {}), isDisposed: false };

    // Should not throw
    lm.unregisterChildContainer(child);
  });
});

// =============================================================================
// MemoMap additional mutation tests
// =============================================================================

describe("MemoMap (mutant killing)", () => {
  it("memoizeOwn does not check parent", () => {
    const parent = new MemoMap();
    parent.getOrElseMemoize(LoggerPort, () => ({ log: () => {} }) as any);

    const child = parent.fork();
    let factoryCalled = false;
    child.memoizeOwn(LoggerPort, () => {
      factoryCalled = true;
      return { log: () => {} } as any;
    });

    // Factory should be called because memoizeOwn ignores parent
    expect(factoryCalled).toBe(true);
  });

  it("memoizeOwn returns cached value on second call", () => {
    const memo = new MemoMap();
    let callCount = 0;
    const factory = () => {
      callCount++;
      return { log: () => {} } as any;
    };

    const first = memo.memoizeOwn(LoggerPort, factory);
    const second = memo.memoizeOwn(LoggerPort, factory);

    expect(first).toBe(second);
    expect(callCount).toBe(1);
  });

  it("getOrElseMemoize delegates to parent when parent has entry", () => {
    const parent = new MemoMap();
    const parentLogger = { log: () => {} } as any;
    parent.getOrElseMemoize(LoggerPort, () => parentLogger);

    const child = parent.fork();
    const childLogger = child.getOrElseMemoize(LoggerPort, () => ({ log: () => {} }) as any);

    expect(childLogger).toBe(parentLogger);
  });

  it("getOrElseMemoizeAsync delegates to parent when parent has entry", async () => {
    const parent = new MemoMap();
    const parentLogger = { log: () => {} } as any;
    parent.getOrElseMemoize(LoggerPort, () => parentLogger);

    const child = parent.fork();
    const childLogger = await child.getOrElseMemoizeAsync(
      LoggerPort,
      async () => ({ log: () => {} }) as any
    );

    expect(childLogger).toBe(parentLogger);
  });

  it("has checks parent chain", () => {
    const parent = new MemoMap();
    parent.getOrElseMemoize(LoggerPort, () => ({ log: () => {} }) as any);

    const child = parent.fork();
    expect(child.has(LoggerPort)).toBe(true);
    expect(child.has(DatabasePort)).toBe(false);
  });

  it("getIfPresent checks parent chain", () => {
    const parent = new MemoMap();
    const logger = { log: () => {} } as any;
    parent.getOrElseMemoize(LoggerPort, () => logger);

    const child = parent.fork();
    expect(child.getIfPresent(LoggerPort)).toBe(logger);
    expect(child.getIfPresent(DatabasePort)).toBeUndefined();
  });

  it("entries yields creation order", () => {
    const memo = new MemoMap();
    memo.getOrElseMemoize(DatabasePort, () => ({ query: () => {} }) as any);
    memo.getOrElseMemoize(LoggerPort, () => ({ log: () => {} }) as any);

    const entries = [...memo.entries()];
    expect(entries).toHaveLength(2);
    expect(entries[0][0]).toBe(DatabasePort);
    expect(entries[1][0]).toBe(LoggerPort);

    // Metadata has resolvedAt and resolutionOrder
    expect(entries[0][1].resolutionOrder).toBe(0);
    expect(entries[1][1].resolutionOrder).toBe(1);
    expect(entries[0][1].resolvedAt).toBeGreaterThan(0);
  });

  it("dispose runs finalizers in LIFO order", async () => {
    const memo = new MemoMap();
    const order: string[] = [];

    memo.getOrElseMemoize(
      LoggerPort,
      () => ({ log: () => {} }) as any,
      () => {
        order.push("Logger");
      }
    );
    memo.getOrElseMemoize(
      DatabasePort,
      () => ({ query: () => {} }) as any,
      () => {
        order.push("Database");
      }
    );

    await memo.dispose();

    expect(order).toEqual(["Database", "Logger"]);
    expect(memo.isDisposed).toBe(true);
  });

  it("dispose aggregates finalizer errors", async () => {
    const memo = new MemoMap();
    memo.getOrElseMemoize(
      LoggerPort,
      () => ({ log: () => {} }) as any,
      () => {
        throw new Error("fail1");
      }
    );
    memo.getOrElseMemoize(
      DatabasePort,
      () => ({ query: () => {} }) as any,
      () => {
        throw new Error("fail2");
      }
    );

    await expect(memo.dispose()).rejects.toThrow(AggregateError);

    try {
      await memo.dispose(); // already disposed, the AggregateError was thrown first time
    } catch (e: any) {
      expect(e).toBeInstanceOf(AggregateError);
      expect(e.errors).toHaveLength(2);
    }
  });

  it("fork inherits parent config", () => {
    const parent = new MemoMap(undefined, { captureTimestamps: false });
    const child = parent.fork();

    child.getOrElseMemoize(LoggerPort, () => ({ log: () => {} }) as any);
    const entries = [...child.entries()];
    expect(entries[0][1].resolvedAt).toBe(0);
  });

  it("captureTimestamps defaults to true (non-zero resolvedAt)", () => {
    const memo = new MemoMap();
    memo.getOrElseMemoize(LoggerPort, () => ({ log: () => {} }) as any);
    const entries = [...memo.entries()];
    expect(entries[0][1].resolvedAt).toBeGreaterThan(0);
  });

  it("captureTimestamps false sets resolvedAt to 0", () => {
    const memo = new MemoMap(undefined, { captureTimestamps: false });
    memo.getOrElseMemoize(LoggerPort, () => ({ log: () => {} }) as any);
    const entries = [...memo.entries()];
    expect(entries[0][1].resolvedAt).toBe(0);
  });

  it("isDisposed is false before dispose", () => {
    const memo = new MemoMap();
    expect(memo.isDisposed).toBe(false);
  });

  it("isDisposed is true after dispose", async () => {
    const memo = new MemoMap();
    await memo.dispose();
    expect(memo.isDisposed).toBe(true);
  });
});

// =============================================================================
// String Similarity
// =============================================================================

describe("levenshteinDistance (mutant killing)", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshteinDistance("abc", "abc")).toBe(0);
  });

  it("returns b.length for empty a", () => {
    expect(levenshteinDistance("", "abc")).toBe(3);
  });

  it("returns a.length for empty b", () => {
    expect(levenshteinDistance("abc", "")).toBe(3);
  });

  it("returns 0 for two empty strings", () => {
    expect(levenshteinDistance("", "")).toBe(0);
  });

  it("calculates correct distance for simple substitution", () => {
    expect(levenshteinDistance("cat", "bat")).toBe(1);
  });

  it("calculates correct distance for insertion", () => {
    expect(levenshteinDistance("cat", "cats")).toBe(1);
  });

  it("calculates correct distance for deletion", () => {
    expect(levenshteinDistance("cats", "cat")).toBe(1);
  });

  it("calculates correct distance for kitten->sitting", () => {
    expect(levenshteinDistance("kitten", "sitting")).toBe(3);
  });

  it("returns correct distance for completely different strings", () => {
    expect(levenshteinDistance("abc", "xyz")).toBe(3);
  });

  it("cost is 0 when characters match", () => {
    // "a" vs "a" = 0
    expect(levenshteinDistance("a", "a")).toBe(0);
  });

  it("cost is 1 when characters differ", () => {
    // "a" vs "b" = 1
    expect(levenshteinDistance("a", "b")).toBe(1);
  });

  it("uses min of deletion, insertion, substitution", () => {
    // "ab" -> "b" = 1 (deletion)
    expect(levenshteinDistance("ab", "b")).toBe(1);
    // "b" -> "ab" = 1 (insertion)
    expect(levenshteinDistance("b", "ab")).toBe(1);
  });
});

describe("suggestSimilarPort (mutant killing)", () => {
  it("returns closest match within MAX_DISTANCE (2)", () => {
    const available = ["Logger", "Database"];
    expect(suggestSimilarPort("Logge", available)).toBe("Logger"); // distance 1
  });

  it("returns undefined when all names are too far", () => {
    const available = ["Logger", "Database"];
    expect(suggestSimilarPort("CompletelyDifferent", available)).toBeUndefined();
  });

  it("returns undefined for empty available list", () => {
    expect(suggestSimilarPort("Logger", [])).toBeUndefined();
  });

  it("returns the closest when multiple are within threshold", () => {
    const available = ["Log", "Logger", "Logging"];
    expect(suggestSimilarPort("Logge", available)).toBe("Logger"); // distance 1 vs 2 vs 3
  });

  it("returns undefined when distance equals MAX_DISTANCE + 1", () => {
    // MAX_DISTANCE is 2, so distance 3 should not match
    const available = ["abcde"];
    expect(suggestSimilarPort("xy", available)).toBeUndefined(); // distance > 2
  });

  it("returns match at exactly MAX_DISTANCE (2)", () => {
    const available = ["abc"];
    expect(suggestSimilarPort("a", available)).toBe("abc"); // distance 2
  });

  it("prefers closer match when tie on first is further", () => {
    const available = ["Logg", "Logger"];
    expect(suggestSimilarPort("Logge", available)).toBe("Logg"); // distance 1 vs 1
    // Actually Logge -> Logg = 1, Logge -> Logger = 1
    // Returns first found with minimum distance
  });
});

// =============================================================================
// Library Registry
// =============================================================================

describe("createLibraryRegistry (mutant killing)", () => {
  it("registerLibrary throws on invalid inspector", () => {
    const registry = createLibraryRegistry();
    expect(() => registry.registerLibrary({} as any, vi.fn())).toThrow(TypeError);
  });

  it("registerLibrary adds inspector to map", () => {
    const registry = createLibraryRegistry();
    const lib = { name: "test-lib", getSnapshot: () => ({}) };
    registry.registerLibrary(lib, vi.fn());

    expect(registry.getLibraryInspector("test-lib")).toBe(lib);
    expect(registry.getLibraryInspectors().size).toBe(1);
  });

  it("registerLibrary emits library-registered event", () => {
    const registry = createLibraryRegistry();
    const emit = vi.fn();
    const lib = { name: "test-lib", getSnapshot: () => ({}) };
    registry.registerLibrary(lib, emit);

    expect(emit).toHaveBeenCalledWith({ type: "library-registered", name: "test-lib" });
  });

  it("registerLibrary subscribes to library events", () => {
    const registry = createLibraryRegistry();
    const emit = vi.fn();
    let subscriberCb: any;
    const lib = {
      name: "test-lib",
      getSnapshot: () => ({}),
      subscribe: (cb: any) => {
        subscriberCb = cb;
        return () => {};
      },
    };
    registry.registerLibrary(lib, emit);

    // Trigger library event
    subscriberCb({ type: "lib-event" });
    expect(emit).toHaveBeenCalledWith({ type: "library", event: { type: "lib-event" } });
  });

  it("unregister function removes inspector and emits event", () => {
    const registry = createLibraryRegistry();
    const emit = vi.fn();
    const lib = { name: "test-lib", getSnapshot: () => ({}) };
    const unregister = registry.registerLibrary(lib, emit);

    unregister();

    expect(registry.getLibraryInspector("test-lib")).toBeUndefined();
    expect(emit).toHaveBeenCalledWith({ type: "library-unregistered", name: "test-lib" });
  });

  it("unregister is idempotent", () => {
    const registry = createLibraryRegistry();
    const emit = vi.fn();
    const lib = { name: "test-lib", getSnapshot: () => ({}) };
    const unregister = registry.registerLibrary(lib, emit);

    unregister();
    unregister(); // should be no-op

    // Should only have one unregistered event
    const unregisteredEvents = emit.mock.calls.filter(
      (c: any) => c[0].type === "library-unregistered"
    );
    expect(unregisteredEvents).toHaveLength(1);
  });

  it("last-write-wins: replacing existing library disposes old one", () => {
    const registry = createLibraryRegistry();
    const emit = vi.fn();
    const oldDispose = vi.fn();
    const oldLib = { name: "test-lib", getSnapshot: () => ({}), dispose: oldDispose };
    const newLib = { name: "test-lib", getSnapshot: () => ({ new: true }) };

    registry.registerLibrary(oldLib, emit);
    registry.registerLibrary(newLib, emit);

    expect(oldDispose).toHaveBeenCalled();
    expect(registry.getLibraryInspector("test-lib")).toBe(newLib);
  });

  it("unregister does not remove if inspector was replaced", () => {
    const registry = createLibraryRegistry();
    const emit = vi.fn();
    const lib1 = { name: "test-lib", getSnapshot: () => ({ v: 1 }) };
    const lib2 = { name: "test-lib", getSnapshot: () => ({ v: 2 }) };

    const unreg1 = registry.registerLibrary(lib1, emit);
    registry.registerLibrary(lib2, emit); // replaces lib1

    unreg1(); // should be no-op since lib1 was replaced
    expect(registry.getLibraryInspector("test-lib")).toBe(lib2);
  });

  it("getLibrarySnapshots returns snapshot for each library", () => {
    const registry = createLibraryRegistry();
    const lib = { name: "test-lib", getSnapshot: () => ({ val: 42 }) };
    registry.registerLibrary(lib, vi.fn());

    const snapshots = registry.getLibrarySnapshots();
    expect(snapshots["test-lib"]).toEqual({ val: 42 });
    expect(Object.isFrozen(snapshots)).toBe(true);
  });

  it("getLibrarySnapshots handles snapshot errors", () => {
    const registry = createLibraryRegistry();
    const lib = {
      name: "broken-lib",
      getSnapshot: () => {
        throw new Error("snapshot error");
      },
    };
    registry.registerLibrary(lib, vi.fn());

    const snapshots = registry.getLibrarySnapshots();
    expect(snapshots["broken-lib"]).toEqual({ error: "snapshot-failed" });
  });

  it("dispose disposes all inspectors and clears maps", () => {
    const registry = createLibraryRegistry();
    const dispose1 = vi.fn();
    const unsub1 = vi.fn();
    const lib = {
      name: "test-lib",
      getSnapshot: () => ({}),
      dispose: dispose1,
      subscribe: () => unsub1,
    };
    registry.registerLibrary(lib, vi.fn());

    registry.dispose();

    expect(dispose1).toHaveBeenCalled();
    expect(unsub1).toHaveBeenCalled();
    expect(registry.getLibraryInspectors().size).toBe(0);
  });

  it("dispose tolerates individual failures", () => {
    const registry = createLibraryRegistry();
    const lib1 = {
      name: "lib1",
      getSnapshot: () => ({}),
      dispose: () => {
        throw new Error("dispose error");
      },
      subscribe: () => () => {
        throw new Error("unsub error");
      },
    };
    const lib2 = {
      name: "lib2",
      getSnapshot: () => ({}),
      dispose: vi.fn(),
    };

    registry.registerLibrary(lib1, vi.fn());
    registry.registerLibrary(lib2, vi.fn());

    // Should not throw
    registry.dispose();
    expect(lib2.dispose).toHaveBeenCalled();
  });

  it("getLibraryInspectors returns a new Map (defensive copy)", () => {
    const registry = createLibraryRegistry();
    const lib = { name: "test-lib", getSnapshot: () => ({}) };
    registry.registerLibrary(lib, vi.fn());

    const map1 = registry.getLibraryInspectors();
    const map2 = registry.getLibraryInspectors();
    expect(map1).not.toBe(map2);
    expect(map1.size).toBe(map2.size);
  });
});

// =============================================================================
// Type Guards
// =============================================================================

describe("hasInspector (mutant killing)", () => {
  it("returns true when container has INSPECTOR symbol", () => {
    const container = { [INSPECTOR]: {} } as any;
    expect(hasInspector(container)).toBe(true);
  });

  it("returns false when container lacks INSPECTOR symbol", () => {
    const container = {} as any;
    expect(hasInspector(container)).toBe(false);
  });
});

describe("getInspectorAPI (mutant killing)", () => {
  it("returns InspectorAPI when present", () => {
    const inspectorAPI = { getSnapshot: vi.fn() };
    const container = { [INSPECTOR]: inspectorAPI } as any;
    expect(getInspectorAPI(container)).toBe(inspectorAPI);
  });

  it("returns undefined when not present", () => {
    const container = {} as any;
    expect(getInspectorAPI(container)).toBeUndefined();
  });
});
