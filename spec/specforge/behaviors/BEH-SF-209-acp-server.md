---
id: BEH-SF-209
kind: behavior
title: ACP Server
status: active
id_range: "209--218"
invariants: [INV-SF-18, INV-SF-19]
adrs: [ADR-018, ADR-019]
types: [acp, acp, ports, ports]
ports: [ACPServerPort, MessageExchangePort, AgentBackendPort]
---

# 30 — ACP Server

**ADR:** [ADR-018](../decisions/ADR-018-acp-agent-protocol.md) — ACP as Primary Agent Protocol
**Architecture:** [architecture/c3-acp-layer.md](../architecture/c3-acp-layer.md)

## BEH-SF-209: ACP Server Startup — Register All 8 Static Roles as ACP Agents with Manifests

When the SpecForge server starts, the ACP server registers all 8 static agent roles (discovery-agent, spec-author, reviewer, feedback-synthesizer, task-decomposer, dev-agent, codebase-analyzer, coverage-agent) as ACP agents with their manifests. Each manifest includes the role name, description, supported input/output content types.

### Contract

REQUIREMENT (BEH-SF-209): When the ACP server starts, it MUST register all 8 static agent roles as ACP agents via `ACPServerService.registerAgent()`. Each registration MUST include an `ACPAgentManifest` with the role's name, description, and content types (`text/markdown` for both input and output). All 8 agents MUST be discoverable via `GET /agents` after startup completes.

### Verification

- Registration test: start the ACP server; verify all 8 agents are registered.
- Discovery test: call `GET /agents`; verify all 8 manifests are returned.
- Content type test: verify each manifest declares `text/markdown` as input and output content type.

---

## BEH-SF-210: Agent Manifest Generation — Role Config to ACPAgentManifest

Each agent role's configuration is translated to an `ACPAgentManifest` that describes the agent's capabilities in ACP terms.

### Contract

REQUIREMENT (BEH-SF-210): When generating an `ACPAgentManifest` from a role configuration, the system MUST map: role name → `manifest.name`, role description → `manifest.description`, role input format → `manifest.inputContentTypes`, role output format → `manifest.outputContentTypes`. The manifest MUST be valid ACP and MUST accurately represent the role's capabilities.

### Verification

- Mapping test: generate a manifest from the `spec-author` role config; verify all fields are correctly mapped.
- Validation test: verify the generated manifest is structurally valid ACP.
- Accuracy test: verify each role's manifest matches its declared capabilities.

---

## BEH-SF-211: Agent Handler Registration — Role to AsyncGenerator Handler Delegating to Backend

Each registered ACP agent has an `AgentHandler` async generator function that receives input messages, delegates execution to the agent backend (Claude Code by default), and yields output messages.

### Contract

REQUIREMENT (BEH-SF-211): When registering an agent, the system MUST create an `AgentHandler` that: (a) receives `AgentContext` and input `ACPMessage` array, (b) translates input to backend execution config (system prompt, tools, model), (c) delegates to `AgentBackendService.execute()`, (d) yields output `ACPMessage` parts as they are produced, (e) can yield `undefined` to trigger an await (HITL pause). The handler MUST be an AsyncGenerator conforming to the `AgentHandler` type.

### Verification

- Handler creation test: register an agent; verify the handler is an AsyncGenerator.
- Delegation test: invoke the handler; verify it delegates to `AgentBackendService.execute()`.
- Streaming test: invoke the handler; verify output messages are yielded incrementally.
- Await test: configure the handler to yield undefined; verify the run enters `awaiting` state.

---

## BEH-SF-212: Run Lifecycle Management — 7-State Machine Tracking per Run

Each ACP run follows a 7-state lifecycle: `created` → `in_progress` → `awaiting`/`cancelling`/`completed`/`failed`/`cancelled`. The `RunLifecycleTracker` enforces valid transitions and prevents invalid state changes.

### Contract

REQUIREMENT (BEH-SF-212): The `RunLifecycleTracker` MUST enforce the following state transitions: `created` → `in_progress`, `in_progress` → `awaiting`/`completed`/`failed`/`cancelling`, `awaiting` → `in_progress`/`cancelling`, `cancelling` → `cancelled`. Terminal states (`completed`, `failed`, `cancelled`) MUST NOT allow further transitions. Invalid transitions MUST return an error. Each run's state MUST be queryable via `getRun(runId)`.

### Verification

