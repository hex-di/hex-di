import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.mapOrElse}. Applies `f` to the
 * `Ok` value, or `defaultF` to the `Err` value.
 *
 * @typeParam T - The success type.
 * @typeParam E - The error type.
 * @typeParam U - The output type.
 * @param defaultF - The function to apply to the `Err` value.
 * @param f - The function to apply to the `Ok` value.
 * @returns A function that takes a `Result<T, E>` and returns `U`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, mapOrElse } from '@hex-di/result/fn';
 *
 * pipe(ok(21), mapOrElse(e => 0, n => n * 2)); // 42
 * pipe(err("x"), mapOrElse(e => e.length, n => n * 2)); // 1
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function mapOrElse<T, E, U>(defaultF: (error: E) => U, f: (value: T) => U): (result: Result<T, E>) => U {
  return (result) => result.mapOrElse(defaultF, f);
}
