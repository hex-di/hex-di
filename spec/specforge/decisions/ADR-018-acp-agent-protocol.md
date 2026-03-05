---
id: ADR-018
kind: decision
title: ACP as Primary Agent Protocol
status: Accepted
date: 2026-02-28
supersedes: [ADR-003, ADR-004]
invariants: []
---

# ADR-018: ACP as Primary Agent Protocol

## Context

SpecForge controls agents via Claude Code CLI subprocesses (`claude -p`), communicates between agents through a proprietary blackboard pattern (now ACP) (three-layer shared workspace), and manages sessions via Claude Code's `--session-id`/`--resume` flags. This tightly couples SpecForge to a single LLM provider and prevents interoperability with the broader agent ecosystem.

The Agent Communication Protocol (ACP) is an emerging open standard for agent-to-agent and client-to-agent communication. It provides a message-based protocol with structured runs, sessions, discovery, and await mechanisms — all features SpecForge currently implements through bespoke code.

## Decision

Adopt ACP as the primary agent protocol. SpecForge becomes dual-mode:

1. **ACP Server** — Exposes all 8 agent roles (plus dynamic roles) as ACP agents discoverable via `GET /agents`. External clients can create runs against any registered agent.

2. **ACP Client** — The FlowEngine creates runs via ACP's `POST /runs` endpoint. Polling, streaming, cancellation, and session management use standard ACP operations.

The blackboard communication pattern (ADR-003, now ACP) is replaced by ACP's message model:

- Document layer → Named `ACPMessagePart` artifacts with `contentType: text/markdown`
- Findings layer → `ACPMessage` parts with `CitationMetadata`
- Message layer → Role-addressed `ACPMessages` (`agent/{role}`)
- Clarification requests → ACP await mechanism (`MessageAwaitRequest`)

Claude Code CLI (ADR-004) becomes one possible agent backend behind ACP handlers. The `LLMProviderPort` is absorbed by `ACPAgentPort` (client-side run management) and `AgentBackendPort` (execution engine). New backends (Codex CLI, Ollama, etc.) implement `AgentBackendPort` without affecting the ACP protocol surface.

## Architecture

```typescript
// ACP Server — exposes agents
interface ACPServerService {
  readonly registerAgent: (
    manifest: ACPAgentManifest,
    handler: AgentHandler
  ) => ResultAsync<void, ACPError>;
  readonly unregisterAgent: (name: string) => ResultAsync<void, ACPError>;
  readonly listAgents: () => ResultAsync<ReadonlyArray<ACPAgentManifest>, ACPError>;
  readonly start: (config: ACPServerConfig) => ResultAsync<void, ACPError>;
  readonly stop: () => ResultAsync<void, ACPError>;
}

// ACP Client — invokes runs
interface ACPAgentService {
  readonly createRun: (request: ACPRunCreateRequest) => ResultAsync<ACPRun, ACPError>;
  readonly getRun: (runId: string) => ResultAsync<ACPRun, ACPError>;
  readonly resumeRun: (
    runId: string,
    input: ReadonlyArray<ACPMessage>
  ) => ResultAsync<ACPRun, ACPError>;
  readonly cancelRun: (runId: string) => ResultAsync<void, ACPError>;
  readonly streamRun: (runId: string) => ResultAsync<AsyncIterable<ACPMessage>, ACPError>;
  readonly discoverAgents: (
    serverUrl: string
  ) => ResultAsync<ReadonlyArray<ACPAgentManifest>, ACPError>;
}

// Agent Handler — how agents process messages (AsyncGenerator pattern)
type AgentHandler = (
  context: AgentContext,
  input: ReadonlyArray<ACPMessage>
) => AsyncGenerator<ACPMessage, void, ReadonlyArray<ACPMessage> | undefined>;

// Agent Backend — execution engine behind ACP (Claude Code is the default)
interface AgentBackendService {
  readonly execute: (
    config: BackendExecutionConfig
  ) => ResultAsync<AsyncIterable<ACPMessage>, BackendError>;
  readonly getCapabilities: () => BackendCapabilities;
}
```

## Concept Mapping

| ACP Concept                      | Replaces                                | SpecForge Concept                                                 |
| -------------------------------- | --------------------------------------- | ----------------------------------------------------------------- |
| Agent Manifest                   | `AgentRoleRegistry.listRoles()`         | `ACPAgentManifest` per role, served via `GET /agents`             |
| Runs (7-state lifecycle)         | `AgentHandle.sendTask()` + subprocess   | `ACPRun` via `POST /runs`, polled/streamed                        |
| Sessions                         | Claude Code `--session-id`/`--resume`   | `ACPSession` with URL-based distributed descriptors               |
| Messages (role, parts, metadata) | Blackboard 3-layer event log (now ACP)  | `ACPMessage` — artifacts for docs, citation metadata for findings |
| Await mechanism                  | `requiresApproval` phase gates          | Agent yields `MessageAwaitRequest`, orchestrator resumes          |
| Discovery (`GET /agents`)        | `AgentRoleRegistry.listRoles()`         | ACP server endpoint                                               |
| `run_agent()` composition        | FlowEngine + message exchange data flow | ACP composition patterns (chaining, routing, parallel)            |

## Rationale

1. **Protocol standardization** — ACP provides a well-defined protocol for agent communication. SpecForge no longer invents its own subprocess + custom message protocol.

2. **Ecosystem interop** — External ACP clients can discover and invoke SpecForge agents. SpecForge can consume third-party ACP agents by URL.

3. **Distributed sessions** — ACP sessions support URL-based state descriptors, enabling distributed session storage (Memory for solo, Redis+PostgreSQL for SaaS).

4. **Message-native communication** — ACP messages with parts, metadata, and role addressing naturally express the document/finding/message patterns previously implemented through custom event types.

5. **Backend abstraction** — The `AgentBackendPort` cleanly separates the agent protocol (ACP) from the execution engine (Claude Code CLI). Swapping backends does not affect orchestration, session management, or inter-agent communication.

6. **HITL via await** — ACP's await mechanism replaces the bespoke approval gate and human feedback patterns with a standard mechanism: agents yield await requests, the orchestrator surfaces them to humans, and resumes with the response.

## Trade-offs

- **Protocol overhead** — ACP adds HTTP request/response overhead compared to direct subprocess stdio. Mitigated by the ACP server running in-process (localhost) and by streaming for real-time output.

- **Migration complexity** — All legacy blackboard references must be replaced with ACP message patterns. Managed by systematic file-by-file migration with supersession notes on legacy documents.

- **Emerging standard** — ACP is not yet widely adopted. Risk accepted because SpecForge's usage pattern (local server + agent handlers) does not depend on external ACP ecosystem maturity.

## References

- [ACP Server Behaviors](../behaviors/BEH-SF-209-acp-server.md) — BEH-SF-209 through BEH-SF-218
- [ACP Client Behaviors](../behaviors/BEH-SF-219-acp-client.md) — BEH-SF-219 through BEH-SF-228
- [ACP Messaging Behaviors](../behaviors/BEH-SF-229-acp-messaging.md) — BEH-SF-229 through BEH-SF-238
- [Agent Backend Behaviors](../behaviors/BEH-SF-239-agent-backend.md) — BEH-SF-239 through BEH-SF-248
- [ACP Types](../types/acp.md) — ACPMessage, ACPRun, ACPAgentManifest, ACPSession
- [ACP Layer Architecture](../architecture/c3-acp-layer.md) — Component diagram
- [Port Types](../types/ports.md) — ACPAgentService, ACPServerService, AgentBackendService
