/**
 * Type-level tests for batch captive validation soundness.
 *
 * These tests verify that the batch captive detection types fail safely
 * (return `never` or error) instead of silently passing (returning `false`)
 * when encountering edge cases or malformed inputs.
 *
 * ## Issue Being Tested
 *
 * In `detection.ts`, `ValidateAllAgainstMap` has fallback branches that return
 * `false` when they should return `never`:
 *
 * - Line 392: When `CaptivePort` is not a string (unexpected type)
 * - Line 393: When `infer CaptivePort` fails
 * - Line 363 in `WouldAnyBeCaptive`: When `AddManyLifetimes` fails
 *
 * Returning `false` silently passes validation. For soundness, these should
 * return `never` to fail closed.
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import type {
  WouldAnyBeCaptive,
  AddManyLifetimes,
  FindAnyCaptiveDependency,
  CaptiveDependencyError,
} from "../src/internal.js";
import type { IsNever } from "../src/types/type-utilities.js";

// =============================================================================
// Test Fixtures - Malformed Adapters
// =============================================================================

/**
 * An adapter with a completely invalid structure (no required properties).
 * This should not pass validation silently.
 */
type MalformedAdapter = { invalid: true };

/**
 * An adapter missing the lifetime property.
 */
type AdapterMissingLifetime = {
  provides: { __portName: "Test" };
  requires: readonly [];
  factory: () => unknown;
};

/**
 * An adapter with an invalid lifetime value.
 */
type AdapterInvalidLifetime = {
  provides: { __portName: "Test" };
  requires: readonly [];
  lifetime: "invalid-lifetime"; // Not 'singleton' | 'scoped' | 'transient'
  factory: () => unknown;
};

/**
 * A well-formed singleton adapter for comparison.
 */
type ValidSingletonAdapter = {
  provides: { __portName: "Logger" };
  requires: readonly [];
  lifetime: "singleton";
  factory: () => { log: () => void };
};

/**
 * A well-formed scoped adapter that would create captive if singleton depends on it.
 */
type ValidScopedAdapter = {
  provides: { __portName: "Database" };
  requires: readonly [];
  lifetime: "scoped";
  factory: () => { query: () => void };
};

// =============================================================================
// AddManyLifetimes Edge Case Tests
// =============================================================================

