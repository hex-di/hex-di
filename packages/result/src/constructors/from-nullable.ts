import type { Result } from "../core/types.js";
import { ok, err } from "../core/result.js";

/**
 * Creates a Result from a nullable value.
 * null and undefined become Err, everything else becomes Ok.
 */
export function fromNullable<T, E>(value: T | null | undefined, onNullable: () => E): Result<T, E> {
  if (value === null || value === undefined) {
    return err(onNullable());
  }
  return ok(value);
}
