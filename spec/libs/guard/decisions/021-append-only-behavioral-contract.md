# ADR-GD-021: Append-only semantics are a behavioral contract, not an enforced runtime constraint

> **Status:** Accepted
> **ADR Number:** 021 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

GxP audit trails must be append-only — no modification or deletion of records. However, the guard library operates at the application layer and cannot enforce database-level immutability. It cannot prevent a database administrator from modifying records directly.

## Decision

The `AuditTrailPort` behavioral contract (in `compliance/gxp.md`) documents four invariants that GxP-compliant adapters MUST satisfy: append-only, atomic writes, completeness, and NTP timestamps. The library cannot enforce these at runtime — it is a behavioral contract for adapter implementors. Non-GxP adapters (including `NoopAuditTrail`) are exempt.

```ts
// The AuditTrailPort interface states the behavioral contract
// Adapters are responsible for storage-level immutability
interface AuditTrailPort {
  /** GxP adapters MUST implement append-only, atomic writes.
   *  See compliance/gxp.md §61 for full behavioral contract. */
  record(entry: AuditEntry): Promise<Result<void, AuditTrailError>>;
}
```

## Consequences

**Positive**:
- Clear responsibility boundary — the adapter is responsible for storage guarantees
- Non-GxP adapters are explicitly exempt
- Conformance suite (see [ADR-GD-036](./036-audit-trail-conformance-suite.md)) provides verification

**Negative**:
- A poorly implemented adapter could violate the contract without compile-time errors
- Runtime enforcement requires the conformance test suite

**Trade-off accepted**: Storage-level guarantees cannot be provided by an application library; the conformance test suite provides standardized OQ evidence for adapters that claim compliance.
