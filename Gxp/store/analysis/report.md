# GxP Compliance Analysis Report: @hex-di/store

**Package:** `@hex-di/store` v0.1.0
**Analysis Date:** 2026-02-10
**Analyzer:** Claude Opus 4.6
**Source Location:** `libs/store/core/src/`
**Test Location:** `libs/store/core/tests/`, `libs/store/react/tests/`, `libs/store/testing/tests/`

---

## 1. Executive Summary

**Overall GxP Compliance Score: 7.5 / 10**

`@hex-di/store` is a reactive state management library built on the hexagonal architecture port/adapter pattern. It provides signal-based reactivity (via `alien-signals`), deep-frozen immutable state, typed action reducers, computed derived values, async derived services with retry semantics, and a comprehensive inspection/introspection subsystem. The library demonstrates strong compile-time type safety, thorough immutability enforcement, and extensive mutation-killing test coverage. However, several gaps exist for full GxP compliance: tracing is opt-in rather than mandatory, runtime payload validation is absent (relying entirely on compile-time types), there is no automatic rollback on effect failure, and the deep freeze early-exit optimization introduces a subtle correctness edge case.

| Criteria                   | Score  | Weight   | Weighted |
| -------------------------- | ------ | -------- | -------- |
| State Immutability         | 8.5/10 | 15%      | 1.28     |
| Audit Trail / Tracing      | 6.0/10 | 15%      | 0.90     |
| Error Containment          | 8.0/10 | 10%      | 0.80     |
| Type Safety                | 9.0/10 | 10%      | 0.90     |
| Test Coverage              | 9.0/10 | 10%      | 0.90     |
| Lifecycle Management       | 7.5/10 | 10%      | 0.75     |
| Deterministic Behavior     | 7.0/10 | 10%      | 0.70     |
| Inspection & Observability | 8.0/10 | 5%       | 0.40     |
| Effect Safety              | 6.0/10 | 10%      | 0.60     |
| Dependency Isolation       | 7.5/10 | 5%       | 0.38     |
| **Total**                  |        | **100%** | **7.61** |

**Rounded Score: 7.5/10**

---

## 2. Package Overview

### 2.1 Purpose

`@hex-di/store` provides reactive state management integrated with the HexDI dependency injection container. It separates state definition (ports) from state implementation (adapters), enabling testable, swappable state layers.

### 2.2 Architecture

The library follows a strict ports-and-adapters architecture:

- **Ports** define typed contracts for state shape, actions, and service interfaces
- **Adapters** provide concrete implementations backed by `alien-signals` reactivity
- **Services** implement runtime behavior (state transitions, subscriptions, disposal)
- **Inspection** provides introspection, action history, and subscriber graph building
- **Integration** bridges to distributed tracing and container-level inspection

### 2.3 Source Metrics

| Metric                     | Count                                                 |
| -------------------------- | ----------------------------------------------------- |
| Source files (core)        | 55                                                    |
| Test files (total)         | 80                                                    |
| Mutation-killer test files | 10                                                    |
| Mutation-killer test lines | ~11,083                                               |
| Exported types             | 70+                                                   |
| Exported functions         | 40+                                                   |
| Error tag types            | 10                                                    |
| Port type variants         | 5 (State, Atom, Derived, AsyncDerived, LinkedDerived) |

### 2.4 Dependencies

| Dependency       | Type                   | Purpose                                           |
| ---------------- | ---------------------- | ------------------------------------------------- |
| `@hex-di/core`   | workspace              | Port/adapter primitives, DI container integration |
| `@hex-di/result` | workspace              | Result/ResultAsync monadic error handling         |
| `alien-signals`  | peer (>=1.0)           | Signal reactivity engine                          |
| `typescript`     | peer (>=5.0, optional) | Type checking                                     |

---

## 3. GxP Compliance Matrix

| GxP Requirement        | Status  | Evidence                                                                   |
| ---------------------- | ------- | -------------------------------------------------------------------------- |
| **Data Integrity**     | Partial | Deep freezing enforces immutability; no runtime payload validation         |
| **Audit Trail**        | Partial | Action history with sampling/filtering; tracing is opt-in                  |
| **Change Control**     | Strong  | Pure reducers `(state, payload) => newState`; frozen action objects        |
| **Electronic Records** | Strong  | ActionHistoryEntry captures prevState, nextState, timestamps, traceId      |
| **Error Handling**     | Strong  | Tagged union errors with `_tag` discriminant; Result-based error flow      |
| **Validation**         | Weak    | Compile-time only via TypeScript types; no runtime schema validation       |
| **Traceability**       | Partial | W3C Trace Context support; optional StoreTracingHook                       |
| **Access Control**     | Partial | DisposedStateAccess prevents post-disposal access; no user-level authz     |
| **System Reliability** | Strong  | Disposal lifecycle, circular dependency detection, batch error containment |
| **Testing**            | Strong  | 551+ mutation-killing tests across 10 dedicated test files                 |

---

## 4. Detailed Analysis

### 4.1 State Immutability (8.5/10)

**Strengths:**

The library enforces runtime immutability through `deepFreeze()`, which recursively freezes all object properties. Every state access path (`state`, `value`, `subscribe` callbacks) passes through `deepFreeze()` before reaching consumer code.

