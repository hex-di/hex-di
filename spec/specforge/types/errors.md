---
id: TYPE-SF-008
kind: types
title: All Error Types
status: active
domain: errors
behaviors: []
adrs: [ADR-018, ADR-019, ADR-020, ADR-021, ADR-022, ADR-023, ADR-024]
---

# All Error Types

- [types/graph.md](./graph.md) -- `GraphNode`, `GraphEdge` referenced by graph errors
- [types/agent.md](./agent.md) -- `AgentRole`, session types referenced by agent errors
- [types/flow.md](./flow.md) -- `FlowDefinition`, `PhaseDefinition`, `FlowRun` referenced by flow errors
- [types/auth.md](./auth.md) -- `AuthIdentity` referenced by cloud errors
- [types/extensibility.md](./extensibility.md) -- `PhaseHook` referenced by hook errors
- [types/acp.md](./acp.md) -- `ACPRun`, `ACPMessage`, `ACPRunState` referenced by ACP and backend errors
- [types/import-export.md](./import-export.md) -- `ImportInput`, `ExportData` referenced by import/export errors
- [types/ports.md](./ports.md) -- `ConfigService`, `ValidationService`, `HealthCheckService` referenced by infrastructure errors

All error types are frozen (`Object.freeze()`) and use `_tag` discriminants for pattern matching.

> **Convention:** All timeout durations use the field name `timeoutMs` (milliseconds). All elapsed durations use `elapsedMs`.

---

## Graph Errors

Source: 01-knowledge-graph.md

**Referenced by:** `GraphQueryService`, `GraphMutationService`, `GraphStoreService`, `GraphSyncService` in [types/ports.md](./ports.md)

| Error Type                    | `_tag`                          | Cause                                                | Fields                                              |
| ----------------------------- | ------------------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| `GraphConnectionError`        | `"GraphConnectionError"`        | Connection refused, auth failure, timeout            | `uri`, `cause`                                      |
| `GraphQuerySyntaxError`       | `"GraphQuerySyntaxError"`       | Invalid Cypher syntax or unsupported query construct | `query`, `cause`                                    |
| `GraphQueryNotFoundError`     | `"GraphQueryNotFoundError"`     | Query returned no matching nodes                     | `query`                                             |
| `GraphQueryTimeoutError`      | `"GraphQueryTimeoutError"`      | Query exceeded execution time limit                  | `query`, `timeoutMs`, `elapsedMs`                   |
| `GraphTransactionError`       | `"GraphTransactionError"`       | Constraint violation, deadlock, write failure        | `operationCount`, `cause`                           |
| `GraphSyncConflictError`      | `"GraphSyncConflictError"`      | Version mismatch, concurrent write, schema drift     | `nodeId`, `cause`                                   |
| `GraphUnavailableError`       | `"GraphUnavailableError"`       | Neo4j down, graceful degradation active              | `cause`                                             |
| `GraphSyncReplayError`        | `"GraphSyncReplayError"`        | Replay sync event content hash mismatch              | `expectedHash`, `actualHash`, `nodeId`, `retryable` |
| `GraphBufferOverflowError`    | `"GraphBufferOverflowError"`    | Event buffer capacity exceeded                       | `bufferCapacity`, `pendingEvents`, `retryable`      |
| `BlastRadiusComputationError` | `"BlastRadiusComputationError"` | Blast radius computation failed                      | `cause`                                             |

`GraphQueryError` is a discriminated union of `GraphQuerySyntaxError | GraphQueryNotFoundError | GraphQueryTimeoutError | BlastRadiusComputationError`. `GraphUnavailableError` is raised by the graceful degradation layer and surfaced to callers via the infrastructure adapter, not directly by port methods.

```typescript
interface GraphConnectionError {
  readonly _tag: "GraphConnectionError";
  readonly uri: string;
  readonly cause: unknown;
}

interface GraphQuerySyntaxError {
  readonly _tag: "GraphQuerySyntaxError";
  readonly query: string;
  readonly cause: unknown;
}

interface GraphQueryNotFoundError {
  readonly _tag: "GraphQueryNotFoundError";
  readonly query: string;
}

interface GraphQueryTimeoutError {
  readonly _tag: "GraphQueryTimeoutError";
  readonly query: string;
  readonly timeoutMs: number;
  readonly elapsedMs: number;
}

type GraphQueryError =
  | GraphQuerySyntaxError
  | GraphQueryNotFoundError
  | GraphQueryTimeoutError
  | BlastRadiusComputationError;

interface GraphTransactionError {
  readonly _tag: "GraphTransactionError";
  readonly operationCount: number;
  readonly cause: unknown;
}

interface GraphSyncConflictError {
  readonly _tag: "GraphSyncConflictError";
  readonly nodeId: string;
  readonly cause: unknown;
}

interface GraphUnavailableError {
  readonly _tag: "GraphUnavailableError";
  readonly cause: unknown;
}

interface GraphSyncReplayError {
  readonly _tag: "GraphSyncReplayError";
  readonly expectedHash: string;
  readonly actualHash: string;
  readonly nodeId: string;
  readonly retryable: true;
}

interface GraphBufferOverflowError {
  readonly _tag: "GraphBufferOverflowError";
  readonly bufferCapacity: number;
  readonly pendingEvents: number;
  readonly retryable: false;
}

interface BlastRadiusComputationError {
  readonly _tag: "BlastRadiusComputationError";
  readonly cause: "graph-timeout" | "missing-nodes" | "circular-deps";
}
```

> **Note (C30):** `GraphSyncReplayError` occurs when replaying sync events and the content hash doesn't match. The operation is retryable because a full rebuild can resolve the inconsistency.

> **Note (C31):** `GraphBufferOverflowError` is not retryable. When the event buffer overflows, a full graph rebuild is triggered via `GraphSyncService.fullRebuild()`.

