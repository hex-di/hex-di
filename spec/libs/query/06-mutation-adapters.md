# 06 - Mutation Adapters

## 23. createMutationAdapter

A mutation adapter implements how to perform a mutation for a MutationPort. It follows the same adapter pattern as query adapters.

### Factory Signature

```typescript
function createMutationAdapter<
  TData,
  TInput,
  TError,
  TContext,
  const TName extends string,
  const TRequires extends ReadonlyArray<Port<unknown, string>> = [],
>(
  port: MutationPort<TName, TData, TInput, TError, TContext>,
  config: {
    readonly requires?: TRequires;
    readonly lifetime?: Lifetime;
    readonly factory: (
      deps: ResolvedDeps<TupleToUnion<TRequires>>
    ) => MutationExecutor<TData, TInput, TError>;
  }
): Adapter<
  MutationPort<TName, TData, TInput, TError, TContext>,
  TupleToUnion<TRequires>,
  typeof config.lifetime extends string ? typeof config.lifetime : "singleton",
  "async"
>;

type MutationExecutor<TData, TInput, TError> = (
  input: TInput,
  context: MutationContext
) => ResultAsync<TData, TError>;
```

> **Design note:** Same `ResolvedDeps<TupleToUnion<TRequires>>` pattern as query
> adapters. The factory deps object is fully typed from the port tuple.

### Examples

```typescript
// REST mutation adapter
const RestCreateUserAdapter = createMutationAdapter(CreateUserPort, {
  requires: [HttpClientPort],
  factory:
    ({ HttpClient: httpClient }) =>
    (input, { signal }) =>
      ResultAsync.fromPromise(
        httpClient.post("/api/users", input, { signal }).then(r => r.data),
        error => classifyHttpError(error)
      ),
});

// Mutation with validation dependency
const RestUpdateUserAdapter = createMutationAdapter(UpdateUserPort, {
  requires: [HttpClientPort, ValidatorPort],
  factory:
    ({ HttpClient: httpClient, Validator: validator }) =>
    (input, { signal }) => {
      const validated = validator.validate(UpdateUserSchema, input);
      return ResultAsync.fromPromise(
        httpClient.patch(`/api/users/${validated.id}`, validated, { signal }).then(r => r.data),
        error => classifyHttpError(error)
      );
    },
});

// Mock mutation for testing
const MockCreateUserAdapter = createMutationAdapter(CreateUserPort, {
  factory: () => input =>
    ResultAsync.ok({
      id: crypto.randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
    }),
});

// Fire-and-forget mutation (void return)
const RestSendEmailAdapter = createMutationAdapter(SendEmailPort, {
  requires: [HttpClientPort],
  factory:
    ({ HttpClient: httpClient }) =>
    (input, { signal }) =>
      ResultAsync.fromPromise(
        httpClient.post("/api/emails", input, { signal }).then(() => undefined),
        error => classifyHttpError(error)
      ),
});
```

## 24. MutationContext

Every mutation executor receives a `MutationContext`:

```typescript
interface MutationContext {
  /** AbortSignal for cancellation */
  readonly signal: AbortSignal;

  /** Custom metadata */
  readonly meta?: Readonly<Record<string, unknown>>;
}
```

Mutations are simpler than queries because they:

- Are not cached (they produce side effects)
- Are not deduplicated (each invocation is intentional)
- Do not have staleness or background refresh

### Mutation Execution Flow

The QueryClient executes mutations by calling the adapter's `MutationExecutor`, which returns a `ResultAsync`. The client matches on the result using `isOk()`/`isErr()` instead of try/catch:

```
queryClient.mutate(port, input)
    |
    +-- executor(input, { signal }) returns ResultAsync<TData, TError>
    |
    +-- result.match(...)
        |
        +-- Ok(data)
        |   +-- Process effects (invalidates, removes)
        |   +-- Fire onSuccess(data, input, context)
        |   +-- Fire onSettled(data, undefined, input, context)
        |
        +-- Err(error)
            +-- Fire onError(error, input, context)  // error is typed as TError
            +-- Fire onSettled(undefined, error, input, context)
```

## 25. Optimistic Update Protocol

Optimistic updates allow the UI to reflect changes immediately before the server confirms. The protocol uses the `TContext` type parameter from MutationPort for type-safe rollback.

### How It Works

```
1. onMutate: called BEFORE the mutation executes
   +-- Cancel in-flight queries (prevent stale overwrites)
   +-- Snapshot current cache data
   +-- Apply optimistic update to cache
   +-- Return context object (snapshot for rollback)

2. Mutation executes on server, returns ResultAsync<TData, TError>

3a. Ok(data): server confirmed
    +-- (Optional) Update cache with server response
    +-- Invalidate to ensure consistency

3b. Err(error): server rejected
    +-- Rollback cache using context snapshot
    +-- Show error to user (error is typed as TError)

4. onSettled: always runs (Ok or Err)
    +-- Invalidate affected queries to re-sync
```

### Type Safety

The `TContext` type parameter flows through the entire lifecycle:

```typescript
// Port declares context type for rollback data
const UpdateTodoPort = createMutationPort<
  Todo,
  UpdateTodoInput,
  Error,
  { previousTodos: readonly Todo[] } // Context type
>()({
  name: "UpdateTodo",
  effects: { optimistic: true },
});

// The context type is enforced in mutation options:
useMutation(UpdateTodoPort, {
  onMutate: async input => {
    // Must return { previousTodos: readonly Todo[] }
    const previousTodos = queryClient.getQueryData(TodosPort, {});
    return { previousTodos: previousTodos ?? [] };
  },

  onError: (error, _input, context) => {
    // error is typed as Error (from TError)
    // context is typed as { previousTodos: readonly Todo[] } | undefined
    if (context?.previousTodos) {
      queryClient.setQueryData(TodosPort, {}, context.previousTodos);
    }
  },

  onSuccess: (data, _input, _context) => {
    // data is typed as Todo (from Ok branch of ResultAsync)
    // Optionally update cache with confirmed server data
  },
});
```

### Optimistic Update Flow Diagram

```
Time ----------------------------------------------------------------->

User clicks "Complete Todo"
    |
    v
onMutate()
    +-- queryClient.cancel(TodosPort)
    +-- previousTodos = queryClient.getQueryData(TodosPort, {})
    +-- queryClient.setQueryData(TodosPort, {}, optimisticUpdate)
    |                                                       |
    |   UI immediately shows completed todo                 |
    |                                                       |
    v                                                       |
mutation.execute(input) ------- sends POST /api/todos ------+
    |                                                       |
    +-- returns ResultAsync<Todo, Error>                    |
    |                                                       |
    +-- Ok(data) --> onSuccess(data) --> onSettled()        |
    |                                     +-- invalidate() |
    |                                                       |
    +-- Err(error) --> onError(error)                       |
                        +-- rollback to previousTodos       |
                        +-- onSettled()                     |
                             +-- invalidate()               |
```

---

_Previous: [05 - Query Adapters](./05-query-adapters.md)_

_Next: [07 - Cache Architecture](./07-cache.md)_
