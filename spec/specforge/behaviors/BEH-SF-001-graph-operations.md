---
id: BEH-SF-001
kind: behavior
title: Graph Operations
status: active
id_range: "001--008"
invariants: [INV-SF-10, INV-SF-20, INV-SF-26, INV-SF-7]
adrs: [ADR-001, ADR-005]
types: [graph, graph]
ports: [GraphQueryPort, GraphMutationPort, GraphStorePort, GraphSyncPort, NLQPort]
---

# 01 — Graph Operations

## BEH-SF-001: Graph Node Creation with Labels and Properties

> **Invariant:** [INV-SF-7](../invariants/INV-SF-7-graph-data-persistence.md) — Graph Data Persistence

Every graph node is created through the `GraphSyncPort` from ACP session events or reverse engineering sync, never directly by agents. Each node carries a unique `id`, one or more labels (e.g., `Requirement`, `Finding`), and a property map including `flowRunId`, `createdAt`, `updatedAt`, and `contentHash` (where applicable).

### Contract

REQUIREMENT (BEH-SF-001): When an ACP session event or reverse engineering sync produces a new entity, the system MUST create a graph node via `GraphStorePort.upsertNode()` with the correct labels, a unique `id`, and all required properties. Nodes created MUST persist across flow runs, application restarts, and desktop app sessions.

### Verification

- Unit test: call `upsertNode` with a well-formed `GraphNode` and verify the node is retrievable via `getNode(id)` with matching labels and properties.
- Integration test: create a node in one flow run, restart the server, and verify the node is still present.
- Property check: all nodes in the graph carry `id`, `createdAt`, `updatedAt`, and `flowRunId`.

---

## BEH-SF-002: Sync-on-Write — ACP Session Events Trigger Immediate Graph Sync

> **Invariant:** [INV-SF-10](../invariants/INV-SF-10-graph-acp-sync-consistency.md) — Graph-ACP Session Sync Consistency

Each ACP session event triggers an incremental graph update: `DocumentWritten` upserts `SpecFile` and `Requirement` nodes, `FindingAdded` upserts `Finding` nodes with `Agent` and `Requirement` links, `MetricsUpdated` updates `Phase` and `CoverageEntry` nodes. `MessagePosted` events produce no graph action (messages are session-scoped).

### Contract

REQUIREMENT (BEH-SF-002): When an ACP session event is emitted, the system MUST synchronously invoke `GraphSyncPort.syncEvent(event)` to produce the corresponding graph mutation. Every ACP session event that triggers a graph sync MUST eventually reach the graph — no event is silently dropped.

### Verification

- Unit test: emit each `ACPSessionEvent` variant and verify the expected graph nodes/edges are created or updated.
- Integration test: run a flow, emit events, and query Neo4j to confirm all expected nodes exist.
- Negative test: verify `MessagePosted` events produce no graph mutations.

---

## BEH-SF-003: Graph Transaction Isolation — Mutations within `withTransaction()` Are Atomic

> **Invariant:** [INV-SF-7](../invariants/INV-SF-7-graph-data-persistence.md) — Graph Data Persistence

All graph mutations executed within a `GraphStorePort.withTransaction(fn)` call are atomic: either all mutations succeed and are committed, or none are applied. Partial writes within a transaction never persist.

### Contract

REQUIREMENT (BEH-SF-003): When multiple graph mutations are executed within `withTransaction()`, the system MUST commit all mutations atomically on success, or roll back all mutations on failure. No partial state from a failed transaction MUST be observable.

### Verification

- Unit test: execute a transaction with two upserts where the second fails; verify the first upsert was rolled back.
- Integration test: concurrent transactions on overlapping nodes; verify no partial writes are visible.

---

## BEH-SF-004: Degraded Mode — When Neo4j Is Unavailable, Events Buffer and Replay on Reconnect

> **Invariant:** [INV-SF-10](../invariants/INV-SF-10-graph-acp-sync-consistency.md) — Graph-ACP Session Sync Consistency

When the Neo4j instance experiences a transient connection failure, the graph sync layer queues events in memory (bounded buffer, default 1000 events, configurable). Flow execution continues because the ACP session operates in memory. On Neo4j reconnection, queued events are replayed in order. If the buffer fills, a full rebuild is triggered on reconnection.

### Contract

REQUIREMENT (BEH-SF-004): When Neo4j is unavailable, the system MUST buffer sync events in memory up to the configured limit and MUST replay them in order upon reconnection. If the buffer overflows, the system MUST trigger `GraphSyncPort.fullRebuild()` on reconnection. Flow execution MUST NOT be blocked by Neo4j unavailability.

### Verification

- Integration test: disconnect Neo4j, emit N events, reconnect, and verify all N events are reflected in the graph.
- Boundary test: fill the buffer to capacity, reconnect, and verify a full rebuild is triggered.
- Liveness test: verify flow execution continues (ACP session reads/writes succeed) while Neo4j is down.

---

## BEH-SF-005: Conflict Resolution — Last-Writer-Wins with Conflict Logging

Concurrent flow runs may write to the same graph nodes. The conflict resolution strategy is: last-write-wins for node properties (each write carries a timestamp), additive for relationships (relationships are never deleted during sync, only during explicit cleanup), and content hash comparison for drift detection.

### Contract

