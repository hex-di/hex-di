import type { Result } from "../core/types.js";
import type { Option } from "../option/types.js";

/**
 * Curried, data-last version of {@link Result.toOption}. Converts the result
 * to an `Option`: `Ok(v)` becomes `Some(v)`, `Err(_)` becomes `None`.
 *
 * @typeParam T - The success type.
 * @typeParam E - The error type.
 * @returns A function that takes a `Result<T, E>` and returns `Option<T>`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, toOption } from '@hex-di/result/fn';
 *
 * pipe(ok(42), toOption());     // Some(42)
 * pipe(err("x"), toOption());   // None
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function toOption<T, E>(): (result: Result<T, E>) => Option<T> {
  return (result) => result.toOption();
}
