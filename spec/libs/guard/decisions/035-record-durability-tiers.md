# ADR-GD-035: `record()` durability tiers: "Durable Ok" vs "Buffered Ok"

> **Status:** Accepted
> **ADR Number:** 035 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

When `AuditTrail.record()` returns `Ok`, the semantics differ between adapters: some persist synchronously (the entry is durable immediately), others buffer asynchronously (the entry is accepted but may be lost in a crash before being flushed). This distinction is critical for GxP crash recovery planning.

## Decision

Adapters MUST document their durability tier: "Durable Ok" (synchronous persistence — survives crash) or "Buffered Ok" (accepted into buffer — requires WAL for crash recovery). WAL is REQUIRED for Buffered Ok adapters when `gxp: true`.

```ts
/**
 * Durability tier: BUFFERED OK
 * record() resolves Ok when the entry is accepted into the write buffer.
 * A crash before flushing loses buffered entries.
 * REQUIRES WAL when gxp: true. See ADR-GD-032.
 */
class PostgresAsyncAuditTrail implements AuditTrailPort { ... }
```

## Consequences

**Positive**:
- Clear durability semantics prevent false assumptions about data safety
- WAL enforcement for buffered adapters closes the crash gap
- Adapter documentation is standardized

**Negative**:
- Developers must read adapter documentation to understand durability
- The tier distinction requires understanding two failure modes

**Trade-off accepted**: Explicit durability tiers are safer than implicit assumptions; the documentation requirement is a small cost compared to the risk of silent audit data loss.
