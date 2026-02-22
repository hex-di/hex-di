/**
 * A unique symbol attached to every {@link Result} instance created by {@link ok} or {@link err}.
 * Its presence is the sole criterion used by {@link isResult} to identify genuine Result values.
 * Because it is a `unique symbol`, no external code can forge it.
 *
 * @example
 * ```ts
 * import { ok, RESULT_BRAND } from '@hex-di/result';
 *
 * const result = ok(42);
 * console.log(RESULT_BRAND in result); // true
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/01-types-and-guards.md | BEH-01-001}
 */
export const RESULT_BRAND: unique symbol = Symbol("Result");
