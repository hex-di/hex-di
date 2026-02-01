/**
 * Tests for LifetimeLevel, LifetimeName and their Diagnostic variants.
 *
 * ## Design Decision
 *
 * The original `LifetimeLevel` and `LifetimeName` types return `never` for invalid
 * inputs. This is necessary because:
 * 1. They are used in type constraints like `extends number`
 * 2. `InferenceError` is an object type that would fail these constraints
 * 3. Internal code relies on `never` for type narrowing
 *
 * For better IDE diagnostics, we provide `DiagnosticLifetimeLevel` and
 * `DiagnosticLifetimeName` that return `InferenceError` for invalid inputs.
 * These should be used when debugging type issues in IDE tooltips.
 *
 * @module
 */
import { describe, expectTypeOf, it } from "vitest";
import type {
  LifetimeLevel,
  LifetimeName,
  DiagnosticLifetimeLevel,
  DiagnosticLifetimeName,
} from "../src/validation/types/captive/lifetime-level.js";
import type { InferenceError, IsNever } from "@hex-di/core";
import type {
  SINGLETON_LEVEL,
  SCOPED_LEVEL,
  TRANSIENT_LEVEL,
} from "../src/validation/types/captive/lifetime-constants.js";

// =============================================================================
// LifetimeLevel: Valid Inputs
// =============================================================================

describe("LifetimeLevel: valid inputs", () => {
  it("returns SINGLETON_LEVEL (1) for 'singleton'", () => {
    expectTypeOf<LifetimeLevel<"singleton">>().toEqualTypeOf<SINGLETON_LEVEL>();
  });

  it("returns SCOPED_LEVEL (2) for 'scoped'", () => {
    expectTypeOf<LifetimeLevel<"scoped">>().toEqualTypeOf<SCOPED_LEVEL>();
  });

  it("returns TRANSIENT_LEVEL (3) for 'transient'", () => {
    expectTypeOf<LifetimeLevel<"transient">>().toEqualTypeOf<TRANSIENT_LEVEL>();
  });
});

// =============================================================================
// LifetimeLevel: Invalid Inputs (returns never for type constraint compatibility)
// =============================================================================

