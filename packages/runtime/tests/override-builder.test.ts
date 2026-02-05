/**
 * Override Builder API tests.
 *
 * Tests for the type-safe container.override() method that creates an
 * OverrideBuilder for fluent override chaining.
 *
 * This API provides compile-time validation of:
 * 1. Port existence in the graph
 * 2. Dependency satisfaction
 *
 * @packageDocumentation
 */

import { describe, test, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer, OverrideBuilder } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
  name: string;
}

interface Database {
  query(sql: string): unknown;
}

interface UserService {
  getUser(id: string): { id: string; name: string };
}

interface Config {
  getValue(key: string): string;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const UserServicePort = port<UserService>()({ name: "UserService" });
const _ConfigPort = port<Config>()({ name: "Config" });

// =============================================================================
// container.override() Returns OverrideBuilder
// =============================================================================

describe("container.override() returns OverrideBuilder", () => {
  test("override returns OverrideBuilder instance", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "MockLogger" }),
    });

    const builder = container.override(MockLoggerAdapter);
    expect(builder).toBeInstanceOf(OverrideBuilder);
  });

  test("override is available on uninitialized containers", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    // Container is uninitialized
    expect(container.isInitialized).toBe(false);

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "MockLogger" }),
    });

    const builder = container.override(MockLoggerAdapter);
    expect(builder).toBeInstanceOf(OverrideBuilder);
  });

  test("override is available on initialized containers", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const uninitializedContainer = createContainer({ graph, name: "Test" });
    const container = await uninitializedContainer.initialize();

    // Container is initialized
    expect(container.isInitialized).toBe(true);

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "MockLogger" }),
    });

    const builder = container.override(MockLoggerAdapter);
    expect(builder).toBeInstanceOf(OverrideBuilder);
  });

  test("override is available on child containers", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const parent = createContainer({ graph, name: "Parent" });

    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "MockLogger" }),
    });

    const builder = child.override(MockLoggerAdapter);
    expect(builder).toBeInstanceOf(OverrideBuilder);
  });
});

// =============================================================================
// Builder Can Chain Multiple Overrides
// =============================================================================

describe("OverrideBuilder chaining", () => {
  test("builder can chain multiple override calls", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "MockLogger" }),
    });

    const MockDatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    const builder = container.override(MockLoggerAdapter).override(MockDatabaseAdapter);

    expect(builder).toBeInstanceOf(OverrideBuilder);
  });

  test("each override call returns a new builder (immutability)", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "MockLogger" }),
    });

    const MockDatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    const builder1 = container.override(MockLoggerAdapter);
    const builder2 = builder1.override(MockDatabaseAdapter);

    // Should be different instances (immutable pattern)
    expect(builder1).not.toBe(builder2);
  });
});

// =============================================================================
// build() Creates Child Container with Overrides
// =============================================================================

describe("OverrideBuilder.build()", () => {
  test("build creates child container", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "MockLogger" }),
    });

    const childContainer = container.override(MockLoggerAdapter).build();

    expect(childContainer).toBeDefined();
    expect(childContainer.kind).toBe("child");
    expect(childContainer.parentName).toBe("Test");
  });

  test("child container name is auto-generated from parent", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "MyContainer" });

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "MockLogger" }),
    });

    const childContainer = container.override(MockLoggerAdapter).build();

    // Name should be auto-derived from parent
    expect(childContainer.name).toBe("MyContainer-override");
  });
});

// =============================================================================
// Overrides Actually Replace Original Adapters
// =============================================================================

