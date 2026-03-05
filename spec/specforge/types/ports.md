---
id: TYPE-SF-016
kind: types
title: "Port & Adapter Types"
status: active
domain: ports
behaviors: []
adrs: [ADR-001, ADR-018, ADR-019, ADR-020, ADR-021, ADR-022, ADR-023, ADR-024]
---

# Port & Adapter Types

- [architecture/ports-and-adapters.md](../architecture/ports-and-adapters.md) -- full port registry with adapter mapping
- [behaviors/BEH-SF-095-deployment-modes.md](../behaviors/BEH-SF-095-deployment-modes.md) -- mode switching behavioral contracts
- [types/errors.md](./errors.md) -- `PortNotBoundError`, `AdapterInstantiationError`
- [decisions/ADR-001-hexdi-as-di-foundation.md](../decisions/ADR-001-hexdi-as-di-foundation.md) -- hex-di port API decision

---

## Shared Utility Types

```typescript
type Unsubscribe = () => void;
```

> **Note:** `Unsubscribe` was originally defined in [types/blackboard.md](./blackboard.md) (superseded by [types/acp.md](./acp.md)). It is used by `EventBusService.subscribe()` and `MessageExchangeService.subscribe()`.

---

## Deployment Mode

```typescript
type DeploymentMode = "solo" | "saas";
```

---

## Port Definition

```typescript
interface PortDefinition<TService> {
  readonly name: string;
  readonly direction: "inbound" | "outbound" | "internal";
  readonly category: string;
  readonly tags?: ReadonlyArray<string>;
  readonly description?: string;
}
```

---

## Port Metadata

Runtime metadata associated with a registered port.

```typescript
interface PortMetadata {
  readonly name: string;
  readonly direction: "inbound" | "outbound" | "internal";
  readonly category: string;
  readonly tags: ReadonlyArray<string>;
  readonly modeSwitched: boolean;
}
```

---

## Adapter Factory

```typescript
interface AdapterFactory<TService> {
  readonly create: (config: AdapterConfig) => TService;
  readonly name: string;
  readonly description?: string;
}
```

---

## Adapter Configuration

```typescript
interface AdapterConfig {
  readonly mode: DeploymentMode;
  readonly env: Record<string, string | undefined>;
}
```

---

## Mode Adapter Map

Maps each deployment mode to its adapter factory. Used for mode-switched ports.

```typescript
interface ModeAdapterMap<TService> {
  readonly solo: AdapterFactory<TService>;
  readonly saas: AdapterFactory<TService>;
}
```

---

## Adapter Selection

Configuration for a mode-switched port: the port definition plus adapter mapping per mode.

```typescript
interface AdapterSelection<TService> {
  readonly port: PortDefinition<TService>;
  readonly adapters: ModeAdapterMap<TService>;
}
```

---

## Port Registry

Central registry mapping port names to their adapter factories. All ports must be bound before the application starts.

```typescript
interface PortRegistry {
  readonly register: <TService>(
    port: PortDefinition<TService>,
    factory: AdapterFactory<TService>
  ) => void;

  readonly registerModeSwitched: <TService>(
    selection: AdapterSelection<TService>,
    mode: DeploymentMode
  ) => void;

  readonly resolve: <TService>(port: PortDefinition<TService>) => TService;

  readonly isAllBound: () => boolean;

  readonly listPorts: () => ReadonlyArray<PortMetadata>;
}
```

---

## Port Binding Status

Used during startup validation to report unbound ports.

```typescript
// Reserved for adapter implementations
interface PortBindingStatus {
  readonly port: string;
  readonly bound: boolean;
  readonly adapterName?: string;
  readonly mode?: DeploymentMode;
}
```

---

## Port Classification

```typescript
// Reserved for adapter implementations
type PortClassification = "universal" | "mode-switched";

interface ClassifiedPort<
  TService,
  TClassification extends PortClassification = PortClassification,
> {
  readonly definition: PortDefinition<TService>;
  readonly classification: TClassification;
  readonly adapters: TClassification extends "mode-switched"
    ? ModeAdapterMap<TService>
    : AdapterFactory<TService>;
}
```

> **Note:** The `ClassifiedPort` type is parameterized over `TClassification` so that the conditional type resolves correctly. Without the generic parameter, `PortClassification extends "mode-switched"` always evaluates to the false branch because the union type is not narrowed.

---

## ACP Agent Port

ACP client-side port for creating and managing agent runs. Replaces `LLMProviderPort` (superseded by [ADR-018](../decisions/ADR-018-acp-agent-protocol.md)).

**Related:** [types/acp.md](./acp.md), [behaviors/BEH-SF-219-acp-client.md](../behaviors/BEH-SF-219-acp-client.md)

```typescript
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
```

---

## ACP Server Port

ACP server-side port for registering agents and managing the server lifecycle.

