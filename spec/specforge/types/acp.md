---
id: TYPE-SF-001
kind: types
title: ACP Types
status: active
domain: acp
behaviors: []
adrs: [ADR-018, ADR-019, ADR-020, ADR-021, ADR-022, ADR-023, ADR-024]
---

# ACP Types

**Source:** [ADR-018](../decisions/ADR-018-acp-agent-protocol.md) — ACP as Primary Agent Protocol

- [types/ports.md](./ports.md) — `ACPAgentService`, `ACPServerService`, `AgentBackendService`
- [types/agent.md](./agent.md) — `AgentRole`, session types
- [behaviors/BEH-SF-209-acp-server.md](../behaviors/BEH-SF-209-acp-server.md) — ACP server behaviors
- [behaviors/BEH-SF-219-acp-client.md](../behaviors/BEH-SF-219-acp-client.md) — ACP client behaviors
- [behaviors/BEH-SF-229-acp-messaging.md](../behaviors/BEH-SF-229-acp-messaging.md) — ACP messaging behaviors
- [behaviors/BEH-SF-239-agent-backend.md](../behaviors/BEH-SF-239-agent-backend.md) — Agent backend behaviors
- [behaviors/BEH-SF-496-protocol-extensions.md](../behaviors/BEH-SF-496-protocol-extensions.md) — Protocol extension behaviors
- [behaviors/BEH-SF-504-agent-registry-distribution.md](../behaviors/BEH-SF-504-agent-registry-distribution.md) — Agent registry distribution behaviors
- [behaviors/BEH-SF-512-dynamic-capabilities.md](../behaviors/BEH-SF-512-dynamic-capabilities.md) — Dynamic capabilities behaviors
- [behaviors/BEH-SF-520-session-resilience.md](../behaviors/BEH-SF-520-session-resilience.md) — Session resilience behaviors
- [behaviors/BEH-SF-528-permission-policy.md](../behaviors/BEH-SF-528-permission-policy.md) — Permission policy behaviors

