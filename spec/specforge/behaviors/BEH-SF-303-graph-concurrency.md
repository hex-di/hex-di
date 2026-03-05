---
id: BEH-SF-303
kind: behavior
title: Graph Concurrency & Crash Recovery
status: active
id_range: 303--304
invariants: [INV-SF-7, INV-SF-10]
adrs: [ADR-005]
types: [graph]
ports: [GraphStorePort]
---

# 53 — Graph Concurrency & Crash Recovery

**Feature:** [FEAT-SF-004](../features/FEAT-SF-004-flow-engine.md)

---

## BEH-SF-303: Content-Addressed Identity — Prevent Duplicate Nodes During Sync

> **Invariant:** [INV-SF-7](../invariants/INV-SF-7-graph-data-persistence.md) — Graph Data Persistence

Content-addressed identity assigns each node a deterministic hash based on its content. When concurrent sync operations attempt to create the same logical node, the system detects the duplicate via hash comparison and merges rather than duplicating.

### Contract

REQUIREMENT (BEH-SF-303): When a sync operation creates a node whose content hash matches an existing node, the system MUST NOT create a duplicate. Instead it MUST merge the incoming node's metadata with the existing node. The content hash MUST be computed deterministically from the node's type, name, and body content. Two nodes with identical content MUST produce identical hashes regardless of creation timestamp or originating session.

### Verification

- Unit test: create two nodes with identical content from different sessions; verify only one node exists in the graph.
- Hash determinism test: compute content hash for the same payload twice; verify identical results.
- Merge test: sync a node with updated metadata but identical content hash; verify metadata is merged onto the existing node.

---

## BEH-SF-304: Idempotent Sync Replay — Crash Recovery Without Duplication

> **Invariant:** [INV-SF-10](../invariants/INV-SF-10-graph-first-architecture.md) — Graph-First Architecture

After a crash, the system replays pending sync operations. Idempotent replay ensures that re-executing a sync operation that already completed (fully or partially) produces the same graph state without duplication or data loss.

### Contract

REQUIREMENT (BEH-SF-304): When the system recovers from a crash, it MUST replay all pending sync operations from the write-ahead log. Each replayed operation MUST be idempotent — re-executing a completed operation MUST NOT create duplicate nodes or edges, MUST NOT overwrite newer data with stale data, and MUST produce the same final graph state as if the operation had completed without interruption. The system MUST use content-addressed identity (BEH-SF-303) to detect already-applied mutations during replay.

### Verification

- Crash recovery test: simulate a crash mid-sync; restart and replay; verify no duplicate nodes.
- Idempotency test: execute a sync operation twice; verify graph state is identical after both executions.
- Ordering test: replay operations out of original order; verify final graph state matches the expected outcome.
