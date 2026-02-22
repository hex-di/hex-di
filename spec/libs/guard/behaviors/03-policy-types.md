# 04 - Policy Types

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-04                                 |
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
_Previous: [03 - Role Types](./02-role-types.md)_

---

## BEH-GD-009: Policy Discriminated Union (§13)

> **Invariant:** [INV-GD-001](../invariants.md) — Policy Immutability
> **DoD:** [DoD 3: Policy Data Types](../16-definition-of-done.md#dod-3-policy-data-types), [DoD 4: Policy Combinators](../16-definition-of-done.md#dod-4-policy-combinators), [DoD 20: Array Matchers](../16-definition-of-done.md#dod-20-array-matchers)

Policies use a discriminated union on `kind`, following the `Result._tag` pattern. There are ten variants: seven leaf policies and three composite policies. Every policy is a plain frozen object -- no classes, no methods, no callbacks.

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
  | "hasResourceAttribute"
  | "hasSignature"
  | "hasRelationship"
  | "allOf"
  | "anyOf"
  | "not"
  | "labeled";
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
  /** Optional field-level restriction. When present, only these fields are visible to the subject. See [ADR-GD-031](../decisions/031-field-level-access-control.md). */
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

/**
 * Policy requiring a relationship between the subject and the resource.
 *
 * Evaluated via a RelationshipResolver port. Supports direct relationships
 * (depth 1) and transitive relationships (depth > 1). The resource being
 * accessed MUST have an `id` property in the EvaluationContext.resource.
 *
 * Requires `RelationshipResolverPort` to be registered in the graph.
 *
 * @typeParam TRelation - Literal string for the required relationship type
 */
export interface HasRelationshipPolicy<TRelation extends string = string> {
  readonly kind: "hasRelationship";
  /** The relationship type to check (e.g., "owner", "viewer", "member"). */
  readonly relation: TRelation;
  /** Optional: restrict to relationships with this resource type. */
  readonly resourceType?: string;
  /** Maximum relationship traversal depth. Default: 1 (direct only). */
  readonly depth?: number;
  /** Optional field-level restriction. When present, only these fields are visible to the subject. */
  readonly fields?: ReadonlyArray<string>;
}

/**
 * Policy checking an attribute condition against a resource field.
 *
 * Reads from EvaluationContext.resource, not subject.attributes.
 * Used for policies that depend on the resource being accessed
 * (e.g., "resource must be in a specific state", "resource belongs to tenant").
 *
 * If EvaluationContext.resource is undefined or does not contain the
 * requested field, the matcher produces a deny decision (not an error).
 *
 * @typeParam TAttribute - Literal tag for the resource field (e.g., 'status', 'tenantId')
 */
export interface HasResourceAttributePolicy<TAttribute extends string = string> {
  readonly kind: "hasResourceAttribute";
  readonly attribute: TAttribute;
  readonly matcher: MatcherExpression;
  /** Optional field-level restriction. When present, only these fields are visible to the subject. */
  readonly fields?: ReadonlyArray<string>;
}

/**
 * A transparent named wrapper for a policy.
 *
 * Attaches a human-readable label to any policy for GxP audit trail
 * readability. The label appears in EvaluationTrace and Decision output.
 * The policy behaviour is unchanged — withLabel() is a transparent wrapper
 * with no effect on the allow/deny outcome.
 *
 * Primary use: replace auto-generated structural names (e.g., "allOf") with
 * meaningful names (e.g., "ContentPublishPolicy") in audit trails.
 *
 * @typeParam TPolicy - The policy being labeled
 */
export interface LabeledPolicy<TPolicy extends PolicyConstraint> {
  readonly kind: "labeled";
  readonly label: string;
  readonly policy: TPolicy;
}
```

## BEH-GD-010: Field Strategy (§13a)

```typescript
/**
 * Strategy for merging visibleFields across child policies in composite combinators.
 *
 * - "intersection": Only fields allowed by ALL children are visible (default for allOf).
 *   Follows the principle of least privilege.
 * - "union": Fields allowed by ANY child are visible. Requires evaluating ALL children
 *   (no short-circuit for anyOf). Useful when different policies grant access to
 *   different fields (e.g., owner sees all fields, viewer sees a subset).
 * - "first": Use the first-allowing child's fields (default for anyOf).
 *   Preserves short-circuit behavior.
 */
type FieldStrategy = "intersection" | "union" | "first";

/**
 * Optional configuration for composite policy combinators.
 *
 * Detected as the last argument to allOf()/anyOf() when the object has
 * a `fieldStrategy` property but no `kind` property (distinguishing it
 * from a policy).
 */
interface CombinatorOptions {
  readonly fieldStrategy?: FieldStrategy;
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
  /**
   * Strategy for merging visibleFields from allowing children.
   * Default: "intersection" (only fields allowed by ALL children are visible).
   * When set to "union", fields allowed by ANY child are visible.
   * When set to "first", the first-allowing child's fields are used.
   */
  readonly fieldStrategy?: FieldStrategy;
}

/**
 * Policy requiring ANY child policy to pass.
 *
 * @typeParam TPolicies - Readonly tuple of child policies
 */
export interface AnyOfPolicy<TPolicies extends readonly PolicyConstraint[]> {
  readonly kind: "anyOf";
  readonly policies: TPolicies;
  /**
   * Strategy for merging visibleFields from allowing children.
   * Default: "first" (use the first-allowing child's fields; preserves short-circuit).
   * When set to "union", ALL children are evaluated (no short-circuit) and fields
   * from all allowing children are merged via set union.
   * When set to "intersection", fields allowed by ALL allowing children are visible.
   *
   * CRITICAL: anyOf with fieldStrategy "union" MUST NOT short-circuit — it evaluates
   * ALL children to collect all allowing children's fields. The decision is still
   * "allow if any allows". Trace sets complete: true.
   */
  readonly fieldStrategy?: FieldStrategy;
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
  | HasResourceAttributePolicy<string>
  | HasSignaturePolicy<string>
  | HasRelationshipPolicy<string>
  | AllOfPolicy<readonly PolicyConstraint[]>
  | AnyOfPolicy<readonly PolicyConstraint[]>
  | NotPolicy<PolicyConstraint>
  | LabeledPolicy<PolicyConstraint>;
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
    case "hasRelationship":
      console.log(`requires ${policy.relation} relationship${policy.resourceType ? ` on ${policy.resourceType}` : ""}`);
      break;
    case "hasResourceAttribute":
      console.log(`checks resource field ${policy.attribute}`);
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
    case "labeled":
      console.log(`[${policy.label}]`);
      traversePolicy(policy.policy);
      break;
    // No default needed -- TypeScript enforces exhaustive handling
  }
}
```

## BEH-GD-011: Policy Combinators (§14)

> **Invariants:**
> - [INV-GD-001](../invariants.md) — Policy Immutability
> - [INV-GD-028](../invariants.md) — Field Intersection Semantics
> - [INV-GD-029](../invariants.md) — Field Union Completeness (`anyOf` with `fieldStrategy: "union"`)

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

### hasRelationship

```typescript
/**
 * Creates a HasRelationshipPolicy requiring a relationship between subject and resource.
 *
 * Used for ReBAC (Relationship-Based Access Control) where authorization depends
 * on the subject's relationship to the resource (e.g., owner, viewer, member).
 *
 * Requires RelationshipResolverPort to be registered in the graph.
 * The resource MUST have an `id` property in the EvaluationContext.
 *
 * @typeParam R - Inferred relation literal
 * @param relation - The required relationship type (e.g., "owner", "viewer")
 * @param options - Optional: resourceType, depth, fields
 */
