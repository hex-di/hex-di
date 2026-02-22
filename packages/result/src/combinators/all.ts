import type { Result } from "../core/types.js";
import type { InferOkTuple, InferErrUnion } from "../type-utils.js";
import { ok, err } from "../core/result.js";

/**
 * Combines multiple Results into a single Result containing a tuple of all
 * success values. Short-circuits on the first Err encountered.
 *
 * If all Results are Ok, returns Ok with a tuple of all values (preserving order).
 * If any Result is Err, returns the first Err encountered without inspecting remaining results.
 *
 * @example
 * ```ts
 * import { ok, err, all } from '@hex-di/result';
 *
 * const result = all(ok(1), ok("hello"), ok(true));
 * // => Ok<[number, string, boolean]>
 *
 * const failed = all(ok(1), err("fail"), ok(true));
 * // => Err("fail") — short-circuits at second element
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/05-composition.md — BEH-05-001
 */
export function all<R extends readonly Result<unknown, unknown>[]>(
  ...results: R
): Result<InferOkTuple<R>, InferErrUnion<R>>;
export function all(...results: readonly Result<unknown, unknown>[]): Result<unknown[], unknown> {
  const values: unknown[] = [];
  for (const result of results) {
    if (result._tag === "Err") {
      return err(result.error);
    }
    values.push(result.value);
  }
  return ok(values);
}