Source: `libs/store/core/src/utils/deep-freeze.ts`

```typescript
export function deepFreeze<T>(obj: T): DeepReadonly<T>;
export function deepFreeze(obj: unknown): unknown {
  if (!isRecord(obj)) return obj;
  if (Object.isFrozen(obj)) return obj;

  Object.freeze(obj);

  for (const value of Object.values(obj)) {
    if (isRecord(value) && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }

  return obj;
}
```

The `DeepReadonly<T>` type provides compile-time immutability enforcement across all nested properties, with special handling for Maps, Sets, arrays, and functions:

Source: `libs/store/core/src/types/deep-readonly.ts`

```typescript
export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<K, DeepReadonly<V>>
    : T extends ReadonlySet<infer U>
      ? ReadonlySet<DeepReadonly<U>>
      : T extends readonly (infer U)[]
        ? readonly DeepReadonly<U>[]
        : T extends object
          ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
          : T;
```

**Known Issue: Early-Exit Optimization Bug**

The `Object.isFrozen(obj)` check on line 3 of the freeze function causes an early return for pre-frozen top-level objects, skipping recursive freezing of unfrozen nested children. This is documented and tested:

Source: `libs/store/core/tests/deep-freeze.test.ts` (lines 98-107)

```typescript
it("already-frozen top-level object returns immediately", () => {
  const obj = { a: 1, b: { c: 2 } };
  Object.freeze(obj);
  // Note: b is NOT frozen because Object.freeze is shallow
  // deepFreeze should return immediately since obj itself is frozen
  const result = deepFreeze(obj);
  expect(result).toBe(obj);
  // The inner object b should NOT be frozen because deepFreeze returned early
  expect(Object.isFrozen(obj.b)).toBe(false);
});
```

This means if external code performs a shallow `Object.freeze()` on a state object before it enters the store, nested children may remain mutable. In practice this is mitigated because the store internally constructs and freezes its own state snapshots, but it represents a theoretical GxP risk when state objects are shared across boundaries.

### 4.2 Audit Trail / Tracing (6.0/10)

**Strengths:**

The action history system records every state transition with full context:

Source: `libs/store/core/src/types/inspection.ts` (lines 120-134)

```typescript
export interface ActionHistoryEntry {
  readonly id: string;
  readonly portName: string;
  readonly actionName: string;
  readonly payload: unknown;
  readonly prevState: unknown;
  readonly nextState: unknown;
  readonly timestamp: number;
  readonly effectStatus: "none" | "pending" | "completed" | "failed";
  readonly effectError?: EffectFailedError;
  readonly parentId: string | null;
  readonly order: number;
  readonly traceId?: string;
  readonly spanId?: string;
}
```

Reservoir sampling allows controlled history recording under high throughput, with `alwaysRecord` overrides for critical actions:

Source: `libs/store/core/src/inspection/action-history.ts` (lines 41-76)

```typescript
function shouldRecord(
  entry: ActionHistoryEntry,
  config: ActionHistoryConfig,
  seenCount: number
): boolean {
  // Always-record overrides bypass sampling
  if (config.alwaysRecord) {
    const { effectStatus, portNames, actionNames } = config.alwaysRecord;

    if (effectStatus) {
      const status = entry.effectStatus;
      if ((status === "failed" || status === "pending") && effectStatus.includes(status)) {
        return true;
      }
    }

    if (portNames && portNames.includes(entry.portName)) {
      return true;
    }

    if (actionNames && actionNames.includes(entry.actionName)) {
      return true;
    }
  }

  // Sampling rate check
  const rate = config.samplingRate ?? 1;
  if (rate >= 1) return true;
  if (rate <= 0) return false;

  if (seenCount === 0) return true; // Always record first
  return Math.random() < rate;
}
```

**Weaknesses:**

- **Tracing is opt-in.** The `StoreTracingHook` must be explicitly provided via `tracingHook` config or resolved from the DI container with `inspection: true`. Without it, no distributed trace context is captured. For GxP compliance, tracing should be mandatory or at least produce a warning when absent.
- **History recording is opt-in.** The `inspection` flag on adapters defaults to `false`. Without it, no action history is recorded.
- **Sampling introduces data loss.** When `samplingRate < 1`, some actions are probabilistically dropped from the audit trail. GxP environments typically require complete audit trails.
- **`Math.random()` for sampling.** The sampling implementation uses non-deterministic `Math.random()`, making audit trail completeness non-reproducible.

### 4.3 Error Containment (8.0/10)

**Strengths:**

All errors are tagged union types with a `_tag` discriminant, enabling exhaustive pattern matching:

Source: `libs/store/core/src/errors/tagged-errors.ts` (lines 252-259)

```typescript
export type StoreError =
  | DisposedStateAccess
  | DerivedComputationFailed
  | AsyncDerivedExhausted
  | CircularDerivedDependency
  | BatchExecutionFailed
  | WaitForStateTimeout
  | InvalidComputedGetter;
```

Each error type carries structured context (port name, action name, cause chain) and a `code` string constant for programmatic handling. Errors are classified as `isProgrammingError: true | false` to distinguish developer mistakes from operational failures:

Source: `libs/store/core/src/errors/tagged-errors.ts` (lines 19-39)

