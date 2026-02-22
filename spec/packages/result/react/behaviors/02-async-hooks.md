# 02 — Async Hooks

> **Revision summary**: Initial version. Document control added per GxP review. For full change history, run `git log --follow --format="%h %ai %s" -- spec/packages/result/react/behaviors/02-async-hooks.md`.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | BEH-R02 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- behaviors/02-async-hooks.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- behaviors/02-async-hooks.md` |
| Reviewed By | PR reviewer — `git log --merges --first-parent main --format="%b" -- behaviors/02-async-hooks.md` (extract "Approved-by" or PR reviewer from merge commit) |
| Approved By | PR merge author — `git log --merges --first-parent main --format="%an %ai" -1 -- behaviors/02-async-hooks.md` |
| Approval Evidence | PR merge to `main` — `git log --merges --first-parent main -- behaviors/02-async-hooks.md` |
| Full Revision History | `git log --follow --format="%H %ai %an: %s" -- behaviors/02-async-hooks.md` |

Hooks for bridging `ResultAsync` with the React component lifecycle.

## BEH-R02-001: useResultAsync

```ts
function useResultAsync<T, E>(
  fn: (signal: AbortSignal) => ResultAsync<T, E>,
  deps: DependencyList,
  options?: UseResultAsyncOptions<E>
): {
  result: Result<T, E> | undefined
  isLoading: boolean
  refetch: () => void
}

interface UseResultAsyncOptions<E> {
  /** Number of retry attempts on Err. Default: 0 (no retry). */
  retry?: number
  /** Delay in ms between retries. Can be a function for exponential backoff. Default: 1000. */
  retryDelay?: number | ((attempt: number, error: E) => number)
  /** Predicate to decide if an Err should be retried. Default: () => true. */
  retryOn?: (error: E) => boolean
}
```

An eager hook that executes the async operation on mount and whenever `deps` change. Supports optional retry with backoff.

### Parameters

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `fn` | `(signal: AbortSignal) => ResultAsync<T, E>` | Factory that creates the async operation. Receives an `AbortSignal` for cancellation. |
| `deps` | `DependencyList` | React dependency array. The operation re-executes when any dep changes. |
| `options` | `UseResultAsyncOptions<E>` | Optional. Retry configuration. |

### Retry Behavior

When `options.retry` is set to a number greater than 0:

1. If `fn` resolves to `Err`, the hook checks `retryOn(error)` (defaults to `true`)
2. If retryable, waits `retryDelay` ms (or calls `retryDelay(attempt, error)` for backoff)
3. Re-invokes `fn` with the same signal, up to `retry` times
4. If all retries fail, sets `result` to the last `Err`
5. Abort via signal cancels pending retries

```tsx
const { result, isLoading } = useResultAsync(
  (signal) => fromPromise(fetch("/api/data", { signal }).then(r => r.json()), toApiError),
  [],
  {
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000), // exponential backoff
    retryOn: (error) => error._tag === "NetworkError", // only retry network errors
  }
)
```

### Return Value

| Field | Type | Description |
| ----- | ---- | ----------- |
| `result` | `Result<T, E> \| undefined` | `undefined` until the first resolution. After resolution, always a `Result`. |
| `isLoading` | `boolean` | `true` while an operation is in flight. `false` otherwise. |
| `refetch` | `() => void` | Stable callback that re-executes the operation with current deps. |

### Lifecycle

1. **Mount**: Creates `AbortController`, increments generation counter, calls `fn(signal)`, sets `isLoading: true`
2. **Resolution**: If generation matches current, sets `result` and `isLoading: false`
3. **Deps change**: Cleanup aborts previous controller, restarts from step 1
4. **Unmount**: Cleanup aborts controller
5. **Refetch**: Increments generation, aborts previous, restarts from step 1

### Race Condition Prevention

Uses generation tracking ([INV-R3](../invariants.md#inv-r3-generation-guard)) combined with abort-on-cleanup ([INV-R2](../invariants.md#inv-r2-abort-on-cleanup)).

#### Reference Implementation (DS-level)

> **Specification hierarchy note**: The following code block is a **reference implementation** (Design Specification level) included for clarity. It illustrates the generation + abort pattern but is not normative — the testable contract is defined by INV-R2, INV-R3, and the lifecycle description above.

```ts
const generationRef = useRef(0)

