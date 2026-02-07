import type { Result } from "../core/types.js";
import type { InferOkUnion, InferErrTuple } from "../type-utils.js";
import { ok, err } from "../core/result.js";

/**
 * Returns the first Ok value found. If all are Err, returns an Err
 * containing all errors.
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