**Related:** [types/acp.md](./acp.md), [behaviors/BEH-SF-209-acp-server.md](../behaviors/BEH-SF-209-acp-server.md)

```typescript
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
```

> **Side pattern (ADR-019):** `ACPAgentService` and `ACPServerService` remain as separate port interfaces for hex-di registration. However, their message types derive from the shared `ACPSide` generic defined in [types/acp.md](./acp.md#side-pattern). `ACPAgentService` operates as `ACPSide = "client"` (receives `InboundMessage<"client">`, sends `OutboundMessage<"client">`). `ACPServerService` operates as `ACPSide = "server"`. This type-level relationship ensures message type consistency without merging the ports.

---

## Agent Backend Port

Execution engine behind ACP handlers. Claude Code CLI is the default implementation.

**Related:** [behaviors/BEH-SF-239-agent-backend.md](../behaviors/BEH-SF-239-agent-backend.md), [references/claude-code/](../references/claude-code/)

```typescript
interface AgentBackendService {
  readonly execute: (
    config: BackendExecutionConfig
  ) => ResultAsync<AsyncIterable<ACPMessage>, BackendError>;
  readonly getCapabilities: () => BackendCapabilities;
}
```

---

## Connection Manager Port

Manages agent subprocess connections independently from session state. Connections represent the live link to an agent backend; sessions represent conversation context. See [ADR-019](../decisions/ADR-019-zed-inspired-architecture.md).

**Related:** [types/acp.md](./acp.md#connections), [architecture/c3-acp-layer.md](../architecture/c3-acp-layer.md)

```typescript
interface ConnectionManagerService {
  readonly acquire: (
    config: AgentConnectionConfig
  ) => ResultAsync<AgentConnection, ConnectionError>;
  readonly release: (connectionId: string) => ResultAsync<void, ConnectionError>;
  readonly getConnection: (connectionId: string) => ResultAsync<AgentConnection, ConnectionError>;
  readonly listActive: () => ResultAsync<ReadonlyArray<AgentConnection>, never>;
  readonly healthCheck: (connectionId: string) => ResultAsync<boolean, ConnectionError>;
  readonly negotiate: (
    connectionId: string
  ) => ResultAsync<ProtocolHandshake, VersionNegotiationError>;
}
```

> **Cross-reference:** `AgentConnection` and `AgentConnectionConfig` are defined in [types/acp.md](./acp.md#connections). `ConnectionError` is defined in [types/errors.md](./errors.md).

---

## Agent Registry Port

Unified agent role resolution across all sources: built-in roles, dynamic templates, and marketplace agents. All sources produce `ACPAgentManifest` entries. See [ADR-019](../decisions/ADR-019-zed-inspired-architecture.md).

**Related:** [types/acp.md](./acp.md#agent-manifest), [architecture/c3-acp-layer.md](../architecture/c3-acp-layer.md)

```typescript
interface AgentRegistryService {
  readonly resolve: (roleId: string) => ResultAsync<ACPAgentManifest, AgentNotFoundError>;
  readonly list: (
    filter?: AgentRegistryFilter
  ) => ResultAsync<ReadonlyArray<ACPAgentManifest>, never>;
  readonly register: (manifest: ACPAgentManifest) => ResultAsync<void, AgentRegistryError>;
  readonly unregister: (roleId: string) => ResultAsync<void, AgentRegistryError>;
  readonly addSource: (config: RegistrySourceConfig) => ResultAsync<void, RegistrySourceError>;
  readonly refreshSource: (sourceType: string) => ResultAsync<void, RegistrySourceError>;
  readonly validateManifest: (
    manifest: AgentManifestSchema
  ) => ResultAsync<void, ManifestValidationError>;
}

interface AgentRegistryFilter {
  readonly source?: "builtin" | "template" | "marketplace";
  readonly convergenceContribution?: "primary" | "secondary" | "observer";
}
```

> **Cross-reference:** `ACPAgentManifest` is defined in [types/acp.md](./acp.md#agent-manifest). `AgentNotFoundError` and `AgentRegistryError` are defined in [types/errors.md](./errors.md).

---

## Message Exchange Port

Replaces the former `BlackboardPort` for inter-agent communication via ACP messages.

**Related:** [behaviors/BEH-SF-229-acp-messaging.md](../behaviors/BEH-SF-229-acp-messaging.md)

```typescript
interface MessageExchangeService {
  readonly postMessage: (sessionId: string, message: ACPMessage) => ResultAsync<void, ACPError>;
  readonly postDocument: (
    sessionId: string,
    document: ACPMessagePart
  ) => ResultAsync<void, ACPError>;
  readonly postFinding: (sessionId: string, finding: ACPMessage) => ResultAsync<void, ACPError>;
  readonly getHistory: (
    sessionId: string,
    since?: string
  ) => ResultAsync<ReadonlyArray<ACPMessage>, ACPError>;
  readonly getArtifacts: (
    sessionId: string,
    name?: string
  ) => ResultAsync<ReadonlyArray<ACPMessagePart>, ACPError>;
  readonly subscribe: (sessionId: string, callback: (update: FlowUpdate) => void) => Unsubscribe;
  readonly streamUpdates: (sessionId: string) => ResultAsync<AsyncIterable<FlowUpdate>, ACPError>;
}
```

> **Change (ADR-019):** `subscribe` callback changed from `(message: ACPMessage) => void` to `(update: FlowUpdate) => void`. Added `streamUpdates` for async iteration. `FlowUpdate` is defined in [types/acp.md](./acp.md#flowupdate). The `MessageTranslator` component translates raw `ACPMessage` objects into `FlowUpdate` variants before delivery to subscribers.

---

## ACP Run Handle

Client-side handle for managing an active run. Authoritative definition in [types/acp.md](./acp.md#run-handle).

> **Cross-reference:** Canonical definition of `ACPRunHandle` is in [types/acp.md](./acp.md). Referenced here for port method signatures. Do not duplicate the definition.

> **Note (M37):** `ACPRunHandle` replaces the former `AgentHandle`. See [ADR-018](../decisions/ADR-018-acp-agent-protocol.md).

---

## Claude Code Backend Types

Types specific to the `ClaudeCodeBackend` — the default implementation of `AgentBackendService` that wraps the Claude Agent SDK CLI (`claude -p`).

**Related:** [behaviors/BEH-SF-239-agent-backend.md](../behaviors/BEH-SF-239-agent-backend.md), [references/claude-code/](../references/claude-code/)

```typescript
interface ClaudeCodeBackendConfig {
  readonly model: ModelSelection;
  readonly maxBudgetUsd?: number;
  readonly permissionMode: "dontAsk" | "bypassPermissions";
  readonly settingsOverrides?: Partial<ClaudeCodeSettings>;
  readonly workingDirectory: string;
  readonly additionalDirectories?: ReadonlyArray<string>;
}

interface ClaudeCodeSettings {
  readonly model: string;
  readonly permissions: {
    readonly allow: ReadonlyArray<string>;
    readonly deny: ReadonlyArray<string>;
  };
  readonly hooks: Record<string, ReadonlyArray<HookDefinition>>;
  readonly env: Record<string, string>;
}

interface HookDefinition {
  readonly matcher?: string;
  readonly type: "command";
  readonly command: string;
}

// Reserved for adapter implementations
interface StreamMessage {
  readonly type: "text" | "tool_use" | "tool_result" | "system" | "error";
  readonly content: string;
  readonly tokenUsage?: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  };
}

// Used by ClaudeBackendAdapter implementation.
// See behaviors/BEH-SF-239-agent-backend.md
interface ClaudeBackendSpawnConfig {
  readonly role: AgentRole;
  readonly systemPrompt: string;
  readonly allowedTools: ReadonlyArray<string>;
  readonly disallowedTools?: ReadonlyArray<string>;
  readonly model: ModelSelection;
  readonly maxTurns?: number;
  readonly hooks?: Record<string, ReadonlyArray<HookDefinition>>;
  readonly mcpServers?: Record<string, McpSpawnConfig>;
  readonly appendSystemPrompt?: string;
  readonly maxTokens?: number;
}

interface McpSpawnConfig {
  readonly command: string;
  readonly args?: ReadonlyArray<string>;
  readonly env?: Record<string, string>;
}
```

> **Note (M36):** This is the minimal spawn configuration used by `ClaudeBackendSpawnConfig`. The full `McpServerConfig` with health checks, server IDs, and required tools is defined in [types/mcp.md](./mcp.md). The two types serve different purposes: `McpSpawnConfig` is for launching a server process; `McpServerConfig` is for the MCP composition registry.

> **Note (M85):** `ClaudeBackendSpawnConfig` is used by the `ClaudeBackendAdapter` implementation. See [behaviors/BEH-SF-239-agent-backend.md](../behaviors/BEH-SF-239-agent-backend.md).

---

## Flow Ports

Service interfaces for flow orchestration, scheduling, and convergence evaluation.

**Related:** [behaviors/BEH-SF-057-flow-execution.md](../behaviors/BEH-SF-057-flow-execution.md), [behaviors/BEH-SF-065-flow-lifecycle.md](../behaviors/BEH-SF-065-flow-lifecycle.md)

```typescript
interface OrchestratorService {
  readonly startFlow: (
    flowName: string,
    config?: FlowConfig
  ) => ResultAsync<FlowRun, OrchestratorError>;
  readonly pauseFlow: (flowRunId: string) => ResultAsync<void, OrchestratorError>;
  readonly resumeFlow: (flowRunId: string) => ResultAsync<FlowRun, OrchestratorError>;
  readonly cancelFlow: (flowRunId: string) => ResultAsync<void, OrchestratorError>;
  readonly getFlowRun: (flowRunId: string) => ResultAsync<FlowRun, OrchestratorError>;
}

interface SchedulerService {
  readonly getNextPhase: (flowRunId: string) => ResultAsync<PhaseDefinition, OrchestratorError>;
  readonly getPhaseOrder: (
    flowName: string
  ) => ResultAsync<ReadonlyArray<PhaseDefinition>, OrchestratorError>;
  readonly isComplete: (flowRunId: string) => ResultAsync<boolean, OrchestratorError>;
}

interface ConvergenceService {
  readonly evaluate: (
    flowRunId: string,
    phaseName: string
  ) => ResultAsync<ConvergenceResult, OrchestratorError>;
  readonly getMetrics: (
    flowRunId: string,
    phaseName: string
  ) => ResultAsync<ConvergenceMetrics, OrchestratorError>;
}
```

---

## Session Ports

Service interface for session context composition.

**Related:** [behaviors/BEH-SF-025-agent-sessions.md](../behaviors/BEH-SF-025-agent-sessions.md)

```typescript
interface CompositionService {
  readonly compose: (
    sessionId: string,
    config: CompositionConfig
  ) => ResultAsync<ComposedContext, SessionError>;
  readonly getComposedContext: (sessionId: string) => ResultAsync<ComposedContext, SessionError>;
}
```

> **Inter-port dependency (M24):** `CompositionPort` depends on `GraphQueryPort` (for context retrieval) and `MessageExchangePort` (for session history). These dependencies are injected at adapter construction time.

```typescript

```

---

## Graph Ports

Service interfaces for read and write operations on the knowledge graph.

**Related:** [behaviors/BEH-SF-001-graph-operations.md](../behaviors/BEH-SF-001-graph-operations.md)

```typescript
interface GraphQueryService {
  readonly query: (
    cypher: string,
    params?: Record<string, string | number | boolean | null>
  ) => ResultAsync<ReadonlyArray<Record<string, unknown>>, GraphQueryError>;
  readonly traverse: (
    startNodeId: string,
    depth: number
  ) => ResultAsync<ReadonlyArray<GraphNode>, GraphQueryError>;
  readonly findNodes: (
    label: string,
    filters?: Record<string, unknown>
  ) => ResultAsync<ReadonlyArray<GraphNode>, GraphQueryError>;
  readonly impactAnalysis: (
    nodeId: string,
    depth?: number
  ) => ResultAsync<ImpactAnalysisResult, GraphQueryError>;
  readonly orphans: (label?: string) => ResultAsync<OrphanDetectionResult, GraphQueryError>;
  readonly crossProjectDependencies: (
    projectId: string
  ) => ResultAsync<CrossProjectDepsResult, GraphQueryError>;
}

interface GraphMutationService {
  readonly createNode: (
    label: string,
    properties: Record<string, unknown>
  ) => ResultAsync<GraphNode, GraphTransactionError>;
  readonly createEdge: (
    fromId: string,
    toId: string,
    type: string,
    properties?: Record<string, unknown>
  ) => ResultAsync<GraphEdge, GraphTransactionError>;
  readonly updateNode: (
    nodeId: string,
    properties: Record<string, unknown>
  ) => ResultAsync<GraphNode, GraphTransactionError>;
  readonly deleteNode: (nodeId: string) => ResultAsync<void, GraphTransactionError>;
}
```

---

## NLQ and Analytics Ports

Service interfaces for natural language queries and analytics.

**Related:** [behaviors/BEH-SF-001-graph-operations.md](../behaviors/BEH-SF-001-graph-operations.md) (graph query behaviors), [behaviors/BEH-SF-065-flow-lifecycle.md](../behaviors/BEH-SF-065-flow-lifecycle.md) (flow metrics)

> **Note:** NLQ and Analytics do not have dedicated behavior files. Their behavioral contracts are covered by graph query behaviors (BEH-SF-001–015) and flow lifecycle behaviors (BEH-SF-060–075).

> **Behavioral coverage:** NLQ behaviors are specified in [behaviors/BEH-SF-001-graph-operations.md](../behaviors/BEH-SF-001-graph-operations.md) (BEH-SF-359–361).

```typescript
interface NLQService {
  readonly translateQuery: (naturalLanguage: string) => ResultAsync<string, GraphQueryError>;
  readonly execute: (
    naturalLanguage: string
  ) => ResultAsync<ReadonlyArray<Record<string, unknown>>, GraphQueryError>;
}

interface AnalyticsService {
  readonly getFlowMetrics: (flowRunId: string) => ResultAsync<FlowMetrics, OrchestratorError>;
  readonly getQualityTrends: (projectId: string) => ResultAsync<QualityTrends, GraphQueryError>;
  readonly getCostReport: (flowRunId: string) => ResultAsync<CostReport, OrchestratorError>;
}
```

> **Behavioral coverage:** Analytics behaviors are specified in [behaviors/BEH-SF-057-flow-execution.md](../behaviors/BEH-SF-057-flow-execution.md) (BEH-SF-334–336).

---

## Infrastructure Ports

Service interfaces for cross-cutting infrastructure concerns.

```typescript
interface EventBusService {
  readonly publish: (event: OrchestratorEvent) => ResultAsync<void, never>;
  readonly subscribe: (
    eventTag: string,
    callback: (event: OrchestratorEvent) => void
  ) => Unsubscribe;
  readonly unsubscribe: (eventTag: string, callback: (event: OrchestratorEvent) => void) => void;
}
```

> **Cross-reference (C41):** `OrchestratorEvent` is defined in [types/extensibility.md](./extensibility.md#orchestrator-events). `EventBusService` and `OrchestratorEventService` consume this type.

> **Cross-module dependency note:** `OrchestratorEvent` is canonically defined in [types/extensibility.md](./extensibility.md#orchestrator-events) and re-exported by reference here in `types/ports.md`. At implementation time, this type should live in a shared `types/events.ts` module to avoid circular imports between port and extensibility modules.

```typescript
interface LoggerService {
  readonly info: (message: string, context?: Record<string, unknown>) => void;
  readonly warn: (message: string, context?: Record<string, unknown>) => void;
  readonly error: (message: string, context?: Record<string, unknown>) => void;
  readonly debug: (message: string, context?: Record<string, unknown>) => void;
}

interface ConfigService {
  readonly get: <T>(key: string) => ResultAsync<T, ConfigError>;
  readonly getAll: () => ResultAsync<Record<string, unknown>, ConfigError>;
  readonly validate: () => ResultAsync<void, ConfigError>;
}

interface CacheService {
  readonly get: <T>(key: string) => ResultAsync<T | undefined, CacheError>;
  readonly set: <T>(key: string, value: T, ttlMs?: number) => ResultAsync<void, CacheError>;
  readonly invalidate: (key: string) => ResultAsync<void, CacheError>;
}
```

> **Error channel (M26):** `CacheService` uses `CacheError` (not `never`) because cache backends (Redis, filesystem) can fail. `CacheError` should be defined in [types/errors.md](./errors.md) as `{ _tag: "CacheError", key: string, cause: unknown }`.

```typescript
interface FileSystemService {
  readonly readFile: (path: string) => ResultAsync<string, FileAccessError>;
  readonly writeFile: (path: string, content: string) => ResultAsync<void, FileAccessError>;
  readonly listDirectory: (path: string) => ResultAsync<ReadonlyArray<string>, FileAccessError>;
}

interface ValidationService {
  readonly validate: <T>(
    data: unknown,
    schema: SchemaDefinition
  ) => ResultAsync<T, FlowValidationError>;
}

interface MetricsService {
  readonly record: (metric: MetricEntry) => ResultAsync<void, never>;
  readonly getMetrics: (filter?: MetricFilter) => ResultAsync<ReadonlyArray<MetricEntry>, never>;
}

interface HealthCheckService {
  readonly liveness: () => ResultAsync<HealthStatus, never>;
  readonly readiness: () => ResultAsync<HealthStatus, never>;
}
```

> **Disambiguation (N21):** `HealthStatus` (used by `HealthCheckService`) reports overall system health (liveness/readiness). `McpServerStatus` (in [types/mcp.md](./mcp.md)) reports the connectivity status of individual MCP tool servers. They are distinct concerns at different granularity levels.

---

## Template and Serializer Ports

Service interfaces for flow templates and domain object serialization.

**Related:** [behaviors/BEH-SF-049-flow-definitions.md](../behaviors/BEH-SF-049-flow-definitions.md)

```typescript
interface TemplateService {
  readonly load: (templateName: string) => ResultAsync<FlowTemplate, FlowValidationError>;
  readonly validate: (template: FlowTemplate) => ResultAsync<void, FlowValidationError>;
  readonly instantiate: (
    templateName: string,
    overrides?: Partial<FlowConfig>
  ) => ResultAsync<FlowDefinition, FlowValidationError>;
  readonly validateCapabilities: (
    definition: FlowDefinition
  ) => ResultAsync<FlowValidationResult, FlowValidationError>;
}

interface SerializerService {
  readonly serialize: <T>(data: T) => ResultAsync<string, SpecStoreError>;
  readonly deserialize: <T>(raw: string) => ResultAsync<T, SpecStoreError>;
}
```

---

## Import and Export Ports

Service interfaces for pluggable import/export format adapters.

> **Note (C15):** The authoritative service interface definitions for `ImportAdapterService` and `ExportAdapterService` are in [types/import-export.md](./import-export.md). The interfaces there use the domain-specific `ImportInput`/`ExportData` request types and `ImportError`/`ExportError` error types. The simplified signatures below are retained for quick reference but **import-export.md takes precedence** if there is any conflict.

**Related:** [types/import-export.md](./import-export.md) (authoritative), [behaviors/BEH-SF-127-import-export.md](../behaviors/BEH-SF-127-import-export.md)

```typescript
// Authoritative definition in types/import-export.md
interface ImportAdapterService {
  readonly parse: (input: ImportInput) => ResultAsync<ImportResult, ImportError>;
  readonly supports: (format: string) => boolean;
  readonly name: string;
}

// Authoritative definition in types/import-export.md
interface ExportAdapterService {
  readonly render: (data: ExportData) => ResultAsync<ExportResult, ExportError>;
  readonly supports: (format: string) => boolean;
  readonly name: string;
}
```

---

## Session Manager Port

Agent session lifecycle management: spawn, pause, resume, cancel, snapshot.

> **Direction rationale:** Classified as `internal` because it orchestrates agent subprocess lifecycles on behalf of the flow engine. Although it wraps outbound subprocess operations, the port itself is consumed only by internal orchestration components, not by external clients.

**Related:** [behaviors/BEH-SF-025-agent-sessions.md](../behaviors/BEH-SF-025-agent-sessions.md)

```typescript
interface SessionManagerService {
  readonly createSession: (
    role: string,
    config: Record<string, unknown>
  ) => ResultAsync<string, SessionError>;
  readonly pauseSession: (sessionId: string) => ResultAsync<void, SessionError>;
  readonly resumeSession: (sessionId: string) => ResultAsync<void, SessionError>;
  readonly cancelSession: (sessionId: string) => ResultAsync<void, SessionError>;
  readonly getSnapshot: (sessionId: string) => ResultAsync<Record<string, unknown>, SnapshotError>;
}
```

---

## Flow Engine Port

Phase scheduling and flow lifecycle management.

> **Direction (M20):** Classified as `inbound` — the flow engine accepts commands from the orchestrator to execute phases and register flow definitions. Reclassified from `internal` to `inbound` because it processes incoming execution requests.

**Related:** [behaviors/BEH-SF-057-flow-execution.md](../behaviors/BEH-SF-057-flow-execution.md)

```typescript
interface FlowEngineService {
  readonly executePhase: (
    flowRunId: string,
    phaseName: string
  ) => ResultAsync<PhaseResult, OrchestratorError>;
  readonly registerFlow: (definition: FlowDefinition) => ResultAsync<void, FlowValidationError>;
  readonly listFlows: () => ResultAsync<ReadonlyArray<FlowSummary>, never>;
}
```

---

## Graph Store Port

Connection management and transaction support for the graph database. Mode-switched: LocalNeo4j (solo) vs CloudNeo4j (SaaS).

> **Direction (N10):** `outbound` — writes to the external Neo4j database.

**Related:** [behaviors/BEH-SF-001-graph-operations.md](../behaviors/BEH-SF-001-graph-operations.md), [architecture/ports-and-adapters.md](../architecture/ports-and-adapters.md) (Mode-Switched Ports)

```typescript
interface GraphStoreService {
  readonly connect: (config: Neo4jConfig) => ResultAsync<void, GraphConnectionError>;
  readonly disconnect: () => ResultAsync<void, never>;
  readonly withTransaction: <T>(
    fn: () => ResultAsync<T, GraphTransactionError>
  ) => ResultAsync<T, GraphTransactionError>;
  readonly healthCheck: () => ResultAsync<HealthCheck, never>;
  readonly persistSessionMeta: (
    sessionId: string,
    metadata: Record<string, unknown>
  ) => ResultAsync<void, GraphTransactionError>;
}
```

> **Behavioral reference (M22):** `persistSessionMeta` is invoked by the session lifecycle pipeline at session creation and completion. See [behaviors/BEH-SF-025-agent-sessions.md](../behaviors/BEH-SF-025-agent-sessions.md).

---

## Graph Sync Port

Projects ACP messages and session artifacts into the knowledge graph. Subscribes to ACP message events via `EventBusPort` and translates to graph mutations.

**Related:** [behaviors/BEH-SF-001-graph-operations.md](../behaviors/BEH-SF-001-graph-operations.md), [architecture/c3-knowledge-graph.md](../architecture/c3-knowledge-graph.md)

```typescript
interface GraphSyncService {
  readonly syncMessage: (
    sessionId: string,
    message: ACPMessage
  ) => ResultAsync<GraphSyncReport, GraphTransactionError>;
  readonly syncArtifacts: (
    sessionId: string
  ) => ResultAsync<GraphSyncReport, GraphTransactionError>;
  readonly fullRebuild: (sessionId: string) => ResultAsync<GraphSyncReport, GraphTransactionError>;
}
```

> **Behavioral reference (M23):** `syncMessage` processes individual ACP messages into graph nodes/edges. `syncArtifacts` batch-processes all artifacts for a session. `fullRebuild` replays all events from scratch, used after `GraphBufferOverflowError`. See [behaviors/BEH-SF-001-graph-operations.md](../behaviors/BEH-SF-001-graph-operations.md).

---

## Auth Port

Authentication and authorization. Mode-switched: NoOpAuth (solo) vs CloudOAuth (SaaS).

**Related:** [behaviors/BEH-SF-101-authentication.md](../behaviors/BEH-SF-101-authentication.md)

```typescript
interface AuthService {
  readonly authenticate: (token: string) => ResultAsync<AuthIdentity, AuthError>;
  readonly authorize: (
    identity: AuthIdentity,
    action: string,
    resource: string
  ) => ResultAsync<boolean, AuthError>;
}
```

> `AuthIdentity` is defined in [types/auth.md](./auth.md).

---

## Billing Port

Subscription and usage tracking. Mode-switched: NoOpBilling (solo) vs StripeBilling (SaaS).

**Related:** [behaviors/BEH-SF-107-cloud-services.md](../behaviors/BEH-SF-107-cloud-services.md)

```typescript
interface BillingService {
  readonly checkSubscription: (orgId: string) => ResultAsync<SubscriptionStatus, BillingError>;
  readonly recordUsage: (orgId: string, usage: TokenUsage) => ResultAsync<void, BillingError>;
}
```

> `SubscriptionStatus` is defined in [types/cloud.md](./cloud.md).

---

## Telemetry Port

Anonymous usage telemetry. Mode-switched: NoOpTelemetry (solo) vs CloudTelemetry (SaaS).

**Related:** [behaviors/BEH-SF-107-cloud-services.md](../behaviors/BEH-SF-107-cloud-services.md), [architecture/ports-and-adapters.md](../architecture/ports-and-adapters.md) (Mode-Switched Ports)

```typescript
interface TelemetryService {
  readonly track: (event: string, properties?: Record<string, unknown>) => ResultAsync<void, never>;
  readonly flush: () => ResultAsync<void, never>;
}
```

---

## Marketplace Port

Template marketplace. Mode-switched: LocalFiles (solo) vs CloudMarketplace (SaaS).

**Related:** [behaviors/BEH-SF-107-cloud-services.md](../behaviors/BEH-SF-107-cloud-services.md)

```typescript
interface MarketplaceService {
  readonly listTemplates: (
    filter?: Record<string, unknown>
  ) => ResultAsync<ReadonlyArray<FlowTemplate>, CloudApiError>;
  readonly getTemplate: (templateName: string) => ResultAsync<FlowTemplate, CloudApiError>;
  readonly publishTemplate: (template: FlowTemplate) => ResultAsync<void, CloudApiError>;
}
```

---

## Tool Registry Port

Resolves permitted tools for a given agent role.

> **Note:** Budget-checking methods (`checkBudget`, `checkPhaseBudget`) are intentionally **not** on this port. Budget enforcement is handled by the cost optimization subsystem via `EventBusPort` budget-warning events. See [behaviors/BEH-SF-169-cost-optimization.md](../behaviors/BEH-SF-169-cost-optimization.md).

**Related:** [behaviors/BEH-SF-081-tool-isolation.md](../behaviors/BEH-SF-081-tool-isolation.md)

```typescript
interface ToolRegistryService {
  readonly getToolsForRole: (role: string) => ResultAsync<ReadonlyArray<string>, ToolRegistryError>;
  readonly registerTools: (
    role: string,
    tools: ReadonlyArray<string>
  ) => ResultAsync<void, ToolRegistryError>;
}
```

---

## Session Snapshot Store Port

Persistence for session snapshots.

**Related:** [behaviors/BEH-SF-025-agent-sessions.md](../behaviors/BEH-SF-025-agent-sessions.md)

```typescript
interface SessionSnapshotStoreService {
  readonly save: (
    sessionId: string,
    snapshot: Record<string, unknown>
  ) => ResultAsync<void, SnapshotError>;
  readonly load: (sessionId: string) => ResultAsync<Record<string, unknown>, SnapshotError>;
  readonly delete: (sessionId: string) => ResultAsync<void, SnapshotError>;
}
```

---

## Test Runner Port

Executes test suites and returns results.

**Related:** [behaviors/BEH-SF-057-flow-execution.md](../behaviors/BEH-SF-057-flow-execution.md) (verification phase)

```typescript
interface TestRunnerService {
  readonly run: (config: {
    readonly testPaths: ReadonlyArray<string>;
    readonly timeout?: number;
  }) => ResultAsync<TestRunResult, TestRunnerError>;
  readonly getResults: (runId: string) => ResultAsync<TestRunResult, TestRunnerError>;
}
```

> `TestRunResult` is defined in [types/agent.md](./agent.md).

---

## Orchestrator Event Port

Publication and subscription for orchestrator lifecycle events. This is the typed wrapper around `EventBusPort` specific to `OrchestratorEvent` variants.

> **Clarification (N14):** `EventBusService` is the generic infrastructure port for all event pub/sub. `OrchestratorEventService` is a domain-specific convenience interface that constrains event types to `OrchestratorEvent` variants. Both are registered as separate ports; `OrchestratorEventService` delegates to `EventBusService` internally.

**Related:** [types/extensibility.md](./extensibility.md), [behaviors/BEH-SF-087-extensibility.md](../behaviors/BEH-SF-087-extensibility.md)

```typescript
interface OrchestratorEventService {
  readonly publish: (event: OrchestratorEvent) => ResultAsync<void, never>;
  readonly subscribe: (
    eventTag: string,
    callback: (event: OrchestratorEvent) => void
  ) => Unsubscribe;
}
```

---

## LoggerService Design Note

> **N09:** `LoggerService` methods intentionally return `void` rather than `ResultAsync`. Logging is fire-and-forget by design -- a logging failure must never propagate to callers or disrupt flow execution. Adapter implementations should handle logging failures silently (e.g., write to stderr as fallback).

---

## ResultAsync Dependency Note

> All port service interfaces use `ResultAsync<T, E>` from the [neverthrow](https://github.com/supermacro/neverthrow) library. This is the standard result type for asynchronous, error-typed operations throughout SpecForge. See [ADR-001](../decisions/ADR-001-hexdi-as-di-foundation.md) for rationale.

---

## MCP Proxy Port

Exposes MCP tool servers to agents via stdio-to-backend routing. The proxy manages backend lifecycle, health checks, and transport adaptation across stdio, HTTP, and SSE backends.

> **Direction:** `outbound` — communicates with external MCP backend processes.

**Related:** [behaviors/BEH-SF-520-session-resilience.md](../behaviors/BEH-SF-520-session-resilience.md), [ADR-023](../decisions/ADR-023-session-resilience-mcp-integration.md)

```typescript
interface McpProxyService {
  readonly start: (config: McpProxyConfig) => ResultAsync<void, McpProxyError>;
  readonly stop: () => ResultAsync<void, McpProxyError>;
  readonly addBackend: (backend: McpProxyBackendConfig) => ResultAsync<void, McpProxyError>;
  readonly removeBackend: (name: string) => ResultAsync<void, McpProxyError>;
  readonly healthCheck: (name: string) => ResultAsync<boolean, McpProxyTransportError>;
  readonly listBackends: () => ResultAsync<ReadonlyArray<McpProxyBackendConfig>, never>;
}
```

> **Cross-reference:** `McpProxyConfig` and `McpProxyBackendConfig` are defined in [types/acp.md](./acp.md#mcp-proxy-config). `McpProxyError` and `McpProxyTransportError` are defined in [types/errors.md](./errors.md).

---

## Permission Policy Port

Evaluates permission policies independently from the ACP protocol layer. Supports deny-by-default, priority-based resolution, and audit trail recording. Compatible with `@hex-di/guard` policy formats.

> **Direction:** `internal` — consumed by orchestration components for permission evaluation. Decoupled from ACP to enable use outside the protocol layer.

**Related:** [behaviors/BEH-SF-528-permission-policy.md](../behaviors/BEH-SF-528-permission-policy.md), [ADR-024](../decisions/ADR-024-permission-policy-architecture.md)

```typescript
interface PermissionPolicyService {
  readonly loadPolicies: (
    policies: ReadonlyArray<PermissionPolicyRule>
  ) => ResultAsync<void, PermissionPolicyError>;
  readonly evaluate: (
    subject: string,
    action: string,
    resource: string
  ) => ResultAsync<PermissionDecision, PermissionPolicyError>;
  readonly reload: () => ResultAsync<void, PermissionPolicyError>;
  readonly listPolicies: () => ResultAsync<ReadonlyArray<PermissionPolicyRule>, never>;
  readonly getAuditTrail: (since?: string) => ResultAsync<ReadonlyArray<PermissionDecision>, never>;
}

interface PermissionPolicyRule {
  readonly id: string;
  readonly priority: number;
  readonly effect: "allow" | "deny";
  readonly subject: string;
  readonly action: string;
  readonly resource: string;
  readonly conditions?: ReadonlyArray<PolicyCondition>;
}

interface PolicyCondition {
  readonly field: string;
  readonly operator: "eq" | "neq" | "in" | "not_in" | "matches";
  readonly value: unknown;
}

interface PermissionDecision {
  readonly allowed: boolean;
  readonly matchedRuleId: string | undefined;
  readonly evaluatedAt: string;
  readonly subject: string;
  readonly action: string;
  readonly resource: string;
}
```

> **Guard compatibility (ADR-024):** `PermissionPolicyRule` is designed to be compatible with `@hex-di/guard` policy formats. The `conditions` array maps to guard attribute checks. See [ADR-024](../decisions/ADR-024-permission-policy-architecture.md).
