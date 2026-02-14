# GxP Compliance Analysis Report: @hex-di/flow

**Package:** `@hex-di/flow`
**Version:** 0.1.0
**Analysis Date:** 2026-02-10
**Analyst:** Automated GxP Compliance Review (Claude Opus 4.6)
**Scope:** All source files in `libs/flow/core/src/` (~17,749 lines) and 40 test files (~24,626 lines)

---

## 1. Executive Summary

**Overall GxP Readiness Score: 6.5 / 10**

The `@hex-di/flow` library provides a typed state machine runtime with strong architectural foundations for regulated environments. It implements a pure interpreter pattern (transitions computed without side effects), effects-as-data for auditability, comprehensive error handling via `Result`/`ResultAsync` types (no thrown exceptions), and a three-layer timeout system. The tracing infrastructure (`FlowCollector`, `FlowInspector`, `FlowRegistry`, `FlowTracingHook`) provides the building blocks for audit trails.

However, several critical GxP gaps exist: there is no built-in authorization or access control layer, no approval gate mechanism for regulated transitions, no state migration framework for version evolution, and the use of `Object.keys()` in parallel state iteration introduces a non-specification-guaranteed ordering concern. The serialization format includes a `version` field but lacks a migration path. These gaps make the library a strong foundation but not yet GxP-ready for deployment in validated environments without an overlay of compliance controls.

| Area                            | Score | Summary                                                                                                  |
| ------------------------------- | ----- | -------------------------------------------------------------------------------------------------------- |
| Data Integrity (ALCOA+)         | 7/10  | Immutable snapshots, branded types, `readonly` context; timestamp present but no cryptographic integrity |
| Traceability & Audit Trail      | 7/10  | FlowCollector/FlowInspector/FlowTracingHook provide full transition tracing; no tamper-proof storage     |
| Determinism & Reproducibility   | 6/10  | Guard evaluation in definition order; `Object.keys()` concern in parallel regions                        |
| Error Handling & Recovery       | 8/10  | Result/ResultAsync everywhere; retry pattern; `safeCall` wrapping; tagged error unions                   |
| Validation & Input Verification | 6/10  | Serialization validation; machine state validation on restore; no runtime input schema enforcement       |
| Change Control & Versioning     | 5/10  | Serialized state has `version: 1`; no migration framework; no machine definition versioning              |
| Testing & Verification          | 8/10  | 40 test files, ~24,626 lines; compound/parallel/history/retry/e2e tests                                  |
| Security                        | 2/10  | No authorization, no ACL, no permission checks on transitions or effects                                 |
| Documentation                   | 7/10  | TSDoc on all public APIs; `@packageDocumentation` headers; examples in docstrings                        |
| Compliance-Specific for Flows   | 5/10  | Serialization/restoration exists; no approval gates; no step-level audit logging                         |

---

## 2. Package Overview

### 2.1 Architecture

`@hex-di/flow` is a typed state machine runtime implementing a variant of the Statecharts formalism. The core architecture follows a strict separation:

- **Machine Definition** (`machine/`): Branded types for states, events, and machines with nominal typing via symbol branding. State nodes support atomic, compound, parallel, final, and history types.
- **Interpreter** (`runner/interpreter.ts`): Pure function that computes transitions without side effects. Returns `TransitionResult` containing new state, context, and effect descriptors.
- **Runner** (`runner/create-runner.ts`): Manages the machine lifecycle, event queue, subscriber notifications, history maps, and parallel region tracking.
- **Effects System** (`effects/`): Effects are pure data descriptors (Invoke, Spawn, Stop, Emit, Delay, Parallel, Sequence, None, Choose, Log) executed by a pluggable `EffectExecutor`.
- **Activities** (`activities/`): Long-running processes with `AbortSignal` cancellation, typed event sinks, dependency injection, and lifecycle management with configurable timeouts.
- **Introspection** (`introspection/`): `FlowRegistry` for live instance tracking, `FlowInspector` for aggregated querying, `FlowTracingHook` for distributed tracing spans.
- **Serialization** (`serialization/`): State persistence with JSON validation, circular reference detection, and machine ID verification on restore.
- **Integration** (`integration/`): HexDI container adapters, DI-integrated effect executor, tracing bridge, event bus adapter.

### 2.2 Source Metrics

| Metric               | Value                                                                        |
| -------------------- | ---------------------------------------------------------------------------- |
| Source files         | 68 TypeScript files                                                          |
| Source lines         | ~17,749                                                                      |
| Test files           | 40                                                                           |
| Test lines           | ~24,626                                                                      |
| Test-to-source ratio | 1.39:1                                                                       |
| Error types          | 16 tagged union variants across 5 error unions                               |
| Effect types         | 10 (Invoke, Spawn, Stop, Emit, Delay, Parallel, Sequence, None, Choose, Log) |
| State node types     | 5 (atomic, compound, parallel, final, history)                               |

### 2.3 Key Files

| File                              | Lines  | Role                                                           |
| --------------------------------- | ------ | -------------------------------------------------------------- |
| `runner/interpreter.ts`           | ~1,992 | Pure transition logic, compound/parallel/history/onDone/always |
| `runner/create-runner.ts`         | ~1,128 | Runner factory, event queue, subscriber management             |
| `activities/manager.ts`           | ~701   | Activity lifecycle, 3-layer timeout, cleanup orchestration     |
| `errors/tagged-errors.ts`         | ~222   | All error type definitions                                     |
| `serialization/serialization.ts`  | ~229   | State persistence and restoration                              |
| `introspection/flow-inspector.ts` | ~245   | Aggregated query API                                           |
| `introspection/flow-registry.ts`  | ~114   | Live instance tracking                                         |
| `machine/state-node.ts`           | ~376   | State node configuration types                                 |
| `tracing/tracing-runner.ts`       | ~331   | Tracing runner with duration tracking                          |

