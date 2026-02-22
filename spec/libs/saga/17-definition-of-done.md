# 17 - Definition of Done

_Previous: [16 - Appendices](./16-appendices.md)_

---

This document defines all tests required for `@hex-di/saga` and `@hex-di/saga-react` to be considered complete. Each section maps to a spec section and specifies required unit tests, type-level tests, integration tests, end-to-end tests, and mutation testing guidance.

## Test File Convention

| Test Category           | File Pattern  | Location                             |
| ----------------------- | ------------- | ------------------------------------ |
| Unit tests              | `*.test.ts`   | `libs/saga/core/tests/`              |
| Type-level tests        | `*.test-d.ts` | `libs/saga/core/tests/`              |
| Integration tests       | `*.test.ts`   | `libs/saga/core/tests/integration/`  |
| E2E tests               | `*.test.ts`   | `libs/saga/core/tests/e2e/`          |
| Testing package tests   | `*.test.ts`   | `libs/saga/testing/tests/`           |
| React unit tests        | `*.test.tsx`  | `libs/saga/react/tests/`             |
| React type tests        | `*.test-d.ts` | `libs/saga/react/tests/`             |
| React integration tests | `*.test.tsx`  | `libs/saga/react/tests/integration/` |

---

## DoD 1: Step Definitions (Spec Section 3)

### Unit Tests — `step-definitions.test.ts`

| #   | Test                                                                                        | Type |
| --- | ------------------------------------------------------------------------------------------- | ---- |
| 1   | `defineStep("reserve")` returns a StepBuilder with name "reserve"                           | unit |
| 2   | `.io<TInput, TOutput>()` transitions to StepBuilderWithIO                                   | unit |
| 3   | `.io<TInput, TOutput, TError>()` accepts explicit error type                                | unit |
| 4   | `.io<TInput, TOutput>()` defaults TError to `never`                                         | unit |
| 5   | `.invoke(port, mapper)` transitions to StepBuilderWithInvocation                            | unit |
| 6   | `.invoke(port, mapper)` stores port reference and invocation mapper                         | unit |
| 7   | `.compensate(mapper)` stores compensation mapper                                            | unit |
| 8   | `.skipCompensation()` marks step as non-compensable                                         | unit |
| 9   | `.when(predicate)` stores condition predicate                                               | unit |
| 10  | `.retry({ maxAttempts: 3, delay: 1000 })` stores fixed delay retry config                   | unit |
| 11  | `.retry({ maxAttempts: 3, delay: (attempt) => 1000 * 2 ** attempt })` stores function delay | unit |
| 12  | `.retry({ retryIf: (err) => err._tag !== "Fatal" })` stores retryIf predicate               | unit |
| 13  | `.timeout(5000)` stores timeout in milliseconds                                             | unit |
| 14  | `.build()` returns a frozen StepDefinition                                                  | unit |
| 15  | Builder methods are chainable in any order after `.invoke()`                                | unit |
| 16  | Condition predicate receives StepContext with input and accumulated results                 | unit |
| 17  | Compensation mapper receives CompensationContext with stepResult and error                  | unit |
| 18  | CompensationContext includes failedStepIndex and failedStepName                             | unit |
| 19  | StepDefinition includes metadata when provided via `.options()`                             | unit |
| 20  | Step with `.skipCompensation()` has compensate field set to null                            | unit |
| 21  | Step without `.compensate()` or `.skipCompensation()` has compensate field set to null      | unit |
| 22  | Invoke mapper receives StepContext with input and accumulated results                       | unit |
| 23  | Step name is stored as string literal type (not widened to string)                          | unit |

### Type-Level Tests — `step-definitions.test-d.ts`

| #   | Test                                                                       | Type |
| --- | -------------------------------------------------------------------------- | ---- |
| 1   | `defineStep("reserve")` infers name as literal `"reserve"`                 | type |
| 2   | `.io<string, number>()` sets TInput to `string` and TOutput to `number`    | type |
| 3   | `.io<string, number>()` defaults TError to `never`                         | type |
| 4   | `.io<string, number, ValidationError>()` sets TError to `ValidationError`  | type |
| 5   | `.invoke(port, mapper)` infers TPort from port argument                    | type |
| 6   | Builder enforces stage progression: `.io()` required before `.invoke()`    | type |
| 7   | Builder enforces stage progression: `.invoke()` required before `.build()` | type |
| 8   | `InferStepName<S>` resolves to step name literal                           | type |
| 9   | `InferStepOutput<S>` resolves to step output type                          | type |
| 10  | `InferStepInput<S>` resolves to step input type                            | type |
| 11  | `InferStepError<S>` resolves to step error type                            | type |
| 12  | `InferStepPort<S>` resolves to step port type                              | type |
| 13  | `InferStepName` on non-step produces `NotAStepDefinitionError`             | type |
| 14  | `CollectStepPorts<[S1, S2]>` produces union of all step port types         | type |
| 15  | Duplicate step names in tuple detected at compile time                     | type |
| 16  | Compensation mapper type includes stepResult of correct TOutput type       | type |
| 17  | Condition predicate type receives `StepContext<TInput, TAccumulated>`      | type |
| 18  | RetryConfig delay accepts both `number` and `(attempt: number) => number`  | type |
| 19  | Step with TError `never` contributes nothing to error union                | type |

### Mutation Testing

**Target: >95% mutation score.** Builder chain transitions, condition evaluation, retry config storage, and compensation context population are critical — any mutation to builder state or config propagation must be caught.

---

## DoD 2: Saga Definitions (Spec Section 4)

### Unit Tests — `saga-definitions.test.ts`

| #   | Test                                                                            | Type |
| --- | ------------------------------------------------------------------------------- | ---- |
| 1   | `defineSaga("orderSaga")` returns a SagaBuilder with name "orderSaga"           | unit |
| 2   | `.input<TInput>()` transitions to SagaBuilderWithInput                          | unit |
| 3   | `.step(stepDef)` appends step to saga steps tuple                               | unit |
| 4   | Multiple `.step()` calls build ordered steps tuple                              | unit |
| 5   | `.parallel([step1, step2])` adds parallel steps group                           | unit |
| 6   | `.branch(selector, branches)` adds conditional branching                        | unit |
| 7   | `.saga(subSaga, mapper)` adds sub-saga invocation as a step                     | unit |
| 8   | `.output(mapper)` stores output mapping function                                | unit |
| 9   | `.options({ compensationStrategy: "sequential" })` stores options               | unit |
| 10  | `.options({ compensationStrategy: "parallel" })` stores parallel strategy       | unit |
| 11  | `.options({ compensationStrategy: "best-effort" })` stores best-effort strategy | unit |
| 12  | `.options({ persistent: true })` enables persistence                            | unit |
| 13  | `.options({ timeout: 30000 })` stores saga-level timeout                        | unit |
| 14  | `.build()` returns a frozen SagaDefinition                                      | unit |
| 15  | Output mapper receives AccumulatedResults with correct step names as keys       | unit |
| 16  | Branch selector receives StepContext with accumulated results so far            | unit |
| 17  | Sub-saga output keyed by sub-saga name in AccumulatedResults                    | unit |
| 18  | Parallel steps all appear in AccumulatedResults with their names                | unit |
| 19  | `.options({ hooks: { beforeStep, afterStep } })` stores saga hooks              | unit |
| 20  | `.options({ maxConcurrency: 5 })` stores parallel execution limit               | unit |
| 21  | `.options({ metadata: { version: "1.0" } })` stores arbitrary metadata          | unit |
| 22  | SagaDefinition includes all step definitions in order                           | unit |
| 23  | Builder enforces `.input()` before `.step()` and `.output()` before `.build()`  | unit |

