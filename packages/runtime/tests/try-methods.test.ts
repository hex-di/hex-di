/**
 * Tests for Result-returning try* methods on Container, Scope, and LazyContainer.
 *
 * Verifies that tryResolve, tryResolveAsync, and tryDispose correctly wrap
 * throwing operations into Result/ResultAsync types.
 *
 * @packageDocumentation
 */

import { describe, test, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import type { Port } from "@hex-di/core";
import { ok, safeTry } from "@hex-di/result";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer, resolveResult, recordResult } from "../src/index.js";
import {
  FactoryError,
  AsyncFactoryError,
  AsyncInitializationRequiredError,
  CircularDependencyError,
  DisposedScopeError,
  ScopeRequiredError,
  DisposalError,
  ContainerError,
} from "../src/errors/index.js";
import type { InspectorEvent } from "../src/inspection/types.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): unknown;
}

interface RequestContext {
  requestId: string;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const RequestContextPort = port<RequestContext>()({ name: "RequestContext" });

// Suppress unused variable warnings
void LoggerPort;
void DatabasePort;
void RequestContextPort;

// =============================================================================
// Container.tryResolve
// =============================================================================

describe("Container.tryResolve", () => {
  test("returns Ok on successful resolution", () => {
    const logFn = vi.fn();
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: logFn }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = container.tryResolve(LoggerPort);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.log).toBe(logFn);
    }
  });

  test("returns Err(FactoryError) when factory throws", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => {
        throw new Error("Factory boom");
      },
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = container.tryResolve(LoggerPort);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(FactoryError);
      expect(result.error.code).toBe("FACTORY_FAILED");
    }
  });

  test("returns Err(DisposedScopeError) on disposed container", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    await container.dispose();

    const result = container.tryResolve(LoggerPort);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(DisposedScopeError);
      expect(result.error.code).toBe("DISPOSED_SCOPE");
    }
  });

  test("returns Err(ScopeRequiredError) on scoped port from root", () => {
    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "req-1" }),
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = container.tryResolve(RequestContextPort);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ScopeRequiredError);
      expect(result.error.code).toBe("SCOPE_REQUIRED");
    }
  });
});

// =============================================================================
// Container.tryResolveAsync
// =============================================================================

describe("Container.tryResolveAsync", () => {
  test("returns Ok on successful async resolution", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = await container.tryResolveAsync(LoggerPort);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(typeof result.value.log).toBe("function");
    }
  });

  test("returns Err(AsyncFactoryError) on async factory failure", async () => {
    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: async () => {
        throw new Error("Connection failed");
      },
    });

    const graph = GraphBuilder.create().provide(DatabaseAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = await container.tryResolveAsync(DatabasePort);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(AsyncFactoryError);
      expect(result.error.code).toBe("ASYNC_FACTORY_FAILED");
    }
  });

  test("returns Err(DisposedScopeError) on disposed container", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    await container.dispose();

    const result = await container.tryResolveAsync(LoggerPort);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(DisposedScopeError);
    }
  });
});

// =============================================================================
// Container.tryDispose
// =============================================================================

describe("Container.tryDispose", () => {
  test("returns Ok on clean disposal", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    container.resolve(LoggerPort);

    const result = await container.tryDispose();

    expect(result.isOk()).toBe(true);
  });

  test("returns Err(DisposalError) when finalizer throws", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
      finalizer: () => {
        throw new Error("Cleanup failed");
      },
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    container.resolve(LoggerPort);

    const result = await container.tryDispose();

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(DisposalError);
      expect(result.error.code).toBe("DISPOSAL_FAILED");
      expect(result.error.causes.length).toBeGreaterThan(0);
    }
  });

  test("DisposalError captures multiple finalizer failures", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
      finalizer: () => {
        throw new Error("Logger cleanup failed");
      },
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
      finalizer: () => {
        throw new Error("Database cleanup failed");
      },
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    container.resolve(LoggerPort);
    container.resolve(DatabasePort);

    const result = await container.tryDispose();

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(DisposalError);
      expect(result.error.causes).toHaveLength(2);
    }
  });
});

// =============================================================================
// Scope.tryResolve
// =============================================================================

