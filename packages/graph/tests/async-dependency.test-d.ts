/**
 * Type-level tests for async dependency validation.
 *
 * These tests verify:
 * 1. Sync adapters cannot depend on async ports (compile-time error)
 * 2. Async adapters can depend on async ports
 * 3. Sync adapters can depend on sync ports
 * 4. Error messages are descriptive
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import { createPort } from "@hex-di/ports";
import { AsyncDependencyError, AsyncDependencies, HasAsyncDependency } from "../src/index.js";

// =============================================================================
// Test Service Interfaces
// =============================================================================

interface LoggerService {
  log(message: string): void;
}

interface DatabaseService {
  query(sql: string): Promise<unknown[]>;
}

interface CacheService {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

// =============================================================================
// Test Ports
// =============================================================================

const LoggerPort = createPort<"Logger", LoggerService>("Logger");
const DatabasePort = createPort<"Database", DatabaseService>("Database");
const CachePort = createPort<"Cache", CacheService>("Cache");

type LoggerPortType = typeof LoggerPort;
type DatabasePortType = typeof DatabasePort;
type CachePortType = typeof CachePort;

// Use the port variables to satisfy ESLint
expect(LoggerPort).toBeDefined();
expect(DatabasePort).toBeDefined();
expect(CachePort).toBeDefined();

// =============================================================================
// AsyncDependencies Type Tests
// =============================================================================

describe("AsyncDependencies utility type", () => {
  it("returns never when no async dependencies", () => {
    type Result = AsyncDependencies<LoggerPortType, DatabasePortType>;
    expectTypeOf<Result>().toEqualTypeOf<never>();
  });

  it("returns async port when dependency exists", () => {
    type Result = AsyncDependencies<DatabasePortType, DatabasePortType>;
    expectTypeOf<Result>().toEqualTypeOf<DatabasePortType>();
  });

  it("returns intersection of requires and async ports", () => {
    type Result = AsyncDependencies<
      LoggerPortType | DatabasePortType,
      DatabasePortType | CachePortType
    >;
    expectTypeOf<Result>().toEqualTypeOf<DatabasePortType>();
  });

  it("returns never when requires is never", () => {
    type Result = AsyncDependencies<never, DatabasePortType>;
    expectTypeOf<Result>().toEqualTypeOf<never>();
  });

  it("returns never when async ports is never", () => {
    type Result = AsyncDependencies<DatabasePortType, never>;
    expectTypeOf<Result>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// HasAsyncDependency Type Tests
// =============================================================================

describe("HasAsyncDependency utility type", () => {
  it("returns false when no async dependencies", () => {
    type Result = HasAsyncDependency<LoggerPortType, DatabasePortType>;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("returns true when async dependency exists", () => {
    type Result = HasAsyncDependency<DatabasePortType, DatabasePortType>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("returns true when any required port is async", () => {
    type Result = HasAsyncDependency<LoggerPortType | DatabasePortType, DatabasePortType>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("returns false when requires is never", () => {
    type Result = HasAsyncDependency<never, DatabasePortType>;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("returns false when async ports is never", () => {
    type Result = HasAsyncDependency<DatabasePortType, never>;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// AsyncDependencyError Type Tests
// =============================================================================

describe("AsyncDependencyError type", () => {
  it("has correct error brand", () => {
    type Error = AsyncDependencyError<DatabasePortType>;
    expectTypeOf<Error["__errorBrand"]>().toEqualTypeOf<"AsyncDependencyError">();
  });

  it("has readable error message with port name", () => {
    type Error = AsyncDependencyError<DatabasePortType>;
    expectTypeOf<
      Error["__message"]
    >().toEqualTypeOf<"Sync adapter cannot depend on async port: Database">();
  });

  it("tracks the async port type", () => {
    type Error = AsyncDependencyError<DatabasePortType>;
    expectTypeOf<Error["__asyncPort"]>().toEqualTypeOf<DatabasePortType>();
  });

  it("has __valid set to false", () => {
    type Error = AsyncDependencyError<DatabasePortType>;
    expectTypeOf<Error["__valid"]>().toEqualTypeOf<false>();
  });
});
