# Technical Refinement: @hex-di/saga -- Path to 10/10 GxP Compliance

**Package:** `@hex-di/saga` v0.1.0
**Source:** `libs/saga/core/src/` (47 source files)
**Current Score:** 7.5 / 10
**Target Score:** 10.0 / 10
**Constraint:** Tracing remains OPTIONAL. Emit warning when saga executes without `TracerLike` configured. Never block execution.

---

## 1. Current Score Breakdown

| Criterion                           | Current | Target | Delta | Priority |
| ----------------------------------- | ------- | ------ | ----- | -------- |
| C1 Data Integrity - Attributability | 7/10    | 10/10  | +3    | Critical |
| C2 Data Integrity - Legibility      | 8/10    | 10/10  | +2    | Medium   |
| C3 Data Integrity - Contemporaneity | 7/10    | 10/10  | +3    | High     |
| C4 Data Integrity - Originality     | 9/10    | 10/10  | +1    | Low      |
| C5 Data Integrity - Accuracy        | 7/10    | 10/10  | +3    | Critical |
| C6 Traceability                     | 8/10    | 10/10  | +2    | High     |
| C7 Determinism                      | 7/10    | 10/10  | +3    | Critical |
| C8 Error Handling                   | 8/10    | 10/10  | +2    | High     |
| C9 Validation                       | 5.5/10  | 10/10  | +4.5  | Critical |
| C10 Change Control                  | 6/10    | 10/10  | +4    | Critical |
| C11 Testing                         | 9/10    | 10/10  | +1    | Low      |
| C12 Security                        | 4/10    | 10/10  | +6    | Critical |
| C13 Documentation                   | 8/10    | 10/10  | +2    | Medium   |
| C14 Observability                   | 8.5/10  | 10/10  | +1.5  | Medium   |

**Weighted Overall:** 7.5 -> 10.0

---

## 2. Gap Analysis

### GAP-01: No Exactly-Once Execution Guarantee (C5, C7)

**Current behavior:** In `src/runtime/saga-executor.ts` lines 483-489, the step result is accumulated in memory, then the checkpoint is persisted asynchronously on lines 86-89. If the process crashes between these two operations, the step will be re-executed on resume.

```typescript
// saga-executor.ts:483-489 -- step result stored in memory
accumulatedResults[step.name] = stepResult.value;
completedSteps.push({
  stepName: step.name,
  stepIndex,
  result: stepResult.value,
  step,
});

// saga-executor.ts:86-89 -- checkpoint written AFTER (crash gap)
await checkpoint(executionState, {
  currentStep: stepIndex + 1,
  completedSteps: completedSteps.map(toCompletedStepState),
});
```

**Impact:** Side-effecting steps (payment charges, inventory reservations) may execute twice. This is a fundamental data integrity violation under ALCOA+ accuracy requirements.

### GAP-02: No Dead-Letter Queue for Permanently Failed Compensations (C8)

**Current behavior:** In `src/compensation/engine.ts` lines 224-226, when sequential compensation fails, remaining steps are abandoned with a `break`:

```typescript
// compensation/engine.ts:224-226
// Sequential strategy stops on first failure
break;
```

The `best-effort` strategy continues past failures (lines 457-459) but does not persist failed attempts for later retry. There is no mechanism to escalate to an operator or retry later.

**Impact:** After compensation failure, the system may be in an inconsistent state with no recovery path. Failed compensations are logged in events but not durably stored for retry.

### GAP-03: Silent Resume -- No Events for Replayed Steps (C6)

**Current behavior:** In `src/runtime/saga-executor.ts` lines 67-71, steps below `startFromStep` are silently skipped:

```typescript
// saga-executor.ts:67-71
if (stepIndex < startFromStep) {
  // Resume skips are silent replay -- no event emitted
  stepIndex++;
  continue;
}
```

The same pattern repeats for parallel steps (lines 95-99), branches (lines 121-124), and sub-sagas (lines 169-172).

**Impact:** Audit trail has a gap between crash and resume. Event listeners cannot distinguish fresh execution from resumed execution. The `ExecutionTrace` for a resumed saga is incomplete -- it lacks records for steps that completed before the crash.

### GAP-04: No Runtime Input Schema Validation (C9)

**Current behavior:** In `src/runtime/runner.ts` line 59, the `execute` method accepts `unknown` input and forwards it without validation:

```typescript
// runner.ts:59
execute(saga, input, options) {
  // 'input' typed as 'unknown' -- no runtime validation
  sagaRegistry.set(saga.name, saga);
  // ...
}
```

TypeScript types are erased at runtime. Malformed input (wrong shape, missing fields, wrong types) will produce opaque runtime errors deep inside step invoke mappers.

**Impact:** Violates ALCOA+ accuracy. No early rejection with `ValidationFailedError`. The existing `ValidationFailedError` variant in `src/errors/types.ts` is only used for branch/sub-saga selector validation -- never for input validation.

### GAP-05: No Authorization/Access Control (C12)

**Current behavior:** The `SagaRunner` interface in `src/runtime/types.ts` lines 239-251 exposes `execute`, `resume`, `cancel`, `getStatus`, `subscribe`, and `getTrace` with no access control:

```typescript
// runtime/types.ts:239-251
export interface SagaRunner {
  execute(saga, input, options?): ResultAsync<...>;
  resume(executionId): ResultAsync<...>;
  cancel(executionId): ResultAsync<...>;
  getStatus(executionId): ResultAsync<...>;
  subscribe(executionId, listener): Unsubscribe;
  getTrace(executionId): ExecutionTrace | null;
}
```

Any code with a reference to the runner can execute, cancel, or resume any saga. The `ExecuteOptions` in `src/runtime/types.ts` lines 203-214 has no `principal`, `identity`, or `authorization` field:

```typescript
// runtime/types.ts:203-214
export interface ExecuteOptions {
  readonly executionId?: string;
  readonly timeout?: number;
  readonly signal?: AbortSignal;
  readonly metadata?: Record<string, unknown>;
  readonly listeners?: readonly SagaEventListener[];
}
```

**Impact:** No audit trail attribution. No role-based access control. No way to distinguish who initiated or cancelled a saga.

### GAP-06: No Compensation Timeout (C8)

**Current behavior:** The compensation engine in `src/compensation/engine.ts` runs compensation steps with no timeout mechanism. While forward steps have timeout support via `StepOptions.timeout` (step/types.ts line 69), compensation steps run until they complete or fail -- there is no time bound.

**Impact:** A hanging compensation step will block the entire saga failure path indefinitely. No timeout event is emitted, no operator escalation occurs.

### GAP-07: No Saga Definition Versioning or Migration (C10)

**Current behavior:** `SagaDefinition` in `src/saga/types.ts` lines 122-141 has no `version` field:

```typescript
// saga/types.ts:122-141
export interface SagaDefinition<TName, TInput, TOutput, TSteps, TErrors> {
  readonly name: TName;
  readonly steps: TSteps;
  readonly outputMapper: (results: AccumulatedResults<TSteps>) => TOutput;
  readonly options: SagaOptions;
}
```

