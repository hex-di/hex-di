# 10 - API Reference

_Previous: [09 - Advanced Patterns](./09-advanced.md)_

---

Complete TypeScript signatures for every public API exported from `@hex-di/store`, `@hex-di/store-react`, and `@hex-di/store-testing`.

## 42a. Error Classes

`@hex-di/store` defines store-specific error classes following the same pattern as `@hex-di/core` errors: each error has a `code` string for programmatic handling and an `isProgrammingError` flag that distinguishes configuration mistakes from runtime conditions. All errors extend `ContainerError` from `@hex-di/core`.

### Error Code Range

Store errors use the `HEX030-039` range to avoid collision with core error codes (`HEX001-025`).

| Code     | Constant                      | Error Class                      | isProgrammingError |
| -------- | ----------------------------- | -------------------------------- | ------------------ |
| `HEX030` | `DISPOSED_STATE_ACCESS`       | `DisposedStateAccessError`       | `true`             |
| `HEX031` | `DERIVED_COMPUTATION_FAILED`  | `DerivedComputationError`        | `false`            |
| `HEX032` | `ASYNC_DERIVED_EXHAUSTED`     | `AsyncDerivedExhaustedError`     | `true`             |
| `HEX033` | `CIRCULAR_DERIVED_DEPENDENCY` | `CircularDerivedDependencyError` | `true`             |
| `HEX034` | `BATCH_EXECUTION_FAILED`      | `BatchExecutionError`            | `false`            |
| `HEX035` | `EFFECT_ERROR_HANDLER_FAILED` | `EffectErrorHandlerError`        | `false`            |
| `HEX036` | `WAIT_FOR_STATE_TIMEOUT`      | `WaitForStateTimeoutError`       | `false`            |

### DisposedStateAccessError

Thrown when accessing `.state`, `.value`, `.actions`, or `.subscribe()` on a service whose owning container or scope has been disposed.

```typescript
class DisposedStateAccessError extends ContainerError {
  readonly code = "DISPOSED_STATE_ACCESS" as const;
  readonly isProgrammingError = true as const;
  readonly portName: string;
  readonly containerName: string;
  readonly operation: "state" | "value" | "actions" | "subscribe" | "set" | "update" | "refresh";

  constructor(portName: string, containerName: string, operation: string);
  // Message: "Cannot access 'state' on port 'Counter' from disposed container 'app'."
}
```

### DerivedComputationError

Thrown when a derived adapter's `select` function throws during recomputation. The derived value becomes stale and the error is surfaced to subscribers.

```typescript
class DerivedComputationError extends ContainerError {
  readonly code = "DERIVED_COMPUTATION_FAILED" as const;
  readonly isProgrammingError = false as const;
  readonly portName: string;
  readonly cause: unknown;

  constructor(portName: string, cause: unknown);
  // Message: "Derived computation for port 'CartTotal' failed: <cause message>"
}
```

### AsyncDerivedExhaustedError

Thrown when an async derived adapter's `select` function **throws an exception** instead of returning `ResultAsync`. This is a programming error — `select` should return `ResultAsync.err()` for expected failures, not throw. If `select` throws after all retry attempts are exhausted, the service transitions to `status: "error"` with this error.

