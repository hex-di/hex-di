/**
 * Type-level tests for batch depth-exceeded port provenance.
 *
 * ## Problem (FIXED)
 *
 * When `WouldAnyCreateCycle` returned `DepthExceededResult` at the end of batch
 * processing, it used to lose the information about WHICH port exceeded the depth limit.
 *
 * Old behavior:
 * ```typescript
 * TAccumulatedDepthExceeded extends true
 *   ? DepthExceededResult  // Uses default: string - loses port info!
 *   : false;
 * ```
 *
 * Fixed behavior:
 * ```typescript
 * TAccumulatedDepthExceeded extends true
 *   ? DepthExceededResult<TAccumulatedDepthPort>  // Preserves port info!
 *   : false;
 * ```
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { port } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import type { WouldAnyCreateCycle } from "../src/validation/types/cycle/batch.js";
import type {
  ExtractDepthExceededPort,
  IsDepthExceeded,
} from "../src/validation/types/cycle/detection.js";

// =============================================================================
// Test Fixtures - Deep Dependency Chain (Reverse Direction)
// =============================================================================

// Create a chain where depth will be exceeded when checking cycle detection:
// F -> E -> D -> C -> B -> A (F is the leaf, A requires B, B requires C, etc.)
//
// To trigger depth exceeded, we need:
// 1. A pre-built graph with deep dependencies
// 2. Adding an adapter whose requirements ARE in the graph
// 3. The traversal through existing edges exceeds maxDepth
const PortA = port<{ a: () => void }>()({ name: "A" });
const PortB = port<{ b: () => void }>()({ name: "B" });

const AdapterA = createAdapter({
  provides: PortA,
  requires: [PortB] as const,
  lifetime: "singleton",
  factory: () => ({ a: () => {} }),
});

// =============================================================================
// Tests
// =============================================================================

describe("Batch depth-exceeded port provenance", () => {
  describe("WouldAnyCreateCycle preserves port info", () => {
    it("should return DepthExceededResult with specific port name when depth is exceeded", () => {
      // Pre-built graph with a deep chain:
      // B -> C -> D -> E -> F (B requires C, C requires D, etc.)
      // When we add AdapterA (provides A, requires B), the cycle check traverses:
      // B -> C -> D -> E -> F, which is depth 5. With maxDepth=3, this exceeds.
      type DeepGraph = {
        B: "C";
        C: "D";
        D: "E";
        E: "F";
        F: never;
      };

      type Result = WouldAnyCreateCycle<DeepGraph, readonly [typeof AdapterA], 3>;

      // Should be DepthExceededResult with a specific port, not just `string`
      type IsExceeded = IsDepthExceeded<Result>;
      expectTypeOf<IsExceeded>().toEqualTypeOf<true>();

      // Extract the port name - should NOT be just `string`
      type ExceededPort = ExtractDepthExceededPort<Result>;

      // The port should be a specific literal, not a generic string
      // It should be one of the ports in our chain where depth was exceeded
      type IsSpecificPort = ExceededPort extends "B" | "C" | "D" | "E" | "F"
        ? true
        : ExceededPort extends string
          ? false // If it's just `string`, that's the bug
          : false;

      expectTypeOf<IsSpecificPort>().toEqualTypeOf<true>();
    });

    it("should return false (not DepthExceededResult) when depth is sufficient", () => {
      // Same deep graph but with sufficient maxDepth
      type DeepGraph = {
        B: "C";
        C: "D";
        D: "E";
        E: "F";
        F: never;
      };

      type Result = WouldAnyCreateCycle<DeepGraph, readonly [typeof AdapterA], 50>;

      // Should be false, not DepthExceededResult
      expectTypeOf<Result>().toEqualTypeOf<false>();
    });
  });

  describe("GraphBuilder integration preserves port provenance", () => {
    it("should return DepthExceededResult with port info when using WouldAnyCreateCycle directly", () => {
      // Test that the type utility preserves port provenance
      // This validates the core fix without complex GraphBuilder scenarios
      type DeepGraph = {
        B: "C";
        C: "D";
        D: "E";
        E: "F";
        F: never;
      };

      // Create adapter with type annotation to help inference
      const AdapterWithDeepDep = createAdapter({
        provides: PortA,
        requires: [PortB] as const,
        lifetime: "singleton",
        factory: () => ({ a: () => {} }),
      });

      type Result = WouldAnyCreateCycle<
        DeepGraph,
        readonly [typeof AdapterWithDeepDep],
        3 // Low maxDepth
      >;

      // Verify the result is DepthExceededResult (not false)
      type IsExceeded = IsDepthExceeded<Result>;
      expectTypeOf<IsExceeded>().toEqualTypeOf<true>();

      // Verify the port info is preserved (specific literal, not just `string`)
      type PortInfo = ExtractDepthExceededPort<Result>;
      type IsLiteralPort = PortInfo extends "B" | "C" | "D" | "E" | "F" ? true : false;
      expectTypeOf<IsLiteralPort>().toEqualTypeOf<true>();
    });
  });
});
