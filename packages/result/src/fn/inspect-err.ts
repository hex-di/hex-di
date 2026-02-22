import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.inspectErr}. Calls `f` with the
 * `Err` value for side effects, then returns the original result unchanged.
 * Does nothing if the result is `Ok`. Exceptions from `f` propagate (unlike `orTee`).
 *
 * @typeParam E - The error type.
 * @param f - The side-effect function to call with the `Err` value.
 * @returns A function that takes a `Result<T, E>` and returns the same `Result<T, E>`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, inspectErr } from '@hex-di/result/fn';
 *
 * pipe(err("x"), inspectErr(e => console.error("error:", e))); // logs "error: x", returns Err("x")
 * pipe(ok(42), inspectErr(e => console.error(e)));             // no log, returns Ok(42)
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function inspectErr<E>(f: (error: E) => void): <T>(result: Result<T, E>) => Result<T, E> {
  return (result) => result.inspectErr(f);
}
