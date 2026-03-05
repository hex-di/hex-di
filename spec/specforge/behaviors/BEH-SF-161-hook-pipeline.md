---
id: BEH-SF-161
kind: behavior
title: Hook Pipeline
status: active
id_range: "161--168"
invariants: [INV-SF-12]
adrs: [ADR-011]
types: [hooks, hooks]
ports: [EventBusPort, GraphMutationPort]
---

# 23 — Hook Pipeline

## BEH-SF-161: Hook Lifecycle Events — 10 Event Types Dispatched by ClaudeCodeAdapter

> **Invariant:** [INV-SF-12](../invariants/INV-SF-12-hook-pipeline-ordering.md) — Hook Pipeline Ordering

The hook pipeline processes 10 event types covering the full agent session lifecycle: PreToolUse, PostToolUse, Stop, SessionStart, SessionEnd, SubagentStart, SubagentStop, Notification, TeammateIdle, and TaskCompleted. Each event is a discriminated union variant with a `_tag` field.

### Contract

REQUIREMENT (BEH-SF-161): The `ClaudeCodeAdapter` MUST dispatch a `HookEvent` for every lifecycle transition. The event MUST include the correct `_tag` discriminant and all required fields per the `HookEvent` type definition. Events MUST be dispatched in causal order — `SessionStart` before any tool events, `SessionEnd` after all tool events.

### Verification

- Event dispatch test: start an agent session; verify `SessionStart` event is dispatched with correct sessionId and role.
- Tool event test: execute a tool; verify `PreToolUse` and `PostToolUse` events are dispatched in order.
- Session end test: complete a session; verify `SessionEnd` event includes token usage.
- Ordering test: verify no `PreToolUse` event is dispatched before `SessionStart` for the same session.

---

## BEH-SF-162: PreToolUse Pipeline — Synchronous Execution with Exit Code Semantics

PreToolUse handlers execute synchronously before every tool invocation. Handlers are resolved by matching tool name and path glob. Exit codes control flow: 0 = allow (tool proceeds), 1 = error (logged, tool proceeds), 2 = block (tool rejected, stderr feedback sent to agent).

### Contract

REQUIREMENT (BEH-SF-162): The `PreToolUsePipeline` MUST execute all matching handlers in registration order before the tool runs. A handler returning exit code 2 MUST block the tool invocation and MUST deliver the handler's stderr content as feedback to the agent. A handler returning exit code 1 MUST log the error but MUST NOT block the tool. Exit code 0 MUST allow the tool to proceed. If multiple handlers match, all MUST execute unless one returns exit code 2, which MUST short-circuit remaining handlers.

### Verification

- Allow test: register a handler returning exit code 0; execute a tool; verify the tool runs.
- Block test: register a handler returning exit code 2; execute a tool; verify the tool is blocked and stderr feedback is delivered.
- Error test: register a handler returning exit code 1; execute a tool; verify the error is logged and the tool runs.
- Ordering test: register handlers A and B; verify A executes before B.
- Short-circuit test: register handler A (exit 2) and B (exit 0); verify B does not execute.

---

## BEH-SF-163: PostToolUse Pipeline — Async Dispatch with Tool Result Capture

PostToolUse handlers execute asynchronously after tool completion. They receive the tool result for processing. Handlers are dispatched via a FIFO queue and never block the agent.

### Contract

REQUIREMENT (BEH-SF-163): The `PostToolUsePipeline` MUST dispatch matching handlers asynchronously after tool completion. Handlers MUST receive the full `PostToolUse` event including `toolResult`. Handler failures MUST be logged but MUST NOT block the agent session or affect subsequent tool invocations. Handlers MUST execute in FIFO order within the dispatch queue.

### Verification

- Dispatch test: register a PostToolUse handler; execute a tool; verify the handler is invoked with the tool result.
- Non-blocking test: register a handler that takes 500ms; verify the agent proceeds immediately without waiting.
- Failure test: register a handler that throws; verify the error is logged and subsequent handlers still execute.
- FIFO test: register handlers A and B; dispatch two events; verify A completes before B starts.

---

## BEH-SF-164: Async Hook Execution — FIFO Queue with <50ms Latency Target

All PostToolUse and session-level hooks execute through an async FIFO queue. The queue processes hooks sequentially to maintain ordering guarantees while keeping agent-perceived latency below 50ms.

### Contract

REQUIREMENT (BEH-SF-164): The async hook queue MUST process hooks in FIFO order. The queue MUST NOT introduce more than 50ms of agent-perceived latency (measured from tool completion to agent receiving the result). The queue MUST drain all pending hooks before the session ends. If a hook exceeds its configured timeout, the queue MUST terminate the hook and MUST proceed to the next hook.

### Verification

- Latency test: register 5 PostToolUse handlers; execute a tool; measure agent-perceived latency is <50ms.
- FIFO test: register handlers with side effects; verify side effects occur in registration order.
- Timeout test: register a handler with 100ms timeout that takes 500ms; verify the handler is terminated and the next handler executes.
- Drain test: trigger session end; verify all pending hooks complete before `SessionEnd` processing.

