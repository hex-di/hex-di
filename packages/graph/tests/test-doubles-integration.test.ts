/**
 * Integration tests demonstrating test doubles usage with @hex-di/graph.
 *
 * These tests show how to use the test utilities from test-doubles.ts
 * with graph construction and adapter factories.
 *
 * @packageDocumentation
 */

import { describe, expect, it } from "vitest";
import { port } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import {
  createMockLogger,
  createMockDatabase,
  createMockCache,
  createMockConfig,
  createCallTracker,
  createCallSequenceTracker,
} from "./test-doubles.js";
import { LoggerPort, DatabasePort, CachePort, ConfigWithTypesPort } from "./fixtures.js";

// =============================================================================
// Mock Factory Integration Tests
// =============================================================================

describe("test doubles: mock factory integration", () => {
  it("creates adapter from mock logger with message capture", () => {
    const mock = createMockLogger({ captureMessages: true });

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => mock.implementation,
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();

    // Verify adapter is in the graph
    expect(graph.adapters).toHaveLength(1);
    expect(graph.adapters[0]?.provides.__portName).toBe("Logger");

    // Verify mock functionality works through factory
    const logger = LoggerAdapter.factory({});
    logger.log("Test message");
    logger.log("Another message");

    expect(mock.getLogCount()).toBe(2);
    expect(mock.getMessages()).toEqual([
      { level: "log", message: "Test message" },
      { level: "log", message: "Another message" },
    ]);
  });

  it("creates adapter from mock database with query tracking", async () => {
    const mockUsers = [
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
    ];
    const mock = createMockDatabase({ queryResult: mockUsers });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => mock.implementation,
    });

    const graph = GraphBuilder.create().provide(DatabaseAdapter).build();

    expect(graph.adapters).toHaveLength(1);

    // Execute queries through the mock
    const db = DatabaseAdapter.factory({});
    const result = await db.query("SELECT * FROM users");

    expect(result).toEqual(mockUsers);
    expect(mock.getQueryCount()).toBe(1);
    expect(mock.getQueries()[0]?.sql).toBe("SELECT * FROM users");
  });

  it("creates adapter from mock cache with state inspection", () => {
    const mock = createMockCache<string>();

    const CacheAdapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        get: <T>(key: string) => mock.implementation.get(key) as T | undefined,
        set: <T>(key: string, value: T) => {
          mock.implementation.set(key, value as string);
        },
      }),
    });

    const graph = GraphBuilder.create().provide(CacheAdapter).build();
    expect(graph.adapters).toHaveLength(1);

    // Test cache operations
    const cache = CacheAdapter.factory({});
    cache.set("user:1", "Alice");
    cache.set("user:2", "Bob");

    expect(cache.get("user:1")).toBe("Alice");
    expect(cache.get("user:2")).toBe("Bob");
    expect(mock.getState()).toEqual({
      "user:1": "Alice",
      "user:2": "Bob",
    });
    expect(mock.getOperations()).toHaveLength(4); // 2 sets + 2 gets
  });

  it("creates adapter from mock config with accessed keys tracking", () => {
    const mock = createMockConfig({
      values: {
        DATABASE_URL: "postgres://localhost/test",
        PORT: 3000,
        DEBUG: "true",
      },
    });

    const ConfigAdapter = createAdapter({
      provides: ConfigWithTypesPort,
      requires: [],
      lifetime: "singleton",
      factory: () => mock.implementation,
    });

    const graph = GraphBuilder.create().provide(ConfigAdapter).build();
    expect(graph.adapters).toHaveLength(1);

    // Access config values
    const config = ConfigAdapter.factory({});
    expect(config.get("DATABASE_URL")).toBe("postgres://localhost/test");
    expect(config.getNumber("PORT")).toBe(3000);

    expect(mock.getAccessedKeys()).toContain("DATABASE_URL");
    expect(mock.getAccessedKeys()).toContain("PORT");
  });
});

// =============================================================================
// Call Tracking Integration Tests
// =============================================================================

