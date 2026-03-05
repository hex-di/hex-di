# Phantom State Patterns

Phantom type parameters used across `@hex-di/core` to encode state, identity, and protocol information at the type level without runtime overhead. Phantom types exist only in the TypeScript type system — they are erased during compilation and have no JavaScript representation.

## Overview

`@hex-di/core` uses four phantom state patterns:

| Pattern           | Type Parameter | Values                                                                | Purpose                       |
| ----------------- | -------------- | --------------------------------------------------------------------- | ----------------------------- |
| Container Phase   | `TPhase`       | `"active" \| "disposed"`                                              | Prevent resolve-after-dispose |
| Adapter Lifecycle | `TState`       | `"created" \| "initialized" \| "active" \| "disposing" \| "disposed"` | Enforce initialization order  |
| Scoped References | `TScopeId`     | Literal string (e.g., `"req-1"`)                                      | Prevent cross-scope leaks     |
| Protocol States   | `TState`       | Service-defined (e.g., `"disconnected" \| "connected"`)               | Enforce call ordering         |

## Pattern 1: Container Phase

The simplest phantom pattern. Two states, one transition, one terminal state.

### Type Definition

```ts
type ContainerPhase = "active" | "disposed";

interface Container<TProvides, TPhase extends ContainerPhase = "active"> {
  resolve: TPhase extends "active"
    ? <N extends keyof TProvides>(port: Port<N, TProvides[N]>) => TProvides[N]
    : never;

  createScope: TPhase extends "active" ? () => Container<TProvides, "active"> : never;

  dispose: TPhase extends "active" ? () => Promise<Container<TProvides, "disposed">> : never;

  readonly phase: TPhase;
  readonly isDisposed: TPhase extends "disposed" ? true : false;
}
```

### State Diagram

```
  ┌─────────┐   dispose()   ┌──────────┐
  │  active  │──────────────>│ disposed │
  └─────────┘                └──────────┘
  resolve: T                  resolve: never
  createScope: ()=>C          createScope: never
  dispose: ()=>C<disposed>    dispose: never
```

### Design Rationale

- **Two states are sufficient**: A container is either usable or not. Intermediate states (building, shutting down) are handled by separate types (`GraphBuilder`, disposal plan).
- **Default `= "active"`**: Existing code that uses `Container<Ports>` without a phase parameter continues to work — it defaults to active.
- **`dispose()` returns a new type**: The caller must use the returned `Container<T, "disposed">` reference. The original `Container<T, "active">` reference becomes stale at the type level, but runtime aliasing means the original reference may still exist — hence the runtime phase check as a safety net.

### Example

```ts
const container = buildContainer(graph);
// Type: Container<{ Logger: Logger }, "active">

container.resolve(LoggerPort); // OK

const disposed = await container.dispose();
// Type: Container<{ Logger: Logger }, "disposed">

disposed.resolve(LoggerPort);
// Type error: resolve is never

// Function signatures communicate requirements
function needsActive(c: Container<Ports, "active">) {
  /* ... */
}
needsActive(disposed); // Type error: "disposed" not assignable to "active"
```

