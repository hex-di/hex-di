/**
 * Deep mutation-killing tests for src/container/lazy-impl.ts
 *
 * Targets survived mutants not killed by container-lazy-impl-mutants.test.ts:
 * - isLoaded: container !== null check (mutation: === vs !==)
 * - isDisposed: _isDisposed exact boolean
 * - load: disposed check, cached check, dedup check
 * - performLoad: disposed during load, markNextChildAsLazy, error retry
 * - resolve: delegates to load + resolveAsync
 * - resolveAsync: delegates to load + resolveAsync
 * - tryResolve / tryResolveAsync / tryDispose
 * - has: before/after load delegation
 * - hasAdapter: before/after load delegation
 * - dispose: idempotent, in-flight load, loaded container
 * - name: returns options.name
 * - parentName: returns parent.name
 * - kind: returns "lazy"
 * - createScope: delegates
 * - createChild: delegates
 */
// @ts-nocheck

import { describe, it, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
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
interface Cache {
  get(key: string): unknown;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const CachePort = port<Cache>()({ name: "Cache" });

function makeParent() {
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
  return createContainer({ graph, name: "Parent" });
}

function makeDbGraph() {
  return GraphBuilder.create()
    .provide(
      createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: vi.fn() }),
      })
    )
    .build();
}

// =============================================================================
// isLoaded exact boolean
// =============================================================================

describe("LazyContainer isLoaded", () => {
  it("isLoaded is exactly false before load", () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), { name: "Lazy" });

    expect(lazy.isLoaded).toBe(false);
    expect(lazy.isLoaded).toStrictEqual(false);
  });

  it("isLoaded is exactly true after load", async () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), { name: "Lazy" });

    await lazy.load();

    expect(lazy.isLoaded).toBe(true);
    expect(lazy.isLoaded).toStrictEqual(true);
  });
});

// =============================================================================
// isDisposed exact boolean
// =============================================================================

describe("LazyContainer isDisposed", () => {
  it("isDisposed is exactly false before dispose", () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), { name: "Lazy" });

    expect(lazy.isDisposed).toBe(false);
    expect(lazy.isDisposed).toStrictEqual(false);
  });

  it("isDisposed is exactly true after dispose", async () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), { name: "Lazy" });

    await lazy.dispose();

    expect(lazy.isDisposed).toBe(true);
    expect(lazy.isDisposed).toStrictEqual(true);
  });
});

// =============================================================================
// load: caching (second call returns same promise)
// =============================================================================

describe("LazyContainer load caching", () => {
  it("multiple load calls return the same result", async () => {
    const parent = makeParent();
    let callCount = 0;
    const lazy = parent.createLazyChild(
      async () => {
        callCount++;
        return makeDbGraph();
      },
      { name: "Lazy" }
    );

    const p1 = lazy.load();
    const p2 = lazy.load();
    const [c1, c2] = await Promise.all([p1, p2]);

    expect(c1).toBe(c2);
    expect(callCount).toBe(1); // graphLoader called only once
  });

  it("load returns cached container after first load", async () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), { name: "Lazy" });

    const c1 = await lazy.load();
    const c2 = await lazy.load();
    expect(c1).toBe(c2);
  });
});

// =============================================================================
// load: disposed check
// =============================================================================

describe("LazyContainer load after dispose", () => {
  it("load rejects after dispose", async () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), { name: "Lazy" });

    await lazy.dispose();
    await expect(lazy.load()).rejects.toThrow();
  });
});

// =============================================================================
// resolve / resolveAsync
// =============================================================================

describe("LazyContainer resolve/resolveAsync", () => {
  it("resolve triggers load and returns instance", async () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), { name: "Lazy" });

    const db = await lazy.resolve(DatabasePort);
    expect(typeof db.query).toBe("function");
    expect(lazy.isLoaded).toBe(true);
  });

  it("resolveAsync triggers load and returns instance", async () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), { name: "Lazy" });

    const db = await lazy.resolveAsync(DatabasePort);
    expect(typeof db.query).toBe("function");
    expect(lazy.isLoaded).toBe(true);
  });

  it("resolve inherited port from parent after load", async () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), { name: "Lazy" });

    const logger = await lazy.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });
});

// =============================================================================
// tryResolve / tryResolveAsync / tryDispose
// =============================================================================

