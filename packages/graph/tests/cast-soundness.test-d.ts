/**
 * Type-level tests verifying the soundness of architectural casts in builder.ts.
 *
 * These tests verify that the casts in GraphBuilder methods are sound by
 * asserting that valid configurations always produce GraphBuilder/Graph types
 * (never error strings). This documents the type-state builder pattern duality
 * where:
 * - Runtime: Always creates GraphBuilder/Graph instances
 * - Type-level: Returns GraphBuilder/Graph OR error strings
 *
 * The casts bridge this duality. These tests prove the casts are safe by
 * verifying that valid inputs always produce the success branch.
 *
 * @see ARCHITECTURE.md - "Why `as` Casts in Builder Methods?"
 */

import { describe, expectTypeOf, it } from "vitest";
import { createAdapter, GraphBuilder, Graph } from "../src/index.js";
import {
  LoggerPort,
  DatabasePort,
  UserServicePort,
  LoggerAdapter,
  DatabaseAdapter,
  UserServiceAdapter,
} from "./fixtures.js";

// =============================================================================
// Cast Soundness Tests: provide() Method
// =============================================================================

describe("provide() cast soundness", () => {
  it("valid adapter produces GraphBuilder, not error string", () => {
    const builder = GraphBuilder.create();
    const result = builder.provide(LoggerAdapter);

    // The result should be a GraphBuilder, not a string error
    type Result = typeof result;
    type IsGraphBuilder =
      Result extends GraphBuilder<infer _1, infer _2, infer _3, infer _4, infer _5, infer _6>
        ? true
        : false;

    expectTypeOf<IsGraphBuilder>().toEqualTypeOf<true>();

    // Should NOT be a string (error type)
    type IsString = Result extends string ? true : false;
    expectTypeOf<IsString>().toEqualTypeOf<false>();
  });

  it("chained provides produce GraphBuilder at each step", () => {
    const step1 = GraphBuilder.create().provide(LoggerAdapter);
    const step2 = step1.provide(DatabaseAdapter);
    const step3 = step2.provide(UserServiceAdapter);

    // All steps should be GraphBuilder
    type Step1IsBuilder =
      typeof step1 extends GraphBuilder<infer _1, infer _2, infer _3, infer _4, infer _5, infer _6>
        ? true
        : false;
    type Step2IsBuilder =
      typeof step2 extends GraphBuilder<infer _1, infer _2, infer _3, infer _4, infer _5, infer _6>
        ? true
        : false;
    type Step3IsBuilder =
      typeof step3 extends GraphBuilder<infer _1, infer _2, infer _3, infer _4, infer _5, infer _6>
        ? true
        : false;

    expectTypeOf<Step1IsBuilder>().toEqualTypeOf<true>();
    expectTypeOf<Step2IsBuilder>().toEqualTypeOf<true>();
    expectTypeOf<Step3IsBuilder>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Cast Soundness Tests: provideMany() Method
// =============================================================================

describe("provideMany() cast soundness", () => {
  it("valid adapter array produces GraphBuilder", () => {
    const result = GraphBuilder.create().provideMany([
      LoggerAdapter,
      DatabaseAdapter,
      UserServiceAdapter,
    ]);

    type Result = typeof result;
    type IsGraphBuilder =
      Result extends GraphBuilder<infer _1, infer _2, infer _3, infer _4, infer _5, infer _6>
        ? true
        : false;

    expectTypeOf<IsGraphBuilder>().toEqualTypeOf<true>();
  });

  it("empty array produces GraphBuilder", () => {
    const result = GraphBuilder.create().provideMany([]);

    type Result = typeof result;
    type IsGraphBuilder =
      Result extends GraphBuilder<infer _1, infer _2, infer _3, infer _4, infer _5, infer _6>
        ? true
        : false;

    expectTypeOf<IsGraphBuilder>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Cast Soundness Tests: merge() Method
// =============================================================================

describe("merge() cast soundness", () => {
  it("merging compatible graphs produces GraphBuilder", () => {
    const graphA = GraphBuilder.create().provide(LoggerAdapter);
    const graphB = GraphBuilder.create().provide(DatabaseAdapter);

    const result = graphA.merge(graphB);

    type Result = typeof result;
    type IsGraphBuilder =
      Result extends GraphBuilder<infer _1, infer _2, infer _3, infer _4, infer _5, infer _6>
        ? true
        : false;

    expectTypeOf<IsGraphBuilder>().toEqualTypeOf<true>();
  });

  it("merging with empty graph produces GraphBuilder", () => {
    const graphA = GraphBuilder.create().provide(LoggerAdapter);
    const emptyGraph = GraphBuilder.create();

    const result1 = graphA.merge(emptyGraph);
    const result2 = emptyGraph.merge(graphA);

    type Result1IsBuilder =
      typeof result1 extends GraphBuilder<
        infer _1,
        infer _2,
        infer _3,
        infer _4,
        infer _5,
        infer _6
      >
        ? true
        : false;
    type Result2IsBuilder =
      typeof result2 extends GraphBuilder<
        infer _1,
        infer _2,
        infer _3,
        infer _4,
        infer _5,
        infer _6
      >
        ? true
        : false;

    expectTypeOf<Result1IsBuilder>().toEqualTypeOf<true>();
    expectTypeOf<Result2IsBuilder>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Cast Soundness Tests: build() Method
// =============================================================================

describe("build() cast soundness", () => {
  it("satisfied graph produces Graph, not error string", () => {
    const result = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter)
      .build();

    type Result = typeof result;
    type IsGraph = Result extends Graph<infer _P> ? true : false;

    expectTypeOf<IsGraph>().toEqualTypeOf<true>();

    // Should NOT be a string (error type)
    type IsString = Result extends string ? true : false;
    expectTypeOf<IsString>().toEqualTypeOf<false>();
  });

  it("empty graph builds to Graph<never>", () => {
    const result = GraphBuilder.create().build();

    type Result = typeof result;
    type IsGraph = Result extends Graph<never> ? true : false;

    expectTypeOf<IsGraph>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Cast Soundness Tests: buildFragment() Method
// =============================================================================

describe("buildFragment() cast soundness", () => {
  it("always produces Graph regardless of unsatisfied deps", () => {
    // UserServiceAdapter requires Logger and Database, but we don't provide them
    // buildFragment() should still succeed (deps come from parent)
    const result = GraphBuilder.create().provide(UserServiceAdapter).buildFragment();

    type Result = typeof result;
    type IsGraph = Result extends Graph<infer _P> ? true : false;

    expectTypeOf<IsGraph>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Cast Soundness Tests: override() Method
// =============================================================================

describe("override() cast soundness", () => {
  it("valid override produces GraphBuilder", () => {
    const result = GraphBuilder.create().override(LoggerAdapter);

    type Result = typeof result;
    type IsGraphBuilder =
      Result extends GraphBuilder<infer _1, infer _2, infer _3, infer _4, infer _5, infer _6>
        ? true
        : false;

    expectTypeOf<IsGraphBuilder>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Meta-Test: Error Types Are Distinct From Success Types
// =============================================================================

describe("error types are distinguishable from success types", () => {
  it("GraphBuilder is not assignable to string", () => {
    type BuilderExtendsString =
      GraphBuilder<
        never,
        never,
        never,
        Record<string, never>,
        Record<string, never>,
        never
      > extends string
        ? true
        : false;

    expectTypeOf<BuilderExtendsString>().toEqualTypeOf<false>();
  });

  it("Graph is not assignable to string", () => {
    type GraphExtendsString = Graph<never> extends string ? true : false;

    expectTypeOf<GraphExtendsString>().toEqualTypeOf<false>();
  });

  it("error strings are not assignable to GraphBuilder", () => {
    type ErrorString =
      "ERROR: Duplicate adapter for 'Logger'. Fix: Remove one .provide() call, or use .override() for child graphs.";
    type ErrorExtendsBuilder =
      ErrorString extends GraphBuilder<infer _1, infer _2, infer _3, infer _4, infer _5, infer _6>
        ? true
        : false;

    expectTypeOf<ErrorExtendsBuilder>().toEqualTypeOf<false>();
  });
});
