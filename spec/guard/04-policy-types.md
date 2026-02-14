# 04 - Policy Types

<!-- Document Control
| Property         | Value                                    |
|------------------|------------------------------------------|
| Document ID      | GUARD-04                                 |
| Revision         | 1.0                                      |
| Effective Date   | 2026-02-13                               |
| Author           | HexDI Engineering                        |
| Reviewer         | GxP Compliance Review                    |
| Approved By      | Technical Lead, Quality Assurance Manager |
| Classification   | GxP Functional Specification             |
| Change History   | 1.0 (2026-02-13): Initial controlled release |
-->

_Previous: [03 - Role Types](./03-role-types.md)_

---

## 13. Policy Discriminated Union

Policies use a discriminated union on `kind`, following the `Result._tag` pattern. There are seven variants: four leaf policies and three composite policies. Every policy is a plain frozen object -- no classes, no methods, no callbacks.

### PolicyKind

```typescript
/**
 * Discriminant tag for all policy types.
 *
 * Each policy variant carries a `kind` discriminant that enables
 * exhaustive `switch` statements and narrowing.
 */
type PolicyKind =
  | "hasPermission"
  | "hasRole"
  | "hasAttribute"
  | "hasSignature"
  | "allOf"
  | "anyOf"
  | "not";
```

### Leaf Policies

```typescript
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
  /** Optional field-level restriction. When present, only these fields are visible to the subject. */
  readonly fields?: ReadonlyArray<string>;
}

/**
 * Policy requiring a specific role.
 *
 * Uses a string `roleName` field (not a RoleConstraint) because
 * roles are evaluated via `subject.roles.includes(policy.roleName)` —
 * string-based lookup, unlike permissions which use Set-based lookup
 * with branded tokens. The serialization format also uses `"roleName"`.
 *
 * @typeParam TRoleName - The exact role name literal
 */
export interface HasRolePolicy<TRoleName extends string = string> {
  readonly kind: "hasRole";
  readonly roleName: TRoleName;
}

/**
 * Policy checking an attribute condition via the matcher DSL.
 *
 * Attribute policies use a serializable matcher expression instead
 * of a callback function. This preserves the serialization invariant:
 * every Policy is JSON-serializable.
 *
 * @typeParam TAttribute - Literal tag for the attribute (e.g., 'ownerId', 'department')
 */
export interface HasAttributePolicy<TAttribute extends string = string> {
  readonly kind: "hasAttribute";
  readonly attribute: TAttribute;
  readonly matcher: MatcherExpression;
  /** Optional field-level restriction. When present, only these fields are visible to the subject. */
  readonly fields?: ReadonlyArray<string>;
}

/**
 * Policy requiring a validated electronic signature with a specific meaning.
 *
 * Used for 21 CFR Part 11 compliance: ensures that an action is backed by
 * a cryptographically validated signature from a re-authenticated signer.
 * The signature meaning (e.g., "approved", "reviewed") must match, and
 * optionally the signer must hold a specific role.
 *
 * Requires `SignatureServicePort` to be registered in the graph.
 *
 * @typeParam TMeaning - Literal string for the required signature meaning
 */
export interface HasSignaturePolicy<TMeaning extends string = string> {
  readonly kind: "hasSignature";
  readonly meaning: TMeaning;
  readonly signerRole?: string;
}
```

### Composite Policies

```typescript
/**
 * Policy requiring ALL child policies to pass.
 *
 * The `TPolicies` type parameter preserves the exact tuple of child
 * policies, enabling type-level extraction.
 *
 * @typeParam TPolicies - Readonly tuple of child policies (order preserved)
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
```

### Full Policy Union

```typescript
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
  | HasSignaturePolicy<string>
  | AllOfPolicy<readonly PolicyConstraint[]>
  | AnyOfPolicy<readonly PolicyConstraint[]>
  | NotPolicy<PolicyConstraint>;
```

### Exhaustive Handling

