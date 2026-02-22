# ADR-HCR-004: AbortController Lifecycle Management

## Status

Accepted

## Context

`useHttpRequest` and `useHttpMutation` execute asynchronous HTTP requests. Two lifecycle events require aborting in-flight requests:

1. **Component unmount** — the component is removed from the tree while a request is still in flight. Without abort, the async state update would attempt to update state on an unmounted component, producing a React warning and potentially a memory leak.

2. **Request change** (for `useHttpRequest`) — when the `request` argument to `useHttpRequest` changes between renders, the previous request's response is no longer relevant. Without abort, two state updates could race and apply in the wrong order.

The options for abort management are:

1. **AbortController per render** — create a new `AbortController` on every render; abort in `useEffect` cleanup.
2. **AbortController per request** — create a new `AbortController` each time a request is initiated; abort in cleanup or on request change.
3. **No abort** — rely on the mounted-component flag only; ignore the abort signal entirely.
4. **External signal passthrough** — require callers to provide their own `AbortSignal` via `HttpRequest.withAbortSignal()`.

## Decision

Use **option 2: AbortController per request**, created inside `useEffect`. A new `AbortController` is created each time the effect runs (on mount and on `request` change). The controller's signal is passed to the `HttpClient` call via `HttpRequest.withAbortSignal(controller.signal)`. The `useEffect` cleanup function calls `controller.abort()` before the controller goes out of scope.

```typescript
useEffect(() => {
  const controller = new AbortController();
  const req = pipe(request, HttpRequest.withAbortSignal(controller.signal));

  setState({ status: "loading", isLoading: true, result: undefined, response: undefined, error: undefined });

  client.execute(req).then(result => {
    if (!controller.signal.aborted) {
      setState(toState(result));
    }
  });

  return () => controller.abort();
}, [client, request]);
```

The `if (!controller.signal.aborted)` guard is a secondary defense against any case where the abort does not prevent the promise from resolving (e.g., the transport adapter does not support abort signals).

Option 4 (external signal passthrough) is **not** the primary mechanism — callers may still pass their own signal via `HttpRequest.withAbortSignal()`, but the hook does not require it and always creates its own controller.

## Consequences

**Positive**:
- No "Can't perform a React state update on an unmounted component" warnings.
- No stale request responses applied to the wrong component state.
- `AbortController.abort()` is idempotent — calling it multiple times (e.g., in React 18 Strict Mode double-invoke) has no side effects.
- Works with any transport adapter that respects `AbortSignal` (Fetch, Axios, Got, Ky, etc.).

**Negative**:
- If a transport adapter does not respect the abort signal, in-flight network requests continue until completion even after unmount. The state guard prevents UI corruption but not network overhead.
- Strict Mode in development double-invokes effects. The per-request controller pattern ensures each invocation is independent. This is tested explicitly.

**Trade-off accepted**: Per-request abort controllers are the standard React pattern for cancellable effects. The secondary state guard ensures correctness even when the transport adapter does not support abort. The double-invoke behavior under Strict Mode is explicitly documented in `RR-HCR-1` of `risk-assessment.md`.

**Affected invariants**: [INV-HCR-4](../invariants.md#inv-hcr-4-abort-on-unmount)

**Affected spec sections**: [§15.5](../03-hooks.md), [§17.8](../03-hooks.md), [§18.1–§18.4](../03-hooks.md)