> **Severity (M39):** Graph sync conflicts have two resolution paths: (1) **Soft conflict** (content hash matches): logged as warning, sync skipped (idempotent). (2) **Hard conflict** (content hash mismatch): raised as `GraphSyncConflictError` through the error channel, triggering a full rebuild.

---

## Agent Errors

Source: 02-agents.md

**Referenced by:** `SessionManagerService`, `CompositionService` in [types/ports.md](./ports.md); [behaviors/BEH-SF-017-agent-roles.md](../behaviors/BEH-SF-017-agent-roles.md), [behaviors/BEH-SF-025-agent-sessions.md](../behaviors/BEH-SF-025-agent-sessions.md)

| Error Type                         | `_tag`                               | Cause                                                 | Fields                                          |
| ---------------------------------- | ------------------------------------ | ----------------------------------------------------- | ----------------------------------------------- |
| `AgentError`                       | `"AgentError"`                       | Agent execution failed                                | `agentId`, `role`, `cause`                      |
| `SessionError`                     | `"SessionError"`                     | Session lifecycle failure (create/pause/resume)       | `sessionId`, `cause`                            |
| `SessionNotFoundError`             | `"SessionNotFoundError"`             | Referenced session ID does not exist                  | `sessionId`                                     |
| `PromptLoaderError`                | `"PromptLoaderError"`                | Skill file not found or malformed                     | `role`, `cause`                                 |
| `ToolRegistryError`                | `"ToolRegistryError"`                | Unknown role or invalid tool set                      | `role`, `cause`                                 |
| `ConversationError`                | `"ConversationError"`                | Conversation lifecycle failure                        | `sessionId`, `cause`                            |
| `SnapshotError`                    | `"SnapshotError"`                    | Session snapshot persistence failure                  | `sessionId`, `cause`                            |
| `SkillResolverError`               | `"SkillResolverError"`               | Skill file not found or invalid                       | `role`, `skillName`, `cause`                    |
| `FileAccessError`                  | `"FileAccessError"`                  | File operation failed or access denied                | `path`, `expectedHash?`, `actualHash?`, `cause` |
| `CodeSearchError`                  | `"CodeSearchError"`                  | Search operation failed                               | `pattern`, `cause`                              |
| `TestRunnerError`                  | `"TestRunnerError"`                  | Test execution failed                                 | `config`, `cause`                               |
| `DevAgentError`                    | `"DevAgentError"`                    | Implementation task failed                            | `groupId`, `cause`                              |
| `ToolIsolationBypassError`         | `"ToolIsolationBypassError"`         | Agent attempted to use a tool outside its allowed set | `agentRole`, `attemptedTool`, `allowedTools`    |
| `DynamicRolePredicateTimeoutError` | `"DynamicRolePredicateTimeoutError"` | Dynamic role predicate evaluation timed out           | `roleId`, `predicateExpression`, `timeoutMs`    |

> **Note:** The former `BlackboardError` has been superseded by `ACPMessageTranslationError` (ACP Protocol Errors) for message exchange failures. See [ADR-018](../decisions/ADR-018-acp-agent-protocol.md).

```typescript
interface AgentError {
  readonly _tag: "AgentError";
  readonly agentId: string;
  readonly role: string;
  readonly cause: unknown;
}

interface SessionError {
  readonly _tag: "SessionError";
  readonly sessionId: string;
  readonly cause: unknown;
}

interface SessionNotFoundError {
  readonly _tag: "SessionNotFoundError";
  readonly sessionId: string;
}

interface PromptLoaderError {
  readonly _tag: "PromptLoaderError";
  readonly role: string;
  readonly cause: unknown;
}

interface ToolRegistryError {
  readonly _tag: "ToolRegistryError";
  readonly role: string;
  readonly cause: unknown;
}

interface ConversationError {
  readonly _tag: "ConversationError";
  readonly sessionId: string;
  readonly cause: unknown;
}

interface SnapshotError {
  readonly _tag: "SnapshotError";
  readonly sessionId: string;
  readonly cause: unknown;
}

interface SkillResolverError {
  readonly _tag: "SkillResolverError";
  readonly role: string;
  readonly skillName: string;
  readonly cause: unknown;
}

interface FileAccessError {
  readonly _tag: "FileAccessError";
  readonly path: string;
  readonly expectedHash?: string;
  readonly actualHash?: string;
  readonly cause: unknown;
}

interface CodeSearchError {
  readonly _tag: "CodeSearchError";
  readonly pattern: string;
  readonly cause: unknown;
}

interface TestRunnerError {
  readonly _tag: "TestRunnerError";
  readonly config: unknown;
  readonly cause: unknown;
}

interface DevAgentError {
  readonly _tag: "DevAgentError";
  readonly groupId: string;
  readonly cause: unknown;
}

interface ToolIsolationBypassError {
  readonly _tag: "ToolIsolationBypassError";
  readonly agentRole: string;
  readonly attemptedTool: string;
  readonly allowedTools: ReadonlyArray<string>;
}

interface DynamicRolePredicateTimeoutError {
  readonly _tag: "DynamicRolePredicateTimeoutError";
  readonly roleId: string;
  readonly predicateExpression: string;
  readonly timeoutMs: 5000;
}
```

---

## LLM Errors

Source: 02-agents.md

**Referenced by:** Agent backend execution pipelines. See disambiguation note below.

`LLMError` is a discriminated union: `RateLimitError | ContextOverflowError | NetworkError | BudgetExceededError`.

> **Disambiguation (LLMError vs BackendError):** `LLMError` covers **domain-level** LLM failures that occur _within_ an agent's execution context -- API rate limits, context window overflow, network failures to the LLM provider, and token budget exhaustion. These errors are transient and typically trigger automatic retry or graceful degradation strategies (exponential backoff, summarization, wrap-up). `BackendError` covers **infrastructure-level** failures in the agent backend process itself -- spawning failures, process timeouts, and malformed output. An agent backend implementation surfaces `BackendError` to the ACP layer; the agent _within_ the backend may encounter `LLMError` during its execution. They never appear in the same `ResultAsync` channel.

