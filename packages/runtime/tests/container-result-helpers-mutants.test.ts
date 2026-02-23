/**
 * Comprehensive mutation-killing tests for src/container/result-helpers.ts
 *
 * Targets all surviving mutants:
 * - tryResolveSync: try/catch branching, ok() vs err() return
 * - tryResolveAsyncResultAsync: fromPromise wrapping
 * - tryResolveAsyncFromSync: ResultAsync.ok creation
 * - tryDisposeResultAsync: fromPromise wrapping
 * - isContainerError: type guard checks
 * - errorMapper: factory call, wrap logic
 */
import { describe, it, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import {
  DisposedScopeError,
  ScopeRequiredError,
  FactoryError,
  DisposalError,
} from "../src/errors/index.js";

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
const _DatabasePort = port<Database>()({ name: "Database" });

// =============================================================================
// tryResolve - sync
// =============================================================================

describe("result-helpers: tryResolve sync", () => {
  it("returns Ok with the value on success", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = container.tryResolve(LoggerPort);
    expect(result.isOk()).toBe(true);
    expect(result.isErr()).toBe(false);
    if (result.isOk()) {
      expect(typeof result.value.log).toBe("function");
    }
  });

  it("returns Err with FactoryError when factory throws", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => {
        throw new Error("factory exploded");
      },
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = container.tryResolve(LoggerPort);
    expect(result.isOk()).toBe(false);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(FactoryError);
    }
  });

  it("returns Err with DisposedScopeError when disposed", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    await container.dispose();

    const result = container.tryResolve(LoggerPort);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(DisposedScopeError);
    }
  });

  it("returns Err with ScopeRequiredError for scoped port", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = container.tryResolve(LoggerPort);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ScopeRequiredError);
    }
  });
});

// =============================================================================
// tryResolveAsync
// =============================================================================

describe("result-helpers: tryResolveAsync", () => {
  it("returns Ok with the value on success", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const resultAsync = container.tryResolveAsync(LoggerPort);
    const result = await resultAsync;
    expect(result.isOk()).toBe(true);
    expect(result.isErr()).toBe(false);
    if (result.isOk()) {
      expect(typeof result.value.log).toBe("function");
    }
  });

  it("returns Err when resolution fails", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => {
        throw new Error("async fail");
      },
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = await container.tryResolveAsync(LoggerPort);
    expect(result.isErr()).toBe(true);
  });

  it("returns Err when container is disposed", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    await container.dispose();

    const result = await container.tryResolveAsync(LoggerPort);
    expect(result.isErr()).toBe(true);
  });
});

// =============================================================================
// tryDispose
// =============================================================================

describe("result-helpers: tryDispose", () => {
  it("returns Ok on successful disposal", async () => {
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
    expect(result.isErr()).toBe(false);
    expect(container.isDisposed).toBe(true);
  });

  it("returns Err when finalizer throws", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
      finalizer: () => {
        throw new Error("finalizer boom");
      },
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    container.resolve(LoggerPort);
    const result = await container.tryDispose();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(DisposalError);
    }
  });

  it("returns Ok when disposing already-disposed container", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    await container.dispose();
    const result = await container.tryDispose();
    // Second dispose is idempotent, returns Ok
    expect(result.isOk()).toBe(true);
  });
});

// =============================================================================
// result-helpers: child container try methods
// =============================================================================

describe("result-helpers: child container try methods", () => {
  it("tryResolve on child returns Ok", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const parent = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const result = child.tryResolve(LoggerPort);
    expect(result.isOk()).toBe(true);
  });

  it("tryResolveAsync on child returns Ok", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const parent = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const result = await child.tryResolveAsync(LoggerPort);
    expect(result.isOk()).toBe(true);
  });

  it("tryDispose on child returns Ok", async () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const parent = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const result = await child.tryDispose();
    expect(result.isOk()).toBe(true);
    expect(child.isDisposed).toBe(true);
  });
});