REQUIREMENT (BEH-SF-005): When concurrent writes target the same graph node property, the system MUST resolve the conflict using last-writer-wins based on timestamps. Relationships MUST be additive during sync — never deleted. All conflicts MUST be logged in the `GraphSyncReport.conflicts` array with `nodeId`, `field`, `localValue`, `remoteValue`, and `resolution`.

### Verification

- Concurrency test: two flow runs simultaneously upsert the same node with different property values; verify the later timestamp wins.
- Relationship test: two flow runs add different relationships to the same node; verify both relationships exist.
- Audit test: verify conflict entries appear in the `GraphSyncReport`.

---

## BEH-SF-006: Impact Analysis — Transitive Closure from Changed Node to All Affected Nodes

> **Invariant:** [INV-SF-7](../invariants/INV-SF-7-graph-data-persistence.md) — Graph Data Persistence

`GraphQueryPort.impactAnalysis(nodeId)` computes the transitive closure of all nodes reachable from the changed node via relationships (up to configurable depth), returning an `ImpactAnalysisResult` with affected nodes, their distances, and connecting relationship types.

### Contract

REQUIREMENT (BEH-SF-006): When `impactAnalysis(nodeId)` is called, the system MUST return all nodes transitively reachable from the root node via graph relationships, including each node's distance (hop count) and the relationship type that connects it. The query MUST handle cycles without infinite recursion.

### Verification

- Unit test: create a subgraph `A → B → C → D`, call `impactAnalysis("A")`, verify B (distance 1), C (distance 2), D (distance 3) are returned.
- Cycle test: create `A → B → A`, verify the query terminates and returns both nodes.
- Empty test: call on an isolated node; verify empty `affectedNodes` array.

---

## BEH-SF-007: Orphan Detection — Nodes with No Incoming/Outgoing Relationships Are Flagged

`GraphQueryPort.orphans()` returns all nodes in the graph (scoped to the active project) that have no incoming or outgoing relationships. Orphan nodes indicate stale or disconnected data that may need cleanup.

### Contract

REQUIREMENT (BEH-SF-007): When `orphans()` is called, the system MUST return all graph nodes that have zero incoming AND zero outgoing relationships, along with a `totalOrphans` count. The query MUST be scoped to the active project's `projectId` (and `orgId` where applicable).

### Verification

- Unit test: create nodes with and without relationships; verify only the unconnected nodes appear in the result.
- Scoping test: create orphan nodes in two projects; verify each project's query returns only its own orphans.
- Cleanup integration: run `specforge cleanup --orphans` and verify orphan nodes are removed.

---

## BEH-SF-008: Cross-Project Dependency Tracking — Inter-Project References Are Queryable

`GraphQueryPort.crossProjectDependencies(projectId)` returns all requirements, tasks, and code nodes that reference other projects within the same organization, providing both inbound and outbound reference lists.

### Contract

REQUIREMENT (BEH-SF-008): When `crossProjectDependencies(projectId)` is called, the system MUST return a `CrossProjectDepsResult` containing `inboundReferences` (nodes from other projects referencing this project) and `outboundReferences` (nodes from this project referencing other projects). Cross-org queries MUST NOT be permitted.

### Verification

- Integration test: create nodes in two projects within the same org with cross-references; verify both inbound and outbound references are returned.
- Isolation test: create nodes in two different orgs; verify cross-org references are never returned.
- Empty test: call on a project with no cross-project references; verify empty arrays.

---

## Idempotent Graph Sync (INV-SF-20)

> **Invariant [INV-SF-20]**: Idempotent Graph Sync — replaying the same ACP events must not create duplicate graph nodes or edges.

**BEH-SF-300:** Graph sync MUST use content-addressed identity (SHA-256 hash of canonical content) for all nodes created from ACP messages.

**BEH-SF-301:** Duplicate sync events (same content hash) MUST be idempotent — the sync engine performs upsert-or-skip, never duplicate insert.

**BEH-SF-302:** Graph sync replay after crash recovery MUST produce the same graph state as the original sync sequence.

---

## Graph Error Handling

**BEH-SF-311:** Neo4j connection failure MUST trigger automatic retry with exponential backoff (3 attempts: 1s, 2s, 4s delays).

**BEH-SF-312:** Cypher syntax errors MUST return `GraphQuerySyntaxError` including the failing query text and Neo4j error code.

**BEH-SF-313:** Query execution timeout MUST return `GraphQueryTimeoutError` after the configured limit (default: 30 seconds).

**BEH-SF-314:** Graph sync conflict (content hash mismatch on existing node) MUST log a warning and skip the update (soft failure). Hard failure occurs only when structural integrity is violated.

---

## NLQ Query Behaviors

**BEH-SF-359:** Natural language queries MUST be translated to Cypher via LLM with the graph schema provided as context.

**BEH-SF-360:** Generated Cypher MUST be validated for syntax before execution. Invalid Cypher returns `NLQTranslationError`.

**BEH-SF-361:** NLQ results MUST include the generated Cypher query for transparency and debugging.

---

## Graph Mutation Behaviors

**BEH-SF-362:** Graph mutations MUST be executed within a Neo4j transaction — partial mutations are rolled back on failure.

**BEH-SF-363:** Mutation operations MUST validate node/edge types against the graph schema before execution.

**BEH-SF-364:** Batch mutations (multiple operations) MUST be atomic — all succeed or all roll back.

---
