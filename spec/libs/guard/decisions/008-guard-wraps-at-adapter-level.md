# ADR-GD-008: Guard wraps at the adapter level, not via Proxy

> **Status:** Accepted
> **ADR Number:** 008 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Two implementation strategies: (1) JavaScript Proxy — intercept every method call on the resolved service, or (2) adapter-level wrapping — run the guard check at DI resolution time. Proxy enables automatic method-level interception; adapter wrapping runs the check once at resolution time.

## Decision

`guard()` wraps the DI adapter factory. The authorization check runs at resolution time, not on every method call. Method-level guards are opt-in via `methodPolicies`.

```ts
const guardedDocumentService = guard(documentServiceAdapter, {
  policy: { kind: "hasPermission", permission: Permissions.document.read },
  methodPolicies: {
    delete: { kind: "hasPermission", permission: Permissions.document.delete },
  },
});
```

## Consequences

**Positive**:
- Simple and predictable (check at well-known resolution point)
- No Proxy overhead on every method invocation
- Method-level guards are explicit and visible in code review

**Negative**:
- Without `methodPolicies`, a single adapter-level policy cannot express per-method authorization differences
- Proxy would enable more granular automatic interception

**Trade-off accepted**: Factory-level guarding is correct for the common case; method-level granularity is available as an explicit opt-in.
