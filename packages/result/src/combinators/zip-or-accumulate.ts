import type { Result } from "../core/types.js";
import type { InferOkTuple, InferErrUnion, NonEmptyArray } from "../type-utils.js";
import { ok, err } from "../core/result.js";

/**
 * Combines a tuple of Results. If all are Ok, returns Ok with a tuple of all values.
 * If any are Err, collects ALL errors into a NonEmptyArray (does not short-circuit).
 *
 * Similar to {@link allSettled}, but the error type is `NonEmptyArray<E>` (i.e. `[E, ...E[]]`)
 * instead of `E[]`, providing a compile-time guarantee that the error array contains at least
 * one element. Named after Kotlin Arrow's `zipOrAccumulate`.
 *
 * @example
 * ```ts
 * import { ok, err, zipOrAccumulate } from '@hex-di/result';
 *
 * const success = zipOrAccumulate(ok(1), ok("hello"), ok(true));
 * // => Ok<[number, string, boolean]>
 *
 * const failed = zipOrAccumulate(ok(1), err("a"), err("b"));
 * // => Err(["a", "b"]) — NonEmptyArray guarantees at least one error
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/05-composition.md — BEH-05-007
 */
export function zipOrAccumulate<R extends readonly Result<unknown, unknown>[]>(
  ...results: R
): Result<InferOkTuple<R>, NonEmptyArray<InferErrUnion<R>>>;
export function zipOrAccumulate(
  ...results: readonly Result<unknown, unknown>[]
): Result<unknown[], [unknown, ...unknown[]]> {
  const values: unknown[] = [];
  const errors: unknown[] = [];

  for (const result of results) {
    if (result._tag === "Err") {
      errors.push(result.error);
    } else {
      values.push(result.value);
    }
  }

  if (errors.length > 0) {
    return err(errors as [unknown, ...unknown[]]);
  }
  return ok(values);
}
