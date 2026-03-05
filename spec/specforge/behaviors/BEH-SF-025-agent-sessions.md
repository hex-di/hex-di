---
id: BEH-SF-025
kind: behavior
title: Agent Sessions
status: active
id_range: "025--032"
invariants: [INV-SF-23, INV-SF-7, INV-SF-2]
adrs: [ADR-018, ADR-006]
types: [agent, agent, acp, acp]
ports: [SessionManagerPort, SessionSnapshotStorePort, ACPAgentPort]
---

# 04 — Agent Sessions

**Related:** [BEH-SF-219](./BEH-SF-219-acp-client.md) (run creation via ACPClient), [BEH-SF-224](./BEH-SF-219-acp-client.md) (ACP session management)

## BEH-SF-025: Session Creation — Spawn Agent Subprocess with Role-Specific Prompt and Tools

Each agent session is created via the ACPClient as an ACP run. See [BEH-SF-219](./BEH-SF-219-acp-client.md) for run creation details. The session is created with a role-specific system prompt, a scoped tool set resolved from `ToolRegistryPort`, a model selection (opus/sonnet/haiku), and an ACP session ID for tracking.

### Contract

REQUIREMENT (BEH-SF-025): When `SessionPort.create(config)` is called, the system MUST create an ACP run via `ACPAgentService.createRun()` configured with the `systemPrompt`, `tools`, `model`, and `maxTokens` from the `SessionConfig`. The tool set MUST be resolved from `ToolRegistryPort.getToolsForRole(role)` at creation time. The session MUST transition to `created` status and be retrievable via `SessionPort.get(sessionId)`.

### Verification

- Creation test: call `create()` with valid config; verify the session exists with `created` status.
- Tool resolution test: verify the spawned subprocess receives exactly the tools returned by `getToolsForRole()`.
- Model test: verify the subprocess is configured with the specified model selection.

---

## BEH-SF-026: Session Bootstrap — Optionally Inject Composed Context from Prior Sessions

Before an agent session starts processing, the orchestrator can inject a composed context assembled from prior session chunks. The composed context is injected into the agent's system prompt as background knowledge, and the `BOOTSTRAPPED_FROM` relationship is recorded in the graph.

### Contract

REQUIREMENT (BEH-SF-026): When a `SessionConfig` includes a `composedContext`, the system MUST inject the composed context into the agent's system prompt before the first task is dispatched. The system MUST create a `BOOTSTRAPPED_FROM` relationship between the `AgentSession` and the `ComposedContext` node. If `composedContext` is absent or the composition query returns no chunks, the session MUST start without composed context (cold start) and a warning MUST be logged.

### Verification

- Bootstrap test: create a session with composed context; verify the system prompt includes the context content.
- Relationship test: verify the `BOOTSTRAPPED_FROM` edge exists in the graph after session creation.
- Cold start test: create a session without composed context; verify it starts successfully with a warning logged.
- Empty composition test: configure composition with a query that returns no chunks; verify graceful fallback.

---

## BEH-SF-027: Session Persistence — Conversation Context Accumulates across Iterations within a Phase

> **Invariant:** [INV-SF-2](../invariants/INV-SF-2-agent-session-isolation.md) — Agent Session Isolation

Agent sessions are persistent within a flow run. Each iteration adds to the conversation history rather than starting fresh. A spec-author reviewing feedback in iteration 3 remembers the original spec from iteration 1 and reviewer comments from iteration 2.

### Contract

REQUIREMENT (BEH-SF-027): When an agent session executes across multiple iterations within a phase, the system MUST preserve the full ACP session history between iterations. Each new run MUST reuse the same ACP session ID, appending to the session history. The agent MUST be able to reference its own prior outputs from earlier iterations via the session history.

### Verification

- Persistence test: dispatch two tasks to the same session; verify the second task's response demonstrates awareness of the first task.
- Iteration test: run a phase with 3 iterations; verify the agent's output in iteration 3 references content from iterations 1 and 2.
- Memory test: verify token usage accumulates across iterations (not reset).

---

## BEH-SF-028: Session Pause — Subprocess State Preserved on Flow Pause

When a flow is paused, all active agent sessions transition to `paused` status. The subprocess state is preserved in memory (or snapshot-stored for long pauses via `SessionSnapshotStorePort`).

### Contract

REQUIREMENT (BEH-SF-028): When `SessionPort.pause(sessionId)` is called, the system MUST transition the session to `paused` status, MUST preserve the ACP session state via `SessionStateManager.storeState()`, and MUST NOT accept new runs for the session. No new tasks MUST be dispatched to paused sessions.

### Verification

