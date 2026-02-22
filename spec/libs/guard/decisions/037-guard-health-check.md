# ADR-GD-037: `createGuardHealthCheck` for runtime canary evaluation

> **Status:** Accepted
> **ADR Number:** 037 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

GxP systems require ongoing verification (periodic review). Silent failures — evaluation engine errors, audit trail unresponsiveness, hash chain corruption — may not surface until they cause production impact. By then, the audit record for the failure period may be incomplete or corrupt.

## Decision

`createGuardHealthCheck()` returns a function that evaluates a canary policy, writes a canary audit entry, and verifies recent chain integrity. Returns a structured `HealthCheckResult` suitable for monitoring integration and automated scheduling.

```ts
const healthCheck = createGuardHealthCheck(guardGraph, {
  canaryPolicy: { kind: "hasPermission", permission: Permissions.health.check },
  canarySubject: systemSubject,
});
// Run periodically
const result = await healthCheck.run();
// { status: "healthy" | "degraded" | "unhealthy", checks: [...], timestamp: "..." }
```

## Consequences

**Positive**:
- Early detection of silent pipeline degradation
- Structured output for monitoring and alerting integration
- Enables automated periodic review for GxP compliance

**Negative**:
- Health check adds operational complexity
- Canary policy evaluations and audit entries must be filtered from compliance reports
- Scheduled health checks add background load

**Trade-off accepted**: Runtime canary detection is worth the operational complexity for GxP deployments where undetected pipeline degradation is a compliance risk.
