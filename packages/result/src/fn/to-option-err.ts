import type { Result } from "../core/types.js";
import type { Option } from "../option/types.js";

/**
 * Curried, data-last version of {@link Result.toOptionErr}. Converts the result
 * to an `Option` over the error channel: `Err(e)` becomes `Some(e)`, `Ok(_)` becomes `None`.
 *
 * @typeParam T - The success type.
 * @typeParam E - The error type.
 * @returns A function that takes a `Result<T, E>` and returns `Option<E>`.
 *
 * @example
 * ```ts
 * import { ok, err } from '@hex-di/result';
 * import { pipe, toOptionErr } from '@hex-di/result/fn';
 *
 * pipe(err("x"), toOptionErr());   // Some("x")
 * pipe(ok(42), toOptionErr());     // None
 * ```
 *
 * @since v1.0.0
 * @see {@link spec/result/behaviors/10-standalone-functions.md | BEH-10-003}
 */
export function toOptionErr<T, E>(): (result: Result<T, E>) => Option<E> {
  return (result) => result.toOptionErr();
}
