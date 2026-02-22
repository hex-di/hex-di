import type { Result } from "../core/types.js";
import type { InferOk, InferErr } from "../type-utils.js";
import { ok, err } from "../core/result.js";

type InferErrUnionFromRecord<R extends Record<string, Result<unknown, unknown>>> = InferErr<
  R[keyof R]
>;

/**
 * Combines a record of Results into a Result of a record. Short-circuits on the first Err.
 *
 * If all values are Ok, returns Ok with a record mapping each key to its unwrapped value.
 * If any value is Err, returns the first Err encountered. Iteration order follows
 * `Object.keys()` (standard JavaScript property ordering).
 *
 * @example
 * ```ts
 * import { ok, err, collect } from '@hex-di/result';
 *
 * const success = collect({ name: ok("Alice"), age: ok(30) });
 * // => Ok({ name: "Alice", age: 30 })
 *
 * const failed = collect({ name: ok("Alice"), age: err("invalid") });
 * // => Err("invalid")
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/05-composition.md — BEH-05-004
 */
export function collect<R extends Record<string, Result<unknown, unknown>>>(
  results: R
): Result<{ [K in keyof R]: InferOk<R[K]> }, InferErrUnionFromRecord<R>>;
export function collect(
  results: Record<string, Result<unknown, unknown>>
): Result<Record<string, unknown>, unknown> {
  const values: Record<string, unknown> = {};

  for (const key of Object.keys(results)) {
    const result = results[key];
    if (result._tag === "Err") {
      return err(result.error);
    }
    values[key] = result.value;
  }

  return ok(values);
}
