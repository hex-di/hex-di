# ADR-GD-041: MemoryAuditTrail GxP readiness detection emits warn (not fail)

> **Status:** Accepted
> **ADR Number:** 041 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

`MemoryAuditTrail` from `@hex-di/guard-testing` is non-durable (data is lost on restart) and MUST NOT be used in GxP production. However, `checkGxPReadiness()` running in pre-production environments (CI, integration testing) should not be blocked from testing the GxP configuration itself.

## Decision

`checkGxPReadiness()` emits `warn` (not `fail`) for `MemoryAuditTrail`. In production (`NODE_ENV=production`), the `warn` escalates to `fail` (see [ADR-GD-044](./044-memory-audit-trail-production-escalation.md)).

```ts
// Result of checkGxPReadiness() with MemoryAuditTrail
// In development/CI: { status: "warn", reason: "MemoryAuditTrail is non-durable..." }
// In production: { status: "fail", reason: "MemoryAuditTrail cannot be used in production" }
```

## Consequences

**Positive**:
- Pre-production GxP configuration testing is not blocked
- Production deployment with a non-durable adapter is still caught
- Two-tier behavior matches the two deployment contexts

**Negative**:
- The `warn`/`fail` escalation depends on `NODE_ENV` being set correctly
- Poorly configured container environments may not set `NODE_ENV=production`

**Trade-off accepted**: Unblocking pre-production testing while preventing accidental production deployment is the correct balance; see [ADR-GD-044](./044-memory-audit-trail-production-escalation.md) for the production escalation detail.