| Variant                | `_tag`                   | Cause                                                     | Fields               |
| ---------------------- | ------------------------ | --------------------------------------------------------- | -------------------- |
| `RateLimitError`       | `"RateLimitError"`       | API rate limit exceeded; triggers exponential backoff     | `retryable`, `cause` |
| `ContextOverflowError` | `"ContextOverflowError"` | Context window exceeded; triggers summarization retry     | `retryable`, `cause` |
| `NetworkError`         | `"NetworkError"`         | Network connectivity failure; triggers retry with backoff | `retryable`, `cause` |
| `BudgetExceededError`  | `"BudgetExceededError"`  | Token budget exhausted; agent must wrap up                | `retryable`, `cause` |

```typescript
type LLMError = RateLimitError | ContextOverflowError | NetworkError | BudgetExceededError;

interface RateLimitError {
  readonly _tag: "RateLimitError";
  readonly retryable: true;
  readonly cause: unknown;
}

interface ContextOverflowError {
  readonly _tag: "ContextOverflowError";
  readonly retryable: true;
  readonly cause: unknown;
}

interface NetworkError {
  readonly _tag: "NetworkError";
  readonly retryable: true;
  readonly cause: unknown;
}

interface BudgetExceededError {
  readonly _tag: "BudgetExceededError";
  readonly retryable: false;
  readonly cause: unknown;
}
```

---

## ACP Protocol Errors

Source: behaviors/BEH-SF-209-acp-server.md, behaviors/BEH-SF-219-acp-client.md, behaviors/BEH-SF-229-acp-messaging.md

**Referenced by:** `ACPAgentService`, `ACPServerService`, `MessageExchangeService` in [types/ports.md](./ports.md)

`ACPError` is a discriminated union used by `ACPAgentService`, `ACPServerService`, and `MessageExchangeService`. It covers protocol-level failures in the ACP layer -- server startup, run management, session lifecycle, message translation, and network transport.

> **Note:** `LLMError` (above) covers domain-level LLM errors -- rate limits, context overflow, budget exhaustion. `ACPError` covers protocol-level failures in the ACP communication layer. They are separate concerns: an agent backend may encounter an `LLMError` during execution, while the ACP layer wraps execution lifecycle failures in `ACPError`.

| Variant                          | `_tag`                             | Cause                                              | Fields                                    |
| -------------------------------- | ---------------------------------- | -------------------------------------------------- | ----------------------------------------- |
| `ACPServerStartupError`          | `"ACPServerStartupError"`          | ACP server failed to bind or initialize            | `port`, `cause`                           |
| `ACPRunCreationError`            | `"ACPRunCreationError"`            | Failed to create a new agent run                   | `agentName`, `retryable`, `cause`         |
| `ACPRunStateError`               | `"ACPRunStateError"`               | Run in unexpected state for requested transition   | `runId`, `expectedState`, `actualState`   |
| `ACPSessionError`                | `"ACPSessionError"`                | Session lifecycle failure (create, resume, close)  | `sessionId`, `cause`                      |
| `ACPMessageTranslationError`     | `"ACPMessageTranslationError"`     | Message serialization/deserialization failure      | `messageId`, `direction`, `cause`         |
| `ACPAwaitTimeoutError`           | `"ACPAwaitTimeoutError"`           | Await (clarification, human-in-the-loop) timed out | `runId`, `awaitType`, `timeoutMs`         |
| `ClarificationAwaitTimeoutError` | `"ClarificationAwaitTimeoutError"` | Clarification-specific await timed out             | `timeoutMs`, `targetAgentRole`, `awaitId` |
| `ACPNetworkError`                | `"ACPNetworkError"`                | HTTP transport failure to remote ACP server        | `url`, `statusCode`, `retryable`, `cause` |

```typescript
type ACPError =
  | ACPServerStartupError
  | ACPRunCreationError
  | ACPRunStateError
  | ACPSessionError
  | ACPMessageTranslationError
  | ACPAwaitTimeoutError
  | ClarificationAwaitTimeoutError
  | ACPNetworkError;

interface ACPServerStartupError {
  readonly _tag: "ACPServerStartupError";
  readonly port: number;
  readonly cause: unknown;
}

interface ACPRunCreationError {
  readonly _tag: "ACPRunCreationError";
  readonly agentName: string;
  readonly retryable: boolean;
  readonly cause: unknown;
}

interface ACPRunStateError {
  readonly _tag: "ACPRunStateError";
  readonly runId: string;
  readonly expectedState: string;
  readonly actualState: string;
}
```

