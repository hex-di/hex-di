# @hex-di/result-react

React hooks, components, and adapters for [`@hex-di/result`](https://www.npmjs.com/package/@hex-di/result). Type-safe error handling in React with errors as values, not exceptions.

## Install

```bash
npm install @hex-di/result-react @hex-di/result react
```

## Quick Start

```tsx
import { ok, err, fromPromise } from "@hex-di/result";
import { useResultAsync, Match } from "@hex-di/result-react";

function UserProfile({ id }: { id: string }) {
  const { result, isLoading, refetch } = useResultAsync(
    (signal) =>
      fromPromise(
        fetch(`/api/users/${id}`, { signal }).then((r) => r.json()),
        (e) => ({ _tag: "FetchError" as const, cause: e }),
      ),
    [id],
  );

  if (isLoading || !result) return <Spinner />;

  return (
    <Match
      result={result}
      ok={(user) => <UserCard user={user} />}
      err={(error) => (
        <div>
          <p>Failed: {String(error.cause)}</p>
          <button onClick={refetch}>Retry</button>
        </div>
      )}
    />
  );
}
```

## Components

### `<Match>`

Renders one of two branches based on the variant of a `Result`. Uses React `key` isolation to unmount the previous branch when the variant changes, preventing stale state leakage.

```tsx
import { Match } from "@hex-di/result-react";

<Match
  result={result}
  ok={(value) => <SuccessView data={value} />}
  err={(error) => <ErrorBanner message={error.message} />}
/>
```

Both `ok` and `err` props are required -- omitting either is a TypeScript compile error. When the result flips between Ok and Err, component state inside each branch resets completely.

#### Matching Error Variants

When the error type is a tagged union, match all variants inside the `err` branch:

```tsx
import { createError, assertNever } from "@hex-di/result";

const NotFound = createError("NotFound");
const Forbidden = createError("Forbidden");
const Timeout = createError("Timeout");

type FetchError =
  | ReturnType<typeof NotFound<{ id: string }>>
  | ReturnType<typeof Forbidden<{ role: string }>>
  | ReturnType<typeof Timeout<{ ms: number }>>;

<Match
  result={result as Result<User, FetchError>}
  ok={(user) => <UserCard user={user} />}
  err={(error) => {
    switch (error._tag) {
      case "NotFound":  return <NotFoundPage id={error.id} />;
      case "Forbidden": return <ForbiddenPage />;
      case "Timeout":   return <RetryButton onClick={refetch} />;
      default:          return assertNever(error);
    }
  }}
/>
```

If you add a new variant to `FetchError` without handling it, TypeScript reports a compile error on the `assertNever` call.

> **Plugin alternative:** The [`@hex-di/result-typescript-plugin`](https://www.npmjs.com/package/@hex-di/result-typescript-plugin) detects missing variants automatically — no `assertNever` needed. If "Timeout" is omitted from the switch, the plugin reports directly in your editor:
>
> ```
> SUGGESTION: Missing case "Timeout" in switch statement
> ```
>
> This works in real-time as a Language Service Plugin and in CI via `ts-patch`.

#### Error Groups

`createErrorGroup` creates namespaced error families with built-in type guards, useful for filtering errors by group in the `err` branch:

```tsx
import { createErrorGroup } from "@hex-di/result";

const Http = createErrorGroup("HttpError");
const NotFound = Http.create("NotFound");
const Timeout = Http.create("Timeout");

<Match
  result={result}
  ok={(data) => <DataView data={data} />}
  err={(error) => {
    if (Http.isTag("Timeout")(error)) return <RetryButton />;
    if (Http.is(error)) return <HttpErrorPage status={error._tag} />;
    return <GenericError />;
  }}
/>
```

See the [core library docs](https://www.npmjs.com/package/@hex-di/result) for full `createErrorGroup` API details.

## Hooks

### `useResultAsync` -- Eager async fetching

Executes on mount and whenever `deps` change. Provides `AbortSignal` for cancellation.

```tsx
const { result, isLoading, refetch } = useResultAsync(
  (signal) => fetchUser(id, signal),
  [id],
  { retry: 3, retryDelay: (attempt) => 1000 * 2 ** attempt },
);
```

| Return | Type | Description |
|--------|------|-------------|
| `result` | `Result<T, E> \| undefined` | `undefined` until first resolution |
| `isLoading` | `boolean` | `true` while in flight |
| `refetch` | `() => void` | Re-execute (stable reference) |

**Options**: `retry` (number of retries), `retryDelay` (ms or function), `retryOn` (predicate).

### `useResultAction` -- Lazy actions

Does not execute until `execute()` is called. Each call aborts the previous in-flight operation.

```tsx
const { result, isLoading, execute, reset } = useResultAction(
  (signal, data: FormData) =>
    fromPromise(
      fetch("/api/submit", { signal, method: "POST", body: data }).then((r) => r.json()),
      (e) => String(e),
    ),
);

// In an event handler:
await execute(formData);
```

| Return | Type | Description |
|--------|------|-------------|
| `result` | `Result<T, E> \| undefined` | Last resolved result |
| `isLoading` | `boolean` | `true` while in flight |
| `execute` | `(...args: A) => Promise<Result<T, E>>` | Trigger the action (stable) |
| `reset` | `() => void` | Clear result and abort (stable) |

### `useResult` -- Result state

Manages a `Result<T, E>` as React state with convenience setters.

```tsx
const { result, setOk, setErr, set, reset } = useResult<string, Error>();

// With initial value (result is never undefined):
const { result, setOk } = useResult(ok("default"));
```

All action callbacks (`setOk`, `setErr`, `set`, `reset`) are referentially stable across re-renders.

### `useSafeTry` -- Generator composition

Composes multiple `Result` operations with early return on first `Err`:

```tsx
const { result, isLoading } = useSafeTry(
  async function* (signal) {
    const user = yield* fetchUser(id, signal);
    const posts = yield* fetchPosts(user.id, signal);
    return ok({ user, posts });
  },
  [id],
);
```

Supports both sync and async generators. Abort signal is delivered on unmount or deps change.

### `useResultSuspense` -- Suspense integration

Suspends the component until the `ResultAsync` resolves. Must be wrapped in `<Suspense>`.

```tsx
function DashboardStats() {
  const result = useResultSuspense(
    () => fromPromise(fetch("/api/stats").then((r) => r.json()), String),
    [],
  );

  // result is always Result<T, E>, never undefined
  return <Match result={result} ok={(s) => <Stats data={s} />} err={(e) => <p>{e}</p>} />;
}

// Parent:
<Suspense fallback={<Skeleton />}>
  <DashboardStats />
</Suspense>
```

Err results are returned as values, not thrown -- they do not trigger ErrorBoundary.

### `createResultResource` -- Render-as-you-fetch

Creates a Suspense resource outside the component tree for prefetching:

```tsx
const userResource = createResultResource(() => fetchUser(id));

// Preload during navigation
userResource.preload();

// Inside component (suspends if not ready):
function UserProfile() {
  const result = userResource.read();
  return <Match result={result} ok={(u) => <p>{u.name}</p>} err={(e) => <p>{e}</p>} />;
}
```

| Method | Description |
|--------|-------------|
| `read()` | Returns `Result` if resolved, suspends if pending |
| `preload()` | Starts fetch eagerly without suspending |
| `invalidate()` | Clears cache; next `read()` re-fetches |

### `useOptimisticResult` -- React 19

Wraps React 19's `useOptimistic` for Result values:

```tsx
const { result, setOptimistic } = useOptimisticResult(
  serverResult,
  (_current, optimistic) => ok(optimistic),
);
```

Requires React 19. Throws at import time on React 18.

### `useResultTransition` -- React 19

Wraps React 19's async `useTransition` for Result-returning operations:

```tsx
const { result, isPending, startResultTransition } = useResultTransition<Data, Error>();

startResultTransition(() => fetchData(query));
```

Requires React 19. Throws at import time on React 18.

## Utilities

### `fromAction`

Wraps a throwing async function (e.g., a server action) into one that returns `ResultAsync`:

```ts
import { fromAction } from "@hex-di/result-react";

const safeCreatePost = fromAction(
  createPost,
  (e) => ({ _tag: "CreatePostError" as const, cause: e }),
);

const result = await safeCreatePost("Hello"); // Result<Post, CreatePostError>
```

## Server Utilities

Pure functions for React Server Components. No React hooks, no `"use client"` required.

```ts
import { matchResult, matchResultAsync, matchOption, resultAction } from "@hex-di/result-react/server";
```

### `matchResult`

Pattern-match a `Result` with named handlers:

```tsx
// app/page.tsx (Server Component)
export default async function UserPage({ params }: Props) {
  const result = await fetchUser(params.id);

  return matchResult(result, {
    ok: (user) => <UserCard user={user} />,
    err: (error) => <ErrorPage message={error.message} />,
  });
}
```

For tagged error unions, match exhaustively inside the `err` handler:

```tsx
import { assertNever } from "@hex-di/result";

export default async function UserPage({ params }: Props) {
  const result = await fetchUser(params.id);

  return matchResult(result, {
    ok: (user) => <UserCard user={user} />,
    err: (error) => {
      switch (error._tag) {
        case "NotFound":  return <NotFoundPage />;
        case "Forbidden": return <ForbiddenPage />;
        case "Timeout":   return <RetryMessage ms={error.ms} />;
        default:          return assertNever(error);
      }
    },
  });
}
```

### `matchResultAsync`

Async variant that awaits a `ResultAsync` or `Promise<Result>` before matching:

```tsx
export default async function Dashboard() {
  return matchResultAsync(fetchDashboardData(), {
    ok: (data) => <Dashboard data={data} />,
    err: (error) => <ErrorPage code={error.status} />,
  });
}
```

### `matchOption`

Pattern-match an `Option` with named handlers:

```tsx
matchOption(avatar, {
  some: (url) => <img src={url} alt="avatar" />,
  none: () => <DefaultAvatar />,
})
```

### `resultAction`

Wraps a server action to return `Promise<Result<T, E>>` instead of throwing:

```ts
"use server";
import { resultAction } from "@hex-di/result-react/server";

export const createPost = resultAction(
  async (title: string) => await db.posts.create({ title }),
  (e) => ({ _tag: "CreatePostError" as const, cause: e }),
);
```

## Adapters

Thin wrappers for integrating with TanStack Query and SWR.

```ts
import { toQueryFn, toQueryOptions, toMutationFn, toMutationOptions } from "@hex-di/result-react/adapters";
import { toSwrFetcher } from "@hex-di/result-react/adapters";
```

### TanStack Query

```tsx
import { useQuery, useMutation } from "@tanstack/react-query";
import { toQueryFn, toMutationFn } from "@hex-di/result-react/adapters";

// Query
const { data, error } = useQuery({
  queryKey: ["user", id],
  queryFn: toQueryFn(() => fetchUser(id)),
});

// Query with options helper
const { data } = useQuery(toQueryOptions(["user", id], () => fetchUser(id)));

// Mutation
const { mutate } = useMutation({
  mutationFn: toMutationFn((data: CreateUser) => createUser(data)),
});
```

### SWR

```tsx
import useSWR from "swr";
import { toSwrFetcher } from "@hex-di/result-react/adapters";

const fetcher = toSwrFetcher((key: string) =>
  fromPromise(fetch(key).then((r) => r.json()), String),
);

const { data, error } = useSWR("/api/users", fetcher);
```

## Testing Utilities

Helpers for testing Result-based components and hooks.

```ts
import {
  createResultFixture,
  mockResultAsync,
  setupResultReactMatchers,
  renderWithResult,
  ResultDecorator,
} from "@hex-di/result-react/testing";
```

### `createResultFixture`

Factory for test data with consistent defaults:

```ts
const userFixture = createResultFixture({ id: "1", name: "Alice", email: "a@b.com" });

userFixture.ok();                     // Ok({ id: "1", name: "Alice", email: "a@b.com" })
userFixture.ok({ name: "Bob" });      // Ok({ id: "1", name: "Bob", email: "a@b.com" })
userFixture.err("not found");         // Err("not found")
userFixture.okAsync({}, 100);         // ResultAsync, resolves after 100ms
userFixture.errAsync("fail", 50);     // ResultAsync Err, resolves after 50ms
```

### `mockResultAsync`

Deferred `ResultAsync` with manual resolve/reject for testing timing:

```ts
const mock = mockResultAsync<User, Error>();

// Pass to hook under test
const { result } = renderHook(() => useResultAsync(() => mock.resultAsync, []));

expect(result.current.isLoading).toBe(true);

// Resolve at the right moment
act(() => mock.resolve({ id: "1", name: "Alice" }));

await waitFor(() => {
  expect(result.current.result).toBeOk();
});
```

Double-settling throws `Error("MockResultAsync already settled")`.

### `setupResultReactMatchers`

Registers `toBeLoading()` Vitest matcher:

```ts
// vitest.setup.ts
import { setupResultMatchers } from "@hex-di/result-testing";
import { setupResultReactMatchers } from "@hex-di/result-react/testing";

setupResultMatchers();
setupResultReactMatchers();
```

```ts
expect(hookResult.current).toBeLoading(); // asserts isLoading === true
```

### `renderWithResult`

Thin wrapper around `@testing-library/react`'s `render`:

```ts
renderWithResult(<Match result={ok("hi")} ok={(v) => <p>{v}</p>} err={() => null} />);
```

### `ResultDecorator`

Storybook decorator for Result-based stories:

```ts
export default {
  title: "Components/UserCard",
  decorators: [ResultDecorator()],
};
```

## Subpath Exports

| Import | Description |
|--------|-------------|
| `@hex-di/result-react` | Components, hooks, utilities |
| `@hex-di/result-react/adapters` | TanStack Query & SWR adapters |
| `@hex-di/result-react/server` | Server-safe pure functions |
| `@hex-di/result-react/testing` | Test helpers & matchers |

Internal modules (`@hex-di/result-react/internal/*`) are blocked.

## Invariants

- All action callbacks are referentially stable across re-renders
- Async hooks abort in-flight operations on unmount and deps change
- Generation counters prevent stale responses from overwriting newer data
- Err results are values, never thrown -- no ErrorBoundary triggered
- `Match` branches have independent component state via key isolation
- React 19 hooks throw descriptively at import time on React 18
- Server utilities have no React runtime dependency
- Suspense hooks throw promises (not errors) and return `Result<T, E>`
- StrictMode compatible (double-mount safe)

## TypeScript Plugin

For compile-time and editor-time static analysis, add [`@hex-di/result-typescript-plugin`](https://www.npmjs.com/package/@hex-di/result-typescript-plugin):

```bash
npm install -D @hex-di/result-typescript-plugin
```

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@hex-di/result-typescript-plugin"
      }
    ]
  }
}
```

The plugin catches common mistakes when using `@hex-di/result` with React:

- **Must-use diagnostics** -- warns when a `Result` returned by a hook or utility is silently discarded
- **Unsafe import gating** -- flags `@hex-di/result/unsafe` imports outside allowed patterns
- **Exhaustiveness hints** -- detects incomplete error handling in `match()` calls and the `<Match>` component's type-level contract
- **Code fixes** -- quick-fix actions for wrapping in `fromAction`, converting `isOk` checks to `match`, and more
- **Code quality lints** -- suggests idiomatic patterns like `andThen` over manual `isOk` + `map`
- **Result hover** -- simplified type display showing error variants inline

For CI enforcement, use the compiler transformer with `ts-patch`. See the [plugin README](https://www.npmjs.com/package/@hex-di/result-typescript-plugin) for full configuration.

## Related Packages

| Package | Description |
|---------|-------------|
| [`@hex-di/result`](https://www.npmjs.com/package/@hex-di/result) | Core Result and Option types |
| [`@hex-di/result-testing`](https://www.npmjs.com/package/@hex-di/result-testing) | Vitest matchers and test utilities |
| [`@hex-di/result-typescript-plugin`](https://www.npmjs.com/package/@hex-di/result-typescript-plugin) | TypeScript plugin for static analysis |

## Requirements

- React >= 18.0.0 (React 19 for `useOptimisticResult` and `useResultTransition`)
- `@hex-di/result` >= 0.2.0
- TypeScript >= 5.0 (optional)

## License

MIT
