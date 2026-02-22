# ADR-GD-012: AuditTrailPort is mandatory for every guard() call; auditTrailAdapter is required in createGuardGraph(); logger and tracing remain optional soft dependencies

> **Status:** Accepted
> **ADR Number:** 012 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Every authorization decision must be auditable for compliance and debugging. However, structured logging and distributed tracing are not always available in every deployment. Should `AuditTrailPort` be mandatory or optional? Should logger and tracing be required or optional?

## Decision

`auditTrailAdapter` is required in `createGuardGraph()`. `createNoopAuditTrailAdapter()` is the explicit opt-in for non-regulated environments — no silent defaults. Logger and tracing are optional soft dependencies with zero overhead when absent.

```ts
// auditTrailAdapter is required — explicit opt-in for no-audit environments
createGuardGraph({
  auditTrailAdapter: createNoopAuditTrailAdapter(), // explicit!
  // logger: optional, loggerAdapter: optional, tracerAdapter: optional
});
```

## Consequences

**Positive**:
- No silent audit trail failures
- Explicit opt-in for no-audit environments
- Zero overhead for absent logger/tracing ports

**Negative**:
- Every user must configure an audit trail adapter (even if just Noop)
- Additional configuration step

**Trade-off accepted**: Explicit opt-in is safer than silent data loss; the Noop adapter makes configuration easy for non-regulated use cases.