useEffect(() => {
  const controller = new AbortController()
  const generation = ++generationRef.current

  setState(prev => ({ ...prev, isLoading: true }))

  fn(controller.signal).then(result => {
    if (generation === generationRef.current) {
      setState({ result, isLoading: false })
    }
  })

  return () => {
    controller.abort()
  }
}, deps)
```

### Strict Mode

React 18/19 StrictMode double-mounts in development. The cleanup function aborts the first invocation, and the second invocation proceeds normally. The generation counter ensures only the latest invocation writes state. See [INV-R7](../invariants.md#inv-r7-strict-mode-compatibility).

### Usage

```tsx
import { fromPromise } from "@hex-di/result"
import { useResultAsync, Match } from "@hex-di/result-react"

function UserProfile({ id }: { id: string }) {
  const { result, isLoading, refetch } = useResultAsync(
    (signal) => fromPromise(
      fetch(`/api/users/${id}`, { signal }).then(r => r.json()),
      (e) => ({ _tag: "FetchError" as const, cause: e })
    ),
    [id]
  )

  if (isLoading || !result) return <Skeleton />

  return (
    <Match
      result={result}
      ok={(user) => <UserCard user={user} />}
      err={(error) => (
        <div>
          <p>Failed: {error.cause}</p>
          <button onClick={refetch}>Retry</button>
        </div>
      )}
    />
  )
}
```

---

## BEH-R02-002: useResultAction

```ts
function useResultAction<A extends unknown[], T, E>(
  fn: (signal: AbortSignal, ...args: A) => ResultAsync<T, E> | Result<T, E>
): {
  result: Result<T, E> | undefined
  isLoading: boolean
  execute: (...args: A) => Promise<Result<T, E>>
  reset: () => void
}
```

A lazy hook that does not execute automatically. The operation runs only when `execute()` is called. Each call to `execute()` aborts the previous in-flight operation.

### Parameters

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `fn` | `(signal: AbortSignal, ...args: A) => ResultAsync<T, E> \| Result<T, E>` | The operation to execute. Receives an `AbortSignal` for cancellation, followed by user-provided arguments. May be sync or async. |

### Return Value

| Field | Type | Description |
| ----- | ---- | ----------- |
| `result` | `Result<T, E> \| undefined` | `undefined` until first `execute()` resolves. Holds the last resolved value. |
| `isLoading` | `boolean` | `true` while an operation is in flight. |
| `execute` | `(...args: A) => Promise<Result<T, E>>` | Stable callback that triggers the operation. Returns the Result for inline use. |
| `reset` | `() => void` | Stable callback that clears `result` to `undefined` and sets `isLoading` to `false`. |

### Lifecycle

1. **Initial**: `result` is `undefined`, `isLoading` is `false`
2. **Execute**: Aborts previous controller (if any), creates new `AbortController`, increments generation, sets `isLoading: true`, calls `fn(signal, ...args)`
3. **Resolution**: If generation matches current, sets `result` and `isLoading: false`
4. **Reset**: Aborts current controller, sets `result` to `undefined`, `isLoading` to `false`
5. **Unmount**: Aborts current controller

### Abort Behavior

Unlike `useResultAsync` (which aborts via `useEffect` cleanup), `useResultAction` manages abort explicitly:

- Each `execute()` call creates a new `AbortController` and aborts the previous one
- `reset()` aborts any in-flight operation
- On unmount, the current controller is aborted
- The `signal` parameter allows `fn` to pass it to `fetch()` or other cancellable APIs

This ensures in-flight requests are actually cancelled (not just ignored), preventing resource leaks.

### Naming

Named `useResultAction` instead of `useResultCallback` to avoid confusion with React's `useCallback` hook. See [ADR-R003](../decisions/R003-naming-conventions.md).

### Usage

```tsx
import { fromPromise } from "@hex-di/result"
import { useResultAction } from "@hex-di/result-react"

