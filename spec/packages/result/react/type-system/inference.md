# Type System — Inference

> **Revision summary**: Initial version. For full change history, run `git log --follow --format="%h %ai %s" -- spec/packages/result/react/type-system/inference.md`.

Type inference behavior for `@hex-di/result-react` components and hooks.

## Match Component Inference

### Full inference from result prop

```ts
const result: Result<User, ApiError> = ok({ name: "Alice", id: "1" })

<Match
  result={result}
  ok={(user) => <p>{user.name}</p>}    // user: User ✓
  err={(error) => <p>{error.code}</p>}  // error: ApiError ✓
/>
```

TypeScript infers `T = User` and `E = ApiError` from the `result` prop and propagates them to the `ok` and `err` callback parameters.

### Phantom type narrowing

```ts
<Match
  result={ok(42)}     // Result<number, never>
  ok={(n) => <p>{n}</p>}       // n: number ✓
  err={(e) => <p>{e}</p>}      // e: never — branch is unreachable but required
/>
```

When the result is `Ok<T, never>`, the `err` callback parameter is `never`. The branch is required for exhaustiveness but will never execute at runtime.

### Exhaustiveness enforcement

```ts
// Compilation error: Property 'err' is missing
<Match
  result={result}
  ok={(value) => <p>{value}</p>}
/>
```

Both `ok` and `err` are required in `MatchProps<T, E>`. Omitting either is a TypeScript error.

## useResult Inference

### Without initial value

```ts
const { result, setOk, setErr } = useResult<string, ApiError>()
// result: Result<string, ApiError> | undefined
// setOk: (value: string) => void
// setErr: (error: ApiError) => void
```

Explicit type parameters are required when no initial value is provided.

### With initial value

```ts
const { result, setOk, setErr } = useResult(ok("hello"))
// result: Result<string, never>
// setOk: (value: string) => void
// setErr: (error: never) => void  ← uncallable!
```

When initialized with `ok("hello")`, TypeScript infers `E = never` from the phantom type. The `setErr` callback accepts `never` — it cannot be called. To use both setters, provide explicit type parameters:

```ts
const { result, setOk, setErr } = useResult<string, ApiError>(ok("hello"))
// setErr: (error: ApiError) => void  ← now callable
```

### Overload discrimination

The two overloads of `useResult` produce different `result` types:

```ts
// No initial → result may be undefined
const a = useResult<string, Error>()
a.result  // Result<string, Error> | undefined

// With initial → result is always defined
const b = useResult(ok("hello"))
b.result  // Result<string, never>
```

TypeScript selects the correct overload based on whether an argument is passed.

## useResultAsync Inference

```ts
const { result } = useResultAsync(
  (signal) => fromPromise(
    fetch("/api/data", { signal }).then(r => r.json() as Promise<User>),
    (e): ApiError => ({ _tag: "ApiError", cause: e })
  ),
  []
)
// result: Result<User, ApiError> | undefined
```

TypeScript infers `T` and `E` from the return type of the callback (`ResultAsync<User, ApiError>`).

## useResultAction Inference

```ts
const { execute } = useResultAction(
  (signal: AbortSignal, id: string, name: string) =>
    fromPromise(updateUser(id, name), toApiError)
)
// execute: (id: string, name: string) => Promise<Result<User, ApiError>>
```

The `A` type parameter captures the callback's argument types *after* the `AbortSignal` and propagates them to `execute`. The signal is injected by the hook and does not appear in `execute`'s signature.

### Complex callback signatures

```ts
const { execute } = useResultAction(
  (signal: AbortSignal, data: { name: string; email: string }) =>
    fromPromise(createUser(data), toApiError)
)
// execute: (data: { name: string; email: string }) => Promise<Result<User, ApiError>>
```

## Adapter Type Flow

### toQueryFn

```ts
const queryFn = toQueryFn(() => fetchUser(id))
// queryFn: () => Promise<User>
```

The `T` type from `ResultAsync<T, E>` becomes the Promise's resolved type. The `E` type is lost at the boundary (TanStack Query uses its own error model).

### toQueryOptions

```ts
const options = toQueryOptions(["user", id], () => fetchUser(id))
// options: { queryKey: readonly unknown[]; queryFn: () => Promise<User> }
```

### toMutationFn

