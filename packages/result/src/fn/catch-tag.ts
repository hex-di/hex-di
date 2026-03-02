import type { Result } from "../core/types.js";

/**
 * Curried, data-last version of {@link Result.catchTag}. If `Err` with matching
 * `_tag`, applies `handler` to the error and returns the result with the tag
 * removed from `E`. If `Ok` or non-matching tag, passes through unchanged.
 *
 * @typeParam Tag - The `_tag` discriminant string to match.
 * @typeParam T2 - The success type the handler may produce.
 * @param tag - The `_tag` value to match against the error.
 * @param handler - The function to apply to the matched error, returning an infallible `Result`.
 * @returns A function that takes a `Result<T, E>` and returns `Result<T | T2, Exclude<E, { _tag: Tag }>>`.
 *
 * @example
 * ```ts
 * import { ok, err, createError } from '@hex-di/result';
 * import { pipe, catchTag } from '@hex-di/result/fn';
 *
 * const NotFound = createError("NotFound");
 * type NotFoundError = ReturnType<typeof NotFound>;
 * type TimeoutError = { _tag: "Timeout" };
 * type AppError = NotFoundError | TimeoutError;
 *
 * declare const result: Result<string, AppError>;
 *
 * pipe(result, catchTag("NotFound", () => ok("default")));
 * // Result<string, TimeoutError>
 * ```
 *
 * @since v1.1.0
 * @see {@link spec/result/behaviors/15-effect-error-handling.md | BEH-15-004}
 */
export function catchTag<Tag extends string, T2>(
  tag: Tag,
  handler: (error: { _tag: Tag }) => Result<T2, never>
): <T, E>(result: Result<T, E>) => Result<T | T2, Exclude<E, { _tag: Tag }>> {
  return result => result.catchTag(tag, handler as never);
}
