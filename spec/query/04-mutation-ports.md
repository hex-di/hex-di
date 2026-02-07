# 04 - Mutation Ports

## 15. createMutationPort

The `createMutationPort` factory creates mutation port definitions using the same curried generics pattern as `createQueryPort`.

### Factory Signature

```typescript
function createMutationPort<TData, TInput = void, TError = Error, TContext = unknown>(): <
  const TName extends string,
>(
  config: MutationPortConfig<TData, TInput, TError, TContext, TName>
) => MutationPort<TName, TData, TInput, TError, TContext>;
```

### MutationPortConfig

```typescript
interface MutationPortConfig<TData, TInput, TError, TContext, TName extends string> {
  /** Unique name -- identifier for the mutation */
  readonly name: TName;

  /** Cache side effects triggered on successful mutation */
  readonly effects?: MutationEffects;

  /** Default mutation options */
  readonly defaults?: Partial<MutationDefaults>;
}
```

### Examples

```typescript
// Simple mutation: create user, returns created User
const CreateUserPort = createMutationPort<User, CreateUserInput>()({
  name: "CreateUser",
  effects: { invalidates: [UsersPort] },
});

// Mutation with custom error type
const UpdateProfilePort = createMutationPort<UserProfile, UpdateProfileInput, ValidationError>()({
  name: "UpdateProfile",
  effects: { invalidates: [CurrentUserPort] },
});

// Mutation with optimistic update context
const UpdateTodoPort = createMutationPort<
  Todo,
  UpdateTodoInput,
  Error,
  { previousTodos: readonly Todo[] }
>()({
  name: "UpdateTodo",
  effects: { invalidates: [TodosPort] },
});

// Delete mutation (void return)
const DeleteUserPort = createMutationPort<void, { id: string }>()({
  name: "DeleteUser",
  effects: {
    invalidates: [UsersPort],
    removes: [UserByIdPort],
  },
});

// Fire-and-forget mutation (no cache effects)
const TrackEventPort = createMutationPort<void, AnalyticsEvent>()({
  name: "TrackEvent",
});
```

## 16. MutationPort Type Definition

A `MutationPort` is a `DirectedPort<MutationExecutor<TData, TInput, TError>, TName, "inbound">` with phantom types for type-safe data extraction. The port carries the executor function type directly -- no wrapper object.

### Type Definition

```typescript
/**
 * Unique symbols for phantom type branding.
 *
 * TData, TInput, and TError are encoded in the DirectedPort base via the
 * MutationExecutor<TData, TInput, TError> function signature. Only TContext
 * needs a dedicated phantom property because the executor function type
 * does not carry it.
 */
declare const __mutationErrorType: unique symbol;
declare const __mutationContextType: unique symbol;
declare const MutationPortSymbol: unique symbol;

interface MutationPort<
  TName extends string = string,
  TData = unknown,
  TInput = void,
  TError = Error,
  TContext = unknown,
> extends DirectedPort<MutationExecutor<TData, TInput, TError>, TName, "inbound"> {
  /**
   * Phantom: compile-time error type.
   *
   * Since TError is now structural in the executor signature (it appears in
   * ResultAsync<TData, TError>), this phantom brand is redundant for type
   * safety but retained for backward inference utility.
   */
  readonly [__mutationErrorType]: TError;

  /** Phantom: compile-time optimistic update context type (not in MutationExecutor) */
  readonly [__mutationContextType]: TContext;

  /** Runtime brand: identifies this as a MutationPort */
  readonly [MutationPortSymbol]: true;

  /** Mutation-specific configuration */
  readonly config: MutationPortConfig<TData, TInput, TError, TContext, TName>;
}

/** Convenience alias for mutation ports with erased type parameters */
type AnyMutationPort = MutationPort<string, unknown, unknown, unknown, unknown>;
```