function ContactForm() {
  const { result, isLoading, execute, reset } = useResultAction(
    (signal, data: { name: string; message: string }) =>
      fromPromise(
        fetch("/api/contact", {
          signal,
          method: "POST",
          body: JSON.stringify(data),
          headers: { "Content-Type": "application/json" },
        }).then(r => r.json()),
        (e) => ({ _tag: "SubmitError" as const, cause: e })
      )
  )

  if (result?.isOk()) {
    return (
      <div>
        <p>Ticket: {result.value.ticketId}</p>
        <button onClick={reset}>Send another</button>
      </div>
    )
  }

  return (
    <form onSubmit={async (e) => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      await execute({
        name: fd.get("name") as string,
        message: fd.get("message") as string,
      })
    }}>
      <input name="name" required />
      <textarea name="message" required />
      {result?.isErr() && <p>{result.error.cause}</p>}
      <button disabled={isLoading}>
        {isLoading ? "Sending..." : "Send"}
      </button>
    </form>
  )
}
```

---

## BEH-R02-003: useResultSuspense

```ts
function useResultSuspense<T, E>(
  fn: () => ResultAsync<T, E>,
  deps: DependencyList
): Result<T, E>
```

A Suspense-integrated hook that suspends the component until the `ResultAsync` resolves. The return value is always `Result<T, E>` — never `undefined`.

### Parameters

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `fn` | `() => ResultAsync<T, E>` | Factory that creates the async operation. |
| `deps` | `DependencyList` | Dependency array. A new operation is created when deps change. |

### Return Value

`Result<T, E>` — the resolved result. Errors are in the `Err` branch, not thrown.

### Suspense Contract

1. On first render (or when deps change), creates a new promise via `fn()`
2. Throws the promise to trigger the nearest `<Suspense>` boundary
3. When the promise resolves, React re-renders the component
4. The hook returns the resolved `Result<T, E>`

See [INV-R6](../invariants.md#inv-r6-suspense-contract).

### No AbortSignal

Unlike `useResultAsync` and `useResultAction`, `useResultSuspense` does not accept an `AbortSignal` parameter. This is intentional:

1. **No effect cleanup** — Suspense hooks work by throwing promises, not by running effects. There is no `useEffect` cleanup function in which to call `abort()`.
2. **Promise lifecycle** — Once a promise is thrown for Suspense, React owns the resolution lifecycle. Aborting mid-suspension would leave the component in an unresolvable state.
3. **Deps change = new promise** — When `deps` change, a new promise is created and thrown. The old promise's resolution is naturally ignored because React re-renders with the new one.

If cancellation is needed, use `useResultAsync` with a `<Suspense>` wrapper pattern, or structure the `fn` callback to support external cancellation.

### React 19

In React 19 environments, the implementation may use the `use()` hook internally for promise resolution instead of the throw-promise pattern. The external API is identical.

### Usage

```tsx
import { Suspense } from "react"
import { fromPromise } from "@hex-di/result"
import { useResultSuspense, Match } from "@hex-di/result-react"

function DashboardStats() {
  const result = useResultSuspense(
    () => fromPromise(
      fetch("/api/stats").then(r => r.json()),
      (e) => ({ _tag: "StatsError" as const, cause: e })
    ),
    []
  )

  return (
    <Match
      result={result}
      ok={(stats) => (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Users" value={stats.users} />
          <StatCard label="Revenue" value={stats.revenue} />
        </div>
      )}
      err={(error) => <p>Could not load stats</p>}
    />
  )
}

