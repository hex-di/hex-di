# Invariants

> **Revision summary**: Initial version — INV-R1 through INV-R10. INV-R11 (React Version Fail-Fast) added per GxP review. INV-R2 clarified to document React 19-only hook abort semantics per third GxP review. Performance characterization added for INV-R2 (abort timing) and INV-R3 (generation guard overhead) per fourth GxP review. INV-R12 (Match Branch State Independence) added, INV-R3 expanded to include useSafeTry, INV-R5 expanded to include server utility exhaustiveness, INV-R6 expanded to include createResultResource.read() per coverage review. For full change history, run `git log --follow --format="%h %ai %s" -- spec/packages/result/react/invariants.md`.

Runtime guarantees and contracts enforced by the `@hex-di/result-react` implementation.

## INV-R1: Stable Action References

All action callbacks returned by hooks (`setOk`, `setErr`, `set`, `reset`, `execute`, `refetch`, `startResultTransition`, `setOptimistic`) maintain the same function identity across re-renders. Consumers can safely pass them to `useEffect` dependency arrays and memoized child components without causing unnecessary re-renders.

**Source**: Hook implementations use `useMemo` or `useCallback` with stable dependency arrays, or inherit stability from React's built-in hooks (`useOptimistic` dispatch, `useTransition`'s `startTransition`).

**Implication**: Components receiving actions as props can use `React.memo` effectively. Effects depending on actions do not re-run spuriously.

## INV-R2: Abort on Cleanup

All async hooks that accept an `AbortSignal` abort in-flight operations via `AbortController.abort()`:

- **`useResultAsync`**: Aborts when the component unmounts or the dependency array changes (new request supersedes the old one). Implemented via `useEffect` cleanup.
- **`useResultAction`**: Aborts the previous operation when `execute()` is called again, when `reset()` is called, or when the component unmounts. Implemented via per-execution `AbortController`.
- **`useSafeTry`**: Aborts when the component unmounts or the dependency array changes. Implemented via `useEffect` cleanup, same pattern as `useResultAsync`.

**Source**: `hooks/use-result-async.ts`, `hooks/use-result-action.ts`, and `hooks/use-safe-try.ts`.

**Note**: `useResultSuspense` and `createResultResource` do not accept an `AbortSignal` — see their respective behavior specs for rationale.

**React 19-only hooks**: `useOptimisticResult` and `useResultTransition` do not manage their own `AbortController`. `useOptimisticResult` delegates to React 19's `useOptimistic`, which reverts optimistic state when the enclosing transition completes or fails — no explicit abort is needed because optimistic state is transient by design. `useResultTransition` delegates to React 19's `useTransition`, which handles concurrent update cancellation internally. Neither hook performs direct async I/O that would require signal-based cancellation.

**Implication**: No state updates occur on unmounted components. Stale responses from superseded requests are discarded. In-flight HTTP requests are actually cancelled (not just ignored), preventing resource leaks.

**Performance characterization**: Abort signal delivery occurs within the same microtask as the `useEffect` cleanup function execution (synchronous `AbortController.abort()` call). The delay between component unmount and abort signal delivery is bounded by React's cleanup scheduling — typically within one microtask of the unmount commit. No asynchronous gap exists between the cleanup function running and the abort signal being set.

## INV-R3: Generation Guard

Async hooks track a generation counter that increments on each new invocation. When an async operation resolves, it only updates state if its generation matches the current generation. This prevents out-of-order responses from overwriting newer data.

**Source**: `hooks/use-result-async.ts`, `hooks/use-result-action.ts`, and `hooks/use-safe-try.ts` — `generationRef` pattern. `useSafeTry` uses the same generation tracking as `useResultAsync` because a stale generator that completes after deps change could write state if the abort signal is not checked between the final yield and the setState call.

**Implication**: Rapid dependency changes (e.g., fast typing in a search field) never produce stale results in the UI.

**Performance characterization**: The generation guard is a single integer comparison (`if (generation === currentGeneration)`) executed when the async operation resolves. The overhead is constant-time (O(1)) and negligible relative to the async operation itself. The generation counter is a `useRef` — incrementing it does not trigger a re-render.

## INV-R4: No Exception Promotion

No component or hook in this package promotes throwing as a primary error handling pattern. `Result` errors flow through render props and hook return values, not through exception boundaries.

**Source**: Architecture-level constraint. See [ADR-R001](decisions/R001-no-error-boundary.md).

**Implication**: Consistent with the core library's "errors as values" philosophy. Components always have explicit access to the error via the `err` render prop or `result.isErr()` check.

## INV-R5: Match Exhaustiveness

The `Match` component requires both `ok` and `err` render props at the type level. Omitting either prop produces a TypeScript compilation error.

The same exhaustiveness guarantee applies to the server utility functions:
- **`matchResult`**: Both `ok` and `err` handler properties are required in the handlers object.
- **`matchResultAsync`**: Both `ok` and `err` handler properties are required in the handlers object.
- **`matchOption`**: Both `some` and `none` handler properties are required in the handlers object.

