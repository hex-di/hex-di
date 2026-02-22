# ADR-GD-032: Built-in WAL with mandatory enforcement when `gxp: true`

> **Status:** Accepted
> **ADR Number:** 032 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

A crash between `evaluate()` completing and `record()` succeeding produces an authorized action with no audit record — a GxP compliance gap. Consumer-side WAL was previously RECOMMENDED but not enforced, leaving the gap open for implementations that forgot to implement WAL.

## Decision

The library ships `createWalAuditTrail()`. When `gxp: true`, WAL is mandatory and wraps the provided adapter automatically. `NoopAuditTrail` is rejected at construction time with `gxp: true`.

```ts
// When gxp: true, WAL is automatically enforced
createGuardGraph({
  auditTrailAdapter: postgresAuditTrail, // WAL wraps this automatically
  walStore: new PostgresWalStore(),       // required when gxp: true
  gxp: true,
});
```

## Consequences

**Positive**:
- Crash recovery gap is closed for GxP deployments
- No manual WAL setup required by consumers
- Compile-time `NoopAuditTrail` rejection prevents misconfiguration

**Negative**:
- WAL requires a durable `WalStore` implementation (additional infrastructure)
- Adds configuration overhead for GxP users

**Trade-off accepted**: Crash recovery is a hard GxP requirement; shipping the WAL implementation reduces the burden on adapter authors and eliminates the "forgot to implement WAL" failure mode.
