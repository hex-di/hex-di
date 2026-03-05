# ADR-RG-003: Input Document Convention

## Status

Accepted

## Context

OPA receives request context via the `input` document — a JSON object that Rego policies access via `input.<path>`. The adapter must decide how to structure this document from Guard's `EvaluationContext` (AuthSubject, resource, action).

Two approaches were considered:

1. **Opaque pass-through** — Pass the entire `EvaluationContext` as-is to OPA. Rego policies access Guard's internal structures directly (`input.subject.permissions`, `input.resource.__type`, etc.).
2. **Standardized convention** — Define a fixed top-level structure (`input.subject`, `input.resource`, `input.action`) with documented field mappings. Rego policies consume a stable, documented schema.

## Decision

The adapter uses a **standardized convention** with a fixed top-level structure:

```json
{
  "subject": {
    "id": "alice",
    "roles": ["admin"],
    "permissions": ["documents:read"],
    "attributes": { "department": "engineering" },
    "authenticationMethod": "oidc",
    "authenticatedAt": "2026-02-23T10:00:00Z"
  },
  "resource": {
    "id": "doc-42",
    "__type": "Document",
    "classification": "confidential"
  },
  "action": "read"
}
```

The mapping is one-to-one from Guard's `AuthSubject` to `input.subject`, with one transformation: `permissions` is converted from a `Set` to a sorted array for JSON serialization determinism.

## Consequences

**Positive**:

- **Documented contract** — Policy authors know the exact shape of `input`. They can write Rego rules without needing to understand Guard's internal types.
- **Stable across adapter versions** — The input document schema is part of the adapter's public API. Changes to Guard's internals don't automatically change the input schema.
- **Deterministic serialization** — Sorting the permissions array ensures the same context always produces the same JSON bytes, enabling OPA response caching.
- **Extensible** — The `additionalInput` mechanism allows adding custom fields (e.g., `input.environment`, `input.requestContext`) without changing the core schema.
- **No Guard-specific concepts leak to Rego** — Rego policies don't reference Guard-specific types like `PolicyConstraint` or `EvaluationContext`. They consume a generic subject/resource/action model.

**Negative**:

- **Set-to-array conversion** — Guard's `permissions` is a `ReadonlySet<string>`, but JSON has no set type. Converting to a sorted array works but requires Rego policies to use array iteration (`permissions[_] == "x"`) rather than set membership (`"x" in permissions`).
- **No custom mapping** — If users want to restructure the input document (e.g., flatten attributes, rename fields), they cannot. The mapping is fixed.

**Trade-off accepted**: The fixed convention covers the common case and provides a stable, documented contract for Rego policy authors. Users needing custom input structures can implement `RegoEnginePort` directly and construct their own input documents.
