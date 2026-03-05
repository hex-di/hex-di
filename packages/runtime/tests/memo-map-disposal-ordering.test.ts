/**
 * MemoMap dependency-aware disposal ordering tests.
 *
 * Tests that MemoMap can dispose instances in reverse topological order
 * when dependency entries are provided, and falls back to LIFO when not.
 *
 * @see BEH-CO-14-001, BEH-CO-14-003
 * @packageDocumentation
 */

import { describe, test, expect, vi } from "vitest";
import { port } from "@hex-di/core";
import type { DependencyEntry } from "@hex-di/core";
import { MemoMap } from "../src/util/memo-map.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): unknown;
}

interface Cache {
  get(key: string): unknown;
}

interface UserRepo {
  find(id: string): unknown;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const CachePort = port<Cache>()({ name: "Cache" });
const UserRepoPort = port<UserRepo>()({ name: "UserRepo" });

// =============================================================================
// Dependency-Aware Disposal Tests
// =============================================================================

describe("MemoMap dependency-aware disposal", () => {
  test("disposes in reverse topological order when dependencyEntries provided", async () => {
    const memoMap = new MemoMap();
    const disposalOrder: string[] = [];

    // Simulate: UserRepo -> Database (UserRepo depends on Database)
    const db: Database = { query: vi.fn() };
    const repo: UserRepo = { find: vi.fn() };

    // Database resolved first (dependency)
    memoMap.getOrElseMemoize(
      DatabasePort,
      () => db,
      () => {
        disposalOrder.push("Database");
      }
    );
    // UserRepo resolved second (dependent)
    memoMap.getOrElseMemoize(
      UserRepoPort,
      () => repo,
      () => {
        disposalOrder.push("UserRepo");
      }
    );

    const dependencyEntries: DependencyEntry[] = [
      { portName: "UserRepo", dependsOn: ["Database"], hasFinalizer: true },
      { portName: "Database", dependsOn: [], hasFinalizer: true },
    ];

    await memoMap.dispose({ dependencyEntries });

    // UserRepo (dependent) disposed BEFORE Database (dependency)
    expect(disposalOrder).toEqual(["UserRepo", "Database"]);
  });

  test("falls back to LIFO when no dependencyEntries provided", async () => {
    const memoMap = new MemoMap();
    const disposalOrder: string[] = [];

    const logger: Logger = { log: vi.fn() };
    const db: Database = { query: vi.fn() };

    // Logger resolved first
    memoMap.getOrElseMemoize(
      LoggerPort,
      () => logger,
      () => {
        disposalOrder.push("Logger");
      }
    );
    // Database resolved second
    memoMap.getOrElseMemoize(
      DatabasePort,
      () => db,
      () => {
        disposalOrder.push("Database");
      }
    );

    // No dependencyEntries -> LIFO
    await memoMap.dispose();

    // LIFO: Database (last created) disposed first, then Logger
    expect(disposalOrder).toEqual(["Database", "Logger"]);
  });

  test("falls back to LIFO when dependencyEntries is empty array", async () => {
    const memoMap = new MemoMap();
    const disposalOrder: string[] = [];

    const logger: Logger = { log: vi.fn() };
    const db: Database = { query: vi.fn() };

    memoMap.getOrElseMemoize(
      LoggerPort,
      () => logger,
      () => {
        disposalOrder.push("Logger");
      }
    );
    memoMap.getOrElseMemoize(
      DatabasePort,
      () => db,
      () => {
        disposalOrder.push("Database");
      }
    );

    await memoMap.dispose({ dependencyEntries: [] });

    // LIFO fallback
    expect(disposalOrder).toEqual(["Database", "Logger"]);
  });

  test("complex graph: UserService -> UserRepo -> Database, UserService -> Logger", async () => {
    const memoMap = new MemoMap();
    const disposalOrder: string[] = [];

    interface UserService {
      getUser(): unknown;
    }
    const UserServicePort = port<UserService>()({ name: "UserService" });

    // Resolve in creation order (dependencies first, as container would do)
    memoMap.getOrElseMemoize(
      LoggerPort,
      () => ({ log: vi.fn() }),
      () => {
        disposalOrder.push("Logger");
      }
    );
    memoMap.getOrElseMemoize(
      DatabasePort,
      () => ({ query: vi.fn() }),
      () => {
        disposalOrder.push("Database");
      }
    );
    memoMap.getOrElseMemoize(
      UserRepoPort,
      () => ({ find: vi.fn() }),
      () => {
        disposalOrder.push("UserRepo");
      }
    );
    memoMap.getOrElseMemoize(
      UserServicePort,
      () => ({ getUser: vi.fn() }),
      () => {
        disposalOrder.push("UserService");
      }
    );

    const dependencyEntries: DependencyEntry[] = [
      { portName: "UserService", dependsOn: ["UserRepo", "Logger"], hasFinalizer: true },
      { portName: "UserRepo", dependsOn: ["Database"], hasFinalizer: true },
      { portName: "Logger", dependsOn: [], hasFinalizer: true },
      { portName: "Database", dependsOn: [], hasFinalizer: true },
    ];

    await memoMap.dispose({ dependencyEntries });

    // Phase 0: UserService (leaf - no dependents)
    // Phase 1: UserRepo, Logger (after UserService removed)
    // Phase 2: Database (root)
    const serviceIdx = disposalOrder.indexOf("UserService");
    const repoIdx = disposalOrder.indexOf("UserRepo");
    const loggerIdx = disposalOrder.indexOf("Logger");
    const dbIdx = disposalOrder.indexOf("Database");

    expect(serviceIdx).toBeLessThan(repoIdx);
    expect(serviceIdx).toBeLessThan(loggerIdx);
    expect(serviceIdx).toBeLessThan(dbIdx);
    expect(repoIdx).toBeLessThan(dbIdx);
  });

  test("collects errors and throws AggregateError with dependency-aware disposal", async () => {
    const memoMap = new MemoMap();
    const disposalOrder: string[] = [];

    const logger: Logger = { log: vi.fn() };
    const db: Database = { query: vi.fn() };

    memoMap.getOrElseMemoize(
      LoggerPort,
      () => logger,
      () => {
        disposalOrder.push("Logger");
        throw new Error("Logger cleanup failed");
      }
    );
    memoMap.getOrElseMemoize(
      DatabasePort,
      () => db,
      () => {
        disposalOrder.push("Database");
      }
    );

    const dependencyEntries: DependencyEntry[] = [
      { portName: "Logger", dependsOn: [], hasFinalizer: true },
      { portName: "Database", dependsOn: [], hasFinalizer: true },
    ];

    try {
      await memoMap.dispose({ dependencyEntries });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AggregateError);
      const aggErr = err as AggregateError;
      expect(aggErr.errors).toHaveLength(1);
      expect((aggErr.errors[0] as Error).message).toBe("Logger cleanup failed");
    }

    // Both should still have been attempted (best-effort)
    expect(disposalOrder).toContain("Logger");
    expect(disposalOrder).toContain("Database");
  });

  test("only disposes entries that are actually cached", async () => {
    const memoMap = new MemoMap();
    const disposalOrder: string[] = [];

    // Only cache Logger, not Database
    const logger: Logger = { log: vi.fn() };
    memoMap.getOrElseMemoize(
      LoggerPort,
      () => logger,
      () => {
        disposalOrder.push("Logger");
      }
    );

    // Provide entries for both, but Database is not in the cache
    const dependencyEntries: DependencyEntry[] = [
      { portName: "Logger", dependsOn: ["Database"], hasFinalizer: true },
      { portName: "Database", dependsOn: [], hasFinalizer: true },
    ];

    await memoMap.dispose({ dependencyEntries });

    // Only Logger should be disposed (Database wasn't cached)
    expect(disposalOrder).toEqual(["Logger"]);
  });

  test("lastDisposalResult is populated after dependency-aware disposal", async () => {
    const memoMap = new MemoMap();

    const logger: Logger = { log: vi.fn() };
    memoMap.getOrElseMemoize(
      LoggerPort,
      () => logger,
      () => {}
    );

    const dependencyEntries: DependencyEntry[] = [
      { portName: "Logger", dependsOn: [], hasFinalizer: true },
    ];

    await memoMap.dispose({ dependencyEntries });

    expect(memoMap.lastDisposalResult).toBeDefined();
    if (memoMap.lastDisposalResult !== undefined) {
      expect(memoMap.lastDisposalResult.disposed).toContain("Logger");
      expect(memoMap.lastDisposalResult.errors).toEqual([]);
      expect(memoMap.lastDisposalResult.totalTime).toBeGreaterThanOrEqual(0);
    }
  });

  test("lastDisposalResult is undefined after LIFO disposal", async () => {
    const memoMap = new MemoMap();

    const logger: Logger = { log: vi.fn() };
    memoMap.getOrElseMemoize(LoggerPort, () => logger);

    await memoMap.dispose();

    expect(memoMap.lastDisposalResult).toBeUndefined();
  });

  test("marks as disposed after dependency-aware disposal", async () => {
    const memoMap = new MemoMap();

    const logger: Logger = { log: vi.fn() };
    memoMap.getOrElseMemoize(LoggerPort, () => logger);

    expect(memoMap.isDisposed).toBe(false);

    await memoMap.dispose({
      dependencyEntries: [{ portName: "Logger", dependsOn: [], hasFinalizer: false }],
    });

    expect(memoMap.isDisposed).toBe(true);
  });

  test("handles entries without finalizers gracefully", async () => {
    const memoMap = new MemoMap();

    const logger: Logger = { log: vi.fn() };
    // No finalizer
    memoMap.getOrElseMemoize(LoggerPort, () => logger);

    const dependencyEntries: DependencyEntry[] = [
      { portName: "Logger", dependsOn: [], hasFinalizer: false },
    ];

    // Should not throw
    await memoMap.dispose({ dependencyEntries });
    expect(memoMap.isDisposed).toBe(true);
  });
});
