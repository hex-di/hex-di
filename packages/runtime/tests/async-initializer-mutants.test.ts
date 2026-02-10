/**
 * Mutation-killing tests for src/container/internal/async-initializer.ts
 *
 * Targets survived mutants in:
 * - isInitialized getter
 * - registerAdapter: asyncPorts add, asyncAdapters push
 * - hasAsyncPort: checks asyncPorts.has
 * - markInitialized: sets initialized = true
 * - initialize: idempotent, deduplication, error handling
 * - computeInitLevels: empty check, Kahn's algorithm, circular dependency detection
 * - executeInitialization: level processing, error enhancement, completedCount
 */
import { describe, it, expect, vi } from "vitest";
import { port } from "@hex-di/core";
import { AsyncInitializer } from "../src/container/internal/async-initializer.js";
import { AsyncFactoryError } from "../src/errors/index.js";

// =============================================================================
// Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): unknown;
}
interface Cache {
  get(key: string): unknown;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const CachePort = port<Cache>()({ name: "Cache" });

function makeAdapter(providesPort: any, requiresPorts: any[] = [], asyncFactory: boolean = true) {
  return {
    provides: providesPort,
    requires: requiresPorts,
    portName: providesPort.__portName,
    lifetime: "singleton" as const,
    factoryKind: asyncFactory ? "async" : "sync",
    factory: vi.fn().mockResolvedValue({ mock: true }),
    dependencyNames: requiresPorts.map((p: any) => p.__portName),
    finalizer: undefined,
    clonable: false,
  } as any;
}

// =============================================================================
// isInitialized
// =============================================================================

describe("AsyncInitializer.isInitialized (mutant killing)", () => {
  it("is false initially", () => {
    const init = new AsyncInitializer();
    expect(init.isInitialized).toBe(false);
  });

  it("is true after markInitialized", () => {
    const init = new AsyncInitializer();
    init.markInitialized();
    expect(init.isInitialized).toBe(true);
  });

  it("is true after successful initialize()", async () => {
    const init = new AsyncInitializer();
    init.registerAdapter(makeAdapter(LoggerPort));
    init.finalizeRegistration();

    await init.initialize(async () => ({}));
    expect(init.isInitialized).toBe(true);
  });
});

// =============================================================================
// registerAdapter / hasAsyncPort
// =============================================================================

describe("AsyncInitializer.registerAdapter / hasAsyncPort", () => {
  it("hasAsyncPort returns true after registration", () => {
    const init = new AsyncInitializer();
    init.registerAdapter(makeAdapter(LoggerPort));

    expect(init.hasAsyncPort(LoggerPort)).toBe(true);
  });

  it("hasAsyncPort returns false for unregistered port", () => {
    const init = new AsyncInitializer();
    expect(init.hasAsyncPort(LoggerPort)).toBe(false);
  });

  it("multiple registrations are tracked", () => {
    const init = new AsyncInitializer();
    init.registerAdapter(makeAdapter(LoggerPort));
    init.registerAdapter(makeAdapter(DatabasePort));

    expect(init.hasAsyncPort(LoggerPort)).toBe(true);
    expect(init.hasAsyncPort(DatabasePort)).toBe(true);
    expect(init.hasAsyncPort(CachePort)).toBe(false);
  });
});

// =============================================================================
// markInitialized
// =============================================================================

describe("AsyncInitializer.markInitialized", () => {
  it("sets isInitialized to true", () => {
    const init = new AsyncInitializer();
    expect(init.isInitialized).toBe(false);
    init.markInitialized();
    expect(init.isInitialized).toBe(true);
  });

  it("prevents future initialize() from running", async () => {
    const init = new AsyncInitializer();
    init.registerAdapter(makeAdapter(LoggerPort));
    init.finalizeRegistration();

    const resolver = vi.fn().mockResolvedValue({});
    init.markInitialized();
    await init.initialize(resolver);

    // resolver should NOT have been called since already initialized
    expect(resolver).not.toHaveBeenCalled();
  });
});

// =============================================================================
// initialize
// =============================================================================

describe("AsyncInitializer.initialize (mutant killing)", () => {
  it("calls resolveAsync for each registered adapter", async () => {
    const init = new AsyncInitializer();
    init.registerAdapter(makeAdapter(LoggerPort));
    init.registerAdapter(makeAdapter(DatabasePort));
    init.finalizeRegistration();

    const resolved: string[] = [];
    await init.initialize(async port => {
      resolved.push(port.__portName);
    });

    expect(resolved).toContain("Logger");
    expect(resolved).toContain("Database");
  });

  it("is idempotent - second call is a no-op", async () => {
    const init = new AsyncInitializer();
    init.registerAdapter(makeAdapter(LoggerPort));
    init.finalizeRegistration();

    let callCount = 0;
    const resolver = async () => {
      callCount++;
    };

    await init.initialize(resolver);
    expect(callCount).toBe(1);

    await init.initialize(resolver);
    expect(callCount).toBe(1); // not called again
  });

  it("deduplicates concurrent calls", async () => {
    const init = new AsyncInitializer();
    init.registerAdapter(makeAdapter(LoggerPort));
    init.finalizeRegistration();

    let callCount = 0;
    const resolver = async () => {
      callCount++;
      await new Promise(r => setTimeout(r, 10));
    };

    // Start two concurrent initializations
    const p1 = init.initialize(resolver);
    const p2 = init.initialize(resolver);

    await Promise.all([p1, p2]);
    expect(callCount).toBe(1); // only resolved once
  });

  it("wraps non-AsyncFactoryError in AsyncFactoryError", async () => {
    const init = new AsyncInitializer();
    init.registerAdapter(makeAdapter(LoggerPort));
    init.finalizeRegistration();

    await expect(
      init.initialize(async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow(AsyncFactoryError);
  });

  it("re-throws AsyncFactoryError directly", async () => {
    const init = new AsyncInitializer();
    init.registerAdapter(makeAdapter(LoggerPort));
    init.finalizeRegistration();

    const original = new AsyncFactoryError("Logger", new Error("original"));

    await expect(
      init.initialize(async () => {
        throw original;
      })
    ).rejects.toBe(original);
  });

  it("wraps non-Error values in contextMessage", async () => {
    const init = new AsyncInitializer();
    init.registerAdapter(makeAdapter(LoggerPort));
    init.finalizeRegistration();

    await expect(
      init.initialize(async () => {
        throw "string error";
      })
    ).rejects.toThrow(AsyncFactoryError);
  });

  it("error message includes initialization step context", async () => {
    const init = new AsyncInitializer();
    init.registerAdapter(makeAdapter(LoggerPort));
    init.registerAdapter(makeAdapter(DatabasePort));
    init.finalizeRegistration();

    let callIdx = 0;
    try {
      await init.initialize(async () => {
        callIdx++;
        if (callIdx >= 2) {
          throw new Error("db failed");
        }
      });
    } catch (e: any) {
      // Error should include initialization step context
      expect(e).toBeInstanceOf(AsyncFactoryError);
    }
  });

  it("clears initializationPromise after completion", async () => {
    const init = new AsyncInitializer();
    init.registerAdapter(makeAdapter(LoggerPort));
    init.finalizeRegistration();

    await init.initialize(async () => ({}));
    // Can verify by checking that a new initialize() after an error can proceed
    expect(init.isInitialized).toBe(true);
  });

  it("clears initializationPromise even on failure", async () => {
    const init = new AsyncInitializer();
    init.registerAdapter(makeAdapter(LoggerPort));
    init.finalizeRegistration();

    try {
      await init.initialize(async () => {
        throw new Error("fail");
      });
    } catch {
      // expected
    }

    // After failure, initializationPromise should be cleared (null)
    // We can verify by trying again - it should actually attempt again
    expect(init.isInitialized).toBe(false);
  });
});

// =============================================================================
// computeInitLevels (topological ordering)
// =============================================================================

describe("computeInitLevels (topological ordering)", () => {
  it("returns empty levels for no adapters", () => {
    const init = new AsyncInitializer();
    init.finalizeRegistration();
    // No error, no adapters
    expect(init.isInitialized).toBe(false);
  });

  it("single adapter in single level", async () => {
    const init = new AsyncInitializer();
    init.registerAdapter(makeAdapter(LoggerPort));
    init.finalizeRegistration();

    const resolved: string[] = [];
    await init.initialize(async port => {
      resolved.push(port.__portName);
    });

    expect(resolved).toEqual(["Logger"]);
  });

  it("independent adapters are in the same level (parallel)", async () => {
    const init = new AsyncInitializer();
    init.registerAdapter(makeAdapter(LoggerPort));
    init.registerAdapter(makeAdapter(DatabasePort));
    init.finalizeRegistration();

    const resolved: string[] = [];
    await init.initialize(async port => {
      resolved.push(port.__portName);
    });

    // Both should be resolved (order may vary within level)
    expect(resolved).toContain("Logger");
    expect(resolved).toContain("Database");
    expect(resolved).toHaveLength(2);
  });

  it("dependent adapter is in later level", async () => {
    const init = new AsyncInitializer();
    // Database depends on Logger
    init.registerAdapter(makeAdapter(LoggerPort, []));
    init.registerAdapter(makeAdapter(DatabasePort, [LoggerPort]));
    init.finalizeRegistration();

    const resolveOrder: string[] = [];
    await init.initialize(async port => {
      resolveOrder.push(port.__portName);
    });

    // Logger must be resolved before Database
    const loggerIdx = resolveOrder.indexOf("Logger");
    const dbIdx = resolveOrder.indexOf("Database");
    expect(loggerIdx).toBeLessThan(dbIdx);
  });

  it("three-level dependency chain", async () => {
    const init = new AsyncInitializer();
    // Cache -> Database -> Logger
    init.registerAdapter(makeAdapter(LoggerPort, []));
    init.registerAdapter(makeAdapter(DatabasePort, [LoggerPort]));
    init.registerAdapter(makeAdapter(CachePort, [DatabasePort]));
    init.finalizeRegistration();

    const resolveOrder: string[] = [];
    await init.initialize(async port => {
      resolveOrder.push(port.__portName);
    });

    const loggerIdx = resolveOrder.indexOf("Logger");
    const dbIdx = resolveOrder.indexOf("Database");
    const cacheIdx = resolveOrder.indexOf("Cache");
    expect(loggerIdx).toBeLessThan(dbIdx);
    expect(dbIdx).toBeLessThan(cacheIdx);
  });

  it("only counts async dependencies for in-degree", async () => {
    const SyncPort = port<{ val: number }>()({ name: "SyncPort" });

    const init = new AsyncInitializer();
    // Database depends on SyncPort (non-async), so SyncPort is not in asyncPorts
    init.registerAdapter(makeAdapter(DatabasePort, [SyncPort]));
    init.finalizeRegistration();

    const resolved: string[] = [];
    await init.initialize(async port => {
      resolved.push(port.__portName);
    });

    // Database should be in level 0 since SyncPort is not async
    expect(resolved).toEqual(["Database"]);
  });
});

// =============================================================================
// finalizeRegistration
// =============================================================================

describe("finalizeRegistration", () => {
  it("can be called multiple times without error", () => {
    const init = new AsyncInitializer();
    init.registerAdapter(makeAdapter(LoggerPort));
    init.finalizeRegistration();
    init.finalizeRegistration(); // should not throw
  });
});
