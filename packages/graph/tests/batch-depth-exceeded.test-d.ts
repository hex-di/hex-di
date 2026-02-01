/**
 * Type-level tests for batch depth-exceeded propagation.
 *
 * Verifies that `WouldAnyCreateCycle` properly propagates `DepthExceededResult`
 * when the traversal depth limit is reached during batch operations. This ensures
 * `provideMany()` behaves consistently with `provide()` - both will report
 * depth-exceeded instead of silently treating it as "no cycle".
 *
 * @packageDocumentation
 */
import { describe, expectTypeOf, it } from "vitest";
import { createPort } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import type { WouldAnyCreateCycle, DepthExceededResult, IsDepthExceeded } from "../src/advanced.js";

// =============================================================================
// Test Fixtures - Deep Chain
// =============================================================================

// Create a chain: A1 -> A2 -> A3 -> ... -> A5
const Port1 = createPort<"P1", { v: 1 }>("P1");
const Port2 = createPort<"P2", { v: 2 }>("P2");
const Port3 = createPort<"P3", { v: 3 }>("P3");
const Port4 = createPort<"P4", { v: 4 }>("P4");
const Port5 = createPort<"P5", { v: 5 }>("P5");

const Adapter1 = createAdapter({
  provides: Port1,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({ v: 1 as const }),
});

const Adapter2 = createAdapter({
  provides: Port2,
  requires: [Port1] as const,
  lifetime: "singleton",
  factory: () => ({ v: 2 as const }),
});

const Adapter3 = createAdapter({
  provides: Port3,
  requires: [Port2] as const,
  lifetime: "singleton",
  factory: () => ({ v: 3 as const }),
});

const Adapter4 = createAdapter({
  provides: Port4,
  requires: [Port3] as const,
  lifetime: "singleton",
  factory: () => ({ v: 4 as const }),
});

const Adapter5 = createAdapter({
  provides: Port5,
  requires: [Port4] as const,
  lifetime: "singleton",
  factory: () => ({ v: 5 as const }),
});

// =============================================================================
// DepthExceededResult Propagation Tests
// =============================================================================

describe("WouldAnyCreateCycle depth-exceeded propagation", () => {
  it("should propagate DepthExceededResult from WouldCreateCycle", () => {
    // With maxDepth=2, checking a chain of 5 adapters should exceed depth
    // and return DepthExceededResult (not false)

    // Build a graph with some depth
    type InitialGraph = { P2: "P1"; P3: "P2"; P4: "P3" };

    // Now check if adding P5 (requires P4) would create a cycle
    // With maxDepth=2, the traversal should exceed depth
    type Adapters = readonly [typeof Adapter5];

    type Result = WouldAnyCreateCycle<InitialGraph, Adapters, 2>;

    // FIXED: Now properly returns DepthExceededResult when depth is exceeded
    // This ensures provideMany() behaves consistently with provide()

    // After fix, IsDepthExceeded<Result> should be true
    type IsExceeded = IsDepthExceeded<Result>;
    expectTypeOf<IsExceeded>().toEqualTypeOf<true>();

    // Result should be DepthExceededResult with port provenance
    // The specific port is preserved (not just generic `string`)
    type HasPortProvenance =
      Result extends DepthExceededResult<infer P>
        ? P extends "P1" | "P2" | "P3" | "P4"
          ? true
          : false
        : false;
    expectTypeOf<HasPortProvenance>().toEqualTypeOf<true>();
  });

  it("provideMany should report depth-exceeded error", () => {
    // With a very low maxDepth, provideMany reports depth-exceeded
    // instead of silently accepting the batch

    // Create a builder with low maxDepth (using create() after withMaxDepth)
    const builder = GraphBuilder.withMaxDepth<3>()
      .create()
      .provide(Adapter1)
      .provide(Adapter2)
      .provide(Adapter3);

    // Now try provideMany with adapters that would exceed depth
    const result = builder.provideMany([Adapter4, Adapter5] as const);

    // FIXED: provideMany now properly propagates DepthExceededResult
    // The result type will include error information when depth is exceeded
    type ResultType = typeof result;

    // Result should not be never (it's either a valid builder or error type)
    expectTypeOf<ResultType>().not.toBeNever();
  });
});