---

## 3. GxP Compliance Matrix

| Requirement                          | Status  | Evidence                                                                                                           |
| ------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------ |
| State transitions are deterministic  | PARTIAL | Guard evaluation follows definition order; `Object.keys()` ordering in parallel regions is engine-dependent        |
| All state changes are traceable      | PASS    | `FlowCollector.collect()` records every transition with machineId, prevState, event, nextState, effects, timestamp |
| Error states are properly handled    | PASS    | Tagged union errors with exhaustive `_tag` matching; `safeCall` wraps all user code                                |
| Data integrity is maintained         | PASS    | `DeepReadonly<TContext>` at type level; `Object.freeze()` on snapshots; immutable `TransitionResult`               |
| State can be persisted and restored  | PASS    | `serializeMachineState`/`restoreMachineState` with validation                                                      |
| Activities have lifecycle management | PASS    | ActivityManager tracks running/completed/failed/cancelled; cleanup called exactly once                             |
| Timeouts are enforced                | PASS    | 3-layer fallback: SpawnOptions > Activity.timeout > ActivityManagerConfig.defaultTimeout                           |
| Machine definitions are versioned    | PARTIAL | `SerializedMachineState.version: 1` field exists; no migration framework                                           |
| Access control on transitions        | FAIL    | No authorization layer, no ACL, no permission checks                                                               |
| Approval gates for regulated steps   | FAIL    | No built-in approval gate mechanism                                                                                |
| Tamper-proof audit trail             | FAIL    | In-memory only; no cryptographic integrity; no append-only storage                                                 |
| Input validation on events           | PARTIAL | Type-level enforcement via branded types; no runtime schema validation                                             |
| Concurrent flow isolation            | PASS    | Each runner is independent; parallel regions are managed within a single machine                                   |
| Infinite loop prevention             | PASS    | `MAX_ALWAYS_DEPTH = 100`, `MAX_ONDONE_DEPTH = 50`, `maxQueueSize = 100`                                            |

---

## 4. Detailed Analysis

### 4.1 Data Integrity (ALCOA+) -- Score: 7/10

**Strengths:**

The library enforces deep immutability at the type level via `DeepReadonly<T>`:

```typescript
// libs/flow/core/src/machine/types.ts (lines 51-57)
export type DeepReadonly<T> = T extends readonly (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends (...args: infer _Args) => infer _Return
    ? T
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;
```

State context is wrapped in `DeepReadonly<TContext>` on the `State` type:

```typescript
// libs/flow/core/src/machine/types.ts (lines 105-118)
export type State<TName extends string, TContext = void> = {
  readonly [K in StateBrandSymbol]: [TName, TContext];
} & {
  readonly name: TName;
} & (TContext extends void ? NoAdditionalProperties : { readonly context: DeepReadonly<TContext> });
```

The `TransitionResult` interface uses `readonly` throughout:

```typescript
// libs/flow/core/src/runner/interpreter.ts (lines 38-72)
export interface TransitionResult {
  readonly newState: string | undefined;
  readonly newStatePath: readonly string[] | undefined;
  readonly newContext: unknown;
  readonly effects: readonly EffectAny[];
  readonly transitioned: boolean;
}
```

Snapshots are frozen with `Object.freeze()`:

```typescript
// libs/flow/core/src/runner/create-runner.ts (line 684)
const typedSnapshot: MachineSnapshot<TStateNames, TContext> = Object.freeze(snapshot);
```

Activity instances are frozen:

```typescript
// libs/flow/core/src/activities/manager.ts (lines 378-385)
function toActivityInstance(state: MutableActivityState): ActivityInstance {
  return Object.freeze({
    id: state.id,
    status: state.status,
    startTime: state.startTime,
    endTime: state.endTime,
  });
}
```

**Attributable:** Transition events carry `machineId` and triggering `event` but no user/principal identifier.

**Contemporaneous:** Timestamps are captured via `Date.now()` at transition time and serialization time.

**Gaps:**

- No user/principal attribution on transitions (who triggered the event)
- No cryptographic hashing or digital signatures on state records
- Timestamps rely on `Date.now()` with no NTP or trusted time source verification

---

### 4.2 Traceability & Audit Trail -- Score: 7/10

**Strengths:**

Every transition is recorded via the collector callback in `createMachineRunner`:

```typescript
// libs/flow/core/src/runner/create-runner.ts (lines 699-724)
function recordTransition(
  prevState: string,
  event: { readonly type: string },
  nextState: string,
  effects: readonly EffectAny[]
): void {
  if (collector) {
    collector.collect({
      machineId: machine.id,
      prevState,
      event,
      nextState,
      effects,
      timestamp: Date.now(),
    });
  }
  if (transitionBuffer !== undefined) {
    transitionBuffer.push({
      prevState,
      nextState,
      eventType: event.type,
      effectCount: effects.length,
      timestamp: Date.now(),
    });
  }
}
```

The `FlowTransitionEvent` captures the full transition context:

```typescript
// libs/flow/core/src/tracing/types.ts (lines 47-96)
export interface FlowTransitionEvent<TState, TEvent> {
  readonly id: string;
  readonly machineId: string;
  readonly prevState: TState;
  readonly event: TEvent;
  readonly nextState: TState;
  readonly effects: readonly EffectAny[];
  readonly timestamp: number;
  readonly duration: number;
  readonly isPinned: boolean;
}
```

Distributed tracing integration via `FlowTracingHook`:

