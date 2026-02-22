# ADR-GD-009: Subject is immutable within a scope

> **Status:** Accepted
> **ADR Number:** 009 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

If a subject could change mid-request (permissions pushed from server, role changes applied dynamically), a check at T1 might pass while the check at T2 uses a different permission set. This is a TOCTOU vulnerability. Should subjects be mutable within a scope, or frozen to guarantee consistency?

## Decision

Subjects are immutable for the lifetime of their scope. `Object.freeze()` is applied at creation. Permission changes take effect only when the scope is destroyed and recreated.

```ts
const subject = createSubject({ id: "user-123", roles: [editorRole], attributes: {} });
// Object.freeze applied — mutations throw in strict mode
// Same frozen subject used for all evaluations within the scope
```

## Consequences

**Positive**:
- Prevents TOCTOU vulnerabilities
- Deterministic behavior within a scope
- `Object.freeze()` catches accidental mutations in strict mode

**Negative**:
- Permission revocations take effect only when the scope is destroyed
- Long-lived scopes hold stale permissions for the scope's lifetime

**Trade-off accepted**: TOCTOU safety is more important than instant permission propagation; `maxScopeLifetimeMs` bounds the staleness window in GxP environments.
