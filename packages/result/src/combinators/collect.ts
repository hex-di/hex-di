import type { Result } from "../core/types.js";
import type { InferOk, InferErr } from "../type-utils.js";
import { ok, err } from "../core/result.js";

type InferErrUnionFromRecord<R extends Record<string, Result<unknown, unknown>>> = InferErr<
  R[keyof R]
>;

/**
 * Combines a record of Results into a Result of a record.
 * Short-circuits on first Err.
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
