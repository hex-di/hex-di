---
id: BEH-SF-041
kind: behavior
title: Agent Communication
status: active
id_range: "041--048"
invariants: [INV-SF-2]
adrs: [ADR-018]
types: [acp, acp, agent, agent, ports, ports]
ports: [MessageExchangePort]
---

# 06 — Agent Communication

> **Superseded:** This file is superseded by [32-acp-messaging.md](./BEH-SF-229-acp-messaging.md). Retained for historical reference.

**Behavior Mapping (legacy → ACP):**

- BEH-SF-041 (Clarification Request) → BEH-SF-232 (Clarification via Await)
- BEH-SF-045 (Broadcast Messages) → BEH-SF-231 (Inter-Agent Messages with `role: "agent"`)
- BEH-SF-047 (Message Persistence) → BEH-SF-237 (Graph Sync)

---

## BEH-SF-041: Clarification Request — Agent Posts Request Targeting Specific Role

An agent can post a clarification request targeting a specific agent role. The request is sent as an `ACPMessage` with `role: 'agent/{targetRole}'` containing a clarification-request part, via the `MessageExchangePort`.

### Contract

REQUIREMENT (BEH-SF-041): When an agent needs clarification from another role, it MUST post an `ACPMessage` with `role: 'agent/{targetRole}'` containing a clarification-request part, a `metadata.threadId`, and the question content. The message MUST be written via `MessageExchangePort.postMessage(sessionId, message)` and MUST appear in the ACP session history. See also [BEH-SF-232](./BEH-SF-229-acp-messaging.md) for the ACP await pattern.

### Verification

- Post test: an agent posts a clarification request; verify the message appears in the ACP session history with correct `role`, `metadata.threadId`, and clarification-request part.
- History test: verify `MessageExchangePort.getHistory(sessionId)` includes the request message.

---

## BEH-SF-042: Clarification Routing — Orchestrator Detects Pending Requests, Schedules Responder

The orchestrator detects await requests in the ACP run lifecycle and resumes the awaiting run with the target agent's response. Mutual requests (A requests B while B requests A) are detected and resolved by answering the lower-indexed stage first.

### Contract

REQUIREMENT (BEH-SF-042): When a clarification request is posted via MessageExchangePort, the orchestrator MUST detect the await request in the ACP run lifecycle, MUST resume the awaiting run with the target agent's response, and MUST wait for the response before continuing the requesting agent's flow. For mutual requests (deadlock), the orchestrator MUST resolve by having the lower-indexed stage answer first.

### Verification

- Routing test: agent A posts request targeting agent B; verify the orchestrator schedules B to respond and resumes A's run with B's response.
- Deadlock test: agents A and B simultaneously request each other; verify one answers first based on stage index.
- Scheduling test: verify the requesting agent's run remains in await state until the clarification is resolved or timed out.

---

## BEH-SF-043: Clarification Response — Target Agent Responds in Same Thread

The target agent receives the clarification request as ACP input messages, formulates a response, and posts it as an `ACPMessage` with `role: 'agent'` containing the response, linked to the same thread via `metadata.threadId`.

### Contract

REQUIREMENT (BEH-SF-043): When a target agent is scheduled to handle a clarification request, it MUST receive the request as ACP input messages, MUST post a response as an `ACPMessage` with `role: 'agent'` to the same `metadata.threadId`, and the response MUST be readable by the requesting agent on run resumption.

### Verification

- Response test: schedule a responder; verify it posts an `ACPMessage` with the response linked to the same `metadata.threadId`.
- Thread integrity test: verify `MessageExchangePort.getHistory(sessionId)` returns both the request and response with matching `metadata.threadId`, in order.
- Read test: verify the requesting agent can read the response via `MessageExchangePort.getHistory(sessionId, since)`.

---

## BEH-SF-044: Clarification Timeout — If No Response within Max Turns, Flow Continues Without

Clarification requests have a configurable timeout (default: 60 seconds of agent processing time). On timeout, the request is marked `timed-out` and the requesting agent proceeds without a response.

### Contract