For the expected failure path (where `select` returns `Err`), see [`AsyncDerivedSelectError`](#asyncderivedselecterror) — a tagged value used by `AsyncDerivedSnapshot` and introspection surfaces.

```typescript
class AsyncDerivedExhaustedError extends ContainerError {
  readonly code = "ASYNC_DERIVED_EXHAUSTED" as const;
  readonly isProgrammingError = true as const;
  readonly portName: string;
  readonly attempts: number;
  readonly cause: unknown;

  constructor(portName: string, attempts: number, cause: unknown);
  // Message: "Async derived port 'ExchangeRate' select function threw after 3 attempts
  //           (select should return ResultAsync.err(), not throw): <cause message>"
}
```

### CircularDerivedDependencyError

Thrown when the reactivity engine detects a cycle in the derived dependency graph at runtime. This can occur when linked derived ports create bidirectional dependencies that form a loop.

```typescript
class CircularDerivedDependencyError extends ContainerError {
  readonly code = "CIRCULAR_DERIVED_DEPENDENCY" as const;
  readonly isProgrammingError = true as const;
  readonly dependencyChain: readonly string[];

  constructor(dependencyChain: readonly string[]);
  // Message: "Circular derived dependency detected: Fahrenheit -> Celsius -> Fahrenheit"
}
```

Note: Most cycles are caught at compile time by the graph builder's existing cycle detection. This error handles the edge case where linked derived ports create runtime cycles through their `write` functions that the compile-time analysis cannot detect (because `writesTo` is metadata, not a compile-time constraint).

### BatchExecutionError

Thrown when a `batch()` callback throws. The batch is aborted, deferred notifications are flushed (subscribers see the last consistent state before the error), and the original error is wrapped.

```typescript
class BatchExecutionError extends ContainerError {
  readonly code = "BATCH_EXECUTION_FAILED" as const;
  readonly isProgrammingError = false as const;
  readonly cause: unknown;

  constructor(cause: unknown);
  // Message: "Batch execution failed: <cause message>. Deferred notifications flushed."
}
```

### EffectErrorHandlerError

Thrown when an `onEffectError` handler itself throws. The original effect error and the handler error are both captured. This error is logged but does not propagate further -- it is a terminal error that prevents infinite recursion.

```typescript
class EffectErrorHandlerError extends ContainerError {
  readonly code = "EFFECT_ERROR_HANDLER_FAILED" as const;
  readonly isProgrammingError = false as const;
  readonly portName: string;
  readonly actionName: string;
  readonly originalError: EffectFailedError;
  readonly handlerError: unknown;

  constructor(
    portName: string,
    actionName: string,
    originalError: EffectFailedError,
    handlerError: unknown
  );
  // Message: "onEffectError handler for 'Todo/addItem' threw while handling effect error.
  //           Original effect error: <original>. Handler error: <handler>."
}
```

The runtime logs this error via the container's diagnostic channel (tracing span with error status if available, `console.error` otherwise) but does **not** re-invoke `onEffectError` or throw to the caller. This prevents infinite recursion if the handler consistently fails.

### WaitForStateTimeoutError

Thrown by the `waitForState` testing utility when the predicate does not become true within the specified timeout.

```typescript
class WaitForStateTimeoutError extends ContainerError {
  readonly code = "WAIT_FOR_STATE_TIMEOUT" as const;
  readonly isProgrammingError = false as const;
  readonly portName: string;
  readonly timeoutMs: number;

  constructor(portName: string, timeoutMs: number);
  // Message: "waitForState for port 'Auth' timed out after 5000ms.
  //           The predicate never returned true."
}
```

### Operational Error Types (Tagged Unions)

These are value-based errors used with `@hex-di/result`. They represent operational/IO failures — not programming errors. Programming errors (`DisposedStateAccessError`, `CircularDerivedDependencyError`) remain thrown exceptions.

All tagged error types are exported from `@hex-di/store`.

#### EffectFailedError

Produced when a state adapter effect returns `Err`. Wraps the original error with action context for diagnostics.

```typescript
interface EffectFailedError {
  readonly _tag: "EffectFailed";
  readonly portName: string;
  readonly actionName: string;
  readonly cause: unknown;
}
```

#### AsyncDerivedSelectError

Produced when an async derived adapter's `select` function **returns `Err`** (not throws) after all retry attempts are exhausted. This is the expected failure path for async derived computations — I/O failures like network errors or auth expiration are operational conditions, not bugs. Used by introspection surfaces (`StoreInspectorEvent`, diagnostic logging) to provide structured context about async derived failures. The `AsyncDerivedSnapshot` error variant carries the raw `E` from the user's `Err` — `AsyncDerivedSelectError` wraps it with port name and attempt count for observability.

For the exception path (where `select` throws instead of returning `ResultAsync`), see [`AsyncDerivedExhaustedError`](#asyncderivedexhaustederror) — a programming error class.

```typescript
interface AsyncDerivedSelectError {
  readonly _tag: "AsyncDerivedSelectFailed";
  readonly portName: string;
  readonly attempts: number;
  readonly cause: unknown;
}
```

#### HydrationError

A convention type for hydrator adapter implementations. The store runtime does not produce this error — user-written hydrator adapters construct it via `{ _tag: "HydrationFailed", portName, cause }` when wrapping I/O failures (e.g., localStorage quota exceeded, JSON parse failure). Exported from `@hex-di/store` as a shared interface so hydrator implementations and consumers agree on the shape.

```typescript
interface HydrationError {
  readonly _tag: "HydrationFailed";
  readonly portName: string;
  readonly cause: unknown;
}
```

## 43. Port Factories

### createStatePort

```typescript
function createStatePort<TState, TActions extends ActionMap<TState>>(): <
  const TName extends string,
>(config: {
  readonly name: TName;
  readonly description?: string;
  readonly category?: string;
  readonly tags?: readonly string[];
}) => StatePortDef<TName, TState, TActions>;

declare const __stateType: unique symbol;
declare const __actionsType: unique symbol;

type StatePortDef<TName extends string, TState, TActions extends ActionMap<TState>> = DirectedPort<
  StateService<TState, TActions>,
  TName,
  "outbound"
> & {
  readonly [__stateType]: TState;
  readonly [__actionsType]: TActions;
};
```

### createAtomPort

```typescript
function createAtomPort<TValue>(): <const TName extends string>(config: {
  readonly name: TName;
  readonly description?: string;
  readonly category?: string;
  readonly tags?: readonly string[];
}) => AtomPortDef<TName, TValue>;

declare const __atomType: unique symbol;

type AtomPortDef<TName extends string, TValue> = DirectedPort<
  AtomService<TValue>,
  TName,
  "outbound"
> & {
  readonly [__atomType]: TValue;
};
```

### createDerivedPort

```typescript
function createDerivedPort<TResult>(): <const TName extends string>(config: {
  readonly name: TName;
  readonly description?: string;
  readonly category?: string;
  readonly tags?: readonly string[];
}) => DerivedPortDef<TName, TResult>;

type DerivedPortDef<TName extends string, TResult> = DirectedPort<
  DerivedService<TResult>,
  TName,
  "outbound"
>;
```

### createAsyncDerivedPort

```typescript
function createAsyncDerivedPort<TResult, E = never>(): <const TName extends string>(config: {
  readonly name: TName;
  readonly description?: string;
  readonly category?: string;
  readonly tags?: readonly string[];
}) => AsyncDerivedPortDef<TName, TResult, E>;

declare const __asyncDerivedErrorType: unique symbol;

type AsyncDerivedPortDef<TName extends string, TResult, E = never> = DirectedPort<
  AsyncDerivedService<TResult, E>,
  TName,
  "outbound"
> & {
  /** Phantom type for error inference (unique symbol prevents structural matching) */
  readonly [__asyncDerivedErrorType]: E;
};
```

### createLinkedDerivedPort

```typescript
function createLinkedDerivedPort<TResult>(): <const TName extends string>(config: {
  readonly name: TName;
  readonly description?: string;
  readonly category?: string;
  readonly tags?: readonly string[];
}) => LinkedDerivedPortDef<TName, TResult>;

type LinkedDerivedPortDef<TName extends string, TResult> = DirectedPort<
  LinkedDerivedService<TResult>,
  TName,
  "outbound"
>;
```

## 44. Adapter Factories

### createStateAdapter

```typescript
function createStateAdapter<
  TPort extends StatePortDef<string, unknown, ActionMap<unknown>>,
  TRequires extends readonly Port<unknown, string>[] = readonly [],
>(config: {
  readonly provides: TPort;
  readonly initial: InferStateType<TPort>;
  readonly actions: InferActionsType<TPort>;
  readonly requires?: TRequires;
  readonly lifetime?: "singleton" | "scoped";
  readonly effects?: (
    deps: ResolvedDeps<TupleToUnion<TRequires>>
  ) => Partial<EffectMap<InferStateType<TPort>, InferActionsType<TPort>>>;
  readonly onEffectError?: EffectErrorHandler<InferStateType<TPort>, InferActionsType<TPort>>;
}): Adapter<TPort, TupleToUnion<TRequires>, "singleton" | "scoped", "sync">;
```

### createAtomAdapter

```typescript
function createAtomAdapter<TPort extends AtomPortDef<string, unknown>>(config: {
  readonly provides: TPort;
  readonly initial: InferAtomType<TPort>;
  readonly lifetime?: "singleton" | "scoped";
}): Adapter<TPort, never, "singleton" | "scoped", "sync">;
```

### createDerivedAdapter

```typescript
function createDerivedAdapter<
  TPort extends DerivedPortDef<string, unknown>,
  TRequires extends readonly Port<unknown, string>[],
>(config: {
  readonly provides: TPort;
  readonly requires: TRequires;
  readonly select: (deps: DerivedDeps<TRequires>) => InferDerivedType<TPort>;
  readonly equals?: (a: InferDerivedType<TPort>, b: InferDerivedType<TPort>) => boolean;
  readonly lifetime?: "singleton" | "scoped";
}): Adapter<TPort, TupleToUnion<TRequires>, "singleton" | "scoped", "sync">;
```

Default lifetime is `"singleton"`. Use `"scoped"` when any source in `requires` has `lifetime: "scoped"`. The graph builder enforces captive dependency rules: a singleton derived adapter cannot depend on a scoped source.

### createAsyncDerivedAdapter

```typescript
function createAsyncDerivedAdapter<
  TPort extends AsyncDerivedPortDef<string, unknown, unknown>,
  TRequires extends readonly Port<unknown, string>[],
>(config: {
  readonly provides: TPort;
  readonly requires: TRequires;
  readonly select: (
    deps: DerivedDeps<TRequires>
  ) => ResultAsync<InferAsyncDerivedType<TPort>, InferAsyncDerivedErrorType<TPort>>;
  readonly staleTime?: number;
  readonly retryCount?: number;
  readonly retryDelay?: number | ((attempt: number) => number);
}): Adapter<TPort, TupleToUnion<TRequires>, "singleton", "async">;
```

### createLinkedDerivedAdapter

```typescript
function createLinkedDerivedAdapter<
  TPort extends LinkedDerivedPortDef<string, unknown>,
  TRequires extends readonly Port<unknown, string>[],
  TWritesTo extends readonly Port<unknown, string>[] = TRequires,
>(config: {
  readonly provides: TPort;
  readonly requires: TRequires;
  readonly select: (deps: DerivedDeps<TRequires>) => InferDerivedType<TPort>;
  readonly write: (value: InferDerivedType<TPort>, deps: DerivedDeps<TRequires>) => void;
  /** Declares which source ports the write function mutates. Creates "writes-to" edges in the subscriber graph. Defaults to all ports in requires. */
  readonly writesTo?: TWritesTo;
  readonly equals?: (a: InferDerivedType<TPort>, b: InferDerivedType<TPort>) => boolean;
}): Adapter<TPort, TupleToUnion<TRequires>, "singleton", "sync">;
```

## 45. Service Interfaces

### Referential stability contract

All service interfaces guarantee **referential stability** for their method and action references. The following references are stable for the lifetime of the service instance and never change between accesses:

| Service                | Stable References                                          |
| ---------------------- | ---------------------------------------------------------- |
| `StateService`         | `.actions` object, each `actions.X` function, `.subscribe` |
| `AtomService`          | `.set`, `.update`, `.subscribe`                            |
| `DerivedService`       | `.subscribe`                                               |
| `AsyncDerivedService`  | `.refresh`, `.subscribe`                                   |
| `LinkedDerivedService` | `.set`, `.subscribe`                                       |

This contract is critical for React integration: hooks like `useActions` and `useAtom` rely on stable references to avoid unnecessary re-renders. Implementations must create bound functions once during service initialization and return the same references thereafter.

### StateService

```typescript
interface StateService<TState, TActions extends ActionMap<TState>> {
  readonly state: DeepReadonly<TState>;
  /** Referentially stable: same object/function references for the service lifetime. */
  readonly actions: BoundActions<TState, TActions>;
  subscribe(listener: StateListener<TState>): Unsubscribe;
  subscribe<TSelected>(
    selector: (state: DeepReadonly<TState>) => TSelected,
    listener: (value: TSelected, prev: TSelected) => void,
    equalityFn?: (a: TSelected, b: TSelected) => boolean
  ): Unsubscribe;
}
```

### AtomService

```typescript
interface AtomService<TValue> {
  readonly value: DeepReadonly<TValue>;
  /** Referentially stable. */
  set(value: TValue): void;
  /** Referentially stable. */
  update(fn: (current: TValue) => TValue): void;
  subscribe(
    listener: (value: DeepReadonly<TValue>, prev: DeepReadonly<TValue>) => void
  ): Unsubscribe;
}
```

### DerivedService

```typescript
interface DerivedService<TResult> {
  readonly value: DeepReadonly<TResult>;
  subscribe(
    listener: (value: DeepReadonly<TResult>, prev: DeepReadonly<TResult>) => void
  ): Unsubscribe;
}
```

### AsyncDerivedService

```typescript
interface AsyncDerivedService<TResult, E = never> {
  readonly snapshot: AsyncDerivedSnapshot<TResult, E>;
  readonly status: AsyncDerivedSnapshot<TResult, E>["status"];
  readonly isLoading: boolean;
  /** Referentially stable. */
  refresh(): void;
  subscribe(listener: (snapshot: AsyncDerivedSnapshot<TResult, E>) => void): Unsubscribe;
}

type AsyncDerivedSnapshot<TResult, E = never> =
  | {
      readonly status: "idle";
      readonly data: undefined;
      readonly error: undefined;
      readonly isLoading: false;
    }
  | {
      readonly status: "loading";
      readonly data: DeepReadonly<TResult> | undefined;
      readonly error: undefined;
      readonly isLoading: true;
    }
  | {
      readonly status: "success";
      readonly data: DeepReadonly<TResult>;
      readonly error: undefined;
      readonly isLoading: false;
    }
  | {
      readonly status: "error";
      readonly data: undefined;
      readonly error: [E] extends [never] ? unknown : E;
      readonly isLoading: false;
    };
```

### LinkedDerivedService

```typescript
interface LinkedDerivedService<TResult> extends DerivedService<TResult> {
  /** Referentially stable. */
  set(value: TResult): void;
}
```

### ActionEffect

```typescript
interface ActionEffect {
  onAction(event: ActionEvent): void | Promise<void>;
}

interface ActionEvent {
  readonly portName: string;
  readonly actionName: string;
  readonly payload: unknown;
  readonly prevState: unknown;
  readonly nextState: unknown;
  readonly timestamp: number;
  readonly phase: "action" | "effect-error";
  readonly error?: EffectFailedError;
  /** W3C Trace Context trace ID (present when @hex-di/tracing is active) */
  readonly traceId?: string;
}
```

### createEffectAdapter

```typescript
declare const __effectBrand: unique symbol;
type EffectAdapterBrand = { readonly [__effectBrand]: true };

function createEffectAdapter<
  TPort extends Port<ActionEffect, string>,
  TRequires extends readonly Port<unknown, string>[] = readonly [],
>(config: {
  readonly provides: TPort;
  readonly requires?: TRequires;
  readonly factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => ActionEffect;
}): Adapter<TPort, TupleToUnion<TRequires>, "singleton", "sync"> & EffectAdapterBrand;
```

The `__effectBrand` enables structural identification of effect adapters by the store runtime, replacing the previous tag-based `"action-effect"` discovery convention.

### EffectErrorHandler

```typescript
interface EffectErrorHandler<TState, TActions extends ActionMap<TState>> {
  (context: {
    readonly error: EffectFailedError;
    readonly actionName: keyof TActions & string;
    readonly state: DeepReadonly<TState>;
    readonly prevState: DeepReadonly<TState>;
    readonly actions: BoundActions<TState, TActions>;
  }): void;
}
```

## 46. Type Utilities

### Action types

```typescript
type ActionMap<TState> = Record<string, ActionReducer<TState, unknown>>;

declare const __noPayload: unique symbol;
type NoPayload = { readonly [__noPayload]: true };

type ActionReducer<TState, TPayload = NoPayload> = [TPayload] extends [NoPayload]
  ? (state: TState) => TState
  : (state: TState, payload: TPayload) => TState;

type BoundActions<TState, TActions extends ActionMap<TState>> = {
  [K in keyof TActions]: TActions[K] extends (state: TState) => TState
    ? () => void
    : TActions[K] extends (state: TState, payload: infer P) => TState
      ? (payload: P) => void
      : never;
};

type StateListener<TState> = (state: DeepReadonly<TState>, prev: DeepReadonly<TState>) => void;

type Unsubscribe = () => void;
```

### Effect types

```typescript
type EffectMap<TState, TActions extends ActionMap<TState>> = {
  [K in keyof TActions]: (
    context: EffectContext<TState, TActions, K>
  ) => void | ResultAsync<void, unknown>;
};

interface EffectContext<TState, TActions extends ActionMap<TState>, K extends keyof TActions> {
  readonly state: DeepReadonly<TState>;
  readonly prevState: DeepReadonly<TState>;
  readonly payload: TActions[K] extends (state: TState, payload: infer P) => TState ? P : void;
}
```

### Dependency types

```typescript
/** Converts a readonly tuple to a union of its elements. From @hex-di/core. */
type TupleToUnion<T extends readonly Port<unknown, string>[]> = T extends readonly []
  ? never
  : T[number];

/**
 * Maps required ports to their resolved service types for derived adapters.
 * Equivalent to ResolvedDeps<TupleToUnion<TRequires>> from @hex-di/core.
 */
type DerivedDeps<TRequires extends readonly Port<unknown, string>[]> = {
  [TPort in TRequires[number] as InferPortName<TPort> & string]: InferService<TPort>;
};
```

### Inference utilities

```typescript
/** Distribution-guarded inference utilities. [P] extends [...] prevents
 *  unexpected union distribution when P is a union type. */
type InferStateType<P> = [P] extends [{ readonly [__stateType]: infer S }] ? S : never;
type InferActionsType<P> = [P] extends [{ readonly [__actionsType]: infer A }] ? A : never;
type InferDerivedType<P> = [P] extends [DerivedPortDef<string, infer R>] ? R : never;
type InferAtomType<P> = [P] extends [{ readonly [__atomType]: infer V }] ? V : never;
type InferAsyncDerivedType<P> = [P] extends [AsyncDerivedPortDef<string, infer R, infer _E>]
  ? R
  : never;
type InferAsyncDerivedErrorType<P> = [P] extends [{ readonly [__asyncDerivedErrorType]: infer E }]
  ? E
  : never;
```

### DeepReadonly

```typescript
type DeepReadonly<T> = T extends (...args: readonly unknown[]) => unknown
  ? T // Preserve function types as-is
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

Function types in state (e.g., callbacks) are preserved as-is rather than having their properties made readonly. This prevents breaking callable signatures. Circular reference handling is deferred to runtime `Object.freeze` -- TypeScript's structural type system handles recursive types lazily, so `DeepReadonly<{ self: Circular }>` resolves correctly for finite-depth access.

### Batching

```typescript
/**
 * Groups multiple state changes into a single notification cycle.
 * Container-scoped: only defers signals owned by the given container/scope.
 *
 * @param containerOrScope - The container or scope to batch within
 * @param fn - The function containing state changes to batch
 */
function batch(
  containerOrScope: Container<Port<unknown, string>> | Scope<Port<unknown, string>>,
  fn: () => void
): void;
```

### Equality helpers

```typescript
function shallowEqual<T extends Record<string, unknown>>(a: T, b: T): boolean;
```

## 47. React Hooks

All hooks are exported from `@hex-di/store-react`.

```typescript
function useStateValue<TState, TSelected = DeepReadonly<TState>>(
  port: StatePortDef<string, TState, ActionMap<TState>>,
  selector?: (state: DeepReadonly<TState>) => TSelected,
  equalityFn?: (a: TSelected, b: TSelected) => boolean
): TSelected;

function useActions<TState, TActions extends ActionMap<TState>>(
  port: StatePortDef<string, TState, TActions>
): BoundActions<TState, TActions>;

function useStatePort<TState, TActions extends ActionMap<TState>>(
  port: StatePortDef<string, TState, TActions>
): {
  readonly state: DeepReadonly<TState>;
  readonly actions: BoundActions<TState, TActions>;
};

function useAtom<TValue>(
  port: AtomPortDef<string, TValue>
): [DeepReadonly<TValue>, (value: TValue | ((prev: TValue) => TValue)) => void];

function useDerived<TResult>(port: DerivedPortDef<string, TResult>): DeepReadonly<TResult>;

function useAsyncDerived<TResult, E = never>(
  port: AsyncDerivedPortDef<string, TResult, E>
): {
  readonly snapshot: AsyncDerivedSnapshot<TResult, E>;
  readonly refresh: () => void;
};

function useAsyncDerivedSuspense<TResult, E = never>(
  port: AsyncDerivedPortDef<string, TResult, E>
): {
  readonly data: DeepReadonly<TResult>;
  readonly refresh: () => void;
};
```

## 48. Testing API

All utilities are exported from `@hex-di/store-testing`.

```typescript
/**
 * Overrides use port tokens as keys for type safety.
 * Each entry is a [port, value] tuple where the value type is inferred from the port.
 */
type StateOverrideEntry<TPort> =
  TPort extends StatePortDef<string, infer TState, ActionMap<infer TState>>
    ? [port: TPort, state: Partial<TState>]
    : TPort extends AtomPortDef<string, infer TValue>
      ? [port: TPort, value: TValue]
      : never;

type StateOverrideMap = readonly StateOverrideEntry<
  StatePortDef<string, unknown, ActionMap<unknown>> | AtomPortDef<string, unknown>
>[];

function createStateTestContainer(config: {
  readonly adapters: readonly AdapterConstraint[];
  readonly derived?: readonly AdapterConstraint[];
  readonly effects?: readonly AdapterConstraint[];
  readonly overrides?: StateOverrideMap;
}): Promise<Container<Port<unknown, string>>>;

function expectState<TState>(
  container: Container<Port<unknown, string>>,
  port: StatePortDef<string, TState, ActionMap<TState>>
): {
  toBe(expected: TState): void;
  toMatch(partial: Partial<TState>): void;
  toSatisfy(predicate: (state: DeepReadonly<TState>) => boolean): void;
};

function expectAtom<TValue>(
  container: Container<Port<unknown, string>>,
  port: AtomPortDef<string, TValue>
): {
  toBe(expected: TValue): void;
  toSatisfy(predicate: (value: DeepReadonly<TValue>) => boolean): void;
};

function expectDerived<TResult>(
  container: Container<Port<unknown, string>>,
  port: DerivedPortDef<string, TResult>
): {
  toBe(expected: TResult): void;
  toMatch(partial: Partial<TResult>): void;
  toSatisfy(predicate: (value: DeepReadonly<TResult>) => boolean): void;
};

function createActionRecorder(container: Container<Port<unknown, string>>): {
  readonly events: readonly ActionEvent[];
  getEventsForPort(portName: string): readonly ActionEvent[];
  clear(): void;
  dispose(): void;
};

function waitForState<TState>(
  container: Container<Port<unknown, string>>,
  port: StatePortDef<string, TState, ActionMap<TState>>,
  predicate: (state: DeepReadonly<TState>) => boolean,
  timeout?: number
): Promise<DeepReadonly<TState>>;

function createMockStateAdapter<
  TPort extends StatePortDef<string, unknown, ActionMap<unknown>>,
>(config: {
  readonly provides: TPort;
  readonly initial: InferStateType<TPort>;
  readonly initialOverride?: Partial<InferStateType<TPort>>;
}): {
  readonly adapter: Adapter<TPort, never, "singleton", "sync">;
  readonly spies: { [K in keyof InferActionsType<TPort>]: MockFunction };
};

function createMockAtomAdapter<TPort extends AtomPortDef<string, unknown>>(config: {
  readonly provides: TPort;
  readonly initial: InferAtomType<TPort>;
}): {
  readonly adapter: Adapter<TPort, never, "singleton", "sync">;
  readonly setSpy: MockFunction;
  readonly updateSpy: MockFunction;
};

function expectAsyncDerived<TResult, E = never>(
  container: Container<Port<unknown, string>>,
  port: AsyncDerivedPortDef<string, TResult, E>
): {
  toBeLoading(): void;
  toBeSuccess(expected: TResult): void;
  toBeError(predicate?: (error: [E] extends [never] ? unknown : E) => boolean): void;
  toHaveStatus(status: "idle" | "loading" | "success" | "error"): void;
};
```

## 49. Store Introspection

All introspection types are exported from `@hex-di/store`.

### StoreInspectorPort

```typescript
const StoreInspectorPort: Port<StoreInspectorAPI, "StoreInspector">;
```

Pre-defined port for store introspection. Must be explicitly registered via `createStoreInspectorAdapter()` — the graph builder has no special knowledge of state adapters (see [D10](./11-appendices.md#d10-store-introspection-follows-inspectorapi-pattern-with-explicit-registration)).

### createStoreInspectorAdapter

```typescript
function createStoreInspectorAdapter(config?: {
  readonly history?: ActionHistoryConfig;
}): Adapter<typeof StoreInspectorPort, never, "singleton", "sync">;
```

Creates an adapter that provides `StoreInspectorAPI` for the given container. Discovers state, atom, derived, and async-derived ports at initialization time through branded adapter scanning. The optional `history` config controls action history recording (see [`ActionHistoryConfig`](#actionhistoryconfig) below).

### StoreInspectorAPI

```typescript
interface StoreInspectorAPI {
  getSnapshot(): StoreSnapshot;
  getPortState(portName: string): PortSnapshot | undefined;
  listStatePorts(): readonly StatePortInfo[];
  getSubscriberGraph(): SubscriberGraph;
  getActionHistory(filter?: ActionHistoryFilter): readonly ActionHistoryEntry[];
  subscribe(listener: StoreInspectorListener): () => void;
}

type StoreInspectorListener = (event: StoreInspectorEvent) => void;
```

### StoreSnapshot

```typescript
interface StoreSnapshot {
  readonly timestamp: number;
  readonly ports: readonly PortSnapshot[];
  readonly totalSubscribers: number;
  readonly pendingEffects: number;
}
```

### PortSnapshot

```typescript
type PortSnapshot =
  | StatePortSnapshot
  | AtomPortSnapshot
  | DerivedPortSnapshot
  | AsyncDerivedPortSnapshot;

interface StatePortSnapshot {
  readonly kind: "state";
  readonly portName: string;
  readonly state: unknown;
  readonly subscriberCount: number;
  readonly actionCount: number;
  readonly lastActionAt: number | null;
}

interface AtomPortSnapshot {
  readonly kind: "atom";
  readonly portName: string;
  readonly value: unknown;
  readonly subscriberCount: number;
}

interface DerivedPortSnapshot {
  readonly kind: "derived";
  readonly portName: string;
  readonly value: unknown;
  readonly subscriberCount: number;
  readonly sourcePortNames: readonly string[];
  readonly isStale: boolean;
}

interface AsyncDerivedPortSnapshot {
  readonly kind: "async-derived";
  readonly portName: string;
  readonly status: "idle" | "loading" | "success" | "error";
  readonly data: unknown;
  readonly error: unknown | undefined;
  readonly subscriberCount: number;
  readonly sourcePortNames: readonly string[];
}
```

### StatePortInfo

```typescript
interface StatePortInfo {
  readonly portName: string;
  readonly kind: "state" | "atom" | "derived" | "async-derived";
  readonly lifetime: "singleton" | "scoped";
  readonly subscriberCount: number;
  readonly hasEffects: boolean;
}
```

### ActionHistoryEntry

```typescript
interface ActionHistoryEntry {
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
  /** W3C Trace Context trace ID (present when @hex-di/tracing is active) */
  readonly traceId?: string;
  /** Span ID within the trace (present when @hex-di/tracing is active) */
  readonly spanId?: string;
}

interface ActionHistoryFilter {
  readonly portName?: string;
  readonly actionName?: string;
  readonly since?: number;
  readonly until?: number;
  readonly effectStatus?: "none" | "pending" | "completed" | "failed";
  readonly limit?: number;
  /** Filter by W3C trace ID (find all actions within a distributed trace) */
  readonly traceId?: string;
}

interface ActionHistoryConfig {
  readonly maxEntries: number;
  /** "full" (dev default), "lightweight" (prod recommended), "off" (prod default) */
  readonly mode: "full" | "lightweight" | "off";
  /** Sampling rate for lightweight mode (0.0–1.0). Default: 1.0. */
  readonly samplingRate?: number;
  /** Always record actions matching these criteria, regardless of sampling. */
  readonly alwaysRecord?: {
    readonly effectStatus?: readonly ("failed" | "pending")[];
    readonly portNames?: readonly string[];
    readonly actionNames?: readonly string[];
  };
}
```

### SubscriberGraph

```typescript
interface SubscriberGraph {
  readonly correlationId: string;
  readonly nodes: readonly SubscriberNode[];
  readonly edges: readonly SubscriberEdge[];
}

interface SubscriberNode {
  readonly id: string;
  readonly kind: "state" | "atom" | "derived" | "async-derived";
  readonly subscriberCount: number;
}

interface SubscriberEdge {
  readonly from: string;
  readonly to: string;
  readonly type: "derives-from" | "subscribes-to" | "writes-to";
}
```

### StoreInspectorEvent

```typescript
type StoreInspectorEvent =
  | { readonly type: "action-dispatched"; readonly entry: ActionHistoryEntry }
  | { readonly type: "state-changed"; readonly portName: string }
  | { readonly type: "subscriber-added"; readonly portName: string; readonly count: number }
  | { readonly type: "subscriber-removed"; readonly portName: string; readonly count: number }
  | { readonly type: "effect-completed"; readonly portName: string; readonly actionName: string }
  | {
      readonly type: "effect-failed";
      readonly portName: string;
      readonly actionName: string;
      readonly error: EffectFailedError;
    }
  | { readonly type: "async-derived-failed"; readonly error: AsyncDerivedSelectError }
  | { readonly type: "snapshot-changed" };
```

---

_Previous: [09 - Advanced Patterns](./09-advanced.md) | Next: [11 - Appendices](./11-appendices.md)_