```typescript
// libs/flow/core/src/introspection/flow-tracing-hook.ts (lines 42-53)
onTransitionStart(machineId: string, from: string, to: string, eventType: string): void {
  if (filter !== undefined && !filter(machineId)) return;
  tracer.pushSpan(
    `flow:${machineId}/${from}->${to}`,
    withScopeAttrs({
      machine_id: machineId,
      from_state: from,
      to_state: to,
      event_type: eventType,
    })
  );
},
```

The `FlowInspector` aggregates data from both registry and collector:

```typescript
// libs/flow/core/src/introspection/flow-inspector.ts (lines 64-73)
const unsubscribeCollector: Unsubscribe = collector.subscribe((event: FlowTransitionEventAny) => {
  const key = event.machineId;
  let history = stateHistories.get(key);
  if (history === undefined) {
    history = [event.prevState];
    stateHistories.set(key, history);
  }
  history.push(event.nextState);
  notifyListeners();
});
```

**Gaps:**

- Transition records are stored in-memory (`FlowMemoryCollector`, `CircularBuffer`)
- No persistent, append-only audit log
- No tamper detection (no hash chaining, no digital signatures)
- Effect execution results are tracked in a `CircularBuffer` with configurable size (data eviction)
- `FlowRetentionPolicy.expiryMs` (default 5 minutes) causes automatic deletion of audit records

---

### 4.3 Determinism & Reproducibility -- Score: 6/10

**Strengths:**

Guard evaluation follows strict definition order. The interpreter iterates transitions sequentially, returning the first match:

```typescript
// libs/flow/core/src/runner/interpreter.ts (lines 1899-1913)
function findMatchingTransition(
  transitions: readonly TransitionConfigAny[],
  context: unknown,
  event: { readonly type: string }
): TransitionConfigAny | undefined {
  for (const transitionConfig of transitions) {
    if (transitionConfig.guard === undefined) {
      return transitionConfig;
    }
    if (callGuard(transitionConfig.guard, context, event)) {
      return transitionConfig;
    }
  }
  return undefined;
}
```

Event bubbling follows a deterministic depth-first bottom-up path:

```typescript
// libs/flow/core/src/runner/interpreter.ts (lines 654-693)
function bubbleEvent(...): BubbleResult | BubbleNoMatch {
  for (let i = activePath.length - 1; i >= 0; i--) {
    const stateNode = resolveStateNodeByPath(machine, activePath.slice(0, i + 1));
    // ... find matching transition
  }
  return { matched: false };
}
```

Always-transition infinite loop prevention:

```typescript
// libs/flow/core/src/runner/interpreter.ts (line 759)
const MAX_ALWAYS_DEPTH = 100;
```

**Critical Concern -- Parallel Region Ordering:**

Parallel regions iterate using `Object.keys()`:

```typescript
// libs/flow/core/src/runner/interpreter.ts (lines 1560-1561)
for (const regionName of Object.keys(regionPaths.regions)) {
  const regionPath = regionPaths.regions[regionName];
```

The ECMAScript specification guarantees integer-like keys are iterated first (in ascending numeric order), followed by string keys in insertion order. While V8, SpiderMonkey, and JavaScriptCore all follow this behavior, the ordering is technically implementation-defined for string keys. In a GxP context where transitions across parallel regions share context mutations, the order in which regions process an event can affect the final context value.

This also appears in `computeParallelRegionPaths` (line 1432), `collectRegionEntryEffects` (line 1482), `collectParallelExitEffects` (line 1512), and `checkParallelOnDone` (line 1677).

**Gaps:**

- No event replay mechanism for reproducing exact execution sequences
- Guard functions are user-provided and may be non-deterministic (e.g., using `Date.now()` or `Math.random()`)
- No guard purity enforcement at runtime

---

### 4.4 Error Handling & Recovery -- Score: 8/10

**Strengths:**

All error types are tagged unions with `_tag` discriminators for exhaustive pattern matching:

```typescript
// libs/flow/core/src/errors/tagged-errors.ts (lines 26-70)
export const GuardThrew = createError("GuardThrew");
export type GuardThrew = Readonly<{
  _tag: "GuardThrew";
  machineId: string;
  currentState: string;
  eventType: string;
  cause: unknown;
}>;

// ... (14 more error variants)

export type TransitionError = GuardThrew | ActionThrew | Disposed | QueueOverflow;
export type EffectExecutionError =
  | InvokeError
  | SpawnError
  | StopError
  | ResolutionError
  | SequenceAborted
  | ParallelErrors;
```

User-provided guard and action functions are wrapped in `safeCall` to prevent thrown exceptions from escaping:

```typescript
// libs/flow/core/src/runner/interpreter.ts (lines 253-259)
function safeCall<T>(fn: () => T): Result<T, unknown> {
  try {
    return ok(fn());
  } catch (error: unknown) {
    return err(error);
  }
}
```

Queue overflow protection:

```typescript
// libs/flow/core/src/runner/create-runner.ts (lines 427-429)
if (pendingEvents.length >= maxQueueSize) {
  return err(QueueOverflow({ machineId: machine.id, queueSize: maxQueueSize }));
}
```

Disposed machine protection:

```typescript
// libs/flow/core/src/runner/create-runner.ts (lines 421-423)
if (disposed) {
  return err(Disposed({ machineId: machine.id, operation: "send" }));
}
```

The retry pattern provides structured error recovery with exponential backoff:

```typescript
// libs/flow/core/src/patterns/retry.ts (lines 125-186)
export function retryConfig(config: RetryPatternConfig): RetryPatternResult {
  // ... maxRetries, initialDelay, maxDelay, backoffMultiplier
  function canRetry(context: RetryContext): boolean {
    return context.retryCount < maxRetries;
  }
  function computeDelay(context: RetryContext): number {
    const delay = initialDelay * Math.pow(backoffMultiplier, context.retryCount);
    return Math.min(delay, maxDelay);
  }
  // ...
}
```

