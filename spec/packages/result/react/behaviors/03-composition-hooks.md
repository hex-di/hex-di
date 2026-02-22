# 03 — Composition Hooks

> **Revision summary**: Initial version. Document control added per GxP review. For full change history, run `git log --follow --format="%h %ai %s" -- spec/packages/result/react/behaviors/03-composition-hooks.md`.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | BEH-R03 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- behaviors/03-composition-hooks.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- behaviors/03-composition-hooks.md` |
| Reviewed By | PR reviewer — `git log --merges --first-parent main --format="%b" -- behaviors/03-composition-hooks.md` (extract "Approved-by" or PR reviewer from merge commit) |
| Approved By | PR merge author — `git log --merges --first-parent main --format="%an %ai" -1 -- behaviors/03-composition-hooks.md` |
| Approval Evidence | PR merge to `main` — `git log --merges --first-parent main -- behaviors/03-composition-hooks.md` |
| Full Revision History | `git log --follow --format="%H %ai %an: %s" -- behaviors/03-composition-hooks.md` |

Hooks for composing and transforming Result values within the React lifecycle.

## BEH-R03-001: useResult

```ts
function useResult<T, E>(): {
  result: Result<T, E> | undefined
  setOk: (value: T) => void
  setErr: (error: E) => void
  set: (result: Result<T, E>) => void
  reset: () => void
}

function useResult<T, E>(initial: Result<T, E>): {
  result: Result<T, E>
  setOk: (value: T) => void
  setErr: (error: E) => void
  set: (result: Result<T, E>) => void
  reset: () => void
}
```

A stateful hook for holding a `Result<T, E>` in component state with ergonomic setters.

### Overloads

| Overload | `result` type | Behavior |
| -------- | ------------- | -------- |
| `useResult<T, E>()` | `Result<T, E> \| undefined` | Starts as `undefined`. `reset()` returns to `undefined`. |
| `useResult(initial)` | `Result<T, E>` | Starts as `initial`. `reset()` returns to `initial`. |

### Return Value

| Field | Type | Description |
| ----- | ---- | ----------- |
| `result` | `Result<T, E> \| undefined` or `Result<T, E>` | Current state. |
| `setOk` | `(value: T) => void` | Sets state to `ok(value)`. Stable reference ([INV-R1](../invariants.md#inv-r1-stable-action-references)). |
| `setErr` | `(error: E) => void` | Sets state to `err(error)`. Stable reference. |
| `set` | `(result: Result<T, E>) => void` | Sets state to an arbitrary Result. Stable reference. |
| `reset` | `() => void` | Resets to initial value (or `undefined`). Stable reference. |

### Phantom Type Consideration

When initialized with `ok("hello")`, the inferred type is `Result<string, never>`. This means `setErr` accepts `never` — it is uncallable. To use both `setOk` and `setErr`, provide explicit type parameters:

```ts
const { result, setOk, setErr } = useResult<string, ApiError>()
```

Or initialize with a properly typed Result:

```ts
const { result, setOk, setErr } = useResult<string, ApiError>(ok("default"))
```

### Reference Implementation Notes (DS-level)

> **Specification hierarchy note**: The following code block is a **reference implementation** (Design Specification level) included for clarity. It illustrates how stable action references ([INV-R1](../invariants.md#inv-r1-stable-action-references)) are achieved but is not normative — conforming implementations may use alternative patterns (e.g., `useCallback`) provided they satisfy INV-R1.

All action callbacks are created once via `useMemo` and reference `setState` (which is itself stable from `useState`). This guarantees [INV-R1](../invariants.md#inv-r1-stable-action-references):

```ts
const actions = useMemo(() => ({
  setOk: (value: T) => setState(ok(value)),
  setErr: (error: E) => setState(err(error)),
  set: setState,
  reset: () => setState(initial),
}), [])
```

### Reset Captures Initial Value Once

The `reset` callback captures the `initial` value at hook initialization time (via the `useMemo` empty dependency array). If `initial` is passed as a prop that changes between renders, `reset()` always returns to the *first* `initial` value, not the current one. This is intentional — the initial value defines the "zero state" for the component's lifetime, not a live binding.

If you need `reset` to track a changing prop, derive a new key to remount the component:

```tsx
<EmailInput key={formId} initialResult={ok(serverDefault)} />
```

### Usage

```tsx
import { ok, err } from "@hex-di/result"
import { useResult, Match } from "@hex-di/result-react"