```typescript
function traversePolicy(policy: Policy): void {
  switch (policy.kind) {
    case "hasPermission":
      console.log(`requires ${policy.permission.resource}:${policy.permission.action}`);
      break;
    case "hasRole":
      console.log(`requires role ${policy.roleName}`);
      break;
    case "hasAttribute":
      console.log(`checks attribute ${policy.attribute}`);
      break;
    case "hasSignature":
      console.log(`requires signature with meaning ${policy.meaning}`);
      break;
    case "allOf":
      policy.policies.forEach(traversePolicy);
      break;
    case "anyOf":
      policy.policies.forEach(traversePolicy);
      break;
    case "not":
      traversePolicy(policy.policy);
      break;
    // No default needed -- TypeScript enforces exhaustive handling
  }
}
```

## 14. Policy Combinators

Builder functions construct policy data structures. They preserve exact child types via const-generic tuples.

### hasPermission

```typescript
/**
 * Creates a HasPermissionPolicy with preserved permission type.
 *
 * @typeParam P - Inferred Permission type (preserved in return type)
 */
export function hasPermission<P extends PermissionConstraint>(
  permission: P,
  options?: { readonly fields?: ReadonlyArray<string> }
): HasPermissionPolicy<P>;
```

### hasRole

```typescript
/**
 * Creates a HasRolePolicy from a role name string.
 *
 * @typeParam N - Inferred role name literal (preserved in return type)
 */
export function hasRole<const N extends string>(roleName: N): HasRolePolicy<N>;

/**
 * Creates a HasRolePolicy from a Role token (extracts the name).
 *
 * @typeParam R - Inferred Role type (name extracted via InferRoleName)
 */
export function hasRole<R extends RoleConstraint>(role: R): HasRolePolicy<InferRoleName<R>>;
```

### hasAttribute

```typescript
/**
 * Creates a HasAttributePolicy with a serializable matcher expression.
 *
 * @typeParam A - Attribute tag literal
 */
export function hasAttribute<const A extends string>(
  attribute: A,
  matcher: MatcherExpression,
  options?: { readonly fields?: ReadonlyArray<string> }
): HasAttributePolicy<A>;
```

### hasSignature

```typescript
/**
 * Creates a HasSignaturePolicy requiring a validated electronic signature.
 *
 * Used for 21 CFR Part 11 compliance workflows where an action must be
 * backed by a cryptographic signature. The meaning parameter specifies
 * what the signature represents (e.g., "approved", "reviewed").
 *
 * @typeParam M - Inferred meaning literal
 * @param meaning - The required signature meaning
 * @param options - Optional: signerRole restricts which roles can sign
 */
export function hasSignature<const M extends string>(
  meaning: M,
  options?: { readonly signerRole?: string }
): HasSignaturePolicy<M>;
```

### allOf

```typescript
/**
 * Creates an AllOfPolicy from a tuple of policies.
 *
 * Uses a const-generic readonly tuple to preserve exact child policy types.
 */
export function allOf<const T extends readonly PolicyConstraint[]>(...policies: T): AllOfPolicy<T>;
```

### anyOf

```typescript
/**
 * Creates an AnyOfPolicy from a tuple of policies.
 */
export function anyOf<const T extends readonly PolicyConstraint[]>(...policies: T): AnyOfPolicy<T>;
```

### not

```typescript
/**
 * Creates a NotPolicy wrapping a single child policy.
 */
export function not<P extends PolicyConstraint>(policy: P): NotPolicy<P>;
```

### Composition Example

```typescript
import {
  createPermission,
  hasPermission,
  hasRole,
  hasAttribute,
  allOf,
  anyOf,
  not,
  eq,
  subject,
} from "@hex-di/guard";

const ReadUser = createPermission({ resource: "user", action: "read" });
const WriteUser = createPermission({ resource: "user", action: "write" });
const DeleteUser = createPermission({ resource: "user", action: "delete" });

// Simple permission check
const canRead = hasPermission(ReadUser);

// Role-based check
const isAdmin = hasRole("admin");

// Attribute-based check with matcher DSL
const isOwner = hasAttribute("ownerId", eq(subject("id")));

// Complex composed policy
const canEditOwnOrAdmin = anyOf(allOf(hasPermission(WriteUser), isOwner), isAdmin);

// Negation
const isNotGuest = not(hasRole("guest"));

// Deeply composed
const fullPolicy = allOf(canEditOwnOrAdmin, isNotGuest);
// Type: AllOfPolicy<readonly [
//   AnyOfPolicy<readonly [
//     AllOfPolicy<readonly [HasPermissionPolicy<...>, HasAttributePolicy<'ownerId'>]>,
//     HasRolePolicy<'admin'>
//   ]>,
//   NotPolicy<HasRolePolicy<'guest'>>
// ]>
```