`SagaExecutionState` in `src/ports/types.ts` lines 144-160 also has no `version` or `sagaVersion` field:

```typescript
// ports/types.ts:144-160
export interface SagaExecutionState {
  readonly executionId: string;
  readonly sagaName: string;
  // ... no version field
}
```

**Impact:** If saga definitions change (steps added/removed/reordered) while executions are persisted, the `resume` method in `runner.ts:146-256` will attempt to reconstruct state with mismatched step names/indices. The fallback on line 215 silently uses the wrong step definition:

```typescript
// runner.ts:215
step: stepDef ?? saga.steps[0], // fallback to first step if not found
```

### GAP-08: Compensation Idempotency Not Verified (C5, C7)

**Current behavior:** Compensation handlers are invoked without any idempotency key or deduplication mechanism. If a saga is resumed after a crash during compensation (status `"compensating"`), there is no protection against re-executing compensation steps that already completed.

The `CompensationState` in `src/ports/types.ts` lines 125-133 tracks `compensatedSteps` as string names, but this is not used by the resume path to skip already-compensated steps.

**Impact:** Compensation actions (refunds, releases) may execute multiple times, causing over-refunds or double-releases.

### GAP-09: Execution ID Generation Collides Under Multi-Instance (C1, C7)

**Current behavior:** `src/runtime/id.ts` lines 9-18:

```typescript
// id.ts:9-18
let counter = 0;

export function generateExecutionId(): string {
  counter += 1;
  return `exec-${Date.now()}-${counter.toString(36)}`;
}
```

Module-level `counter` resets to 0 on process start. Two separate processes starting in the same millisecond will generate identical execution IDs (`exec-1707580800000-1`). The `Date.now()` component provides only millisecond granularity.

**Impact:** In multi-instance deployments sharing a persistence store, execution ID collisions cause state overwrites and data loss.

### GAP-10: Checkpoint Errors Swallowed -- Persistence Failures Do Not Abort Saga (C5)

**Current behavior:** `src/runtime/checkpointing.ts` lines 33-62:

```typescript
// checkpointing.ts:39-61
await state.persister.update(state.executionId, { ...update }).orTee(error => {
  emit(state, {
    type: "step:failed",
    stepName: "__checkpoint",
    stepIndex: -1,
    error,
    // ...
  });
});
```

The `orTee` handler emits a synthetic `step:failed` event with `stepName: "__checkpoint"` and `stepIndex: -1`, but the saga continues executing. The `checkpoint` function returns `Promise<void>` -- it never returns an error.

**Impact:** A saga can complete successfully in memory but have no persisted record. If the process crashes after, the execution is lost. This directly violates data integrity requirements for durable audit trails.

### GAP-11: No User/Operator Attribution on Events (C1, C12)

**Current behavior:** `SagaEventBase` in `src/runtime/types.ts` lines 17-21 carries `executionId`, `sagaName`, and `timestamp` but no `principal`, `initiator`, or `userId`:

```typescript
// runtime/types.ts:17-21
export interface SagaEventBase {
  readonly executionId: string;
  readonly sagaName: string;
  readonly timestamp: number;
}
```

Events are broadcast by `emit()` in `src/runtime/events.ts` line 19 with no identity enrichment.

**Impact:** Audit trail cannot answer "who initiated this saga?" or "who cancelled this execution?". This is a fundamental ALCOA+ attributability gap.

### GAP-12: No Resume State Bounds Validation (C7, C9)

**Current behavior:** In `src/runtime/runner.ts` lines 242-252, the `resume` method uses `persistedState.currentStep` as `startFromStep` without validating it against the saga definition's step count:

```typescript
// runner.ts:242-252
const startFromStep = persistedState.currentStep;

return executeSagaInternal(
  saga,
  persistedState.input,
  resolver,
  state,
  undefined,
  abortController.signal,
  startFromStep // no bounds check
);
```

**Impact:** If `currentStep` exceeds the saga's step count (due to a definition change or state corruption), the executor will skip the entire `for` loop and produce a "successful" result from stale accumulated results, silently corrupting the output.

---

## 3. Required Changes (Exact Files, Code, Rationale)

### CHANGE-01: Write-Ahead Checkpoint for Exactly-Once Semantics

**Files:**

- `src/runtime/saga-executor.ts` -- Checkpoint BEFORE step execution, update AFTER
- `src/runtime/checkpointing.ts` -- Add `checkpointBeforeStep()` function
- `src/ports/types.ts` -- Add `pendingStep` field to `SagaExecutionState`

**Rationale:** Persist the _intent_ to execute a step before executing it. On resume, if `pendingStep` is set and its result is not in `completedSteps`, the saga knows the step either did not execute or crashed mid-execution. The consumer can then use idempotency keys at the adapter level to safely retry.

**Changes to `src/ports/types.ts`:**

Add to `SagaExecutionState`:

```typescript
export interface SagaExecutionState {
  // ... existing fields ...
  /** Step currently being executed (write-ahead). null when between steps. */
  readonly pendingStep: { readonly name: string; readonly index: number } | null;
}
```

**Changes to `src/runtime/checkpointing.ts`:**

Add a new function:

```typescript
export async function checkpointBeforeStep(
  state: ExecutionState,
  stepName: string,
  stepIndex: number,
  policy: CheckpointFailurePolicy
): Promise<CheckpointResult> {
  if (!state.persister) return { persisted: false };

  const result = await state.persister.update(state.executionId, {
    pendingStep: { name: stepName, index: stepIndex },
    timestamps: {
      startedAt: state.timestamps?.startedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    },
  });

  return result.match(
    () => ({ persisted: true }),
    error => {
      emit(state, {
        type: "step:failed",
        executionId: state.executionId,
        sagaName: state.sagaName,
        stepName: "__checkpoint_before",
        stepIndex,
        error,
        attemptCount: 1,
        timestamp: Date.now(),
        retriesExhausted: true,
      });

      if (policy === "abort") {
        return { persisted: false, abortError: error };
      }
      return { persisted: false };
    }
  );
}
```

**Changes to `src/runtime/saga-executor.ts`:**

Before calling `executeStepNode()`, call `checkpointBeforeStep()`. After step success, the existing `checkpoint()` call clears `pendingStep: null` and records the completed step:

```typescript
// Before step execution:
await checkpointBeforeStep(executionState, step.name, stepIndex, checkpointPolicy);

// Execute step:
const result = await executeStepNode(step, stepIndex, resolver, executionState, signal);

// After success, existing checkpoint call adds:
await checkpoint(executionState, {
  currentStep: stepIndex + 1,
  pendingStep: null,
  completedSteps: completedSteps.map(toCompletedStepState),
});
```

### CHANGE-02: Dead-Letter Queue for Failed Compensations

**Files:**

