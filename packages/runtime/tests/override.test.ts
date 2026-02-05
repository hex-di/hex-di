/**
 * Adapter-based override tests.
 *
 * Tests for the container.override(adapter).build() API that creates child
 * containers with overridden adapters. This API provides:
 * - Compile-time validation of port existence
 * - Type-safe dependency resolution
 * - Isolated override containers
 *
 * @packageDocumentation
 */

import { describe, test, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";

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

interface EmailService {
  send(to: string, subject: string): void;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const UserServicePort = port<UserService>()({ name: "UserService" });
const EmailServicePort = port<EmailService>()({ name: "EmailService" });

// =============================================================================
// Basic Override Functionality Tests
// =============================================================================

describe("adapter-based overrides", () => {
  test("override container returns override adapter instances", () => {
    const realLogFn = vi.fn();
    const mockLogFn = vi.fn();

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: realLogFn, name: "RealLogger" }),
    });

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: mockLogFn, name: "MockLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    // Real logger from original container
    const realLogger = container.resolve(LoggerPort);
    expect(realLogger.name).toBe("RealLogger");

    // Override container should return mock
    const overrideContainer = container.override(MockLoggerAdapter).build();
    const mockLogger = overrideContainer.resolve(LoggerPort);

    expect(mockLogger.name).toBe("MockLogger");
    mockLogger.log("test message");
    expect(mockLogFn).toHaveBeenCalledWith("test message");
    expect(realLogFn).not.toHaveBeenCalled();
  });

  test("override instances are isolated from parent container", () => {
    const factory = vi.fn(() => ({ log: vi.fn(), name: "RealLogger" }));

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory,
    });

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "MockLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    // Resolve from container first
    const containerLogger = container.resolve(LoggerPort);

    // Override container should have its own instance
    const overrideContainer = container.override(MockLoggerAdapter).build();
    const overrideLogger = overrideContainer.resolve(LoggerPort);

    // Should be the mock, not the real instance
    expect(overrideLogger).not.toBe(containerLogger);
    expect(overrideLogger.name).toBe("MockLogger");

    // Original container should still have original instance
    const afterLogger = container.resolve(LoggerPort);
    expect(afterLogger).toBe(containerLogger);
    expect(afterLogger.name).toBe("RealLogger");
    expect(factory).toHaveBeenCalledTimes(1); // Only called once, not re-created
  });

  test("override container does not affect parent container instances", () => {
    const singletonFactory = vi.fn(() => ({ log: vi.fn(), name: "RealLogger" }));

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: singletonFactory,
    });

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "MockLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    // Resolve before override
    const beforeLogger = container.resolve(LoggerPort);

    // Create override container and resolve
    const overrideContainer = container.override(MockLoggerAdapter).build();
    overrideContainer.resolve(LoggerPort);

    // Resolve after override - should be same instance as before
    const afterLogger = container.resolve(LoggerPort);
    expect(afterLogger).toBe(beforeLogger);

    // Factory should only be called once (singleton)
    expect(singletonFactory).toHaveBeenCalledTimes(1);
  });

  test("override instances are memoized within override container", () => {
    const mockFactory = vi.fn(() => ({ log: vi.fn(), name: "MockLogger" }));

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: mockFactory,
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const overrideContainer = container.override(MockLoggerAdapter).build();
    const first = overrideContainer.resolve(LoggerPort);
    const second = overrideContainer.resolve(LoggerPort);

    // Same instance within override container
    expect(first).toBe(second);

    // Factory called only once
    expect(mockFactory).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// Nested Dependencies Tests
// =============================================================================

describe("override with nested dependencies", () => {
  test("override adapter with dependencies resolves from override container", () => {
    const realLogFn = vi.fn();
    const mockLogFn = vi.fn();

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: realLogFn, name: "RealLogger" }),
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

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: mockLogFn, name: "MockLogger" }),
    });

    // Override both UserService AND Logger to use mock logger in UserService
    const MockUserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: deps => ({
        getUser: (id: string) => {
          deps.Logger.log(`Getting user ${id}`);
          return { id, name: "Mock User" };
        },
      }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(UserServiceAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    // Override both Logger and UserService so UserService uses the mock Logger
    const overrideContainer = container
      .override(MockLoggerAdapter)
      .override(MockUserServiceAdapter)
      .build();
    const userService = overrideContainer.resolve(UserServicePort);
    userService.getUser("123");

    expect(mockLogFn).toHaveBeenCalledWith("Getting user 123");
    expect(realLogFn).not.toHaveBeenCalled();
  });

  test("non-overridden singletons from parent use parent dependencies", () => {
    const queryFn = vi.fn();
    const realLogFn = vi.fn();
    const mockLogFn = vi.fn();

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: realLogFn, name: "RealLogger" }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: queryFn }),
    });

    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "singleton",
      factory: deps => ({
        getUser: (id: string) => {
          deps.Logger.log(`Getting user ${id}`);
          deps.Database.query(`SELECT * FROM users WHERE id = '${id}'`);
          return { id, name: "Test User" };
        },
      }),
    });

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: mockLogFn, name: "MockLogger" }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter)
      .build();

    const container = createContainer({ graph, name: "Test" });

    // Override only Logger - UserService is inherited from parent (shared by default)
    // So UserService uses the parent's Logger instance (real logger)
    const overrideContainer = container.override(MockLoggerAdapter).build();
    const userService = overrideContainer.resolve(UserServicePort);
    userService.getUser("123");

    // UserService is from parent, so it uses parent's Logger (real)
    // This is expected behavior - shared inheritance means we get parent's instance
    expect(realLogFn).toHaveBeenCalledWith("Getting user 123");
    expect(queryFn).toHaveBeenCalledWith("SELECT * FROM users WHERE id = '123'");
    // Mock logger was not used because UserService came from parent
    expect(mockLogFn).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Override Container Isolation Tests
