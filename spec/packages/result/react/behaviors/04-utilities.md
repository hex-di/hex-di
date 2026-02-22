# 04 — Utilities

> **Revision summary**: Initial version. Document control added per GxP review. For full change history, run `git log --follow --format="%h %ai %s" -- spec/packages/result/react/behaviors/04-utilities.md`.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | BEH-R04 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- behaviors/04-utilities.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- behaviors/04-utilities.md` |
| Reviewed By | PR reviewer — `git log --merges --first-parent main --format="%b" -- behaviors/04-utilities.md` (extract "Approved-by" or PR reviewer from merge commit) |
| Approved By | PR merge author — `git log --merges --first-parent main --format="%an %ai" -1 -- behaviors/04-utilities.md` |
| Approval Evidence | PR merge to `main` — `git log --merges --first-parent main -- behaviors/04-utilities.md` |
| Full Revision History | `git log --follow --format="%H %ai %an: %s" -- behaviors/04-utilities.md` |

Standalone functions for bridging React-specific patterns with `Result`.

## BEH-R04-001: fromAction

```ts
function fromAction<A extends unknown[], T, E>(
  action: (...args: A) => Promise<T>,
  mapErr: (error: unknown) => E
): (...args: A) => ResultAsync<T, E>
```

Wraps an async function (typically a React server action) to return `ResultAsync<T, E>` instead of throwing on failure.

### Parameters

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `action` | `(...args: A) => Promise<T>` | The async function to wrap. May throw. |
| `mapErr` | `(error: unknown) => E` | Error mapper, consistent with core's `fromPromise`. |

### Return Value

A new function with the same argument signature that returns `ResultAsync<T, E>`. The returned function:
1. Calls `action(...args)`
2. If the promise resolves, wraps the value in `Ok`
3. If the promise rejects, passes the rejection reason through `mapErr` and wraps in `Err`

### Design

Follows the same pattern as the core library's `fromPromise(promise, mapErr)` and `fromAsyncThrowable(fn, mapErr)`. The `mapErr` parameter is required (not optional) to force explicit error typing. See [ADR-R003](../decisions/R003-naming-conventions.md).

The earlier API proposal used a hardcoded `ActionError` type. This was rejected in favor of the custom `mapErr` pattern for consistency with the core library and to avoid forcing consumers into a specific error shape.

### Usage

```tsx
// app/actions.ts
"use server"
export async function createPost(title: string) {
  return await db.posts.create({ title })
}

// app/create-post.tsx
"use client"
import { fromAction, useResultAction, Match } from "@hex-di/result-react"

const safeCreatePost = fromAction(
  createPost,
  (e) => ({ _tag: "CreatePostError" as const, cause: e })
)

function CreatePostForm() {
  const { result, isLoading, execute } = useResultAction(
    (signal: AbortSignal, title: string) => safeCreatePost(title)
  )

  return (
    <form onSubmit={async (e) => {
      e.preventDefault()
      const title = new FormData(e.currentTarget).get("title") as string
      await execute(title)
    }}>
      <input name="title" required />
      <button disabled={isLoading}>Create</button>
      {result && (
        <Match
          result={result}
          ok={(post) => <p>Created: {post.id}</p>}
          err={(error) => <p className="text-red-600">{String(error.cause)}</p>}
        />
      )}
    </form>
  )
}
```
