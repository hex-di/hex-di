# 03 - Role Types

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-03                                 |
> | Revision         | 1.1                                      |
> | Effective Date   | 2026-02-19                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Functional Specification             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.0 (2026-02-13): Initial controlled release |

> |                  | 1.1 (2026-02-19): Added BEH-GD-NNN requirement identifiers to section headings (CCR-GUARD-020) |
_Previous: [02 - Permission Types](./01-permission-types.md)_

---

## BEH-GD-005: Role Tokens (§9)

> **Invariant:** [INV-GD-003](../invariants.md#inv-gd-003-role-dag-acyclicity) — Role DAG Acyclicity
> **See:** [ADR-GD-002](../decisions/002-role-dag-cycle-detection.md) — Role DAG cycle detection
> **DoD:** [DoD 2: Role Tokens](../16-definition-of-done.md#dod-2-role-tokens)

Roles are branded nominal types that carry their complete permission set at the type level. Like Permissions, roles use `Symbol.for()` for structural compatibility across modules: two `Role<'editor', ...>` values with the same permissions are type-compatible.

### Type Definition

```typescript
/**
 * Brand symbol for Role types.
 *
 * Uses `Symbol.for()` like Permission (structural compatibility across modules).
 * Two roles with the same name and permissions are type-compatible.
 */
export const ROLE_BRAND: unique symbol = Symbol.for("@hex-di/guard/role");

/**
 * Unique symbol for the role name phantom brand.
 */
declare const __roleNameBrand: unique symbol;

/**
 * Unique symbol for the permissions phantom brand.
 */
declare const __rolePermissionsBrand: unique symbol;

/**
 * A typed role that carries its complete permission set at the type level.
 *
 * Permissions include both directly assigned permissions AND all permissions
 * inherited from parent roles, recursively flattened at creation time.
 *
 * @typeParam TName - Literal string type for the role name
 * @typeParam TPermissions - Union of Permission types this role grants
 *                           (includes inherited permissions)
 */
export type Role<TName extends string, TPermissions> = {
  /** Brand for type discrimination. Value is `true` at runtime. */
  readonly [ROLE_BRAND]: true;
  /** Phantom brand carrying the role name literal type. */
  readonly [__roleNameBrand]: TName;
  /**
   * Phantom brand carrying the flattened permission union.
   * Covariant: Role<'admin', A | B> is assignable to Role<'admin', A>.
   */
  readonly [__rolePermissionsBrand]: TPermissions;
  /** Runtime-accessible role name. */
  readonly name: TName;
  /** Runtime-accessible array of all permissions (flattened). */
  readonly permissions: readonly PermissionConstraint[];
  /** Runtime-accessible array of directly inherited role references. */
  readonly inherits: readonly RoleConstraint[];
};
```

### RoleConstraint

```typescript
/**
 * Structural constraint matching ANY Role without using `any`.
 *
 * Follows the AdapterConstraint pattern.
 */
export interface RoleConstraint {
  readonly [ROLE_BRAND]: true;
  readonly name: string;
  readonly permissions: readonly PermissionConstraint[];
  readonly inherits: readonly RoleConstraint[];
}
```

### Factory Function

```typescript
/**
 * Creates a typed role with optional inheritance.
 *
 * Permissions from inherited roles are flattened into the Role's type
 * parameter at creation time. Circular inheritance is detected at
 * compile time via ValidateRoleInheritance and at runtime via visited-set.
 */
export function createRole<
  const TName extends string,
  const TPermissions extends readonly PermissionConstraint[],
  const TInherits extends readonly RoleConstraint[],
>(config: {
  readonly name: TName;
  readonly permissions: TPermissions;
  readonly inherits?: TInherits;
}): Role<
  TName,
  | TPermissions[number]
  | FlattenRolePermissions<TInherits extends readonly RoleConstraint[] ? TInherits : readonly []>
>;
```

### Practical Example

```typescript
import { createPermission, createRole } from "@hex-di/guard";

const ReadUser = createPermission({ resource: "user", action: "read" });
const WriteUser = createPermission({ resource: "user", action: "write" });
const DeleteUser = createPermission({ resource: "user", action: "delete" });

// Direct permissions only
const Viewer = createRole({
  name: "viewer",
  permissions: [ReadUser],
});
// Type: Role<'viewer', Permission<'user', 'read'>>

// With inheritance (permissions are flattened eagerly)
const Editor = createRole({
  name: "editor",
  permissions: [WriteUser],
  inherits: [Viewer],
});
// Type: Role<'editor', Permission<'user', 'read'> | Permission<'user', 'write'>>

// Multi-parent inheritance (DAG, not tree)
const Admin = createRole({
  name: "admin",
  permissions: [DeleteUser],
  inherits: [Editor],
});
// Type: Role<'admin', Permission<'user', 'read'> | Permission<'user', 'write'> | Permission<'user', 'delete'>>
```

## BEH-GD-006: Role Inheritance (§10)

Roles form a Directed Acyclic Graph (DAG), not a tree. A role can inherit from multiple parent roles. Permissions from all ancestors are collected into a single flattened set.

### DAG Model

```
                    Admin
                   /     \
                Editor   Reviewer
                  |         |
                Viewer   Viewer   (shared ancestor -- DAG, not tree)
```

The `inherits` array on a Role is a list of direct parent roles. The full permission set is computed by traversing the DAG upward, collecting all permissions from every ancestor, and deduplicating.

### Why Not a Tree?

A tree model restricts each role to exactly one parent. Real authorization models have roles like:

```typescript
const TeamLead = createRole({
  name: "teamLead",
  permissions: [ApproveTimesheet],
  inherits: [Editor, Reviewer], // Two parents -- impossible in a tree
});
```

The DAG model supports this naturally. Shared ancestors (like `Viewer` in the diagram above) are visited once -- the visited-set in `FlattenRolePermissions` prevents redundant processing.

### Eager Flattening at Construction Time

Permissions are flattened eagerly when `createRole()` is called, not lazily at usage sites. This means:

1. `InferPermissions<typeof Editor>` returns the full set immediately
2. No recursive resolution at usage sites (avoids TypeScript depth limits)
3. Circular inheritance is caught at creation time, not scattered across usage

```typescript
// At creation time, Editor already knows about ReadUser from Viewer
const Editor = createRole({
  name: "editor",
  permissions: [WriteUser],
  inherits: [Viewer],
});

// No need to traverse at usage time
type EditorPerms = InferPermissions<typeof Editor>;
// Permission<'user', 'read'> | Permission<'user', 'write'>
```

### Runtime Representation

At runtime, a Role is a frozen object with a `permissions` array containing all flattened permissions and an `inherits` array containing direct parent references:

```typescript
const Editor = createRole({
  name: "editor",
  permissions: [WriteUser],
  inherits: [Viewer],
});

// Runtime value:
// {
//   [Symbol.for("@hex-di/guard/role")]: true,
//   name: "editor",
//   permissions: [ReadUser, WriteUser],  // flattened: includes inherited ReadUser
//   inherits: [Viewer],                  // direct parents only
// }

Object.isFrozen(Editor); // true
```

## BEH-GD-007: Permission Flattening (§11)

> **Invariant:** [INV-GD-003](../invariants.md) — Role DAG Acyclicity

The `FlattenRolePermissions` recursive type collects all permissions from a role's inheritance chain at the type level.

### Type Definition

```typescript
/**
 * Recursively flattens permissions from a role and all its inherited roles.
 *
 * ## Recursion Strategy
 *
 * Uses the same depth-limited recursion pattern as `IsReachable` in
 * `@hex-di/graph`. A Peano counter tuple prevents TypeScript's TS2589
 * "Type instantiation is excessively deep" error.
 *
 * | Parameter  | Purpose                                              |
 * |------------|------------------------------------------------------|
 * | `TRoles`   | Tuple of roles to process (shrinks each iteration)   |
 * | `TAcc`     | Accumulator union of collected permissions            |
 * | `TVisited` | Union of role names already processed (cycle detect)  |
 * | `TDepth`   | Peano counter tuple for depth limiting                |
 *
 * ## Cycle Detection
 *
 * The `TVisited` parameter tracks processed role names. If a role name
 * appears in `TVisited`, it is skipped (breaking the cycle).
 *
 * ## Depth Limit
 *
 * Default max depth is 20 (sufficient for realistic role hierarchies).
 */
type RoleFlattenMaxDepth = 20;

export type FlattenRolePermissions<
  TRoles extends readonly RoleConstraint[],
  TAcc = never,
  TVisited extends string = never,
  TDepth extends readonly unknown[] = [],
> =
  // Depth guard: prevent TS2589
  TDepth["length"] extends RoleFlattenMaxDepth
    ? TAcc
    : TRoles extends readonly [infer TFirst, ...infer TRest extends readonly RoleConstraint[]]
      ? TFirst extends Role<infer TName, infer TPerms>
        ? // Cycle check: skip if already visited
          TName extends TVisited
          ? FlattenRolePermissions<TRest, TAcc, TVisited, TDepth>
          : // Process this role: collect its permissions, recurse into its inherits
            TFirst extends { readonly inherits: infer TInherits extends readonly RoleConstraint[] }
            ? FlattenRolePermissions<
                readonly [...TInherits, ...TRest],
                TAcc | TPerms,
                TVisited | TName,
                [...TDepth, unknown]
              >
            : FlattenRolePermissions<TRest, TAcc | TPerms, TVisited | TName, [...TDepth, unknown]>
        : // Not a typed Role -- skip (RoleConstraint fallback)
          FlattenRolePermissions<TRest, TAcc, TVisited, [...TDepth, unknown]>
      : // Base case: no more roles to process
        TAcc;
```

### Usage

```typescript
// Given the role hierarchy:
//   Admin -> Editor -> Viewer
//   Admin has DeleteUser
//   Editor has WriteUser
//   Viewer has ReadUser

type AdminPerms = FlattenRolePermissions<readonly [typeof Admin]>;
// Permission<'user', 'read'> | Permission<'user', 'write'> | Permission<'user', 'delete'>

type EditorPerms = FlattenRolePermissions<readonly [typeof Editor]>;
// Permission<'user', 'read'> | Permission<'user', 'write'>

type ViewerPerms = FlattenRolePermissions<readonly [typeof Viewer]>;
// Permission<'user', 'read'>
```

### InferPermissions Utility

```typescript
/**
 * Extracts the permission union from a Role type.
 *
 * Because permissions are eagerly flattened at role creation time, this
 * simply extracts the `TPermissions` phantom parameter.
 */
export type InferPermissions<R> =
  R extends Role<infer _TName, infer TPermissions> ? TPermissions : NotARoleError<R>;
```

## Mutual Exclusion and Separation of Duties

In regulated environments, certain roles MUST NOT be assigned to the same subject simultaneously. The `MutuallyExclusiveRoles` constraint enables separation of duties (SoD) enforcement at both type-level and runtime.

```typescript
/**
 * Declares a set of roles that cannot coexist on the same subject.
 *
 * Example: A "batch-operator" cannot simultaneously be a "batch-reviewer"
 * to enforce four-eyes principle for batch release in GxP environments.
 */
interface MutuallyExclusiveRoles {
  readonly _tag: "MutuallyExclusiveRoles";
  /** Human-readable name for this exclusion rule. */
  readonly name: string;
  /** Role names that are mutually exclusive. */
  readonly roles: ReadonlySet<string>;
  /** Reason for the exclusion (included in error messages and audit entries). */
  readonly reason: string;
}

/**
 * Validates that a subject's roles do not violate any SoD constraints.
 *
 * @param subject - The subject whose roles to validate
 * @param constraints - The set of mutual exclusion constraints
 * @returns Ok(void) if valid, Err with the violated constraint details
 */
function validateSoD(
  subject: AuthSubject,
  constraints: ReadonlyArray<MutuallyExclusiveRoles>
): Result<void, SoDViolationError>;
```

```
RECOMMENDED: GxP environments SHOULD define MutuallyExclusiveRoles constraints for
             roles that represent conflicting duties (e.g., maker/checker,
             preparer/reviewer, operator/approver). The validateSoD() helper SHOULD
             be called during subject construction to catch violations early.
             Reference: 21 CFR 11.10(g), ICH Q7 Section 6.
```

### RoleAssignmentEvent

For audit trail traceability, role assignment and revocation events SHOULD be recorded.

```typescript
/**
 * Captures a role assignment or revocation event for audit purposes.
 */
interface RoleAssignmentEvent {
  readonly _tag: "RoleAssignmentEvent";
  /** The subject whose roles changed. */
  readonly subjectId: string;
  /** The role that was assigned or revoked. */
  readonly roleName: string;
  /** Whether this is an assignment or revocation. */
  readonly action: "assign" | "revoke";
  /** ISO 8601 UTC timestamp of the event. */
  readonly timestamp: string;
  /** Identity of the actor who performed the change. */
  readonly actorId: string;
  /** Change control identifier (required in GxP mode). */
  readonly changeControlId?: string;
  /** Reason for the change. */
  readonly reason: string;
}
```

```
RECOMMENDED: Role hierarchies loaded from external sources (databases, LDAP, IdP)
             SHOULD be fully reconstructed and re-flattened on application startup.
             Relying on cached or stale flattened permission sets risks granting
             permissions from a role hierarchy that no longer exists. The
             flattenPermissions() function SHOULD be called for every role at
             startup to ensure the runtime permission set reflects the current
             hierarchy.
```

---

## BEH-GD-008: Cycle Detection (§12)

> **Invariant:** [INV-GD-003](../invariants.md) — Role DAG Acyclicity

### Compile-Time Detection

The `ValidateRoleInheritance` type performs a DFS traversal of the inheritance graph at the type level. If a role name appears in the current path, a cycle is detected and a `CircularRoleInheritanceError` template literal is produced.

```typescript
/**
 * Validates that a role inheritance chain has no cycles.
 *
 * Returns `true` if the inheritance is valid (no cycles), or a
 * `CircularRoleInheritanceError` with the cycle path.
 */
export type ValidateRoleInheritance<
  TRole,
  TPath extends string = "",
  TVisited extends string = never,
  TDepth extends readonly unknown[] = [],
> = TDepth["length"] extends RoleFlattenMaxDepth
  ? true // Depth limit: assume valid (defer to runtime)
  : TRole extends Role<infer TName, infer _TPerms>
    ? TName extends TVisited
      ? // Cycle detected! Build the path string
        CircularRoleInheritanceError<`${TPath} -> ${TName}`>
      : TRole extends { readonly inherits: infer TInherits extends readonly RoleConstraint[] }
        ? ValidateRoleInheritanceList<
            TInherits,
            TPath extends "" ? TName : `${TPath} -> ${TName}`,
            TVisited | TName,
            [...TDepth, unknown]
          >
        : true
    : true;

/**
 * Helper: validates a list of inherited roles for cycles.
 */
type ValidateRoleInheritanceList<
  TRoles extends readonly RoleConstraint[],
  TPath extends string,
  TVisited extends string,
  TDepth extends readonly unknown[],
> = TRoles extends readonly [infer TFirst, ...infer TRest extends readonly RoleConstraint[]]
  ? ValidateRoleInheritance<TFirst, TPath, TVisited, TDepth> extends true
    ? ValidateRoleInheritanceList<TRest, TPath, TVisited, TDepth>
    : ValidateRoleInheritance<TFirst, TPath, TVisited, TDepth> // Propagate error
  : true;
```

### CircularRoleInheritanceError

```typescript
/**
 * Template literal error message for circular role inheritance.
 *
 * Follows the `CircularErrorMessage<CyclePath>` pattern from `@hex-di/graph`.
 */
export type CircularRoleInheritanceError<TPath extends string> =
  `ERROR[ACL002]: Circular role inheritance: ${TPath}. Fix: Remove one of the inherits references to break the cycle.`;
```

### Runtime Cycle Detection

TypeScript's type system cannot prevent cycles in value-level data structures (e.g., roles loaded from a database). The runtime `flattenPermissions()` function includes a visited-set cycle detector and a configurable depth limit.

```typescript
/**
 * Flattens all permissions from a role and its ancestors at runtime.
 *
 * @param role - The role to flatten
 * @param options - Optional configuration
 * @returns Result containing the flattened permission array or a CircularRoleInheritanceError
 */
function flattenPermissions(
  role: RoleConstraint,
  options?: { readonly maxDepth?: number }
): Result<ReadonlyArray<PermissionConstraint>, CircularRoleInheritanceError> {
  const maxDepth = options?.maxDepth ?? 32;
  const visited = new Set<string>();
  const permissions = new Set<PermissionConstraint>();

  function traverse(current: RoleConstraint, depth: number): boolean {
    if (depth > maxDepth) return false;
    if (visited.has(current.name)) return false; // cycle detected

    visited.add(current.name);

    for (const perm of current.permissions) {
      permissions.add(perm);
    }

    for (const parent of current.inherits) {
      if (!traverse(parent, depth + 1)) {
        return false;
      }
    }

    return true;
  }

  const success = traverse(role, 0);

  if (!success) {
    return err({
      code: "ACL002",
      message: `Circular role inheritance detected for role "${role.name}"`,
      roleName: role.name,
    });
  }

  return ok([...permissions]);
}
```

### Key Properties

| Property                | Compile-time                                           | Runtime                                     |
| ----------------------- | ------------------------------------------------------ | ------------------------------------------- |
| Detection mechanism     | DFS with `TVisited` union type                         | `Set<string>` visited set                   |
| Depth limit             | 20 (Peano counter)                                     | 32 (configurable)                           |
| Error type              | `CircularRoleInheritanceError<TPath>` template literal | `Result<..., CircularRoleInheritanceError>` |
| Behavior on cycle       | Type error with cycle path in IDE tooltip              | `Err` result with error code ACL002         |
| Behavior on depth limit | Returns accumulated permissions (defer to runtime)     | `Err` result                                |

### Practical Example

```typescript
// Compile-time cycle detection:
const RoleA = createRole({ name: "a", permissions: [], inherits: [RoleB] });
const RoleB = createRole({ name: "b", permissions: [], inherits: [RoleA] });
// Type error: "ERROR[ACL002]: Circular role inheritance: a -> b -> a. Fix: ..."

// Runtime cycle detection (e.g., roles from a database):
const dbRoleA: RoleConstraint = {
  [ROLE_BRAND]: true,
  name: "a",
  permissions: [],
  inherits: [], // will be patched to create a cycle
};
const dbRoleB: RoleConstraint = {
  [ROLE_BRAND]: true,
  name: "b",
  permissions: [],
  inherits: [dbRoleA],
};
// Imagine dbRoleA.inherits is set to [dbRoleB] from the database

const result = flattenPermissions(dbRoleA);
// result.isErr() === true
// result.error.code === "ACL002"
```

---

_Next: [04 - Policy Types](../04-policy-types.md)_
