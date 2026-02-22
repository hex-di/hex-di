# Type System — Structural Safety in `@hex-di/guard`

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-TS-02                              |
> | Revision         | 2.0                                      |
> | Effective Date   | 2026-02-19                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead                           |
> | Classification   | GxP Functional Specification (DS)        |
> | Change History   | 2.0 (2026-02-19): Extracted from 01-compile-time-safety.md — structural type incompatibility content split into its own file (CCR-GUARD-023) |
> |                  | 1.0 (2026-02-19): Original combined file |

This document covers **structural type incompatibility patterns** in `@hex-di/guard` — types that enforce invariants through shape constraints, mapped types, and open interfaces. All patterns have zero runtime cost.

For phantom-branded scalar types (`Permission<R,A>`, `Role<N>`), see [phantom-brands.md](./phantom-brands.md).

---

## 1. `PolicyConstraint` — Structural Discriminated Union

Policy nodes are a discriminated union exhaustively narrowable on the literal `kind` field.

### 1.1 Typed Leaf Nodes

```typescript
type HasPermissionPolicy<TResource extends string, TAction extends string> = {
  readonly kind: 'hasPermission';
  readonly permission: Permission<TResource, TAction>;
};

type HasRolePolicy<TName extends string> = {
  readonly kind: 'hasRole';
  readonly role: Role<TName>;
};

type HasAttributePolicy<TAttribute extends string> = {
  readonly kind: 'hasAttribute';
  readonly attribute: TAttribute;
  readonly matcher: MatcherExpression;
};
```

The type parameter on `HasAttributePolicy<TAttribute>` is preserved through serialization round-trips only as a `string` constraint — it serves primarily as documentation and light IDE autocompletion rather than deep structural checking, since attribute names are strings at runtime.

### 1.2 Combinator Types

```typescript
type AllOfPolicy<TPolicies extends readonly PolicyConstraint[]> = {
  readonly kind: 'allOf';
  readonly policies: TPolicies;
};

type AnyOfPolicy<TPolicies extends readonly PolicyConstraint[]> = {
  readonly kind: 'anyOf';
  readonly policies: TPolicies;
};

type NotPolicy<TPolicy extends PolicyConstraint> = {
  readonly kind: 'not';
  readonly policy: TPolicy;
};

type LabeledPolicy<TPolicy extends PolicyConstraint> = {
  readonly kind: 'labeled';
  readonly label: string;
  readonly policy: TPolicy;
};
```

These are structural wrappers — TypeScript infers the exact tuple type for `policies`, preserving the literal kinds all the way to the root. This enables the type checker to verify at the call site that a `PolicyConstraint` union is exhaustive in switch statements.

### 1.3 `PolicyConstraint` Union

```typescript
type PolicyConstraint =
  | HasPermissionPolicy<string, string>
  | HasRolePolicy<string>
  | HasAttributePolicy<string>
  | HasSignaturePolicy
  | AllOfPolicy<readonly PolicyConstraint[]>
  | AnyOfPolicy<readonly PolicyConstraint[]>
  | NotPolicy<PolicyConstraint>
  | LabeledPolicy<PolicyConstraint>;
```

The union is discriminated on `kind`. TypeScript narrows exhaustively in `evaluate()` and `serializePolicy()` switch statements. Adding a new policy kind to the union causes a compile error at every switch that doesn't handle the new case — the type system enforces complete coverage.

**Structural incompatibility enforced:** A `HasPermissionPolicy` and a `HasRolePolicy` share no `kind` value, making them structurally incompatible despite sharing the `kind` field shape. There is no structural path to confuse one for the other.