// Parent wraps with Suspense:
function Dashboard() {
  return (
    <Suspense fallback={<Skeleton />}>
      <DashboardStats />
    </Suspense>
  )
}
```

---

## BEH-R02-004: createResultResource

```ts
function createResultResource<T, E>(
  fn: () => ResultAsync<T, E>
): ResultResource<T, E>

interface ResultResource<T, E> {
  read(): Result<T, E>
  preload(): void
  invalidate(): void
}
```

Creates a Suspense-compatible resource for the **render-as-you-fetch** pattern. Unlike `useResultSuspense` (which is fetch-on-render), resources are created _outside_ the component tree and preloaded before rendering begins.

### Parameters

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `fn` | `() => ResultAsync<T, E>` | Factory that creates the async operation. Called on first `read()` or `preload()`. |

### Return Value

A `ResultResource<T, E>` with three methods:

| Method | Description |
| ------ | ----------- |
| `read()` | Returns `Result<T, E>` if resolved. Throws promise to suspend if pending. |
| `preload()` | Triggers the fetch immediately without suspending. Call during route transitions. |
| `invalidate()` | Clears the cached result. Next `read()` triggers a new fetch. |

### Lifecycle

1. **Create**: `createResultResource(fn)` — stores `fn`, does not call it
2. **Preload** (optional): `resource.preload()` — calls `fn()`, caches the promise
3. **Read**: `resource.read()` — if pending, throws promise (Suspense). If resolved, returns `Result<T, E>`.
4. **Invalidate**: `resource.invalidate()` — clears cache, next `read()` re-fetches

### Invalidation During Suspension

When `invalidate()` is called while a component is suspended on `read()`:

1. The cache is cleared immediately
2. The currently suspended promise is **not** cancelled — it continues to resolve
3. When React re-renders the component (triggered by the original promise resolving), `read()` finds the cache empty, calls `fn()` again, stores the new promise, and throws it — suspending the component again
4. The new promise resolves, and `read()` returns the fresh `Result<T, E>`

This means the component suspends twice in sequence. This is the correct behavior — the invalidation explicitly requested fresh data. To avoid the double-suspend, call `preload()` immediately after `invalidate()` to start the new fetch eagerly:

```ts
resource.invalidate()
resource.preload()  // starts new fetch immediately
```

### Render-as-you-fetch Pattern

```tsx
import { createResultResource } from "@hex-di/result-react"
import { fromPromise } from "@hex-di/result"

// Create resource OUTSIDE component (e.g., in route loader)
const userResource = createResultResource(() =>
  fromPromise(fetch("/api/user").then(r => r.json()), toApiError)
)

// Preload during navigation
function onNavigateToProfile() {
  userResource.preload()
  navigate("/profile")
}

// Component reads the resource (suspends if not ready)
function UserProfile() {
  const result = userResource.read()

  return (
    <Match
      result={result}
      ok={(user) => <UserCard user={user} />}
      err={(error) => <ErrorBanner error={error} />}
    />
  )
}

// Parent wraps with Suspense
function ProfilePage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <UserProfile />
    </Suspense>
  )
}
```

### No AbortSignal

Like `useResultSuspense`, `createResultResource` does not accept an `AbortSignal`:

1. **Created outside components** — Resources are created at module scope or in route loaders, where no component lifecycle exists to drive abort.
2. **Cache semantics** — The resource caches the result. Aborting a fetch would leave the cache in an inconsistent state. Instead, use `invalidate()` to discard and re-fetch.
3. **Preload is fire-and-forget** — `preload()` triggers the fetch eagerly during navigation. Cancelling it would defeat the purpose of prefetching.

### Difference from useResultSuspense

| | `useResultSuspense` | `createResultResource` |
|---|---|---|
| Created | Inside component (hook) | Outside component tree |
| Fetch trigger | On mount / deps change | On `preload()` or first `read()` |
| Pattern | Fetch-on-render | Render-as-you-fetch |
| Caching | None (re-fetches on deps change) | Cached until `invalidate()` |
| Use case | Simple Suspense | Route-level prefetching |
