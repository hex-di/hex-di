# 07 - Runtime

_Previous: [06 - Compensation](./06-compensation.md)_

---

## 10. Saga Runtime

### 10.1 SagaRunner

The **SagaRunner** is the core execution engine. It takes a saga definition and input, orchestrates step execution, handles failures with compensation, and emits events throughout the lifecycle.

```typescript
interface SagaRunner {
  execute<TSaga extends AnySagaDefinition>(
    saga: TSaga,
    input: InferSagaInput<TSaga>,
    options?: ExecuteOptions
  ): ResultAsync<SagaSuccess<InferSagaOutput<TSaga>>, SagaError<InferSagaErrors<TSaga>>>;

  resume(executionId: string): ResultAsync<SagaSuccess<unknown>, SagaError<unknown>>;

  cancel(executionId: string): Promise<void>;

  getStatus(executionId: string): Promise<SagaStatus>;

  subscribe(executionId: string, listener: SagaEventListener): Unsubscribe;
}
```

- **execute** -- begins a new saga execution, returning a typed `ResultAsync` that resolves to `Ok(SagaSuccess)` or `Err(SagaError)`
- **resume** -- resumes a previously persisted execution from its last checkpoint (from `SagaManagementExecutor`)
- **cancel** -- triggers cancellation and compensation for an in-progress execution (from `SagaManagementExecutor`)
- **getStatus** -- returns the current status of an execution (from `SagaManagementExecutor`)
- **subscribe** -- registers a listener for real-time execution events; returns an unsubscribe function

> **Relationship to port-level interfaces:** At the DI boundary, the executor is split into two ports to keep concerns separate:
>
> - `SagaExecutor<TInput, TOutput, TError>` -- the **domain port**, exposing only `execute(input: TInput): ResultAsync<SagaSuccess<TOutput>, SagaError<TError>>`
> - `SagaManagementExecutor<TOutput, TError>` -- the **management port**, exposing `resume`, `cancel`, `getStatus`, and `listExecutions`
>
> `SagaRunner` is a higher-level **runtime aggregate** that naturally combines both domain and management capabilities. Application code resolves the narrow port it needs (`SagaExecutor` for triggering sagas, `SagaManagementExecutor` for operational control), while the runtime implementation satisfies both through `SagaRunner`.

#### SagaRunner Lifetime

`SagaRunner` is a **scoped** service. Each scope gets its own runner instance that
captures the scope's resolver at construction time. This is the natural fit because:

1. **No captive dependency violations** -- a scoped runner can freely depend on scoped ports
   (request context, auth tokens, tenant IDs), which is the common case for saga execution
2. **No scope-passing anti-pattern** -- the runner resolves step ports from its own scope
   automatically, without requiring callers to pass a `Scope` via `ExecuteOptions`
3. **Consistent with saga adapter lifetime** -- saga adapters default to scoped (see §10.6),
   and the runner that powers them should match

```typescript
// Resolve from a request scope -- the runner captures the scope's resolver
const scope = container.createScope("order-request");
const saga = scope.resolve(OrderSagaPort);
// The saga adapter internally uses the runner scoped to this request
const result = await saga.execute(orderInput);
result.match(
  success => console.log("Order placed:", success.output.orderId),
  error => console.error("Order failed:", error._tag)
);
await scope.dispose();
```

For long-running or background sagas that need a dedicated scope, create a scope explicitly
and resolve the saga port from it:

```typescript
const backgroundScope = container.createScope("background-saga");
const saga = backgroundScope.resolve(OrderSagaPort);
const result = await saga.execute(input);
result.match(
  success => processOutput(success.output),
  error => handleError(error)
);
await backgroundScope.dispose();
```

```typescript
interface ExecuteOptions {
  /** Override the auto-generated execution ID */
  executionId?: string;
  /** Maximum time (ms) for the entire saga execution */
  timeout?: number;
  /** External cancellation signal (e.g., from scope disposal) */
  signal?: AbortSignal;
  /** Custom metadata attached to execution events and traces */
  metadata?: Record<string, unknown>;
}
```

