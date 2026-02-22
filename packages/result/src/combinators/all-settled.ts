import type { Result } from "../core/types.js";
import type { InferOkTuple, InferErrUnion } from "../type-utils.js";
import { ok, err } from "../core/result.js";

/**
 * Combines multiple Results. If all are Ok, returns Ok with a tuple of values.
 * If any are Err, collects ALL errors into an array (does not short-circuit).
 *
 * Unlike {@link all}, this function iterates through every result regardless of errors,
 * so the error type is an array containing all collected error values.
 *
 * @example
 * ```ts
 * import { ok, err, allSettled } from '@hex-di/result';
 *
 * const success = allSettled(ok(1), ok("hello"));
 * // => Ok<[number, string]>
 *
 * const failed = allSettled(ok(1), err("a"), err("b"));
 * // => Err(["a", "b"]) — both errors collected
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/05-composition.md — BEH-05-002
 */
export function allSettled<R extends readonly Result<unknown, unknown>[]>(
  ...results: R
): Result<InferOkTuple<R>, InferErrUnion<R>[]>;
export function allSettled(
  ...results: readonly Result<unknown, unknown>[]
): Result<unknown[], unknown[]> {
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
    return err(errors);
  }
  return ok(values);
}
