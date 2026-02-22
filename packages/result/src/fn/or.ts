import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.or}. Returns the input if `Ok`,
 * otherwise returns `other`.
 *
 * @typeParam U - The success type of `other`.
 * @typeParam F - The error type of `other`.
 * @param other - The `Result` to return when the input is `Err`.
 * @returns A function that takes a `Result<T, E>` and returns `Result<T | U, F>`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, or } from '@hex-di/result/fn';
 *
 * pipe(ok(1), or(ok(99)));     // Ok(1)
 * pipe(err("no"), or(ok(99))); // Ok(99)
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function or<U, F>(other: Result<U, F>): <T, E>(result: Result<T, E>) => Result<T | U, F> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (result) => result.or(other) as any;
}
