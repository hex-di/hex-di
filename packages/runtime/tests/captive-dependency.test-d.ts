/**
 * Type-level tests for captive dependency prevention.
 *
 * Captive dependency is a DI anti-pattern where a longer-lived service
 * (e.g., singleton) depends on a shorter-lived service (e.g., scoped/transient).
 * This causes the shorter-lived service to be "captured" and held beyond
 * its intended lifetime.
 *
 * Lifetime hierarchy (lower level = longer lived):
 * - Singleton (1): lives for entire application lifetime
 * - Scoped (2): lives for duration of a scope
 * - Transient (3): created fresh for each resolution
 *
 * Valid dependency directions:
 * - Singleton -> Singleton (same level)
 * - Scoped -> Singleton (longer-lived dependency - OK)
 * - Scoped -> Scoped (same level)
 * - Transient -> Singleton (longer-lived dependency - OK)
 * - Transient -> Scoped (longer-lived dependency - OK)
 * - Transient -> Transient (same level)
 *
 * Invalid (captive) dependencies:
 * - Singleton -> Scoped (shorter-lived dependency - CAPTIVE!)
 * - Singleton -> Transient (shorter-lived dependency - CAPTIVE!)
 * - Scoped -> Transient (shorter-lived dependency - CAPTIVE!)
 */

import { describe, expectTypeOf, it, expect } from "vitest";
import { createPort, createAdapter } from "@hex-di/core";

import type {
  LifetimeLevel,
  ValidateCaptiveDependency,
  CaptiveDependencyErrorLegacy,
} from "../src/index.js";

// =============================================================================
// Test Service Interfaces
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown>;
}

interface UserService {
  getUser(id: string): Promise<{ id: string; name: string }>;
}

interface RequestContext {
  requestId: string;
}

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = createPort<Logger, "Logger">({ name: "Logger" });
const DatabasePort = createPort<Database, "Database">({ name: "Database" });
const UserServicePort = createPort<UserService, "UserService">({ name: "UserService" });
const RequestContextPort = createPort<RequestContext, "RequestContext">({ name: "RequestContext" });

// Use ports to suppress unused variable warnings
expect(LoggerPort).toBeDefined();
expect(DatabasePort).toBeDefined();
expect(UserServicePort).toBeDefined();
expect(RequestContextPort).toBeDefined();

// =============================================================================
// Test Adapters with Various Lifetimes
// =============================================================================

// Singleton adapter with no dependencies
const SingletonLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});
expect(SingletonLoggerAdapter).toBeDefined();

// Scoped adapter with no dependencies
const ScopedDatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [],
  lifetime: "scoped",
  factory: () => ({ query: () => Promise.resolve({}) }),
});
expect(ScopedDatabaseAdapter).toBeDefined();

// Transient adapter with no dependencies
const RequestContextAdapter = createAdapter({
  provides: RequestContextPort,
  requires: [],
  lifetime: "transient",
  factory: () => ({ requestId: "req-123" }),
});
expect(RequestContextAdapter).toBeDefined();

// Singleton adapter depending on singleton (VALID)
const SingletonDependsOnSingletonAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort],
  lifetime: "singleton",
  factory: deps => ({
    getUser: (id: string) => {
      deps.Logger.log(`Getting user ${id}`);
      return Promise.resolve({ id, name: "Test" });
    },
  }),
});
expect(SingletonDependsOnSingletonAdapter).toBeDefined();

// Scoped adapter depending on singleton (VALID)
const ScopedDependsOnSingletonAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort],
  lifetime: "scoped",
  factory: deps => ({
    getUser: (id: string) => {
      deps.Logger.log(`Getting user ${id}`);
      return Promise.resolve({ id, name: "Test" });
    },
  }),
});
expect(ScopedDependsOnSingletonAdapter).toBeDefined();

// Transient adapter depending on any lifetime (VALID - transient can depend on anything)
const RequestDependsOnSingletonAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort],
  lifetime: "transient",
  factory: deps => ({
    getUser: (id: string) => {
      deps.Logger.log(`Getting user ${id}`);
      return Promise.resolve({ id, name: "Test" });
    },
  }),
});
expect(RequestDependsOnSingletonAdapter).toBeDefined();

