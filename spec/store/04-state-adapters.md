# 04 - State Adapters

_Previous: [03 - State Ports](./03-state-ports.md)_

---

All state adapters return `Adapter<TProvides, TRequires, TLifetime, "sync">` from `@hex-di/core`. They register with `GraphBuilder.provide()` and participate in Container's dependency resolution, scoping, and disposal.

## 13. createStateAdapter

Creates an adapter for a state port. The adapter provides initial state, reducer implementations, lifetime configuration, DI dependencies, and effects. This follows the same pattern as `@hex-di/flow` where `FlowAdapterConfig.machine` carries the machine definition — the port is a pure type token, and the adapter supplies the implementation.

### Signature

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

The `initial` field provides the initial state value, and `actions` provides the reducer implementations. Both are type-checked against the port's phantom types — the `InferStateType` and `InferActionsType` utilities extract the types from the port's `[__stateType]` and `[__actionsType]` branded properties, ensuring the adapter matches the port's declared contract.

### EffectMap

Effects are functions triggered after a reducer runs. Each effect receives the new state, previous state, and the action payload.

```typescript
import { ResultAsync } from "@hex-di/result";

type EffectMap<TState, TActions extends ActionMap<TState>> = {
  [K in keyof TActions]: (
    context: EffectContext<TState, TActions, K>
  ) => void | ResultAsync<void, unknown>;
};

interface EffectContext<TState, TActions extends ActionMap<TState>, K extends keyof TActions> {
  /** State after the reducer ran */
  readonly state: DeepReadonly<TState>;
  /** State before the reducer ran */
  readonly prevState: DeepReadonly<TState>;
  /** The payload passed to the action (void for no-payload actions) */
  readonly payload: TActions[K] extends (state: TState, payload: infer P) => TState ? P : void;
}
```

### Effect Error Handling

Effects fire after reducers complete. Effects return `void` (infallible synchronous) or `ResultAsync<void, unknown>` (fallible async). When an effect returns `Err`, the state transition has already committed — the reducer ran successfully. Rolling back state because a side effect failed would conflate two independent concerns: deterministic state transitions and infrastructure side effects.

