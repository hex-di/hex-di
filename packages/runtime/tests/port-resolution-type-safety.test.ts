/**
 * Property-based tests for port resolution type safety.
 *
 * These tests verify that port resolution maintains type information
 * without requiring unsafe type casts, and that ports are resolved
 * in a deterministic order.
 *
 * Feature: zero-cast-typescript, Property 3: Port Resolution Type Safety
 * Validates: Requirements 3.1, 3.2
 */

import { describe, test, expect } from "vitest";
import { createPort } from "@hex-di/ports";
import { createAdapter, createAsyncAdapter, GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/index.js";
import { portComparator } from "../src/types/helpers.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown>;
  close(): Promise<void>;
}

interface Cache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

interface Config {
  apiUrl: string;
  timeout: number;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const CachePort = createPort<"Cache", Cache>("Cache");
const ConfigPort = createPort<"Config", Config>("Config");

// =============================================================================
// Port Comparator Tests
// =============================================================================

describe("portComparator", () => {
  test("returns negative when first port name is lexicographically smaller", () => {
    const result = portComparator(CachePort, DatabasePort);
    expect(result).toBeLessThan(0);
  });

  test("returns positive when first port name is lexicographically larger", () => {
    const result = portComparator(DatabasePort, CachePort);
    expect(result).toBeGreaterThan(0);
  });

  test("returns zero when port names are equal", () => {
    const result = portComparator(LoggerPort, LoggerPort);
    expect(result).toBe(0);
  });

  test("sorts ports in deterministic order", () => {
    const ports = [DatabasePort, LoggerPort, CachePort, ConfigPort];
    const sorted = [...ports].sort(portComparator);

    // Expected order: Cache, Config, Database, Logger
    expect(sorted.length).toBe(4);
    expect(sorted[0]!.__portName).toBe("Cache");
    expect(sorted[1]!.__portName).toBe("Config");
    expect(sorted[2]!.__portName).toBe("Database");
    expect(sorted[3]!.__portName).toBe("Logger");
  });

  test("maintains stability when sorting multiple times", () => {
    const ports = [DatabasePort, LoggerPort, CachePort, ConfigPort];
    const sorted1 = [...ports].sort(portComparator);
    const sorted2 = [...ports].sort(portComparator);

    expect(sorted1.map(p => p.__portName)).toEqual(sorted2.map(p => p.__portName));
  });
});

// =============================================================================
// Port Resolution Type Safety Tests
// =============================================================================

describe("Port Resolution Type Safety", () => {
  test("resolves async ports in deterministic order during initialization", async () => {
    const resolutionOrder: string[] = [];

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        log: () => {
          resolutionOrder.push("Logger");
        },
      }),
    });

    const DatabaseAdapter = createAsyncAdapter({
      provides: DatabasePort,
      requires: [],
      factory: () => {
        resolutionOrder.push("Database");
        return Promise.resolve({
          query: () => Promise.resolve(null),
          close: () => Promise.resolve(),
        });
      },
    });

