/**
 * Type-level tests for provideUnchecked() usage marker.
 *
 * ## Problem (FIXED)
 *
 * When `provideUnchecked()` is used, there's no type-level marker that tracks
 * whether unsafe overrides were used. This could lead to false confidence in
 * type safety.
 *
 * ## Solution
 *
 * Add a `TUncheckedUsed` type parameter to `BuilderInternals` that tracks
 * when `provideUnchecked()` has been called. This allows tooling and users
 * to inspect whether a graph includes any unchecked adapters.
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import type { GetUncheckedUsed } from "../src/builder/types/state.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const PortA = createPort<{ a: () => void }, "A">({ name: "A" });
const PortB = createPort<{ b: () => void }, "B">({ name: "B" });

const AdapterA = createAdapter({
  provides: PortA,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({ a: () => {} }),
});

const AdapterB = createAdapter({
  provides: PortB,
  requires: [PortA] as const,
  lifetime: "singleton",
  factory: () => ({ b: () => {} }),
});

// =============================================================================
// Tests
// =============================================================================

describe("provideUnchecked() usage marker", () => {
  describe("tracks unchecked usage in internal state", () => {
    it("should be false for regular provide()", () => {
      const graph = GraphBuilder.create().provide(AdapterA);

      type Internals =
        typeof graph extends GraphBuilder<infer _P, infer _R, infer _A, infer _O, infer I>
          ? I
          : never;

      type UncheckedUsed = GetUncheckedUsed<Internals>;
      expectTypeOf<UncheckedUsed>().toEqualTypeOf<false>();
    });

    it("should be true after provideUnchecked()", () => {
      const graph = GraphBuilder.create().provideUnchecked(AdapterA);

      type Internals =
        typeof graph extends GraphBuilder<infer _P, infer _R, infer _A, infer _O, infer I>
          ? I
          : never;

      type UncheckedUsed = GetUncheckedUsed<Internals>;
      expectTypeOf<UncheckedUsed>().toEqualTypeOf<true>();
    });

    it("should remain true after mixing provide() and provideUnchecked()", () => {
      const graph = GraphBuilder.create().provide(AdapterA).provideUnchecked(AdapterB);

      type Internals =
        typeof graph extends GraphBuilder<infer _P, infer _R, infer _A, infer _O, infer I>
          ? I
          : never;

      type UncheckedUsed = GetUncheckedUsed<Internals>;
      expectTypeOf<UncheckedUsed>().toEqualTypeOf<true>();
    });

    it("should remain true after provideUnchecked() followed by provide()", () => {
      const graph = GraphBuilder.create().provideUnchecked(AdapterA).provide(AdapterB);

      type Internals =
        typeof graph extends GraphBuilder<infer _P, infer _R, infer _A, infer _O, infer I>
          ? I
          : never;

      type UncheckedUsed = GetUncheckedUsed<Internals>;
      expectTypeOf<UncheckedUsed>().toEqualTypeOf<true>();
    });
  });

  describe("merge preserves unchecked marker", () => {
    it("should be false when merging two clean graphs", () => {
      const graphA = GraphBuilder.create().provide(AdapterA);
      const graphB = GraphBuilder.create().provide(AdapterB);
      const merged = graphA.merge(graphB);

      type Internals =
        typeof merged extends GraphBuilder<infer _P, infer _R, infer _A, infer _O, infer I>
          ? I
          : never;

      type UncheckedUsed = GetUncheckedUsed<Internals>;
      expectTypeOf<UncheckedUsed>().toEqualTypeOf<false>();
    });

    it("should be true when merging with an unchecked graph", () => {
      const graphA = GraphBuilder.create().provide(AdapterA);
      const graphB = GraphBuilder.create().provideUnchecked(AdapterB);
      const merged = graphA.merge(graphB);

      type Internals =
        typeof merged extends GraphBuilder<infer _P, infer _R, infer _A, infer _O, infer I>
          ? I
          : never;

      type UncheckedUsed = GetUncheckedUsed<Internals>;
      expectTypeOf<UncheckedUsed>().toEqualTypeOf<true>();
    });

    it("should be true in reverse merge order too", () => {
      const graphA = GraphBuilder.create().provideUnchecked(AdapterA);
      const graphB = GraphBuilder.create().provide(AdapterB);
      const merged = graphB.merge(graphA);

      type Internals =
        typeof merged extends GraphBuilder<infer _P, infer _R, infer _A, infer _O, infer I>
          ? I
          : never;

      type UncheckedUsed = GetUncheckedUsed<Internals>;
      expectTypeOf<UncheckedUsed>().toEqualTypeOf<true>();
    });
  });
});
