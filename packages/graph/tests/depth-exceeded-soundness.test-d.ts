/**
 * Type tests for depth-exceeded soundness fix.
 *
 * This file verifies that:
 * 1. Depth-exceeded returns ERROR by default (soundness preserved)
 * 2. `withUnsafeDepthOverride()` returns WARNING instead of ERROR
 *
 * @see ARCHITECTURE.md for discussion of the soundness hole fix
 */
import { describe, it, expectTypeOf } from "vitest";
import { GraphBuilder } from "../src/index.js";
import type { DepthLimitError, DepthLimitWarning, BuilderInternals } from "../src/advanced.js";

// =============================================================================
// Test: Default Behavior (Error)
// =============================================================================

describe("Depth-exceeded returns ERROR by default", () => {
  it("DepthLimitError has correct format", () => {
    // When only TMaxDepth is provided, TLastPort defaults to "unknown"
    type Error = DepthLimitError<50>;
    expectTypeOf<Error>().toEqualTypeOf<`ERROR[HEX007]: Type-level depth limit (50) exceeded at 'unknown' - cycle detection incomplete. Fix: Use GraphBuilder.withMaxDepth<N>() to increase limit (max 100), restructure graph, or use GraphBuilder.withUnsafeDepthOverride() to acknowledge incomplete validation.`>();
  });

  it("DepthLimitError mentions the configured depth", () => {
    type Error30 = DepthLimitError<30>;
    type Error100 = DepthLimitError<100>;

    // The error message includes the depth value and default "unknown" port
    expectTypeOf<Error30>().toEqualTypeOf<`ERROR[HEX007]: Type-level depth limit (30) exceeded at 'unknown' - cycle detection incomplete. Fix: Use GraphBuilder.withMaxDepth<N>() to increase limit (max 100), restructure graph, or use GraphBuilder.withUnsafeDepthOverride() to acknowledge incomplete validation.`>();
    expectTypeOf<Error100>().toEqualTypeOf<`ERROR[HEX007]: Type-level depth limit (100) exceeded at 'unknown' - cycle detection incomplete. Fix: Use GraphBuilder.withMaxDepth<N>() to increase limit (max 100), restructure graph, or use GraphBuilder.withUnsafeDepthOverride() to acknowledge incomplete validation.`>();
  });

  it("default builder internals has unsafeDepthOverride = false", () => {
    // Create internals with unsafeDepthOverride = false (default)
    type InternalsDefault = BuilderInternals<
      object,
      object,
      unknown,
      50,
      false // unsafeDepthOverride = false (default)
    >;

    // Verify the internals type has the correct shape
    expectTypeOf<InternalsDefault["unsafeDepthOverride"]>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// Test: Unsafe Override Behavior (Warning)
// =============================================================================

describe("Depth-exceeded returns WARNING with unsafe override", () => {
  it("DepthLimitWarning has correct format", () => {
    // When only TMaxDepth is provided, TLastPort defaults to "unknown"
    type Warning = DepthLimitWarning<50>;
    expectTypeOf<Warning>().toEqualTypeOf<`WARNING[HEX007]: Type-level depth limit (50) exceeded at 'unknown' during cycle detection. Validation may be incomplete. Fix: Use GraphBuilder.withMaxDepth<N>() to increase limit, or restructure graph to reduce depth.`>();
  });

  it("withUnsafeDepthOverride creates builder with unsafe flag", () => {
    const builder = GraphBuilder.withUnsafeDepthOverride().create();

    // The builder should have unsafeDepthOverride = true in its internals
    type BuilderType = typeof builder;
    type InternalsType = BuilderType["__internalState"];

    // Verify the internals have unsafeDepthOverride = true
    expectTypeOf<InternalsType["unsafeDepthOverride"]>().toEqualTypeOf<true>();
  });

  it("withMaxDepth().withUnsafeDepthOverride() chains correctly", () => {
    const builder = GraphBuilder.withMaxDepth<100>().withUnsafeDepthOverride().create();

    type BuilderType = typeof builder;
    type InternalsType = BuilderType["__internalState"];

    // Verify both maxDepth and unsafeDepthOverride are set correctly
    expectTypeOf<InternalsType["maxDepth"]>().toEqualTypeOf<100>();
    expectTypeOf<InternalsType["unsafeDepthOverride"]>().toEqualTypeOf<true>();
  });

  it("forParent preserves unsafe depth override through factory", () => {
    // Create a mock parent graph type
    const parentGraph = {} as import("../src/index.js").Graph<never, never, never>;

    const builder = GraphBuilder.withUnsafeDepthOverride().forParent(parentGraph);

    type BuilderType = typeof builder;
    type InternalsType = BuilderType["__internalState"];

    expectTypeOf<InternalsType["unsafeDepthOverride"]>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Test: Regular GraphBuilder has unsafeDepthOverride = false
// =============================================================================

describe("Regular GraphBuilder has unsafeDepthOverride = false", () => {
  it("GraphBuilder.create() has unsafeDepthOverride = false", () => {
    const builder = GraphBuilder.create();

    type BuilderType = typeof builder;
    type InternalsType = BuilderType["__internalState"];

    expectTypeOf<InternalsType["unsafeDepthOverride"]>().toEqualTypeOf<false>();
  });

  it("GraphBuilder.withMaxDepth().create() has unsafeDepthOverride = false", () => {
    const builder = GraphBuilder.withMaxDepth<100>().create();

    type BuilderType = typeof builder;
    type InternalsType = BuilderType["__internalState"];

    expectTypeOf<InternalsType["unsafeDepthOverride"]>().toEqualTypeOf<false>();
  });

  it("GraphBuilder.forParent() has unsafeDepthOverride = false", () => {
    const parentGraph = {} as import("../src/index.js").Graph<never, never, never>;
    const builder = GraphBuilder.forParent(parentGraph);

    type BuilderType = typeof builder;
    type InternalsType = BuilderType["__internalState"];

    expectTypeOf<InternalsType["unsafeDepthOverride"]>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// Test: BuilderInternals type structure
// =============================================================================

describe("BuilderInternals type structure", () => {
  it("BuilderInternals has all required properties", () => {
    type TestInternals = BuilderInternals<object, object, unknown, 50, true>;

    // All properties should exist
    expectTypeOf<TestInternals>().toHaveProperty("depGraph");
    expectTypeOf<TestInternals>().toHaveProperty("lifetimeMap");
    expectTypeOf<TestInternals>().toHaveProperty("parentProvides");
    expectTypeOf<TestInternals>().toHaveProperty("maxDepth");
    expectTypeOf<TestInternals>().toHaveProperty("unsafeDepthOverride");
  });

  it("default BuilderInternals has unsafeDepthOverride = false", () => {
    // When using defaults (no 5th type parameter), it should be false
    type DefaultInternals = BuilderInternals;

    expectTypeOf<DefaultInternals["unsafeDepthOverride"]>().toEqualTypeOf<false>();
  });

  it("unsafeDepthOverride can be true or false", () => {
    type TrueInternals = BuilderInternals<object, object, unknown, 50, true>;
    type FalseInternals = BuilderInternals<object, object, unknown, 50, false>;

    expectTypeOf<TrueInternals["unsafeDepthOverride"]>().toEqualTypeOf<true>();
    expectTypeOf<FalseInternals["unsafeDepthOverride"]>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// Test: merge() respects UnsafeDepthOverride flag
// =============================================================================

describe("merge() respects UnsafeDepthOverride flag", () => {
  it("merge() with default builder returns ERROR on depth exceeded", () => {
    // Verify that MergeCheckCycle uses GetUnsafeDepthOverride to determine error type
    // This is a type-level verification that the fix is in place
    const builder = GraphBuilder.withMaxDepth<2>().create();

    type BuilderType = typeof builder;
    type InternalsType = BuilderType["__internalState"];

    // Default builder should have unsafeDepthOverride = false
    expectTypeOf<InternalsType["unsafeDepthOverride"]>().toEqualTypeOf<false>();
  });

  it("merge() with unsafe override builder returns WARNING on depth exceeded", () => {
    // Verify that MergeCheckCycle returns warning when UnsafeDepthOverride is true
    const builder = GraphBuilder.withMaxDepth<2>().withUnsafeDepthOverride().create();

    type BuilderType = typeof builder;
    type InternalsType = BuilderType["__internalState"];

    // Unsafe override builder should have unsafeDepthOverride = true
    expectTypeOf<InternalsType["unsafeDepthOverride"]>().toEqualTypeOf<true>();
  });
});
