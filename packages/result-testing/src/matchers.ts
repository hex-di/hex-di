/**
 * Vitest matchers and assertion helpers for @hex-di/result.
 *
 * @packageDocumentation
 */

import type { Result, Ok, Err, ResultAsync } from "@hex-di/result";
import { expect } from "vitest";

// =============================================================================
// Assertion Helpers (type-narrowing)
// =============================================================================

/**
 * Asserts that a Result is Ok and returns the value.
 *
 * @param result - The Result to assert
 * @returns The Ok value
 * @throws If the result is an Err
 */
export function expectOk<T, E>(result: Result<T, E>): T {
  expect(result._tag).toBe("Ok");
  if (result._tag === "Err") {
    throw new Error(`Expected Ok but got Err: ${JSON.stringify(result.error)}`);
  }
  if (result._tag !== "Ok") {
    throw new Error("Expected Ok but got unknown Result variant");
  }
  return result.value;
}

/**
 * Asserts that a Result is Err and returns the error.
 *
 * @param result - The Result to assert
 * @returns The Err error
 * @throws If the result is Ok
 */
export function expectErr<T, E>(result: Result<T, E>): E {
  expect(result._tag).toBe("Err");
  if (result._tag === "Ok") {
    throw new Error(`Expected Err but got Ok: ${JSON.stringify(result.value)}`);
  }
  if (result._tag !== "Err") {
    throw new Error("Expected Err but got unknown Result variant");
  }
  return result.error;
}

/**
 * Asserts that a ResultAsync resolves to Ok and returns the value.
 *
 * @param resultAsync - The ResultAsync to assert
 * @returns The Ok value
 * @throws If the result resolves to Err
 */
export async function expectOkAsync<T, E>(resultAsync: ResultAsync<T, E>): Promise<T> {
  const result = await resultAsync;
  return expectOk(result);
}

/**
 * Asserts that a ResultAsync resolves to Err and returns the error.
 *
 * @param resultAsync - The ResultAsync to assert
 * @returns The Err error
 * @throws If the result resolves to Ok
 */
export async function expectErrAsync<T, E>(resultAsync: ResultAsync<T, E>): Promise<E> {
  const result = await resultAsync;
  return expectErr(result);
}

// =============================================================================
// Custom Vitest Matchers
// =============================================================================

/**
 * Custom Vitest matchers for Result types.
 *
 * Usage:
 * ```typescript
 * import { setupResultMatchers } from "@hex-di/result-testing";
 *
 * setupResultMatchers();
 *
 * expect(ok(42)).toBeOk();
 * expect(ok(42)).toBeOk(42);
 * expect(err("fail")).toBeErr();
 * expect(err("fail")).toBeErr("fail");
 * ```
 */
export function setupResultMatchers(): void {
  expect.extend({
    toBeOk(received: Result<unknown, unknown>, expected?: unknown) {
      const pass =
        received._tag === "Ok" && (expected === undefined || isDeepEqual(received.value, expected));

      if (pass) {
        return {
          message: () =>
            expected === undefined
              ? `expected result not to be Ok`
              : `expected result not to be Ok(${formatValue(expected)})`,
          pass: true,
        };
      }

      if (received._tag === "Err") {
        return {
          message: () =>
            `expected result to be Ok${expected !== undefined ? `(${formatValue(expected)})` : ""} but got Err(${formatValue(received.error)})`,
          pass: false,
        };
      }

      // received._tag === "Ok" but value mismatch (narrowed to Ok here)
      return {
        message: () =>
          `expected result to be Ok(${formatValue(expected)}) but got Ok(${formatValue(received.value)})`,
        pass: false,
      };
    },

    toBeErr(received: Result<unknown, unknown>, expected?: unknown) {
      const pass =
        received._tag === "Err" &&
        (expected === undefined || isDeepEqual(received.error, expected));

      if (pass) {
        return {
          message: () =>
            expected === undefined
              ? `expected result not to be Err`
              : `expected result not to be Err(${formatValue(expected)})`,
          pass: true,
        };
      }

      if (received._tag === "Ok") {
        return {
          message: () =>
            `expected result to be Err${expected !== undefined ? `(${formatValue(expected)})` : ""} but got Ok(${formatValue(received.value)})`,
          pass: false,
        };
      }

      // received._tag === "Err" but error mismatch (narrowed to Err here)
      return {
        message: () =>
          `expected result to be Err(${formatValue(expected)}) but got Err(${formatValue(received.error)})`,
        pass: false,
      };
    },
  });
}

// =============================================================================
// Matcher Type Augmentation
// =============================================================================

declare module "vitest" {
  interface Assertion<T> {
    /** Asserts that a Result is Ok. Optionally checks the Ok value. */
    toBeOk(expected?: unknown): void;
    /** Asserts that a Result is Err. Optionally checks the Err error. */
    toBeErr(expected?: unknown): void;
  }
  interface AsymmetricMatchersContaining {
    toBeOk(expected?: unknown): void;
    toBeErr(expected?: unknown): void;
  }
}

// =============================================================================
// Internal Helpers
// =============================================================================

function formatValue(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isDeepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== "object") return false;

  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}