export function hasRelationship<const R extends string>(
  relation: R,
  options?: {
    readonly resourceType?: string;
    readonly depth?: number;
    readonly fields?: ReadonlyArray<string>;
  }
): HasRelationshipPolicy<R>;
```

### hasResourceAttribute

```typescript
/**
 * Creates a HasResourceAttributePolicy matching against a resource field.
 *
 * Reads from EvaluationContext.resource, not subject.attributes.
 * If the resource is undefined or does not contain the field, produces a deny.
 *
 * @typeParam A - Resource field name literal
 */
export function hasResourceAttribute<const A extends string>(
  attribute: A,
  matcher: MatcherExpression,
  options?: { readonly fields?: ReadonlyArray<string> }
): HasResourceAttributePolicy<A>;
```

### withLabel

```typescript
/**
 * Wraps a policy with a human-readable label for audit trail readability.
 *
 * The label appears in EvaluationTrace nodes and Decision output, replacing
 * the auto-generated structural name (e.g., "allOf") with the provided label
 * (e.g., "ContentPublishPolicy"). The policy behaviour is unchanged — withLabel
 * is a transparent wrapper with no effect on the allow/deny outcome.
 *
 * @param label - Non-empty string label for audit trail and trace display
 * @param policy - The policy to wrap
 */
