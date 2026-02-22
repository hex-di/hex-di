/**
 * Brand symbol for Option instances.
 *
 * A unique symbol attached to every `Option` created by `some()` or `none()`.
 * Its presence is the sole criterion for the `isOption()` type guard.
 * Because it is a `unique symbol`, no external code can forge it.
 *
 * @internal
 *
 * @example
 * ```ts
 * import { some, isOption } from '@hex-di/result';
 *
 * const opt = some(42);
 * isOption(opt); // true — has OPTION_BRAND
 * isOption({ _tag: "Some", value: 42 }); // false — no brand
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/09-option.md — BEH-09-001
 */
export const OPTION_BRAND: unique symbol = Symbol("Option");
