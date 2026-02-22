import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.inspect}. Calls `f` with the
 * `Ok` value for side effects, then returns the original result unchanged.
 * Does nothing if the result is `Err`. Exceptions from `f` propagate (unlike `andTee`).
 *
 * @typeParam T - The success type.
 * @param f - The side-effect function to call with the `Ok` value.
 * @returns A function that takes a `Result<T, E>` and returns the same `Result<T, E>`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, inspect } from '@hex-di/result/fn';
 *
 * pipe(ok(42), inspect(v => console.log("value:", v))); // logs "value: 42", returns Ok(42)
 * pipe(err("x"), inspect(v => console.log(v)));         // no log, returns Err("x")
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function inspect<T>(f: (value: T) => void): <E>(result: Result<T, E>) => Result<T, E> {
  return (result) => result.inspect(f);
}
