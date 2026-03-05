---
id: BEH-SF-229
kind: behavior
title: ACP Messaging
status: active
id_range: "229--238"
invariants: [INV-SF-1, INV-SF-22, INV-SF-27]
adrs: [ADR-018]
types: [acp, acp, ports, ports]
ports: [MessageExchangePort, ACPAgentPort]
---

# 32 — ACP Messaging

**ADR:** [ADR-018](../decisions/ADR-018-acp-agent-protocol.md) — ACP as Primary Agent Protocol
**Supersedes:** [behaviors/BEH-SF-033-blackboard.md](./BEH-SF-033-blackboard.md) (partially), [behaviors/BEH-SF-041-agent-communication.md](./BEH-SF-041-agent-communication.md) (partially)

## BEH-SF-229: Document Artifacts — Specs as Named ACPMessageParts (contentType: text/markdown)

Specification documents are represented as named `ACPMessagePart` artifacts with markdown content type.

### Contract

REQUIREMENT (BEH-SF-229): When an agent produces a specification document, it MUST yield an `ACPMessage` containing a named `ACPMessagePart` with `contentType: text/markdown`, a `name` identifying the document, and the markdown content as `content`. Document names MUST be unique within a session. Versioning MUST be tracked via the append-only session history (each new version is a new message).

### Verification

- Artifact test: agent yields a document; verify it is an ACPMessagePart with correct contentType and name.
- Content test: verify the markdown content is preserved exactly.
- Uniqueness test: verify document names are unique within a session.
- Versioning test: yield two versions of the same document name; verify both exist in session history.

---

## BEH-SF-230: Finding Messages — Review Findings with CitationMetadata

Review findings are expressed as `ACPMessage` parts annotated with `CitationMetadata`.

### Contract

REQUIREMENT (BEH-SF-230): When an agent produces a review finding, it MUST yield an `ACPMessage` containing a part with `CitationMetadata` in its metadata. The citation MUST include: `kind: "citation"`, `startIndex` and `endIndex` referencing the finding location, and optionally `url`, `title`, and `description`. Finding severity MUST be conveyed via a `severity` field in the part's metadata.

### Verification

- Citation test: agent yields a finding; verify CitationMetadata is present in part metadata.
- Fields test: verify startIndex, endIndex, and severity are set.
- Optional fields test: verify url, title, description are included when provided.
- Multiple findings test: yield multiple findings; verify each has its own citation metadata.

---

## BEH-SF-231: Inter-Agent Messages — Role-Addressed ACPMessages (agent/{role})

Agents communicate with specific other agents using role-addressed ACP messages.

### Contract

REQUIREMENT (BEH-SF-231): When an agent needs to communicate with a specific agent role, it MUST yield an `ACPMessage` with `role: "agent/{targetRole}"` (e.g., `"agent/reviewer"`). The message MUST be visible to the target role when it reads the session history. Broadcast messages MUST use `role: "agent"` (without a specific role suffix). Messages MUST be ordered by their position in the session history.

### Verification

- Targeted test: yield a message with `role: "agent/reviewer"`; verify the reviewer can read it from session history.
- Broadcast test: yield a message with `role: "agent"`; verify all agents can read it.
- Ordering test: yield multiple messages; verify they appear in order in session history.
- Filtering test: verify an agent can filter session history to messages addressed to its role.

---

## BEH-SF-232: Clarification via Await — Agent Yields MessageAwaitRequest, Orchestrator Mediates

When an agent needs clarification from another agent, it yields an await request. The orchestrator mediates by routing the question to the target agent and resuming with the response.

### Contract

REQUIREMENT (BEH-SF-232): When an agent needs clarification, it MUST yield `undefined` from its `AgentHandler` generator (triggering await state) after posting a role-addressed question message. The orchestrator MUST detect the `awaiting` state, route the question to the target agent, collect the response, and resume the original run with the response messages. The clarification exchange MUST be recorded in the session history.

### Verification

- Await trigger test: agent yields undefined; verify the run enters `awaiting` state.
- Routing test: verify the orchestrator routes the question to the target agent.
- Resume test: verify the original run is resumed with the response messages.
- History test: verify the clarification exchange appears in session history.

---

## BEH-SF-233: Human Feedback via Await — Resume Awaiting Run with User Messages

Human feedback is injected by resuming an awaiting run with user messages.

### Contract

REQUIREMENT (BEH-SF-233): When a human provides feedback during a flow, the system MUST resume an awaiting run (or create a new message in the session) with an `ACPMessage` having `role: "user"` and the feedback content as parts. User messages MUST carry `priority: "highest"` in metadata (preserving the behavior from BEH-SF-121). User messages MUST be visible to all agents in the session.

