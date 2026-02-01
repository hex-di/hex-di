/**
 * Type-level tests for InferenceError utility type and debug inference types.
 *
 * Tests that:
 * 1. InferenceError type properly captures information about type inference failures
 * 2. Debug inference types provide better error messages than silent `never` returns
 * 3. Standard inference types maintain backward compatibility (returning `never`)
 */

import { describe, it, expectTypeOf } from "vitest";
import type {
  InferenceError,
  InferAdapterProvides,
  InferAdapterRequires,
  InferAdapterLifetime,
} from "@hex-di/core";
import { createPort } from "@hex-di/core";
// NOTE: Debug* types were not migrated to core - tests using them are disabled below
import { createAdapter } from "@hex-di/core";

// =============================================================================
// InferenceError Basic Behavior
// =============================================================================

describe("InferenceError", () => {
  describe("type structure", () => {
    it("has required branded property", () => {
      type TestError = InferenceError<"TestSource", "Test message", string>;

      expectTypeOf<TestError["__inferenceError"]>().toEqualTypeOf<true>();
    });

    it("captures source identifier", () => {
      type TestError = InferenceError<"InferAdapterProvides", "Not an adapter", unknown>;

      expectTypeOf<TestError["__source"]>().toEqualTypeOf<"InferAdapterProvides">();
    });

    it("captures error message", () => {
      type TestError = InferenceError<"Anywhere", "Input must be an Adapter type", unknown>;

      expectTypeOf<TestError["__message"]>().toEqualTypeOf<"Input must be an Adapter type">();
    });

    it("captures problematic input", () => {
      type BadInput = { notAnAdapter: true };
      type TestError = InferenceError<"InferAdapterProvides", "Not an adapter", BadInput>;

      expectTypeOf<TestError["__input"]>().toEqualTypeOf<BadInput>();
    });
  });

  describe("visibility in IDE", () => {
    it("is an object type, not never", () => {
      type TestError = InferenceError<"Test", "Message", unknown>;

      // InferenceError should NOT be never
      expectTypeOf<TestError>().not.toBeNever();
    });

    it("does not disappear in unions like never does", () => {
      type TestError = InferenceError<"Test", "Message", unknown>;
      type UnionWithError = string | TestError;

      // If InferenceError were `never`, this would just be `string`
      // But since it's an object, it remains in the union
      expectTypeOf<UnionWithError>().not.toEqualTypeOf<string>();
    });

    it("can be distinguished from valid results", () => {
      type ValidResult = { value: string };
      type ErrorResult = InferenceError<"Test", "Invalid input", unknown>;
      type Result = ValidResult | ErrorResult;

      // Can narrow based on __inferenceError brand
      type IsError<T> = T extends { __inferenceError: true } ? true : false;

      expectTypeOf<IsError<ValidResult>>().toEqualTypeOf<false>();
      expectTypeOf<IsError<ErrorResult>>().toEqualTypeOf<true>();
    });
  });

  describe("use cases", () => {
    it("provides context for adapter inference failures", () => {
      // When inference fails on non-adapter input, InferenceError gives context
      type NotAnAdapter = { something: "else" };
      type Result = InferAdapterProvides<NotAnAdapter>;

      // Currently returns `never` - would be better with InferenceError
      expectTypeOf<Result>().toBeNever();
    });

    it("helps debug intermediate type computations", () => {
      // Example: type that returns InferenceError on invalid input
      type SafeExtract<T, U> = T extends U
        ? T
        : InferenceError<"SafeExtract", "T is not assignable to U", T>;

      type Valid = SafeExtract<"hello", string>;
      type Invalid = SafeExtract<123, string>;

      expectTypeOf<Valid>().toEqualTypeOf<"hello">();
      expectTypeOf<Invalid["__inferenceError"]>().toEqualTypeOf<true>();
      expectTypeOf<Invalid["__message"]>().toEqualTypeOf<"T is not assignable to U">();
    });
  });
});

// =============================================================================
// Current Behavior vs Desired Behavior
// =============================================================================

describe("Current inference behavior (documents where InferenceError could help)", () => {
  describe("InferAdapterProvides", () => {
    it("returns never for non-adapter types", () => {
      type NotAdapter = { provides: "something" };
      type Result = InferAdapterProvides<NotAdapter>;

      // Currently silent `never` - could be InferenceError
      expectTypeOf<Result>().toBeNever();
    });

    it("returns port type for valid adapters", () => {
      const LoggerPort = createPort<"Logger", { log: () => void }>("Logger");
      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      type Result = InferAdapterProvides<typeof LoggerAdapter>;

      expectTypeOf<Result>().toEqualTypeOf<typeof LoggerPort>();
    });
  });

  describe("InferAdapterRequires", () => {
    it("returns never for non-adapter types", () => {
      type NotAdapter = { requires: ["A", "B"] };
      type Result = InferAdapterRequires<NotAdapter>;

      // Currently silent `never` - could be InferenceError
      expectTypeOf<Result>().toBeNever();
    });

    it("returns never for adapters with no requirements (intentional)", () => {
      const LoggerPort = createPort<"Logger", { log: () => void }>("Logger");
      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      type Result = InferAdapterRequires<typeof LoggerAdapter>;

      // This `never` is intentional - empty requirements
      expectTypeOf<Result>().toBeNever();
    });
  });

  describe("InferAdapterLifetime", () => {
    it("returns never for non-adapter types", () => {
      type NotAdapter = { lifetime: "unknown" };
      type Result = InferAdapterLifetime<NotAdapter>;

      // Standard type returns silent `never`
      expectTypeOf<Result>().toBeNever();
    });
  });
});

/*
 * =============================================================================
 * Debug Inference Types (with InferenceError) - DISABLED
 * =============================================================================
 *
 * NOTE: These tests are disabled because the Debug* inference types that return
 * InferenceError instead of `never` for bad input were never implemented.
 * The placeholder aliases above just delegate to regular inference types.
 * When Debug* types are properly implemented, these tests should be re-enabled.
 *
 * The tests verified:
 * - DebugInferAdapterProvides returns InferenceError for non-adapter types
 * - DebugInferAdapterRequires returns InferenceError for non-adapter types
 * - DebugInferAdapterLifetime returns InferenceError for non-adapter types
 * - DebugInferManyProvides returns InferenceError for non-array/invalid input
 * - DebugInferManyRequires returns InferenceError for non-array input
 * - All Debug* types return correct values for valid inputs
 */
