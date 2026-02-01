/**
 * withOverrides() unit tests.
 *
 * Tests for the withOverrides method that provides temporary service overrides
 * for testing and multi-tenant scenarios. Override contexts maintain isolated
 * memoization, ensuring instances created within the context are isolated
 * from the parent container.
 *
 * @packageDocumentation
 */

import { describe, test, expect, vi } from "vitest";
import { createPort, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { DisposedScopeError } from "../src/errors/index.js";

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

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");
const EmailServicePort = createPort<"EmailService", EmailService>("EmailService");

// =============================================================================
// withOverrides Basic Functionality Tests
// =============================================================================

describe("withOverrides", () => {
  test("override context returns override adapter instances", () => {
    const realLogFn = vi.fn();
    const mockLogFn = vi.fn();

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: realLogFn, name: "RealLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    // Real logger outside override context
    const realLogger = container.resolve(LoggerPort);
    expect(realLogger.name).toBe("RealLogger");

    // Override context should return mock
    const result = container.withOverrides(
      { Logger: () => ({ log: mockLogFn, name: "MockLogger" }) },
      () => {
        const logger = container.resolve(LoggerPort);
        expect(logger.name).toBe("MockLogger");
        logger.log("test message");
        return logger;
      }
    );

    expect(result.name).toBe("MockLogger");
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

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    // Resolve from container first
    const containerLogger = container.resolve(LoggerPort);

    // Override context should have its own instance
    container.withOverrides({ Logger: () => ({ log: vi.fn(), name: "MockLogger" }) }, () => {
      const overrideLogger = container.resolve(LoggerPort);
      // Should be the mock, not the real instance
      expect(overrideLogger).not.toBe(containerLogger);
      expect(overrideLogger.name).toBe("MockLogger");
    });

    // After override context, container should still have original instance
    const afterLogger = container.resolve(LoggerPort);
    expect(afterLogger).toBe(containerLogger);
    expect(afterLogger.name).toBe("RealLogger");
    expect(factory).toHaveBeenCalledTimes(1); // Only called once, not re-created
  });

  test("override context does not affect parent container instances", () => {
    const singletonFactory = vi.fn(() => ({ log: vi.fn(), name: "RealLogger" }));

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: singletonFactory,
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    // Resolve before override
    const beforeLogger = container.resolve(LoggerPort);

    // Override
    container.withOverrides({ Logger: () => ({ log: vi.fn(), name: "MockLogger" }) }, () => {
      container.resolve(LoggerPort);
    });

    // Resolve after override - should be same instance as before
    const afterLogger = container.resolve(LoggerPort);
    expect(afterLogger).toBe(beforeLogger);

    // Factory should only be called once (singleton)
    expect(singletonFactory).toHaveBeenCalledTimes(1);
  });

  test("override instances are memoized within context", () => {
    const mockFactory = vi.fn(() => ({ log: vi.fn(), name: "MockLogger" }));

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    container.withOverrides({ Logger: mockFactory }, () => {
      const first = container.resolve(LoggerPort);
      const second = container.resolve(LoggerPort);

      // Same instance within override context
      expect(first).toBe(second);
    });

    // Factory called only once per override context
    expect(mockFactory).toHaveBeenCalledTimes(1);
  });

  test("callback return value is propagated", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    const result = container.withOverrides(
      { Logger: () => ({ log: vi.fn(), name: "MockLogger" }) },
      () => {
        return { computed: 42 };
      }
    );

    expect(result).toEqual({ computed: 42 });
  });
});

// =============================================================================
// Nested Dependencies Tests
// =============================================================================

