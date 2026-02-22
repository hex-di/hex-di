import type { Result } from "../core/types.js";

/**
 * Splits an array of Results into separate Ok and Err arrays.
 * Processes every element (no short-circuit).
 *
 * Returns a tuple `[okValues[], errValues[]]` where both arrays preserve the
 * original order of their respective elements. Unlike {@link all} or {@link allSettled},
 * `partition` does not return a Result -- it returns a plain tuple, making it useful
 * when you need to process both successes and failures independently.
 *
 * @example
 * ```ts
 * import { ok, err, partition } from '@hex-di/result';
 *
 * const [successes, failures] = partition([ok(1), err("a"), ok(2), err("b")]);
 * // successes => [1, 2]
 * // failures  => ["a", "b"]
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/05-composition.md — BEH-05-005
 */
export function partition<T, E>(
  results: readonly Result<T, E>[],
): [T[], E[]] {
  const oks: T[] = [];
  const errs: E[] = [];

  for (const result of results) {
    if (result._tag === "Ok") {
      oks.push(result.value);
    } else {
      errs.push(result.error);
    }
  }

  return [oks, errs];
}