### Type-Level Tests — `saga-definitions.test-d.ts`

| #   | Test                                                                                  | Type |
| --- | ------------------------------------------------------------------------------------- | ---- |
| 1   | `defineSaga("orderSaga")` infers name as literal `"orderSaga"`                        | type |
| 2   | `.input<OrderInput>()` sets TInput to `OrderInput`                                    | type |
| 3   | Each `.step()` appends to TSteps tuple via variadic spread                            | type |
| 4   | `AccumulatedResults<TSteps>` maps step names to step outputs                          | type |
| 5   | `AccumulatedErrors<TSteps>` is union of all step TError types                         | type |
| 6   | Steps with `TError: never` do not contribute to `AccumulatedErrors`                   | type |
| 7   | Step mapper can access results from prior steps only                                  | type |
| 8   | Step mapper accessing non-existent prior step produces compile-time error             | type |
| 9   | Branch results appear as optional fields in AccumulatedResults                        | type |
| 10  | Branch results include `__selectedBranch` discriminant string literal                 | type |
| 11  | `__selectedBranch` enables narrowing in output mapper                                 | type |
| 12  | Parallel steps spread into TSteps tuple, all outputs available                        | type |
| 13  | Sub-saga errors union into parent saga AccumulatedErrors                              | type |
| 14  | Sub-saga output type accessible via sub-saga name key                                 | type |
| 15  | `InferSagaName<S>` resolves to saga name literal                                      | type |
| 16  | `InferSagaInput<S>` resolves to saga input type                                       | type |
| 17  | `InferSagaOutput<S>` resolves to saga output type                                     | type |
| 18  | `InferSagaSteps<S>` resolves to steps tuple                                           | type |
| 19  | `InferSagaErrors<S>` resolves to accumulated error union                              | type |
| 20  | Inference utilities produce error type on non-SagaDefinition input                    | type |
| 21  | Duplicate step names within a saga produce compile-time error                         | type |
| 22  | Output mapper parameter typed as `AccumulatedResults<TSteps>`                         | type |
| 23  | SagaOptions compensationStrategy is `"sequential" \| "parallel" \| "best-effort"`     | type |
| 24  | Builder enforces stage progression: `.input()` → `.step()` → `.output()` → `.build()` | type |
| 25  | `BranchAccumulatedResults<TKey, TBranches>` has all branch fields as optional         | type |
| 26  | `BranchAccumulatedErrors<TKey, TBranches>` is union of all branch error types         | type |
| 27  | `.saga()` mapper parameter typed as `StepContext<TInput, TAccumulated>`               | type |
| 28  | `.parallel()` accepts tuple of StepDefinition and returns builder with updated TSteps | type |

### Mutation Testing

**Target: >95% mutation score.** Tuple accumulation via variadic spread, AccumulatedResults key mapping, and error union accumulation are critical — mutations to step ordering or result key assignment must be caught.

---

## DoD 3: Saga Ports (Spec Section 5)

### Unit Tests — `saga-ports.test.ts`

| #   | Test                                                                                 | Type |
| --- | ------------------------------------------------------------------------------------ | ---- |
| 1   | `sagaPort<TInput, TOutput>()` returns a curried factory function                     | unit |
| 2   | Curried factory `(config)` returns a SagaPort with correct name                      | unit |
| 3   | SagaPort has `SagaPortSymbol` brand                                                  | unit |
| 4   | `sagaManagementPort<TOutput>()` returns a curried factory function                   | unit |
| 5   | Curried factory `(config)` returns a SagaManagementPort with correct name            | unit |
| 6   | SagaManagementPort has `SagaManagementPortSymbol` brand                              | unit |
| 7   | `isSagaPort(sagaPort)` returns true                                                  | unit |
| 8   | `isSagaPort(managementPort)` returns false                                           | unit |
| 9   | `isSagaPort(regularPort)` returns false                                              | unit |
| 10  | `isSagaManagementPort(managementPort)` returns true                                  | unit |
| 11  | `isSagaManagementPort(sagaPort)` returns false                                       | unit |
| 12  | `isSagaManagementPort(regularPort)` returns false                                    | unit |
| 13  | SagaPort config requires `name` field                                                | unit |
| 14  | SagaPort config accepts optional `description` and `metadata`                        | unit |
| 15  | SagaManagementPort config requires `name` field                                      | unit |
| 16  | SagaExecutor `execute()` returns `ResultAsync<SagaSuccess, SagaError>`               | unit |
| 17  | SagaManagementExecutor has `resume()`, `cancel()`, `getStatus()`, `listExecutions()` | unit |
| 18  | SagaStatus is a discriminated union of 6 states                                      | unit |
| 19  | ManagementError is a tagged union of 3 variants                                      | unit |
| 20  | SagaPort with explicit TError stores error phantom type                              | unit |
| 21  | SagaPort without TError defaults error phantom to `never`                            | unit |
| 22  | SagaManagementPort with explicit TError stores error phantom type                    | unit |
| 23  | SagaManagementPort without TError defaults error phantom to `never`                  | unit |

### Type-Level Tests — `saga-ports.test-d.ts`

| #   | Test                                                                                                        | Type |
| --- | ----------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `InferSagaPortInput<P>` resolves to port input type                                                         | type |
| 2   | `InferSagaPortOutput<P>` resolves to port output type                                                       | type |
| 3   | `InferSagaPortError<P>` resolves to port error type                                                         | type |
| 4   | `InferSagaPortName<P>` resolves to port name literal                                                        | type |
| 5   | `InferSagaPortInput` on non-SagaPort produces `NotASagaPortError`                                           | type |
| 6   | Curried factory preserves TInput/TOutput/TError through phantom slots                                       | type |
| 7   | `isSagaPort` is a type guard: `port is SagaPort`                                                            | type |
| 8   | `isSagaManagementPort` is a type guard: `port is SagaManagementPort`                                        | type |
| 9   | SagaPort phantom type handles contravariant TInput correctly                                                | type |
| 10  | SagaExecutor `execute` signature: `(input: TInput) => ResultAsync<SagaSuccess<TOutput>, SagaError<TError>>` | type |
| 11  | SagaManagementExecutor `resume` returns `ResultAsync<SagaSuccess<TOutput>, SagaError<TError>>`              | type |
| 12  | SagaManagementExecutor `cancel` returns `Promise<void>`                                                     | type |
| 13  | SagaManagementExecutor `getStatus` returns `Promise<SagaStatus>`                                            | type |
| 14  | SagaManagementExecutor `listExecutions` returns `Promise<readonly SagaExecutionSummary[]>`                  | type |
| 15  | SagaStatus discriminated union has 6 variants: pending, running, compensating, completed, failed, cancelled | type |
| 16  | ManagementError tagged union has 3 variants: ExecutionNotFound, InvalidOperation, PersistenceFailed         | type |
| 17  | SagaPort TError defaults to `never` when omitted                                                            | type |
| 18  | SagaManagementPort TError defaults to `never` when omitted                                                  | type |
| 19  | SagaPortConfig requires `name` as string literal type                                                       | type |