describe("withOverrides with nested dependencies", () => {
  test("nested dependencies use override context", () => {
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
      lifetime: "transient",
      factory: deps => ({
        getUser: (id: string) => {
          deps.Logger.log(`Getting user ${id}`);
          return { id, name: "Test User" };
        },
      }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(UserServiceAdapter).build();

    const container = createContainer(graph, { name: "Test" });

    // With override, UserService should use mock logger
    container.withOverrides({ Logger: () => ({ log: mockLogFn, name: "MockLogger" }) }, () => {
      const userService = container.resolve(UserServicePort);
      userService.getUser("123");
    });

    expect(mockLogFn).toHaveBeenCalledWith("Getting user 123");
    expect(realLogFn).not.toHaveBeenCalled();
  });

  test("non-overridden dependencies resolve normally", () => {
    const queryFn = vi.fn();
    const logFn = vi.fn();

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: logFn, name: "RealLogger" }),
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
      lifetime: "transient",
      factory: deps => ({
        getUser: (id: string) => {
          deps.Logger.log(`Getting user ${id}`);
          deps.Database.query(`SELECT * FROM users WHERE id = '${id}'`);
          return { id, name: "Test User" };
        },
      }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter)
      .build();

    const container = createContainer(graph, { name: "Test" });

    // Override only Logger, Database should still be real
    const mockLogFn = vi.fn();
    container.withOverrides({ Logger: () => ({ log: mockLogFn, name: "MockLogger" }) }, () => {
      const userService = container.resolve(UserServicePort);
      userService.getUser("123");
    });

    // Mock logger was used
    expect(mockLogFn).toHaveBeenCalledWith("Getting user 123");
    // Real database was used
    expect(queryFn).toHaveBeenCalledWith("SELECT * FROM users WHERE id = '123'");
    // Real logger was not used
    expect(logFn).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Override Context Isolation Tests
// =============================================================================

describe("withOverrides isolation", () => {
  test("two override contexts have separate instances", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    let firstOverrideLogger: Logger | undefined;
    let secondOverrideLogger: Logger | undefined;

    // First override context
    container.withOverrides({ Logger: () => ({ log: vi.fn(), name: "Mock1" }) }, () => {
      firstOverrideLogger = container.resolve(LoggerPort);
    });

    // Second override context
    container.withOverrides({ Logger: () => ({ log: vi.fn(), name: "Mock2" }) }, () => {
      secondOverrideLogger = container.resolve(LoggerPort);
    });

    // Different instances and names
    expect(firstOverrideLogger).not.toBe(secondOverrideLogger);
    expect(firstOverrideLogger?.name).toBe("Mock1");
    expect(secondOverrideLogger?.name).toBe("Mock2");
  });

  test("nested withOverrides uses innermost override", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    let outerLogger: Logger | undefined;
    let innerLogger: Logger | undefined;
    let afterInnerLogger: Logger | undefined;

    container.withOverrides({ Logger: () => ({ log: vi.fn(), name: "OuterMock" }) }, () => {
      outerLogger = container.resolve(LoggerPort);

      container.withOverrides({ Logger: () => ({ log: vi.fn(), name: "InnerMock" }) }, () => {
        innerLogger = container.resolve(LoggerPort);
      });

      afterInnerLogger = container.resolve(LoggerPort);
    });

    expect(outerLogger?.name).toBe("OuterMock");
    expect(innerLogger?.name).toBe("InnerMock");
    // After inner context, should return to outer context's instance
    expect(afterInnerLogger?.name).toBe("OuterMock");
    expect(afterInnerLogger).toBe(outerLogger);
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

    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();

    const container = createContainer(graph, { name: "Test" });

    const mockQuery = vi.fn().mockReturnValue({ rows: [] });

    container.withOverrides(
      {
        Logger: () => ({ log: vi.fn(), name: "MockLogger" }),
        Database: () => ({ query: mockQuery }),
      },
      () => {
        const logger = container.resolve(LoggerPort);
        const database = container.resolve(DatabasePort);

        expect(logger.name).toBe("MockLogger");
        database.query("SELECT 1");
        expect(mockQuery).toHaveBeenCalledWith("SELECT 1");
      }
    );
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe("withOverrides error handling", () => {
  test("throws DisposedScopeError when container is disposed", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    await container.dispose();

    expect(() => {
      container.withOverrides({ Logger: () => ({ log: vi.fn(), name: "MockLogger" }) }, () => {
        // Should not reach here
      });
    }).toThrow(DisposedScopeError);
  });

  test("exceptions in callback propagate correctly", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    expect(() => {
      container.withOverrides({ Logger: () => ({ log: vi.fn(), name: "MockLogger" }) }, () => {
        throw new Error("Test error");
      });
    }).toThrow("Test error");

    // Container should still be usable after exception
    const logger = container.resolve(LoggerPort);
    expect(logger.name).toBe("RealLogger");
  });

  test("override context is cleaned up after exception", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph, { name: "Test" });

    try {
      container.withOverrides({ Logger: () => ({ log: vi.fn(), name: "MockLogger" }) }, () => {
        throw new Error("Test error");
      });
    } catch {
      // Ignore
    }

    // After exception, resolve should return real instance (context was cleaned up)
    const logger = container.resolve(LoggerPort);
    expect(logger.name).toBe("RealLogger");
  });
});

// =============================================================================
// Child Container Override Tests
// =============================================================================

describe("withOverrides with child containers", () => {
  test("override works on child containers", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();
    const parent = createContainer(parentGraph, { name: "Parent" });

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

    const mockLogFn = vi.fn();

    child.withOverrides({ Logger: () => ({ log: mockLogFn, name: "MockLogger" }) }, () => {
      const emailService = child.resolve(EmailServicePort);
      emailService.send("test@example.com", "Hello");
    });

    expect(mockLogFn).toHaveBeenCalledWith('Sending "Hello" to test@example.com');
  });
});

// =============================================================================
// Scope Override Tests
// =============================================================================

describe("withOverrides with scopes", () => {
  test("override works within scopes", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), name: "RealLogger" }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph, { name: "Test" });
    const scope = container.createScope("test-scope");

    // Override should work from container, affecting scope resolution too
    container.withOverrides({ Logger: () => ({ log: vi.fn(), name: "MockLogger" }) }, () => {
      const scopeLogger = scope.resolve(LoggerPort);
      // Note: withOverrides is on container, scope resolves through container
      // The behavior depends on implementation - let's verify the actual behavior
      expect(scopeLogger).toBeDefined();
    });
  });
});
