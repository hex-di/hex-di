/**
 * Extended tests for src/container/lazy-impl.ts
 * Covers lazy container loading, resolution, disposal.
 */
// @ts-nocheck

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

function createLoggerAdapter() {
  return createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: vi.fn() }),
  });
}

function createDatabaseAdapter() {
  return createAdapter({
    provides: DatabasePort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ query: vi.fn() }),
  });
}

// =============================================================================
// Tests
// =============================================================================

describe("lazy container flags", () => {
  it("markNextChildAsLazy sets the flag", () => {
    markNextChildAsLazy();
    expect(nextChildIsLazy).toBe(true);
    consumeLazyFlag(); // clean up
  });

  it("consumeLazyFlag reads and clears the flag", () => {
    markNextChildAsLazy();
    const was = consumeLazyFlag();
    expect(was).toBe(true);
    expect(nextChildIsLazy).toBe(false);
  });

  it("consumeLazyFlag returns false when flag not set", () => {
    const was = consumeLazyFlag();
    expect(was).toBe(false);
  });
});

describe("LazyContainerImpl", () => {
  function createTestParent() {
    const parent = createContainer({
      graph: GraphBuilder.create().provide(createLoggerAdapter()).build(),
      name: "Parent",
    });
    return parent;
  }

  it("isLoaded is false before load", () => {
    const parent = createTestParent();
    const lazy = new LazyContainerImpl(
      parent,
      async () => GraphBuilder.create().provide(createDatabaseAdapter()).build(),
      { name: "LazyChild" }
    );
    expect(lazy.isLoaded).toBe(false);
  });

  it("isDisposed is false initially", () => {
    const parent = createTestParent();
    const lazy = new LazyContainerImpl(
      parent,
      async () => GraphBuilder.create().provide(createDatabaseAdapter()).build(),
      { name: "LazyChild" }
    );
    expect(lazy.isDisposed).toBe(false);
  });

  it("load makes isLoaded true", async () => {
    const parent = createTestParent();
    const lazy = new LazyContainerImpl(
      parent,
      async () => GraphBuilder.create().provide(createDatabaseAdapter()).build(),
      { name: "LazyChild" }
    );
    await lazy.load();
    expect(lazy.isLoaded).toBe(true);
  });

  it("load is idempotent", async () => {
    let loadCount = 0;
    const parent = createTestParent();
    const lazy = new LazyContainerImpl(
      parent,
      async () => {
        loadCount++;
        return GraphBuilder.create().provide(createDatabaseAdapter()).build();
      },
      { name: "LazyChild" }
    );
    await lazy.load();
    await lazy.load();
    expect(loadCount).toBe(1);
  });

  it("load deduplicates concurrent calls", async () => {
    let loadCount = 0;
    const parent = createTestParent();
    const lazy = new LazyContainerImpl(
      parent,
      async () => {
        loadCount++;
        return GraphBuilder.create().provide(createDatabaseAdapter()).build();
      },
      { name: "LazyChild" }
    );
    const [c1, c2] = await Promise.all([lazy.load(), lazy.load()]);
    expect(loadCount).toBe(1);
    expect(c1).toBe(c2);
  });

  it("load throws DisposedScopeError if already disposed", async () => {
    const parent = createTestParent();
    const lazy = new LazyContainerImpl(
      parent,
      async () => GraphBuilder.create().provide(createDatabaseAdapter()).build(),
      { name: "LazyChild" }
    );
    await lazy.dispose();
    await expect(lazy.load()).rejects.toThrow(DisposedScopeError);
  });

  it("resolve loads and resolves the port", async () => {
    const parent = createTestParent();
    const lazy = new LazyContainerImpl(
      parent,
      async () => GraphBuilder.create().provide(createDatabaseAdapter()).build(),
      { name: "LazyChild" }
    );
    const db = await lazy.resolve(DatabasePort);
    expect(db).toBeDefined();
    expect(typeof db.query).toBe("function");
  });

  it("resolve resolves parent ports too", async () => {
    const parent = createTestParent();
    const lazy = new LazyContainerImpl(
      parent,
      async () => GraphBuilder.create().provide(createDatabaseAdapter()).build(),
      { name: "LazyChild" }
    );
    const logger = await lazy.resolve(LoggerPort);
    expect(logger).toBeDefined();
    expect(typeof logger.log).toBe("function");
  });

  it("resolveAsync delegates to load + resolveAsync", async () => {
    const parent = createTestParent();
    const lazy = new LazyContainerImpl(
      parent,
      async () => GraphBuilder.create().provide(createDatabaseAdapter()).build(),
      { name: "LazyChild" }
    );
    const db = await lazy.resolveAsync(DatabasePort);
    expect(typeof db.query).toBe("function");
  });

  it("tryResolve returns ResultAsync", async () => {
    const parent = createTestParent();
    const lazy = new LazyContainerImpl(
      parent,
      async () => GraphBuilder.create().provide(createDatabaseAdapter()).build(),
      { name: "LazyChild" }
    );
    const result = lazy.tryResolve(DatabasePort);
    const unwrapped = await result;
    expect(unwrapped.isOk()).toBe(true);
  });

  it("tryResolveAsync returns ResultAsync", async () => {
    const parent = createTestParent();
    const lazy = new LazyContainerImpl(
      parent,
      async () => GraphBuilder.create().provide(createDatabaseAdapter()).build(),
      { name: "LazyChild" }
    );
    const result = lazy.tryResolveAsync(DatabasePort);
    const unwrapped = await result;
    expect(unwrapped.isOk()).toBe(true);
  });

  it("tryDispose returns ResultAsync", async () => {
    const parent = createTestParent();
    const lazy = new LazyContainerImpl(
      parent,
      async () => GraphBuilder.create().provide(createDatabaseAdapter()).build(),
      { name: "LazyChild" }
    );
    const result = await lazy.tryDispose();
    expect(result.isOk()).toBe(true);
  });

  it("has delegates to parent before load", () => {
    const parent = createTestParent();
    const lazy = new LazyContainerImpl(
      parent,
      async () => GraphBuilder.create().provide(createDatabaseAdapter()).build(),
      { name: "LazyChild" }
    );
    expect(lazy.has(LoggerPort)).toBe(true);
    expect(lazy.has(DatabasePort)).toBe(false); // Not yet loaded
  });

  it("has delegates to loaded container after load", async () => {
    const parent = createTestParent();
    const lazy = new LazyContainerImpl(
      parent,
      async () => GraphBuilder.create().provide(createDatabaseAdapter()).build(),
      { name: "LazyChild" }
    );
    await lazy.load();
    expect(lazy.has(DatabasePort)).toBe(true);
    expect(lazy.has(LoggerPort)).toBe(true);
  });

  it("dispose marks as disposed", async () => {
    const parent = createTestParent();
    const lazy = new LazyContainerImpl(
      parent,
      async () => GraphBuilder.create().provide(createDatabaseAdapter()).build(),
      { name: "LazyChild" }
    );
    await lazy.dispose();
    expect(lazy.isDisposed).toBe(true);
  });

  it("dispose is idempotent", async () => {
    const parent = createTestParent();
    const lazy = new LazyContainerImpl(
      parent,
      async () => GraphBuilder.create().provide(createDatabaseAdapter()).build(),
      { name: "LazyChild" }
    );
    await lazy.dispose();
    await lazy.dispose();
    expect(lazy.isDisposed).toBe(true);
  });

  it("dispose handles in-flight load that fails", async () => {
    const parent = createTestParent();
    let rejectFn: (() => void) | undefined;
    const lazy = new LazyContainerImpl(
      parent,
      () =>
        new Promise((_resolve, reject) => {
          rejectFn = () => reject(new Error("load failed"));
        }),
      { name: "LazyChild" }
    );

    // Start loading
    const loadPromise = lazy.load().catch(() => {});

    // Fail the load
    rejectFn?.();
    await loadPromise;

    // Can still dispose without error
    await lazy.dispose();
    expect(lazy.isDisposed).toBe(true);
  });

  it("load clears promise on failure to allow retry", async () => {
    const parent = createTestParent();
    let callCount = 0;
    const lazy = new LazyContainerImpl(
      parent,
      async () => {
        callCount++;
        if (callCount === 1) throw new Error("first try fails");
        return GraphBuilder.create().provide(createDatabaseAdapter()).build();
      },
      { name: "LazyChild" }
    );

    // First attempt fails
    await expect(lazy.load()).rejects.toThrow("first try fails");

    // Second attempt succeeds (promise was cleared on failure)
    const container = await lazy.load();
    expect(container).toBeDefined();
    expect(callCount).toBe(2);
  });
});

