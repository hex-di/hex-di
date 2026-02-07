import type { Result } from "../core/types.js";
import type { InferOkTuple, InferErrUnion } from "../type-utils.js";
import { ok, err } from "../core/result.js";

/**
 * Combines multiple Results into a single Result containing a tuple of all
 * success values. Short-circuits on the first Err encountered.
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
