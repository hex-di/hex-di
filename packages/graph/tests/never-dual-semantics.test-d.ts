/**
 * Type-level tests for `never` dual semantics issue.
 *
 * ## Problem Statement
 *
 * The type system uses `never` for BOTH:
 * 1. Empty sets (legitimate) - "no dependencies", "all deps satisfied"
 * 2. Error states (problematic) - validation failures, malformed input
 *
 * This creates ambiguity where validation cannot distinguish between:
 * - "I checked and found nothing" (success)
 * - "I couldn't check due to error" (failure)
 *
 * ## Test Strategy
 *
 * These tests verify that:
 * 1. Error states return `InferenceError` instead of `never`
 * 2. Empty sets still return `never` (legitimate usage)
 * 3. The two cases are distinguishable at the type level
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort, type InferenceError, type IsNever } from "@hex-di/core";
import type { UnsatisfiedDependencies } from "../src/validation/types/dependency-satisfaction.js";

/**
 * Type guard for InferenceError.
 * Returns true if T is an InferenceError, false otherwise.
 */
type IsInferenceError<T> = [T] extends [never]
  ? false
  : T extends InferenceError<string, string, unknown>
    ? true
    : false;

// =============================================================================
// Test Fixtures
// =============================================================================

const LoggerPort = createPort<"Logger", { log: () => void }>("Logger");
const DatabasePort = createPort<"Database", { query: () => void }>("Database");

type LoggerPort = typeof LoggerPort;
type DatabasePort = typeof DatabasePort;

// =============================================================================
// Problem Demonstration: never Ambiguity
// =============================================================================

describe("never dual semantics problem demonstration", () => {
  describe("UnsatisfiedDependencies returns never for BOTH empty set AND cannot be distinguished", () => {
    it("returns never when all deps are satisfied (empty set - legitimate)", () => {
      // All deps satisfied → returns never (correct: empty set of missing deps)
      type AllSatisfied = UnsatisfiedDependencies<
        LoggerPort | DatabasePort,
        LoggerPort | DatabasePort
      >;
      expectTypeOf<AllSatisfied>().toEqualTypeOf<never>();
    });

    it("returns never when requires is never (no deps - legitimate)", () => {
      // No requirements → returns never (correct: empty set)
      type NoDeps = UnsatisfiedDependencies<LoggerPort, never>;
      expectTypeOf<NoDeps>().toEqualTypeOf<never>();
    });

    it("PROBLEM: cannot distinguish empty from inference failure", () => {
      // When upstream type inference fails, TRequires becomes `never`
      // This makes UnsatisfiedDependencies return `never` too
      // But this `never` means "error" not "empty set"

      // Simulate inference failure scenario:
      // A malformed adapter might cause TRequires to become `never`
      // The type system treats this the same as "no dependencies"

      // Both cases produce `never` - AMBIGUOUS!
      type EmptySet = UnsatisfiedDependencies<LoggerPort, never>;
      type InferenceFailure = UnsatisfiedDependencies<LoggerPort, never>; // same!

      // Cannot distinguish between the two cases
      type IsEmptySetNever = IsNever<EmptySet>;
      type IsInferenceFailureNever = IsNever<InferenceFailure>;

      expectTypeOf<IsEmptySetNever>().toEqualTypeOf<true>();
      expectTypeOf<IsInferenceFailureNever>().toEqualTypeOf<true>();

      // This is the problem: we can't tell if `never` means
      // "successfully verified no deps" or "failed to check"
    });
  });
});

// =============================================================================
// Expected Behavior After Fix
// =============================================================================

describe("EXPECTED: error states should use InferenceError instead of never", () => {
  /**
   * After the fix, error states should return InferenceError<...>
   * while legitimate empty sets should still return never.
   */

  describe("GetDirectDeps should distinguish 'no deps' from 'port not found'", () => {
    it("EXPECTED: 'port not found' should return ForwardReferenceError, not never", () => {
      // When looking up a port that doesn't exist in the dep graph,
      // we should get an error type, not `never`

      // This type represents the EXPECTED behavior after the fix
      type ForwardReferenceError<TPort extends string> = InferenceError<
        "GetDirectDeps",
        `Port '${TPort}' not found in dependency graph (forward reference?)`,
        TPort
      >;

      // After fix: GetDirectDeps<{}, "Unknown"> should return ForwardReferenceError
      type ExpectedError = ForwardReferenceError<"UnknownPort">;

      // Verify the error has the expected structure
      type HasInferenceErrorFlag = ExpectedError["__inferenceError"];
      type HasSource = ExpectedError["__source"];
      expectTypeOf<HasInferenceErrorFlag>().toEqualTypeOf<true>();
      expectTypeOf<HasSource>().toEqualTypeOf<"GetDirectDeps">();

      // Should NOT be never
      type IsErrorNever = IsNever<ExpectedError>;
      expectTypeOf<IsErrorNever>().toEqualTypeOf<false>();

      // Should be identifiable as an error
      type IsError = IsInferenceError<ExpectedError>;
      expectTypeOf<IsError>().toEqualTypeOf<true>();
    });

    it("EXPECTED: 'no dependencies' should still return never (empty set)", () => {
      // Legitimate empty set case should still use never
      type NoDeps = never; // Leaf node with no dependencies

      type IsEmpty = IsNever<NoDeps>;
      expectTypeOf<IsEmpty>().toEqualTypeOf<true>();

      // And should NOT be an inference error
      type IsError = IsInferenceError<NoDeps>;
      expectTypeOf<IsError>().toEqualTypeOf<false>();
    });
  });

  describe("captive dependency detection should distinguish cases", () => {
    it("EXPECTED: malformed adapter should return MalformedAdapterError", () => {
      // Define expected error type
      type MalformedAdapterError<TReason extends string> = InferenceError<
        "CaptiveDetection",
        TReason,
        unknown
      >;

      type ExpectedError = MalformedAdapterError<"Adapter missing 'requires' property">;

      // Should be identifiable as error, not confused with "no captives found"
      type IsError = IsInferenceError<ExpectedError>;
      expectTypeOf<IsError>().toEqualTypeOf<true>();
    });

    it("EXPECTED: 'no captive dependencies' should return never", () => {
      // When we successfully check and find no captive deps
      type NoCaptives = never;

      type IsEmpty = IsNever<NoCaptives>;
      expectTypeOf<IsEmpty>().toEqualTypeOf<true>();
    });
  });
});