export function withLabel<P extends PolicyConstraint>(
  label: string,
  policy: P,
): LabeledPolicy<P>;
```

### allOf

```typescript
/**
 * Creates an AllOfPolicy from a tuple of policies.
 *
 * Uses a const-generic readonly tuple to preserve exact child policy types.
 * When the last argument has a `fieldStrategy` property but no `kind` property,
 * it is treated as CombinatorOptions (not a policy). The fieldStrategy is stored
 * on the resulting AllOfPolicy data structure.
 *
 * @param policies - Variadic policies that must ALL pass
 * @param options - Optional: last argument may be CombinatorOptions with fieldStrategy
 * @returns A frozen AllOfPolicy with the exact tuple of child policies
 */
export function allOf<const T extends readonly PolicyConstraint[]>(
  ...policies: T
): AllOfPolicy<T>;
export function allOf<const T extends readonly PolicyConstraint[]>(
  ...args: readonly [...T, CombinatorOptions]
): AllOfPolicy<T>;
```

### anyOf

```typescript
/**
 * Creates an AnyOfPolicy from a tuple of policies.
 *
 * When the last argument has a `fieldStrategy` property but no `kind` property,
 * it is treated as CombinatorOptions (not a policy). The fieldStrategy is stored
 * on the resulting AnyOfPolicy data structure.
 *
 * IMPORTANT: When fieldStrategy is "union", the resulting anyOf policy MUST NOT
 * short-circuit during evaluation — all children are evaluated to collect fields
 * from all allowing children.
 *
 * @param policies - Variadic policies where ANY must pass
 * @param options - Optional: last argument may be CombinatorOptions with fieldStrategy
 * @returns A frozen AnyOfPolicy with the exact tuple of child policies
 */
export function anyOf<const T extends readonly PolicyConstraint[]>(
  ...policies: T
): AnyOfPolicy<T>;
export function anyOf<const T extends readonly PolicyConstraint[]>(
  ...args: readonly [...T, CombinatorOptions]
): AnyOfPolicy<T>;
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

### Field Strategy Example

The `fieldStrategy` option on `allOf` and `anyOf` controls how `visibleFields` sets are merged across children. This enables OR-based field grants where different policies contribute different field sets.

```typescript
import {
  createPermission,
  hasPermission,
  hasAttribute,
  allOf,
  anyOf,
  eq,
  subject,
} from "@hex-di/guard";

const ReadDocument = createPermission({ resource: "document", action: "read" });

// Owner sees all document fields
const ownerAccess = hasPermission(ReadDocument, {
  fields: ["title", "content", "metadata", "audit_log"],
});

// Viewer sees a subset of fields
const viewerAccess = hasPermission(ReadDocument, {
  fields: ["title", "summary"],
});

// Default anyOf (fieldStrategy: "first"): uses first-allowing child's fields.
// If owner matches first, viewer fields are ignored. Short-circuits.
const defaultPolicy = anyOf(ownerAccess, viewerAccess);

// anyOf with union: evaluates ALL children, merges fields from all allowing.
// If both match: visibleFields = {"title", "content", "metadata", "audit_log", "summary"}
// If only viewer matches: visibleFields = {"title", "summary"}
const unionPolicy = anyOf(ownerAccess, viewerAccess, { fieldStrategy: "union" });

// allOf with union: all children must pass, fields merged via union instead of intersection.
// Useful when multiple mandatory checks each contribute different field grants.
const allOfUnion = allOf(
  hasPermission(ReadDocument, { fields: ["title", "content"] }),
  hasAttribute("department", eq(subject("department")), { fields: ["salary", "bonus"] }),
  { fieldStrategy: "union" },
);
// If both pass: visibleFields = {"title", "content", "salary", "bonus"}
// (intersection would give empty set since the field sets are disjoint)

// allOf with intersection (default): most restrictive
const allOfIntersect = allOf(
  hasPermission(ReadDocument, { fields: ["title", "content", "metadata"] }),
  hasAttribute("clearance", eq(subject("clearance")), { fields: ["title", "content"] }),
);
// If both pass: visibleFields = {"title", "content"} (intersection)
```

