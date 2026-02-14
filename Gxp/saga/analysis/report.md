# GxP Compliance Analysis Report: @hex-di/saga

**Package:** `@hex-di/saga` v0.1.0
**Scope:** `libs/saga/core/src/` (47 source files, ~7,017 lines of production code)
**Test Corpus:** 51 test files, ~44,100 lines of test code, 1,819 tests passing across 57 test files
**Analysis Date:** 2026-02-10
**Overall GxP Readiness Score:** 7.5 / 10

---

## 1. Executive Summary

The `@hex-di/saga` library provides a typed saga orchestration engine for multi-step distributed transactions with compensation, persistence, and DI container integration. It implements the saga pattern with three compensation strategies (sequential, parallel, best-effort), a checkpoint-based persistence layer for crash recovery, event-driven observability, and distributed tracing hooks.

**Key Strengths:**

- Comprehensive event-driven traceability with 12 distinct event types covering the full saga lifecycle
- Three compensation strategies with deterministic reverse-order execution
- `CompensationContext` provides full deterministic context (input, accumulated results, step result, error, failed step info)
- `structuredClone()` isolation on persistence I/O prevents external mutation of internal state
- Immutable error objects via `Object.freeze()` in all error factory functions
- Strong type-level safety via phantom types, progressive builder narrowing, and compile-time duplicate step name detection
- 1,819 tests across 51 test files with property-based compensation testing via fast-check

**Key Gaps:**

- No exactly-once execution guarantee (checkpoint race condition between step completion and persistence)
- No dead-letter queue or poison-message handling for permanently failed compensations
- Silent resume (no events emitted for replayed/skipped steps during crash recovery)
- No runtime input schema validation (relies entirely on compile-time TypeScript types)
- No authorization or access control on saga execution, cancellation, or resume operations
- No saga definition versioning mechanism
- No user/operator attribution on events or execution state

**Score Breakdown:**
| Criterion | Score | Weight |
|-----------|-------|--------|
| Data Integrity (ALCOA+) | 7.5/10 | High |
| Traceability & Audit Trail | 8.0/10 | High |
| Determinism & Reproducibility | 7.0/10 | High |
| Error Handling & Recovery | 8.0/10 | High |
| Validation & Input Verification | 5.5/10 | Medium |
| Change Control & Versioning | 6.0/10 | Medium |
| Testing & Verification | 9.0/10 | High |
| Security & Access Control | 4.0/10 | High |
| Documentation & API Clarity | 8.0/10 | Medium |
| Observability & Monitoring | 8.5/10 | Medium |

---

## 2. Package Overview

### Architecture

The library is organized into 8 modules following hexagonal architecture principles:

```
src/
  step/          - Step definition builder (defineStep -> .io() -> .invoke() -> .compensate() -> .build())
  saga/          - Saga definition builder (defineSaga -> .input() -> .step() -> .output() -> .build())
  runtime/       - Core execution engine (runner, step executor, checkpointing, compensation handler)
  compensation/  - Compensation engine (sequential, parallel, best-effort strategies)
  persistence/   - In-memory persister implementation (SagaPersister interface)
  ports/         - Port factories (SagaPort, SagaManagementPort, SagaPersisterPort)
  adapters/      - Adapter factory for wiring saga definitions to DI ports
  introspection/ - Inspector, registry, tracing hooks, suggestion engine
  integration/   - DI executor factories, inspector adapters, registry adapters
  errors/        - Tagged union error types with factory functions
```

### Dependencies

- `@hex-di/core` (workspace) - Port and DI primitives
- `@hex-di/result` (workspace) - ResultAsync/Result monadic error handling
- Dev: `@hex-di/graph`, `@hex-di/runtime`, `fast-check`, `@stryker-mutator/core`

### Key Types

```typescript
// From src/step/types.ts - Step context provided to invoke and condition mappers
interface StepContext<TInput, TAccumulated> {
  readonly input: TInput;
  readonly results: TAccumulated;
  readonly stepIndex: number;
  readonly executionId: string;
}

// From src/step/types.ts - Compensation context with full deterministic state
interface CompensationContext<TInput, TAccumulated, TStepOutput, TError> extends StepContext<
  TInput,
  TAccumulated
> {
  readonly stepResult: TStepOutput;
  readonly error: TError;
  readonly failedStepIndex: number;
  readonly failedStepName: string;
}
```

---

## 3. GxP Compliance Matrix

| ID  | Criterion                        | Status  | Score  | Notes                                                    |
| --- | -------------------------------- | ------- | ------ | -------------------------------------------------------- |
| C1  | Data Integrity - Attributability | Partial | 7/10   | executionId on all events; no user/operator attribution  |
| C2  | Data Integrity - Legibility      | Pass    | 8/10   | Discriminated union events; structured error types       |
| C3  | Data Integrity - Contemporaneity | Partial | 7/10   | Synchronous event emission; client-side timestamps only  |
| C4  | Data Integrity - Originality     | Pass    | 9/10   | structuredClone on persistence; Object.freeze on errors  |
| C5  | Data Integrity - Accuracy        | Partial | 7/10   | Type-safe composition; no runtime schema validation      |
| C6  | Traceability                     | Pass    | 8/10   | 12 event types; ExecutionTrace; silent resume gap        |
| C7  | Determinism                      | Partial | 7/10   | Deterministic compensation; no exactly-once guarantee    |
| C8  | Error Handling                   | Pass    | 8/10   | 7 error variants; 3 compensation strategies; no DLQ      |
| C9  | Validation                       | Partial | 5.5/10 | Compile-time types only; no runtime schema validation    |
| C10 | Change Control                   | Partial | 6/10   | Stable builder API; no saga versioning                   |
| C11 | Testing                          | Pass    | 9/10   | 1,819 tests; property-based; mutation testing scaffolded |
| C12 | Security                         | Fail    | 4/10   | No auth; no access control; no audit logging             |
| C13 | Documentation                    | Pass    | 8/10   | JSDoc on public API; @packageDocumentation headers       |
| C14 | Observability                    | Pass    | 8.5/10 | TracerLike hook; SagaInspector; SagaRegistry             |

