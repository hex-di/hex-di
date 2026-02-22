import { createPermission, createRole, hasPermission, hasRole } from "@hex-di/guard";
import type { Permission, PermissionConstraint, PolicyConstraint } from "@hex-di/guard";

/**
 * Creates a test permission with the given resource and action.
 *
 * @example
 * ```ts
 * const Read = createTestPermission("document", "read");
 * ```
 */
export function createTestPermission<
  const TResource extends string,
  const TAction extends string,
>(resource: TResource, action: TAction): Permission<TResource, TAction> {
  return createPermission({ resource, action });
}

/**
 * Creates a simple test role with the given name and permissions.
 *
 * @example
 * ```ts
 * const AdminRole = createTestRole("admin", [ReadDoc, WriteDoc]);
 * ```
 */
export function createTestRole(
  name: string,
  permissions: readonly PermissionConstraint[],
) {
  return createRole({ name, permissions });
}

/**
 * Creates a `hasPermission` policy for quick test setup.
 *
 * @example
 * ```ts
 * const policy = permissionPolicy("document", "read");
 * ```
 */
export function permissionPolicy(
  resource: string,
  action: string,
): PolicyConstraint {
  return hasPermission(createPermission({ resource, action }));
}

/**
 * Creates a `hasRole` policy for quick test setup.
 *
 * @example
 * ```ts
 * const policy = rolePolicy("admin");
 * ```
 */
export function rolePolicy(roleName: string): PolicyConstraint {
  return hasRole(roleName);
}