// =============================================================================
// LifetimeLevel Type Tests
// =============================================================================

describe("LifetimeLevel phantom type", () => {
  it("singleton maps to level 1", () => {
    type SingletonLevel = LifetimeLevel<"singleton">;
    expectTypeOf<SingletonLevel>().toEqualTypeOf<1>();
  });

  it("scoped maps to level 2", () => {
    type ScopedLevel = LifetimeLevel<"scoped">;
    expectTypeOf<ScopedLevel>().toEqualTypeOf<2>();
  });

  it("transient maps to level 3", () => {
    type TransientLevel = LifetimeLevel<"transient">;
    expectTypeOf<TransientLevel>().toEqualTypeOf<3>();
  });
});

// =============================================================================
// Valid Dependency Tests (should compile without error)
// =============================================================================

describe("Valid captive dependency scenarios (should compile)", () => {
  it("singleton depending on singleton compiles", () => {
    type Result = ValidateCaptiveDependency<
      typeof SingletonDependsOnSingletonAdapter,
      typeof SingletonLoggerAdapter
    >;

    // Should return the adapter type (not an error)
    expectTypeOf<Result>().toEqualTypeOf<typeof SingletonDependsOnSingletonAdapter>();
  });

  it("scoped depending on singleton compiles", () => {
    type Result = ValidateCaptiveDependency<
      typeof ScopedDependsOnSingletonAdapter,
      typeof SingletonLoggerAdapter
    >;

    // Should return the adapter type (not an error)
    expectTypeOf<Result>().toEqualTypeOf<typeof ScopedDependsOnSingletonAdapter>();
  });

  it("scoped depending on scoped compiles", () => {
    // Create a scoped adapter that depends on a scoped service
    const ScopedDependsOnScopedAdapter = createAdapter({
      provides: UserServicePort,
      requires: [DatabasePort],
      lifetime: "scoped",
      factory: deps => ({
        getUser: async (id: string) => {
          await deps.Database.query(`SELECT * FROM users WHERE id = '${id}'`);
          return { id, name: "Test" };
        },
      }),
    });
    expect(ScopedDependsOnScopedAdapter).toBeDefined();

    type Result = ValidateCaptiveDependency<
      typeof ScopedDependsOnScopedAdapter,
      typeof ScopedDatabaseAdapter
    >;

    // Should return the adapter type (not an error)
    expectTypeOf<Result>().toEqualTypeOf<typeof ScopedDependsOnScopedAdapter>();
  });

  it("transient depending on any lifetime compiles", () => {
    // Transient depending on singleton
    type ResultSingleton = ValidateCaptiveDependency<
      typeof RequestDependsOnSingletonAdapter,
      typeof SingletonLoggerAdapter
    >;
    expectTypeOf<ResultSingleton>().toEqualTypeOf<typeof RequestDependsOnSingletonAdapter>();

    // Transient depending on scoped
    const RequestDependsOnScopedAdapter = createAdapter({
      provides: UserServicePort,
      requires: [DatabasePort],
      lifetime: "transient",
      factory: deps => ({
        getUser: async (id: string) => {
          await deps.Database.query(`SELECT * FROM users WHERE id = '${id}'`);
          return { id, name: "Test" };
        },
      }),
    });
    expect(RequestDependsOnScopedAdapter).toBeDefined();

    type ResultScoped = ValidateCaptiveDependency<
      typeof RequestDependsOnScopedAdapter,
      typeof ScopedDatabaseAdapter
    >;
    expectTypeOf<ResultScoped>().toEqualTypeOf<typeof RequestDependsOnScopedAdapter>();

    // Transient depending on transient
    const RequestDependsOnRequestAdapter = createAdapter({
      provides: UserServicePort,
      requires: [RequestContextPort],
      lifetime: "transient",
      factory: deps => ({
        getUser: (id: string) => {
          void deps.RequestContext.requestId; // Use the dependency
          return Promise.resolve({ id, name: "Test" });
        },
      }),
    });
    expect(RequestDependsOnRequestAdapter).toBeDefined();

    type ResultRequest = ValidateCaptiveDependency<
      typeof RequestDependsOnRequestAdapter,
      typeof RequestContextAdapter
    >;
    expectTypeOf<ResultRequest>().toEqualTypeOf<typeof RequestDependsOnRequestAdapter>();
  });
});