- `src/compensation/types.ts` -- Add `DeadLetterEntry` type
- `src/compensation/engine.ts` -- Collect DLQ entries from failed compensations
- `src/runtime/compensation-handler.ts` -- Persist DLQ entries via persister
- `src/ports/types.ts` -- Add `deadLetterQueue` field to `CompensationState`

**Rationale:** When compensation fails (under any strategy), the failed compensation step and its context must be durably stored so it can be retried later by an operator or automated process.

**New type in `src/compensation/types.ts`:**

```typescript
export interface DeadLetterEntry {
  readonly executionId: string;
  readonly sagaName: string;
  readonly stepName: string;
  readonly stepIndex: number;
  readonly compensationParams: unknown;
  readonly error: unknown;
  readonly failedAt: string;
  readonly retryCount: number;
}
```

**Changes to `src/compensation/types.ts` -- `CompensationResult`:**

```typescript
export interface CompensationResult {
  readonly compensatedSteps: readonly string[];
  readonly failedSteps: readonly string[];
  readonly errors: readonly CompensationStepError[];
  readonly allSucceeded: boolean;
  /** Dead-letter entries for failed compensations that need retry */
  readonly deadLetterEntries: readonly DeadLetterEntry[];
}
```

**Changes to `src/compensation/engine.ts`:**

In `executeSequential`, `executeParallel`, and `executeBestEffort`, when a compensation step fails, construct a `DeadLetterEntry` alongside the error:

```typescript
// In executeSequential, when result.isErr():
deadLetterEntries.push({
  executionId,
  sagaName,
  stepName: step.stepName,
  stepIndex: step.stepIndex,
  compensationParams: paramsResult.value,
  error: result.error,
  failedAt: new Date().toISOString(),
  retryCount: 0,
});
```

For sequential strategy, also add entries for remaining (unattempted) steps:

```typescript
const remaining = reversed.slice(i + 1);
for (const remainingStep of remaining) {
  const remainingCtx = buildCompensationContext(remainingStep, ...);
  const remainingParams = buildCompensationParams(remainingStep, remainingCtx);
  deadLetterEntries.push({
    executionId,
    sagaName,
    stepName: remainingStep.stepName,
    stepIndex: remainingStep.stepIndex,
    compensationParams: remainingParams.isOk() ? remainingParams.value : undefined,
    error: "Skipped due to prior compensation failure",
    failedAt: new Date().toISOString(),
    retryCount: 0,
  });
}
```

**Changes to `src/ports/types.ts` -- `CompensationState`:**

```typescript
export interface CompensationState {
  // ... existing fields ...
  /** Dead-letter entries for failed compensations */
  readonly deadLetterQueue?: readonly DeadLetterEntry[];
}
```

**Changes to `src/runtime/compensation-handler.ts`:**

After `executeCompensation()` returns, persist DLQ entries to checkpoint:

```typescript
await checkpoint(executionState, {
  status: "failed",
  compensation: {
    active: false,
    compensatedSteps: compensationResult.compensatedSteps,
    failedSteps: compensationResult.failedSteps,
    triggeringStepIndex: failedStepIndex,
    deadLetterQueue: compensationResult.deadLetterEntries,
    // ... existing timestamp fields
  },
});
```

### CHANGE-03: Emit Resume Events for Replayed Steps

**Files:**

- `src/runtime/types.ts` -- Add `StepResumedEvent` type
- `src/runtime/saga-executor.ts` -- Emit `step:resumed` for each skipped step
- `src/runtime/events.ts` -- Handle `step:resumed` in trace recording

**Rationale:** Audit trail must be continuous. When a saga resumes, every previously-completed step must produce an event that observers can use to reconstruct the full execution timeline.

**New event type in `src/runtime/types.ts`:**

```typescript
export interface StepResumedEvent extends SagaEventBase {
  readonly type: "step:resumed";
  readonly stepName: string;
  readonly stepIndex: number;
  /** The persisted output from the original execution */
  readonly persistedOutput: unknown;
  /** ISO timestamp when the step originally completed */
  readonly originalCompletedAt: string;
}
```

Add to `SagaEvent` union:

```typescript
export type SagaEvent =
  | SagaStartedEvent
  | StepStartedEvent
  | StepCompletedEvent
  | StepFailedEvent
  | StepSkippedEvent
  | StepResumedEvent // NEW
  | CompensationStartedEvent;
// ... rest
```

**Changes to `src/runtime/saga-executor.ts`:**

Replace the silent skip with event emission:

```typescript
if (stepIndex < startFromStep) {
  const persistedStep = executionState.completedSteps.find(s => s.stepIndex === stepIndex);
  emit(executionState, {
    type: "step:resumed",
    executionId,
    sagaName,
    stepName: persistedStep?.stepName ?? `step-${stepIndex}`,
    stepIndex,
    persistedOutput: persistedStep?.result,
    originalCompletedAt: "", // populated from persisted state if available
    timestamp: Date.now(),
  });
  stepIndex++;
  continue;
}
```

**Changes to `src/runtime/events.ts`:**

Add trace recording for the new event:

```typescript
case "step:resumed": {
  state.trace.stepTraces.push({
    stepName: event.stepName,
    stepIndex: event.stepIndex,
    status: "completed",
    startedAt: undefined,
    completedAt: event.timestamp,
    durationMs: undefined,
    attemptCount: 0,
    error: undefined,
    skippedReason: "resumed-from-checkpoint",
  });
  break;
}
```

### CHANGE-04: Runtime Input Schema Validation

**Files:**

- `src/saga/types.ts` -- Add optional `inputSchema` to `SagaOptions`
- `src/saga/builder.ts` -- Add `.validate()` builder method
- `src/runtime/runner.ts` -- Validate input before execution
- `src/runtime/saga-executor.ts` -- Check for validator before step loop

**Rationale:** Catch malformed input at the saga boundary with a clear `ValidationFailedError` instead of letting it propagate to opaque runtime errors inside step invoke mappers.

**Changes to `src/saga/types.ts`:**

```typescript
/** Schema validator function. Returns undefined on success, or a descriptive error on failure. */
export type SagaInputValidator<TInput> = (input: TInput) => string | undefined;

export interface SagaOptions {
  // ... existing fields ...
  /** Runtime input schema validator. Called before any step executes. */
  readonly inputValidator?: SagaInputValidator<unknown>;
}
```

**Changes to `src/saga/builder.ts`:**

Add `.validate()` method to `SagaBuilderWithInput`:

```typescript
interface SagaBuilderWithInput<TName, TInput, TSteps, TErrors> {
  // ... existing methods ...
  validate(
    validator: SagaInputValidator<TInput>
  ): SagaBuilderWithInput<TName, TInput, TSteps, TErrors>;
}
```

Implementation stores the validator in `sagaOptions.inputValidator`.

**Changes to `src/runtime/runner.ts`:**

In the `execute` method, before calling `executeSagaInternal`:

```typescript
// Validate input if schema validator is configured
const inputValidator = saga.options.inputValidator;
if (inputValidator) {
  const validationError = inputValidator(input);
  if (validationError !== undefined) {
    return ResultAsync.err(
      createValidationFailedError(
        {
          executionId,
          sagaName: saga.name,
          stepName: "",
          stepIndex: -1,
          message: `Input validation failed: ${validationError}`,
          completedSteps: [],
          compensatedSteps: [],
        },
        new Error(validationError)
      )
    );
  }
}
```

### CHANGE-05: Authorization Hooks

**Files:**

- `src/runtime/types.ts` -- Add `SagaPrincipal`, `AuthorizationHook` types, update `ExecuteOptions`
- `src/runtime/runner.ts` -- Call authorization hooks before execute/resume/cancel
- `src/runtime/events.ts` -- Propagate principal to events
- `src/runtime/execution-state.ts` -- Add `principal` to `ExecutionState`
- `src/errors/types.ts` -- Add `AuthorizationFailedError` variant

**Rationale:** GxP requires attributability and access control. Every saga operation must be attributable to a principal (human user, service account, or system process).

**New types in `src/runtime/types.ts`:**

```typescript
export interface SagaPrincipal {
  /** Unique identifier for the operator (user ID, service account, etc.) */
  readonly id: string;
  /** Human-readable name for audit trail */
  readonly name: string;
  /** Roles or permissions held by this principal */
  readonly roles?: readonly string[];
  /** Additional attributes for authorization decisions */
  readonly attributes?: Readonly<Record<string, unknown>>;
}

export type SagaOperation = "execute" | "resume" | "cancel" | "getStatus" | "getTrace";

export interface AuthorizationHook {
  authorize(
    principal: SagaPrincipal,
    operation: SagaOperation,
    sagaName: string,
    executionId: string | undefined
  ): boolean;
}
```

**Changes to `src/runtime/types.ts` -- `ExecuteOptions`:**

```typescript
export interface ExecuteOptions {
  // ... existing fields ...
  /** Principal initiating this execution (required for GxP audit trail) */
  readonly principal?: SagaPrincipal;
}
```

**Changes to `src/runtime/types.ts` -- `SagaRunnerConfig`:**

```typescript
export interface SagaRunnerConfig {
  // ... existing fields ...
  /** Authorization hook for policy-based access control */
  readonly authorizationHook?: AuthorizationHook;
}
```

**Changes to `src/runtime/types.ts` -- `SagaEventBase`:**

```typescript
export interface SagaEventBase {
  readonly executionId: string;
  readonly sagaName: string;
  readonly timestamp: number;
  /** Principal who initiated the saga (undefined if not configured) */
  readonly principal?: SagaPrincipal;
}
```

**New error variant in `src/errors/types.ts`:**

```typescript
export interface AuthorizationFailedError extends SagaErrorBase {
  readonly _tag: "AuthorizationFailed";
  readonly principal: SagaPrincipal;
  readonly operation: string;
}
```

Add to `SagaError` union.

**Changes to `src/runtime/runner.ts`:**

In `execute`, `resume`, and `cancel`, check authorization:

```typescript
// In execute():
if (config?.authorizationHook && options?.principal) {
  const authorized = config.authorizationHook.authorize(
    options.principal,
    "execute",
    saga.name,
    executionId
  );
  if (!authorized) {
    return ResultAsync.err(
      createAuthorizationFailedError(
        { executionId, sagaName: saga.name, stepName: "", stepIndex: -1, ... },
        options.principal,
        "execute"
      )
    );
  }
}
```

**Changes to `src/runtime/execution-state.ts`:**

```typescript
export interface ExecutionState {
  // ... existing fields ...
  readonly principal?: SagaPrincipal;
}
```

### CHANGE-06: Compensation Timeout

**Files:**

- `src/compensation/types.ts` -- Add `compensationTimeout` to `CompensationPlan`
- `src/compensation/engine.ts` -- Wrap compensation execution with timeout
- `src/saga/types.ts` -- Add `compensationTimeout` to `SagaOptions`

**Rationale:** A hanging compensation step can block the failure path indefinitely. A configurable timeout ensures compensation completes within a bounded time, after which remaining steps go to the dead-letter queue.

**Changes to `src/saga/types.ts`:**

```typescript
export interface SagaOptions {
  // ... existing fields ...
  /** Maximum time (ms) for the entire compensation chain. Default: no limit. */
  readonly compensationTimeout?: number;
}
```

**Changes to `src/compensation/engine.ts`:**

Wrap the entire compensation execution with a `Promise.race` against a timeout. When timeout fires, treat remaining steps as dead-letter entries:

```typescript
export async function executeCompensation(
  input: CompensationEngineInput
): Promise<CompensationResult> {
  const { plan, compensationTimeout } = input;
  // ... existing plan filtering ...

  const execute = async (): Promise<CompensationResult> => {
    switch (plan.strategy) {
      case "sequential":
        return executeSequential(/* ... */);
      case "parallel":
        return executeParallel(/* ... */);
      case "best-effort":
        return executeBestEffort(/* ... */);
    }
  };

  if (compensationTimeout !== undefined && compensationTimeout > 0) {
    return Promise.race([
      execute(),
      compensationTimeoutResult(compensationTimeout, stepsToCompensate, input),
    ]);
  }

  return execute();
}
```

### CHANGE-07: Saga Definition Versioning

**Files:**

- `src/saga/types.ts` -- Add `version` to `SagaDefinition`
- `src/saga/builder.ts` -- Add `.version()` to builder chain
- `src/ports/types.ts` -- Add `sagaVersion` to `SagaExecutionState`
- `src/runtime/runner.ts` -- Validate version on resume, persist version on execute

**Rationale:** Saga definitions may change between process deployments. Persisted executions must be validated against the current definition before resume.

**Changes to `src/saga/types.ts`:**

```typescript
export interface SagaDefinition<TName, TInput, TOutput, TSteps, TErrors> {
  // ... existing fields ...
  /** Saga definition version. Used to detect mismatches during resume. */
  readonly version: string;
  /** Step fingerprint: ordered list of step names + count. Used for structural validation. */
  readonly stepFingerprint: string;
}
```

`stepFingerprint` is computed at build time as a deterministic hash of step names and count: `sha256(stepNames.join("|") + "|" + stepCount)`. For simplicity without crypto deps, a simpler scheme works:

```typescript
readonly stepFingerprint: string; // e.g. "ValidateOrder|ReserveStock|ChargePayment:3"
```

**Changes to `src/saga/builder.ts`:**

Add `.version()` method:

```typescript
interface SagaBuilderWithOutput<...> {
  version(v: string): SagaBuilderWithOutput<...>;
  // ... existing
}
```

`build()` computes `stepFingerprint` from `state.steps`:

```typescript
build() {
  const stepFingerprint = state.steps.map(s => s.name).join("|") + ":" + state.steps.length;
  return buildSagaDefinition<...>(state, stepFingerprint);
}
```

**Changes to `src/ports/types.ts`:**

