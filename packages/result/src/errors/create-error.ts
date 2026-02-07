/**
 * Type-safe factory for creating tagged error constructors.
 *
 * Usage:
 *   const NotFound = createError("NotFound");
 *   const error = NotFound({ resource: "User", id: "123" });
 *   // Type: { readonly _tag: "NotFound"; readonly resource: string; readonly id: string }
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
