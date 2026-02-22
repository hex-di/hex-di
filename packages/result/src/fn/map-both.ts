import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.mapBoth}. Applies `onOk` if `Ok`
 * or `onErr` if `Err`, returning a new `Result` in either case.
 *
 * @typeParam T - The input success type.
 * @typeParam U - The output success type.
 * @typeParam E - The input error type.
 * @typeParam F - The output error type.
 * @param onOk - The function to apply to the `Ok` value.
 * @param onErr - The function to apply to the `Err` value.
 * @returns A function that takes a `Result<T, E>` and returns `Result<U, F>`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, mapBoth } from '@hex-di/result/fn';
 *
 * pipe(ok(1), mapBoth(n => n + 1, e => `error: ${e}`)); // Ok(2)
 * pipe(err("x"), mapBoth(n => n + 1, e => `error: ${e}`)); // Err("error: x")
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function mapBoth<T, U, E, F>(onOk: (value: T) => U, onErr: (error: E) => F): (result: Result<T, E>) => Result<U, F> {
  return (result) => result.mapBoth(onOk, onErr);
}
