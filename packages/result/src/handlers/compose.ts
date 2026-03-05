/**
 * Handler composition: combine two effect handlers into one.
 *
 * The composed handler is left-biased — when both handlers declare the same tag,
 * the first handler (h1) takes precedence.
 *
 * @packageDocumentation
 */

import { ok, err } from "../core/result.js";
import type { Result } from "../core/types.js";
import type { EffectHandler } from "./types.js";

/**
 * Identity handler — handles nothing, passes all errors through.
 *
 * Serves as the identity element for handler composition:
 * - `composeHandlers(identityHandler, h)` behaves like `h`
 * - `composeHandlers(h, identityHandler)` behaves like `h`
 */
export const identityHandler: EffectHandler<never, never> = Object.freeze({
  _tag: "identity",
  tags: [],
  handle(_error: never): Result<never, never> {
    return err(_error);
  },
});

/**
 * Compose two effect handlers into a single handler.
 *
 * The resulting handler:
 * - Handles the union of both handlers' tag sets
 * - Is left-biased: when both handlers declare the same tag, `h1` takes precedence
 * - Preserves handler algebra laws (identity, associativity)
 *
 * @param h1 - First handler (takes precedence on overlapping tags)
 * @param h2 - Second handler
 * @returns A composed handler that delegates to h1 or h2 based on error tags
 */
export function composeHandlers<I1, O1, I2, O2>(
  h1: EffectHandler<I1, O1>,
  h2: EffectHandler<I2, O2>
): EffectHandler<I1 | I2, O1 | O2> {
  const h1Tags = new Set(h1.tags);
  const h2Tags = new Set(h2.tags);

  // Merge tags: h1 tags first, then h2 tags not already covered
  const mergedTags: Array<string> = [...h1.tags];
  for (const tag of h2.tags) {
    if (!h1Tags.has(tag)) {
      mergedTags.push(tag);
    }
  }

  // The composed handler dispatches to h1 or h2 based on the error's _tag.
  // At runtime, tag-based dispatch ensures the error matches the handler's domain.
  // The type-level union (I1 | I2 → O1 | O2) is sound because each branch
  // produces either O1 or O2, and neither handler can be called with the wrong input
  // due to tag gating.
  const handle = (error: I1 | I2): Result<O1 | O2, never> => {
    const errorTag = getErrorTag(error);

    if (errorTag !== undefined) {
      // Left-biased: check h1 first
      if (h1Tags.has(errorTag)) {
        // Tag dispatch guarantees error is I1 at runtime.
        // h1.handle returns Result<O1, never> which widens to Result<O1 | O2, never>.
        return h1.handle(error as I1);
      }
      if (h2Tags.has(errorTag)) {
        return h2.handle(error as I2);
      }
    }

    // Neither handler matches — wrap as Ok passthrough.
    // This path should not be reached when used correctly via transformEffects,
    // which gates on tags before calling handle.
    return ok(error as O1 | O2);
  };

  return Object.freeze({
    _tag: `${h1._tag}+${h2._tag}`,
    tags: Object.freeze(mergedTags),
    handle,
  });
}

/**
 * Safely extract the `_tag` property from an unknown value.
 * Returns undefined if the value is not a tagged error object.
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
