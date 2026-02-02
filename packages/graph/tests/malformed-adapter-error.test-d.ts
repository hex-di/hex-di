/**
 * Type-level tests for MalformedAdapterError handling.
 *
 * ## Issue Being Fixed
 *
 * When `WouldAnyBeCaptive` returns `never` (due to inference failure), the check in
 * `provide.ts` line 682:
 * ```typescript
 * WouldAnyBeCaptive<...> extends CaptiveDependencyError<infer DN, infer DL, infer CP, infer CL>
 * ```
 * Will match (since `never extends anything` is true), but all inferred types are `never`.
 *
 * `CaptiveErrorMessage<never, never, never, never>` produces `never` (template literals
 * with `never` produce `never`), giving users an opaque `never` type instead of a clear
 * error message.
 *
 * ## Solution
 *
 * Replace `never` returns in `WouldAnyBeCaptive` and `ValidateAllAgainstMap` with a
 * branded error type `MalformedAdapterError` that clearly indicates the problem.
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { port } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import type { Port } from "@hex-di/core";
import type {
  WouldAnyBeCaptive,
  CaptiveDependencyError,
  CaptiveErrorMessage,
  MalformedAdapterError,
} from "../src/advanced.js";
import type { IsNever } from "@hex-di/core";

// =============================================================================
// Test Fixtures - Malformed Adapters
// =============================================================================

/**
 * An adapter missing the lifetime property entirely.
 */
type MissingLifetime = {
  readonly provides: Port<{ test: () => void }, "Test">;
  readonly requires: readonly [];
  readonly factory: () => { test: () => void };
};
type AdapterMissingLifetime = MissingLifetime;

/**
 * An adapter with an invalid lifetime value (not 'singleton' | 'scoped' | 'transient').
 */
type InvalidLifetime = {
  readonly provides: Port<{ test: () => void }, "Test">;
  readonly requires: readonly [];
  readonly lifetime: "invalid-lifetime";
  readonly factory: () => { test: () => void };
};
type AdapterInvalidLifetime = InvalidLifetime;

/**
 * A completely malformed adapter with no required properties.
 */
type CompletelyMalformedAdapter = { invalid: true };

/**
 * A valid adapter for comparison.
 */
type ValidAdapter = {
  readonly provides: Port<{ log: () => void }, "Logger">;
  readonly requires: readonly [];
  readonly lifetime: "singleton";
  readonly factory: () => { log: () => void };
};

// =============================================================================
// Document Current Buggy Behavior
// =============================================================================

describe("Current behavior documentation (before fix)", () => {
  describe("CaptiveErrorMessage with never inputs", () => {
    it("CaptiveErrorMessage<never, never, never, never> produces never", () => {
      // This is the root cause of the opaque error:
      // Template literals with `never` parameters produce `never`
      type Result = CaptiveErrorMessage<never, never, never, never>;
      expectTypeOf<Result>().toBeNever();
    });

    it("CaptiveErrorMessage with partial never still produces never", () => {
      // Even one `never` parameter contaminates the whole template literal
      type Result = CaptiveErrorMessage<"Test", never, "Dep", "Scoped">;
      expectTypeOf<Result>().toBeNever();
    });
  });

  describe("never extends CaptiveDependencyError always matches", () => {
    it("never extends CaptiveDependencyError is true", () => {
      // This is why the pattern match in provide.ts line 682 succeeds
      // even when WouldAnyBeCaptive returns `never`
      type Result =
        never extends CaptiveDependencyError<infer _DN, infer _DL, infer _CP, infer _CL>
          ? true
          : false;

      // `never extends X` is always `true` in TypeScript
      expectTypeOf<Result>().toEqualTypeOf<true>();
    });

    it("inferring from never causes CaptiveErrorMessage to produce never", () => {
      // The key insight: when we try to use the inferred types (which may be
      // constrained strings like `extends string`), template literals produce
      // widened/unexpected results. The critical issue is:
      // CaptiveErrorMessage with any problematic input produces unusable results.

      // This is why we need MalformedAdapterError - to avoid this path entirely
      type ProblematicResult = CaptiveErrorMessage<never, never, never, never>;
      expectTypeOf<ProblematicResult>().toBeNever();
    });
  });
});

// =============================================================================
// Expected Behavior After Fix
// =============================================================================

describe("MalformedAdapterError type", () => {
  it("should be exported from internal.js", () => {
    // This test verifies the type exists after we create it
    type Test = MalformedAdapterError;
    // MalformedAdapterError should be a branded error type, not never
    expectTypeOf<IsNever<Test>>().toEqualTypeOf<false>();
  });

  it("should have __errorBrand property", () => {
    type Test = MalformedAdapterError["__errorBrand"];
    expectTypeOf<Test>().toEqualTypeOf<"MalformedAdapterError">();
  });

  it("should have __valid: false property", () => {
    type Test = MalformedAdapterError["__valid"];
    expectTypeOf<Test>().toEqualTypeOf<false>();
  });

  it("should have descriptive __message property", () => {
    type Test = MalformedAdapterError["__message"];
    // The message should indicate the adapter is malformed
    type HasMalformedMessage = Test extends
      | `${string}malformed${string}`
      | `${string}Malformed${string}`
      ? true
      : false;
    expectTypeOf<HasMalformedMessage>().toEqualTypeOf<true>();
  });
});

