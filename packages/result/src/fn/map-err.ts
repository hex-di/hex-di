import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.mapErr}. Applies `f` to the
 * error value if `Err`, otherwise passes the `Ok` through unchanged.
 *
 * @typeParam E - The input error type.
 * @typeParam F - The output error type.
 * @param f - The function to apply to the `Err` value.
 * @returns A function that takes a `Result<T, E>` and returns `Result<T, F>`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, mapErr } from '@hex-di/result/fn';
 *
 * pipe(err("bad"), mapErr(e => new Error(e))); // Err(Error("bad"))
 * pipe(ok(42), mapErr(e => new Error(e)));     // Ok(42)
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function mapErr<E, F>(f: (error: E) => F): <T>(result: Result<T, E>) => Result<T, F> {
  return (result) => result.mapErr(f);
}