> **Behavioral reference (M38):** Invalid state transitions are specified in [behaviors/BEH-SF-209-acp-server.md](../behaviors/BEH-SF-209-acp-server.md) (BEH-SF-212). The valid state machine transitions are documented in [types/acp.md](./acp.md#run-lifecycle).

```typescript
interface ACPSessionError {
  readonly _tag: "ACPSessionError";
  readonly sessionId: string;
  readonly cause: unknown;
}

interface ACPMessageTranslationError {
  readonly _tag: "ACPMessageTranslationError";
  readonly messageId: string;
  readonly direction: "toDomain" | "fromDomain";
  readonly cause: unknown;
}
```

> **Clarification (C34):** `ACPMessageTranslationError` is raised only on structural parse failure (e.g., malformed JSON, missing required fields). Unrecognized message parts are preserved as-is per BEH-SF-228, not treated as errors.

```typescript
interface ACPAwaitTimeoutError {
  readonly _tag: "ACPAwaitTimeoutError";
  readonly runId: string;
  readonly awaitType: string;
  readonly timeoutMs: number;
}

interface ClarificationAwaitTimeoutError {
  readonly _tag: "ClarificationAwaitTimeoutError";
  readonly timeoutMs: number;
  readonly targetAgentRole: string;
  readonly awaitId: string;
}

interface ACPNetworkError {
  readonly _tag: "ACPNetworkError";
  readonly url: string;
  readonly statusCode: number;
  readonly retryable: boolean;
  readonly cause: unknown;
}
```

---

## Connection Errors

Source: [ADR-019](../decisions/ADR-019-zed-inspired-architecture.md)

**Referenced by:** `ConnectionManagerService` in [types/ports.md](./ports.md)

| Error Type                   | `_tag`                         | Cause                                        | Fields                  |
| ---------------------------- | ------------------------------ | -------------------------------------------- | ----------------------- |
| `ConnectionError`            | `"ConnectionError"`            | Agent subprocess connection failure          | `connectionId`, `cause` |
| `ConnectionUnavailableError` | `"ConnectionUnavailableError"` | No active connection for the requested agent | `agentName`             |

```typescript
type ConnectionError = ConnectionFailedError | ConnectionUnavailableError;

interface ConnectionFailedError {
  readonly _tag: "ConnectionError";
  readonly connectionId: string;
  readonly cause: unknown;
}

interface ConnectionUnavailableError {
  readonly _tag: "ConnectionUnavailableError";
  readonly agentName: string;
}
```

---

## Agent Registry Errors

Source: [ADR-019](../decisions/ADR-019-zed-inspired-architecture.md)

**Referenced by:** `AgentRegistryService` in [types/ports.md](./ports.md)

| Error Type           | `_tag`                 | Cause                                         | Fields            |
| -------------------- | ---------------------- | --------------------------------------------- | ----------------- |
| `AgentNotFoundError` | `"AgentNotFoundError"` | Referenced role ID has no registered manifest | `roleId`          |
| `AgentRegistryError` | `"AgentRegistryError"` | Registration or unregistration failure        | `roleId`, `cause` |

```typescript
interface AgentNotFoundError {
  readonly _tag: "AgentNotFoundError";
  readonly roleId: string;
}

interface AgentRegistryError {
  readonly _tag: "AgentRegistryError";
  readonly roleId: string;
  readonly cause: unknown;
}
```

---

## Backend Errors

Source: behaviors/BEH-SF-239-agent-backend.md

**Referenced by:** `AgentBackendService.execute()` in [types/ports.md](./ports.md); [behaviors/BEH-SF-239-agent-backend.md](../behaviors/BEH-SF-239-agent-backend.md)

`BackendError` is a discriminated union used by `AgentBackendService.execute()`. It covers execution-level failures in the agent backend -- process spawning, execution timeouts, and malformed output parsing.

> See **LLM Errors** section above for the LLMError vs BackendError disambiguation.

| Variant                 | `_tag`                    | Cause                                            | Fields                                           |
| ----------------------- | ------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| `BackendExecutionError` | `"BackendExecutionError"` | Backend execution failed during a run            | `backendName`, `runId`, `retryable`, `cause`     |
| `BackendSpawnError`     | `"BackendSpawnError"`     | Backend process failed to spawn                  | `backendName`, `command`, `retryable`, `cause`   |
| `BackendTimeoutError`   | `"BackendTimeoutError"`   | Backend execution exceeded time limit            | `backendName`, `runId`, `timeoutMs`, `retryable` |
| `BackendOutputError`    | `"BackendOutputError"`    | Backend produced malformed or unparseable output | `backendName`, `runId`, `retryable`, `cause`     |

```typescript
type BackendError =
  | BackendExecutionError
  | BackendSpawnError
  | BackendTimeoutError
  | BackendOutputError;

interface BackendExecutionError {
  readonly _tag: "BackendExecutionError";
  readonly backendName: string;
  readonly runId: string;
  readonly retryable: boolean;
  readonly cause: unknown;
}

interface BackendSpawnError {
  readonly _tag: "BackendSpawnError";
  readonly backendName: string;
  readonly command: string;
  readonly retryable: boolean;
  readonly cause: unknown;
}

interface BackendTimeoutError {
  readonly _tag: "BackendTimeoutError";
  readonly backendName: string;
  readonly runId: string;
  readonly timeoutMs: number;
  readonly retryable: true;
}

interface BackendOutputError {
  readonly _tag: "BackendOutputError";
  readonly backendName: string;
  readonly runId: string;
  readonly retryable: false;
  readonly cause: unknown;
}
```

---

## Flow Errors

Source: 03-flows.md

**Referenced by:** `OrchestratorService`, `SchedulerService`, `ConvergenceService`, `AnalyticsService` in [types/ports.md](./ports.md)

`OrchestratorError` is a discriminated union of all 10 flow-related error types:

| Error Type                | `_tag`                      | Cause                                                         | Fields                            |
| ------------------------- | --------------------------- | ------------------------------------------------------------- | --------------------------------- |
| `FlowNotFoundError`       | `"FlowNotFoundError"`       | Referenced flow name not registered                           | `flowName`                        |
| `FlowAlreadyRunningError` | `"FlowAlreadyRunningError"` | Attempted to start a flow that is already active              | `flowName`, `existingFlowRunId`   |
| `FlowRunNotFoundError`    | `"FlowRunNotFoundError"`    | Referenced flow run ID does not exist                         | `flowRunId`                       |
| `PhaseError`              | `"PhaseError"`              | Phase execution failure                                       | `phaseName`, `iteration`, `cause` |
| `FlowValidationError`     | `"FlowValidationError"`     | Invalid flow definition (missing phases, invalid convergence) | `flowName`, `violations`          |
| `SpecStoreError`          | `"SpecStoreError"`          | Spec store operation failed (save, load, render)              | `specId`, `cause`                 |
| `CoverageError`           | `"CoverageError"`           | Coverage computation failed                                   | `scope`, `cause`                  |
| `VerificationError`       | `"VerificationError"`       | Verification failed                                           | `scope`, `cause`                  |
| `TaskDecomposerError`     | `"TaskDecomposerError"`     | Task decomposition failed                                     | `specId`, `cause`                 |
| `ReverseRunStateError`    | `"ReverseRunStateError"`    | Reverse run state persistence failed                          | `runId`, `cause`                  |

```typescript
type OrchestratorError =
  | FlowNotFoundError
  | FlowAlreadyRunningError
  | FlowRunNotFoundError
  | PhaseError
  | FlowValidationError
  | SpecStoreError
  | CoverageError
  | VerificationError
  | TaskDecomposerError
  | ReverseRunStateError;

interface FlowNotFoundError {
  readonly _tag: "FlowNotFoundError";
  readonly flowName: string;
}

interface FlowAlreadyRunningError {
  readonly _tag: "FlowAlreadyRunningError";
  readonly flowName: string;
  readonly existingFlowRunId: string;
}

interface FlowRunNotFoundError {
  readonly _tag: "FlowRunNotFoundError";
  readonly flowRunId: string;
}

interface PhaseError {
  readonly _tag: "PhaseError";
  readonly phaseName: string;
  readonly iteration: number;
  readonly cause: unknown;
}

interface FlowValidationError {
  readonly _tag: "FlowValidationError";
  readonly flowName: string;
  readonly violations: ReadonlyArray<string>;
}

interface SpecStoreError {
  readonly _tag: "SpecStoreError";
  readonly specId: string;
  readonly cause: unknown;
}

interface CoverageError {
  readonly _tag: "CoverageError";
  readonly scope: unknown;
  readonly cause: unknown;
}

interface VerificationError {
  readonly _tag: "VerificationError";
  readonly scope: unknown;
  readonly cause: unknown;
}

interface TaskDecomposerError {
  readonly _tag: "TaskDecomposerError";
  readonly specId: string;
  readonly cause: unknown;
}

interface ReverseRunStateError {
  readonly _tag: "ReverseRunStateError";
  readonly runId: string;
  readonly cause: unknown;
}
```

> **Deferred (N17):** NLQ and Analytics error paths are covered by the existing `GraphQueryError` and `OrchestratorError` unions. Dedicated error types for NLQ parse failures and analytics computation failures are deferred to behavioral coverage in [behaviors/BEH-SF-057-flow-execution.md](../behaviors/BEH-SF-057-flow-execution.md) and [behaviors/BEH-SF-001-graph-operations.md](../behaviors/BEH-SF-001-graph-operations.md).

---

## Infrastructure Errors

Infrastructure errors cover port binding, configuration, and schema validation failures that occur during application startup or runtime resolution.

**Referenced by:** `ConfigService`, `ValidationService`, `HealthCheckService` in [types/ports.md](./ports.md); [./invariants/index.md](../invariants/index.md) (INV-SF-1)

| Error Type                  | `_tag`                        | Cause                                            | Fields                             |
| --------------------------- | ----------------------------- | ------------------------------------------------ | ---------------------------------- |
| `ConfigError`               | `"ConfigError"`               | Configuration key missing, malformed, or invalid | `key`, `cause`                     |
| `PortNotBoundError`         | `"PortNotBoundError"`         | Port resolved before an adapter was registered   | `portName`                         |
| `AdapterInstantiationError` | `"AdapterInstantiationError"` | Adapter factory threw during creation            | `portName`, `adapterName`, `cause` |
| `SchemaValidationError`     | `"SchemaValidationError"`     | Data failed schema validation                    | `schemaName`, `violations`         |

```typescript
interface ConfigError {
  readonly _tag: "ConfigError";
  readonly key: string;
  readonly cause: unknown;
}

interface PortNotBoundError {
  readonly _tag: "PortNotBoundError";
  readonly portName: string;
}

interface AdapterInstantiationError {
  readonly _tag: "AdapterInstantiationError";
  readonly portName: string;
  readonly adapterName: string;
  readonly cause: unknown;
}

interface SchemaValidationError {
  readonly _tag: "SchemaValidationError";
  readonly schemaName: string;
  readonly violations: ReadonlyArray<string>;
}
```

> **Enforcement (M44):** Schema validation is enforced per [INV-SF-13](../invariants/INV-SF-13-structured-output-schema-compliance.md). All structured output accepted by the system MUST pass schema validation. See [behaviors/BEH-SF-057-flow-execution.md](../behaviors/BEH-SF-057-flow-execution.md) for behavioral specification.

---

## Import/Export Errors

Errors for the pluggable import/export adapter pipeline.

**Referenced by:** `ImportAdapterService`, `ExportAdapterService` in [types/ports.md](./ports.md); [behaviors/BEH-SF-127-import-export.md](../behaviors/BEH-SF-127-import-export.md)

| Error Type                      | `_tag`                            | Cause                                             | Fields                         |
| ------------------------------- | --------------------------------- | ------------------------------------------------- | ------------------------------ |
| `ImportError`                   | `"ImportError"`                   | Generic import operation failure                  | `format`, `retryable`, `cause` |
| `ExportError`                   | `"ExportError"`                   | Generic export operation failure                  | `format`, `retryable`, `cause` |
| `ImportFormatNotSupportedError` | `"ImportFormatNotSupportedError"` | Requested import format has no registered adapter | `format`, `supportedFormats`   |
| `ExportFormatNotSupportedError` | `"ExportFormatNotSupportedError"` | Requested export format has no registered adapter | `format`, `supportedFormats`   |

```typescript
interface ImportError {
  readonly _tag: "ImportError";
  readonly format: string;
  readonly retryable: boolean;
  readonly cause: unknown;
}

interface ExportError {
  readonly _tag: "ExportError";
  readonly format: string;
  readonly retryable: boolean;
  readonly cause: unknown;
}

interface ImportFormatNotSupportedError {
  readonly _tag: "ImportFormatNotSupportedError";
  readonly format: string;
  readonly supportedFormats: ReadonlyArray<string>;
}

interface ExportFormatNotSupportedError {
  readonly _tag: "ExportFormatNotSupportedError";
  readonly format: string;
  readonly supportedFormats: ReadonlyArray<string>;
}
```

---

## Runtime Errors

Runtime errors cover process-level failures, authentication failures, model availability, and server lifecycle issues that occur during active operation.

**Referenced by:** `ACPServerService`, `SessionManagerService`, `AgentBackendService` in [types/ports.md](./ports.md); [behaviors/BEH-SF-209-acp-server.md](../behaviors/BEH-SF-209-acp-server.md) (BEH-SF-226)

| Error Type                  | `_tag`                        | Cause                                                         | Fields                             |
| --------------------------- | ----------------------------- | ------------------------------------------------------------- | ---------------------------------- |
| `ProcessCrashError`         | `"ProcessCrashError"`         | Agent backend process crashed unexpectedly                    | `processId`, `exitCode`, `cause`   |
| `AuthenticationError`       | `"AuthenticationError"`       | Authentication failed (invalid token, expired, missing)       | `mechanism`, `cause`               |
| `ModelNotAvailableError`    | `"ModelNotAvailableError"`    | Requested LLM model unavailable or disabled                   | `model`, `cause`                   |
| `RunCreationError`          | `"RunCreationError"`          | Failed to create an ACP run (resource exhaustion, validation) | `agentName`, `retryable`, `cause`  |
| `RunTimeoutError`           | `"RunTimeoutError"`           | ACP run exceeded maximum execution time                       | `runId`, `timeoutMs`, `elapsedMs`  |
| `RunCancelledError`         | `"RunCancelledError"`         | ACP run was cancelled by user or system                       | `runId`, `cancelledBy`             |
| `ServerUnavailableError`    | `"ServerUnavailableError"`    | SpecForge server unreachable or not started                   | `serverUrl`, `cause`               |
| `McpServerUnavailableError` | `"McpServerUnavailableError"` | MCP tool server unreachable                                   | `serverName`, `serverUrl`, `cause` |

```typescript
interface ProcessCrashError {
  readonly _tag: "ProcessCrashError";
  readonly processId: string;
  readonly exitCode: number;
  readonly cause: unknown;
}

interface AuthenticationError {
  readonly _tag: "AuthenticationError";
  readonly mechanism: string;
  readonly cause: unknown;
}

interface ModelNotAvailableError {
  readonly _tag: "ModelNotAvailableError";
  readonly model: string;
  readonly cause: unknown;
}

interface RunCreationError {
  readonly _tag: "RunCreationError";
  readonly agentName: string;
  readonly retryable: boolean;
  readonly cause: unknown;
}

interface RunTimeoutError {
  readonly _tag: "RunTimeoutError";
  readonly runId: string;
  readonly timeoutMs: number;
  readonly elapsedMs: number;
}

interface RunCancelledError {
  readonly _tag: "RunCancelledError";
  readonly runId: string;
  readonly cancelledBy: "user" | "system" | "budget";
}

interface ServerUnavailableError {
  readonly _tag: "ServerUnavailableError";
  readonly serverUrl: string;
  readonly cause: unknown;
}

interface McpServerUnavailableError {
  readonly _tag: "McpServerUnavailableError";
  readonly serverName: string;
  readonly serverUrl: string;
  readonly cause: unknown;
}
```

---

## Cloud Errors

Source: 07-saas.md

**Referenced by:** `AuthService`, `BillingService` in [types/ports.md](./ports.md); [behaviors/BEH-SF-101-authentication.md](../behaviors/BEH-SF-101-authentication.md), [behaviors/BEH-SF-107-cloud-services.md](../behaviors/BEH-SF-107-cloud-services.md)

| Error Type      | `_tag`            | Cause                                | Fields                            |
| --------------- | ----------------- | ------------------------------------ | --------------------------------- |
| `AuthError`     | `"AuthError"`     | Authentication/authorization failure | `cause`, `code`                   |
| `CloudApiError` | `"CloudApiError"` | Cloud API request failure            | `endpoint`, `statusCode`, `cause` |
| `BillingError`  | `"BillingError"`  | Billing operation failure            | `cause`                           |

```typescript
interface AuthError {
  readonly _tag: "AuthError";
  readonly cause: unknown;
  readonly code: string;
}

interface CloudApiError {
  readonly _tag: "CloudApiError";
  readonly endpoint: string;
  readonly statusCode: number;
  readonly cause: unknown;
}

interface BillingError {
  readonly _tag: "BillingError";
  readonly cause: unknown;
}
```

---

## Audit Errors

**Referenced by:** Permission governance audit pipeline. See [types/audit.md](./audit.md) for full audit types.

| Error Type                     | `_tag`                           | Cause                                                  | Fields                |
| ------------------------------ | -------------------------------- | ------------------------------------------------------ | --------------------- |
| `PermissionDecisionAuditError` | `"PermissionDecisionAuditError"` | Audit record for permission decision failed to persist | `decisionId`, `cause` |

```typescript
interface PermissionDecisionAuditError {
  readonly _tag: "PermissionDecisionAuditError";
  readonly decisionId: string;
  readonly cause: unknown;
}
```

---

## Hook Errors

Source: 06-extensibility.md

**Referenced by:** `PhaseHook.handler()` in [types/extensibility.md](./extensibility.md); [behaviors/BEH-SF-161-hook-pipeline.md](../behaviors/BEH-SF-161-hook-pipeline.md)

| Error Type         | `_tag`               | Cause                       | Fields                             |
| ------------------ | -------------------- | --------------------------- | ---------------------------------- |
| `HookError`        | `"HookError"`        | Phase hook execution failed | `hookPhase`, `timing`, `cause`     |
| `HookTimeoutError` | `"HookTimeoutError"` | Phase hook timed out        | `hookPhase`, `timing`, `timeoutMs` |

```typescript
interface HookError {
  readonly _tag: "HookError";
  readonly hookPhase: string;
  readonly timing: "pre" | "post";
  readonly cause: unknown;
}

interface HookTimeoutError {
  readonly _tag: "HookTimeoutError";
  readonly hookPhase: string;
  readonly timing: "pre" | "post";
  readonly timeoutMs: number;
}
```

> **Extension (C35):** `HookTimeoutError` is a specialization of `HookError` for timeout-specific failures. Both `HookError` and `HookTimeoutError` are valid error types for `PhaseHook.handler()`.

---

## ACP Server Errors

**Referenced by:** `ACPServerService` in [types/ports.md](./ports.md); [behaviors/BEH-SF-209-acp-server.md](../behaviors/BEH-SF-209-acp-server.md)

| Error Type               | `_tag`                     | Cause                                   | Fields                  |
| ------------------------ | -------------------------- | --------------------------------------- | ----------------------- |
| `ACPServerStartupError`  | `"ACPServerStartupError"`  | ACP server failed during startup        | `step`, `cause`         |
| `ACPServerShutdownError` | `"ACPServerShutdownError"` | ACP server failed during shutdown       | `activeRuns`, `cause`   |
| `ACPServerOverloadError` | `"ACPServerOverloadError"` | ACP server exceeded max concurrent runs | `activeRuns`, `maxRuns` |

```typescript
type ACPServerError =
  | { readonly _tag: "ACPServerStartupError"; readonly step: string; readonly cause: string }
  | { readonly _tag: "ACPServerShutdownError"; readonly activeRuns: number; readonly cause: string }
  | {
      readonly _tag: "ACPServerOverloadError";
      readonly activeRuns: number;
      readonly maxRuns: number;
    };
```

---

## ACP Client Errors

**Referenced by:** `ACPAgentService` in [types/ports.md](./ports.md); [behaviors/BEH-SF-219-acp-client.md](../behaviors/BEH-SF-219-acp-client.md)

| Error Type                 | `_tag`                       | Cause                                  | Fields                               |
| -------------------------- | ---------------------------- | -------------------------------------- | ------------------------------------ |
| `ACPClientConnectionError` | `"ACPClientConnectionError"` | Client failed to connect to ACP server | `serverUrl`, `cause`                 |
| `ACPClientTimeoutError`    | `"ACPClientTimeoutError"`    | Client run timed out                   | `runId`, `timeoutMs`                 |
| `ACPClientProtocolError`   | `"ACPClientProtocolError"`   | Protocol version mismatch              | `expectedVersion`, `receivedVersion` |

```typescript
type ACPClientError =
  | {
      readonly _tag: "ACPClientConnectionError";
      readonly serverUrl: string;
      readonly cause: string;
    }
  | { readonly _tag: "ACPClientTimeoutError"; readonly runId: string; readonly timeoutMs: number }
  | {
      readonly _tag: "ACPClientProtocolError";
      readonly expectedVersion: string;
      readonly receivedVersion: string;
    };
```

---

## Cache Errors

**Referenced by:** `CacheService` in [types/ports.md](./ports.md)

| Error Type             | `_tag`                   | Cause                            | Fields             |
| ---------------------- | ------------------------ | -------------------------------- | ------------------ |
| `CacheMissError`       | `"CacheMissError"`       | Cache key not found              | `key`              |
| `CacheWriteError`      | `"CacheWriteError"`      | Cache write operation failed     | `key`, `cause`     |
| `CacheConnectionError` | `"CacheConnectionError"` | Cache backend connection failure | `backend`, `cause` |

```typescript
type CacheError =
  | { readonly _tag: "CacheMissError"; readonly key: string }
  | { readonly _tag: "CacheWriteError"; readonly key: string; readonly cause: string }
  | { readonly _tag: "CacheConnectionError"; readonly backend: string; readonly cause: string };
```

---

## Plugin Errors

**Referenced by:** `PluginService`, `PluginSandboxService` in [types/extensibility.md](./extensibility.md#plugin-system)

| Error Type            | `_tag`                  | Cause                             | Fields                     |
| --------------------- | ----------------------- | --------------------------------- | -------------------------- |
| `PluginLoadError`     | `"PluginLoadError"`     | Plugin failed to load             | `pluginName`, `cause`      |
| `PluginManifestError` | `"PluginManifestError"` | Plugin manifest validation failed | `pluginName`, `violations` |

```typescript
type PluginLoadError = {
  readonly _tag: "PluginLoadError";
  readonly pluginName: string;
  readonly cause: string;
};
type PluginManifestError = {
  readonly _tag: "PluginManifestError";
  readonly pluginName: string;
  readonly violations: ReadonlyArray<string>;
};
```

---

## Hook Pipeline Error

**Referenced by:** `HookPipelinePort` in [types/ports.md](./ports.md); [behaviors/BEH-SF-161-hook-pipeline.md](../behaviors/BEH-SF-161-hook-pipeline.md)

| Error Type          | `_tag`                | Cause                          | Fields                       |
| ------------------- | --------------------- | ------------------------------ | ---------------------------- |
| `HookPipelineError` | `"HookPipelineError"` | Hook pipeline execution failed | `hookName`, `phase`, `cause` |

```typescript
type HookPipelineError = {
  readonly _tag: "HookPipelineError";
  readonly hookName: string;
  readonly phase: "pre" | "post";
  readonly cause: string;
};
```

---

## Extension Errors

Source: [ADR-020](../decisions/ADR-020-protocol-extension-observability.md)

**Referenced by:** `ExtensionMethodDispatcher`, `ConnectionManagerService.negotiate()` in [types/ports.md](./ports.md); [behaviors/BEH-SF-496-protocol-extensions.md](../behaviors/BEH-SF-496-protocol-extensions.md)

| Error Type                     | `_tag`                           | Cause                                                   | Fields                                               |
| ------------------------------ | -------------------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| `ExtensionMethodNotFoundError` | `"ExtensionMethodNotFoundError"` | Requested `_`-prefixed method has no registered handler | `methodName`, `namespace`                            |
| `ExtensionMethodError`         | `"ExtensionMethodError"`         | Extension method execution failed                       | `methodName`, `namespace`, `cause`                   |
| `VersionNegotiationError`      | `"VersionNegotiationError"`      | Backend protocol version incompatible with client       | `clientVersion`, `backendVersion`, `minimumRequired` |

```typescript
interface ExtensionMethodNotFoundError {
  readonly _tag: "ExtensionMethodNotFoundError";
  readonly methodName: string;
  readonly namespace: string;
}

interface ExtensionMethodError {
  readonly _tag: "ExtensionMethodError";
  readonly methodName: string;
  readonly namespace: string;
  readonly cause: unknown;
}

interface VersionNegotiationError {
  readonly _tag: "VersionNegotiationError";
  readonly clientVersion: string;
  readonly backendVersion: string;
  readonly minimumRequired: string;
}
```

---

## Registry Errors (Extended)

Source: [ADR-021](../decisions/ADR-021-schema-driven-agent-registry.md)

**Referenced by:** `AgentRegistryService.validateManifest()`, `AgentRegistryService.addSource()` in [types/ports.md](./ports.md); [behaviors/BEH-SF-504-agent-registry-distribution.md](../behaviors/BEH-SF-504-agent-registry-distribution.md)

| Error Type                | `_tag`                      | Cause                                   | Fields                                          |
| ------------------------- | --------------------------- | --------------------------------------- | ----------------------------------------------- |
| `ManifestValidationError` | `"ManifestValidationError"` | Agent manifest failed schema validation | `agentName`, `violations`                       |
| `RegistrySourceError`     | `"RegistrySourceError"`     | Registry source fetch or parse failure  | `sourceType`, `sourceUrl`, `retryable`, `cause` |

```typescript
interface ManifestValidationError {
  readonly _tag: "ManifestValidationError";
  readonly agentName: string;
  readonly violations: ReadonlyArray<string>;
}

interface RegistrySourceError {
  readonly _tag: "RegistrySourceError";
  readonly sourceType: "cdn" | "npm" | "github" | "local";
  readonly sourceUrl: string;
  readonly retryable: boolean;
  readonly cause: unknown;
}
```

---

## MCP Proxy Errors

Source: [ADR-023](../decisions/ADR-023-session-resilience-mcp-integration.md)

**Referenced by:** `McpProxyService` in [types/ports.md](./ports.md); [behaviors/BEH-SF-520-session-resilience.md](../behaviors/BEH-SF-520-session-resilience.md)

| Error Type               | `_tag`                     | Cause                                  | Fields                                           |
| ------------------------ | -------------------------- | -------------------------------------- | ------------------------------------------------ |
| `McpProxyError`          | `"McpProxyError"`          | MCP proxy operation failed             | `backendName`, `cause`                           |
| `McpProxyTransportError` | `"McpProxyTransportError"` | MCP proxy transport connection failure | `backendName`, `transport`, `retryable`, `cause` |

```typescript
interface McpProxyError {
  readonly _tag: "McpProxyError";
  readonly backendName: string;
  readonly cause: unknown;
}

interface McpProxyTransportError {
  readonly _tag: "McpProxyTransportError";
  readonly backendName: string;
  readonly transport: "stdio" | "http" | "sse";
  readonly retryable: boolean;
  readonly cause: unknown;
}
```

---

## Session Errors (Extended)

Source: [ADR-023](../decisions/ADR-023-session-resilience-mcp-integration.md)

**Referenced by:** `SessionStateManager` in [types/ports.md](./ports.md); [behaviors/BEH-SF-520-session-resilience.md](../behaviors/BEH-SF-520-session-resilience.md)

| Error Type           | `_tag`                 | Cause                                                        | Fields                                     |
| -------------------- | ---------------------- | ------------------------------------------------------------ | ------------------------------------------ |
| `SessionResumeError` | `"SessionResumeError"` | Session resume failed (hash mismatch, missing checkpoint)    | `sessionId`, `checkpointId`, `cause`       |
| `SessionForkError`   | `"SessionForkError"`   | Session fork failed (invalid checkpoint, state copy failure) | `sourceSessionId`, `checkpointId`, `cause` |

```typescript
interface SessionResumeError {
  readonly _tag: "SessionResumeError";
  readonly sessionId: string;
  readonly checkpointId: string;
  readonly cause: "hash-mismatch" | "checkpoint-not-found" | "state-corruption";
}

interface SessionForkError {
  readonly _tag: "SessionForkError";
  readonly sourceSessionId: string;
  readonly checkpointId: string;
  readonly cause: "checkpoint-not-found" | "state-copy-failure" | "id-collision";
}
```

---

## Permission Policy Errors

Source: [ADR-024](../decisions/ADR-024-permission-policy-architecture.md)

**Referenced by:** `PermissionPolicyService` in [types/ports.md](./ports.md); [behaviors/BEH-SF-528-permission-policy.md](../behaviors/BEH-SF-528-permission-policy.md)

| Error Type                      | `_tag`                            | Cause                               | Fields                           |
| ------------------------------- | --------------------------------- | ----------------------------------- | -------------------------------- |
| `PermissionPolicyError`         | `"PermissionPolicyError"`         | Policy evaluation failed            | `policyId`, `cause`              |
| `PermissionPolicyConflictError` | `"PermissionPolicyConflictError"` | Contradictory policy rules detected | `policyIds`, `subject`, `action` |

```typescript
interface PermissionPolicyError {
  readonly _tag: "PermissionPolicyError";
  readonly policyId: string;
  readonly cause: unknown;
}

interface PermissionPolicyConflictError {
  readonly _tag: "PermissionPolicyConflictError";
  readonly policyIds: ReadonlyArray<string>;
  readonly subject: string;
  readonly action: string;
}
```
