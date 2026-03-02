---
sidebar_position: 1
title: API Reference
---

# API Reference

Complete API documentation for the `@hex-di/saga` library.

## Steps

### defineStep

Creates a type-safe step definition.

```typescript
function defineStep<TName, TInput, TOutput, TError, TPort>(
  config: StepConfig<TName, TInput, TOutput, TError, TPort>
): StepDefinition<TName, TInput, TOutput, TError, TPort>;
```

| Parameter           | Type                                                           | Description                            |
| ------------------- | -------------------------------------------------------------- | -------------------------------------- |
| `config.name`       | `TName`                                                        | Literal string name for the step       |
| `config.port`       | `TPort`                                                        | Port dependency for service resolution |
| `config.execute`    | `(input: TInput, port: TPort) => ResultAsync<TOutput, TError>` | Step execution function                |
| `config.compensate` | `(context: CompensationContext) => ResultAsync<void, unknown>` | Optional compensation function         |
| `config.retry`      | `RetryConfig`                                                  | Optional retry configuration           |
| `config.timeout`    | `number`                                                       | Optional timeout in milliseconds       |
| `config.condition`  | `(input, results) => boolean`                                  | Optional condition for execution       |

### StepDefinition

The type returned by `defineStep`.

```typescript
interface StepDefinition<TName, TInput, TOutput, TError, TPort> {
  name: TName;
  port: TPort;
  execute: (input: TInput, port: TPort) => ResultAsync<TOutput, TError>;
  compensate?: (context: CompensationContext) => ResultAsync<void, unknown>;
  retry?: RetryConfig;
  timeout?: number;
  condition?: (input: TInput, results: any) => boolean;
}
```

### StepContext

Context available during step execution.

```typescript
interface StepContext {
  executionId: string;
  stepName: string;
  stepIndex: number;
  attemptNumber: number;
  startedAt: Date;
}
```

### CompensationContext

Context passed to compensation functions.

```typescript
interface CompensationContext<TInput, TResults, TPort> {
  input: TInput;
  results: TResults;
  originalError: unknown;
  port: TPort;
  executionId: string;
  stepName: string;
}
```

### RetryConfig

Configuration for step retry behavior.

```typescript
interface RetryConfig {
  maxAttempts: number;
  delay: number;
  backoff?: "fixed" | "linear" | "exponential";
}
```

## Sagas

### defineSaga

Creates a saga builder with progressive type safety.

```typescript
function defineSaga<TName extends string>(name: TName): SagaBuilder<TName>;
```

### SagaDefinition

The type returned by the saga builder.

```typescript
interface SagaDefinition<TName, TInput, TOutput, TSteps> {
  name: TName;
  input: TInput;
  output: TOutput;
  steps: TSteps[];
  options?: SagaOptions;
  validate?: (input: TInput) => Result<TInput, unknown>;
  version?: string;
}
```

### SagaOptions

Configuration options for saga behavior.

```typescript
interface SagaOptions {
  compensationStrategy?: "sequential" | "parallel" | "best-effort";
  persistent?: boolean;
  maxConcurrency?: number;
  timeout?: number;
  hooks?: SagaHooks;
  metadata?: Record<string, unknown>;
  checkpointPolicy?: "swallow" | "abort" | "warn";
}
```

### SagaHooks

Lifecycle hooks for saga execution.

```typescript
interface SagaHooks {
  beforeStep?: (context: StepHookContext) => Promise<void>;
  afterStep?: (context: StepHookResultContext) => Promise<void>;
  beforeCompensation?: (context: CompensationHookContext) => Promise<void>;
  afterCompensation?: (context: CompensationResultHookContext) => Promise<void>;
}
```

### AccumulatedResults

Type representing accumulated step outputs.

```typescript
type AccumulatedResults<TSteps> = {
  [K in StepName<TSteps>]: StepOutput<TSteps, K>;
};
```

## Compensation

### executeCompensation

Executes compensation for completed steps.

```typescript
function executeCompensation(
  plan: CompensationPlan,
  context: CompensationExecutionContext
): Promise<CompensationResult>;
```

### CompensationStrategy

Available compensation strategies.

```typescript
type CompensationStrategy = "sequential" | "parallel" | "best-effort";
```

### CompensationResult

Result of compensation execution.

```typescript
interface CompensationResult {
  compensatedSteps: string[];
  failedSteps: string[];
  errors: Record<string, unknown>;
  allSucceeded: boolean;
  deadLetterEntries: string[];
}
```

