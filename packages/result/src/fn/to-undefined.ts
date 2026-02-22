import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.toUndefined}. Returns the `Ok`
 * value or `undefined` if the result is `Err`.
 *
 * @typeParam T - The success type.
 * @typeParam E - The error type.
 * @returns A function that takes a `Result<T, E>` and returns `T | undefined`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, toUndefined } from '@hex-di/result/fn';
 *
 * pipe(ok(42), toUndefined());     // 42
 * pipe(err("x"), toUndefined());   // undefined
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function toUndefined<T, E>(): (result: Result<T, E>) => T | undefined {
  return (result) => result.toUndefined();
}