function EmailInput() {
  const [email, setEmail] = useState("")
  const { result, set, reset } = useResult<string, { message: string }>()

  function handleBlur() {
    set(email.includes("@") ? ok(email) : err({ message: "Invalid email" }))
  }

  return (
    <div>
      <input
        value={email}
        onChange={(e) => { setEmail(e.target.value); reset() }}
        onBlur={handleBlur}
      />
      {result && (
        <Match
          result={result}
          ok={() => <span className="text-green-600">Valid</span>}
          err={(e) => <span className="text-red-600">{e.message}</span>}
        />
      )}
    </div>
  )
}
```

---

## BEH-R03-002: useOptimisticResult

```ts
function useOptimisticResult<T, E>(
  result: Result<T, E>,
  updateFn: (current: Result<T, E>, optimistic: T) => Result<T, E>
): {
  result: Result<T, E>
  setOptimistic: (value: T) => void
}
```

Wraps React 19's `useOptimistic` to work with Result values. Provides immediate UI feedback while an async operation is in flight.

### Parameters

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `result` | `Result<T, E>` | The current authoritative Result (e.g., from server state). |
| `updateFn` | `(current: Result<T, E>, optimistic: T) => Result<T, E>` | Reducer that produces the optimistic state. Typically returns `ok(optimistic)`. |

### Return Value

| Field | Type | Description |
| ----- | ---- | ----------- |
| `result` | `Result<T, E>` | The optimistic Result during a transition; reverts to the authoritative Result when the transition completes. |
| `setOptimistic` | `(value: T) => void` | Triggers the optimistic update. Must be called inside `startTransition`. |

### React 19 Requirement

This hook requires React 19. It delegates to `React.useOptimistic()` internally. In React 18 environments, importing this hook throws a descriptive error at module load time. See [INV-R11](../invariants.md#inv-r11-react-version-fail-fast).

### Usage

```tsx
import { ok } from "@hex-di/result"
import { useOptimisticResult } from "@hex-di/result-react"

function TodoItem({ todo, updateTodo }: Props) {
  const { result, setOptimistic } = useOptimisticResult(
    ok(todo),
    (_current, optimistic) => ok(optimistic)
  )

  async function handleToggle() {
    const toggled = { ...todo, completed: !todo.completed }
    startTransition(async () => {
      setOptimistic(toggled)
      await updateTodo(toggled)
    })
  }

  return (
    <Match
      result={result}
      ok={(t) => (
        <li onClick={handleToggle}>
          {t.completed ? "✓" : "○"} {t.title}
        </li>
      )}
      err={(e) => <li className="text-red-600">Error: {e.message}</li>}
    />
  )
}
```

---

## BEH-R03-003: useSafeTry

```ts
function useSafeTry<T, E>(
  fn: (signal: AbortSignal) => Generator<Err<never, E>, Result<T, E>, unknown>,
  deps: DependencyList
): {
  result: Result<T, E> | undefined
  isLoading: boolean
}
```

Bridges the core library's `safeTry` generator pattern into the React lifecycle. Enables sequential composition of multiple `Result` operations with early return on `Err`.

### Parameters

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `fn` | `(signal: AbortSignal) => Generator<Err<never, E>, Result<T, E>, unknown>` | Generator function that yields `Result` values. Early returns on first `Err`. |
| `deps` | `DependencyList` | Dependency array. Re-executes when deps change. |

### Return Value

| Field | Type | Description |
| ----- | ---- | ----------- |
| `result` | `Result<T, E> \| undefined` | `undefined` until the generator completes. |
| `isLoading` | `boolean` | `true` while the generator is executing. |

### Behavior

1. On mount (or deps change), creates a new generator from `fn`
2. Runs the generator through `safeTry` from the core library
3. On completion, sets `result` to the returned `Result<T, E>`
4. On early return (Err yield), sets `result` to that `Err`
5. On cleanup (unmount or deps change), aborts via signal

### Usage

```tsx
import { ok, err } from "@hex-di/result"
import { useSafeTry, Match } from "@hex-di/result-react"

