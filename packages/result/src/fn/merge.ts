import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.merge}. Extracts the inner value
 * regardless of variant: returns `value` for `Ok` or `error` for `Err`.
 *
 * @typeParam T - The success type.
 * @typeParam E - The error type.
 * @returns A function that takes a `Result<T, E>` and returns `T | E`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, merge } from '@hex-di/result/fn';
 *
 * pipe(ok(42), merge());     // 42
 * pipe(err("x"), merge());   // "x"
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function merge<T, E>(): (result: Result<T, E>) => T | E {
  return (result) => result.merge();
}