// =============================================================================

describe("override isolation", () => {
  test("two override containers have separate instances", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

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

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    // First override container
    const override1 = container.override(MockLoggerAdapter1).build();
    const firstLogger = override1.resolve(LoggerPort);

    // Second override container
    const override2 = container.override(MockLoggerAdapter2).build();
    const secondLogger = override2.resolve(LoggerPort);

    // Different instances and names
    expect(firstLogger).not.toBe(secondLogger);
    expect(firstLogger.name).toBe("Mock1");
    expect(secondLogger.name).toBe("Mock2");
  });

  test("multiple ports can be overridden simultaneously", () => {
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

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "MockLogger" }),
    });

    const mockQuery = vi.fn().mockReturnValue({ rows: [] });
    const MockDatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: mockQuery }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    // Chain multiple overrides
    const overrideContainer = container
      .override(MockLoggerAdapter)
      .override(MockDatabaseAdapter)
      .build();

    const logger = overrideContainer.resolve(LoggerPort);
    const database = overrideContainer.resolve(DatabasePort);

    expect(logger.name).toBe("MockLogger");
    database.query("SELECT 1");
    expect(mockQuery).toHaveBeenCalledWith("SELECT 1");
  });
});

// =============================================================================
// Child Container Override Tests
// =============================================================================

describe("override with child containers", () => {
  test("child container can create override child with new adapter", () => {
    const realLogFn = vi.fn();
    const mockLogFn = vi.fn();

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: realLogFn, name: "RealLogger" }),
    });

    const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();
    const parent = createContainer({ graph: parentGraph, name: "Parent" });

    const EmailAdapter = createAdapter({
      provides: EmailServicePort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: deps => ({
        send: (to: string, subject: string) => {
          deps.Logger.log(`Sending "${subject}" to ${to}`);
        },
      }),
    });

    // Use buildFragment() since EmailAdapter's dependency (Logger) comes from parent
    const childGraph = GraphBuilder.create().provide(EmailAdapter).buildFragment();
    const child = parent.createChild(childGraph, { name: "Child" });

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: mockLogFn, name: "MockLogger" }),
    });

    // Override both Logger and EmailService to use mock logger
    const MockEmailAdapter = createAdapter({
      provides: EmailServicePort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: deps => ({
        send: (to: string, subject: string) => {
          deps.Logger.log(`Sending "${subject}" to ${to}`);
        },
      }),
    });

    const grandchild = child.override(MockLoggerAdapter).override(MockEmailAdapter).build();
    const emailService = grandchild.resolve(EmailServicePort);
    emailService.send("test@example.com", "Hello");

    expect(mockLogFn).toHaveBeenCalledWith('Sending "Hello" to test@example.com');
    expect(realLogFn).not.toHaveBeenCalled();
  });

  test("child container override creates isolated instance", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();
    const parent = createContainer({ graph: parentGraph, name: "Parent" });

    const EmailAdapter = createAdapter({
      provides: EmailServicePort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: deps => ({
        send: (to: string, subject: string) => {
          deps.Logger.log(`Sending "${subject}" to ${to}`);
        },
      }),
    });

    const childGraph = GraphBuilder.create().provide(EmailAdapter).buildFragment();
    const child = parent.createChild(childGraph, { name: "Child" });

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "MockLogger" }),
    });

    const grandchild = child.override(MockLoggerAdapter).build();

    // Override Logger is available in grandchild
    const mockLogger = grandchild.resolve(LoggerPort);
    expect(mockLogger.name).toBe("MockLogger");

    // Original child still has real Logger (inherited from parent)
    const childLogger = child.resolve(LoggerPort);
    expect(childLogger.name).toBe("RealLogger");
  });
});

// =============================================================================
// Disposal Behavior Tests
// =============================================================================

describe("override container disposal", () => {
  test("override container can be disposed independently", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "MockLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const overrideContainer = container.override(MockLoggerAdapter).build();

    // Dispose override container
    await overrideContainer.dispose();

    expect(overrideContainer.isDisposed).toBe(true);
    expect(container.isDisposed).toBe(false);

    // Parent container still works
    expect(container.resolve(LoggerPort).name).toBe("RealLogger");
  });

  test("disposing parent cascades to override children", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "MockLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer({ graph, name: "Test" });

    const overrideContainer = container.override(MockLoggerAdapter).build();

    // Dispose parent container
    await container.dispose();

    // Both should be disposed (cascade disposal)
    expect(container.isDisposed).toBe(true);
    expect(overrideContainer.isDisposed).toBe(true);
  });
});

// =============================================================================
// Type Safety Tests (compile-time validation)
// =============================================================================

describe("override type safety", () => {
  test("override adapter dependencies are resolved from parent", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
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
    const overrideContainer = container
      .override(MockLoggerAdapter)
      .override(MockUserServiceAdapter)
      .build();

    const userService = overrideContainer.resolve(UserServicePort);
    const user = userService.getUser("123");

    expect(user.name).toBe("Mock User");
    expect(mockLogFn).toHaveBeenCalledWith("Mock getting user 123");
  });
});