---

## 4. Detailed Analysis

### 4.1 Data Integrity (ALCOA+) -- Score: 7.5/10

**Attributability (7/10):**

Every saga execution is assigned a unique `executionId` generated via timestamp + counter:

```typescript
// From src/runtime/id.ts
let counter = 0;

export function generateExecutionId(): string {
  counter += 1;
  return `exec-${Date.now()}-${counter.toString(36)}`;
}
```

All 12 event types carry `executionId`, `sagaName`, and `timestamp` via the `SagaEventBase` interface:

```typescript
// From src/runtime/types.ts
export interface SagaEventBase {
  readonly executionId: string;
  readonly sagaName: string;
  readonly timestamp: number;
}
```

Gap: No user/operator identity is captured. There is no field on `ExecuteOptions` or `SagaExecutionState` that records who initiated the saga or performed manual recovery.

**Originality (9/10):**

The in-memory persister uses `structuredClone()` on every read and write operation to prevent external mutation of internal state:

```typescript
// From src/persistence/in-memory.ts
export function createInMemoryPersister(): SagaPersister {
  const store = new Map<string, SagaExecutionState>();

  return {
    save(state: SagaExecutionState): ResultAsync<void, PersistenceError> {
      return liftResult(
        tryCatch(
          () => {
            store.set(state.executionId, structuredClone(state));
          },
          (cause): PersistenceError => ({ _tag: "SerializationFailure", cause })
        )
      );
    },

    load(executionId: string): ResultAsync<SagaExecutionState | null, PersistenceError> {
      const state = store.get(executionId);
      if (!state) {
        return ResultAsync.ok(null);
      }
      return liftResult(
        tryCatch(
          () => structuredClone(state),
          (cause): PersistenceError => ({ _tag: "StorageFailure", operation: "load", cause })
        )
      );
    },
    // ...
  };
}
```

All error objects are frozen at construction:

```typescript
// From src/errors/factories.ts
export function createStepFailedError<TCause>(
  base: SagaErrorBaseInput,
  cause: TCause
): StepFailedError<TCause> {
  return Object.freeze<StepFailedError<TCause>>({
    ...createBase(base),
    _tag: "StepFailed",
    cause,
  });
}
```

**Contemporaneity (7/10):**

Events are emitted synchronously at the moment they occur. The `emit()` function broadcasts to all listeners immediately:

```typescript
// From src/runtime/events.ts
export function emit(state: ExecutionState, event: SagaEvent): void {
  recordTrace(state, event);
  for (const listener of state.listeners) {
    tryCatch(
      () => {
        listener(event);
      },
      () => undefined
    );
  }
}
```

Gap: Timestamps use client-side `Date.now()` with no server-side clock or NTP validation. Checkpointing uses `new Date().toISOString()` which could drift if the system clock changes.

### 4.2 Traceability & Audit Trail -- Score: 8.0/10

The library emits 12 distinct event types covering the full saga lifecycle:

| Event Type               | Fields                                                          | Purpose                       |
| ------------------------ | --------------------------------------------------------------- | ----------------------------- |
| `saga:started`           | input, stepCount, metadata                                      | Saga execution initiated      |
| `step:started`           | stepName, stepIndex                                             | Forward step begins           |
| `step:completed`         | stepName, stepIndex, durationMs                                 | Forward step succeeded        |
| `step:failed`            | stepName, error, attemptCount, retriesExhausted                 | Forward step failed           |
| `step:skipped`           | stepName, reason                                                | Conditional step skipped      |
| `compensation:started`   | failedStepName, failedStepIndex, stepsToCompensate              | Compensation chain begins     |
| `compensation:step`      | stepName, success, error, durationMs                            | Individual compensation step  |
| `compensation:completed` | compensatedSteps, totalDurationMs                               | All compensations succeeded   |
| `compensation:failed`    | failedCompensationStep, error, compensatedSteps, remainingSteps | Compensation itself failed    |
| `saga:completed`         | totalDurationMs, stepsExecuted, stepsSkipped                    | Saga finished successfully    |
| `saga:failed`            | error, compensated, failedStepName, totalDurationMs             | Saga finished with failure    |
| `saga:cancelled`         | stepName, compensated                                           | Saga was explicitly cancelled |

The `ExecutionTrace` object provides a complete immutable snapshot:

```typescript
// From src/runtime/types.ts
export interface ExecutionTrace {
  readonly executionId: string;
  readonly sagaName: string;
  readonly input: unknown;
  readonly status: "pending" | "running" | "compensating" | "completed" | "failed" | "cancelled";
  readonly steps: ReadonlyArray<StepTrace>;
  readonly compensation: CompensationTrace | undefined;
  readonly startedAt: number;
  readonly completedAt: number | undefined;
  readonly totalDurationMs: number | undefined;
  readonly metadata: Record<string, unknown> | undefined;
}
```

Trace building uses `Object.freeze()` recursively to produce truly immutable snapshots:

```typescript
// From src/runtime/events.ts
export function buildExecutionTrace(state: ExecutionState): ExecutionTrace {
  return Object.freeze({
    executionId: state.executionId,
    sagaName: state.sagaName,
    input: state.input,
    status: state.status === "running" ? "running" : state.status,
    steps: Object.freeze(state.trace.stepTraces.map(s => Object.freeze({ ...s }))),
    compensation: state.trace.compensationTrace
      ? Object.freeze({
          // ... deep freeze of compensation trace
        })
      : undefined,
    startedAt: state.sagaStartTime,
    completedAt,
    totalDurationMs,
  });
}
```

Gap: When a saga is resumed from a checkpoint, steps that were already completed are silently skipped with no event emitted:

```typescript
// From src/runtime/saga-executor.ts (within executeSagaInternal)
if (stepIndex < startFromStep) {
  // Resume skips are silent replay -- no event emitted
  stepIndex++;
  continue;
}
```

### 4.3 Determinism & Reproducibility -- Score: 7.0/10

**Compensation is deterministic.** The compensation engine executes steps in deterministic reverse order (for sequential and best-effort strategies):

```typescript
// From src/compensation/engine.ts (executeSequential)
// Execute in reverse order
const reversed = [...steps].reverse();

for (let i = 0; i < reversed.length; i++) {
  const step = reversed[i];
  const ctx = buildCompensationContext(
    step,
    sagaInput,
    accumulatedResults,
    originalError,
    failedStepIndex,
    failedStepName,
    executionId
  );
  // ...
}
```

The `CompensationContext` provides all the information needed for deterministic compensation:

```typescript
// From src/compensation/engine.ts
function buildCompensationContext(
  step: CompensationPlanStep,
  sagaInput: unknown,
  accumulatedResults: Record<string, unknown>,
  originalError: unknown,
  failedStepIndex: number,
  failedStepName: string,
  executionId: string
): EngineCompensationContext {
  return {
    input: sagaInput,
    results: accumulatedResults,
    stepResult: step.result,
    error: originalError,
    failedStepIndex,
    failedStepName,
    stepIndex: step.stepIndex,
    executionId,
  };
}
```

**Resume from checkpoint** is supported via the `SagaPersister` interface. The runner reconstructs accumulated results from persisted completed steps and resumes from `currentStep`:

```typescript
// From src/runtime/runner.ts (resume method)
// Reconstruct accumulated results from completed steps
const accumulatedResults: Record<string, unknown> = {};
const completedSteps: CompletedStepInfo[] = [];
const nodes = extractNodes(saga);

for (const persisted of persistedState.completedSteps) {
  accumulatedResults[persisted.name] = persisted.output;
  const stepDef = resolveStepByName(nodes, persisted.name);
  completedSteps.push({
    stepName: persisted.name,
    stepIndex: persisted.index,
    result: persisted.output,
    step: stepDef ?? saga.steps[0],
  });
}
```

Gap: There is no exactly-once guarantee. A race condition exists between step completion and checkpoint persistence -- if the process crashes after a step completes but before the checkpoint is written, the step may be re-executed on resume.

### 4.4 Error Handling & Recovery -- Score: 8.0/10

The library uses a 7-variant tagged union for all saga errors:

```typescript
// From src/errors/types.ts
export type SagaError<TCause = unknown> =
  | StepFailedError<TCause> // Forward step failed, compensation succeeded
  | CompensationFailedError<TCause> // Compensation handler itself failed
  | TimeoutError // Step or saga exceeded timeout
  | CancelledError // Explicitly cancelled via runtime API
  | ValidationFailedError // Input validation failed
  | PortNotFoundError // DI port not registered in container
  | PersistenceFailedError; // Persistence layer failed
```

The `CompensationFailedError` variant explicitly distinguishes the original cause from the compensation cause:

```typescript
// From src/errors/types.ts
export interface CompensationFailedError<TCause = unknown> extends SagaErrorBase {
  readonly _tag: "CompensationFailed";
  readonly cause: TCause;
  readonly compensationCause: unknown;
  readonly failedCompensationSteps: readonly string[];
}
```

**Three compensation strategies** are implemented with distinct failure semantics:

| Strategy      | Order      | On Failure              | Use Case                           |
| ------------- | ---------- | ----------------------- | ---------------------------------- |
| `sequential`  | Reverse    | Stop immediately        | Ordered rollback with dependencies |
| `parallel`    | Concurrent | Collect all errors      | Independent rollback steps         |
| `best-effort` | Reverse    | Continue despite errors | Maximum cleanup attempt            |

The compensation handler builds a plan from completed steps, filtering out steps with `skipCompensation`:

