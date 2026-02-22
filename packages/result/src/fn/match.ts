import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.match}. Extracts a value by
 * applying `onOk` if `Ok` or `onErr` if `Err`.
 *
 * @typeParam T - The success type.
 * @typeParam E - The error type.
 * @typeParam A - The return type of `onOk`.
 * @typeParam B - The return type of `onErr`.
 * @param onOk - The function to apply to the `Ok` value.
 * @param onErr - The function to apply to the `Err` value.
 * @returns A function that takes a `Result<T, E>` and returns `A | B`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, match } from '@hex-di/result/fn';
 *
 * pipe(ok(42), match(n => `got ${n}`, e => `error: ${e}`)); // "got 42"
 * pipe(err("x"), match(n => `got ${n}`, e => `error: ${e}`)); // "error: x"
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function match<T, E, A, B>(onOk: (value: T) => A, onErr: (error: E) => B): (result: Result<T, E>) => A | B {
  return (result) => result.match(onOk, onErr);
}
