import type { Result } from "../core/types.js";
import type { InferOkUnion, InferErrTuple } from "../type-utils.js";
import { ok, err } from "../core/result.js";

/**
 * Returns the first Ok value found among the given Results. If all Results are Err,
 * returns an Err containing a tuple of all error values.
 *
 * Short-circuits on the first Ok encountered, so remaining results are not inspected.
 * If every result is Err, all errors are collected positionally into a tuple.
 *
 * @example
 * ```ts
 * import { ok, err, any } from '@hex-di/result';
 *
 * const found = any(err("a"), ok(42), err("b"));
 * // => Ok(42) — short-circuits at second element
 *
 * const allFailed = any(err("a"), err("b"));
 * // => Err(["a", "b"])
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/05-composition.md — BEH-05-003
 */
export function any<R extends readonly Result<unknown, unknown>[]>(
  ...results: R
): Result<InferOkUnion<R>, InferErrTuple<R>>;
export function any(...results: readonly Result<unknown, unknown>[]): Result<unknown, unknown[]> {
  const errors: unknown[] = [];

  for (const result of results) {
    if (result._tag === "Ok") {
      return ok(result.value);
    }
    errors.push(result.error);
  }

  return err(errors);
}