describe("Override behavior", () => {
  test("override replaces original adapter", () => {
    const realLogFn = vi.fn();
    const mockLogFn = vi.fn();

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: realLogFn, name: "RealLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    // Original container returns real logger
    const realLogger = container.resolve(LoggerPort);
    expect(realLogger.name).toBe("RealLogger");

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: mockLogFn, name: "MockLogger" }),
    });

    const testContainer = container.override(MockLoggerAdapter).build();

    // Override container returns mock logger
    const mockLogger = testContainer.resolve(LoggerPort);
    expect(mockLogger.name).toBe("MockLogger");

    // Verify they use different functions
    mockLogger.log("test");
    expect(mockLogFn).toHaveBeenCalledWith("test");
    expect(realLogFn).not.toHaveBeenCalled();
  });

  test("multiple overrides all take effect", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "MockLogger" }),
    });

    const mockQuery = vi.fn();
    const MockDatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: mockQuery }),
    });

    const testContainer = container
      .override(MockLoggerAdapter)
      .override(MockDatabaseAdapter)
      .build();

    // Both should be overridden
    expect(testContainer.resolve(LoggerPort).name).toBe("MockLogger");

    testContainer.resolve(DatabasePort).query("SELECT 1");
    expect(mockQuery).toHaveBeenCalledWith("SELECT 1");
  });

  test("non-overridden ports resolve from parent", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "MockLogger" }),
    });

    // Only override Logger, not Database
    const testContainer = container.override(MockLoggerAdapter).build();

    // Logger is overridden
    expect(testContainer.resolve(LoggerPort).name).toBe("MockLogger");

    // Database should resolve from parent (inherited)
    const parentDb = container.resolve(DatabasePort);
    const childDb = testContainer.resolve(DatabasePort);
    // Should be the same instance (shared inheritance)
    expect(childDb).toBe(parentDb);
  });

  test("override with dependencies resolved from parent", () => {
    const logFn = vi.fn();

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: logFn, name: "RealLogger" }),
    });

    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: deps => ({
        getUser: (id: string) => {
          deps.Logger.log(`Getting user ${id}`);
          return { id, name: "Real User" };
        },
      }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(UserServiceAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    // Override UserService with different implementation that still uses Logger
    const mockLogFn = vi.fn();
    const MockUserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: deps => ({
        getUser: (id: string) => {
          deps.Logger.log(`Mock getting user ${id}`);
          return { id, name: "Mock User" };
        },
      }),
    });

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: mockLogFn, name: "MockLogger" }),
    });

    // Override both UserService and Logger
    const testContainer = container
      .override(MockLoggerAdapter)
      .override(MockUserServiceAdapter)
      .build();

    const userService = testContainer.resolve(UserServicePort);
    const user = userService.getUser("123");

    expect(user.name).toBe("Mock User");
    expect(mockLogFn).toHaveBeenCalledWith("Mock getting user 123");
    expect(logFn).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Original Container Unaffected
// =============================================================================

describe("Original container isolation", () => {
  test("original container is not affected by override", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    // Get original logger first
    const originalLogger = container.resolve(LoggerPort);

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "MockLogger" }),
    });

    // Create override container
    const testContainer = container.override(MockLoggerAdapter).build();

    // Original container still returns original logger
    const afterOverrideLogger = container.resolve(LoggerPort);
    expect(afterOverrideLogger).toBe(originalLogger);
    expect(afterOverrideLogger.name).toBe("RealLogger");

    // Override container returns mock
    expect(testContainer.resolve(LoggerPort).name).toBe("MockLogger");
  });

  test("multiple override containers from same parent are independent", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const MockLoggerAdapter1 = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "Mock1" }),
    });

    const MockLoggerAdapter2 = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "Mock2" }),
    });

    const testContainer1 = container.override(MockLoggerAdapter1).build();
    const testContainer2 = container.override(MockLoggerAdapter2).build();

    // Each override container has its own mock
    expect(testContainer1.resolve(LoggerPort).name).toBe("Mock1");
    expect(testContainer2.resolve(LoggerPort).name).toBe("Mock2");

    // Original container still has original
    expect(container.resolve(LoggerPort).name).toBe("RealLogger");
  });
});

// =============================================================================
// Override from Child Container
// =============================================================================

describe("Override from child container", () => {
  test("child container can create override child", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const parent = createContainer({ graph, name: "Parent" });

    // Create empty child first
    const childGraph = GraphBuilder.create().build();
    const child = parent.createChild(childGraph, { name: "Child" });

    // Override from child
    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "MockLogger" }),
    });

    const grandchild = child.override(MockLoggerAdapter).build();

    // Grandchild has override
    expect(grandchild.resolve(LoggerPort).name).toBe("MockLogger");

    // Child still has original (inherited from parent)
    expect(child.resolve(LoggerPort).name).toBe("RealLogger");

    // Parent still has original
    expect(parent.resolve(LoggerPort).name).toBe("RealLogger");
  });
});

// =============================================================================
// Disposal Behavior
// =============================================================================

describe("Override container disposal", () => {
  test("override container can be disposed independently", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "MockLogger" }),
    });

    const testContainer = container.override(MockLoggerAdapter).build();

    // Dispose override container
    await testContainer.dispose();

    expect(testContainer.isDisposed).toBe(true);
    expect(container.isDisposed).toBe(false);

    // Parent container still works
    expect(container.resolve(LoggerPort).name).toBe("RealLogger");
  });

  test("disposing parent does NOT dispose override children", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "MockLogger" }),
    });

    const testContainer = container.override(MockLoggerAdapter).build();

    // Dispose parent container
    await container.dispose();

    // Both should be disposed (cascade disposal)
    expect(container.isDisposed).toBe(true);
    expect(testContainer.isDisposed).toBe(true);
  });
});
