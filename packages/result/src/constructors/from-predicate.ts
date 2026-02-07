import type { Result } from "../core/types.js";
import { ok, err } from "../core/result.js";

/**
 * Creates a Result based on a predicate.
 * Type guard overload narrows the Ok type.
 */
export function fromPredicate<T, U extends T, E>(
  value: T,
  predicate: (value: T) => value is U,
  onFalse: (value: T) => E
): Result<U, E>;
export function fromPredicate<T, E>(
  value: T,
  predicate: (value: T) => boolean,
  onFalse: (value: T) => E
): Result<T, E>;
export function fromPredicate<T, E>(
  value: T,
  predicate: (value: T) => boolean,
  onFalse: (value: T) => E
): Result<T, E> {
  if (predicate(value)) {
    return ok(value);
  }
  return err(onFalse(value));
}
