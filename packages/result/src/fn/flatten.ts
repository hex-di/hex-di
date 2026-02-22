import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.flatten}. Removes one level of
 * nesting from a `Result<Result<T, E1>, E2>`.
 *
 * @typeParam T - The inner success type.
 * @typeParam E1 - The inner error type.
 * @typeParam E2 - The outer error type.
 * @returns A function that takes a nested `Result` and returns a flattened `Result<T, E1 | E2>`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, flatten } from '@hex-di/result/fn';
 *
 * pipe(ok(ok(42)), flatten());     // Ok(42)
 * pipe(ok(err("inner")), flatten()); // Err("inner")
 * pipe(err("outer"), flatten());   // Err("outer")
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function flatten<T, E1, E2>(): (result: Result<Result<T, E1>, E2>) => Result<T, E1 | E2> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (result) => (result as any).flatten();
}