---

## BEH-SF-165: Graph Sync Hooks — File Mutation to Cypher MERGE

Every file write by any agent triggers a PostToolUse hook that upserts the corresponding file node in Neo4j, computes a SHA-256 content hash, and creates `CONTAINS` edges for detected requirement IDs.

### Contract

REQUIREMENT (BEH-SF-165): When a `Write`, `Edit`, or file-creating `Bash` tool completes, the `GraphSyncHook` MUST compute a SHA-256 content hash of the affected file, MUST issue a Cypher `MERGE` for the file node with the updated hash, and MUST extract requirement IDs (matching `BEH-SF-\d{3}`, `INV-SF-\d+`, `ADR-\d{3}`, `FM-SF-\d{3}`) via regex and create `CONTAINS` edges. The hook MUST be idempotent — repeated invocations for the same file content MUST produce the same graph state.

### Verification

- Sync test: write a file containing `BEH-SF-001`; verify the file node is created in Neo4j with correct content hash and a `CONTAINS` edge to BEH-SF-001.
- Update test: edit a file; verify the content hash is updated and new requirement IDs are detected.
- Idempotency test: write the same file twice; verify the graph state is identical after both writes.
- Bash test: run a Bash command that creates a file; verify the file node is synced.

---

## BEH-SF-166: Compliance Gates — Block Non-Compliant Writes

PreToolUse compliance gates validate spec file writes against structural and formatting rules. In GxP mode, additional gates block destructive git operations and mandate review gates.

### Contract

REQUIREMENT (BEH-SF-166): When a `Write` or `Edit` targets a spec file (matching `spec/**/*.md`), the `ComplianceGateEngine` MUST validate: (a) required sections are present per the spec file's type, (b) requirement IDs follow the `BEH-SF-NNN` format, (c) traceability annotations reference existing graph nodes. In GxP mode, the engine MUST additionally block `git push --force`, `git reset --hard`, and `git branch -D` commands, and MUST require approval gate references for phase transitions. Non-compliant invocations MUST be blocked with exit code 2 and a `ComplianceGateResult` describing the violations.

### Verification

- Section validation test: write a spec file missing a required section; verify the write is blocked with descriptive feedback.
- ID format test: write a spec file with malformed IDs; verify the write is blocked.
- GxP test: enable GxP mode; attempt `git push --force`; verify the command is blocked.
- Pass test: write a compliant spec file; verify the write is allowed.
- Feedback test: verify blocked writes include actionable feedback in stderr.

---

## BEH-SF-167: Agent Behavior Monitoring — Drift, Loop, Stall, Scope Creep Detection

PostToolUse hooks feed a behavior monitor that maintains a rolling window of recent tool invocations. The monitor detects four anomaly types: role drift (wrong tools for role), loops (repetitive patterns), stalls (no progress), and scope creep (out-of-bounds file access).

### Contract

REQUIREMENT (BEH-SF-167): The `BehaviorMonitor` MUST maintain a rolling window of the last N tool invocations per session (configurable, default 20). The monitor MUST detect: (a) role drift — a reviewer using `Write` or `Edit` tools, (b) loops — the same file read 3+ times in the window, (c) stalls — 5+ consecutive tool calls with no artifact creation, (d) scope creep — file access outside the project root or assigned directories. Detected anomalies MUST be recorded as graph nodes and MUST trigger a `Notification` hook event.

### Verification

- Drift test: simulate a reviewer session using `Write`; verify drift anomaly is detected and recorded.
- Loop test: read the same file 4 times; verify loop anomaly is detected.
- Stall test: execute 6 consecutive reads with no writes; verify stall anomaly is detected.
- Scope creep test: access a file outside project root; verify scope creep is detected.
- Window test: verify anomalies are based on the rolling window, not the entire session history.

---

## BEH-SF-168: Session Recording Hooks — Audit Trail via SessionStart/SessionEnd

Session lifecycle hooks record the start and end of every agent session as audit trail entries. SessionStart records role, model, tool set, and permissions. SessionEnd records token usage, finding count, and session duration.

### Contract

REQUIREMENT (BEH-SF-168): On `SessionStart`, the hook pipeline MUST record a graph node with: `sessionId`, `role`, `model`, `tools` (list), `permissions`, `flowRunId`, and `timestamp`. On `SessionEnd`, the hook pipeline MUST update the session node with: `tokenUsage` (input/output tokens), `findingCount`, `durationMs`, and `exitReason`. These records MUST be immutable after creation (SessionStart) and completion (SessionEnd).

### Verification

- Start test: spawn an agent; verify the session node is created with correct role and tools.
- End test: complete a session; verify the session node is updated with token usage and duration.
- Immutability test: attempt to modify a completed session record; verify the modification is rejected.
- Flow linkage test: verify the session record links to its parent flow run via `flowRunId`.
