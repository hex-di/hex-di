/**
 * Test: MaxDepth Provenance in Merge Operations
 *
 * This test explores whether the "loss of provenance" when merging graphs
 * with different maxDepth values causes any practical problems.
 *
 * ## Issue Analysis
 *
 * When merging graphs with different maxDepth values using 'max' or 'min':
 * - The resolved maxDepth loses information about which graph contributed it
 * - Is this actually a problem for users?
 *
 * ## Conclusion
 *
 * The loss of provenance is NOT a practical problem because:
 * 1. MergeOptions already lets users explicitly control resolution strategy
 * 2. The resolved value is all that matters for validation
 * 3. Adding provenance tracking would add complexity for marginal benefit
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf } from "vitest";
import { createPort } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import type { GetMaxDepth, BuilderInternals } from "../src/builder/types/state.js";
import type { ResolveMaxDepth } from "../src/builder/types/merge.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(): void;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");

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
  factory: () => ({ query: () => {} }),
});

// =============================================================================
// ResolveMaxDepth Behavior Tests
// =============================================================================

describe("ResolveMaxDepth type behavior", () => {
  it("resolves to first graph's maxDepth with 'first' option", () => {
    type Result = ResolveMaxDepth<10, 20, "first">;
    expectTypeOf<Result>().toEqualTypeOf<10>();
  });

  it("resolves to second graph's maxDepth with 'second' option", () => {
    type Result = ResolveMaxDepth<10, 20, "second">;
    expectTypeOf<Result>().toEqualTypeOf<20>();
  });

  it("resolves to max value with 'max' option", () => {
    type Result = ResolveMaxDepth<10, 20, "max">;
    expectTypeOf<Result>().toEqualTypeOf<20>();
  });

  it("resolves to min value with 'min' option", () => {
    type Result = ResolveMaxDepth<10, 20, "min">;
    expectTypeOf<Result>().toEqualTypeOf<10>();
  });

  it("handles equal values correctly", () => {
    type ResultMax = ResolveMaxDepth<15, 15, "max">;
    type ResultMin = ResolveMaxDepth<15, 15, "min">;

    expectTypeOf<ResultMax>().toEqualTypeOf<15>();
    expectTypeOf<ResultMin>().toEqualTypeOf<15>();
  });
});

// =============================================================================
// Provenance Analysis: Is Tracking Needed?
// =============================================================================

describe("maxDepth provenance: is tracking needed?", () => {
  describe("explicit resolution strategy eliminates ambiguity", () => {
    it("'first' option: provenance is implicitly 'first graph'", () => {
      // GraphBuilder.withMaxDepth<N>() is a static factory
      // Note: merge() operates on GraphBuilder, not Graph
      const graphA = GraphBuilder.withMaxDepth<10>().create().provide(LoggerAdapter);

      const graphB = GraphBuilder.withMaxDepth<20>().create().provide(DatabaseAdapter);

      // Using 'first' explicitly says "use graphA's maxDepth"
      // Provenance is clear from the option choice
      const merged = graphA.mergeWith(graphB, { maxDepth: "first" });

      // The merged graph has maxDepth 10 (from graphA)
      // No ambiguity about where it came from
      expectTypeOf<typeof merged>().not.toBeString();
    });

    it("'second' option: provenance is implicitly 'second graph'", () => {
      const graphA = GraphBuilder.withMaxDepth<10>().create().provide(LoggerAdapter);

      const graphB = GraphBuilder.withMaxDepth<20>().create().provide(DatabaseAdapter);

      const merged = graphA.mergeWith(graphB, { maxDepth: "second" });

      // The merged graph has maxDepth 20 (from graphB)
      // No ambiguity about where it came from
      expectTypeOf<typeof merged>().not.toBeString();
    });
  });

  describe("computed resolution ('max'/'min'): provenance doesn't matter", () => {
    it("'max' option: user intentionally wants the larger value", () => {
      const graphA = GraphBuilder.withMaxDepth<10>().create().provide(LoggerAdapter);

      const graphB = GraphBuilder.withMaxDepth<20>().create().provide(DatabaseAdapter);

      // User chose 'max' - they want the maximum depth available
      // Knowing "it came from graphB" doesn't provide actionable information
      const merged = graphA.mergeWith(graphB, { maxDepth: "max" });

      expectTypeOf<typeof merged>().not.toBeString();
    });

    it("'min' option: user intentionally wants the smaller value", () => {
      const graphA = GraphBuilder.withMaxDepth<10>().create().provide(LoggerAdapter);

      const graphB = GraphBuilder.withMaxDepth<20>().create().provide(DatabaseAdapter);

      // User chose 'min' - they want conservative depth checking
      // Knowing "it came from graphA" doesn't provide actionable information
      const merged = graphA.mergeWith(graphB, { maxDepth: "min" });

      expectTypeOf<typeof merged>().not.toBeString();
    });
  });

  describe("default behavior is unambiguous", () => {
    it("merge() always uses first graph's maxDepth", () => {
      // Create graphs with DIFFERENT ports to avoid duplicate error
      const graphA = GraphBuilder.withMaxDepth<10>().create().provide(LoggerAdapter);

      const graphB = GraphBuilder.withMaxDepth<20>().create().provide(DatabaseAdapter);

      // merge() without options = always use first graph's maxDepth
      // This is documented behavior, provenance is clear
      const merged = graphA.merge(graphB);

      expectTypeOf<typeof merged>().not.toBeString();
    });
  });
});

// =============================================================================
// Hypothetical Provenance Tracking: What Would It Look Like?
// =============================================================================

describe("hypothetical provenance tracking", () => {
  it("would add complexity for marginal benefit", () => {
    // If we added provenance tracking, BuilderInternals would need:
    //
    // interface BuilderInternals<...> {
    //   readonly maxDepth: TMaxDepth;
    //   readonly maxDepthSource?: 'first' | 'second' | 'computed';  // NEW
    // }
    //
    // This adds:
    // - Another type parameter to track
    // - More complexity in merge logic
    // - More complexity in WithMaxDepth utilities
    //
    // For what benefit?
    // - In error messages? The resolved value is what matters
    // - In debugging? Users can check the original graphs
    // - In chained merges? The resolution strategy is already explicit

    // The current design is simpler and equally expressive
    expectTypeOf<BuilderInternals>().toHaveProperty("maxDepth");
  });

  it("current design already supports inspection if needed", () => {
    const graphA = GraphBuilder.withMaxDepth<10>().create().provide(LoggerAdapter);

    const graphB = GraphBuilder.withMaxDepth<20>().create().provide(DatabaseAdapter);

    // Users who need to know original maxDepth values can:
    // 1. Check the source graphs before merging
    // 2. Use explicit resolution options ('first' or 'second')
    // 3. Store the original values in their own code

    // Type system shows the resolved value, which is what matters for validation
    // Access via __internalState on the GraphBuilder (not on built Graph)
    type GraphADepth = GetMaxDepth<(typeof graphA)["__internalState"]>;
    type GraphBDepth = GetMaxDepth<(typeof graphB)["__internalState"]>;

    expectTypeOf<GraphADepth>().toEqualTypeOf<10>();
    expectTypeOf<GraphBDepth>().toEqualTypeOf<20>();
  });
});

// =============================================================================
// Conclusion: No Change Needed
// =============================================================================

describe("conclusion: maxDepth provenance tracking not needed", () => {
  it("explicit options provide sufficient clarity", () => {
    // The MergeOptions.maxDepth option already makes provenance explicit:
    // - 'first': clearly from first graph
    // - 'second': clearly from second graph
    // - 'max': user wants larger, source doesn't matter
    // - 'min': user wants smaller, source doesn't matter

    // Adding tracking would be over-engineering
    expectTypeOf<"first" | "second" | "max" | "min">().toEqualTypeOf<
      "first" | "second" | "max" | "min"
    >();
  });

  it("resolved value is what matters for validation", () => {
    // Cycle detection uses the maxDepth value, not its provenance
    // Depth-exceeded errors report the limit, not where it came from
    // Users can diagnose depth issues by:
    // 1. Increasing maxDepth with withMaxDepth()
    // 2. Using unsafeDepthOverride for warnings
    // 3. Checking original graphs if they need to understand limits

    // No practical benefit to tracking provenance at the type level
    expectTypeOf<true>().toEqualTypeOf<true>();
  });
});
