# Type System — Phantom Brands in `@hex-di/guard`

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-TS-01                              |
> | Revision         | 2.0                                      |
> | Effective Date   | 2026-02-19                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead                           |
> | Classification   | GxP Functional Specification (DS)        |
> | Change History   | 2.0 (2026-02-19): Extracted from 01-compile-time-safety.md — phantom-brand content split into its own file (CCR-GUARD-023) |
> |                  | 1.0 (2026-02-19): Original combined file |

This document covers the **phantom-branded scalar types** in `@hex-di/guard` that enforce nominal type identity at compile time with zero runtime cost.

For structural type incompatibility patterns (`PolicyConstraint` union, `GuardedAdapter<A>`, `PoliciesDecisions<M>`, `AuthSubjectAttributes`), see [structural-safety.md](./structural-safety.md).

---

## 1. Branded Nominal Types

### 1.1 Permission Tokens

Permissions use a **structural brand** with phantom type parameters. Two `Permission<'user', 'read'>` created in different modules are the same type — because the permission name is the identity, not the module that created it.

```typescript
export const PERMISSION_BRAND: unique symbol = Symbol.for("@hex-di/guard/permission");

declare const __resourceBrand: unique symbol;  // zero runtime cost (declare)
declare const __actionBrand:   unique symbol;  // zero runtime cost (declare)

export type Permission<TResource extends string, TAction extends string> = {
  readonly [PERMISSION_BRAND]: true;
  readonly [__resourceBrand]: TResource;   // phantom — carries literal type
  readonly [__actionBrand]:   TAction;     // phantom — carries literal type
  readonly resource: TResource;
  readonly action:   TAction;
};
```

**Type-level guarantee:** `Permission<'user', 'read'>` is not assignable to `Permission<'user', 'write'>`. TypeScript catches this at the call site of `hasPermission()`.

**Cross-domain assignment blocking:** A `Permission<'document', 'read'>` cannot be accidentally passed where `Permission<'user', 'read'>` is expected. The `__resourceBrand` phantom makes the resource dimension nominally distinct.

**Covariant widening:** A `Permission<'user', 'read'>` widens to `Permission<string, string>` (the constraint type) without a cast — the phantom brands are covariant in their type parameters.

**Arithmetic widening:** Operations that combine or transform permissions return `Permission<string, string>` (unbranded from the literal perspective) unless the literal types are preserved through generics.

**Validated branding utility:** `createPermission({ resource, action })` returns a `Permission<TResource, TAction>` after runtime validation that both fields are non-empty strings.

**Contrast with Ports:** `@hex-di/core` Port tokens use `unique symbol` (per-module nominal identity). Guard permissions use `Symbol.for()` (cross-module structural identity). The intent is opposite: a port is unique to one module; a permission means the same thing everywhere.

See [behaviors/01-permission-types.md](../behaviors/01-permission-types.md) §5–8 and [INV-GD-002](../invariants.md#inv-gd-002-permission-brand-integrity).

### 1.2 Role Tokens

Roles use the same structural brand pattern as permissions, parameterized by a single literal name:

```typescript
export const ROLE_BRAND: unique symbol = Symbol.for("@hex-di/guard/role");

declare const __roleNameBrand: unique symbol;

export type Role<TName extends string> = {
  readonly [ROLE_BRAND]: true;
  readonly [__roleNameBrand]: TName;
  readonly name: TName;
  readonly inherits?: readonly Role<string>[];
  readonly grants: readonly Permission<string, string>[];
};
```

`Role<'admin'>` is not assignable to `Role<'editor'>`. Combining the phantom parameter with `Symbol.for()` gives cross-module structural identity just like permissions.

**Cascading API:**

| Branded Type | Brand Symbol | Literal Parameter | Validator | Arithmetic Widening |
|---|---|---|---|---|
| `Permission<R, A>` | `PERMISSION_BRAND` (Symbol.for) | `TResource`, `TAction` | `isPermission()` | `Permission<string, string>` |
| `Role<N>` | `ROLE_BRAND` (Symbol.for) | `TName` | `isRole()` | `Role<string>` |

See [behaviors/02-role-types.md](../behaviors/02-role-types.md) §9–12 and [INV-GD-002](../invariants.md#inv-gd-002-permission-brand-integrity).

---

## 2. Zero-Runtime-Cost Guarantee for Branded Types

All phantom-brand machinery described in this document is **erased at compile time**:

| Construct | Runtime cost |
|-----------|-------------|
| `Permission<TResource, TAction>` phantom brands (`__resourceBrand`, `__actionBrand`) | Zero — `declare const` (no value emitted) |
| `Role<TName>` phantom brand (`__roleNameBrand`) | Zero — `declare const` (no value emitted) |
| `PERMISSION_BRAND` symbol | ~1 symbol (shared via `Symbol.for`, created once at module load) |
| `ROLE_BRAND` symbol | ~1 symbol (shared via `Symbol.for`, created once at module load) |

The `declare const` phantom fields produce no JavaScript output. They exist only to carry literal type information through the type checker. The two `Symbol.for()` calls create global registry entries shared across all modules — calling `Symbol.for` again with the same key returns the same symbol.

---

_See also: [structural-safety.md](./structural-safety.md) — structural type incompatibility patterns_
_See also: [14-api-reference.md](../14-api-reference.md) §52 for the full type export list_
_See also: [ADR-GD-001](../decisions/001-branded-permission-tokens.md) — rationale for Symbol.for over unique symbol_
