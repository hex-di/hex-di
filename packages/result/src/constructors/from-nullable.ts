import type { Result } from "../core/types.js";
import { ok, err } from "../core/result.js";

/**
 * Creates a {@link Result} from a nullable value.
 *
 * If the value is `null` or `undefined`, returns `Err(onNullable())`.
 * Otherwise returns `Ok(value)`. The `onNullable` callback is only
 * invoked when the value is nullish.
 *
 * @typeParam T - The type of the non-nullable value.
 * @typeParam E - The error type produced by `onNullable`.
 * @param value - The value to check, which may be `null` or `undefined`.
 * @param onNullable - A callback that produces the error value when `value` is nullish.
 * @returns `Ok(value)` if `value` is non-nullish, `Err(onNullable())` otherwise.
 *
 * @example
 * ```ts
 * import { fromNullable } from '@hex-di/result';
 *
 * const a = fromNullable('hello', () => 'was null');
 * // a is Ok('hello')
 *
 * const b = fromNullable(null, () => 'was null');
 * // b is Err('was null')
 *
 * const c = fromNullable(undefined, () => 'missing');
 * // c is Err('missing')
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/02-creation.md | BEH-02-003}
 */
export function fromNullable<T, E>(value: T | null | undefined, onNullable: () => E): Result<T, E> {
  if (value === null || value === undefined) {
    return err(onNullable());
  }
  return ok(value);
}
