import type { Result, ResultAsync } from "./types.js";
import { RESULT_BRAND } from "./brand.js";

/**
 * Standalone type guard that checks whether an unknown value is a {@link Result}.
 *
 * Uses a Symbol brand check -- only objects created by {@link ok} or {@link err} pass.
 * This is strictly stronger than structural checking: an object with
 * `{ _tag: "Ok", value: 42 }` but without the brand symbol will return `false`.
 *
 * @param value - The value to check.
 * @returns `true` if `value` is a branded `Result`, `false` otherwise.
 *
 * @example
 * ```ts
 * import { ok, err, isResult } from '@hex-di/result';
 *
 * isResult(ok(1));          // true
 * isResult(err('fail'));    // true
 * isResult({ _tag: 'Ok' }); // false (not branded)
 * isResult(null);           // false
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/01-types-and-guards.md | BEH-01-009}
 */
export function isResult(value: unknown): value is Result<unknown, unknown> {
  if (value === null || value === undefined || typeof value !== "object") {
    return false;
  }
  return RESULT_BRAND in value;
}

/**
 * Standalone type guard that checks whether an unknown value is a {@link ResultAsync}.
 *
 * Uses structural checking -- a non-null object with a `then` method (function) and a
 * `match` method (function) is considered a `ResultAsync`.
 *
 * @param value - The value to check.
 * @returns `true` if `value` structurally matches `ResultAsync`, `false` otherwise.
 *
 * @example
 * ```ts
 * import { ok, isResultAsync } from '@hex-di/result';
 *
 * const asyncResult = ok(42).toAsync();
 * isResultAsync(asyncResult);       // true
 * isResultAsync(Promise.resolve(1)); // false (no match method)
 * isResultAsync(null);              // false
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/01-types-and-guards.md | BEH-01-010}
 */
export function isResultAsync(value: unknown): value is ResultAsync<unknown, unknown> {
  if (value === null || value === undefined || typeof value !== "object") {
    return false;
  }
  if (!("then" in value) || typeof value.then !== "function") {
    return false;
  }
  if (!("match" in value) || typeof value.match !== "function") {
    return false;
  }
  return true;
}
