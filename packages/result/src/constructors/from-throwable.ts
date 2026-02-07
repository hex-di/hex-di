import type { Result } from "../core/types.js";
import { ok, err } from "../core/result.js";

/**
 * fromThrowable — two overloads:
 * 1. Zero-arg fn: executes immediately, returns Result
 * 2. Multi-arg fn: wraps the function, returns a new function that returns Result
 */
export function fromThrowable<T, E>(fn: () => T, mapErr: (error: unknown) => E): Result<T, E>;
export function fromThrowable<A extends readonly unknown[], T, E>(
  fn: (...args: A) => T,
  mapErr: (error: unknown) => E
): (...args: A) => Result<T, E>;
export function fromThrowable(
  fn: (...args: unknown[]) => unknown,
  mapErr: (error: unknown) => unknown
): unknown {
  // If fn expects parameters, return a wrapped function
  if (fn.length > 0) {
    return (...args: unknown[]) => {
      try {
        return ok(fn(...args));
      } catch (e: unknown) {
        return err(mapErr(e));
      }
    };
  }

  // Zero-arg: execute immediately
  try {
    return ok(fn());
  } catch (e: unknown) {
    return err(mapErr(e));
  }
}
