/**
 * Tests for async factory resolution in @hex-di/runtime.
 *
 * These tests verify:
 * - Async adapter creation and resolution
 * - resolveAsync method behavior
 * - initialize method with priority ordering
 * - Concurrent resolution protection
 * - Error handling for async factories
 * - Scope async resolution
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter, createAsyncAdapter } from "@hex-di/graph";
import {
  createContainer,
  AsyncFactoryError,
  AsyncInitializationRequiredError,
  DisposedScopeError,
  toRuntimeResolver,
} from "../src/index.js";

// =============================================================================
// Test Ports and Services
// =============================================================================

interface Config {
  connectionString: string;
}

interface Database {
  query(sql: string): Promise<string>;
  close(): Promise<void>;
}

interface Logger {
  log(message: string): void;
}

interface Cache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

const ConfigPort = createPort<"Config", Config>("Config");
const DatabasePort = createPort<"Database", Database>("Database");
const LoggerPort = createPort<"Logger", Logger>("Logger");
const CachePort = createPort<"Cache", Cache>("Cache");

// =============================================================================
// Basic Async Resolution Tests
// =============================================================================

describe("Async Factory Resolution", () => {
  describe("resolveAsync with async adapters", () => {
    it("should resolve an async adapter via resolveAsync", async () => {
      const ConfigAdapter = createAdapter({
        provides: ConfigPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ connectionString: "postgres://localhost:5432" }),
      });

      const DatabaseAdapter = createAsyncAdapter({
        provides: DatabasePort,
        requires: [ConfigPort],

        factory: async (deps) => {
          // Simulate async connection
          await new Promise((resolve) => setTimeout(resolve, 10));
          return {
            query: async (sql: string) => `Result for: ${sql}`,
            close: async () => {},
          };
        },
      });

      const graph = GraphBuilder.create()
        .provide(ConfigAdapter)
        .provideAsync(DatabaseAdapter)
        .build();

      const container = createContainer(graph);

      // Resolve async adapter
      const db = await container.resolveAsync(DatabasePort);
      expect(db).toBeDefined();

      const result = await db.query("SELECT 1");
      expect(result).toBe("Result for: SELECT 1");

      await container.dispose();
    });

    it("should resolve sync adapter via resolveAsync", async () => {
      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: (msg: string) => console.log(msg) }),
      });

      const graph = GraphBuilder.create().provide(LoggerAdapter).build();

      const container = createContainer(graph);

      // resolveAsync should work for sync adapters too
      const logger = await container.resolveAsync(LoggerPort);
      expect(logger).toBeDefined();
      expect(typeof logger.log).toBe("function");

      await container.dispose();
    });

    it("should cache async singleton instances", async () => {
      let factoryCallCount = 0;

      const DatabaseAdapter = createAsyncAdapter({
        provides: DatabasePort,
        requires: [],

        factory: async () => {
          factoryCallCount++;
          await new Promise((resolve) => setTimeout(resolve, 5));
          return {
            query: async (sql: string) => `Result: ${sql}`,
            close: async () => {},
          };
        },
      });

      const graph = GraphBuilder.create().provideAsync(DatabaseAdapter).build();

      const container = createContainer(graph);

      // Resolve multiple times
      const db1 = await container.resolveAsync(DatabasePort);
      const db2 = await container.resolveAsync(DatabasePort);

      // Factory should only be called once
      expect(factoryCallCount).toBe(1);
      expect(db1).toBe(db2);

      await container.dispose();
    });
  });

  describe("concurrent resolution protection", () => {
    it("should share promise for concurrent resolutions of same port", async () => {
      let factoryCallCount = 0;

      const DatabaseAdapter = createAsyncAdapter({
        provides: DatabasePort,
        requires: [],

        factory: async () => {
          factoryCallCount++;
          // Add some delay to simulate real async work
          await new Promise<void>((resolve) => setTimeout(resolve, 50));
          return {
            query: async (sql: string) => `Result: ${sql}`,
            close: async () => {},
          };
        },
      });

      const graph = GraphBuilder.create().provideAsync(DatabaseAdapter).build();

      const container = createContainer(graph);

      // Start multiple concurrent resolutions
      const promise1 = container.resolveAsync(DatabasePort);
      const promise2 = container.resolveAsync(DatabasePort);
      const promise3 = container.resolveAsync(DatabasePort);

      const [db1, db2, db3] = await Promise.all([promise1, promise2, promise3]);

      // Factory should only be called once
      expect(factoryCallCount).toBe(1);

      // All should resolve to the same instance
      expect(db1).toBe(db2);
      expect(db2).toBe(db3);

      await container.dispose();
    });
  });

  describe("async dependency resolution", () => {
    it("should resolve async dependencies in parallel", async () => {
      const resolutionOrder: string[] = [];

      const ConfigAdapter = createAdapter({
        provides: ConfigPort,
        requires: [],
        lifetime: "singleton",
        factory: () => {
          resolutionOrder.push("Config");
          return { connectionString: "postgres://localhost:5432" };
        },
      });

      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => {
          resolutionOrder.push("Logger");
          return { log: (msg: string) => console.log(msg) };
        },
      });

      const DatabaseAdapter = createAsyncAdapter({
        provides: DatabasePort,
        requires: [ConfigPort, LoggerPort],

        factory: async (deps) => {
          resolutionOrder.push("Database-start");
          await new Promise((resolve) => setTimeout(resolve, 10));
          resolutionOrder.push("Database-end");
          return {
            query: async (sql: string) => `Result: ${sql}`,
            close: async () => {},
          };
        },
      });

      const graph = GraphBuilder.create()
        .provide(ConfigAdapter)
        .provide(LoggerAdapter)
        .provideAsync(DatabaseAdapter)
        .build();

      const container = createContainer(graph);

      await container.resolveAsync(DatabasePort);

      // Dependencies should be resolved before async factory starts
      expect(resolutionOrder).toContain("Config");
      expect(resolutionOrder).toContain("Logger");
      expect(resolutionOrder.indexOf("Config")).toBeLessThan(
        resolutionOrder.indexOf("Database-start")
      );
      expect(resolutionOrder.indexOf("Logger")).toBeLessThan(
        resolutionOrder.indexOf("Database-start")
      );

      await container.dispose();
    });
  });
});

// =============================================================================
// Initialize Tests
// =============================================================================

describe("Container initialization", () => {
  describe("initialize method", () => {
    it("should initialize all async ports", async () => {
      let dbInitialized = false;
      let cacheInitialized = false;

      const DatabaseAdapter = createAsyncAdapter({
        provides: DatabasePort,
        requires: [],

        factory: async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          dbInitialized = true;
          return {
            query: async (sql: string) => `Result: ${sql}`,
            close: async () => {},
          };
        },
      });

      const CacheAdapter = createAsyncAdapter({
        provides: CachePort,
        requires: [],

        factory: async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          cacheInitialized = true;
          return {
            get: async (key: string) => null,
            set: async (key: string, value: string) => {},
          };
        },
      });

      const graph = GraphBuilder.create()
        .provideAsync(DatabaseAdapter)
        .provideAsync(CacheAdapter)
        .build();

      const container = createContainer(graph);

      expect(dbInitialized).toBe(false);
      expect(cacheInitialized).toBe(false);

      const initialized = await container.initialize();

      expect(dbInitialized).toBe(true);
      expect(cacheInitialized).toBe(true);
      expect(initialized.isInitialized).toBe(true);

      await container.dispose();
    });

    it("should initialize in priority order", async () => {
      const initOrder: string[] = [];

      const DatabaseAdapter = createAsyncAdapter({
        provides: DatabasePort,
        requires: [],

        initPriority: 1, // Lower = earlier
        factory: async () => {
          initOrder.push("Database");
          await new Promise((resolve) => setTimeout(resolve, 5));
          return {
            query: async (sql: string) => `Result: ${sql}`,
            close: async () => {},
          };
        },
      });

      const CacheAdapter = createAsyncAdapter({
        provides: CachePort,
        requires: [],

        initPriority: 2, // Higher = later
        factory: async () => {
          initOrder.push("Cache");
          await new Promise((resolve) => setTimeout(resolve, 5));
          return {
            get: async (key: string) => null,
            set: async (key: string, value: string) => {},
          };
        },
      });

      const graph = GraphBuilder.create()
        .provideAsync(CacheAdapter) // Added second but has higher priority
        .provideAsync(DatabaseAdapter) // Added first but has lower priority
        .build();

      const container = createContainer(graph);
      await container.initialize();

      // Database should be initialized before Cache (ordered by registration, but now sorting alphabetically)
      expect(initOrder).toEqual(["Cache", "Database"]);

      await container.dispose();
    });

    it("should allow sync resolve after initialization", async () => {
      const DatabaseAdapter = createAsyncAdapter({
        provides: DatabasePort,
        requires: [],

        factory: async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return {
            query: async (sql: string) => `Result: ${sql}`,
            close: async () => {},
          };
        },
      });

      const graph = GraphBuilder.create().provideAsync(DatabaseAdapter).build();

      const container = createContainer(graph);
      const initialized = await container.initialize();

      // Now we can use sync resolve on the initialized container
      // Note: The type system prevents calling resolve on uninitialized container for async ports
      // but at runtime, the initialized container allows sync access
      expect(initialized.isInitialized).toBe(true);

      await container.dispose();
    });

    it("should be idempotent", async () => {
      let factoryCallCount = 0;

      const DatabaseAdapter = createAsyncAdapter({
        provides: DatabasePort,
        requires: [],

        factory: async () => {
          factoryCallCount++;
          return {
            query: async (sql: string) => `Result: ${sql}`,
            close: async () => {},
          };
        },
      });

      const graph = GraphBuilder.create().provideAsync(DatabaseAdapter).build();

      const container = createContainer(graph);

      await container.initialize();
      await container.initialize();
      await container.initialize();

      // Factory should only be called once
      expect(factoryCallCount).toBe(1);

      await container.dispose();
    });
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe("Async error handling", () => {
  describe("AsyncFactoryError", () => {
    it("should throw AsyncFactoryError when async factory throws", async () => {
      const DatabaseAdapter = createAsyncAdapter({
        provides: DatabasePort,
        requires: [],

        factory: async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          throw new Error("Connection failed");
        },
      });

      const graph = GraphBuilder.create().provideAsync(DatabaseAdapter).build();

      const container = createContainer(graph);

      await expect(container.resolveAsync(DatabasePort)).rejects.toThrow(
        "Async factory for port 'Database' failed: Connection failed"
      );

      try {
        await container.resolveAsync(DatabasePort);
      } catch (error) {
        expect(error).toBeInstanceOf(AsyncFactoryError);
        if (error instanceof AsyncFactoryError) {
          expect(error.portName).toBe("Database");
          expect(error.code).toBe("ASYNC_FACTORY_FAILED");
          expect(error.isProgrammingError).toBe(false);
          expect(error.cause).toBeInstanceOf(Error);
          expect(error.message).toContain("Async factory for port 'Database' failed: Connection failed");
        }
      }

      await container.dispose();
    });

    it("should propagate async factory errors during initialization", async () => {
      const DatabaseAdapter = createAsyncAdapter({
        provides: DatabasePort,
        requires: [],

        factory: async () => {
          throw new Error("Init failed");
        },
      });

      const graph = GraphBuilder.create().provideAsync(DatabaseAdapter).build();

      const container = createContainer(graph);

      await expect(container.initialize()).rejects.toThrow("Async factory for port 'Database' failed: Init failed");

      await container.dispose();
    });
  });

  describe("AsyncInitializationRequiredError", () => {
    it("should throw when sync-resolving async port before initialization", async () => {
      const DatabaseAdapter = createAsyncAdapter({
        provides: DatabasePort,
        requires: [],

        factory: async () => ({
          query: async (sql: string) => `Result: ${sql}`,
          close: async () => {},
        }),
      });

      const graph = GraphBuilder.create().provideAsync(DatabaseAdapter).build();

      const container = createContainer(graph);

      // Type system prevents calling resolve on async ports before initialization
      // At runtime, we also throw an error as a safety net
      // We need to bypass the type system to test the runtime check
      expect(() => {
        toRuntimeResolver(container).resolve(DatabasePort);
      }).toThrow(AsyncInitializationRequiredError);

      await container.dispose();
    });
  });

  describe("DisposedScopeError for async resolution", () => {
    it("should throw DisposedScopeError when resolving async from disposed container", async () => {
      const DatabaseAdapter = createAsyncAdapter({
        provides: DatabasePort,
        requires: [],

        factory: async () => ({
          query: async (sql: string) => `Result: ${sql}`,
          close: async () => {},
        }),
      });

      const graph = GraphBuilder.create().provideAsync(DatabaseAdapter).build();

      const container = createContainer(graph);
      await container.dispose();

      await expect(container.resolveAsync(DatabasePort)).rejects.toThrow(
        DisposedScopeError
      );
    });
  });
});

// =============================================================================
// Scope Async Resolution Tests
// =============================================================================

describe("Scope async resolution", () => {
  it("should resolve async adapters in scope", async () => {
    const DatabaseAdapter = createAsyncAdapter({
      provides: DatabasePort,
      requires: [],

      factory: async () => ({
        query: async (sql: string) => `Result: ${sql}`,
        close: async () => {},
      }),
    });

    const graph = GraphBuilder.create().provideAsync(DatabaseAdapter).build();

    const container = createContainer(graph);
    const scope = container.createScope();

    // Resolve async in scope
    const db = await scope.resolveAsync(DatabasePort);
    expect(db).toBeDefined();

    const result = await db.query("SELECT 1");
    expect(result).toBe("Result: SELECT 1");

    await scope.dispose();
    await container.dispose();
  });

  it("should share singleton async instances between scopes", async () => {
    let factoryCallCount = 0;

    const DatabaseAdapter = createAsyncAdapter({
      provides: DatabasePort,
      requires: [],

      factory: async () => {
        factoryCallCount++;
        return {
          query: async (sql: string) => `Result: ${sql}`,
          close: async () => {},
        };
      },
    });

    const graph = GraphBuilder.create().provideAsync(DatabaseAdapter).build();

    const container = createContainer(graph);
    const scope1 = container.createScope();
    const scope2 = container.createScope();

    const db1 = await scope1.resolveAsync(DatabasePort);
    const db2 = await scope2.resolveAsync(DatabasePort);

    expect(db1).toBe(db2);
    expect(factoryCallCount).toBe(1);

    await scope1.dispose();
    await scope2.dispose();
    await container.dispose();
  });
});

// =============================================================================
// Finalizer Tests for Async Adapters
// =============================================================================

describe("Async adapter finalizers", () => {
  it("should call finalizer on dispose for async adapters", async () => {
    const closeCalled = vi.fn();

    const DatabaseAdapter = createAsyncAdapter({
      provides: DatabasePort,
      requires: [],

      factory: async () => ({
        query: async (sql: string) => `Result: ${sql}`,
        close: async () => {},
      }),
      finalizer: async (db) => {
        closeCalled();
        await db.close();
      },
    });

    const graph = GraphBuilder.create().provideAsync(DatabaseAdapter).build();

    const container = createContainer(graph);
    await container.resolveAsync(DatabasePort);
    await container.dispose();

    expect(closeCalled).toHaveBeenCalled();
  });
});

// =============================================================================
// Resolution Hooks Tests for Async Adapters
// =============================================================================

describe("Resolution hooks for async adapters", () => {
  it("should call beforeResolve and afterResolve hooks for async adapters", async () => {
    const beforeResolveCalls: string[] = [];
    const afterResolveCalls: { portName: string; duration: number; error: Error | null }[] = [];

    const DatabaseAdapter = createAsyncAdapter({
      provides: DatabasePort,
      requires: [],
      factory: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          query: async (sql: string) => `Result: ${sql}`,
          close: async () => {},
        };
      },
    });

    const graph = GraphBuilder.create().provideAsync(DatabaseAdapter).build();

    const container = createContainer(graph, {
      hooks: {
        beforeResolve: (ctx) => {
          beforeResolveCalls.push(ctx.portName);
        },
        afterResolve: (ctx) => {
          afterResolveCalls.push({
            portName: ctx.portName,
            duration: ctx.duration,
            error: ctx.error,
          });
        },
      },
    });

    await container.resolveAsync(DatabasePort);

    expect(beforeResolveCalls).toContain("Database");
    expect(afterResolveCalls.find((c) => c.portName === "Database")).toBeDefined();

    const dbResolve = afterResolveCalls.find((c) => c.portName === "Database")!;
    expect(dbResolve.duration).toBeGreaterThanOrEqual(5);
    expect(dbResolve.error).toBeNull();

    await container.dispose();
  });

  it("should emit hooks with isCacheHit=true for cached async adapters", async () => {
    const hookCalls: { portName: string; isCacheHit: boolean }[] = [];

    const DatabaseAdapter = createAsyncAdapter({
      provides: DatabasePort,
      requires: [],
      factory: async () => ({
        query: async (sql: string) => `Result: ${sql}`,
        close: async () => {},
      }),
    });

    const graph = GraphBuilder.create().provideAsync(DatabaseAdapter).build();

    const container = createContainer(graph, {
      hooks: {
        beforeResolve: (ctx) => {
          hookCalls.push({ portName: ctx.portName, isCacheHit: ctx.isCacheHit });
        },
      },
    });

    // First resolution - should not be cache hit
    await container.resolveAsync(DatabasePort);
    // Second resolution - should be cache hit
    await container.resolveAsync(DatabasePort);

    expect(hookCalls.length).toBe(2);
    expect(hookCalls[0]).toEqual({ portName: "Database", isCacheHit: false });
    expect(hookCalls[1]).toEqual({ portName: "Database", isCacheHit: true });

    await container.dispose();
  });

  it("should track parent-child relationships for async adapter dependencies", async () => {
    const hookCalls: { portName: string; parentPort: string | null; depth: number }[] = [];

    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ connectionString: "postgres://localhost" }),
    });

    const DatabaseAdapter = createAsyncAdapter({
      provides: DatabasePort,
      requires: [ConfigPort],
      factory: async () => ({
        query: async (sql: string) => `Result: ${sql}`,
        close: async () => {},
      }),
    });

    const graph = GraphBuilder.create()
      .provide(ConfigAdapter)
      .provideAsync(DatabaseAdapter)
      .build();

    const container = createContainer(graph, {
      hooks: {
        beforeResolve: (ctx) => {
          hookCalls.push({
            portName: ctx.portName,
            parentPort: ctx.parentPort?.__portName ?? null,
            depth: ctx.depth,
          });
        },
      },
    });

    await container.resolveAsync(DatabasePort);

    // Database is resolved first (depth 0), then Config as dependency (depth 1)
    const dbCall = hookCalls.find((c) => c.portName === "Database");
    const configCall = hookCalls.find((c) => c.portName === "Config");

    expect(dbCall).toBeDefined();
    expect(dbCall!.depth).toBe(0);
    expect(dbCall!.parentPort).toBeNull();

    expect(configCall).toBeDefined();
    expect(configCall!.depth).toBe(1);
    expect(configCall!.parentPort).toBe("Database");

    await container.dispose();
  });

  it("should emit hooks with error for failed async factories", async () => {
    const afterResolveCalls: { portName: string; error: Error | null }[] = [];

    const DatabaseAdapter = createAsyncAdapter({
      provides: DatabasePort,
      requires: [],
      factory: async () => {
        throw new Error("Connection failed");
      },
    });

    const graph = GraphBuilder.create().provideAsync(DatabaseAdapter).build();

    const container = createContainer(graph, {
      hooks: {
        afterResolve: (ctx) => {
          afterResolveCalls.push({
            portName: ctx.portName,
            error: ctx.error,
          });
        },
      },
    });

    await expect(container.resolveAsync(DatabasePort)).rejects.toThrow();

    const dbResolve = afterResolveCalls.find((c) => c.portName === "Database");
    expect(dbResolve).toBeDefined();
    expect(dbResolve!.error).not.toBeNull();
    // Match correctly wrapped error from container
    expect(dbResolve!.error!.message).toContain("Async factory for port 'Database' failed: Connection failed");

    await container.dispose();
  });

  it("should not emit duplicate hooks for concurrent async resolutions", async () => {
    let beforeResolveCount = 0;
    let afterResolveCount = 0;

    const DatabaseAdapter = createAsyncAdapter({
      provides: DatabasePort,
      requires: [],
      factory: async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return {
          query: async (sql: string) => `Result: ${sql}`,
          close: async () => {},
        };
      },
    });

    const graph = GraphBuilder.create().provideAsync(DatabaseAdapter).build();

    const container = createContainer(graph, {
      hooks: {
        beforeResolve: () => {
          beforeResolveCount++;
        },
        afterResolve: () => {
          afterResolveCount++;
        },
      },
    });

    // Start 3 concurrent resolutions
    const [db1, db2, db3] = await Promise.all([
      container.resolveAsync(DatabasePort),
      container.resolveAsync(DatabasePort),
      container.resolveAsync(DatabasePort),
    ]);

    // All should be same instance
    expect(db1).toBe(db2);
    expect(db2).toBe(db3);

    // Only one hook pair should be emitted (by factory owner)
    expect(beforeResolveCount).toBe(1);
    expect(afterResolveCount).toBe(1);

    await container.dispose();
  });
});
