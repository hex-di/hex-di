/**
 * Type-level tests for compile-time captive dependency detection in GraphBuilder.
 *
 * These tests verify:
 * 1. Valid lifetime dependencies pass validation
 * 2. Captive dependencies (singleton -> scoped/transient, scoped -> transient) are detected
 * 3. Error messages contain correct lifetime and port names
 * 4. Detection works with provide(), provideMany(), and merge()
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import { CaptiveDependencyError, LifetimeLevel, IsCaptiveDependency } from "../src/advanced.js";
import type {
  CaptiveErrorMessage,
  AddLifetime,
  GetLifetimeLevel,
  FindAnyCaptiveDependency,
  LifetimeName,
} from "../src/advanced.js";
import {
  LoggerPort,
  DatabasePort,
  UserServicePort,
  RequestContextPort,
  CachePortSimple as CachePort,
} from "./fixtures.js";

// =============================================================================
// Test Helper Type
// =============================================================================

type IsCaptiveError<T> = T extends `ERROR[HEX003]: Captive dependency: ${string}` ? true : false;

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

describe("LifetimeName type", () => {
  it("level 1 maps to Singleton", () => {
    type Name = LifetimeName<1>;
    expectTypeOf<Name>().toEqualTypeOf<"Singleton">();
  });

  it("level 2 maps to Scoped", () => {
    type Name = LifetimeName<2>;
    expectTypeOf<Name>().toEqualTypeOf<"Scoped">();
  });

  it("level 3 maps to Transient", () => {
    type Name = LifetimeName<3>;
    expectTypeOf<Name>().toEqualTypeOf<"Transient">();
  });

  it("returns never for never input (error propagation)", () => {
    type Name = LifetimeName<never>;
    expectTypeOf<Name>().toBeNever();
  });

  it("returns never for invalid level (error propagation)", () => {
    type Name = LifetimeName<99>;
    expectTypeOf<Name>().toBeNever();
  });

  it("returns never for unknown input (error propagation)", () => {
    type Name = LifetimeName<unknown>;
    expectTypeOf<Name>().toBeNever();
  });
});

// =============================================================================
// Lifetime Map Operations Tests
// =============================================================================

describe("AddLifetime and GetLifetimeLevel utilities", () => {
  it("adds lifetime to empty map", () => {
    type Map = {};
    type Result = AddLifetime<Map, "Logger", "singleton">;

    type LoggerLevel = GetLifetimeLevel<Result, "Logger">;
    expectTypeOf<LoggerLevel>().toEqualTypeOf<1>();
  });

  it("adds multiple lifetimes", () => {
    type Map1 = AddLifetime<{}, "Logger", "singleton">;
    type Map2 = AddLifetime<Map1, "Database", "scoped">;
    type Map3 = AddLifetime<Map2, "RequestContext", "transient">;

    type LoggerLevel = GetLifetimeLevel<Map3, "Logger">;
    type DatabaseLevel = GetLifetimeLevel<Map3, "Database">;
    type RequestLevel = GetLifetimeLevel<Map3, "RequestContext">;

    expectTypeOf<LoggerLevel>().toEqualTypeOf<1>();
    expectTypeOf<DatabaseLevel>().toEqualTypeOf<2>();
    expectTypeOf<RequestLevel>().toEqualTypeOf<3>();
  });

  it("returns never for missing port", () => {
    type Map = AddLifetime<{}, "Logger", "singleton">;
    type MissingLevel = GetLifetimeLevel<Map, "Unknown">;
    expectTypeOf<MissingLevel>().toBeNever();
  });
});

// =============================================================================
// IsCaptiveDependency Tests
// =============================================================================

describe("IsCaptiveDependency utility", () => {
  it("singleton depending on singleton is not captive", () => {
    type Result = IsCaptiveDependency<1, 1>;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("scoped depending on singleton is not captive", () => {
    type Result = IsCaptiveDependency<2, 1>;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("scoped depending on scoped is not captive", () => {
    type Result = IsCaptiveDependency<2, 2>;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("transient depending on any is not captive", () => {
    type R1 = IsCaptiveDependency<3, 1>;
    type R2 = IsCaptiveDependency<3, 2>;
    type R3 = IsCaptiveDependency<3, 3>;
    expectTypeOf<R1>().toEqualTypeOf<false>();
    expectTypeOf<R2>().toEqualTypeOf<false>();
    expectTypeOf<R3>().toEqualTypeOf<false>();
  });

  it("singleton depending on scoped is captive", () => {
    type Result = IsCaptiveDependency<1, 2>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("singleton depending on transient is captive", () => {
    type Result = IsCaptiveDependency<1, 3>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("scoped depending on transient is captive", () => {
    type Result = IsCaptiveDependency<2, 3>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// FindAnyCaptiveDependency Tests
// =============================================================================

describe("FindAnyCaptiveDependency utility", () => {
  it("returns never when no captive dependencies", () => {
    type Map = AddLifetime<AddLifetime<{}, "Logger", "singleton">, "Config", "singleton">;
    type Result = FindAnyCaptiveDependency<Map, 1, "Logger" | "Config">;
    expectTypeOf<Result>().toBeNever();
  });

  it("returns captive port name when found", () => {
    type Map = AddLifetime<AddLifetime<{}, "Logger", "singleton">, "Database", "scoped">;
    // Singleton (level 1) depending on scoped Database (level 2) - captive!
    type Result = FindAnyCaptiveDependency<Map, 1, "Database">;
    expectTypeOf<Result>().toEqualTypeOf<"Database">();
  });

  it("returns never for missing ports (forward reference)", () => {
    type Map = AddLifetime<{}, "Logger", "singleton">;
    // Unknown port not in map - no error (will be caught by MissingDependencyError)
    type Result = FindAnyCaptiveDependency<Map, 1, "Unknown">;
    expectTypeOf<Result>().toBeNever();
  });
});

// =============================================================================
// GraphBuilder Captive Dependency Detection Tests
// =============================================================================

describe("GraphBuilder.provide() captive dependency detection", () => {
  describe("valid lifetime dependencies", () => {
    it("allows singleton depending on singleton", () => {
      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      const UserServiceAdapter = createAdapter({
        provides: UserServicePort,
        requires: [LoggerPort],
        lifetime: "singleton",
        factory: () => ({ getUser: id => Promise.resolve({ id, name: "Test" }) }),
      });

      const builder = GraphBuilder.create().provide(LoggerAdapter).provide(UserServiceAdapter);
      expect(builder).toBeDefined();

      expectTypeOf<IsCaptiveError<typeof builder>>().toEqualTypeOf<false>();
    });

    it("allows scoped depending on singleton", () => {
      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      const UserServiceAdapter = createAdapter({
        provides: UserServicePort,
        requires: [LoggerPort],
        lifetime: "scoped",
        factory: () => ({ getUser: id => Promise.resolve({ id, name: "Test" }) }),
      });

      const builder = GraphBuilder.create().provide(LoggerAdapter).provide(UserServiceAdapter);
      expect(builder).toBeDefined();

      expectTypeOf<IsCaptiveError<typeof builder>>().toEqualTypeOf<false>();
    });

    it("allows scoped depending on scoped", () => {
      const DatabaseAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ query: () => Promise.resolve({}) }),
      });

      const UserServiceAdapter = createAdapter({
        provides: UserServicePort,
        requires: [DatabasePort],
        lifetime: "scoped",
        factory: () => ({ getUser: id => Promise.resolve({ id, name: "Test" }) }),
      });

      const builder = GraphBuilder.create().provide(DatabaseAdapter).provide(UserServiceAdapter);
      expect(builder).toBeDefined();

      expectTypeOf<IsCaptiveError<typeof builder>>().toEqualTypeOf<false>();
    });

    it("allows transient depending on any lifetime", () => {
      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      const DatabaseAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ query: () => Promise.resolve({}) }),
      });

      const RequestContextAdapter = createAdapter({
        provides: RequestContextPort,
        requires: [],
        lifetime: "transient",
        factory: () => ({ requestId: "req-123" }),
      });

      // Transient depending on singleton, scoped, and transient
      const UserServiceAdapter = createAdapter({
        provides: UserServicePort,
        requires: [LoggerPort, DatabasePort, RequestContextPort],
        lifetime: "transient",
        factory: () => ({ getUser: id => Promise.resolve({ id, name: "Test" }) }),
      });

      const builder = GraphBuilder.create()
        .provide(LoggerAdapter)
        .provide(DatabaseAdapter)
        .provide(RequestContextAdapter)
        .provide(UserServiceAdapter);
      expect(builder).toBeDefined();

      expectTypeOf<IsCaptiveError<typeof builder>>().toEqualTypeOf<false>();
    });
  });

  describe("captive dependency detection", () => {
    it("detects singleton depending on scoped", () => {
      const DatabaseAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ query: () => Promise.resolve({}) }),
      });

      const UserServiceAdapter = createAdapter({
        provides: UserServicePort,
        requires: [DatabasePort],
        lifetime: "singleton", // Singleton capturing scoped!
        factory: () => ({ getUser: id => Promise.resolve({ id, name: "Test" }) }),
      });
      expect(UserServiceAdapter).toBeDefined();

      const builder = GraphBuilder.create().provide(DatabaseAdapter);
      expect(builder).toBeDefined();
      type Result = ReturnType<typeof builder.provide<typeof UserServiceAdapter>>;

      expectTypeOf<IsCaptiveError<Result>>().toEqualTypeOf<true>();
    });

    it("detects singleton depending on transient", () => {
      const RequestContextAdapter = createAdapter({
        provides: RequestContextPort,
        requires: [],
        lifetime: "transient",
        factory: () => ({ requestId: "req-123" }),
      });

      const UserServiceAdapter = createAdapter({
        provides: UserServicePort,
        requires: [RequestContextPort],
        lifetime: "singleton", // Singleton capturing transient!
        factory: () => ({ getUser: id => Promise.resolve({ id, name: "Test" }) }),
      });
      expect(UserServiceAdapter).toBeDefined();

      const builder = GraphBuilder.create().provide(RequestContextAdapter);
      expect(builder).toBeDefined();
      type Result = ReturnType<typeof builder.provide<typeof UserServiceAdapter>>;

      expectTypeOf<IsCaptiveError<Result>>().toEqualTypeOf<true>();
    });

    it("detects scoped depending on transient", () => {
      const RequestContextAdapter = createAdapter({
        provides: RequestContextPort,
        requires: [],
        lifetime: "transient",
        factory: () => ({ requestId: "req-123" }),
      });

      const UserServiceAdapter = createAdapter({
        provides: UserServicePort,
        requires: [RequestContextPort],
        lifetime: "scoped", // Scoped capturing transient!
        factory: () => ({ getUser: id => Promise.resolve({ id, name: "Test" }) }),
      });
      expect(UserServiceAdapter).toBeDefined();

      const builder = GraphBuilder.create().provide(RequestContextAdapter);
      expect(builder).toBeDefined();
      type Result = ReturnType<typeof builder.provide<typeof UserServiceAdapter>>;

      expectTypeOf<IsCaptiveError<Result>>().toEqualTypeOf<true>();
    });
  });
});

// =============================================================================
// CaptiveDependencyError Type Tests
// =============================================================================

describe("CaptiveDependencyError and CaptiveErrorMessage types", () => {
  it("CaptiveErrorMessage returns template literal with all details", () => {
    // Template literal error message directly shows the lifetime conflict
    type ErrorMessage = CaptiveErrorMessage<"UserService", "Singleton", "Database", "Scoped">;
    expectTypeOf<ErrorMessage>().toEqualTypeOf<"ERROR[HEX003]: Captive dependency: Singleton 'UserService' cannot depend on Scoped 'Database'. Fix: Change 'UserService' to Scoped/Transient, or change 'Database' to Singleton.">();
  });

  it("CaptiveDependencyError branded type has correct structure", () => {
    // The branded object type is still available for advanced usage
    type Error = CaptiveDependencyError<"UserService", "Singleton", "Database", "Scoped">;

    expectTypeOf<Error["__valid"]>().toEqualTypeOf<false>();
    expectTypeOf<Error["__errorBrand"]>().toEqualTypeOf<"CaptiveDependencyError">();
  });

  it("CaptiveDependencyError message contains all details", () => {
    type Error = CaptiveDependencyError<"UserService", "Singleton", "Database", "Scoped">;

    type Message = Error["__message"];
    expectTypeOf<Message>().toEqualTypeOf<"Captive dependency: Singleton 'UserService' cannot depend on Scoped 'Database'">();
  });
});

// =============================================================================
// Mixed Lifetime Scenarios
// =============================================================================

describe("complex lifetime scenarios", () => {
  it("allows diamond dependency with consistent lifetimes", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: () => ({ query: () => Promise.resolve({}) }),
    });

    const CacheAdapter = createAdapter({
      provides: CachePort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: () => ({ get: () => null, set: () => {} }),
    });

    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [DatabasePort, CachePort],
      lifetime: "singleton",
      factory: () => ({ getUser: id => Promise.resolve({ id, name: "Test" }) }),
    });

    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(CacheAdapter)
      .provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    expectTypeOf<IsCaptiveError<typeof builder>>().toEqualTypeOf<false>();
  });

  it("allows layered architecture with proper lifetime ordering", () => {
    // Infrastructure layer - singleton
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    // Data layer - scoped (depends on singleton - OK)
    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      lifetime: "scoped",
      factory: () => ({ query: () => Promise.resolve({}) }),
    });

    // Service layer - scoped (depends on scoped and singleton - OK)
    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [DatabasePort, LoggerPort],
      lifetime: "scoped",
      factory: () => ({ getUser: id => Promise.resolve({ id, name: "Test" }) }),
    });

    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    expectTypeOf<IsCaptiveError<typeof builder>>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// Reverse Captive Dependency Detection Tests
// =============================================================================

type IsReverseCaptiveError<T> = T extends `ERROR[HEX004]: Reverse captive dependency: ${string}`
  ? true
  : false;

describe("Reverse captive dependency detection (forward reference scenario)", () => {
  it("detects singleton depending on port later provided as scoped", () => {
    // Singleton CacheAdapter requires SessionPort, but SessionPort isn't provided yet
    const SessionPort = RequestContextPort; // Reuse existing port

    const CacheAdapter = createAdapter({
      provides: CachePort,
      requires: [SessionPort], // Forward reference
      lifetime: "singleton",
      factory: () => ({ get: () => undefined, set: () => {} }),
    });

    // Now provide SessionPort as scoped - this should error!
    const SessionAdapter = createAdapter({
      provides: SessionPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "test", userId: null }),
    });

    const builder = GraphBuilder.create().provide(CacheAdapter);
    const result = builder.provide(SessionAdapter);
    expect(result).toBeDefined();

    // Should be a reverse captive error
    type Result = typeof result;
    expectTypeOf<IsReverseCaptiveError<Result>>().toEqualTypeOf<true>();
  });

  it("detects singleton depending on port later provided as transient", () => {
    const TransientPort = RequestContextPort;

    const SingletonAdapter = createAdapter({
      provides: CachePort,
      requires: [TransientPort], // Forward reference
      lifetime: "singleton",
      factory: () => ({ get: () => undefined, set: () => {} }),
    });

    const TransientAdapter = createAdapter({
      provides: TransientPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ requestId: "test", userId: null }),
    });

    const builder = GraphBuilder.create().provide(SingletonAdapter);
    const result = builder.provide(TransientAdapter);

    type Result = typeof result;
    expectTypeOf<IsReverseCaptiveError<Result>>().toEqualTypeOf<true>();
  });

  it("detects scoped depending on port later provided as transient", () => {
    const TransientPort = RequestContextPort;

    const ScopedAdapter = createAdapter({
      provides: CachePort,
      requires: [TransientPort], // Forward reference
      lifetime: "scoped",
      factory: () => ({ get: () => undefined, set: () => {} }),
    });

    const TransientAdapter = createAdapter({
      provides: TransientPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ requestId: "test", userId: null }),
    });

    const builder = GraphBuilder.create().provide(ScopedAdapter);
    const result = builder.provide(TransientAdapter);

    type Result = typeof result;
    expectTypeOf<IsReverseCaptiveError<Result>>().toEqualTypeOf<true>();
  });

  it("allows singleton depending on port later provided as singleton", () => {
    const SingletonDep = RequestContextPort;

    const ConsumerAdapter = createAdapter({
      provides: CachePort,
      requires: [SingletonDep], // Forward reference
      lifetime: "singleton",
      factory: () => ({ get: () => undefined, set: () => {} }),
    });

    const ProviderAdapter = createAdapter({
      provides: SingletonDep,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ requestId: "test", userId: null }),
    });

    const builder = GraphBuilder.create().provide(ConsumerAdapter);
    const result = builder.provide(ProviderAdapter);

    // Should succeed - both are singletons
    type Result = typeof result;
    expectTypeOf<IsReverseCaptiveError<Result>>().toEqualTypeOf<false>();
  });

  it("allows scoped depending on port later provided as singleton", () => {
    const SingletonDep = RequestContextPort;

    const ScopedAdapter = createAdapter({
      provides: CachePort,
      requires: [SingletonDep], // Forward reference
      lifetime: "scoped",
      factory: () => ({ get: () => undefined, set: () => {} }),
    });

    const SingletonAdapter = createAdapter({
      provides: SingletonDep,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ requestId: "test", userId: null }),
    });

    const builder = GraphBuilder.create().provide(ScopedAdapter);
    const result = builder.provide(SingletonAdapter);

    // Should succeed - singleton dependency is fine for scoped
    type Result = typeof result;
    expectTypeOf<IsReverseCaptiveError<Result>>().toEqualTypeOf<false>();
  });

  it("allows transient depending on port later provided as any lifetime", () => {
    const Dependency = RequestContextPort;

    const TransientAdapter = createAdapter({
      provides: CachePort,
      requires: [Dependency], // Forward reference
      lifetime: "transient",
      factory: () => ({ get: () => undefined, set: () => {} }),
    });

    // Even providing as scoped or transient is fine for transient consumers
    const ScopedAdapter = createAdapter({
      provides: Dependency,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "test", userId: null }),
    });

    const builder = GraphBuilder.create().provide(TransientAdapter);
    const result = builder.provide(ScopedAdapter);

    type Result = typeof result;
    expectTypeOf<IsReverseCaptiveError<Result>>().toEqualTypeOf<false>();
  });

  it("does not trigger for already-provided ports (duplicate scenario)", () => {
    // First provide Logger as singleton
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    // Then UserService depends on Logger
    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort],
      lifetime: "scoped",
      factory: () => ({ getUser: () => Promise.resolve({ id: "1", name: "test" }) }),
    });

    // Try to provide duplicate Logger as transient
    const DuplicateLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ log: () => {} }),
    });

    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(UserServiceAdapter);

    const result = builder.provide(DuplicateLoggerAdapter);

    // Should be a duplicate error, NOT a reverse captive error
    type Result = typeof result;
    type IsDuplicate = Result extends `ERROR[HEX001]: Duplicate${string}` ? true : false;
    expectTypeOf<IsDuplicate>().toEqualTypeOf<true>();
    expectTypeOf<IsReverseCaptiveError<Result>>().toEqualTypeOf<false>();
  });
});
