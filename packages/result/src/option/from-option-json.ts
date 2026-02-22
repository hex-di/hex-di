import type { Option } from "./types.js";
import { some, none } from "./option.js";

/**
 * The plain JSON representation of an `Option<T>`, as produced by `toJSON()`
 * and consumed by `fromOptionJSON()`.
 *
 * Accepts both the versioned format (with `_schemaVersion`) and the legacy
 * format (without `_schemaVersion`).
 *
 * @since v1.0.0
 * @see spec/result/behaviors/09-option.md — BEH-09-010
 */
export type OptionJSON<T> =
  | { _tag: "Some"; _schemaVersion?: number; value: T }
  | { _tag: "None"; _schemaVersion?: number };

/**
 * Deserializes a plain JSON object back into a branded, frozen `Option`.
 *
 * This is the inverse of `Option.toJSON()`. The returned `Option` passes `isOption()`
 * and has all methods available.
 *
 * Throws `TypeError` if the input `_tag` is neither `"Some"` nor `"None"`.
 *
 * @example
 * ```ts
 * import { some, none, fromOptionJSON, isOption } from '@hex-di/result';
 *
 * const json = some(42).toJSON();
 * // { _tag: "Some", _schemaVersion: 1, value: 42 }
 *
 * const restored = fromOptionJSON(json);
 * isOption(restored); // true
 * restored.isSome();  // true
 *
 * fromOptionJSON({ _tag: "None" }).isNone(); // true
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/09-option.md — BEH-09-010
 */
export function fromOptionJSON<T>(json: OptionJSON<T>): Option<T> {
  if (json._tag === "Some") {
    return some((json as { value: T }).value);
  }
  if (json._tag === "None") {
    return none();
  }
  throw new TypeError(
    "Invalid Option JSON: expected _tag to be 'Some' or 'None'"
  );
}
