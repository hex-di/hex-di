# 14 - Introspection

_Previous: [13 - Advanced Patterns](./13-advanced.md)_

---

## 19. Self-Awareness & Diagnostics

From VISION.md: "Every library in the ecosystem isn't just doing its job -- it's also reporting what it knows to a central queryable system. The DI container stops being plumbing and becomes the application's nervous system."

The saga package's role in this vision is to make workflow orchestration fully transparent. Every running saga, every step's progress, every compensation chain, and every failure pattern is structured data that the container can expose through its diagnostic ports.

### 19.1 The Nervous System Role

The saga package contributes to all three layers of the HexDI self-knowledge model:

**Layer 1 -- Structure (application DNA, known at definition time):**

- Saga definitions: name, step count, step topology
- Step dependency map: which ports each step invokes
- Compensation chains: which steps have compensation handlers and what they target
- Saga options: retry policies, timeout configurations, compensation strategies

**Layer 2 -- State (changes as the application runs):**

- In-progress workflow executions and their current step
- Compensation state: which steps have been undone, which are pending
- Pending steps awaiting external input or retry backoff
- Persisted execution checkpoints awaiting resumption

**Layer 3 -- Behavior (the application's memory of its own activity):**

- Execution traces: step-by-step timing, attempt counts, skip reasons
- Failure patterns: which steps fail most often, which errors recur
- Compensation history: frequency, success rate, average compensation duration
- Transaction boundaries: how long workflows take end-to-end, where time is spent

The saga package reports **"I know the workflows"**:

- Every running workflow and its current step
- Compensation chains (what can be undone)
- Failure points and recovery state
- Transaction boundaries and timing

### 19.2 Saga Inspection API

The `SagaInspector` provides pull-based queries for saga state. It follows the same pattern as the runtime `InspectorAPI` (pull-based snapshots, frozen immutable data, push-based subscriptions).

```typescript
interface SagaInspector {
  /** List all registered saga definitions with their step topology */
  getDefinitions(): readonly SagaDefinitionInfo[];

  /** Get all currently active (pending, running, compensating) executions */
  getActiveExecutions(): readonly SagaExecutionSummary[];

  /** Get execution history with optional filters (delegates to SagaPersister.list) */
  getHistory(filters?: PersisterFilters): Promise<readonly SagaExecutionSummary[]>;

  /** Get the detailed execution trace for a specific execution */
  getTrace(executionId: string): ExecutionTrace | null;

  /** Get aggregated compensation statistics */
  getCompensationStats(): CompensationStats;

  /** Subscribe to saga lifecycle events across all executions */
  subscribe(listener: SagaInspectorListener): () => void;
}
```

The `SagaInspector` is obtained from the container -- it aggregates state from all registered saga ports and the underlying `SagaRunner`. The container creates it lazily on first access, following the same WeakMap caching pattern used by `createInspector` in `@hex-di/runtime`.

#### 19.2.1 SagaDefinitionInfo

Structural metadata for a registered saga definition. Known at build time and immutable at runtime.

```typescript
interface SagaDefinitionInfo {
  /** Saga name from defineSaga("name") */
  readonly name: string;

  /** Ordered list of steps with their structural metadata */
  readonly steps: readonly StepDefinitionInfo[];

  /** Saga-level configuration */
  readonly options: {
    readonly compensationStrategy: "sequential" | "parallel" | "best-effort";
    readonly timeout: number | undefined;
    readonly retryPolicy: RetryPolicyInfo | undefined;
  };

  /** All ports that this saga's steps depend on */
  readonly portDependencies: readonly string[];
}

interface StepDefinitionInfo {
  /** Step name from defineStep("name") */
  readonly name: string;

  /** Port name this step invokes */
  readonly port: string;

  /** Whether a compensation handler is defined for this step */
  readonly hasCompensation: boolean;

  /** Whether this step has a condition (may be skipped at runtime) */
  readonly isConditional: boolean;

  /** Step-level retry policy, if any */
  readonly retryPolicy: RetryPolicyInfo | undefined;

  /** Step-level timeout, if any */
  readonly timeout: number | undefined;
}

interface RetryPolicyInfo {
  readonly maxAttempts: number;
  readonly backoffStrategy: "fixed" | "exponential" | "linear";
  readonly initialDelay: number;
}
```

#### 19.2.2 SagaExecutionSummary

A lightweight view of a saga execution suitable for listing and dashboards. Does not include full step results or trace data (use `getTrace` for that).

```typescript
interface SagaExecutionSummary {
  readonly executionId: string;
  readonly sagaName: string;
  readonly status: SagaStatusType;
  readonly currentStepName: string | null;
  readonly currentStepIndex: number;
  readonly totalSteps: number;
  readonly completedStepCount: number;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;
  readonly durationMs: number | null;
  readonly error: {
    readonly _tag: string;
    readonly stepName: string;
    readonly causeTags: readonly string[];
  } | null;
  readonly compensationState: {
    readonly active: boolean;
    readonly compensatedSteps: readonly string[];
    readonly failedSteps: readonly string[];
  };
  readonly metadata: Record<string, unknown>;
}
```

The `error` field is a structured object rather than a plain string. The `_tag` discriminant identifies the error variant (e.g., `"PaymentGatewayTimeout"`, `"InsufficientStock"`) following the same tagged-union convention used by `SagaError<unknown>` throughout the saga package. The `stepName` records which step produced the error, and `causeTags` lists the `_tag` values from any wrapped or chained cause errors, enabling agents to trace failure provenance without parsing unstructured messages.

#### 19.2.3 CompensationStats

Aggregated compensation metrics across all saga executions. Computed from persisted execution history.

```typescript
interface CompensationStats {
  /** Total number of compensation events triggered */
  readonly totalCompensations: number;

  /** Compensations that completed all steps successfully */
  readonly successfulCompensations: number;

  /** Compensations where one or more steps failed */
  readonly failedCompensations: number;

  /** Average time (ms) to complete a full compensation chain */
  readonly averageCompensationTime: number;

  /** Saga definition with the most compensation events */
  readonly mostCompensatedSaga: string | null;

  /** Per-saga breakdown */
  readonly bySaga: readonly SagaCompensationBreakdown[];
}

interface SagaCompensationBreakdown {
  readonly sagaName: string;
  readonly totalCompensations: number;
  readonly successRate: number;
  readonly averageCompensationTime: number;
  readonly mostFailedStep: string | null;

  /** Distribution of error _tag values across compensations for this saga.
   *  Keys are _tag strings, values are occurrence counts. */
  readonly errorTagDistribution: ReadonlyMap<string, number>;
}
```

#### 19.2.4 SagaInspectorListener

Push-based event subscription. Mirrors the `InspectorListener` pattern from `@hex-di/runtime` but carries `SagaEvent` payloads (the same event union defined in section 10.3 of the Runtime spec).

```typescript
type SagaInspectorListener = (event: SagaEvent) => void;
```

This enables real-time monitoring: a connected MCP client or devtools panel receives events as they happen rather than polling.

### 19.3 MCP Resource Exposure

The saga package maps its self-knowledge to MCP resources and tools following the same URI scheme (`hexdi://`) established in VISION.md. All JSON responses use the structured `_tag`-based error representation defined in `SagaExecutionSummary`, ensuring that AI agents receive machine-readable error discriminants rather than free-form strings.

**Resources (read-only snapshots):**

```
MCP Resource: "hexdi://saga/definitions"
Returns: All registered saga definitions with step topology,
         compensation chain structure, and port dependencies.
Maps to: sagaInspector.getDefinitions()

MCP Resource: "hexdi://saga/executions"
Returns: Active and recent saga executions with status,
         current step, structured error (with _tag), and compensation state.
Maps to: sagaInspector.getActiveExecutions()

MCP Resource: "hexdi://saga/executions/{id}"
Returns: Detailed execution trace including per-step timing,
         retry attempts, skip reasons, structured errors with _tag,
         and compensation log.
Maps to: sagaInspector.getTrace(id)

MCP Resource: "hexdi://saga/compensation-stats"
Returns: Aggregated compensation metrics: success rates,
         average times, most-compensated sagas, per-saga breakdown
         with errorTagDistribution.
Maps to: sagaInspector.getCompensationStats()
```

**Tools (actions):**

```
MCP Tool: "hexdi://saga/retry"
Input: { executionId: string }
Action: Resume a failed saga execution from its last checkpoint.
Maps to: sagaManagementExecutor.resume(executionId)
        (resolved via the saga's SagaManagementPort)

MCP Tool: "hexdi://saga/cancel"
Input: { executionId: string }
Action: Cancel a running saga and trigger compensation.
Maps to: sagaManagementExecutor.cancel(executionId)
        (resolved via the saga's SagaManagementPort)
```

**Resource subscriptions:**

MCP's subscription model maps naturally to `SagaInspector.subscribe`. When a client subscribes to `hexdi://saga/executions`, the MCP server translates `SagaEvent` emissions into resource update notifications, keeping the client's view of active workflows up to date in real time.

### 19.4 A2A Skill Publishing

When the application publishes an A2A Agent Card, saga introspection surfaces as a dedicated skill. Other AI agents discover this skill and can query workflow state as peers.

```json
{
  "id": "workflow-inspector",
  "name": "Workflow Inspector",
  "description": "Reports status of all running workflows, compensation history, and failure patterns. Can retry failed workflows and cancel active ones.",
  "inputModes": ["text/plain"],
  "outputModes": ["application/json", "text/plain"],
  "examples": [
    "What workflows are currently running?",
    "Which sagas have triggered compensation in the last hour?",
    "Show me the execution trace for order-123",
    "What's the success rate for the OrderProcessing saga?",
    "Retry the failed execution exec-abc-456",
    "Which sagas failed with error tag PaymentGatewayTimeout?"
  ]
}
```

The A2A skill handler maps natural language queries to `SagaInspector` method calls, returning structured JSON that the requesting agent can reason about without parsing unstructured text.

### 19.5 Diagnostic Queries

Concrete examples of what AI agents can query through MCP resources or the A2A skill, and how the saga package answers each:

**"What workflows are running?"**

- Calls `sagaInspector.getActiveExecutions()`
- Returns: list of executions with `status: "running"`, current step name, step index out of total, elapsed time, and metadata (e.g., correlation IDs)

**"Which sagas have triggered compensation in the last hour?"**

- Calls `sagaInspector.getHistory({ status: "failed", startedAfter: oneHourAgo })`
- Returns: executions that entered the compensating state, which steps triggered it, which compensations succeeded/failed, and timing

**"Why did the checkout flow fail for user-123?"**

- Calls `sagaInspector.getHistory({ sagaName: "OrderProcessing" })` filtered by metadata `userId: "user-123"`
- Then calls `sagaInspector.getTrace(executionId)` on matching executions
- Returns: step-by-step trace showing exactly which step failed, the structured error with `_tag` discriminant, how many retries were attempted, and what compensations ran

**"Which sagas failed with error tag PaymentGatewayTimeout?"**

- Calls `sagaInspector.getHistory({ status: "failed" })` and filters results where `error._tag === "PaymentGatewayTimeout"`
- Returns: all failed executions whose error `_tag` matches, grouped by saga name, with step name and cause chain for each

**"What error tags are most common for OrderProcessing?"**

- Calls `sagaInspector.getCompensationStats()` and reads `bySaga` entry for `"OrderProcessing"`
- Returns: the `errorTagDistribution` map showing counts per `_tag` (e.g., `{ "PaymentGatewayTimeout": 14, "InsufficientStock": 3 }`)

**"What's the blast radius if PaymentPort fails?"**

- Calls `sagaInspector.getDefinitions()` and filters for definitions where `portDependencies` includes `"PaymentPort"`
- Returns: all saga definitions that invoke `PaymentPort`, which steps use it, and whether those steps have compensation handlers -- enabling the agent to assess how many workflows would need compensation if the port becomes unavailable

**"What's the success rate for OrderProcessing this week?"**

- Calls `sagaInspector.getHistory({ sagaName: "OrderProcessing", startedAfter: oneWeekAgo })`
- Computes: total executions, completed vs failed, most common failure `_tag`, average duration, compensation rate

### 19.6 Full Loop Example

This section traces the VISION.md end-to-end scenario through the saga introspection layer.

**Scenario:** A user reports "order placement sometimes fails."

**Step 1 -- AI agent connects to the MCP server and discovers saga resources:**

```
Agent --> MCP: List available resources
App   --> Agent: [
  "hexdi://saga/definitions",
  "hexdi://saga/executions",
  "hexdi://saga/compensation-stats",
  "hexdi://graph/topology",
  "hexdi://tracing/recent",
  ...
]
```

**Step 2 -- Agent queries saga definitions to understand the order flow:**

```
Agent --> MCP: Read "hexdi://saga/definitions"
App   --> Agent: [{
  "name": "OrderProcessing",
  "steps": [
    { "name": "ValidateOrder", "port": "OrderValidationPort", "hasCompensation": false },
    { "name": "ReserveStock", "port": "InventoryPort", "hasCompensation": true },
    { "name": "ChargePayment", "port": "PaymentPort", "hasCompensation": true },
    { "name": "ArrangeShipping", "port": "ShippingPort", "hasCompensation": true },
    { "name": "SendConfirmation", "port": "NotificationPort", "hasCompensation": false }
  ],
  "options": { "compensationStrategy": "sequential" },
  "portDependencies": ["OrderValidationPort", "InventoryPort", "PaymentPort",
                       "ShippingPort", "NotificationPort"]
}]
```

**Step 3 -- Agent queries recent failures, filtering by error `_tag`:**

```
Agent --> MCP: Read "hexdi://saga/executions?status=failed&sagaName=OrderProcessing&last=24h"
App   --> Agent: {
  "executions": [
    {
      "executionId": "exec-abc-123",
      "status": "failed",
      "currentStepName": "ChargePayment",
      "error": {
        "_tag": "PaymentGatewayTimeout",
        "stepName": "ChargePayment",
        "causeTags": ["ConnectionTimeout"]
      },
      "compensationState": {
        "active": false,
        "compensatedSteps": ["ReserveStock"],
        "failedSteps": []
      },
      "durationMs": 5043
    },
    {
      "executionId": "exec-abc-124",
      "status": "failed",
      "currentStepName": "ChargePayment",
      "error": {
        "_tag": "PaymentGatewayTimeout",
        "stepName": "ChargePayment",
        "causeTags": ["ConnectionTimeout"]
      },
      "compensationState": {
        "active": false,
        "compensatedSteps": ["ReserveStock"],
        "failedSteps": []
      },
      "durationMs": 5112
    }
  ]
}
```

All 14 failed executions share `error._tag: "PaymentGatewayTimeout"` at the `ChargePayment` step, with an underlying `"ConnectionTimeout"` cause.

**Step 4 -- Agent queries compensation stats to assess systemic impact:**

```
Agent --> MCP: Read "hexdi://saga/compensation-stats"
App   --> Agent: {
  "totalCompensations": 14,
  "successfulCompensations": 14,
  "failedCompensations": 0,
  "averageCompensationTime": 120,
  "mostCompensatedSaga": "OrderProcessing",
  "bySaga": [{
    "sagaName": "OrderProcessing",
    "totalCompensations": 14,
    "successRate": 1.0,
    "averageCompensationTime": 120,
    "mostFailedStep": "ChargePayment",
    "errorTagDistribution": {
      "PaymentGatewayTimeout": 14
    }
  }]
}
```

**Step 5 -- Agent crosses into tracing to find root cause:**

```
Agent --> MCP: Read "hexdi://tracing/spans?port=PaymentPort&last=100"
App   --> Agent: {
  "summary": {
    "total": 100,
    "successful": 86,
    "failed": 14,
    "avg_duration_ms": 1240,
    "p99_duration_ms": 5020,
    "failure_pattern": "all failures have duration > 5000ms (timeout)",
    "error_tags": { "PaymentGatewayTimeout": 14 }
  }
}
```

**Step 6 -- Agent synthesizes the diagnosis:**

```
"The order placement failures are caused by PaymentPort timeouts.

 Analysis:
 - 14 of the last 100 payment requests timed out (>5000ms)
 - All failures carry error._tag 'PaymentGatewayTimeout' with cause 'ConnectionTimeout'
 - All failures occurred at the 'ChargePayment' step of OrderProcessing
 - The saga correctly compensated by releasing inventory each time
   (14/14 compensations succeeded, avg 120ms)
 - No data corruption -- compensation chains are healthy
 - errorTagDistribution confirms a single failure mode (no mixed errors)

 Root cause: PaymentGateway response time has degraded.
 P99 latency is 5020ms against a 5000ms timeout.

 Recommendations:
 1. Increase PaymentPort timeout to 8000ms (immediate relief)
 2. Add retry with exponential backoff to ChargePaymentStep
 3. Consider circuit breaker pattern for PaymentPort
 4. No saga changes needed -- compensations are working correctly"
```

The AI agent did not read a single source file. It queried the running application through the diagnostic port -- saga definitions, execution history, compensation stats, and tracing spans -- and got structured, truthful data directly from the system itself. The diagnosis is deterministic, not probabilistic. The structured `_tag` discriminants allowed the agent to filter and group failures programmatically rather than relying on string matching against free-form error messages.

### 19.7 Graph Suggestion Integration

When a saga adapter is registered in the `GraphBuilder`, the graph inspection system generates saga-specific `GraphSuggestion` entries. These follow the existing `GraphSuggestion` interface from `@hex-di/graph` (see `packages/graph/src/graph/types/inspection.ts`), extending the `type` discriminator with saga-specific suggestion types.

#### Saga-Specific Suggestion Types

```typescript
/** Extended suggestion types for saga adapters */
type SagaSuggestionType =
  | "saga_step_without_compensation"
  | "saga_long_timeout_without_persistence"
  | "saga_no_retry_on_external_port"
  | "saga_singleton_with_scoped_deps";
```

#### Suggestion Generation

The graph inspection system analyzes registered saga definitions and generates actionable suggestions:

**Step without compensation:**

When a saga step invokes a side-effecting port but has no compensation handler, the inspector warns that a failure in a later step will leave the system in an inconsistent state.

```typescript
// Generated when a step has no compensate handler and is not the last step
{
  type: "saga_step_without_compensation",
  portName: "OrderSaga:ReserveStock",
  message: "Step 'ReserveStock' in saga 'OrderSaga' has no compensation handler. If a later step fails, the inventory reservation will not be released.",
  action: "Add a .compensate() handler to ReserveStockStep that releases the reserved inventory."
}
```

**Long timeout without persistence:**

When a saga has a timeout exceeding a threshold (e.g., 60 seconds) but `persistent: true` is not enabled, the inspector warns that a crash during the long execution would lose all progress.

```typescript
// Generated when saga timeout > 60s and persistent !== true
{
  type: "saga_long_timeout_without_persistence",
  portName: "ApprovalSaga",
  message: "Saga 'ApprovalSaga' has a 24-hour timeout but persistence is not enabled. A process crash will lose the execution state and any completed steps cannot be resumed.",
  action: "Add .options({ persistent: true }) to the saga definition and register a SagaPersisterPort adapter."
}
```

**No retry on external port:**

When a step invokes a port tagged as external (e.g., HTTP, payment gateway) but has no retry configuration, the inspector suggests adding retries for transient failure resilience.

```typescript
// Generated when step invokes a port with category "external" or "network" and has no retry config
{
  type: "saga_no_retry_on_external_port",
  portName: "OrderSaga:ChargePayment",
  message: "Step 'ChargePayment' invokes PaymentPort (an external service) but has no retry configuration. Transient network failures will immediately trigger compensation.",
  action: "Add .retry({ maxAttempts: 3, delay: (n) => 1000 * 2 ** n }) to ChargePaymentStep for transient failure resilience."
}
```

These suggestions appear in the `GraphInspection.suggestions` array alongside existing suggestion types (`missing_adapter`, `orphan_port`, `depth_warning`, etc.) and are included in MCP resource responses, devtools views, and graph visualization exports.

---

_Next: [15 - API Reference](./15-api-reference.md)_