describe("Scope.tryResolve", () => {
  test("returns Ok on successful resolution", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const scope = container.createScope();

    const result = scope.tryResolve(LoggerPort);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(typeof result.value.log).toBe("function");
    }
  });

  test("returns Err(FactoryError) when factory throws", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => {
        throw new Error("Factory boom");
      },
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const scope = container.createScope();

    const result = scope.tryResolve(LoggerPort);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(FactoryError);
    }
  });

  test("returns Err(DisposedScopeError) on disposed scope", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const scope = container.createScope();

    await scope.dispose();

    const result = scope.tryResolve(LoggerPort);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(DisposedScopeError);
    }
  });

  test("resolves scoped ports successfully", () => {
    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "req-1" }),
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const scope = container.createScope();

    const result = scope.tryResolve(RequestContextPort);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.requestId).toBe("req-1");
    }
  });
});

// =============================================================================
// Scope.tryResolveAsync
// =============================================================================

describe("Scope.tryResolveAsync", () => {
  test("returns Ok on successful async resolution", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const scope = container.createScope();

    const result = await scope.tryResolveAsync(LoggerPort);

    expect(result.isOk()).toBe(true);
  });

  test("returns Err on async factory failure", async () => {
    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: async () => {
        throw new Error("Connection failed");
      },
    });

    const graph = GraphBuilder.create().provide(DatabaseAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const scope = container.createScope();

    const result = await scope.tryResolveAsync(DatabasePort);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(AsyncFactoryError);
    }
  });
});

// =============================================================================
// Scope.tryDispose
// =============================================================================

describe("Scope.tryDispose", () => {
  test("returns Ok on clean disposal", async () => {
    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "req-1" }),
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const scope = container.createScope();

    scope.resolve(RequestContextPort);

    const result = await scope.tryDispose();

    expect(result.isOk()).toBe(true);
  });

  test("returns Err(DisposalError) when finalizer throws", async () => {
    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "req-1" }),
      finalizer: () => {
        throw new Error("Cleanup failed");
      },
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const scope = container.createScope();

    scope.resolve(RequestContextPort);

    const result = await scope.tryDispose();

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(DisposalError);
      expect(result.error.code).toBe("DISPOSAL_FAILED");
    }
  });
});

// =============================================================================
// LazyContainer try methods
// =============================================================================

describe("LazyContainer try methods", () => {
  test("tryResolve returns Ok on successful resolution", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const lazy = initialized.createLazyChild(() => Promise.resolve(GraphBuilder.create().build()), {
      name: "Lazy",
    });

    // Resolve a parent port through the lazy container
    const result = await lazy.tryResolve(LoggerPort);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(typeof result.value.log).toBe("function");
    }
  });

  test("tryResolveAsync returns Ok on successful resolution", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const lazy = initialized.createLazyChild(() => Promise.resolve(GraphBuilder.create().build()), {
      name: "Lazy",
    });

    const result = await lazy.tryResolveAsync(LoggerPort);

    expect(result.isOk()).toBe(true);
  });

  test("tryResolve returns Err when graph loader fails", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const lazy = initialized.createLazyChild(
      () => Promise.reject(new DisposedScopeError("LazyContainer")),
      { name: "Lazy" }
    );

    const result = await lazy.tryResolve(LoggerPort);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(DisposedScopeError);
    }
  });

  test("tryDispose returns Ok on clean disposal", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const lazy = initialized.createLazyChild(() => Promise.resolve(GraphBuilder.create().build()), {
      name: "Lazy",
    });

    const result = await lazy.tryDispose();

    expect(result.isOk()).toBe(true);
  });
});

// =============================================================================
// DisposalError class
// =============================================================================