```typescript
export interface SagaExecutionState {
  // ... existing fields ...
  /** Version of the saga definition that created this execution */
  readonly sagaVersion?: string;
  /** Step fingerprint at the time of execution */
  readonly stepFingerprint?: string;
}
```

**Changes to `src/runtime/runner.ts`:**

In `resume()`, after loading persisted state and looking up the saga:

```typescript
// Validate version compatibility
if (persistedState.sagaVersion && saga.version !== persistedState.sagaVersion) {
  return err<SagaError<unknown>>({
    _tag: "ValidationFailed",
    executionId,
    sagaName: persistedState.sagaName,
    stepName: "",
    stepIndex: -1,
    message: `Saga version mismatch: persisted=${persistedState.sagaVersion}, current=${saga.version}`,
    completedSteps: [],
    compensatedSteps: [],
    cause: new Error("Version mismatch prevents safe resume"),
  });
}

// Validate step fingerprint
if (persistedState.stepFingerprint && saga.stepFingerprint !== persistedState.stepFingerprint) {
  return err<SagaError<unknown>>({
    _tag: "ValidationFailed",
    executionId,
    sagaName: persistedState.sagaName,
    stepName: "",
    stepIndex: -1,
    message: `Saga step structure changed since execution was persisted`,
    completedSteps: [],
    compensatedSteps: [],
    cause: new Error("Step fingerprint mismatch"),
  });
}
```

In `execute()`, persist version in initial state:

```typescript
const initialState: SagaExecutionState = {
  // ... existing fields ...
  sagaVersion: saga.version,
  stepFingerprint: saga.stepFingerprint,
};
```

### CHANGE-08: Cryptographically Unique Execution IDs

**Files:**

- `src/runtime/id.ts` -- Replace timestamp+counter with `crypto.randomUUID()`

**Rationale:** Eliminate collision risk in multi-instance deployments. `crypto.randomUUID()` generates RFC 4122 v4 UUIDs (122 bits of entropy) and is available in Node.js 19+ and all modern browsers.

**New implementation of `src/runtime/id.ts`:**

```typescript
/**
 * Execution ID Generator
 *
 * Generates cryptographically unique execution IDs using
 * RFC 4122 v4 UUIDs for collision resistance in multi-instance
 * deployments.
 *
 * @packageDocumentation
 */

/**
 * Generate a unique execution ID.
 * Uses crypto.randomUUID() for 122 bits of entropy.
 * Falls back to timestamp+random for environments without crypto.
 */
export function generateExecutionId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `exec-${globalThis.crypto.randomUUID()}`;
  }
  // Fallback: timestamp + 48 bits of randomness
  const random = Math.random().toString(36).slice(2, 14);
  return `exec-${Date.now()}-${random}`;
}
```

### CHANGE-09: Configurable Checkpoint Failure Policy

**Files:**

- `src/saga/types.ts` -- Add `checkpointFailurePolicy` to `SagaOptions`
- `src/runtime/checkpointing.ts` -- Respect policy: "swallow" | "abort" | "warn"
- `src/runtime/saga-executor.ts` -- Handle abort checkpoint result

**Rationale:** The current "swallow" behavior is dangerous for GxP. Consumers must be able to choose "abort" to guarantee durable audit trails.

**Changes to `src/saga/types.ts`:**

```typescript
export type CheckpointFailurePolicy = "swallow" | "abort" | "warn";

export interface SagaOptions {
  // ... existing fields ...
  /** How to handle checkpoint persistence failures. Default: "warn" */
  readonly checkpointFailurePolicy?: CheckpointFailurePolicy;
}
```

**Changes to `src/runtime/checkpointing.ts`:**

```typescript
export interface CheckpointResult {
  readonly persisted: boolean;
  readonly abortError?: unknown;
}

export async function checkpoint(
  state: ExecutionState,
  update: Partial<SagaExecutionState>,
  policy: CheckpointFailurePolicy = "warn"
): Promise<CheckpointResult> {
  if (!state.persister) return { persisted: false };

  const result = await state.persister.update(state.executionId, {
    ...update,
    timestamps: {
      startedAt: update.timestamps?.startedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: update.timestamps?.completedAt ?? null,
    },
  });

  return result.match(
    (): CheckpointResult => ({ persisted: true }),
    (error): CheckpointResult => {
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

      if (policy === "abort") {
        return { persisted: false, abortError: error };
      }

      // "swallow" and "warn" both continue, but "warn" has already emitted the event
      return { persisted: false };
    }
  );
}
```

**Changes to `src/runtime/saga-executor.ts`:**

After each `checkpoint()` call, check the result:

```typescript
const checkpointResult = await checkpoint(executionState, {
  currentStep: stepIndex + 1,
  pendingStep: null,
  completedSteps: completedSteps.map(toCompletedStepState),
}, checkpointPolicy);

if (checkpointResult.abortError !== undefined) {
  return err(createPersistenceFailedError(
    { executionId, sagaName, stepName: step.name, stepIndex, ... },
    "update",
    checkpointResult.abortError
  ));
}
```

### CHANGE-10: Resume State Bounds Validation

**Files:**

- `src/runtime/runner.ts` -- Validate `currentStep` and step name matches during resume

**Rationale:** Prevent undefined behavior when persisted state is stale or corrupted.

**Changes to `src/runtime/runner.ts`:**

After reconstructing accumulated results, before calling `executeSagaInternal`:

```typescript
// Validate resume state bounds
const nodes = extractNodes(saga);
const totalSteps = countSteps(nodes);

if (startFromStep > totalSteps) {
  return err<SagaError<unknown>>({
    _tag: "ValidationFailed",
    executionId,
    sagaName: persistedState.sagaName,
    stepName: "",
    stepIndex: startFromStep,
    message: `Resume step index ${startFromStep} exceeds saga step count ${totalSteps}`,
    completedSteps: persistedState.completedSteps.map(s => s.name),
    compensatedSteps: [],
    cause: new Error("Resume state out of bounds"),
  });
}

// Validate persisted step names exist in current definition
for (const persisted of persistedState.completedSteps) {
  const stepDef = resolveStepByName(nodes, persisted.name);
  if (!stepDef) {
    return err<SagaError<unknown>>({
      _tag: "ValidationFailed",
      executionId,
      sagaName: persistedState.sagaName,
      stepName: persisted.name,
      stepIndex: persisted.index,
      message: `Persisted step "${persisted.name}" does not exist in current saga definition`,
      completedSteps: persistedState.completedSteps.map(s => s.name),
      compensatedSteps: [],
      cause: new Error("Step name mismatch during resume"),
    });
  }
}
```

---

## 4. New Code to Implement

### 4.1 Tracing Warning System (New File)

**File:** `src/runtime/tracing-warning.ts`

