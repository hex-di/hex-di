# Analysis: Type System Enhancements for hex-di

Based on research findings from [RES-01](./RES-01-type-and-effect-systems.md) (type and effect systems), [RES-02](./RES-02-session-types-behavioral-contracts.md) (session types), [RES-03](./RES-03-linear-affine-types-resource-lifecycle.md) (linear/affine types), and [RES-08](./RES-08-refinement-dependent-types-graph-safety.md) (refinement/dependent types).

## Executive Summary

This analysis examines how research from type and effect systems, session types, linear/affine types, and refinement types can enhance hex-di's compile-time safety. The project already demonstrates sophisticated type-level programming with effect row manipulation (`catchTag`/`catchTags`), compile-time graph validation, and phantom type parameters. Key opportunities exist in encoding adapter lifecycle states, preventing use-after-dispose at the type level, and extending effect polymorphism patterns.

---

## 1. Current Type-Level Capabilities

### 1.1 Effect Row System (`@hex-di/result`)

The `Result<T, E>` type already functions as a lightweight type-and-effect system where `E` is the effect set (union of possible error types), `never` represents purity (`Result<T, never>` cannot fail), and union `|` provides effect composition.

**Implemented:**

- **Effect accumulation**: `andThen<U, F>` accumulates errors as `E | F` union
- **Effect elimination**: `catchTag` removes specific error tags via `Exclude<E, { _tag: Tag }>`
- **Multi-tag elimination**: `catchTags` handles multiple tags with type-safe handler maps
- **Effect polymorphism**: Generic `<E>` parameters allow functions to be polymorphic over error types
- **Exhaustive handlers**: `ExhaustiveHandlerMap<E, T>` type ensures all error variants handled
- **Tagged error utilities**: `TaggedError<Tag, Fields>`, `TagsOf<E>`, `HasTag<E, Tag>`, `RemoveTag<E, Tag>`, `RemoveTags<E, Tags>`

**Type-Level Guarantees:**

- Compile-time tracking of possible errors via union types
- Type narrowing after error handling (error set shrinks)
- Infallible handlers enforced (`Result<T2, never>` return type)
- Discriminated union pattern matching via `_tag` field

Source: `packages/result/src/core/types.ts`, `packages/result/src/type-utils.ts`

### 1.2 Port/Adapter Type System (`@hex-di/core`)

**Implemented:**

- **Literal type preservation**: Port names as literal types via `const` assertions
- **Phantom type parameters**: `DirectedPort<TName, TService, TDirection, TCategory>`
- **Direction branding**: Compile-time distinction between inbound/outbound ports
- **Category typing**: Port categories as literal string types (`"domain/subcategory"` format)
- **Builder pattern inference**: `port<T>()({ name })` preserves literal name types
- **Result unwrapping**: Duck-typed detection and unwrapping of `Result` returns from adapter factories

**Type-Level Guarantees:**

- Port uniqueness via literal type names
- Service interface enforcement
- Direction consistency (inbound vs outbound)

Source: `packages/core/src/ports/factory.ts`, `packages/core/src/adapters/unified.ts`

### 1.3 Graph Builder Type State Machine (`@hex-di/graph`)

**Implemented:**

- **Type-state evolution**: GraphBuilder type parameters change with each `.provide()` call
- **Dependency tracking**: `TProvides` and `TRequires` track satisfied/unsatisfied dependencies
- **Async detection**: `TAsyncPorts` tracks ports needing async initialization
- **Cycle detection**: Type-level DFS via `TInternalState.depGraph` (depth-bounded, configurable max depth)
- **Lifetime validation**: Captive dependency detection via `TInternalState.lifetimeMap`
- **Depth-limited recursion**: Configurable max depth for type-level cycle detection (default 50)
- **Error accumulation**: Multiple validation errors collected in `GetErrors<TInternalState>`

**Type-Level Guarantees:**

- Missing dependencies are compile errors
- Duplicate port provisions detected at compile time
- Basic cycle detection (depth-limited, with graceful degradation to runtime)
- Captive dependencies (shorter lifetime depending on longer) detected
- Unhandled adapter error channels detected

Source: `packages/graph/src/builder/builder.ts`, `packages/graph/src/validation/`

---

## 2. Session Types Feasibility

Research basis: [RES-02](./RES-02-session-types-behavioral-contracts.md) -- Wadler (2012), Fowler et al. (2019), Gay et al. (2015), Scalas & Yoshida (2019).