describe("DisposalError", () => {
  test("fromAggregateError extracts causes", () => {
    const errors = [new Error("err1"), new Error("err2")];
    const aggregate = new AggregateError(errors, "Multiple failures");

    const disposal = DisposalError.fromAggregateError(aggregate);

    expect(disposal).toBeInstanceOf(DisposalError);
    expect(disposal).toBeInstanceOf(ContainerError);
    expect(disposal.code).toBe("DISPOSAL_FAILED");
    expect(disposal.isProgrammingError).toBe(false);
    expect(disposal.causes).toHaveLength(2);
    expect(disposal.causes[0]).toBe(errors[0]);
    expect(disposal.causes[1]).toBe(errors[1]);
    expect(Object.isFrozen(disposal.causes)).toBe(true);
  });

  test("fromUnknown handles AggregateError", () => {
    const errors = [new Error("err1")];
    const aggregate = new AggregateError(errors, "Failure");

    const disposal = DisposalError.fromUnknown(aggregate);

    expect(disposal.causes).toHaveLength(1);
    expect(disposal.causes[0]).toBe(errors[0]);
  });

  test("fromUnknown handles regular Error", () => {
    const error = new Error("single failure");

    const disposal = DisposalError.fromUnknown(error);

    expect(disposal.causes).toHaveLength(1);
    expect(disposal.causes[0]).toBe(error);
    expect(disposal.message).toContain("single failure");
  });

  test("fromUnknown handles non-Error values", () => {
    const disposal = DisposalError.fromUnknown("string error");

    expect(disposal.causes).toHaveLength(1);
    expect(disposal.causes[0]).toBe("string error");
    expect(disposal.message).toContain("string error");
  });

  test("name getter returns DisposalError", () => {
    const disposal = DisposalError.fromUnknown(new Error("test"));

    expect(disposal.name).toBe("DisposalError");
  });
});

// =============================================================================
// Container.tryInitialize
// =============================================================================

describe("Container.tryInitialize", () => {
  test("returns Ok with initialized container on success", async () => {
    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: async () => ({ query: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(DatabaseAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = await container.tryInitialize();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // The initialized container should resolve async ports synchronously
      const db = result.value.resolve(DatabasePort);
      expect(typeof db.query).toBe("function");
    }
  });

  test("returns Err(ContainerError) when container is disposed", async () => {
    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: async () => ({ query: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(DatabaseAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    await container.dispose();

    const result = await container.tryInitialize();

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ContainerError);
      expect(result.error).toBeInstanceOf(DisposedScopeError);
      expect(result.error.code).toBe("DISPOSED_SCOPE");
    }
  });

  test("returns Err(ContainerError) when async factory fails", async () => {
    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: async (): Promise<Database> => {
        throw new Error("Connection refused");
      },
    });

    const graph = GraphBuilder.create().provide(DatabaseAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = await container.tryInitialize();

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ContainerError);
      expect(result.error).toBeInstanceOf(AsyncFactoryError);
      expect(result.error.code).toBe("ASYNC_FACTORY_FAILED");
    }
  });

  test("initialized container from tryInitialize works the same as from initialize", async () => {
    const logFn = vi.fn();
    const queryFn = vi.fn();

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: logFn }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: async () => ({ query: queryFn }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = await container.tryInitialize();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const initialized = result.value;
      // Can resolve sync ports
      expect(initialized.resolve(LoggerPort).log).toBe(logFn);
      // Can resolve async ports (now initialized)
      expect(initialized.resolve(DatabasePort).query).toBe(queryFn);
      // Has expected properties
      expect(initialized.isInitialized).toBe(true);
      expect(initialized.name).toBe("Test");
    }
  });

  test("can compose with map and andThen", async () => {
    const queryFn = vi.fn();

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: async () => ({ query: queryFn }),
    });

    const graph = GraphBuilder.create().provide(DatabaseAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = await container
      .tryInitialize()
      .map(initialized => initialized.resolve(DatabasePort));

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.query).toBe(queryFn);
    }
  });
});

// =============================================================================
// Initialized Container try methods
// =============================================================================

describe("Initialized Container try methods", () => {
  test("tryResolve works on initialized container", async () => {
    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: async () => ({ query: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(DatabaseAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const result = initialized.tryResolve(DatabasePort);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(typeof result.value.query).toBe("function");
    }
  });

  test("tryResolveAsync works on initialized container", async () => {
    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: async () => ({ query: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(DatabaseAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const result = await initialized.tryResolveAsync(DatabasePort);

    expect(result.isOk()).toBe(true);
  });

  test("tryDispose works on initialized container", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const result = await initialized.tryDispose();

    expect(result.isOk()).toBe(true);
  });
});

// =============================================================================
// Child Container try methods
// =============================================================================

describe("Child Container try methods", () => {
  test("tryResolve works on child container", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const childGraph = GraphBuilder.forParent(graph).override(LoggerAdapter).build();
    const child = initialized.createChild(childGraph, { name: "Child" });

    const result = child.tryResolve(LoggerPort);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(typeof result.value.log).toBe("function");
    }
  });

  test("tryResolveAsync works on child container", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const childGraph = GraphBuilder.forParent(graph).override(LoggerAdapter).build();
    const child = initialized.createChild(childGraph, { name: "Child" });

    const result = await child.tryResolveAsync(LoggerPort);

    expect(result.isOk()).toBe(true);
  });

  test("tryDispose works on child container", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const childGraph = GraphBuilder.forParent(graph).override(LoggerAdapter).build();
    const child = initialized.createChild(childGraph, { name: "Child" });

    const result = await child.tryDispose();

    expect(result.isOk()).toBe(true);
  });
});

