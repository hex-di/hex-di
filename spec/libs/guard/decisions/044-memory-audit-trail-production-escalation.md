# ADR-GD-044: MemoryAuditTrail checkGxPReadiness escalation: warn→fail in production

> **Status:** Accepted
> **ADR Number:** 044 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

[ADR-GD-041](./041-memory-audit-trail-gxp-warn.md) established `warn` for `MemoryAuditTrail` to avoid blocking pre-production GxP testing. However, FM-13 (accidental production deployment with a non-durable audit trail) is a critical compliance risk — an entire production run could have no durable audit records.

## Decision

`NODE_ENV=production` triggers escalation from `warn` to `fail` in `checkGxPReadiness()` for `MemoryAuditTrail`. This adds a second safety net beyond [ADR-GD-041](./041-memory-audit-trail-gxp-warn.md).

```ts
// checkGxPReadiness behavior
// NODE_ENV=development → warn
// NODE_ENV=production  → fail (production escalation — this ADR)
const result = await checkGxPReadiness(guardGraph);
// In production: { status: "fail", reason: "MemoryAuditTrail cannot be used in GxP production" }
```

## Consequences

**Positive**:
- Critical FM-13 risk is mitigated
- Production deployments with non-durable adapters are actively blocked
- Production detection is a standard, well-understood convention

**Negative**:
- Depends on `NODE_ENV=production` being set correctly in the deployment environment
- Not all container orchestration systems set `NODE_ENV` automatically

**Trade-off accepted**: `NODE_ENV=production` is a well-established Node.js convention; the risk of a misconfigured container environment is lower than the risk of allowing accidental production deployment with a non-durable audit adapter.
