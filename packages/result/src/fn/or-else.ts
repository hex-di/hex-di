import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.orElse}. If `Err`, applies `f`
 * to the error and returns the resulting `Result`. If `Ok`, passes it through.
 *
 * @typeParam E - The input error type.
 * @typeParam U - The success type that `f` may produce.
 * @typeParam F - The output error type.
 * @param f - The function to apply to the `Err` value, returning a new `Result`.
 * @returns A function that takes a `Result<T, E>` and returns `Result<T | U, F>`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, orElse } from '@hex-di/result/fn';
 *
 * const recover = (e: string) => e === "retry" ? ok(0) : err("fatal");
 *
 * pipe(err("retry"), orElse(recover)); // Ok(0)
 * pipe(ok(42), orElse(recover));       // Ok(42)
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function orElse<E, U, F>(f: (error: E) => Result<U, F>): <T>(result: Result<T, E>) => Result<T | U, F> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (result) => result.orElse(f) as any;
}