// =============================================================================
// Result composability
// =============================================================================

describe("Result composability", () => {
  test("tryResolve result can be chained with map", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const hasLog = container.tryResolve(LoggerPort).map(logger => typeof logger.log === "function");

    expect(hasLog.isOk()).toBe(true);
    if (hasLog.isOk()) {
      expect(hasLog.value).toBe(true);
    }
  });

  test("tryResolveAsync result can be chained with map", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const hasLog = await container
      .tryResolveAsync(LoggerPort)
      .map(logger => typeof logger.log === "function");

    expect(hasLog.isOk()).toBe(true);
    if (hasLog.isOk()) {
      expect(hasLog.value).toBe(true);
    }
  });

  test("tryResolve error can be handled with match", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: (): Logger => {
        throw new Error("Factory boom");
      },
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const message = container.tryResolve(LoggerPort).match(
      () => "success",
      error => error.code
    );

    expect(message).toBe("FACTORY_FAILED");
  });
});

// =============================================================================
// CircularDependencyError via tryResolve
// =============================================================================

describe("CircularDependencyError via tryResolve", () => {
  test("returns Err(CircularDependencyError) on circular dependency", () => {
    interface ServiceA {
      name: string;
    }
    interface ServiceB {
      name: string;
    }

    const ServiceAPort = port<ServiceA>()({ name: "ServiceA" });
    const ServiceBPort = port<ServiceB>()({ name: "ServiceB" });

    const ServiceAAdapter = createAdapter({
      provides: ServiceAPort,
      requires: [ServiceBPort],
      lifetime: "singleton",
      factory: () => ({ name: "A" }),
    });

    const ServiceBAdapter = createAdapter({
      provides: ServiceBPort,
      requires: [ServiceAPort],
      lifetime: "singleton",
      factory: () => ({ name: "B" }),
    });

    // Bypass compile-time cycle detection
    const graph = (
      GraphBuilder.create().provide(ServiceAAdapter).provide(ServiceBAdapter) as any
    ).build();
    const container = createContainer({ graph, name: "Test" });

    const result = container.tryResolve(ServiceAPort);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(CircularDependencyError);
      expect(result.error.code).toBe("CIRCULAR_DEPENDENCY");
      expect((result.error as CircularDependencyError).dependencyChain).toContain("ServiceA");
      expect((result.error as CircularDependencyError).dependencyChain).toContain("ServiceB");
    }
  });
});

// =============================================================================
// AsyncInitializationRequiredError via tryResolve
// =============================================================================

describe("AsyncInitializationRequiredError via tryResolve", () => {
  test("returns Err(AsyncInitializationRequiredError) on uninitialized async port", () => {
    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: async () => ({ query: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(DatabaseAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    // Cast to bypass type system (tryResolve excludes async ports on uninitialized containers)
    const tryResolve = container.tryResolve as (
      port: Port<unknown, string>
    ) => ReturnType<typeof container.tryResolve>;
    const result = tryResolve(DatabasePort);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(AsyncInitializationRequiredError);
      expect(result.error.code).toBe("ASYNC_INIT_REQUIRED");
    }
  });
});

// =============================================================================
// Double-disposal idempotence
// =============================================================================

describe("Double-disposal idempotence", () => {
  test("calling tryDispose twice - second call succeeds (idempotent)", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    container.resolve(LoggerPort);

    const result1 = await container.tryDispose();
    expect(result1.isOk()).toBe(true);

    const result2 = await container.tryDispose();
    // Second disposal should be idempotent (container is already disposed)
    expect(result2.isOk()).toBe(true);
  });
});

// =============================================================================
// Child container error scenarios
// =============================================================================

describe("Child container error scenarios", () => {
  test("factory failure in child returns Err(FactoryError)", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const FailingLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: (): Logger => {
        throw new Error("Child factory boom");
      },
    });

    const childGraph = GraphBuilder.forParent(graph).override(FailingLoggerAdapter).build();
    const child = initialized.createChild(childGraph, { name: "Child" });

    const result = child.tryResolve(LoggerPort);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(FactoryError);
      expect(result.error.code).toBe("FACTORY_FAILED");
    }
  });

  test("disposal failure in child returns Err(DisposalError)", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
      finalizer: () => {
        throw new Error("Child disposal boom");
      },
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    const childGraph = GraphBuilder.forParent(graph).override(LoggerAdapter).build();
    const child = initialized.createChild(childGraph, { name: "Child" });

    child.resolve(LoggerPort);

    const result = await child.tryDispose();

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(DisposalError);
      expect(result.error.code).toBe("DISPOSAL_FAILED");
    }
  });
});

