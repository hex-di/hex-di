import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.andThen}. If `Ok`, applies `f`
 * to the value and returns the resulting `Result`. If `Err`, passes it through.
 *
 * @typeParam T - The input success type.
 * @typeParam U - The output success type.
 * @typeParam F - The error type that `f` may produce.
 * @param f - The function to apply to the `Ok` value, returning a new `Result`.
 * @returns A function that takes a `Result<T, E>` and returns `Result<U, E | F>`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, andThen } from '@hex-di/result/fn';
 *
 * const safeDivide = (n: number) =>
 *   n === 0 ? err("division by zero") : ok(100 / n);
 *
 * pipe(ok(5), andThen(safeDivide));  // Ok(20)
 * pipe(ok(0), andThen(safeDivide));  // Err("division by zero")
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function andThen<T, U, F>(f: (value: T) => Result<U, F>): <E>(result: Result<T, E>) => Result<U, E | F> {
  return (result) => result.andThen(f);
}