```typescript
const _DisposedStateAccess = createError("DisposedStateAccess");
export const DisposedStateAccess = (fields: {
  readonly portName: string;
  readonly containerName: string;
  readonly operation: "state" | "value" | "actions" | "subscribe" | "set" | "update" | "refresh";
}): DisposedStateAccess =>
  _DisposedStateAccess({
    ...fields,
    code: "DISPOSED_STATE_ACCESS" as const,
    isProgrammingError: true as const,
    message: `Cannot access '${fields.operation}' on port '${fields.portName}' from disposed container '${fields.containerName}'.`,
  });
```

Batch execution errors are contained -- deferred notifications are always flushed even when the batch callback throws:

Source: `libs/store/core/src/reactivity/batch.ts` (lines 95-150)

```typescript
export function batch(
  containerOrScope: object | null,
  fn: () => void,
  system?: ReactiveSystemInstance
): Result<void, BatchExecutionFailed> {
  // ... cross-container detection, depth tracking ...

  if (system !== undefined) {
    system.startBatch();
  } else {
    startBatch();
  }

  const result = tryCatch(fn, cause => BatchExecutionFailed({ cause }));

  if (system !== undefined) {
    system.endBatch();
  } else {
    endBatch();
  }

  // ... cleanup depth tracking ...
  return result;
}
```

**Weakness:** Effect adapter errors are silently swallowed to prevent cross-cutting concerns from disrupting state transitions:

Source: `libs/store/core/src/services/state-service-impl.ts` (lines 169-178)

```typescript
for (const adapter of config.effectAdapters) {
  // Effect adapter errors are swallowed -- cross-cutting concerns
  // must not disrupt the main state transition flow
  tryCatch(
    () => {
      void adapter.onAction(event);
    },
    cause => EffectAdapterError({ cause })
  ).inspectErr(err => config.onError?.(err));
}
```

While this prevents cascading failures, it means effect adapter errors may go unnoticed in production if `onError` is not configured.

### 4.4 Type Safety (9.0/10)

**Strengths:**

The type system is exceptionally well-designed with several advanced TypeScript patterns:

**Branded NoPayload sentinel** prevents the `undefined extends void` ambiguity:

Source: `libs/store/core/src/types/actions.ts` (lines 18-27)

```typescript
declare const __noPayload: unique symbol;

export type NoPayload = { readonly [__noPayload]: true };
```

**ActionReducer** uses distribution guards to prevent union widening:

Source: `libs/store/core/src/types/actions.ts` (lines 42-44)

```typescript
export type ActionReducer<TState, TPayload = NoPayload> = [TPayload] extends [NoPayload]
  ? (state: TState) => TState
  : (state: TState, payload: TPayload) => TState;
```

**ActionMap** uses `never[]` rest params to allow both 1-ary and 2-ary reducer shapes without contravariance issues:

Source: `libs/store/core/src/types/actions.ts` (lines 57-58)

```typescript
export type ActionMap<TState> = Record<string, (state: TState, ...args: never[]) => TState>;
```

**Phantom type brands** on port definitions enable type inference without runtime overhead:

Source: `libs/store/core/src/ports/port-types.ts` (lines 41-48)

```typescript
export type StatePortDef<
  TName extends string,
  TState,
  TActions extends ActionMap<TState>,
> = DirectedPort<StateService<TState, TActions>, TName, "outbound"> & {
  readonly [__stateType]: TState;
  readonly [__actionsType]: TActions;
};
```

**BoundActions** correctly strips the state parameter from reducers, exposing only the payload:

Source: `libs/store/core/src/types/actions.ts` (lines 71-77)

```typescript
export type BoundActions<TState, TActions extends ActionMap<TState>> = {
  readonly [K in keyof TActions]: TActions[K] extends (state: TState) => TState
    ? () => void
    : TActions[K] extends (state: TState, payload: infer P) => TState
      ? (payload: P) => void
      : never;
};
```

**Weakness:** No runtime payload validation exists. The type system prevents compile-time type errors but cannot guard against incorrect data at runtime boundaries (e.g., deserialized JSON, external API responses). For GxP-compliant systems processing electronic records, runtime schema validation is typically required.

### 4.5 Test Coverage (9.0/10)

**Strengths:**

The library has exceptional test coverage with dedicated mutation-killing test suites:

- **10 mutation-killer test files** totaling ~11,083 lines of test code
- **80 total test files** across core, react, and testing sub-packages
- **E2E test suites** covering realistic scenarios: counter, cart-with-totals, todo-list, temperature-converter, async-derived, scope-lifecycle
- **Integration tests** for container-graph, container-lifecycle, reactivity, tracing, auto-registration, auto-recording, MCP resources
- **Dedicated tests** for deep-freeze, cycle-detection, path-tracking, batch-and-utils, signal-isolation

The mutation-killer tests are specifically designed to catch survived Stryker mutants, ensuring that every branch, boundary condition, and guard clause is exercised.

**Minor gaps:**

- Cross-container batch interference is tested via diagnostics callbacks but not exhaustively under concurrent-like patterns
- The `Math.random()` sampling path in action history is inherently non-deterministic and hard to test exhaustively

### 4.6 Lifecycle Management (7.5/10)

**Strengths:**

