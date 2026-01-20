/**
 * Type-level tests for InferenceError utility type and debug inference types.
 *
 * Tests that:
 * 1. InferenceError type properly captures information about type inference failures
 * 2. Debug inference types provide better error messages than silent `never` returns
 * 3. Standard inference types maintain backward compatibility (returning `never`)
 */

import { describe, it, expectTypeOf } from "vitest";
import type { InferenceError } from "../src/common/index.js";
import type {
  InferAdapterProvides,
  InferAdapterRequires,
  InferAdapterLifetime,
  DebugInferAdapterProvides,
  DebugInferAdapterRequires,
  DebugInferAdapterLifetime,
  DebugInferManyProvides,
  DebugInferManyRequires,
} from "../src/adapter/inference.js";
import { createPort } from "@hex-di/ports";
import { createAdapter } from "../src/index.js";

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

// =============================================================================
// Debug Inference Types (with InferenceError)
// =============================================================================

describe("Debug inference types", () => {
  describe("DebugInferAdapterProvides", () => {
    it("returns InferenceError for non-adapter types", () => {
      type NotAdapter = { notAnAdapter: true };
      type Result = DebugInferAdapterProvides<NotAdapter>;

      // Debug type returns InferenceError instead of never
      expectTypeOf<Result>().not.toBeNever();
      expectTypeOf<Result["__inferenceError"]>().toEqualTypeOf<true>();
      expectTypeOf<Result["__source"]>().toEqualTypeOf<"InferAdapterProvides">();
    });

    it("returns port type for valid adapters", () => {
      const LoggerPort = createPort<"Logger", { log: () => void }>("Logger");
      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      type Result = DebugInferAdapterProvides<typeof LoggerAdapter>;

      // Valid adapter returns the port type, not InferenceError
      expectTypeOf<Result>().toEqualTypeOf<typeof LoggerPort>();
    });

    it("captures the invalid input for debugging", () => {
      type BadInput = { foo: "bar"; baz: 123 };
      type Result = DebugInferAdapterProvides<BadInput>;

      expectTypeOf<Result["__input"]>().toEqualTypeOf<BadInput>();
    });
  });

  describe("DebugInferAdapterRequires", () => {
    it("returns InferenceError for non-adapter types", () => {
      type NotAdapter = { requires: ["A", "B"] };
      type Result = DebugInferAdapterRequires<NotAdapter>;

      expectTypeOf<Result>().not.toBeNever();
      expectTypeOf<Result["__inferenceError"]>().toEqualTypeOf<true>();
      expectTypeOf<Result["__source"]>().toEqualTypeOf<"InferAdapterRequires">();
    });

    it("returns never for adapters with no requirements (intentional)", () => {
      const LoggerPort = createPort<"Logger", { log: () => void }>("Logger");
      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      type Result = DebugInferAdapterRequires<typeof LoggerAdapter>;

      // Empty requirements is intentional `never`, not an error
      expectTypeOf<Result>().toBeNever();
    });

    it("returns port union for adapters with requirements", () => {
      const LoggerPort = createPort<"Logger", { log: () => void }>("Logger");
      const DatabasePort = createPort<"Database", { query: () => void }>("Database");
      const UserServicePort = createPort<"UserService", { getUser: () => void }>("UserService");

      const UserServiceAdapter = createAdapter({
        provides: UserServicePort,
        requires: [LoggerPort, DatabasePort],
        lifetime: "singleton",
        factory: () => ({ getUser: () => {} }),
      });

      type Result = DebugInferAdapterRequires<typeof UserServiceAdapter>;

      // Returns union of required ports
      expectTypeOf<Result>().toEqualTypeOf<typeof LoggerPort | typeof DatabasePort>();
    });
  });

  describe("DebugInferAdapterLifetime", () => {
    it("returns InferenceError for non-adapter types", () => {
      type NotAdapter = { lifetime: "unknown" };
      type Result = DebugInferAdapterLifetime<NotAdapter>;

      expectTypeOf<Result>().not.toBeNever();
      expectTypeOf<Result["__inferenceError"]>().toEqualTypeOf<true>();
      expectTypeOf<Result["__source"]>().toEqualTypeOf<"InferAdapterLifetime">();
    });

    it("returns lifetime for valid adapters", () => {
      const LoggerPort = createPort<"Logger", { log: () => void }>("Logger");
      const SingletonAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      type Result = DebugInferAdapterLifetime<typeof SingletonAdapter>;

      expectTypeOf<Result>().toEqualTypeOf<"singleton">();
    });
  });

  describe("DebugInferManyProvides", () => {
    it("returns InferenceError for non-array input", () => {
      type NotArray = { adapters: "something" };
      type Result = DebugInferManyProvides<NotArray>;

      expectTypeOf<Result>().not.toBeNever();
      expectTypeOf<Result["__inferenceError"]>().toEqualTypeOf<true>();
      expectTypeOf<Result["__source"]>().toEqualTypeOf<"InferManyProvides">();
      expectTypeOf<
        Result["__message"]
      >().toEqualTypeOf<"Input is not a readonly array. Expected readonly Adapter[].">();
    });

    it("returns InferenceError for array with non-adapter elements", () => {
      type BadArray = readonly [{ notAdapter: true }];
      type Result = DebugInferManyProvides<BadArray>;

      expectTypeOf<Result>().not.toBeNever();
      expectTypeOf<Result["__inferenceError"]>().toEqualTypeOf<true>();
      expectTypeOf<
        Result["__message"]
      >().toEqualTypeOf<"Array element is not a valid Adapter type.">();
    });

    it("returns port union for valid adapter array", () => {
      const LoggerPort = createPort<"Logger", { log: () => void }>("Logger");
      const DatabasePort = createPort<"Database", { query: () => void }>("Database");

      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      const DatabaseAdapter = createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: () => {} }),
      });

      type Adapters = readonly [typeof LoggerAdapter, typeof DatabaseAdapter];
      type Result = DebugInferManyProvides<Adapters>;

      expectTypeOf<Result>().toEqualTypeOf<typeof LoggerPort | typeof DatabasePort>();
    });
  });

  describe("DebugInferManyRequires", () => {
    it("returns InferenceError for non-array input", () => {
      type NotArray = "not an array";
      type Result = DebugInferManyRequires<NotArray>;

      expectTypeOf<Result>().not.toBeNever();
      expectTypeOf<Result["__inferenceError"]>().toEqualTypeOf<true>();
      expectTypeOf<Result["__source"]>().toEqualTypeOf<"InferManyRequires">();
    });

    it("returns port union for valid adapter array with requirements", () => {
      const LoggerPort = createPort<"Logger", { log: () => void }>("Logger");
      const DatabasePort = createPort<"Database", { query: () => void }>("Database");
      const UserServicePort = createPort<"UserService", { getUser: () => void }>("UserService");

      const UserServiceAdapter = createAdapter({
        provides: UserServicePort,
        requires: [LoggerPort, DatabasePort],
        lifetime: "singleton",
        factory: () => ({ getUser: () => {} }),
      });

      type Adapters = readonly [typeof UserServiceAdapter];
      type Result = DebugInferManyRequires<Adapters>;

      expectTypeOf<Result>().toEqualTypeOf<typeof LoggerPort | typeof DatabasePort>();
    });
  });
});