- Valid transition test: transition through `created` → `in_progress` → `completed`; verify each state is recorded.
- Invalid transition test: attempt `created` → `completed`; verify it is rejected.
- Terminal state test: attempt to transition from `completed`; verify it is rejected.
- Concurrent run test: create multiple runs; verify each tracks state independently.

---

## BEH-SF-213: Streaming Runs — Incremental ACPMessage Parts via SSE

ACP runs support streaming mode where output messages are delivered incrementally via Server-Sent Events (SSE).

### Contract

REQUIREMENT (BEH-SF-213): When a run is created with `streaming: true`, the ACP server MUST stream output messages via SSE at the `GET /runs/{runId}/stream` endpoint. Each SSE event MUST contain a serialized `ACPMessage`. The stream MUST close when the run reaches a terminal state. Clients MUST be able to consume the stream via `ACPAgentService.streamRun(runId)`.

### Verification

- SSE test: create a streaming run; verify messages arrive via SSE.
- Incremental test: verify messages are delivered as they are produced, not buffered.
- Completion test: verify the SSE stream closes when the run completes.
- Client test: verify `streamRun()` returns an AsyncIterable that yields messages.

---

## BEH-SF-214: Dynamic Role Registration — Activated RoleTemplates Auto-Register as ACP Agents

When the `DynamicRoleFactory` activates a `RoleTemplate` at flow start, the resulting dynamic role is automatically registered as an ACP agent.

### Contract

REQUIREMENT (BEH-SF-214): When `DynamicRoleFactory.activateRoles(projectId)` creates a dynamic role, the system MUST automatically register it as an ACP agent via `ACPServerService.registerAgent()`. The dynamic agent MUST be discoverable via `GET /agents` alongside static agents. When the flow run completes, the dynamic agent MUST be unregistered unless configured as persistent.

### Verification

- Auto-register test: activate a dynamic role; verify it appears in `GET /agents`.
- Handler test: verify the dynamic agent's handler delegates to the backend correctly.
- Cleanup test: complete the flow run; verify the dynamic agent is unregistered.
- Persistent test: configure a dynamic role as persistent; verify it survives flow completion.

---

## BEH-SF-215: External Agent Discovery — External Clients Call GET /agents

External ACP clients can discover SpecForge's agent capabilities via the standard `GET /agents` endpoint.

### Contract

REQUIREMENT (BEH-SF-215): The ACP server MUST expose a `GET /agents` endpoint that returns an array of `ACPAgentManifest` objects for all registered agents (static + dynamic). The response MUST be valid ACP. The endpoint MUST be accessible to any ACP-compatible client. The response MUST update dynamically as agents are registered or unregistered.

### Verification

- Endpoint test: call `GET /agents`; verify a valid JSON array of manifests is returned.
- Dynamic update test: register a new agent; call `GET /agents`; verify it appears in the response.
- External client test: verify an external HTTP client can call the endpoint successfully.

---

## BEH-SF-216: ACP Server Shutdown — Cancel Active Runs, Deregister Agents

When the ACP server shuts down, it cancels all active runs and deregisters all agents.

### Contract

REQUIREMENT (BEH-SF-216): When `ACPServerService.stop()` is called, the system MUST: (a) cancel all runs in non-terminal states via the cancellation protocol, (b) wait for cancellation to complete (with configurable timeout), (c) deregister all agents, (d) release all server resources. After shutdown, no new runs MUST be accepted. Shutdown MUST be idempotent.

### Verification

- Cancellation test: start a run, then shut down; verify the run transitions to `cancelled`.
- Deregistration test: shut down; verify `GET /agents` returns 404 or empty.
- Idempotent test: call `stop()` twice; verify no error on the second call.
- Resource test: verify all server resources (HTTP listener, background tasks) are released.

---

## BEH-SF-217: Storage Backend Selection — Memory (Solo) / Redis+PostgreSQL (SaaS)

The ACP server's `SessionStateManager` selects its storage backend based on the deployment mode.

### Contract

REQUIREMENT (BEH-SF-217): The `SessionStateManager` MUST select its storage backend based on `ACPServerConfig.storageBackend`: `memory` for solo mode (in-process Map), `redis` for SaaS session state, `postgresql` for SaaS durable storage. The backend MUST support the full `SessionStateManager` interface: `loadHistory`, `loadState`, `storeState`, `appendHistory`. Switching backends MUST NOT affect the ACP protocol behavior.

### Verification

