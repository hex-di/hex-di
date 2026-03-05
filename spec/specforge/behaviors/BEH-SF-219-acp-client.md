---
id: BEH-SF-219
kind: behavior
title: ACP Client
status: active
id_range: 219--228
invariants: [INV-SF-18]
adrs: [ADR-018]
types: [acp, acp, ports, ports]
ports: [ACPAgentPort, ConnectionManagerPort]
---

# 31 — ACP Client

**ADR:** [ADR-018](../decisions/ADR-018-acp-agent-protocol.md) — ACP as Primary Agent Protocol
**Architecture:** [architecture/c3-acp-layer.md](../architecture/c3-acp-layer.md)

## BEH-SF-219: Agent Run Creation — FlowEngine Creates Runs via ACPClient

The FlowEngine creates ACP runs to execute agent work within flow phases. Each agent invocation in a phase becomes an ACP run.

### Contract

REQUIREMENT (BEH-SF-219): When the FlowEngine schedules an agent for a phase, it MUST create an ACP run via `ACPAgentService.createRun()` with: agent name matching the role, input messages containing the task description and composed context, optional session ID for persistent context, and streaming flag based on flow configuration. The returned `ACPRun` MUST be in `created` state. The run MUST transition to `in_progress` immediately after creation.

### Verification

- Creation test: schedule an agent; verify an ACP run is created with correct agent name and input.
- State test: verify the run transitions from `created` to `in_progress`.
- Session test: verify the session ID is passed when persistent context is configured.
- Streaming test: verify the streaming flag is set based on flow configuration.

---

## BEH-SF-220: Run Polling — Poll GET /runs/{run_id} for Terminal State

For non-streaming runs, the ACPClient polls the run status until it reaches a terminal state.

### Contract

REQUIREMENT (BEH-SF-220): When a non-streaming run is created, the ACPClient MUST poll `GET /runs/{runId}` at configurable intervals (default 1 second) until the run reaches a terminal state (`completed`, `failed`, or `cancelled`). The polling interval MUST be configurable via `ACPClientConfig`. Polling MUST stop when the run reaches a terminal state. The final `ACPRun` object MUST contain the complete output messages.

### Verification

- Polling test: create a non-streaming run; verify the client polls at the configured interval.
- Terminal test: verify polling stops when the run completes.
- Output test: verify the final run object contains all output messages.
- Interval test: configure a custom interval; verify polling uses it.

---

## BEH-SF-221: Run Resume — Surface Await Requests for HITL, Resume with User Response

When an ACP run enters `awaiting` state, the orchestrator surfaces the await request and resumes with user input.

### Contract

REQUIREMENT (BEH-SF-221): When a run transitions to `awaiting` state, the ACPClient MUST: (a) extract the `ACPAwaitRequest` from the run's output, (b) surface it to the orchestrator (which routes to HITL), (c) wait for user response, (d) resume the run via `ACPAgentService.resumeRun(runId, messages)`. The resumed run MUST transition back to `in_progress`. The user's response messages MUST be appended to the session history.

### Verification

- Await detection test: create a run that enters `awaiting`; verify the await request is surfaced.
- Resume test: resume the run with user messages; verify it transitions to `in_progress`.
- History test: verify the user's response is in the session history after resume.
- Multi-await test: create a run with multiple await cycles; verify each is handled correctly.

---

## BEH-SF-222: Run Cancellation — Two-Step Graceful Cancellation

ACP runs support two-step cancellation: request cancellation, wait for graceful completion.

### Contract

REQUIREMENT (BEH-SF-222): When `ACPAgentService.cancelRun(runId)` is called, the run MUST transition to `cancelling` state. The agent handler MUST be notified of the cancellation. The handler MUST be given a configurable grace period (default 30 seconds) to complete cleanup. After the grace period, the run MUST transition to `cancelled` regardless. If the handler completes before the grace period, the run MUST transition to `cancelled` immediately.

### Verification

- Graceful test: cancel a run; verify it transitions to `cancelling` then `cancelled`.
- Grace period test: cancel a long-running run; verify it waits up to the grace period.
- Immediate test: cancel a run that completes cleanup quickly; verify immediate `cancelled` transition.
- Already terminal test: cancel a completed run; verify it returns an error.

---

## BEH-SF-223: Streaming Consumption — Real-Time Output Forwarded to UI via WebSocket

Streaming ACP runs forward output messages to the UI in real-time via WebSocket.

### Contract

REQUIREMENT (BEH-SF-223): When a streaming run produces output messages, the ACPClient MUST forward each message to the UI via the existing WebSocket connection. Messages MUST arrive in the order they were produced. The WebSocket message format MUST include the run ID, agent name, and the `ACPMessage`. The stream MUST complete when the run reaches a terminal state.

