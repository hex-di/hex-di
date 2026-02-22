/**
 * Custom Vitest matchers for Result and Option types.
 *
 * @see {@link https://github.com/hex-di/hex-di | @hex-di/result}
 * @since 0.1.0
 * @packageDocumentation
 */

import { expect } from "vitest";

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Formats a value for error messages. Uses JSON.stringify with String fallback.
 *
 * @internal
 */
function formatValue(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Validates that the received value looks like a Result (_tag is "Ok" or "Err").
 * Throws on invalid input so that `.not` cannot invert the failure.
 *
 * @internal
 */
function validateResultInput(received: unknown): void {
  if (received === null) {
    throw new Error("expected a Result but received null");
  }
  if (received === undefined) {
    throw new Error("expected a Result but received undefined");
  }
  if (typeof received !== "object") {
    throw new Error(`expected a Result but received ${typeof received}`);
  }
  const obj = received as Record<string, unknown>;
  if (!("_tag" in obj)) {
    throw new Error("expected a Result but received an object without _tag");
  }
  if (obj._tag !== "Ok" && obj._tag !== "Err") {
    throw new Error(
      `expected a Result (Ok or Err) but received object with _tag "${String(obj._tag)}"`,
    );
  }
}

/**
 * Validates that the received value looks like an Option (_tag is "Some" or "None").
 * Throws on invalid input so that `.not` cannot invert the failure.
 *
 * @internal
 */
function validateOptionInput(received: unknown): void {
  if (received === null) {
    throw new Error("expected an Option but received null");
  }
  if (received === undefined) {
    throw new Error("expected an Option but received undefined");
  }
  if (typeof received !== "object") {
    throw new Error(`expected an Option but received ${typeof received}`);
  }
  const obj = received as Record<string, unknown>;
  if (!("_tag" in obj)) {
    throw new Error("expected an Option but received an object without _tag");
  }
  if (obj._tag !== "Some" && obj._tag !== "None") {
    throw new Error(
      `expected an Option (Some or None) but received object with _tag "${String(obj._tag)}"`,
    );
  }
}

// =============================================================================
// Custom Vitest Matchers
// =============================================================================

/**
 * Registers all custom Result and Option matchers with Vitest.
 * Must be called once before any matcher is used.
 *
 * Calling multiple times is safe (idempotent, TINV-3).
 *
 * @example
 * ```ts
 * import { setupResultMatchers } from "@hex-di/result-testing";
 * setupResultMatchers();
 *
 * expect(ok(42)).toBeOk();
 * expect(err("fail")).toBeErr();
 * ```
 *
 * @see BEH-T02-001
 * @since 0.1.0
 */
export function setupResultMatchers(): void {
  expect.extend({
    /**
     * Asserts that a Result is Ok. Optionally checks deep equality of the value.
     * @see BEH-T02-002
     */
    toBeOk(received: unknown, expected?: unknown) {
      validateResultInput(received);
      const result = received as { _tag: string; value?: unknown; error?: unknown };
      const pass =
        result._tag === "Ok" &&
        (expected === undefined || this.equals(result.value, expected));

      if (pass) {
        return {
          message: () =>
            expected === undefined
              ? "expected result not to be Ok"
              : `expected result not to be Ok(${formatValue(expected)})`,
          pass: true,
        };
      }

      if (result._tag === "Err") {
        return {
          message: () =>
            expected !== undefined
              ? `expected result to be Ok(${formatValue(expected)}) but got Err(${formatValue(result.error)})`
              : `expected result to be Ok but got Err(${formatValue(result.error)})`,
          pass: false,
        };
      }

      return {
        message: () =>
          `expected result to be Ok(${formatValue(expected)}) but got Ok(${formatValue(result.value)})`,
        pass: false,
      };
    },

    /**
     * Asserts that a Result is Err. Optionally checks deep equality of the error.
     * @see BEH-T02-003
     */
    toBeErr(received: unknown, expected?: unknown) {
      validateResultInput(received);
      const result = received as { _tag: string; value?: unknown; error?: unknown };
      const pass =
        result._tag === "Err" &&
        (expected === undefined || this.equals(result.error, expected));

      if (pass) {
        return {
          message: () =>
            expected === undefined
              ? "expected result not to be Err"
              : `expected result not to be Err(${formatValue(expected)})`,
          pass: true,
        };
      }

      if (result._tag === "Ok") {
        return {
          message: () =>
            expected !== undefined
              ? `expected result to be Err(${formatValue(expected)}) but got Ok(${formatValue(result.value)})`
              : `expected result to be Err but got Ok(${formatValue(result.value)})`,
          pass: false,
        };
      }

      return {
        message: () =>
          `expected result to be Err(${formatValue(expected)}) but got Err(${formatValue(result.error)})`,
        pass: false,
      };
    },

    /**
     * Asserts that a Result is Ok with a specific value (required argument).
     * @see BEH-T02-004
     */
    toBeOkWith(received: unknown, expected: unknown) {
      validateResultInput(received);
      const result = received as { _tag: string; value?: unknown; error?: unknown };
      const pass = result._tag === "Ok" && this.equals(result.value, expected);

      if (pass) {
        return {
          message: () => `expected result not to be Ok(${formatValue(expected)})`,
          pass: true,
        };
      }

      if (result._tag === "Err") {
        return {
          message: () =>
            `expected result to be Ok(${formatValue(expected)}) but got Err(${formatValue(result.error)})`,
          pass: false,
        };
      }

      return {
        message: () =>
          `expected Ok(${formatValue(expected)}) but got Ok(${formatValue(result.value)})`,
        pass: false,
      };
    },

    /**
     * Asserts that a Result is Err with a specific error (required argument).
     * @see BEH-T02-005
     */
    toBeErrWith(received: unknown, expected: unknown) {
      validateResultInput(received);
      const result = received as { _tag: string; value?: unknown; error?: unknown };
      const pass = result._tag === "Err" && this.equals(result.error, expected);

      if (pass) {
        return {
          message: () => `expected result not to be Err(${formatValue(expected)})`,
          pass: true,
        };
      }

      if (result._tag === "Ok") {
        return {
          message: () =>
            `expected result to be Err(${formatValue(expected)}) but got Ok(${formatValue(result.value)})`,
          pass: false,
        };
      }

      return {
        message: () =>
          `expected Err(${formatValue(expected)}) but got Err(${formatValue(result.error)})`,
        pass: false,
      };
    },

    /**
     * Asserts that an Option is Some. Optionally checks deep equality of the value.
     * @see BEH-T02-006
     */
    toBeSome(received: unknown, expected?: unknown) {
      validateOptionInput(received);
      const option = received as { _tag: string; value?: unknown };
      const pass =
        option._tag === "Some" &&
        (expected === undefined || this.equals(option.value, expected));

      if (pass) {
        return {
          message: () =>
            expected === undefined
              ? "expected option not to be Some"
              : `expected option not to be Some(${formatValue(expected)})`,
          pass: true,
        };
      }

      if (option._tag === "None") {
        return {
          message: () =>
            expected !== undefined
              ? `expected option to be Some(${formatValue(expected)}) but got None`
              : "expected option to be Some but got None",
          pass: false,
        };
      }

      return {
        message: () =>
          `expected option to be Some(${formatValue(expected)}) but got Some(${formatValue(option.value)})`,
        pass: false,
      };
    },

    /**
     * Asserts that an Option is None.
     * @see BEH-T02-007
     */
    toBeNone(received: unknown) {
      validateOptionInput(received);
      const option = received as { _tag: string; value?: unknown };
      const pass = option._tag === "None";

      if (pass) {
        return {
          message: () => "expected option not to be None",
          pass: true,
        };
      }

      return {
        message: () =>
          `expected option to be None but got Some(${formatValue(option.value)})`,
        pass: false,
      };
    },

    /**
     * Asserts that a Result is Ok and contains the value (strict === via Result.contains()).
     * @see BEH-T02-008
     */
    toContainOk(received: unknown, value: unknown) {
      validateResultInput(received);
      const result = received as {
        _tag: string;
        value?: unknown;
        error?: unknown;
        contains(v: unknown): boolean;
      };

      if (result._tag === "Err") {
        return {
          message: () =>
            `expected result to contain Ok(${formatValue(value)}) but got Err(${formatValue(result.error)})`,
          pass: false,
        };
      }

      const pass = result.contains(value);

      if (pass) {
        return {
          message: () => `expected result not to contain Ok(${formatValue(value)})`,
          pass: true,
        };
      }

      return {
        message: () =>
          `expected result to contain Ok(${formatValue(value)}) but Ok value is ${formatValue(result.value)}`,
        pass: false,
      };
    },

    /**
     * Asserts that a Result is Err and contains the error (strict === via Result.containsErr()).
     * @see BEH-T02-009
     */
    toContainErr(received: unknown, error: unknown) {
      validateResultInput(received);
      const result = received as {
        _tag: string;
        value?: unknown;
        error?: unknown;
        containsErr(e: unknown): boolean;
      };

      if (result._tag === "Ok") {
        return {
          message: () =>
            `expected result to contain Err(${formatValue(error)}) but got Ok(${formatValue(result.value)})`,
          pass: false,
        };
      }

      const pass = result.containsErr(error);

      if (pass) {
        return {
          message: () => `expected result not to contain Err(${formatValue(error)})`,
          pass: true,
        };
      }

      return {
        message: () =>
          `expected result to contain Err(${formatValue(error)}) but Err error is ${formatValue(result.error)}`,
        pass: false,
      };
    },
  });
}

// =============================================================================
// Matcher Type Augmentation (BEH-T05-001, BEH-T05-002)
// =============================================================================

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Assertion<T> {
    /** Asserts that a Result is Ok. Optionally checks the Ok value. */
    toBeOk(expected?: unknown): void;
    /** Asserts that a Result is Err. Optionally checks the Err error. */
    toBeErr(expected?: unknown): void;
    /** Asserts that a Result is Ok with a specific value (required argument). */
    toBeOkWith(expected: unknown): void;
    /** Asserts that a Result is Err with a specific error (required argument). */
    toBeErrWith(expected: unknown): void;
    /** Asserts that an Option is Some. Optionally checks the Some value. */
    toBeSome(expected?: unknown): void;
    /** Asserts that an Option is None. */
    toBeNone(): void;
    /** Asserts that a Result is Ok and contains the value (strict === via Result.contains()). */
    toContainOk(value: unknown): void;
    /** Asserts that a Result is Err and contains the error (strict === via Result.containsErr()). */
    toContainErr(error: unknown): void;
  }
  interface AsymmetricMatchersContaining {
    toBeOk(expected?: unknown): void;
    toBeErr(expected?: unknown): void;
    toBeOkWith(expected: unknown): void;
    toBeErrWith(expected: unknown): void;
    toBeSome(expected?: unknown): void;
    toBeNone(): void;
    toContainOk(value: unknown): void;
    toContainErr(error: unknown): void;
  }
}
