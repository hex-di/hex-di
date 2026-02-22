import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.flip}. Swaps the `Ok` and `Err`
 * channels: `Ok(v)` becomes `Err(v)` and `Err(e)` becomes `Ok(e)`.
 *
 * @typeParam T - The success type (becomes the error type after flip).
 * @typeParam E - The error type (becomes the success type after flip).
 * @returns A function that takes a `Result<T, E>` and returns `Result<E, T>`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, flip } from '@hex-di/result/fn';
 *
 * pipe(ok(42), flip());   // Err(42)
 * pipe(err("x"), flip()); // Ok("x")
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function flip<T, E>(): (result: Result<T, E>) => Result<E, T> {
  return (result) => result.flip();
}
