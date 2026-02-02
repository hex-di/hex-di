/**
 * Type tests for DepthLimitWarning consistency between short-circuit and multi-error modes.
 *
 * The issue: When using `withExtendedDepth()`, the user is saying "I accept
 * incomplete validation, let me proceed". In this case:
 * - DepthLimitError (default) should BLOCK the operation
 * - DepthLimitWarning (with override) should ALLOW the operation to proceed
 *
 * Previously, warnings blocked the operation just like errors, which was inconsistent
 * with the semantic intent of a "warning" vs an "error".
 */
import { describe, it, expectTypeOf } from "vitest";
import { GraphBuilder, type Graph } from "../src/index.js";
import { port, createAdapter } from "@hex-di/core";

// =============================================================================
// Test Fixtures - Deep chain to trigger depth exceeded
// =============================================================================

// Service interfaces for depth test
interface DepthServiceA {
  a: string;
}
interface DepthServiceB {
  b: string;
}
interface DepthServiceC {
  c: string;
}
interface DepthServiceD {
  d: string;
}

// Create a chain of ports with unique names for this test
const DepthTestPortA = port<DepthServiceA>()({ name: "DepthTestA" });
const DepthTestPortB = port<DepthServiceB>()({ name: "DepthTestB" });
const DepthTestPortC = port<DepthServiceC>()({ name: "DepthTestC" });
const DepthTestPortD = port<DepthServiceD>()({ name: "DepthTestD" });

// Chain: A -> B -> C -> D (depth 3)
const DepthTestAdapterA = createAdapter({
  provides: DepthTestPortA,
  requires: [DepthTestPortB],
  lifetime: "singleton",
  factory: ({ DepthTestB }) => ({ a: DepthTestB.b }),
});

const DepthTestAdapterB = createAdapter({
  provides: DepthTestPortB,
  requires: [DepthTestPortC],
  lifetime: "singleton",
  factory: ({ DepthTestC }) => ({ b: DepthTestC.c }),
});

const DepthTestAdapterC = createAdapter({
  provides: DepthTestPortC,
  requires: [DepthTestPortD],
  lifetime: "singleton",
  factory: ({ DepthTestD }) => ({ c: DepthTestD.d }),
});

const DepthTestAdapterD = createAdapter({
  provides: DepthTestPortD,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ d: "value" }),
});

// =============================================================================
// Test: With unsafe override, warnings should allow proceeding
// =============================================================================

describe("DepthLimitWarning should allow operation to proceed", () => {
  it("multi-error mode with unsafe override returns GraphBuilder, not error", () => {
    // With depth 2, checking A->B->C->D will exceed depth limit
    // But with unsafe override, it should proceed (warning, not error)
    const builder = GraphBuilder.withMaxDepth<2>()
      .withExtendedDepth()
      .create()
      .provide(DepthTestAdapterD)
      .provide(DepthTestAdapterC)
      .provide(DepthTestAdapterB)
      .provide(DepthTestAdapterA);

    // Should be a GraphBuilder, not an error string
    type BuilderType = typeof builder;
    type IsGraphBuilder =
      BuilderType extends GraphBuilder<infer _P, infer _R, infer _A, infer _O, infer _I>
        ? true
        : false;
    expectTypeOf<IsGraphBuilder>().toEqualTypeOf<true>();
  });

  it("multi-error mode WITHOUT unsafe override returns DepthLimitError", () => {
    // Without unsafe override, depth exceeded should return error
    const builder = GraphBuilder.withMaxDepth<2>()
      .create()
      .provide(DepthTestAdapterD)
      .provide(DepthTestAdapterC)
      .provide(DepthTestAdapterB)
      .provide(DepthTestAdapterA);

    // Should be an error string containing "ERROR[HEX007]"
    type BuilderType = typeof builder;
    type IsDepthError = BuilderType extends `ERROR[HEX007]: ${string}` ? true : false;
    expectTypeOf<IsDepthError>().toEqualTypeOf<true>();
  });

  it("short-circuit mode (provideFirstError) with unsafe override returns GraphBuilder", () => {
    const builder = GraphBuilder.withMaxDepth<2>()
      .withExtendedDepth()
      .create()
      .provide(DepthTestAdapterD)
      .provide(DepthTestAdapterC)
      .provide(DepthTestAdapterB)
      .provide(DepthTestAdapterA);

    // Should be a GraphBuilder, not an error/warning string
    type BuilderType = typeof builder;
    type IsGraphBuilder =
      BuilderType extends GraphBuilder<infer _P, infer _R, infer _A, infer _O, infer _I>
        ? true
        : false;
    expectTypeOf<IsGraphBuilder>().toEqualTypeOf<true>();
  });

  it("short-circuit mode WITHOUT unsafe override returns DepthLimitError", () => {
    const builder = GraphBuilder.withMaxDepth<2>()
      .create()
      .provide(DepthTestAdapterD)
      .provide(DepthTestAdapterC)
      .provide(DepthTestAdapterB)
      .provide(DepthTestAdapterA);

    // Should be an error string containing "ERROR[HEX007]"
    type BuilderType = typeof builder;
    type IsDepthError = BuilderType extends `ERROR[HEX007]: ${string}` ? true : false;
    expectTypeOf<IsDepthError>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Test: Build should succeed when warnings allowed proceeding
// =============================================================================

describe("build() succeeds after warning-allowed provide()", () => {
  it("build() returns Graph when unsafe override allowed proceeding", () => {
    const builder = GraphBuilder.withMaxDepth<2>()
      .withExtendedDepth()
      .create()
      .provide(DepthTestAdapterD)
      .provide(DepthTestAdapterC)
      .provide(DepthTestAdapterB)
      .provide(DepthTestAdapterA);

    type BuildResult = ReturnType<typeof builder.build>;

    // Should be a valid Graph type
    type IsGraph = BuildResult extends Graph<infer _P, infer _A, infer _O> ? true : false;
    expectTypeOf<IsGraph>().toEqualTypeOf<true>();
  });
});
