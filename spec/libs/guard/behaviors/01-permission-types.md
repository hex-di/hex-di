# 02 - Permission Types

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-02                                 |
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
_Previous: [01 - Overview & Philosophy](../overview.md)_

---

## BEH-GD-001: Permission Tokens (§5)

> **Invariant:** [INV-GD-002](../invariants.md) — Permission Brand Integrity
> **See:** [ADR-GD-001](../decisions/001-branded-permission-tokens.md) — Branded permission tokens, [ADR-GD-006](../decisions/006-permission-resource-action-format.md) — Permission resource:action format
> **DoD:** [DoD 1: Permission Tokens](../16-definition-of-done.md#dod-1-permission-tokens)

Permissions are branded nominal types representing a resource+action pair. Two `Permission<'user', 'read'>` values created independently in different modules are type-compatible. This is the opposite of Ports (which use `unique symbol` for nominal typing): `user:read` means the same thing everywhere, so structural compatibility is correct.

### Type Definition

```typescript
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
export const PERMISSION_BRAND: unique symbol = Symbol.for("@hex-di/guard/permission");

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
 * @typeParam TResource - Literal string type for the resource (e.g., 'user', 'order')
 * @typeParam TAction - Literal string type for the action (e.g., 'read', 'write', 'delete')
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
```

### Why Not `unique symbol` for the Brand?

The `Port` type uses `declare const __brand: unique symbol` which creates a type that can never be structurally matched. This is intentional for Ports: two separately created port tokens should never be interchangeable.

For Permissions, we want the opposite: if two modules both create `Permission<'user', 'read'>`, they should be assignment-compatible. We achieve this by:

1. Using `Symbol.for()` for `PERMISSION_BRAND` -- same symbol identity across modules
2. Using `declare const` (not `unique symbol`) for the phantom brands -- these exist only at the type level and are matched structurally by the `TResource`/`TAction` params

### Practical Example

```typescript
// module-a.ts
const ReadUser = createPermission({ resource: "user", action: "read" });

// module-b.ts (independent, no import from module-a)
const AlsoReadUser = createPermission({ resource: "user", action: "read" });

// These are structurally compatible:
// typeof ReadUser === typeof AlsoReadUser  (at the type level)

// But these are NOT compatible:
const WriteUser = createPermission({ resource: "user", action: "write" });
// typeof ReadUser !== typeof WriteUser  (different action)
```

## BEH-GD-002: PermissionGroup (§6)

A `PermissionGroup` is a convenience factory that produces an object where each key is an action name and each value is a `Permission<TResource, TAction>` (see [ADR #6](../decisions/006-permission-resource-action-format.md) for the `"resource:action"` format rationale). This uses a mapped type over a union of action string literals.

### Type Definition

```typescript
/**
 * Maps a set of action names to Permission types for a given resource.
 *
 * Used internally by both overloads of createPermissionGroup.
 *
 * @typeParam TResource - The resource string literal shared by all permissions
 * @typeParam TActions - Either a readonly tuple of action name strings,
 *                       or a record where keys are action names and values
 *                       are permission options objects
 */
export type PermissionGroupMap<
  TResource extends string,
  TActions extends readonly string[] | Record<string, PermissionOptions>,
> = {
  readonly [K in TActions extends readonly string[]
    ? TActions[number]
    : keyof TActions & string]: Permission<TResource, K>;
};

/**
 * Per-permission configuration options.
 *
 * Currently optional — most permissions need no metadata.
 * Extensible for future use (descriptions, categories, sensitivity flags).
 */
export interface PermissionOptions {
  readonly description?: string;
  /**
   * ISO 8601 date when this permission becomes effective.
   * Before this date, the permission is not granted even if assigned.
   * Used for planned permission rollouts in change-controlled environments.
   */
  readonly effectiveDate?: string;
  /**
   * ISO 8601 date when this permission expires.
   * After this date, the permission is no longer granted.
   * Used for temporary access grants (e.g., contractor access windows).
   */
  readonly expirationDate?: string;
  /**
   * Change control identifier linking this permission to a change request.
   * Required in GxP environments where permission changes go through
   * formal change control processes.
   */
  readonly changeControlId?: string;
}

/**
 * Extracts the union of all Permission types from a PermissionGroupMap.
 *
 * @typeParam TGroup - A PermissionGroupMap type
 */
export type PermissionGroupValues<TGroup> =
  TGroup[keyof TGroup & string] extends Permission<infer _R, infer _A>
    ? TGroup[keyof TGroup & string]
    : never;
```

### Factory Function

```typescript
/**
 * Creates a group of permissions for a single resource.
 *
 * Supports two calling conventions:
 *
 * 1. **Array form** — just action names, no metadata (preferred for most cases)
 * 2. **Object form** — action names as keys with optional per-permission metadata
 *
 * @param resource - The resource name (inferred as literal type)
 * @param actions - Array of action names or object whose keys become action names
 * @returns A frozen object mapping action names to Permission tokens
 */

// Overload 1: Array of action names (simple form)
export function createPermissionGroup<
  const TResource extends string,
  const TActions extends readonly string[],
>(resource: TResource, actions: TActions): PermissionGroupMap<TResource, TActions>;

// Overload 2: Object with optional per-permission metadata
export function createPermissionGroup<
  const TResource extends string,
  const TActions extends Record<string, PermissionOptions>,
>(resource: TResource, actions: TActions): PermissionGroupMap<TResource, TActions>;
```

### Usage

```typescript
// Array form — preferred for most cases
const UserPerms = createPermissionGroup("user", ["read", "write", "delete"]);

UserPerms.read; // Permission<'user', 'read'>
UserPerms.write; // Permission<'user', 'write'>
UserPerms.delete; // Permission<'user', 'delete'>

// Object form — when per-permission metadata is needed
const OrderPerms = createPermissionGroup("order", {
  read: {},
  write: { description: "Modify existing orders" },
  cancel: { description: "Cancel orders — triggers refund workflow" },
});

OrderPerms.read; // Permission<'order', 'read'>
OrderPerms.cancel; // Permission<'order', 'cancel'>

// Type-safe: unknown actions are compile errors
UserPerms.execute; // Property 'execute' does not exist on type ...

// Extract all permissions as a union
type AllUserPerms = PermissionGroupValues<typeof UserPerms>;
// Permission<'user', 'read'> | Permission<'user', 'write'> | Permission<'user', 'delete'>
```

### Design Notes

**Two calling conventions:** The array form eliminates boilerplate for the common case where permissions carry no metadata. The object form remains available when descriptions or other options are needed. TypeScript discriminates between `readonly string[]` and `Record<string, PermissionOptions>` at the overload level — no runtime ambiguity.

**`PermissionOptions` is intentionally minimal.** It starts with an optional `description` field. Additional fields (categories, sensitivity flags, audit requirements) can be added to the interface without breaking existing call sites — both `{}` and omitted values remain valid.

## BEH-GD-003: Permission Branding (§7)

### PermissionConstraint

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

```typescript
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
 */
export type FormatPermission<P> = P extends Permission<infer R, infer A> ? `${R}:${A}` : never;
```

### Practical Example

```typescript
const ReadUser = createPermission({ resource: "user", action: "read" });

// InferResource extracts the resource literal
type Resource = InferResource<typeof ReadUser>;
// "user"

// InferAction extracts the action literal
type Action = InferAction<typeof ReadUser>;
// "read"

// FormatPermission produces the "resource:action" string
type Formatted = FormatPermission<typeof ReadUser>;
// "user:read"

// Error type when passing a non-permission
type Bad = InferResource<string>;
// NotAPermissionError<string> with helpful __message and __hint
```

### Comparison with Port Branding

| Aspect              | Port                                                                | Permission                                            |
| ------------------- | ------------------------------------------------------------------- | ----------------------------------------------------- |
| Brand symbol        | `declare const __brand: unique symbol` (nominal)                    | `Symbol.for("@hex-di/guard/permission")` (structural) |
| Cross-module compat | Two separately created Ports are NEVER compatible                   | Two identical Permissions ARE compatible              |
| Use case            | Different modules may define different interfaces for the same name | `user:read` means the same thing everywhere           |
| Phantom params      | `TService`, `TName`                                                 | `TResource`, `TAction`                                |

## Permission Registry

For IQ/OQ qualification in GxP environments, all permissions MUST be enumerable. The `PermissionRegistry` provides a centralized catalog of all defined permissions in the application.

```typescript
/**
 * A centralized registry of all permission tokens.
 *
 * Populated by createPermission() and createPermissionGroup() calls.
 * Used during IQ to verify all expected permissions are defined,
 * and during OQ to verify each permission has corresponding test coverage.
 */
interface PermissionRegistry {
  /** Returns all registered permissions as an iterable. */
  readonly getAll: () => Iterable<PermissionConstraint>;
  /** Returns the count of registered permissions. */
  readonly size: () => number;
  /** Checks if a permission with the given resource:action string is registered. */
  readonly has: (key: string) => boolean;
}
```

```
REQUIREMENT: When gxp is true, duplicate permission registration (same resource+action
             pair registered more than once) MUST produce a ConfigurationError with
             code ACL006 at graph construction time. In non-GxP mode, duplicates
             are silently deduplicated. This strict behavior prevents accidental
             permission shadowing that could lead to authorization gaps.
             Reference: ALCOA+ Accurate, 21 CFR 11.10(d).
```

---

## BEH-GD-004: createPermission Factory (§8)

### Signature

```typescript
/**
 * Creates a typed permission token.
 *
 * The returned object is frozen (Object.freeze). The resource and action
 * strings are preserved as literal types via `const` generic parameters.
 *
 * @param config - Object with `resource` and `action` string literals
 * @returns A frozen Permission object with phantom type branding
 */
export function createPermission<
  const TResource extends string,
  const TAction extends string,
>(config: {
  readonly resource: TResource;
  readonly action: TAction;
}): Permission<TResource, TAction>;
```

### Runtime Representation

At runtime, a Permission is a frozen plain object with three properties:

```typescript
const ReadUser = createPermission({ resource: "user", action: "read" });

// Runtime value:
// {
//   [Symbol.for("@hex-di/guard/permission")]: true,
//   resource: "user",
//   action: "read",
// }

Object.isFrozen(ReadUser); // true
```

The phantom brand properties (`__resourceBrand`, `__actionBrand`) exist only at the type level. They are `declare`d, not defined, so they have zero runtime footprint.

### isPermission Type Guard

```typescript
/**
 * Type guard for Permission tokens.
 *
 * Checks for the presence of the PERMISSION_BRAND symbol key.
 * Returns true for any object created by createPermission() or
 * createPermissionGroup().
 *
 * @param value - The value to check
 * @returns true if value is a Permission
 */
export function isPermission(value: unknown): value is PermissionConstraint {
  return (
    typeof value === "object" &&
    value !== null &&
    PERMISSION_BRAND in value &&
    value[PERMISSION_BRAND] === true
  );
}
```

### Usage

```typescript
import { createPermission, isPermission } from "@hex-di/guard";

const ReadUser = createPermission({ resource: "user", action: "read" });
const WriteUser = createPermission({ resource: "user", action: "write" });

// Type guard
if (isPermission(someValue)) {
  // someValue is narrowed to PermissionConstraint
  console.log(someValue.resource, someValue.action);
}

// Permissions are frozen
ReadUser.resource = "order"; // TypeError in strict mode, no-op in sloppy mode

// Permissions with the same resource+action are structurally identical
const AlsoReadUser = createPermission({ resource: "user", action: "read" });
// typeof ReadUser === typeof AlsoReadUser at the type level
```

```
RECOMMENDED: Organizations SHOULD maintain a `permissions-manifest.json` file
             listing all registered permission groups. On application startup,
             the guard adapter SHOULD verify that all permissions referenced in
             active policies are present in the manifest. If a policy references
             an unregistered permission, a WARNING-level log SHOULD be emitted
             with the unregistered permission name and the policy that references
             it. This early detection prevents runtime AccessDeniedErrors caused
             by misconfigured permission registrations.
             Reference: 21 CFR 11.10(h) (device checks for data input validity).
```

---

_Next: [03 - Role Types](./02-role-types.md)_