```typescript
// From src/runtime/compensation-handler.ts
const compensationPlanSteps: CompensationPlanStep[] = [];
for (const completed of completedSteps) {
  if (completed.step.compensate && !completed.step.options?.skipCompensation) {
    compensationPlanSteps.push({
      stepName: completed.stepName,
      stepIndex: completed.stepIndex,
      result: completed.result,
      compensateFn: completed.step.compensate,
    });
  }
}
```

**Retry with configurable backoff** is supported per-step:

```typescript
// From src/runtime/step-executor.ts
export async function executeStepWithRetry(
  _step: AnyStepDefinition,
  params: unknown,
  portService: unknown,
  retryConfig: RetryConfig<unknown> | undefined,
  timeout: number | undefined,
  signal: AbortSignal
): Promise<Result<unknown, unknown>> {
  const maxAttempts = retryConfig ? retryConfig.maxAttempts + 1 : 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal.aborted) {
      return err(new Error("Saga cancelled"));
    }
    // ... invoke, check retry conditions, apply delay
  }
  return err(lastError);
}
```

**Timeout handling** uses `Promise.race` with proper cleanup:

```typescript
// From src/runtime/step-executor.ts
export class TimeoutSignal {
  readonly timeoutMs: number;
  constructor(timeoutMs: number) {
    this.timeoutMs = timeoutMs;
  }
}
```

**Cancellation** is supported via `AbortController`/`AbortSignal` propagation through the entire execution chain.

Gaps: No dead-letter queue concept. When compensation fails under the `sequential` strategy, remaining steps are never compensated and there is no mechanism to retry them later or escalate to an operator.

### 4.5 Validation & Input Verification -- Score: 5.5/10

**Compile-time validation is strong.** The builder API uses progressive type narrowing to enforce:

- Step input/output type compatibility
- Duplicate step name detection at the type level
- Port dependency validation via `ValidateSagaPorts` utility type

```typescript
// From src/saga/types.ts
export type HasStepName<TSteps extends readonly AnyStepDefinition[], TName extends string> =
  TName extends InferStepName<TSteps[number]> ? true : false;

export type StepNameAlreadyExistsError<TName extends string> = {
  readonly __errorBrand: "StepNameAlreadyExistsError";
  readonly __message: "Duplicate step name detected. Each step must have a unique name.";
  readonly __received: TName;
  readonly __hint: "The accumulated results map uses step names as keys, so duplicates would silently overwrite earlier results.";
};
```

```typescript
// From src/step/types.ts
export type ValidateSagaPorts<
  TSteps extends readonly AnyStepDefinition[],
  TProvided extends Port<unknown, string>,
> =
  Exclude<CollectStepPorts<TSteps>, TProvided> extends never
    ? true
    : MissingSagaStepPortsError<Exclude<CollectStepPorts<TSteps>, TProvided>>;
```

Gap: There is no runtime input schema validation. The saga runner accepts `unknown` input and passes it directly to step invoke mappers without structural validation. No JSON Schema, Zod, or io-ts integration exists.

Gap: No validation that a persisted state's `currentStep` value is within bounds of the saga definition's step count during resume.

### 4.6 Change Control & Versioning -- Score: 6.0/10

The public API surface is stable and well-defined through the builder pattern:

- `defineStep(name).io<I, O, E>().invoke(port, mapper).compensate(mapper).build()`
- `defineSaga(name).input<I>().step(s).output(mapper).options(opts).build()`

The `SagaDefinition` interface has a fixed shape with no version field:

```typescript
// From src/saga/types.ts
export interface SagaDefinition<TName, TInput, TOutput, TSteps, TErrors> {
  readonly name: TName;
  readonly steps: TSteps;
  readonly outputMapper: (results: AccumulatedResults<TSteps>) => TOutput;
  readonly options: SagaOptions;
}
```

Gap: No saga versioning mechanism exists. If a saga definition changes (steps added, removed, or reordered) while executions are in-flight or persisted, there is no way to detect the mismatch or migrate the execution state. Persisted state references `sagaName` but not a version.

### 4.7 Testing & Verification -- Score: 9.0/10

The test corpus is extensive:

| Category                  | Test Files | Coverage Area                                         |
| ------------------------- | ---------- | ----------------------------------------------------- |
| Unit: Step/Saga Builders  | 5          | `defineStep`, `defineSaga`, builder chains            |
| Unit: Compensation Engine | 3          | Sequential, parallel, best-effort strategies          |
| Unit: Runner/Runtime      | 8          | Step execution, retry, timeout, cancellation          |
| Unit: Persistence         | 2          | In-memory persister, checkpoint logic                 |
| Unit: Introspection       | 6          | Inspector, registry, tracing hook, suggestions        |
| Unit: Error Handling      | 1          | Error factories, tagged union variants                |
| Unit: Ports/Adapters      | 3          | SagaPort, SagaAdapter factories                       |
| Integration               | 9          | DI container, persistence, runtime, adapters          |
| E2E                       | 5          | Advanced patterns, compensation, persistence, runtime |
| Property-Based            | 1          | Compensation strategies via fast-check                |
| Mutation Testing          | scaffolded | Stryker configured with vitest runner                 |

Key test characteristics:

- **1,819 tests passing** across the full corpus
- **Property-based testing** for compensation via fast-check
- **Mutation testing** scaffolded with `@stryker-mutator/vitest-runner`
- **Lifecycle hooks** tested (beforeStep, afterStep, beforeCompensation, afterCompensation)
- **Cancellation** tested via AbortSignal/AbortController
- **Branch and parallel** execution tested
- **Sub-saga composition** tested

