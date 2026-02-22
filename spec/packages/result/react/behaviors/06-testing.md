# 06 — Testing Utilities

> **Revision summary**: Initial version. Document control added per GxP review. For full change history, run `git log --follow --format="%h %ai %s" -- spec/packages/result/react/behaviors/06-testing.md`.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | BEH-R06 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- behaviors/06-testing.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- behaviors/06-testing.md` |
| Reviewed By | PR reviewer — `git log --merges --first-parent main --format="%b" -- behaviors/06-testing.md` (extract "Approved-by" or PR reviewer from merge commit) |
| Approved By | PR merge author — `git log --merges --first-parent main --format="%an %ai" -1 -- behaviors/06-testing.md` |
| Approval Evidence | PR merge to `main` — `git log --merges --first-parent main -- behaviors/06-testing.md` |
| Full Revision History | `git log --follow --format="%H %ai %an: %s" -- behaviors/06-testing.md` |

Test helpers and custom Vitest matchers for testing components and hooks that use `@hex-di/result-react`. Exported from `@hex-di/result-react/testing`.

## BEH-R06-001: setupResultReactMatchers

```ts
function setupResultReactMatchers(): void
```

Registers custom Vitest matchers for asserting on async hook state. Call once in a setup file.

### Custom Matchers

After calling `setupResultReactMatchers()`:

```ts
// Assert the hook is in loading state
expect(hookResult.current).toBeLoading()

// Assert the hook has resolved with an Ok
expect(hookResult.current.result).toBeOk()
expect(hookResult.current.result).toBeOk(expectedValue)

// Assert the hook has resolved with an Err
expect(hookResult.current.result).toBeErr()
expect(hookResult.current.result).toBeErr(expectedError)

// Assert the hook result is undefined (not yet resolved)
expect(hookResult.current.result).toBeUndefined()
```

These matchers complement the core library's `@hex-di/result-testing` matchers. Both can be registered in the same setup file.

### Setup

```ts
// vitest.setup.ts
import { setupResultMatchers } from "@hex-di/result-testing"
import { setupResultReactMatchers } from "@hex-di/result-react/testing"

setupResultMatchers()
setupResultReactMatchers()
```

---

## BEH-R06-002: renderWithResult

```ts
function renderWithResult(
  ui: React.ReactElement,
  options?: RenderOptions
): RenderResult
```

A wrapper around `@testing-library/react`'s `render` that provides no additional providers by default but serves as an extension point for future context needs.

### Usage

```tsx
import { renderWithResult } from "@hex-di/result-react/testing"
import { screen } from "@testing-library/react"

test("Match renders Ok branch", () => {
  const result = ok({ name: "Alice" })

  renderWithResult(
    <Match
      result={result}
      ok={(user) => <p>{user.name}</p>}
      err={(e) => <p>Error</p>}
    />
  )

  expect(screen.getByText("Alice")).toBeInTheDocument()
})
```

### Testing Async Hooks

Use `@testing-library/react`'s `renderHook` with standard `waitFor`:

```tsx
import { renderHook, waitFor } from "@testing-library/react"
import { useResultAsync } from "@hex-di/result-react"

test("useResultAsync resolves with Ok", async () => {
  const { result } = renderHook(() =>
    useResultAsync(
      () => ResultAsync.ok({ name: "Alice" }),
      []
    )
  )

  await waitFor(() => {
    expect(result.current.result).toBeOk({ name: "Alice" })
    expect(result.current.isLoading).toBe(false)
  })
})
```

---

## BEH-R06-003: createResultFixture

```ts
function createResultFixture<T>(
  defaults: T
): {
  ok: (overrides?: Partial<T>) => Ok<T, never>
  err: <E>(error: E) => Err<never, E>
  okAsync: (overrides?: Partial<T>, delay?: number) => ResultAsync<T, never>
  errAsync: <E>(error: E, delay?: number) => ResultAsync<never, E>
}
```

Factory for generating test data with consistent defaults. Reduces boilerplate in test files.

### Parameters

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `defaults` | `T` | Default values for the `Ok` variant. Overridden per-test via spread. |

### Return Value

An object with four factory functions:

| Method | Returns | Description |
| ------ | ------- | ----------- |
| `ok(overrides?)` | `Ok<T, never>` | Merges `overrides` into `defaults`, wraps in `ok()`. |
| `err(error)` | `Err<never, E>` | Wraps error in `err()`. |
| `okAsync(overrides?, delay?)` | `ResultAsync<T, never>` | Async Ok, optionally delayed (for testing loading states). |
| `errAsync(error, delay?)` | `ResultAsync<never, E>` | Async Err, optionally delayed. |

### Usage

```tsx
import { createResultFixture } from "@hex-di/result-react/testing"

