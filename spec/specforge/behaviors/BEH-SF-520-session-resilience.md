---
id: BEH-SF-520
kind: behavior
title: Session Resilience
status: active
id_range: 520--527
invariants: [INV-SF-42]
adrs: [ADR-023]
types: [acp, errors]
ports: [McpProxyService, SessionStateManager, ConnectionManagerService]
---

# 41 — Session Resilience

**ADR:** [ADR-023](../decisions/ADR-023-session-resilience.md)

**Architecture:** [c3-acp-layer.md](../architecture/c3-acp-layer.md)

---

## BEH-SF-520: MCP Proxy Startup — McpProxyService Exposes stdio to Agents

`McpProxyService` starts an MCP proxy process that exposes a stdio interface to agents, abstracting the underlying backend transport. Agents communicate with MCP tools via the proxy's stdin/stdout.

### Contract

REQUIREMENT (BEH-SF-520): When `McpProxyService.start(config)` is called, the system MUST spawn an MCP proxy process that listens on stdio (stdin/stdout). The proxy MUST expose all configured MCP tool servers to agents via the MCP protocol over stdio. The proxy MUST handle process lifecycle: startup health check, graceful shutdown on session end, and forced kill after a configurable timeout. If the proxy fails to start within the health check timeout, the system MUST return `McpProxyStartupError`.

### Verification

- Unit test: start proxy with valid config; verify the proxy process is running and responsive on stdio.
- Unit test: proxy fails to start (invalid config); verify `McpProxyStartupError` is returned.
- Unit test: session ends; verify proxy process is gracefully shut down.

---

## BEH-SF-521: MCP Proxy Backend Routing — Route to HTTP/SSE/stdio Backends

The MCP proxy routes agent tool requests to the appropriate backend transport (HTTP, SSE, or stdio) based on the tool server configuration.

### Contract

REQUIREMENT (BEH-SF-521): When an agent sends an MCP tool request through the proxy, the system MUST route the request to the correct backend based on the tool server's configured transport type (`http`, `sse`, `stdio`). For `http` backends, the proxy MUST send HTTP POST requests. For `sse` backends, the proxy MUST maintain an SSE connection and correlate responses. For `stdio` backends, the proxy MUST communicate via the tool server's stdin/stdout. The routing MUST be transparent to the agent; all transports MUST present the same MCP protocol interface.

### Verification

- Unit test: route request to HTTP backend; verify HTTP POST is sent with correct payload.
- Unit test: route request to SSE backend; verify SSE connection is established and response is correlated.
- Unit test: route request to stdio backend; verify communication via stdin/stdout of the tool server process.

---

## BEH-SF-522: MCP Proxy Health Check — Backend Availability Before Agent Spawn

Before spawning an agent, the system verifies that all required MCP tool backends are reachable via the proxy's health check mechanism.

### Contract

REQUIREMENT (BEH-SF-522): When `McpProxyService.healthCheck()` is called, the system MUST ping each configured backend and return a `HealthCheckResult` with per-backend status (`healthy`, `degraded`, `unreachable`). The overall status MUST be `healthy` only if all backends are healthy. Before spawning an agent that depends on MCP tools, the system MUST call `healthCheck()` and MUST NOT proceed if any required backend is `unreachable`. Optional backends that are unreachable MUST trigger a warning but MUST NOT block agent spawning.

### Verification

- Unit test: all backends healthy; verify overall status is `healthy` and agent spawn proceeds.
- Unit test: required backend unreachable; verify agent spawn is blocked with an error.
- Unit test: optional backend unreachable; verify warning is logged and agent spawn proceeds.

---

## BEH-SF-523: MCP Config at Session Creation — Proxy Config in Session Init

MCP proxy configuration is provided at session creation time as part of the `SessionInit` message. The configuration specifies which tool servers to expose and their transport settings.

### Contract

REQUIREMENT (BEH-SF-523): When a session is created with an `mcpConfig` field in the `SessionInit` message, the system MUST configure the MCP proxy with the specified tool servers before the session becomes active. Each tool server entry MUST include `name`, `transport` (`http`, `sse`, `stdio`), `endpoint` (URL or command), and optional `env` (environment variables). If `mcpConfig` is absent, the session MUST proceed without MCP proxy support. Invalid `mcpConfig` entries MUST cause session creation to fail with `McpConfigValidationError`.

### Verification

- Unit test: create session with valid `mcpConfig` containing 2 tool servers; verify proxy is configured with both.
- Unit test: create session without `mcpConfig`; verify session starts without MCP proxy.
- Unit test: create session with invalid `mcpConfig` (missing `transport`); verify `McpConfigValidationError` is returned.

---