describe("LifetimeLevel: invalid inputs return never", () => {
  it("returns never for typo 'singletons'", () => {
    expectTypeOf<LifetimeLevel<"singletons">>().toEqualTypeOf<never>();
  });

  it("returns never for completely wrong string", () => {
    expectTypeOf<LifetimeLevel<"invalid">>().toEqualTypeOf<never>();
  });

  it("returns never for empty string", () => {
    expectTypeOf<LifetimeLevel<"">>().toEqualTypeOf<never>();
  });

  it("returns never for number input", () => {
    expectTypeOf<LifetimeLevel<1>>().toEqualTypeOf<never>();
  });

  it("preserves never for empty union semantics", () => {
    // When the input is `never` (empty union), the output should also be `never`
    // because this represents "no lifetime" not "invalid lifetime"
    expectTypeOf<LifetimeLevel<never>>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// LifetimeName: Valid Inputs
// =============================================================================

describe("LifetimeName: valid inputs", () => {
  it("returns 'Singleton' for level 1", () => {
    expectTypeOf<LifetimeName<1>>().toEqualTypeOf<"Singleton">();
  });

  it("returns 'Scoped' for level 2", () => {
    expectTypeOf<LifetimeName<2>>().toEqualTypeOf<"Scoped">();
  });

  it("returns 'Transient' for level 3", () => {
    expectTypeOf<LifetimeName<3>>().toEqualTypeOf<"Transient">();
  });
});

// =============================================================================
// LifetimeName: Invalid Inputs (returns never for type constraint compatibility)
// =============================================================================

describe("LifetimeName: invalid inputs return never", () => {
  it("returns never for level 0", () => {
    expectTypeOf<LifetimeName<0>>().toEqualTypeOf<never>();
  });

  it("returns never for level 4", () => {
    expectTypeOf<LifetimeName<4>>().toEqualTypeOf<never>();
  });

  it("returns never for level 99", () => {
    expectTypeOf<LifetimeName<99>>().toEqualTypeOf<never>();
  });

  it("returns never for negative level", () => {
    expectTypeOf<LifetimeName<-1>>().toEqualTypeOf<never>();
  });

  it("preserves never for empty union semantics", () => {
    // Same reasoning: never input means "no level" not "invalid level"
    expectTypeOf<LifetimeName<never>>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// DiagnosticLifetimeLevel: Valid Inputs (same behavior as LifetimeLevel)
// =============================================================================

describe("DiagnosticLifetimeLevel: valid inputs", () => {
  it("returns SINGLETON_LEVEL (1) for 'singleton'", () => {
    expectTypeOf<DiagnosticLifetimeLevel<"singleton">>().toEqualTypeOf<SINGLETON_LEVEL>();
  });

  it("returns SCOPED_LEVEL (2) for 'scoped'", () => {
    expectTypeOf<DiagnosticLifetimeLevel<"scoped">>().toEqualTypeOf<SCOPED_LEVEL>();
  });

  it("returns TRANSIENT_LEVEL (3) for 'transient'", () => {
    expectTypeOf<DiagnosticLifetimeLevel<"transient">>().toEqualTypeOf<TRANSIENT_LEVEL>();
  });
});

// =============================================================================
// DiagnosticLifetimeLevel: Invalid Inputs (returns InferenceError for IDE)
// =============================================================================

describe("DiagnosticLifetimeLevel: invalid inputs return InferenceError", () => {
  it("returns InferenceError for typo 'singletons'", () => {
    type Result = DiagnosticLifetimeLevel<"singletons">;
    // Should NOT be never
    expectTypeOf<IsNever<Result>>().toEqualTypeOf<false>();
    // Should be InferenceError
    type IsError =
      Result extends InferenceError<"LifetimeLevel", string, "singletons"> ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();
  });

  it("returns InferenceError for completely wrong string", () => {
    type Result = DiagnosticLifetimeLevel<"invalid">;
    // Should NOT be never
    expectTypeOf<IsNever<Result>>().toEqualTypeOf<false>();
    // Should be InferenceError with the invalid input captured
    type IsError = Result extends InferenceError<"LifetimeLevel", string, "invalid"> ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();
  });

  it("returns InferenceError for empty string", () => {
    type Result = DiagnosticLifetimeLevel<"">;
    expectTypeOf<IsNever<Result>>().toEqualTypeOf<false>();
    type IsError = Result extends InferenceError<"LifetimeLevel", string, ""> ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();
  });

  it("returns InferenceError for number input", () => {
    type Result = DiagnosticLifetimeLevel<1>;
    expectTypeOf<IsNever<Result>>().toEqualTypeOf<false>();
    type IsError = Result extends InferenceError<"LifetimeLevel", string, 1> ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();
  });

  it("error message mentions valid options", () => {
    type Result = DiagnosticLifetimeLevel<"wrong">;
    // The error message should guide the user to valid options
    type HasValidOptions = Result extends {
      __message: `${string}singleton${string}scoped${string}transient${string}`;
    }
      ? true
      : false;
    expectTypeOf<HasValidOptions>().toEqualTypeOf<true>();
  });

  it("preserves never for empty union semantics", () => {
    // When the input is `never` (empty union), the output should also be `never`
    // because this represents "no lifetime" not "invalid lifetime"
    expectTypeOf<DiagnosticLifetimeLevel<never>>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// DiagnosticLifetimeName: Valid Inputs (same behavior as LifetimeName)
// =============================================================================

describe("DiagnosticLifetimeName: valid inputs", () => {
  it("returns 'Singleton' for level 1", () => {
    expectTypeOf<DiagnosticLifetimeName<1>>().toEqualTypeOf<"Singleton">();
  });

  it("returns 'Scoped' for level 2", () => {
    expectTypeOf<DiagnosticLifetimeName<2>>().toEqualTypeOf<"Scoped">();
  });

  it("returns 'Transient' for level 3", () => {
    expectTypeOf<DiagnosticLifetimeName<3>>().toEqualTypeOf<"Transient">();
  });
});

// =============================================================================
// DiagnosticLifetimeName: Invalid Inputs (returns InferenceError for IDE)
// =============================================================================

describe("DiagnosticLifetimeName: invalid inputs return InferenceError", () => {
  it("returns InferenceError for level 0", () => {
    type Result = DiagnosticLifetimeName<0>;
    expectTypeOf<IsNever<Result>>().toEqualTypeOf<false>();
    type IsError = Result extends InferenceError<"LifetimeName", string, 0> ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();
  });

  it("returns InferenceError for level 4", () => {
    type Result = DiagnosticLifetimeName<4>;
    expectTypeOf<IsNever<Result>>().toEqualTypeOf<false>();
    type IsError = Result extends InferenceError<"LifetimeName", string, 4> ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();
  });

  it("returns InferenceError for level 99", () => {
    type Result = DiagnosticLifetimeName<99>;
    expectTypeOf<IsNever<Result>>().toEqualTypeOf<false>();
    type IsError = Result extends InferenceError<"LifetimeName", string, 99> ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();
  });

  it("returns InferenceError for negative level", () => {
    type Result = DiagnosticLifetimeName<-1>;
    expectTypeOf<IsNever<Result>>().toEqualTypeOf<false>();
    type IsError = Result extends InferenceError<"LifetimeName", string, -1> ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();
  });

  it("error message mentions valid levels", () => {
    type Result = DiagnosticLifetimeName<99>;
    // The error message should guide the user to valid levels
    type HasValidLevels = Result extends { __message: `${string}1${string}2${string}3${string}` }
      ? true
      : false;
    expectTypeOf<HasValidLevels>().toEqualTypeOf<true>();
  });

  it("preserves never for empty union semantics", () => {
    // Same reasoning: never input means "no level" not "invalid level"
    expectTypeOf<DiagnosticLifetimeName<never>>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// Union Distribution Tests (recommended by TypeScript expert review)
// =============================================================================

describe("LifetimeLevel: union distribution", () => {
  it("distributes over valid unions", () => {
    expectTypeOf<LifetimeLevel<"singleton" | "scoped">>().toEqualTypeOf<1 | 2>();
  });

  it("distributes over mixed valid/invalid unions (never disappears)", () => {
    // Valid members produce levels, invalid members produce never
    // "never" disappears in union, so only valid results remain
    expectTypeOf<LifetimeLevel<"singleton" | "invalid">>().toEqualTypeOf<1>();
  });

  it("returns never for all-invalid union", () => {
    expectTypeOf<LifetimeLevel<"invalid" | "wrong">>().toEqualTypeOf<never>();
  });
});

describe("LifetimeName: union distribution", () => {
  it("distributes over valid unions", () => {
    expectTypeOf<LifetimeName<1 | 2>>().toEqualTypeOf<"Singleton" | "Scoped">();
  });

  it("distributes over mixed valid/invalid unions (never disappears)", () => {
    expectTypeOf<LifetimeName<1 | 99>>().toEqualTypeOf<"Singleton">();
  });
});

describe("DiagnosticLifetimeLevel: union distribution", () => {
  it("distributes over valid unions", () => {
    expectTypeOf<DiagnosticLifetimeLevel<"singleton" | "scoped">>().toEqualTypeOf<1 | 2>();
  });

  it("preserves both valid and error results in union", () => {
    type Result = DiagnosticLifetimeLevel<"singleton" | "invalid">;
    // Should be 1 | InferenceError<...>
    // Check that 1 is part of the union
    type HasOne = 1 extends Result ? true : false;
    expectTypeOf<HasOne>().toEqualTypeOf<true>();
    // Check that InferenceError is also part of the union
    type HasError = Result extends 1 ? false : true;
    expectTypeOf<HasError>().toEqualTypeOf<true>();
  });
});

describe("DiagnosticLifetimeName: union distribution", () => {
  it("distributes over valid unions", () => {
    expectTypeOf<DiagnosticLifetimeName<1 | 2>>().toEqualTypeOf<"Singleton" | "Scoped">();
  });

  it("preserves both valid and error results in union", () => {
    type Result = DiagnosticLifetimeName<1 | 99>;
    // Check that "Singleton" is part of the union
    type HasSingleton = "Singleton" extends Result ? true : false;
    expectTypeOf<HasSingleton>().toEqualTypeOf<true>();
    // Check that the result is not just "Singleton" (error is also present)
    type IsOnlySingleton = Result extends "Singleton" ? true : false;
    expectTypeOf<IsOnlySingleton>().toEqualTypeOf<false>();
  });
});
