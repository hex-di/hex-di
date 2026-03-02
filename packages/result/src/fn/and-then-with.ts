import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.andThenWith}. Combines `andThen`
 * (success path) and `orElse` (error path) in a single operation. The original
 * `E` is fully consumed — the new error type comes from the handlers' return types.
 *
 * @typeParam T - The input success type.
 * @typeParam E - The input error type.
 * @typeParam U - The output success type.
 * @typeParam F - The error type from `onOk`.
 * @typeParam G - The error type from `onErr`.
 * @param onOk - The function to apply to the `Ok` value, returning a new `Result`.
 * @param onErr - The function to apply to the `Err` value, returning a new `Result`.
 * @returns A function that takes a `Result<T, E>` and returns `Result<U, F | G>`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, andThenWith } from '@hex-di/result/fn';
 *
 * pipe(
 *   ok(42),
 *   andThenWith(
 *     (n) => n > 0 ? ok(n) : err("negative"),
 *     (e) => ok(0), // recover from any error
 *   ),
 * );
 * ```
 *
 * @since v1.1.0
 * @see {@link spec/result/behaviors/15-effect-error-handling.md | BEH-15-004}
 */
export function andThenWith<T, E, U, F, G>(
  onOk: (value: T) => Result<U, F>,
  onErr: (error: E) => Result<U, G>
): (result: Result<T, E>) => Result<U, F | G> {
  return result => result.andThenWith(onOk, onErr);
}