> **Design note:** The original draft wrapped the executor in a `MutationService<TData, TInput>`
> object with an `execute` method. This is unnecessary indirection -- the executor function IS
> the service type. Removing the wrapper eliminates a layer of type indirection and aligns with
> the principle that ports carry data contracts, not mechanism descriptions. The
> `MutationExecutor` function type preserves full recoverability of `TData`, `TInput`, and
> `TError` via `InferService`, so only `TContext` needs a phantom slot.

### MutationExecutor

The service type for mutation ports. A mutation adapter's factory returns this function type directly:

```typescript
type MutationExecutor<TData, TInput, TError> = (
  input: TInput,
  context: MutationContext
) => ResultAsync<TData, TError>;
```

### Relationship to DirectedPort

```typescript
// MutationPort IS a DirectedPort -- participates in GraphBuilder validation
type AssertMutationIsDirected =
  MutationPort<"CreateUser", User, CreateUserInput> extends DirectedPort<
    MutationExecutor<User, CreateUserInput, Error>,
    "CreateUser",
    "inbound"
  >
    ? true
    : never;
```

### Type Guard

```typescript
function isMutationPort(value: unknown): value is MutationPort {
  return (
    typeof value === "object" &&
    value !== null &&
    MutationPortSymbol in value &&
    value[MutationPortSymbol] === true
  );
}
```

## 17. Mutation Effects

Mutation effects declare how a successful mutation affects the query cache. These are declared at the port level and executed automatically by the QueryClient after mutation success.

### MutationEffects

```typescript
/**
 * Unvalidated effects -- used in createMutationPort config where graph
 * context is not yet available. Accepts any QueryPort.
 */
interface MutationEffects {
  /** Query ports to mark stale and refetch. Active queries refetch immediately. */
  readonly invalidates?: ReadonlyArray<AnyQueryPort>;

  /** Query ports to remove from cache entirely. */
  readonly removes?: ReadonlyArray<AnyQueryPort>;
}
```

### Compile-Time Effect Validation

When a mutation adapter is registered in a `GraphBuilder`, the effects can be validated
against the graph's `TProvides` to ensure referenced ports actually exist. This
validation happens at the GraphBuilder level, not at port creation.

```typescript
/**
 * Validated effects -- used at GraphBuilder.provide() time to ensure
 * invalidated/removed ports exist in the graph.
 *
 * This is a type-level check only. If a mutation declares effects
 * referencing a QueryPort that is not provided in the graph,
 * GraphBuilder.build() produces a compile-time error.
 *
 * Both `invalidates` and `removes` arrays are validated independently.
 * Template literal errors include the mutation name and missing port
 * names for actionable IDE diagnostics.
 */
type ValidateMutationEffects<
  TEffects extends MutationEffects,
  TGraphProvides,
  TMutationName extends string,
> = ValidateInvalidates<TEffects, TGraphProvides, TMutationName> &
  ValidateRemoves<TEffects, TGraphProvides, TMutationName>;

/** Validate that all ports in `invalidates` exist in the graph */
type ValidateInvalidates<
  TEffects extends MutationEffects,
  TGraphProvides,
  TMutationName extends string,
> = TEffects extends { readonly invalidates: ReadonlyArray<infer TPort> }
  ? [TPort] extends [TGraphProvides]
    ? TEffects
    : TPort extends QueryPort<infer TMissing, unknown, unknown, unknown>
      ? `ERROR: Mutation "${TMutationName}" invalidates port "${TMissing}" which is not provided in the graph. Register an adapter for "${TMissing}" or remove it from effects.invalidates.`
      : `ERROR: Mutation "${TMutationName}" invalidates a port not provided in the graph.`
  : TEffects;

/** Validate that all ports in `removes` exist in the graph */
type ValidateRemoves<
  TEffects extends MutationEffects,
  TGraphProvides,
  TMutationName extends string,
> = TEffects extends { readonly removes: ReadonlyArray<infer TPort> }
  ? [TPort] extends [TGraphProvides]
    ? TEffects
    : TPort extends QueryPort<infer TMissing, unknown, unknown, unknown>
      ? `ERROR: Mutation "${TMutationName}" removes port "${TMissing}" which is not provided in the graph. Register an adapter for "${TMissing}" or remove it from effects.removes.`
      : `ERROR: Mutation "${TMutationName}" removes a port not provided in the graph.`
  : TEffects;
```

