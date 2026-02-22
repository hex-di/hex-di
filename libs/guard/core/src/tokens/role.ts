import type { PermissionConstraint } from "./permission.js";
import type { CircularRoleInheritanceError } from "../errors/types.js";
import { ACL002 } from "../errors/codes.js";
import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";

export const ROLE_BRAND: unique symbol = Symbol.for("@hex-di/guard/role");

/**
 * Runtime symbol carrying the direct permission tuple for type-level flattening.
 * This is a real symbol so its value can be set without casts.
 * The value at runtime is the direct permissions array; the TYPE preserves the generic tuple.
 */
export const ROLE_PERMISSIONS_TAG: unique symbol = Symbol.for("@hex-di/guard/role-permissions");

/**
 * A typed role that carries its complete flattened permission set and inherits list.
 * ROLE_PERMISSIONS_TAG carries the direct permission tuple type for FlattenRolePermissions.
 */
export type Role<
  TName extends string,
  TPermissions extends readonly PermissionConstraint[],
  TInherits extends readonly RoleConstraint[] = readonly RoleConstraint[],
> = {
  readonly [ROLE_BRAND]: true;
  readonly [ROLE_PERMISSIONS_TAG]: TPermissions;
  readonly name: TName;
  readonly permissions: readonly PermissionConstraint[];
  readonly inherits: TInherits;
};

/**
 * Structural constraint matching ANY Role.
 */
export interface RoleConstraint {
  readonly [ROLE_BRAND]: true;
  readonly name: string;
  readonly permissions: readonly PermissionConstraint[];
  readonly inherits: readonly RoleConstraint[];
}

/**
 * Type-level utility: Peano depth counter for recursive flattening.
 * Limits recursion to 20 levels.
 */
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

/**
 * Type-level permission flattening across a role DAG.
 * Uses the ROLE_PERMISSIONS_TAG when available (concrete Role types)
 * and falls back to PermissionConstraint for plain RoleConstraint values.
 */
export type FlattenRolePermissions<
  TRoles extends readonly RoleConstraint[],
  TDepth extends number = 20,
> = [TDepth] extends [never]
  ? never
  : TRoles extends readonly []
    ? never
    : TRoles extends readonly [infer Head, ...infer Tail]
      ? Tail extends readonly RoleConstraint[]
        ? Head extends {
            readonly [ROLE_PERMISSIONS_TAG]: infer P;
            readonly inherits: infer TI;
          }
          ? P extends readonly PermissionConstraint[]
            ? TI extends readonly RoleConstraint[]
              ? P[number] | FlattenRolePermissions<TI, Prev[TDepth]> | FlattenRolePermissions<Tail, TDepth>
              : P[number] | FlattenRolePermissions<Tail, TDepth>
            : never
          : Head extends RoleConstraint
            ? PermissionConstraint | FlattenRolePermissions<Head["inherits"], Prev[TDepth]> | FlattenRolePermissions<Tail, TDepth>
            : never
        : never
      : never;

/**
 * Creates a typed role with inheritance.
 */
export function createRole<
  const TName extends string,
  const TPermissions extends readonly PermissionConstraint[],
  const TInherits extends readonly RoleConstraint[],
>(config: {
  readonly name: TName;
  readonly permissions: TPermissions;
  readonly inherits: TInherits;
}): Role<TName, TPermissions, TInherits>;

/**
 * Creates a typed role without inheritance.
 */
export function createRole<
  const TName extends string,
  const TPermissions extends readonly PermissionConstraint[],
>(config: {
  readonly name: TName;
  readonly permissions: TPermissions;
}): Role<TName, TPermissions, readonly []>;

/**
 * Creates a typed role with optional inheritance.
 * Permissions from inherited roles are flattened at creation time.
 */
export function createRole(config: {
  readonly name: string;
  readonly permissions: readonly PermissionConstraint[];
  readonly inherits?: readonly RoleConstraint[];
}): RoleConstraint & { readonly [ROLE_PERMISSIONS_TAG]: readonly PermissionConstraint[] } {
  const inherits = config.inherits ?? [];
  const allPermissions = flattenPermissionsRuntime(inherits, config.permissions, new Set<string>());

  const role: RoleConstraint & { readonly [ROLE_PERMISSIONS_TAG]: readonly PermissionConstraint[] } = {
    [ROLE_BRAND]: true,
    [ROLE_PERMISSIONS_TAG]: config.permissions,
    name: config.name,
    permissions: Object.freeze([...allPermissions]),
    inherits: Object.freeze([...inherits]),
  };
  return Object.freeze(role);
}

