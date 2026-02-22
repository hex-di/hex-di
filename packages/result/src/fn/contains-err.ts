import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.containsErr}. Returns `true` if
 * the result is `Err` and its error equals `error` (strict equality).
 *
 * @typeParam E - The error type.
 * @param error - The error value to compare against.
 * @returns A function that takes a `Result<T, E>` and returns `boolean`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, containsErr } from '@hex-di/result/fn';
 *
 * pipe(err("x"), containsErr("x"));   // true
 * pipe(err("x"), containsErr("y"));   // false
 * pipe(ok(42), containsErr("x"));     // false
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function containsErr<E>(error: E): <T>(result: Result<T, E>) => boolean {
  return (result) => result.containsErr(error);
}