Every service implementation tracks disposal state and throws `DisposedStateAccess` on post-disposal access:

Source: `libs/store/core/src/services/state-service-impl.ts` (lines 135-143, 499-506)

```typescript
function checkDisposed(operation: "state" | "actions" | "subscribe"): void {
  if (disposed) {
    throw DisposedStateAccess({
      portName: config.portName,
      containerName: config.containerName,
      operation,
    });
  }
}

dispose(): void {
  disposed = true;
  for (const eff of activeEffects) {
    eff.dispose();
  }
  activeEffects.length = 0;
  _subscriberCount = 0;
},
```

Reactive effects are tracked in `activeEffects` arrays and properly disposed during service teardown. Subscriber counts are decremented on unsubscribe and zeroed on disposal.

**Weaknesses:**

- The `disposed` flag is a simple boolean with no disposal timestamp or reason tracking
- No hooks exist for pre-disposal cleanup (e.g., flushing pending async effects)
- Async derived services that are mid-fetch when disposed will silently discard results (correct behavior but not logged)

### 4.7 Deterministic Behavior (7.0/10)

**Strengths:**

Pure reducers ensure state transitions are deterministic:

```typescript
// Reducers are pure functions: (state) => newState or (state, payload) => newState
export type ActionReducer<TState, TPayload = NoPayload> = [TPayload] extends [NoPayload]
  ? (state: TState) => TState
  : (state: TState, payload: TPayload) => TState;
```

The `batch()` function guarantees notification ordering within a batch context. Circular dependency detection prevents infinite loops in derived computations:

Source: `libs/store/core/src/services/cycle-detection.ts` (lines 35-50)

```typescript
export function withCycleDetection<T>(portName: string, fn: () => T): T {
  if (_evaluationSet.has(portName)) {
    const cycleStart = _evaluationStack.indexOf(portName);
    const chain = [..._evaluationStack.slice(cycleStart), portName];
    throw CircularDerivedDependency({ dependencyChain: chain });
  }

  _evaluationStack.push(portName);
  _evaluationSet.add(portName);
  try {
    return fn();
  } finally {
    _evaluationStack.pop();
    _evaluationSet.delete(portName);
  }
}
```

**Weaknesses:**

- **`Date.now()` for timestamps.** Action history entries, snapshot timestamps, and `_lastActionAt` all use `Date.now()`. In GxP systems, a monotonic clock or injected time source is preferred for ordering guarantees.
- **`Math.random()` in sampling.** The reservoir sampling implementation uses non-deterministic randomness, making audit trail behavior non-reproducible.
- **Module-scope cycle detection state.** The `_evaluationStack` and `_evaluationSet` are module-scoped, meaning cycle detection works globally rather than per-container. While correct due to JS single-threading, it creates implicit coupling between containers.

### 4.8 Inspection & Observability (8.0/10)

**Strengths:**

The inspection subsystem is comprehensive:

- **StoreInspectorAPI** provides real-time snapshots of all store state, subscriber graphs, and action history
- **SubscriberGraph** models the reactive dependency topology with typed nodes and edges
- **StoreInspectorEvent** is a discriminated union covering all observable state transitions
- **MCP Resources** integration provides structured resource handlers for external tooling
- **Library Inspector Bridge** connects store inspection to the container-level unified inspection protocol

Source: `libs/store/core/src/inspection/subscriber-graph.ts` (lines 67-122)

```typescript
export function buildSubscriberGraph(
  registrations: readonly AdapterRegistration[]
): SubscriberGraph {
  const nodes: SubscriberNode[] = [];
  const edges: SubscriberEdge[] = [];
  const nodeIds = new Set<string>();

  for (const reg of registrations) {
    const kind = classifyAdapter(reg.adapter);

    if (!nodeIds.has(reg.portName)) {
      nodes.push({
        id: reg.portName,
        kind,
        subscriberCount: reg.subscriberCount,
      });
      nodeIds.add(reg.portName);
    }

    if (kind === "derived" || kind === "async-derived") {
      for (const reqName of reg.requires) {
        edges.push({
          from: reqName,
          to: reg.portName,
          type: "derives-from",
        });
      }
    } else {
      for (const reqName of reg.requires) {
        edges.push({
          from: reg.portName,
          to: reqName,
          type: "subscribes-to",
        });
      }
    }

    for (const writeName of reg.writesTo) {
      edges.push({
        from: reg.portName,
        to: writeName,
        type: "writes-to",
      });
    }
  }

  return {
    correlationId: generateCorrelationId(),
    nodes,
    edges,
  };
}
```

**Weakness:** The cross-container batch detection relies on `WeakRef` and manual candidate passing to `batchTargets()`, which limits automatic detection in complex multi-container setups.

### 4.9 Effect Safety (6.0/10)

**Strengths:**

Effects use `tryCatch` for error containment, and effect failures are routed through the `EffectErrorHandler` with full context (error, action name, prev/next state, bound actions for compensation):

Source: `libs/store/core/src/types/effects.ts` (lines 54-62)

```typescript
export interface EffectErrorHandler<TState, TActions extends ActionMap<TState>> {
  (context: {
    readonly error: EffectFailedError;
    readonly actionName: keyof TActions & string;
    readonly state: DeepReadonly<TState>;
    readonly prevState: DeepReadonly<TState>;
    readonly actions: BoundActions<TState, TActions>;
  }): void;
}
```

