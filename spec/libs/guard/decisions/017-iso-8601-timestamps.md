# ADR-GD-017: All absolute timestamps in the guard system use ISO 8601 string format

> **Status:** Accepted
> **ADR Number:** 017 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Timestamps could be stored as Unix milliseconds (number) or ISO 8601 strings. Numbers are compact and efficient for comparison; ISO 8601 strings are human-readable. For audit trail entries that may be inspected by compliance reviewers, human readability is a key requirement.

## Decision

All absolute timestamps (`evaluatedAt`, `authenticatedAt`, `capturedAt`) use ISO 8601 strings (e.g., `"2024-01-15T10:30:00.000Z"`). Relative durations (`durationMs`) remain as `number`.

```ts
interface AuditEntry {
  evaluatedAt: string;  // "2024-01-15T10:30:00.000Z" — human-readable
  durationMs: number;   // 42 — relative duration stays numeric
}
```

## Consequences

**Positive**:
- Human-readable in audit logs and DevTools
- JSON serialization without conversion
- Cross-platform compatibility
- ALCOA+ Contemporaneous compliance (timestamp is in the entry, not derived)

**Negative**:
- String comparison is slightly less efficient than numeric comparison
- ISO 8601 strings are larger than Unix milliseconds
- Timezone representation requires care (always UTC/Z)

**Trade-off accepted**: Human readability and ALCOA+ compliance are more important than minor storage efficiency for audit records that may be reviewed by compliance professionals.