```
REQUIREMENT: When anyOf has fieldStrategy "union", the evaluator MUST evaluate ALL
             child policies regardless of intermediate allow results. The final
             decision is "allow" if any child allows, "deny" if all children deny.
             The visibleFields on the Allow decision is the set union of visibleFields
             from all allowing children. The trace MUST set complete: true.
             Reference: ADR #51.

REQUIREMENT: When allOf has fieldStrategy "union", the field merging uses set union
             instead of intersection. The evaluation behavior (short-circuit on first
             deny) is unchanged — only the field merging strategy differs.
             Reference: ADR #50.

RECOMMENDED: Use fieldStrategy "union" on anyOf when different policies grant access
             to different fields and the subject should see the union of all granted
             fields. This is the common pattern for role-based field visibility where
             owners see more fields than viewers.
```

## BEH-GD-012: PolicyConstraint (§15)

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

## BEH-GD-013: Matcher DSL (§16)

Attribute policies (`HasAttributePolicy`) use a serializable matcher DSL instead of callback functions. This preserves the serialization invariant: every Policy is JSON data, not code.

### Matcher DSL

New matchers can be added without breaking changes (the matcher union is extensible via new `kind` variants).

```typescript
/**
 * Matcher kinds for attribute comparisons.
 */
type MatcherKind =
  | "eq" | "neq" | "in" | "exists" | "fieldMatch" | "gte" | "lt"
  | "someMatch"   // at least one item in an array attribute satisfies an object matcher
  | "contains"    // an array attribute contains a resolved scalar value
  | "everyMatch"  // ALL items in an array attribute satisfy an object matcher
  | "size";       // the length of an array attribute satisfies a numeric matcher

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
 * A structural matcher for objects inside an array attribute.
 *
 * Each key maps a field name to a MatcherExpression. All entries
 * must pass for the object to match (implicit allOf semantics).
 * An empty ObjectMatcher matches any object (always true).
 */
type ObjectMatcher = Readonly<Record<string, MatcherExpression>>;

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
  | { readonly kind: "lt"; readonly ref: MatcherReference }
  | {
      readonly kind: "someMatch";
      /**
       * Structural matcher applied to each item in the array attribute.
       * Passes if at least one item satisfies ALL fields in the ObjectMatcher.
       */
      readonly matcher: ObjectMatcher;
    }
  | {
      readonly kind: "contains";
      /**
       * The value to search for. Resolved at evaluation time.
       * Passes if the array attribute includes the resolved value.
       */
      readonly ref: MatcherReference;
    }
  | {
      readonly kind: "everyMatch";
      /**
       * Structural matcher applied to each item in the array attribute.
       * Passes only if ALL items satisfy ALL fields in the ObjectMatcher.
       * An empty array produces a deny decision (no vacuous truth).
       */
      readonly matcher: ObjectMatcher;
    }
  | {
      readonly kind: "size";
      /**
       * Matcher applied to the array's length (a number).
       * Compose with gte/lt/eq to express length constraints:
       *   size(gte(literal(2))) — at least 2 items
       *   size(eq(literal(0)))  — empty array
       */
      readonly matcher: MatcherExpression;
    };
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
 * Supports temporal authorization patterns (e.g., "currentHour < 17").
 */
export function lt(ref: MatcherReference): MatcherExpression {
  return { kind: "lt", ref };
}

/**
 * Creates a someMatch matcher.
 *
 * Evaluates to true if at least one item in the array attribute satisfies
 * all entries in the ObjectMatcher. Analogous to Array.prototype.some().
 *
 * Example: Check if any user scope covers a resource's country + brand:
 *   hasAttribute('scopes', someMatch({
 *     country: eq(resource('country')),
 *     brand:   eq(resource('brand')),
 *   }))
 */
export function someMatch(matcher: ObjectMatcher): MatcherExpression {
  return { kind: "someMatch", matcher };
}

/**
 * Creates a contains matcher.
 *
 * Evaluates to true if the array attribute contains the resolved value.
 * Uses strict equality (===) for scalar comparison.
 *
 * Intended for use inside someMatch ObjectMatchers to check that a
 * field of each array item (which is itself an array) contains a
 * resource-derived scalar.
 *
 * Example: Check if the resource's indication is in any scope's indications:
 *   hasAttribute('scopes', someMatch({
 *     indications: contains(resource('indication')),
 *   }))
 */
export function contains(ref: MatcherReference): MatcherExpression {
  return { kind: "contains", ref };
}

/**
 * Creates an everyMatch matcher.
 *
 * Evaluates to true only if ALL items in the array attribute satisfy
 * all entries in the ObjectMatcher. Analogous to Array.prototype.every().
 *
 * CRITICAL: An empty array produces a deny decision. This intentionally
 * avoids vacuous truth — an empty set of items satisfying a constraint
 * is not authorization-safe.
 *
 * Example: All assigned reviewers must be certified:
 *   hasAttribute('assignedReviewers', everyMatch({ certified: eq(literal(true)) }))
 */
export function everyMatch(matcher: ObjectMatcher): MatcherExpression {
  return { kind: "everyMatch", matcher };
}

/**
 * Creates a size matcher.
 *
 * Extracts the length of an array attribute and applies a numeric matcher.
 * The resolved value passed to the inner matcher is the array's length.
 *
 * Example: User must have at least 2 scopes assigned:
 *   hasAttribute('scopes', size(gte(literal(2))))
 *
 * Example: Resource must have exactly zero pending reviews:
 *   hasResourceAttribute('pendingReviewers', size(eq(literal(0))))
 */
export function size(matcher: MatcherExpression): MatcherExpression {
  return { kind: "size", matcher };
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

```
REQUIREMENT: The someMatch() matcher MUST fail with PolicyEvaluationError (ACL003)
             if the resolved attribute value is not an Array. Implicit coercion
             of non-array values MUST NOT be performed. If the attribute is missing
             (undefined), the matcher MUST produce a deny decision, not an error.
             An empty array MUST produce a deny decision (no items can satisfy).
             Reference: ALCOA+ Accurate principle.