describe("WouldAnyBeCaptive with malformed adapters", () => {
  it("should return MalformedAdapterError for adapter missing lifetime", () => {
    type EmptyMap = Record<string, never>;
    type Result = WouldAnyBeCaptive<EmptyMap, readonly [AdapterMissingLifetime]>;

    // After the fix: should return MalformedAdapterError, not `never`
    type IsMalformedError = Result extends MalformedAdapterError ? true : false;
    expectTypeOf<IsMalformedError>().toEqualTypeOf<true>();
  });

  it("should return MalformedAdapterError for adapter with invalid lifetime", () => {
    type EmptyMap = Record<string, never>;
    type Result = WouldAnyBeCaptive<EmptyMap, readonly [AdapterInvalidLifetime]>;

    // After the fix: should return MalformedAdapterError, not `never`
    type IsMalformedError = Result extends MalformedAdapterError ? true : false;
    expectTypeOf<IsMalformedError>().toEqualTypeOf<true>();
  });

  it("should return MalformedAdapterError for completely malformed adapter", () => {
    type EmptyMap = Record<string, never>;
    type Result = WouldAnyBeCaptive<EmptyMap, readonly [CompletelyMalformedAdapter]>;

    // After the fix: should return MalformedAdapterError, not `never`
    type IsMalformedError = Result extends MalformedAdapterError ? true : false;
    expectTypeOf<IsMalformedError>().toEqualTypeOf<true>();
  });

  it("should NOT be never for malformed adapters", () => {
    type EmptyMap = Record<string, never>;
    type Result = WouldAnyBeCaptive<EmptyMap, readonly [AdapterMissingLifetime]>;

    // The result should NOT be `never` - that's the bug we're fixing
    expectTypeOf<IsNever<Result>>().toEqualTypeOf<false>();
  });

  it("should still return false for valid adapters with no captive deps", () => {
    type EmptyMap = Record<string, never>;
    type Result = WouldAnyBeCaptive<EmptyMap, readonly [ValidAdapter]>;

    // Valid adapter with no captive deps should still return false
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("should still return CaptiveDependencyError for actual captive deps", () => {
    // A map with a scoped dependency
    type MapWithScoped = { Database: 2 }; // Level 2 = scoped

    // Singleton depending on scoped = captive
    type SingletonDependingOnScoped = {
      readonly provides: Port<{ getUser: () => void }, "UserService">;
      readonly requires: readonly [Port<{ query: () => void }, "Database">];
      readonly lifetime: "singleton";
      readonly factory: () => { getUser: () => void };
    };

    type Result = WouldAnyBeCaptive<MapWithScoped, readonly [SingletonDependingOnScoped]>;

    // Should detect the captive dependency
    type IsCaptiveError =
      Result extends CaptiveDependencyError<string, string, string, string> ? true : false;
    expectTypeOf<IsCaptiveError>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Integration: provideMany with MalformedAdapterError
// =============================================================================

describe("GraphBuilder.provideMany with malformed adapters", () => {
  it("should show MalformedAdapterErrorMessage instead of opaque never", () => {
    // Test at the type level: WouldAnyBeCaptive with a malformed adapter
    // should return MalformedAdapterError, which then gets converted to
    // MalformedAdapterErrorMessage by ProvideManyResult

    type MalformedAdapterType = {
      readonly provides: Port<{ test: () => void }, "Test">;
      readonly requires: readonly [];
      // lifetime is missing at type level!
      readonly factory: () => { test: () => void };
    };

    // Verify WouldAnyBeCaptive returns MalformedAdapterError
    type CaptiveResult = WouldAnyBeCaptive<Record<string, never>, readonly [MalformedAdapterType]>;

    type IsMalformedError = CaptiveResult extends MalformedAdapterError ? true : false;
    expectTypeOf<IsMalformedError>().toEqualTypeOf<true>();

    // The MalformedAdapterError should NOT be never
    type IsNotNever = IsNever<CaptiveResult> extends true ? false : true;
    expectTypeOf<IsNotNever>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Type Guard Tests
// =============================================================================

describe("MalformedAdapterError discrimination", () => {
  it("MalformedAdapterError should NOT extend CaptiveDependencyError", () => {
    // This is important: MalformedAdapterError must not accidentally match
    // the CaptiveDependencyError pattern
    type Test =
      MalformedAdapterError extends CaptiveDependencyError<
        infer _DN,
        infer _DL,
        infer _CP,
        infer _CL
      >
        ? true
        : false;

    expectTypeOf<Test>().toEqualTypeOf<false>();
  });

  it("false should NOT extend MalformedAdapterError", () => {
    // Normal success (false) should not be confused with MalformedAdapterError
    type Test = false extends MalformedAdapterError ? true : false;
    expectTypeOf<Test>().toEqualTypeOf<false>();
  });

  it("CaptiveDependencyError should NOT extend MalformedAdapterError", () => {
    // Real captive errors should not be confused with MalformedAdapterError
    type Test =
      CaptiveDependencyError<"A", "Singleton", "B", "Scoped"> extends MalformedAdapterError
        ? true
        : false;
    expectTypeOf<Test>().toEqualTypeOf<false>();
  });
});