## BEH-SF-524: Session Resume — Load Prior State from Checkpoint

> **Invariant:** [INV-SF-42](../invariants/INV-SF-42-checkpoint-state-integrity.md) — Checkpoint State Integrity

A session can be resumed from a prior checkpoint, restoring the conversation history, agent state, and active tool contexts to the checkpointed moment.

### Contract

REQUIREMENT (BEH-SF-524): When `SessionStateManager.resume(checkpointId)` is called, the system MUST load the checkpoint data from persistent storage, verify its integrity hash, and restore the session to the checkpointed state. The restored state MUST include `conversationHistory`, `agentState`, `activeToolContexts`, and `configValues`. After restoration, the session MUST be ready to accept new messages as if it had never been interrupted. If the checkpoint is not found, the system MUST return `CheckpointNotFoundError`. If the integrity hash does not match, the system MUST return `CheckpointCorruptionError`.

### Verification

- Unit test: resume from valid checkpoint; verify conversation history and agent state are restored.
- Unit test: resume with unknown `checkpointId`; verify `CheckpointNotFoundError` is returned.
- Unit test: resume from corrupted checkpoint (hash mismatch); verify `CheckpointCorruptionError` is returned.

---

## BEH-SF-525: Session Fork — Branch from Checkpoint with New ID

> **Invariant:** [INV-SF-42](../invariants/INV-SF-42-checkpoint-state-integrity.md) — Checkpoint State Integrity

A session can be forked from a checkpoint, creating a new independent session that starts from the checkpointed state but has its own session ID and independent future state.

### Contract

REQUIREMENT (BEH-SF-525): When `SessionStateManager.fork(checkpointId)` is called, the system MUST create a new session with a fresh `sessionId` while cloning all state from the specified checkpoint. The forked session MUST be independent: mutations to the forked session MUST NOT affect the original session or checkpoint. The forked session's `parentSessionId` MUST reference the original session. The checkpoint integrity hash MUST be verified before forking; hash mismatch MUST return `CheckpointCorruptionError`.

### Verification

- Unit test: fork from checkpoint; verify new session has a different `sessionId` and `parentSessionId` references original.
- Unit test: mutate forked session; verify original session state is unchanged.
- Unit test: fork from corrupted checkpoint; verify `CheckpointCorruptionError` is returned.

---

## BEH-SF-526: Automatic Checkpoints — Created at Phase Boundaries

> **Invariant:** [INV-SF-42](../invariants/INV-SF-42-checkpoint-state-integrity.md) — Checkpoint State Integrity

The system automatically creates checkpoints at significant phase boundaries during a session, such as after tool execution completes, after agent turn ends, and at configurable intervals.

### Contract

REQUIREMENT (BEH-SF-526): The system MUST automatically create a checkpoint after each of the following phase boundaries: (1) after a tool call completes (`ToolCallUpdate { status: "complete" }`), (2) after an agent turn ends (`StopReasonUpdate`), (3) at configurable time intervals (`checkpointIntervalMs`). Each automatic checkpoint MUST include the full session state and an integrity hash. The system MUST retain the last `maxCheckpoints` checkpoints (configurable, default 10) and MUST delete older checkpoints to manage storage. Automatic checkpointing MUST NOT block the main session flow.

### Verification

- Unit test: tool call completes; verify a checkpoint is automatically created.
- Unit test: agent turn ends with `StopReasonUpdate`; verify a checkpoint is created.
- Unit test: 12 checkpoints created with `maxCheckpoints: 10`; verify only the latest 10 are retained.

---

## BEH-SF-527: Checkpoint State Hash Verification — Hash Check Before Restore

> **Invariant:** [INV-SF-42](../invariants/INV-SF-42-checkpoint-state-integrity.md) — Checkpoint State Integrity

Every checkpoint includes an integrity hash computed over the serialized state. The hash is verified before any restore or fork operation to detect corruption.

### Contract

REQUIREMENT (BEH-SF-527): When a checkpoint is created, the system MUST compute a SHA-256 hash over the serialized checkpoint state and store it alongside the checkpoint data. Before any `resume()` or `fork()` operation, the system MUST recompute the hash over the stored state and compare it to the stored hash. If the hashes do not match, the system MUST return `CheckpointCorruptionError` and MUST NOT restore or fork from the corrupted checkpoint. The hash computation MUST be deterministic: the same state MUST always produce the same hash.

### Verification

- Unit test: create checkpoint and immediately restore; verify hash matches and restore succeeds.
- Unit test: tamper with stored checkpoint data; verify hash mismatch is detected and `CheckpointCorruptionError` is returned.
- Unit test: create two checkpoints from identical state; verify both produce the same hash (determinism).

---
