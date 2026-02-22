# Glossary

Terminology used throughout the `@hex-di/result-react` specification. Terms defined in the [core library glossary](../glossary.md) are not repeated here. GxP-contextual terms are defined at the [end of this document](#gxp-contextual-terms).

> **Printed/exported copies**: The core library glossary is located at `spec/result/glossary.md` relative to the repository root. For offline access, retrieve it via `git show HEAD:spec/result/glossary.md`.

## Match Component

A render-prop React component that accepts a `Result<T, E>` and two render functions (`ok` and `err`), rendering the appropriate branch. Enforces exhaustiveness at the type level — both props are required. See [01-components.md](behaviors/01-components.md).

## Render Prop

A React pattern where a component accepts functions as props that return `ReactNode`. Preferred over compound components for type inference and exhaustiveness enforcement. See [ADR-R006](decisions/R006-render-props-over-compound.md).

## Stable Reference

A callback or object returned by a hook whose identity does not change between renders. Achieved via `useMemo` or `useCallback` with empty dependency arrays. All action objects from hooks in this package are stable references.

## Generation Tracking

A technique for preventing stale async state updates. Each invocation of an async operation increments a generation counter. When the operation resolves, it only updates state if its generation matches the current generation. See [02-async-hooks.md](behaviors/02-async-hooks.md).

## Eager Hook

A hook that executes its async operation immediately on mount and when dependencies change. `useResultAsync` is an eager hook. Contrast with [Lazy Hook](#lazy-hook).

## Lazy Hook

A hook that does not execute its async operation automatically. Execution is triggered by calling `execute()`. `useResultAction` is a lazy hook. Contrast with [Eager Hook](#eager-hook).

## Adapter

A thin wrapper function that converts between `Result`/`ResultAsync` and the data types expected by third-party libraries (TanStack Query, SWR). Adapters live in the `@hex-di/result-react/adapters` subpath. See [ADR-R004](decisions/R004-adapter-strategy.md).

## Server Action

A React 19 / Next.js function marked with `"use server"` that runs on the server and can be called from client components. `fromAction` wraps server actions to return `ResultAsync`. See [04-utilities.md](behaviors/04-utilities.md).

## Optimistic Update

A UI pattern where the interface is updated immediately with an expected value before the server confirms the change. `useOptimisticResult` wraps React 19's `useOptimistic` to work with Result values. See [03-composition-hooks.md](behaviors/03-composition-hooks.md).

## Resource

A Suspense-compatible cache object created outside the component tree via `createResultResource`. Supports `read()` (returns Result or suspends), `preload()` (eager fetch), and `invalidate()` (cache clear). Enables the render-as-you-fetch pattern. See [02-async-hooks.md](behaviors/02-async-hooks.md).

## Transition

A React 19 concurrent feature that allows state updates to be deferred so the UI remains responsive. `useResultTransition` wraps `useTransition` to execute Result-returning async operations inside transitions. See [03-composition-hooks.md](behaviors/03-composition-hooks.md).

## Render-as-You-Fetch

A data loading pattern where fetching begins before the component that consumes the data renders. In this package, `createResultResource` enables render-as-you-fetch by allowing `preload()` to be called outside the component tree (e.g., in a route loader or event handler). The component then calls `read()` inside a Suspense boundary, which returns the Result immediately if the fetch has completed or suspends if it is still pending. Contrast with fetch-on-render (fetching inside `useEffect`) and fetch-then-render (awaiting all data before rendering). See [02-async-hooks.md](behaviors/02-async-hooks.md) and [Resource](#resource).

## Key Isolation

A technique used by the `Match` component to ensure independent React state between the `ok` and `err` branches. Each branch is rendered with a distinct React `key` prop (e.g., `key="ok"` and `key="err"`), which forces React to unmount the previous branch's component tree and mount the new branch fresh when the Result variant changes. Without key isolation, React would attempt to reconcile the previous branch's DOM with the new branch, potentially preserving stale state or refs from the wrong branch. See [01-components.md](behaviors/01-components.md).

## Retry

An optional behavior of `useResultAsync` where `Err` results are automatically re-attempted with configurable delay and predicate. Retries respect abort signals — aborting cancels all pending retries. See [INV-R8](invariants.md#inv-r8-retry-abort-propagation).

---

## GxP-Contextual Terms

The following terms are used in the [GxP compliance document](compliance/gxp.md) and have specific meanings in the context of regulatory data integrity.

### Generation Guard (GxP context)

A race condition prevention mechanism that ensures only the most recent async response updates displayed state. In a GxP context, a generation guard violation is a **data integrity risk** — if a stale (outdated) async response overwrites a newer one, the UI displays incorrect data that may inform regulated decisions (e.g., batch status, patient data). See [INV-R3](invariants.md#inv-r3-generation-guard). Classified as **High risk** per ICH Q9 assessment.

### Adapter Envelope Loss

The process by which adapter functions (`toQueryFn`, `toSwrFetcher`, etc.) discard the `Result<T, E>` wrapper when bridging to third-party libraries. The `Ok` value is unwrapped for the cache; the `Err` value is thrown as an exception. In a GxP context, this means the adapter output (e.g., TanStack Query cache) **does not preserve the branded Result** and cannot serve as an audit trail source. Consumers must capture the Result via `inspect()`/`inspectErr()` before adapter transformation. See [DRR-R3](compliance/gxp.md#data-retention-requirements).

### Phantom State Update

A React state update that occurs after the component has been unmounted or after the async operation that produced it has been superseded. In a GxP context, phantom state updates are an **operational reliability risk** — they can cause React warnings, memory leaks, or (in the worst case) display stale data to users. The abort-on-cleanup pattern ([INV-R2](invariants.md#inv-r2-abort-on-cleanup)) prevents phantom state updates by cancelling in-flight operations on unmount or dependency change.

### Unmount-Safe Audit Write

An audit logging pattern that ensures log entries are persisted even when the React component unmounts before the write completes. Standard `useEffect` cleanup runs synchronously and cannot await async writes. GxP-compliant implementations should use fire-and-forget mechanisms (`navigator.sendBeacon`, queued writes with retry) to ensure audit entries survive component unmount. See [ATR-R1](compliance/gxp.md#normative-requirements).