describe("LazyContainer try methods", () => {
  it("tryResolve returns Ok on success", async () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), { name: "Lazy" });

    const result = await lazy.tryResolve(DatabasePort);
    expect(result.isOk()).toBe(true);
  });

  it("tryResolveAsync returns Ok on success", async () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), { name: "Lazy" });

    const result = await lazy.tryResolveAsync(DatabasePort);
    expect(result.isOk()).toBe(true);
  });

  it("tryDispose returns Ok", async () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), { name: "Lazy" });

    const result = await lazy.tryDispose();
    expect(result.isOk()).toBe(true);
    expect(lazy.isDisposed).toBe(true);
  });

  it("tryResolve returns Err after dispose", async () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), { name: "Lazy" });

    await lazy.dispose();
    const result = await lazy.tryResolve(DatabasePort);
    expect(result.isErr()).toBe(true);
  });
});

// =============================================================================
// has: before/after load
// =============================================================================

describe("LazyContainer has", () => {
  it("has delegates to parent before load", () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), { name: "Lazy" });

    expect(lazy.has(LoggerPort)).toBe(true); // parent has Logger
    expect(lazy.has(DatabasePort)).toBe(false); // not loaded yet
    expect(lazy.has(CachePort)).toBe(false); // neither parent nor lazy
  });

  it("has delegates to loaded child after load", async () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), { name: "Lazy" });

    await lazy.load();

    expect(lazy.has(LoggerPort)).toBe(true); // inherited
    expect(lazy.has(DatabasePort)).toBe(true); // own from loaded graph
    expect(lazy.has(CachePort)).toBe(false); // still not available
  });
});

// =============================================================================
// hasAdapter: via loaded container
// =============================================================================

describe("LazyContainer hasAdapter via loaded container", () => {
  it("loaded container hasAdapter delegates correctly", async () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), { name: "Lazy" });

    const loaded = await lazy.load();

    expect(loaded.hasAdapter(LoggerPort)).toBe(true);
    expect(loaded.hasAdapter(DatabasePort)).toBe(true);
    expect(loaded.hasAdapter(CachePort)).toBe(false);
  });
});

// =============================================================================
// dispose: idempotent, loaded container
// =============================================================================

describe("LazyContainer dispose", () => {
  it("double dispose is safe", async () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), { name: "Lazy" });

    await lazy.dispose();
    await lazy.dispose(); // should not throw
    expect(lazy.isDisposed).toBe(true);
  });

  it("dispose loaded container disposes the underlying child", async () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), { name: "Lazy" });

    const loaded = await lazy.load();
    await lazy.dispose();

    expect(lazy.isDisposed).toBe(true);
    expect(loaded.isDisposed).toBe(true);
  });
});

// =============================================================================
// loaded container has all Container methods
// =============================================================================

describe("LazyContainer loaded container access", () => {
  it("loaded container has name", async () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), { name: "MyLazy" });

    const loaded = await lazy.load();
    expect(loaded.name).toBe("MyLazy");
  });

  it("loaded container parentName matches parent", async () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), { name: "Lazy" });

    const loaded = await lazy.load();
    expect(loaded.parentName).toBe("Parent");
  });

  it("loaded container kind is 'child'", async () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), { name: "Lazy" });

    const loaded = await lazy.load();
    expect(loaded.kind).toBe("child");
  });

  it("loaded container can create scope", async () => {
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
    const parent = createContainer({ graph, name: "Parent" });

    const lazy = parent.createLazyChild(async () => GraphBuilder.create().build(), {
      name: "Lazy",
    });

    const loaded = await lazy.load();
    const scope = loaded.createScope("s1");
    expect(scope).toBeDefined();
    const logger = scope.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("loaded container can create child", async () => {
    const parent = makeParent();
    const lazy = parent.createLazyChild(async () => makeDbGraph(), { name: "Lazy" });

    const loaded = await lazy.load();
    const childGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: CachePort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ get: vi.fn() }),
        })
      )
      .build();
    const child = loaded.createChild(childGraph, { name: "GC" });
    expect(child.name).toBe("GC");
    expect(child.has(CachePort)).toBe(true);
  });
});

// =============================================================================
// performLoad error: retry after failure
// =============================================================================

describe("LazyContainer performLoad error retry", () => {
  it("retries after graph loader failure", async () => {
    let callCount = 0;
    const parent = makeParent();
    const lazy = parent.createLazyChild(
      async () => {
        callCount++;
        if (callCount === 1) throw new Error("transient failure");
        return makeDbGraph();
      },
      { name: "Lazy" }
    );

    await expect(lazy.load()).rejects.toThrow("transient failure");
    expect(callCount).toBe(1);

    // Second attempt should succeed
    const container = await lazy.load();
    expect(container).toBeDefined();
    expect(callCount).toBe(2);
  });
});