The runtime inspects the `ResultAsync` return value: `Ok` means success, `Err` means failure. The error is wrapped in an `EffectFailedError` (tagged with `_tag: "EffectFailed"`, the port name, and the action name) and passed to `onEffectError` (see [§42a Operational Error Types](./10-api-reference.md#operational-error-types-tagged-unions)). This replaces the previous `try/catch` model — effects that return `void` are treated as infallible (equivalent to `ResultAsync<void, never>`).

#### EffectErrorHandler

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

The handler receives the full error context:

- `error` -- an `EffectFailedError` with `{ _tag: "EffectFailed", portName, actionName, cause }` where `cause` is the original error value from the `Err` variant
- `actionName` -- which action's effect failed
- `state` -- current state (after the reducer that triggered the effect)
- `prevState` -- state before the reducer ran
- `actions` -- bound actions for dispatching compensating actions

#### Adding onEffectError to adapters

```typescript
const todoAdapter = createStateAdapter({
  provides: TodoPort,
  initial: { items: [], filter: "all" },
  actions: {
    addItem: (state, payload: { text: string }) => ({
      ...state,
      items: [...state.items, { id: crypto.randomUUID(), text: payload.text, done: false }],
    }),
    removeItem: (state, payload: { id: string }) => ({
      ...state,
      items: state.items.filter((item) => item.id !== payload.id),
    }),
  },
  requires: [TodoApiPort] as const,
  lifetime: "singleton",
  effects: (deps) => ({
    addItem: ({ state, payload }) =>
      ResultAsync.fromPromise(
        deps.TodoApi.create(payload),
        (cause) => cause,
      ).map(() => undefined),
  }),
  onEffectError: ({ error, actionName, actions, prevState }) => {
    if (actionName === "addItem") {
      // error._tag is "EffectFailed", error.cause has the original failure
      // Compensating action: remove the optimistically added item
      const addedItem = /* find item not in prevState */;
      actions.removeItem({ id: addedItem.id });
    }
  },
});
```

#### Error patterns

**Fire-and-forget (default):** When no `onEffectError` is provided, effect `Err` results are swallowed. The state transition stands. Use for non-critical effects like analytics or logging. If `onEffectError` itself throws, the runtime wraps both errors in an `EffectErrorHandlerError` (see [§42a Error Classes](./10-api-reference.md#effecterrorhandlererror)), logs it via the diagnostic channel, and stops propagation to prevent infinite recursion.

**Compensating action:** `onEffectError` dispatches an action that reverses the original transition. The compensating action is a regular action -- it goes through the reducer, fires its own effects, and is visible in action history.

```typescript
onEffectError: ({ actionName, actions, prevState }) => {
  if (actionName === "optimisticAdd") {
    actions.rollback({ id: prevState.lastPendingId });
  }
},
```

**Error state:** `onEffectError` dispatches an action that sets an error flag in state. Components read the error flag and display feedback.

```typescript
onEffectError: ({ error, actions }) => {
  actions.setError({
    message: error.cause instanceof Error ? error.cause.message : "Unknown error",
  });
},
```

**Retry:** `onEffectError` dispatches the same action again. Limit retries to prevent infinite loops.

```typescript
onEffectError: ({ actionName, state, actions }) => {
  const retryCount = state.retryCount ?? 0;
  if (retryCount < 3) {
    actions.incrementRetry();
    actions[actionName]?.(/* re-dispatch with same payload */);
  } else {
    actions.setError({ message: "Max retries exceeded" });
  }
},
```

#### ActionEvent extension

`ActionEvent` gains two optional fields for effect error tracking:

```typescript
interface ActionEvent {
  readonly portName: string;
  readonly actionName: string;
  readonly payload: unknown;
  readonly prevState: unknown;
  readonly nextState: unknown;
  readonly timestamp: number;
  readonly phase: "action" | "effect-error";
  readonly error?: EffectFailedError;
  /** Trace ID from @hex-di/tracing (present when tracing is active) */
  readonly traceId?: string;
}
```

- `phase: "action"` -- normal action dispatch (default)
- `phase: "effect-error"` -- emitted when an effect returns `Err`, before `onEffectError` runs
- `error` -- an `EffectFailedError` value, present only when `phase` is `"effect-error"`
- `traceId` -- the W3C Trace Context trace ID from the tracing span created for this action. Present only when `@hex-di/tracing` is in the dependency graph and the action produced a tracing span. Enables cross-referencing store actions with distributed traces (e.g., querying `hexdi://tracing/spans?traceId=abc123` to see the full resolution chain that triggered this action).

Effect ports observing `ActionEffect.onAction` see both phases. This enables logging adapters to record effect failures alongside normal actions.

### Basic usage (no effects)

```typescript
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
  lifetime: "singleton",
});

// Register with GraphBuilder
const graph = GraphBuilder.create().provide(counterAdapter).build();
```

### With effects and DI dependencies

```typescript
const authAdapter = createStateAdapter({
  provides: AuthPort,
  initial: { status: "unauthenticated", user: null, token: null },
  actions: {
    loginSuccess: (state, payload: { token: string; user: User }) => ({
      ...state,
      status: "authenticated",
      token: payload.token,
      user: payload.user,
    }),
    logout: () => ({ status: "unauthenticated", user: null, token: null }),
  },
  requires: [StoragePort, AnalyticsPort] as const,
  lifetime: "singleton",
  effects: deps => ({
    loginSuccess: ({ state }) =>
      ResultAsync.fromPromise(
        deps.Storage.set("auth_token", state.token).then(() =>
          deps.Analytics.track("login_success", { userId: state.user?.id })
        ),
        cause => cause
      ).map(() => undefined),
    logout: () =>
      ResultAsync.fromPromise(
        deps.Storage.remove("auth_token").then(() => deps.Analytics.track("logout")),
        cause => cause
      ).map(() => undefined),
  }),
});
```

### Scoped state adapter

```typescript
const formAdapter = createStateAdapter({
  provides: FormPort,
  initial: { values: {}, errors: {}, dirty: false },
  actions: {
    setValue: (state, payload: { field: string; value: string }) => ({
      ...state,
      values: { ...state.values, [payload.field]: payload.value },
      dirty: true,
    }),
    reset: () => ({ values: {}, errors: {}, dirty: false }),
  },
  lifetime: "scoped",
});

// Each scope gets its own form state
const scope1 = container.createScope("form-1");
const scope2 = container.createScope("form-2");
const form1 = scope1.resolve(FormPort); // Independent instance
const form2 = scope2.resolve(FormPort); // Independent instance
```

### Default lifetime

When `lifetime` is omitted, it defaults to `"singleton"`. State is inherently shared -- most state ports represent application-wide state (auth, cart, theme). Scoped state is the exception for forms, modals, and multi-tenant scenarios.

### Why no `transient` lifetime

The core `Lifetime` type includes `"transient"` (new instance per resolution), but state adapters restrict to `"singleton" | "scoped"`. A transient state port would create a new signal on every `resolve()` call -- each call returns independent state that shares nothing. This defeats the purpose of reactive state (shared, observable, subscribed). If you need independent non-reactive values, use a regular adapter with `createAdapter`.

### Scoped state requires a Scope

Container throws `ScopeRequiredError` if you resolve a scoped port from the root container directly. Scoped state ports must be resolved from a `Scope`:

```typescript
// This throws ScopeRequiredError at runtime:
container.resolve(FormPort); // FormPort has lifetime: "scoped"

// Correct: resolve from a scope
const scope = container.createScope("form-1");
scope.resolve(FormPort); // OK
```

## 14. createAtomAdapter

Creates an adapter for an atom port. The adapter provides the initial value -- consistent with how `createStateAdapter` provides `initial` state and `createFlowAdapter` provides the machine definition. Ports are purely phantom-typed tokens; adapters supply the implementation.

### Signature

```typescript
function createAtomAdapter<TPort extends AtomPortDef<string, unknown>>(config: {
  readonly provides: TPort;
  readonly initial: InferAtomType<TPort>;
  readonly lifetime?: "singleton" | "scoped";
}): Adapter<TPort, never, "singleton" | "scoped", "sync">;
```

The `initial` field provides the initial value for the atom. It is type-checked against the port's phantom type via `InferAtomType<TPort>`, ensuring the adapter matches the port's declared value type.

### Usage

```typescript
const themeAdapter = createAtomAdapter({
  provides: ThemePort,
  initial: "light",
});

const localeAdapter = createAtomAdapter({
  provides: LocalePort,
  initial: "en",
});

const sidebarAdapter = createAtomAdapter({
  provides: SidebarExpandedPort,
  initial: true,
});

// Register alongside other adapters
const graph = GraphBuilder.create()
  .provide(themeAdapter)
  .provide(localeAdapter)
  .provide(sidebarAdapter)
  .build();
```

Atom adapters are intentionally minimal -- no effects, no dependencies. If you need effects when an atom changes, create an effect port that observes the atom through the reactivity graph.

## 15. createDerivedAdapter

Creates an adapter that computes a value from other ports. Dependencies are expressed through `requires` -- the standard HexDI mechanism.

### Signature

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

### DerivedDeps

The `deps` parameter in `select` provides access to source state. For state ports, it exposes the `StateService` interface. For atom ports, it exposes the `AtomService` interface. For other derived ports, it exposes the `DerivedService` interface.

```typescript
type DerivedDeps<TRequires extends readonly Port<unknown, string>[]> = {
  [TPort in TRequires[number] as InferPortName<TPort> & string]: InferService<TPort>;
};
```

`DerivedDeps` uses the same underlying type mapping as `ResolvedDeps<TupleToUnion<TRequires>>` from `@hex-di/core`. It is a local alias for clarity -- derived adapters resolve their dependencies to the same service types that `ResolvedDeps` produces (e.g., `StateService`, `AtomService`). The name `DerivedDeps` emphasizes that these dependencies provide reactive state access rather than arbitrary service resolution.

### Usage

```typescript
// Single source
const doubleCountAdapter = createDerivedAdapter({
  provides: DoubleCountPort,
  requires: [CounterPort] as const,
  select: deps => deps.Counter.state.count * 2,
});

// Multiple sources
const cartTotalAdapter = createDerivedAdapter({
  provides: CartTotalPort,
  requires: [CartPort] as const,
  select: deps => {
    const cart = deps.Cart.state;
    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discount = subtotal * (cart.discountPercent / 100);
    return {
      subtotal,
      discount,
      total: subtotal - discount,
      itemCount: cart.items.length,
    };
  },
});

// Cross-port derived (depends on both Auth and Cart)
const checkoutReadyAdapter = createDerivedAdapter({
  provides: CheckoutReadyPort,
  requires: [AuthPort, CartPort] as const,
  select: deps => ({
    isAuthenticated: deps.Auth.state.status === "authenticated",
    hasItems: deps.Cart.state.items.length > 0,
    canCheckout: deps.Auth.state.status === "authenticated" && deps.Cart.state.items.length > 0,
  }),
});
```

### Custom equality

By default, derived values use reference equality. For computed objects, provide a custom equality function to prevent unnecessary recomputation:

```typescript
const cartTotalAdapter = createDerivedAdapter({
  provides: CartTotalPort,
  requires: [CartPort] as const,
  select: deps => computeCartTotal(deps.Cart.state),
  equals: (a, b) =>
    a.subtotal === b.subtotal &&
    a.discount === b.discount &&
    a.total === b.total &&
    a.itemCount === b.itemCount,
});
```

### Derived lifetime

Derived adapters default to `lifetime: "singleton"` but support `lifetime: "scoped"` when they depend on scoped sources.

**The rule:** A derived adapter's lifetime must be equal to or shorter-lived than its shortest-lived source. A derived port that depends on a scoped source must itself be scoped, because the scoped source produces independent instances per scope -- a singleton derived value cannot track all of them.

```
✅ Derived (singleton) → depends on → StatePort (singleton)
✅ Derived (scoped)    → depends on → StatePort (scoped)
✅ Derived (scoped)    → depends on → StatePort (singleton) + StatePort (scoped)
❌ Derived (singleton) → depends on → StatePort (scoped)  ← captive dependency!
```

The graph builder validates this constraint at compile time. Attempting to register a singleton derived adapter that depends on a scoped port produces a compile-time error (captive dependency detection), consistent with how `@hex-di/graph` already prevents captive dependencies for regular adapters.

```typescript
// Singleton derived: all sources must be singleton
const doubleCountAdapter = createDerivedAdapter({
  provides: DoubleCountPort,
  requires: [CounterPort] as const, // CounterPort is singleton → OK
  select: deps => deps.Counter.state.count * 2,
  // lifetime defaults to "singleton"
});

// Scoped derived: depends on scoped source
const formValidityAdapter = createDerivedAdapter({
  provides: FormValidityPort,
  requires: [UserFormPort, UserPort] as const, // UserFormPort is scoped
  lifetime: "scoped", // Required because UserFormPort is scoped
  select: deps => ({
    isValid: deps.UserForm.state.values.name !== "",
  }),
});
```

When resolved in a scope, a scoped derived adapter creates a computed signal that tracks the scope's source instances. When the scope is disposed, the derived computed is disposed with it.

## 15a. createAsyncDerivedAdapter

Creates an adapter for an async derived port. The adapter defines the async computation, its dependencies, and caching/retry behavior.

### Signature

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

### Configuration

- `select` -- function that returns a `ResultAsync<T, E>` computing the derived value from resolved dependencies. `Ok` transitions to `"success"`, `Err` transitions to `"error"`. Re-runs when source dependencies change (tracked via the reactivity engine).
- `staleTime` -- milliseconds before cached data is considered stale and re-fetched. Default: `0` (always re-fetch on dependency change). Set to `Infinity` to never auto-refetch.
- `retryCount` -- number of retry attempts on failure. Default: `0` (no retries).
- `retryDelay` -- milliseconds between retries. Can be a number (fixed delay) or a function for exponential backoff. Default: `1000`.

### Usage

```typescript
import { ResultAsync } from "@hex-di/result";

const exchangeRateAdapter = createAsyncDerivedAdapter({
  provides: ExchangeRatePort,
  requires: [CurrencyPort, ApiClientPort] as const,
  select: deps => {
    const currency = deps.Currency.value;
    return ResultAsync.fromPromise(
      deps.ApiClient.get<ExchangeRate>(`/rates/${currency}`),
      cause => cause
    );
  },
  staleTime: 60_000, // Re-fetch after 60 seconds
  retryCount: 3,
  retryDelay: attempt => Math.min(1000 * 2 ** attempt, 10_000), // Exponential backoff
});

const userProfileAdapter = createAsyncDerivedAdapter({
  provides: UserProfilePort,
  requires: [AuthPort, UserApiPort] as const,
  select: deps => {
    const userId = deps.Auth.state.user?.id;
    if (!userId) {
      return ResultAsync.err({ _tag: "AuthExpired" as const });
    }
    return ResultAsync.fromPromise(deps.UserApi.getProfile(userId), cause => ({
      _tag: "NetworkError" as const,
      cause,
    }));
  },
  retryCount: 2,
});
```

### Behavior

1. On first resolution, the service starts in `"idle"` status, then immediately transitions to `"loading"` and runs `select`.
2. When `select` returns `Ok`, status transitions to `"success"` and `data` is set.
3. When `select` returns `Err`, retries are attempted (if configured). After all retries exhaust, status transitions to `"error"` with the typed error value.
4. When source dependencies change (reactivity engine detects a new value), if `staleTime` has elapsed, the computation re-runs automatically.
5. Calling `refresh()` forces a re-run regardless of `staleTime`.

### Async derived lifetime

Async derived adapters always have `lifetime: "singleton"`. Like synchronous derived adapters, their effective lifetime follows their sources through Container's scoping system.

## 17. Effect-as-Port Pattern

Cross-cutting concerns (logging, persistence, analytics) are effect adapters — DI-managed adapters that observe state changes through the `ActionEffect` interface. They are created with `createEffectAdapter`, a dedicated factory that returns a properly branded adapter.

### ActionEffect interface

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
  /** Trace ID from @hex-di/tracing (present when tracing is active) */
  readonly traceId?: string;
}
```

### Defining effect ports

Effect ports are standard `Port<ActionEffect>` types. They use `direction: "inbound"` because they receive action events from the state system.

```typescript
import { port } from "@hex-di/core";

const ActionLoggerPort = port<ActionEffect>()({
  name: "ActionLogger",
  direction: "inbound",
  description: "Logs all state actions for debugging",
});

const StatePersisterPort = port<ActionEffect>()({
  name: "StatePersister",
  direction: "inbound",
  description: "Persists selected state ports to storage",
});

const AnalyticsTrackerPort = port<ActionEffect>()({
  name: "AnalyticsTracker",
  direction: "inbound",
  description: "Tracks state actions as analytics events",
});
```

### createEffectAdapter

`createEffectAdapter` is a dedicated factory for effect adapters. It wraps `createAdapter` and adds a `__effectBrand` to the returned adapter, making effect adapters structurally identifiable by the store runtime without relying on magic string tags.

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

### Implementing effect adapters

```typescript
import { createEffectAdapter } from "@hex-di/store";

const actionLoggerAdapter = createEffectAdapter({
  provides: ActionLoggerPort,
  requires: [LoggerPort] as const,
  factory: deps => ({
    onAction: event => {
      deps.Logger.debug(`[${event.portName}/${event.actionName}]`, {
        payload: event.payload,
        prev: event.prevState,
        next: event.nextState,
      });
    },
  }),
});

const statePersisterAdapter = createEffectAdapter({
  provides: StatePersisterPort,
  requires: [StoragePort] as const,
  factory: deps => ({
    onAction: async event => {
      if (PERSISTED_PORTS.has(event.portName)) {
        await deps.Storage.set(`state:${event.portName}`, event.nextState);
      }
    },
  }),
});
```

### Why effect ports replace middleware

| Middleware (eliminated)      | Effect Ports (replacement)        |
| ---------------------------- | --------------------------------- |
| Cannot declare dependencies  | Declares `requires: [LoggerPort]` |
| Global ordering, fragile     | Graph-managed, deterministic      |
| Cannot be scoped             | Scoped per container              |
| Cannot be swapped in tests   | Standard adapter swapping         |
| Outside the dependency graph | Inside the dependency graph       |

### Registration

Effect adapters register in the graph like any other adapter:

```typescript
const graph = GraphBuilder.create()
  .provide(counterAdapter)
  .provide(todoAdapter)
  .provide(actionLoggerAdapter) // Effect adapter (branded)
  .provide(statePersisterAdapter) // Effect adapter (branded)
  .provide(loggerAdapter) // Dependency of actionLoggerAdapter
  .provide(storageAdapter) // Dependency of statePersisterAdapter
  .build();
```

### Effect adapter discovery

The state runtime discovers `ActionEffect` adapters through the `__effectBrand` on adapters created by `createEffectAdapter`. This is a structural check — the runtime inspects the adapter object for the brand property, similar to how branded types work elsewhere in HexDI.

This approach replaces the previous tag-based discovery that relied on a magic string `"action-effect"` tag. Branded discovery is type-safe and does not depend on string conventions. Tags remain available for metadata and discoverability (e.g., graph visualization), but they are NOT used for runtime wiring.

#### Discovery timing: cached at initialization

Effect adapter discovery happens **once** when a state service is first resolved (lazy initialization), not on every action dispatch. The discovery process:

1. When the first state adapter is resolved, the state runtime queries the container's graph for all registered adapters
2. Each adapter is checked for the presence of the `__effectBrand` property (`typeof adapter[__effectBrand] === 'boolean'`)
3. Branded adapters are collected into a frozen `ReadonlyArray<ActionEffect>` cache
4. Subsequent state adapter resolutions within the same container/scope reuse this cache
5. Action dispatches read from the cache — no iteration over all adapters per dispatch

```
First resolve(CounterPort):
  → Scan graph adapters for __effectBrand → [ActionLoggerAdapter, StatePersisterAdapter]
  → Cache: effectAdapters = Object.freeze([loggerEffect, persisterEffect])
  → Resolve CounterPort's factory

Second resolve(TodoPort):
  → Cache hit: reuse effectAdapters
  → Resolve TodoPort's factory

counter.actions.increment():
  → Run reducer
  → Iterate cached effectAdapters (O(n) where n = effect count, not total adapter count)
  → Fire each effect.onAction(event)
```

For scoped containers, each scope builds its own effect adapter cache when its first state adapter is resolved. This ensures scoped effect ports (resolved from the scope) observe only their scope's events, consistent with [§25 Scoped effect ports](./06-lifecycle.md#scoped-effect-ports).

Effect execution is fire-and-forget — async effects do not block state updates. Each effect's `onAction` is called with the `ActionEvent` and any returned Promise is tracked for `effectStatus` reporting but not awaited by the dispatch path.

---

_Previous: [03 - State Ports](./03-state-ports.md) | Next: [05 - Reactivity](./05-reactivity.md)_
