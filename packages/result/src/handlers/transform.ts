/**
 * Standalone function to apply a chain of effect handlers to a Result.
 *
 * Unlike Result methods (e.g. `catchTag`), `transformEffects` is a free function
 * that accepts a Result and a sequence of handlers, applying the first matching
 * handler to the error (if any).
 *
 * @packageDocumentation
 */

import type { Result } from "../core/types.js";
import type { EffectHandler, NarrowedError, UnionOfOutputs } from "./types.js";

/**
 * Apply a chain of effect handlers to a Result.
 *
 * - If the Result is Ok, it is returned unchanged.
 * - If the Result is Err, each handler is tried in order. The first handler
 *   whose `tags` include the error's `_tag` is applied.
 * - If no handler matches, the original Err is returned.
 *
 * @param result   - The Result to transform.
 * @param handlers - One or more effect handlers to apply.
 * @returns The transformed Result.
 *
 * @example
 * ```ts
 * const result = err({ _tag: "NotFound", id: "123" });
 * const handled = transformEffects(
 *   result,
 *   notFoundHandler,
 *   validationHandler,
 * );
 * ```
 */
export function transformEffects<
  T,
  E,
  Handlers extends ReadonlyArray<EffectHandler<never, unknown>>,
>(
  result: Result<T, E>,
  ...handlers: Handlers
): Result<T | UnionOfOutputs<Handlers>, NarrowedError<E, HandlerTags<Handlers>>> {
  type Out = Result<T | UnionOfOutputs<Handlers>, NarrowedError<E, HandlerTags<Handlers>>>;

  if (result.isOk()) {
    // Ok<T, E> widens safely: T to T | X is covariant, E phantom on Ok.
    return result as unknown as Out;
  }

  const error: E = result.error;
  const errorTag = getErrorTag(error);

  if (errorTag !== undefined) {
    for (const handler of handlers) {
      if (handler.tags.includes(errorTag)) {
        // Tag dispatch guarantees the error matches the handler's domain.
        // handler.handle expects its TIn, but at the type level the constraint
        // uses `never` as the lower bound. The runtime call is safe because
        // we only invoke handle after confirming the error's tag matches.
        const handleFn = handler.handle as (e: E) => Result<unknown, never>;
        return handleFn(error) as unknown as Out;
      }
    }
  }

  // No handler matched — return the original error result unchanged.
  // At runtime, this error's _tag was not in any handler's tags, so it is
  // a member of NarrowedError<E, HandlerTags<Handlers>>.
  return result as unknown as Out;
}

/**
 * Extract the union of all tag strings from a handler tuple.
 */
type HandlerTags<Handlers extends ReadonlyArray<EffectHandler<never, unknown>>> =
  Handlers[number]["tags"][number];

/**
 * Safely extract the `_tag` property from an unknown value.
 */
function getErrorTag(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  if (!("_tag" in error)) {
    return undefined;
  }
  const tagValue: unknown = error._tag;
  if (typeof tagValue === "string") {
    return tagValue;
  }
  return undefined;
}
