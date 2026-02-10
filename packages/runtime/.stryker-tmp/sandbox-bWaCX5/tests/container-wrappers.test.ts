/**
 * Tests for src/container/wrappers.ts
 * Covers createContainer wrapper functions, child container creation, and composition.
 */
// @ts-nocheck

import { describe, it, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { INTERNAL_ACCESS } from "../src/inspection/symbols.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): unknown;
}
interface CacheService {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}
interface UserService {
  getUser(id: string): unknown;
}
interface AuthService {
  authenticate(token: string): boolean;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const CachePort = port<CacheService>()({ name: "Cache" });
const UserServicePort = port<UserService>()({ name: "UserService" });
const AuthServicePort = port<AuthService>()({ name: "AuthService" });

function createParentContainer() {
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
  return createContainer({ graph, name: "Parent" });
}

// =============================================================================
// Tests
// =============================================================================

describe("container wrappers - createChild", () => {
  it("creates a child container from parent", () => {
    const parent = createParentContainer();
    const cacheAdapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: vi.fn(), set: vi.fn() }),
    });
    const childGraph = GraphBuilder.create().provide(cacheAdapter).build();
    const child = parent.createChild(childGraph, { name: "Child" });

    expect(child.name).toBe("Child");
    expect(child.has(LoggerPort)).toBe(true);
    expect(child.has(DatabasePort)).toBe(true);
    expect(child.has(CachePort)).toBe(true);
  });

  it("child resolves parent's ports", () => {
    const parent = createParentContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const logger = child.resolve(LoggerPort);
    expect(logger).toBeDefined();
    expect(typeof logger.log).toBe("function");
  });

  it("child resolves its own extension ports", () => {
    const parent = createParentContainer();
    const cacheAdapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: vi.fn(), set: vi.fn() }),
    });
    const childGraph = GraphBuilder.create().provide(cacheAdapter).build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const cache = child.resolve(CachePort);
    expect(cache).toBeDefined();
    expect(typeof cache.get).toBe("function");
  });

  it("child container overrides parent ports", () => {
    const parent = createParentContainer();
    const mockLogFn = vi.fn();
    const mockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: mockLogFn }),
    });
    const childGraph = GraphBuilder.create().override(mockLoggerAdapter).build();
    const child = parent.createChild(childGraph, { name: "OverrideChild" });

    const logger = child.resolve(LoggerPort);
    logger.log("test-override");
    expect(mockLogFn).toHaveBeenCalledWith("test-override");
  });

  it("child container is frozen", () => {
    const parent = createParentContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });
    expect(Object.isFrozen(child)).toBe(true);
  });

  it("child container has INTERNAL_ACCESS", () => {
    const parent = createParentContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const state = child[INTERNAL_ACCESS]();
    expect(state.disposed).toBe(false);
  });
});

describe("container wrappers - dispose", () => {
  it("disposing parent cascades to child containers", async () => {
    const parent = createParentContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    await parent.dispose();
    expect(parent.isDisposed).toBe(true);
    expect(child.isDisposed).toBe(true);
  });

  it("disposing child does not affect parent", async () => {
    const parent = createParentContainer();
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    await child.dispose();
    expect(child.isDisposed).toBe(true);
    expect(parent.isDisposed).toBe(false);
  });
});

describe("container wrappers - tryResolve and tryDispose", () => {
  it("tryResolve returns Ok for valid resolution", () => {
    const parent = createParentContainer();
    const result = parent.tryResolve(LoggerPort);
    expect(result.isOk()).toBe(true);
  });

  it("tryDispose returns Ok on successful disposal", async () => {
    const parent = createParentContainer();
    const result = await parent.tryDispose();
    expect(result.isOk()).toBe(true);
  });
});

describe("container wrappers - scope creation from container", () => {
  it("creates scopes from container", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: vi.fn() }),
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const scope = container.createScope();
    expect(scope).toBeDefined();
    const logger = scope.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });

  it("scoped instances are isolated between scopes", () => {
    const factory = vi.fn(() => ({ log: vi.fn() }));
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory,
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    const scope1 = container.createScope();
    const scope2 = container.createScope();
    const logger1 = scope1.resolve(LoggerPort);
    const logger2 = scope2.resolve(LoggerPort);
    expect(logger1).not.toBe(logger2);
  });
});

describe("container wrappers - multiple child containers", () => {
  it("supports multiple children from the same parent", () => {
    const parent = createParentContainer();

    const cacheAdapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: vi.fn(), set: vi.fn() }),
    });
    const childGraph1 = GraphBuilder.create().provide(cacheAdapter).build();
    const child1 = parent.createChild(childGraph1, { name: "Child1" });

    const authAdapter = createAdapter({
      provides: AuthServicePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ authenticate: () => true }),
    });
    const childGraph2 = GraphBuilder.create().provide(authAdapter).build();
    const child2 = parent.createChild(childGraph2, { name: "Child2" });

    expect(child1.has(CachePort)).toBe(true);
    expect(child2.has(AuthServicePort)).toBe(true);
    // Both inherit from parent
    expect(child1.has(LoggerPort)).toBe(true);
    expect(child2.has(LoggerPort)).toBe(true);
  });
});
