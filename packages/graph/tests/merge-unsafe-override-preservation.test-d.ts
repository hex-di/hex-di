/**
 * Type-level tests for UnsafeDepthOverride preservation during graph merges.
 *
 * ## Issue Being Tested
 *
 * In `UnifiedMergeInternals`, only T1's `UnsafeDepthOverride` is preserved.
 * If T2 has `withUnsafeDepthOverride()` enabled but T1 doesn't, the user's
 * explicit opt-in is silently discarded. The merge should preserve the OR
 * of both flags to respect user intent.
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort } from "@hex-di/ports";
import { createAdapter, GraphBuilder } from "../src/index.js";
import type { GetUnsafeDepthOverride } from "../src/internal.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface ServiceA {
  doA(): void;
}

interface ServiceB {
  doB(): void;
}

const PortA = createPort<"PortA", ServiceA>("PortA");
const PortB = createPort<"PortB", ServiceB>("PortB");

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
// UnsafeDepthOverride Preservation Tests
// =============================================================================

describe("UnsafeDepthOverride preservation during merge", () => {
  describe("single graph baseline", () => {
    it("default graph has unsafeDepthOverride = false", () => {
      const graph = GraphBuilder.create().provide(AdapterA);
      type Internals = (typeof graph)["__internalState"];
      type Override = GetUnsafeDepthOverride<Internals>;
      expectTypeOf<Override>().toEqualTypeOf<false>();
    });

    it("withUnsafeDepthOverride() sets flag to true", () => {
      const graph = GraphBuilder.withUnsafeDepthOverride().create().provide(AdapterA);
      type Internals = (typeof graph)["__internalState"];
      type Override = GetUnsafeDepthOverride<Internals>;
      expectTypeOf<Override>().toEqualTypeOf<true>();
    });
  });

  describe("merge preserves override from either graph", () => {
    it("T1 with override + T2 without = merged has override", () => {
      const graphWithOverride = GraphBuilder.withUnsafeDepthOverride().create().provide(AdapterA);
      const graphWithoutOverride = GraphBuilder.create().provide(AdapterB);

      const merged = graphWithOverride.merge(graphWithoutOverride);

      type Internals = (typeof merged)["__internalState"];
      type Override = GetUnsafeDepthOverride<Internals>;
      // T1 has override, so merged should have it
      expectTypeOf<Override>().toEqualTypeOf<true>();
    });

    it("T1 without override + T2 with override = merged has override", () => {
      const graphWithoutOverride = GraphBuilder.create().provide(AdapterA);
      const graphWithOverride = GraphBuilder.withUnsafeDepthOverride().create().provide(AdapterB);

      const merged = graphWithoutOverride.merge(graphWithOverride);

      type Internals = (typeof merged)["__internalState"];
      type Override = GetUnsafeDepthOverride<Internals>;
      // T2 has override, so merged should also have it (OR semantics)
      // THIS IS THE BUG: currently returns false because only T1 is checked
      expectTypeOf<Override>().toEqualTypeOf<true>();
    });

    it("both with override = merged has override", () => {
      const graph1 = GraphBuilder.withUnsafeDepthOverride().create().provide(AdapterA);
      const graph2 = GraphBuilder.withUnsafeDepthOverride().create().provide(AdapterB);

      const merged = graph1.merge(graph2);

      type Internals = (typeof merged)["__internalState"];
      type Override = GetUnsafeDepthOverride<Internals>;
      expectTypeOf<Override>().toEqualTypeOf<true>();
    });

    it("neither with override = merged has no override", () => {
      const graph1 = GraphBuilder.create().provide(AdapterA);
      const graph2 = GraphBuilder.create().provide(AdapterB);

      const merged = graph1.merge(graph2);

      type Internals = (typeof merged)["__internalState"];
      type Override = GetUnsafeDepthOverride<Internals>;
      expectTypeOf<Override>().toEqualTypeOf<false>();
    });
  });

  describe("mergeWith also preserves override", () => {
    it("T1 without + T2 with = merged has override (mergeWith)", () => {
      const graphWithoutOverride = GraphBuilder.create().provide(AdapterA);
      const graphWithOverride = GraphBuilder.withUnsafeDepthOverride().create().provide(AdapterB);

      // mergeWith allows specifying options but should still preserve T2's override
      const merged = graphWithoutOverride.mergeWith(graphWithOverride, { maxDepth: "max" });

      type Internals = (typeof merged)["__internalState"];
      type Override = GetUnsafeDepthOverride<Internals>;
      // T2 has override, so merged should also have it
      expectTypeOf<Override>().toEqualTypeOf<true>();
    });
  });
});