Activity cleanup is guaranteed to be called exactly once:

```typescript
// libs/flow/core/src/activities/manager.ts (lines 393-424)
function callCleanup<TDeps>(
  state: MutableActivityState,
  reason: CleanupReason,
  cleanup: ...,
  deps: TDeps
): ResultAsync<void, never> {
  if (state.cleanupCalled) {
    return ResultAsync.ok(undefined);
  }
  state.cleanupCalled = true;
  state.cleanupReason = reason;
  // ...
}
```

**Gaps:**

- No compensation/rollback mechanism for partially completed effect sequences
- `SequenceAborted` error captures the failing `stepIndex` but does not record which effects succeeded before the failure

---

### 4.5 Validation & Input Verification -- Score: 6/10

**Strengths:**

Serialization validation checks for non-serializable types and circular references:

```typescript
// libs/flow/core/src/serialization/serialization.ts (lines 168-228)
function validateSerializable(
  value: unknown,
  path: string,
  seen: Set<object>
): Result<void, SerializationError> {
  if (type === "function") {
    return err(NonSerializableContext({ path, valueType: "function" }));
  }
  if (type === "symbol") {
    return err(NonSerializableContext({ path, valueType: "symbol" }));
  }
  if (type === "bigint") {
    return err(NonSerializableContext({ path, valueType: "bigint" }));
  }
  // Circular reference detection
  if (seen.has(value)) {
    return err(CircularReference({ path }));
  }
  // ...
}
```

State restoration validates the machine ID and state name:

```typescript
// libs/flow/core/src/serialization/serialization.ts (lines 121-152)
export function restoreMachineState(
  serialized: SerializedMachineState,
  machine: MachineAny
): Result<{ readonly state: string; readonly context: unknown }, RestoreError> {
  if (serialized.machineId !== machine.id) {
    return err(MachineIdMismatch({ serializedId: serialized.machineId, machineId: machine.id }));
  }
  const validStates = Object.keys(statesRecord);
  if (!validStates.includes(serialized.state)) {
    return err(InvalidState({ stateName: serialized.state, validStates }));
  }
  // ...
}
```

Branded types prevent accidental mixing of different machine/state/event types at compile time.

**Gaps:**

- No runtime schema validation for event payloads (relies entirely on TypeScript compile-time checks)
- No validation that `context` restored from serialized state conforms to the expected shape
- No precondition enforcement beyond guard predicates (which are user-provided)
- No input sanitization for event payloads or activity inputs

---

### 4.6 Change Control & Versioning -- Score: 5/10

**Strengths:**

The serialization format includes a version field:

```typescript
// libs/flow/core/src/serialization/serialization.ts (lines 31-42)
export interface SerializedMachineState {
  readonly version: 1;
  readonly machineId: string;
  readonly state: string;
  readonly context: unknown;
  readonly timestamp: number;
}
```

Machine definitions are frozen/immutable data structures with well-defined public API surface.

The package has a `VERSION` constant:

```typescript
// libs/flow/core/src/index.ts (line 76)
export const VERSION = "0.1.0";
```

**Gaps:**

- `SerializedMachineState.version` is hardcoded to `1` with no migration framework for version evolution
- No machine definition versioning (machine definitions have `id` but no version number)
- No schema registry for event/context types
- No changelog enforcement or breaking change detection
- No ability to detect if a restored state was created by a different machine definition version

---

### 4.7 Testing & Verification -- Score: 8/10

**Strengths:**

The library has 40 test files with ~24,626 lines of test code, yielding a 1.39:1 test-to-source ratio. Test coverage spans:

| Test Category                   | Files                                                                            | Scope                                                 |
| ------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Core types & machine definition | `core-types.test.ts`, `machine-definition.test.ts`                               | Branded types, state/event factories                  |
| Guard & action evaluation       | `states-guards.test.ts`, `actions.test.ts`                                       | Guard combinators, named actions                      |
| Runner & transitions            | `runner.test.ts`, `runner-extended.test.ts`                                      | Send, sendBatch, sendAndExecute, disposal             |
| Compound states                 | `advanced-states.test.ts`                                                        | Auto-entry, onDone, #id references, event bubbling    |
| Parallel states                 | `parallel-states.test.ts`                                                        | Region initialization, event dispatch, onDone         |
| History states                  | `history-states.test.ts`                                                         | Shallow, deep, fallback targets                       |
| Activities                      | `activities.test.ts`, `activities/manager.test.ts`, `activities/factory.test.ts` | Spawn, stop, timeout, cleanup                         |
| Effects                         | `effects-unit.test.ts`                                                           | All 10 effect constructors                            |
| Serialization                   | Part of `e2e.test.ts`                                                            | Serialize/restore, validation errors                  |
| Integration adapters            | 7 adapter test files                                                             | DI executor, registry, inspector, event bus           |
| Introspection                   | 5 introspection test files                                                       | Registry, inspector, tracing hook, circular buffer    |
| E2E scenarios                   | `e2e.test.ts`, `e2e-scenarios.test.ts`                                           | Multi-step workflows, retry patterns                  |
| Patterns                        | `advanced-patterns.test.ts`                                                      | Retry, coordination, subscription                     |
| Builder DSL                     | `builder.test.ts`                                                                | Fluent builder API                                    |
| Tracing                         | `tracing.test.ts`                                                                | FlowCollector, FlowMemoryCollector, duration tracking |

The library provides dedicated testing utilities:

```typescript
// From libs/flow/core/src/activities/testing/
createTestEventSink; // Mock event sink for testing
createTestSignal; // Controllable AbortSignal
createTestDeps; // Mock dependency injection
testActivity; // Activity test harness
```

**Gaps:**