### Invalidation Cycle Prevention

When multiple mutations form invalidation chains (mutation A invalidates query X,
which triggers mutation B via `onSuccess`, which invalidates query Y), unbounded
cascades can occur. The `QueryClient` enforces a maximum cascade depth at runtime:

```typescript
interface QueryClientConfig {
  /** Maximum invalidation cascade depth before aborting. Default: 10 */
  readonly maxInvalidationDepth?: number;
}
```

A `QueryResolutionError` with `_tag: "QueryInvalidationCycle"` is produced if the depth is exceeded, with the full chain included for debugging.

### Behavior

| Effect        | When                    | Active Queries                                    | Inactive Queries                   |
| ------------- | ----------------------- | ------------------------------------------------- | ---------------------------------- |
| `invalidates` | After mutation succeeds | Mark stale + trigger background refetch           | Mark stale (refetch on next mount) |
| `removes`     | After mutation succeeds | Remove from cache, observers get `undefined` data | Remove from cache                  |

### How Effects Execute

```
mutation.execute(input)
    |
    |-- returns ResultAsync<TData, TError>
    |
    +-- result.match(...)
        |
        +-- Ok(data)
        |   +-- Process effects.invalidates
        |   |   +-- for each port: queryClient.invalidate(port)
        |   +-- Process effects.removes
        |   |   +-- for each port: queryClient.remove(port)
        |   +-- Fire onSuccess callbacks
        |
        +-- Err(error)
            +-- No cache effects (effects only fire on success)
```

### Examples

```typescript
// Invalidation: creating a user refreshes the user list
const CreateUserPort = createMutationPort<User, CreateUserInput>()({
  name: "CreateUser",
  effects: {
    invalidates: [UsersPort],
  },
});
// After CreateUser succeeds:
// - All UsersPort cache entries are marked stale
// - Active UsersPort queries immediately refetch

// Removal: deleting a user removes it from cache AND refreshes lists
const DeleteUserPort = createMutationPort<void, { id: string }>()({
  name: "DeleteUser",
  effects: {
    invalidates: [UsersPort],
    removes: [UserByIdPort],
  },
});
// After DeleteUser succeeds:
// - UserByIdPort entries are removed from cache
// - UsersPort entries are marked stale and refetch

// Multiple invalidations
const UpdateOrderPort = createMutationPort<Order, UpdateOrderInput>()({
  name: "UpdateOrder",
  effects: {
    invalidates: [
      OrdersPort, // Refresh order lists
      OrderByIdPort, // Refresh order detail
      OrderStatsPort, // Refresh dashboard stats
    ],
  },
});

// No effects: fire-and-forget
const SendNotificationPort = createMutationPort<void, NotificationInput>()({
  name: "SendNotification",
  // No effects -- sending a notification doesn't affect cached queries
});
```

### Inspectable Effects

The effects declarations are statically analyzable. The `QueryInspectorPort` uses them to build the invalidation dependency graph (see [09b - Introspection](./09b-introspection.md)):

```typescript
// QueryInspector can derive:
// CreateUser -> invalidates -> [Users]
// DeleteUser -> invalidates -> [Users], removes -> [UserById]
// UpdateOrder -> invalidates -> [Orders, OrderById, OrderStats]
```

This graph is exposed via MCP for AI consumption without reading source code.

## 18. Type Inference Utilities

Utility types extract phantom type information from mutation ports.

### Inference Types

Following the established `InferenceError` pattern from `@hex-di/core`, mutation inference
utilities return structured branded error types and use `[T] extends [...]` distribution prevention.

