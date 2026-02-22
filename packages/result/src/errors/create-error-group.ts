/**
 * Factory for creating families of related discriminated error types with a two-level discriminant.
 *
 * Returns an object with three methods:
 * - `create(tag)` — creates a tagged error constructor within the namespace
 * - `is(value)` — type guard that checks if a value belongs to this error group
 * - `isTag(tag)(value)` — curried type guard for namespace + tag matching
 *
 * Error objects produced by `create` are frozen and carry both `_namespace` and `_tag` fields,
 * enabling two-level discrimination across multiple error groups.
 *
 * @example
 * ```ts
 * import { createErrorGroup } from '@hex-di/result';
 *
 * const Http = createErrorGroup("HttpError");
 * const NotFound = Http.create("NotFound");
 * const error = NotFound({ url: "/api/users", status: 404 });
 * // { _namespace: "HttpError", _tag: "NotFound", url: "/api/users", status: 404 }
 *
 * Http.is(error);                // true
 * Http.isTag("NotFound")(error); // true
 * Http.isTag("Timeout")(error);  // false
 * ```
 *
 * @since v1.0.0
 * @see spec/result/behaviors/08-error-patterns.md — BEH-08-003
 */
export function createErrorGroup<const NS extends string>(
  namespace: NS
): {
  create: <const Tag extends string>(
    tag: Tag
  ) => <const Fields extends Record<string, unknown>>(
    fields: Fields
  ) => Readonly<{ _namespace: NS; _tag: Tag } & Fields>;

  is: (value: unknown) => value is Readonly<{ _namespace: NS; _tag: string }>;

  isTag: <const Tag extends string>(
    tag: Tag
  ) => (
    value: unknown
  ) => value is Readonly<{ _namespace: NS; _tag: Tag }>;
} {
  return {
    create<const Tag extends string>(tag: Tag) {
      return <const Fields extends Record<string, unknown>>(
        fields: Fields
      ): Readonly<{ _namespace: NS; _tag: Tag } & Fields> => {
        return Object.freeze({ _namespace: namespace, _tag: tag, ...fields });
      };
    },

    is(value: unknown): value is Readonly<{ _namespace: NS; _tag: string }> {
      if (value === null || value === undefined || typeof value !== "object") {
        return false;
      }
      return (
        "_namespace" in value &&
        (value as Record<string, unknown>)._namespace === namespace
      );
    },

    isTag<const Tag extends string>(tag: Tag) {
      return (
        value: unknown
      ): value is Readonly<{ _namespace: NS; _tag: Tag }> => {
        if (
          value === null ||
          value === undefined ||
          typeof value !== "object"
        ) {
          return false;
        }
        return (
          "_namespace" in value &&
          (value as Record<string, unknown>)._namespace === namespace &&
          "_tag" in value &&
          (value as Record<string, unknown>)._tag === tag
        );
      };
    },
  };
}