Async effects use `ResultAsync` for typed error propagation with configurable retry:

Source: `libs/store/core/src/services/async-derived-service-impl.ts` (lines 34-43)

```typescript
export interface AsyncDerivedServiceConfig<TResult, E> {
  readonly portName: string;
  readonly containerName: string;
  readonly select: () => ResultAsync<TResult, E>;
  readonly staleTime?: number;
  readonly retryCount?: number;
  readonly retryDelay?: number | ((attempt: number) => number);
  readonly tracingHook?: StoreTracingHook;
  readonly inspector?: StoreInspectorInternal;
  readonly reactiveSystem?: ReactiveSystemInstance;
}
```

**Weaknesses:**

- **No automatic rollback on effect failure.** When an effect throws, the state transition has already been committed (`sig.set(nextState)` precedes effect execution). The `onEffectError` handler receives `prevState` and `actions` for manual compensation, but there is no built-in rollback mechanism.
- **Async effect fire-and-forget.** Async effects spawned from `doFetch()` use `void` to discard the promise. If an async effect rejects after disposal, it is silently discarded.
- **Effect adapter errors are swallowed.** While this prevents cascading failures, it means cross-cutting effect processing errors may go unnoticed.

### 4.10 Dependency Isolation (7.5/10)

**Strengths:**

The `createIsolatedReactiveSystem()` factory provides fully isolated reactive graphs per container:

Source: `libs/store/core/src/reactivity/system-factory.ts` (lines 119-126)

```typescript
export function createIsolatedReactiveSystem(): ReactiveSystemInstance {
  // Instance-scoped state (replaces module globals from alien-signals/index.mjs)
  let cycle = 0;
  let batchDepth = 0;
  let notifyIndex = 0;
  let queuedLength = 0;
  let activeSub: ReactiveNode | undefined;
  const queued: Array<EffectNode | undefined> = [];
  // ...
```

Each system maintains its own dependency graph, batch queue, and subscriber tracking. Signals created in one system cannot register as dependencies in another system's computeds or effects.

The `untracked()` utility correctly isolates read operations from the current reactive tracking scope:

Source: `libs/store/core/src/reactivity/signals.ts` (lines 30-47)

```typescript
export function untracked<T>(fn: () => T, system?: ReactiveSystemInstance): T {
  if (system !== undefined) {
    const prev = system.getActiveSub();
    system.setActiveSub(undefined);
    try {
      return fn();
    } finally {
      system.setActiveSub(prev);
    }
  }
  const prev = alienGetActiveSub();
  alienSetActiveSub(undefined);
  try {
    return fn();
  } finally {
    alienSetActiveSub(prev);
  }
}
```

**Weakness:** When no explicit `ReactiveSystemInstance` is provided, services default to the global `alien-signals` module-level state. This means multiple containers sharing the default system can experience cross-container signal interference. The batch cross-container detection system mitigates this but relies on diagnostic callbacks rather than hard enforcement.

---

## 5. Code Examples

### 5.1 State Port and Adapter Definition

Source: `libs/store/core/src/ports/factories.ts`

```typescript
export function createStatePort<TState, TActions extends ActionMap<TState>>(): <
  const TName extends string,
>(
  config: PortConfig<TName>
) => StatePortDef<TName, TState, TActions> {
  function factory<const TName extends string>(
    config: PortConfig<TName>
  ): StatePortDef<TName, TState, TActions>;
  function factory<const TName extends string>(config: PortConfig<TName>): unknown {
    return createPort<TName, unknown>(config);
  }
  return factory;
}
```

### 5.2 State Service Implementation (Reducer Dispatch)

Source: `libs/store/core/src/services/state-service-impl.ts` (lines 248-268)

```typescript
record[actionName] = (...args: unknown[]): void => {
  checkDisposed("actions");

  const spanResult = tryCatch(
    () => resolvedTracingHook?.onActionStart(config.portName, actionName, config.containerName),
    () => undefined
  );
  const spanCtx: StoreSpanContext = spanResult.isOk() && spanResult.value ? spanResult.value : {};
  let actionOk = true;

  const prevState = sig.get();
  const nextState = callReducer(reducer, prevState, args);

  sig.set(nextState);
  _actionCount++;
  _lastActionAt = Date.now();
  // ... effect execution, inspector recording ...
};
```

### 5.3 History Port (Undo/Redo Reducers)

Source: `libs/store/core/src/ports/history-port.ts` (lines 27-65)

```typescript
export function createHistoryActions<TState>(): HistoryActions<TState> {
  return Object.freeze({
    undo(state: HistoryState<TState>): HistoryState<TState> {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
    },

    redo(state: HistoryState<TState>): HistoryState<TState> {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      };
    },

    push(state: HistoryState<TState>, payload: TState): HistoryState<TState> {
      return {
        past: [...state.past, state.present],
        present: payload,
        future: [],
      };
    },

    clear(state: HistoryState<TState>): HistoryState<TState> {
      return {
        past: [],
        present: state.present,
        future: [],
      };
    },
  });
}
```

### 5.4 Proxy-Based Path Tracking

