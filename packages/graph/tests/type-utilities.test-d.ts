/**
 * Type-level tests for Type Inference Utilities.
 *
 * These tests verify:
 * 1. InferAdapterProvides<A> extracts provided port
 * 2. InferAdapterRequires<A> extracts required ports union
 * 3. InferAdapterLifetime<A> extracts lifetime literal
 * 4. InferGraphProvides<G> extracts all provided ports from builder
 * 5. InferGraphRequires<G> extracts all required ports from builder
 * 6. Utilities return never for invalid input types
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import {
  Adapter,
  InferAdapterProvides,
  InferAdapterRequires,
  InferAdapterLifetime,
  createAdapter,
  Lifetime,
} from "@hex-di/core";
import { GraphBuilder, InferGraphProvides, InferGraphRequires } from "../src/index.js";
import {
  LoggerPort,
  DatabasePort,
  UserServicePort,
  ConfigPortStrict as ConfigPort,
  LoggerPortType,
  DatabasePortType,
  UserServicePortType,
  ConfigPortStrictType as ConfigPortType,
} from "./fixtures.js";

// =============================================================================
// Test Adapters
// =============================================================================

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

const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  requires: [],
  lifetime: "transient",
  factory: () => ({ get: () => "" }),
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: "scoped",
  factory: () => ({ getUser: id => Promise.resolve({ id, name: "test" }) }),
});

// =============================================================================
// InferAdapterProvides Tests
// =============================================================================

describe("InferAdapterProvides<T> utility type", () => {
  it("extracts provided port from adapter with no dependencies", () => {
    expect(LoggerAdapter).toBeDefined();
    type Result = InferAdapterProvides<typeof LoggerAdapter>;

    expectTypeOf<Result>().toEqualTypeOf<LoggerPortType>();
  });

  it("extracts provided port from adapter with dependencies", () => {
    expect(UserServiceAdapter).toBeDefined();
    type Result = InferAdapterProvides<typeof UserServiceAdapter>;

    expectTypeOf<Result>().toEqualTypeOf<UserServicePortType>();
  });

  it("extracts provided port from manually typed Adapter", () => {
    type ManualAdapter = Adapter<LoggerPortType, DatabasePortType, "singleton">;
    type Result = InferAdapterProvides<ManualAdapter>;

    expectTypeOf<Result>().toEqualTypeOf<LoggerPortType>();
  });

  it("returns never for non-Adapter types", () => {
    type FromString = InferAdapterProvides<string>;
    type FromNumber = InferAdapterProvides<number>;
    type FromBoolean = InferAdapterProvides<boolean>;
    type FromObject = InferAdapterProvides<{ foo: string }>;
    type FromArray = InferAdapterProvides<string[]>;
    type FromFunction = InferAdapterProvides<() => void>;
    type FromNull = InferAdapterProvides<null>;
    type FromUndefined = InferAdapterProvides<undefined>;

    expectTypeOf<FromString>().toBeNever();
    expectTypeOf<FromNumber>().toBeNever();
    expectTypeOf<FromBoolean>().toBeNever();
    expectTypeOf<FromObject>().toBeNever();
    expectTypeOf<FromArray>().toBeNever();
    expectTypeOf<FromFunction>().toBeNever();
    expectTypeOf<FromNull>().toBeNever();
    expectTypeOf<FromUndefined>().toBeNever();
  });

  it("returns never for never type", () => {
    type FromNever = InferAdapterProvides<never>;

    expectTypeOf<FromNever>().toBeNever();
  });

  it("returns never for unknown type", () => {
    type FromUnknown = InferAdapterProvides<unknown>;

    expectTypeOf<FromUnknown>().toBeNever();
  });
});

// =============================================================================
// InferAdapterRequires Tests
// =============================================================================

describe("InferAdapterRequires<T> utility type", () => {
  it("extracts required ports union from adapter with dependencies", () => {
    expect(UserServiceAdapter).toBeDefined();
    type Result = InferAdapterRequires<typeof UserServiceAdapter>;

    expectTypeOf<Result>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("extracts never from adapter with no dependencies", () => {
    expect(LoggerAdapter).toBeDefined();
    type Result = InferAdapterRequires<typeof LoggerAdapter>;

    expectTypeOf<Result>().toBeNever();
  });

  it("extracts required port from manually typed Adapter", () => {
    type ManualAdapter = Adapter<UserServicePortType, LoggerPortType | DatabasePortType, "scoped">;
    type Result = InferAdapterRequires<ManualAdapter>;

    expectTypeOf<Result>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("handles adapter with single dependency", () => {
    const SingleDepAdapter = createAdapter({
      provides: ConfigPort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: () => ({ get: () => "" }),
    });
    expect(SingleDepAdapter).toBeDefined();

    type Result = InferAdapterRequires<typeof SingleDepAdapter>;
    expectTypeOf<Result>().toEqualTypeOf<LoggerPortType>();
  });

  it("returns never for non-Adapter types", () => {
    type FromString = InferAdapterRequires<string>;
    type FromNumber = InferAdapterRequires<number>;
    type FromBoolean = InferAdapterRequires<boolean>;
    type FromObject = InferAdapterRequires<{ foo: string }>;
    type FromArray = InferAdapterRequires<string[]>;
    type FromFunction = InferAdapterRequires<() => void>;

    expectTypeOf<FromString>().toBeNever();
    expectTypeOf<FromNumber>().toBeNever();
    expectTypeOf<FromBoolean>().toBeNever();
    expectTypeOf<FromObject>().toBeNever();
    expectTypeOf<FromArray>().toBeNever();
    expectTypeOf<FromFunction>().toBeNever();
  });

  it("returns never for never type", () => {
    type FromNever = InferAdapterRequires<never>;

    expectTypeOf<FromNever>().toBeNever();
  });
});

// =============================================================================
// InferAdapterLifetime Tests
// =============================================================================

describe("InferAdapterLifetime<T> utility type", () => {
  it("extracts singleton lifetime", () => {
    expect(LoggerAdapter).toBeDefined();
    type Result = InferAdapterLifetime<typeof LoggerAdapter>;

    expectTypeOf<Result>().toEqualTypeOf<"singleton">();
  });

  it("extracts scoped lifetime", () => {
    expect(DatabaseAdapter).toBeDefined();
    type Result = InferAdapterLifetime<typeof DatabaseAdapter>;

    expectTypeOf<Result>().toEqualTypeOf<"scoped">();
  });

  it("extracts transient lifetime", () => {
    expect(ConfigAdapter).toBeDefined();
    type Result = InferAdapterLifetime<typeof ConfigAdapter>;

    expectTypeOf<Result>().toEqualTypeOf<"transient">();
  });

  it("extracts lifetime from manually typed Adapter", () => {
    type SingletonAdapter = Adapter<LoggerPortType, never, "singleton">;
    type ScopedAdapter = Adapter<LoggerPortType, never, "scoped">;
    type TransientAdapter = Adapter<LoggerPortType, never, "transient">;

    expectTypeOf<InferAdapterLifetime<SingletonAdapter>>().toEqualTypeOf<"singleton">();
    expectTypeOf<InferAdapterLifetime<ScopedAdapter>>().toEqualTypeOf<"scoped">();
    expectTypeOf<InferAdapterLifetime<TransientAdapter>>().toEqualTypeOf<"transient">();
  });

  it("returns never for non-Adapter types", () => {
    type FromString = InferAdapterLifetime<string>;
    type FromNumber = InferAdapterLifetime<number>;
    type FromBoolean = InferAdapterLifetime<boolean>;
    type FromObject = InferAdapterLifetime<{ foo: string }>;
    type FromLifetime = InferAdapterLifetime<Lifetime>;

    expectTypeOf<FromString>().toBeNever();
    expectTypeOf<FromNumber>().toBeNever();
    expectTypeOf<FromBoolean>().toBeNever();
    expectTypeOf<FromObject>().toBeNever();
    expectTypeOf<FromLifetime>().toBeNever();
  });

  it("returns never for never type", () => {
    type FromNever = InferAdapterLifetime<never>;

    expectTypeOf<FromNever>().toBeNever();
  });
});

// =============================================================================
// InferGraphProvides Tests
// =============================================================================

describe("InferGraphProvides<T> utility type", () => {
  it("extracts provided ports from builder with single adapter", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    expect(builder).toBeDefined();
    type Result = InferGraphProvides<typeof builder>;

    expectTypeOf<Result>().toEqualTypeOf<LoggerPortType>();
  });

  it("extracts provided ports union from builder with multiple adapters", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(ConfigAdapter);
    expect(builder).toBeDefined();
    type Result = InferGraphProvides<typeof builder>;

    expectTypeOf<Result>().toEqualTypeOf<LoggerPortType | DatabasePortType | ConfigPortType>();
  });

  it("extracts never from empty builder", () => {
    const builder = GraphBuilder.create();
    expect(builder).toBeDefined();
    type Result = InferGraphProvides<typeof builder>;

    expectTypeOf<Result>().toBeNever();
  });

  it("extracts from manually typed GraphBuilder", () => {
    type ManualBuilder = GraphBuilder<LoggerPortType | DatabasePortType, ConfigPortType>;
    type Result = InferGraphProvides<ManualBuilder>;

    expectTypeOf<Result>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("returns never for non-GraphBuilder types", () => {
    type FromString = InferGraphProvides<string>;
    type FromNumber = InferGraphProvides<number>;
    type FromBoolean = InferGraphProvides<boolean>;
    type FromObject = InferGraphProvides<{ provides: LoggerPortType }>;
    type FromAdapter = InferGraphProvides<typeof LoggerAdapter>;

    expectTypeOf<FromString>().toBeNever();
    expectTypeOf<FromNumber>().toBeNever();
    expectTypeOf<FromBoolean>().toBeNever();
    expectTypeOf<FromObject>().toBeNever();
    expectTypeOf<FromAdapter>().toBeNever();
  });

  it("returns never for never type", () => {
    type FromNever = InferGraphProvides<never>;

    expectTypeOf<FromNever>().toBeNever();
  });
});

// =============================================================================
// InferGraphRequires Tests
// =============================================================================

describe("InferGraphRequires<T> utility type", () => {
  it("extracts required ports from builder with adapter that has dependencies", () => {
    const builder = GraphBuilder.create().provide(UserServiceAdapter);
    expect(builder).toBeDefined();
    type Result = InferGraphRequires<typeof builder>;

    expectTypeOf<Result>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("extracts accumulated required ports from multiple adapters", () => {
    const SingleDepAdapter = createAdapter({
      provides: ConfigPort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: () => ({ get: () => "" }),
    });
    expect(SingleDepAdapter).toBeDefined();

    const builder = GraphBuilder.create()
      .provide(UserServiceAdapter) // requires Logger, Database
      .provide(SingleDepAdapter); // requires Logger
    expect(builder).toBeDefined();
    type Result = InferGraphRequires<typeof builder>;

    // Union of all requires: Logger | Database | Logger = Logger | Database
    expectTypeOf<Result>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("extracts never from builder with only no-dependency adapters", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);
    expect(builder).toBeDefined();
    type Result = InferGraphRequires<typeof builder>;

    expectTypeOf<Result>().toBeNever();
  });

  it("extracts never from empty builder", () => {
    const builder = GraphBuilder.create();
    expect(builder).toBeDefined();
    type Result = InferGraphRequires<typeof builder>;

    expectTypeOf<Result>().toBeNever();
  });

  it("extracts from manually typed GraphBuilder", () => {
    type ManualBuilder = GraphBuilder<LoggerPortType, DatabasePortType | ConfigPortType>;
    type Result = InferGraphRequires<ManualBuilder>;

    expectTypeOf<Result>().toEqualTypeOf<DatabasePortType | ConfigPortType>();
  });

  it("returns never for non-GraphBuilder types", () => {
    type FromString = InferGraphRequires<string>;
    type FromNumber = InferGraphRequires<number>;
    type FromBoolean = InferGraphRequires<boolean>;
    type FromObject = InferGraphRequires<{ requires: LoggerPortType }>;
    type FromAdapter = InferGraphRequires<typeof LoggerAdapter>;

    expectTypeOf<FromString>().toBeNever();
    expectTypeOf<FromNumber>().toBeNever();
    expectTypeOf<FromBoolean>().toBeNever();
    expectTypeOf<FromObject>().toBeNever();
    expectTypeOf<FromAdapter>().toBeNever();
  });

  it("returns never for never type", () => {
    type FromNever = InferGraphRequires<never>;

    expectTypeOf<FromNever>().toBeNever();
  });
});

// =============================================================================
// Combined Utility Tests
// =============================================================================

describe("utility type composition", () => {
  it("utilities work together to extract adapter information", () => {
    const adapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "scoped",
      factory: () => ({ getUser: id => Promise.resolve({ id, name: "test" }) }),
    });
    expect(adapter).toBeDefined();

    type Provides = InferAdapterProvides<typeof adapter>;
    type Requires = InferAdapterRequires<typeof adapter>;
    type LifetimeType = InferAdapterLifetime<typeof adapter>;

    expectTypeOf<Provides>().toEqualTypeOf<UserServicePortType>();
    expectTypeOf<Requires>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
    expectTypeOf<LifetimeType>().toEqualTypeOf<"scoped">();
  });

  it("utilities work together to extract builder information", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    type Provides = InferGraphProvides<typeof builder>;
    type Requires = InferGraphRequires<typeof builder>;

    expectTypeOf<Provides>().toEqualTypeOf<
      LoggerPortType | DatabasePortType | UserServicePortType
    >();
    expectTypeOf<Requires>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("adapter utilities match graph builder accumulation", () => {
    // When we provide an adapter to a builder, the builder's provides
    // should match what InferAdapterProvides extracts from the adapter

    type AdapterProvides = InferAdapterProvides<typeof UserServiceAdapter>;
    type AdapterRequires = InferAdapterRequires<typeof UserServiceAdapter>;

    const builder = GraphBuilder.create().provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    type BuilderProvides = InferGraphProvides<typeof builder>;
    type BuilderRequires = InferGraphRequires<typeof builder>;

    // For a single adapter, they should match
    expectTypeOf<AdapterProvides>().toEqualTypeOf<BuilderProvides>();
    expectTypeOf<AdapterRequires>().toEqualTypeOf<BuilderRequires>();
  });

  it("no any leakage in utility types", () => {
    // Verify that utility types don't produce `any` for valid inputs
    type Provides = InferAdapterProvides<typeof LoggerAdapter>;
    type Requires = InferAdapterRequires<typeof UserServiceAdapter>;
    type LifetimeType = InferAdapterLifetime<typeof LoggerAdapter>;
    type GraphProv = InferGraphProvides<GraphBuilder<LoggerPortType, never>>;
    type GraphReq = InferGraphRequires<GraphBuilder<never, DatabasePortType>>;

    // None of these should be `any`
    expectTypeOf<Provides>().not.toBeAny();
    expectTypeOf<Requires>().not.toBeAny();
    expectTypeOf<LifetimeType>().not.toBeAny();
    expectTypeOf<GraphProv>().not.toBeAny();
    expectTypeOf<GraphReq>().not.toBeAny();
  });
});