describe("AddManyLifetimes soundness", () => {
  it("handles empty adapter tuple", () => {
    type EmptyMap = {};
    type Result = AddManyLifetimes<EmptyMap, readonly []>;

    // Empty tuple should return the input map unchanged
    expectTypeOf<Result>().toEqualTypeOf<EmptyMap>();
  });

  it("handles valid adapters correctly", () => {
    type EmptyMap = {};
    type Result = AddManyLifetimes<EmptyMap, readonly [ValidSingletonAdapter, ValidScopedAdapter]>;

    // Should produce a map with both lifetimes
    // Can't easily test the exact structure, but it should not be never
    type ResultIsNever = IsNever<Result>;
    expectTypeOf<ResultIsNever>().toEqualTypeOf<false>();
  });

  it("handles adapter missing lifetime - should NOT produce false", () => {
    type EmptyMap = {};
    type Result = AddManyLifetimes<EmptyMap, readonly [AdapterMissingLifetime]>;

    // The result should indicate an error or produce a map that
    // will fail downstream validation. It should NOT silently succeed.
    // When lifetime is missing, AdapterLifetimeForMap returns InvalidLifetimeErrorMessage
    // which when added to the map should propagate the error.
    type ResultIsNever = IsNever<Result>;
    // This documents current behavior - update if we change the behavior
    expectTypeOf<ResultIsNever>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// WouldAnyBeCaptive Edge Case Tests
// =============================================================================

describe("WouldAnyBeCaptive soundness", () => {
  it("returns false for empty adapter tuple (correct behavior)", () => {
    type EmptyMap = {};
    type Result = WouldAnyBeCaptive<EmptyMap, readonly []>;

    // Empty tuple has no captive dependencies - false is correct
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("returns false for valid non-captive adapters", () => {
    type EmptyMap = {};
    type Result = WouldAnyBeCaptive<EmptyMap, readonly [ValidSingletonAdapter]>;

    // Singleton with no dependencies is not captive
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("returns CaptiveDependencyError for actual captive dependency", () => {
    // Singleton depending on scoped = captive
    type SingletonDependingOnScoped = {
      provides: { __portName: "UserService" };
      requires: readonly [{ __portName: "Database" }];
      lifetime: "singleton";
      factory: () => unknown;
    };

    // First add the scoped adapter to the map
    type MapWithScoped = { Database: 2 }; // Level 2 = scoped

    type Result = WouldAnyBeCaptive<MapWithScoped, readonly [SingletonDependingOnScoped]>;

    // Should detect the captive dependency
    type IsCaptiveError =
      Result extends CaptiveDependencyError<string, string, string, string> ? true : false;
    expectTypeOf<IsCaptiveError>().toEqualTypeOf<true>();
  });

  /**
   * SOUNDNESS TEST: Malformed adapter should NOT return false (silent pass).
   *
   * This test verifies that when an adapter has malformed structure,
   * the validation does not silently pass by returning `false`.
   *
   * Currently this test documents the EXPECTED behavior after the fix.
   * If this test fails, it means the soundness issue exists.
   */
  it("handles malformed adapter - should not silently pass", () => {
    type EmptyMap = {};
    type Result = WouldAnyBeCaptive<EmptyMap, readonly [MalformedAdapter]>;

    // SOUNDNESS: A malformed adapter should NOT pass validation with `false`.
    // The result should either be `never` (fail closed) or an error type.
    // If Result is exactly `false`, the validation silently passed - unsound!
    type SilentlyPassed = Result extends false ? (false extends Result ? true : false) : false;

    // After the fix, this should NOT silently pass
    // Currently this may fail if the bug exists
    // Update expectation based on desired behavior
    expectTypeOf<SilentlyPassed>().toEqualTypeOf<false>();
  });

  /**
   * SOUNDNESS TEST: Adapter with invalid lifetime should NOT return false.
   */
  it("handles adapter with invalid lifetime - should not silently pass", () => {
    type EmptyMap = {};
    type Result = WouldAnyBeCaptive<EmptyMap, readonly [AdapterInvalidLifetime]>;

    // An adapter with invalid lifetime should not pass validation with `false`.
    type SilentlyPassed = Result extends false ? (false extends Result ? true : false) : false;

    // After the fix, this should NOT silently pass
    expectTypeOf<SilentlyPassed>().toEqualTypeOf<false>();
  });

  /**
   * SOUNDNESS TEST: Adapter missing lifetime should NOT return false.
   */
  it("handles adapter missing lifetime - should not silently pass", () => {
    type EmptyMap = {};
    type Result = WouldAnyBeCaptive<EmptyMap, readonly [AdapterMissingLifetime]>;

    // An adapter missing lifetime should not pass validation with `false`.
    type SilentlyPassed = Result extends false ? (false extends Result ? true : false) : false;

    // After the fix, this should NOT silently pass
    expectTypeOf<SilentlyPassed>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// FindAnyCaptiveDependency Edge Case Tests
// =============================================================================

describe("FindAnyCaptiveDependency soundness", () => {
  it("returns never when no captive dependencies exist", () => {
    // Singleton (level 1) depending on singleton (level 1) - not captive
    type Map = { Logger: 1 };
    type Result = FindAnyCaptiveDependency<Map, 1, "Logger">;

    expectTypeOf<Result>().toBeNever();
  });

  it("returns port name when captive dependency exists", () => {
    // Singleton (level 1) depending on scoped (level 2) - captive!
    type Map = { Database: 2 };
    type Result = FindAnyCaptiveDependency<Map, 1, "Database">;

    expectTypeOf<Result>().toEqualTypeOf<"Database">();
  });

  it("handles never as dependent level gracefully", () => {
    // When lifetime is invalid, LifetimeLevel returns never
    type Map = { Logger: 1 };
    type Result = FindAnyCaptiveDependency<Map, never, "Logger">;

    // With never as the level, the result should be never (not pass)
    // Because never distributes through conditionals
    expectTypeOf<Result>().toBeNever();
  });

  it("handles never as required port names gracefully", () => {
    type Map = { Logger: 1 };
    type Result = FindAnyCaptiveDependency<Map, 1, never>;

    // With never as port names (empty requirements), result should be never
    expectTypeOf<Result>().toBeNever();
  });
});