Source: `libs/store/core/src/reactivity/path-tracking.ts` (lines 45-96)

```typescript
export function createTrackingProxy<T>(state: T): { proxy: T; paths: Set<string> } {
  const paths = new Set<string>();

  function makeProxy<U>(target: U, prefix: string): U {
    if (!isRecord(target)) return target;

    return new Proxy(target, {
      get(obj, prop, receiver) {
        if (typeof prop === "symbol") {
          const symbolValue: unknown = Reflect.get(obj, prop, receiver);
          return symbolValue;
        }

        const path = prefix ? `${prefix}.${prop}` : prop;
        paths.add(path);

        const value: unknown = Reflect.get(obj, prop, receiver);

        if (isRecord(value)) {
          const desc = Object.getOwnPropertyDescriptor(obj, prop);
          if (desc && !desc.configurable && !desc.writable) {
            return value;
          }
          return makeProxy(value, path);
        }

        return value;
      },
    });
  }

  const proxy = makeProxy(state, "");
  return { proxy, paths };
}
```

### 5.5 Signal Reactivity Primitives

Source: `libs/store/core/src/reactivity/signals.ts` (lines 70-89)

```typescript
export function createSignal<T>(initial: T, system?: ReactiveSystemInstance): Signal<T> {
  if (system !== undefined) {
    const s = system.signal(initial);
    return {
      get: () => s(),
      set: (value: T) => {
        s(value);
      },
      peek: () => untracked(() => s(), system),
    };
  }
  const s = alienSignal(initial);
  return {
    get: () => s(),
    set: (value: T) => {
      s(value);
    },
    peek: () => untracked(() => s()),
  };
}
```

### 5.6 Tracing Bridge

Source: `libs/store/core/src/integration/tracing-bridge.ts` (lines 101-141)

```typescript
export function createStoreTracingBridge(config: StoreTracingBridgeConfig): StoreTracingHook {
  let _active = false;
  // ...

  return {
    onActionStart(portName: string, actionName: string, containerName: string): StoreSpanContext {
      if (!shouldTrace(portName)) {
        return {};
      }

      const attributes = buildAttributes(portName, containerName);
      attributes["store.action"] = actionName;

      config.tracer.pushSpan(`store.${portName}.${actionName}`, attributes);
      _active = true;

      return config.getSpanContext?.() ?? {};
    },

    onActionEnd(ok: boolean): void {
      if (!_active) return;
      _active = false;
      config.tracer.popSpan(ok ? "ok" : "error");
    },

    // ... onAtomUpdate, onDerivedRecompute, onAsyncDerivedFetch ...
  };
}
```

---

## 6. Edge Cases & Known Limitations

### 6.1 Deep Freeze Early-Exit for Pre-Frozen Objects

**Severity: Medium**

When `deepFreeze()` receives an object that is already frozen at the top level (e.g., via a prior shallow `Object.freeze()`), it returns immediately without recursing into unfrozen nested children. This is an intentional performance optimization but violates the expectation that all nested state is guaranteed frozen.

**Impact:** If external code shallow-freezes a state object before passing it through the store, nested mutable children may be exposed to consumers.

**Mitigation:** The store internally constructs all state objects, so this edge case is unlikely in normal usage. However, when hydrating state from external sources, care must be taken.

### 6.2 No Runtime Payload Validation

**Severity: High (for GxP)**

The library relies entirely on TypeScript's compile-time type system for action payload validation. There is no runtime schema validation (e.g., Zod, io-ts, or custom validators). Payloads arriving from untyped boundaries (user input, JSON deserialization, message queues) can carry unexpected shapes.

**Impact:** A malformed payload will silently pass through the reducer, potentially producing an invalid state. The `ActionMap` constraint `(state, ...args: never[]) => state` prevents compile-time type errors but the `applyDynamic` bridge passes runtime arguments without validation.

### 6.3 No Automatic Rollback on Effect Failure

**Severity: Medium**

The state transition (`sig.set(nextState)`) is committed before effects are executed. If an effect throws, the state remains at `nextState`. The `onEffectError` handler provides `prevState` and `actions` for manual compensation, but there is no built-in rollback mechanism.

```typescript
// In state-service-impl.ts, line 262-263:
const nextState = callReducer(reducer, prevState, args);
sig.set(nextState);
// Effects run AFTER state is committed
```

**Impact:** In GxP scenarios where state must remain consistent with external systems (e.g., lab instrument commands), a failed effect can leave the store in a state that does not reflect the actual system status.

### 6.4 Sampling Introduces Non-Deterministic Audit Gaps

**Severity: Medium (for GxP)**

When `ActionHistoryConfig.samplingRate < 1`, action recording uses `Math.random()` to probabilistically skip entries. This means the audit trail is incomplete and non-reproducible.

**Impact:** GxP regulations (21 CFR Part 11, EU Annex 11) typically require complete audit trails for electronic records. Any sampling introduces compliance risk.

### 6.5 Module-Scoped Cycle Detection State

**Severity: Low**

The `_evaluationStack` and `_evaluationSet` in `cycle-detection.ts` are module-scoped globals. While JS single-threading makes this safe, it creates implicit coupling between independent container instances. If two containers evaluate derived ports with the same `portName`, they share the same cycle detection state.

