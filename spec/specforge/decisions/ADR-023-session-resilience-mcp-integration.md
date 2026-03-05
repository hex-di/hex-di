---
id: ADR-023
kind: decision
title: Session Resilience & MCP Integration
status: Accepted
date: 2026-02-28
supersedes: []
invariants: [INV-SF-42]
---

# ADR-023: Session Resilience & MCP Integration

**Extends:** [ADR-018](./ADR-018-acp-agent-protocol.md)

## Context

SpecForge sessions are currently ephemeral. When a subprocess crashes, a network interruption occurs, or the user closes the desktop app, all session state is lost. The user must re-create the session, re-establish the context window, and re-run any completed phases. Additionally:

1. **No MCP proxy layer** — Agent backends that rely on MCP (Model Context Protocol) servers for tool execution route stdio traffic directly, with no centralized proxy for health checking, routing, or multiplexing. Each agent connection manages its own MCP subprocess lifecycle independently.
2. **No resume capability** — Sessions cannot be resumed after interruption. The ACP session descriptor (ADR-018) stores a session ID but no state snapshot. Resume requires replaying all messages from the beginning.
3. **No fork capability** — Users cannot explore alternative approaches from a session midpoint. Branching requires manually duplicating prompts and re-executing prior phases.
4. **No automatic checkpointing** — State snapshots are not taken at phase boundaries. Even if resume were possible, there are no consistent restore points.

## Decision

### 1. MCP Proxy Architecture

Introduce `McpProxyPort` as a hexagonal port with a default adapter that manages MCP server subprocess lifecycles:

- The proxy receives MCP tool requests from agent backends via stdio and routes them to the appropriate MCP server based on tool namespace.
- Each MCP server backend is configured via `McpProxyBackendConfig` (defined in [types/acp.md](../types/acp.md)) with transport (`stdio`, `http`, `sse`), command, arguments, and environment variables.
- The proxy performs periodic health checks (`healthCheckIntervalMs`) and automatically restarts unhealthy MCP backends.
- Multiple agent connections share a single MCP proxy instance, multiplexing tool requests across backends. This eliminates the overhead of each agent managing its own MCP subprocess.

The `McpProxyConfig` (defined in [types/acp.md](../types/acp.md)) configures the proxy with a list of backend configs, health check interval, and per-request timeout. The proxy adapter implements reconnection with exponential backoff for crashed backends.

### 2. Session Resume from Checkpoint

The `SessionStateManager` gains a `resume()` method that restores a session from a `SessionCheckpoint`:

- The client sends a `SessionResumeRequest` with the target `sessionId` and `checkpointId`.
- If `verifyHash` is `true` (recommended), the manager recomputes the SHA-256 hash of the serialized state and compares it with the checkpoint's `stateHash`. A mismatch raises `SessionResumeError` (INV-SF-42).
- On successful verification, the session is restored to the checkpoint's `phaseIndex`, message history, and state snapshot.
- The agent connection is re-established if needed (the checkpoint does not store the connection; connections are transient).
- Flow execution resumes from the phase following the checkpoint's `phaseIndex`.

Resume is idempotent — resuming from the same checkpoint multiple times produces the same initial state.

### 3. Session Fork for Parallel Exploration

The `SessionStateManager` gains a `fork()` method that creates a new session from an existing checkpoint:

- The client sends a `SessionForkRequest` with the source session ID, checkpoint ID, and a new session ID.
- The fork creates a deep copy of the checkpoint's state and history under the new session ID.
- The forked session is independent — subsequent messages and state changes do not affect the source session.
- Fork enables exploration patterns: the user can try different approaches from a midpoint without losing the original session's progress.
- Forked sessions share the same `McpProxyPort` instance, so MCP backend connections are not duplicated.

### 4. Automatic Checkpoints at Phase Boundaries

The flow executor automatically creates a `SessionCheckpoint` at each phase boundary (between phase completion and the next phase start):