const userFixture = createResultFixture({
  id: "1",
  name: "Alice",
  email: "alice@example.com",
})

test("renders user name", () => {
  renderWithResult(
    <Match
      result={userFixture.ok({ name: "Bob" })}
      ok={(user) => <p>{user.name}</p>}
      err={() => <p>Error</p>}
    />
  )
  expect(screen.getByText("Bob")).toBeInTheDocument()
})

test("useResultAsync loading → success", async () => {
  const { result } = renderHook(() =>
    useResultAsync(() => userFixture.okAsync({ name: "Carol" }, 50), [])
  )

  expect(result.current.isLoading).toBe(true)

  await waitFor(() => {
    expect(result.current.result).toBeOk({ id: "1", name: "Carol", email: "alice@example.com" })
  })
})
```

---

## BEH-R06-004: mockResultAsync

```ts
function mockResultAsync<T, E>(): {
  resultAsync: ResultAsync<T, E>
  resolve: (value: T) => void
  reject: (error: E) => void
  isSettled: () => boolean
}
```

Creates a controllable `ResultAsync` whose resolution is deferred. Useful for testing loading states, race conditions, and abort behavior without real timers.

### Resolution Contract

- `resolve(value)` and `reject(error)` may only be called once. Calling either after the mock is already settled throws an `Error("MockResultAsync already settled")`.
- `isSettled()` returns `true` after either `resolve` or `reject` has been called.
- The underlying `ResultAsync` follows the same semantics as `Promise` — single resolution, immutable once settled.

### Usage

```tsx
import { mockResultAsync } from "@hex-di/result-react/testing"

test("shows loading then resolves", async () => {
  const mock = mockResultAsync<User, ApiError>()

  const { result } = renderHook(() =>
    useResultAsync(() => mock.resultAsync, [])
  )

  // Still loading
  expect(result.current.isLoading).toBe(true)
  expect(result.current.result).toBeUndefined()

  // Resolve externally
  act(() => mock.resolve({ id: "1", name: "Alice" }))

  await waitFor(() => {
    expect(result.current.result).toBeOk({ id: "1", name: "Alice" })
    expect(result.current.isLoading).toBe(false)
  })
})

test("handles abort on unmount", () => {
  const mock = mockResultAsync<User, ApiError>()
  const { unmount } = renderHook(() =>
    useResultAsync(() => mock.resultAsync, [])
  )

  unmount()

  // Resolving after unmount should not cause state update
  act(() => mock.resolve({ id: "1", name: "Alice" }))
  // No warning, no state update
})
```

---

## BEH-R06-005: ResultDecorator

```ts
function ResultDecorator(options?: {
  initialResult?: Result<unknown, unknown>
}): StoryDecorator
```

A Storybook decorator for wrapping stories that use Result-based props. Provides a consistent testing environment.

### Usage

```tsx
// .storybook/preview.ts
import { ResultDecorator } from "@hex-di/result-react/testing"

export const decorators = [ResultDecorator()]

// UserCard.stories.tsx
export const Success: Story = {
  args: {
    result: ok({ name: "Alice", avatar: "/alice.png" }),
  },
}

export const Error: Story = {
  args: {
    result: err({ _tag: "NotFound", message: "User not found" }),
  },
}
```
