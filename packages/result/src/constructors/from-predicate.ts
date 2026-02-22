import type { Result } from "../core/types.js";
import { ok, err } from "../core/result.js";

/**
 * Creates a {@link Result} based on a predicate test against the given value.
 *
 * If the predicate returns `true`, wraps the value in `Ok`. Otherwise wraps
 * `onFalse(value)` in `Err`. When the predicate is a type guard (`value is U`),
 * the `Ok` type is narrowed to `U`.
 *
 * @typeParam T - The type of the input value.
 * @typeParam U - The narrowed type when using a type guard predicate (extends `T`).
 * @typeParam E - The error type produced by `onFalse`.
 * @param value - The value to test.
 * @param predicate - A function (or type guard) that tests the value.
 * @param onFalse - A callback that produces the error when the predicate returns `false`.
 * @returns `Ok(value)` if the predicate passes, `Err(onFalse(value))` otherwise.
 *
 * @example
 * ```ts
 * import { fromPredicate } from '@hex-di/result';
 *
 * // Boolean predicate
 * const positive = fromPredicate(
 *   5,
 *   (n) => n > 0,
 *   (n) => `${n} is not positive`
 * );
 * // positive is Ok(5)
 *
 * // Type guard predicate
 * const isString = (v: unknown): v is string => typeof v === 'string';
 * const result = fromPredicate('hello', isString, () => 'not a string');
 * // result is Ok<string, string>
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/02-creation.md | BEH-02-004}
 */
export function fromPredicate<T, U extends T, E>(
  value: T,
  predicate: (value: T) => value is U,
  onFalse: (value: T) => E
): Result<U, E>;
export function fromPredicate<T, E>(
  value: T,
  predicate: (value: T) => boolean,
  onFalse: (value: T) => E
): Result<T, E>;
export function fromPredicate<T, E>(
  value: T,
  predicate: (value: T) => boolean,
  onFalse: (value: T) => E
): Result<T, E> {
  if (predicate(value)) {
    return ok(value);
  }
  return err(onFalse(value));
}
