/**
 * Tests for HandleForwardCaptiveResult and HandleReverseCaptiveResult error handling.
 *
 * These tests verify that:
 * 1. Valid error types produce appropriate error messages
 * 2. `never` input produces success (no error)
 * 3. Unexpected error types are properly handled (not silently masked)
 *
 * @module
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
  MalformedAdapterError,
  CaptiveDependencyError,
  ReverseCaptiveDependencyError,
} from "../src/validation/types/captive/errors.js";
import type { InferenceError } from "@hex-di/core";

// =============================================================================
// HandleForwardCaptiveResult: Expected Behavior
// =============================================================================

describe("HandleForwardCaptiveResult: expected behavior", () => {
  it("returns TSuccess for never (no error)", () => {
    type Result = HandleForwardCaptiveResult<never, "Success">;
    expectTypeOf<Result>().toEqualTypeOf<"Success">();
  });

  it("returns TSuccess for false (WouldAnyBeCaptive success case)", () => {
    // WouldAnyBeCaptive returns `false` when all adapters pass validation
    type Result = HandleForwardCaptiveResult<false, "Success">;
    expectTypeOf<Result>().toEqualTypeOf<"Success">();
  });

  it("returns CaptiveErrorMessage for CaptiveDependencyError", () => {
    type Result = HandleForwardCaptiveResult<
      CaptiveDependencyError<"Logger", "transient", "Config", "singleton">,
      "Success"
    >;
    expectTypeOf<Result>().toEqualTypeOf<
      CaptiveErrorMessage<"Logger", "transient", "Config", "singleton">
    >();
  });

  it("returns MalformedAdapterErrorMessage for MalformedAdapterError", () => {
    type Result = HandleForwardCaptiveResult<MalformedAdapterError<"missing-requires">, "Success">;
    expectTypeOf<Result>().toEqualTypeOf<MalformedAdapterErrorMessage>();
  });
});

// =============================================================================
// HandleForwardCaptiveResult: Unexpected Error Types
// =============================================================================

describe("HandleForwardCaptiveResult: unexpected error types", () => {
  it("does not silently mask InferenceError", () => {
    // If an InferenceError somehow propagates here (from upstream type computation),
    // it should NOT silently return TSuccess
    type UnexpectedError = InferenceError<"SomeType", "Something went wrong", unknown>;
    type Result = HandleForwardCaptiveResult<UnexpectedError, "Success">;

    // Result should NOT be "Success" (that would mask the error)
    type IsSilentlyMasked = Result extends "Success" ? true : false;
    expectTypeOf<IsSilentlyMasked>().toEqualTypeOf<false>();
  });

  it("does not silently mask random object type", () => {
    // If some unexpected object type reaches here, it should be flagged
    type UnexpectedType = { unexpected: true };
    type Result = HandleForwardCaptiveResult<UnexpectedType, "Success">;

    // Result should NOT be "Success" (that would mask the error)
    type IsSilentlyMasked = Result extends "Success" ? true : false;
    expectTypeOf<IsSilentlyMasked>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// HandleReverseCaptiveResult: Expected Behavior
// =============================================================================

describe("HandleReverseCaptiveResult: expected behavior", () => {
  it("returns TSuccess for never (no error)", () => {
    type Result = HandleReverseCaptiveResult<never, "Success">;
    expectTypeOf<Result>().toEqualTypeOf<"Success">();
  });

  it("returns TSuccess for false (WouldAnyCreateReverseCaptive success case)", () => {
    // WouldAnyCreateReverseCaptive returns `false` when all adapters pass validation
    type Result = HandleReverseCaptiveResult<false, "Success">;
    expectTypeOf<Result>().toEqualTypeOf<"Success">();
  });

  it("returns ReverseCaptiveErrorMessage for ReverseCaptiveDependencyError", () => {
    type Result = HandleReverseCaptiveResult<
      ReverseCaptiveDependencyError<"Logger", "transient", "Config", "singleton">,
      "Success"
    >;
    expectTypeOf<Result>().toEqualTypeOf<
      ReverseCaptiveErrorMessage<"Logger", "transient", "Config", "singleton">
    >();
  });

  it("returns MalformedAdapterErrorMessage for MalformedAdapterError", () => {
    type Result = HandleReverseCaptiveResult<MalformedAdapterError<"missing-requires">, "Success">;
    expectTypeOf<Result>().toEqualTypeOf<MalformedAdapterErrorMessage>();
  });
});

// =============================================================================
// HandleReverseCaptiveResult: Unexpected Error Types
// =============================================================================

describe("HandleReverseCaptiveResult: unexpected error types", () => {
  it("does not silently mask InferenceError", () => {
    type UnexpectedError = InferenceError<"SomeType", "Something went wrong", unknown>;
    type Result = HandleReverseCaptiveResult<UnexpectedError, "Success">;

    // Result should NOT be "Success" (that would mask the error)
    type IsSilentlyMasked = Result extends "Success" ? true : false;
    expectTypeOf<IsSilentlyMasked>().toEqualTypeOf<false>();
  });

  it("does not silently mask random object type", () => {
    type UnexpectedType = { unexpected: true };
    type Result = HandleReverseCaptiveResult<UnexpectedType, "Success">;

    // Result should NOT be "Success" (that would mask the error)
    type IsSilentlyMasked = Result extends "Success" ? true : false;
    expectTypeOf<IsSilentlyMasked>().toEqualTypeOf<false>();
  });
});