### 2.1 Adapter Lifecycle States as Phantom Types

**Feasible in TypeScript.** Phantom type parameters can encode adapter state transitions at the type level. This is the most practical application of session type theory to hex-di.

```typescript
// Phantom type parameter for adapter state
type AdapterState = "uninitialized" | "ready" | "disposed";

interface Adapter<T, State extends AdapterState = "uninitialized"> {
  readonly _state?: State; // phantom -- never read at runtime
}

// Methods available only in specific states
interface InitializableAdapter<T> extends Adapter<T, "uninitialized"> {
  initialize(): Adapter<T, "ready">;
}

interface DisposableAdapter<T> extends Adapter<T, "ready"> {
  dispose(): Adapter<T, "disposed">;
  query(): Result<Data, Error>; // only available when ready
}

// Compile-time prevention of use-after-dispose
type SafeAdapter<T, S extends AdapterState> = S extends "disposed"
  ? { error: "Cannot use disposed adapter" } & never
  : Adapter<T, S>;
```

**Integration Points:**

- Modify `createAdapter` to return `Adapter<T, "uninitialized">`
- Container's `initialize()` transitions all adapters to `"ready"` state
- Container's `dispose()` transitions all adapters to `"disposed"` state
- Method availability conditional on state via intersection types

**Challenges:**

- TypeScript lacks true linear types -- cannot prevent aliasing
- State transitions must be explicit (no automatic inference)
- Runtime and compile-time states can diverge without careful design

### 2.2 Port Protocol Encoding

**Partially Feasible.** Can encode which methods are available in which states, but cannot enforce the sequencing of method calls across multiple statements.

```typescript
// Encode valid method call sequences
type ProtocolState = "disconnected" | "connected" | "authenticated";

interface DatabasePort<State extends ProtocolState = "disconnected"> {
  connect(): State extends "disconnected" ? DatabasePort<"connected"> : never;

  authenticate(
    creds: Credentials
  ): State extends "connected" ? DatabasePort<"authenticated"> : never;

  query(sql: string): State extends "authenticated" ? Result<Rows, QueryError> : never;
}
```

**Limitations:**

- Cannot enforce protocol across multiple method calls in sequence (user can still call methods out of order, just gets `never` return type)
- No way to prevent out-of-order calls at type level (only make them return `never`)
- Better suited for runtime validation with type-level hints
- Multiparty protocol verification (Scalas & Yoshida, 2019) across the full dependency graph is beyond TypeScript's capabilities

---

## 3. Linear/Affine Type Encoding

Research basis: [RES-03](./RES-03-linear-affine-types-resource-lifecycle.md) -- Bernardy et al. (2018, Linear Haskell), Jung et al. (2018, RustBelt), Weiss et al. (2019, Oxide), Munch-Maccagnoni (2018, Resource Polymorphism).

### 3.1 Preventing Use-After-Dispose with Branded Scoped References

**Feasible Pattern.** Branded types can encode that a reference is bound to a specific scope, preventing it from escaping.

```typescript
// Brand for scope-bound references
declare const SCOPE_BRAND: unique symbol;

interface ScopedRef<T, ScopeId extends string> {
  readonly [SCOPE_BRAND]: ScopeId;
  readonly value: T;

  // Methods return same-scoped references to maintain scope binding
  map<U>(f: (value: T) => U): ScopedRef<U, ScopeId>;
}

// Scope manager ensures references don't escape
interface Scope<Id extends string> {
  // Create a scoped reference -- can only be used within this scope
  bind<T>(value: T): ScopedRef<T, Id>;

  // Execute with scope -- refs can't escape the callback
  run<R>(
    fn: (scope: Scope<Id>) => R
  ): R extends ScopedRef<unknown, Id>
    ? never & { error: "Cannot return scoped reference from scope.run()" }
    : R;
}
```

**Integration with Adapters:**

```typescript
interface DisposableAdapter<T, Disposed extends boolean = false> {
  use(): Disposed extends true ? never & { error: "Adapter has been disposed" } : T;

  dispose(): DisposableAdapter<T, true>;
}

// Container returns scoped adapters
interface Container {
  getScoped<T>(port: Port<T>): ScopedRef<T, "request">;
  getSingleton<T>(port: Port<T>): T; // singletons outlive scopes
}
```

