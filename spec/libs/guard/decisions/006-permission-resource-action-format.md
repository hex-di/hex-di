# ADR-GD-006: Permission format: `"resource:action"` string with phantom types

> **Status:** Accepted
> **ADR Number:** 006 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Permissions need both a human-readable string form for logs and a compile-time type-safe form. Three options: plain string enums (no type safety), object literals with typed fields (verbose), or branded strings with phantom generics (ergonomic + type-safe).

## Decision

`"resource:action"` string format with phantom generic types. `createPermissionGroup("user", ["read", "write"])` is the ergonomic bulk factory.

```ts
const UserPermissions = createPermissionGroup("user", ["read", "write", "delete"]);
// UserPermissions.read: Permission<"user", "read"> — type-safe
// console.log(UserPermissions.read) → "user:read" — human-readable
```

## Consequences

**Positive**:
- Ergonomic bulk factory reduces repetition
- Human-readable in logs and audit entries
- Phantom types provide compile-time safety at zero runtime cost

**Negative**:
- Branded string approach requires type assertions in some serialization/deserialization paths
- Must use factory instead of string literals

**Trade-off accepted**: Ergonomic factory and readable string form are essential for developer experience; the minor serialization complexity is justified.