- No mutation testing or coverage metrics reported
- No fuzz testing of guard/action functions
- No property-based testing for state machine invariants
- Parallel state ordering tests do not verify cross-engine determinism

---

### 4.8 Security -- Score: 2/10

**CRITICAL GAP:** The library has no authorization or access control mechanism.

There is no concept of:

- User/principal identity associated with events
- Permission checks before transitions are evaluated
- Role-based access control on state transitions
- Audit identity for who triggered a state change
- Event signing or verification

Any caller with a reference to the `MachineRunner` can send any event defined by the machine:

```typescript
// libs/flow/core/src/runner/types.ts (line 296)
send(event: TEvent): Result<readonly EffectAny[], TransitionError>;
```

There is no middleware hook or interceptor pattern that would allow injecting authorization logic before transition processing.

The guard system _could_ be used to implement authorization checks, but this is ad-hoc and not a formal security mechanism:

```typescript
// libs/flow/core/src/machine/guards.ts (example pattern)
const isAdmin = guard("isAdmin", ctx => ctx.role === "admin");
const hasPermission = guard("hasPermission", ctx => ctx.permissions.includes("write"));
const canEdit = and(isAdmin, hasPermission);
```

However, guards operate on the machine context, not on an external authentication/authorization system, and they are not enforced at the framework level.

---

### 4.9 Documentation -- Score: 7/10

**Strengths:**

All public APIs have TSDoc with `@typeParam`, `@param`, `@returns`, `@example`, and `@remarks`:

````typescript
// libs/flow/core/src/serialization/serialization.ts (lines 49-65)
/**
 * Serializes the current state of a machine runner into a plain object.
 *
 * The serialized state includes the machine ID, current state, context, and
 * a timestamp. It can be stored as JSON for persistence.
 *
 * @param runner - The machine runner to serialize
 * @param machineId - The machine's unique identifier
 * @returns Result with the serialized state, or error if context is not serializable
 *
 * @example
 * ```typescript
 * const result = serializeMachineState(runner, 'my-machine');
 * if (result._tag === 'Ok') {
 *   localStorage.setItem('state', JSON.stringify(result.value));
 * }
 * ```
 */
````

Every module has a `@packageDocumentation` header explaining its purpose and key responsibilities.

Internal functions are marked `@internal`.

**Gaps:**

- No formal GxP compliance documentation
- No IQ/OQ/PQ qualification protocol references
- No risk assessment documentation
- No formal traceability matrix linking requirements to test cases

---

### 4.10 Compliance-Specific for Flows -- Score: 5/10

**Strengths:**

State persistence via `serializeMachineState`/`restoreMachineState` enables flow resumption after system restart.

The `FlowRegistry` tracks all live machine instances:

```typescript
// libs/flow/core/src/introspection/flow-registry.ts (lines 52-58)
register(entry: RegistryEntry): void {
  if (disposed) return;
  const key = registryKey(entry.portName, entry.instanceId);
  entries.set(key, entry);
  notifyListeners({ type: "machine-registered", entry });
},
```

Health monitoring via `onHealthEvent` callback detects error state entry/exit:

```typescript
// libs/flow/core/src/runner/create-runner.ts (lines 808-827)
if (onHealthEvent !== undefined && prevState !== currentState) {
  const wasError = isErrorState(prevState, errorPatterns);
  const isNowError = isErrorState(currentState, errorPatterns);
  if (!wasError && isNowError) {
    onHealthEvent({
      type: "flow-error",
      machineId: machine.id,
      state: currentState,
      timestamp: Date.now(),
    });
  }
  // ...
}
```

Pending events are tracked with source and timestamp:

```typescript
// libs/flow/core/src/runner/types.ts (lines 43-52)
export interface PendingEvent {
  readonly type: string;
  readonly payload?: unknown;
  readonly source: "emit" | "delay" | "external";
  readonly enqueuedAt: number;
}
```

**Gaps:**

- No approval gate mechanism (e.g., requiring manager sign-off before a transition executes)
- No dual-control or multi-party authorization for critical transitions
- No step-level audit logging with configurable retention policies meeting 21 CFR Part 11
- No electronic signature support
- No flow composition with approval dependencies

---

## 5. Code Examples

### 5.1 Compliant Pattern: Effects as Data

Effects are pure immutable data descriptors, enabling inspection, serialization, and auditing before execution:

```typescript
// libs/flow/core/src/effects/types.ts (lines 166-191)
export interface InvokeEffect<TPort, TMethod, TArgs> extends BaseEffect<"Invoke"> {
  readonly port: TPort;
  readonly method: TMethod;
  readonly args: TArgs;
  readonly __resultType: MethodReturn<InferService<TPort>, TMethod>;
}
```

The interpreter separates transition computation from effect execution:

```typescript
// libs/flow/core/src/runner/interpreter.ts (lines 1198-1249)
export function transition(
  currentStateOrPath: string | readonly string[],
  currentContext: unknown,
  event: { readonly type: string },
  machine: MachineAny,
  historyMap?: HistoryMap
): TransitionResult {
  // Pure computation: no side effects
  const bubbleResult = bubbleEvent(activePath, currentContext, event, machine);
  // ...
  return onDoneResult; // Returns data, not side effects
}
```

### 5.2 Compliant Pattern: Result-Based Error Handling

No exceptions are thrown from the library's public API. All error paths return typed `Result` or `ResultAsync`:

```typescript
// libs/flow/core/src/runner/interpreter.ts (lines 1264-1338)
export function transitionSafe(
  currentStateOrPath: string | readonly string[],
  currentContext: unknown,
  event: { readonly type: string },
  machine: MachineAny,
  historyMap?: HistoryMap
): Result<TransitionResult, TransitionError> {
  // ... every step returns Result, errors propagate via err()
  if (bubbleResult._tag === "Err") {
    return err(bubbleResult.error);
  }
  // ...
}
```

