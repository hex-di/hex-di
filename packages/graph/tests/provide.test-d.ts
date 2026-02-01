/**
 * Type-level tests for GraphBuilder.provide() method.
 *
 * These tests verify:
 * 1. provide(adapter) returns NEW builder instance
 * 2. TProvides accumulates with union: TProvides | AdapterProvides
 * 3. TRequires accumulates: TRequires | AdapterRequires
 * 4. Multiple provide() calls correctly accumulate types
 * 5. Builder is immutable - original unchanged after provide()
 * 6. Adapter with never requires doesn't add to TRequires
 * 7. Chained provide() calls work fluently
 * 8. provide() accepts any valid Adapter type
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import { createAdapter, InferAdapterProvides, InferAdapterRequires } from "@hex-di/core";
import { GraphBuilder, InferGraphProvides, InferGraphRequires } from "../src/index.js";
import {
  LoggerPort,
  DatabasePort,
  UserServicePort,
  ConfigPortStrict as ConfigPort,
  CachePortSimple as CachePort,
  LoggerPortType,
  DatabasePortType,
  UserServicePortType,
  ConfigPortStrictType as ConfigPortType,
  CachePortSimpleType as CachePortType,
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
  lifetime: "singleton",
  factory: () => ({ query: () => Promise.resolve({}) }),
});

const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ get: () => "" }),
});

const CacheAdapter = createAdapter({
  provides: CachePort,
  requires: [ConfigPort],
  lifetime: "singleton",
  factory: () => ({ get: () => null, set: () => {} }),
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: "scoped",
  factory: () => ({ getUser: id => Promise.resolve({ id, name: "test" }) }),
});

// =============================================================================
// provide() Returns NEW Builder Instance Tests
// =============================================================================

describe("provide() returns NEW builder instance", () => {
  it("returns a GraphBuilder with specific port type", () => {
    const original = GraphBuilder.create();
    expect(original).toBeDefined();
    const withAdapter = original.provide(LoggerAdapter);
    expect(withAdapter).toBeDefined();

    // Result should be a GraphBuilder with the specific port type
    expectTypeOf(withAdapter).toMatchTypeOf<GraphBuilder<LoggerPortType, never>>();
  });

  it("returns a new builder, not the same type", () => {
    const original = GraphBuilder.create();
    expect(original).toBeDefined();
    const withAdapter = original.provide(LoggerAdapter);
    expect(withAdapter).toBeDefined();

    // Types should be different due to different TProvides
    type OriginalType = typeof original;
    type WithAdapterType = typeof withAdapter;

    expectTypeOf<InferGraphProvides<OriginalType>>().toBeNever();
    expectTypeOf<InferGraphProvides<WithAdapterType>>().toEqualTypeOf<LoggerPortType>();
  });

  it("preserves GraphBuilder class structure", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    expect(builder).toBeDefined();

    // Should still have provide and build methods
    expectTypeOf(builder).toHaveProperty("provide");
    expectTypeOf(builder).toHaveProperty("build");
    expectTypeOf(builder).toHaveProperty("adapters");
  });
});

// =============================================================================
// TProvides Accumulation Tests
// =============================================================================

describe("TProvides accumulates with union", () => {
  it("single adapter provides single port", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    expect(builder).toBeDefined();

    type Provides = InferGraphProvides<typeof builder>;
    expectTypeOf<Provides>().toEqualTypeOf<LoggerPortType>();
  });

  it("two adapters provide union of ports", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);
    expect(builder).toBeDefined();

    type Provides = InferGraphProvides<typeof builder>;
    expectTypeOf<Provides>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("three adapters provide union of all ports", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(ConfigAdapter);
    expect(builder).toBeDefined();

    type Provides = InferGraphProvides<typeof builder>;
    expectTypeOf<Provides>().toEqualTypeOf<LoggerPortType | DatabasePortType | ConfigPortType>();
  });

  it("accumulation works regardless of adapter order", () => {
    const builderABC = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(ConfigAdapter);

    const builderCBA = GraphBuilder.create()
      .provide(ConfigAdapter)
      .provide(DatabaseAdapter)
      .provide(LoggerAdapter);
    expect(builderABC).toBeDefined();
    expect(builderCBA).toBeDefined();

    type ProvidesABC = InferGraphProvides<typeof builderABC>;
    type ProvidesCBA = InferGraphProvides<typeof builderCBA>;

    // Both should provide the same union (order doesn't matter in unions)
    expectTypeOf<ProvidesABC>().toEqualTypeOf<ProvidesCBA>();
  });
});

// =============================================================================
// TRequires Accumulation Tests
// =============================================================================

describe("TRequires accumulates with union", () => {
  it("adapter with no requires contributes never", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    expect(builder).toBeDefined();

    type Requires = InferGraphRequires<typeof builder>;
    expectTypeOf<Requires>().toBeNever();
  });

  it("adapter with single require contributes that port", () => {
    const builder = GraphBuilder.create().provide(CacheAdapter);
    expect(builder).toBeDefined();

    type Requires = InferGraphRequires<typeof builder>;
    expectTypeOf<Requires>().toEqualTypeOf<ConfigPortType>();
  });

  it("adapter with multiple requires contributes union", () => {
    const builder = GraphBuilder.create().provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    type Requires = InferGraphRequires<typeof builder>;
    expectTypeOf<Requires>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("multiple adapters accumulate all requires", () => {
    const builder = GraphBuilder.create()
      .provide(UserServiceAdapter) // requires Logger, Database
      .provide(CacheAdapter); // requires Config
    expect(builder).toBeDefined();

    type Requires = InferGraphRequires<typeof builder>;
    expectTypeOf<Requires>().toEqualTypeOf<LoggerPortType | DatabasePortType | ConfigPortType>();
  });
});

// =============================================================================
// Multiple provide() Calls Accumulate Types Tests
// =============================================================================

describe("multiple provide() calls correctly accumulate types", () => {
  it("builds up provides progressively", () => {
    const step0 = GraphBuilder.create();
    const step1 = step0.provide(LoggerAdapter);
    const step2 = step1.provide(DatabaseAdapter);
    const step3 = step2.provide(ConfigAdapter);
    expect(step0).toBeDefined();
    expect(step1).toBeDefined();
    expect(step2).toBeDefined();
    expect(step3).toBeDefined();

    type P0 = InferGraphProvides<typeof step0>;
    type P1 = InferGraphProvides<typeof step1>;
    type P2 = InferGraphProvides<typeof step2>;
    type P3 = InferGraphProvides<typeof step3>;

    expectTypeOf<P0>().toBeNever();
    expectTypeOf<P1>().toEqualTypeOf<LoggerPortType>();
    expectTypeOf<P2>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
    expectTypeOf<P3>().toEqualTypeOf<LoggerPortType | DatabasePortType | ConfigPortType>();
  });

  it("builds up requires progressively", () => {
    const step0 = GraphBuilder.create();
    const step1 = step0.provide(LoggerAdapter); // no requires
    const step2 = step1.provide(CacheAdapter); // requires Config
    const step3 = step2.provide(UserServiceAdapter); // requires Logger, Database
    expect(step0).toBeDefined();
    expect(step1).toBeDefined();
    expect(step2).toBeDefined();
    expect(step3).toBeDefined();

    type R0 = InferGraphRequires<typeof step0>;
    type R1 = InferGraphRequires<typeof step1>;
    type R2 = InferGraphRequires<typeof step2>;
    type R3 = InferGraphRequires<typeof step3>;

    expectTypeOf<R0>().toBeNever();
    expectTypeOf<R1>().toBeNever();
    expectTypeOf<R2>().toEqualTypeOf<ConfigPortType>();
    expectTypeOf<R3>().toEqualTypeOf<ConfigPortType | LoggerPortType | DatabasePortType>();
  });

  it("handles complex multi-adapter chain", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(ConfigAdapter)
      .provide(CacheAdapter)
      .provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    type Provides = InferGraphProvides<typeof builder>;
    type Requires = InferGraphRequires<typeof builder>;

    // All ports should be provided
    expectTypeOf<Provides>().toEqualTypeOf<
      LoggerPortType | DatabasePortType | ConfigPortType | CachePortType | UserServicePortType
    >();

    // All requirements should be accumulated
    expectTypeOf<Requires>().toEqualTypeOf<ConfigPortType | LoggerPortType | DatabasePortType>();
  });
});

// =============================================================================
// Builder Immutability Tests
// =============================================================================

describe("builder is immutable - original unchanged after provide()", () => {
  it("original builder type unchanged after provide()", () => {
    const original = GraphBuilder.create();
    const withLogger = original.provide(LoggerAdapter);
    expect(original).toBeDefined();
    expect(withLogger).toBeDefined();

    // Original should still have never for both type params
    type OriginalProvides = InferGraphProvides<typeof original>;
    type OriginalRequires = InferGraphRequires<typeof original>;

    expectTypeOf<OriginalProvides>().toBeNever();
    expectTypeOf<OriginalRequires>().toBeNever();
  });

  it("intermediate builders remain unchanged", () => {
    const builder1 = GraphBuilder.create();
    const builder2 = builder1.provide(LoggerAdapter);
    const builder3 = builder2.provide(DatabaseAdapter);
    expect(builder1).toBeDefined();
    expect(builder2).toBeDefined();
    expect(builder3).toBeDefined();

    // builder1 should still be empty
    type B1Provides = InferGraphProvides<typeof builder1>;
    expectTypeOf<B1Provides>().toBeNever();

    // builder2 should only have Logger
    type B2Provides = InferGraphProvides<typeof builder2>;
    expectTypeOf<B2Provides>().toEqualTypeOf<LoggerPortType>();
  });

  it("branching from same builder creates independent chains", () => {
    const base = GraphBuilder.create().provide(LoggerAdapter);
    const branchA = base.provide(DatabaseAdapter);
    const branchB = base.provide(ConfigAdapter);
    expect(base).toBeDefined();
    expect(branchA).toBeDefined();
    expect(branchB).toBeDefined();

    type BaseProvides = InferGraphProvides<typeof base>;
    type BranchAProvides = InferGraphProvides<typeof branchA>;
    type BranchBProvides = InferGraphProvides<typeof branchB>;

    expectTypeOf<BaseProvides>().toEqualTypeOf<LoggerPortType>();
    expectTypeOf<BranchAProvides>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
    expectTypeOf<BranchBProvides>().toEqualTypeOf<LoggerPortType | ConfigPortType>();

    // Branch A and B should be different
    expectTypeOf<BranchAProvides>().not.toEqualTypeOf<BranchBProvides>();
  });
});

// =============================================================================
// Adapter with never Requires Tests
// =============================================================================

describe("adapter with never requires doesn't add to TRequires", () => {
  it("single adapter with no deps keeps TRequires as never", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    expect(builder).toBeDefined();

    type Requires = InferGraphRequires<typeof builder>;
    expectTypeOf<Requires>().toBeNever();
  });

  it("multiple adapters with no deps keeps TRequires as never", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(ConfigAdapter);
    expect(builder).toBeDefined();

    type Requires = InferGraphRequires<typeof builder>;
    expectTypeOf<Requires>().toBeNever();
  });

  it("never union with port equals just port", () => {
    // First add adapter with no deps, then adapter with deps
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter) // TRequires = never
      .provide(CacheAdapter); // TRequires = never | Config = Config
    expect(builder).toBeDefined();

    type Requires = InferGraphRequires<typeof builder>;
    expectTypeOf<Requires>().toEqualTypeOf<ConfigPortType>();
  });

  it("adapter with never requires verified via type utility", () => {
    type LoggerAdapterRequires = InferAdapterRequires<typeof LoggerAdapter>;
    expectTypeOf<LoggerAdapterRequires>().toBeNever();
  });
});

// =============================================================================
// Chained provide() Calls Work Fluently Tests
// =============================================================================

describe("chained provide() calls work fluently", () => {
  it("supports method chaining syntax", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    // Should compile and have correct types
    type Provides = InferGraphProvides<typeof builder>;
    expectTypeOf<Provides>().toEqualTypeOf<
      LoggerPortType | DatabasePortType | UserServicePortType
    >();
  });

  it("each chain step returns correct builder type", () => {
    // Type of each step should be specific
    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);
    expect(builder).toBeDefined();

    type BuilderType = typeof builder;

    // Should be GraphBuilder with correct type parameters
    expectTypeOf<InferGraphProvides<BuilderType>>().toEqualTypeOf<
      LoggerPortType | DatabasePortType
    >();
    expectTypeOf<InferGraphRequires<BuilderType>>().toBeNever();
  });

  it("long chains maintain type safety", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(ConfigAdapter)
      .provide(CacheAdapter)
      .provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    // All 5 adapters should be tracked
    type Provides = InferGraphProvides<typeof builder>;
    type Requires = InferGraphRequires<typeof builder>;

    // Verify the complete union types
    type ExpectedProvides =
      | LoggerPortType
      | DatabasePortType
      | ConfigPortType
      | CachePortType
      | UserServicePortType;

    type ExpectedRequires = ConfigPortType | LoggerPortType | DatabasePortType;

    expectTypeOf<Provides>().toEqualTypeOf<ExpectedProvides>();
    expectTypeOf<Requires>().toEqualTypeOf<ExpectedRequires>();
  });
});

// =============================================================================
// provide() Accepts Any Valid Adapter Type Tests
// =============================================================================

describe("provide() accepts any valid Adapter type", () => {
  it("accepts adapter with no dependencies", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    expect(builder).toBeDefined();

    expectTypeOf(builder).toMatchTypeOf<GraphBuilder<LoggerPortType, never>>();
  });

  it("accepts adapter with single dependency", () => {
    const builder = GraphBuilder.create().provide(CacheAdapter);
    expect(builder).toBeDefined();

    expectTypeOf(builder).toMatchTypeOf<GraphBuilder<CachePortType, ConfigPortType>>();
  });

  it("accepts adapter with multiple dependencies", () => {
    const builder = GraphBuilder.create().provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    expectTypeOf(builder).toMatchTypeOf<
      GraphBuilder<UserServicePortType, LoggerPortType | DatabasePortType>
    >();
  });

  it("accepts adapters with different lifetimes", () => {
    const singletonAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const scopedAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ query: () => Promise.resolve({}) }),
    });

    const requestAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "transient",
      factory: () => ({ get: () => "" }),
    });

    const builder = GraphBuilder.create()
      .provide(singletonAdapter)
      .provide(scopedAdapter)
      .provide(requestAdapter);
    expect(builder).toBeDefined();

    type Provides = InferGraphProvides<typeof builder>;
    expectTypeOf<Provides>().toEqualTypeOf<LoggerPortType | DatabasePortType | ConfigPortType>();
  });

  it("accepts inline adapter definitions", () => {
    const builder = GraphBuilder.create().provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      })
    );
    expect(builder).toBeDefined();

    type Provides = InferGraphProvides<typeof builder>;
    expectTypeOf<Provides>().toEqualTypeOf<LoggerPortType>();
  });

  it("infers adapter type correctly from parameter", () => {
    // TypeScript should infer A correctly for the provide method
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });
    expect(adapter).toBeDefined();

    type AdapterType = typeof adapter;
    type ExpectedProvides = InferAdapterProvides<AdapterType>;
    type ExpectedRequires = InferAdapterRequires<AdapterType>;

    expectTypeOf<ExpectedProvides>().toEqualTypeOf<LoggerPortType>();
    expectTypeOf<ExpectedRequires>().toBeNever();

    const builder = GraphBuilder.create().provide(adapter);
    expect(builder).toBeDefined();
    type BuilderProvides = InferGraphProvides<typeof builder>;
    type BuilderRequires = InferGraphRequires<typeof builder>;

    expectTypeOf<BuilderProvides>().toEqualTypeOf<ExpectedProvides>();
    expectTypeOf<BuilderRequires>().toEqualTypeOf<ExpectedRequires>();
  });
});
