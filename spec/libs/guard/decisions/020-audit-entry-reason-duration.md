# ADR-GD-020: AuditEntry includes reason and durationMs as required fields

> **Status:** Accepted
> **ADR Number:** 020 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Audit entries must capture not just the verdict (`Allow`/`Deny`) but also why a decision was made (for debugging and compliance investigations) and how long evaluation took (for performance monitoring and SLA compliance). Should these be optional fields?

## Decision

`reason: string` and `durationMs: number` are required fields on `AuditEntry`. For `Allow` decisions, `reason` is the empty string `""` (not `undefined`) for consistent serialization.

```ts
interface AuditEntry {
  decision: "Allow" | "Deny";
  reason: string;    // "" for Allow, denial message for Deny
  durationMs: number; // always present — 0 if not measured
}
```

## Consequences

**Positive**:
- Complete audit records for compliance investigations
- Consistent serialization (no `undefined` fields)
- Performance visibility for SLA monitoring

**Negative**:
- `Allow` decisions carry a meaningless empty string `reason` field
- Empty string is a sentinel value that needs documentation

**Trade-off accepted**: Consistent non-nullable fields simplify serialization and downstream audit processing; the empty string convention for `Allow` is documented and predictable.
