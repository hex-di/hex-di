import type { AuthSubject } from "@hex-di/guard";

/**
 * Pre-built admin subject archetype with common administrative permissions.
 * Use as a convenient default for tests that need an admin context.
 */
export const adminSubject: AuthSubject = Object.freeze({
  id: "admin-subject",
  roles: Object.freeze(["admin"]),
  permissions: new Set(["*:*"]),
  attributes: Object.freeze({}),
  authenticationMethod: "password",
  authenticatedAt: "2026-01-01T00:00:00.000Z",
});

/**
 * Pre-built reader subject archetype with read-only permissions.
 */
export const readerSubject: AuthSubject = Object.freeze({
  id: "reader-subject",
  roles: Object.freeze(["reader"]),
  permissions: new Set<string>(),
  attributes: Object.freeze({}),
  authenticationMethod: "password",
  authenticatedAt: "2026-01-01T00:00:00.000Z",
});

/**
 * Pre-built anonymous subject archetype with no roles or permissions.
 */
export const anonymousSubject: AuthSubject = Object.freeze({
  id: "anonymous-subject",
  roles: Object.freeze([]),
  permissions: new Set<string>(),
  attributes: Object.freeze({}),
  authenticationMethod: "none",
  authenticatedAt: "2026-01-01T00:00:00.000Z",
});

let _counter = 0;

/**
 * Resets the subject counter used by createTestSubject().
 * Call this in beforeEach to ensure deterministic IDs.
 */
export function resetSubjectCounter(): void {
  _counter = 0;
}

/**
 * Options for createTestSubject().
 */
export interface TestSubjectOptions {
  readonly id?: string;
  readonly roles?: readonly string[];
  readonly permissions?: readonly string[];
  readonly attributes?: Record<string, unknown>;
  readonly authenticationMethod?: string;
  readonly authenticatedAt?: string;
}

/**
 * Creates a test AuthSubject with sensible defaults.
 * Each call auto-increments the subject ID counter (unless overridden).
 *
 * @example
 * ```ts
 * const subject = createTestSubject({ roles: ["admin"] });
 * // { id: "test-user-1", roles: ["admin"], permissions: new Set(), ... }
 * ```
 */
export function createTestSubject(options: TestSubjectOptions = {}): AuthSubject {
  _counter += 1;
  return Object.freeze({
    id: options.id ?? `test-user-${_counter}`,
    roles: Object.freeze(options.roles ? [...options.roles] : []),
    permissions: new Set(options.permissions ?? []),
    attributes: Object.freeze({ ...(options.attributes ?? {}) }),
    authenticationMethod: options.authenticationMethod ?? "password",
    authenticatedAt: options.authenticatedAt ?? new Date().toISOString(),
  });
}