### Field-Level Access Example

Field-level access control restricts which fields of a resource a subject can see. The `fields` option on `hasPermission` and `hasAttribute` produces a `visibleFields` set on the `Allow` decision (see 05-policy-evaluator.md).

```typescript
import {
  createPermission,
  hasPermission,
  hasAttribute,
  allOf,
  eq,
  subject,
  fieldMatch,
} from "@hex-di/guard";

const ReadPatient = createPermission({ resource: "patient", action: "read" });

// A nurse can read patient records but only name and email fields
const nursePatientAccess = hasPermission(ReadPatient, { fields: ["name", "email"] });

// A department member can see salary field for users in their department
const departmentSalaryAccess = hasAttribute("department", eq(subject("department")), {
  fields: ["salary"],
});

// Combined: a nurse in the same department sees name, email (from permission)
// intersected with salary (from attribute) — resulting in no fields visible
// because the intersection of ["name", "email"] and ["salary"] is empty.
// Use anyOf instead if you want union semantics.
const restrictedAccess = allOf(nursePatientAccess, departmentSalaryAccess);

// fieldMatch matcher: restricts visibility based on a dynamic attribute match
const dynamicFieldAccess = hasAttribute(
  "accessLevel",
  fieldMatch(["name", "dob", "diagnosis"], subject("clearanceFields"))
);
```

## 15. PolicyConstraint

```typescript
/**
 * Structural constraint matching ANY policy type.
 *
 * Uses `{ readonly kind: PolicyKind }` as the minimal structural shape.
 *
 * This avoids circular reference issues that would arise if Policy
 * referred to itself directly in AllOfPolicy/AnyOfPolicy constraints.
 */
export interface PolicyConstraint {
  readonly kind: PolicyKind;
}
```

### Why PolicyConstraint Instead of Recursive Policy

TypeScript's type system handles recursive types, but using the widened `Policy` union directly in `AllOfPolicy<readonly Policy[]>` loses specific child type information. By using `PolicyConstraint` (the minimal structural shape) as the constraint and relying on the generic type parameter `T extends readonly PolicyConstraint[]` to carry the specific types, we get both:

1. **Structural soundness** -- anything with `{ kind: PolicyKind }` is accepted
2. **Full type preservation** -- the exact child types are captured in `T`

### Comparison with AdapterConstraint