**Impact:** In practice, port names should be unique per container, but this is not enforced at the type level or runtime. A naming collision could cause a false-positive `CircularDerivedDependency` error.

### 6.6 Cross-Container Batch Leakage

**Severity: Low-Medium**

When using the default global `alien-signals` system (no explicit `ReactiveSystemInstance`), batch operations from different containers share the same global `startBatch()`/`endBatch()` state. The `setBatchDiagnostics()` callback detects this but does not prevent it.

Source: `libs/store/core/src/reactivity/batch.ts` (lines 100-107)

```typescript
if (_onCrossContainerBatch !== null && _activeBatchTarget !== null) {
  const existing = _activeBatchTarget.deref();
  if (existing !== undefined && existing !== containerOrScope) {
    _onCrossContainerBatch(containerOrScope, existing);
  }
}
```

**Impact:** A batch started in Container A that encompasses a state change in Container B will defer Container B's notifications until Container A's batch ends, potentially causing unexpected timing behavior.

### 6.7 AsyncDerived Stale Time Uses Date.now()

**Severity: Low**

The `isStale()` check in `AsyncDerivedServiceImpl` uses `Date.now()` which is non-monotonic and subject to system clock adjustments:

```typescript
function isStale(): boolean {
  if (config.staleTime === undefined || _lastFetchTime === 0) return false;
  return Date.now() - _lastFetchTime >= config.staleTime;
}
```

**Impact:** System clock changes (NTP sync, DST transitions, manual adjustments) can cause premature or delayed stale detection.

### 6.8 Effect Adapter Error Swallowing

**Severity: Low-Medium**

Effect adapter `onAction` errors are caught and routed to `config.onError` if provided, but silently discarded otherwise. This design prevents cascading failures but means effect adapter bugs in production may go undetected without explicit error handler configuration.

---

## 7. Recommendations by Tier

### Tier 1: Critical (Required for GxP Compliance)

1. **Add runtime payload validation layer.** Introduce an optional `validate` function on `StateServiceConfig` that is called before the reducer. When validation fails, the action should be rejected with a `PayloadValidationFailed` tagged error, and the state transition should not occur.

2. **Make tracing mandatory or warn when absent.** Add a `requireTracing` configuration option that throws or logs a warning at adapter creation time if no `StoreTracingHook` is available. For GxP-sensitive deployments, every state transition must be traceable.

3. **Remove or disable sampling for GxP mode.** Provide a `gxpMode` configuration flag that forces `samplingRate: 1` and `mode: "full"` on action history, ensuring no audit entries are dropped.

### Tier 2: Important (Strongly Recommended)

4. **Add automatic rollback option for effects.** Introduce an `autoRollback: boolean` option on `createStateAdapter`. When enabled, if the effect throws synchronously, the state is reverted to `prevState` before the error handler is called.

5. **Replace `Date.now()` with injectable clock.** Add an optional `clock: () => number` parameter to service configs and inspection subsystems. This enables deterministic testing and monotonic clock usage in production.

6. **Fix deep freeze early-exit optimization.** Change the `Object.isFrozen` guard to only skip recursion for individual properties, not the entire object graph. Alternatively, document this as a known limitation and add a `deepFreezeStrict()` variant.

7. **Enforce unique port names per container.** Add runtime validation in the registry that rejects duplicate port name registrations with a `DuplicatePortName` error.

### Tier 3: Nice to Have (Improves Compliance Posture)

8. **Add disposal reason tracking.** Extend `dispose()` to accept an optional `reason: string` parameter and record a disposal timestamp for audit purposes.

9. **Add pre-disposal hooks.** Allow services to register `onBeforeDispose` callbacks that can flush pending async effects before disposal completes.

10. **Replace `Math.random()` with seeded PRNG for sampling.** If sampling must be supported, use a deterministic PRNG with a configurable seed so sampling behavior is reproducible.

11. **Per-container cycle detection.** Scope the evaluation stack/set per `ReactiveSystemInstance` rather than using module-level state.

12. **Add effect timeout enforcement.** For async effects, add a configurable timeout after which a `EffectTimeoutExceeded` error is produced, preventing indefinitely pending effects.

---

## 8. File Reference Guide

### 8.1 Core Types

| File                               | Purpose                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| `src/types/actions.ts`             | ActionMap, ActionReducer, BoundActions, NoPayload                                    |
| `src/types/services.ts`            | StateService, AtomService, DerivedService, AsyncDerivedService, LinkedDerivedService |
| `src/types/effects.ts`             | EffectMap, EffectContext, ActionEffect, ActionEvent, EffectErrorHandler              |
| `src/types/deep-readonly.ts`       | DeepReadonly recursive type utility                                                  |
| `src/types/history.ts`             | HistoryState, HistoryActions                                                         |
| `src/types/hydration.ts`           | StateHydrator, HydrationStorage                                                      |
| `src/types/inspection.ts`          | StoreInspectorAPI, StoreSnapshot, PortSnapshot, ActionHistoryEntry, SubscriberGraph  |
| `src/types/store-runtime-error.ts` | StoreRuntimeError union                                                              |

### 8.2 Ports

