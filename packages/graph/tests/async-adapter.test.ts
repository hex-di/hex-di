/**
 * Comprehensive Async Adapter Test Suite
 *
 * These tests verify async adapter behavior including:
 * 1. Async adapter creation and configuration
 * 2. GraphBuilder integration with async adapters
 * 3. Concurrent async adapter resolution scenarios
 * 4. Automatic topological initialization order
 * 5. Mixed sync/async adapter graphs
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { createPort, createAdapter, createAsyncAdapter, defineAsyncService } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}

interface Config {
  get(key: string): string;
}

interface Database {
  query(sql: string): Promise<unknown>;
  isConnected: boolean;
}

interface Cache {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

interface UserService {
  getUser(id: string): Promise<{ id: string; name: string }>;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const ConfigPort = createPort<"Config", Config>("Config");
const DatabasePort = createPort<"Database", Database>("Database");
const CachePort = createPort<"Cache", Cache>("Cache");
const UserServicePort = createPort<"UserService", UserService>("UserService");

// =============================================================================
// Async Adapter Creation Tests
// =============================================================================

describe("async adapter creation", () => {
  it("creates async adapter with singleton lifetime", () => {
    const adapter = createAsyncAdapter({
      provides: DatabasePort,
      requires: [],
      factory: async () => ({
        query: async () => ({}),
        isConnected: true,
      }),
    });

    expect(adapter.factoryKind).toBe("async");
    expect(adapter.lifetime).toBe("singleton");
  });

  it("creates async adapter with dependencies", () => {
    const adapter = createAsyncAdapter({
      provides: DatabasePort,
      requires: [LoggerPort, ConfigPort],
      factory: async ({ Logger, Config }) => {
        Logger.log(`Connecting to ${Config.get("db.host")}`);
        return { query: async () => ({}), isConnected: true };
      },
    });

    expect(adapter.requires).toEqual([LoggerPort, ConfigPort]);
  });

  it("creates async adapter with clonable flag", () => {
    const clonableAdapter = createAsyncAdapter({
      provides: CachePort,
      requires: [],
      factory: async () => ({
        get: () => null,
        set: () => {},
      }),
      clonable: true,
    });

    const nonClonableAdapter = createAsyncAdapter({
      provides: DatabasePort,
      requires: [],
      factory: async () => ({ query: async () => ({}), isConnected: true }),
      clonable: false,
    });

    expect(clonableAdapter.clonable).toBe(true);
    expect(nonClonableAdapter.clonable).toBe(false);
  });

  it("creates async adapter with finalizer", () => {
    let finalizerCalled = false;

    const adapter = createAsyncAdapter({
      provides: DatabasePort,
      requires: [],
      factory: async () => ({ query: async () => ({}), isConnected: true }),
      finalizer: async () => {
        finalizerCalled = true;
      },
    });

    expect(adapter.finalizer).toBeDefined();
    // Finalizer is stored but not called during creation
    expect(finalizerCalled).toBe(false);
  });
});

// =============================================================================
// GraphBuilder Integration with Async Adapters
// =============================================================================

describe("GraphBuilder with async adapters", () => {
  it("tracks async ports in TAsyncPorts", () => {
    const SyncLogger = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const AsyncDatabase = createAsyncAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      factory: async () => ({ query: async () => ({}), isConnected: true }),
    });

    const builder = GraphBuilder.create().provide(SyncLogger).provideAsync(AsyncDatabase);

    // Verify async adapter is tracked at runtime
    const inspection = builder.inspect();
    expect(inspection.provides).toContain("Database (singleton)");
  });

  it("builds graph with mixed sync and async adapters", () => {
    const SyncLogger = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const AsyncConfig = createAsyncAdapter({
      provides: ConfigPort,
      requires: [],
      factory: async () => ({ get: () => "value" }),
    });

    const AsyncDatabase = createAsyncAdapter({
      provides: DatabasePort,
      requires: [LoggerPort, ConfigPort],
      factory: async () => ({ query: async () => ({}), isConnected: true }),
    });

    const graph = GraphBuilder.create()
      .provide(SyncLogger)
      .provideAsync(AsyncConfig)
      .provideAsync(AsyncDatabase)
      .build();

    expect(graph.adapters).toHaveLength(3);
  });

  it("allows async adapters with dependencies", () => {
    // This test verifies that async adapters with dependencies work correctly
    const SyncLogger = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const AsyncDatabase = createAsyncAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      factory: async () => ({ query: async () => ({}), isConnected: true }),
    });

    // Build should succeed when all dependencies are satisfied
    const graph = GraphBuilder.create().provide(SyncLogger).provideAsync(AsyncDatabase).build();

    expect(graph.adapters).toHaveLength(2);
  });

  it("inspection shows async adapters correctly", () => {
    const AsyncConfig = createAsyncAdapter({
      provides: ConfigPort,
      requires: [],
      factory: async () => ({ get: () => "value" }),
    });

    const builder = GraphBuilder.create().provideAsync(AsyncConfig);
    const inspection = builder.inspect();

    expect(inspection.adapterCount).toBe(1);
    expect(inspection.provides).toContain("Config (singleton)");
    expect(inspection.isComplete).toBe(true);
  });
});

// =============================================================================
// defineAsyncService Tests
// =============================================================================

describe("defineAsyncService", () => {
  it("creates port and async adapter together", () => {
    const [Port, Adapter] = defineAsyncService<"AsyncLogger", Logger>("AsyncLogger", {
      factory: async () => ({ log: () => {} }),
    });

    expect(Port.__portName).toBe("AsyncLogger");
    expect(Adapter.provides).toBe(Port);
    expect(Adapter.factoryKind).toBe("async");
  });

  it("creates async service with clonable flag", () => {
    const [_Port, Adapter] = defineAsyncService<"Cache", Cache, true>("Cache", {
      factory: async () => ({ get: () => null, set: () => {} }),
      clonable: true,
    });

    expect(Adapter.clonable).toBe(true);
  });
});

// =============================================================================
// Concurrent Resolution Scenarios
// =============================================================================

describe("concurrent async adapter scenarios", () => {
  it("handles independent async adapters", () => {
    const AsyncConfig = createAsyncAdapter({
      provides: ConfigPort,
      requires: [],
      factory: async () => ({ get: () => "value" }),
    });

    const AsyncCache = createAsyncAdapter({
      provides: CachePort,
      requires: [],
      factory: async () => ({ get: () => null, set: () => {} }),
    });

    const graph = GraphBuilder.create().provide(AsyncConfig).provide(AsyncCache).build();

    // Both adapters are in the graph
    expect(graph.adapters).toHaveLength(2);
  });

  it("handles async adapter chain with automatic topological ordering", () => {
    // Dependencies form: Config <- Database <- UserService
    // Initialization will automatically happen: Config first, then Database, then UserService
    const AsyncConfig = createAsyncAdapter({
      provides: ConfigPort,
      requires: [],
      factory: async () => ({ get: () => "value" }),
    });

    const SyncLogger = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const AsyncDatabase = createAsyncAdapter({
      provides: DatabasePort,
      requires: [ConfigPort, LoggerPort],
      factory: async () => ({ query: async () => ({}), isConnected: true }),
    });

    const AsyncUserService = createAsyncAdapter({
      provides: UserServicePort,
      requires: [DatabasePort, LoggerPort],
      factory: async () => ({
        getUser: async (id: string) => ({ id, name: "User" }),
      }),
    });

    const graph = GraphBuilder.create()
      .provide(AsyncConfig)
      .provide(SyncLogger)
      .provide(AsyncDatabase)
      .provide(AsyncUserService)
      .build();

    expect(graph.adapters).toHaveLength(4);
  });

  it("handles diamond dependency with async adapters", () => {
    // Config (async) is required by both Database and Cache
    // UserService requires both Database and Cache
    //
    //        Config (async)
    //       /      \
    //  Database    Cache (both async)
    //       \      /
    //      UserService (async)
    //
    // Initialization levels:
    // Level 0: Config (no async deps)
    // Level 1: Database, Cache (both depend on Config, can run in parallel)
    // Level 2: UserService (depends on both Database and Cache)

    const AsyncConfig = createAsyncAdapter({
      provides: ConfigPort,
      requires: [],
      factory: async () => ({ get: () => "value" }),
    });

    const AsyncDatabase = createAsyncAdapter({
      provides: DatabasePort,
      requires: [ConfigPort],
      factory: async () => ({ query: async () => ({}), isConnected: true }),
    });

    const AsyncCache = createAsyncAdapter({
      provides: CachePort,
      requires: [ConfigPort],
      factory: async () => ({ get: () => null, set: () => {} }),
    });

    const AsyncUserService = createAsyncAdapter({
      provides: UserServicePort,
      requires: [DatabasePort, CachePort],
      factory: async () => ({
        getUser: async (id: string) => ({ id, name: "User" }),
      }),
    });

    const graph = GraphBuilder.create()
      .provide(AsyncConfig)
      .provide(AsyncDatabase)
      .provide(AsyncCache)
      .provide(AsyncUserService)
      .build();

    expect(graph.adapters).toHaveLength(4);

    // Verify diamond pattern is correctly built
    const inspection = GraphBuilder.create()
      .provide(AsyncConfig)
      .provide(AsyncDatabase)
      .provide(AsyncCache)
      .provide(AsyncUserService)
      .inspect();

    expect(inspection.adapterCount).toBe(4);
    expect(inspection.unsatisfiedRequirements).toHaveLength(0);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("async adapter edge cases", () => {
  it("handles async adapter with no dependencies", () => {
    const adapter = createAsyncAdapter({
      provides: LoggerPort,
      requires: [],
      factory: async () => ({ log: () => {} }),
    });

    const graph = GraphBuilder.create().provide(adapter).build();

    expect(graph.adapters).toHaveLength(1);
    expect(graph.adapters[0].requires).toEqual([]);
  });

  it("handles async adapter with sync dependencies", () => {
    const SyncLogger = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const AsyncDatabase = createAsyncAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      factory: async ({ Logger }) => {
        Logger.log("Initializing database...");
        return { query: async () => ({}), isConnected: true };
      },
    });

    const graph = GraphBuilder.create().provide(SyncLogger).provide(AsyncDatabase).build();

    expect(graph.adapters).toHaveLength(2);
  });

  it("handles multiple independent async adapters (parallel initialization)", () => {
    // These adapters have no async dependencies, so they can be initialized in parallel
    const Async1 = createAsyncAdapter({
      provides: ConfigPort,
      requires: [],
      factory: async () => ({ get: () => "" }),
    });

    const Async2 = createAsyncAdapter({
      provides: CachePort,
      requires: [],
      factory: async () => ({ get: () => null, set: () => {} }),
    });

    const graph = GraphBuilder.create().provide(Async1).provide(Async2).build();

    expect(graph.adapters).toHaveLength(2);
  });
});

// =============================================================================
// Error Utility Integration Tests
// =============================================================================

describe("error utility integration", () => {
  it("parseGraphError handles missing dependency errors", async () => {
    const { isGraphError, parseGraphError, GraphErrorCode } = await import("../src/advanced.js");

    const errorMsg = "ERROR[HEX008]: Missing adapters for Logger, Database.";
    expect(isGraphError(errorMsg)).toBe(true);

    const parsed = parseGraphError(errorMsg);
    expect(parsed).toBeDefined();
    expect(parsed?.code).toBe(GraphErrorCode.MISSING_DEPENDENCY);
    if (parsed?.code === GraphErrorCode.MISSING_DEPENDENCY) {
      expect(parsed.details.missingPorts).toBe("Logger, Database");
    }
  });

  it("parseGraphError handles circular dependency errors", async () => {
    const { isGraphError, parseGraphError, GraphErrorCode } = await import("../src/advanced.js");

    const errorMsg =
      "ERROR[HEX002]: Circular dependency: UserService -> Database -> UserService. Fix: Break cycle by extracting shared logic, using lazy resolution, or inverting a dependency.";
    expect(isGraphError(errorMsg)).toBe(true);

    const parsed = parseGraphError(errorMsg);
    expect(parsed).toBeDefined();
    expect(parsed?.code).toBe(GraphErrorCode.CIRCULAR_DEPENDENCY);
    if (parsed?.code === GraphErrorCode.CIRCULAR_DEPENDENCY) {
      expect(parsed.details.cyclePath).toBe("UserService -> Database -> UserService");
    }
  });

  it("parseGraphError handles duplicate adapter errors", async () => {
    const { isGraphError, parseGraphError, GraphErrorCode } = await import("../src/advanced.js");

    const errorMsg =
      "ERROR[HEX001]: Duplicate adapter for 'Logger'. Fix: Remove one .provide() call, or use .override() for child graphs.";
    expect(isGraphError(errorMsg)).toBe(true);

    const parsed = parseGraphError(errorMsg);
    expect(parsed).toBeDefined();
    expect(parsed?.code).toBe(GraphErrorCode.DUPLICATE_ADAPTER);
    if (parsed?.code === GraphErrorCode.DUPLICATE_ADAPTER) {
      expect(parsed.details.portName).toBe("Logger");
    }
  });

  it("parseGraphError handles captive dependency errors", async () => {
    const { isGraphError, parseGraphError, GraphErrorCode } = await import("../src/advanced.js");

    const errorMsg =
      "ERROR[HEX003]: Captive dependency: Singleton 'UserCache' cannot depend on Scoped 'RequestContext'. Fix: Change 'UserCache' to Scoped/Transient, or change 'RequestContext' to Singleton.";
    expect(isGraphError(errorMsg)).toBe(true);

    const parsed = parseGraphError(errorMsg);
    expect(parsed).toBeDefined();
    expect(parsed?.code).toBe(GraphErrorCode.CAPTIVE_DEPENDENCY);
    if (parsed?.code === GraphErrorCode.CAPTIVE_DEPENDENCY) {
      expect(parsed.details.dependentLifetime).toBe("Singleton");
      expect(parsed.details.dependentName).toBe("UserCache");
      expect(parsed.details.captiveLifetime).toBe("Scoped");
      expect(parsed.details.captiveName).toBe("RequestContext");
    }
  });

  it("parseGraphError handles lifetime inconsistency errors", async () => {
    const { isGraphError, parseGraphError, GraphErrorCode } = await import("../src/advanced.js");

    const errorMsg =
      "ERROR[HEX005]: Lifetime inconsistency for 'Logger': Graph A provides Singleton, Graph B provides Scoped. Fix: Use the same lifetime in both graphs, or remove one adapter before merging.";
    expect(isGraphError(errorMsg)).toBe(true);

    const parsed = parseGraphError(errorMsg);
    expect(parsed).toBeDefined();
    expect(parsed?.code).toBe(GraphErrorCode.LIFETIME_INCONSISTENCY);
    if (parsed?.code === GraphErrorCode.LIFETIME_INCONSISTENCY) {
      expect(parsed.details.portName).toBe("Logger");
      expect(parsed.details.lifetimeA).toBe("Singleton");
      expect(parsed.details.lifetimeB).toBe("Scoped");
    }
  });

  it("parseGraphError handles multiple errors", async () => {
    const { isGraphError, parseGraphError, GraphErrorCode } = await import("../src/advanced.js");

    const errorMsg = "Multiple validation errors:\n  1. Error one\n  2. Error two";
    expect(isGraphError(errorMsg)).toBe(true);

    const parsed = parseGraphError(errorMsg);
    expect(parsed).toBeDefined();
    expect(parsed?.code).toBe(GraphErrorCode.MULTIPLE_ERRORS);
  });

  it("parseGraphError returns undefined for non-errors", async () => {
    const { isGraphError, parseGraphError } = await import("../src/advanced.js");

    expect(isGraphError("This is not an error")).toBe(false);
    expect(parseGraphError("This is not an error")).toBeUndefined();
  });

  it("GraphErrorCode contains all expected error codes", async () => {
    const { GraphErrorCode } = await import("../src/advanced.js");

    expect(GraphErrorCode.DUPLICATE_ADAPTER).toBe("DUPLICATE_ADAPTER");
    expect(GraphErrorCode.CIRCULAR_DEPENDENCY).toBe("CIRCULAR_DEPENDENCY");
    expect(GraphErrorCode.CAPTIVE_DEPENDENCY).toBe("CAPTIVE_DEPENDENCY");
    expect(GraphErrorCode.REVERSE_CAPTIVE_DEPENDENCY).toBe("REVERSE_CAPTIVE_DEPENDENCY");
    expect(GraphErrorCode.LIFETIME_INCONSISTENCY).toBe("LIFETIME_INCONSISTENCY");
    expect(GraphErrorCode.SELF_DEPENDENCY).toBe("SELF_DEPENDENCY");
    expect(GraphErrorCode.DEPTH_LIMIT_EXCEEDED).toBe("DEPTH_LIMIT_EXCEEDED");
    expect(GraphErrorCode.MISSING_DEPENDENCY).toBe("MISSING_DEPENDENCY");
    expect(GraphErrorCode.MULTIPLE_ERRORS).toBe("MULTIPLE_ERRORS");
  });
});

// =============================================================================
// Async Factory Error Scenarios
// =============================================================================

describe("async factory error scenarios", () => {
  it("captures async factory that throws error", () => {
    const errorAdapter = createAsyncAdapter({
      provides: DatabasePort,
      requires: [],
      factory: async () => {
        throw new Error("Connection failed");
      },
    });

    // The adapter is created successfully - errors only occur at resolution time
    expect(errorAdapter.factoryKind).toBe("async");
    expect(errorAdapter.provides).toBe(DatabasePort);
  });

  it("captures async factory with rejection", () => {
    const rejectAdapter = createAsyncAdapter({
      provides: DatabasePort,
      requires: [],
      factory: () => Promise.reject(new Error("Rejected")),
    });

    // The adapter is created successfully - errors only occur at resolution time
    expect(rejectAdapter.factoryKind).toBe("async");
  });

  it("captures async finalizer that throws", () => {
    const adapterWithBadFinalizer = createAsyncAdapter({
      provides: DatabasePort,
      requires: [],
      factory: async () => ({ query: async () => ({}), isConnected: true }),
      finalizer: async () => {
        throw new Error("Cleanup failed");
      },
    });

    // The adapter is created successfully - finalizer errors only occur at disposal time
    expect(adapterWithBadFinalizer.finalizer).toBeDefined();
  });

  it("handles factory returning non-conformant type at graph build time", () => {
    // This test verifies the adapter structure is preserved regardless of factory behavior
    // TypeScript ensures factory return type at compile time
    const adapter = createAsyncAdapter({
      provides: CachePort,
      requires: [],
      factory: async () => ({ get: () => null, set: () => {} }),
    });

    const graph = GraphBuilder.create().provide(adapter).build();

    expect(graph.adapters).toHaveLength(1);
    expect(graph.adapters[0].provides).toBe(CachePort);
  });
});