- The checkpoint captures the session ID, current phase index, SHA-256 state hash, full message history, and serialized state snapshot.
- Checkpoints are stored via the session storage backend (memory, Redis, PostgreSQL — see `ACPServerConfig.storageBackend`).
- Each session retains a configurable maximum number of checkpoints (`maxCheckpoints`, default 10). When the limit is reached, the oldest checkpoint is pruned.
- Checkpoint creation is synchronous within the phase transition to ensure consistency. The flow executor does not proceed to the next phase until the checkpoint is persisted.

The `SessionCheckpoint` type (defined in [types/acp.md](../types/acp.md)) includes `checkpointId`, `sessionId`, `phaseIndex`, `stateHash`, `history`, `stateSnapshot`, and `createdAt`.

### 5. Capability-Gated Resume/Fork

Resume and fork operations are gated by the `BackendNegotiatedCapabilities.persistentSessions` flag from the version negotiation handshake (see [ADR-020](./ADR-020-protocol-extension-observability.md)):

- If `persistentSessions` is `false`, the session manager still creates checkpoints (for observability and audit) but rejects resume and fork requests with a `CapabilityNotSupportedError`.
- Backends that support persistent sessions MUST implement the session restore protocol: accepting a session ID with pre-populated history and state.
- The capability check runs at the `SessionStateManager.resume()` and `SessionStateManager.fork()` entry points, before any state manipulation occurs.

## Concept Mapping

| Pattern                          | SpecForge Adoption                                             |
| -------------------------------- | -------------------------------------------------------------- |
| MCP stdio proxy (Claude Desktop) | `McpProxyPort` with health-checked backend routing             |
| Git branch-from-commit           | `SessionForkRequest` from a specific checkpoint                |
| Database WAL checkpointing       | `SessionCheckpoint` at phase boundaries with SHA-256 integrity |
| Process manager (PM2, systemd)   | MCP proxy health checks with automatic backend restart         |
| Browser session restore          | `SessionResumeRequest` with state hash verification            |

## Trade-Offs

**Benefits:**

- MCP proxy centralizes tool server management, reducing per-agent subprocess overhead
- Session resume eliminates the cost of re-executing completed phases after interruptions
- Session fork enables parallel exploration without duplicating manual effort
- Automatic checkpointing provides consistent restore points without user intervention
- Capability gating ensures resume/fork are only attempted when the backend supports them

**Costs:**

- MCP proxy adds a routing layer between agents and tool servers, introducing latency (mitigated: in-process routing, no network hop)
- Checkpoint storage consumes disk or database space proportional to session state size and checkpoint frequency
- State hash verification adds SHA-256 computation at resume time (mitigated: hashing is fast for typical state sizes)
- Fork creates a deep copy of state, which may be expensive for sessions with large message histories
- Backends must explicitly implement session restore protocol to support resume/fork

## Consequences

- [types/acp.md](../types/acp.md) — `SessionCheckpoint`, `SessionResumeRequest`, `SessionForkRequest`, `McpProxyConfig`, `McpProxyBackendConfig`
- [types/ports.md](../types/ports.md) — `McpProxyPort`, `SessionStateManager.resume()`, `SessionStateManager.fork()` method signatures
- [types/errors.md](../types/errors.md) — `SessionResumeError`, `CapabilityNotSupportedError`
- [invariants/INV-SF-42-session-checkpoint-integrity.md](../invariants/INV-SF-42-session-checkpoint-integrity.md) — Checkpoint state hash MUST be verified on resume
- [behaviors/BEH-SF-520-session-resilience.md](../behaviors/BEH-SF-520-session-resilience.md) — BEH-SF-520 through BEH-SF-527
- [architecture/c3-acp-layer.md](../architecture/c3-acp-layer.md) — MCP proxy component, checkpoint storage integration

## References

- [ADR-018](./ADR-018-acp-agent-protocol.md) — ACP as Primary Agent Protocol (extended, not superseded)
- [ADR-020](./ADR-020-protocol-extension-observability.md) — Version negotiation and `BackendNegotiatedCapabilities`
- [types/acp.md](../types/acp.md) — Full type definitions for session and MCP proxy types
- [MCP Specification](https://spec.modelcontextprotocol.io/) — Model Context Protocol specification