| File                        | Purpose                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/ports/factories.ts`    | createStatePort, createAtomPort, createDerivedPort, createAsyncDerivedPort, createLinkedDerivedPort |
| `src/ports/port-types.ts`   | Port definition types with phantom brands, type inference utilities                                 |
| `src/ports/history-port.ts` | createHistoryPort, createHistoryActions                                                             |

### 8.3 Adapters

| File                                     | Purpose                                          |
| ---------------------------------------- | ------------------------------------------------ |
| `src/adapters/state-adapter.ts`          | createStateAdapter factory                       |
| `src/adapters/atom-adapter.ts`           | createAtomAdapter factory                        |
| `src/adapters/derived-adapter.ts`        | createDerivedAdapter factory                     |
| `src/adapters/async-derived-adapter.ts`  | createAsyncDerivedAdapter factory                |
| `src/adapters/linked-derived-adapter.ts` | createLinkedDerivedAdapter factory               |
| `src/adapters/effect-adapter.ts`         | createEffectAdapter factory                      |
| `src/adapters/hydration-adapter.ts`      | createHydrationAdapter factory                   |
| `src/adapters/brands.ts`                 | Adapter brand symbols for runtime classification |
| `src/adapters/discovery.ts`              | isEffectAdapter, withEffectAdapters              |

### 8.4 Services

| File                                          | Purpose                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/services/state-service-impl.ts`          | StateService implementation with signal-backed state, bound actions, effects |
| `src/services/atom-service-impl.ts`           | AtomService implementation with get/set/update                               |
| `src/services/derived-service-impl.ts`        | DerivedService with computed signals and cycle detection                     |
| `src/services/async-derived-service-impl.ts`  | AsyncDerivedService with retry, stale time, ResultAsync                      |
| `src/services/linked-derived-service-impl.ts` | LinkedDerivedService with bidirectional write-back                           |
| `src/services/cycle-detection.ts`             | Module-scoped circular dependency detection                                  |

### 8.5 Reactivity

| File                               | Purpose                                                              |
| ---------------------------------- | -------------------------------------------------------------------- |
| `src/reactivity/signals.ts`        | createSignal, createComputed, createEffect, untracked                |
| `src/reactivity/batch.ts`          | batch(), isInBatch, getBatchDepth, batchTargets, setBatchDiagnostics |
| `src/reactivity/system-factory.ts` | createIsolatedReactiveSystem()                                       |
| `src/reactivity/path-tracking.ts`  | createTrackingProxy, trackSelector, hasPathChanged                   |
| `src/reactivity/shallow-equal.ts`  | shallowEqual utility                                                 |

### 8.6 Errors

| File                          | Purpose                                            |
| ----------------------------- | -------------------------------------------------- |
| `src/errors/tagged-errors.ts` | All tagged union error types and factory functions |

### 8.7 Inspection

| File                                       | Purpose                                                     |
| ------------------------------------------ | ----------------------------------------------------------- |
| `src/inspection/action-history.ts`         | Action history with reservoir sampling, filtering, eviction |
| `src/inspection/store-inspector-impl.ts`   | StoreInspectorAPI implementation                            |
| `src/inspection/store-registry.ts`         | StoreRegistry for auto-discovery                            |
| `src/inspection/subscriber-graph.ts`       | SubscriberGraph builder                                     |
| `src/inspection/inspector-adapter.ts`      | Container adapter for StoreInspector                        |
| `src/inspection/registry-adapter.ts`       | Container adapter for StoreRegistry                         |
| `src/inspection/registry-entry-builder.ts` | PortRegistryEntry builder from service instances            |
| `src/inspection/type-guards.ts`            | Type guards for inspector/registry/tracing extraction       |

### 8.8 Integration

| File                                           | Purpose                                                  |
| ---------------------------------------------- | -------------------------------------------------------- |
| `src/integration/tracing-bridge.ts`            | StoreTracingBridge connecting to distributed tracing     |
| `src/integration/tracing-hook-adapter.ts`      | Container adapter for StoreTracingHook                   |
| `src/integration/library-inspector-adapter.ts` | LibraryInspector adapter                                 |
| `src/integration/library-inspector-bridge.ts`  | Bridge between store inspection and container inspection |
| `src/integration/mcp-resources.ts`             | MCP resource handlers for external tooling               |

### 8.9 Utils

| File                       | Purpose                                             |
| -------------------------- | --------------------------------------------------- |
| `src/utils/deep-freeze.ts` | Recursive deep freeze with DeepReadonly return type |

### 8.10 Test Suites

| Category          | Files                                                              | Purpose                                         |
| ----------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| Mutation Killers  | `tests/mutation-killers*.test.ts` (10 files)                       | Dedicated tests for Stryker survived mutants    |
| Unit Tests        | `tests/deep-freeze.test.ts`, `tests/cycle-detection.test.ts`, etc. | Isolated unit tests per module                  |
| Integration Tests | `tests/integration/*.test.ts` (13 files)                           | Container lifecycle, auto-registration, tracing |
| E2E Tests         | `tests/e2e/*.test.ts` (6 files)                                    | Realistic scenario tests                        |
| React Tests       | `react/tests/*.test.tsx` (13 files)                                | React hook and rendering tests                  |
| Testing Utilities | `testing/tests/*.test.ts` (2 files)                                | Store testing helper tests                      |

---

_End of Report_
