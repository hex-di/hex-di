---
sidebar_position: 4
title: Execution
---

# Execution

The saga runtime orchestrates step execution, manages state transitions, handles errors, and emits events throughout the saga lifecycle.

## Creating a Runner

The `createSagaRunner` factory creates a runner instance that executes sagas:

```typescript
import { createSagaRunner } from "@hex-di/saga";

const runner = createSagaRunner(portResolver, {
  persister: sagaPersister,
  tracingHook: sagaTracingHook,
  tracer: openTelemetryTracer,
  suppressGxpWarnings: false,
});
```

### Port Resolver

The port resolver provides service instances for step execution:

```typescript
const portResolver: PortResolver = async port => {
  // Resolve port to service instance
  const service = await container.resolve(port);
  if (!service) {
    throw new Error(`Port not found: ${port.name}`);
  }
  return service;
};
```

### Runner Configuration

```typescript
interface SagaRunnerConfig {
  persister?: SagaPersister; // Persistence for checkpointing
  tracingHook?: SagaTracingHook; // Distributed tracing
  tracer?: TracerLike; // OpenTelemetry tracer
  suppressGxpWarnings?: boolean; // Suppress Gxp warnings
}
```

## Executing Sagas

### Using the Runner Directly

```typescript
const result = await runner.execute(saga, input, {
  executionId: "exec-123",
  timeout: 30000,
  signal: abortController.signal,
  metadata: { userId: "user-456" },
  listeners: [eventListener],
});

if (result.isOk()) {
  console.log("Success:", result.value);
} else {
  console.error("Failed:", result.error);
}
```

### Using the Typed Wrapper

The `executeSaga` function provides better type inference:

```typescript
import { executeSaga } from "@hex-di/saga";

const result = await executeSaga(
  runner,
  OrderProcessingSaga,
  { orderId: "order-789", amount: 99.99 },
  { executionId: "exec-123" }
);
```

### Execution Options

```typescript
interface ExecuteOptions {
  executionId?: string; // Custom execution ID
  timeout?: number; // Override saga timeout (ms)
  signal?: AbortSignal; // Cancellation signal
  metadata?: Record<string, unknown>; // Execution metadata
  listeners?: SagaEventListener[]; // Event listeners
}
```

## Execution Flow

The runner executes sagas through these phases:

### 1. Initialization

```typescript
// Runner creates execution context
const execution = {
  id: executionId || generateExecutionId(),
  sagaName: saga.name,
  startedAt: new Date(),
  status: "running",
};

// Emit start event
emit({
  type: "saga:started",
  executionId: execution.id,
  sagaName: saga.name,
  input,
});
```

### 2. Input Validation

```typescript
// Run input validation if defined
if (saga.validate) {
  const validation = await saga.validate(input);
  if (validation.isErr()) {
    emit({
      type: "saga:failed",
      error: validation.error,
    });
    return err(validation.error);
  }
}
```

### 3. Step Execution

Steps execute based on their node type:

#### Sequential Steps

```typescript
for (const step of saga.steps) {
  // Write checkpoint before step
  await persister?.save(executionState);

  // Execute step
  emit({ type: "step:started", stepName: step.name });

  const result = await executeStep(step, input, accumulator);

  if (result.isOk()) {
    accumulator[step.name] = result.value;
    emit({ type: "step:completed", stepName: step.name, output: result.value });
  } else {
    emit({ type: "step:failed", stepName: step.name, error: result.error });
    // Trigger compensation
    break;
  }
}
```

#### Parallel Steps

```typescript
const promises = parallelSteps.map(step => executeStep(step, input, accumulator));

const results = await Promise.allSettled(promises);

// Collect successes and failures
for (const [index, result] of results.entries()) {
  const step = parallelSteps[index];
  if (result.status === "fulfilled" && result.value.isOk()) {
    accumulator[step.name] = result.value.value;
  } else {
    failures.push({ step, error: result.reason });
  }
}
```

#### Branch Execution

```typescript
// Evaluate branch selector
const branchKey = await selector(input, accumulator);

// Execute selected branch
const selectedSteps = branches[branchKey];
if (selectedSteps) {
  for (const step of selectedSteps) {
    // Execute branch steps
  }
}
```

#### Sub-Saga Execution

```typescript
// Map input for sub-saga
const subInput = await inputMapper(input, accumulator);

// Execute sub-saga as independent execution
const subResult = await runner.execute(subSaga, subInput);

// Add sub-saga result to accumulator
accumulator[subSaga.name] = subResult;
```

### 4. Output Mapping

```typescript
// Transform accumulated results
const output = saga.outputMapper ? saga.outputMapper(accumulator) : accumulator;

emit({
  type: "saga:completed",
  output,
  duration: Date.now() - startTime,
});
```

### 5. Compensation (on failure)

```typescript
// Build compensation plan
const plan = buildCompensationPlan(completedSteps, saga.compensationStrategy);

// Execute compensation
const compensationResult = await executeCompensation(plan, context);

emit({
  type: "compensation:completed",
  result: compensationResult,
});
```

## Event System

