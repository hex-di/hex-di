import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.intoTuple}. Converts the result
 * into a Go-style `[error, value]` tuple: `[null, T]` for `Ok`, `[E, null]` for `Err`.
 *
 * @typeParam T - The success type.
 * @typeParam E - The error type.
 * @returns A function that takes a `Result<T, E>` and returns `[null, T] | [E, null]`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, intoTuple } from '@hex-di/result/fn';
 *
 * pipe(ok(42), intoTuple());     // [null, 42]
 * pipe(err("x"), intoTuple());   // ["x", null]
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function intoTuple<T, E>(): (result: Result<T, E>) => [null, T] | [E, null] {
  return (result) => result.intoTuple();
}