### Mutation Testing

**Target: >95% mutation score.** Port factory construction, phantom type slot assignment, and type guard discriminant checks are critical — mutations to brand symbols or phantom accessors must be caught.

---

## DoD 4: Saga Adapters (Spec Section 5)

### Unit Tests — `saga-adapters.test.ts`

| #   | Test                                                                                  | Type |
| --- | ------------------------------------------------------------------------------------- | ---- |
| 1   | `createSagaAdapter(port, config)` returns a SagaAdapter                               | unit |
| 2   | Adapter config includes saga definition reference                                     | unit |
| 3   | Adapter config includes `requires` field listing additional port dependencies         | unit |
| 4   | Adapter lifetime defaults to `"scoped"`                                               | unit |
| 5   | Adapter lifetime can be overridden to `"singleton"`                                   | unit |
| 6   | Adapter automatically collects step port dependencies from saga definition            | unit |
| 7   | Adapter `requires` merges step ports with explicit additional requires                | unit |
| 8   | Adapter produces SagaExecutor that delegates to SagaRunner                            | unit |
| 9   | SagaManagement adapter produces SagaManagementExecutor                                | unit |
| 10  | Adapter config validates saga definition is well-formed                               | unit |
| 11  | Adapter registers both domain (SagaPort) and management (SagaManagementPort) adapters | unit |

### Type-Level Tests — `saga-adapters.test-d.ts`

| #   | Test                                                                       | Type |
| --- | -------------------------------------------------------------------------- | ---- |
| 1   | `createSagaAdapter` infers port type from first argument                   | type |
| 2   | Adapter `requires` type includes all ports from `CollectStepPorts<TSteps>` | type |
| 3   | Adapter `requires` unions step ports with explicit additional requires     | type |
| 4   | Adapter lifetime is `"scoped" \| "singleton" \| "transient"`               | type |
| 5   | SagaAdapter type carries correct TInput/TOutput/TError from port           | type |
| 6   | Adapter config saga field typed to match port's SagaDefinition             | type |
| 7   | Port-adapter type mismatch produces compile-time error                     | type |
| 8   | Management adapter config does not require input type                      | type |

### Integration Tests — `integration/saga-adapters.test.ts`

| #   | Test                                                                       | Type        |
| --- | -------------------------------------------------------------------------- | ----------- |
| 1   | GraphBuilder validates all step ports present when saga adapter registered | integration |
| 2   | GraphBuilder rejects graph with missing step port dependency               | integration |
| 3   | Captive dependency detection: singleton saga adapter with scoped step port | integration |
| 4   | Scoped saga adapter resolves correctly within scope                        | integration |
| 5   | Saga adapter resolution produces functional SagaExecutor                   | integration |

### Mutation Testing

**Target: >90% mutation score.** Automatic step port collection, lifetime defaults, and graph validation are critical — mutations to dependency gathering or lifetime assignment must be caught.

---

## DoD 5: Compensation (Spec Section 6)

### Unit Tests — `compensation.test.ts`

| #   | Test                                                                   | Type |
| --- | ---------------------------------------------------------------------- | ---- |
| 1   | Compensation runs in reverse execution order (last completed → first)  | unit |
| 2   | Only successfully completed steps are compensated                      | unit |
| 3   | Failing step itself is not compensated                                 | unit |
| 4   | Compensation handler receives stepResult from forward execution        | unit |
| 5   | Compensation handler receives triggering error                         | unit |
| 6   | Compensation handler receives failedStepIndex                          | unit |
| 7   | Compensation handler receives failedStepName                           | unit |
| 8   | Steps with `.skipCompensation()` skipped during compensation           | unit |
| 9   | Steps without compensation handler skipped during compensation         | unit |
| 10  | Sequential strategy stops at first compensation failure                | unit |
| 11  | Sequential strategy returns CompensationFailedError on handler failure | unit |
| 12  | Parallel strategy executes all compensations concurrently              | unit |
| 13  | Parallel strategy collects all compensation errors                     | unit |
| 14  | Best-effort strategy continues despite compensation failures           | unit |
| 15  | Best-effort strategy logs failures but reports success                 | unit |
| 16  | Idempotency key derived from `${executionId}:${stepName}`              | unit |
| 17  | Compensation idempotency key: `${executionId}:${stepName}:compensate`  | unit |
| 18  | CompensationFailedError includes original cause and compensationCause  | unit |
| 19  | CompensationFailedError lists failedCompensationSteps                  | unit |
| 20  | Compensation not subject to saga-level timeout (runs to completion)    | unit |

### Type-Level Tests — `compensation.test-d.ts`

| #   | Test                                                                                   | Type |
| --- | -------------------------------------------------------------------------------------- | ---- |
| 1   | `CompensationContext<TInput, TAccumulated, TStepOutput, TError>` has all 4 type params | type |
| 2   | `CompensationContext.stepResult` typed as `TStepOutput`                                | type |
| 3   | `CompensationContext.error` typed as `TError`                                          | type |
| 4   | `CompensationFailedError<TCause>` generic over cause type                              | type |

### E2E Tests — `e2e/compensation.test.ts`

| #   | Test                                                                         | Type |
| --- | ---------------------------------------------------------------------------- | ---- |
| 1   | 3-step saga: step 3 fails → steps 2 and 1 compensated in order               | e2e  |
| 2   | 5-step saga: step 3 fails → steps 2 and 1 compensated, 3-5 untouched         | e2e  |
| 3   | Compensation handler idempotent re-execution returns same result             | e2e  |
| 4   | Sequential strategy with handler failure: partial compensation reported      | e2e  |
| 5   | Parallel strategy with multiple handler failures: all errors collected       | e2e  |
| 6   | Best-effort strategy with handler failure: remaining steps still compensated | e2e  |

### Mutation Testing

**Target: >95% mutation score.** Reverse order execution, strategy selection (sequential/parallel/best-effort), and context population are critical — mutations to iteration direction, concurrency model, or context fields must be caught.

---

## DoD 6: Runtime & Execution (Spec Section 7)

### Unit Tests — `runtime.test.ts`