### CompensationPlan

Execution plan for compensation.

```typescript
interface CompensationPlan {
  steps: CompensationPlanStep[];
  strategy: CompensationStrategy;
}
```

### DeadLetterQueue

Queue for failed compensations.

```typescript
class DeadLetterQueue {
  add(entry: Omit<DeadLetterEntry, "id">): Promise<string>;
  retry(id: string, fn: () => Promise<any>): Promise<Result<any, unknown>>;
  list(filters?: DeadLetterFilters): Promise<DeadLetterEntry[]>;
  acknowledge(id: string): Promise<void>;
  size(): number;
}
```

## Runtime

### createSagaRunner

Creates a saga runner instance.

```typescript
function createSagaRunner(portResolver: PortResolver, config?: SagaRunnerConfig): SagaRunner;
```

### executeSaga

Type-safe wrapper for saga execution.

```typescript
function executeSaga<T extends AnySagaDefinition>(
  runner: SagaRunner,
  saga: T,
  input: InferSagaInput<T>,
  options?: ExecuteOptions
): ResultAsync<InferSagaOutput<T>, SagaError>;
```

### SagaRunner

Interface for saga execution and management.

```typescript
interface SagaRunner {
  execute<T>(saga: T, input: Input<T>, options?: ExecuteOptions): ResultAsync<Output<T>, SagaError>;
  resume(executionId: string): ResultAsync<unknown, SagaError>;
  cancel(executionId: string): ResultAsync<void, SagaError>;
  getStatus(executionId: string): ResultAsync<SagaStatus, ManagementError>;
  subscribe(executionId: string, listener: SagaEventListener): Unsubscribe;
  getTrace(executionId: string): ExecutionTrace | null;
}
```

### ExecuteOptions

Options for saga execution.

```typescript
interface ExecuteOptions {
  executionId?: string;
  timeout?: number;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
  listeners?: SagaEventListener[];
}
```

### SagaRunnerConfig

Configuration for saga runner.

```typescript
interface SagaRunnerConfig {
  persister?: SagaPersister;
  tracingHook?: SagaTracingHook;
  tracer?: TracerLike;
  suppressGxpWarnings?: boolean;
}
```

### PortResolver

Function to resolve port dependencies.

```typescript
type PortResolver = (port: Port<any>) => Promise<any>;
```

## Ports

### sagaPort

Creates a saga execution port.

```typescript
function sagaPort<TName, TInput, TOutput, TError>(): (
  name: TName
) => SagaPort<TName, TInput, TOutput, TError>;
```

### sagaManagementPort

Creates a saga management port.

```typescript
function sagaManagementPort<TName, TOutput, TError>(): (
  name: TName
) => SagaManagementPort<TName, TOutput, TError>;
```

### SagaExecutor

Interface for saga execution through ports.

```typescript
interface SagaExecutor<TInput, TOutput, TError> {
  execute(input: TInput): ResultAsync<TOutput, TError>;
}
```

### SagaManagementExecutor

Interface for saga management operations.

```typescript
interface SagaManagementExecutor<TOutput, TError> {
  resume(executionId: string): ResultAsync<TOutput, TError>;
  cancel(executionId: string): ResultAsync<void, TError>;
  getStatus(executionId: string): ResultAsync<SagaStatus, TError>;
  listExecutions(filters?: ExecutionFilters): ResultAsync<SagaExecutionSummary[], TError>;
}
```

### SagaPersister

Interface for saga state persistence.

```typescript
interface SagaPersister {
  save(state: SagaExecutionState): Promise<void>;
  load(executionId: string): Promise<SagaExecutionState | null>;
  delete(executionId: string): Promise<void>;
  list(filters?: PersisterFilters): Promise<SagaExecutionSummary[]>;
  update(executionId: string, updates: Partial<SagaExecutionState>): Promise<void>;
}
```

## Integration

### createSagaAdapter

Creates a unified saga adapter for DI.

```typescript
function createSagaAdapter(config: SagaAdapterConfig): Adapter;
```

### createSagaExecutor

Creates a saga executor from a definition.

```typescript
function createSagaExecutor<T extends AnySagaDefinition>(
  saga: T,
  runner: SagaRunner
): SagaExecutor<InferSagaInput<T>, InferSagaOutput<T>, InferSagaErrors<T>>;
```

### createSagaManagementExecutor

Creates a management executor.

```typescript
function createSagaManagementExecutor(
  runner: SagaRunner
): SagaManagementExecutor<unknown, ManagementError>;
```