describe("createLazyChild via container", () => {
  it("creates lazy child from parent", () => {
    const parent = createContainer({
      graph: GraphBuilder.create().provide(createLoggerAdapter()).build(),
      name: "Parent",
    });

    const lazyChild = parent.createLazyChild(
      async () => GraphBuilder.create().provide(createDatabaseAdapter()).build(),
      { name: "LazyChild" }
    );

    expect(lazyChild).toBeDefined();
    expect(lazyChild.isLoaded).toBe(false);
  });

  it("lazy child resolves parent ports before loading", async () => {
    const parent = createContainer({
      graph: GraphBuilder.create().provide(createLoggerAdapter()).build(),
      name: "Parent",
    });

    const lazyChild = parent.createLazyChild(
      async () => GraphBuilder.create().provide(createDatabaseAdapter()).build(),
      { name: "LazyChild" }
    );

    const logger = await lazyChild.resolve(LoggerPort);
    expect(logger).toBeDefined();
    expect(typeof logger.log).toBe("function");
  });

  it("lazy child loads and resolves extension ports", async () => {
    const parent = createContainer({
      graph: GraphBuilder.create().provide(createLoggerAdapter()).build(),
      name: "Parent",
    });

    const lazyChild = parent.createLazyChild(
      async () => GraphBuilder.create().provide(createDatabaseAdapter()).build(),
      { name: "LazyChild" }
    );

    await lazyChild.load();
    expect(lazyChild.isLoaded).toBe(true);
  });
});