See [behaviors/03-policy-types.md](../behaviors/03-policy-types.md) §13–17 and [INV-GD-001](../invariants.md#inv-gd-001-policy-immutability).

---

## 2. `PoliciesDecisions<M>` — Mapped Type for Batch Evaluation

The primary motivation for the `usePolicies` and `evaluateBatch` APIs is **preserving key names** from the input map to the output record as a compile-time constraint.

### 2.1 Supporting Types

```typescript
/**
 * A record mapping named keys to policies.
 * `readonly` prevents accidental mutation of the policy map at the call site.
 */
type PoliciesMap = Readonly<Record<string, PolicyConstraint>>;

/**
 * Mapped type: for each key K in M, the result has a Decision at that key.
 *
 * Using `keyof M` as the mapped key preserves literal string keys when M is
 * a const object literal — TypeScript infers `"canRead" | "canWrite" | ...`
 * rather than `string`.
 */
type PoliciesDecisions<M extends PoliciesMap> = {
  readonly [K in keyof M]: Decision;
};
```

### 2.2 How the Mapped Type Propagates to Hooks

When the user writes:

```typescript
const decisions = usePolicies({
  canRead:    Policies.canRead,
  canPublish: Policies.canPublish,
})
```

TypeScript infers `M = { canRead: ...; canPublish: ... }` and returns:

```typescript
// Inferred return type:
{
  readonly canRead:    Decision;
  readonly canPublish: Decision;
}
```

If the user types `decisions.canEdit`, TypeScript produces a compile error: `Property 'canEdit' does not exist`. This guarantee costs zero runtime overhead — it is erased at compile time.

### 2.3 Deferred Variant

```typescript
type PoliciesResult<M extends PoliciesMap> =
  | { readonly status: 'pending' }
  | { readonly status: 'ready'; readonly decisions: PoliciesDecisions<M> };
```

The discriminant `status` enables exhaustive narrowing: after checking `result.status === 'ready'`, TypeScript knows `result.decisions` exists and is fully typed.

See [behaviors/10-react-integration.md](../behaviors/10-react-integration.md) §73.

---

## 3. `GuardedAdapter<A>` — Type Transformation via `guard()`

### 3.1 Problem Statement

When `guard()` wraps an adapter `A`, it must produce an adapter that:
1. Provides the same port as `A` (same `provides`)
2. Requires everything `A` requires, **plus** `PolicyEnginePort + SubjectProviderPort + AuditTrailPort`

This is a type-level transformation — the return type changes based on the input type.

### 3.2 `AdapterConstraint` and `GuardedAdapter`

```typescript
/**
 * Structural constraint for adapters accepted by guard().
 * Any object with provides + requires + factory satisfies this.
 */
type AdapterConstraint = {
  readonly provides: unknown;
  readonly requires: readonly unknown[];
  readonly factory:  (...args: unknown[]) => unknown;
};

/**
 * Computes the type of a guarded adapter:
 * - Preserves `provides` (same port provided)
 * - Extends `requires` with the three guard dependencies
 * - Preserves `factory` return type
 *
 * `[...A['requires'], PolicyEnginePort, SubjectProviderPort, AuditTrailPort]`
 * uses a tuple spread to preserve the exact original requires tuple,
 * appending the three new dependencies without losing positional type info.
 */
type GuardedAdapter<A extends AdapterConstraint> = {
  readonly provides:  A['provides'];
  readonly requires:  readonly [...A['requires'], PolicyEnginePort, SubjectProviderPort, AuditTrailPort];
  readonly factory:   (...args: [...Parameters<A['factory']>, PolicyEngine, SubjectProvider, AuditTrail]) => ReturnType<A['factory']>;
};
```

### 3.3 What TypeScript Enforces

After calling `guard(myAdapter, { resolve: myPolicy })`, the container's dependency graph type checker will:

- Allow wiring the returned adapter only when `PolicyEnginePort`, `SubjectProviderPort`, and `AuditTrailPort` are all satisfied by the enclosing graph
- Reject wiring attempts that forget one of the three guard dependencies with a compile error naming the missing port

This is the "HexDI stack ensures compile-time validation" principle applied to authorization: missing guard dependencies are caught before the first test run.

**Structural irresettability:** The `GuardedAdapter<A>` type does not expose a method to unwrap or bypass the guard. The only interface available is the guarded adapter; callers cannot extract the inner adapter `A` to bypass enforcement.

See [behaviors/06-guard-adapter.md](../behaviors/06-guard-adapter.md) §25–28.

---

## 4. `AuthSubjectAttributes` — Open Interface for Module Augmentation

By default, `subject.attributes` is typed as `Record<string, unknown>`. Applications that manage a known attribute schema can opt into compile-time checking via module augmentation:

```typescript
// In @hex-di/guard — empty by default:
export interface AuthSubjectAttributes {}

// The attributes field uses intersection to absorb consumer declarations:
export interface AuthSubject {
  readonly attributes: Readonly<Record<string, unknown> & AuthSubjectAttributes>;
  // ...
}
```

**Consumer opt-in (e.g., `src/types/guard.d.ts`):**

```typescript
declare module '@hex-di/guard' {
  interface AuthSubjectAttributes {
    email:  string;
    scopes: UserScope[];
  }
}
```

After augmentation, `subject.attributes.scopes` is typed as `UserScope[]` — no `getAttribute()` call or type guard needed. The augmentation is purely additive and compile-time-only; it does not change runtime behavior.

**When to use `getAttribute()` instead:**
- Code that must work without augmentation (e.g., library utilities, shared adapters)
- When the attribute is optional or its presence depends on the subject kind

See [behaviors/05-subject.md](../behaviors/05-subject.md) §72.

---

## 5. Type Relationship Diagram

```mermaid
classDiagram
    direction TB

    class Permission~TResource, TAction~ {
        <<branded type>>
        +[PERMISSION_BRAND]: true
        +[__resourceBrand]: TResource  ⟵ phantom
        +[__actionBrand]: TAction      ⟵ phantom
        +resource: TResource
        +action: TAction
    }

    class Role~TName~ {
        <<branded type>>
        +[ROLE_BRAND]: true
        +[__roleNameBrand]: TName  ⟵ phantom
        +name: TName
        +grants: Permission[]
    }

    class PolicyConstraint {
        <<discriminated union>>
        +kind: "hasPermission" | "hasRole" | "hasAttribute" ...
    }

    class PoliciesMap {
        <<type alias>>
        Readonly~Record~string, PolicyConstraint~~
    }

    class PoliciesDecisions~M extends PoliciesMap~ {
        <<mapped type>>
        +[K in keyof M]: Decision
    }

    class GuardedAdapter~A extends AdapterConstraint~ {
        <<type transformation>>
        +provides: A["provides"]
        +requires: [...A["requires"], PolicyEnginePort, SubjectProviderPort, AuditTrailPort]
    }

    class AuthSubjectAttributes {
        <<open interface>>
        (empty by default — extended by consumers)
    }

    class AuthSubject {
        +attributes: Record~string, unknown~ & AuthSubjectAttributes
    }

    PoliciesMap --> PolicyConstraint : "values are"
    PoliciesDecisions --> PoliciesMap : "M extends"
    GuardedAdapter --> PolicyConstraint : "resolve: PolicyConstraint"
    AuthSubject --> AuthSubjectAttributes : "intersected via open interface"
    PolicyConstraint --> Permission : "hasPermission carries"
    PolicyConstraint --> Role : "hasRole carries"
```

---

## 6. Zero-Runtime-Cost Guarantee

All structural type machinery described in this document is **erased at compile time**:

| Construct | Runtime cost |
|-----------|-------------|
| `Permission<TResource, TAction>` phantom brands | Zero — `declare const` (no value) |
| `PoliciesDecisions<M>` mapped type | Zero — type only, erased |
| `GuardedAdapter<A>` type transformation | Zero — type only, erased |
| `AuthSubjectAttributes` open interface | Zero — interface only, erased |
| `PERMISSION_BRAND` / `ROLE_BRAND` symbols | ~1 symbol per brand (shared via `Symbol.for`) |

The only runtime cost is the two `Symbol.for()` calls for the brand symbols — these are created once at module load and shared across all modules via the global symbol registry.

---

_See also: [phantom-brands.md](./phantom-brands.md) — Permission and Role phantom-branded types_
_See also: [14-api-reference.md](../14-api-reference.md) §52–58 for the full type export list_
_See also: [ADR-GD-003](../decisions/003-policy-discriminated-unions.md) — rationale for discriminated union policy types_
_See also: [ADR-GD-008](../decisions/008-guard-wraps-at-adapter-level.md) — rationale for GuardedAdapter type transformation_