This maps directly to the ownership model described in RES-03: the DI container is the "owner" of all adapters, services "borrow" adapters through ports, and scoped containers create child ownership. Currently this ownership model is implicit -- `ScopedRef<T, ScopeId>` makes it explicit in the type system.

### 3.2 Move Semantics Approximation

**Partially Feasible.** Can encode a "consumed" flag but cannot prevent variable aliasing.

```typescript
// Consumed flag prevents reuse
interface Linear<T, Consumed extends boolean = false> {
  consume<R>(
    fn: (value: T) => R
  ): Consumed extends true ? never & { error: "Value already consumed" } : R;
}

// One-time use token
type UseOnceToken<T> = Linear<T, false>;
```

**Limitations:**

- Cannot prevent copying/aliasing at type level (fundamental TypeScript limitation)
- Requires discipline to use `consume()` pattern consistently
- Better as documentation + runtime checks than compile-time guarantee
- Resource polymorphism (Munch-Maccagnoni, 2018) validates the current approach where `dispose()` is optional -- adapters without cleanup simply don't implement it

---

## 4. Effect Row Enhancement

Research basis: [RES-01](./RES-01-type-and-effect-systems.md) -- Plotkin & Pretnar (2009, algebraic effects), Leijen/Koka (2014, row-typed effects), Biernacki et al. (2019, effect polymorphism).

### 4.1 Beyond catchTag/catchTags

The current `catchTag`/`catchTags`/`andThenWith` primitives implement Tier 1 of the effect system roadmap (effect elimination). Additional type-level constructs can extend expressiveness.

**Feasible Enhancements:**

```typescript
// 1. Effect polymorphism helpers
type EffectOf<T> = T extends Result<unknown, infer E> ? E : never;
type PureResult<T> = Result<T, never>;
type Effectful<T, E> = Result<T, E>;

// 2. Effect requirement constraints
type RequiresEffects<E, F> = F extends E ? true : false & { required: Exclude<F, E> };

// 3. Effect combination patterns
type ParallelEffects<E1, E2> = E1 | E2;
type SequentialEffects<E1, E2> = E1 | E2; // same union, different semantics

// 4. Effect masking/abstraction
type MaskEffects<E, Hidden extends E> = Exclude<E, Hidden>;
type AbstractEffect<E, As extends string> = { _tag: As; _inner: E };
```

### 4.2 Higher-Order Effect Handlers

Inspired by Plotkin & Pretnar's algebraic effect handlers and Kammar, Lindley & Oury's "Handlers in Action" (shallow vs deep handlers).

```typescript
// Handler that transforms one effect to another
type EffectHandler<From, To> = (effect: From) => Result<unknown, To>;

// Compose handlers
type ComposeHandlers<H1, H2> =
  H1 extends EffectHandler<infer E1, infer F1>
    ? H2 extends EffectHandler<F1, infer F2>
      ? EffectHandler<E1, F2>
      : never
    : never;

// Apply handler to Result type
type ApplyHandler<R, H> =
  R extends Result<infer T, infer E> ? (H extends EffectHandler<E, infer F> ? Result<T, F> : R) : R;
```

### 4.3 Effect Contracts

```typescript
// Declare effect contracts for functions
interface EffectContract<In, Out, Effects> {
  (input: In): Result<Out, Effects>;
}

// Verify contract satisfaction
type SatisfiesContract<Fn, Contract> = Fn extends Contract ? true : false;

// Effect narrowing contracts
type NarrowsEffects<From, To> = To extends From ? true : false;
```

These patterns enable Tier 3 of the effect system roadmap identified in RES-01: type-level error utilities including `ErrorRow` operations, effect contracts, and effect polymorphism helpers.

---

## 5. Graph Invariant Encoding

Research basis: [RES-08](./RES-08-refinement-dependent-types-graph-safety.md) -- Jhala et al. (2015-2018, refinement types), Eisenberg (2016, dependent types in Haskell), White et al. (2015, modular implicits).

### 5.1 Already Implemented

The graph builder already pushes several invariants to compile-time:

1. **Port uniqueness**: Duplicate provisions detected via literal type accumulation in `TProvides`
2. **Dependency satisfaction**: Missing dependencies are compile errors via `UnsatisfiedDependencies<TProvides, TRequires>`
3. **Basic cycle detection**: Type-level DFS with configurable depth limit (default 50), three-way result (cycle/no-cycle/depth-exceeded)
4. **Captive dependencies**: Lifetime hierarchy validation via `TLifetimeMap` (singleton > scoped > transient)
5. **Async tracking**: Ports needing async initialization marked at type level via `TAsyncPorts`
6. **Error channel enforcement**: Unhandled adapter error channels detected at compile time via `GetErrors<TInternalState>`

