import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.map}. Applies `f` to the
 * success value if `Ok`, otherwise passes the `Err` through unchanged.
 *
 * @typeParam T - The input success type.
 * @typeParam U - The output success type.
 * @param f - The function to apply to the `Ok` value.
 * @returns A function that takes a `Result<T, E>` and returns `Result<U, E>`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, map } from '@hex-di/result/fn';
 *
 * pipe(ok(21), map(n => n * 2));   // Ok(42)
 * pipe(err("fail"), map(n => n * 2)); // Err("fail")
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function map<T, U>(f: (value: T) => U): <E>(result: Result<T, E>) => Result<U, E> {
  return (result) => result.map(f);
}
