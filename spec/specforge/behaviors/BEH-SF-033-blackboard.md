---
id: BEH-SF-033
kind: behavior
title: Blackboard
status: active
id_range: "033--040"
invariants: [INV-SF-1]
adrs: [ADR-003]
types: [blackboard, blackboard]
ports: [MessageExchangePort]
---

# 05 — Blackboard

> **Superseded:** This file is superseded by [32-acp-messaging.md](./BEH-SF-229-acp-messaging.md). Retained for historical reference.

The blackboard pattern has been replaced by ACP messaging per [ADR-018](../decisions/ADR-018-acp-agent-protocol.md).

**Behavior Mapping:**

- BEH-SF-033 (Append-Only) → BEH-SF-235 (ACP Session History Append-Only)
- BEH-SF-034 (Three Layers) → BEH-SF-229/230/231 (Document Artifacts / Finding Messages / Inter-Agent Messages)
- BEH-SF-035 (Versioning) → BEH-SF-229 (Document Artifacts via session history versioning)
- BEH-SF-036 (Finding Lifecycle) → BEH-SF-230 (Finding Messages with CitationMetadata)
- BEH-SF-037 (Message Routing) → BEH-SF-231 (Role-Addressed ACPMessages)
- BEH-SF-038 (Delta Review) → BEH-SF-234 (Delta Review via session history)
- BEH-SF-039 (Write Serialization) → BEH-SF-238 (Message Ordering)
- BEH-SF-040 (Scoping) → BEH-SF-236 (Flow-Scoped Sessions)

---

## BEH-SF-033: Append-Only Event Log — Events Never Modified or Deleted during Flow Run

> **Invariant:** [INV-SF-1](../invariants/INV-SF-1-acp-session-history-append-only.md) — Blackboard Append-Only History

Every blackboard mutation emits an immutable event. The event log is append-only: events are never modified or deleted during a flow run. This ensures complete auditability of all agent actions and state transitions. Events are idempotent for replay during graph sync recovery.

### Contract

REQUIREMENT (BEH-SF-033): When any blackboard mutation occurs, the system MUST emit an immutable `BlackboardEvent` to the event log. Events in the log MUST NOT be modified or deleted for the duration of the flow run. Replaying the same event MUST produce the same graph state (upsert semantics).

### Verification

- Append test: emit N events; verify the log contains exactly N entries in emission order.
- Immutability test: attempt to modify or delete an event from the log; verify it fails.
- Replay test: replay the event sequence; verify the resulting graph state is identical to the original.

---

## BEH-SF-034: Three Layers — Documents (Versioned), Findings (Severity/Status), Messages (Threaded)

The blackboard has three distinct layers: the document layer (versioned specification documents), the findings layer (review findings with severity and status), and the message layer (inter-agent messages with thread organization).

### Contract

REQUIREMENT (BEH-SF-034): The blackboard MUST provide three separate layers: (a) documents — accessed via `writeDocument`, `getDocument`, `getDocumentHistory`, `listDocuments`; (b) findings — accessed via `addFinding`, `updateFinding`, `getFindings`; (c) messages — accessed via `postMessage`, `getMessages`. Each layer MUST maintain its own data model and access patterns.

### Verification

- Layer separation test: write to each layer independently; verify cross-layer data does not leak.
- API completeness test: verify all layer-specific methods are available and functional on `BlackboardPort`.
- Event type test: verify `DocumentWritten`, `FindingAdded`, and `MessagePosted` events are emitted from their respective layers.

---

## BEH-SF-035: Document Versioning — Each Write Creates New Version, History Preserved

Each document write to the blackboard creates a new version. Prior versions are preserved in the document history, enabling diff comparison and rollback.

### Contract

REQUIREMENT (BEH-SF-035): When `BlackboardPort.writeDocument(doc)` is called for an existing document ID, the system MUST create a new version (incrementing `version` number), MUST preserve the previous version in the history, and MUST emit a `DocumentWritten` event. `getDocumentHistory(documentId)` MUST return all versions ordered by version number.

### Verification

- Versioning test: write a document three times; verify `getDocument` returns version 3 and `getDocumentHistory` returns versions 1, 2, 3.
- Content preservation test: verify each version's content matches what was written.
- Event test: verify three `DocumentWritten` events are emitted, one per write.