- Status test: pause a session; verify status transitions to `paused`.
- Snapshot test: pause a session; verify a snapshot is saved via `SessionSnapshotStorePort`.
- No-dispatch test: attempt to send a task to a paused session; verify it is rejected.

---

## BEH-SF-029: Session Resume — Reactivate Paused Subprocess from Snapshot

When a flow is resumed, all paused sessions are reactivated. The subprocess resumes from its preserved state, re-entering the current phase at the current iteration.

### Contract

REQUIREMENT (BEH-SF-029): When `SessionPort.resume(sessionId)` is called on a paused session, the system MUST restore the ACP session state via `SessionStateManager.loadState()`, transition the session to `active` status, and MUST be ready to accept new ACP runs. The resumed session MUST retain its full session history from before the pause.

### Verification

- Resume test: pause then resume a session; verify status returns to `active`.
- Continuity test: resume a session and dispatch a task; verify the agent remembers content from before the pause.
- Snapshot restore test: verify `SessionSnapshotStorePort.loadSnapshot()` is called during resume.

---

## BEH-SF-030: Session Cancel — Terminate Subprocess, Partial Materialization

When a session is cancelled, the subprocess is terminated. Conversation chunks from completed segments are materialized with `partial: true` metadata. Cancelled sessions cannot be resumed.

### Contract

REQUIREMENT (BEH-SF-030): When `SessionPort.cancel(sessionId)` is called, the system MUST terminate the subprocess, transition the session to `cancelled` status, and MUST materialize session chunks from completed conversation segments with `partial: true` metadata. The cancelled session MUST NOT be resumable.

### Verification

- Termination test: cancel a session; verify the subprocess is terminated and status is `cancelled`.
- Partial materialization test: cancel a session mid-conversation; verify chunks are materialized with `partial: true`.
- No-resume test: attempt to resume a cancelled session; verify it is rejected.

---

## BEH-SF-031: Session Completion — Archive Session, Materialize Conversation Chunks

When a session completes naturally, its conversation is fully materialized as session chunks in the knowledge graph. The session transitions to `completed` status and the subprocess is disposed.

### Contract

REQUIREMENT (BEH-SF-031): When an agent session completes all its tasks, the system MUST transition it to `completed` status, MUST materialize its full conversation as `SessionChunk` nodes in the graph (per [BEH-SF-009](./BEH-SF-009-session-materialization.md)), and MUST dispose the subprocess. The materialized chunks MUST NOT carry `partial: true` metadata.

### Verification

- Completion test: run a session to completion; verify status is `completed`.
- Materialization test: verify `SessionChunk` nodes are created in the graph without `partial` flags.
- Disposal test: verify the subprocess is terminated after completion.
- Token usage test: verify final `tokenUsage` is recorded on the session.

---

## BEH-SF-032: Session Isolation — Agents Cannot Read Other Agents' Conversation Context Directly

> **Invariant:** [INV-SF-2](../invariants/INV-SF-2-agent-session-isolation.md) — Agent Session Isolation

Agent sessions are isolated from each other. An agent cannot directly read or modify another agent's conversation context. All inter-agent communication flows through the ACP session message layer.

### Contract

REQUIREMENT (BEH-SF-032): The system MUST ensure that no agent session can access another session's conversation history, system prompt, or internal state. All inter-agent data exchange MUST go through ACP messages within the shared flow session. The ACP run isolation MUST prevent cross-session memory access.

### Verification

- Isolation test: run two concurrent agents; verify neither can reference the other's conversation content.
- ACP-session-only test: verify all inter-agent data exchange is observable on the ACP session event log.
- Process isolation test: verify each agent runs in a separate OS process with no shared memory.

---

## Concurrent Agent Failure Cleanup

**BEH-SF-387:** Failed agent sessions MUST release all held resources (file handles, network connections, subprocess references) within 5 seconds of failure detection.

**BEH-SF-388:** SessionManager MUST implement resource cleanup via process termination — if graceful cleanup exceeds the 5-second deadline, the agent subprocess is forcefully terminated (SIGKILL).

---

## Session Lifecycle Management

**BEH-SF-389:** Pausing a session MUST snapshot current agent state (context, pending messages, token usage) before suspending the agent subprocess.

**BEH-SF-390:** Resuming a session MUST restore from the most recent snapshot and validate state consistency (hash check) before reactivating the agent.

**BEH-SF-391:** Cancelling a session MUST terminate the agent subprocess, release all held resources, and publish an `agent-completed` event with cancellation status.

---

## Concurrent Session Pause

**BEH-SF-365:** Pausing a flow MUST wait for ALL in-flight agent sessions to reach a safe checkpoint before the pause is considered complete.

**BEH-SF-366:** If any agent session fails to reach a checkpoint within 30 seconds, it is force-paused (snapshot current state regardless of checkpoint status).

---