    const CacheAdapter = createAsyncAdapter({
      provides: CachePort,
      requires: [],
      factory: () => {
        resolutionOrder.push("Cache");
        return Promise.resolve({
          get: () => Promise.resolve(null),
          set: () => Promise.resolve(),
        });
      },
    });

    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        apiUrl: "http://localhost",
        timeout: 5000,
      }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provideAsync(DatabaseAdapter)
      .provideAsync(CacheAdapter)
      .provide(ConfigAdapter)
      .build();

    const container = createContainer(graph, { name: "Test" });
    await container.initialize();

    // Async ports should be resolved in deterministic order (registration order): Database, Cache
    expect(resolutionOrder).toContain("Cache");
    expect(resolutionOrder).toContain("Database");
    const cacheIndex = resolutionOrder.indexOf("Cache");
    const databaseIndex = resolutionOrder.indexOf("Database");
    expect(cacheIndex).toBeGreaterThan(databaseIndex);
  });

  test("resolves ports without type casting", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        log: () => {},
      }),
    });

    const DatabaseAdapter = createAsyncAdapter({
      provides: DatabasePort,
      requires: [],
      factory: () =>
        Promise.resolve({
          query: () => Promise.resolve(null),
          close: () => Promise.resolve(),
        }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provideAsync(DatabaseAdapter)
      .build();

    const container = createContainer(graph, { name: "Test" });

    // Resolve sync port - should not require casting
    const logger = container.resolve(LoggerPort);
    expect(logger).toBeDefined();
    expect(typeof logger.log).toBe("function");

    // Initialize and resolve async port - should not require casting
    await container.initialize();
    const database = await container.resolveAsync(DatabasePort);
    expect(database).toBeDefined();
    expect(typeof database.query).toBe("function");
    expect(typeof database.close).toBe("function");
  });

  test("maintains type information for resolved ports", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        log: () => {
          // Logger implementation
        },
      }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();

    const container = createContainer(graph, { name: "Test" });
    const logger = container.resolve(LoggerPort);

    // Type information should be preserved - logger should have log method
    expect(logger).toHaveProperty("log");
    expect(typeof logger.log).toBe("function");

    // Calling the method should work without type errors
    logger.log("test message");
  });

  test("handles multiple async ports with correct type preservation", async () => {
    const DatabaseAdapter = createAsyncAdapter({
      provides: DatabasePort,
      requires: [],
      factory: () =>
        Promise.resolve({
          query: () => Promise.resolve({ rows: [] }),
          close: () => Promise.resolve(),
        }),
    });

    const CacheAdapter = createAsyncAdapter({
      provides: CachePort,
      requires: [],
      factory: () =>
        Promise.resolve({
          get: () => Promise.resolve(null),
          set: () => Promise.resolve(),
        }),
    });

    const graph = GraphBuilder.create()
      .provideAsync(DatabaseAdapter)
      .provideAsync(CacheAdapter)
      .build();

    const container = createContainer(graph, { name: "Test" });
    await container.initialize();

    // Both ports should be resolvable with correct types
    const database = await container.resolveAsync(DatabasePort);
    const cache = await container.resolveAsync(CachePort);

    expect(database).toHaveProperty("query");
    expect(database).toHaveProperty("close");
    expect(cache).toHaveProperty("get");
    expect(cache).toHaveProperty("set");

    // Type-safe method calls should work
    await database.query("SELECT * FROM users");
    await cache.set("key", "value");
    const cachedValue = await cache.get("key");
    expect(typeof cachedValue).toBe("object");
  });

  test("resolves ports in consistent order across multiple initializations", async () => {
    const resolutionOrders: string[][] = [];

    for (let i = 0; i < 3; i++) {
      const resolutionOrder: string[] = [];

      const DatabaseAdapter = createAsyncAdapter({
        provides: DatabasePort,
        requires: [],
        factory: () => {
          resolutionOrder.push("Database");
          return Promise.resolve({
            query: () => Promise.resolve(null),
            close: () => Promise.resolve(),
          });
        },
      });

      const CacheAdapter = createAsyncAdapter({
        provides: CachePort,
        requires: [],
        factory: () => {
          resolutionOrder.push("Cache");
          return Promise.resolve({
            get: () => Promise.resolve(null),
            set: () => Promise.resolve(),
          });
        },
      });

      const graph = GraphBuilder.create()
        .provideAsync(DatabaseAdapter)
        .provideAsync(CacheAdapter)
        .build();

      const container = createContainer(graph, { name: "Test" });
      await container.initialize();

      resolutionOrders.push(resolutionOrder);
    }

    // All initialization orders should be identical
    expect(resolutionOrders[0]).toEqual(resolutionOrders[1]);
    expect(resolutionOrders[1]).toEqual(resolutionOrders[2]);
  });
});
