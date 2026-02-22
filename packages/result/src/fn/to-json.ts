import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.toJSON}. Serializes the result
 * to a plain JSON-safe object with `_tag`, `_schemaVersion`, and the payload.
 *
 * @typeParam T - The success type.
 * @typeParam E - The error type.
 * @returns A function that takes a `Result<T, E>` and returns the serialized form.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, toJSON } from '@hex-di/result/fn';
 *
 * pipe(ok(42), toJSON());   // { _tag: "Ok", _schemaVersion: 1, value: 42 }
 * pipe(err("x"), toJSON()); // { _tag: "Err", _schemaVersion: 1, error: "x" }
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function toJSON<T, E>(): (result: Result<T, E>) => { _tag: "Ok"; _schemaVersion: 1; value: T } | { _tag: "Err"; _schemaVersion: 1; error: E } {
  return (result) => result.toJSON();
}
