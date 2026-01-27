/**
 * Type-level tests for captive result handler helper types.
 *
 * These helper types encapsulate the repeated pattern of checking:
 * 1. MalformedAdapterError (must be checked FIRST due to never extends CaptiveDependencyError issue)
 * 2. CaptiveDependencyError or ReverseCaptiveDependencyError
 * 3. Success case
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import type {
  HandleForwardCaptiveResult,
  HandleReverseCaptiveResult,
  CaptiveErrorMessage,
  ReverseCaptiveErrorMessage,
  MalformedAdapterErrorMessage,
} from "../src/validation/types/error-messages.js";
import type {
  CaptiveDependencyError,
  ReverseCaptiveDependencyError,
  MalformedAdapterError,
} from "../src/validation/types/captive/errors.js";

// =============================================================================
// HandleForwardCaptiveResult Tests
// =============================================================================

describe("HandleForwardCaptiveResult", () => {
  it("should return MalformedAdapterErrorMessage for MalformedAdapterError", () => {
    type Result = HandleForwardCaptiveResult<MalformedAdapterError<"missing_lifetime">, "success">;
    expectTypeOf<Result>().toEqualTypeOf<MalformedAdapterErrorMessage>();
  });

  it("should return CaptiveErrorMessage for CaptiveDependencyError", () => {
    type Result = HandleForwardCaptiveResult<
      CaptiveDependencyError<"UserCache", "Singleton", "RequestContext", "Scoped">,
      "success"
    >;
    type Expected = CaptiveErrorMessage<"UserCache", "Singleton", "RequestContext", "Scoped">;
    expectTypeOf<Result>().toEqualTypeOf<Expected>();
  });

  it("should return success type for never (no error)", () => {
    type Result = HandleForwardCaptiveResult<never, "success">;
    expectTypeOf<Result>().toEqualTypeOf<"success">();
  });

  it("should return template literal error for unexpected input types", () => {
    // Unknown types now produce a clear template literal error message
    type Result = HandleForwardCaptiveResult<"some-string", "success">;
    type IsError = Result extends `ERROR[HEX022]:${string}` ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();
  });

  it("should return success type for false (valid success case)", () => {
    // WouldAnyBeCaptive returns `false` when validation succeeds
    type Result = HandleForwardCaptiveResult<false, "success">;
    expectTypeOf<Result>().toEqualTypeOf<"success">();
  });

  it("should preserve MalformedAdapterError check priority over CaptiveDependencyError", () => {
    // This test verifies the SOUNDNESS fix:
    // `never extends CaptiveDependencyError<...>` is always true, which would
    // produce CaptiveErrorMessage<never, never, never, never> = never.
    // MalformedAdapterError is NOT never, so we can distinguish it.
    type MalformedResult = HandleForwardCaptiveResult<MalformedAdapterError<"test">, "success">;
    expectTypeOf<MalformedResult>().toEqualTypeOf<MalformedAdapterErrorMessage>();
  });
});

// =============================================================================
// HandleReverseCaptiveResult Tests
// =============================================================================

describe("HandleReverseCaptiveResult", () => {
  it("should return MalformedAdapterErrorMessage for MalformedAdapterError", () => {
    type Result = HandleReverseCaptiveResult<MalformedAdapterError<"missing_lifetime">, "success">;
    expectTypeOf<Result>().toEqualTypeOf<MalformedAdapterErrorMessage>();
  });

  it("should return ReverseCaptiveErrorMessage for ReverseCaptiveDependencyError", () => {
    type Result = HandleReverseCaptiveResult<
      ReverseCaptiveDependencyError<"UserCache", "Singleton", "RequestContext", "Scoped">,
      "success"
    >;
    type Expected = ReverseCaptiveErrorMessage<
      "UserCache",
      "Singleton",
      "RequestContext",
      "Scoped"
    >;
    expectTypeOf<Result>().toEqualTypeOf<Expected>();
  });

  it("should return success type for never (no error)", () => {
    type Result = HandleReverseCaptiveResult<never, "success">;
    expectTypeOf<Result>().toEqualTypeOf<"success">();
  });

  it("should return template literal error for unexpected input types", () => {
    // Unknown types now produce a clear template literal error message
    type Result = HandleReverseCaptiveResult<"some-string", "success">;
    type IsError = Result extends `ERROR[HEX022]:${string}` ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();
  });

  it("should return success type for false (valid success case)", () => {
    // WouldAnyCreateReverseCaptive returns `false` when validation succeeds
    type Result = HandleReverseCaptiveResult<false, "success">;
    expectTypeOf<Result>().toEqualTypeOf<"success">();
  });

  it("should preserve MalformedAdapterError check priority over ReverseCaptiveDependencyError", () => {
    // Same soundness test as forward captive
    type MalformedResult = HandleReverseCaptiveResult<MalformedAdapterError<"test">, "success">;
    expectTypeOf<MalformedResult>().toEqualTypeOf<MalformedAdapterErrorMessage>();
  });
});

// =============================================================================
// Composite Scenario Tests
// =============================================================================

describe("Captive result handlers in realistic scenarios", () => {
  it("HandleForwardCaptiveResult should work with GraphBuilder-like success type", () => {
    // Simulating the actual use case in provide.ts
    type GraphBuilderSuccess = { __brand: "GraphBuilder" };
    type Result = HandleForwardCaptiveResult<never, GraphBuilderSuccess>;
    expectTypeOf<Result>().toEqualTypeOf<GraphBuilderSuccess>();
  });

  it("HandleReverseCaptiveResult should work with GraphBuilder-like success type", () => {
    type GraphBuilderSuccess = { __brand: "GraphBuilder" };
    type Result = HandleReverseCaptiveResult<never, GraphBuilderSuccess>;
    expectTypeOf<Result>().toEqualTypeOf<GraphBuilderSuccess>();
  });

  it("should handle union of errors by distributing over union", () => {
    // When result could be either an error OR never (from some conditional logic)
    type MixedResult = CaptiveDependencyError<"A", "Singleton", "B", "Scoped"> | never;
    type Result = HandleForwardCaptiveResult<MixedResult, "success">;
    type Expected = CaptiveErrorMessage<"A", "Singleton", "B", "Scoped">;
    expectTypeOf<Result>().toEqualTypeOf<Expected>();
  });
});