```typescript
/** Extract the data (return) type from a MutationPort */
type InferMutationData<T> = [T] extends [
  MutationPort<string, infer TData, unknown, unknown, unknown>,
]
  ? TData
  : InferenceError<
      "InferMutationData",
      "Expected a MutationPort type. Use InferMutationData<typeof YourPort>.",
      T
    >;

/** Extract the input type from a MutationPort */
type InferMutationInput<T> = [T] extends [
  MutationPort<string, unknown, infer TInput, unknown, unknown>,
]
  ? TInput
  : InferenceError<
      "InferMutationInput",
      "Expected a MutationPort type. Use InferMutationInput<typeof YourPort>.",
      T
    >;

/** Extract the error type from a MutationPort */
type InferMutationError<T> = [T] extends [
  MutationPort<string, unknown, unknown, infer TError, unknown>,
]
  ? TError
  : InferenceError<
      "InferMutationError",
      "Expected a MutationPort type. Use InferMutationError<typeof YourPort>.",
      T
    >;

/** Extract the context type from a MutationPort */
type InferMutationContext<T> = [T] extends [
  MutationPort<string, unknown, unknown, unknown, infer TContext>,
]
  ? TContext
  : InferenceError<
      "InferMutationContext",
      "Expected a MutationPort type. Use InferMutationContext<typeof YourPort>.",
      T
    >;

/** Extract the name literal type from a MutationPort */
type InferMutationName<T> = [T] extends [
  MutationPort<infer TName, unknown, unknown, unknown, unknown>,
]
  ? TName
  : InferenceError<
      "InferMutationName",
      "Expected a MutationPort type. Use InferMutationName<typeof YourPort>.",
      T
    >;

/** Extract all types from a MutationPort at once */
type InferMutationTypes<T> = [T] extends [
  MutationPort<infer TName, infer TData, infer TInput, infer TError, infer TContext>,
]
  ? {
      readonly name: TName;
      readonly data: TData;
      readonly input: TInput;
      readonly error: TError;
      readonly context: TContext;
    }
  : InferenceError<
      "InferMutationTypes",
      "Expected a MutationPort type. Use InferMutationTypes<typeof YourPort>.",
      T
    >;
```

### Usage

```typescript
const CreateUserPort = createMutationPort<User, CreateUserInput>()({
  name: "CreateUser",
  effects: { invalidates: [UsersPort] },
});

type Data = InferMutationData<typeof CreateUserPort>; // User
type Input = InferMutationInput<typeof CreateUserPort>; // CreateUserInput
type Error = InferMutationError<typeof CreateUserPort>; // Error (default)
type Context = InferMutationContext<typeof CreateUserPort>; // unknown (default)
type Name = InferMutationName<typeof CreateUserPort>; // "CreateUser"
```

### Effect Inference

```typescript
/** Extract the list of invalidated port names from a MutationPort */
type InferInvalidatedPorts<T> =
  T extends MutationPort<string, unknown, unknown, unknown, unknown>
    ? T["config"]["effects"] extends { readonly invalidates: infer TPorts }
      ? TPorts extends ReadonlyArray<QueryPort<infer TName, unknown, unknown, unknown>>
        ? TName
        : never
      : never
    : never;

/** Extract the list of removed port names from a MutationPort */
type InferRemovedPorts<T> =
  T extends MutationPort<string, unknown, unknown, unknown, unknown>
    ? T["config"]["effects"] extends { readonly removes: infer TPorts }
      ? TPorts extends ReadonlyArray<QueryPort<infer TName, unknown, unknown, unknown>>
        ? TName
        : never
      : never
    : never;

// Usage
type Invalidated = InferInvalidatedPorts<typeof CreateUserPort>; // "Users"
```

---

_Previous: [03 - Query Ports](./03-query-ports.md)_

_Next: [05 - Query Adapters](./05-query-adapters.md)_
