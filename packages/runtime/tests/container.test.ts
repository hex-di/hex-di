/**
 * createContainer unit tests.
 *
 * Tests for the createContainer function that creates immutable
 * containers from validated graphs for type-safe service resolution.
 */

import { describe, test, expect, vi } from "vitest";
import { port, type Port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { DisposedScopeError, ScopeRequiredError } from "../src/errors/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): unknown;
}

interface UserService {
  getUser(id: string): unknown;
}

interface RequestContext {
  requestId: string;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const UserServicePort = port<UserService>()({ name: "UserService" });
const RequestContextPort = port<RequestContext>()({ name: "RequestContext" });

// =============================================================================
// createContainer Tests
// =============================================================================

describe("createContainer", () => {
  test("returns frozen Container object", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    expect(Object.isFrozen(container)).toBe(true);
  });

  test("Container has resolve, createScope, dispose methods", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    expect(typeof container.resolve).toBe("function");
    expect(typeof container.createScope).toBe("function");
    expect(typeof container.dispose).toBe("function");
  });

  test("resolve returns correct service instance", () => {
    const logFn = vi.fn();
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: logFn }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    const logger = container.resolve(LoggerPort);
    logger.log("test");

    expect(logFn).toHaveBeenCalledWith("test");
  });

  test("resolve throws for non-existent port (runtime check)", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    // Cast to test runtime behavior with an unregistered port
    const resolve = container.resolve as (port: Port<string, unknown>) => unknown;
    expect(() => resolve(DatabasePort)).toThrow();
  });

  test("singleton instances are cached across resolves", () => {
    const factory = vi.fn(() => ({ log: vi.fn() }));
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory,
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    const first = container.resolve(LoggerPort);
    const second = container.resolve(LoggerPort);

    expect(first).toBe(second);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  test("request instances are fresh on each resolve", () => {
    const factory = vi.fn(() => ({ log: vi.fn() }));
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory,
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    const first = container.resolve(LoggerPort);
    const second = container.resolve(LoggerPort);

    expect(first).not.toBe(second);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  test("container disposal calls singleton finalizers", async () => {
    const finalizerFn = vi.fn();
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
      finalizer: finalizerFn,
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    // Resolve to trigger instance creation
    container.resolve(LoggerPort);

    await container.dispose();

    expect(finalizerFn).toHaveBeenCalledTimes(1);
  });

  test("resolve throws DisposedScopeError after disposal", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    await container.dispose();

    expect(() => container.resolve(LoggerPort)).toThrow(DisposedScopeError);
  });

  test("resolve throws ScopeRequiredError for scoped port from root container", () => {
    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "123" }),
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer({ graph: graph, name: "Test" });

    expect(() => container.resolve(RequestContextPort)).toThrow(ScopeRequiredError);
  });
});

// =============================================================================
// Container with Dependencies Tests
// =============================================================================

describe("createContainer with dependencies", () => {
  test("resolves dependencies correctly", () => {
    const logFn = vi.fn();
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: logFn }),
    });

    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: deps => ({
        getUser: (id: string) => {
          deps.Logger.log(`Getting user ${id}`);
          return { id, name: "Test User" };
        },
      }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(UserServiceAdapter).build();

    const container = createContainer({ graph: graph, name: "Test" });
    const userService = container.resolve(UserServicePort);

    userService.getUser("123");

    expect(logFn).toHaveBeenCalledWith("Getting user 123");
  });
});
