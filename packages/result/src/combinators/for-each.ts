import type { Result } from "../core/types.js";
import { ok, err } from "../core/result.js";

/**
 * Maps items through a Result-returning function, short-circuiting on the first Err.
 *
 * Applies `f` to each item in order. If all calls return Ok, returns Ok with an array
 * of all mapped values. If any call returns Err, returns that Err immediately without
 * processing remaining items. Unlike `all(...items.map(f))`, `forEach` avoids mapping
 * all items before checking results.
 *
 * @example
 * ```ts
 * import { ok, err, forEach } from '@hex-di/result';
 *
 * const doubled = forEach([1, 2, 3], n => ok(n * 2));
 * // => Ok([2, 4, 6])
 *
 * const failed = forEach([1, -1, 3], n =>
 *   n > 0 ? ok(n * 2) : err("negative")
 * );
 * // => Err("negative") — short-circuits at index 1
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/05-composition.md — BEH-05-006
 */
export function forEach<T, U, E>(
  items: readonly T[],
  f: (item: T, index: number) => Result<U, E>,
): Result<U[], E> {
  const values: U[] = [];

  for (let i = 0; i < items.length; i++) {
    const result = f(items[i], i);
    if (result._tag === "Err") {
      return err(result.error);
    }
    values.push(result.value);
  }

  return ok(values);
}
