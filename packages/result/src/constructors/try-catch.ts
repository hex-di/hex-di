import type { Result } from "../core/types.js";
import { ok, err } from "../core/result.js";

/**
 * Executes a function and catches any thrown value.
 * Always executes immediately (unlike fromThrowable's wrapping overload).
 */
export function tryCatch<T, E>(fn: () => T, mapErr: (error: unknown) => E): Result<T, E> {
  try {
    return ok(fn());
  } catch (e: unknown) {
    return err(mapErr(e));
  }
}
