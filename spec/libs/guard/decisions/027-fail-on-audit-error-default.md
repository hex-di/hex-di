# ADR-GD-027: `failOnAuditError` option on `createGuardGraph()` with default `true`

> **Status:** Accepted
> **ADR Number:** 027 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

If the audit trail backend is temporarily unavailable, should the guarded operation proceed (fail-open, potentially without an audit record) or be blocked (fail-closed)? 21 CFR 11.10(e) requires completeness of audit records — a missing record is a compliance violation.

## Decision

`failOnAuditError` defaults to `true`. If `record()` returns `Err`, the operation does not proceed and `AuditFailureError` is thrown. Non-regulated environments can opt into `failOnAuditError: false`.

```ts
// Default: fail-closed (GxP compliant)
createGuardGraph({ auditTrailAdapter, failOnAuditError: true }); // default

// Non-regulated: fail-open acceptable
createGuardGraph({ auditTrailAdapter: noopAdapter, failOnAuditError: false });
```

## Consequences

**Positive**:
- 21 CFR 11.10(e) compliance by default
- No silent audit gaps
- Security-first default that matches the most common regulated environment requirement

**Negative**:
- Audit trail unavailability causes Denial-of-Service in production (all operations blocked until audit backend recovers)
- WAL (see [ADR-GD-032](./032-built-in-wal-gxp-enforcement.md)) mitigates this

**Trade-off accepted**: Compliance requires that a missing audit record blocks the operation; fail-open is an explicit opt-in that acknowledges the compliance trade-off.