### 4.8 Security & Access Control -- Score: 4.0/10

Gap: No authorization or access control mechanisms exist:

- Any code with access to a `SagaRunner` can execute, cancel, or resume any saga
- No role-based or policy-based access control on saga operations
- No authentication of saga initiators
- `ExecuteOptions` has no `principal` or `identity` field
- `SagaManagementExecutor.cancel()` and `.resume()` accept bare execution IDs with no authorization check
- Compensation actions are invoked with the same permissions as the original step

### 4.9 Documentation & API Clarity -- Score: 8.0/10

All public modules have `@packageDocumentation` headers. Key factories include `@example` blocks:

````typescript
// From src/saga/builder.ts
/**
 * Entry point for creating saga definitions.
 *
 * @param name - Unique saga name, used for identification and tracing
 * @returns A SagaBuilder for progressive configuration
 *
 * @example
 * ```typescript
 * const OrderSaga = defineSaga("OrderSaga")
 *   .input<OrderInput>()
 *   .step(ValidateOrderStep)
 *   .step(ReserveStockStep)
 *   .step(ChargePaymentStep)
 *   .output(results => ({
 *     orderId: results.ValidateOrder.orderId,
 *     transactionId: results.ChargePayment.transactionId,
 *   }))
 *   .options({ compensationStrategy: "sequential" })
 *   .build();
 * ```
 */
export function defineSaga<TName extends string>(name: TName): SagaBuilder<TName> {
  return createSagaBuilder(name);
}
````

Internal module organization is clear: each folder has an `index.ts` barrel, a `types.ts` for interfaces, and implementation files.

### 4.10 Observability & Monitoring -- Score: 8.5/10

**Distributed tracing** is supported via the `TracerLike` interface, which is adapter-agnostic:

```typescript
// From src/introspection/types.ts
export interface TracerLike {
  pushSpan(name: string, attributes?: Record<string, string>): void;
  popSpan(status: "ok" | "error"): void;
}
```

The `SagaTracingHook` creates spans for steps and compensation:

```typescript
// From src/introspection/saga-tracing-hook.ts
const hook: SagaTracingHook = {
  onStepStart(sagaName: string, stepName: string, stepIndex: number): void {
    if (filter !== undefined && !filter(sagaName)) return;
    tracer.pushSpan(
      `saga:${sagaName}/${stepName}`,
      withScopeAttrs({
        "hex-di.saga.name": sagaName,
        "hex-di.saga.step.name": stepName,
        "hex-di.saga.step.index": String(stepIndex),
      })
    );
  },
  // ...
};
```

The **SagaInspector** provides both pull-based queries and push-based subscriptions:

```typescript
// From src/introspection/types.ts
export interface SagaInspector {
  getDefinitions(): readonly SagaDefinitionInfo[];
  getActiveExecutions(): readonly InspectorSagaExecutionSummary[];
  getHistory(filters?): ResultAsync<readonly InspectorSagaExecutionSummary[], PersistenceError>;
  getTrace(executionId: string): ExecutionTrace | null;
  getCompensationStats(): CompensationStats;
  getSuggestions(): readonly SagaSuggestion[];
  subscribe(listener: SagaEventListener): Unsubscribe;
}
```

The **SagaRegistry** tracks live executions with subscription-based notifications:

```typescript
// From src/introspection/saga-registry.ts
export function createSagaRegistry(): SagaRegistry {
  const entries = new Map<string, SagaRegistryEntry>();
  const listeners = new Set<SagaRegistryListener>();
  // ...
}
```

**MAPE-K suggestions** are generated automatically by the inspector:

```typescript
// From src/introspection/types.ts
export type SagaSuggestionType =
  | "saga_step_without_compensation"
  | "saga_long_timeout_without_persistence"
  | "saga_no_retry_on_external_port"
  | "saga_singleton_with_scoped_deps";
```

---

## 5. Code Examples (from actual source)

### 5.1 Step Definition with Compensation

```typescript
// Builder API from src/step/builder.ts
const ReserveStockStep = defineStep("ReserveStock")
  .io<{ productId: string }, { reservationId: string }>()
  .invoke(InventoryPort, ctx => ({
    action: "reserve",
    productId: ctx.input.productId,
  }))
  .compensate(ctx => ({
    action: "release",
    reservationId: ctx.stepResult.reservationId,
  }))
  .build();
```

### 5.2 Saga Definition with Branching

```typescript
// Builder API from src/saga/builder.ts
const OrderSaga = defineSaga("OrderSaga")
  .input<OrderInput>()
  .step(ValidateOrderStep)
  .step(ReserveStockStep)
  .step(ChargePaymentStep)
  .output(results => ({
    orderId: results.ValidateOrder.orderId,
    transactionId: results.ChargePayment.transactionId,
  }))
  .options({ compensationStrategy: "sequential" })
  .build();
```

### 5.3 Saga Execution with Typed Results

```typescript
// Type-safe execution helper from src/runtime/runner.ts
const result = await executeSaga(runner, OrderSaga, orderInput);
// result: Result<SagaSuccess<OrderOutput>, SagaError<OrderErrors>>
```

### 5.4 Checkpointing with Swallowed Errors

