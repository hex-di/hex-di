/**
 * GxP test utilities for verifying structural and behavioral properties
 * required by @hex-di/result's invariants.
 *
 * @see {@link https://github.com/hex-di/hex-di | @hex-di/result}
 * @since 0.2.0
 * @packageDocumentation
 */

import type { Result, ResultAsync } from "@hex-di/result";
import { RESULT_BRAND, OPTION_BRAND, isResult } from "@hex-di/result";

/**
 * Asserts that the given value is frozen (Object.isFrozen).
 *
 * @example
 * ```ts
 * expectFrozen(ok(42)); // passes
 * ```
 *
 * @param value - The value to check
 * @throws If the value is null, undefined, or not frozen
 * @see BEH-T04-001
 * @since 0.2.0
 */
export function expectFrozen(value: unknown): void {
  if (value === null) {
    throw new Error("Expected value to be frozen, but received null");
  }
  if (value === undefined) {
    throw new Error("Expected value to be frozen, but received undefined");
  }
  if (!Object.isFrozen(value)) {
    let preview: string;
    try {
      const json = JSON.stringify(value);
      preview = json.length > 100 ? json.slice(0, 100) : json;
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string -- Fallback for non-serializable objects
      preview = String(value);
    }
    throw new Error(
      `Expected value to be frozen (Object.isFrozen), but it is not: ${preview}`,
    );
  }
}

/**
 * Asserts that the given value carries the RESULT_BRAND symbol property.
 *
 * @example
 * ```ts
 * expectResultBrand(ok(42)); // passes
 * expectResultBrand({ _tag: "Ok", value: 42 }); // throws
 * ```
 *
 * @param value - The value to check
 * @throws If the value is not an object or lacks RESULT_BRAND
 * @see BEH-T04-002
 * @since 0.2.0
 */
export function expectResultBrand(value: unknown): void {
  if (value === null || value === undefined || typeof value !== "object") {
    throw new Error(
      `Expected an object, but received ${value === null ? "null" : typeof value}`,
    );
  }
  if (!(RESULT_BRAND in value)) {
    throw new Error(
      "Expected value to carry RESULT_BRAND symbol, but it does not",
    );
  }
}

/**
 * Asserts that the given value carries the OPTION_BRAND symbol property.
 *
 * @example
 * ```ts
 * expectOptionBrand(some(42)); // passes
 * expectOptionBrand({ _tag: "Some", value: 42 }); // throws
 * ```
 *
 * @param value - The value to check
 * @throws If the value is not an object or lacks OPTION_BRAND
 * @see BEH-T04-003
 * @since 0.2.0
 */
export function expectOptionBrand(value: unknown): void {
  if (value === null || value === undefined || typeof value !== "object") {
    throw new Error(
      `Expected an object, but received ${value === null ? "null" : typeof value}`,
    );
  }
  if (!(OPTION_BRAND in value)) {
    throw new Error(
      "Expected value to carry OPTION_BRAND symbol, but it does not",
    );
  }
}

/**
 * Compound assertion verifying all immutability and integrity properties of a Result.
 * Checks: frozen, branded, valid _tag, and appropriate field exists.
 *
 * @example
 * ```ts
 * expectImmutableResult(ok(42)); // passes
 * expectImmutableResult(err("fail")); // passes
 * ```
 *
 * @param result - The Result to check
 * @throws If any immutability or integrity check fails
 * @see BEH-T04-004
 * @since 0.2.0
 */
export function expectImmutableResult<T, E>(result: Result<T, E>): void {
  expectFrozen(result);
  expectResultBrand(result);

  const tag = (result as { _tag: string })._tag;
  if (tag !== "Ok" && tag !== "Err") {
    throw new Error(
      `Expected _tag to be "Ok" or "Err", but got "${String(tag)}"`,
    );
  }

  if (tag === "Ok") {
    if (!("value" in result)) {
      throw new Error('Expected Ok result to have "value" property');
    }
  } else {
    if (!("error" in result)) {
      throw new Error('Expected Err result to have "error" property');
    }
  }
}

/**
 * Verifies that a ResultAsync's internal promise resolves (never rejects).
 * The resolved value must be a genuine Result (via isResult).
 *
 * @example
 * ```ts
 * await expectNeverRejects(ResultAsync.ok(42)); // passes
 * await expectNeverRejects(ResultAsync.err("fail")); // passes
 * ```
 *
 * @param resultAsync - The ResultAsync to check
 * @throws If the resolved value is not a genuine Result
 * @see BEH-T04-005
 * @since 0.2.0
 */
export async function expectNeverRejects(
  resultAsync: ResultAsync<unknown, unknown>,
): Promise<void> {
  const resolved = await resultAsync;
  if (!isResult(resolved)) {
    throw new Error(
      `Expected ResultAsync to resolve to a Result, but got: ${String(resolved)}`,
    );
  }
}