- Memory test: configure `memory` backend; verify session state is stored in-process.
- Redis test: configure `redis` backend; verify session state is stored in Redis.
- PostgreSQL test: configure `postgresql` backend; verify session state is stored in PostgreSQL.
- Interface test: verify all backends implement the same interface correctly.

---

## BEH-SF-218: OpenTelemetry Integration — Telemetry for All Agent Runs

All ACP agent runs emit OpenTelemetry traces and metrics for observability.

### Contract

REQUIREMENT (BEH-SF-218): When `ACPServerConfig.telemetryEnabled` is `true`, the ACP server MUST emit OpenTelemetry traces for every run lifecycle event (created, in_progress, awaiting, completed, failed, cancelled). Traces MUST include: agent name, run ID, session ID, state transitions, duration, and token usage. Metrics MUST include: active runs gauge, completed runs counter, run duration histogram. When telemetry is disabled, no traces or metrics MUST be emitted.

### Verification

- Trace test: enable telemetry; create and complete a run; verify trace spans are emitted.
- Metrics test: verify active runs gauge and completed runs counter are updated.
- Duration test: verify run duration histogram records the run duration.
- Disabled test: disable telemetry; verify no traces or metrics are emitted.

---

## CLI Embedded Server

When the CLI executes a flow without a running server, it starts an in-process embedded server on a random available port. The embedded server is temporary: it writes a `.specforge/server.lock` file, handles the flow execution, and auto-shuts down when the CLI process exits.

---

## Server Startup Sequence

The server startup follows this sequence:

1. `ConfigPort.validate()` — validate configuration
2. Mode detection (per precedence rules)
3. Register adapters for detected mode
4. Validate all ports bound (`PortRegistry.isAllBound()`)
5. Start ACP server (`ACPServerPort.start()`)
6. Write readiness probe
7. Write lock file (`.specforge/server.lock`)

---

## Security

### BEH-SF-209 Amendment: Bearer Token Authentication

All REST endpoints require Bearer token authentication. In solo mode, an auto-generated token is written to `.specforge/server.lock`. In SaaS mode, tokens are issued via OAuth. Unauthenticated requests receive 401.

### BEH-SF-211 Amendment: Rate Limiting and Budget Caps

POST /runs is rate-limited to 10 concurrent runs per token. Each run respects `maxBudgetUsd` from the request or server default. Exceeding the limit returns 429.

### BEH-SF-225 Amendment: Trusted External ACP Agents

External ACP agents must be listed in `.specforge/trusted-servers.json`. The server performs capability negotiation with external agents before allowing runs. Unknown servers are rejected with 403.

---

## Security Behaviors

**BEH-SF-320:** REQUIREMENT: All REST endpoints except `GET /health` MUST require a valid Bearer token.

**BEH-SF-321:** REQUIREMENT: Failed authentication attempts MUST be rate-limited (3 attempts per 60 seconds per IP).

**BEH-SF-322:** REQUIREMENT: Session state MUST be encrypted at rest when using Redis or PostgreSQL storage backends.

**BEH-SF-323:** REQUIREMENT: WebSocket connections MUST validate the Bearer token on initial handshake.

**BEH-SF-324:** REQUIREMENT: OAuth token revocation MUST terminate all active sessions for the revoked token within 5 seconds.

---

## ACP Message Translation Error Handling

**BEH-SF-309:** Structural parse failure of an incoming ACP message MUST return `ACPMessageTranslationError` with the raw message payload for debugging.

**BEH-SF-310:** Unrecognized message parts (unknown `type` field values) MUST be preserved in the translated message as opaque parts — they are NOT treated as errors per the forward-compatibility guarantee (see ADR-018).

---

## ACP Run State Machine Errors

**BEH-SF-318:** Invalid ACP run state transitions (e.g., `completed` -> `in_progress`) MUST return `ACPRunStateError` with `currentState`, `attemptedState`, and `runId`.

> **Cross-reference:** `ACPRunStateError` is defined in [types/errors.md](../types/errors.md#acp-errors).

---

## Clarification Await Timeout

**BEH-SF-319:** Clarification await requests between agents MUST timeout after 300 seconds (5 minutes).

**BEH-SF-395:** Timeout MUST return `ClarificationAwaitTimeoutError` with the `awaitId`, `targetAgentRole`, and `timeoutMs`.

**BEH-SF-396:** On timeout, the requesting agent receives a synthetic "no response" message allowing it to proceed with default behavior.

---