| #   | Test                                                                                       | Type |
| --- | ------------------------------------------------------------------------------------------ | ---- |
| 1   | SagaRunner created scoped per container scope                                              | unit |
| 2   | `execute()` generates unique execution ID when not provided                                | unit |
| 3   | `execute()` accepts custom execution ID via options                                        | unit |
| 4   | `execute()` resolves step ports from container per invocation                              | unit |
| 5   | `execute()` returns `ResultAsync<SagaSuccess, SagaError>`                                  | unit |
| 6   | Successful execution returns `SagaSuccess` with output and executionId                     | unit |
| 7   | Failed execution triggers compensation before returning error                              | unit |
| 8   | Compensation runs in same scope as forward execution                                       | unit |
| 9   | `saga:started` event emitted with input and metadata                                       | unit |
| 10  | `step:started` event emitted before each step execution                                    | unit |
| 11  | `step:completed` event emitted with duration after success                                 | unit |
| 12  | `step:failed` event emitted with retry info after failure                                  | unit |
| 13  | `step:skipped` event emitted when condition is false                                       | unit |
| 14  | `compensation:started` event emitted with steps to compensate                              | unit |
| 15  | `compensation:step` event emitted per compensation step (success/failure)                  | unit |
| 16  | `compensation:completed` event emitted when all compensations finish                       | unit |
| 17  | `compensation:failed` event emitted when compensation handler fails                        | unit |
| 18  | `saga:completed` event emitted with total duration and step counts                         | unit |
| 19  | `saga:failed` event emitted with error details                                             | unit |
| 20  | `saga:cancelled` event emitted on cancellation                                             | unit |
| 21  | State transition: pending → running → completed (success path)                             | unit |
| 22  | State transition: pending → running → compensating → failed (failure path)                 | unit |
| 23  | State transition: running → cancelled (cancellation)                                       | unit |
| 24  | State transition: compensating → cancelled never happens (compensation runs to completion) | unit |
| 25  | `getStatus()` returns current SagaStatus for execution ID                                  | unit |
| 26  | `subscribe()` returns unsubscribe function                                                 | unit |
| 27  | Subscriber receives all events in order                                                    | unit |
| 28  | Conditional step: condition returns true → step executes                                   | unit |
| 29  | Conditional step: condition returns false → step skipped, no compensation                  | unit |
| 30  | Skipped step not present in AccumulatedResults                                             | unit |
| 31  | Retry: step fails then succeeds on retry → saga continues                                  | unit |
| 32  | Retry: all attempts exhausted → compensation triggered                                     | unit |
| 33  | Retry: retryIf returns false → skip remaining retries, compensate                          | unit |
| 34  | Retry: exponential backoff delay calculated correctly per attempt                          | unit |
| 35  | Step timeout: step exceeds timeout → TimeoutError returned                                 | unit |
| 36  | Saga timeout: supersedes all step timeouts                                                 | unit |
| 37  | AbortSignal: external signal cancels currently executing step                              | unit |
| 38  | AbortSignal: fires during compensation → compensation continues to completion              | unit |
| 39  | ExecutionTrace captures executionId, sagaName, input, status                               | unit |
| 40  | ExecutionTrace captures per-step StepTrace with timing and attempts                        | unit |
| 41  | ExecutionTrace captures CompensationTrace with triggering step                             | unit |
| 42  | Parallel steps execute concurrently (verified via timing)                                  | unit |
| 43  | Parallel step failure triggers compensation for all completed parallel steps               | unit |
| 44  | Branch selector chooses correct branch at runtime                                          | unit |
| 45  | Only selected branch steps execute                                                         | unit |
| 46  | Sub-saga executes atomically within parent                                                 | unit |
| 47  | Sub-saga compensation runs as single unit                                                  | unit |
| 48  | Sub-saga errors union into parent saga errors                                              | unit |
| 49  | `cancel()` triggers AbortSignal and compensation                                           | unit |
| 50  | Scope disposal triggers AbortSignal                                                        | unit |
| 51  | Generator-based execution via safeTry for sequential steps                                 | unit |
| 52  | safeTry short-circuits on first step Err                                                   | unit |
| 53  | Step retry with jitter spreads retries: base + random offset                               | unit |
| 54  | Each retry attempt has its own timeout window                                              | unit |
| 55  | Timeout during delay between retries exhausts retry count                                  | unit |
| 56  | Execution with empty steps produces immediate SagaSuccess                                  | unit |
| 57  | Multiple concurrent executions have independent execution IDs                              | unit |

### Integration Tests — `integration/runtime.test.ts`

| #   | Test                                                          | Type        |
| --- | ------------------------------------------------------------- | ----------- |
| 1   | SagaRunner resolves from container and executes 3-step saga   | integration |
| 2   | Scoped step ports resolved within execution scope             | integration |
| 3   | Scope disposal while saga running cancels execution           | integration |
| 4   | Execution with real container and real adapters (test-scoped) | integration |

### E2E Tests — `e2e/runtime.test.ts`

| #   | Test                                                                       | Type |
| --- | -------------------------------------------------------------------------- | ---- |
| 1   | Order saga: reserve → charge → ship → success                              | e2e  |
| 2   | Order saga: charge fails → reserve compensated → StepFailed returned       | e2e  |
| 3   | Order saga: compensation fails → CompensationFailed with details           | e2e  |
| 4   | Saga with timeout: step exceeds timeout → cancellation + compensation      | e2e  |
| 5   | Saga with AbortSignal: external abort → cancellation + compensation        | e2e  |
| 6   | Saga with conditional step: condition false → step skipped, rest continues | e2e  |
| 7   | Saga with retry: step fails twice, succeeds third → saga completes         | e2e  |

### Mutation Testing

**Target: >90% mutation score.** Event emission order, state transitions, compensation triggering, retry logic, timeout handling, and safeTry short-circuit behavior are all critical — mutations to control flow, event sequencing, or state machine transitions must be caught.

---

## DoD 7: Persistence (Spec Section 8)

### Unit Tests — `persistence.test.ts`

| #   | Test                                                                                   | Type |
| --- | -------------------------------------------------------------------------------------- | ---- |
| 1   | `createInMemoryPersister()` returns a SagaPersister                                    | unit |
| 2   | `save()` writes full SagaExecutionState                                                | unit |
| 3   | `load(executionId)` returns saved state                                                | unit |
| 4   | `load(nonExistentId)` returns null                                                     | unit |
| 5   | `update(executionId, partial)` applies incremental updates                             | unit |
| 6   | `update()` appends to completedSteps array                                             | unit |
| 7   | `update()` advances currentStep index                                                  | unit |
| 8   | `delete(executionId)` removes state                                                    | unit |
| 9   | `delete(nonExistentId)` does not throw                                                 | unit |
| 10  | `list()` returns all saved states                                                      | unit |
| 11  | `list({ sagaName })` filters by saga name                                              | unit |
| 12  | `list({ status })` filters by execution status                                         | unit |
| 13  | `list({ startedAfter })` filters by date range                                         | unit |
| 14  | `list({ startedBefore })` filters by date range                                        | unit |
| 15  | `list({ limit, offset })` applies pagination                                           | unit |
| 16  | Checkpoint at saga start: status "running", currentStep 0                              | unit |
| 17  | Checkpoint after step: currentStep incremented, step appended to completedSteps        | unit |
| 18  | Checkpoint when compensation starts: status "compensating", compensation.active = true | unit |
| 19  | Checkpoint after compensation step: compensatedSteps or failedSteps appended           | unit |
| 20  | Checkpoint on completion: terminal status, completedAt set                             | unit |
| 21  | Checkpoint on failure: terminal status, error serialized                               | unit |
| 22  | Step outputs serialized via JSON.stringify/parse round-trip                            | unit |
| 23  | Non-serializable step output (function) raises error at checkpoint                     | unit |
| 24  | Non-serializable step output (symbol) raises error at checkpoint                       | unit |
| 25  | SerializedSagaError preserves \_tag discriminant                                       | unit |
| 26  | SerializedSagaError preserves name, message, stack                                     | unit |
| 27  | SerializedSagaError preserves code and custom fields                                   | unit |
| 28  | Timestamps stored as ISO 8601 strings                                                  | unit |
| 29  | CompletedStepState includes name, index, output, skipped, completedAt                  | unit |
| 30  | CompensationState includes active, compensatedSteps, failedSteps, triggeringStepIndex  | unit |
| 31  | Resume skips already-completed steps                                                   | unit |
| 32  | Resume uses persisted outputs in AccumulatedResults                                    | unit |
| 33  | Resume continues from lastCheckpoint step index                                        | unit |
| 34  | Compensation resumes from last compensation checkpoint                                 | unit |
| 35  | Persister not registered but `persistent: true` → error at execution time              | unit |
| 36  | SagaPersisterPort resolves to SagaPersister from container                             | unit |
| 37  | In-memory persister uses Map for O(1) lookup by executionId                            | unit |
| 38  | Multiple concurrent sagas each persist independently                                   | unit |