### 5.3 Compliant Pattern: Activity Lifecycle Tracking

Activities have full lifecycle tracking with status, timestamps, and cleanup guarantees:

```typescript
// libs/flow/core/src/activities/manager.ts (lines 92-107)
interface MutableActivityState {
  id: string;
  status: ActivityStatus; // 'running' | 'completed' | 'failed' | 'cancelled'
  startTime: number;
  endTime: number | undefined;
  controller: AbortController;
  promise: Promise<void>;
  result: unknown;
  cleanupCalled: boolean; // Ensures cleanup runs exactly once
  cleanupReason: CleanupReason | undefined;
  timeoutId: ReturnType<typeof setTimeout> | undefined;
}
```

### 5.4 Non-Compliant Pattern: No Authorization Check

Events are processed without any identity or permission verification:

```typescript
// libs/flow/core/src/runner/create-runner.ts (lines 418-479)
function sendCore(event: { readonly type: string }): Result<...> {
  if (disposed) {
    return err(Disposed({ machineId: machine.id, operation: "send" }));
  }
  // No authorization check here
  // No identity propagation
  // No audit identity recording
  isProcessing = true;
  const initialResult = processEvent(event);
  // ...
}
```

### 5.5 Non-Compliant Pattern: Object.keys() in Parallel Regions

```typescript
// libs/flow/core/src/runner/interpreter.ts (lines 1560-1561)
for (const regionName of Object.keys(regionPaths.regions)) {
  // Region processing order depends on Object.keys() ordering
  // which is not formally guaranteed for string keys
```

---

## 6. Edge Cases & Known Limitations

### 6.1 Parallel Region Ordering (MEDIUM Risk)

**Issue:** Parallel regions are iterated using `Object.keys()` on the `regions` record. While modern engines (V8, SpiderMonkey, JSC) iterate string keys in insertion order, this is not formally guaranteed by the ECMAScript specification for all key types. If two regions process the same event and both modify the shared context, the final context value depends on iteration order.

**Location:** `interpreter.ts` lines 1560, 1432, 1482, 1512, 1677

**Impact:** In a GxP context, this could lead to non-reproducible context mutations when parallel regions share state. The same machine definition could produce different outcomes on different JavaScript engines.

**Mitigation:** Use an explicit ordered data structure (e.g., `Map` or sorted array) for region iteration, or document that parallel regions must not have conflicting context mutations.

### 6.2 No State Migration Framework (HIGH Risk)

**Issue:** `SerializedMachineState.version` is hardcoded to `1`. There is no mechanism to migrate serialized state when the machine definition changes (states added/removed/renamed, context shape changed).

**Location:** `serialization/serialization.ts` line 33

**Impact:** In a GxP environment, machine definitions evolve over time (new states, modified transitions). Without a migration framework, serialized state from older versions cannot be safely restored. The `restoreMachineState` function only validates that the serialized state name exists in the current machine definition, but does not validate context compatibility.

### 6.3 Circular Buffer Eviction (MEDIUM Risk)

**Issue:** `FlowMemoryCollector` uses a `CircularBuffer` for storing transitions. When the buffer is full, the oldest transitions are silently overwritten. The `FlowRetentionPolicy.expiryMs` (default 5 minutes) causes automatic deletion. This means audit records can be lost.

**Location:** `introspection/circular-buffer.ts`, `tracing/types.ts` line 244 (`expiryMs: 300000`)

**Impact:** For GxP compliance, audit records must be retained for the required period (often years). In-memory storage with eviction is fundamentally incompatible with GxP audit trail requirements.

### 6.4 Non-Deterministic Activity IDs (LOW Risk)

**Issue:** Activity IDs are generated using `Date.now().toString(36)` combined with `Math.random().toString(36)`:

```typescript
// libs/flow/core/src/activities/manager.ts (lines 328-332)
function generateActivityId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `activity-${timestamp}-${random}`;
}
```

**Impact:** `Math.random()` is not cryptographically secure. While activity IDs are not security-critical, in a GxP context, predictable or colliding IDs could cause activity tracking confusion. The randomness is also non-reproducible, making exact replay impossible.

### 6.5 Guard/Action Purity Not Enforced (MEDIUM Risk)

**Issue:** Guards and actions are user-provided functions. The library wraps them in `safeCall` to catch exceptions but cannot enforce purity. A guard that reads from `Date.now()`, network state, or a mutable global variable will produce non-deterministic transitions.

**Location:** `interpreter.ts` lines 151-157 (callGuard), 163-169 (callAction)

**Impact:** Non-pure guards violate determinism requirements. The same event+context pair could produce different transitions at different times, undermining reproducibility.

### 6.6 No Compensation for Partial Effect Execution (MEDIUM Risk)

**Issue:** When `sendAndExecute` runs effects sequentially and one fails midway, the already-executed effects are not compensated (rolled back). The `SequenceAborted` error captures the failing `stepIndex` but the caller has no information about which prior effects succeeded.

**Location:** `runner/create-runner.ts` lines 187-202

**Impact:** In regulated workflows, partial effect execution without compensation can leave the system in an inconsistent state. For example, if step 1 (debit account) succeeds but step 2 (credit account) fails, there is no built-in compensation.

### 6.7 Timestamp Accuracy and Trustworthiness (LOW Risk)

**Issue:** All timestamps use `Date.now()` and `performance.now()`, which are client-side and can be manipulated. There is no trusted time source integration.

**Impact:** In regulated environments, timestamps must be from a trusted, calibrated source. Client-side `Date.now()` can be skewed by system clock changes, NTP drift, or deliberate manipulation.