The saga runtime emits detailed events throughout execution:

### Event Types

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

### Subscribing to Events

```typescript
// Subscribe to specific execution
const unsubscribe = runner.subscribe(executionId, event => {
  console.log(`[${event.timestamp}] ${event.type}`, event);
});

// Clean up subscription
unsubscribe();
```

### Event Examples

```typescript
// Step completed event
{
  type: "step:completed",
  executionId: "exec-123",
  sagaName: "OrderProcessing",
  stepName: "ValidateOrder",
  stepIndex: 0,
  output: { orderId: "order-789", valid: true },
  duration: 145,
  timestamp: new Date()
}

// Compensation event
{
  type: "compensation:step",
  executionId: "exec-123",
  sagaName: "OrderProcessing",
  stepName: "ChargePayment",
  status: "success",
  duration: 523,
  timestamp: new Date()
}
```

## Execution Trace

The runner maintains detailed execution traces for debugging:

```typescript
const trace = runner.getTrace(executionId);

if (trace) {
  console.log({
    executionId: trace.executionId,
    sagaName: trace.sagaName,
    status: trace.status,
    duration: trace.duration,
    steps: trace.steps.map(step => ({
      name: step.stepName,
      status: step.status,
      duration: step.durationMs,
      attempts: step.attemptCount,
      error: step.error,
    })),
    compensation: trace.compensation,
  });
}
```

### Trace Structure

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

## Cancellation

Sagas can be cancelled using an AbortSignal:

```typescript
const controller = new AbortController();

// Start saga execution
const promise = executeSaga(runner, saga, input, { signal: controller.signal });

// Cancel after 5 seconds
setTimeout(() => {
  controller.abort("User cancelled");
}, 5000);

// Handle cancellation
const result = await promise;
if (result.isErr() && result.error.type === "cancelled") {
  console.log("Saga was cancelled");
  // Compensation will run for completed steps
}
```

## Timeouts

Sagas support both global and per-step timeouts:

```typescript
// Global timeout
const saga = defineSaga("TimedSaga")
  .options({ timeout: 60000 }) // 60 second global timeout
  .build();

// Per-step timeout
const step = defineStep({
  name: "QuickStep",
  timeout: 5000, // 5 second step timeout
  // ...
});

// Execution-level timeout override
await executeSaga(runner, saga, input, {
  timeout: 30000, // Override with 30 second timeout
});
```

Timeout handling:

1. Step timeout triggers first if set
2. Global timeout uses Promise.race with execution
3. Timeout triggers compensation for completed steps
4. TimeoutError includes execution context

## Runner Methods

The `SagaRunner` interface provides these methods:

```typescript
interface SagaRunner {
  // Execute a saga
  execute<T extends AnySagaDefinition>(
    saga: T,
    input: InferSagaInput<T>,
    options?: ExecuteOptions
  ): ResultAsync<InferSagaOutput<T>, SagaError>;

  // Resume after crash
  resume(executionId: string): ResultAsync<unknown, SagaError>;

  // Cancel running saga
  cancel(executionId: string): ResultAsync<void, SagaError>;

  // Get execution status
  getStatus(executionId: string): ResultAsync<SagaStatus, ManagementError>;

  // Subscribe to events
  subscribe(executionId: string, listener: SagaEventListener): Unsubscribe;

  // Get execution trace
  getTrace(executionId: string): ExecutionTrace | null;
}
```

## Best Practices

### Use Execution IDs

Always provide meaningful execution IDs for traceability:

```typescript
const executionId = `order-${orderId}-${Date.now()}`;

await executeSaga(runner, saga, input, { executionId });
```

### Monitor Events

Subscribe to events for observability:

```typescript
const monitor = (event: SagaEvent) => {
  // Send to monitoring service
  telemetry.track(event.type, {
    executionId: event.executionId,
    sagaName: event.sagaName,
    timestamp: event.timestamp,
  });
};

await executeSaga(runner, saga, input, {
  listeners: [monitor],
});
```

### Handle Timeouts Gracefully

Set appropriate timeouts and handle them:

```typescript
const result = await executeSaga(runner, saga, input, {
  timeout: 30000,
});

if (result.isErr() && result.error.type === "timeout") {
  // Log timeout details
  logger.error("Saga timeout", {
    executionId: result.error.executionId,
    elapsedTime: result.error.elapsedTime,
    lastStep: result.error.lastCompletedStep,
  });
}
```

### Use Traces for Debugging

Leverage execution traces for troubleshooting:

```typescript
const result = await executeSaga(runner, saga, input);

if (result.isErr()) {
  const trace = runner.getTrace(executionId);

  // Log detailed failure information
  logger.error("Saga failed", {
    trace,
    failedStep: trace?.steps.find(s => s.status === "failed"),
    totalDuration: trace?.duration,
    compensationResult: trace?.compensation,
  });
}
```

## Next Steps

- [Build Your First Saga](../guides/building-sagas) - Complete example
- [Learn about Persistence](../guides/persistence) - Checkpoint and resume
- [Explore DI Integration](../guides/di-integration) - Container integration
