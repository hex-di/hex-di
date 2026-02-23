/**
 * Comprehensive mutation-killing tests for src/container/lazy-impl.ts
 *
 * Targets all surviving mutants:
 * - nextChildIsLazy flag: markNextChildAsLazy, consumeLazyFlag
 * - LazyContainerImpl.isLoaded: container !== null check
 * - LazyContainerImpl.isDisposed: _isDisposed value
 * - LazyContainerImpl.load: disposed check, cached check, dedup check
 * - LazyContainerImpl.performLoad: disposed during load, markNextChildAsLazy, error retry
 * - LazyContainerImpl.resolve: delegates to load + resolveAsync
 * - LazyContainerImpl.resolveAsync: delegates to load + resolveAsync
 * - LazyContainerImpl.tryResolve / tryResolveAsync / tryDispose
 * - LazyContainerImpl.has: before/after load delegation
 * - LazyContainerImpl.dispose: idempotent, in-flight load, loaded container
 */
import { describe, it, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import {
  LazyContainerImpl,
  markNextChildAsLazy,
  consumeLazyFlag,
  nextChildIsLazy,
} from "../src/container/lazy-impl.js";
import { DisposedScopeError } from "../src/errors/index.js";

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

function makeLoggerAdapter() {
  return createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
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

function makeParent() {
  const graph = GraphBuilder.create().provide(makeLoggerAdapter()).build();
  return createContainer({ graph, name: "Parent" });
}

function makeDbGraph() {
  return GraphBuilder.create().provide(makeDbAdapter()).build();
}

// =============================================================================
// Lazy flag functions
// =============================================================================

describe("lazy flag functions", () => {
  it("markNextChildAsLazy sets nextChildIsLazy to true", () => {
    markNextChildAsLazy();
    expect(nextChildIsLazy).toBe(true);
    consumeLazyFlag(); // cleanup
  });

  it("consumeLazyFlag returns true and resets to false", () => {
    markNextChildAsLazy();
    const wasLazy = consumeLazyFlag();
    expect(wasLazy).toBe(true);
    expect(nextChildIsLazy).toBe(false);
  });

  it("consumeLazyFlag returns false when flag was not set", () => {
    // Ensure flag is cleared
    consumeLazyFlag();
    const wasLazy = consumeLazyFlag();
    expect(wasLazy).toBe(false);
    expect(nextChildIsLazy).toBe(false);
  });

  it("markNextChildAsLazy then consumeLazyFlag round-trip", () => {
    expect(nextChildIsLazy).toBe(false);
    markNextChildAsLazy();
    expect(nextChildIsLazy).toBe(true);
    const result = consumeLazyFlag();
    expect(result).toBe(true);
    expect(nextChildIsLazy).toBe(false);
  });
});

// =============================================================================
// LazyContainerImpl - isLoaded
// =============================================================================

describe("LazyContainerImpl - isLoaded", () => {
  it("isLoaded is false before loading", () => {
    const parent = makeParent();
    const lazy = new LazyContainerImpl(parent, async () => makeDbGraph(), {
      name: "Lazy",
    });
    expect(lazy.isLoaded).toBe(false);
    expect(lazy.isLoaded).toStrictEqual(false);
  });

  it("isLoaded is true after successful load", async () => {
    const parent = makeParent();
    const lazy = new LazyContainerImpl(parent, async () => makeDbGraph(), {
      name: "Lazy",
    });
    await lazy.load();
    expect(lazy.isLoaded).toBe(true);
    expect(lazy.isLoaded).toStrictEqual(true);
  });
});

// =============================================================================
// LazyContainerImpl - isDisposed
// =============================================================================

describe("LazyContainerImpl - isDisposed", () => {
  it("isDisposed is false initially", () => {
    const parent = makeParent();
    const lazy = new LazyContainerImpl(parent, async () => makeDbGraph(), {
      name: "Lazy",
    });
    expect(lazy.isDisposed).toBe(false);
    expect(lazy.isDisposed).toStrictEqual(false);
  });

  it("isDisposed is true after dispose", async () => {
    const parent = makeParent();
    const lazy = new LazyContainerImpl(parent, async () => makeDbGraph(), {
      name: "Lazy",
    });
    await lazy.dispose();
    expect(lazy.isDisposed).toBe(true);
    expect(lazy.isDisposed).toStrictEqual(true);
  });
});

// =============================================================================
// LazyContainerImpl - load
// =============================================================================

describe("LazyContainerImpl - load", () => {
  it("load throws DisposedScopeError if disposed", async () => {
    const parent = makeParent();
    const lazy = new LazyContainerImpl(parent, async () => makeDbGraph(), {
      name: "Lazy",
    });
    await lazy.dispose();
    await expect(lazy.load()).rejects.toThrow(DisposedScopeError);
  });

  it("load returns cached container on second call", async () => {
    const parent = makeParent();
    let callCount = 0;
    const lazy = new LazyContainerImpl(
      parent,
      async () => {
        callCount++;
        return makeDbGraph();
      },
      { name: "Lazy" }
    );

    const c1 = await lazy.load();
    const c2 = await lazy.load();
    expect(c1).toBe(c2);
    expect(callCount).toBe(1);
  });

  it("load deduplicates concurrent calls", async () => {
    const parent = makeParent();
    let callCount = 0;
    const lazy = new LazyContainerImpl(
      parent,
      async () => {
        callCount++;
        return makeDbGraph();
      },
      { name: "Lazy" }
    );

    const [c1, c2, c3] = await Promise.all([lazy.load(), lazy.load(), lazy.load()]);
    expect(callCount).toBe(1);
    expect(c1).toBe(c2);
    expect(c2).toBe(c3);
  });
});

// =============================================================================
// LazyContainerImpl - performLoad
// =============================================================================

describe("LazyContainerImpl - performLoad behavior", () => {
  it("disposed during load throws DisposedScopeError", async () => {
    const parent = makeParent();
    let resolveLoader: ((g: any) => void) | undefined;
    const lazy = new LazyContainerImpl(
      parent,
      () =>
        new Promise<any>(resolve => {
          resolveLoader = resolve;
        }),
      { name: "Lazy" }
    );

    // Start loading
    const _loadPromise = lazy.load().catch((e: unknown) => e);

    // Resolve the graph (so load completes)
    resolveLoader?.(makeDbGraph());

    // Dispose immediately
    await lazy.dispose();

    // The load should have completed but disposal should mark as disposed
    expect(lazy.isDisposed).toBe(true);
    // Subsequent load should throw
    await expect(lazy.load()).rejects.toThrow(DisposedScopeError);
  });

  it("load clears promise on failure to allow retry", async () => {
    const parent = makeParent();
    let callCount = 0;
    const lazy = new LazyContainerImpl(
      parent,
      async () => {
        callCount++;
        if (callCount === 1) throw new Error("first fail");
        return makeDbGraph();
      },
      { name: "Lazy" }
    );

    // First attempt fails
    await expect(lazy.load()).rejects.toThrow("first fail");

    // Second attempt succeeds (promise was cleared)
    const container = await lazy.load();
    expect(container).toBeDefined();
    expect(callCount).toBe(2);
  });
});

// =============================================================================
// LazyContainerImpl - resolve and resolveAsync
// =============================================================================

describe("LazyContainerImpl - resolve", () => {
  it("resolve loads graph and resolves port", async () => {
    const parent = makeParent();
    const lazy: any = new LazyContainerImpl(parent, async () => makeDbGraph(), {
      name: "Lazy",
    });

    const db = await lazy.resolve(DatabasePort);
    expect(db).toBeDefined();
    expect(typeof db.query).toBe("function");
  });

  it("resolve can also resolve parent ports", async () => {
    const parent = makeParent();
    const lazy: any = new LazyContainerImpl(parent, async () => makeDbGraph(), {
      name: "Lazy",
    });

    const logger = await lazy.resolve(LoggerPort);
    expect(logger).toBeDefined();
    expect(typeof logger.log).toBe("function");
  });

  it("resolveAsync loads graph and resolves port", async () => {
    const parent = makeParent();
    const lazy: any = new LazyContainerImpl(parent, async () => makeDbGraph(), {
      name: "Lazy",
    });

    const db = await lazy.resolveAsync(DatabasePort);
    expect(typeof db.query).toBe("function");
  });
});

// =============================================================================
// LazyContainerImpl - try methods
// =============================================================================

describe("LazyContainerImpl - try methods", () => {
  it("tryResolve returns Ok on success", async () => {
    const parent = makeParent();
    const lazy: any = new LazyContainerImpl(parent, async () => makeDbGraph(), {
      name: "Lazy",
    });

    const result = await lazy.tryResolve(DatabasePort);
    expect(result.isOk()).toBe(true);
  });

  it("tryResolve returns Err on failure", async () => {
    const parent = makeParent();
    const lazy: any = new LazyContainerImpl(
      parent,
      async () => {
        throw new Error("load fail");
      },
      { name: "Lazy" }
    );

    const result = await lazy.tryResolve(DatabasePort);
    expect(result.isErr()).toBe(true);
  });

  it("tryResolveAsync returns Ok on success", async () => {
    const parent = makeParent();
    const lazy: any = new LazyContainerImpl(parent, async () => makeDbGraph(), {
      name: "Lazy",
    });

    const result = await lazy.tryResolveAsync(DatabasePort);
    expect(result.isOk()).toBe(true);
  });

  it("tryDispose returns Ok on success", async () => {
    const parent = makeParent();
    const lazy = new LazyContainerImpl(parent, async () => makeDbGraph(), {
      name: "Lazy",
    });

    const result = await lazy.tryDispose();
    expect(result.isOk()).toBe(true);
    expect(lazy.isDisposed).toBe(true);
  });
});

// =============================================================================
// LazyContainerImpl - has
// =============================================================================

describe("LazyContainerImpl - has", () => {
  it("has delegates to parent before load", () => {
    const parent = makeParent();
    const lazy = new LazyContainerImpl(parent, async () => makeDbGraph(), {
      name: "Lazy",
    });

    expect(lazy.has(LoggerPort)).toBe(true);
    expect(lazy.has(DatabasePort)).toBe(false);
  });

  it("has delegates to loaded container after load", async () => {
    const parent = makeParent();
    const lazy = new LazyContainerImpl(parent, async () => makeDbGraph(), {
      name: "Lazy",
    });

    await lazy.load();
    expect(lazy.has(LoggerPort)).toBe(true);
    expect(lazy.has(DatabasePort)).toBe(true);
  });
});

// =============================================================================
// LazyContainerImpl - dispose
// =============================================================================

describe("LazyContainerImpl - dispose", () => {
  it("dispose is idempotent", async () => {
    const parent = makeParent();
    const lazy = new LazyContainerImpl(parent, async () => makeDbGraph(), {
      name: "Lazy",
    });

    await lazy.dispose();
    await lazy.dispose(); // should not throw
    expect(lazy.isDisposed).toBe(true);
  });

  it("dispose handles not-yet-loaded state", async () => {
    const parent = makeParent();
    const lazy = new LazyContainerImpl(parent, async () => makeDbGraph(), {
      name: "Lazy",
    });

    await lazy.dispose();
    expect(lazy.isDisposed).toBe(true);
    expect(lazy.isLoaded).toBe(false);
  });

  it("dispose handles already-loaded state", async () => {
    const parent = makeParent();
    const lazy = new LazyContainerImpl(parent, async () => makeDbGraph(), {
      name: "Lazy",
    });

    await lazy.load();
    expect(lazy.isLoaded).toBe(true);

    await lazy.dispose();
    expect(lazy.isDisposed).toBe(true);
  });

  it("dispose waits for in-flight load then disposes", async () => {
    const parent = makeParent();
    let resolveLoader: ((g: any) => void) | undefined;
    const lazy = new LazyContainerImpl(
      parent,
      () =>
        new Promise<any>(resolve => {
          resolveLoader = resolve;
        }),
      { name: "Lazy" }
    );

    // Start loading (do not await)
    const loadPromise = lazy.load().catch(() => {});

    // Start disposing
    const disposePromise = lazy.dispose();

    // Resolve the graph loader
    resolveLoader?.(makeDbGraph());

    await loadPromise;
    await disposePromise;

    expect(lazy.isDisposed).toBe(true);
  });

  it("dispose handles in-flight load that fails", async () => {
    const parent = makeParent();
    let rejectLoader: ((err: Error) => void) | undefined;
    const lazy = new LazyContainerImpl(
      parent,
      () =>
        new Promise<any>((_resolve, reject) => {
          rejectLoader = reject;
        }),
      { name: "Lazy" }
    );

    // Start loading
    const loadPromise = lazy.load().catch(() => {});

    // Reject the load
    rejectLoader?.(new Error("load failed"));
    await loadPromise;

    // Dispose should work fine
    await lazy.dispose();
    expect(lazy.isDisposed).toBe(true);
  });

  it("dispose clears loadPromise after completion", async () => {
    const parent = makeParent();
    const lazy = new LazyContainerImpl(parent, async () => makeDbGraph(), {
      name: "Lazy",
    });

    await lazy.load();
    await lazy.dispose();

    // After dispose, isLoaded should be false (container nulled)
    expect(lazy.isLoaded).toBe(false);
  });

  it("dispose nulls container reference after loaded dispose", async () => {
    const parent = makeParent();
    const lazy = new LazyContainerImpl(parent, async () => makeDbGraph(), {
      name: "Lazy",
    });

    await lazy.load();
    expect(lazy.isLoaded).toBe(true);

    await lazy.dispose();
    // container is nulled
    expect(lazy.isLoaded).toBe(false);
  });
});

// =============================================================================
// LazyContainerImpl via container.createLazyChild
// =============================================================================

describe("LazyContainerImpl via createLazyChild", () => {
  it("createLazyChild creates a lazy container with has delegation", () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), {
      name: "LazyChild",
    });

    expect(lazy.isLoaded).toBe(false);
    expect(lazy.has(LoggerPort)).toBe(true);
    expect(lazy.has(DatabasePort)).toBe(false);
  });

  it("createLazyChild lazy container loads and resolves", async () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), {
      name: "LazyChild",
    });

    const db = await lazy.resolve(DatabasePort);
    expect(typeof db.query).toBe("function");
    expect(lazy.isLoaded).toBe(true);
  });

  it("createLazyChild lazy container dispose works", async () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), {
      name: "LazyChild",
    });

    await lazy.dispose();
    expect(lazy.isDisposed).toBe(true);
  });
});