---

## BEH-SF-036: Finding Lifecycle — Open to Resolved/Wont-Fix/Deferred

Findings follow a lifecycle: they are created with status `open` and can be transitioned to `resolved`, `wont-fix`, or `deferred`. Severity is immutable after creation (`critical`, `major`, `minor`, `observation`).

### Contract

REQUIREMENT (BEH-SF-036): When `addFinding(finding)` is called, the system MUST create the finding with status `open`. When `updateFinding(findingId, update)` is called, the system MUST transition the finding's status to the specified value (`resolved`, `wont-fix`, or `deferred`). The finding's `severity` MUST NOT be modifiable after creation. A `FindingAdded` event MUST be emitted on creation.

### Verification

- Creation test: add a finding; verify it has status `open` and the specified severity.
- Transition test: update a finding to each valid status; verify the transition succeeds.
- Immutability test: attempt to change a finding's severity; verify it is rejected or unchanged.
- Event test: verify `FindingAdded` is emitted on creation.

---

## BEH-SF-037: Message Routing — Clarification Requests Route to Target Agent Role

Messages on the blackboard include clarification requests that target a specific agent role, clarification responses posted to the same thread, and broadcast messages visible to all agents.

### Contract

REQUIREMENT (BEH-SF-037): When a message with `kind: 'clarification-request'` and a `targetRole` is posted, the system MUST make it retrievable by the target agent's blackboard queries. When a message with `kind: 'clarification-response'` is posted to the same `threadId`, it MUST be linked to the original request. Messages with `kind: 'broadcast'` MUST be visible to all agents.

### Verification

- Routing test: post a clarification request targeting `reviewer`; verify it appears in the reviewer's message queries.
- Thread test: post a request and response to the same thread; verify `getMessages(threadId)` returns both in order.
- Broadcast test: post a broadcast message; verify it is visible to all agent roles.

---

## BEH-SF-038: Delta Review — Agents Receive Only Changes since Last Read

Agents read the blackboard using delta review: they receive only changes since their last read timestamp, not the full blackboard content. This minimizes token consumption for agents reading the blackboard.

### Contract

REQUIREMENT (BEH-SF-038): When an agent calls `BlackboardPort.getChangesSince(timestamp)`, the system MUST return only events emitted after the specified timestamp. Events emitted before the timestamp MUST NOT be included. The result MUST be ordered chronologically.

### Verification

- Delta test: emit events at T1, T2, T3; call `getChangesSince(T2)`; verify only events from T2+ are returned.
- Empty delta test: call `getChangesSince` with a future timestamp; verify an empty result.
- Ordering test: verify returned events are in chronological order.

---

## BEH-SF-039: Write Serialization — Concurrent Writes Serialized via Async Queue

Concurrent agents share the blackboard; writes are serialized via an internal async queue. Reads are non-blocking and always see the latest committed state.

### Contract

REQUIREMENT (BEH-SF-039): When multiple agents write to the blackboard concurrently, the system MUST serialize all write operations through an async queue to prevent data corruption. Read operations MUST be non-blocking and MUST return the latest committed state. No write MUST be lost due to concurrency.

### Verification

- Concurrent write test: issue N concurrent writes from different agents; verify all N writes are persisted and reflected in the event log.
- Read consistency test: read during concurrent writes; verify the read returns a consistent state (no partial writes visible).
- Ordering test: verify the event log order matches the serialization order.

---

## BEH-SF-040: Blackboard Scoping — Each Flow Run Gets Its Own Blackboard Instance

Each flow run creates its own blackboard instance. Agent sessions within the flow read and write to this shared workspace. The blackboard is created when the flow starts and archived when it completes or is cancelled.

### Contract

REQUIREMENT (BEH-SF-040): When a flow run starts, the system MUST create a new, isolated blackboard instance scoped to that flow run. Agents in one flow run MUST NOT see documents, findings, or messages from another flow run's blackboard. When the flow run completes or is cancelled, the blackboard MUST be archived.

### Verification

- Isolation test: start two flow runs; write to blackboard A; verify blackboard B has no content from A.
- Archival test: complete a flow run; verify the blackboard is archived (no longer accepting writes).
- Scoping test: verify all blackboard operations are implicitly scoped to the current flow run.
