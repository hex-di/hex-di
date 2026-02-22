import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.and}. Returns `other` if the
 * input is `Ok`, otherwise returns the `Err` unchanged.
 *
 * @typeParam U - The success type of `other`.
 * @typeParam F - The error type of `other`.
 * @param other - The `Result` to return when the input is `Ok`.
 * @returns A function that takes a `Result<T, E>` and returns `Result<U, E | F>`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, and } from '@hex-di/result/fn';
 *
 * pipe(ok(1), and(ok("yes")));  // Ok("yes")
 * pipe(err("no"), and(ok("yes"))); // Err("no")
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function and<U, F>(other: Result<U, F>): <T, E>(result: Result<T, E>) => Result<U, E | F> {
  return (result) => result.and(other);
}