```typescript
// From src/runtime/checkpointing.ts
export async function checkpoint(
  state: ExecutionState,
  update: Partial<SagaExecutionState>
): Promise<void> {
  if (!state.persister) return;

  // Swallow persistence errors -- emit event but don't abort saga
  await state.persister
    .update(state.executionId, {
      ...update,
      timestamps: {
        startedAt: update.timestamps?.startedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: update.timestamps?.completedAt ?? null,
      },
    })
    .orTee(error => {
      emit(state, {
        type: "step:failed",
        executionId: state.executionId,
        sagaName: state.sagaName,
        stepName: "__checkpoint",
        stepIndex: -1,
        error,
        attemptCount: 1,
        timestamp: Date.now(),
        retriesExhausted: true,
      });
    });
}
```

### 5.5 Compensation Engine Entry Point

```typescript
// From src/compensation/engine.ts
export async function executeCompensation(
  input: CompensationEngineInput
): Promise<CompensationResult> {
  const stepsToCompensate = plan.completedSteps.filter(s => s.compensateFn !== null);

  if (stepsToCompensate.length === 0) {
    return {
      compensatedSteps: [],
      failedSteps: [],
      errors: [],
      allSucceeded: true,
    };
  }

  switch (plan.strategy) {
    case "sequential":
      return executeSequential(/* ... */);
    case "parallel":
      return executeParallel(/* ... */);
    case "best-effort":
      return executeBestEffort(/* ... */);
  }
}
```

### 5.6 SagaPort Factory with Brand Injection

```typescript
// From src/ports/factory.ts
export function sagaPort<TInput, TOutput, TError = never>(): <const TName extends string>(
  config: SagaPortConfig<TName>
) => SagaPort<TName, TInput, TOutput, TError> {
  return <const TName extends string>(config: SagaPortConfig<TName>) => {
    return brandAsSagaPort<TName, TInput, TOutput, TError>(
      createPort<TName, { execute: (input: TInput) => unknown }>({
        name: config.name,
        description: config.description,
        category: "saga",
      })
    );
  };
}
```

---

## 6. Edge Cases & Known Limitations

### 6.1 Checkpoint Race Condition (No Exactly-Once Guarantee)

**Severity: High**

The checkpoint is written **after** a step completes. If the process crashes between step completion and checkpoint persistence, the step will be re-executed upon resume. This breaks exactly-once semantics.

```typescript
// From src/runtime/saga-executor.ts
// Step completes, result is accumulated in memory:
accumulatedResults[step.name] = stepResult.value;
completedSteps.push({ stepName: step.name, stepIndex, result: stepResult.value, step });

// THEN checkpoint is persisted (crash here = step re-executed on resume):
await checkpoint(executionState, {
  currentStep: stepIndex + 1,
  completedSteps: completedSteps.map(toCompletedStepState),
});
```

**Impact:** Side-effecting steps (payment charges, email sends) may execute twice. Consumers must implement idempotency at the port adapter level.

### 6.2 No Dead-Letter Queue for Failed Compensations

**Severity: High**

When compensation fails under the `sequential` strategy, remaining compensation steps are abandoned. There is no mechanism to queue them for later retry or escalate to an operator.

```typescript
// From src/compensation/engine.ts (executeSequential)
if (result.isErr()) {
  failedSteps.push(step.stepName);
  errors.push({ stepName: step.stepName, stepIndex: step.stepIndex, cause: result.error });
  // Sequential strategy stops on first failure
  break;
}
```

The `best-effort` strategy continues past failures but still does not persist failed compensation attempts for later retry.

### 6.3 Silent Resume (No Events for Replayed Steps)

**Severity: Medium**

When a saga is resumed from a checkpoint, steps that were already completed are silently skipped. No `step:resumed` or `step:replayed` event is emitted, making it impossible for event listeners to distinguish a fresh execution from a resumed one.

```typescript
// From src/runtime/saga-executor.ts
if (stepIndex < startFromStep) {
  // Resume skips are silent replay -- no event emitted
  stepIndex++;
  continue;
}
```

**Impact:** Audit trail has a gap between the crash point and the resume point. Observers cannot reconstruct the full timeline of a resumed saga.

### 6.4 No Input Schema Validation

**Severity: Medium**

Saga input is typed at compile time via TypeScript generics, but there is no runtime schema validation. The runner accepts `unknown` input and forwards it to step mappers without structural checks:

```typescript
// From src/runtime/runner.ts
execute(saga, input, options) {
  // 'input' is typed as 'unknown' at runtime -- no validation
  sagaRegistry.set(saga.name, saga);
  const executionId = options?.executionId ?? generateExecutionId();
  // ...
}
```

**Impact:** Malformed input (wrong shape, missing fields, wrong types) will cause runtime errors deep within step invoke mappers rather than being caught early with a clear `ValidationFailedError`.

### 6.5 Compensation Context Leaks Full Accumulated Results

**Severity: Low-Medium**

The `CompensationContext` exposes the full `accumulatedResults` map to every compensation handler. In a multi-team environment, this means a compensation handler for step N can read the outputs of unrelated steps.

```typescript
// From src/compensation/engine.ts
const ctx = buildCompensationContext(
  step,
  sagaInput,
  accumulatedResults, // ALL results from ALL completed steps
  originalError,
  failedStepIndex,
  failedStepName,
  executionId
);
```