### Verification

- Forwarding test: create a streaming run; verify messages arrive on the WebSocket.
- Order test: verify messages arrive in production order.
- Format test: verify each WebSocket message includes run ID, agent name, and ACPMessage.
- Completion test: verify the stream ends when the run completes.

---

## BEH-SF-224: Session Management — ACP Sessions for Persistent Context across Iterations

ACP sessions provide persistent context across multiple run invocations within a flow, replacing Claude Code's `--session-id`/`--resume` mechanism.

### Contract

REQUIREMENT (BEH-SF-224): When a flow run starts, the system MUST create an ACP session for each agent role that requires persistent context. Subsequent runs for the same role within the flow MUST reuse the session ID. The session history MUST accumulate all input and output messages across runs. The session state MUST be persisted via `SessionStateManager`. On flow completion, session state MUST be archived.

### Verification

- Session creation test: start a flow; verify ACP sessions are created for persistent roles.
- Reuse test: invoke the same role twice; verify the same session ID is used.
- History test: verify session history includes messages from all runs.
- Archive test: complete the flow; verify session state is archived.

---

## BEH-SF-225: External Agent Invocation — Consume Third-Party ACP Agents by URL

SpecForge can invoke third-party ACP agents hosted at remote URLs.

### Contract

REQUIREMENT (BEH-SF-225): When a flow configuration references an external ACP agent (by URL), the ACPClient MUST: (a) discover the agent via `GET /agents` at the remote URL, (b) create a run at the remote server, (c) poll/stream results like a local run, (d) map the results to SpecForge domain types. External agent errors MUST be mapped to SpecForge error types. Network failures MUST be retried per `ACPClientConfig.retryConfig`.

### Verification

- Discovery test: configure an external agent URL; verify the agent is discovered.
- Invocation test: create a run at a remote server; verify results are returned.
- Error mapping test: simulate a remote error; verify it maps to a SpecForge error type.
- Retry test: simulate a network failure; verify the client retries per configuration.

---

## BEH-SF-226: Error Mapping — ACP Failures to SpecForge Error Types (Frozen, Tagged)

ACP errors are mapped to SpecForge error types that are frozen and tagged for discriminated union matching.

### Contract

REQUIREMENT (BEH-SF-226): When an ACP operation fails, the error MUST be mapped to a SpecForge error type with a unique `_tag`. Error mappings: run creation failure → `RunCreationError`, run timeout → `RunTimeoutError`, run cancelled → `RunCancelledError`, backend failure → `BackendExecutionError`, session not found → `SessionNotFoundError`, server unavailable → `ServerUnavailableError`. All errors MUST be frozen via `Object.freeze()`.

### Verification

- Tag test: trigger each error type; verify the `_tag` is unique and correct.
- Freeze test: verify all error objects are frozen.
- Mapping test: trigger an ACP error; verify it maps to the correct SpecForge error type.
- Discriminated union test: verify errors can be matched via `_tag` in a switch statement.

---

## BEH-SF-227: Parallel Run Execution — Concurrent Runs for Concurrent Stages

When a flow stage has `concurrent: true`, the ACPClient creates multiple runs in parallel.

### Contract

REQUIREMENT (BEH-SF-227): When a `concurrent: true` stage has multiple agent roles, the ACPClient MUST create all runs concurrently (up to the concurrency limit). Runs MUST execute independently. The stage MUST wait for all runs to reach terminal states. Individual run failures MUST NOT cancel other concurrent runs. The concurrency limit MUST be enforced (default 4).

### Verification

- Parallel test: create 3 concurrent runs; verify all execute simultaneously.
- Independence test: fail one run; verify others continue to completion.
- Limit test: set concurrency to 2 with 4 agents; verify at most 2 run simultaneously.
- Wait test: verify the stage waits for all runs to complete.

---

## BEH-SF-228: Run Result Extraction — Parse ACP Messages into Domain Types

ACP run output messages are parsed into SpecForge domain types for downstream consumption.

### Contract

REQUIREMENT (BEH-SF-228): When an ACP run completes, the `MessageTranslator` MUST parse output messages into domain types: named parts with `contentType: text/markdown` → documents, parts with `CitationMetadata` → findings, role-addressed messages → inter-agent communication. The translation MUST be deterministic. Unrecognized message parts MUST be preserved as raw `ACPMessagePart` objects.

### Verification

- Document extraction test: complete a run with markdown parts; verify documents are extracted.
- Finding extraction test: complete a run with citation metadata; verify findings are extracted.
- Communication test: complete a run with role-addressed messages; verify inter-agent communication is extracted.
- Unknown parts test: include an unrecognized content type; verify it is preserved as raw.
