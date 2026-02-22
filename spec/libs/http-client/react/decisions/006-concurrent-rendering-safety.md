# ADR-HCR-006: Concurrent Rendering Safety

## Status

Accepted

## Context

React 18 introduces **Concurrent Mode** features (automatic batching, transitions, `startTransition`, `useDeferredValue`, `useTransition`) that can cause component renders and effects to be interrupted, deferred, or executed multiple times. Additionally, **React Strict Mode** in development deliberately double-invokes effects to surface side-effect bugs.

These behaviors create specific challenges for hooks that manage asynchronous resources:

1. **Double effect invocation (Strict Mode)** — effects mount, unmount, and mount again during development. A hook that does not correctly clean up on the first unmount will initiate duplicate requests.

2. **State tearing** — if two renders observe different values of the same mutable state during a concurrent render pass, the UI can become inconsistent.

3. **Batched state updates** — React 18 batches `setState` calls from async sources by default. State updates in `useEffect` callbacks may be batched with other updates.

4. **Interruptible renders** — React may discard a partially-completed render and restart. Side effects in render (outside `useEffect`) execute during the discarded render, leading to leaks.

The design choices that determine concurrent safety are:

1. **Where are requests initiated?** In `useEffect` only (safe) or in render (unsafe).
2. **How is state mutation prevented after abort?** Per-request `AbortController` + `signal.aborted` check vs. mounted flag vs. cleanup only.
3. **Is context value stable?** Does re-rendering the provider create new context objects that trigger cascading re-renders?

## Decision

`@hex-di/http-client-react` v0.1 achieves concurrent rendering safety through three design commitments:

### 1. Effects-only request initiation

All HTTP requests are initiated exclusively in `useEffect`, never in render. Renders are pure — they only read state and return JSX. This ensures that React's ability to discard and restart renders (for transitions, Suspense, etc.) does not cause duplicate or orphaned requests.

### 2. AbortController + signal guard (double-safety)

As decided in [ADR-HCR-004](./004-abort-controller-lifecycle.md), each effect creates a new `AbortController`. The cleanup function aborts the controller. A `signal.aborted` guard prevents state updates from aborted requests from reaching component state.

Under Strict Mode double-invoke: the first mount creates Controller A → cleanup aborts A → second mount creates Controller B. Controller A's promise (if it resolves after abort) is filtered by the `signal.aborted` guard. Controller B proceeds normally.

### 3. Stable context value (useMemo)

As documented in INV-HCR-5 and [ADR-HCR-001](./001-context-over-props.md), `HttpClientProvider` uses `useMemo` to create a stable context object identity when `props.client` is unchanged. This prevents provider re-renders from triggering consumer re-renders, which is critical in concurrent mode where renders can be deferred and replayed.

### Explicit non-goals for v0.1

The following concurrent features are **not** supported in v0.1:

- **`startTransition` integration**: Wrapping requests in transitions is possible but not built-in. Callers can wrap their `useHttpRequest` effects in `startTransition` manually.
- **`useDeferredValue` for request debouncing**: Not built-in.
- **`Suspense` integration**: Not supported (see ADR-HCR-005).

## Consequences

**Positive**:
- Safe under React 18 Concurrent Mode for standard use cases.
- Works correctly in React Strict Mode development double-invoke without producing duplicate committed requests.
- Context stability prevents re-render cascades.
- No race condition between abort and state update (double-safety: abort + signal guard).

**Negative**:
- Not optimized for `startTransition` (requests do not participate in the transition priority queue).
- No `Suspense` integration (deferred to future version).
- Concurrent mode invariants must be maintained through code review — there is no compile-time enforcement.

**Trade-off accepted**: Full concurrent mode optimization (Suspense, transitions, deferred values) requires significant API changes. The v0.1 design is correct and safe under concurrent mode for the majority of use cases. The AbortController + signal guard double-safety ensures correctness even under aggressive Strict Mode double-invoke.

**Affected invariants**: [INV-HCR-4](../invariants.md#inv-hcr-4-abort-on-unmount), [INV-HCR-5](../invariants.md#inv-hcr-5-stable-context-value)

**Affected spec sections**: [§15.5](../03-hooks.md), [§17.8](../03-hooks.md), [§12.1–§12.2](../02-provider.md)
