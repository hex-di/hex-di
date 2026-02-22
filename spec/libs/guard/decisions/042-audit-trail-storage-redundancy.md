# ADR-GD-042: Primary audit trail storage redundancy requirement

> **Status:** Accepted
> **ADR Number:** 042 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

GxP audit trail data is compliance-critical and must be available for the full retention period (5–25+ years depending on regulation). Single-disk, non-replicated storage cannot survive a single physical storage failure — a disk failure would result in permanent audit data loss.

## Decision

GxP-compliant `AuditTrailPort` adapters MUST implement data redundancy on primary backing storage (RAID, database replication, multi-AZ deployment). This is verified during IQ. The library documents this as a production infrastructure requirement.

```markdown
## IQ Check: Primary Storage Redundancy
- [ ] Primary audit trail storage uses RAID, replication, or multi-AZ
- [ ] Single storage node failure does not cause audit data loss
- [ ] Redundancy configuration is documented and verified
```

## Consequences

**Positive**:
- Audit data survives single hardware failures
- Clear infrastructure requirement is documented for adapter authors
- IQ verification makes the requirement auditable

**Negative**:
- Infrastructure requirement cannot be enforced at the library level — relies on adapter documentation and IQ verification
- Adds cost to GxP deployments

**Trade-off accepted**: Data redundancy is a hard GxP requirement for long-term audit data availability; the library can only document and verify the requirement through IQ, not enforce it at runtime.
