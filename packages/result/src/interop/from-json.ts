import type { Result } from "../core/types.js";
import { ok, err } from "../core/result.js";

/**
 * The plain JSON representation of a `Result<T, E>`, as produced by `toJSON()`
 * and consumed by `fromJSON()`.
 *
 * Accepts both the versioned format (with `_schemaVersion`) and the legacy
 * format (without `_schemaVersion`).
 *
 * @since v1.0.0
 * @see spec/result/behaviors/13-interop.md — BEH-13-001
 */
export type ResultJSON<T, E> =
  | { _tag: "Ok"; _schemaVersion?: number; value: T }
  | { _tag: "Err"; _schemaVersion?: number; error: E };

/**
 * Deserializes a plain JSON object back into a branded, frozen `Result`.
 *
 * This is the inverse of `Result.toJSON()`. The returned `Result` passes `isResult()`
 * and has all methods available.
 *
 * Throws `TypeError` if the input `_tag` is neither `"Ok"` nor `"Err"`.
 *
 * @example
 * ```ts
 * import { ok, fromJSON, isResult } from '@hex-di/result';
 *
 * const json = ok(42).toJSON();
 * // { _tag: "Ok", _schemaVersion: 1, value: 42 }
 *
 * const restored = fromJSON(json);
 * isResult(restored); // true
 * restored.isOk();    // true
 * restored.value;     // 42
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/13-interop.md — BEH-13-001
 */
export function fromJSON<T, E>(json: ResultJSON<T, E>): Result<T, E> {
  if (json._tag === "Ok") {
    return ok((json as { value: T }).value) as Result<T, E>;
  }
  if (json._tag === "Err") {
    return err((json as { error: E }).error) as Result<T, E>;
  }
  throw new TypeError(
    "Invalid Result JSON: expected _tag to be 'Ok' or 'Err'"
  );
}