## Introspection

### createSagaInspector

Creates an inspector for saga introspection.

```typescript
function createSagaInspector(config: SagaInspectorConfig): SagaInspector;
```

### createSagaRegistry

Creates a registry for saga definitions.

```typescript
function createSagaRegistry(): SagaRegistry;
```

### SagaInspector

Interface for saga introspection.

```typescript
interface SagaInspector {
  getDefinitions(): SagaDefinitionInfo[];
  getActiveExecutions(): InspectorSagaExecutionSummary[];
  getHistory(filters?: HistoryFilters): InspectorSagaExecutionSummary[];
  getTrace(executionId: string): ExecutionTrace | null;
  getCompensationStats(): CompensationStats;
  getSuggestions(sagaName?: string): SagaSuggestion[];
  subscribe(listener: InspectorEventListener): Unsubscribe;
}
```

### SagaSuggestion

Improvement suggestions for sagas.

```typescript
interface SagaSuggestion {
  type: SagaSuggestionType;
  sagaName: string;
  stepName?: string;
  message: string;
  severity: "info" | "warning" | "error";
}
```

## Events

### SagaEvent

Union type of all saga events.

```typescript
type SagaEvent =
  | SagaStartedEvent
  | StepStartedEvent
  | StepCompletedEvent
  | StepFailedEvent
  | StepSkippedEvent
  | StepResumedEvent
  | CompensationStartedEvent
  | CompensationStepEvent
  | CompensationCompletedEvent
  | CompensationFailedEvent
  | SagaCompletedEvent
  | SagaFailedEvent
  | SagaCancelledEvent
  | CheckpointWarningEvent;
```

Event structure example:

```typescript
interface StepCompletedEvent extends SagaEventBase {
  type: "step:completed";
  stepName: string;
  stepIndex: number;
  output: unknown;
  duration: number;
  attemptCount: number;
}
```

## Tracing

### ExecutionTrace

Complete execution trace.

```typescript
interface ExecutionTrace {
  executionId: string;
  sagaName: string;
  input: unknown;
  output?: unknown;
  status: SagaStatusType;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  steps: StepTrace[];
  compensation?: CompensationTrace;
  metadata?: Record<string, unknown>;
}
```

### StepTrace

Trace for individual step execution.

```typescript
interface StepTrace {
  stepName: string;
  stepIndex: number;
  status: "success" | "failed" | "skipped";
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  attemptCount: number;
  error?: unknown;
  output?: unknown;
}
```

### CompensationTrace

Trace for compensation execution.

```typescript
interface CompensationTrace {
  triggeredBy: string;
  startedAt: Date;
  completedAt?: Date;
  status: "success" | "partial" | "failed";
  steps: CompensationStepTrace[];
  errors: Record<string, unknown>;
  totalDurationMs?: number;
}
```

## Persistence

### createInMemoryPersister

Creates an in-memory persister for development.

```typescript
function createInMemoryPersister(config?: {
  maxEntries?: number;
  ttl?: number;
  cleanupInterval?: number;
}): SagaPersister;
```

### SagaExecutionState

Persisted execution state.

```typescript
interface SagaExecutionState {
  executionId: string;
  sagaName: string;
  sagaVersion?: string;
  input: unknown;
  currentStep: number;
  completedSteps: CompletedStepState[];
  accumulatedResults: Record<string, unknown>;
  accumulatedErrors: Record<string, unknown>;
  status: SagaStatusType;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: SerializedSagaError;
  compensation?: CompensationState;
  metadata?: Record<string, unknown>;
}
```

## Errors

### SagaError

Union type of all saga errors.

```typescript
type SagaError =
  | StepFailedError
  | CompensationFailedError
  | TimeoutError
  | CancelledError
  | ValidationFailedError
  | PortNotFoundError
  | PersistenceFailedError;
```

### SagaSuccess

Success result type.

```typescript
interface SagaSuccess<TOutput> {
  type: "success";
  output: TOutput;
  executionId: string;
  duration: number;
  completedAt: Date;
}
```

### SagaStatus

Execution status information.

```typescript
interface SagaStatus {
  executionId: string;
  sagaName: string;
  status: SagaStatusType;
  currentStep?: string;
  completedSteps: string[];
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: unknown;
}
```

## ID Generation

### generateExecutionId

Generates unique execution IDs.

```typescript
function generateExecutionId(prefix?: string): string;
```

Example: `"saga-1234567890-abc123"`
