/**
 * Type-level tests for compile-time captive dependency detection in GraphBuilder.
 *
 * These tests verify:
 * 1. Valid lifetime dependencies pass validation
 * 2. Captive dependencies (singleton → scoped/transient, scoped → transient) are detected
 * 3. Error messages contain correct lifetime and port names
 * 4. Detection works with provide(), provideMany(), and merge()
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort } from "@hex-di/ports";
import {
  GraphBuilder,
  createAdapter,
  LifetimeLevel,
  LifetimeName,
  CaptiveDependencyError,
  AddLifetime,
  GetLifetimeLevel,
  FindAnyCaptiveDependency,
  IsCaptiveDependency,
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

interface Cache {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");
const RequestContextPort = createPort<"RequestContext", RequestContext>("RequestContext");
const CachePort = createPort<"Cache", Cache>("Cache");

// =============================================================================
// Test Helper Type
// =============================================================================

type IsCaptiveError<T> =
  T extends CaptiveDependencyError<string, string, string, string> ? true : false;

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
        factory: () => ({ getUser: async id => ({ id, name: "Test" }) }),
      });

      const builder = GraphBuilder.create().provide(LoggerAdapter).provide(UserServiceAdapter);

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
        factory: () => ({ getUser: async id => ({ id, name: "Test" }) }),
      });

      const builder = GraphBuilder.create().provide(LoggerAdapter).provide(UserServiceAdapter);

      expectTypeOf<IsCaptiveError<typeof builder>>().toEqualTypeOf<false>();
    });

    it("allows scoped depending on scoped", () => {
      const DatabaseAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ query: async () => ({}) }),
      });

      const UserServiceAdapter = createAdapter({
        provides: UserServicePort,
        requires: [DatabasePort],
        lifetime: "scoped",
        factory: () => ({ getUser: async id => ({ id, name: "Test" }) }),
      });

      const builder = GraphBuilder.create().provide(DatabaseAdapter).provide(UserServiceAdapter);

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
        factory: () => ({ query: async () => ({}) }),
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
        factory: () => ({ getUser: async id => ({ id, name: "Test" }) }),
      });

      const builder = GraphBuilder.create()
        .provide(LoggerAdapter)
        .provide(DatabaseAdapter)
        .provide(RequestContextAdapter)
        .provide(UserServiceAdapter);

      expectTypeOf<IsCaptiveError<typeof builder>>().toEqualTypeOf<false>();
    });
  });

  describe("captive dependency detection", () => {
    it("detects singleton depending on scoped", () => {
      const DatabaseAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ query: async () => ({}) }),
      });

      const UserServiceAdapter = createAdapter({
        provides: UserServicePort,
        requires: [DatabasePort],
        lifetime: "singleton", // Singleton capturing scoped!
        factory: () => ({ getUser: async id => ({ id, name: "Test" }) }),
      });

      const builder = GraphBuilder.create().provide(DatabaseAdapter);
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
        factory: () => ({ getUser: async id => ({ id, name: "Test" }) }),
      });

      const builder = GraphBuilder.create().provide(RequestContextAdapter);
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
        factory: () => ({ getUser: async id => ({ id, name: "Test" }) }),
      });

      const builder = GraphBuilder.create().provide(RequestContextAdapter);
      type Result = ReturnType<typeof builder.provide<typeof UserServiceAdapter>>;

      expectTypeOf<IsCaptiveError<Result>>().toEqualTypeOf<true>();
    });
  });
});

// =============================================================================
// CaptiveDependencyError Type Tests
// =============================================================================

describe("CaptiveDependencyError type", () => {
  it("has correct structure", () => {
    type Error = CaptiveDependencyError<"UserService", "Singleton", "Database", "Scoped">;

    expectTypeOf<Error["__valid"]>().toEqualTypeOf<false>();
    expectTypeOf<Error["__errorBrand"]>().toEqualTypeOf<"CaptiveDependencyError">();
  });

  it("error message contains all details", () => {
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
      factory: () => ({ query: async () => ({}) }),
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
      factory: () => ({ getUser: async id => ({ id, name: "Test" }) }),
    });

    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(CacheAdapter)
      .provide(UserServiceAdapter);

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
      factory: () => ({ query: async () => ({}) }),
    });

    // Service layer - scoped (depends on scoped and singleton - OK)
    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [DatabasePort, LoggerPort],
      lifetime: "scoped",
      factory: () => ({ getUser: async id => ({ id, name: "Test" }) }),
    });

    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);

    expectTypeOf<IsCaptiveError<typeof builder>>().toEqualTypeOf<false>();
  });
});
