import type { Option } from "./types.js";
import { OPTION_BRAND } from "./brand.js";

/**
 * Standalone type guard that checks if an unknown value is an `Option`.
 *
 * Uses a Symbol brand check -- only objects created by `some()` or `none()` pass.
 * This is stronger than structural checking and eliminates false positives
 * from objects that happen to share the `{ _tag, value }` shape.
 *
 * @example
 * ```ts
 * import { some, none, isOption } from '@hex-di/result';
 *
 * isOption(some(42));                    // true
 * isOption(none());                      // true
 * isOption({ _tag: "Some", value: 42 }); // false (no brand)
 * isOption(null);                        // false
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/09-option.md — BEH-09-007
 */
export function isOption(value: unknown): value is Option<unknown> {
  if (value === null || value === undefined || typeof value !== "object") {
    return false;
  }
  return OPTION_BRAND in value;
}