### Integration Tests — `integration/persistence.test.ts`

| #   | Test                                                             | Type        |
| --- | ---------------------------------------------------------------- | ----------- |
| 1   | Saga execution checkpoints after each step via persister         | integration |
| 2   | Resumed saga skips completed steps and continues from checkpoint | integration |

### E2E Tests — `e2e/persistence.test.ts`

| #   | Test                                                            | Type |
| --- | --------------------------------------------------------------- | ---- |
| 1   | 5-step saga: crash after step 3 → resume completes steps 4-5    | e2e  |
| 2   | Resume in new scope: original scope disposed, new scope created | e2e  |

### Mutation Testing

**Target: >90% mutation score.** Checkpoint timing, serialization round-trip fidelity, resume skip logic, and filter evaluation are critical — mutations to checkpoint placement, serialization, or skip conditions must be caught.

---

## DoD 8: Error Handling (Spec Section 9)

### Unit Tests — `error-handling.test.ts`

| #   | Test                                                                           | Type |
| --- | ------------------------------------------------------------------------------ | ---- |
| 1   | `StepFailedError` has `_tag: "StepFailed"`                                     | unit |
| 2   | `StepFailedError` carries cause of original step error                         | unit |
| 3   | `CompensationFailedError` has `_tag: "CompensationFailed"`                     | unit |
| 4   | `CompensationFailedError` carries cause and compensationCause                  | unit |
| 5   | `CompensationFailedError` lists failedCompensationSteps                        | unit |
| 6   | `TimeoutError` has `_tag: "Timeout"` and timeoutMs field                       | unit |
| 7   | `CancelledError` has `_tag: "Cancelled"`                                       | unit |
| 8   | `ValidationFailedError` has `_tag: "ValidationFailed"` and cause               | unit |
| 9   | `PortNotFoundError` has `_tag: "PortNotFound"` and portName                    | unit |
| 10  | `PersistenceFailedError` has `_tag: "PersistenceFailed"`, operation, and cause | unit |
| 11  | All 7 error variants include executionId                                       | unit |
| 12  | All 7 error variants include stepName (where applicable)                       | unit |
| 13  | All 7 error variants include stepIndex (where applicable)                      | unit |
| 14  | All errors include completedSteps list                                         | unit |
| 15  | All errors include compensatedSteps list                                       | unit |
| 16  | SagaError `_tag` discriminant enables switch/case exhaustive handling          | unit |
| 17  | Non-retryable error (retryIf returns false) skips remaining retries            | unit |
| 18  | Exponential backoff: `min(baseDelay * 2^attempt, cap)`                         | unit |
| 19  | Jitter applied to retry delay: `base + Math.random() * jitterRange`            | unit |
| 20  | Step timeout aborts step and returns TimeoutError                              | unit |
| 21  | Saga timeout aborts current step and triggers compensation                     | unit |
| 22  | Each retry attempt has its own step-level timeout window                       | unit |
| 23  | Result always returned from execute(), never thrown                            | unit |
| 24  | StepFailed returned when compensation succeeds fully                           | unit |
| 25  | CompensationFailed returned when compensation partially fails                  | unit |
| 26  | Timeout during compensation → compensation continues to completion             | unit |
| 27  | PortNotFound returned when step adapter missing from graph                     | unit |
| 28  | PersistenceFailed returned when save/load/update operation fails               | unit |
| 29  | Multiple compensation failures all listed in failedCompensationSteps           | unit |
| 30  | Error propagation through sub-saga: child error wrapped in parent error        | unit |

### Type-Level Tests — `error-handling.test-d.ts`

| #   | Test                                                                             | Type |
| --- | -------------------------------------------------------------------------------- | ---- |
| 1   | `SagaError<TCause>` is a tagged union of 7 variants                              | type |
| 2   | Each variant narrows correctly via `_tag` discriminant in switch                 | type |
| 3   | `StepFailedError<TCause>` generic preserves cause type                           | type |
| 4   | `CompensationFailedError<TCause>` carries both cause and compensationCause types | type |
| 5   | `AccumulatedErrors<TSteps>` produces correct union of step error types           | type |
| 6   | Steps with `TError: never` do not contribute to error union                      | type |
| 7   | `Result<SagaSuccess<TOutput>, SagaError<TErrors>>` carries full types            | type |
| 8   | SagaErrorBase fields (executionId, stepName, etc.) present on all variants       | type |
| 9   | `RetryConfig<TError>` retryIf predicate receives `TError` parameter              | type |
| 10  | `TimeoutError` has `timeoutMs: number` field                                     | type |
| 11  | `PortNotFoundError` has `portName: string` field                                 | type |
| 12  | `PersistenceFailedError` has `operation: string` and `cause: unknown` fields     | type |

### Mutation Testing

**Target: >95% mutation score.** Error variant discriminants, cause chain population, retry logic, and timeout behavior are critical — mutations to `_tag` values, conditional branches, or error field assignments must be caught.

---

## DoD 9: DI Integration (Spec Section 10)

### Integration Tests — `integration/di-integration.test.ts`

| #   | Test                                                                                    | Type        |
| --- | --------------------------------------------------------------------------------------- | ----------- |
| 1   | Saga adapter registers step port dependencies automatically in GraphBuilder             | integration |
| 2   | GraphBuilder validates all step ports present at build time                             | integration |
| 3   | GraphBuilder rejects graph when step port dependency missing                            | integration |
| 4   | Captive dependency detection: singleton saga with scoped step port                      | integration |
| 5   | Saga port resolvable from container via `container.resolve(sagaPort)`                   | integration |
| 6   | Management port resolvable via `container.resolve(managementPort)`                      | integration |
| 7   | `container.resolveResult(sagaPort)` returns `Ok` for registered port                    | integration |
| 8   | `container.resolveResult(sagaPort)` returns `Err(MissingAdapter)` for unregistered port | integration |
| 9   | safeTry composes resolution errors and saga errors into single error channel            | integration |
| 10  | Step ports resolved from container per invocation (respect adapter lifetime)            | integration |
| 11  | Scoped saga execution within scope boundary                                             | integration |
| 12  | Scope disposal while saga running triggers AbortSignal and compensation                 | integration |
| 13  | `scope.dispose()` awaited after saga execution completes                                | integration |
| 14  | `instrumentContainer(container, { tracer })` produces saga tracing spans                | integration |
| 15  | Parent span wraps entire saga execution                                                 | integration |
| 16  | Child spans produced per step and compensation                                          | integration |
| 17  | Retry spans nested under step span                                                      | integration |
| 18  | Error attributes include \_tag, cause.\_tag, step_name, step_index                      | integration |
| 19  | Same saga definition works with production graph and test graph                         | integration |
| 20  | TestGraphBuilder overrides specific adapters for testing                                | integration |
| 21  | Saga adapter lifetime defaults to "scoped"                                              | integration |
| 22  | Singleton saga adapter override validated by captive dep checker                        | integration |

