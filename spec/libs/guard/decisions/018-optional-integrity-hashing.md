# ADR-GD-018: Integrity hashing and electronic signatures are optional fields on AuditEntry

> **Status:** Accepted
> **ADR Number:** 018 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

GxP compliance requires cryptographic integrity (hash chains) and electronic signatures for certain workflows. Non-GxP applications don't need these fields. Should `AuditEntry` have required integrity fields (forcing all users to populate them) or optional fields (allowing non-GxP users to omit them)?

## Decision

`integrityHash`, `previousHash`, and `signature` are optional fields on `AuditEntry`. `GxPAuditEntry` (see [ADR-GD-026](./026-gxp-audit-entry-subtype.md)) makes them required for GxP adapters at compile time.

```ts
interface AuditEntry {
  evaluationId: string;
  // ... required fields ...
  integrityHash?: string;    // optional for non-GxP
  previousHash?: string | null;
  signature?: ElectronicSignature;
}
```

## Consequences

**Positive**:
- `AuditEntry` stays lightweight for non-regulated environments
- GxP adapters use `GxPAuditEntry` for compile-time population guarantees
- No breaking change for non-GxP users

**Negative**:
- Optional fields can be forgotten
- Non-GxP adapters may accidentally omit them in regulated deployments

**Trade-off accepted**: The `GxPAuditEntry` subtype provides compile-time enforcement for GxP adapters while keeping the base type lightweight for non-regulated use.
