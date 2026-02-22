# ADR-R003: Naming Conventions

## Status

Accepted

## Context

The React package must balance two naming conventions:

1. **Core library convention** — lowercase `camelCase` functions: `ok()`, `err()`, `fromPromise()`, `fromThrowable()`, `match()`, `andThen()`
2. **React convention** — `use*` prefix for hooks, PascalCase for components, `on*` prefix for event handler props

Specific naming decisions required:

### useResultCallback vs useResultAction

The initial proposal named the lazy async hook `useResultCallback`. This collides with React's built-in `useCallback` hook — developers may confuse the two. The core library does not use the word "callback" in its API.

### fromAction error type

The initial proposal used a hardcoded `ActionError` type. The core library's `fromPromise` and `fromAsyncThrowable` both accept a `mapErr` parameter for custom error mapping.

## Decision

1. **Hooks**: `use` + `Result` + descriptive suffix in camelCase
   - `useResult` — state management
   - `useResultAsync` — eager async
   - `useResultAction` — lazy async (not `useResultCallback`)
   - `useResultSuspense` — Suspense integration
   - `useOptimisticResult` — optimistic updates
   - `useSafeTry` — generator composition

2. **Components**: PascalCase, matching core method names
   - `Match` — corresponds to core's `.match()` method

3. **Utilities**: `from*` prefix for constructors, `to*` prefix for adapters
   - `fromAction(action, mapErr)` — constructor pattern, matches core's `fromPromise`
   - `toQueryFn(fn)` — adapter pattern
   - `toSwrFetcher(fn)` — adapter pattern

4. **Error mapping**: Always use `mapErr` parameter, never hardcoded error types.

## Consequences

**Positive**:
- No naming collisions with React built-ins
- `fromAction` is consistent with core's `from*` constructor pattern
- `to*` prefix for adapters clearly communicates "conversion to external format"
- Forced `mapErr` prevents opaque error types

**Negative**:
- `useResultAction` may initially confuse developers who associate "action" with Redux or server actions

**Trade-off accepted**: The word "action" is overloaded in the React ecosystem, but `useResultAction` is more descriptive than alternatives (`useResultTrigger`, `useResultMutation`, `useResultLazy`) and the `execute()` return method clarifies its purpose.
