/**
 * AuthSubject interface — the entity being authorized.
 */
export interface AuthSubject {
  readonly id: string;
  readonly roles: readonly string[];
  /** Flattened permission set for O(1) lookup: "resource:action" strings. */
  readonly permissions: ReadonlySet<string>;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly authenticationMethod: string;
  readonly authenticatedAt: string;
  readonly identityProvider?: string;
  readonly sessionId?: string;
}

/**
 * A pre-computed subject with additional type-safe attributes.
 */
export interface PrecomputedSubject extends AuthSubject {
  readonly _precomputed: true;
}

/**
 * Creates a new AuthSubject with additional attributes merged in.
 */
export function withAttributes(
  subject: AuthSubject,
  attributes: Readonly<Record<string, unknown>>,
): AuthSubject {
  return Object.freeze({
    ...subject,
    attributes: Object.freeze({ ...subject.attributes, ...attributes }),
  });
}

/**
 * Gets an attribute from a subject by key.
 * Returns undefined if the attribute is not present.
 */
export function getAttribute(
  subject: AuthSubject,
  key: string,
): unknown {
  return subject.attributes[key];
}

/**
 * Creates a minimal AuthSubject with all required fields.
 */
export function createAuthSubject(
  id: string,
  roles: readonly string[],
  permissions: ReadonlySet<string>,
  attributes?: Readonly<Record<string, unknown>>,
  authenticationMethod?: string,
  authenticatedAt?: string,
): AuthSubject {
  return Object.freeze({
    id,
    roles: Object.freeze([...roles]),
    permissions,
    attributes: Object.freeze({ ...(attributes ?? {}) }),
    authenticationMethod: authenticationMethod ?? "password",
    authenticatedAt: authenticatedAt ?? new Date().toISOString(),
  });
}
