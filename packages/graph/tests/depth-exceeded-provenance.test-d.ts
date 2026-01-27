/**
 * Type-level tests for DepthExceededResult with TLastPort provenance.
 *
 * When depth limit is exceeded during cycle detection, we want to know
 * which port was being processed when the limit was hit. This helps
 * with debugging by showing where in the dependency chain the traversal
 * stopped.
 *
 * ## Why Provenance Matters
 *
 * Consider a deep graph: A -> B -> C -> ... -> Z
 * If depth limit (50) is exceeded at port "X", the error should say:
 * "Depth exceeded at port 'X'" rather than just "Depth exceeded"
 *
 * This gives developers actionable information:
 * 1. Which port's dependencies need review
 * 2. Where to break the dependency chain
 * 3. Whether the depth is legitimate or indicates a design issue
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import type {
  DepthExceededResult,
  IsDepthExceeded,
  ExtractDepthExceededPort,
  IsReachable,
} from "../src/validation/types/cycle/detection.js";

// =============================================================================
// DepthExceededResult Type Structure Tests
// =============================================================================

describe("DepthExceededResult type structure", () => {
  it("should accept a port name parameter", () => {
    // DepthExceededResult should be parameterized by port name
    type Result = DepthExceededResult<"MyPort">;

    // Should still be recognized as depth exceeded
    expectTypeOf<IsDepthExceeded<Result>>().toEqualTypeOf<true>();
  });

  it("should default to string when no port is specified", () => {
    // For backward compatibility, default to string
    type Result = DepthExceededResult;

    // Should still be recognized
    expectTypeOf<IsDepthExceeded<Result>>().toEqualTypeOf<true>();
  });

  it("should preserve the port name in the type", () => {
    type Result = DepthExceededResult<"DeepPort">;

    // Should be able to extract the port name
    type Port = ExtractDepthExceededPort<Result>;
    expectTypeOf<Port>().toEqualTypeOf<"DeepPort">();
  });
});

// =============================================================================
// IsDepthExceeded Type Guard Tests
// =============================================================================

describe("IsDepthExceeded type guard", () => {
  it("should return true for any DepthExceededResult regardless of port", () => {
    type Result1 = IsDepthExceeded<DepthExceededResult<"PortA">>;
    type Result2 = IsDepthExceeded<DepthExceededResult<"PortB">>;
    type Result3 = IsDepthExceeded<DepthExceededResult>;

    expectTypeOf<Result1>().toEqualTypeOf<true>();
    expectTypeOf<Result2>().toEqualTypeOf<true>();
    expectTypeOf<Result3>().toEqualTypeOf<true>();
  });

  it("should return false for non-depth-exceeded types", () => {
    type Result1 = IsDepthExceeded<true>;
    type Result2 = IsDepthExceeded<false>;
    type Result3 = IsDepthExceeded<string>;

    expectTypeOf<Result1>().toEqualTypeOf<false>();
    expectTypeOf<Result2>().toEqualTypeOf<false>();
    expectTypeOf<Result3>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// ExtractDepthExceededPort Tests
// =============================================================================

describe("ExtractDepthExceededPort", () => {
  it("should extract the port name from DepthExceededResult", () => {
    type Port = ExtractDepthExceededPort<DepthExceededResult<"ProcessingPort">>;
    expectTypeOf<Port>().toEqualTypeOf<"ProcessingPort">();
  });

  it("should return string for generic DepthExceededResult", () => {
    type Port = ExtractDepthExceededPort<DepthExceededResult>;
    expectTypeOf<Port>().toEqualTypeOf<string>();
  });

  it("should return never for non-depth-exceeded types", () => {
    type Port1 = ExtractDepthExceededPort<true>;
    type Port2 = ExtractDepthExceededPort<false>;
    type Port3 = ExtractDepthExceededPort<"SomeString">;

    expectTypeOf<Port1>().toEqualTypeOf<never>();
    expectTypeOf<Port2>().toEqualTypeOf<never>();
    expectTypeOf<Port3>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// IsReachable Integration Tests
// =============================================================================

describe("IsReachable with depth exceeded provenance", () => {
  // Create a chain of dependencies that exceeds depth limit of 3
  type DeepGraph = {
    A: "B";
    B: "C";
    C: "D";
    D: "E";
  };

  it("should track port when depth is exceeded", () => {
    // With maxDepth = 3, starting from A -> B -> C -> D (exceeds at D or E)
    // The depth is: A=0, B=1, C=2, D=3 (exceeds)
    type Result = IsReachable<DeepGraph, "A", "Z", never, [], 3>;

    // Should be depth exceeded
    expectTypeOf<IsDepthExceeded<Result>>().toEqualTypeOf<true>();

    // Should have port information (exact port depends on implementation)
    type Port = ExtractDepthExceededPort<Result>;
    expectTypeOf<Port>().toMatchTypeOf<string>();
  });
});

// =============================================================================
// Backward Compatibility Tests
// =============================================================================

describe("backward compatibility", () => {
  it("should still work with existing IsDepthExceeded checks", () => {
    // Existing code checks like: IsDepthExceeded<Result> extends true
    // This should continue to work

    type Result = DepthExceededResult<"Port">;
    type Check = IsDepthExceeded<Result> extends true ? "exceeded" : "not-exceeded";

    expectTypeOf<Check>().toEqualTypeOf<"exceeded">();
  });

  it("should allow union of DepthExceededResult with different ports", () => {
    // When checking multiple ports, we might get a union
    type Union = DepthExceededResult<"A"> | DepthExceededResult<"B">;

    // Should still be detected as depth exceeded
    expectTypeOf<IsDepthExceeded<Union>>().toEqualTypeOf<true>();
  });
});
