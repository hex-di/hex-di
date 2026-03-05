# 08 — Adapter Lifecycle States

Phantom type parameters on adapter handles track lifecycle phases at compile time, preventing invalid operations in wrong states. See [RES-02](../../../research/RES-02-session-types-behavioral-contracts.md) and [RES-03](../../../research/RES-03-linear-affine-types-resource-lifecycle.md).

## BEH-CO-08-001: AdapterHandle Phantom State

Adapter handles carry a phantom `TState` parameter encoding the current lifecycle phase. The state flows linearly: `created -> initialized -> active -> disposing -> disposed`.

```ts
type AdapterLifecycleState = "created" | "initialized" | "active" | "disposing" | "disposed";

interface AdapterHandle<T, TState extends AdapterLifecycleState = "created"> {
  readonly [__adapterStateBrand]: TState;
  readonly state: TState;
  readonly service: TState extends "active" ? T : never;

  initialize: TState extends "created" ? () => Promise<AdapterHandle<T, "initialized">> : never;

  activate: TState extends "initialized" ? () => AdapterHandle<T, "active"> : never;

  dispose: TState extends "active" ? () => Promise<AdapterHandle<T, "disposed">> : never;
}
```

**Exported from**: `adapters/handle.ts` (proposed).

**Algorithm**:

1. `createAdapter()` returns an adapter whose resolution produces `AdapterHandle<T, "created">`
2. The container calls `handle.initialize()` during the build phase, transitioning to `"initialized"`
3. The container calls `handle.activate()` after all dependencies are resolved, transitioning to `"active"`
4. Only `"active"` handles expose the `service` property with type `T`
5. `handle.dispose()` transitions through `"disposing"` internally and returns `"disposed"`
6. At each step, the previous handle reference becomes stale (the returned handle carries the new state)

**Behavior Table**:

| Current State   | `initialize()`                            | `activate()`                         | `service`                | `dispose()`                            |
| --------------- | ----------------------------------------- | ------------------------------------ | ------------------------ | -------------------------------------- |
| `"created"`     | Returns `AdapterHandle<T, "initialized">` | `never` (type error)                 | `never` (type error)     | `never` (type error)                   |
| `"initialized"` | `never` (type error)                      | Returns `AdapterHandle<T, "active">` | `never` (type error)     | `never` (type error)                   |
| `"active"`      | `never` (type error)                      | `never` (type error)                 | `T` (service accessible) | Returns `AdapterHandle<T, "disposed">` |
| `"disposing"`   | `never` (type error)                      | `never` (type error)                 | `never` (type error)     | `never` (type error)                   |
| `"disposed"`    | `never` (type error)                      | `never` (type error)                 | `never` (type error)     | `never` (type error)                   |

**Example**:

```ts
import { port, createAdapter, SINGLETON, ok } from "@hex-di/core";

interface Database {
  query(sql: string): Promise<ReadonlyArray<unknown>>;
}

const DBPort = port<Database>()({ name: "Database", direction: "outbound" });

const dbAdapter = createAdapter({
  provides: [DBPort],
  factory: () => ok({ query: (sql: string) => Promise.resolve([]) }),
  lifetime: SINGLETON,
});

// Container resolution pipeline (internal):
const created = resolveHandle(dbAdapter);
// Type: AdapterHandle<Database, "created">

const initialized = await created.initialize();
// Type: AdapterHandle<Database, "initialized">

const active = initialized.activate();
// Type: AdapterHandle<Database, "active">

const db = active.service; // OK — type is Database

created.service;
// ^^^^^^^ Type error: service is never on "created" handle

const disposed = await active.dispose();
// Type: AdapterHandle<Database, "disposed">

disposed.service;
// ^^^^^^^ Type error: service is never on "disposed" handle
```

**Design notes**:

