# 07 — Server Utilities

> **Revision summary**: Initial version. Document control added per GxP review. For full change history, run `git log --follow --format="%h %ai %s" -- spec/packages/result/react/behaviors/07-server.md`.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | BEH-R07 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- behaviors/07-server.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- behaviors/07-server.md` |
| Reviewed By | PR reviewer — `git log --merges --first-parent main --format="%b" -- behaviors/07-server.md` (extract "Approved-by" or PR reviewer from merge commit) |
| Approved By | PR merge author — `git log --merges --first-parent main --format="%an %ai" -1 -- behaviors/07-server.md` |
| Approval Evidence | PR merge to `main` — `git log --merges --first-parent main -- behaviors/07-server.md` |
| Full Revision History | `git log --follow --format="%H %ai %an: %s" -- behaviors/07-server.md` |

Pure functions and server-specific utilities that work in React Server Components (RSC) without requiring `"use client"`. Exported from `@hex-di/result-react/server`.

## BEH-R07-001: matchResult

```ts
function matchResult<T, E, A, B>(
  result: Result<T, E>,
  handlers: { ok: (value: T) => A; err: (error: E) => B }
): A | B
```

A pure function for pattern matching on Result in server components. Unlike the `Match` component, this is not a React component — it takes a Result and a handlers object and returns a plain value.

### Parameters

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `result` | `Result<T, E>` | The result to match on. |
| `handlers` | `{ ok: (value: T) => A; err: (error: E) => B }` | Handler functions for each variant. Both required. |

### Return Value

`A | B` — the return value of whichever handler was called.

### Why Not Just `.match()`

The core library's `result.match(onOk, onErr)` works in server components already. `matchResult` exists for:
1. **Object-style handlers** — Named fields (`ok`, `err`) are clearer than positional arguments when handlers are multi-line JSX blocks. In RSC page components, handlers are often 10+ lines each, making positional args hard to read.
2. **Standalone function** — Unlike the instance method `.match()`, `matchResult` is a standalone function that can be imported independently, passed as a callback, or used in data pipelines without needing a Result instance in scope.
3. **Symmetry with `Match` component** — Client components use `<Match result={r} ok={...} err={...} />`. Server components use `matchResult(r, { ok: ..., err: ... })`. The same `ok`/`err` naming across client and server reduces cognitive overhead when moving between RSC and client code.

### Usage in Server Components

```tsx
// app/users/[id]/page.tsx (Server Component — no "use client")
import { matchResult } from "@hex-di/result-react/server"

export default async function UserPage({ params }: Props) {
  const result = await fetchUser(params.id)

  return matchResult(result, {
    ok: (user) => (
      <div>
        <h1>{user.name}</h1>
        <p>{user.email}</p>
      </div>
    ),
    err: (error) => (
      <div>
        <h1>User not found</h1>
        <p>{error.message}</p>
      </div>
    ),
  })
}
```

---

## BEH-R07-002: matchResultAsync

```ts
async function matchResultAsync<T, E, A, B>(
  resultAsync: ResultAsync<T, E> | Promise<Result<T, E>>,
  handlers: {
    ok: (value: T) => A | Promise<A>
    err: (error: E) => B | Promise<B>
  }
): Promise<A | B>
```

Async variant of `matchResult` for use in async server components. Awaits the `ResultAsync` or `Promise<Result>` before matching.

### Usage

```tsx
// app/dashboard/page.tsx (Async Server Component)
import { matchResultAsync } from "@hex-di/result-react/server"

export default async function DashboardPage() {
  return matchResultAsync(fetchDashboardData(), {
    ok: (data) => <Dashboard data={data} />,
    err: (error) => <ErrorPage code={error.status} />,
  })
}
```

---

## BEH-R07-003: matchOption

```ts
function matchOption<T, A, B>(
  option: Option<T>,
  handlers: { some: (value: T) => A; none: () => B }
): A | B
```

Pure function for Option pattern matching in server components.

### Usage

```tsx
import { matchOption } from "@hex-di/result-react/server"

export default async function ProfilePage({ params }: Props) {
  const avatar = await fetchAvatar(params.id)

  return (
    <header>
      {matchOption(avatar, {
        some: (url) => <img src={url} alt="avatar" />,
        none: () => <DefaultAvatar />,
      })}
    </header>
  )
}
```

---

## BEH-R07-004: resultAction

```ts
function resultAction<A extends unknown[], T, E>(
  action: (...args: A) => Promise<T>,
  mapErr: (error: unknown) => E
): (...args: A) => Promise<Result<T, E>>
```

Wraps a server action to return `Promise<Result<T, E>>` instead of throwing. Unlike `fromAction` (which returns `ResultAsync`), `resultAction` returns a plain `Promise<Result>` — suitable for server-side use where `ResultAsync`'s chaining methods aren't needed.

### Parameters

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `action` | `(...args: A) => Promise<T>` | The server action to wrap. |
| `mapErr` | `(error: unknown) => E` | Error mapper, consistent with core's `fromPromise`. |

### Return Value

A function `(...args: A) => Promise<Result<T, E>>`.

### Difference from `fromAction`

| | `fromAction` | `resultAction` |
|---|---|---|
| Returns | `ResultAsync<T, E>` | `Promise<Result<T, E>>` |
| Use case | Client components (chaining) | Server actions (simple await) |
| Requires | `@hex-di/result-react` | `@hex-di/result-react/server` |
| Needs `"use client"` | Yes (via hooks) | No |

### Usage

```ts
// app/actions.ts
"use server"
import { resultAction } from "@hex-di/result-react/server"

export const createPost = resultAction(
  async (title: string, body: string) => {
    const post = await db.posts.create({ title, body })
    return post
  },
  (e) => ({ _tag: "CreatePostError" as const, cause: e })
)

// Can be called from server or client:
const result = await createPost("Hello", "World")
// result: Result<Post, CreatePostError>
```

---

## BEH-R07-005: "use client" Boundary Guidance

### What requires "use client"

| Export | Requires "use client" | Reason |
| ------ | --------------------- | ------ |
| `Match` | Yes | Renders different React trees based on state |
| `useResult` | Yes | Uses `useState` |
| `useResultAsync` | Yes | Uses `useState`, `useEffect` |
| `useResultAction` | Yes | Uses `useState`, `useCallback` |
| `useResultSuspense` | Yes | Uses `use()` or throw-promise |
| `useOptimisticResult` | Yes | Uses `useOptimistic` |
| `useSafeTry` | Yes | Uses `useState`, `useEffect` |
| `useResultTransition` | Yes | Uses `useTransition` |
| `fromAction` | No* | Pure function, but returned value is typically used in client hooks |

### What works in RSC

| Export | RSC-safe | Subpath |
| ------ | -------- | ------- |
| `matchResult` | Yes | `@hex-di/result-react/server` |
| `matchResultAsync` | Yes | `@hex-di/result-react/server` |
| `matchOption` | Yes | `@hex-di/result-react/server` |
| `resultAction` | Yes | `@hex-di/result-react/server` |
| Core `result.match()` | Yes | `@hex-di/result` (no React import needed) |

### Recommended Pattern

```
Server Component (RSC)
  └── matchResult / matchResultAsync for top-level routing
      └── "use client" boundary
          └── Match component + hooks for interactive sections
```
