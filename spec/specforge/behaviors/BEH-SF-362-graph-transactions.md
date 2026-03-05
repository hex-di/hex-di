---
id: BEH-SF-362
kind: behavior
title: Atomic Graph Transactions
status: active
id_range: 362--362
invariants: [INV-SF-7, INV-SF-10]
adrs: [ADR-005]
types: [graph]
ports: [GraphStorePort]
---

# 55 — Atomic Graph Transactions

**Feature:** [FEAT-SF-004](../features/FEAT-SF-004-flow-engine.md)

---

## BEH-SF-362: Atomic Transaction Commit — No Partial Graph Writes

> **Invariant:** [INV-SF-7](../invariants/INV-SF-7-graph-data-persistence.md) — Graph Data Persistence

Graph mutations commit atomically within a transaction boundary. Either all mutations in the transaction are applied or none are. This prevents partial writes that could leave the knowledge graph in an inconsistent state — particularly critical during conflict resolution and concurrent mutation pipelines.

### Contract

REQUIREMENT (BEH-SF-362): All graph mutations within a transaction boundary MUST commit atomically. If any mutation in the transaction fails, all preceding mutations in the same transaction MUST be rolled back. The graph MUST NOT be left in a partially-mutated state. Transaction boundaries MUST be explicitly opened via `GraphStorePort.beginTransaction()` and committed via `transaction.commit()`. A `transaction.rollback()` MUST discard all pending mutations. Concurrent transactions that conflict on the same node or edge MUST be serialized — the second transaction MUST either wait or fail with `TransactionConflictError`. Content-hash comparison for conflict resolution (BEH-SF-303) MUST occur within the transaction boundary.

### Verification

- Atomicity test: begin a transaction; create 3 nodes; fail the 3rd; verify none of the 3 nodes exist.
- Commit test: begin a transaction; create 3 nodes; commit; verify all 3 nodes exist.
- Rollback test: begin a transaction; create nodes; call `rollback()`; verify no nodes were created.
- Conflict test: begin two transactions that modify the same node; commit both; verify one succeeds and the other returns `TransactionConflictError`.
