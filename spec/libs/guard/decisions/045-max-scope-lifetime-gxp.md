# ADR-GD-045: `maxScopeLifetimeMs` REQUIRED for GxP mode

> **Status:** Accepted
> **ADR Number:** 045 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Long-lived scopes (WebSocket connections, background worker processes, batch processors) may hold stale subject permissions indefinitely. If a subject's access is revoked after scope creation, the revocation has no effect until the scope is destroyed. 21 CFR 11.10(d) requires timely access control enforcement.

## Decision

`maxScopeLifetimeMs` is REQUIRED in `createGuardGraph()` when `gxp: true`. Type-level enforcement makes omission a compile-time error. Expired scopes produce `ScopeExpiredError` (ACL013) before policy evaluation begins.

```ts
createGuardGraph({
  auditTrailAdapter,
  gxp: true,
  maxScopeLifetimeMs: 30 * 60 * 1000, // Required when gxp: true — 30 min example
  // Omitting maxScopeLifetimeMs when gxp: true → compile-time error
});
```

## Consequences

**Positive**:
- Stale permission window is bounded
- 21 CFR 11.10(d) compliance
- Compile-time enforcement prevents accidental omission

**Negative**:
- Mandatory scope expiry may disrupt long-running workflows (WebSocket connections, batch jobs) that legitimately hold the same scope
- These must implement scope refresh logic

**Trade-off accepted**: Bounded staleness windows are a hard GxP requirement for timely access control enforcement; long-running workflows must implement scope refresh as a consequence.
