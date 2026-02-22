# ADR-GD-029: Hash chain covers all 10 required `AuditEntry` fields plus integrity fields for complete tamper detection

> **Status:** Accepted
> **ADR Number:** 029 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

The previous hash chain covered only 4 fields (evaluationId + timestamp + subjectId + decision). This left 6 fields (authenticationMethod, policy, portName, scopeId, reason, durationMs) unprotected — an attacker could modify those fields without breaking the chain and without detection.

## Decision

The hash chain covers all 10 required `AuditEntry` fields plus integrity fields (schemaVersion, sequenceNumber, traceDigest, policySnapshot, previousHash). Any modification to any audit-relevant field is detectable.

```ts
// Hash input: all 10 required fields + integrity fields
function computeIntegrityHash(entry: GxPAuditEntry): string {
  const payload = [
    entry.evaluationId, entry.evaluatedAt, entry.subjectId,
    entry.authenticationMethod, entry.decision, entry.portName,
    entry.scopeId, entry.reason, String(entry.durationMs), entry.policy,
    // integrity fields
    entry.schemaVersion, String(entry.sequenceNumber),
    entry.traceDigest, entry.policySnapshot, entry.previousHash ?? "genesis",
  ].join("|");
  return sha256(payload);
}
```

## Consequences

**Positive**:
- Complete tamper detection for all audit-relevant fields
- No partial coverage vulnerabilities
- Any modification breaks the chain

**Negative**:
- Larger hash input (more computation per entry)
- Any new field added to `AuditEntry` must be considered for hash inclusion
- Hash input specification must be maintained precisely

**Trade-off accepted**: Complete tamper detection is a hard requirement for GxP compliance; the computation overhead is acceptable and the specification is documented precisely.