- Follows the session types pattern from Wadler (2012) and Gay et al. (2015) — each state transition returns a new handle in the next state, encoding the protocol as a type-level state machine.
- The `"disposing"` state is internal to the container and not directly observable by consumers. It exists to prevent re-entrant disposal (calling `dispose()` from within a finalizer).
- Default `TState = "created"` ensures backward compatibility when the state parameter is omitted.
- Runtime checks remain as a safety net for aliased references (same limitation as [BEH-CO-07-001](07-disposal-state-branding.md)).
- Cross-ref: [INV-CO-5](../invariants.md#inv-co-5-phantom-disposal-prevention), [BEH-CO-07](07-disposal-state-branding.md).

## BEH-CO-08-002: State-Conditional Method Availability

Methods on `AdapterHandle` are conditionally typed based on `TState`. A method is available (typed as a callable function) only in the appropriate state; in all other states it is `never`.

```ts
// Type-level method guard pattern
type StateGuardedMethod<
  TState extends AdapterLifecycleState,
  TAllowed extends AdapterLifecycleState,
  TSignature,
> = TState extends TAllowed ? TSignature : never;

// Applied to AdapterHandle:
interface AdapterHandle<T, TState extends AdapterLifecycleState> {
  initialize: StateGuardedMethod<TState, "created", () => Promise<AdapterHandle<T, "initialized">>>;
  activate: StateGuardedMethod<TState, "initialized", () => AdapterHandle<T, "active">>;
  dispose: StateGuardedMethod<TState, "active", () => Promise<AdapterHandle<T, "disposed">>>;
}
```

**Exported from**: `adapters/handle.ts` (proposed).

**Algorithm**:

1. For each method, evaluate `TState extends TAllowed` at the type level
2. If the condition is true, the method has its full signature (callable)
3. If the condition is false, the method is `never` (calling it is a type error)
4. TypeScript's control flow analysis will prevent calling `never`-typed properties

**Behavior Table**:

| Method               | Allowed State   | Behavior in Wrong State             |
| -------------------- | --------------- | ----------------------------------- |
| `initialize()`       | `"created"`     | Type error: `never` is not callable |
| `activate()`         | `"initialized"` | Type error: `never` is not callable |
| `dispose()`          | `"active"`      | Type error: `never` is not callable |
| `service` (property) | `"active"`      | Type error: type is `never`         |

**Example**:

```ts
function processHandle<T>(handle: AdapterHandle<T, "active">) {
  // Guaranteed: only "active" handles reach here
  const svc = handle.service; // OK — T
  handle.initialize();
  // ^^^^^^^^^^^^^^^ Type error: never is not callable

  handle.activate();
  // ^^^^^^^^^^^^^^ Type error: never is not callable
}

function wrongPhase(handle: AdapterHandle<Database, "created">) {
  handle.dispose();
  // ^^^^^^^^^^^^^ Type error: never is not callable (must initialize first)
}
```

**Design notes**:

- The `StateGuardedMethod` pattern is reusable across the codebase for any phantom-state-conditional API.
- This maps directly to modular session types (Gay et al., 2015) — each method is only available in the session state where the protocol permits it.
- IDE autocomplete will not suggest `never`-typed methods, providing a natural developer experience.
- Cross-ref: [BEH-CO-12](12-protocol-state-machines.md) for the generalized protocol state machine pattern.

## BEH-CO-08-003: State Transition Validation

State transitions follow a strict linear order. The type system encodes the valid transition graph, rejecting any attempt to skip states or transition backward.

```ts
type ValidTransition<TFrom extends AdapterLifecycleState> = TFrom extends "created"
  ? "initialized"
  : TFrom extends "initialized"
    ? "active"
    : TFrom extends "active"
      ? "disposing"
      : TFrom extends "disposing"
        ? "disposed"
        : never; // "disposed" is terminal — no further transitions

type CanTransition<TFrom extends AdapterLifecycleState, TTo extends AdapterLifecycleState> =
  TTo extends ValidTransition<TFrom> ? true : false;

// Runtime assertion (safety net for aliased references)
function assertTransition(from: AdapterLifecycleState, to: AdapterLifecycleState): void;
```

**Exported from**: `adapters/lifecycle.ts` (proposed).

**Algorithm**:

1. Define the transition graph as a conditional type mapping each state to its sole successor
2. `ValidTransition<TFrom>` evaluates to the next valid state or `never` if terminal
3. `CanTransition<TFrom, TTo>` checks if a specific transition is valid
4. Each transition method returns a handle in the `ValidTransition` state
5. At runtime, `assertTransition` validates the from/to pair and throws on invalid transitions (safety net)

**Behavior Table**:

| From State      | To State        | `CanTransition`      | Runtime Behavior                |
| --------------- | --------------- | -------------------- | ------------------------------- |
| `"created"`     | `"initialized"` | `true`               | Allowed                         |
| `"created"`     | `"active"`      | `false` (type error) | Throws `InvalidTransitionError` |
| `"initialized"` | `"active"`      | `true`               | Allowed                         |
| `"initialized"` | `"disposed"`    | `false` (type error) | Throws `InvalidTransitionError` |
| `"active"`      | `"disposing"`   | `true`               | Allowed (internal)              |
| `"disposing"`   | `"disposed"`    | `true`               | Allowed (internal)              |
| `"disposed"`    | (any)           | `false` (type error) | Throws `InvalidTransitionError` |

**Example**:

```ts
import type { ValidTransition, CanTransition } from "@hex-di/core";

// Type-level validation
type AfterCreated = ValidTransition<"created">;
// AfterCreated = "initialized"

type CanSkip = CanTransition<"created", "active">;
// CanSkip = false — cannot skip initialization

type CanGoBack = CanTransition<"active", "created">;
// CanGoBack = false — no backward transitions

type Terminal = ValidTransition<"disposed">;
// Terminal = never — no transitions from disposed
```

**Design notes**:

- The transition graph is strictly linear (no branching, no cycles), matching affine type semantics from Bernardy et al. (2018) — each adapter handle is used at most once per transition.
- The `"disposing"` state is an internal transition managed by the container; external code transitions from `"active"` to `"disposed"` via `dispose()` which handles both transitions internally.
- Runtime validation exists for the aliasing limitation: when multiple references to the same handle exist, the type system cannot prevent use of a stale reference.
- Cross-ref: [BEH-CO-07-001](07-disposal-state-branding.md) (container-level phantom phases), [BEH-CO-14](14-formal-disposal-ordering.md) (disposal ordering).