### 6.8 History Map Grows Unbounded (LOW Risk)

**Issue:** The `stateHistoryMap` in the runner grows with each compound state exit and is never pruned:

```typescript
// libs/flow/core/src/runner/create-runner.ts (line 385)
const stateHistoryMap = new Map<string, readonly string[]>();
```

**Impact:** For long-running machines that frequently enter and exit compound states, the history map could grow without bound. While each key maps to a single path (not accumulating), the number of unique keys grows with the number of distinct compound states visited.

---

## 7. Recommendations

### 7.1 Tier 1 -- Critical (Required for GxP Compliance)

| #   | Recommendation                                                                                                                                                                                                        | Effort | Impact                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| 1   | **Add authorization middleware** -- Implement a pre-transition hook that receives the event, current state, and a principal/identity context. Return `Result<void, AuthorizationError>` to allow or deny transitions. | HIGH   | Addresses the complete absence of access control (Section 4.8)                |
| 2   | **Implement approval gates** -- Add an `ApprovalGate` state node type or transition property that requires explicit approval from designated roles before a transition can proceed.                                   | HIGH   | Required for 21 CFR Part 11 regulated workflows                               |
| 3   | **Persistent, append-only audit trail** -- Define an `AuditSink` interface that accepts `FlowTransitionEvent` records and writes them to a persistent, append-only store. Include hash chaining for tamper detection. | HIGH   | Current in-memory storage with eviction cannot satisfy GxP audit requirements |
| 4   | **Add user/principal attribution** -- Extend `PendingEvent` and `FlowTransitionEvent` with a `principal` field identifying who triggered the event.                                                                   | MEDIUM | Required for ALCOA+ attributability                                           |

### 7.2 Tier 2 -- Important (Strongly Recommended)

| #   | Recommendation                                                                                                                                                                                                       | Effort | Impact                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------- |
| 5   | **State migration framework** -- Implement version-aware deserialization with registered migration functions. Increment `SerializedMachineState.version` when machine definitions change.                            | MEDIUM | Prevents data loss and restore failures during machine evolution |
| 6   | **Deterministic parallel region ordering** -- Replace `Object.keys()` iteration in parallel region processing with an explicitly sorted or ordered iteration strategy. Document the ordering contract.               | LOW    | Eliminates the cross-engine determinism concern                  |
| 7   | **Runtime event payload validation** -- Add an optional `validate` property to event definitions that accepts a schema (e.g., Zod, io-ts) for runtime validation of event payloads before transition processing.     | MEDIUM | Strengthens input verification beyond compile-time checks        |
| 8   | **Effect compensation/rollback** -- Implement a compensation pattern where each effect can optionally declare a compensation function. On sequential effect failure, previously executed effects can be compensated. | HIGH   | Prevents inconsistent system state from partial effect execution |

### 7.3 Tier 3 -- Nice-to-Have (Improves Compliance Posture)

| #   | Recommendation                                                                                                                                                                                                         | Effort | Impact                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------- |
| 9   | **Guard purity assertions** -- Add a test utility that verifies guard determinism by running the same guard with the same inputs multiple times and asserting identical results.                                       | LOW    | Catches non-deterministic guards during testing                |
| 10  | **Trusted timestamp integration** -- Define a `Clock` interface that the runner uses instead of `Date.now()`. Allow injection of a trusted/monotonic clock.                                                            | LOW    | Enables NTP-synchronized or hardware-timestamped audit records |
| 11  | **Cryptographic activity IDs** -- Replace `Math.random()` with `crypto.getRandomValues()` for activity ID generation.                                                                                                  | LOW    | Eliminates collision risk and predictability                   |
| 12  | **History map pruning** -- Add a configurable limit on history map entries, evicting least-recently-used entries when the limit is reached.                                                                            | LOW    | Prevents unbounded memory growth in long-running machines      |
| 13  | **Property-based testing** -- Add property-based tests (e.g., with fast-check) to verify state machine invariants: transitions never produce invalid states, effects are always produced in the documented order, etc. | MEDIUM | Strengthens confidence in correctness                          |

---

## 8. File Reference Guide

### 8.1 Core Machine System

| File              | Path                            | Purpose                                                                |
| ----------------- | ------------------------------- | ---------------------------------------------------------------------- |
| types.ts          | `src/machine/types.ts`          | Branded State, Event, Machine types; DeepReadonly; inference utilities |
| brands.ts         | `src/machine/brands.ts`         | Unique symbol declarations for nominal typing                          |
| state-node.ts     | `src/machine/state-node.ts`     | StateNode configuration (atomic/compound/parallel/final/history)       |
| transition.ts     | `src/machine/transition.ts`     | TransitionConfig with guard, actions, effects, target                  |
| guards.ts         | `src/machine/guards.ts`         | Named guards; and/or/not combinators                                   |
| actions.ts        | `src/machine/actions.ts`        | Named actions; composeActions                                          |
| define-machine.ts | `src/machine/define-machine.ts` | defineMachine factory with after-normalization                         |
| builder.ts        | `src/machine/builder.ts`        | Fluent builder DSL                                                     |
| factories.ts      | `src/machine/factories.ts`      | state() and event() factory functions                                  |
| config.ts         | `src/machine/config.ts`         | MachineConfig and MachineStatesRecord types                            |

### 8.2 Runner System

| File             | Path                          | Purpose                                                                                 |
| ---------------- | ----------------------------- | --------------------------------------------------------------------------------------- |
| interpreter.ts   | `src/runner/interpreter.ts`   | Pure transition logic, event bubbling, compound/parallel/history/always/onDone          |
| create-runner.ts | `src/runner/create-runner.ts` | MachineRunner factory, event queue, subscriber management, health events                |
| executor.ts      | `src/runner/executor.ts`      | EffectExecutor re-export and basic implementation                                       |
| types.ts         | `src/runner/types.ts`         | MachineSnapshot, MachineRunner, EffectExecutor, StateValue, PendingEvent, HistoryConfig |