### Verification

- User role test: inject human feedback; verify the message has `role: "user"`.
- Priority test: verify user messages carry `priority: "highest"` in metadata.
- Visibility test: verify all agents can read the user feedback from session history.
- Resume test: resume an awaiting run with user feedback; verify it continues processing.

---

## BEH-SF-234: Delta Review — Agents Read Changes since Last Interaction via Session History

Agents read only the changes since their last interaction, minimizing context consumption.

### Contract

REQUIREMENT (BEH-SF-234): When an agent reads the session history, it MUST be able to filter to messages since its last read timestamp via `MessageExchangeService.getHistory(sessionId, since)`. The `since` parameter MUST be the timestamp of the agent's last message read. Only messages after `since` MUST be returned. The result MUST be ordered chronologically.

### Verification

- Delta test: post messages at T1, T2, T3; agent reads since T2; verify only T2+ messages returned.
- Empty delta test: read with a future timestamp; verify empty result.
- Ordering test: verify returned messages are in chronological order.
- Per-agent test: verify each agent tracks its own read timestamp independently.

---

## BEH-SF-235: Append-Only Session History — Messages Never Modified (Preserves INV-SF-1)

> **Invariant:** [INV-SF-1](../invariants/INV-SF-1-acp-session-history-append-only.md) — ACP Session History Append-Only

ACP session history is append-only. Messages are never modified or deleted during a flow run.

### Contract

REQUIREMENT (BEH-SF-235): The ACP session history MUST be append-only: messages MUST NOT be modified or deleted for the duration of the flow run. New messages MUST be appended to the end of the history. The history MUST preserve the exact order of message creation. Replaying the same message sequence MUST produce identical session state.

### Verification

- Append test: post N messages; verify the history contains exactly N entries in order.
- Immutability test: attempt to modify a message in history; verify it fails.
- Replay test: replay the message sequence; verify identical session state.
- Concurrent test: append from multiple agents concurrently; verify all messages are persisted.

---

## BEH-SF-236: Flow-Scoped Sessions — Each Flow Run Gets Its Own ACP Session

Each flow run creates its own ACP session, providing an isolated communication space.

### Contract

REQUIREMENT (BEH-SF-236): When a flow run starts, the system MUST create a new ACP session scoped to that flow run. Agents in one flow run MUST NOT see messages from another flow run's session. When the flow run completes, the session MUST be archived. The session ID MUST be stored on the flow run record for traceability.

### Verification

- Isolation test: start two flow runs; post to session A; verify session B has no messages from A.
- Archive test: complete a flow run; verify the session is archived.
- Scoping test: verify all agent communication within a flow uses the flow's session ID.
- Traceability test: verify the flow run record contains the session ID.

---

## BEH-SF-237: Graph Sync — Project ACP Messages into Neo4j Knowledge Graph

ACP messages are projected into the Neo4j knowledge graph for persistence and analysis.

### Contract

REQUIREMENT (BEH-SF-237): When an ACP message is appended to a session history, the system MUST project it into the Neo4j knowledge graph via `GraphSyncPort`. Document artifacts MUST create/update `SpecFile` nodes. Finding messages MUST create `Finding` nodes. Communication messages MUST create `Message` nodes. The projection MUST be idempotent (replaying produces the same graph state). Graph sync MUST be triggered on every message append.

### Verification

- Document sync test: yield a document artifact; verify a `SpecFile` node is created in Neo4j.
- Finding sync test: yield a finding message; verify a `Finding` node is created.
- Idempotent test: replay the same messages; verify the graph state is unchanged.
- Trigger test: verify graph sync is triggered on every message append.

---

## BEH-SF-238: Message Ordering — Serialize Concurrent Writes to Session History

Concurrent writes to the session history are serialized to maintain a consistent ordering.

### Contract

REQUIREMENT (BEH-SF-238): When multiple agents write to the session history concurrently, the system MUST serialize all write operations to prevent ordering ambiguity. The serialization MUST preserve causal ordering where possible. No message MUST be lost due to concurrency. Reads MUST always return a consistent snapshot of the history.

### Verification

- Concurrent write test: issue N concurrent writes; verify all N messages are persisted.
- Ordering test: verify the serialized order is consistent across reads.
- No-loss test: issue rapid concurrent writes; verify no messages are lost.
- Consistency test: read during concurrent writes; verify a consistent snapshot is returned.
