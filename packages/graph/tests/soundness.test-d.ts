/**
 * Soundness Proof Tests
 *
 * These tests verify type-level invariants that must hold for the graph system
 * to be sound. Each test encodes a formal property that the type system must
 * guarantee.
 *
 * ## Invariants Tested
 *
 * 1. **Provide Grows TProvides**: After provide(), TProvides must include the new port
 * 2. **Cycle Detection Soundness**: A cycle must be detected if it exists in the graph
 * 3. **Captive Detection Soundness**: Captive dependency must be detected when lifetimes conflict
 * 4. **Build Requires Satisfaction**: build() only succeeds when all dependencies satisfied
 * 5. **Union Subtraction Correctness**: UnsatisfiedDependencies computes correctly
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf } from "vitest";
import { createPort, createAdapter } from "@hex-di/core";
import { GraphBuilder, type InferGraphProvides, type InferGraphRequires } from "../src/index.js";
import type { UnsatisfiedDependencies } from "../src/advanced.js";
import type { IsSatisfied } from "../src/advanced.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): Promise<unknown>;
}
interface Cache {
  get(key: string): unknown;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const CachePort = createPort<"Cache", Cache>("Cache");

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
  factory: _deps => ({ query: async () => ({}) }),
});

const CacheAdapter = createAdapter({
  provides: CachePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: "singleton",
  factory: _deps => ({ get: () => ({}) }),
});

// =============================================================================
// Invariant 1: Provide Grows TProvides
// =============================================================================

describe("soundness: provide grows TProvides", () => {
  it("TProvides includes new port after provide()", () => {
    const builder1 = GraphBuilder.create();
    const builder2 = builder1.provide(LoggerAdapter);

    // Extract TProvides using inference utility
    type Builder2Provides = InferGraphProvides<typeof builder2>;

    // Must include LoggerPort
    expectTypeOf<Builder2Provides>().toEqualTypeOf<typeof LoggerPort>();
  });

  it("TProvides accumulates across multiple provide() calls", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);

    type BuilderProvides = InferGraphProvides<typeof builder>;

    // Must include both ports as a union
    expectTypeOf<BuilderProvides>().toEqualTypeOf<typeof LoggerPort | typeof DatabasePort>();
  });
});

// =============================================================================
// Invariant 2: Provide Tracks Dependencies
// =============================================================================

describe("soundness: provide tracks dependencies", () => {
  it("TRequires includes adapter requirements after provide()", () => {
    const builder = GraphBuilder.create().provide(DatabaseAdapter);

    type BuilderRequires = InferGraphRequires<typeof builder>;

    // DatabaseAdapter requires LoggerPort
    expectTypeOf<BuilderRequires>().toEqualTypeOf<typeof LoggerPort>();
  });

  it("TRequires accumulates across multiple provide() calls", () => {
    const builder = GraphBuilder.create().provide(DatabaseAdapter).provide(CacheAdapter);

    type BuilderRequires = InferGraphRequires<typeof builder>;

    // Both adapters require LoggerPort, Cache also requires Database
    expectTypeOf<BuilderRequires>().toEqualTypeOf<typeof LoggerPort | typeof DatabasePort>();
  });
});

// =============================================================================
// Invariant 3: Cycle Detection Soundness
// =============================================================================

describe("soundness: cycle detection", () => {
  it("detects self-referential cycle (A -> A)", () => {
    // Create a port that requires itself
    const SelfPort = createPort<"Self", object>("Self");
    const SelfAdapter = createAdapter({
      provides: SelfPort,
      requires: [SelfPort],
      lifetime: "singleton",
      factory: _deps => ({}),
    });

    const result = GraphBuilder.create().provide(SelfAdapter);

    // Must be an error string, not a GraphBuilder
    type ResultType = typeof result;
    expectTypeOf<ResultType>().toBeString();
  });

  it("detects transitive cycle (A -> B -> A)", () => {
    const PortA = createPort<"A", object>("A");
    const PortB = createPort<"B", object>("B");

    const AdapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: _deps => ({}),
    });

    const AdapterB = createAdapter({
      provides: PortB,
      requires: [PortA],
      lifetime: "singleton",
      factory: _deps => ({}),
    });

    const result = GraphBuilder.create().provide(AdapterA).provide(AdapterB);

    type ResultType = typeof result;
    expectTypeOf<ResultType>().toBeString();
  });
});

// =============================================================================
// Invariant 4: Captive Detection Soundness
// =============================================================================

describe("soundness: captive dependency detection", () => {
  it("detects singleton depending on scoped", () => {
    const ScopedPort = createPort<"ScopedService", object>("ScopedService");
    const SingletonPort = createPort<"SingletonService", object>("SingletonService");

    const ScopedAdapter = createAdapter({
      provides: ScopedPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({}),
    });

    const SingletonAdapter = createAdapter({
      provides: SingletonPort,
      requires: [ScopedPort],
      lifetime: "singleton",
      factory: _deps => ({}),
    });

    const result = GraphBuilder.create().provide(ScopedAdapter).provide(SingletonAdapter);

    type ResultType = typeof result;
    expectTypeOf<ResultType>().toBeString();
  });

  it("allows scoped depending on singleton (valid)", () => {
    const SingletonPort2 = createPort<"SingletonService2", object>("SingletonService2");
    const ScopedPort2 = createPort<"ScopedService2", object>("ScopedService2");

    const SingletonAdapter2 = createAdapter({
      provides: SingletonPort2,
      requires: [],
      lifetime: "singleton",
      factory: () => ({}),
    });

    const ScopedAdapter2 = createAdapter({
      provides: ScopedPort2,
      requires: [SingletonPort2],
      lifetime: "scoped",
      factory: _deps => ({}),
    });

    const result = GraphBuilder.create().provide(SingletonAdapter2).provide(ScopedAdapter2);

    // Should be a GraphBuilder, not an error string
    type ResultType = typeof result;
    expectTypeOf<ResultType>().not.toBeString();
  });
});

// =============================================================================
// Invariant 5: Build Requires Satisfaction
// =============================================================================

describe("soundness: build requires satisfaction", () => {
  it("build() returns Graph when all deps satisfied", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();

    type ResultType = typeof graph;
    // Graph is not a string (error) and has adapters
    expectTypeOf<ResultType>().not.toBeString();
    // It should have the adapters property that Graph has
    type HasAdapters = ResultType extends { adapters: unknown } ? true : false;
    expectTypeOf<HasAdapters>().toEqualTypeOf<true>();
  });

  it("build() returns error when deps missing", () => {
    // DatabaseAdapter requires LoggerPort which is not provided
    const result = GraphBuilder.create().provide(DatabaseAdapter).build();

    type ResultType = typeof result;
    // Error type is a template literal string starting with "ERROR: Missing adapters"
    type IsMissingDepError = ResultType extends `ERROR[HEX008]: Missing adapters for ${string}`
      ? true
      : false;
    expectTypeOf<IsMissingDepError>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Invariant 6: Merge Port Accumulation
// =============================================================================

describe("soundness: merge accumulates ports", () => {
  it("merge() includes ports from both graphs", () => {
    const graph1 = GraphBuilder.create().provide(LoggerAdapter);
    const graph2 = GraphBuilder.create().provide(DatabaseAdapter);

    const merged = graph1.merge(graph2);

    type MergedProvides = InferGraphProvides<typeof merged>;

    // Must include both Logger and Database
    expectTypeOf<MergedProvides>().toEqualTypeOf<typeof LoggerPort | typeof DatabasePort>();
  });
});

// =============================================================================
// Invariant 7: Union Subtraction Correctness
// =============================================================================

describe("soundness: UnsatisfiedDependencies", () => {
  it("returns remaining port when partially satisfied", () => {
    // Provide Logger, require Logger | Database
    // Result should be Database (the unsatisfied one)
    type Result = UnsatisfiedDependencies<
      typeof LoggerPort,
      typeof LoggerPort | typeof DatabasePort
    >;
    expectTypeOf<Result>().toEqualTypeOf<typeof DatabasePort>();
  });

  it("returns all when none satisfied", () => {
    type Result = UnsatisfiedDependencies<never, typeof LoggerPort | typeof DatabasePort>;
    // Nothing provided, so both should be unsatisfied
    expectTypeOf<Result>().toEqualTypeOf<typeof LoggerPort | typeof DatabasePort>();
  });

  it("returns never when exact match", () => {
    type Result = UnsatisfiedDependencies<
      typeof LoggerPort | typeof DatabasePort,
      typeof LoggerPort | typeof DatabasePort
    >;
    expectTypeOf<Result>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// Invariant 8: IsSatisfied Predicate
// =============================================================================

describe("soundness: IsSatisfied predicate", () => {
  it("returns true when all requirements provided", () => {
    type Result = IsSatisfied<typeof LoggerPort | typeof DatabasePort, typeof LoggerPort>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("returns false when requirements missing", () => {
    type Result = IsSatisfied<typeof LoggerPort, typeof LoggerPort | typeof DatabasePort>;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("returns true when no requirements", () => {
    type Result = IsSatisfied<typeof LoggerPort, never>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Invariant 9: Error Message Format Consistency
// =============================================================================

describe("soundness: error message format", () => {
  it("self-dependency error starts with ERROR[HEX006]:", () => {
    // Self-dependency is now caught with HEX006 error (more specific than cycle error)
    // Using provideFirstError() to get single short-circuited error
    const SelfPort = createPort<"SelfRef", object>("SelfRef");
    const SelfAdapter = createAdapter({
      provides: SelfPort,
      requires: [SelfPort],
      lifetime: "singleton",
      factory: _deps => ({}),
    });

    const result = GraphBuilder.create().provideFirstError(SelfAdapter);

    type ResultType = typeof result;
    // Check that it extends a string starting with "ERROR[HEX006]: Self-dependency"
    type StartsWithError = ResultType extends `ERROR[HEX006]: Self-dependency detected. ${string}`
      ? true
      : false;
    expectTypeOf<StartsWithError>().toEqualTypeOf<true>();
  });

  it("captive dependency error starts with ERROR[HEX003]:", () => {
    const ScopedPort = createPort<"CaptiveScoped", object>("CaptiveScoped");
    const SingletonPort = createPort<"CaptiveSingleton", object>("CaptiveSingleton");

    const ScopedAdapter = createAdapter({
      provides: ScopedPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({}),
    });

    const SingletonAdapter = createAdapter({
      provides: SingletonPort,
      requires: [ScopedPort],
      lifetime: "singleton",
      factory: _deps => ({}),
    });

    const result = GraphBuilder.create().provide(ScopedAdapter).provide(SingletonAdapter);

    type ResultType = typeof result;
    type StartsWithError = ResultType extends `ERROR[HEX003]: Captive dependency: ${string}`
      ? true
      : false;
    expectTypeOf<StartsWithError>().toEqualTypeOf<true>();
  });
});