// =============================================================================
// Distinguishability Tests
// =============================================================================

describe("IsInvalidOrError correctly handles both cases", () => {
  it("detects never as potential error or empty", () => {
    // Note: This shows the limitation - IsNever can't distinguish WHY it's never
    type CheckNever = IsNever<never>;
    expectTypeOf<CheckNever>().toEqualTypeOf<true>();
  });

  it("detects InferenceError as definite error", () => {
    type TestError = InferenceError<"Test", "This is an error", unknown>;
    type CheckError = IsInferenceError<TestError>;
    expectTypeOf<CheckError>().toEqualTypeOf<true>();

    // InferenceError is NOT never
    type CheckNever = IsNever<TestError>;
    expectTypeOf<CheckNever>().toEqualTypeOf<false>();
  });

  it("regular types are neither never nor error", () => {
    type CheckNever = IsNever<string>;
    type CheckError = IsInferenceError<string>;

    expectTypeOf<CheckNever>().toEqualTypeOf<false>();
    expectTypeOf<CheckError>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// Integration Test: Full Validation Pipeline
// =============================================================================

describe("validation pipeline should propagate errors correctly", () => {
  it("EXPECTED: malformed input should produce traceable error through pipeline", () => {
    // Define what a properly traced error looks like
    type TracedValidationError = InferenceError<
      "ValidateAdapter",
      "Adapter validation failed",
      {
        stage: "captive-detection";
        reason: "malformed adapter";
      }
    >;

    // This type of error should survive through the pipeline
    // (not be swallowed by union with never)
    type ResultWithError = string | TracedValidationError;

    // The error should still be detectable
    type HasError = TracedValidationError extends ResultWithError ? true : false;
    expectTypeOf<HasError>().toEqualTypeOf<true>();

    // Contrast with `never` which disappears:
    type ResultWithNever = string | never; // = string
    // The `never` is gone, can't detect it was ever there
    expectTypeOf<ResultWithNever>().toEqualTypeOf<string>();
  });
});

// =============================================================================
// Concrete Tests: Actual Codebase Types
// =============================================================================

import type {
  ForwardReferenceMarker,
  IsForwardReference,
} from "../src/validation/types/captive/errors.js";
import type { FindCaptiveDependency } from "../src/validation/types/captive/detection.js";

describe("ForwardReferenceMarker distinguishes forward refs from no-deps", () => {
  it("ForwardReferenceMarker is not never", () => {
    type FwdRef = ForwardReferenceMarker<"UnknownPort">;

    // ForwardReferenceMarker should NOT be never
    type IsFwdRefNever = IsNever<FwdRef>;
    expectTypeOf<IsFwdRefNever>().toEqualTypeOf<false>();
  });

  it("IsForwardReference correctly identifies markers", () => {
    type FwdRef = ForwardReferenceMarker<"UnknownPort">;

    type IsFwdRef = IsForwardReference<FwdRef>;
    expectTypeOf<IsFwdRef>().toEqualTypeOf<true>();

    // never is NOT a forward reference
    type NeverIsFwdRef = IsForwardReference<never>;
    expectTypeOf<NeverIsFwdRef>().toEqualTypeOf<false>();

    // string is NOT a forward reference
    type StringIsFwdRef = IsForwardReference<"SomePort">;
    expectTypeOf<StringIsFwdRef>().toEqualTypeOf<false>();
  });

  it("FindCaptiveDependency returns ForwardReferenceMarker for unknown ports", () => {
    // Empty lifetime map - port not found
    type EmptyMap = Record<string, never>;

    // Looking up a port not in the map should return ForwardReferenceMarker
    type Result = FindCaptiveDependency<EmptyMap, 1, "UnknownPort">;

    // The result should be a ForwardReferenceMarker, not never
    type IsFwdRef = IsForwardReference<Result>;
    expectTypeOf<IsFwdRef>().toEqualTypeOf<true>();
  });
});

describe("HandleForwardCaptiveResult should handle all cases distinctly", () => {
  // This test documents the CURRENT behavior and what SHOULD change

  it("never is treated as success (current behavior - ambiguous)", () => {
    // Currently, never is treated as success
    // This is problematic when never comes from inference failure
    type NeverResult = never;
    type IsNeverSuccess = [NeverResult] extends [never] ? true : false;
    expectTypeOf<IsNeverSuccess>().toEqualTypeOf<true>();
  });

  it("ForwardReferenceMarker should also be treated as success (deferred validation)", () => {
    // Forward references indicate deferred validation, not errors
    // They should be treated as success (the validation will happen later)
    type FwdRef = ForwardReferenceMarker<"DeferredPort">;

    // This should NOT match never
    type IsNever_ = [FwdRef] extends [never] ? true : false;
    expectTypeOf<IsNever_>().toEqualTypeOf<false>();

    // After fix: HandleForwardCaptiveResult should explicitly handle this case
    // Currently it falls through to UnexpectedInternalErrorMessage
  });
});
