/**
 * Type-level tests for ExtendedDepth preservation during graph merges.
 *
 * ## Issue Being Tested
 *
 * In `UnifiedMergeInternals`, only T1's `ExtendedDepth` is preserved.
 * If T2 has `withExtendedDepth()` enabled but T1 doesn't, the user's
 * explicit opt-in is silently discarded. The merge should preserve the OR
 * of both flags to respect user intent.
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { port } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import type { GetExtendedDepth } from "./test-types.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface ServiceA {
  doA(): void;
}

interface ServiceB {
  doB(): void;
}

const PortA = port<ServiceA>()({ name: "PortA" });
const PortB = port<ServiceB>()({ name: "PortB" });

const AdapterA = createAdapter({
  provides: PortA,
  requires: [] as const,
  factory: () => ({ doA: () => {} }),
  lifetime: "singleton",
});

const AdapterB = createAdapter({
  provides: PortB,
  requires: [] as const,
  factory: () => ({ doB: () => {} }),
  lifetime: "singleton",
});

// =============================================================================
// ExtendedDepth Preservation Tests
// =============================================================================

describe("ExtendedDepth preservation during merge", () => {
  describe("single graph baseline", () => {
    it("default graph has extendedDepth = false", () => {
      const graph = GraphBuilder.create().provide(AdapterA);
      type Internals = (typeof graph)["__internalState"];
      type Override = GetExtendedDepth<Internals>;
      expectTypeOf<Override>().toEqualTypeOf<false>();
    });

    it("withExtendedDepth() sets flag to true", () => {
      const graph = GraphBuilder.withExtendedDepth().create().provide(AdapterA);
      type Internals = (typeof graph)["__internalState"];
      type Override = GetExtendedDepth<Internals>;
      expectTypeOf<Override>().toEqualTypeOf<true>();
    });
  });

  describe("merge preserves override from either graph", () => {
    it("T1 with override + T2 without = merged has override", () => {
      const graphWithOverride = GraphBuilder.withExtendedDepth().create().provide(AdapterA);
      const graphWithoutOverride = GraphBuilder.create().provide(AdapterB);

      const merged = graphWithOverride.merge(graphWithoutOverride);

      type Internals = (typeof merged)["__internalState"];
      type Override = GetExtendedDepth<Internals>;
      // T1 has override, so merged should have it
      expectTypeOf<Override>().toEqualTypeOf<true>();
    });

    it("T1 without override + T2 with override = merged has override", () => {
      const graphWithoutOverride = GraphBuilder.create().provide(AdapterA);
      const graphWithOverride = GraphBuilder.withExtendedDepth().create().provide(AdapterB);

      const merged = graphWithoutOverride.merge(graphWithOverride);

      type Internals = (typeof merged)["__internalState"];
      type Override = GetExtendedDepth<Internals>;
      // T2 has override, so merged should also have it (OR semantics)
      // THIS IS THE BUG: currently returns false because only T1 is checked
      expectTypeOf<Override>().toEqualTypeOf<true>();
    });

    it("both with override = merged has override", () => {
      const graph1 = GraphBuilder.withExtendedDepth().create().provide(AdapterA);
      const graph2 = GraphBuilder.withExtendedDepth().create().provide(AdapterB);

      const merged = graph1.merge(graph2);

      type Internals = (typeof merged)["__internalState"];
      type Override = GetExtendedDepth<Internals>;
      expectTypeOf<Override>().toEqualTypeOf<true>();
    });

    it("neither with override = merged has no override", () => {
      const graph1 = GraphBuilder.create().provide(AdapterA);
      const graph2 = GraphBuilder.create().provide(AdapterB);

      const merged = graph1.merge(graph2);

      type Internals = (typeof merged)["__internalState"];
      type Override = GetExtendedDepth<Internals>;
      expectTypeOf<Override>().toEqualTypeOf<false>();
    });
  });

  describe("merge also preserves override", () => {
    it("T1 without + T2 with = merged has override (merge)", () => {
      const graphWithoutOverride = GraphBuilder.create().provide(AdapterA);
      const graphWithOverride = GraphBuilder.withExtendedDepth().create().provide(AdapterB);

      // merge should preserve T2's override
      const merged = graphWithoutOverride.merge(graphWithOverride);

      type Internals = (typeof merged)["__internalState"];
      type Override = GetExtendedDepth<Internals>;
      // T2 has override, so merged should also have it
      expectTypeOf<Override>().toEqualTypeOf<true>();
    });
  });
});