// =============================================================================
// Invalid Captive Dependency Tests (should produce error types)
// =============================================================================

describe("Invalid captive dependency scenarios (should produce error types)", () => {
  it("singleton depending on scoped produces error type", () => {
    // Singleton trying to depend on scoped - CAPTIVE!
    const SingletonDependsOnScopedAdapter = createAdapter({
      provides: UserServicePort,
      requires: [DatabasePort],
      lifetime: "singleton",
      factory: deps => ({
        getUser: async (id: string) => {
          await deps.Database.query(`SELECT * FROM users WHERE id = '${id}'`);
          return { id, name: "Test" };
        },
      }),
    });
    expect(SingletonDependsOnScopedAdapter).toBeDefined();

    type Result = ValidateCaptiveDependency<
      typeof SingletonDependsOnScopedAdapter,
      typeof ScopedDatabaseAdapter
    >;

    // Should be a CaptiveDependencyErrorLegacy
    expectTypeOf<Result>().toMatchTypeOf<CaptiveDependencyErrorLegacy<string>>();
  });

  it("singleton depending on transient produces error type", () => {
    // Singleton trying to depend on transient - CAPTIVE!
    const SingletonDependsOnRequestAdapter = createAdapter({
      provides: UserServicePort,
      requires: [RequestContextPort],
      lifetime: "singleton",
      factory: deps => ({
        getUser: (id: string) => {
          void deps.RequestContext.requestId; // Use the dependency
          return Promise.resolve({ id, name: "Test" });
        },
      }),
    });
    expect(SingletonDependsOnRequestAdapter).toBeDefined();

    type Result = ValidateCaptiveDependency<
      typeof SingletonDependsOnRequestAdapter,
      typeof RequestContextAdapter
    >;

    // Should be a CaptiveDependencyErrorLegacy
    expectTypeOf<Result>().toMatchTypeOf<CaptiveDependencyErrorLegacy<string>>();
  });

  it("scoped depending on transient produces error type", () => {
    // Scoped trying to depend on transient - CAPTIVE!
    const ScopedDependsOnRequestAdapter = createAdapter({
      provides: UserServicePort,
      requires: [RequestContextPort],
      lifetime: "scoped",
      factory: deps => ({
        getUser: (id: string) => {
          void deps.RequestContext.requestId; // Use the dependency
          return Promise.resolve({ id, name: "Test" });
        },
      }),
    });
    expect(ScopedDependsOnRequestAdapter).toBeDefined();

    type Result = ValidateCaptiveDependency<
      typeof ScopedDependsOnRequestAdapter,
      typeof RequestContextAdapter
    >;

    // Should be a CaptiveDependencyErrorLegacy
    expectTypeOf<Result>().toMatchTypeOf<CaptiveDependencyErrorLegacy<string>>();
  });
});

// =============================================================================
// Error Message Tests
// =============================================================================

describe("CaptiveDependencyErrorLegacy type", () => {
  it("error type includes descriptive message", () => {
    type TestError =
      CaptiveDependencyErrorLegacy<"Singleton 'UserService' cannot depend on Scoped 'Database'">;

    // Error should have the __errorBrand property
    expectTypeOf<TestError>().toHaveProperty("__errorBrand");

    // Error should have the __message property with the descriptive message
    expectTypeOf<
      TestError["__message"]
    >().toEqualTypeOf<"Singleton 'UserService' cannot depend on Scoped 'Database'">();
  });

  it("error type has correct brand", () => {
    type TestError = CaptiveDependencyErrorLegacy<"Test message">;

    expectTypeOf<TestError["__errorBrand"]>().toEqualTypeOf<"CaptiveDependencyError">();
  });
});
