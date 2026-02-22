# ADR-GD-026: `GxPAuditEntry` is a strict subtype of `AuditEntry` with non-optional integrity fields

> **Status:** Accepted
> **ADR Number:** 026 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

GxP adapters require `integrityHash`, `previousHash`, and `signature` to always be populated. Base `AuditEntry` has these as optional. The design question: how to give GxP adapters compile-time guarantees that these fields are populated without breaking non-GxP adapters?

## Decision

`GxPAuditEntry extends AuditEntry` with required `integrityHash: string`, `previousHash: string | null`, and non-optional integrity fields. GxP adapters declare `record(entry: GxPAuditEntry)` and the compiler enforces field population.

```ts
// GxPAuditEntry is a strict subtype of AuditEntry
interface GxPAuditEntry extends AuditEntry {
  integrityHash: string;        // required (not optional)
  previousHash: string | null;  // required (not optional)
  sequenceNumber: number;       // required (not optional)
}

// GxP adapter — compiler enforces all fields are populated
class PostgresGxPAuditTrail implements AuditTrailPort<GxPAuditEntry> {
  record(entry: GxPAuditEntry): Promise<Result<void, AuditTrailError>> { ... }
}
```

## Consequences

**Positive**:
- GxP adapters get compile-time field population guarantees
- Non-GxP adapters continue using base `AuditEntry` unchanged
- Type hierarchy is clean and non-breaking

**Negative**:
- Two audit entry types require documentation and developer awareness
- Generic type parameter on `AuditTrailPort<T extends AuditEntry>` adds complexity

**Trade-off accepted**: The type hierarchy cleanly expresses the GxP superset without duplicating the base type; the added complexity is justified by compile-time GxP enforcement.
