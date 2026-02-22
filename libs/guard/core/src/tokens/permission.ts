/**
 * Permission token types and factory.
 *
 * Permissions use structural typing with well-known symbols so that
 * two Permission<'user', 'read'> created in different modules are
 * type-compatible. This contrasts with Port which uses unique symbols.
 */

export const PERMISSION_BRAND: unique symbol = Symbol.for("@hex-di/guard/permission");

/**
 * A typed permission token representing a resource+action pair.
 * Uses the PERMISSION_BRAND runtime symbol for type discrimination
 * and literal type parameters on resource/action for structural incompatibility.
 */
export type Permission<TResource extends string, TAction extends string> = {
  readonly [PERMISSION_BRAND]: true;
  readonly resource: TResource;
  readonly action: TAction;
};

/**
 * Structural constraint matching ANY Permission without using `any`.
 */
export interface PermissionConstraint {
  readonly [PERMISSION_BRAND]: true;
  readonly resource: string;
  readonly action: string;
}

/**
 * Per-permission configuration options.
 */
export interface PermissionOptions {
  readonly description?: string;
  readonly effectiveDate?: string;
  readonly expirationDate?: string;
  readonly changeControlId?: string;
}

/**
 * Creates a typed permission token.
 *
 * The returned object is frozen and carries both runtime fields
 * (resource, action) and the PERMISSION_BRAND for type discrimination.
 */
export function createPermission<
  const TResource extends string,
  const TAction extends string,
>(config: {
  readonly resource: TResource;
  readonly action: TAction;
  readonly options?: PermissionOptions;
}): Permission<TResource, TAction> {
  const permission: Permission<TResource, TAction> = {
    [PERMISSION_BRAND]: true,
    resource: config.resource,
    action: config.action,
  };
  return Object.freeze(permission);
}

/**
 * Type guard: returns true if value is a Permission token.
 */
export function isPermission(value: unknown): value is PermissionConstraint {
  if (typeof value !== "object" || value === null) return false;
  if (!(PERMISSION_BRAND in value)) return false;
  if (value[PERMISSION_BRAND] !== true) return false;
  if (!("resource" in value) || typeof value.resource !== "string") return false;
  if (!("action" in value) || typeof value.action !== "string") return false;
  return true;
}

/**
 * Formats a permission as "resource:action" string.
 */
export function formatPermission(perm: PermissionConstraint): string {
  return `${perm.resource}:${perm.action}`;
}

/**
 * Warning emitted when the same resource:action pair is registered twice.
 * Error code ACL006.
 */
export interface DuplicatePermissionWarning {
  readonly code: "ACL006";
  readonly message: string;
  readonly key: string;
}

/**
 * A registry that tracks all permissions registered within a bounded scope.
 * Emits a DuplicatePermissionWarning callback when the same resource:action
 * is registered more than once.
 */
export interface PermissionRegistry {
  /**
   * Registers a permission in this registry.
   * Calls onDuplicate if the same resource:action has already been registered.
   */
  register<TResource extends string, TAction extends string>(
    permission: Permission<TResource, TAction>,
    onDuplicate?: (warning: DuplicatePermissionWarning) => void,
  ): Permission<TResource, TAction>;
  /** Returns all registered permissions in insertion order. */
  getAll(): readonly PermissionConstraint[];
}

/**
 * Creates an isolated permission registry.
 *
 * @example
 * ```ts
 * const registry = createPermissionRegistry();
 * const ReadDoc = registry.register(createPermission({ resource: "doc", action: "read" }));
 * const all = registry.getAll();
 * ```
 */
export function createPermissionRegistry(): PermissionRegistry {
  const _map = new Map<string, PermissionConstraint>();

  return {
    register<TResource extends string, TAction extends string>(
      permission: Permission<TResource, TAction>,
      onDuplicate?: (warning: DuplicatePermissionWarning) => void,
    ): Permission<TResource, TAction> {
      const key = formatPermission(permission);
      if (_map.has(key)) {
        if (onDuplicate !== undefined) {
          onDuplicate({
            code: "ACL006",
            message: `Permission '${key}' has already been registered`,
            key,
          });
        }
      } else {
        _map.set(key, permission);
      }
      return permission;
    },

    getAll(): readonly PermissionConstraint[] {
      return [..._map.values()];
    },
  };
}
