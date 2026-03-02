import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.catchTags}. Handles multiple error
 * variants via a handler map. Each key is a `_tag` value, each value is a handler.
 * All matched tags are removed from the error union.
 *
 * @typeParam Handlers - A record mapping `_tag` values to infallible handler functions.
 * @param handlers - A map of `_tag` values to handler functions.
 * @returns A function that takes a `Result<T, E>` and returns a `Result` with matched tags eliminated from `E`.
 *
 * @example
 * ```ts
 * import { ok, err, createError } from '@hex-di/result';
 * import { pipe, catchTags } from '@hex-di/result/fn';
 *
 * const NotFound = createError("NotFound");
 * const Timeout = createError("Timeout");
 *
 * declare const result: Result<string, ReturnType<typeof NotFound> | ReturnType<typeof Timeout>>;
 *
 * pipe(result, catchTags({
 *   NotFound: () => ok("default"),
 *   Timeout: () => ok("cached"),
 * }));
 * // Result<string, never>
 * ```
 *
 * @since v1.1.0
 * @see {@link spec/result/behaviors/15-effect-error-handling.md | BEH-15-004}
 */
export function catchTags<
  Handlers extends Record<string, (error: never) => Result<unknown, never>>,
>(
  handlers: Handlers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): <T, E>(result: Result<T, E>) => any {
  return result => (result as Result<unknown, { _tag: string }>).catchTags(handlers as never);
}
