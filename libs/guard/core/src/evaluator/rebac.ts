/**
 * Interface for synchronous relationship-based access control checks.
 * Implement this to support graph-traversal authorization (ReBAC).
 */
export interface RelationshipResolver {
  /**
   * Synchronously checks whether a subject has a relationship to a resource.
   * @param subjectId - The subject identifier
   * @param relation - The relationship name (e.g., "owner", "member", "viewer")
   * @param resourceId - The resource identifier
   * @param options - Optional check options
   */
  check(
    subjectId: string,
    relation: string,
    resourceId: string,
    options?: { readonly depth?: number },
  ): boolean;

  /**
   * Asynchronously checks whether a subject has a relationship to a resource.
   * Used by evaluateAsync().
   */
  checkAsync(
    subjectId: string,
    relation: string,
    resourceId: string,
    options?: { readonly depth?: number },
  ): Promise<boolean>;
}

/**
 * Port type for the RelationshipResolver.
 */
export type RelationshipResolverPort = RelationshipResolver;

/**
 * A no-op relationship resolver that always denies relationships.
 * Not suitable for production use.
 */
export const NoopRelationshipResolver: RelationshipResolver = Object.freeze({
  check(_subjectId: string, _relation: string, _resourceId: string): boolean {
    return false;
  },
  checkAsync(
    _subjectId: string,
    _relation: string,
    _resourceId: string,
  ): Promise<boolean> {
    return Promise.resolve(false);
  },
});
