import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.unwrapOr}. Returns the `Ok`
 * value, or `defaultValue` if the result is `Err`.
 *
 * @typeParam U - The type of the default value.
 * @param defaultValue - The value to return if the result is `Err`.
 * @returns A function that takes a `Result<T, E>` and returns `T | U`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, unwrapOr } from '@hex-di/result/fn';
 *
 * pipe(ok(42), unwrapOr(0));     // 42
 * pipe(err("fail"), unwrapOr(0)); // 0
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function unwrapOr<U>(defaultValue: U): <T, E>(result: Result<T, E>) => T | U {
  return (result) => result.unwrapOr(defaultValue);
}