```

```
REQUIREMENT: The contains() matcher MUST fail with PolicyEvaluationError (ACL003)
             if the resolved attribute value is not an Array. It MUST use strict
             equality (===) for scalar comparison. Object and array values inside
             the array are compared by reference, not deep equality.
             Reference: ALCOA+ Accurate principle.
```

```
REQUIREMENT: The everyMatch() matcher MUST fail with PolicyEvaluationError (ACL003)
             if the resolved attribute value is not an Array. If the attribute is
             missing (undefined), the matcher MUST produce a deny decision, not an
             error. An empty array MUST produce a deny decision — the empty case
             MUST NOT be treated as vacuous truth. Vacuous truth is not safe for
             authorization: an empty set of reviewers "all" being approved is not
             an authorization grant.
             Reference: ALCOA+ Accurate principle.
```

```
REQUIREMENT: The size() matcher MUST fail with PolicyEvaluationError (ACL003) if
             the resolved attribute value is not an Array. The extracted length value
             is a non-negative integer. The inner matcher receives the length as its
             input value. If the attribute is missing (undefined), the matcher MUST
             produce a deny decision, not an error.
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

### Deferred Matchers

The following matchers are explicitly deferred:

- `gt`, `lte` -- additional numeric comparisons (`gte` and `lt` are included for temporal patterns)
- `regex` -- pattern matching
- `substring`, `startsWith`, `endsWith` -- string operations (note: `contains` is an **array membership** check, not a string operation)
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
             and ../compliance/gxp.md section 62). This ensures temporal policy
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