```ts
const mutationFn = toMutationFn(
  (data: UpdateUserInput) => updateUser(data)
)
// mutationFn: (data: UpdateUserInput) => Promise<User>
```

The `A` argument type from the `ResultAsync`-returning function is preserved. The `T` type becomes the Promise's resolved type. Same throw-on-Err semantics as `toQueryFn`.

### toMutationOptions

```ts
const options = toMutationOptions(
  (data: UpdateUserInput) => updateUser(data),
  { onSuccess: (user) => queryClient.setQueryData(["user"], user) }
)
// options: UseMutationOptions<User, ApiError, UpdateUserInput>
```

### toSwrFetcher

```ts
const fetcher = toSwrFetcher(
  (key: string) => fromPromise(fetch(key).then(r => r.json()), toApiError)
)
// fetcher: (key: string) => Promise<User>
```

The `K` key type is preserved from the input function's parameter. Same throw-on-Err semantics as `toQueryFn`.

## useSafeTry Inference

### Sync generators

```ts
const { result } = useSafeTry(
  function* () {
    const parsed = yield* parseInput(rawData)           // parsed: ParsedForm
    const validated = yield* validateForm(parsed)       // validated: ValidForm
    return ok({ parsed, validated })
  },
  [rawData]
)
// result: Result<{ parsed: ParsedForm; validated: ValidForm }, ValidationError> | undefined
```

Sync generators compose synchronous `Result<T, E>` values. Each `yield*` extracts `T` from the yielded `Result<T, E>`, with progressive narrowing — `parsed` is correctly typed as `ParsedForm` when used in the second `yield*`. For async operations, use async generators (below).

### Async generators

```ts
const { result } = useSafeTry(
  async function* (signal) {
    const user = yield* fetchUserAsync(userId, signal)   // user: User
    return ok(user)
  },
  [userId]
)
// result: Result<User, FetchError> | undefined
```

The async generator overload has the same inference behavior. TypeScript selects the correct overload based on whether `fn` returns `Generator` or `AsyncGenerator`.

## createResultResource Inference

```ts
const resource = createResultResource(() =>
  fromPromise(fetch("/api/user").then(r => r.json() as Promise<User>), toApiError)
)
// resource: ResultResource<User, ApiError>

const result = resource.read()
// result: Result<User, ApiError>
```

TypeScript infers `T` and `E` from the `ResultAsync<T, E>` returned by the factory function. The `read()` method returns `Result<T, E>` (never `undefined` — it suspends instead).

## useResultTransition Inference

```ts
const { result, isPending, startResultTransition } = useResultTransition<User, ApiError>()
// result: Result<User, ApiError> | undefined
// startResultTransition: (fn: () => ResultAsync<User, ApiError> | Promise<Result<User, ApiError>>) => void
```

Explicit type parameters are required because `useResultTransition` has no arguments from which to infer `T` and `E`.

## Server Utility Inference

### matchResult

```ts
const output = matchResult(result, {
  ok: (user) => user.name,     // user: User, returns string
  err: (error) => error.code,  // error: ApiError, returns number
})
// output: string | number
```

TypeScript infers `T` and `E` from the `result` parameter and `A` and `B` from the handler return types. The return type is `A | B`.

### matchResultAsync

```ts
const output = await matchResultAsync(fetchUser(id), {
  ok: (user) => <UserCard user={user} />,
  err: (error) => <ErrorPage code={error.status} />,
})
// output: JSX.Element
```

When both handlers return the same type, the union collapses to that type.

### matchOption

```ts
const output = matchOption(avatar, {
  some: (url) => <img src={url} alt="avatar" />,
  none: () => <DefaultAvatar />,
})
// output: JSX.Element
```

TypeScript infers `T` from the `option` parameter and `A` and `B` from the handler return types. The return type is `A | B`.

## Result<T, E> | undefined Ergonomics

Hooks that return `Result<T, E> | undefined` require a nullish check before using Result methods:

```ts
const { result } = useResultAsync(fetchUser, [id])

// Must check for undefined first
if (result) {
  result.match(...)  // OK after check
}

// Or use optional chaining
result?.match(...)

// Or guard with isLoading
if (!isLoading && result) {
  // result: Result<T, E>
}
```

This is an intentional design choice. `undefined` represents "not yet resolved" — a fundamentally different state from `Ok` or `Err`. Conflating them would lose information.
