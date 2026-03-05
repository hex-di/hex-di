# 03 — Policy Translation

This chapter specifies how Guard's policy model integrates with OPA/Rego. Like the Cedar adapter, the Rego adapter introduces a new `regoPolicy` factory rather than translating Guard policy kinds to Rego.

---

## Guard Policy to OPA Mapping

### Design Principle

Guard policies and Rego policies are fundamentally different models:

- **Guard policies** are structural discriminated unions evaluated by Guard's `evaluate()` function
- **Rego policies** are Datalog-inspired rules evaluated by the OPA engine over an input document

The adapter does NOT translate Guard policy kinds to Rego. Instead, it provides a `regoPolicy()` factory that creates a Guard `PolicyConstraint` whose evaluation delegates to OPA.

REQUIREMENT (RG-POL-001): The `regoPolicy` factory MUST produce a `PolicyConstraint` value with `kind: "regoPolicy"` that can be composed with Guard's native policy combinators (`allOf`, `anyOf`, `not`, `labeled`).

```ts
function regoPolicy(path: string, options?: RegoPolicyOptions): PolicyConstraint;

interface RegoPolicyOptions {
  readonly additionalInput?: Readonly<Record<string, unknown>>;
  readonly decisionPath?: string; // default: use the path's result directly
  readonly timeout?: number; // per-evaluation timeout override
}
```

REQUIREMENT (RG-POL-002): The `path` field MUST be the Rego package/rule path that OPA evaluates. For example, `"authz/documents/allow"` evaluates the `allow` rule in the `authz.documents` package.

REQUIREMENT (RG-POL-003): The `regoPolicy` constraint MUST be serializable to JSON and deserializable back to the same constraint, consistent with Guard's serialization invariant.

```ts
// Serialized form:
{
  "kind": "regoPolicy",
  "path": "authz/documents/allow",
  "additionalInput": {},
  "decisionPath": null,
  "timeout": null
}
```

---

## Rego Policy Conventions

This section documents the Rego conventions that policy authors must follow for the adapter to parse OPA responses correctly.

### Boolean Decision Rules

The simplest Rego integration: a rule that evaluates to `true` or `false`.

```rego
package authz.documents

import rego.v1

default allow := false

allow if {
    input.subject.roles[_] == "admin"
}

allow if {
    input.subject.roles[_] == "editor"
    input.action == "read"
}
```

REQUIREMENT (RG-POL-010): When the OPA result is a boolean `true`, the adapter MUST produce a Guard `Allow` decision. When the result is `false` or undefined, the adapter MUST produce a `Deny` decision.

### Structured Decision Rules

For richer decisions (deny reasons, field visibility), Rego policies return a structured document.

```rego
package authz.documents

import rego.v1

default decision := {"allow": false, "reason": "No matching policy"}

decision := result if {
    input.subject.roles[_] == "admin"
    result := {"allow": true}
}

decision := result if {
    input.subject.roles[_] == "viewer"
    input.action == "read"
    result := {
        "allow": true,
        "visibleFields": ["title", "author", "createdAt"],
    }
}

decision := result if {
    input.resource.classification == "secret"
    not input.subject.clearanceLevel >= 3
    result := {
        "allow": false,
        "reason": "Insufficient clearance for classified resource",
    }
}
```

REQUIREMENT (RG-POL-011): The adapter MUST support structured decision documents conforming to the `OpaDecisionDocument` schema defined in [§06](06-decision-mapping.md).

---

## Decision Document Schema

REQUIREMENT (RG-POL-020): The adapter MUST document and enforce the following decision document schema for structured Rego responses:

```ts
interface OpaDecisionDocument {
  readonly allow: boolean;
  readonly reason?: string;
  readonly visibleFields?: ReadonlyArray<string>;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
```

REQUIREMENT (RG-POL-021): The `allow` field is REQUIRED. If the OPA result is a structured object missing the `allow` field, the adapter MUST treat it as a parsing error and return `Err(RegoDecisionParseError)`.

REQUIREMENT (RG-POL-022): The `reason` field is OPTIONAL. For deny decisions, it provides a human-readable explanation. For allow decisions, it is ignored.

REQUIREMENT (RG-POL-023): The `visibleFields` field is OPTIONAL. When present, it maps to Guard's `Decision.visibleFields` for field-level access control.

REQUIREMENT (RG-POL-024): The `metadata` field is OPTIONAL. When present, it is propagated to the Guard evaluation trace as an extension field for observability.
