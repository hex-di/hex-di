# 02 - Core Concepts

_Previous: [01 - Overview & Philosophy](./01-overview.md)_

---

## 5. StateService

`StateService` is the service interface carried by state ports. It provides reactive state access, bound actions, and subscriptions.

```typescript
interface StateService<TState, TActions extends ActionMap<TState>> {
  /** Current state snapshot (deeply frozen, immutable) */
  readonly state: DeepReadonly<TState>;

  /**
   * Type-safe bound actions.
   *
   * **Referential stability:** The `actions` object and each bound action function
   * are referentially stable -- the same object/function references are returned
   * for the lifetime of the service instance. This guarantees that React components
   * using `useActions` or destructuring `actions` do not re-render due to identity changes.
   */
  readonly actions: BoundActions<TState, TActions>;

  /** Subscribe to all state changes */
  subscribe(listener: StateListener<TState>): Unsubscribe;

  /** Subscribe to a selected slice with optional equality function */
  subscribe<TSelected>(
    selector: (state: DeepReadonly<TState>) => TSelected,
    listener: (value: TSelected, prev: TSelected) => void,
    equalityFn?: (a: TSelected, b: TSelected) => boolean
  ): Unsubscribe;
}

type StateListener<TState> = (state: DeepReadonly<TState>, prev: DeepReadonly<TState>) => void;

type Unsubscribe = () => void;
```

### AtomService

`AtomService` is for simple, independent reactive values -- no actions, just get/set/update.

```typescript
interface AtomService<TValue> {
  /** Current value (deeply frozen) */
  readonly value: DeepReadonly<TValue>;

  /**
   * Replace the value.
   *
   * **Referential stability:** The `set` function is referentially stable --
   * the same function reference is returned for the lifetime of the service.
   */
  set(value: TValue): void;

  /**
   * Update the value with a function.
   *
   * **Referential stability:** The `update` function is referentially stable.
   */
  update(fn: (current: TValue) => TValue): void;

  /** Subscribe to value changes */
  subscribe(
    listener: (value: DeepReadonly<TValue>, prev: DeepReadonly<TValue>) => void
  ): Unsubscribe;
}
```

### DerivedService