### 8.3 Effects System

| File            | Path                          | Purpose                                                   |
| --------------- | ----------------------------- | --------------------------------------------------------- |
| types.ts        | `src/effects/types.ts`        | All 10 effect descriptor interfaces; EffectAny constraint |
| constructors.ts | `src/effects/constructors.ts` | Effect namespace with factory functions                   |

### 8.4 Activities System

| File       | Path                        | Purpose                                                                       |
| ---------- | --------------------------- | ----------------------------------------------------------------------------- |
| types.ts   | `src/activities/types.ts`   | Activity, ActivityInstance, ActivityStatus, ConfiguredActivity, CleanupReason |
| manager.ts | `src/activities/manager.ts` | ActivityManager with 3-layer timeout, lifecycle tracking                      |
| port.ts    | `src/activities/port.ts`    | ActivityPort factory (curried API)                                            |
| factory.ts | `src/activities/factory.ts` | activity() factory for ConfiguredActivity creation                            |
| events.ts  | `src/activities/events.ts`  | defineEvents, TypedEventSink                                                  |
| testing/   | `src/activities/testing/`   | Test utilities: event sink, signal, deps, harness                             |

### 8.5 Serialization

| File             | Path                                 | Purpose                                                          |
| ---------------- | ------------------------------------ | ---------------------------------------------------------------- |
| serialization.ts | `src/serialization/serialization.ts` | serializeMachineState, restoreMachineState, validateSerializable |
| errors.ts        | `src/serialization/errors.ts`        | Serialization/Restore error types                                |

### 8.6 Tracing & Introspection

| File                               | Path                                     | Purpose                                                                   |
| ---------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------- |
| tracing/types.ts                   | `src/tracing/types.ts`                   | FlowTransitionEvent, FlowTransitionFilter, FlowStats, FlowRetentionPolicy |
| tracing/collector.ts               | `src/tracing/collector.ts`               | FlowCollector interface                                                   |
| tracing/memory-collector.ts        | `src/tracing/memory-collector.ts`        | FlowMemoryCollector with filtering and stats                              |
| tracing/noop-collector.ts          | `src/tracing/noop-collector.ts`          | NoOpFlowCollector for zero overhead                                       |
| tracing/tracing-runner.ts          | `src/tracing/tracing-runner.ts`          | createTracingRunner, createTracingRunnerWithDuration                      |
| introspection/flow-registry.ts     | `src/introspection/flow-registry.ts`     | Live machine instance tracking                                            |
| introspection/flow-inspector.ts    | `src/introspection/flow-inspector.ts`    | Aggregated query API (state, history, health, effects)                    |
| introspection/flow-tracing-hook.ts | `src/introspection/flow-tracing-hook.ts` | Distributed tracing span creation                                         |
| introspection/circular-buffer.ts   | `src/introspection/circular-buffer.ts`   | Fixed-size circular buffer for history                                    |
| introspection/types.ts             | `src/introspection/types.ts`             | FlowInspector, FlowRegistry, FlowTracingHook interfaces                   |

### 8.7 Integration (HexDI)

| File                         | Path                                           | Purpose                                        |
| ---------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| adapter.ts                   | `src/integration/adapter.ts`                   | createFlowAdapter factory                      |
| di-executor.ts               | `src/integration/di-executor.ts`               | DI-integrated EffectExecutor                   |
| registry-adapter.ts          | `src/integration/registry-adapter.ts`          | FlowRegistryAdapter for container              |
| inspector-adapter.ts         | `src/integration/inspector-adapter.ts`         | FlowInspectorAdapter for container             |
| event-bus-adapter.ts         | `src/integration/event-bus-adapter.ts`         | FlowEventBusAdapter for container              |
| tracing-bridge.ts            | `src/integration/tracing-bridge.ts`            | Bridge between flow tracing and HexDI tracing  |
| activity-validation.ts       | `src/integration/activity-validation.ts`       | Adapter-level activity validation              |
| metadata.ts                  | `src/integration/metadata.ts`                  | Flow metadata computation                      |
| port.ts                      | `src/integration/port.ts`                      | DI port definitions for introspection services |
| types.ts                     | `src/integration/types.ts`                     | FlowService, FlowPort, DIEffectExecutor types  |
| library-inspector-adapter.ts | `src/integration/library-inspector-adapter.ts` | Library-level inspector adapter                |
| library-inspector-bridge.ts  | `src/integration/library-inspector-bridge.ts`  | Library inspector bridge                       |

### 8.8 Patterns

| File            | Path                           | Purpose                             |
| --------------- | ------------------------------ | ----------------------------------- |
| retry.ts        | `src/patterns/retry.ts`        | Retry with exponential backoff      |
| actor.ts        | `src/patterns/actor.ts`        | Machine-as-activity pattern         |
| subscription.ts | `src/patterns/subscription.ts` | Subscription activity pattern       |
| coordination.ts | `src/patterns/coordination.ts` | waitForAll, waitForAny coordination |

### 8.9 Errors

| File             | Path                          | Purpose                                       |
| ---------------- | ----------------------------- | --------------------------------------------- |
| tagged-errors.ts | `src/errors/tagged-errors.ts` | All 16 error type definitions across 5 unions |

### 8.10 Event Bus

| File              | Path                              | Purpose                     |
| ----------------- | --------------------------------- | --------------------------- |
| flow-event-bus.ts | `src/event-bus/flow-event-bus.ts` | Cross-machine event pub/sub |

---

_End of GxP Compliance Analysis Report for @hex-di/flow_