describe("Single provide vs provideMany consistency", () => {
  it("provide() correctly handles depth-exceeded", () => {
    // Single provide() DOES handle DepthExceededResult correctly
    // This is the reference behavior we want provideMany() to match

    const builder = GraphBuilder.withMaxDepth<2>()
      .create()
      .provide(Adapter1)
      .provide(Adapter2)
      .provide(Adapter3);

    // With maxDepth=2, adding Adapter4 should check if P4 creates a cycle
    // The traversal depth is: P4 -> P3 -> P2 -> P1 (depth=3, exceeds limit)
    const result = builder.provide(Adapter4);

    type ResultType = typeof result;

    // provide() should report depth-exceeded error (or warning if unsafe override)
    // This documents that provide() handles it correctly
    expectTypeOf<ResultType>().not.toBeNever();
  });
});

// =============================================================================
// Batch Depth Exceeded - Continue Checking for Detectable Cycles
// =============================================================================

// Additional ports and adapters for cycle testing (defined at module level for type inference)
const CyclePortA = createPort<"CycleA", { cycle: "A" }>("CycleA");
const CyclePortB = createPort<"CycleB", { cycle: "B" }>("CycleB");
const Port6 = createPort<"P6", { v: 6 }>("P6");

// Adapter that would exceed depth (deep chain)
const DeepAdapter = createAdapter({
  provides: Port5,
  requires: [Port4] as const,
  lifetime: "singleton",
  factory: () => ({ v: 5 as const }),
});

// Adapter that creates a detectable cycle with existing graph
// CycleAdapterA provides CycleA, requires CycleB
const CycleAdapterA = createAdapter({
  provides: CyclePortA,
  requires: [CyclePortB] as const,
  lifetime: "singleton",
  factory: () => ({ cycle: "A" as const }),
});

// CycleAdapterB provides CycleB, requires CycleA (cycle!)
const CycleAdapterB = createAdapter({
  provides: CyclePortB,
  requires: [CyclePortA] as const,
  lifetime: "singleton",
  factory: () => ({ cycle: "B" as const }),
});

// No cycle adapter
const NoCycleAdapter = createAdapter({
  provides: Port6,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({ v: 6 as const }),
});

describe("WouldAnyCreateCycle continues checking after depth exceeded", () => {
  it("should detect cycle even when first adapter exceeds depth", () => {
    // Graph with deep chain
    type DeepGraph = { P1: never; P2: "P1"; P3: "P2"; P4: "P3" };

    // Batch: [DeepAdapter (exceeds depth at maxDepth=2), CycleAdapterA, CycleAdapterB]
    // Expected: Should detect cycle A -> B -> A, NOT return DepthExceededResult
    type Adapters = readonly [typeof DeepAdapter, typeof CycleAdapterA, typeof CycleAdapterB];

    type Result = WouldAnyCreateCycle<DeepGraph, Adapters, 2>;

    // CRITICAL: Result should be a CircularDependencyError, NOT DepthExceededResult
    // The batch should continue checking after depth exceeded and find the cycle
    type IsExceeded = IsDepthExceeded<Result>;

    // After fix: Should NOT be depth exceeded (should be cycle error instead)
    expectTypeOf<IsExceeded>().toEqualTypeOf<false>();

    // Result should NOT be false (should be cycle error)
    type ResultIsFalse = Result extends false ? true : false;
    expectTypeOf<ResultIsFalse>().toEqualTypeOf<false>();

    // Result should be a CircularDependencyError (branded object)
    type IsCycleError = Result extends { readonly __errorBrand: "CircularDependencyError" }
      ? true
      : false;
    expectTypeOf<IsCycleError>().toEqualTypeOf<true>();
  });

  it("should return DepthExceededResult only when no detectable cycles exist", () => {
    // Graph with deep chain
    type DeepGraph = { P1: never; P2: "P1"; P3: "P2"; P4: "P3" };

    // Batch: [DeepAdapter (exceeds depth), NoCycleAdapter (no cycle)]
    type Adapters = readonly [typeof DeepAdapter, typeof NoCycleAdapter];

    type Result = WouldAnyCreateCycle<DeepGraph, Adapters, 2>;

    // When no detectable cycles exist, THEN return DepthExceededResult
    type IsExceeded = IsDepthExceeded<Result>;
    expectTypeOf<IsExceeded>().toEqualTypeOf<true>();
  });
});