```typescript
/**
 * Tracing Warning
 *
 * Emits a one-time warning when saga executes without a TracerLike configured.
 * Never blocks execution. Tracing remains strictly optional.
 *
 * @packageDocumentation
 */

const warned = new Set<string>();

/**
 * Emit a warning (once per saga name) when no tracer is configured.
 * Uses console.warn and the saga event system. Never throws. Never blocks.
 */
export function warnIfNoTracer(sagaName: string, hasTracer: boolean): void {
  if (hasTracer) return;
  if (warned.has(sagaName)) return;
  warned.add(sagaName);

  try {
    console.warn(
      `[@hex-di/saga] Saga "${sagaName}" executing without distributed tracing configured. ` +
        `For GxP compliance, configure a TracerLike via SagaRunnerConfig.tracer or .tracingHook. ` +
        `This warning appears once per saga name and does not block execution.`
    );
  } catch {
    // Never block execution for tracing warnings
  }
}

/**
 * Reset warning state (for testing).
 */
export function resetTracingWarnings(): void {
  warned.clear();
}
```

**Integration point in `src/runtime/saga-executor.ts`:**

At the start of `executeSagaInternal`, before emitting `saga:started`:

```typescript
import { warnIfNoTracer } from "./tracing-warning.js";

// At the top of executeSagaInternal:
warnIfNoTracer(sagaName, executionState.tracingHook !== undefined);
```

### 4.2 Dead-Letter Retry API (New File)

**File:** `src/runtime/dead-letter.ts`

```typescript
/**
 * Dead-Letter Queue Management
 *
 * Provides a retry mechanism for permanently failed compensation steps.
 * Entries are persisted in the SagaExecutionState.compensation.deadLetterQueue
 * and can be retried manually or via automated processes.
 *
 * @packageDocumentation
 */

import type { ResultAsync } from "@hex-di/result";
import type { SagaPersister, PersistenceError } from "../ports/types.js";
import type { DeadLetterEntry } from "../compensation/types.js";

export interface DeadLetterRetryResult {
  readonly retried: readonly string[];
  readonly failed: readonly string[];
  readonly errors: readonly { stepName: string; cause: unknown }[];
}

export interface DeadLetterManager {
  /** List all dead-letter entries for an execution */
  list(executionId: string): ResultAsync<readonly DeadLetterEntry[], PersistenceError>;

  /** Retry a specific dead-letter entry by step name */
  retry(
    executionId: string,
    stepName: string,
    invoker: (params: unknown) => Promise<unknown>
  ): ResultAsync<boolean, PersistenceError>;

  /** Retry all dead-letter entries for an execution */
  retryAll(
    executionId: string,
    invoker: (stepName: string, params: unknown) => Promise<unknown>
  ): ResultAsync<DeadLetterRetryResult, PersistenceError>;
}

export function createDeadLetterManager(persister: SagaPersister): DeadLetterManager {
  // Implementation loads execution state, reads deadLetterQueue,
  // invokes retry, updates persisted state on success/failure.
  // ...
}
```

### 4.3 SagaGuard -- Authorization Hook Factory (New File)

**File:** `src/runtime/saga-guard.ts`

```typescript
/**
 * Saga Guard - Authorization Hook Factory
 *
 * Factory for creating authorization hooks with role-based
 * and policy-based access control for saga operations.
 *
 * @packageDocumentation
 */

import type { AuthorizationHook, SagaPrincipal, SagaOperation } from "./types.js";

export interface SagaGuardPolicy {
  /** Operations this policy applies to */
  readonly operations: readonly SagaOperation[];
  /** Saga name pattern (exact or glob) this policy applies to */
  readonly sagaPattern: string;
  /** Required roles (any of these grants access) */
  readonly requiredRoles: readonly string[];
}

/**
 * Creates a role-based authorization hook from a list of policies.
 *
 * @param policies - List of authorization policies
 * @param defaultAllow - Whether to allow operations with no matching policy (default: false)
 */
export function createSagaGuard(
  policies: readonly SagaGuardPolicy[],
  defaultAllow = false
): AuthorizationHook {
  return {
    authorize(
      principal: SagaPrincipal,
      operation: SagaOperation,
      sagaName: string,
      _executionId: string | undefined
    ): boolean {
      const matchingPolicies = policies.filter(
        p => p.operations.includes(operation) && matchesSagaPattern(p.sagaPattern, sagaName)
      );

      if (matchingPolicies.length === 0) {
        return defaultAllow;
      }

      const principalRoles = new Set(principal.roles ?? []);
      return matchingPolicies.some(p => p.requiredRoles.some(role => principalRoles.has(role)));
    },
  };
}

function matchesSagaPattern(pattern: string, sagaName: string): boolean {
  if (pattern === "*") return true;
  if (pattern.endsWith("*")) {
    return sagaName.startsWith(pattern.slice(0, -1));
  }
  return pattern === sagaName;
}
```

---

## 5. Test Requirements

### 5.1 Tests for CHANGE-01: Write-Ahead Checkpoint

**File:** `tests/unit/write-ahead-checkpoint.test.ts`

| Test                                                         | Description                                                                                                          |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `checkpointBeforeStep persists pendingStep before execution` | Verify persister.update called with `pendingStep: { name, index }` before step starts                                |
| `checkpoint after step clears pendingStep to null`           | Verify `pendingStep: null` in update after successful step                                                           |
| `resume detects incomplete pending step`                     | Create persisted state with `pendingStep` set and `currentStep` matching -- verify resume handles correctly          |
| `abort policy stops saga on checkpoint failure`              | Configure `checkpointFailurePolicy: "abort"`, mock persister to fail -- verify saga returns `PersistenceFailedError` |
| `swallow policy continues on checkpoint failure`             | Configure `checkpointFailurePolicy: "swallow"`, mock persister to fail -- verify saga continues                      |
| `warn policy emits event and continues`                      | Verify `step:failed` event with `__checkpoint_before` emitted but saga continues                                     |

### 5.2 Tests for CHANGE-02: Dead-Letter Queue

**File:** `tests/unit/dead-letter-queue.test.ts`

| Test                                                     | Description                                                            |
| -------------------------------------------------------- | ---------------------------------------------------------------------- |
| `sequential: failed compensation produces DLQ entry`     | Verify `compensationResult.deadLetterEntries` contains the failed step |
| `sequential: remaining steps produce DLQ entries`        | Verify steps after the failure are also in DLQ                         |
| `parallel: all failed compensations produce DLQ entries` | Verify each failed parallel compensation is a DLQ entry                |
| `best-effort: failed steps produce DLQ entries`          | Verify failed best-effort steps produce DLQ entries                    |
| `DLQ entries persisted in CompensationState`             | Verify checkpoint persists `deadLetterQueue`                           |
| `DLQ entries include compensation params and error`      | Verify all fields populated correctly                                  |

### 5.3 Tests for CHANGE-03: Resume Events

**File:** `tests/unit/resume-events.test.ts`