### E2E Tests — `e2e/di-integration.test.ts`

| #   | Test                                                                                  | Type |
| --- | ------------------------------------------------------------------------------------- | ---- |
| 1   | Full container setup: register ports → build graph → resolve saga → execute → dispose | e2e  |
| 2   | Multi-scope execution: two scopes run same saga concurrently with isolation           | e2e  |
| 3   | Tracing integration: saga execution produces full span tree with attributes           | e2e  |
| 4   | Result-based resolution + safeTry: multi-resolution composing error channels          | e2e  |

### Mutation Testing

**Target: >85% mutation score.** Integration boundary — graph validation, captive dependency detection, scope lifecycle, and tracing span production must be verified. Lower target acceptable due to external dependency coordination.

---

## DoD 10: React Integration (Spec Section 11)

### Unit Tests — `libs/saga/react/tests/use-saga.test.tsx`

| #   | Test                                                                                                              | Type |
| --- | ----------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `useSaga(port)` returns initial state: status "idle", data null, error null                                       | unit |
| 2   | `execute(input)` transitions status to "running"                                                                  | unit |
| 3   | `execute(input)` returns `ResultAsync<SagaSuccess, SagaError>`                                                    | unit |
| 4   | Successful execution transitions status to "success"                                                              | unit |
| 5   | Successful execution populates `data` with SagaSuccess output                                                     | unit |
| 6   | Failed execution transitions through "compensating" to "error"                                                    | unit |
| 7   | Failed execution populates `error` with SagaError                                                                 | unit |
| 8   | `error` with `_tag: "StepFailed"` implies full compensation (`compensatedSteps.length === completedSteps.length`) | unit |
| 9   | `error` with `_tag: "CompensationFailed"` implies partial compensation (`failedCompensationSteps.length > 0`)     | unit |
| 10  | `cancel()` triggers cancellation and returns to idle after compensation                                           | unit |
| 11  | `reset()` returns status to "idle", clears data and error                                                         | unit |
| 12  | `execute()` while running throws error                                                                            | unit |
| 13  | `reset()` while running throws error                                                                              | unit |
| 14  | `reset()` while compensating throws error                                                                         | unit |
| 15  | Component unmount during execution triggers cleanup                                                               | unit |
| 16  | `isIdle`, `isRunning`, `isSuccess`, `isError` boolean helpers                                                     | unit |
| 17  | `executionId` populated after `execute()` called                                                                  | unit |

### Unit Tests — `libs/saga/react/tests/use-saga-status.test.tsx`

| #   | Test                                                                                     | Type |
| --- | ---------------------------------------------------------------------------------------- | ---- |
| 1   | `useSagaStatus(executionId)` returns current SagaStatus                                  | unit |
| 2   | Status updates when execution progresses                                                 | unit |
| 3   | Status reflects "pending", "running", "compensating", "completed", "failed", "cancelled" | unit |
| 4   | Missing execution ID returns null/error status                                           | unit |
| 5   | Polling interval fetches updated status periodically                                     | unit |

### Unit Tests — `libs/saga/react/tests/use-saga-history.test.tsx`

| #   | Test                                                     | Type |
| --- | -------------------------------------------------------- | ---- |
| 1   | `useSagaHistory()` returns list of SagaExecutionSummary  | unit |
| 2   | `useSagaHistory({ sagaName })` filters by saga name      | unit |
| 3   | `useSagaHistory({ status })` filters by execution status | unit |
| 4   | `useSagaHistory({ limit })` applies pagination limit     | unit |
| 5   | Missing persistence adapter returns error                | unit |

### Unit Tests — `libs/saga/react/tests/saga-boundary.test.tsx`

| #   | Test                                                                    | Type |
| --- | ----------------------------------------------------------------------- | ---- |
| 1   | `<SagaBoundary>` renders children when no error                         | unit |
| 2   | `<SagaBoundary>` renders fallback when saga error caught                | unit |
| 3   | Fallback receives error and recovery functions (retry, reset)           | unit |
| 4   | `retry()` resumes execution from fallback                               | unit |
| 5   | `reset()` clears error state from fallback                              | unit |
| 6   | `onError` callback invoked when saga error caught                       | unit |
| 7   | No ContainerProvider in tree produces descriptive error                 | unit |
| 8   | Missing SagaPort produces descriptive error                             | unit |
| 9   | Missing SagaManagementPort for resume/cancel produces descriptive error | unit |
| 10  | Nested SagaBoundary catches closest ancestor's error                    | unit |

### Type-Level Tests — `libs/saga/react/tests/use-saga.test-d.ts`

| #   | Test                                                             | Type |
| --- | ---------------------------------------------------------------- | ---- |
| 1   | `useSaga<P>` infers TInput from SagaPort P                       | type |
| 2   | `useSaga<P>` infers TOutput for `data` field from SagaPort P     | type |
| 3   | `useSaga<P>` infers TError for `error` field from SagaPort P     | type |
| 4   | `execute` parameter typed as `InferSagaPortInput<P>`             | type |
| 5   | `SagaBoundaryFallbackProps` includes `error: SagaError<unknown>` | type |

### Integration Tests — `libs/saga/react/tests/integration/react-integration.test.tsx`

| #   | Test                                                                 | Type        |
| --- | -------------------------------------------------------------------- | ----------- |
| 1   | `useSaga` resolves SagaPort from ContainerProvider                   | integration |
| 2   | `useSagaStatus` fetches status via SagaManagementPort from container | integration |
| 3   | `useSagaHistory` lists executions via persistence adapter            | integration |
| 4   | Full flow: render → execute → status updates → success/error display | integration |

### Mutation Testing

**Target: >90% mutation score.** State machine transitions (idle→running→success/error), compensated flag derivation, error boundary catch logic, and hook cleanup are critical — mutations to status assignments or boolean derivations must be caught.

---

## DoD 11: Testing Utilities (Spec Section 12)

### Unit Tests — `libs/saga/testing/tests/testing-utilities.test.ts`