`DerivedService` is for computed values derived from other state. Read-only by default; see [bidirectional derived state](./09-advanced.md#37-bidirectional-derived-state) for writable computed values.

```typescript
interface DerivedService<TResult> {
  /** Current computed value (deeply frozen) */
  readonly value: DeepReadonly<TResult>;

  /** Subscribe to recomputation */
  subscribe(
    listener: (value: DeepReadonly<TResult>, prev: DeepReadonly<TResult>) => void
  ): Unsubscribe;
}
```

### AsyncDerivedService

`AsyncDerivedService` is for computed values derived from asynchronous computations — API calls, lazy imports, or any operation that returns a `ResultAsync`. It tracks loading/error status alongside the result value.

The service exposes its state through `AsyncDerivedSnapshot<TResult, E>`, a discriminated union on `status` that lets TypeScript narrow `data` and `error` types when checking status. The error type parameter `E` flows from the port declaration (`createAsyncDerivedPort<TResult, E>()`) through the service to the snapshot — when `E` is `never` (the default), the error variant uses `unknown` for backward compatibility.

```typescript
import { ResultAsync } from "@hex-di/result";

interface AsyncDerivedService<TResult, E = never> {
  /** Current snapshot as a discriminated union — narrow via status check */
  readonly snapshot: AsyncDerivedSnapshot<TResult, E>;

  /** Convenience: current status */
  readonly status: AsyncDerivedSnapshot<TResult, E>["status"];

  /** Convenience flag: true when status is "loading" */
  readonly isLoading: boolean;

  /**
   * Trigger a re-fetch (invalidates current data).
   *
   * **Referential stability:** The `refresh` function is referentially stable --
   * the same function reference is returned for the lifetime of the service.
   * Safe to use as a React dependency or event handler without wrapping in `useCallback`.
   */
  refresh(): void;

  /** Subscribe to status/data/error changes */
  subscribe(listener: (snapshot: AsyncDerivedSnapshot<TResult, E>) => void): Unsubscribe;
}
```

### AsyncDerivedSnapshot (discriminated union)

`AsyncDerivedSnapshot` is a discriminated union on `status`. This lets TypeScript narrow `data` and `error` types when checking status, eliminating the need for null checks after a status guard:

```typescript
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

Each variant narrows the available fields:

- `"idle"` — initial state before first computation. `data` is `undefined`, `error` is `undefined`.
- `"loading"` — computation in progress. `data` may hold stale data from a previous successful computation (useful for "stale-while-revalidate" patterns), `error` is `undefined`.
- `"success"` — computation completed. `data` is `DeepReadonly<TResult>` (non-optional, always present), `error` is `undefined`.
- `"error"` — computation failed. `data` is `undefined`, `error` is `E` when the port declares an error type, or `unknown` when `E` is `never` (the default). The error is always present (non-optional).

```typescript
// Type narrowing in practice:
const snapshot = service.snapshot;
if (snapshot.status === "success") {
  snapshot.data; // DeepReadonly<TResult> — no undefined check needed
}
if (snapshot.status === "error") {
  snapshot.error; // E (or unknown if E is never) — no undefined check needed
}

// With typed errors (E is a tagged union):
// Given: createAsyncDerivedPort<UserProfile, NetworkError | AuthError>()
if (snapshot.status === "error") {
  switch (snapshot.error._tag) {
    case "NetworkError": // handle network failure
    case "AuthError": // handle auth failure
  }
}
```

Calling `refresh()` transitions from any state back to `"loading"` and re-runs the async computation. When source dependencies change, the computation automatically re-runs (following the same reactivity tracking as synchronous derived ports).

## 6. ActionMap & BoundActions

### ActionMap

Action signatures are declared on the port as phantom types for compile-time safety. The actual reducer implementations are provided by the adapter. Each action maps a name to a pure function that transforms state.

```typescript
/** Map of action names to reducer functions */
type ActionMap<TState> = Record<string, ActionReducer<TState, unknown>>;

/**
 * A reducer: takes state (and optional payload) and returns new state.
 * Uses a branded NoPayload sentinel instead of void to avoid
 * the void/undefined ambiguity (see §6a).
 */
declare const __noPayload: unique symbol;
type NoPayload = { readonly [__noPayload]: true };

type ActionReducer<TState, TPayload = NoPayload> = [TPayload] extends [NoPayload]
  ? (state: TState) => TState
  : (state: TState, payload: TPayload) => TState;
```

### BoundActions

When you resolve a state port, the reducer functions are converted to callable bound actions. The state parameter is removed -- only the payload remains.

```typescript
type BoundActions<TState, TActions extends ActionMap<TState>> = {
  [K in keyof TActions]: TActions[K] extends (state: TState) => TState
    ? () => void
    : TActions[K] extends (state: TState, payload: infer P) => TState
      ? (payload: P) => void
      : never;
};
```

### Example

```typescript
// Port declaration: action SIGNATURES as phantom types for type safety
const CounterPort = createStatePort<
  { count: number },
  {
    increment: ActionReducer<{ count: number }>;
    decrement: ActionReducer<{ count: number }>;
    incrementBy: ActionReducer<{ count: number }, number>;
    reset: ActionReducer<{ count: number }>;
  }
>()({ name: "Counter" });

// Adapter: provides initial state and reducer IMPLEMENTATIONS
const counterAdapter = createStateAdapter({
  provides: CounterPort,
  initial: { count: 0 },
  actions: {
    increment: state => ({ ...state, count: state.count + 1 }),
    decrement: state => ({ ...state, count: state.count - 1 }),
    incrementBy: (state, payload: number) => ({
      ...state,
      count: state.count + payload,
    }),
    reset: () => ({ count: 0 }),
  },
});

// Resolution: reducers become bound actions
const counter = container.resolve(CounterPort);
counter.actions.increment(); // () => void
counter.actions.incrementBy(10); // (payload: number) => void
counter.actions.reset(); // () => void
```

### Why reducers live in the adapter

In the HexDI ecosystem, ports are purely phantom-typed tokens — they carry type information but no runtime behavior. `@hex-di/flow`'s `createFlowPort` only wraps `port<FlowService>()({ name })` — the machine definition lives in the adapter config. Following the same pattern, `createStatePort` declares the service type contract (state shape and action signatures as phantom types), and `createStateAdapter` provides the implementation (initial state, reducer functions, lifetime, effects).

```
Port (contract):    state shape + action signatures (phantom types for type safety)
Adapter (impl):     initial state + reducer functions + lifetime + effects + DI dependencies
```

This separation enables testing flexibility: you can provide different initial states, simplified reducers, or no-op effects in test adapters while the port contract ensures type safety.

### Reducer Complexity Guidelines

Reducers must be pure and synchronous. Complex transformations belong in separate tested helper functions -- reducers should be thin wrappers.

**Rules:**

1. **Reducers must be pure** -- no API calls, no DOM access, no `Date.now()`, no `Math.random()`. The same input must always produce the same output.
2. **Reducers must be synchronous** -- no `async`, no Promises, no callbacks. Async operations belong in effects.
3. **Reducers should be short** -- aim for under 10 lines. If a reducer is complex, extract the transformation to a helper function.
4. **Reducers should only transform their own state** -- never read or write external state, globals, or other ports.

**Pattern: Reducer composition with helpers**

```typescript
// Helper: tested independently, reusable
function applyDiscount(items: readonly CartItem[], percent: number): readonly CartItem[] {
  return items.map(item => ({
    ...item,
    price: item.price * (1 - percent / 100),
  }));
}

// Port: declares the type contract
const CartPort = createStatePort<
  CartState,
  {
    applyDiscount: ActionReducer<CartState, { percent: number }>;
  }
>()({ name: "Cart" });

// Adapter: thin reducer calling the helper
const cartAdapter = createStateAdapter({
  provides: CartPort,
  initial: { items: [], discountPercent: 0 },
  actions: {
    applyDiscount: (state, payload: { percent: number }) => ({
      ...state,
      items: applyDiscount(state.items, payload.percent),
      discountPercent: payload.percent,
    }),
  },
});
```

**Anti-pattern: Fat reducers**

```typescript
// BAD: Too much logic in the reducer
actions: {
  checkout: (state) => {
    // DON'T: API call in reducer
    // DON'T: Complex business logic spanning 30+ lines
    // DON'T: DOM access (localStorage, document, etc.)
    // DON'T: Non-deterministic values (Date.now(), Math.random())
  },
}
```

Reducers that violate these rules are untestable, unpredictable, and break time-travel debugging (since replaying actions produces different results).

### 6a. NoPayload Sentinel Type

`ActionReducer` uses a branded `NoPayload` sentinel type instead of `void` as the default for the `TPayload` parameter. This avoids a TypeScript edge case where `undefined extends void` is `true`, causing `ActionReducer<S, undefined>` to collapse to the no-payload branch incorrectly.

The distribution guard `[TPayload] extends [NoPayload]` prevents union distribution AND the void/undefined ambiguity. End users never interact with `NoPayload` directly — it's purely an internal type-level mechanism. Bound actions still map to `() => void` for no-payload actions at the call site.

## 7. DeepReadonly & Snapshot Separation

State snapshots are deeply frozen to prevent accidental mutation. This follows the Valtio pattern of mutable internals with immutable snapshots.

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

### Snapshot guarantees

- `counter.state` returns `DeepReadonly<{ count: number }>` -- all properties are readonly recursively
- Snapshots are structurally shared when unchanged (reference equality for unchanged subtrees)
- The internal signal holds the mutable state; snapshots are frozen on read
- TypeScript enforces immutability at compile time; `Object.freeze` enforces it at runtime in development

### Why snapshot separation matters

Without snapshot separation, components can accidentally mutate state:

```typescript
// BAD: Without DeepReadonly, this compiles and silently corrupts state
const items = container.resolve(CartPort).state.items;
items.push(newItem); // Mutates the store's internal state!

// GOOD: With DeepReadonly, TypeScript catches this
const items = container.resolve(CartPort).state.items;
items.push(newItem); // Type error: Property 'push' does not exist on type 'readonly ...'
```

## 8. Signal Reactivity Primitives

The reactivity engine uses signals as the core primitive, inspired by the TC39 Signals proposal. Signals provide automatic dependency tracking and efficient notification.

### Signal

A signal is a reactive value that tracks its dependents.

```typescript
interface Signal<T> {
  /** Read the current value and register as a dependency */
  get(): T;

  /** Write a new value and notify dependents */
  set(value: T): void;

  /** Read without tracking (no dependency registration) */
  peek(): T;
}
```

### Computed

A computed is a derived signal that automatically tracks which signals it reads.

```typescript
interface Computed<T> {
  /** Read the computed value (lazy evaluation, cached until dependencies change) */
  get(): T;

  /** Read without tracking (no dependency registration) */
  peek(): T;
}
```

### Effect (reactive, not DI effect)

A reactive effect runs when its tracked signals change. This is the internal scheduling primitive, not to be confused with DI effect ports.

```typescript
interface ReactiveEffect {
  /** Run the effect and track dependencies */
  run(): void;

  /** Stop tracking and dispose */
  dispose(): void;
}
```

### How state ports use signals

Each state adapter's internal implementation wraps a signal:

```
createStateAdapter (runtime instance)
  └─ internal Signal<TState>           // mutable signal
       ├─ .state → DeepReadonly<TState> // frozen snapshot
       ├─ .actions → BoundActions       // write to signal, notify
       └─ .subscribe → listener         // reactive effect
```

Derived adapters wrap computed signals:

```
createDerivedAdapter (runtime instance)
  └─ internal Computed<TResult>         // auto-tracks source signals
       ├─ .value → DeepReadonly<TResult> // frozen snapshot
       └─ .subscribe → listener          // reactive effect on computed
```

See [05 - Reactivity](./05-reactivity.md) for the full reactivity engine design.

---

_Previous: [01 - Overview & Philosophy](./01-overview.md) | Next: [03 - State Ports](./03-state-ports.md)_
