import type { Result } from "../core/types.js";
import type { InferOkTuple, InferErrUnion } from "../type-utils.js";
import { ok, err } from "../core/result.js";

/**
 * Combines multiple Results. If ALL are Ok, returns Ok with tuple of values.
 * If ANY are Err, collects ALL errors (does not short-circuit).
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
