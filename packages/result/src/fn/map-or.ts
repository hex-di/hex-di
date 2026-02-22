import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.mapOr}. Applies `f` to the `Ok`
 * value or returns `defaultValue` if `Err`.
 *
 * @typeParam T - The success type.
 * @typeParam U - The output type.
 * @param defaultValue - The value to return if the result is `Err`.
 * @param f - The function to apply to the `Ok` value.
 * @returns A function that takes a `Result<T, E>` and returns `U`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, mapOr } from '@hex-di/result/fn';
 *
 * pipe(ok(21), mapOr(0, n => n * 2)); // 42
 * pipe(err("x"), mapOr(0, n => n * 2)); // 0
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function mapOr<T, U>(defaultValue: U, f: (value: T) => U): <E>(result: Result<T, E>) => U {
  return (result) => result.mapOr(defaultValue, f);
}
