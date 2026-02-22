import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.contains}. Returns `true` if the
 * result is `Ok` and its value equals `value` (strict equality).
 *
 * @typeParam T - The success type.
 * @param value - The value to compare against.
 * @returns A function that takes a `Result<T, E>` and returns `boolean`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, contains } from '@hex-di/result/fn';
 *
 * pipe(ok(42), contains(42));     // true
 * pipe(ok(42), contains(99));     // false
 * pipe(err("x"), contains(42));   // false
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function contains<T>(value: T): <E>(result: Result<T, E>) => boolean {
  return (result) => result.contains(value);
}