| #   | Test                                                                   | Type |
| --- | ---------------------------------------------------------------------- | ---- |
| 1   | `createSagaTestHarness(saga, config)` returns a SagaTestHarness        | unit |
| 2   | Harness `execute(input)` returns `ResultAsync<SagaSuccess, SagaError>` | unit |
| 3   | Harness creates fresh scope per `execute()` call                       | unit |
| 4   | Harness `dispose()` cleans up container resources                      | unit |
| 5   | Harness `getTrace()` returns ExecutionTrace when tracing enabled       | unit |
| 6   | Harness `getTrace()` returns null when tracing disabled                | unit |
| 7   | Harness composes with `TestGraphBuilder.from(graph).override()`        | unit |
| 8   | Saga executes successfully with all mocks returning valid output       | unit |
| 9   | Saga fails at expected step when mock returns Err                      | unit |
| 10  | Compensation runs when step fails (via mock)                           | unit |
| 11  | Conditional step skipped when predicate returns false                  | unit |
| 12  | Retry: step fails on early attempts, succeeds on later attempt         | unit |
| 13  | Retry exhaustion triggers compensation                                 | unit |
| 14  | retryIf predicate evaluated for each error                             | unit |
| 15  | Parallel steps execute and all results available                       | unit |
| 16  | Branch selector chooses correct branch, only selected branch runs      | unit |
| 17  | Step timeout triggers cancellation and compensation                    | unit |
| 18  | ExecutionTrace snapshot normalization: strip executionId and timing    | unit |
| 19  | Normalized ExecutionTrace matches stored snapshot structure            | unit |
| 20  | Snapshot includes sagaName, step names, status, and step order         | unit |

### Integration Tests — `libs/saga/testing/tests/integration/testing-utilities.test.ts`

| #   | Test                                                        | Type        |
| --- | ----------------------------------------------------------- | ----------- |
| 1   | Harness with real container and real adapters (test-scoped) | integration |
| 2   | End-to-end workflow via harness: input → steps → output     | integration |
| 3   | Actual port resolution through container within harness     | integration |

### Mutation Testing

**Target: >90% mutation score.** Harness scope lifecycle, trace capture, override application, and snapshot normalization are critical — mutations to scope creation, trace toggling, or normalization logic must be caught.

---

## DoD 12: Introspection (Spec Section 14)

### Unit Tests — `introspection.test.ts`

| #   | Test                                                                                   | Type |
| --- | -------------------------------------------------------------------------------------- | ---- |
| 1   | `sagaInspector.getDefinitions()` returns all registered saga definitions               | unit |
| 2   | SagaDefinitionInfo includes name, steps, options, portDependencies                     | unit |
| 3   | StepDefinitionInfo includes name, port, hasCompensation, isConditional, retry, timeout | unit |
| 4   | `getActiveExecutions()` returns only pending/running/compensating executions           | unit |
| 5   | `getActiveExecutions()` excludes completed, failed, and cancelled                      | unit |
| 6   | `getHistory(filters)` delegates to SagaPersister.list()                                | unit |
| 7   | `getHistory({ sagaName })` filters by saga name                                        | unit |
| 8   | `getHistory({ status })` filters by execution status                                   | unit |
| 9   | `getTrace(executionId)` returns ExecutionTrace with all step details                   | unit |
| 10  | `getTrace(nonExistentId)` returns null                                                 | unit |
| 11  | `getCompensationStats()` computes totalCompensations from history                      | unit |
| 12  | `getCompensationStats()` computes successRate                                          | unit |
| 13  | `getCompensationStats()` computes errorTagDistribution                                 | unit |
| 14  | `subscribe(listener)` returns unsubscribe function                                     | unit |
| 15  | Subscriber receives SagaEvent in real-time                                             | unit |
| 16  | SagaExecutionSummary includes error.\_tag for machine-readable analysis                | unit |
| 17  | SagaExecutionSummary includes causeTags for error chain analysis                       | unit |
| 18  | Graph suggestion: `saga_step_without_compensation` for side-effecting step             | unit |
| 19  | Graph suggestion: `saga_long_timeout_without_persistence` for timeout > 60s            | unit |
| 20  | Graph suggestion: `saga_no_retry_on_external_port` for external port                   | unit |
| 21  | Graph suggestion: `saga_singleton_with_scoped_deps` for lifetime mismatch              | unit |
| 22  | SagaInspector created lazily from container                                            | unit |

### Integration Tests — `integration/introspection.test.ts`

| #   | Test                                                                      | Type        |
| --- | ------------------------------------------------------------------------- | ----------- |
| 1   | MCP resource `hexdi://saga/definitions` returns getDefinitions() data     | integration |
| 2   | MCP resource `hexdi://saga/executions` returns getActiveExecutions() data | integration |
| 3   | MCP resource `hexdi://saga/executions/{id}` returns getTrace(id) data     | integration |
| 4   | MCP tool `hexdi://saga/retry` resumes failed execution                    | integration |
| 5   | MCP tool `hexdi://saga/cancel` cancels running execution                  | integration |

### Mutation Testing

**Target: >85% mutation score.** Query filtering, stats computation, graph suggestion thresholds, and MCP resource routing are critical — mutations to filter predicates, computation formulas, or suggestion conditions must be caught.

---

## DoD 13: Advanced Patterns (Spec Section 13)

### E2E Tests — `e2e/advanced-patterns.test.ts`

| #   | Test                                                                       | Type |
| --- | -------------------------------------------------------------------------- | ---- |
| 1   | Long-running saga: persists after each step, resumes after simulated crash | e2e  |
| 2   | Long-running saga: external event triggers resume() to continue            | e2e  |
| 3   | Long-running saga: saga-level timeout fires after configured duration      | e2e  |
| 4   | Idempotent step: duplicate idempotency key returns cached result           | e2e  |
| 5   | Idempotent compensation: re-execution returns same result                  | e2e  |
| 6   | Multi-saga composition: parent saga invokes sub-saga via `.saga()`         | e2e  |
| 7   | Multi-saga composition: sub-saga failure triggers parent compensation      | e2e  |
| 8   | Multi-saga composition: nested compensation runs atomically                | e2e  |
| 9   | Branch execution: selector chooses correct branch at runtime               | e2e  |
| 10  | Branch execution: only selected branch steps execute and compensate        | e2e  |
| 11  | Saga hooks: beforeStep called before each step, afterStep called after     | e2e  |
| 12  | Resume in different scope: new scope created, original scope unavailable   | e2e  |

### Mutation Testing

**Target: >85% mutation score.** Pattern-level invariants (idempotency, composition atomicity, branch selection, hook invocation) must be verified — mutations to idempotency checks, composition boundaries, or selector logic must be caught.

---

## Test Count Summary

| Category          | @hex-di/saga | @hex-di/saga-react | @hex-di/saga-testing | Total    |
| ----------------- | ------------ | ------------------ | -------------------- | -------- |
| Unit tests        | ~247         | ~37                | ~20                  | ~304     |
| Type-level tests  | ~90          | ~5                 | —                    | ~95      |
| Integration tests | ~38          | ~4                 | ~3                   | ~45      |
| E2E tests         | ~31          | —                  | —                    | ~31      |
| **Total**         | **~406**     | **~46**            | **~23**              | **~475** |

## Verification Checklist

Before marking the spec as "implemented," the following must all pass:

| Check                               | Command                                                               | Expected   |
| ----------------------------------- | --------------------------------------------------------------------- | ---------- |
| All unit tests pass                 | `pnpm --filter @hex-di/saga test`                                     | 0 failures |
| All type tests pass                 | `pnpm --filter @hex-di/saga test:types`                               | 0 failures |
| All integration tests pass          | `pnpm --filter @hex-di/saga test -- --dir integration`                | 0 failures |
| All e2e tests pass                  | `pnpm --filter @hex-di/saga test -- --dir e2e`                        | 0 failures |
| React unit tests pass               | `pnpm --filter @hex-di/saga-react test`                               | 0 failures |
| React type tests pass               | `pnpm --filter @hex-di/saga-react test:types`                         | 0 failures |
| React integration tests pass        | `pnpm --filter @hex-di/saga-react test -- --dir integration`          | 0 failures |
| Testing package tests pass          | `pnpm --filter @hex-di/saga-testing test`                             | 0 failures |
| Typecheck passes (core)             | `pnpm --filter @hex-di/saga typecheck`                                | 0 errors   |
| Typecheck passes (react)            | `pnpm --filter @hex-di/saga-react typecheck`                          | 0 errors   |
| Typecheck passes (testing)          | `pnpm --filter @hex-di/saga-testing typecheck`                        | 0 errors   |
| Lint passes (core)                  | `pnpm --filter @hex-di/saga lint`                                     | 0 errors   |
| Lint passes (react)                 | `pnpm --filter @hex-di/saga-react lint`                               | 0 errors   |
| Lint passes (testing)               | `pnpm --filter @hex-di/saga-testing lint`                             | 0 errors   |
| No `any` types in core source       | `grep -r "any" libs/saga/core/src/`                                   | 0 matches  |
| No type casts in core source        | `grep -r " as " libs/saga/core/src/`                                  | 0 matches  |
| No eslint-disable in core source    | `grep -r "eslint-disable" libs/saga/core/src/`                        | 0 matches  |
| No `any` types in react source      | `grep -r "any" libs/saga/react/src/`                                  | 0 matches  |
| No type casts in react source       | `grep -r " as " libs/saga/react/src/`                                 | 0 matches  |
| No eslint-disable in react source   | `grep -r "eslint-disable" libs/saga/react/src/`                       | 0 matches  |
| No `any` types in testing source    | `grep -r "any" libs/saga/testing/src/`                                | 0 matches  |
| No type casts in testing source     | `grep -r " as " libs/saga/testing/src/`                               | 0 matches  |
| No eslint-disable in testing source | `grep -r "eslint-disable" libs/saga/testing/src/`                     | 0 matches  |
| Mutation score (step definitions)   | `pnpm --filter @hex-di/saga stryker -- --mutate src/step/**`          | >95%       |
| Mutation score (saga definitions)   | `pnpm --filter @hex-di/saga stryker -- --mutate src/saga/**`          | >95%       |
| Mutation score (ports)              | `pnpm --filter @hex-di/saga stryker -- --mutate src/ports/**`         | >95%       |
| Mutation score (adapters)           | `pnpm --filter @hex-di/saga stryker -- --mutate src/adapters/**`      | >90%       |
| Mutation score (compensation)       | `pnpm --filter @hex-di/saga stryker -- --mutate src/compensation/**`  | >95%       |
| Mutation score (runtime)            | `pnpm --filter @hex-di/saga stryker -- --mutate src/runtime/**`       | >90%       |
| Mutation score (persistence)        | `pnpm --filter @hex-di/saga stryker -- --mutate src/persistence/**`   | >90%       |
| Mutation score (errors)             | `pnpm --filter @hex-di/saga stryker -- --mutate src/errors/**`        | >95%       |
| Mutation score (integration)        | `pnpm --filter @hex-di/saga stryker -- --mutate src/integration/**`   | >85%       |
| Mutation score (introspection)      | `pnpm --filter @hex-di/saga stryker -- --mutate src/introspection/**` | >85%       |
| Mutation score (react hooks)        | `pnpm --filter @hex-di/saga-react stryker -- --mutate src/**`         | >90%       |

## Mutation Testing Strategy

### Why Mutation Testing Matters for @hex-di/saga

Saga systems have critical invariants around compensation ordering, error propagation, and state machine transitions. A test suite that merely checks "saga completes" or "error returned" would miss mutations like:

- Compensation running in forward order instead of reverse
- Sequential strategy not stopping at first compensation failure
- `andThen` chain not short-circuiting on step Err
- Retry loop not respecting `retryIf` predicate
- State machine skipping "compensating" and going directly to "failed"
- Persistence checkpoints placed after wrong events
- Branch selector executing all branches instead of selected one
- Timeout not cancelling currently executing step

Mutation testing catches these subtle behavioral inversions.

### Mutation Targets by Priority

| Priority | Module                                           | Target Score | Rationale                                                            |
| -------- | ------------------------------------------------ | ------------ | -------------------------------------------------------------------- |
| Critical | Step definitions (builder, options)              | >95%         | Foundation of saga composition. Wrong step config = wrong execution. |
| Critical | Saga definitions (builder, AccumulatedResults)   | >95%         | Tuple accumulation and result mapping drive all downstream behavior. |
| Critical | Ports (factories, phantom types, guards)         | >95%         | Port type safety is the contract between domain and infrastructure.  |
| Critical | Compensation (ordering, strategies, context)     | >95%         | Compensation correctness is the core safety guarantee of sagas.      |
| Critical | Error handling (variants, propagation, retry)    | >95%         | Error discriminants and retry logic must be precise.                 |
| High     | Runtime (state machine, events, safeTry)         | >90%         | Complex control flow with many subtle behavioral distinctions.       |
| High     | Persistence (checkpoints, serialization, resume) | >90%         | Data integrity during crash recovery is critical.                    |
| High     | React hooks (state machine, cleanup)             | >90%         | UI state must accurately reflect saga execution state.               |
| Medium   | Adapters (graph validation, lifetime)            | >90%         | Integration boundary. Correct but less business-critical.            |
| Medium   | DI Integration (resolution, scope lifecycle)     | >85%         | External dependency coordination. Lower score acceptable.            |
| Medium   | Introspection (queries, stats, suggestions)      | >85%         | Observability layer. Important but not on critical path.             |
| Medium   | Advanced patterns (composition, idempotency)     | >85%         | Pattern-level correctness. Validated through e2e scenarios.          |

### Mutation Operators to Prioritize

- **Conditional boundary mutations**: `===` → `!==`, `>` → `>=` (catches guard logic and filter predicates)
- **Return value mutations**: `return Ok(x)` → `return Err(x)` (catches saga success/failure inversion)
- **Block removal**: Removing `if (status === "compensating") ...` (catches state machine transition skips)
- **Method call mutations**: `compensateInReverse()` → `compensateInForward()` (catches ordering inversion)
- **Loop direction mutations**: `for (let i = last; i >= 0; i--)` → `for (let i = 0; i <= last; i++)` (catches compensation order)
- **Arithmetic mutations**: `2 ** attempt` → `2 + attempt` (catches exponential backoff formula)
- **Boolean mutations**: `compensated: true` → `compensated: false` (catches compensation flag derivation)

---

_Previous: [16 - Appendices](./16-appendices.md)_

_End of Definition of Done_