**Impact:** Violates the principle of least privilege. A compensation handler should ideally only see its own step's result and the saga input, not the full accumulated state.

### 6.6 Execution ID Not Cryptographically Unique

**Severity: Low-Medium**

The `generateExecutionId()` function uses `Date.now()` + an incrementing counter:

```typescript
// From src/runtime/id.ts
let counter = 0;

export function generateExecutionId(): string {
  counter += 1;
  return `exec-${Date.now()}-${counter.toString(36)}`;
}
```

In a multi-instance deployment, two processes starting at the same millisecond with the same counter value would generate the same ID. This could cause state collisions in a shared persistence store.

### 6.7 Persistence Errors are Swallowed

**Severity: Medium**

Checkpoint persistence errors are intentionally swallowed to avoid aborting the saga. The error is emitted as a `step:failed` event with a synthetic step name `__checkpoint`, but the saga continues:

```typescript
// From src/runtime/checkpointing.ts
// Swallow persistence errors -- emit event but don't abort saga
await state.persister.update(state.executionId, { ...update }).orTee(error => {
  emit(state, {
    type: "step:failed",
    executionId: state.executionId,
    sagaName: state.sagaName,
    stepName: "__checkpoint",
    stepIndex: -1,
    error,
    // ...
  });
});
```

**Impact:** A saga may complete successfully in memory but have no persisted record. If the process then crashes, the saga execution is lost and cannot be resumed or audited.

### 6.8 No Saga Definition Versioning

**Severity: Medium**

Persisted execution state references `sagaName` but not a version. If a saga definition is modified (steps added, removed, reordered) while executions are persisted, the resume logic may attempt to:

- Skip steps that no longer exist
- Resume from a step index that is out of bounds
- Reconstruct `accumulatedResults` with stale step names

There is no migration path for persisted execution state when saga definitions change.

---

## 7. Recommendations

### Tier 1: Critical (GxP Blockers)

| #   | Recommendation                                                                                                                                                                           | Impact                                              | Effort |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------ |
| R1  | **Add exactly-once semantics via write-ahead checkpoint** -- persist the step result before executing the step (or use an idempotency key pattern) to prevent double-execution on resume | Eliminates data integrity risk                      | High   |
| R2  | **Implement dead-letter persistence for failed compensations** -- persist failed compensation steps to a durable store so they can be retried later or escalated to an operator          | Prevents data loss during compensation failures     | Medium |
| R3  | **Add saga definition versioning** -- include a `version` field on `SagaDefinition` and `SagaExecutionState`; reject resume attempts when versions mismatch                              | Prevents state corruption during definition changes | Medium |

### Tier 2: Important (GxP Compliance Gaps)

| #   | Recommendation                                                                                                                                        | Impact                                                           | Effort |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------ |
| R4  | **Add runtime input schema validation** -- integrate a schema validator (Zod, io-ts) at the saga runner entry point before step execution begins      | Catches malformed input early with clear `ValidationFailedError` | Medium |
| R5  | **Emit resume events** -- add a `step:resumed` event type emitted for each step that is skipped during resume, capturing the persisted result         | Closes audit trail gap for resumed sagas                         | Low    |
| R6  | **Add user/operator attribution** -- add an optional `principal` or `initiator` field to `ExecuteOptions` and propagate to events and persisted state | Enables audit trail attribution                                  | Low    |
| R7  | **Use cryptographically random execution IDs** -- replace the timestamp+counter generator with `crypto.randomUUID()` or equivalent                    | Eliminates ID collision risk in multi-instance deployments       | Low    |

### Tier 3: Recommended (Defense in Depth)

| #   | Recommendation                                                                                                                                     | Impact                                                   | Effort                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------- | --- |
| R8  | **Add authorization hooks** -- provide a `beforeExecute` / `beforeCancel` / `beforeResume` hook point for policy-based access control              | Enables role-based saga operation control                | Medium                                        |
| R9  | **Scope compensation context** -- provide only the step's own result and saga input to each compensation handler, not the full accumulated results | Reduces information leakage surface                      | Medium                                        |
| R10 | **Make checkpoint failures configurable** -- add a `checkpointFailurePolicy` option ("swallow"                                                     | "abort"                                                  | "retry") to let consumers choose the tradeoff | Gives consumers control over persistence reliability vs. saga liveness | Low |
| R11 | **Add compensation retry** -- allow configuring retry on individual compensation steps, similar to forward step retry                              | Improves compensation reliability for transient failures | Medium                                        |
| R12 | **Validate resume state bounds** -- check that `currentStep` is within the saga's step count during resume and that step names match               | Prevents undefined behavior on stale persisted state     | Low                                           |

---

## 8. File Reference Guide

### Step System

| File                          | Purpose                                                   | Key Exports                                                           |
| ----------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| `src/step/types.ts`           | Step definition types, phantom types, inference utilities | `StepDefinition`, `StepContext`, `CompensationContext`, `RetryConfig` |
| `src/step/builder.ts`         | Fluent builder API for step construction                  | `defineStep()`                                                        |
| `src/step/builder-bridges.ts` | Type-widening bridges for builder internals               | (internal)                                                            |

### Saga System

