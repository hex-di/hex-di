# 03 — Policy Translation

This chapter specifies how Guard's policy model integrates with Cedar's policy language. Rather than translating Guard's `PolicyConstraint` kinds into Cedar syntax, the adapter introduces a new `cedarPolicy` factory that produces a Guard-compatible policy backed by Cedar evaluation.

---

## Guard Policy to Cedar Mapping

### Design Principle

Guard policies and Cedar policies are fundamentally different models:

- **Guard policies** are structural (discriminated union of `hasPermission`, `hasRole`, `allOf`, etc.) evaluated by Guard's `evaluate()` function
- **Cedar policies** are declarative text (`permit when { ... }`) evaluated by the Cedar engine

The adapter does NOT translate Guard policy kinds to Cedar. Instead, it provides a `cedarPolicy()` factory that creates a new Guard `PolicyConstraint` whose evaluation delegates to the Cedar engine.

REQUIREMENT (CD-POL-001): The `cedarPolicy` factory MUST produce a `PolicyConstraint` value with `kind: "cedarPolicy"` that can be composed with Guard's native policy combinators (`allOf`, `anyOf`, `not`, `labeled`).

```ts
function cedarPolicy(action: string, options?: CedarPolicyOptions): PolicyConstraint;

interface CedarPolicyOptions {
  readonly resourceType?: string;
  readonly context?: Readonly<Record<string, unknown>>;
}
```

REQUIREMENT (CD-POL-002): The `cedarPolicy` constraint MUST carry the Cedar action name and optional resource type and context overrides. These are used at evaluation time to construct the `CedarAuthorizationRequest`.

REQUIREMENT (CD-POL-003): The `cedarPolicy` constraint MUST be serializable to JSON and deserializable back to the same constraint, consistent with Guard's serialization invariant (INV-GD-5).

```ts
// Serialized form:
{
  "kind": "cedarPolicy",
  "action": "Document::Action::\"read\"",
  "resourceType": "Document::Document",
  "context": {}
}
```

---

## Cedar Policy Syntax

This section documents the Cedar policy syntax that users write. The adapter does not generate Cedar policies — users author them directly in Cedar's language.

### Policy Structure

```cedar
permit(
  principal == User::"alice",
  action == Action::"read",
  resource == Document::"report-42"
);

permit(
  principal in Group::"engineering",
  action == Action::"read",
  resource
)
when {
  resource.classification != "top-secret"
};

forbid(
  principal,
  action == Action::"delete",
  resource
)
unless {
  principal.clearanceLevel >= resource.requiredClearance
};
```

### Evaluation Semantics

REQUIREMENT (CD-POL-010): The adapter MUST preserve Cedar's three evaluation rules:

1. **Default deny** — if no policy matches, the decision is `deny`
2. **Forbid overrides permit** — if any `forbid` policy matches, the decision is `deny` regardless of permits
3. **Skip on error** — if a policy condition throws, the policy is skipped (not treated as permit or forbid)

REQUIREMENT (CD-POL-011): The adapter MUST NOT modify or intercept Cedar's evaluation semantics. The Cedar WASM engine is authoritative for policy evaluation.

---

## Policy Store

REQUIREMENT (CD-POL-020): The `CedarPolicyStore` MUST provide methods to load, add, and retrieve Cedar policy text.

```ts
interface CedarPolicyStore {
  readonly load: (policies: string) => Result<void, CedarPolicyParseError>;
  readonly add: (policyId: string, policy: string) => Result<void, CedarPolicyParseError>;
  readonly getPolicies: () => string;
  readonly getPolicyIds: () => ReadonlyArray<string>;
  readonly clear: () => void;
}
```

REQUIREMENT (CD-POL-021): The `load` method MUST parse the Cedar policy text and validate syntax. If parsing fails, it MUST return `Err(CedarPolicyParseError)` with the parse error message and position.

REQUIREMENT (CD-POL-022): The `add` method MUST assign the given policy ID to the policy annotation. If a policy with the same ID already exists, it MUST return `Err(CedarPolicyParseError)` with tag `"duplicate-policy-id"`.

REQUIREMENT (CD-POL-023): The policy store MUST be immutable-by-default. Calling `load` or `add` produces a new store state; it does not mutate the existing store. Implementation MAY use structural sharing.

REQUIREMENT (CD-POL-024): The `clear` method resets the store to an empty state. This is the only destructive operation on the store.