// =============================================================================
// Result composition with andThen
// =============================================================================

describe("Result composition with andThen", () => {
  test("chains multiple tryResolve calls on success", () => {
    const logFn = vi.fn();
    const queryFn = vi.fn();

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: logFn }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: queryFn }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = container
      .tryResolve(LoggerPort)
      .andThen(logger => container.tryResolve(DatabasePort).map(db => ({ logger, db })));

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.logger.log).toBe(logFn);
      expect(result.value.db.query).toBe(queryFn);
    }
  });

  test("short-circuits on first error", () => {
    const FailingLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: (): Logger => {
        throw new Error("Logger boom");
      },
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    const graph = GraphBuilder.create()
      .provide(FailingLoggerAdapter)
      .provide(DatabaseAdapter)
      .build();
    const container = createContainer({ graph, name: "Test" });

    const dbResolve = vi.fn(() => container.tryResolve(DatabasePort));

    const result = container.tryResolve(LoggerPort).andThen(logger => {
      const inner = dbResolve();
      return inner.map(db => ({ logger, db }));
    });

    expect(result.isErr()).toBe(true);
    // The database resolution should never have been called
    expect(dbResolve).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Result composition with orElse (recovery)
// =============================================================================

describe("Result composition with orElse (recovery)", () => {
  test("recovers from first error with fallback", () => {
    const fallbackLog = vi.fn();

    const FailingLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: (): Logger => {
        throw new Error("Primary logger failed");
      },
    });

    const FallbackLoggerPort = port<Logger>()({ name: "FallbackLogger" });
    const FallbackLoggerAdapter = createAdapter({
      provides: FallbackLoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: fallbackLog }),
    });

    const graph = GraphBuilder.create()
      .provide(FailingLoggerAdapter)
      .provide(FallbackLoggerAdapter)
      .build();
    const container = createContainer({ graph, name: "Test" });

    const result = container
      .tryResolve(LoggerPort)
      .orElse(() => container.tryResolve(FallbackLoggerPort));

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.log).toBe(fallbackLog);
    }
  });
});

// =============================================================================
// Result composition with safeTry
// =============================================================================

describe("Result composition with safeTry", () => {
  test("chains multiple resolutions with generator syntax", () => {
    const logFn = vi.fn();
    const queryFn = vi.fn();

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: logFn }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: queryFn }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = safeTry(function* () {
      const logger = yield* container.tryResolve(LoggerPort);
      const db = yield* container.tryResolve(DatabasePort);
      return ok({ logger, db });
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.logger.log).toBe(logFn);
      expect(result.value.db.query).toBe(queryFn);
    }
  });

  test("short-circuits on error in generator", () => {
    const FailingLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: (): Logger => {
        throw new Error("Generator boom");
      },
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    const graph = GraphBuilder.create()
      .provide(FailingLoggerAdapter)
      .provide(DatabaseAdapter)
      .build();
    const container = createContainer({ graph, name: "Test" });

    const result = safeTry(function* () {
      const logger = yield* container.tryResolve(LoggerPort);
      const db = yield* container.tryResolve(DatabasePort);
      return ok({ logger, db });
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(FactoryError);
    }
  });
});

// =============================================================================
// LazyContainer retry-after-failure
// =============================================================================

