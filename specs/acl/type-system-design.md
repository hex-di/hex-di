# ACL Library Type System Design

## Table of Contents

1. [Design Principles](#design-principles)
2. [Permission Types](#1-permission-types)
3. [PermissionGroup](#2-permissiongroup)
4. [Role with Flattened Inheritance](#3-role-with-flattened-inheritance)
5. [Policy Discriminated Union](#4-policy-discriminated-union)
6. [Guard Type Transformation](#5-guard-type-transformation)
7. [PolicyMap Type Constraint](#6-policymap-type-constraint)
8. [Decision Type](#7-decision-type)
9. [Utility Types](#8-utility-types)
10. [Error Types](#9-error-types)
11. [Well-Known ACL Ports](#10-well-known-acl-ports)

---

## Design Principles

The ACL type system follows the established hex-di patterns:

| Pattern                                    | hex-di Precedent                  | ACL Application                               |
| ------------------------------------------ | --------------------------------- | --------------------------------------------- |
| Phantom branding via `unique symbol`       | `Port.__brand`                    | `Permission.__permissionBrand`                |
| Structural compatibility                   | `Result._tag` discriminant        | `Permission` same resource+action = same type |
| Branded error objects                      | `NotAPortError<T>`                | `NotAPermissionError<T>`, `NotARoleError<T>`  |
| Template literal error messages            | `CircularErrorMessage<Path>`      | `CircularRoleInheritanceError<TPath>`         |
| Conditional type inference                 | `InferService<P>`                 | `InferPermissions<R>`                         |
| Mapped types for object construction       | `ResolvedDeps<TRequires>`         | `PermissionGroupMap<TResource, TActions>`     |
| Variance annotations                       | `Adapter.TProvides` uses `out`    | `Role.TPermissions` uses `out`                |
| Depth-limited recursion                    | `IsReachable` with `Depth` tuples | `FlattenRolePermissions` with `Depth` tuples  |
| `InferenceError` for debugging             | `DebugInferAdapterProvides`       | `DebugInferPermissions`                       |
| `never` handling via `[T] extends [never]` | `IsNever<T>`, `ExtractPortNames`  | `HasPermission<never>` guard                  |

**Rules (from CLAUDE.md):**

- No `any` type
- No type casts (`as X`)
- No `eslint-disable` comments
- No non-null assertions (`!`)
- Maximum type inference

---

## 1. Permission Types

### Design Decision: Structural Compatibility

Permissions are **structurally typed** -- two `Permission<'user', 'read'>` values created
independently are type-compatible. This differs from Ports (which are nominal via `unique symbol`).

**Rationale:** `user:read` means the same thing everywhere. Two modules that independently
declare "I need permission to read users" should be interoperable without one importing
the other's token. This is the opposite of Ports, where `LoggerPort` in module A and
`LoggerPort` in module B might have different interfaces.

### Type Definition

````typescript
/**
 * Brand symbol for Permission types.
 *
 * Uses a well-known symbol key (not `unique symbol`) to achieve structural
 * compatibility: two Permission<'user', 'read'> created in different modules
 * are the same type. This contrasts with Port which uses `unique symbol` for
 * nominal typing.
 *
 * The symbol is declared as a regular `const` with `Symbol.for()` to ensure
 * cross-module identity at both type and runtime level.
 */
export const PERMISSION_BRAND: unique symbol = Symbol.for("@hex-di/acl/permission");

/**
 * Unique symbol for the resource phantom type parameter.
 * Declared (not defined) for zero runtime footprint.
 */
declare const __resourceBrand: unique symbol;

/**
 * Unique symbol for the action phantom type parameter.
 * Declared (not defined) for zero runtime footprint.
 */
declare const __actionBrand: unique symbol;

/**
 * A typed permission token representing a resource+action pair.
 *
 * Permissions use structural typing with branded phantom properties:
 * - Two `Permission<'user', 'read'>` from different modules are type-compatible
 * - `Permission<'user', 'read'>` is NOT compatible with `Permission<'user', 'write'>`
 *
 * The brand properties carry type information at the type level while
 * the runtime representation is a frozen plain object with `resource` and
 * `action` string properties.
 *
 * @typeParam TResource - Literal string type for the resource (e.g., 'user', 'order')
 * @typeParam TAction - Literal string type for the action (e.g., 'read', 'write', 'delete')
 *
 * @example
 * ```typescript
 * const ReadUser = createPermission({ resource: 'user', action: 'read' });
 * // Type: Permission<'user', 'read'>
 *
 * // Structural compatibility: these are the SAME type
 * const AlsoReadUser = createPermission({ resource: 'user', action: 'read' });
 * // typeof ReadUser === typeof AlsoReadUser  (structurally)
 * ```
 */
export type Permission<TResource extends string, TAction extends string> = {
  /** Brand for type discrimination. Value is `true` at runtime. */
  readonly [PERMISSION_BRAND]: true;
  /** Phantom brand carrying the resource literal type. */
  readonly [__resourceBrand]: TResource;
  /** Phantom brand carrying the action literal type. */
  readonly [__actionBrand]: TAction;
  /** Runtime-accessible resource name. */
  readonly resource: TResource;
  /** Runtime-accessible action name. */
  readonly action: TAction;
};
````

### Why Not `unique symbol` for the Brand?

The `Port` type uses `declare const __brand: unique symbol` which creates a type that
can never be structurally matched. This is intentional for Ports: two separately created
port tokens should never be interchangeable.

For Permissions, we want the opposite: if two modules both create `Permission<'user', 'read'>`,
they should be assignment-compatible. We achieve this by:

1. Using `Symbol.for()` for `PERMISSION_BRAND` -- same symbol identity across modules
2. Using `declare const` (not `unique symbol`) for the phantom brands -- these exist
   only at the type level and are matched structurally by the `TResource`/`TAction` params

### Constraint Type

```typescript
/**
 * Structural constraint matching ANY Permission without using `any`.
 *
 * Follows the AdapterConstraint pattern from @hex-di/core:
 * - `unknown` in covariant positions
 * - `never` in contravariant positions
 *
 * Used in generic constraints: `<P extends PermissionConstraint>`
 * preserves the exact permission type for inference.
 */
export interface PermissionConstraint {
  readonly [PERMISSION_BRAND]: true;
  readonly resource: string;
  readonly action: string;
}
```

### Inference Utilities

````typescript
/**
 * Extracts the resource literal type from a Permission.
 *
 * @typeParam P - The Permission type to extract from
 * @returns The resource string literal, or `NotAPermissionError<P>`
 */
export type InferResource<P> =
  P extends Permission<infer TResource, infer _TAction> ? TResource : NotAPermissionError<P>;

/**
 * Extracts the action literal type from a Permission.
 *
 * @typeParam P - The Permission type to extract from
 * @returns The action string literal, or `NotAPermissionError<P>`
 */
export type InferAction<P> =
  P extends Permission<infer _TResource, infer TAction> ? TAction : NotAPermissionError<P>;

/**
 * Formats a permission as a "resource:action" string literal.
 *
 * Used in error messages for human-readable output.
 *
 * @example
 * ```typescript
 * type S = FormatPermission<Permission<'user', 'read'>>;
 * // S = "user:read"
 * ```
 */
export type FormatPermission<P> = P extends Permission<infer R, infer A> ? `${R}:${A}` : never;
````

### Factory Function

````typescript
/**
 * Creates a typed permission token.
 *
 * @param config - Object with `resource` and `action` string literals
 * @returns A frozen Permission object with phantom type branding
 *
 * @example
 * ```typescript
 * const ReadUser = createPermission({ resource: 'user', action: 'read' });
 * // Type: Permission<'user', 'read'>
 * ```
 */
export function createPermission<
  const TResource extends string,
  const TAction extends string,
>(config: {
  readonly resource: TResource;
  readonly action: TAction;
}): Permission<TResource, TAction>;
````

---

## 2. PermissionGroup

### Design Decision: Mapped Type from Action Keys

A `PermissionGroup` is a convenience factory that produces an object where each key
is an action name and each value is a `Permission<TResource, TAction>`. This uses
a mapped type over a union of action string literals.

### Type Definition

````typescript
/**
 * Maps a set of action names to Permission types for a given resource.
 *
 * This is the return type of `createPermissionGroup()`. Each key in the
 * resulting object corresponds to an action, and each value is the fully
 * typed Permission for that resource+action combination.
 *
 * @typeParam TResource - The resource string literal shared by all permissions
 * @typeParam TActions - A record type where keys are action names and values
 *                       are configuration objects (currently empty, reserved for
 *                       future metadata like descriptions)
 *
 * @example
 * ```typescript
 * type UserPerms = PermissionGroupMap<'user', { read: {}; write: {}; delete: {} }>;
 * // Equivalent to:
 * // {
 * //   readonly read: Permission<'user', 'read'>;
 * //   readonly write: Permission<'user', 'write'>;
 * //   readonly delete: Permission<'user', 'delete'>;
 * // }
 * ```
 */
export type PermissionGroupMap<
  TResource extends string,
  TActions extends Record<string, Record<string, never>>,
> = {
  readonly [K in keyof TActions & string]: Permission<TResource, K>;
};

/**
 * Extracts the union of all Permission types from a PermissionGroupMap.
 *
 * @typeParam TGroup - A PermissionGroupMap type
 *
 * @example
 * ```typescript
 * type AllUserPerms = PermissionGroupValues<typeof UserPerms>;
 * // Permission<'user', 'read'> | Permission<'user', 'write'> | Permission<'user', 'delete'>
 * ```
 */
export type PermissionGroupValues<TGroup> =
  TGroup extends PermissionGroupMap<infer _R, infer _A> ? TGroup[keyof TGroup] : never;
````

### Factory Function

````typescript
/**
 * Creates a group of permissions for a single resource.
 *
 * The action names are inferred from the keys of the config object.
 * Each key produces a `Permission<TResource, TActionName>`.
 *
 * @param resource - The resource name (inferred as literal type)
 * @param actions - Object whose keys become action names
 * @returns A frozen object mapping action names to Permission tokens
 *
 * @example
 * ```typescript
 * const UserPerms = createPermissionGroup('user', {
 *   read: {},
 *   write: {},
 *   delete: {},
 * });
 *
 * UserPerms.read   // Permission<'user', 'read'>
 * UserPerms.write  // Permission<'user', 'write'>
 * UserPerms.delete // Permission<'user', 'delete'>
 *
 * // Type-safe: unknown actions are compile errors
 * UserPerms.execute // Property 'execute' does not exist
 * ```
 */
export function createPermissionGroup<
  const TResource extends string,
  const TActions extends Record<string, Record<string, never>>,
>(resource: TResource, actions: TActions): PermissionGroupMap<TResource, TActions>;
````

### Why `Record<string, never>` for Action Config?

The action config values are currently empty objects (`{}`). Using `Record<string, never>`
as the constraint means:

- `{}` satisfies it (no properties means no `string -> never` violations)
- Future metadata can be added by changing the constraint
- It prevents accidentally passing non-object values

This follows the `EmptyDeps` pattern from `@hex-di/core` where `{ [__emptyDepsBrand]?: never }`
restricts what can be passed while remaining assignable from `{}`.

---

## 3. Role with Flattened Inheritance

### Design Decision: Eager Flattening at Construction Time

Role permissions are flattened eagerly when the role is created, not lazily at usage
sites. This means `Role<'editor', ...>` already contains all inherited permissions
in its type parameter. Benefits:

- Simpler consumption: `InferPermissions<typeof Editor>` returns the full set
- No recursive resolution at usage sites (avoids TypeScript depth limits)
- Circular inheritance is caught at creation time, not scattered across usage

### Type Definition

````typescript
/**
 * Brand symbol for Role types.
 *
 * Uses `Symbol.for()` like Permission (structural compatibility across modules).
 * Two roles with the same name and permissions are type-compatible.
 */
export const ROLE_BRAND: unique symbol = Symbol.for("@hex-di/acl/role");

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
 *
 * @example
 * ```typescript
 * // Direct permissions only
 * const Viewer = createRole({
 *   name: 'viewer',
 *   permissions: [ReadUser],
 * });
 * // Type: Role<'viewer', Permission<'user', 'read'>>
 *
 * // With inheritance (permissions are flattened)
 * const Editor = createRole({
 *   name: 'editor',
 *   permissions: [WriteUser],
 *   inherits: [Viewer],
 * });
 * // Type: Role<'editor', Permission<'user', 'read'> | Permission<'user', 'write'>>
 * ```
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
````

### Constraint Type

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

### Recursive Permission Flattening

````typescript
/**
 * Recursively flattens permissions from a role and all its inherited roles.
 *
 * ## Recursion Strategy
 *
 * Uses the same depth-limited recursion pattern as `IsReachable` in
 * `@hex-di/graph`. The depth counter prevents TypeScript's TS2589
 * "Type instantiation is excessively deep" error.
 *
 * | Parameter | Purpose |
 * |-----------|---------|
 * | `TRoles` | Tuple of roles to process (shrinks each iteration) |
 * | `TAcc` | Accumulator union of collected permissions |
 * | `TVisited` | Union of role names already processed (cycle detection) |
 * | `TDepth` | Peano counter tuple for depth limiting |
 *
 * ## Cycle Detection
 *
 * The `TVisited` parameter tracks which role names have been processed.
 * If a role name appears in `TVisited`, it is skipped (breaking the cycle).
 * The `CircularRoleInheritanceError` is reported separately by the
 * `ValidateRoleInheritance` type.
 *
 * ## Depth Limit
 *
 * Default max depth is 20 (sufficient for realistic role hierarchies).
 * Role hierarchies are typically shallow (3-5 levels). 20 provides ample
 * headroom while staying well within TypeScript's recursion limits.
 *
 * @typeParam TRoles - Readonly tuple of Role types to flatten
 * @typeParam TAcc - Accumulator for collected permissions (starts as `never`)
 * @typeParam TVisited - Set of already-visited role names (starts as `never`)
 * @typeParam TDepth - Peano depth counter (starts as `[]`)
 *
 * @example
 * ```typescript
 * type Flat = FlattenRolePermissions<readonly [typeof Editor]>;
 * // Permission<'user', 'read'> | Permission<'user', 'write'>
 * ```
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
    ? TAcc // Return what we have so far
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
````

### Cycle Detection for Inheritance

```typescript
/**
 * Validates that a role inheritance chain has no cycles.
 *
 * Returns `true` if the inheritance is valid (no cycles), or a
 * `CircularRoleInheritanceError` with the cycle path.
 *
 * ## Algorithm
 *
 * DFS traversal of the inheritance graph, tracking the current path.
 * If a role name appears in the current path, a cycle is detected
 * and the path is reported.
 *
 * @typeParam TRole - The role to validate
 * @typeParam TPath - Current path as a string (for error messages)
 * @typeParam TVisited - Set of role names in the current DFS path
 * @typeParam TDepth - Peano depth counter
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
 * Distributes validation over each element in the tuple.
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

### Factory Function

````typescript
/**
 * Creates a typed role with optional inheritance.
 *
 * Permissions from inherited roles are flattened into the Role's type
 * parameter at creation time. Circular inheritance is detected at
 * compile time.
 *
 * @example
 * ```typescript
 * const Viewer = createRole({
 *   name: 'viewer',
 *   permissions: [ReadUser, ReadOrder],
 * });
 *
 * const Editor = createRole({
 *   name: 'editor',
 *   permissions: [WriteUser],
 *   inherits: [Viewer],
 * });
 * // Type: Role<'editor', Permission<'user', 'read'> | Permission<'order', 'read'> | Permission<'user', 'write'>>
 * ```
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
````

### Why Direct Permissions Are Separated from Inherited

The `TPermissions` type parameter in `Role<TName, TPermissions>` contains the **complete
flattened union** -- both direct and inherited. This is computed by the factory signature:

```
TPermissions[number] | FlattenRolePermissions<TInherits>
```

At the type level, there is no distinction between "direct" and "inherited" permissions.
This is intentional: authorization checks don't care _how_ a permission was granted,
only _whether_ it's present.

---

## 4. Policy Discriminated Union

### Design Decision: Tagged Union with Generic Composition

Policies use a discriminated union on `kind`, following the `Result._tag` pattern.
Composite policies (`AllOf`, `AnyOf`, `Not`) preserve the type info of their children
using readonly tuples.

### Type Definitions

````typescript
/**
 * Discriminant tag for all policy types.
 *
 * Each policy variant carries a `kind` discriminant that enables
 * exhaustive `switch` statements and narrowing.
 */
type PolicyKind = "hasPermission" | "hasRole" | "hasAttribute" | "allOf" | "anyOf" | "not";

// ---------------------------------------------------------------------------
// Leaf Policies
// ---------------------------------------------------------------------------

/**
 * Policy requiring a specific permission.
 *
 * The Permission type parameter is preserved, enabling type-level
 * extraction of which permissions a policy checks.
 *
 * @typeParam TPermission - The exact Permission type required
 */
export interface HasPermissionPolicy<TPermission extends PermissionConstraint> {
  readonly kind: "hasPermission";
  readonly permission: TPermission;
}

/**
 * Policy requiring a specific role.
 *
 * The role name is preserved as a string literal type.
 *
 * @typeParam TRoleName - The literal role name string
 */
export interface HasRolePolicy<TRoleName extends string> {
  readonly kind: "hasRole";
  readonly roleName: TRoleName;
}

/**
 * Policy checking an arbitrary attribute predicate.
 *
 * Attribute policies are opaque at the type level -- the predicate
 * runs at runtime only. This is the escape hatch for policies that
 * cannot be expressed purely through permissions/roles (e.g.,
 * "user owns this resource", "request comes from internal network").
 *
 * @typeParam TAttribute - Optional literal tag for the attribute
 *                         (e.g., 'isOwner', 'isInternal')
 */
export interface HasAttributePolicy<TAttribute extends string = string> {
  readonly kind: "hasAttribute";
  readonly attribute: TAttribute;
  readonly check: (subject: unknown, context: unknown) => boolean | Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Composite Policies
// ---------------------------------------------------------------------------

/**
 * Policy requiring ALL child policies to pass.
 *
 * The `TPolicies` type parameter preserves the exact tuple of child
 * policies, enabling type-level extraction.
 *
 * @typeParam TPolicies - Readonly tuple of child policies (order preserved)
 *
 * @example
 * ```typescript
 * const adminOnlyWrite = allOf(hasPermission(WriteUser), hasRole('admin'));
 * // Type: AllOfPolicy<readonly [
 * //   HasPermissionPolicy<Permission<'user', 'write'>>,
 * //   HasRolePolicy<'admin'>
 * // ]>
 * ```
 */
export interface AllOfPolicy<TPolicies extends readonly PolicyConstraint[]> {
  readonly kind: "allOf";
  readonly policies: TPolicies;
}

/**
 * Policy requiring ANY child policy to pass.
 *
 * @typeParam TPolicies - Readonly tuple of child policies
 */
export interface AnyOfPolicy<TPolicies extends readonly PolicyConstraint[]> {
  readonly kind: "anyOf";
  readonly policies: TPolicies;
}

/**
 * Policy that negates a child policy.
 *
 * @typeParam TPolicy - The policy being negated
 */
export interface NotPolicy<TPolicy extends PolicyConstraint> {
  readonly kind: "not";
  readonly policy: TPolicy;
}

// ---------------------------------------------------------------------------
// Union and Constraint
// ---------------------------------------------------------------------------

/**
 * The full Policy discriminated union.
 *
 * This is the widened type used in positions where any policy is accepted.
 * Specific policy types narrow through the `kind` discriminant.
 */
export type Policy =
  | HasPermissionPolicy<PermissionConstraint>
  | HasRolePolicy<string>
  | HasAttributePolicy<string>
  | AllOfPolicy<readonly PolicyConstraint[]>
  | AnyOfPolicy<readonly PolicyConstraint[]>
  | NotPolicy<PolicyConstraint>;

/**
 * Structural constraint matching ANY policy type.
 *
 * Follows the AdapterConstraint pattern. Uses `{ readonly kind: PolicyKind }`
 * as the minimal structural shape.
 *
 * This avoids circular reference issues that would arise if Policy referred
 * to itself directly in AllOfPolicy/AnyOfPolicy constraints.
 */
export interface PolicyConstraint {
  readonly kind: PolicyKind;
}
````

### Builder Functions

````typescript
/**
 * Creates a HasPermissionPolicy with preserved permission type.
 *
 * @typeParam P - Inferred Permission type (preserved in return type)
 */
export function hasPermission<P extends PermissionConstraint>(
  permission: P
): HasPermissionPolicy<P>;

/**
 * Creates a HasRolePolicy with preserved role name literal.
 *
 * @typeParam N - Inferred role name literal
 */
export function hasRole<const N extends string>(roleName: N): HasRolePolicy<N>;

/**
 * Creates a HasAttributePolicy with an opaque runtime check.
 *
 * @typeParam A - Optional attribute tag literal
 */
export function hasAttribute<const A extends string>(
  attribute: A,
  check: (subject: unknown, context: unknown) => boolean | Promise<boolean>
): HasAttributePolicy<A>;

/**
 * Creates an AllOfPolicy from a tuple of policies.
 *
 * Uses a const-generic readonly tuple to preserve exact child policy types.
 *
 * @typeParam T - Inferred as readonly tuple of specific policy types
 *
 * @example
 * ```typescript
 * const policy = allOf(hasPermission(ReadUser), hasRole('admin'));
 * // AllOfPolicy<readonly [
 * //   HasPermissionPolicy<Permission<'user', 'read'>>,
 * //   HasRolePolicy<'admin'>
 * // ]>
 * ```
 */
export function allOf<const T extends readonly PolicyConstraint[]>(...policies: T): AllOfPolicy<T>;

/**
 * Creates an AnyOfPolicy from a tuple of policies.
 */
export function anyOf<const T extends readonly PolicyConstraint[]>(...policies: T): AnyOfPolicy<T>;

/**
 * Creates a NotPolicy wrapping a single child policy.
 */
export function not<P extends PolicyConstraint>(policy: P): NotPolicy<P>;
````

### Why `PolicyConstraint` Instead of Recursive `Policy`

TypeScript's type system handles recursive types, but using the widened `Policy` union
directly in `AllOfPolicy<readonly Policy[]>` loses the specific child type information.
By using `PolicyConstraint` (the minimal structural shape) as the constraint and relying
on the generic type parameter `T extends readonly PolicyConstraint[]` to carry the
specific types, we get both:

1. Structural soundness (anything with `{ kind: PolicyKind }` is accepted)
2. Full type preservation (the exact child types are captured in `T`)

---

## 5. Guard Type Transformation

### Design Decision: Additive Port Injection with Deduplication

The `guard()` function wraps an adapter, injecting ACL infrastructure ports
(`PolicyEnginePort`, `SubjectProviderPort`) into its `requires` tuple. If the
adapter already requires one of these ports, it is not duplicated.

### Type Definitions

````typescript
/**
 * Well-known ACL ports injected by the guard() function.
 *
 * These are fixed, module-level port constants. They use the same
 * `createPort` factory as any other hex-di port.
 */
declare const PolicyEnginePort: DirectedPort<PolicyEngine, "PolicyEngine", "outbound">;
declare const SubjectProviderPort: DirectedPort<SubjectProvider, "SubjectProvider", "outbound">;

/**
 * Tuple of ACL infrastructure ports that guard() injects.
 */
type AclPorts = readonly [typeof PolicyEnginePort, typeof SubjectProviderPort];

/**
 * Checks if a port name is already present in a port tuple.
 *
 * Uses distributive conditional types to iterate over the tuple elements.
 * Returns `true` if any element's `__portName` matches.
 *
 * @typeParam TTuple - Readonly tuple of Port types
 * @typeParam TName - Port name to search for
 */
type HasPortNamed<
  TTuple extends readonly Port<unknown, string>[],
  TName extends string,
> = TTuple extends readonly [
  infer THead extends Port<unknown, string>,
  ...infer TRest extends readonly Port<unknown, string>[],
]
  ? InferPortName<THead> extends TName
    ? true
    : HasPortNamed<TRest, TName>
  : false;

/**
 * Appends ACL ports to a requires tuple, skipping duplicates.
 *
 * For each ACL port, checks if a port with the same name already exists
 * in the original requires tuple. If it does, the ACL port is not added
 * (the existing port is assumed compatible).
 *
 * @typeParam TOriginal - Original requires tuple from the adapter
 * @typeParam TToAdd - Tuple of ACL ports to inject (default: AclPorts)
 *
 * @example
 * ```typescript
 * // No overlap: all ACL ports added
 * type R1 = AppendAclPorts<readonly [DbPort]>;
 * // readonly [DbPort, typeof PolicyEnginePort, typeof SubjectProviderPort]
 *
 * // PolicyEnginePort already present: only SubjectProviderPort added
 * type R2 = AppendAclPorts<readonly [DbPort, typeof PolicyEnginePort]>;
 * // readonly [DbPort, typeof PolicyEnginePort, typeof SubjectProviderPort]
 *
 * // Both already present: nothing added
 * type R3 = AppendAclPorts<readonly [typeof PolicyEnginePort, typeof SubjectProviderPort]>;
 * // readonly [typeof PolicyEnginePort, typeof SubjectProviderPort]
 * ```
 */
type AppendAclPorts<
  TOriginal extends readonly Port<unknown, string>[],
  TToAdd extends readonly Port<unknown, string>[] = AclPorts,
> = TToAdd extends readonly [
  infer THead extends Port<unknown, string>,
  ...infer TRest extends readonly Port<unknown, string>[],
]
  ? HasPortNamed<TOriginal, InferPortName<THead> & string> extends true
    ? AppendAclPorts<TOriginal, TRest> // Skip: already in original
    : AppendAclPorts<readonly [...TOriginal, THead], TRest> // Add to end
  : TOriginal;

/**
 * Type transformation applied by guard() to an adapter.
 *
 * Preserves all adapter type parameters except `TRequires` and
 * `TRequiresTuple`, which gain the ACL infrastructure ports.
 *
 * Uses conditional type inference (the `InferPlaceholder` pattern from
 * `@hex-di/core`) to extract each type parameter from the input adapter,
 * then reconstructs with the modified requires.
 *
 * @typeParam TAdapter - The adapter type to guard
 *
 * @example
 * ```typescript
 * // Input adapter:
 * //   Adapter<UserRepoPort, DbPort, 'scoped', 'sync', false, readonly [DbPort]>
 * //
 * // Output type:
 * //   Adapter<UserRepoPort, DbPort | PolicyEnginePort | SubjectProviderPort,
 * //           'scoped', 'sync', false,
 * //           readonly [DbPort, PolicyEnginePort, SubjectProviderPort]>
 *
 * type Guarded = GuardedAdapter<typeof UserRepoAdapter>;
 * ```
 */
export type GuardedAdapter<TAdapter> =
  TAdapter extends Adapter<
    infer TProvides,
    infer _TRequires,
    infer TLifetime,
    infer TFactoryKind,
    infer TClonable,
    infer TRequiresTuple extends readonly Port<unknown, string>[]
  >
    ? Adapter<
        TProvides,
        TupleToUnion<AppendAclPorts<TRequiresTuple>>,
        TLifetime,
        TFactoryKind,
        TClonable,
        AppendAclPorts<TRequiresTuple>
      >
    : NotAnAdapterError<TAdapter>;

/**
 * Error type when guard() receives a non-adapter.
 */
type NotAnAdapterError<T> = {
  readonly __errorBrand: "NotAnAdapterError";
  readonly __message: "Expected an Adapter type. guard() can only wrap adapters created with createAdapter().";
  readonly __received: T;
};
````

### Factory Function

````typescript
/**
 * Wraps an adapter with authorization enforcement.
 *
 * The returned adapter:
 * 1. Requires the same ports as the original PLUS PolicyEngine and SubjectProvider
 * 2. Before invoking the original factory, evaluates the provided policy
 * 3. If the policy denies, throws an AuthorizationError (or returns Err)
 * 4. If the policy allows, delegates to the original factory
 *
 * @typeParam A - The adapter type (fully inferred)
 * @param adapter - The adapter to wrap
 * @param options - Object with `resolve` (policy for resolve-time checks)
 * @returns A new adapter with the same provides but augmented requires
 *
 * @example
 * ```typescript
 * const GuardedUserRepo = guard(UserRepoAdapter, {
 *   resolve: hasPermission(ReadUser),
 * });
 * // GuardedUserRepo requires: [DbPort, PolicyEnginePort, SubjectProviderPort]
 * ```
 */
export function guard<A extends AdapterConstraint>(
  adapter: A,
  options: { readonly resolve: PolicyConstraint }
): GuardedAdapter<A>;
````

### Edge Cases

| Scenario                                    | Behavior                                     |
| ------------------------------------------- | -------------------------------------------- |
| Adapter already requires `PolicyEnginePort` | Not duplicated; `AppendAclPorts` skips it    |
| Adapter already requires both ACL ports     | Returned requires is identical to input      |
| Adapter has no requires (`readonly []`)     | ACL ports are the only requires              |
| Adapter has async factory (`'async'`)       | Preserved; guard wraps the async factory     |
| Adapter is clonable                         | Preserved; guard does not affect clonability |

---

## 6. PolicyMap Type Constraint

### Design Decision: Computed Property Keys from Port Symbols

Ports are used as computed property keys in the policy map. At runtime, a `Port` is a
frozen object with a `__portName` string property, so it cannot be used as an object key
directly. The `PolicyMap` uses the port's `__portName` as the key type while accepting
the port value as the computed key at runtime (via `toString()` or a Symbol).

### Type Definition

````typescript
/**
 * Brand symbol for PolicyMap identification.
 */
declare const __policyMapBrand: unique symbol;

/**
 * Maps port names to their authorization policies.
 *
 * Each entry associates a port (identified by its name) with a policy
 * that must be satisfied before the port's service can be resolved.
 *
 * The `TMap` type parameter preserves the exact mapping for compile-time
 * policy analysis.
 *
 * @typeParam TMap - Record mapping port name strings to PolicyConstraint types
 *
 * @example
 * ```typescript
 * const map = createPolicyMap({
 *   UserRepo: hasPermission(ReadUser),    // Port name as key
 *   PaymentService: hasRole('admin'),     // Different policy type
 * });
 * // PolicyMap<{
 * //   readonly UserRepo: HasPermissionPolicy<Permission<'user', 'read'>>;
 * //   readonly PaymentService: HasRolePolicy<'admin'>;
 * // }>
 * ```
 */
export type PolicyMap<TMap extends Record<string, PolicyConstraint>> = {
  readonly [__policyMapBrand]: true;
  readonly policies: { readonly [K in keyof TMap]: TMap[K] };
};

/**
 * Configuration type for `createPolicyMap()`.
 *
 * Accepts an object where:
 * - Keys are port name strings (from `Port.__portName`)
 * - Values are Policy instances
 *
 * @typeParam TPorts - A union of Port types that serve as valid keys
 *
 * @remarks
 * When using computed property keys with Port values, TypeScript resolves
 * the key to the Port's `__portName` string literal type. This enables
 * type-safe mapping from ports to policies:
 *
 * ```typescript
 * // If UserRepoPort.__portName is "UserRepo", then:
 * const map = { [UserRepoPort.__portName]: somePolicy };
 * // key type is "UserRepo" (literal)
 * ```
 *
 * In practice, we provide a helper that accepts Port values and extracts
 * names internally.
 */
export type PolicyMapConfig<TPorts extends Port<unknown, string>> = {
  readonly [K in InferPortName<TPorts> & string]?: PolicyConstraint;
};

/**
 * Type-safe helper for building a PolicyMap from Port values.
 *
 * Accepts entries as `[Port, Policy]` tuples for ergonomic construction.
 *
 * @example
 * ```typescript
 * const map = createPolicyMap(
 *   [UserRepoPort, hasPermission(ReadUser)],
 *   [PaymentPort, hasRole('admin')],
 * );
 * ```
 */
export function createPolicyMap<
  const T extends readonly (readonly [Port<unknown, string>, PolicyConstraint])[],
>(...entries: T): PolicyMap<PolicyMapFromEntries<T>>;

/**
 * Converts a tuple of [Port, Policy] entries into a mapped record type.
 *
 * @typeParam T - Readonly tuple of [Port, Policy] pairs
 */
type PolicyMapFromEntries<
  T extends readonly (readonly [Port<unknown, string>, PolicyConstraint])[],
> = T extends readonly [
  readonly [infer TPort extends Port<unknown, string>, infer TPolicy extends PolicyConstraint],
  ...infer TRest extends readonly (readonly [Port<unknown, string>, PolicyConstraint])[],
]
  ? { readonly [K in InferPortName<TPort> & string]: TPolicy } & PolicyMapFromEntries<TRest>
  : {};
````

---

## 7. Decision Type

### Design Decision: Discriminated Union with Trace

Decisions follow the `Result` pattern -- a tagged union discriminated on `kind`.
Every decision carries an `EvaluationTrace` for debugging/auditing.

### Type Definitions

````typescript
/**
 * A trace node recording how a policy was evaluated.
 *
 * Forms a tree structure: composite policies (allOf, anyOf) have
 * `children` traces, leaf policies (hasPermission, hasRole) do not.
 */
export interface EvaluationTrace {
  /** The policy kind that was evaluated */
  readonly policyKind: PolicyKind;
  /** Human-readable label for the policy (e.g., "hasPermission(user:read)") */
  readonly label: string;
  /** The decision for this specific node */
  readonly decision: "allow" | "deny";
  /** Evaluation duration in milliseconds */
  readonly durationMs: number;
  /** Child traces for composite policies */
  readonly children: readonly EvaluationTrace[];
}

/**
 * An allow decision.
 *
 * Contains the policy label that caused the allow and the full
 * evaluation trace for auditing.
 */
export interface Allow {
  readonly kind: "allow";
  /** Label of the policy that produced this decision */
  readonly policy: string;
  /** Full evaluation tree */
  readonly trace: EvaluationTrace;
}

/**
 * A deny decision.
 *
 * Contains the policy label, a human-readable reason, and the full
 * evaluation trace for debugging.
 */
export interface Deny {
  readonly kind: "deny";
  /** Label of the policy that produced this decision */
  readonly policy: string;
  /** Human-readable reason for denial */
  readonly reason: string;
  /** Full evaluation tree */
  readonly trace: EvaluationTrace;
}

/**
 * The result of evaluating an authorization policy.
 *
 * Discriminated on `kind`:
 * - `'allow'`: Subject has the required authorization
 * - `'deny'`: Subject does not have the required authorization
 *
 * @example
 * ```typescript
 * function handleDecision(decision: Decision): void {
 *   switch (decision.kind) {
 *     case 'allow':
 *       // Proceed with operation
 *       break;
 *     case 'deny':
 *       // Log denial reason and reject
 *       console.error(`Denied: ${decision.reason}`);
 *       break;
 *   }
 * }
 * ```
 */
export type Decision = Allow | Deny;
````

### Why Not `Result<Allow, Deny>`?

Using the hex-di `Result` type was considered but rejected:

1. `Decision` is not an error/success pair -- a `Deny` is a valid, expected outcome, not an error
2. `Decision` carries domain-specific fields (`reason`, `trace`) that don't fit `Result.Err`
3. The `Decision` discriminant (`kind: 'allow' | 'deny'`) is more domain-appropriate than `_tag: 'Ok' | 'Err'`

The `Result` type is used elsewhere in the ACL library for operations that can actually
fail (e.g., `resolve()` returning `Result<Service, AuthorizationError>`).

---

## 8. Utility Types

### InferPermissions

````typescript
/**
 * Extracts the permission union from a Role type.
 *
 * This is the primary user-facing utility for inspecting what permissions
 * a role grants. Because permissions are eagerly flattened at role creation
 * time, this simply extracts the `TPermissions` phantom parameter.
 *
 * @typeParam R - A Role type
 * @returns Union of Permission types, or `NotARoleError<R>` if not a Role
 *
 * @example
 * ```typescript
 * type EditorPerms = InferPermissions<typeof Editor>;
 * // Permission<'user', 'read'> | Permission<'user', 'write'>
 * ```
 */
export type InferPermissions<R> =
  R extends Role<infer _TName, infer TPermissions> ? TPermissions : NotARoleError<R>;
````

### InferPolicyRequirements

````typescript
/**
 * Recursively extracts all permissions checked by a policy.
 *
 * Traverses the policy tree, collecting Permission types from
 * `HasPermissionPolicy` nodes. Composite policies (allOf, anyOf, not)
 * are recursed into.
 *
 * ## Recursion Strategy
 *
 * Uses depth-limited recursion (max 10 levels). Policy trees are
 * typically shallow (2-4 levels deep).
 *
 * @typeParam P - A Policy type
 * @typeParam TDepth - Peano depth counter (internal)
 *
 * @returns Union of Permission types checked by the policy, or `never`
 *          if the policy doesn't check any permissions directly
 *
 * @example
 * ```typescript
 * const policy = allOf(
 *   hasPermission(ReadUser),
 *   anyOf(hasPermission(WriteUser), hasRole('admin')),
 * );
 *
 * type Reqs = InferPolicyRequirements<typeof policy>;
 * // Permission<'user', 'read'> | Permission<'user', 'write'>
 *
 * // hasRole('admin') doesn't contribute permissions directly
 * ```
 */
type PolicyRequirementsMaxDepth = 10;

export type InferPolicyRequirements<
  P,
  TDepth extends readonly unknown[] = [],
> = TDepth["length"] extends PolicyRequirementsMaxDepth
  ? never
  : P extends HasPermissionPolicy<infer TPerm>
    ? TPerm
    : P extends AllOfPolicy<infer TPolicies>
      ? InferPolicyRequirementsFromTuple<TPolicies, TDepth>
      : P extends AnyOfPolicy<infer TPolicies>
        ? InferPolicyRequirementsFromTuple<TPolicies, TDepth>
        : P extends NotPolicy<infer TInner>
          ? InferPolicyRequirements<TInner, [...TDepth, unknown]>
          : never; // HasRolePolicy, HasAttributePolicy don't yield permissions

/**
 * Helper: extracts permissions from a tuple of policies.
 */
type InferPolicyRequirementsFromTuple<
  T extends readonly PolicyConstraint[],
  TDepth extends readonly unknown[],
> = T extends readonly [
  infer THead extends PolicyConstraint,
  ...infer TRest extends readonly PolicyConstraint[],
]
  ?
      | InferPolicyRequirements<THead, [...TDepth, unknown]>
      | InferPolicyRequirementsFromTuple<TRest, TDepth>
  : never;
````

### InferRoleName

```typescript
/**
 * Extracts the name literal from a Role type.
 *
 * @typeParam R - A Role type
 * @returns The role name literal string, or `NotARoleError<R>`
 */
export type InferRoleName<R> =
  R extends Role<infer TName, infer _TPerms> ? TName : NotARoleError<R>;
```

### DebugInferPermissions

```typescript
/**
 * Debug version of InferPermissions that returns `InferenceError`
 * instead of the branded error type.
 *
 * Provides detailed diagnostic info in IDE tooltips.
 *
 * @typeParam R - The type to extract from
 */
export type DebugInferPermissions<R> =
  R extends Role<infer _TName, infer TPermissions>
    ? TPermissions
    : InferenceError<
        "InferPermissions",
        "Input is not a valid Role type. Expected Role<TName, TPermissions>.",
        R
      >;
```

### PermissionEquals

```typescript
/**
 * Checks if two Permission types are equivalent.
 *
 * Two permissions are equal if they have the same resource AND action.
 * Uses bidirectional extends check for soundness.
 *
 * @typeParam A - First permission
 * @typeParam B - Second permission
 * @returns `true` if equal, `false` otherwise
 */
export type PermissionEquals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
```

---

## 9. Error Types

### NotAPermissionError

````typescript
/**
 * Branded error type returned when a non-permission is passed to a
 * permission-expecting utility.
 *
 * Follows the `NotAPortError<T>` pattern from `@hex-di/core`.
 *
 * @typeParam T - The actual type that was received (preserved for debugging)
 *
 * @example IDE tooltip
 * ```typescript
 * type Bad = InferResource<string>;
 * // {
 * //   __errorBrand: "NotAPermissionError";
 * //   __message: "Expected a Permission type created with createPermission()";
 * //   __received: string;
 * //   __hint: "Ensure you're passing a Permission<TResource, TAction>, not a plain string or object.";
 * // }
 * ```
 */
export type NotAPermissionError<T> = {
  readonly __errorBrand: "NotAPermissionError";
  readonly __message: "Expected a Permission type created with createPermission()";
  readonly __received: T;
  readonly __hint: "Ensure you're passing a Permission<TResource, TAction>, not a plain string or object.";
};
````

### NotARoleError

```typescript
/**
 * Branded error type returned when a non-role is passed to a role-expecting utility.
 *
 * @typeParam T - The actual type that was received
 */
export type NotARoleError<T> = {
  readonly __errorBrand: "NotARoleError";
  readonly __message: "Expected a Role type created with createRole()";
  readonly __received: T;
  readonly __hint: "Ensure you're passing a Role<TName, TPermissions>, not a plain string or object.";
};
```

### CircularRoleInheritanceError

````typescript
/**
 * Template literal error message for circular role inheritance.
 *
 * Follows the `CircularErrorMessage<CyclePath>` pattern from `@hex-di/graph`.
 * The cycle path is constructed during type-level DFS traversal and embedded
 * directly in the error string for immediate readability in IDE tooltips.
 *
 * @typeParam TPath - String showing the inheritance cycle
 *                    (e.g., "admin -> editor -> reviewer -> admin")
 *
 * @example
 * ```typescript
 * // When Admin inherits from Editor which inherits from Admin:
 * type Err = CircularRoleInheritanceError<"admin -> editor -> admin">;
 * // "ERROR[ACL001]: Circular role inheritance: admin -> editor -> admin. Fix: Remove one of the inherits references to break the cycle."
 * ```
 */
export type CircularRoleInheritanceError<TPath extends string> =
  `ERROR[ACL001]: Circular role inheritance: ${TPath}. Fix: Remove one of the inherits references to break the cycle.`;
````

### DuplicatePermissionError

````typescript
/**
 * Template literal error message for duplicate permissions in a role.
 *
 * This is a WARNING rather than a hard error -- duplicate permissions
 * are collapsed at the type level (union deduplication) but flagged
 * at runtime for debugging.
 *
 * @typeParam TPermission - The duplicate permission, formatted as "resource:action"
 *
 * @example
 * ```typescript
 * type Warn = DuplicatePermissionWarning<"user:read">;
 * // "WARNING[ACL002]: Duplicate permission 'user:read' in role. The duplicate is ignored but may indicate a configuration error."
 * ```
 */
export type DuplicatePermissionWarning<TPermission extends string> =
  `WARNING[ACL002]: Duplicate permission '${TPermission}' in role. The duplicate is ignored but may indicate a configuration error.`;
````

### PolicyEvaluationError

```typescript
/**
 * Template literal error for policy evaluation failures.
 *
 * Used when a policy's runtime check throws an exception rather than
 * returning a clean allow/deny decision.
 *
 * @typeParam TPolicyLabel - Human-readable label of the failing policy
 */
export type PolicyEvaluationError<TPolicyLabel extends string> =
  `ERROR[ACL003]: Policy evaluation failed for '${TPolicyLabel}'. The policy check threw an exception instead of returning a decision.`;
```

### Error Code Allocation

| Code   | Category   | Description                     |
| ------ | ---------- | ------------------------------- |
| ACL001 | Type-level | Circular role inheritance       |
| ACL002 | Warning    | Duplicate permission in role    |
| ACL003 | Runtime    | Policy evaluation exception     |
| ACL004 | Type-level | Not a permission error          |
| ACL005 | Type-level | Not a role error                |
| ACL006 | Runtime    | Subject provider not configured |
| ACL007 | Runtime    | Policy engine not configured    |

---

## 10. Well-Known ACL Ports

These are the infrastructure ports that the ACL library exports for integration
with the hex-di dependency injection graph.

```typescript
/**
 * Service interface for the policy evaluation engine.
 *
 * The policy engine evaluates policies against a subject and returns
 * an authorization decision.
 */
export interface PolicyEngine {
  evaluate(policy: PolicyConstraint, subject: AuthSubject, context?: unknown): Promise<Decision>;
}

/**
 * Service interface for providing the current authorization subject.
 *
 * The subject provider is responsible for extracting the current user/
 * caller identity from the execution context (e.g., HTTP request headers,
 * gRPC metadata, ambient context).
 */
export interface SubjectProvider {
  getSubject(): Promise<AuthSubject>;
}

/**
 * The authorization subject -- the entity being authorized.
 *
 * Contains the subject's identity, roles, and permissions. This is
 * the data that policies evaluate against.
 */
export interface AuthSubject {
  /** Unique identifier for the subject */
  readonly id: string;
  /** Role names assigned to the subject */
  readonly roles: readonly string[];
  /** Permission tokens assigned to the subject (direct grants) */
  readonly permissions: readonly PermissionConstraint[];
  /** Arbitrary attributes for attribute-based policies */
  readonly attributes: Readonly<Record<string, unknown>>;
}

/**
 * Port for the policy evaluation engine.
 *
 * This is a well-known outbound port. Adapters that need authorization
 * checks depend on this port.
 */
export const PolicyEnginePort = createPort<"PolicyEngine", PolicyEngine>({
  name: "PolicyEngine",
  direction: "outbound",
  category: "infrastructure",
  description: "Authorization policy evaluation engine",
});

/**
 * Port for the subject provider.
 *
 * This is a well-known outbound port. The guard() wrapper injects
 * this dependency to obtain the current authorization subject.
 */
export const SubjectProviderPort = createPort<"SubjectProvider", SubjectProvider>({
  name: "SubjectProvider",
  direction: "outbound",
  category: "infrastructure",
  description: "Provides the current authorization subject from execution context",
});
```

---

## Appendix A: Type Relationship Diagram

```
Permission<R, A>
  |
  +-- PermissionGroupMap<R, Actions>  (mapped type: action keys -> Permission)
  |
  +-- PermissionConstraint            (structural supertype for constraints)

Role<Name, Perms>
  |
  +-- FlattenRolePermissions          (recursive inheritance flattening)
  |
  +-- RoleConstraint                  (structural supertype for constraints)
  |
  +-- ValidateRoleInheritance         (cycle detection DFS)

Policy (discriminated union)
  |
  +-- HasPermissionPolicy<P>          (leaf: checks permission)
  +-- HasRolePolicy<N>                (leaf: checks role name)
  +-- HasAttributePolicy<A>           (leaf: runtime predicate)
  +-- AllOfPolicy<[...]>              (composite: AND)
  +-- AnyOfPolicy<[...]>              (composite: OR)
  +-- NotPolicy<P>                    (composite: NOT)
  |
  +-- PolicyConstraint                (structural supertype: { kind: PolicyKind })

GuardedAdapter<A>
  |
  +-- AppendAclPorts<Requires>        (deduplicating port injection)
  +-- HasPortNamed<Tuple, Name>       (port name lookup in tuple)

Decision
  |
  +-- Allow                           (tagged: kind = 'allow')
  +-- Deny                            (tagged: kind = 'deny')
  +-- EvaluationTrace                 (recursive tree of evaluation steps)
```

## Appendix B: Comparison with Existing hex-di Patterns

| ACL Concept                    | hex-di Precedent                  | Key Difference                                     |
| ------------------------------ | --------------------------------- | -------------------------------------------------- |
| `Permission<R, A>`             | `Port<T, TName>`                  | Structural (not nominal) -- same R+A = same type   |
| `Role<N, P>`                   | `GraphBuilder` type-state         | Eager flattening vs. lazy validation               |
| `PolicyConstraint`             | `AdapterConstraint`               | Minimal `{ kind }` shape vs. full structural match |
| `FlattenRolePermissions`       | `IsReachable`                     | Accumulator pattern vs. boolean DFS result         |
| `GuardedAdapter<A>`            | Builder's `provide()` return type | Additive transformation (inject ports)             |
| `CircularRoleInheritanceError` | `CircularErrorMessage`            | Same template literal pattern, ACL error codes     |
| `NotAPermissionError<T>`       | `NotAPortError<T>`                | Same branded error object pattern                  |
| `createPolicyMap(...)`         | `ResolvedDeps<TRequires>`         | Port-keyed mapped type                             |
| `EvaluationTrace`              | `InspectionNode` tree             | Similar recursive tree structure for debugging     |
