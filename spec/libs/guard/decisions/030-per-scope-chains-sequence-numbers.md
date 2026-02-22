# ADR-GD-030: Concurrent audit trail writes use per-scope chains with monotonic sequence numbers

> **Status:** Accepted
> **ADR Number:** 030 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

A single global hash chain breaks under concurrent writes — interleaving writes from concurrent requests produces non-deterministic chain sequences where different chain orders are all equally valid, making gap detection unreliable. The design question: how to maintain hash chain integrity under concurrent writes?

## Decision

Each scope maintains its own hash chain with a genesis entry and a monotonic sequence number. `sequenceNumber` enables O(1) gap detection (next expected = last + 1). `scopeId` identifies which chain an entry belongs to.

```ts
// Each scope has its own chain — no global contention
// Scope A: genesis → seq:1 → seq:2 → seq:3
// Scope B: genesis → seq:1 → seq:2
// Gap detection: if scope A's last = seq:3, next must be seq:4
```

## Consequences

**Positive**:
- No global write contention
- O(1) gap detection per scope
- Clear scope boundary for chain ordering
- Concurrent scopes are independent

**Negative**:
- Chain verification requires processing per-scope chains separately
- More complex than a single global chain
- Scope lifecycle management must ensure genesis entries are written

**Trade-off accepted**: Concurrent write correctness is more important than chain simplicity; per-scope chains are the only approach that maintains ordering guarantees under concurrent writes.