describe("LazyContainer retry-after-failure", () => {
  test("retries after first graph loading failure", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const initialized = await container.initialize();

    let callCount = 0;
    const lazy = initialized.createLazyChild(
      () => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error("First load fails"));
        }
        return Promise.resolve(GraphBuilder.create().build());
      },
      { name: "Lazy" }
    );

    // First call fails
    const result1 = await lazy.tryResolve(LoggerPort);
    expect(result1.isErr()).toBe(true);

    // Second call should retry (lazy clears promise on failure)
    const result2 = await lazy.tryResolve(LoggerPort);
    expect(result2.isOk()).toBe(true);
  });
});

// =============================================================================
// Cascading disposal failure
// =============================================================================

describe("Cascading disposal failure", () => {
  test("parent and scope disposal tracked independently", async () => {
    const FailingLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
      finalizer: () => {
        throw new Error("Logger cleanup failed");
      },
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "req-1" }),
    });

    const graph = GraphBuilder.create()
      .provide(FailingLoggerAdapter)
      .provide(RequestContextAdapter)
      .build();
    const container = createContainer({ graph, name: "Test" });

    const scope = container.createScope();

    // Resolve from both
    container.resolve(LoggerPort);
    scope.resolve(RequestContextPort);

    // Dispose scope (should succeed - no failing finalizer on scoped port)
    const scopeResult = await scope.tryDispose();
    expect(scopeResult.isOk()).toBe(true);

    // Dispose parent (should fail - logger finalizer throws)
    const parentResult = await container.tryDispose();
    expect(parentResult.isErr()).toBe(true);
    if (parentResult.isErr()) {
      expect(parentResult.error).toBeInstanceOf(DisposalError);
    }
  });
});

// =============================================================================
// resolveResult() tests
// =============================================================================

describe("resolveResult()", () => {
  test("returns Ok for successful resolution", () => {
    const logFn = vi.fn();
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: logFn }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = resolveResult(() => container.resolve(LoggerPort));

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.log).toBe(logFn);
    }
  });

  test("returns Err(FactoryError) on factory failure", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: (): Logger => {
        throw new Error("Factory failure");
      },
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = resolveResult(() => container.resolve(LoggerPort));

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("FACTORY_FAILED");
    }
  });

  test("composes with safeTry for multi-resolution", () => {
    const logFn = vi.fn();
    const queryFn = vi.fn();

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: logFn }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: queryFn }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = safeTry(function* () {
      const logger = yield* resolveResult(() => container.resolve(LoggerPort));
      const db = yield* resolveResult(() => container.resolve(DatabasePort));
      return ok({ logger, db });
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.logger.log).toBe(logFn);
      expect(result.value.db.query).toBe(queryFn);
    }
  });
});

// =============================================================================
// Inspector result event tests
// =============================================================================