function OrderSummary({ orderId }: { orderId: string }) {
  const { result, isLoading } = useSafeTry(
    async function* (signal) {
      const order = yield* fetchOrder(orderId, signal)
      const user = yield* fetchUser(order.userId, signal)
      const address = yield* fetchAddress(user.addressId, signal)
      return ok({ order, user, address })
    },
    [orderId]
  )

  if (isLoading || !result) return <Skeleton />

  return (
    <Match
      result={result}
      ok={({ order, user, address }) => (
        <div>
          <h2>Order #{order.id}</h2>
          <p>Customer: {user.name}</p>
          <p>Ship to: {address.line1}</p>
        </div>
      )}
      err={(error) => <p>Failed to load order: {error.message}</p>}
    />
  )
}
```

This replaces the awkward pattern of chaining multiple `useResultAsync` hooks with conditional dependencies.

**Note**: The primary usage uses `async function*` because each `yield*` awaits a `ResultAsync` from an async data source. Sync generators (`function*`) are for composing synchronous `Result<T, E>` values only — use them when all operations are already resolved.

### Async Generator Support

`useSafeTry` also supports async generators for sequential async operations:

```ts
function useSafeTry<T, E>(
  fn: (signal: AbortSignal) => AsyncGenerator<Err<never, E>, Result<T, E>, unknown>,
  deps: DependencyList
): {
  result: Result<T, E> | undefined
  isLoading: boolean
}
```

When `fn` returns an `AsyncGenerator`, each `yield*` can await a `ResultAsync` before proceeding. This enables sequential async composition with early return:

```tsx
const { result, isLoading } = useSafeTry(
  async function* (signal) {
    const user = yield* fetchUser(userId, signal)         // async, may Err
    const posts = yield* fetchPosts(user.id, signal)      // async, may Err
    const comments = yield* fetchComments(posts[0].id, signal) // async, may Err
    return ok({ user, posts, comments })
  },
  [userId]
)
```

### Using Core Do-Notation

For consumers who prefer the core library's `bind`/`let_` style, use it directly inside `useResultAsync`:

```ts
const { result } = useResultAsync(
  (signal) => ok({})
    .andThen(bind("user", () => fetchUser(id, signal)))
    .andThen(bind("posts", ({ user }) => fetchPosts(user.id, signal))),
  [id]
)
```

This preserves progressive type narrowing because it uses the core library's method-chaining API. See [ADR-R008](../decisions/R008-no-do-notation-hook.md) for why a dedicated Do-notation hook is not provided.

---

## BEH-R03-004: useResultTransition

```ts
function useResultTransition<T, E>(): {
  result: Result<T, E> | undefined
  isPending: boolean
  startResultTransition: (fn: () => ResultAsync<T, E> | Promise<Result<T, E>>) => void
}
```

Wraps React 19's `useTransition` with Result semantics. Executes an async Result operation inside a transition, keeping the UI responsive.

### Return Value

| Field | Type | Description |
| ----- | ---- | ----------- |
| `result` | `Result<T, E> \| undefined` | Last resolved result. |
| `isPending` | `boolean` | `true` while the transition is in progress. |
| `startResultTransition` | `(fn) => void` | Starts the transition with a Result-returning function. |

### Usage

```tsx
import { useResultTransition, Match } from "@hex-di/result-react"

function SearchResults() {
  const [query, setQuery] = useState("")
  const { result, isPending, startResultTransition } = useResultTransition<SearchResult[], ApiError>()

  function handleSearch(q: string) {
    setQuery(q)
    startResultTransition(() =>
      fromPromise(fetch(`/api/search?q=${q}`).then(r => r.json()), toApiError)
    )
  }

  return (
    <div>
      <input value={query} onChange={(e) => handleSearch(e.target.value)} />
      {isPending && <Spinner />}
      {result && (
        <Match
          result={result}
          ok={(items) => <ResultList items={items} />}
          err={(error) => <p>{error.message}</p>}
        />
      )}
    </div>
  )
}
```

### React 19 Requirement

This hook requires React 19. It delegates to `React.useTransition()` with async callback support internally. In React 18 environments, importing this hook throws a descriptive error at module load time (consistent with `useOptimisticResult`). See [INV-R11](../invariants.md#inv-r11-react-version-fail-fast).