> **Cross-reference (M51):** `Finding` is canonically defined in [types/flow.md](./flow.md#finding-type). ACP messages may contain findings as message parts; the `Finding` type is shared.

---

## Side Pattern

Zed-inspired generic for ensuring message type consistency between ACP client and server modes. The two port interfaces (`ACPAgentService`, `ACPServerService`) remain separate for hex-di registration, but their message types derive from this shared generic. See [ADR-019](../decisions/ADR-019-zed-inspired-architecture.md).

```typescript
type ACPSide = "client" | "server";

type InboundMessage<S extends ACPSide> = S extends "client"
  ? AgentToClientMessage
  : ClientToAgentMessage;

type OutboundMessage<S extends ACPSide> = S extends "client"
  ? ClientToAgentMessage
  : AgentToClientMessage;

type AgentToClientMessage =
  | { readonly _tag: "FlowUpdateNotification"; readonly update: FlowUpdate }
  | { readonly _tag: "PermissionRequest"; readonly request: PermissionRequestData }
  | { readonly _tag: "FileReadRequest"; readonly path: string; readonly sessionId: string }
  | {
      readonly _tag: "FileWriteRequest";
      readonly path: string;
      readonly content: string;
      readonly sessionId: string;
    }
  | {
      readonly _tag: "TerminalCreateRequest";
      readonly command: string;
      readonly sessionId: string;
    };

type ClientToAgentMessage =
  | {
      readonly _tag: "PromptRequest";
      readonly prompt: ReadonlyArray<ACPMessagePart>;
      readonly sessionId: string;
    }
  | { readonly _tag: "CancelRequest"; readonly sessionId: string }
  | { readonly _tag: "SetModeRequest"; readonly modeId: string; readonly sessionId: string };
```

> **Design note (ADR-019):** `ACPAgentService` methods produce `InboundMessage<"client">` (messages from agent to client). `ACPServerService` handlers process `InboundMessage<"server">` (messages from client to agent). This type-level relationship ensures the two ports cannot drift in message definitions.

---

## Message Parts

```typescript
interface ACPMessagePart {
  readonly name?: string;
  readonly contentType: string;
  readonly content?: string;
  readonly contentUrl?: string;
  readonly contentEncoding?: "base64" | "utf-8";
  readonly metadata?: Record<string, unknown>;
}
```

---

## Messages

```typescript
type ACPMessageRole = "user" | "agent" | `agent/${string}`;

interface ACPMessage {
  readonly role: ACPMessageRole;
  readonly parts: ReadonlyArray<ACPMessagePart>;
  readonly metadata?: Record<string, unknown>;
  readonly _meta?: ProtocolMeta;
}
```

---

## Citation Metadata

Attached to message parts to reference source material. Used for findings and review comments.

```typescript
interface CitationMetadata {
  readonly kind: "citation";
  readonly startIndex: number;
  readonly endIndex: number;
  readonly url?: string;
  readonly title?: string;
  readonly description?: string;
}
```

---

## Trajectory Metadata

Attached to message parts to record agent execution traces. Used for observability and audit.

```typescript
interface TrajectoryMetadata {
  readonly kind: "trajectory";
  readonly message?: string;
  readonly toolName?: string;
  readonly toolInput?: string;
  readonly toolOutput?: string;
}
```

> **Security (M27):** `TrajectoryMetadata.toolInput` MUST be redacted for tool invocations matching sensitive patterns (file paths containing `credentials`, `secrets`, `.env`; tool inputs containing API keys). Redaction replaces the value with `[REDACTED]`.

---

## Agent Manifest

Describes an agent's capabilities and interface contract. Served via `GET /agents`. Expanded per [ADR-019](../decisions/ADR-019-zed-inspired-architecture.md) to include capabilities, model preference, convergence contribution, and source tracking for the unified Agent Registry.

```typescript
interface ACPAgentManifest {
  readonly name: string;
  readonly description: string;
  readonly inputContentTypes: ReadonlyArray<string>;
  readonly outputContentTypes: ReadonlyArray<string>;
  readonly capabilities: AgentRoleCapabilities;
  readonly modelPreference: ModelSelection;
  readonly convergenceContribution: "primary" | "secondary" | "observer";
  readonly source: "builtin" | "template" | "marketplace";
}
```

> **Migration (ADR-019):** The four new fields (`capabilities`, `modelPreference`, `convergenceContribution`, `source`) are required on all manifests. Built-in roles populate them at startup. Dynamic templates populate them from `RoleTemplate` fields. Marketplace agents populate them from the cloud API response.

---

## Agent Role Capabilities

Declares the tool and resource requirements for an agent role. Used at flow definition time (via `TemplateService.validateCapabilities()`) to verify all role-tool bindings are satisfiable before any LLM tokens are spent. See [INV-SF-21](../invariants/INV-SF-21-flow-definition-capability-validation.md).

```typescript
interface AgentRoleCapabilities {
  readonly requiredTools: ReadonlyArray<string>;
  readonly requiredFs: { readonly read: boolean; readonly write: boolean };
  readonly requiredTerminal: boolean;
  readonly requiredGraph: { readonly query: boolean; readonly mutate: boolean };
}
```

---

## Run Lifecycle

```typescript
type ACPRunState =
  | "created"
  | "in_progress"
  | "awaiting"
  | "cancelling"
  | "cancelled"
  | "completed"
  | "failed";

interface ACPRun {
  readonly runId: string;
  readonly agentName: string;
  readonly state: ACPRunState;
  readonly input: ReadonlyArray<ACPMessage>;
  readonly output: ReadonlyArray<ACPMessage>;
  readonly sessionId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly error?: ACPRunError;
}

interface ACPRunError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

interface ACPRunCreateRequest {
  readonly agentName: string;
  readonly input: ReadonlyArray<ACPMessage>;
  readonly sessionId?: string;
  readonly streaming?: boolean;
  readonly metadata?: Record<string, unknown>;
}
```

> **State transition (N03):** The `in_progress → cancelling` transition is valid and occurs when a user or budget enforcement cancels an active run.

---

## Await Mechanism

Agents yield await requests to pause execution and request input (human feedback, clarification, approval).

```typescript
interface ACPAwaitRequest {
  readonly type: "message";
  readonly prompt: string;
  readonly metadata?: Record<string, unknown>;
}

interface ACPAwaitResume {
  readonly messages: ReadonlyArray<ACPMessage>;
}
```

---

## Sessions

ACP sessions provide persistent context across multiple runs.

```typescript
interface ACPSessionDescriptor {
  readonly id: string;
  readonly history: ReadonlyArray<string>;
  readonly state: string;
}
```

> **Security (M28):** WebSocket connections require the same Bearer token as REST endpoints. The token is passed via the `Authorization` query parameter on the initial WebSocket handshake.

---

## FlowUpdate

Session-scoped streaming updates sent from agents to subscribers. Replaces the generic `ACPMessage` callback in `MessageExchangeService.subscribe()`. A closed discriminated union of 17 tagged variants — consumers exhaustively match on `_tag`. See [ADR-019](../decisions/ADR-019-zed-inspired-architecture.md), [ADR-020](../decisions/ADR-020-protocol-extension-observability.md), [ADR-022](../decisions/ADR-022-dynamic-agent-capabilities.md).

> **Disambiguation:** `FlowUpdate` = session-scoped streaming updates (what happened inside a session). `OrchestratorEvent` = system-level lifecycle events (what happened to the flow/phase). `ExtFlowUpdate` = extension-contributed FlowUpdate variants namespaced with `_` prefix. No overlap — they serve different audiences and different granularities. See [types/extensibility.md](./extensibility.md).

```typescript
type FlowUpdate =
  | {
      readonly _tag: "AgentMessageChunk";
      readonly role: string;
      readonly content: string;
      readonly sessionId: string;
    }
  | {
      readonly _tag: "AgentThoughtChunk";
      readonly role: string;
      readonly content: string;
      readonly sessionId: string;
    }
  | {
      readonly _tag: "AgentFinding";
      readonly finding: Finding;
      readonly citations: ReadonlyArray<CitationMetadata>;
      readonly sessionId: string;
    }
  | {
      readonly _tag: "AgentDocument";
      readonly artifact: ACPMessagePart;
      readonly sessionId: string;
    }
  | {
      readonly _tag: "ToolCallStarted";
      readonly toolCallId: string;
      readonly kind: ToolKind;
      readonly title: string;
      readonly sessionId: string;
    }
  | {
      readonly _tag: "ToolCallCompleted";
      readonly toolCallId: string;
      readonly status: "completed" | "failed";
      readonly output: string | undefined;
      readonly sessionId: string;
    }
  | {
      readonly _tag: "CodeDiff";
      readonly path: string;
      readonly oldText: string | undefined;
      readonly newText: string | undefined;
      readonly sessionId: string;
    }
  | {
      readonly _tag: "AgentPlan";
      readonly entries: ReadonlyArray<PlanEntry>;
      readonly sessionId: string;
    }
  | {
      readonly _tag: "PermissionRequested";
      readonly toolCallId: string;
      readonly options: ReadonlyArray<PermissionOption>;
      readonly sessionId: string;
    }
  | {
      readonly _tag: "InterAgentMessage";
      readonly from: string;
      readonly to: string;
      readonly content: string;
      readonly sessionId: string;
    }
  | {
      readonly _tag: "BudgetZoneChanged";
      readonly from: BudgetZone;
      readonly to: BudgetZone;
      readonly flowRunId: string;
    }
  | {
      readonly _tag: "PhaseConverged";
      readonly phaseName: string;
      readonly metrics: PhaseMetrics;
      readonly flowRunId: string;
    }
  | {
      readonly _tag: "ToolCallProgress";
      readonly toolCallId: string;
      readonly delta: string;
      readonly percentage?: number;
      readonly sessionId: string;
    }
  | {
      readonly _tag: "ExtFlowUpdate";
      readonly extensionName: string;
      readonly payload: Record<string, unknown>;
      readonly sessionId: string;
    }
  | {
      readonly _tag: "CommandsUpdate";
      readonly commands: ReadonlyArray<SlashCommandDescriptor>;
      readonly sessionId: string;
    }
  | {
      readonly _tag: "ConfigOptionsUpdate";
      readonly options: ReadonlyArray<ConfigOption>;
      readonly sessionId: string;
    }
  | { readonly _tag: "StopReasonUpdate"; readonly reason: StopReason; readonly sessionId: string };
```

### FlowUpdate Supporting Types

```typescript
type ToolKind =
  | "read"
  | "edit"
  | "delete"
  | "move"
  | "search"
  | "execute"
  | "think"
  | "fetch"
  | "other";

type BudgetZone = "green" | "yellow" | "orange" | "red";

interface PermissionOption {
  readonly optionId: string;
  readonly name: string;
  readonly kind: PermissionOptionKind;
}

type PermissionOptionKind = "allow-once" | "allow-always" | "reject-once" | "reject-always";
```

> **Cross-reference:** `Finding` is defined in [types/flow.md](./flow.md#finding-type). `CitationMetadata` is defined above. `PhaseMetrics` is defined in [types/flow.md](./flow.md#phase-metrics). `PlanEntry` is defined below.

---

## Agent Plan

Structured plan primitive for tracking agent progress. Sent as `FlowUpdate { _tag: "AgentPlan" }`. Plans are complete replacements — the agent MUST send all entries in each update; the client MUST replace the current plan entirely.

```typescript
type PlanEntryPriority = "high" | "medium" | "low";
type PlanEntryStatus = "pending" | "in_progress" | "completed";

interface PlanEntry {
  readonly content: string;
  readonly priority: PlanEntryPriority;
  readonly status: PlanEntryStatus;
}
```

---

## Connections

Connections represent the live subprocess link to an agent backend. Separated from sessions per [ADR-019](../decisions/ADR-019-zed-inspired-architecture.md) — a session holds conversation state; a connection holds the subprocess handle. Connections can be pooled and reused across sessions.

```typescript
interface AgentConnection {
  readonly connectionId: string;
  readonly agentName: string;
  readonly status: "initializing" | "ready" | "closed";
  readonly capabilities: BackendCapabilities;
  readonly createdAt: string;
}

interface AgentConnectionConfig {
  readonly agentName: string;
  readonly backend: "claude-code" | "custom";
  readonly backendConfig: BackendExecutionConfig;
  readonly keepAlive: boolean;
}
```

> **Relationship to Sessions:** `SessionStateManager` references `ConnectionManagerService` for subprocess reuse. A session may span multiple connections (if a subprocess restarts) and a connection may serve multiple sessions (if `keepAlive` is true).

---

## Agent Handler

The function signature for processing agent runs. Receives input messages, yields output messages, and can yield `undefined` to trigger an await.

```typescript
interface AgentContext {
  readonly runId: string;
  readonly agentName: string;
  readonly session: {
    readonly loadHistory: () => ResultAsync<ReadonlyArray<ACPMessage>, ACPError>;
    readonly loadState: () => ResultAsync<Record<string, unknown>, ACPError>;
    readonly storeState: (state: Record<string, unknown>) => ResultAsync<void, ACPError>;
  };
}

type AgentHandler = (
  context: AgentContext,
  input: ReadonlyArray<ACPMessage>
) => AsyncGenerator<ACPMessage, void, ReadonlyArray<ACPMessage> | undefined>;
```

---

## Run Handle

Client-side handle for managing an active run.

```typescript
interface ACPRunHandle {
  readonly runId: string;
  readonly sendInput: (messages: ReadonlyArray<ACPMessage>) => ResultAsync<ACPRun, ACPError>;
  readonly cancel: () => ResultAsync<void, ACPError>;
  readonly waitForCompletion: () => ResultAsync<ACPRun, ACPError>;
}
```

---

## Server Configuration

```typescript
type StorageBackend = "memory" | "redis" | "postgresql";

interface ACPServerConfig {
  readonly host: string;
  readonly port: number;
  readonly storageBackend: StorageBackend;
  readonly telemetryEnabled: boolean;
}
```

---

## Client Configuration

```typescript
interface ACPRetryConfig {
  readonly maxRetries: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
}

interface ACPClientConfig {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly retryConfig: ACPRetryConfig;
}
```

---

## Security Types

```typescript
interface ACPAuthConfig {
  readonly mechanism: "bearer" | "oauth";
  readonly tokenLocation: "lock-file" | "oauth-provider";
}

interface ACPRateLimitConfig {
  readonly maxConcurrentRuns: number;
  readonly maxBudgetUsd: number;
  readonly windowMs: number;
}

interface TrustedServer {
  readonly url: string;
  readonly name: string;
  readonly capabilities: ReadonlyArray<string>;
  readonly addedAt: string;
}
```

> **Security (M29):** GxP audit hash chains use SHA-256 for content hashing. Key derivation uses HKDF (RFC 5869). Hash chain integrity is verified on every read operation.

---

## Backend Execution

Types for the agent backend (e.g., Claude Code CLI) behind ACP handlers.

```typescript
interface BackendExecutionConfig {
  readonly role: string;
  readonly systemPrompt: string;
  readonly tools: ReadonlyArray<string>;
  readonly model: ModelSelection;
  readonly input: ReadonlyArray<ACPMessage>;
  readonly sessionId?: string;
  readonly maxTokens?: number;
}
```

> **Note (N48):** The `model` field uses `ModelSelection` (defined in [types/flow.md](./flow.md)) rather than a raw `string`. `ModelSelection` is `'opus' | 'sonnet' | 'haiku'`. If an adapter needs to pass through an arbitrary model identifier, it should map internally from `ModelSelection` to the provider-specific model string.

```typescript
interface BackendCapabilities {
  readonly supportedModels: ReadonlyArray<string>;
  readonly supportsStreaming: boolean;
  readonly supportsPersistentSessions: boolean;
}
```

---

## Token Usage

> **Unification (C39):** `TokenUsage` is canonically defined in [types/flow.md](./flow.md#token-usage) with four fields: `inputTokens`, `outputTokens`, `totalTokens`, `estimatedCost?`. All files referencing `TokenUsage` use the canonical definition from flow.md.

---

## Protocol Meta

Observability pass-through metadata attached to `ACPMessage` and `FlowUpdate` instances. Preserves OpenTelemetry context and W3C Trace Context across the protocol boundary. See [ADR-020](../decisions/ADR-020-protocol-extension-observability.md), [INV-SF-39](../invariants/INV-SF-39-protocol-meta-pass-through.md).

```typescript
interface ProtocolMeta {
  readonly traceId?: string;
  readonly spanId?: string;
  readonly traceFlags?: number;
  readonly baggage?: Record<string, string>;
}
```

> **Pass-through (INV-SF-39):** `_meta` fields MUST be preserved end-to-end by all protocol components (ACPServer, ACPClient, MessageTranslator). Intermediaries MUST NOT strip or modify `_meta` unless explicitly handling observability extraction.

---

## Extension Method Descriptor

Describes a custom protocol method registered by an agent or extension. Extension methods use the `_` prefix convention to avoid collisions with protocol methods. See [ADR-020](../decisions/ADR-020-protocol-extension-observability.md), [INV-SF-38](../invariants/INV-SF-38-extension-method-isolation.md).

```typescript
interface ExtensionMethodDescriptor {
  readonly name: string;
  readonly namespace: string;
  readonly description: string;
  readonly inputSchema?: Record<string, unknown>;
  readonly outputSchema?: Record<string, unknown>;
}
```

> **Convention (ADR-020):** Extension method names MUST start with `_` (underscore). The namespace prevents collisions between extensions from different providers. Example: `_acme.lint`, `_github.pr-review`.

---

## StopReason

Closed enum of 7 variants describing why an agent run terminated. All consumers MUST handle all variants exhaustively. See [ADR-020](../decisions/ADR-020-protocol-extension-observability.md).

```typescript
type StopReason =
  | { readonly _tag: "EndTurn" }
  | { readonly _tag: "MaxTokens" }
  | { readonly _tag: "StopSequence"; readonly sequence: string }
  | { readonly _tag: "ToolUse" }
  | { readonly _tag: "ContentFilter" }
  | { readonly _tag: "Cancelled"; readonly cancelledBy: "user" | "system" | "budget" }
  | { readonly _tag: "Error"; readonly error: string };
```

---

## Protocol Handshake

Returned by `ConnectionManagerService.negotiate()` during the version negotiation handshake with an agent backend. See [ADR-020](../decisions/ADR-020-protocol-extension-observability.md).

```typescript
interface ProtocolHandshake {
  readonly protocolVersion: string;
  readonly backendInfo: BackendInfo;
  readonly negotiatedCapabilities: BackendNegotiatedCapabilities;
  readonly extensionMethods: ReadonlyArray<ExtensionMethodDescriptor>;
}

interface BackendInfo {
  readonly name: string;
  readonly version: string;
  readonly vendor: string;
}

interface BackendNegotiatedCapabilities {
  readonly streaming: boolean;
  readonly persistentSessions: boolean;
  readonly extensionMethods: boolean;
  readonly toolCallProgress: boolean;
  readonly configOptions: boolean;
  readonly slashCommands: boolean;
}
```

---

## Agent Manifest Schema (Extended)

Extends `ACPAgentManifest` with registry metadata for schema-driven agent discovery across multiple sources. See [ADR-021](../decisions/ADR-021-schema-driven-agent-registry.md), [INV-SF-40](../invariants/INV-SF-40-manifest-schema-validation.md).

```typescript
interface AgentManifestSchema extends ACPAgentManifest {
  readonly version: string;
  readonly platformTargets: ReadonlyArray<PlatformTarget>;
  readonly branding: AgentBranding;
  readonly registrySource: string;
  readonly lastUpdated: string;
}

interface AgentBranding {
  readonly displayName: string;
  readonly icon: string;
  readonly iconSize: "16x16";
  readonly iconColorMode: "currentColor";
}

type PlatformTarget = "darwin" | "linux" | "win32" | "web" | "all";

interface RegistrySourceConfig {
  readonly type: "cdn" | "npm" | "github" | "local";
  readonly url: string;
  readonly refreshIntervalMs: number;
  readonly auth?: { readonly type: "token" | "basic"; readonly credential: string };
}
```

> **Validation (INV-SF-40):** All manifests MUST pass `AgentManifestSchema` validation before registration. The `version` field MUST be valid semver. The `branding.icon` MUST be a 16×16 SVG using `currentColor`.

---

## Config Options

Agent-advertised configuration options that can be modified mid-session. See [ADR-022](../decisions/ADR-022-dynamic-agent-capabilities.md).

```typescript
interface ConfigOption {
  readonly name: string;
  readonly description: string;
  readonly type: "boolean" | "string" | "number" | "enum";
  readonly defaultValue: unknown;
  readonly currentValue: unknown;
  readonly enumValues?: ReadonlyArray<string>;
}

interface ConfigSetRequest {
  readonly sessionId: string;
  readonly options: ReadonlyArray<{ readonly name: string; readonly value: unknown }>;
}
```

---

## Slash Commands

Agent-advertised slash commands that update dynamically based on session state. See [ADR-022](../decisions/ADR-022-dynamic-agent-capabilities.md).

```typescript
interface SlashCommandDescriptor {
  readonly name: string;
  readonly description: string;
  readonly args: ReadonlyArray<SlashCommandArg>;
}

interface SlashCommandArg {
  readonly name: string;
  readonly description: string;
  readonly required: boolean;
  readonly type: "string" | "number" | "boolean";
}
```

---

## Surface Capabilities

Declared at session creation to describe what content types the client surface can render. Used for content block capability gating. See [ADR-022](../decisions/ADR-022-dynamic-agent-capabilities.md), [INV-SF-41](../invariants/INV-SF-41-surface-capability-gating.md).

```typescript
interface SurfaceCapabilities {
  readonly supportedContentTypes: ReadonlyArray<string>;
  readonly supportsStreaming: boolean;
  readonly supportsInteractiveElements: boolean;
  readonly supportsCodeDiff: boolean;
  readonly supportsAgentPlan: boolean;
  readonly maxContentSizeBytes: number;
}

interface ContentGatingResult {
  readonly originalTag: string;
  readonly action: "pass" | "downgrade" | "drop";
  readonly downgradedTo?: string;
  readonly reason?: string;
}
```

> **Gating (INV-SF-41):** `FlowUpdate` content blocks MUST be validated against the session's `SurfaceCapabilities` before delivery. Unsupported blocks are downgraded (e.g., CodeDiff → text) or dropped with a logged reason.

---

## Session Checkpoint

Captures session state at phase boundaries for resume and fork operations. See [ADR-023](../decisions/ADR-023-session-resilience-mcp-integration.md), [INV-SF-42](../invariants/INV-SF-42-session-checkpoint-integrity.md).

```typescript
interface SessionCheckpoint {
  readonly checkpointId: string;
  readonly sessionId: string;
  readonly phaseIndex: number;
  readonly stateHash: string;
  readonly history: ReadonlyArray<ACPMessage>;
  readonly stateSnapshot: Record<string, unknown>;
  readonly createdAt: string;
}

interface SessionResumeRequest {
  readonly sessionId: string;
  readonly checkpointId: string;
  readonly verifyHash: boolean;
}

interface SessionForkRequest {
  readonly sourceSessionId: string;
  readonly checkpointId: string;
  readonly newSessionId: string;
}
```

> **Integrity (INV-SF-42):** Checkpoint `stateHash` is computed as SHA-256 over the serialized state. On resume, the hash MUST be re-computed and compared. A mismatch raises `SessionResumeError`.

---

## MCP Proxy Config

Configuration for the MCP proxy that routes stdio agent requests to backend MCP servers. See [ADR-023](../decisions/ADR-023-session-resilience-mcp-integration.md).

```typescript
interface McpProxyConfig {
  readonly backends: ReadonlyArray<McpProxyBackendConfig>;
  readonly healthCheckIntervalMs: number;
  readonly timeoutMs: number;
}

interface McpProxyBackendConfig {
  readonly name: string;
  readonly transport: "stdio" | "http" | "sse";
  readonly command?: string;
  readonly args?: ReadonlyArray<string>;
  readonly url?: string;
  readonly env?: Record<string, string>;
}
```
