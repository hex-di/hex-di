# ADR-RG-002: Structured Decision Documents

## Status

Accepted

## Context

OPA's Rego language can return any JSON value. The adapter must parse OPA responses into Guard's `Decision` type, which requires at minimum: `kind` ("allow" or "deny"), and for denials, a `reason` string. Guard also supports `visibleFields` for field-level access control.

Three approaches were considered:

1. **Boolean-only** — Rego rules return `true`/`false`. Simple but no deny reasons or field visibility.
2. **Structured document convention** — Rego rules return `{ allow: boolean, reason?: string, visibleFields?: string[] }`. Richer but requires policy authors to follow a convention.
3. **Response transformer function** — Users provide a custom `(result: unknown) => Decision` function. Maximum flexibility but shifts parsing responsibility to users.

## Decision

The adapter supports **both boolean and structured formats**, with a documented `OpaDecisionDocument` schema for the structured case.

```ts
// Boolean format — simplest
// Rego: default allow := false; allow if { ... }
// OPA returns: true or false

// Structured format — richer
// Rego: decision := { "allow": true, "visibleFields": ["name", "email"] }
// OPA returns: { "allow": true, "visibleFields": ["name", "email"] }
```

The adapter auto-detects the format:

- If the result is a boolean → boolean mapping
- If the result is an object with an `allow` field → structured mapping
- Otherwise → parse error

## Consequences

**Positive**:

- **Progressive complexity** — Simple policies use boolean rules (no convention to learn). Complex policies use structured documents (deny reasons, field visibility). Users adopt the structured format only when they need it.
- **Guard-compatible** — The structured format maps directly to Guard's `Decision` fields. No information is lost in translation.
- **Documented contract** — The `OpaDecisionDocument` schema is a clear contract between Rego policy authors and the adapter. Policy authors know exactly what fields the adapter expects.
- **Auto-detection** — The adapter detects the format automatically. No configuration flag is needed to switch between boolean and structured modes.

**Negative**:

- **Convention dependency** — Structured decisions only work if Rego policies follow the `OpaDecisionDocument` schema. Policies that return other formats (e.g., `{ permitted: true }` instead of `{ allow: true }`) fail with a parse error.
- **Two code paths** — The adapter has two parsing paths (boolean and structured), which increases test surface area.

**Trade-off accepted**: The dual-format approach balances simplicity (boolean for simple cases) with expressiveness (structured for rich decisions). The convention is minimal (one required field: `allow`) and well-documented. Policy authors who need custom response formats can implement `RegoEnginePort` directly.