- **executionId** -- when provided, uses this ID instead of generating one; useful for idempotent retries
- **timeout** -- applies to the entire saga, not individual steps (steps have their own timeout in `StepOptions`)
- **signal** -- an `AbortSignal` for external cancellation; when the signal fires, the runner cancels the currently executing step and begins compensation (see [10.5 Scope Disposal and Cancellation](#105-scope-disposal-and-cancellation))
- **metadata** -- carried through to all events and traces; useful for correlation IDs, user context, etc.

### 10.2 SagaStatus

The **SagaStatus** is a discriminated union representing every possible state of a saga execution:

```typescript
type SagaStatus =
  | {
      state: "pending";
      executionId: string;
      sagaName: string;
      createdAt: number;
    }
  | {
      state: "running";
      executionId: string;
      sagaName: string;
      currentStepIndex: number;
      currentStepName: string;
      completedSteps: ReadonlyArray<string>;
      startedAt: number;
    }
  | {
      state: "compensating";
      executionId: string;
      sagaName: string;
      failedStepName: string;
      failedStepIndex: number;
      compensatingStepIndex: number;
      compensatingStepName: string;
      compensatedSteps: ReadonlyArray<string>;
      startedAt: number;
      error: SagaError<unknown>;
    }
  | {
      state: "completed";
      executionId: string;
      sagaName: string;
      completedSteps: ReadonlyArray<string>;
      startedAt: number;
      completedAt: number;
      durationMs: number;
    }
  | {
      state: "failed";
      executionId: string;
      sagaName: string;
      error: SagaError<unknown>;
      failedStepName: string;
      compensated: boolean;
      compensatedSteps: ReadonlyArray<string>;
      startedAt: number;
      failedAt: number;
      durationMs: number;
    }
  | {
      state: "cancelled";
      executionId: string;
      sagaName: string;
      stepName: string;
      compensated: boolean;
      compensatedSteps: ReadonlyArray<string>;
      startedAt: number;
      cancelledAt: number;
    };
```

State transitions:

```
pending ──> running ──> completed
                │
                ├──> compensating ──> failed
                │
                └──> cancelled (via cancel())
```

- **pending** -- execution has been created but not yet started
- **running** -- steps are actively being executed
- **compensating** -- a step failed and compensation is in progress
- **completed** -- all steps finished successfully
- **failed** -- the saga failed; `compensated` indicates whether rollback succeeded
- **cancelled** -- the saga was explicitly cancelled via `cancel()`

### 10.3 Saga Events

The **SagaEvent** union type provides granular observability into every phase of execution:

```typescript
type SagaEvent =
  | SagaStartedEvent
  | StepStartedEvent
  | StepCompletedEvent
  | StepFailedEvent
  | StepSkippedEvent
  | CompensationStartedEvent
  | CompensationStepEvent
  | CompensationCompletedEvent
  | CompensationFailedEvent
  | SagaCompletedEvent
  | SagaFailedEvent
  | SagaCancelledEvent;
```

```typescript
interface SagaEventBase {
  readonly executionId: string;
  readonly sagaName: string;
  readonly timestamp: number;
}

interface SagaStartedEvent extends SagaEventBase {
  readonly type: "saga:started";
  readonly input: unknown;
  readonly stepCount: number;
  readonly metadata: Record<string, unknown> | undefined;
}

interface StepStartedEvent extends SagaEventBase {
  readonly type: "step:started";
  readonly stepName: string;
  readonly stepIndex: number;
}

interface StepCompletedEvent extends SagaEventBase {
  readonly type: "step:completed";
  readonly stepName: string;
  readonly stepIndex: number;
  readonly durationMs: number;
}

interface StepFailedEvent extends SagaEventBase {
  readonly type: "step:failed";
  readonly stepName: string;
  readonly stepIndex: number;
  readonly error: unknown;
  readonly retriesExhausted: boolean;
  readonly attemptCount: number;
}

interface StepSkippedEvent extends SagaEventBase {
  readonly type: "step:skipped";
  readonly stepName: string;
  readonly stepIndex: number;
  readonly reason: "condition-false";
}

interface CompensationStartedEvent extends SagaEventBase {
  readonly type: "compensation:started";
  readonly failedStepName: string;
  readonly failedStepIndex: number;
  readonly stepsToCompensate: ReadonlyArray<string>;
}

interface CompensationStepEvent extends SagaEventBase {
  readonly type: "compensation:step";
  readonly stepName: string;
  readonly stepIndex: number;
  readonly success: boolean;
  readonly error: unknown;
  readonly durationMs: number;
}

interface CompensationCompletedEvent extends SagaEventBase {
  readonly type: "compensation:completed";
  readonly compensatedSteps: ReadonlyArray<string>;
  readonly totalDurationMs: number;
}

interface CompensationFailedEvent extends SagaEventBase {
  readonly type: "compensation:failed";
  readonly failedCompensationStep: string;
  readonly error: unknown;
  readonly compensatedSteps: ReadonlyArray<string>;
  readonly remainingSteps: ReadonlyArray<string>;
}

interface SagaCompletedEvent extends SagaEventBase {
  readonly type: "saga:completed";
  readonly totalDurationMs: number;
  readonly stepsExecuted: number;
  readonly stepsSkipped: number;
}

interface SagaFailedEvent extends SagaEventBase {
  readonly type: "saga:failed";
  readonly error: unknown;
  readonly failedStepName: string;
  readonly compensated: boolean;
  readonly totalDurationMs: number;
}

interface SagaCancelledEvent extends SagaEventBase {
  readonly type: "saga:cancelled";
  readonly stepName: string;
  readonly compensated: boolean;
}
```

```typescript
type SagaEventListener = (event: SagaEvent) => void;
type Unsubscribe = () => void;
```

### 10.4 Execution Trace

The **ExecutionTrace** captures a complete snapshot of a saga execution for debugging, auditing, and persistence:

```typescript
interface ExecutionTrace {
  readonly executionId: string;
  readonly sagaName: string;
  readonly input: unknown;
  readonly status: SagaStatus["state"];
  readonly steps: ReadonlyArray<StepTrace>;
  readonly compensation: CompensationTrace | undefined;
  readonly startedAt: number;
  readonly completedAt: number | undefined;
  readonly totalDurationMs: number | undefined;
  readonly metadata: Record<string, unknown> | undefined;
}
```

```typescript
interface StepTrace {
  readonly stepName: string;
  readonly stepIndex: number;
  readonly status: "completed" | "failed" | "skipped";
  readonly startedAt: number | undefined;
  readonly completedAt: number | undefined;
  readonly durationMs: number | undefined;
  readonly attemptCount: number;
  readonly error: unknown | undefined;
  readonly skippedReason: string | undefined;
}
```

```typescript
interface CompensationTrace {
  readonly triggeredBy: string;
  readonly triggeredByIndex: number;
  readonly steps: ReadonlyArray<CompensationStepTrace>;
  readonly status: "completed" | "failed";
  readonly startedAt: number;
  readonly completedAt: number;
  readonly totalDurationMs: number;
}
```

```typescript
interface CompensationStepTrace {
  readonly stepName: string;
  readonly stepIndex: number;
  readonly success: boolean;
  readonly startedAt: number;
  readonly completedAt: number;
  readonly durationMs: number;
  readonly error: unknown | undefined;
}
```

- **ExecutionTrace** -- the top-level record; one per execution
- **StepTrace** -- one per step, including skipped steps; `attemptCount` tracks retries
- **CompensationTrace** -- present only when compensation was triggered; references the failing step
- **CompensationStepTrace** -- one per compensated step; captures individual compensation outcomes

### 10.5 Scope Disposal and Cancellation

When a saga runs within a DI scope (e.g., an HTTP request scope), the scope's disposal should gracefully cancel any in-progress saga executions. This prevents orphaned sagas from continuing after the context that spawned them has ended.

The `ExecuteOptions.signal` field accepts an `AbortSignal` for external cancellation. When the signal fires:

1. The runner stops executing further steps
2. The currently executing step is cancelled (if the underlying port supports cancellation)
3. Compensation begins for all previously completed steps, in reverse order
4. The saga transitions to the `cancelled` state and emits a `saga:cancelled` event

**Scope-aware execution:**

```typescript
// The container scope's disposal triggers the abort signal
const scopedContainer = container.createScope();
const controller = new AbortController();
scopedContainer.onDispose(() => controller.abort());

const runner = scopedContainer.resolve(SagaRunnerPort);
const result = await runner.execute(OrderSaga, orderInput, {
  signal: controller.signal,
});

result.match(
  success => sendResponse(200, success.output),
  error => {
    if (error._tag === "Cancelled") {
      sendResponse(499, { message: "Request cancelled" });
    } else {
      sendResponse(500, { message: "Saga failed", tag: error._tag });
    }
  }
);
```

When the scoped container is disposed (e.g., after the HTTP response is sent), the `AbortController` fires, which causes the runner to cancel the saga and run compensation. This ensures that resources reserved by completed steps are properly released even when the request ends prematurely.

**Combining with timeout:**

When both `timeout` and `signal` are provided, whichever fires first triggers cancellation. The runner creates an internal `AbortSignal` from the timeout and composes it with the external signal using `AbortSignal.any()`:

```typescript
const result = await runner.execute(OrderSaga, orderInput, {
  timeout: 30_000,
  signal: controller.signal,
  metadata: { requestId: "req-123" },
});

result.match(
  success => console.log("Completed:", success.executionId),
  error => console.error("Failed:", error._tag, error.stepName)
);
```

**Behaviour during compensation:**

If the signal fires while compensation is already in progress (e.g., from a previous step failure), compensation continues to completion. Compensation is never short-circuited by an abort signal -- it always runs to ensure the system returns to a consistent state.

### 10.6 Lifetime and Scope Semantics

This section clarifies how the saga runtime interacts with HexDI's lifetime model and scope hierarchy.

#### Step Instance Lifetimes

Step definitions are **stateless data structures** -- they are created once by `defineStep().build()` and reused across all saga executions. They carry no mutable state.

At runtime, each step execution resolves its port **per invocation** from the container. The resolved adapter's lifetime is governed by the port's adapter registration in the graph:

| Port Adapter Lifetime | Behavior During Saga Execution                                     |
| --------------------- | ------------------------------------------------------------------ |
| **Singleton**         | Same adapter instance shared across all saga executions and scopes |
| **Scoped**            | Adapter instance tied to the scope in which the saga is executing  |
| **Transient**         | Fresh adapter instance created for each step invocation            |

Step invoke and compensate mappers are pure functions -- they receive a `StepContext` and return port input. They are called exactly once per step execution (or once per compensation) and hold no state between calls.

#### Compensation Scope

Compensation runs **in the same scope** as the forward execution. This is a deliberate design decision:

1. **Scoped dependencies remain available** -- compensation handlers often need the same scoped services (e.g., database transactions, auth context) that were used during forward execution. Running in a different scope would require re-resolving these dependencies, which may produce different instances.

2. **Port resolution is consistent** -- the compensation handler calls the same port adapter (resolved from the same scope) as the forward invocation. This ensures the adapter can correlate the compensation call with the original operation.

3. **Scope disposal uses AbortSignal-based cancellation** -- when a scope begins disposal
   while a saga is running, the saga is cancelled through the standard `AbortSignal` mechanism
   already documented in [10.5 Scope Disposal and Cancellation](#105-scope-disposal-and-cancellation).

   The process works as follows:

   **Signal** -- The saga execution receives an `AbortSignal` tied to the scope's lifecycle.
   When `scope.dispose()` is called, the signal is aborted. The saga runtime detects the
   abort and stops executing further steps.

   **Compensation** -- The saga runtime runs compensation for all completed steps. Because
   `scope.dispose()` is an async operation (`Promise<void>`), and the caller awaits it, the
   saga execution promise (which includes compensation) must resolve before the calling code
   proceeds. The recommended pattern is to always `await` both the saga execution and scope
   disposal in a `try/finally` block (see [14.2 Scoped Execution](./10-integration.md)).

   **Finalize** -- After compensation completes, the scope's `'disposing'` and `'disposed'`
   events fire synchronously per the existing `ScopeLifecycleEmitter` contract. Scoped
   resources are released.

   This design requires **no changes to `@hex-di/runtime`**. It works entirely with the
   existing synchronous `scope.subscribe()` API and the standard `AbortSignal` pattern.

#### Disposal Protocol Implementation

```typescript
// Inside SagaRunner, when executing within a scope:
function executeInScope(
  scope: Scope,
  saga: SagaDefinition,
  input: unknown
): ResultAsync<SagaSuccess<unknown>, SagaError<unknown>> {
  const abortController = new AbortController();

  // Listen for scope disposal signal (synchronous -- no Promise return needed)
  const unsubscribe = scope.subscribe(event => {
    if (event === "disposing") {
      abortController.abort(new ScopeDisposingError());
    }
  });

  // The ResultAsync wraps the full lifecycle: forward execution,
  // cancellation detection, and compensation. When the signal fires,
  // the runner stops forward execution, runs compensation for completed
  // steps, then resolves with Err(SagaError).
  return ResultAsync.fromPromise(
    runSteps(saga, input, abortController.signal).finally(() => {
      unsubscribe();
    }),
    cause => ({
      _tag: "Cancelled" as const,
      executionId: "",
      stepName: "",
      stepIndex: 0,
      completedSteps: [],
      compensatedSteps: [],
    })
  );
}
```

The key insight is that compensation does **not** need to be awaited by the scope itself.
The saga's `execute()` ResultAsync already encompasses the full lifecycle: forward execution,
cancellation detection, and compensation. The calling code (e.g., an HTTP request handler)
awaits the saga execution in a `try` block and disposes the scope in `finally`. Because
the saga resolves (with an `Err(SagaError)` result) before `finally` runs, compensation
completes while scoped dependencies are still alive.

**Exception: resumed sagas.** When a saga is resumed from persistence (via `SagaManagementExecutor.resume()`), a new scope is created for the resumed execution. The original scope no longer exists. This means compensation during a resumed execution runs in the resume scope, not the original scope. Saga steps that depend on request-specific scoped state must ensure that the relevant context is either persisted alongside the saga state or reconstructed during resumption.

#### Captive Dependency Validation

The saga adapter participates in HexDI's captive dependency detection. A **captive dependency** occurs when a longer-lived service captures a reference to a shorter-lived one (e.g., a singleton capturing a scoped instance).

For saga adapters:

- If the saga adapter's lifetime is `"singleton"`, none of its step ports may resolve to scoped adapters
- If any step port resolves to a scoped adapter, the saga adapter must be `"scoped"` or `"transient"`
- The default lifetime of `"scoped"` is chosen specifically to avoid captive dependency violations in the common case

The `GraphBuilder` validates this at compile time through the standard captive dependency checking mechanism. If a captive dependency is detected, the error follows the `CaptiveDependencyError` pattern from `@hex-di/runtime`:

```typescript
type CaptiveSagaDependencyError<TSagaName extends string, TPortName extends string> = {
  readonly __errorBrand: "CaptiveSagaDependencyError";
  readonly __message: "Saga is registered as singleton but depends on a scoped port";
  readonly __received: { sagaName: TSagaName; portName: TPortName };
  readonly __hint: "Either change the saga adapter to scoped lifetime or ensure all step ports are singleton or transient.";
};
```

#### Execution ID Generation

Execution IDs are generated per saga invocation, not from global state. The runtime uses a scoped ID generator:

```typescript
// The runtime generates execution IDs using crypto.randomUUID()
// or accepts an explicit ID via ExecuteOptions.executionId.
// No global state or singleton registry is involved.
const result = await saga.execute(input);
// On success: result.value.executionId is unique per invocation
// On failure: result.error.executionId is unique per invocation
```

When `ExecuteOptions.executionId` is provided, the runtime uses that value instead of generating one. This enables idempotent retries where the caller provides a stable ID.

### 10.7 safeTry-Based Internal Execution Model

The saga runtime internally uses generator-based execution via `safeTry` from `@hex-di/result` to execute steps sequentially with early return on error. This model replaces imperative try/catch orchestration with a declarative, Result-aware pipeline where each step is a `ResultAsync` that short-circuits the entire saga on failure.

#### Generator Execution Flow

```typescript
function executeSteps(
  saga: SagaDefinition,
  input: unknown,
  context: ExecutionContext
): ResultAsync<SagaSuccess<unknown>, SagaError<unknown>> {
  return safeTry(async function* () {
    const accumulatedResults: Record<string, unknown> = {};

    for (const step of saga.steps) {
      // Check condition -- skip if false
      if (step.condition && !step.condition({ input, results: accumulatedResults })) {
        context.emit({ type: "step:skipped", stepName: step.name, reason: "condition-false" });
        continue;
      }

      context.emit({ type: "step:started", stepName: step.name });

      // Execute the step -- yield* awaits the ResultAsync and
      // early-returns Err(SagaError) if the step fails
      const stepResult = yield* await executeStepWithRetry(step, {
        input,
        results: accumulatedResults,
        signal: context.signal,
      });

      accumulatedResults[step.name] = stepResult;
      context.emit({ type: "step:completed", stepName: step.name });
    }

    // All steps succeeded -- apply output mapper
    const output = saga.outputMapper(accumulatedResults);
    return ok({
      output,
      executionId: context.executionId,
    });
  });
}
```

#### Step-Level Retry with safeTry

Each individual step's retry loop also uses `safeTry` internally. The retry logic wraps each attempt as a `ResultAsync`, and only the final failure (after retries are exhausted) propagates as an `Err` that triggers saga-level compensation:

```typescript
function executeStepWithRetry(
  step: StepDefinition,
  ctx: StepContext
): ResultAsync<unknown, SagaError<unknown>> {
  return safeTry(async function* () {
    let lastError: unknown;
    const maxAttempts = (step.retry?.maxAttempts ?? 0) + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0 && step.retry?.delay) {
        const delay =
          typeof step.retry.delay === "function"
            ? step.retry.delay(attempt, lastError)
            : step.retry.delay;
        yield* await ResultAsync.fromSafePromise(sleep(delay));
      }

      const result = await invokeStep(step, ctx);

      if (result.isOk()) {
        return ok(result.value);
      }

      lastError = result.error;

      // Check if error is retryable
      if (step.retry?.retryIf && !step.retry.retryIf(result.error)) {
        break; // Not retryable -- fall through to compensation
      }
    }

    // All retries exhausted -- yield the error to trigger saga-level compensation
    return err({
      _tag: "StepFailed" as const,
      cause: lastError,
      stepName: step.name,
      stepIndex: step.index,
      executionId: ctx.executionId,
      completedSteps: Object.keys(ctx.results),
      compensatedSteps: [], // Filled in by the compensation phase
    });
  });
}
```

#### Why safeTry Fits the Saga Runtime

The generator-based model is a natural fit for saga orchestration because:

1. **Sequential with early exit** -- saga steps execute sequentially, and a failure at any point must halt forward progress. `safeTry`'s `yield*` provides exactly this: unwrap `Ok` or short-circuit on `Err`.

2. **No nested try/catch** -- traditional saga runtimes use deeply nested try/catch blocks to handle step failures, retry logic, and compensation triggers. `safeTry` flattens this into a linear sequence of `yield*` expressions.

3. **Error type accumulation** -- as each `yield*` introduces a potential error type, TypeScript's generator inference accumulates the union of all error types automatically. This mirrors how `SagaError<TCause>` accumulates step error types.

4. **Composable with ResultAsync** -- each step invocation returns `ResultAsync`, which integrates seamlessly with `yield* await` inside an async `safeTry` block. No conversion layers or adapter functions are needed.

5. **Compensation as a separate phase** -- when `safeTry` short-circuits with an `Err`, the saga runtime catches that error and enters the compensation phase. The compensation logic itself can also use `safeTry` for its own sequential rollback steps.

---

## 11. Execution Lifecycle

### 11.1 Normal Execution Flow

When all steps succeed, the saga proceeds linearly from input to output:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      NORMAL EXECUTION FLOW                              │
│                                                                         │
│  execute(saga, input, options)                                          │
│       │                                                                 │
│       ▼                                                                 │
│  ┌──────────────────────┐                                               │
│  │ Generate Execution ID │  (or use options.executionId)                │
│  └──────────┬───────────┘                                               │
│             │                                                           │
│             ▼                                                           │
│  ┌──────────────────────┐                                               │
│  │  Emit saga:started   │                                               │
│  └──────────┬───────────┘                                               │
│             │                                                           │
│             ▼                                                           │
│  ┌──────────────────────┐   ┌──────────────────────┐                    │
│  │    Execute Step 1    │──▶│    Execute Step 2    │──▶  ...            │
│  │   "ValidateOrder"    │   │   "ReserveStock"     │                    │
│  │   result → results   │   │   result → results   │                    │
│  └──────────────────────┘   └──────────────────────┘                    │
│                                                          │              │
│                                                          ▼              │
│                                              ┌──────────────────────┐   │
│                                              │    Execute Step N    │   │
│                                              │   "NotifyUser"       │   │
│                                              │   result → results   │   │
│                                              └──────────┬───────────┘   │
│                                                         │               │
│                                                         ▼               │
│                                              ┌──────────────────────┐   │
│                                              │  Map results to      │   │
│                                              │  saga output via     │   │
│                                              │  outputMapper        │   │
│                                              └──────────┬───────────┘   │
│                                                         │               │
│                                                         ▼               │
│                                              ┌──────────────────────┐   │
│                                              │ Emit saga:completed  │   │
│                                              └──────────┬───────────┘   │
│                                                         │               │
│                                                         ▼               │
│                                              ┌──────────────────────┐   │
│                                              │  Ok(SagaSuccess {    │   │
│                                              │    output,           │   │
│                                              │    executionId })    │   │
│                                              └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

Step-by-step:

1. The runner generates (or accepts) an execution ID
2. Emits `saga:started` with input, step count, and metadata
3. Executes each step sequentially, accumulating results
4. For each step: emits `step:started`, executes, emits `step:completed`
5. After all steps complete, applies the `outputMapper` to produce the saga output
6. Emits `saga:completed` with timing and step count
7. Returns `Ok(SagaSuccess)` with the typed output and execution ID

### 11.2 Failure and Compensation Flow

When a step fails (after retries are exhausted), compensation runs in reverse order:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   FAILURE AND COMPENSATION FLOW                         │
│                                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                │
│  │   Step 1     │──▶│   Step 2     │──▶│   Step 3     │                │
│  │ ValidateOrder│   │ ReserveStock │   │ ChargePayment│                │
│  │     ✓        │   │     ✓        │   │     ✗ FAIL   │                │
│  └──────────────┘   └──────────────┘   └──────┬───────┘                │
│                                               │                         │
│                                               │  retries exhausted      │
│                                               ▼                         │
│                                    ┌─────────────────────┐              │
│                                    │ Emit step:failed    │              │
│                                    └────────┬────────────┘              │
│                                             │                           │
│                                             ▼                           │
│                                    ┌─────────────────────┐              │
│                                    │ Emit compensation:  │              │
│                                    │ started             │              │
│                                    │ stepsToCompensate:  │              │
│                                    │ [ReserveStock,      │              │
│                                    │  ValidateOrder]     │              │
│                                    └────────┬────────────┘              │
│                                             │                           │
│                          ┌──────────────────┘                           │
│                          │  reverse order                               │
│                          ▼                                              │
│               ┌──────────────────┐                                      │
│               │ Compensate Step 2│  Emit compensation:step              │
│               │ ReserveStock     │  (release reservation)               │
│               │     ✓            │                                      │
│               └────────┬─────────┘                                      │
│                        │                                                │
│                        ▼                                                │
│               ┌──────────────────┐                                      │
│               │ Compensate Step 1│  Emit compensation:step              │
│               │ ValidateOrder    │  (only if has compensate fn)         │
│               │     ✓            │                                      │
│               └────────┬─────────┘                                      │
│                        │                                                │
│                        ▼                                                │
│               ┌─────────────────────┐                                   │
│               │ Emit compensation:  │                                   │
│               │ completed           │                                   │
│               └────────┬────────────┘                                   │
│                        │                                                │
│                        ▼                                                │
│               ┌─────────────────────┐                                   │
│               │ Emit saga:failed    │                                   │
│               └────────┬────────────┘                                   │
│                        │                                                │
│                        ▼                                                │
│               ┌─────────────────────┐                                   │
│               │  Err(SagaError {    │                                   │
│               │    _tag:            │                                   │
│               │      "StepFailed", │                                   │
│               │    cause,           │                                   │
│               │    compensated-     │                                   │
│               │      Steps,         │                                   │
│               │    executionId })   │                                   │
│               └─────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

Step-by-step:

1. Steps 1 and 2 complete successfully; their results are accumulated
2. Step 3 fails -- retries are attempted per `StepOptions.retry`
3. After retries are exhausted, emits `step:failed`
4. Emits `compensation:started` listing steps to compensate in reverse order
5. Compensates Step 2, then Step 1 (reverse execution order)
6. Steps without a `compensate` function are skipped during compensation
7. For each compensation step, emits `compensation:step` with success/failure
8. Emits `compensation:completed` (or `compensation:failed` if a compensation step errors)
9. Emits `saga:failed` with the original error and compensation status
10. Returns `Err(SagaError)` with `_tag: "StepFailed"` and `compensatedSteps` listing all compensated steps

If compensation itself fails, the error has `_tag: "CompensationFailed"` and the `compensation:failed` event includes which steps were compensated and which remain.

### 11.3 Step Execution Details

Each individual step follows this internal execution flow:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      STEP EXECUTION DETAILS                             │
│                                                                         │
│  ┌───────────────────┐                                                  │
│  │  Check condition  │                                                  │
│  │  (if defined)     │                                                  │
│  └─────────┬─────────┘                                                  │
│            │                                                            │
│       ┌────┴────┐                                                       │
│       │         │                                                       │
│     TRUE      FALSE                                                     │
│       │         │                                                       │
│       │         ▼                                                       │
│       │    ┌─────────────────┐                                          │
│       │    │  Skip step      │                                          │
│       │    │  Emit           │                                          │
│       │    │  step:skipped   │                                          │
│       │    │  reason:        │                                          │
│       │    │  condition-false│                                          │
│       │    └────────┬────────┘                                          │
│       │             │                                                   │
│       │             ▼                                                   │
│       │      (continue to                                               │
│       │       next step)                                                │
│       │                                                                 │
│       ▼                                                                 │
│  ┌───────────────────┐                                                  │
│  │  Emit             │                                                  │
│  │  step:started     │                                                  │
│  └─────────┬─────────┘                                                  │
│            │                                                            │
│            ▼                                                            │
│  ┌───────────────────┐                                                  │
│  │  Resolve port     │  via HexDI container                             │
│  │  from container   │                                                  │
│  └─────────┬─────────┘                                                  │
│            │                                                            │
│            ▼                                                            │
│  ┌───────────────────┐                                                  │
│  │  Build params     │  invoke withParams(ctx) to                       │
│  │  from context     │  map context to port input                       │
│  └─────────┬─────────┘                                                  │
│            │                                                            │
│            ▼                                                            │
│  ┌───────────────────┐                                                  │
│  │  Invoke port      │  call the resolved adapter                       │
│  │  with params      │  with the built params                           │
│  └─────────┬─────────┘                                                  │
│            │                                                            │
│       ┌────┴────┐                                                       │
│       │         │                                                       │
│    SUCCESS    ERROR                                                     │
│       │         │                                                       │
│       ▼         ▼                                                       │
│  ┌─────────┐  ┌───────────────────┐                                     │
│  │ Store   │  │  Retry?           │                                     │
│  │ result  │  │  attempts <       │                                     │
│  │ in      │  │  maxRetries       │                                     │
│  │ accum.  │  └─────────┬─────────┘                                     │
│  │ results │       ┌────┴────┐                                          │
│  └────┬────┘       │         │                                          │
│       │          YES        NO                                          │
│       │            │         │                                          │
│       ▼            │         ▼                                          │
│  ┌─────────┐       │    ┌───────────────────┐                           │
│  │ Emit    │       │    │  Return Err        │                           │
│  │ step:   │       │    │  (triggers saga-   │                           │
│  │ completed│      │    │  level compen-     │                           │
│  └────┬────┘       │    │  sation flow)      │                           │
│       │            │    └───────────────────┘                           │
│       ▼            │                                                    │
│  (continue to      ▼                                                    │
│   next step)  (back to                                                  │
│               "Invoke port")                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

Step-by-step:

1. **Check condition** -- if the step has a `condition` function, evaluate it with the current `StepContext`
2. **Condition false** -- skip the step entirely, emit `step:skipped` with reason `"condition-false"`, and proceed to the next step; skipped steps are not compensated on failure
3. **Condition true (or no condition)** -- emit `step:started` and begin execution
4. **Resolve port** -- look up the port's adapter from the HexDI container
5. **Build params** -- call the step's `withParams(ctx)` function to map saga context to port input
6. **Invoke port** -- call the resolved adapter with the built params
7. **On success** -- store the result in `AccumulatedResults`, emit `step:completed`, move to next step
8. **On error** -- check if retries remain (per `StepOptions.retry.maxRetries`)
9. **Retries remaining** -- wait for the retry delay, then re-invoke the port
10. **No retries remaining** -- return `Err(SagaError)`, which triggers the saga-level compensation flow

---

_Next: [08 - Persistence](./08-persistence.md)_