| Test                                                        | Description                                                                       |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `resume emits step:resumed for each completed step`         | Execute 3-step saga, crash after step 2, resume -- verify 2 `step:resumed` events |
| `step:resumed carries persisted output`                     | Verify `persistedOutput` matches original step result                             |
| `step:resumed recorded in ExecutionTrace`                   | Verify `buildExecutionTrace` includes resumed steps                               |
| `parallel resume emits step:resumed for all parallel steps` | Verify batch resume events for parallel sections                                  |
| `fresh execution emits no step:resumed events`              | Verify `step:resumed` never emitted for non-resumed execution                     |

### 5.4 Tests for CHANGE-04: Input Validation

**File:** `tests/unit/input-validation.test.ts`

| Test                                                          | Description                                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `valid input passes validation and saga executes`             | Configure validator that returns undefined, verify saga runs                    |
| `invalid input returns ValidationFailedError before any step` | Configure validator that returns error string, verify no `step:started` emitted |
| `no validator configured: saga executes without validation`   | Verify backward compatibility -- no validator means no validation               |
| `validation error message includes validator output`          | Verify error message contains the string returned by validator                  |
| `validator receives typed input`                              | Verify validator callback receives the actual input object                      |

### 5.5 Tests for CHANGE-05: Authorization

**File:** `tests/unit/authorization.test.ts`

| Test                                                   | Description                                              |
| ------------------------------------------------------ | -------------------------------------------------------- |
| `authorized principal can execute saga`                | Configure guard, provide principal with matching role    |
| `unauthorized principal gets AuthorizationFailedError` | Provide principal without required role                  |
| `no authorization hook: all operations allowed`        | No hook configured, verify execution succeeds            |
| `principal propagated to saga events`                  | Verify `SagaEventBase.principal` populated on all events |
| `principal propagated to persisted state`              | Verify `SagaExecutionState` metadata includes principal  |
| `cancel requires authorization`                        | Verify cancel checks authorization                       |
| `resume requires authorization`                        | Verify resume checks authorization                       |
| `SagaGuard with role policies`                         | Test `createSagaGuard` with multiple policies            |
| `SagaGuard with wildcard pattern`                      | Test pattern matching with `*`                           |

### 5.6 Tests for CHANGE-06: Compensation Timeout

**File:** `tests/unit/compensation-timeout.test.ts`

| Test                                                   | Description                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `compensation completes within timeout`                | Verify normal operation with generous timeout                                         |
| `compensation timeout produces partial result`         | Configure short timeout, slow compensation -- verify result marks remaining as failed |
| `compensation timeout entries go to dead-letter queue` | Verify timed-out steps appear in DLQ                                                  |
| `no compensation timeout: runs until complete`         | Default behavior preserved                                                            |

### 5.7 Tests for CHANGE-07: Versioning

**File:** `tests/unit/saga-versioning.test.ts`

| Test                                                           | Description                                         |
| -------------------------------------------------------------- | --------------------------------------------------- |
| `version persisted with execution state`                       | Verify `sagaVersion` in initial persisted state     |
| `stepFingerprint persisted with execution state`               | Verify `stepFingerprint` in initial persisted state |
| `resume with matching version succeeds`                        | Same version, resume works                          |
| `resume with mismatched version returns ValidationFailedError` | Different version, resume fails with clear error    |
| `resume with mismatched step fingerprint returns error`        | Same version but different steps, resume fails      |
| `version defaults to "1.0.0" if not specified`                 | Verify default version                              |

### 5.8 Tests for CHANGE-08: Cryptographic IDs

**File:** `tests/unit/execution-id.test.ts`

| Test                                               | Description                                                    |
| -------------------------------------------------- | -------------------------------------------------------------- |
| `generated IDs are unique across 10000 calls`      | Call `generateExecutionId()` 10000 times, verify no duplicates |
| `generated IDs start with exec- prefix`            | Verify format                                                  |
| `generated IDs contain UUID when crypto available` | Verify UUID pattern in ID                                      |
| `concurrent generation produces unique IDs`        | Generate IDs from multiple async contexts                      |

### 5.9 Tests for CHANGE-09: Checkpoint Failure Policy

**File:** `tests/unit/checkpoint-policy.test.ts`

| Test                                                                         | Description                                   |
| ---------------------------------------------------------------------------- | --------------------------------------------- |
| `abort policy: saga fails with PersistenceFailedError on checkpoint failure` | Mock persister failure, verify saga aborts    |
| `swallow policy: saga continues on checkpoint failure`                       | Mock persister failure, verify saga completes |
| `warn policy: event emitted and saga continues`                              | Verify event emitted but execution continues  |
| `default policy is warn`                                                     | No policy specified, verify warn behavior     |

### 5.10 Tests for CHANGE-10: Resume Bounds Validation

**File:** `tests/unit/resume-bounds.test.ts`

| Test                                              | Description                           |
| ------------------------------------------------- | ------------------------------------- |
| `resume with currentStep beyond step count fails` | `currentStep=10` for 3-step saga      |
| `resume with unknown step name fails`             | Persisted step name not in definition |
| `resume with valid bounds succeeds`               | Normal case                           |

### 5.11 Tests for Tracing Warning

**File:** `tests/unit/tracing-warning.test.ts`

| Test                                                | Description                                                  |
| --------------------------------------------------- | ------------------------------------------------------------ |
| `warning emitted once per saga name when no tracer` | Execute saga twice without tracer, verify one `console.warn` |
| `no warning when tracer is configured`              | Execute with tracer, verify no `console.warn`                |
| `warning never blocks execution`                    | Verify saga completes even if console.warn throws            |
| `resetTracingWarnings clears state`                 | Verify reset allows re-warning                               |

### 5.12 Property-Based Tests

**File:** `tests/property/gxp-invariants.test.ts`

| Property                                                                         | Description                                             |
| -------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `forall saga executions: events count >= step count`                             | Every completed saga emits at least N step events       |
| `forall saga failures: compensation DLQ is empty when all compensations succeed` | Success implies empty DLQ                               |
| `forall saga resumes: step:resumed count == startFromStep`                       | Resume emits exactly the right number of resumed events |
| `forall execution IDs: unique in set of 50000`                                   | No collisions in generated IDs                          |

---

## 6. Migration Notes

### Breaking Changes

All changes below are breaking. Per project rules ("No backward compatibility -- always implement the cleanest solution"):

1. **`SagaDefinition` gains `version` and `stepFingerprint` fields.** The builder's `build()` method computes `stepFingerprint` automatically. Consumers must add `.version("x.y.z")` before `.build()`, or the default `"1.0.0"` is used.

2. **`SagaExecutionState` gains new fields.** Any custom `SagaPersister` implementations must handle:
   - `pendingStep: { name: string; index: number } | null`
   - `sagaVersion?: string`
   - `stepFingerprint?: string`
   - `CompensationState.deadLetterQueue?: readonly DeadLetterEntry[]`

3. **`CompensationResult` gains `deadLetterEntries` field.** All code consuming `CompensationResult` must handle the new field (it defaults to `[]` for successful compensations).