| File                          | Purpose                                                  | Key Exports                                                        |
| ----------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| `src/saga/types.ts`           | Saga definition types, accumulated results, branch types | `SagaDefinition`, `SagaOptions`, `SagaHooks`, `AccumulatedResults` |
| `src/saga/builder.ts`         | Fluent builder API for saga construction                 | `defineSaga()`                                                     |
| `src/saga/builder-bridges.ts` | Type-widening bridges for builder internals              | (internal)                                                         |

### Runtime Engine

| File                                  | Purpose                                                                    | Key Exports                                 |
| ------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------- |
| `src/runtime/runner.ts`               | SagaRunner factory with execute/resume/cancel/subscribe                    | `createSagaRunner()`, `executeSaga()`       |
| `src/runtime/saga-executor.ts`        | Core step-by-step execution logic (sequential, parallel, branch, sub-saga) | `executeSagaInternal()`                     |
| `src/runtime/step-executor.ts`        | Individual step invocation with retry and timeout                          | `executeStepWithRetry()`, `invokePort()`    |
| `src/runtime/compensation-handler.ts` | Step failure handling, compensation plan construction                      | `handleStepFailure()`                       |
| `src/runtime/checkpointing.ts`        | Persistence checkpoint after each step                                     | `checkpoint()`                              |
| `src/runtime/events.ts`               | Event emission, trace recording, immutable trace building                  | `emit()`, `buildExecutionTrace()`           |
| `src/runtime/execution-state.ts`      | Mutable internal execution state types                                     | `ExecutionState`, `CompletedStepInfo`       |
| `src/runtime/types.ts`                | All 12 event types, SagaRunner interface, ExecutionTrace                   | `SagaEvent`, `SagaRunner`, `ExecutionTrace` |
| `src/runtime/id.ts`                   | Execution ID generator                                                     | `generateExecutionId()`                     |
| `src/runtime/runner-bridges.ts`       | Type-erasure bridge utilities                                              | (internal)                                  |
| `src/runtime/status-builder.ts`       | SagaStatus construction from execution state                               | (internal)                                  |

### Compensation Engine

| File                         | Purpose                                         | Key Exports                                                      |
| ---------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| `src/compensation/engine.ts` | Three-strategy compensation execution engine    | `executeCompensation()`                                          |
| `src/compensation/types.ts`  | Compensation plan, result, and step error types | `CompensationStrategy`, `CompensationResult`, `CompensationPlan` |

### Persistence

| File                           | Purpose                                             | Key Exports                 |
| ------------------------------ | --------------------------------------------------- | --------------------------- |
| `src/persistence/in-memory.ts` | Map-backed persister with structuredClone isolation | `createInMemoryPersister()` |

### Ports & Adapters

| File                      | Purpose                                                        | Key Exports                                               |
| ------------------------- | -------------------------------------------------------------- | --------------------------------------------------------- |
| `src/ports/factory.ts`    | SagaPort and SagaManagementPort factories with brand injection | `sagaPort()`, `sagaManagementPort()`, `SagaPersisterPort` |
| `src/ports/types.ts`      | Port types, SagaPersister interface, SagaExecutionState        | `SagaPort`, `SagaPersister`, `SagaExecutionState`         |
| `src/adapters/factory.ts` | SagaAdapter factory for DI wiring                              | `createSagaAdapter()`                                     |
| `src/adapters/types.ts`   | Adapter configuration types                                    | `SagaAdapter`, `SagaAdapterConfig`                        |

### Introspection

| File                                     | Purpose                                            | Key Exports                                                      |
| ---------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| `src/introspection/saga-inspector.ts`    | Pull/push introspection API, MAPE-K suggestions    | `createSagaInspector()`, `emitToInspector()`                     |
| `src/introspection/saga-registry.ts`     | Live execution tracking with subscription          | `createSagaRegistry()`                                           |
| `src/introspection/saga-tracing-hook.ts` | Distributed tracing span creation                  | `createSagaTracingHook()`                                        |
| `src/introspection/types.ts`             | Inspector, registry, tracing hook type definitions | `SagaInspector`, `SagaRegistry`, `TracerLike`, `SagaTracingHook` |

### Integration (DI)

| File                                   | Purpose                                                       | Key Exports                                              |
| -------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| `src/integration/executor.ts`          | Creates typed SagaExecutor/SagaManagementExecutor from runner | `createSagaExecutor()`, `createSagaManagementExecutor()` |
| `src/integration/inspector-adapter.ts` | Inspector adapter for DI container                            | `createSagaInspectorAdapter()`                           |
| `src/integration/library-inspector.ts` | Library-level inspector integration                           | `createSagaLibraryInspector()`                           |
| `src/integration/registry-adapter.ts`  | Registry adapter for DI container                             | `SagaRegistryAdapter`                                    |

### Errors

| File                      | Purpose                                                                    | Key Exports                                                        |
| ------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `src/errors/types.ts`     | 7-variant SagaError tagged union, SagaSuccess, ManagementError, SagaStatus | `SagaError`, `SagaSuccess`, `SagaStatus`                           |
| `src/errors/factories.ts` | Frozen error object factory functions                                      | `createStepFailedError()`, `createCompensationFailedError()`, etc. |

### Public API

| File           | Purpose                                                     |
| -------------- | ----------------------------------------------------------- |
| `src/index.ts` | Barrel export of all public types and functions (245 lines) |