### 5.2 Feasible Enhancements

**1. Complete Cycle Detection (without depth limit):**

TypeScript's recursive conditional types have a hard recursion depth limit, but tuple accumulation can be more efficient than the current depth-counter approach:

```typescript
// Use tuple accumulation instead of recursive depth
type DetectCycleInPath<
  Graph,
  Current,
  Path extends readonly unknown[],
> = Current extends Path[number]
  ? { error: "Cycle detected"; path: [...Path, Current] }
  : CheckDependencies<Graph, Current, [...Path, Current]>;

// Store visited nodes in tuple, not recursion depth
type ValidateAcyclic<Graph> = {
  [K in keyof Graph]: DetectCycleInPath<Graph, K, []>;
}[keyof Graph];
```

**2. Topological Sort at Type Level:**

```typescript
// Build layers of nodes with no dependencies, then their dependents
type TopologicalLayers<Graph, Remaining = keyof Graph> =
  [NoDeps<Graph, Remaining>, ...NextLayers<Graph, Remaining>];

type NoDeps<Graph, Nodes> = // nodes with no deps in Remaining
type NextLayers<Graph, Remaining> = // recursive layers
```

**3. Reachability Analysis:**

```typescript
// Which ports are reachable from a given starting port
type Reachable<Graph, From, Visited = never> = From extends Visited
  ? Visited
  : From | Reachable<Graph, Deps<Graph, From>, Visited | From>;

// Detect unreachable adapters
type UnreachableAdapters<Graph, Entries> = Exclude<keyof Graph, Reachable<Graph, Entries>>;
```

### 5.3 Beyond Current TypeScript Limits

These require language features TypeScript does not have:

1. **Full dependent types**: Encoding graph size in types (e.g., `Graph<N>` where N is the vertex count)
2. **Proof-carrying code**: Formal verification of graph properties with machine-checked proofs
3. **Totality checking**: Ensuring disposal order is total (covers all nodes)
4. **Coinductive types**: Infinite/lazy graph structures
5. **SMT integration**: Refinement type predicates verified by an external solver (as in Liquid Haskell)

---

## 6. Top 3 Concrete Recommendations

### 6.1 Recommendation 1: Adapter Lifecycle State Tracking

**Impact**: High | **Feasibility**: High | **Research basis**: RES-02 (session types), RES-03 (linear types)

**Implementation Sketch:**

```typescript
// adapter-lifecycle.ts
export interface AdapterHandle<T, State extends "init" | "ready" | "disposed" = "init"> {
  readonly _state?: State; // phantom
}

export interface InitializableHandle<T> extends AdapterHandle<T, "init"> {
  initialize(): Promise<AdapterHandle<T, "ready">>;
}

export interface ReadyHandle<T> extends AdapterHandle<T, "ready"> {
  getInstance(): T;
  dispose(): Promise<AdapterHandle<T, "disposed">>;
}

// Prevent operations on disposed adapters
export type SafeHandle<T, S extends string> = S extends "disposed"
  ? { error: "Cannot use disposed adapter"; adapter: T } & never
  : AdapterHandle<T, S>;

// Container returns state-aware handles
interface Container {
  get<T>(port: Port<T>): Promise<SafeHandle<T, "ready">>;
  // Compile error if trying to use disposed handle
}
```

**Benefits:**

- Compile-time prevention of use-after-dispose bugs
- Clear lifecycle state in type signatures
- Natural fit with async initialization pattern

**Integration Effort:** Medium -- requires changes to container and adapter APIs

### 6.2 Recommendation 2: Scoped Reference System

**Impact**: High | **Feasibility**: Medium | **Research basis**: RES-03 (RustBelt ownership, Oxide borrow checking)

**Implementation Sketch:**

```typescript
// scoped-ref.ts
declare const SCOPE: unique symbol;

export interface ScopedRef<T, Scope extends string> {
  readonly [SCOPE]: Scope;

  unwrap<S>(this: ScopedRef<T, S>, proof: ScopeProof<S>): T;
  map<U>(fn: (value: T) => U): ScopedRef<U, Scope>;
}

interface ScopeProof<S extends string> {
  readonly scope: S;
}

// Container API with scoped references
interface Container {
  runScoped<R>(
    fn: <S extends string>(scope: ScopeProof<S>, get: <T>(port: Port<T>) => ScopedRef<T, S>) => R
  ): R extends ScopedRef<unknown, string> ? never & { error: "Cannot return scoped reference" } : R;
}
```