REQUIREMENT (BEH-SF-044): When a clarification request is not answered within the configured timeout, the system MUST mark the request as `timed-out` and MUST allow the requesting agent to proceed without a response. The timeout MUST be configurable. Unanswered requests MUST be retried on session resume or marked `timed-out` after the timeout period.

### Verification

- Timeout test: post a clarification request with no responder; verify it is marked `timed-out` after the timeout period.
- Continue test: verify the requesting agent proceeds with its next task after timeout.
- Resume retry test: pause and resume a flow with an unanswered request; verify the request is retried.

---

## BEH-SF-045: Broadcast Messages — Agents Post Non-Targeted Messages for All to Read

Agents can post broadcast messages visible to all agents in the current flow run. Broadcasts are `ACPMessage` objects with `role: 'agent'` (no specific target) posted via `MessageExchangePort.postMessage(sessionId, message)`.

### Contract

REQUIREMENT (BEH-SF-045): When an agent posts an `ACPMessage` with `role: 'agent'` and no specific target, the system MUST make it visible to all agents in the flow run via `MessageExchangePort.getHistory(sessionId)`. The message MUST NOT have a target role in its metadata.

### Verification

- Broadcast visibility test: post a broadcast from agent A; verify agents B and C can read it via `MessageExchangePort.getHistory(sessionId)`.
- No-target test: verify broadcast messages have no target role in metadata.
- History test: verify broadcast messages appear in `MessageExchangePort.getHistory(sessionId)`.

---

## BEH-SF-046: Message Thread Linking — All Messages in a Thread Share threadId

All messages within a clarification thread share the same `metadata.threadId`. This enables threaded views and conversation tracking via metadata-based filtering on `MessageExchangePort.getHistory(sessionId)`.

### Contract

REQUIREMENT (BEH-SF-046): When multiple messages belong to the same clarification thread, they MUST share the same `metadata.threadId`. `MessageExchangePort.getHistory(sessionId)` filtered by `metadata.threadId` MUST return all messages in the thread, ordered by timestamp. Each thread MUST be identified by a unique `metadata.threadId`.

### Verification

- Thread query test: post 3 messages with the same `metadata.threadId`; verify `getHistory(sessionId)` filtered by `metadata.threadId` returns all 3.
- Ordering test: verify messages within a thread are returned in chronological order.
- Uniqueness test: verify different threads have different `metadata.threadId` values.

---

## BEH-SF-047: Message Persistence — Messages Materialized in Graph after Flow Run

ACP session history is synced to the knowledge graph after the flow run completes. This preserves the communication history for analysis and audit. See [BEH-SF-237](./BEH-SF-229-acp-messaging.md) (Graph Sync).

### Contract

REQUIREMENT (BEH-SF-047): When a flow run completes, the system MUST archive the ACP session including all messages. Clarification threads, broadcast messages, and their metadata MUST be preserved in the archived ACP session. Messages MUST be available for historical queries after the flow run ends.

### Verification

- Archival test: complete a flow run; verify messages are preserved in the archived ACP session.
- Historical query test: after archival, query for messages from the completed flow run; verify they are returned.
- Completeness test: verify all message types (clarification request, response, broadcast) are archived.

---

## BEH-SF-048: No Direct Agent-to-Agent Communication — All Goes through MessageExchangePort

> **Invariant:** [INV-SF-2](../invariants/INV-SF-2-agent-session-isolation.md) — Agent Session Isolation

There is no direct agent-to-agent communication channel. All inter-agent data exchange flows through the `MessageExchangePort`, ensuring full observability and auditability.

### Contract

REQUIREMENT (BEH-SF-048): The system MUST NOT provide any direct communication channel between agent sessions. All inter-agent communication MUST be mediated by the `MessageExchangePort`. Every message exchanged between agents MUST be observable in the ACP session history.

### Verification

- Architecture test: verify agent ACP runs have isolated sessions with no shared memory, pipe, or socket connections to other agents.
- Observability test: run a multi-agent flow; verify all inter-agent communication appears in the ACP session history.
- Audit test: verify the ACP session history provides a complete record of all inter-agent data exchange.