4. **`SagaEvent` union gains `StepResumedEvent`.** Event listeners using exhaustive `switch` on `event.type` must add the `"step:resumed"` case.

5. **`SagaEventBase` gains optional `principal` field.** Non-breaking -- it is optional and defaults to `undefined`.

6. **`SagaError` union gains `AuthorizationFailedError`.** Exhaustive error handlers must add the `"AuthorizationFailed"` case.

7. **`checkpoint()` return type changes from `Promise<void>` to `Promise<CheckpointResult>`.** All call sites in `saga-executor.ts` and `compensation-handler.ts` must handle the result.

8. **`generateExecutionId()` changes output format.** IDs change from `exec-<timestamp>-<counter>` to `exec-<uuid>`. Any code that parses execution ID format must be updated.

### Migration Procedure

1. **Update `SagaPersister` implementations first** -- Add support for new `SagaExecutionState` fields with sensible defaults (`pendingStep: null`, `sagaVersion: undefined`, `stepFingerprint: undefined`, `deadLetterQueue: []`).

2. **Update saga definitions** -- Add `.version("1.0.0")` to builder chains. Optionally add `.validate(validator)` for runtime input validation.

3. **Update event listeners** -- Add `"step:resumed"` case to any exhaustive `switch` on `event.type`.

4. **Update error handlers** -- Add `"AuthorizationFailed"` case to any exhaustive `switch` on `error._tag`.

5. **Configure `SagaRunnerConfig`** -- Optionally add `authorizationHook` and/or set `checkpointFailurePolicy` on saga options.

6. **Existing persisted executions** -- Cannot be resumed against new saga definitions (version mismatch). Either:
   - Complete or abandon all in-flight executions before deploying.
   - Set `sagaVersion` on persisted records to match new definitions manually.

---

## 7. Tracing Warning Strategy

### Design Principles

1. **Tracing is OPTIONAL.** No saga execution is ever blocked, delayed, or rejected due to missing tracing configuration.

2. **Warn once per saga name.** The first execution of a saga without a `TracerLike` configured emits a `console.warn`. Subsequent executions of the same saga do not repeat the warning.

3. **Never throw.** The warning function catches all exceptions from `console.warn` (e.g., if running in an environment with no console).

4. **Resettable for testing.** `resetTracingWarnings()` clears the warned set.

### Implementation Detail

**File:** `src/runtime/tracing-warning.ts`

The `warnIfNoTracer(sagaName, hasTracer)` function is called at the start of `executeSagaInternal()` in `src/runtime/saga-executor.ts`. It checks:

1. `hasTracer` is `true` (derived from `executionState.tracingHook !== undefined`) -- return immediately if tracing is configured.
2. `warned.has(sagaName)` -- return immediately if warning already emitted for this saga.
3. Add `sagaName` to `warned` set.
4. Call `console.warn(...)` inside a try/catch that never rethrows.

### Warning Message

```
[@hex-di/saga] Saga "OrderSaga" executing without distributed tracing configured.
For GxP compliance, configure a TracerLike via SagaRunnerConfig.tracer or .tracingHook.
This warning appears once per saga name and does not block execution.
```

### Integration Points

The warning is emitted from exactly one location: `executeSagaInternal()`, before the `saga:started` event. This covers all execution paths (fresh execute, resume, sub-saga).

For resume specifically, the warning fires again because resumed executions call `executeSagaInternal()` with the same state -- but the `warned` set ensures it only fires once.

### Testing Strategy

Tests mock `console.warn` via `vi.spyOn(console, "warn")`:

```typescript
const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

// Execute without tracer
await executeSaga(runner, MySaga, input);
expect(warnSpy).toHaveBeenCalledTimes(1);
expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("MySaga"));

// Execute again -- no second warning
await executeSaga(runner, MySaga, input2);
expect(warnSpy).toHaveBeenCalledTimes(1); // still 1

// Different saga -- new warning
await executeSaga(runner, OtherSaga, input3);
expect(warnSpy).toHaveBeenCalledTimes(2);

warnSpy.mockRestore();
```

---

## Appendix: File Change Summary

| File                                  | Change Type | Changes                                                                                                                                                        |
| ------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/runtime/id.ts`                   | Rewrite     | Replace timestamp+counter with `crypto.randomUUID()`                                                                                                           |
| `src/runtime/checkpointing.ts`        | Major       | Add `checkpointBeforeStep()`, change `checkpoint()` return type to `CheckpointResult`, add policy parameter                                                    |
| `src/runtime/saga-executor.ts`        | Major       | Write-ahead checkpoint before steps, handle checkpoint abort, emit `step:resumed` events, call `warnIfNoTracer()`                                              |
| `src/runtime/runner.ts`               | Major       | Input validation, authorization checks, version validation on resume, bounds validation on resume, persist version                                             |
| `src/runtime/types.ts`                | Major       | Add `StepResumedEvent`, `SagaPrincipal`, `AuthorizationHook`, `SagaOperation`, update `ExecuteOptions`, `SagaRunnerConfig`, `SagaEventBase`, `SagaEvent` union |
| `src/runtime/events.ts`               | Minor       | Add `step:resumed` case in `recordTrace()`                                                                                                                     |
| `src/runtime/execution-state.ts`      | Minor       | Add `principal` field                                                                                                                                          |
| `src/runtime/compensation-handler.ts` | Minor       | Persist DLQ entries, pass compensation timeout                                                                                                                 |
| `src/runtime/tracing-warning.ts`      | New         | Tracing warning system                                                                                                                                         |
| `src/runtime/dead-letter.ts`          | New         | Dead-letter retry manager                                                                                                                                      |
| `src/runtime/saga-guard.ts`           | New         | Authorization hook factory                                                                                                                                     |
| `src/compensation/types.ts`           | Minor       | Add `DeadLetterEntry`, add `deadLetterEntries` to `CompensationResult`                                                                                         |
| `src/compensation/engine.ts`          | Moderate    | Collect DLQ entries on failure, compensation timeout wrapper                                                                                                   |
| `src/errors/types.ts`                 | Minor       | Add `AuthorizationFailedError` variant, add to `SagaError` union                                                                                               |
| `src/errors/factories.ts`             | Minor       | Add `createAuthorizationFailedError()` factory                                                                                                                 |
| `src/saga/types.ts`                   | Minor       | Add `inputValidator`, `compensationTimeout`, `checkpointFailurePolicy` to `SagaOptions`; add `version`, `stepFingerprint` to `SagaDefinition`                  |
| `src/saga/builder.ts`                 | Minor       | Add `.validate()` and `.version()` methods                                                                                                                     |
| `src/ports/types.ts`                  | Minor       | Add `pendingStep`, `sagaVersion`, `stepFingerprint` to `SagaExecutionState`; add `deadLetterQueue` to `CompensationState`                                      |
| `src/index.ts`                        | Minor       | Export new types and functions                                                                                                                                 |

**Total new files:** 3
**Total modified files:** 17
**Estimated lines of code:** ~650 new, ~200 modified