/**
 * Internal DFS traversal: collects all permissions across the role DAG.
 * Uses a visited set to handle shared ancestors without revisiting.
 */
function flattenPermissionsRuntime(
  roles: readonly RoleConstraint[],
  direct: readonly PermissionConstraint[],
  seen: Set<string>,
): readonly PermissionConstraint[] {
  const result: PermissionConstraint[] = [];

  for (const perm of direct) {
    const key = `${perm.resource}:${perm.action}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(perm);
    }
  }

  for (const role of roles) {
    if (!seen.has(`__role__${role.name}`)) {
      seen.add(`__role__${role.name}`);
      const inherited = flattenPermissionsRuntime(role.inherits, role.permissions, seen);
      result.push(...inherited);
    }
  }

  return result;
}

/**
 * Runtime function: returns all flattened permissions for a role, with cycle detection.
 * Walks the DAG using DFS with a visited set. Returns Err on circular inheritance.
 */
export function flattenPermissions(
  role: RoleConstraint,
): Result<readonly PermissionConstraint[], CircularRoleInheritanceError> {
  const visited = new Set<string>();
  const stack = new Set<string>();
  const result: PermissionConstraint[] = [];
  const permSeen = new Set<string>();

  function visit(r: RoleConstraint): CircularRoleInheritanceError | null {
    if (stack.has(r.name)) {
      const cycle = [...stack, r.name];
      return Object.freeze({
        code: ACL002,
        message: `Circular role inheritance detected: ${cycle.join(" \u2192 ")}`,
        roleName: r.name,
        cycle,
      });
    }
    if (visited.has(r.name)) return null;

    stack.add(r.name);
    for (const parent of r.inherits) {
      const error = visit(parent);
      if (error !== null) return error;
    }
    stack.delete(r.name);
    visited.add(r.name);

    for (const perm of r.permissions) {
      const key = `${perm.resource}:${perm.action}`;
      if (!permSeen.has(key)) {
        permSeen.add(key);
        result.push(perm);
      }
    }

    return null;
  }

  const error = visit(role);
  if (error !== null) return err(error);
  return ok(result);
}

/**
 * Type guard: returns true if value is a Role token.
 */
export function isRole(value: unknown): value is RoleConstraint {
  if (typeof value !== "object" || value === null) return false;
  if (!(ROLE_BRAND in value)) return false;
  if (value[ROLE_BRAND] !== true) return false;
  if (!("name" in value) || typeof value.name !== "string") return false;
  return true;
}

/**
 * A Separation of Duties constraint declaring that no subject may hold
 * all listed roles simultaneously.
 */
export interface MutuallyExclusiveRoles {
  readonly _tag: "MutuallyExclusiveRoles";
  readonly roles: readonly string[];
  readonly reason: string;
}

/**
 * Creates a MutuallyExclusiveRoles SoD constraint.
 *
 * @example
 * ```ts
 * const constraint = createMutuallyExclusiveRoles(["approver", "requester"], "Four-eyes principle");
 * ```
 */
export function createMutuallyExclusiveRoles(
  roles: readonly string[],
  reason: string,
): MutuallyExclusiveRoles {
  const result: MutuallyExclusiveRoles = {
    _tag: "MutuallyExclusiveRoles",
    roles: Object.freeze([...roles]),
    reason,
  };
  return Object.freeze(result);
}

/**
 * A conflict detected by validateSoDConstraints.
 */
export interface SoDConflict {
  readonly constraint: MutuallyExclusiveRoles;
  readonly conflictingRoles: readonly string[];
}

/**
 * Validates a set of subject roles against a list of SoD constraints.
 * Returns all conflicts found (empty array means compliant).
 *
 * @example
 * ```ts
 * const conflicts = validateSoDConstraints(["approver", "requester"], [approverRequesterConstraint]);
 * if (conflicts.length > 0) throw new Error("SoD violation");
 * ```
 */
export function validateSoDConstraints(
  subjectRoles: readonly string[],
  constraints: readonly MutuallyExclusiveRoles[],
): readonly SoDConflict[] {
  const roleSet = new Set(subjectRoles);
  const conflicts: SoDConflict[] = [];

  for (const constraint of constraints) {
    const conflicting = constraint.roles.filter((r) => roleSet.has(r));
    if (conflicting.length >= 2) {
      conflicts.push({ constraint, conflictingRoles: Object.freeze([...conflicting]) });
    }
  }

  return Object.freeze(conflicts);
}