describe("test doubles: call tracking integration", () => {
  it("tracks factory calls during adapter creation", () => {
    let factoryCallCount = 0;

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => {
        factoryCallCount++;
        return { log: () => {} };
      },
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();

    // Factory not called during graph construction
    expect(factoryCallCount).toBe(0);

    // Factory called when explicitly invoked
    LoggerAdapter.factory({});
    expect(factoryCallCount).toBe(1);

    // Multiple factory calls (singleton behavior is runtime concern)
    LoggerAdapter.factory({});
    expect(factoryCallCount).toBe(2);

    expect(graph.adapters).toHaveLength(1);
  });

  it("tracks method calls on service implementation", () => {
    // Use object literal that satisfies both Logger and Record<string, unknown>
    const loggerImpl = {
      log: (_message: string) => {},
    };

    const tracker = createCallTracker(loggerImpl);

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => tracker.service,
    });

    GraphBuilder.create().provide(LoggerAdapter).build();

    // Use the tracked service
    const logger = LoggerAdapter.factory({});
    logger.log("message 1");
    logger.log("message 2");
    logger.log("message 3");

    expect(tracker.getCallCount("log")).toBe(3);
    expect(tracker.wasCalledWith("log", "message 1")).toBe(true);
    expect(tracker.wasCalledWith("log", "message 2")).toBe(true);
    expect(tracker.wasCalledWith("log", "nonexistent")).toBe(false);
  });

  it("tracks database operations with call tracker", async () => {
    // Use object literal that satisfies both Database and Record<string, unknown>
    const dbImpl = {
      query: async (_sql: string) => [],
    };

    const tracker = createCallTracker(dbImpl);

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => tracker.service,
    });

    GraphBuilder.create().provide(DatabaseAdapter).build();

    const db = DatabaseAdapter.factory({});
    await db.query("SELECT * FROM users");
    await db.query("SELECT * FROM orders");

    expect(tracker.getCallCount("query")).toBe(2);
    expect(tracker.getCallsFor("query")).toHaveLength(2);
    expect(tracker.getCalls()[0]?.args[0]).toBe("SELECT * FROM users");
  });
});

// =============================================================================
// Call Sequence Verification Tests
// =============================================================================

describe("test doubles: sequence verification", () => {
  it("verifies service initialization order with manual tracking", () => {
    const sequenceTracker = createCallSequenceTracker();

    // Create simple ports for this test
    const InitLoggerPort = port<{ init: () => void }>()({ name: "InitLogger" });
    const InitDbPort = port<{ init: () => void }>()({ name: "InitDb" });

    // Create adapters that manually track calls
    const LoggerAdapter = createAdapter({
      provides: InitLoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => {
        sequenceTracker.track("Logger", "init");
        return { init: () => {} };
      },
    });

    const DatabaseAdapter = createAdapter({
      provides: InitDbPort,
      requires: [InitLoggerPort],
      lifetime: "singleton",
      factory: () => {
        sequenceTracker.track("Database", "init");
        return { init: () => {} };
      },
    });

    GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();

    // Simulate initialization order
    const logger = LoggerAdapter.factory({});
    DatabaseAdapter.factory({ InitLogger: logger });

    // Verify Logger was called before Database
    sequenceTracker.assertCalledBefore("Logger.init", "Database.init");
  });

  it("tracks cross-service call sequences with createTracker", () => {
    const sequenceTracker = createCallSequenceTracker();

    // Use createTracker for automatic call tracking
    const logger = sequenceTracker.createTracker("Logger", {
      log: (_msg: string) => {},
      error: (_msg: string) => {},
    });

    const cache = sequenceTracker.createTracker("Cache", {
      get: (_key: string) => undefined as unknown,
      set: (_key: string, _value: unknown) => {},
    });

    // Simulate a typical workflow
    logger.log("Starting operation");
    cache.get("key");
    cache.set("key", "value");
    logger.log("Operation complete");

    // Verify the full sequence
    sequenceTracker.assertOrder(["Logger.log", "Cache.get", "Cache.set", "Logger.log"]);
  });

  it("detects incorrect call ordering", () => {
    const sequenceTracker = createCallSequenceTracker();

    const service1 = sequenceTracker.createTracker("Service1", {
      doFirst: () => {},
    });

    const service2 = sequenceTracker.createTracker("Service2", {
      doSecond: () => {},
    });

    // Call in wrong order
    service2.doSecond();
    service1.doFirst();

    // This should throw because order is wrong
    expect(() => {
      sequenceTracker.assertCalledBefore("Service1.doFirst", "Service2.doSecond");
    }).toThrow("Expected Service1.doFirst to be called before Service2.doSecond");
  });
});

