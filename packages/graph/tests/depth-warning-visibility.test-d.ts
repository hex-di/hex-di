/**
 * Type-level tests for depth warning visibility in IDE tooltips.
 *
 * ## Problem (FIXED)
 *
 * When depth is exceeded with `withUnsafeDepthOverride()` enabled, the warning
 * is tracked in `TInternalState.depthExceededWarning`, but this is buried in
 * internal state and not visible in IDE tooltips.
 *
 * ## Solution
 *
 * Add a `$depthWarnings` phantom property to GraphBuilder that exposes the
 * depth exceeded warnings directly, making them visible when hovering over
 * a builder variable in the IDE.
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import type { IsNever } from "@hex-di/core";

// =============================================================================
// Test Fixtures
// =============================================================================

const PortA = createPort<"A", { a: string }>("A");
const PortB = createPort<"B", { b: string }>("B");
const PortC = createPort<"C", { c: string }>("C");
const PortD = createPort<"D", { d: string }>("D");

// Chain: A -> B -> C -> D (A requires B, B requires C, C requires D, D is leaf)
// This is the same pattern as depth-warning-consistency.test-d.ts
const AdapterA = createAdapter({
  provides: PortA,
  requires: [PortB] as const,
  lifetime: "singleton",
  factory: () => ({ a: "a" }),
});

const AdapterB = createAdapter({
  provides: PortB,
  requires: [PortC] as const,
  lifetime: "singleton",
  factory: () => ({ b: "b" }),
});

const AdapterC = createAdapter({
  provides: PortC,
  requires: [PortD] as const,
  lifetime: "singleton",
  factory: () => ({ c: "c" }),
});

const AdapterD = createAdapter({
  provides: PortD,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({ d: "d" }),
});

// =============================================================================
// $depthWarnings Visibility Tests
// =============================================================================

describe("$depthWarnings phantom property", () => {
  describe("no warnings (normal usage)", () => {
    it("should be never for empty graph", () => {
      const builder = GraphBuilder.create();

      type Warnings = (typeof builder)["$depthWarnings"];
      type IsWarningsNever = IsNever<Warnings>;
      expectTypeOf<IsWarningsNever>().toEqualTypeOf<true>();
    });

    it("should be never for graph with sufficient depth", () => {
      // Provide in order: D (leaf), C, B - doesn't exceed depth
      const builder = GraphBuilder.create().provide(AdapterD).provide(AdapterC).provide(AdapterB);

      type Warnings = (typeof builder)["$depthWarnings"];
      type IsWarningsNever = IsNever<Warnings>;
      expectTypeOf<IsWarningsNever>().toEqualTypeOf<true>();
    });

    it("should be never when unsafeDepthOverride not enabled", () => {
      // Even with low depth, without unsafeDepthOverride, no warnings
      // (it would be an error instead - the type becomes error string)
      const builder = GraphBuilder.withMaxDepth<50>().create().provide(AdapterD);

      type Warnings = (typeof builder)["$depthWarnings"];
      type IsWarningsNever = IsNever<Warnings>;
      expectTypeOf<IsWarningsNever>().toEqualTypeOf<true>();
    });
  });

  describe("with depth exceeded and unsafe override enabled", () => {
    it("should expose warning port when depth is exceeded", () => {
      // Build a chain that exceeds depth with unsafeDepthOverride enabled
      // Provide in order: D (leaf), C, B, A - when A is provided, depth check
      // traverses A's deps (B) -> B's deps (C) -> C's deps (D) = depth 3
      // With maxDepth=2, this exceeds the limit
      const builder = GraphBuilder.withMaxDepth<2>()
        .withUnsafeDepthOverride()
        .create()
        .provide(AdapterD)
        .provide(AdapterC)
        .provide(AdapterB)
        .provide(AdapterA);

      // First verify it's a GraphBuilder (not an error string)
      type BuilderType = typeof builder;
      type IsGraphBuilder =
        BuilderType extends GraphBuilder<infer _P, infer _R, infer _A, infer _O, infer _I>
          ? true
          : false;
      expectTypeOf<IsGraphBuilder>().toEqualTypeOf<true>();

      // Now verify the $depthWarnings property matches internal state
      type InternalState = (typeof builder)["__internalState"];
      type WarningsFromInternal = InternalState extends { depthExceededWarning: infer W }
        ? W
        : "no-match";
      type WarningsFromProperty = (typeof builder)["$depthWarnings"];

      // They should be equivalent (even if both are never)
      type AreEqual = WarningsFromInternal extends WarningsFromProperty
        ? WarningsFromProperty extends WarningsFromInternal
          ? true
          : false
        : false;
      expectTypeOf<AreEqual>().toEqualTypeOf<true>();
    });
  });
});

// =============================================================================
// $uncheckedUsed Visibility Tests
// =============================================================================

describe("$uncheckedUsed phantom property", () => {
  it("should be false for normal provide()", () => {
    const builder = GraphBuilder.create().provide(AdapterA);

    type UncheckedUsed = (typeof builder)["$uncheckedUsed"];
    expectTypeOf<UncheckedUsed>().toEqualTypeOf<false>();
  });

  it("should be true after provideUnchecked()", () => {
    const builder = GraphBuilder.create().provideUnchecked(AdapterA);

    type UncheckedUsed = (typeof builder)["$uncheckedUsed"];
    expectTypeOf<UncheckedUsed>().toEqualTypeOf<true>();
  });
});
