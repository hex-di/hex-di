# ADR-GD-046: Empty string sentinel for absent `responseTimestamp` in HTTP audit entries

> **Status:** Accepted
> **ADR Number:** 046 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

When an HTTP operation fails at the transport level (connection refused, DNS failure, TCP timeout), no HTTP response is received, so there is no `responseTimestamp` to record. Using `null` or `undefined` would break hash chain determinism (non-deterministic serialization). Using a fake timestamp would violate ALCOA+ Contemporaneous (the timestamp would not represent an actual event).

## Decision

`responseTimestamp: ""` (empty string) when no HTTP response is received. ISO 8601 validation MUST NOT be applied to an empty `responseTimestamp`. The empty string is included as-is in hash chain computation.

```ts
// Transport-level failure: no responseTimestamp
const auditEntry: HttpAuditEntry = {
  requestTimestamp: "2024-01-15T10:30:00.000Z",
  responseTimestamp: "", // empty string sentinel — no response received
  statusCode: undefined,
  error: { kind: "connection-refused" },
};
```

## Consequences

**Positive**:
- Hash chain determinism preserved (empty string is stable and included in hash input)
- No fake timestamps that would violate ALCOA+ Contemporaneous
- Consistent serialization

**Negative**:
- The empty string sentinel is not obviously "absent" to readers
- ISO 8601 validation logic must special-case the empty string

**Trade-off accepted**: Hash chain determinism and ALCOA+ compliance are more important than intuitive representation; the sentinel convention is documented precisely in the spec.