Omitting any required handler from these functions produces a TypeScript compilation error.

**Source**: `components/match.tsx` — both props are required in the `MatchProps` interface. `server/match-result.ts`, `server/match-result-async.ts`, `server/match-option.ts` — both handler properties are required in the handlers parameter type.

**Implication**: Every `Result` rendered via `Match` or matched via server utilities has all branches handled. No silent omission of error states, whether in client components or server components.

## INV-R6: Suspense Contract

Both Suspense-integrated APIs throw a `Promise` (not an `Error`) to trigger React Suspense when the async operation is pending. Once resolved, they return `Result<T, E>` — never `undefined`. Errors are values in the `Err` branch, not thrown.

- **`useResultSuspense`**: Throws the pending promise on first render (or when deps change). Returns `Result<T, E>` after resolution.
- **`createResultResource.read()`**: Throws the pending promise if the resource is in the pending state (after `preload()` or on first `read()`). Returns `Result<T, E>` after the resource resolves.

**Source**: `hooks/use-result-suspense.ts` and `hooks/create-result-resource.ts` — both throw the pending promise for Suspense and return resolved `Result`.

**Implication**: Parent `<Suspense>` boundaries catch the thrown promise from both APIs. The resolved value is always a `Result`, consistent with [INV-R4](#inv-r4-no-exception-promotion).

## INV-R7: Strict Mode Compatibility

All hooks function correctly under React 18/19 StrictMode, which double-invokes effects in development. The generation tracking ([INV-R3](#inv-r3-generation-guard)) and abort-on-cleanup ([INV-R2](#inv-r2-abort-on-cleanup)) patterns handle the double-mount/unmount cycle without producing duplicate state updates or memory leaks.

**Source**: All effect-based hooks use the cleanup → abort → generation pattern.

**Implication**: Development and production behavior are consistent. No warnings or stale state from StrictMode double-rendering.

## INV-R8: Retry Abort Propagation

When `useResultAsync` is configured with `retry > 0`, aborting the signal (via unmount, deps change, or refetch) cancels all pending retries. No retry attempt fires after abort. The `retryDelay` timer is cleared and no further invocations of `fn` occur.

**Source**: `hooks/use-result-async.ts` — retry loop checks `signal.aborted` before each attempt and clears delay timers on abort.

**Implication**: Users can safely configure retry without risk of orphaned retry attempts continuing after the component unmounts or deps change.

## INV-R9: Resource Cache Isolation

Each `ResultResource` instance maintains its own independent cache. Calling `invalidate()` on one resource does not affect other resources. The cache lifecycle is: empty → pending (after `preload()` or first `read()`) → resolved → empty (after `invalidate()`).

**Source**: `hooks/create-result-resource.ts` — closure-scoped cache per `createResultResource` call.

**Implication**: Multiple resources can be created for different data without interference. Cache invalidation is explicit and scoped.

## INV-R10: Server Utility Purity

All exports from `@hex-di/result-react/server` are pure functions with no React hooks, no `useState`, no `useEffect`, and no dependency on the React runtime beyond JSX types. They can be called in React Server Components, server actions, API routes, or any non-React context.

**Source**: `server/*.ts` — no imports from `react` except type-level JSX types.

**Implication**: The `/server` subpath never triggers `"use client"` requirements. It can be imported in any server-side context without bundler errors.

## INV-R11: React Version Fail-Fast

Hooks that require React 19 (`useOptimisticResult`, `useResultTransition`) throw a descriptive error at import time when loaded in a React 18 environment. The failure is immediate and unambiguous — no silent degradation, no runtime-only crash on first invocation, no partial functionality.

**Source**: `hooks/use-optimistic-result.ts` and `hooks/use-result-transition.ts` — version check at module scope.

**Implication**: Consumers discover React version incompatibility during development (at import time), not in production (at first user interaction). This prevents a class of deployment errors where React 19-only hooks are shipped to a React 18 runtime and fail unpredictably.

## INV-R12: Match Branch State Independence

When the `Match` component's `result` prop changes variant (Ok → Err or Err → Ok), the previous branch's component tree is **unmounted** and the new branch is **mounted fresh** with independent state. No component state, refs, effects, or error boundaries leak between the `ok` and `err` branches.

Specifically:
- Form inputs and local state inside the `ok` branch reset when the result becomes `Err`
- Effects in each branch run independently — the `ok` branch's effects do not fire in the `err` branch
- Error boundaries inside one branch do not catch errors from the other branch
- Refs created in one branch are not accessible from the other

**Source**: `components/match.tsx` — distinct `key` props (`key="ok"` and `key="err"`) on the React fragments wrapping each branch. The `key` prop forces React to treat the two branches as distinct subtrees in the reconciler.

**Implication**: Consumers can safely use local state, forms, and effects inside Match branches without worrying about cross-branch contamination. In GxP contexts, this prevents stale data from one branch (e.g., patient data in the `ok` branch) from persisting visually when the result switches to an error state.
