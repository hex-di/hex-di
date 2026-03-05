---
id: BEH-SF-065
kind: behavior
title: Flow Lifecycle
status: active
id_range: 065--072
invariants: [INV-SF-32]
adrs: [ADR-007]
types: [flow, flow]
ports: [OrchestratorPort, SessionManagerPort]
---

# 09 — Flow Lifecycle

## BEH-SF-065: Flow Pause — In-Flight Turns Complete, Sessions Suspend, ACP Session Freezes

When a user pauses a flow, all active LLM requests finish their current response (no new turns dispatched), agent sessions transition to `paused`, the ACP session freezes (no new writes accepted), and graph sync drains before the pause is acknowledged.

### Contract

REQUIREMENT (BEH-SF-065): When `OrchestratorPort.pauseFlow(flowRunId)` is called, the system MUST: (a) allow in-flight agent LLM requests to complete their current response, (b) transition all active sessions to `paused` status, (c) stop accepting new ACP session writes (reads remain available), (d) drain the graph sync queue before acknowledging the pause. No new agent turns MUST be dispatched after the pause is initiated.

### Verification

- In-flight test: pause while an agent is mid-response; verify the response completes and no new turn is dispatched.
- Session status test: verify all sessions transition to `paused`.
- ACP session freeze test: attempt an ACP session write after pause; verify it is rejected; verify reads succeed.
- Sync drain test: verify all pending graph sync events are flushed before the pause completes.

---

## BEH-SF-066: Flow Resume — Reactivate Paused Sessions, Re-Enter Current Phase

Resume reactivates all paused sessions and re-enters the current phase at the current iteration. The ACP session unfreezes and accepts writes again.

### Contract

REQUIREMENT (BEH-SF-066): When `OrchestratorPort.resumeFlow(flowRunId)` is called on a paused flow, the system MUST reactivate all paused sessions (transition to `active`), MUST unfreeze the ACP session (accept writes), and MUST re-enter the current phase at the iteration where it was paused. The flow MUST continue executing from its paused state.

### Verification

- Resume test: pause and resume a flow; verify sessions return to `active` and the phase continues.
- Iteration test: pause mid-iteration; resume; verify the phase resumes at the same iteration.
- ACP session test: verify writes are accepted after resume.

---

## BEH-SF-067: Flow Cancel — In-Flight Complete, Sessions Terminated, Partial Materialization

When a flow is cancelled, in-flight agent turns complete, all sessions are terminated, session chunks are partially materialized (with `partial: true`), and the ACP session is archived with status `cancelled`.

### Contract

REQUIREMENT (BEH-SF-067): When `OrchestratorPort.cancelFlow(flowRunId)` is called, the system MUST: (a) allow in-flight LLM requests to complete, (b) terminate all agent sessions (transition to `cancelled`), (c) materialize session chunks from completed segments with `partial: true`, (d) archive the ACP session with `status: "cancelled"`, (e) flush all pending graph sync events.

### Verification

- Termination test: cancel a flow; verify all sessions transition to `cancelled`.
- Partial materialization test: verify session chunks carry `partial: true` metadata.
- ACP session archival test: verify the ACP session is archived with cancelled status.
- Sync test: verify pending graph sync events are flushed before cancel completes.

---

## BEH-SF-068: Cancelled Flow Finality — Cancelled Flows Cannot Be Resumed

Cancelled flows are final. They cannot be resumed. To continue work, start a new flow run with `--compose-from` to carry forward context from the cancelled run.

### Contract

REQUIREMENT (BEH-SF-068): When a flow is in `cancelled` status, the system MUST reject any `resumeFlow()` call for that flow run. The error MUST indicate that cancelled flows cannot be resumed. Context recovery MUST be possible via `--compose-from <cancelled-run-id>` when starting a new flow.

### Verification

- Resume rejection test: cancel a flow; attempt `resumeFlow()`; verify it returns an error.
- Compose-from test: cancel a flow; start a new flow with `--compose-from`; verify the new flow can bootstrap from the cancelled run's chunks.

