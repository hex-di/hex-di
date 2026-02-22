# ADR-GD-047: Signature canonical payload (13 fields) excludes `previousHash` from the hash chain field set (14 fields)

> **Status:** Accepted
> **ADR Number:** 047 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Electronic signatures should bind to the **content** of an audit entry (what happened, who, when, why). `previousHash` encodes positional integrity — where the entry sits in the chain — which is independent of the entry's content. Including `previousHash` in the signature payload would require re-signing entries whenever the chain is replayed or reordered during export/import, which is operationally infeasible.

## Decision

The 13-field signature payload excludes `previousHash`. The 14-field hash chain input includes `previousHash`. These are two independent integrity mechanisms with separate purposes.

```ts
// 13-field signature payload (content binding)
const signaturePayload = [
  entry.evaluationId, entry.evaluatedAt, entry.subjectId,
  entry.authenticationMethod, entry.policy, entry.decision,
  entry.portName, entry.scopeId, entry.reason,
  String(entry.durationMs), entry.schemaVersion,
  String(entry.sequenceNumber), entry.traceDigest,
].join("|");

// 14-field hash chain input (positional binding) adds previousHash
const hashInput = signaturePayload + "|" + (entry.previousHash ?? "genesis");
```

## Consequences

**Positive**:
- Signatures bind to content, not position
- Chain replay/export/import does not invalidate signatures
- Clean separation between content integrity (signatures) and positional integrity (hash chain)

**Negative**:
- Two distinct field sets (13 for signatures, 14 for hash chain) must be maintained separately and documented precisely
- Developers implementing adapters must understand the distinction

**Trade-off accepted**: Content-binding signatures and positional hash chains serve independent purposes; maintaining two field sets is a necessary consequence of the correct separation of concerns.