**Cross-ref**: [BEH-CO-07-001](../behaviors/07-disposal-state-branding.md), [INV-CO-5](../invariants.md#inv-co-5-phantom-disposal-prevention), [ADR-CO-003](../decisions/003-disposal-state-phantom-types.md).

## Pattern 2: Adapter Lifecycle

A five-state linear progression modeling the full adapter lifecycle from creation through disposal.

### Type Definition

```ts
type AdapterLifecycleState = "created" | "initialized" | "active" | "disposing" | "disposed";

declare const __adapterStateBrand: unique symbol;

interface AdapterHandle<T, TState extends AdapterLifecycleState = "created"> {
  readonly [__adapterStateBrand]: TState;
  readonly state: TState;

  readonly service: TState extends "active" ? T : never;

  initialize: TState extends "created" ? () => Promise<AdapterHandle<T, "initialized">> : never;

  activate: TState extends "initialized" ? () => AdapterHandle<T, "active"> : never;

  dispose: TState extends "active" ? () => Promise<AdapterHandle<T, "disposed">> : never;
}
```

### State Diagram

```
  ┌─────────┐  initialize()  ┌─────────────┐  activate()  ┌────────┐
  │ created │───────────────>│ initialized │────────────>│ active │
  └─────────┘                └─────────────┘              └────────┘
  service: never             service: never               service: T
  initialize: Fn             initialize: never            initialize: never
  activate: never            activate: Fn                 activate: never
  dispose: never             dispose: never               dispose: Fn
                                                               │
                                                          dispose()
                                                               │
                                                               v
                                                    ┌───────────┐  (internal)  ┌──────────┐
                                                    │ disposing │─────────────>│ disposed │
                                                    └───────────┘              └──────────┘
                                                    service: never             service: never
                                                    (all methods: never)       (all methods: never)
```

### Design Rationale

- **Five states vs. two**: Unlike containers, adapters have a complex lifecycle involving async initialization (connecting to databases, warming caches). The extra states prevent "used before initialized" bugs at compile time.
- **`"disposing"` is internal**: The transition from `"active"` to `"disposing"` to `"disposed"` is managed by the container. External code only sees `"active"` to `"disposed"`. The `"disposing"` state prevents re-entrant disposal.
- **Linear progression**: No backward transitions. Once an adapter is initialized, it cannot be "uninitialized". This follows affine type semantics — each state is used at most once.
- **`service` is conditional**: The service instance `T` is only accessible in the `"active"` state. This is the key compile-time guarantee — you cannot access a service that has not been fully initialized or has been disposed.

### Generic Pattern: StateGuardedMethod

```ts
type StateGuardedMethod<
  TState extends AdapterLifecycleState,
  TAllowed extends AdapterLifecycleState,
  TSignature,
> = TState extends TAllowed ? TSignature : never;
```

This helper type is reused across all state-conditional APIs in `@hex-di/core`. It takes the current state, the allowed state(s), and the method signature, returning either the signature (if allowed) or `never` (if not).

**Cross-ref**: [BEH-CO-08](../behaviors/08-adapter-lifecycle-states.md).

## Pattern 3: Scoped References

Branded types that encode scope identity, preventing cross-scope reference leaks.

### Type Definition

```ts
declare const __scopeBrand: unique symbol;

type ScopedRef<T, TScopeId extends string> = T & {
  readonly [__scopeBrand]: TScopeId;
};
```

### How It Works

Unlike the previous patterns (which use conditional types), scoped references use intersection branding. The brand is added via `&`, meaning `ScopedRef<T, S>` is a subtype of `T` — it can be used anywhere `T` is expected, but the reverse is not true.

```
  T                      — Base service type
  |
  ScopedRef<T, "req-1">  — Branded subtype (assignable to T)
  ScopedRef<T, "req-2">  — Different brand (NOT assignable to ScopedRef<T, "req-1">)
```

### Design Rationale

- **Intersection branding**: Chosen over wrapper types because the branded reference IS the service — no unwrapping needed, no method forwarding, no Proxy overhead.
- **String literal identity**: Scope identity uses string literals (e.g., `"req-1"`, `"req-2"`) rather than symbols or numbers. String literals provide readable type error messages and debuggable runtime values.
- **Gradual adoption**: Because `ScopedRef<T, S>` is assignable to `T`, existing code that accepts `T` continues to work. Only functions that explicitly declare scope requirements (e.g., `(ref: ScopedRef<T, "req-1">)`) benefit from the brand.
- **Escape prevention**: The `AssertNoEscape` utility type prevents scoped references from being returned out of scope callbacks, catching the most common scope leak pattern at compile time.

### Scope Escape Detection

```ts
type AssertNoEscape<TResult, TScopeId extends string> =
  TResult extends ScopedRef<infer _T, TScopeId>
    ? ["ERROR: Scoped reference cannot escape its scope", TScopeId]
    : TResult;
```

### Example

```ts
const scopeA = container.createScope<"req-1">();
const scopeB = container.createScope<"req-2">();

const refA = scopeA.resolve(LoggerPort);
// Type: ScopedRef<Logger, "req-1">

const refB = scopeB.resolve(LoggerPort);
// Type: ScopedRef<Logger, "req-2">

// Cross-scope assignment: type error
const leakedRef: ScopedRef<Logger, "req-2"> = refA;
// Type error: "req-1" not assignable to "req-2"

// Unscoped usage: OK (ScopedRef<T, S> extends T)
function logSomething(logger: Logger) {
  /* ... */
}
logSomething(refA); // OK
```

**Cross-ref**: [BEH-CO-09](../behaviors/09-scoped-reference-tracking.md).

## Pattern 4: Protocol States

Service-defined state machines encoded as phantom type parameters on the service interface itself. Each service defines its own protocol states.

### Type Definition

```ts
declare const __protocolStateBrand: unique symbol;

// Port with protocol awareness
type ProtocolPort<TName extends string, TService, TState extends string = "initial"> = Port<
  TName,
  TService
> & {
  readonly [__protocolStateBrand]: TState;
};

// Protocol-aware service interface
interface Connection<TState extends ConnectionState = "disconnected"> {
  connect: TState extends "disconnected"
    ? (url: string) => Promise<Connection<"connected">>
    : never;

  query: TState extends "connected" ? (sql: string) => Promise<ReadonlyArray<unknown>> : never;

  disconnect: TState extends "connected" ? () => Promise<Connection<"disconnected">> : never;
}

type ConnectionState = "disconnected" | "connected";
```

### How It Differs from Other Patterns

| Aspect                 | Container Phase              | Adapter Lifecycle            | Protocol States              |
| ---------------------- | ---------------------------- | ---------------------------- | ---------------------------- |
| Who defines the states | Framework                    | Framework                    | Service author               |
| Number of states       | 2                            | 5                            | Unbounded                    |
| State machine shape    | Linear                       | Linear                       | Arbitrary (including cycles) |
| Transition encoding    | `dispose()` returns new type | Each method returns new type | Each method returns new type |
| Scope                  | One per container            | One per adapter handle       | One per service instance     |

### Design Rationale

- **Service-defined**: Unlike the other phantom patterns (fixed by the framework), protocol states are defined by the service author. Each port can define its own state machine with arbitrary states and transitions.
- **Cyclic transitions allowed**: Protocol states can cycle (e.g., `connected -> disconnected -> connected`). This differs from adapter lifecycle states which are strictly linear.
- **Transition maps**: A `TransitionMap` type maps `(State, Method) -> NextState`, providing a single source of truth for the protocol. The conditional types on method signatures are derived from this map.
- **Error types**: Invalid method calls produce `ProtocolSequenceError` types (not plain `never`) with descriptive messages listing the current state and available methods.

### State Transition Map Pattern

```ts
// Define the protocol as a type-level map
type DatabaseTransitions = {
  disconnected: {
    connect: "connected";
  };
  connected: {
    query: "connected"; // self-transition (state preserved)
    disconnect: "disconnected"; // cyclic transition
  };
};

// Generic transition lookup
type Transition<TMap, TState extends string, TMethod extends string> = TState extends keyof TMap
  ? TMethod extends keyof TMap[TState]
    ? TMap[TState][TMethod]
    : never
  : never;
```

### Example

```ts
const db = container.resolve(DBPort);
// Type: DatabaseService<"disconnected">

// Valid sequence
const c1 = await db.connect("postgres://..."); // disconnected -> connected
const rows = await c1.query("SELECT 1"); // connected -> connected
const c2 = await c1.disconnect(); // connected -> disconnected
const c3 = await c2.connect("postgres://other..."); // disconnected -> connected (cycle!)

// Invalid sequence
db.query("SELECT 1");
// Type error: ProtocolSequenceError {
//   __message: "Method 'query' is not available in state 'disconnected'";
//   __availableMethods: "connect";
// }
```

**Cross-ref**: [BEH-CO-12](../behaviors/12-protocol-state-machines.md).

## Common Principles

All four phantom patterns share these design principles:

1. **Zero runtime overhead**: Phantom types are erased by TypeScript compilation. No runtime objects, no Proxy wrappers, no extra allocations.

2. **Transition methods return new types**: State changes are encoded by returning a value typed with the new state. The caller must use the returned value to continue operating in the new state.

3. **Runtime safety net**: Because TypeScript types are erased, runtime checks remain as a safety net for aliased references. The type system catches bugs at development time; runtime checks catch the aliasing edge case.

4. **Default parameters for backward compatibility**: All phantom type parameters have defaults (`TPhase = "active"`, `TState = "created"`, etc.), so existing code that omits the parameter continues to work.

5. **`never` as the unavailability signal**: Methods that are not valid in the current state are typed as `never`. This prevents calling them (TypeScript error) and prevents IDE autocomplete from suggesting them.

6. **Descriptive error types over plain `never`**: Where possible, invalid operations produce branded error types (e.g., `ProtocolSequenceError`, `NotAPortError`) that display helpful messages in IDE tooltips, rather than opaque `never`.