| Aspect         | AdapterConstraint                             | PolicyConstraint                                                             |
| -------------- | --------------------------------------------- | ---------------------------------------------------------------------------- |
| Minimal shape  | `{ provides, requires, lifetime, ... }`       | `{ kind: PolicyKind }`                                                       |
| Purpose        | Generic bound for adapter-accepting functions | Generic bound for policy-accepting combinators                               |
| Self-reference | No (adapters don't contain adapters)          | Avoided (policies contain policies, but the constraint breaks the recursion) |

## 16. Matcher DSL

Attribute policies (`HasAttributePolicy`) use a serializable matcher DSL instead of callback functions. This preserves the serialization invariant: every Policy is JSON data, not code.

### Closed Matcher Set (v1)

The v1 matcher set is intentionally minimal. New matchers can be added in future versions without breaking changes (the matcher union is extensible via new `kind` variants).

```typescript
/**
 * Matcher kinds for attribute comparisons.
 */
type MatcherKind = "eq" | "neq" | "in" | "exists" | "fieldMatch" | "gte" | "lt";

/**
 * Reference kinds for value resolution.
 */
type ReferenceKind = "subject" | "resource" | "literal";

/**
 * A reference to a value that is resolved at evaluation time.
 */
type MatcherReference =
  | { readonly kind: "subject"; readonly path: string }
  | { readonly kind: "resource"; readonly path: string }
  | { readonly kind: "literal"; readonly value: string | number | boolean };

/**
 * A matcher expression that compares an attribute value.
 */
type MatcherExpression =
  | { readonly kind: "eq"; readonly ref: MatcherReference }
  | { readonly kind: "neq"; readonly ref: MatcherReference }
  | { readonly kind: "in"; readonly values: readonly (string | number | boolean)[] }
  | { readonly kind: "exists" }
  | {
      readonly kind: "fieldMatch";
      readonly fields: ReadonlyArray<string>;
      readonly ref: MatcherReference;
    }
  | { readonly kind: "gte"; readonly ref: MatcherReference }
  | { readonly kind: "lt"; readonly ref: MatcherReference };
```

### Builder Functions

```typescript
/**
 * Creates a subject reference for matcher comparisons.
 */
export function subject(path: string): MatcherReference {
  return { kind: "subject", path };
}

/**
 * Creates a resource reference for matcher comparisons.
 */
export function resource(path: string): MatcherReference {
  return { kind: "resource", path };
}

/**
 * Creates a literal value reference for matcher comparisons.
 */
export function literal(value: string | number | boolean): MatcherReference {
  return { kind: "literal", value };
}

/**
 * Creates an equality matcher.
 */
export function eq(ref: MatcherReference): MatcherExpression {
  return { kind: "eq", ref };
}

/**
 * Creates a not-equal matcher.
 */
export function neq(ref: MatcherReference): MatcherExpression {
  return { kind: "neq", ref };
}

/**
 * Creates an array membership matcher.
 */
export function inArray(values: readonly (string | number | boolean)[]): MatcherExpression {
  return { kind: "in", values };
}

/**
 * Creates an existence matcher (attribute is present and not undefined).
 */
export function exists(): MatcherExpression {
  return { kind: "exists" };
}

/**
 * Creates a field-match matcher that restricts visibility to specific fields
 * on the matched resource attribute. The ref resolves to the value being
 * compared, and fields lists the field names the subject is authorized to see.
 */
export function fieldMatch(
  fields: ReadonlyArray<string>,
  ref: MatcherReference
): MatcherExpression {
  return { kind: "fieldMatch", fields, ref };
}

/**
 * Creates a greater-than-or-equal matcher for numeric comparisons.
 *
 * Promoted to v1 to support temporal authorization patterns
 * (e.g., "currentHour >= 8" for business-hours policies).
 */
export function gte(ref: MatcherReference): MatcherExpression {
  return { kind: "gte", ref };
}

/**
 * Creates a less-than matcher for numeric comparisons.
 *
 * Promoted to v1 to support temporal authorization patterns
 * (e.g., "currentHour < 17" for business-hours policies).
 */
export function lt(ref: MatcherReference): MatcherExpression {
  return { kind: "lt", ref };
}
```

### Numeric Matcher Type Safety

```
REQUIREMENT: The gte() and lt() matchers MUST fail with PolicyEvaluationError
             (ACL003) if the resolved attribute value is not typeof "number".
             Implicit coercion of string values to numbers MUST NOT be performed.
             If the attribute is missing (undefined), the matcher MUST produce a
             deny decision with a reason string indicating the missing attribute —
             this is a normal deny, not an error.
             Reference: 21 CFR 11.10(h) (device checks for data input validity).
```

### Usage

```typescript
// "ownerId equals the subject's id"
const isOwner = hasAttribute("ownerId", eq(subject("id")));

// "department is not 'legal'"
const notLegal = hasAttribute("department", neq(literal("legal")));

// "status is one of 'active', 'pending'"
const isActiveOrPending = hasAttribute("status", inArray(["active", "pending"]));

// "email attribute exists"
const hasEmail = hasAttribute("email", exists());

// Compose with other policies
const canEditOwn = allOf(hasPermission(WriteUser), isOwner);
```

### Serialized Form

Every matcher expression serializes to JSON trivially:

```json
{
  "kind": "hasAttribute",
  "attribute": "ownerId",
  "matcher": {
    "kind": "eq",
    "ref": { "kind": "subject", "path": "id" }
  }
}
```

### What is NOT in v1

The following matchers are explicitly deferred to future versions:

- `gt`, `lte` -- additional numeric comparisons (v1 includes `gte` and `lt` for temporal patterns)
- `regex` -- pattern matching
- `contains`, `startsWith`, `endsWith` -- string operations
- `and`, `or`, `not` -- matcher-level logic (use policy combinators instead)
- Custom function matchers -- breaks serialization invariant

These can be added later without breaking changes because the `MatcherKind` union is extensible.

> **Field-level access control** is included in v1 via the `fields` option on `HasPermissionPolicy` and `HasAttributePolicy`, and the `fieldMatch` matcher kind. See the "Field-Level Access Example" above and `visibleFields` on `Allow` in 05-policy-evaluator.md.

### Temporal Authorization Pattern

Time-bound authorization (e.g., "approved only during business hours", "access expires after 30 days") does NOT require a new policy kind. It composes on existing infrastructure using `hasAttribute` and clock-derived subject attributes.

The pattern works by injecting time-derived attributes into the subject at `SubjectProvider` resolution time:

```typescript
// In SubjectProvider factory — inject clock-derived attributes
const subject = await fetchSubjectFromIdP(token);
const now = clock.now(); // ClockSource
const hour = new Date(now).getUTCHours();
const dayOfWeek = new Date(now).getUTCDay();

return {
  ...subject,
  attributes: {
    ...subject.attributes,
    currentHour: hour, // 0-23
    currentDayOfWeek: dayOfWeek, // 0=Sun, 6=Sat
    sessionAgeMs: Date.now() - sessionCreatedAt,
  },
};
```

```typescript
// Policy: allow batch release only during business hours (Mon-Fri, 8-17 UTC)
const businessHoursPolicy = allOf(
  hasPermission(BatchRelease),
  hasAttribute("currentHour", gte(literal(8))),
  hasAttribute("currentHour", lt(literal(17))),
  hasAttribute("currentDayOfWeek", inArray([1, 2, 3, 4, 5]))
);

// Policy: deny if session older than 30 minutes
const freshSessionPolicy = allOf(
  hasPermission(PatientRecordEdit),
  hasAttribute("sessionAgeMs", lt(literal(1_800_000)))
);
```

```
RECOMMENDED: Temporal authorization SHOULD be expressed via hasAttribute policies
             composed with clock-derived subject attributes, NOT via a dedicated
             temporal policy kind. This preserves the serialization invariant
             (section 17) and ensures temporal conditions appear in the evaluation
             trace tree.

RECOMMENDED: When using temporal authorization in GxP environments, the ClockSource
             used to derive subject attributes SHOULD be the same NTP-synchronized
             ClockSource configured in createGuardGraph() (see 07-guard-adapter.md
             and 17-gxp-compliance/03-clock-synchronization.md section 62). This ensures temporal policy
             decisions use audit-grade timestamps.
```

```
REQUIREMENT: In GxP environments using temporal authorization (hour-of-day, day-of-week,
             or minute-level policies), `maxScopeLifetimeMs` MUST be configured to match
             the temporal granularity of the policy:
             (a) Hour-based policies (e.g., "allow only during business hours 09:00-17:00"):
                 `maxScopeLifetimeMs` MUST NOT exceed 3,600,000 (1 hour).
             (b) Minute-based policies (e.g., "allow only during maintenance window
                 14:30-14:45"): `maxScopeLifetimeMs` MUST NOT exceed 60,000 (1 minute).
             (c) Day-based policies (e.g., "allow only on weekdays"): `maxScopeLifetimeMs`
                 MUST NOT exceed 86,400,000 (24 hours).
             This ensures that temporal attribute staleness does not exceed the policy's
             decision granularity, preserving contemporaneous record-keeping (ALCOA+).
             Reference: ALCOA+ Contemporaneous, 21 CFR 11.10(d), 21 CFR 11.10(g).
```

> **Note:** This is a composition pattern, not a new policy variant. The subject's temporal attributes are computed once at scope creation and remain immutable for the scope's lifetime (ADR #9). To enforce stricter temporal granularity, use `maxScopeLifetimeMs` (07-guard-adapter.md) to force periodic scope refresh. In GxP environments, the REQUIREMENT above mandates specific `maxScopeLifetimeMs` ceilings based on the temporal granularity of the active policies.

## 17. Serialization Invariant

**Every Policy is JSON-serializable, period.** This is the core differentiator of `@hex-di/guard` over callback-based authorization libraries (casl, accesscontrol).

### The Invariant

No policy variant -- including `HasSignaturePolicy` -- contains a function, a class instance, a Symbol, or any other non-serializable value. The `HasAttributePolicy` variant uses the matcher DSL (section 16), not a callback. The `HasSignaturePolicy` variant uses string fields (`meaning`, optional `signerRole`), not crypto primitives. If a user needs custom logic that cannot be expressed through the matcher DSL, they compose it outside the policy tree:

```typescript
// Instead of a hypothetical custom(fn) escape hatch:
// const policy = allOf(hasPermission(EditPerm), custom(ctx => ctx.subject.age >= 18));

// Do:
const policy = hasPermission(EditPerm);

// Check age separately in application code before evaluating policy
function canUserEdit(user: AuthSubject, policy: Policy): boolean {
  const ageCheck = Number(user.attributes["age"]) >= 18;
  if (!ageCheck) return false;

  const result = evaluate(policy, { subject: user });
  if (result.isErr()) return false;

  return result.value.kind === "allow";
}
```

### Why No `custom(fn)` in v1

If a `custom(fn)` variant is added:

1. The "policies are data" pitch becomes misleading -- any policy tree containing `custom` is non-serializable
2. `serializePolicy()` must throw or silently drop the `custom` node
3. `explainPolicy()` cannot describe what the function does
4. DevTools cannot display the policy tree completely
5. Auditors cannot export and verify the authorization model

The serialization invariant is worth preserving strictly in v1. If demand emerges for a function escape hatch, it can be added as a separate `RuntimePolicy` type that is explicitly not serializable, keeping the distinction visible in the type system.

### Round-Trip Guarantee

```typescript
const policy = allOf(
  hasPermission(createPermission({ resource: "user", action: "read" })),
  hasRole("editor"),
  hasAttribute("department", eq(literal("engineering")))
);

const json = serializePolicy(policy);
const restored = deserializePolicy(json);

// restored is structurally identical to policy
// (permission tokens are reconstructed from resource+action strings)
```

## hashPolicy Utility

The `hashPolicy()` function produces a deterministic content hash of a policy tree. This enables policy identity comparison, cache keying, and change detection for configuration management.

```typescript
/**
 * Computes a deterministic SHA-256 content hash of a policy tree.
 *
 * The hash is computed over the canonical serialized form (via serializePolicy),
 * ensuring that structurally identical policies produce identical hashes regardless
 * of construction order or reference identity.
 *
 * @param policy - The policy tree to hash
 * @returns A hex-encoded SHA-256 hash string (64 characters)
 */
function hashPolicy(policy: PolicyConstraint): string;
```

Use cases:

- **Change detection:** Compare `hashPolicy(newPolicy)` against `hashPolicy(currentPolicy)` to detect policy changes requiring change control review
- **Audit trail:** Store the policy hash in `AuditEntry.policySnapshot` for post-hoc verification that the policy evaluated matches the approved policy
- **Cache keying:** Use the hash as a cache key for pre-evaluated policy results (e.g., in DevTools explain panels)

```
RECOMMENDED: GxP environments SHOULD record hashPolicy() output in every audit entry's
             policySnapshot field. During periodic review, the stored hashes can be
             compared against the current policy definitions to detect unauthorized
             policy changes.
             Reference: EU GMP Annex 11 §10, 21 CFR 11.10(e).
```

---

_Next: [05 - Policy Evaluator](./05-policy-evaluator.md)_
