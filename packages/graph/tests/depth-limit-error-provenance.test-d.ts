/**
 * Type-level tests for DepthLimitError with TLastPort provenance.
 *
 * When depth limit is exceeded, the error message should include the port
 * that was being processed when the limit was hit. This gives developers
 * actionable information about where in the dependency chain the traversal
 * stopped.
 *
 * ## Why Port Provenance in Error Messages?
 *
 * Consider a deep graph: A -> B -> C -> ... -> Z
 * If depth limit (50) is exceeded while processing port "X", the error should say:
 * "Depth limit exceeded at 'X'" rather than just "Depth limit exceeded"
 *
 * This helps developers:
 * 1. Identify which port's dependencies are causing the depth issue
 * 2. Decide whether to increase depth limit or refactor
 * 3. Debug complex dependency chains
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import type { DepthLimitError } from "../src/validation/types/error-messages.js";

// =============================================================================
// DepthLimitError with TLastPort Tests
// =============================================================================

describe("DepthLimitError with TLastPort parameter", () => {
  it("should accept both TMaxDepth and TLastPort parameters", () => {
    type Error = DepthLimitError<50, "DeepPort">;

    // Should be a string that includes the port name
    type HasPort = Error extends `${string}'DeepPort'${string}` ? true : false;
    expectTypeOf<HasPort>().toEqualTypeOf<true>();
  });

  it("should include the port name in the error message", () => {
    type Error = DepthLimitError<30, "ProcessingPort">;

    // Error should mention the port
    type ContainsPort = Error extends `${string}ProcessingPort${string}` ? true : false;
    expectTypeOf<ContainsPort>().toEqualTypeOf<true>();
  });

  it("should include the max depth in the error message", () => {
    type Error = DepthLimitError<75, "SomePort">;

    // Error should mention the max depth
    type ContainsDepth = Error extends `${string}75${string}` ? true : false;
    expectTypeOf<ContainsDepth>().toEqualTypeOf<true>();
  });

  it("should default TLastPort to 'unknown' when not provided", () => {
    // Backward compatibility: existing code that only passes TMaxDepth
    type Error = DepthLimitError<50>;

    // Should still work and include default port indicator
    type IsString = Error extends string ? true : false;
    expectTypeOf<IsString>().toEqualTypeOf<true>();
  });

  it("should produce different messages for different ports", () => {
    type ErrorA = DepthLimitError<50, "PortA">;
    type ErrorB = DepthLimitError<50, "PortB">;

    // The errors should be different strings
    type AreDifferent = ErrorA extends ErrorB ? false : true;
    expectTypeOf<AreDifferent>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Error Code Consistency Tests
// =============================================================================

describe("DepthLimitError error code", () => {
  it("should use HEX007 error code", () => {
    type Error = DepthLimitError<50, "TestPort">;

    // Should contain HEX007
    type HasCode = Error extends `ERROR[HEX007]: ${string}` ? true : false;
    expectTypeOf<HasCode>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// ExtractDepthExceededPort Integration Tests
// =============================================================================

import type {
  DepthExceededResult,
  ExtractDepthExceededPort,
} from "../src/validation/types/cycle/detection.js";

describe("ExtractDepthExceededPort utility", () => {
  it("should extract port name from DepthExceededResult", () => {
    type Result = DepthExceededResult<"DeepPort">;
    type ExtractedPort = ExtractDepthExceededPort<Result>;

    expectTypeOf<ExtractedPort>().toEqualTypeOf<"DeepPort">();
  });

  it("should return never for non-depth-exceeded results", () => {
    type FromFalse = ExtractDepthExceededPort<false>;
    type FromTrue = ExtractDepthExceededPort<true>;

    expectTypeOf<FromFalse>().toEqualTypeOf<never>();
    expectTypeOf<FromTrue>().toEqualTypeOf<never>();
  });
});