---

## BEH-SF-069: Failed Phase — Error Recorded, No Retry In-Place, Recovery via Compose-From

When a phase fails with an unrecoverable error (not max-iterations-exceeded), the error is recorded as a `PhaseError` finding. Failed phases cannot be retried in-place. Recovery requires starting a new flow with `--compose-from`.

### Contract

REQUIREMENT (BEH-SF-069): When a phase encounters an unrecoverable error, the system MUST record a `PhaseError` finding on the ACP session with error details, MUST NOT retry the phase in-place, and MUST NOT allow the flow to continue from the failed phase. The flow MUST terminate. Recovery MUST be available via starting a new flow run with `--compose-from <failed-run-id>`.

### Verification

- Error recording test: simulate a phase failure; verify a `PhaseError` finding is recorded.
- No retry test: verify the flow does not automatically retry the failed phase.
- Recovery test: fail a flow; start a new one with `--compose-from`; verify the new flow bootstraps with context from the failed run.

---

## BEH-SF-070: Agent Crash — Recorded as Finding, Phase Continues, Re-Spawn on Next Iteration

When an agent subprocess crashes (unexpected termination, OOM), the crash is recorded as a `PhaseError` finding. Remaining agents in the stage complete. On the next iteration, the crashed agent is re-spawned from its last checkpoint.

### Contract

REQUIREMENT (BEH-SF-070): When an agent subprocess crashes, the system MUST: (a) record the crash as a `PhaseError` finding with crash details, (b) allow remaining agents in the stage to complete, (c) re-spawn the crashed agent on the next iteration from its last session snapshot. If the crash occurs in the last iteration or a single-iteration phase, the agent's work MUST be marked incomplete.

### Verification

- Crash recording test: simulate an agent crash; verify a `PhaseError` finding is written to the ACP session.
- Phase continues test: crash one agent; verify other agents in the stage complete.
- Re-spawn test: crash an agent; verify it is re-spawned on the next iteration from its snapshot.
- Last iteration test: crash an agent in the final iteration; verify its work is marked incomplete.

---

## BEH-SF-071: Flow Run Metadata — Status, Progress, Token Usage Stored in Neo4j

Flow run metadata (status, phase progress, token usage, findings summary) is stored in Neo4j by the SpecForge Server. This enables remote monitoring, team visibility, analytics, and trigger output.

### Contract

REQUIREMENT (BEH-SF-071): The system MUST persist flow run metadata as `FlowRun`, `Phase`, and `AgentSession` nodes in Neo4j, including: `status`, `startedAt`, `completedAt`, phase progress (current phase, iteration), token usage (per-agent and per-phase), and findings summary. Metadata MUST be updated in real time as the flow progresses.

### Verification

- Persistence test: run a flow; query Neo4j for `FlowRun` node; verify all metadata fields are present.
- Real-time test: query metadata during flow execution; verify it reflects the current state.
- Token usage test: verify per-agent and per-phase token usage is accurately recorded.
- Cross-mode test: verify metadata storage works identically in solo, team, and SaaS modes.

---

## BEH-SF-072: ACP Session Archival — ACP Session Archived on Flow Completion/Cancellation

When a flow run completes or is cancelled, its ACP session is archived. The archived ACP session preserves all documents, findings, messages, and events. The ACP session stops accepting writes after archival.

### Contract

REQUIREMENT (BEH-SF-072): When a flow run reaches a terminal state (`completed` or `cancelled`), the system MUST archive the ACP session. The archived ACP session MUST preserve all content (documents, findings, messages, event log). No new writes MUST be accepted to an archived ACP session. Archived ACP sessions MUST remain queryable for historical analysis.

### Verification

- Completion archival test: complete a flow; verify the ACP session is archived and no longer accepts writes.
- Cancellation archival test: cancel a flow; verify the ACP session is archived with cancelled status.
- Query test: query an archived ACP session; verify all content is accessible.
- No-write test: attempt to write to an archived ACP session; verify it is rejected.