> **Note:** This is a composition pattern, not a new policy variant. The subject's temporal attributes are computed once at scope creation and remain immutable for the scope's lifetime ([ADR #9](../decisions/009-immutable-subject-within-scope.md)). To enforce stricter temporal granularity, use `maxScopeLifetimeMs` (07-guard-adapter.md) to force periodic scope refresh. In GxP environments, the REQUIREMENT above mandates specific `maxScopeLifetimeMs` ceilings based on the temporal granularity of the active policies.

## BEH-GD-014: Serialization Invariant (§17)

> **Invariant:** [INV-GD-009](../invariants.md) — Policy Serialization Round-Trip

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

## createRoleGate Factory

The `createRoleGate` factory encodes the repeating pattern `anyOf(hasRole(A), allOf(hasRole(B), requiresX), allOf(hasRole(C), requiresY), ...)` into a flat, readable declaration. It is domain-agnostic: the `requires` field accepts any `PolicyConstraint`, so the factory is not tied to any specific scope structure, field naming convention, or hierarchy.

### Binding Type

```typescript
interface RoleGateBinding {
  /** Role name (string, not a Role token). */
  readonly role: string;
  /**
   * Optional policy that must pass in addition to the role check.
   * When absent, hasRole(role) alone is the policy (no scope restriction).
   * When present, allOf(hasRole(role), requires) is generated.
   */
  readonly requires?: PolicyConstraint;
}
```

### Function Signature

```typescript
/**
 * Creates an anyOf policy encoding a role→requirement mapping.
 *
 * For each binding without `requires`, generates hasRole(role).
 * For each binding with `requires`, generates allOf(hasRole(role), requires).
 * Wraps all entries in anyOf.
 *
 * The returned policy is a plain PolicyConstraint — fully serializable.
 *
 * @param bindings - Ordered list of role→requirement bindings
 */
export function createRoleGate(
  bindings: readonly RoleGateBinding[],
): AnyOfPolicy<readonly PolicyConstraint[]>;
```

### Usage Example

```typescript
// Scope matchers — pure DSL expressions, no runtime closures
const inCountry = hasAttribute('scopes', someMatch({
  country: eq(resource('country')),
}))

const inBrand = hasAttribute('scopes', someMatch({
  country: eq(resource('country')),
  brand:   eq(resource('brand')),
}))

const inIndication = hasAttribute('scopes', someMatch({
  country:     eq(resource('country')),
  brand:       eq(resource('brand')),
  indications: contains(resource('indication')),
}))

// Write gate: editors and creators must match at least the indication
const writeScopeGate = createRoleGate([
  { role: 'global_admin'                          },
  { role: 'country_manager',  requires: inCountry    },
  { role: 'content_approver', requires: inIndication },
  { role: 'content_reviewer', requires: inIndication },
  { role: 'content_creator',  requires: inIndication },
])

// Publish gate: publishers get brand-level scope; all others need indication
const publishScopeGate = createRoleGate([
  { role: 'global_admin'                           },
  { role: 'country_manager',   requires: inCountry    },
  { role: 'content_publisher', requires: inBrand      },
  { role: 'content_approver',  requires: inIndication },
])

// Each policy picks the gate that matches its access model
export const canCreateContent  = allOf(hasPermission(ContentPerms.create),  writeScopeGate)
export const canUpdateContent  = allOf(hasPermission(ContentPerms.update),  writeScopeGate)
export const canApproveContent = allOf(hasPermission(ContentPerms.approve), writeScopeGate)
export const canPublishContent = allOf(hasPermission(ContentPerms.publish), publishScopeGate)
```

```
REQUIREMENT: createRoleGate MUST return a plain AnyOfPolicy data structure
             identical to what would be produced by manual allOf/anyOf/hasRole
             combinators. It MUST NOT use closures or function references.
             The returned policy MUST be fully JSON-serializable via serializePolicy().
```

---

## hasResourceAttribute Policy

```
REQUIREMENT: hasResourceAttribute() MUST read exclusively from EvaluationContext.resource.
             It MUST NOT access subject.attributes. If EvaluationContext.resource is
             undefined or does not contain the requested field, the matcher MUST produce
             a deny decision (not a PolicyEvaluationError). Missing resource is a normal
             deny, not an evaluation failure.
```

```
REQUIREMENT: hasResourceAttribute() MUST be fully JSON-serializable via serializePolicy().
             Its JSON form uses kind "hasResourceAttribute" with the same attribute and
             matcher structure as HasAttributePolicy.
```

---

## withLabel Policy Wrapper

```
REQUIREMENT: withLabel() MUST be transparent at evaluation time. The Decision returned
             MUST be identical to evaluating the inner policy directly. The label MUST
             appear in EvaluationTrace.label for the corresponding trace node. A labeled
             policy MUST contribute its label to any parent trace node that displays its
             children. The allow/deny outcome MUST NOT be affected by the presence
             of a withLabel wrapper.
```

```
REQUIREMENT: withLabel() MUST be fully JSON-serializable via serializePolicy().
             The label field MUST be a non-empty string. Serialization of a LabeledPolicy
             produces {"kind":"labeled","label":"...","policy":{...}}.
```

---

_Next: [05 - Policy Evaluator](./04-policy-evaluator.md)_
