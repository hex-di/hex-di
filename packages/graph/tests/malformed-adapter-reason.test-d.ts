/**
 * Type-level tests for MalformedAdapterError with TReason parameter.
 *
 * MalformedAdapterError now carries context about WHY the adapter is malformed,
 * enabling more actionable error messages.
 *
 * ## Reasons for Malformed Adapters
 *
 * | Reason | Meaning |
 * |--------|---------|
 * | `"missing-requires"` | Adapter lacks `requires` property |
 * | `"invalid-lifetime"` | Adapter has invalid/missing `lifetime` |
 * | `"invalid-requires"` | Adapter's `requires` is not an array |
 * | `"inference-failed"` | Type inference failed for adapter structure |
 */

import { describe, expectTypeOf, it } from "vitest";
import type {
  MalformedAdapterError,
  IsMalformedAdapterError,
} from "../src/validation/types/captive/errors.js";

// =============================================================================
// MalformedAdapterError Type Tests
// =============================================================================

describe("MalformedAdapterError with TReason parameter", () => {
  it("should accept a reason string", () => {
    type Error = MalformedAdapterError<"missing-requires">;
    expectTypeOf<Error["__errorBrand"]>().toEqualTypeOf<"MalformedAdapterError">();
    expectTypeOf<Error["reason"]>().toEqualTypeOf<"missing-requires">();
  });

  it("should produce different error messages for different reasons", () => {
    type Error1 = MalformedAdapterError<"missing-requires">;
    type Error2 = MalformedAdapterError<"invalid-lifetime">;

    // The message should include the reason
    type HasReason1 = Error1["__message"] extends `${string}missing-requires${string}`
      ? true
      : false;
    type HasReason2 = Error2["__message"] extends `${string}invalid-lifetime${string}`
      ? true
      : false;

    expectTypeOf<HasReason1>().toEqualTypeOf<true>();
    expectTypeOf<HasReason2>().toEqualTypeOf<true>();
  });

  it("should default to generic reason when not specified", () => {
    // Backward compatibility: MalformedAdapterError without parameter
    type Error = MalformedAdapterError;
    expectTypeOf<Error["__errorBrand"]>().toEqualTypeOf<"MalformedAdapterError">();
    // Default reason should be "unknown" or similar
    expectTypeOf<Error["reason"]>().toEqualTypeOf<"unknown">();
  });

  it("should be distinguishable from other error types", () => {
    type Error = MalformedAdapterError<"missing-requires">;
    type IsNever = [Error] extends [never] ? true : false;
    expectTypeOf<IsNever>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// IsMalformedAdapterError Type Guard Tests
// =============================================================================

describe("IsMalformedAdapterError type guard", () => {
  it("should return true for any MalformedAdapterError", () => {
    type Result1 = IsMalformedAdapterError<MalformedAdapterError<"missing-requires">>;
    type Result2 = IsMalformedAdapterError<MalformedAdapterError<"invalid-lifetime">>;
    type Result3 = IsMalformedAdapterError<MalformedAdapterError>; // default reason

    expectTypeOf<Result1>().toEqualTypeOf<true>();
    expectTypeOf<Result2>().toEqualTypeOf<true>();
    expectTypeOf<Result3>().toEqualTypeOf<true>();
  });

  it("should return false for other types", () => {
    type Result1 = IsMalformedAdapterError<never>;
    type Result2 = IsMalformedAdapterError<string>;
    type Result3 = IsMalformedAdapterError<"some-port">;

    expectTypeOf<Result1>().toEqualTypeOf<false>();
    expectTypeOf<Result2>().toEqualTypeOf<false>();
    expectTypeOf<Result3>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// Integration with Existing Types
// =============================================================================

describe("MalformedAdapterError integration", () => {
  it("should work with Exclude to filter out errors", () => {
    type MixedResult = "ValidPort" | MalformedAdapterError<"missing-requires"> | never;

    // Filter to get only valid port names
    type OnlyPorts = Exclude<MixedResult, MalformedAdapterError<string>>;
    expectTypeOf<OnlyPorts>().toEqualTypeOf<"ValidPort">();
  });

  it("should work with Extract to get error types", () => {
    type MixedResult =
      | "ValidPort"
      | MalformedAdapterError<"missing-requires">
      | MalformedAdapterError<"invalid-lifetime">;

    // Extract only errors
    type OnlyErrors = Extract<MixedResult, MalformedAdapterError<string>>;
    // Should be union of both error types
    type IsError = OnlyErrors extends MalformedAdapterError<string> ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();
  });
});
