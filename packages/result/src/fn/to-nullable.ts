import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.toNullable}. Returns the `Ok`
 * value or `null` if the result is `Err`.
 *
 * @typeParam T - The success type.
 * @typeParam E - The error type.
 * @returns A function that takes a `Result<T, E>` and returns `T | null`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, toNullable } from '@hex-di/result/fn';
 *
 * pipe(ok(42), toNullable());     // 42
 * pipe(err("x"), toNullable());   // null
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function toNullable<T, E>(): (result: Result<T, E>) => T | null {
  return (result) => result.toNullable();
}
