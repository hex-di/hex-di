/**
 * Type-safe factory for creating tagged error constructors.
 *
 * Returns a factory function that accepts arbitrary fields and produces a frozen,
 * readonly object with a `_tag` discriminant. The `const` type parameter ensures
 * field values are inferred as literal types without requiring `as const` at call sites.
 *
 * @example
 * ```ts
 * import { createError } from '@hex-di/result';
 *
 * const NotFound = createError("NotFound");
 * const error = NotFound({ resource: "User", id: "123" });
 * // Type: Readonly<{ _tag: "NotFound"; readonly resource: "User"; readonly id: "123" }>
 *
 * Object.isFrozen(error); // true
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/08-error-patterns.md — BEH-08-001
 */
export function createError<Tag extends string>(
  tag: Tag
): <Fields extends Record<string, unknown>>(fields: Fields) => Readonly<{ _tag: Tag } & Fields> {
  return <Fields extends Record<string, unknown>>(
    fields: Fields
  ): Readonly<{ _tag: Tag } & Fields> => {
    return Object.freeze({ _tag: tag, ...fields });
  };
}
