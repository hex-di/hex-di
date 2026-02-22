# Test Strategy

> **Revision summary**: Initial version. INV-R11 added to invariant verification map per GxP review. INV-R12 added, INV-R3/R5/R7 expanded per coverage review. For full change history, run `git log --follow --format="%h %ai %s" -- spec/packages/result/react/process/test-strategy.md`.

Testing approach for `@hex-di/result-react`, aligned with the [core library's test strategy](../../process/test-strategy.md).

## Test Pyramid

| Level | Tool | Pattern | Purpose |
| ----- | ---- | ------- | ------- |
| Level 1: Unit | Vitest + React Testing Library | `*.test.ts` / `*.test.tsx` | Component and hook runtime behavior |
| Level 2: Type | Vitest typecheck | `*.test-d.ts` / `*.test-d.tsx` | Generic inference, overload selection, exhaustiveness |
| Level 3: Integration | Vitest + React Testing Library | `integration/*.test.tsx` | Full component trees with async hooks |
| Level 4: GxP Integrity | Vitest + React Testing Library | `gxp/*.test.tsx` | High-risk invariant verification under adversarial conditions |

## Level 1: Unit Tests

### Component Tests

Test the `Match` component renders the correct branch:

```tsx
// tests/unit/components/match.test.tsx
describe("Match", () => {
  it("renders ok branch when result is Ok", () => {
    render(
      <Match
        result={ok(42)}
        ok={(n) => <p data-testid="ok">{n}</p>}
        err={(e) => <p data-testid="err">{e}</p>}
      />
    )
    expect(screen.getByTestId("ok")).toHaveTextContent("42")
    expect(screen.queryByTestId("err")).not.toBeInTheDocument()
  })

  it("renders err branch when result is Err", () => {
    render(
      <Match
        result={err("fail")}
        ok={(n) => <p data-testid="ok">{n}</p>}
        err={(e) => <p data-testid="err">{e}</p>}
      />
    )
    expect(screen.getByTestId("err")).toHaveTextContent("fail")
    expect(screen.queryByTestId("ok")).not.toBeInTheDocument()
  })

  it("unmounts previous branch on variant change", () => {
    // Tests key isolation (key="ok" vs key="err")
  })
})
```

### Hook Tests

Test hooks using `renderHook` from React Testing Library:

```tsx
// tests/unit/hooks/use-result.test.ts
describe("useResult", () => {
  it("starts as undefined when no initial value", () => {
    const { result } = renderHook(() => useResult<string, Error>())
    expect(result.current.result).toBeUndefined()
  })

  it("starts with initial value when provided", () => {
    const { result } = renderHook(() => useResult(ok("hello")))
    expect(result.current.result).toBeOk("hello")
  })

  it("setOk updates to Ok", () => {
    const { result } = renderHook(() => useResult<string, Error>())
    act(() => result.current.setOk("world"))
    expect(result.current.result).toBeOk("world")
  })

  it("actions are referentially stable", () => {
    const { result, rerender } = renderHook(() => useResult<string, Error>())
    const first = result.current.setOk
    rerender()
    expect(result.current.setOk).toBe(first)
  })
})
```

### Async Hook Tests

```tsx
// tests/unit/hooks/use-result-async.test.ts
describe("useResultAsync", () => {
  it("sets isLoading to true during fetch", () => { ... })
  it("sets result to Ok on success", async () => { ... })
  it("sets result to Err on failure", async () => { ... })
  it("aborts on unmount", async () => { ... })
  it("aborts previous request on deps change", async () => { ... })
  it("handles strict mode double-mount", async () => { ... })
  it("refetch re-executes the operation", async () => { ... })
  it("discards stale responses via generation tracking", async () => { ... })
})
```

### Action Hook Tests

```tsx
// tests/unit/hooks/use-result-action.test.ts
describe("useResultAction", () => {
  it("starts with result undefined and isLoading false", () => { ... })
  it("sets isLoading to true during execute", async () => { ... })
  it("sets result to Ok on success", async () => { ... })
  it("sets result to Err on failure", async () => { ... })
  it("execute returns the resolved Result for inline use", async () => { ... })
  it("aborts previous request when execute is called again", async () => { ... })
  it("discards stale responses via generation tracking", async () => { ... })
  it("reset clears result and aborts in-flight operation", async () => { ... })
  it("aborts on unmount", async () => { ... })
  it("execute and reset are referentially stable", () => { ... })
})
```

### Suspense Hook Tests

```tsx
// tests/unit/hooks/use-result-suspense.test.tsx
describe("useResultSuspense", () => {
  it("throws promise to trigger Suspense while pending", async () => { ... })
  it("returns Result<T, E> after resolution — never undefined", async () => { ... })
  it("returns Err result without throwing to error boundary", async () => { ... })
  it("re-suspends when deps change", async () => { ... })
  it("works with React 19 use() hook when available", async () => { ... })
})
```

### Resource Tests

```tsx
// tests/unit/hooks/create-result-resource.test.tsx
describe("createResultResource", () => {
  it("does not call fn on creation", () => { ... })
  it("preload triggers fn immediately", async () => { ... })
  it("read throws promise when pending", () => { ... })
  it("read returns Result after resolution", async () => { ... })
  it("invalidate clears cache — next read re-fetches", async () => { ... })
  it("multiple resources maintain independent caches", async () => { ... })
})
```

### Composition Hook Tests

```tsx
// tests/unit/hooks/use-optimistic-result.test.ts
describe("useOptimisticResult", () => {
  it("returns authoritative result when no optimistic update", () => { ... })
  it("returns optimistic result during transition", async () => { ... })
  it("reverts to authoritative result when transition completes", async () => { ... })
  it("throws descriptive error at import time on React 18", () => { ... })
})

// tests/unit/hooks/use-safe-try.test.ts
describe("useSafeTry", () => {
  it("sets isLoading to true during generator execution", () => { ... })
  it("returns Ok result on successful generator completion", async () => { ... })
  it("short-circuits to Err on first failed yield", async () => { ... })
  it("aborts on unmount via signal", async () => { ... })
  it("aborts on deps change via signal", async () => { ... })
  it("supports async generators with sequential await", async () => { ... })
})

// tests/unit/hooks/use-result-transition.test.ts
describe("useResultTransition", () => {
  it("starts with result undefined and isPending false", () => { ... })
  it("sets isPending to true during transition", async () => { ... })
  it("sets result to Ok on success", async () => { ... })
  it("sets result to Err on failure", async () => { ... })
  it("throws descriptive error at import time on React 18", () => { ... })
})
```

### Utility Tests

```tsx
// tests/unit/utilities/from-action.test.ts
describe("fromAction", () => {
  it("wraps successful async function in Ok", async () => { ... })
  it("wraps rejected async function in Err via mapErr", async () => { ... })
  it("preserves argument types from original function", async () => { ... })
  it("returns ResultAsync, not Promise<Result>", async () => { ... })
})
```

### Adapter Tests

```tsx
// tests/unit/adapters/tanstack-query.test.ts
describe("toQueryFn (BEH-R05-001)", () => {
  it("resolves with Ok value", async () => { ... })
  it("throws Err value", async () => { ... })
})

describe("toQueryOptions (BEH-R05-002)", () => {
  it("returns object with queryKey and queryFn", () => { ... })
  it("queryFn unwraps identically to toQueryFn", async () => { ... })
})

describe("toMutationFn (BEH-R05-004)", () => {
  it("resolves with Ok value", async () => { ... })
  it("throws Err value", async () => { ... })
})

describe("toMutationOptions (BEH-R05-005)", () => {
  it("returns object with mutationFn", () => { ... })
  it("merges additional options", () => { ... })
  it("mutationFn unwraps identically to toMutationFn", async () => { ... })
})

// tests/unit/adapters/swr.test.ts
describe("toSwrFetcher (BEH-R05-003)", () => {
  it("resolves with Ok value", async () => { ... })
  it("throws Err value", async () => { ... })
  it("passes key argument through to fn", async () => { ... })
})
```

### Testing Utility Tests

```tsx
// tests/unit/testing/matchers.test.ts
describe("setupResultReactMatchers (BEH-R06-001)", () => {
  it("registers toBeLoading matcher", () => { ... })
  it("toBeLoading passes when isLoading is true", () => { ... })
  it("toBeLoading fails when isLoading is false", () => { ... })
})

// tests/unit/testing/render-helpers.test.tsx
describe("renderWithResult (BEH-R06-002)", () => {
  it("renders component with default options", () => { ... })
  it("accepts custom render options", () => { ... })
})

// tests/unit/testing/fixtures.test.ts
describe("createResultFixture (BEH-R06-003)", () => {
  it("ok() merges overrides into defaults", () => { ... })
  it("err() wraps error value", () => { ... })
  it("okAsync() returns delayed ResultAsync", async () => { ... })
  it("errAsync() returns delayed ResultAsync Err", async () => { ... })
})

// tests/unit/testing/mocks.test.ts
describe("mockResultAsync (BEH-R06-004)", () => {
  it("creates unresolved ResultAsync", () => { ... })
  it("resolve settles with Ok", async () => { ... })
  it("reject settles with Err", async () => { ... })
  it("throws if resolved twice", () => { ... })
  it("isSettled returns correct state", () => { ... })
})

// tests/unit/testing/storybook.test.ts
describe("ResultDecorator (BEH-R06-005)", () => {
  it("wraps story without error", () => { ... })
  it("accepts initialResult option", () => { ... })
})
```

### Server Utility Tests

```tsx
// tests/unit/server/match-result.test.ts
describe("matchResult (BEH-R07-001)", () => {
  it("calls ok handler for Ok result", () => { ... })
  it("calls err handler for Err result", () => { ... })
  it("returns handler return value", () => { ... })
  it("works without React runtime dependency", () => { ... })
})

// tests/unit/server/match-result-async.test.ts
describe("matchResultAsync (BEH-R07-002)", () => {
  it("awaits ResultAsync then calls ok handler", async () => { ... })
  it("awaits ResultAsync then calls err handler", async () => { ... })
  it("accepts Promise<Result> as input", async () => { ... })
  it("supports async handler functions", async () => { ... })
})

// tests/unit/server/match-option.test.ts
describe("matchOption (BEH-R07-003)", () => {
  it("calls some handler for Some option", () => { ... })
  it("calls none handler for None option", () => { ... })
})

// tests/unit/server/result-action.test.ts
describe("resultAction (BEH-R07-004)", () => {
  it("wraps successful action in Ok", async () => { ... })
  it("wraps rejected action in Err via mapErr", async () => { ... })
  it("returns Promise<Result>, not ResultAsync", async () => { ... })
  it("preserves argument types from original action", async () => { ... })
})
```

## Level 2: Type Tests

Verify generic inference and exhaustiveness at the type level.

### Component Type Tests

```tsx
// tests/types/match.test-d.tsx
import { expectTypeOf } from "vitest"

test("Match infers T and E from result prop", () => {
  const result: Result<number, string> = ok(42)
  ;<Match
    result={result}
    ok={(value) => {
      expectTypeOf(value).toEqualTypeOf<number>()
      return null
    }}
    err={(error) => {
      expectTypeOf(error).toEqualTypeOf<string>()
      return null
    }}
  />
})
```

### Hook Type Tests

```tsx
// tests/types/hooks.test-d.ts
test("useResult without initial infers undefined union", () => {
  const { result } = useResult<string, Error>()
  expectTypeOf(result).toEqualTypeOf<Result<string, Error> | undefined>()
})

test("useResult with initial infers defined", () => {
  const { result } = useResult(ok("hello"))
  expectTypeOf(result).toEqualTypeOf<Result<string, never>>()
})

test("useResultAsync returns Result | undefined", () => {
  const { result } = useResultAsync(
    (signal) => ResultAsync.ok("data"),
    []
  )
  expectTypeOf(result).toEqualTypeOf<Result<string, never> | undefined>()
})

test("useResultAction infers argument types after signal", () => {
  const { execute } = useResultAction(
    (signal: AbortSignal, id: string, name: string) => ResultAsync.ok({ id, name })
  )
  expectTypeOf(execute).toEqualTypeOf<
    (id: string, name: string) => Promise<Result<{ id: string; name: string }, never>>
  >()
})

test("useResultSuspense returns Result, never undefined", () => {
  // Inside a Suspense boundary — return type is always defined
  const result = useResultSuspense(
    () => ResultAsync.ok("data"),
    []
  )
  expectTypeOf(result).toEqualTypeOf<Result<string, never>>()
})

test("useSafeTry returns Result | undefined", () => {
  const { result } = useSafeTry(
    function* () { return ok("done") },
    []
  )
  expectTypeOf(result).toEqualTypeOf<Result<string, never> | undefined>()
})

test("useOptimisticResult preserves Result type", () => {
  const { result } = useOptimisticResult(
    ok("hello"),
    (_current, optimistic) => ok(optimistic)
  )
  expectTypeOf(result).toEqualTypeOf<Result<string, never>>()
})

test("useResultTransition returns Result | undefined", () => {
  const { result, isPending } = useResultTransition<string, Error>()
  expectTypeOf(result).toEqualTypeOf<Result<string, Error> | undefined>()
  expectTypeOf(isPending).toEqualTypeOf<boolean>()
})
```

### Utility Type Tests

```tsx
// tests/types/utilities.test-d.ts
test("fromAction preserves argument types and returns ResultAsync", () => {
  const safe = fromAction(
    async (id: string, name: string) => ({ id, name }),
    (e) => ({ _tag: "ActionError" as const, cause: e })
  )
  expectTypeOf(safe).toEqualTypeOf<
    (id: string, name: string) => ResultAsync<{ id: string; name: string }, { _tag: "ActionError"; cause: unknown }>
  >()
})
```

### Adapter Type Tests

```tsx
// tests/types/adapters.test-d.ts
test("toQueryFn returns () => Promise<T>, not () => Promise<Result<T, E>>", () => {
  const queryFn = toQueryFn(() => ResultAsync.ok({ id: "1" }))
  expectTypeOf(queryFn).toEqualTypeOf<() => Promise<{ id: string }>>()
})

test("toQueryOptions returns object with queryKey and queryFn", () => {
  const options = toQueryOptions(["user", "1"], () => ResultAsync.ok({ id: "1" }))
  expectTypeOf(options.queryKey).toEqualTypeOf<readonly unknown[]>()
  expectTypeOf(options.queryFn).toEqualTypeOf<() => Promise<{ id: string }>>()
})

test("toSwrFetcher preserves key type", () => {
  const fetcher = toSwrFetcher((key: string) => ResultAsync.ok({ data: key }))
  expectTypeOf(fetcher).toEqualTypeOf<(key: string) => Promise<{ data: string }>>()
})

test("toMutationFn preserves argument type", () => {
  const mutationFn = toMutationFn((args: { name: string }) => ResultAsync.ok({ id: "1" }))
  expectTypeOf(mutationFn).toEqualTypeOf<(args: { name: string }) => Promise<{ id: string }>>()
})
```

### Server Utility Type Tests

```tsx
// tests/types/server.test-d.ts
test("matchResult infers return type union from handlers", () => {
  const result: Result<number, string> = ok(42)
  const output = matchResult(result, {
    ok: (value) => ({ type: "success" as const, value }),
    err: (error) => ({ type: "failure" as const, error }),
  })
  expectTypeOf(output).toEqualTypeOf<
    { type: "success"; value: number } | { type: "failure"; error: string }
  >()
})

test("matchResultAsync returns Promise of handler union", () => {
  const output = matchResultAsync(ResultAsync.ok(42), {
    ok: (value) => value.toString(),
    err: (error) => "failed",
  })
  expectTypeOf(output).toEqualTypeOf<Promise<string>>()
})

test("matchOption infers from some and none handlers", () => {
  const option: Option<string> = Some("hello")
  const output = matchOption(option, {
    some: (value) => value.length,
    none: () => 0,
  })
  expectTypeOf(output).toEqualTypeOf<number>()
})

test("resultAction returns Promise<Result>, not ResultAsync", () => {
  const action = resultAction(
    async (id: string) => ({ id }),
    (e) => ({ _tag: "Error" as const })
  )
  expectTypeOf(action).toEqualTypeOf<
    (id: string) => Promise<Result<{ id: string }, { _tag: "Error" }>>
  >()
})
```

## Level 3: Integration Tests

Full component trees with async hooks, testing realistic user flows:

```tsx
// tests/integration/async-flow.test.tsx
describe("async data flow", () => {
  it("renders loading → success → refetch → success", async () => {
    // Renders a component using useResultAsync + Match
    // Verifies the full lifecycle from loading state through resolution
  })

  it("renders loading → error → retry → success", async () => {
    // Tests error recovery via refetch
  })
})

// tests/integration/retry-flow.test.tsx
describe("retry with backoff", () => {
  it("renders loading → error → retry(1) → retry(2) → success", async () => {
    // useResultAsync with retry: 2, retryDelay: exponential
    // Verifies isLoading stays true during retries, result set only after final resolution
  })

  it("abort cancels pending retries", async () => {
    // useResultAsync with retry: 3, unmount during retry delay
    // Verifies no further fn() calls after abort
  })
})

// tests/integration/resource-suspense.test.tsx
describe("createResultResource + Suspense", () => {
  it("preload → read → resolve → render", async () => {
    // Creates resource, preloads, wraps component in Suspense
    // Verifies fallback shown while pending, result rendered after resolution
  })

  it("invalidate → re-suspend → resolve", async () => {
    // Creates resource, resolves, invalidates, verifies re-suspension
  })
})

// tests/integration/safe-try-flow.test.tsx
describe("useSafeTry sequential composition", () => {
  it("renders loading → sequential fetches → success", async () => {
    // Three sequential yield* operations with Match rendering
  })

  it("short-circuits on first Err", async () => {
    // Second yield* returns Err, third is never called
  })
})

// tests/integration/react19-hooks.test.tsx
describe("useOptimisticResult + useResultAction", () => {
  it("optimistic update reverts to authoritative result on transition completion", async () => {
    // Component with useOptimisticResult wrapping server state
    // startTransition → setOptimistic → server action completes
    // Verify: optimistic value shown during transition, authoritative value after
  })

  it("optimistic update reverts on server action failure", async () => {
    // startTransition → setOptimistic → server action returns Err
    // Verify: optimistic value reverted, authoritative value restored
  })
})

describe("useResultTransition + Match", () => {
  it("isPending true during transition, result updated after", async () => {
    // startResultTransition with async ResultAsync
    // Verify: isPending true while in flight, result set and isPending false after
  })

  it("new transition supersedes previous pending transition", async () => {
    // Start transition A, then start transition B before A resolves
    // Verify: result reflects B, not A
  })
})

// tests/integration/server-client-boundary.test.ts
describe("server-client boundary", () => {
  it("matchResult renders correct branch in non-hook context", () => {
    // Tests matchResult as a pure function returning ReactNode
  })

  it("matchResultAsync awaits and renders correct branch", async () => {
    // Tests matchResultAsync with a ResultAsync input
    // Verify: awaits resolution, returns correct handler output
  })

  it("matchOption renders some/none branches correctly", () => {
    // Tests matchOption with Some and None inputs
    // Verify: some handler called for Some, none handler called for None
  })

  it("resultAction wraps server action correctly", async () => {
    // Tests resultAction returns Promise<Result>, not ResultAsync
  })

  it("server exports have no React runtime dependency", () => {
    // Import @hex-di/result-react/server in a non-React context
    // Verify: no errors, no React import side effects
  })
})
```

## Test File Map

### Unit + Type Test Files

| Behavior Spec | Unit Test File(s) | Type Test File(s) |
| ------------- | ----------------- | ----------------- |
| [01-components.md](../behaviors/01-components.md) | `tests/unit/components/match.test.tsx` | `tests/types/match.test-d.tsx` |
| [02-async-hooks.md](../behaviors/02-async-hooks.md) | `tests/unit/hooks/use-result-async.test.ts`, `tests/unit/hooks/use-result-action.test.ts`, `tests/unit/hooks/use-result-suspense.test.tsx`, `tests/unit/hooks/create-result-resource.test.tsx` | `tests/types/hooks.test-d.ts` |
| [03-composition-hooks.md](../behaviors/03-composition-hooks.md) | `tests/unit/hooks/use-result.test.ts`, `tests/unit/hooks/use-optimistic-result.test.ts`, `tests/unit/hooks/use-safe-try.test.ts`, `tests/unit/hooks/use-result-transition.test.ts` | `tests/types/hooks.test-d.ts` |
| [04-utilities.md](../behaviors/04-utilities.md) | `tests/unit/utilities/from-action.test.ts` | `tests/types/utilities.test-d.ts` |
| [05-adapters.md](../behaviors/05-adapters.md) | `tests/unit/adapters/tanstack-query.test.ts`, `tests/unit/adapters/swr.test.ts` | `tests/types/adapters.test-d.ts` |
| [06-testing.md](../behaviors/06-testing.md) | `tests/unit/testing/matchers.test.ts`, `tests/unit/testing/render-helpers.test.tsx`, `tests/unit/testing/fixtures.test.ts`, `tests/unit/testing/mocks.test.ts`, `tests/unit/testing/storybook.test.ts` | N/A — testing utilities are infrastructure, not public API types |
| [07-server.md](../behaviors/07-server.md) | `tests/unit/server/match-result.test.ts`, `tests/unit/server/match-result-async.test.ts`, `tests/unit/server/match-option.test.ts`, `tests/unit/server/result-action.test.ts` | `tests/types/server.test-d.ts` |

> **Note on BEH-R07-005**: "use client" Boundary Guidance is a non-functional guidance section. It is verified by build checks (no `"use client"` in `/server` exports) and server boundary integration tests (INV-R10), not by a dedicated test file.

### Adapter Requirement-to-File Mapping

The 5 adapter requirements are grouped by third-party library:

| Requirement | Function | Test File |
| ----------- | -------- | --------- |
| BEH-R05-001 | `toQueryFn` | `tests/unit/adapters/tanstack-query.test.ts` |
| BEH-R05-002 | `toQueryOptions` | `tests/unit/adapters/tanstack-query.test.ts` |
| BEH-R05-003 | `toSwrFetcher` | `tests/unit/adapters/swr.test.ts` |
| BEH-R05-004 | `toMutationFn` | `tests/unit/adapters/tanstack-query.test.ts` |
| BEH-R05-005 | `toMutationOptions` | `tests/unit/adapters/tanstack-query.test.ts` |

### Integration Test Files

| Test File | Behavior Specs Covered | Invariants Verified |
| --------- | ---------------------- | ------------------- |
| `tests/integration/async-flow.test.tsx` | BEH-R02-001, BEH-R01-001 | INV-R2, INV-R3 |
| `tests/integration/retry-flow.test.tsx` | BEH-R02-001 | INV-R8 |
| `tests/integration/resource-suspense.test.tsx` | BEH-R02-003, BEH-R02-004 | INV-R6, INV-R9 |
| `tests/integration/safe-try-flow.test.tsx` | BEH-R03-003 | INV-R2 |
| `tests/integration/react19-hooks.test.tsx` | BEH-R03-002, BEH-R03-004 | INV-R11 |
| `tests/integration/server-client-boundary.test.ts` | BEH-R07-001, BEH-R07-002, BEH-R07-003, BEH-R07-004 | INV-R10 |

### GxP Integrity Test Files

| Test File | Requirement/Invariant | Purpose |
| --------- | --------------------- | ------- |
| `tests/gxp/stale-data-prevention.test.tsx` | INV-R3 | Adversarial timing scenarios for generation guard |
| `tests/gxp/error-as-value.test.tsx` | INV-R4 | No exception promotion across all hooks/components |
| `tests/gxp/adapter-envelope.test.ts` | DRR-R3 | Result envelope unwrap contract for all adapters |

## Invariant Verification Map

| Invariant | Verified By |
| --------- | ----------- |
| [INV-R1](../invariants.md#inv-r1-stable-action-references) | `use-result.test.ts` — referential equality across renders |
| [INV-R2](../invariants.md#inv-r2-abort-on-cleanup) | `use-result-async.test.ts` — abort signal on unmount; `use-result-action.test.ts` — per-execution abort; `use-safe-try.test.ts` — abort on cleanup; `async-flow.test.tsx`, `safe-try-flow.test.tsx` — integration |
| [INV-R3](../invariants.md#inv-r3-generation-guard) | `use-result-async.test.ts` — stale response rejection; `use-result-action.test.ts` — generation tracking across executions; `use-safe-try.test.ts` — generation guard in generator; `async-flow.test.tsx`, `safe-try-flow.test.tsx` — integration; `gxp/stale-data-prevention.test.tsx` — adversarial timing scenarios |
| [INV-R4](../invariants.md#inv-r4-no-exception-promotion) | Architecture-level; verified by absence of error boundaries in tests; `gxp/error-as-value.test.tsx` — explicit verification that no hook or component throws |
| [INV-R5](../invariants.md#inv-r5-match-exhaustiveness) | `match.test.tsx`, `match-result.test.ts`, `match-result-async.test.ts`, `match-option.test.ts` — exhaustiveness enforcement; `match.test-d.tsx`, `server.test-d.ts` — type-level exhaustiveness |
| [INV-R6](../invariants.md#inv-r6-suspense-contract) | `use-result-suspense.test.tsx` — Suspense boundary rendering |
| [INV-R7](../invariants.md#inv-r7-strict-mode-compatibility) | `use-result-async.test.ts` — StrictMode double-mount test; `strict-mode.test.tsx` — dedicated StrictMode integration |
| [INV-R8](../invariants.md#inv-r8-retry-abort-propagation) | `use-result-async.test.ts` — retry cancellation on abort/unmount |
| [INV-R9](../invariants.md#inv-r9-resource-cache-isolation) | `create-result-resource.test.tsx` — independent cache lifecycle |
| [INV-R10](../invariants.md#inv-r10-server-utility-purity) | `match-result.test.ts`, `result-action.test.ts` — no React runtime dependency |
| [INV-R11](../invariants.md#inv-r11-react-version-fail-fast) | `use-optimistic-result.test.ts`, `use-result-transition.test.ts` — import-time error on React 18; `react19-hooks.test.tsx` — integration |
| [INV-R12](../invariants.md#inv-r12-match-branch-state-independence) | `match.test.tsx` — branch isolation via distinct key props; `async-flow.test.tsx` — integration |

## Level 4: GxP Integrity Tests

Dedicated tests for High-risk invariants (INV-R3 and INV-R4) that verify correct behavior under adversarial conditions beyond standard unit and integration test coverage. These tests exist because violations of INV-R3 and INV-R4 directly affect data integrity in GxP contexts — see [compliance/gxp.md](../compliance/gxp.md) for the risk assessment.

### `gxp/stale-data-prevention.test.tsx` — INV-R3

Verifies that the generation guard prevents stale data display under adversarial timing conditions that standard unit tests may not cover:

```tsx
// tests/gxp/stale-data-prevention.test.tsx
describe("INV-R3: Generation guard under adversarial timing", () => {
  it("discards slow first response when fast second response arrives first", async () => {
    // Request A takes 500ms, Request B takes 50ms
    // Deps change from A → B; B resolves first
    // Verify: displayed value is B's response, not A's
  })

  it("handles 10 rapid dependency changes — only last response displayed", async () => {
    // 10 dependency changes in <100ms
    // Each request resolves at a different delay (random order)
    // Verify: final displayed value matches the 10th request
  })

  it("generation counter survives React StrictMode double-mount", async () => {
    // StrictMode wrapper causes double effect execution
    // Verify: generation tracking is correct despite double-mount
    // Verify: no stale data from the first mount's request
  })

  it("concurrent useResultAsync instances do not share generation state", async () => {
    // Two useResultAsync hooks in the same component with different deps
    // Verify: stale response rejection is independent per hook instance
  })
})
```

### `gxp/error-as-value.test.tsx` — INV-R4

Verifies that no component or hook in the package promotes throwing as an error handling pattern:

```tsx
// tests/gxp/error-as-value.test.tsx
describe("INV-R4: No exception promotion", () => {
  it("Match renders Err branch without triggering error boundary", () => {
    // Wrap Match in an ErrorBoundary that records caught errors
    // Render with err("validation_failed")
    // Verify: ErrorBoundary NOT triggered; err branch renders
  })

  it("useResultAsync sets Err result without throwing", async () => {
    // fn returns ResultAsync.err("fetch_failed")
    // Verify: result.isErr() === true; no unhandled exceptions
  })

  it("useResultAction sets Err result without throwing", async () => {
    // execute() with fn that returns ResultAsync.err("action_failed")
    // Verify: result.isErr() === true; no unhandled exceptions
  })

  it("useResultSuspense returns Err result without triggering error boundary", async () => {
    // fn resolves to Err; wrapped in Suspense + ErrorBoundary
    // Verify: ErrorBoundary NOT triggered; Err result available
  })

  it("useSafeTry short-circuits to Err without throwing", async () => {
    // Generator yields Err at second step
    // Verify: result.isErr() === true; third step never called; no exceptions
  })
})
```

### `gxp/adapter-envelope.test.ts` — DRR-R3

Verifies that adapter functions correctly unwrap the Result envelope and that JSDoc guidance for pre-adapter logging is present:

```tsx
// tests/gxp/adapter-envelope.test.ts
describe("DRR-R3: Adapter envelope unwrap", () => {
  it("toQueryFn returns Ok value directly, not wrapped in Result", async () => {
    // fn returns ResultAsync.ok({ id: "1", name: "Alice" })
    // Verify: queryFn() resolves to { id: "1", name: "Alice" }, not Ok({ ... })
  })

  it("toQueryFn throws Err value directly, not wrapped in Result", async () => {
    // fn returns ResultAsync.err({ _tag: "NotFound" })
    // Verify: queryFn() rejects with { _tag: "NotFound" }, not Err({ ... })
  })

  it("toSwrFetcher unwraps Ok and throws Err identically to toQueryFn", async () => {
    // Same unwrap contract as toQueryFn
  })

  it("toMutationFn unwraps Ok and throws Err identically to toQueryFn", async () => {
    // Same unwrap contract as toQueryFn
  })

  it("toQueryOptions produces queryFn with same unwrap contract", async () => {
    // Verify: toQueryOptions(...).queryFn behaves identically to toQueryFn(...)
  })

  it("toMutationOptions produces mutationFn with same unwrap contract", async () => {
    // Verify: toMutationOptions(...).mutationFn behaves identically to toMutationFn(...)
  })
})
```

## GxP Traceability

The GxP compliance document ([compliance/gxp.md](../compliance/gxp.md)) provides the full requirement traceability matrix mapping BEH-RXX-NNN requirement IDs and INV-RN invariants to test files. The matrix includes:

- **Forward traceability**: Every BEH-RXX-NNN ID (25 requirements) maps to at least one test file
- **Backward traceability**: Every test file maps back to a BEH-RXX-NNN or INV-RN identifier
- **ADR forward traceability**: Every ADR-RNNN maps to affected invariants and behavior specs
- **ATR-RN / DRR-RN traceability**: Audit trail and data retention requirements map to verification mechanisms

See [compliance/gxp.md § Requirement Traceability Matrix](../compliance/gxp.md#requirement-traceability-matrix) for the complete matrix.