describe("Inspector result events", () => {
  test("tryResolve success emits result:ok event", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const events: InspectorEvent[] = [];
    container.inspector.subscribe(event => events.push(event));

    container.tryResolve(LoggerPort);

    const resultEvents = events.filter(e => e.type === "result:ok");
    expect(resultEvents).toHaveLength(1);
    expect(resultEvents[0]!.type).toBe("result:ok");
    if (resultEvents[0]!.type === "result:ok") {
      expect(resultEvents[0]!.portName).toBe("Logger");
    }
  });

  test("tryResolve failure emits result:err event with correct errorCode", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: (): Logger => {
        throw new Error("Boom");
      },
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const events: InspectorEvent[] = [];
    container.inspector.subscribe(event => events.push(event));

    container.tryResolve(LoggerPort);

    const resultEvents = events.filter(e => e.type === "result:err");
    expect(resultEvents).toHaveLength(1);
    if (resultEvents[0]!.type === "result:err") {
      expect(resultEvents[0]!.portName).toBe("Logger");
      expect(resultEvents[0]!.errorCode).toBe("FACTORY_FAILED");
    }
  });

  test("getResultStatistics returns correct counts after multiple resolutions", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    // Resolve 3 times
    container.tryResolve(LoggerPort);
    container.tryResolve(LoggerPort);
    container.tryResolve(LoggerPort);

    const stats = container.inspector.getResultStatistics("Logger");
    expect(stats).toBeDefined();
    expect(stats!.portName).toBe("Logger");
    expect(stats!.totalCalls).toBe(3);
    expect(stats!.okCount).toBe(3);
    expect(stats!.errCount).toBe(0);
    expect(stats!.errorRate).toBe(0);
  });

  test("getResultStatistics tracks error rates correctly", () => {
    let callCount = 0;
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: (): Logger => {
        callCount++;
        if (callCount <= 2) {
          throw new Error("Transient failure");
        }
        return { log: vi.fn() };
      },
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    container.tryResolve(LoggerPort); // err
    container.tryResolve(LoggerPort); // err
    container.tryResolve(LoggerPort); // ok

    const stats = container.inspector.getResultStatistics("Logger");
    expect(stats).toBeDefined();
    expect(stats!.totalCalls).toBe(3);
    expect(stats!.okCount).toBe(1);
    expect(stats!.errCount).toBe(2);
    expect(stats!.errorRate).toBeCloseTo(2 / 3);
    expect(stats!.errorsByCode.get("FACTORY_FAILED")).toBe(2);
    expect(stats!.lastError).toBeDefined();
    expect(stats!.lastError!.code).toBe("FACTORY_FAILED");
  });

  test("getHighErrorRatePorts filters by threshold", () => {
    let callCount = 0;
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: (): Logger => {
        callCount++;
        if (callCount <= 8) {
          throw new Error("Failure");
        }
        return { log: vi.fn() };
      },
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ query: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    // Logger: 8 errors, 2 successes = 80% error rate
    for (let i = 0; i < 10; i++) {
      container.tryResolve(LoggerPort);
    }

    // Database: all successes = 0% error rate
    container.tryResolve(DatabasePort);
    container.tryResolve(DatabasePort);

    // Threshold 50% should catch Logger but not Database
    const highError = container.inspector.getHighErrorRatePorts(0.5);
    expect(highError.length).toBe(1);
    expect(highError[0]!.portName).toBe("Logger");

    // Threshold 90% should catch nothing
    const veryHighError = container.inspector.getHighErrorRatePorts(0.9);
    expect(veryHighError.length).toBe(0);
  });

  test("getAllResultStatistics returns full map", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ log: vi.fn() }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ query: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    container.tryResolve(LoggerPort);
    container.tryResolve(DatabasePort);

    const allStats = container.inspector.getAllResultStatistics();
    expect(allStats.size).toBe(2);
    expect(allStats.has("Logger")).toBe(true);
    expect(allStats.has("Database")).toBe(true);
  });

  test("getResultStatistics returns undefined for unknown port", () => {
    const graph = GraphBuilder.create().build();
    const container = createContainer({ graph, name: "Test" });

    const stats = container.inspector.getResultStatistics("NonExistent");
    expect(stats).toBeUndefined();
  });
});

// =============================================================================
// recordResult() tests
// =============================================================================

describe("recordResult()", () => {
  test("records result:ok to inspector", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const events: InspectorEvent[] = [];
    container.inspector.subscribe(event => events.push(event));

    const result = container.tryResolve(LoggerPort);

    // Clear events from tryResolve's own emission
    events.length = 0;

    // Manually record the result
    recordResult(container.inspector, "Logger", result);

    const okEvents = events.filter(e => e.type === "result:ok");
    expect(okEvents).toHaveLength(1);
  });

  test("records result:err to inspector with error code", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: (): Logger => {
        throw new Error("Boom");
      },
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const events: InspectorEvent[] = [];
    container.inspector.subscribe(event => events.push(event));

    const result = container.tryResolve(LoggerPort);

    // Clear events from tryResolve's own emission
    events.length = 0;

    // Manually record the result
    recordResult(container.inspector, "Logger", result);

    const errEvents = events.filter(e => e.type === "result:err");
    expect(errEvents).toHaveLength(1);
    if (errEvents[0]!.type === "result:err") {
      expect(errEvents[0]!.errorCode).toBe("FACTORY_FAILED");
    }
  });

  test("returns the result unchanged (pass-through)", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const original = container.tryResolve(LoggerPort);
    const returned = recordResult(container.inspector, "Logger", original);

    expect(returned).toBe(original);
  });
});

// =============================================================================
// mapToContainerError wrapping non-ContainerError
// =============================================================================

describe("mapToContainerError wraps non-ContainerError", () => {
  test("non-ContainerError thrown by factory is wrapped as FactoryError", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: (): Logger => {
        throw "string error";
      },
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const result = container.tryResolve(LoggerPort);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // Should be wrapped in a ContainerError (FactoryError), not re-thrown
      expect(result.error).toBeInstanceOf(ContainerError);
    }
  });
});