// =============================================================================
// Error Scenario Tests
// =============================================================================

describe("test doubles: error scenarios", () => {
  it("tests database failure scenarios with mock", async () => {
    const failingMock = createMockDatabase({
      shouldFail: true,
      errorMessage: "Connection refused",
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => failingMock.implementation,
    });

    GraphBuilder.create().provide(DatabaseAdapter).build();

    const db = DatabaseAdapter.factory({});

    await expect(db.query("SELECT 1")).rejects.toThrow("Connection refused");

    // Query was still tracked
    expect(failingMock.getQueryCount()).toBe(1);
  });

  it("verifies error handling behavior with call tracking", () => {
    const mock = createMockLogger({ captureMessages: true });

    const logger = mock.implementation;

    // Simulate error handling workflow
    try {
      throw new Error("Test error");
    } catch (error) {
      logger.error("Operation failed", error as Error);
    }

    expect(mock.getErrorCount()).toBe(1);
    expect(mock.getMessages()).toContainEqual({
      level: "error",
      message: "Operation failed",
    });
  });
});

// =============================================================================
// Multi-Adapter Graph Integration Tests
// =============================================================================

describe("test doubles: multi-adapter graphs", () => {
  it("creates graph with multiple mocked adapters", () => {
    const loggerMock = createMockLogger({ captureMessages: true });
    const cacheMock = createMockCache<unknown>();
    const configMock = createMockConfig({ values: { APP_NAME: "TestApp" } });

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => loggerMock.implementation,
    });

    const CacheAdapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        get: <T>(key: string) => cacheMock.implementation.get(key) as T | undefined,
        set: <T>(key: string, value: T) => {
          cacheMock.implementation.set(key, value);
        },
      }),
    });

    const ConfigAdapter = createAdapter({
      provides: ConfigWithTypesPort,
      requires: [],
      lifetime: "singleton",
      factory: () => configMock.implementation,
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(CacheAdapter)
      .provide(ConfigAdapter)
      .build();

    expect(graph.adapters).toHaveLength(3);

    // Use all services
    LoggerAdapter.factory({}).log("App started");
    CacheAdapter.factory({}).set("key", "value");
    ConfigAdapter.factory({}).get("APP_NAME");

    // Verify all mocks tracked their calls
    expect(loggerMock.getLogCount()).toBe(1);
    expect(cacheMock.getOperations()).toHaveLength(1);
    expect(configMock.getAccessedKeys()).toContain("APP_NAME");
  });

  it("tests dependency chain with tracked initialization", () => {
    const sequenceTracker = createCallSequenceTracker();

    const TrackedLoggerPort = port<{ log: (msg: string) => void }>()({
      name: "TrackedLogger",
    });
    const TrackedDbPort = port<{ query: () => void }>()({ name: "TrackedDb" });
    const TrackedUserServicePort = port<{ getUser: () => void }>()({
      name: "TrackedUserService",
    });

    const TrackedLoggerAdapter = createAdapter({
      provides: TrackedLoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => {
        sequenceTracker.track("Logger", "create");
        return { log: (_msg: string) => {} };
      },
    });

    const TrackedDatabaseAdapter = createAdapter({
      provides: TrackedDbPort,
      requires: [TrackedLoggerPort],
      lifetime: "singleton",
      factory: () => {
        sequenceTracker.track("Database", "create");
        return { query: () => {} };
      },
    });

    const TrackedUserServiceAdapter = createAdapter({
      provides: TrackedUserServicePort,
      requires: [TrackedDbPort, TrackedLoggerPort],
      lifetime: "singleton",
      factory: () => {
        sequenceTracker.track("UserService", "create");
        return { getUser: () => {} };
      },
    });

    const graph = GraphBuilder.create()
      .provide(TrackedLoggerAdapter)
      .provide(TrackedDatabaseAdapter)
      .provide(TrackedUserServiceAdapter)
      .build();

    expect(graph.adapters).toHaveLength(3);

    // Simulate runtime initialization in dependency order
    const logger = TrackedLoggerAdapter.factory({});
    const db = TrackedDatabaseAdapter.factory({ TrackedLogger: logger });
    TrackedUserServiceAdapter.factory({ TrackedLogger: logger, TrackedDb: db });

    // Verify initialization sequence
    sequenceTracker.assertOrder(["Logger.create", "Database.create", "UserService.create"]);
  });
});