**Benefits:**

- Prevents scoped adapters from escaping their scope
- Compile-time enforcement of scope boundaries
- Composable with existing Result types

**Integration Effort:** High -- new abstraction layer, significant API changes

### 6.3 Recommendation 3: Extended Effect Handlers

**Impact**: Medium | **Feasibility**: High | **Research basis**: RES-01 (algebraic effects, effect handlers)

**Implementation Sketch:**

```typescript
// effect-handlers.ts
export type EffectFilter<E, Tags extends string> = Exclude<E, { _tag: Tags }>;

export type EffectMapper<E, MapFn> = MapFn extends (e: E) => infer F ? F : never;

// Advanced catch with recovery strategies
export interface RecoveryStrategy<E, T> {
  retry?: { times: number; delay: number };
  fallback?: () => Result<T, never>;
  transform?: (error: E) => Result<T, never>;
}

// Effect handler composition
export type HandlerChain<E> = {
  [K in TagsOf<E>]?: RecoveryStrategy<Extract<E, { _tag: K }>, unknown>;
};

// New Result methods using these patterns
interface Result<T, E> {
  catchWithStrategy<S extends HandlerChain<E>>(strategies: S): Result<T, FilteredErrors<E, S>>;

  mapErrors<F>(fn: (error: E) => F): Result<T, F>;

  requireEffects<Required>(): Required extends E
    ? Result<T, E>
    : never & { missing: Exclude<Required, E> };
}
```

**Benefits:**

- Richer error handling patterns beyond simple catchTag
- Better composition of error handlers
- Type-safe retry and fallback strategies

**Integration Effort:** Low -- extends existing Result API without breaking changes

---

## 7. Feasibility Matrix

| Enhancement              | Impact | Feasibility | TypeScript Support                    | Recommendation    |
| ------------------------ | ------ | ----------- | ------------------------------------- | ----------------- |
| Adapter Lifecycle States | High   | High        | Full -- phantom types work well       | **Implement**     |
| Scoped References        | High   | Medium      | Partial -- cannot prevent all escapes | **Prototype**     |
| Extended Effect Handlers | Medium | High        | Full -- builds on existing patterns   | **Implement**     |
| Session Type Protocols   | Medium | Low         | Limited -- no sequence enforcement    | Research only     |
| Linear Type Semantics    | Medium | Low         | Very limited -- no aliasing control   | Document pattern  |
| Complete Cycle Detection | Low    | Medium      | Limited by recursion depth            | Optimize existing |
| Topological Sort Types   | Low    | Medium      | Feasible but complex                  | Nice to have      |
| Dependent Type Graphs    | Low    | None        | Not supported                         | Not feasible      |

---

## 8. Implementation Roadmap

### Phase 1: Effect System Enhancements

- Extend `catchTag`/`catchTags` with recovery strategies
- Add effect filtering and mapping utilities (`EffectOf`, `PureResult`, `MaskEffects`)
- Implement `ExhaustiveHandler` type checking patterns

### Phase 2: Lifecycle State Tracking

- Add phantom state parameters to adapter handles
- Implement state transitions in container
- Compile-time use-after-dispose prevention

### Phase 3: Scoped References

- Design `ScopedRef<T, S>` abstraction
- Integrate with container's scoped lifetime
- Add escape analysis at type level

### Phase 4: Graph Optimization

- Optimize cycle detection algorithm (tuple accumulation vs depth counter)
- Add reachability analysis types
- Implement dead code elimination for unreachable adapters

---

## Conclusion

The hex-di project already demonstrates sophisticated type-level programming with its effect row system, port typing, and graph validation. The most impactful enhancements focus on **adapter lifecycle safety** and **scoped reference tracking**, both feasible within TypeScript's current capabilities. Session types and linear types, while theoretically interesting, face fundamental limitations in TypeScript and are better treated as design patterns with runtime validation rather than compile-time guarantees.

The recommended approach is to implement the three concrete recommendations in order of feasibility: extended effect handlers (low effort, immediate value), adapter lifecycle states (medium effort, high value), and scoped references (high effort, high value for complex applications). This provides a pragmatic path to enhanced type safety while working within TypeScript's constraints.
