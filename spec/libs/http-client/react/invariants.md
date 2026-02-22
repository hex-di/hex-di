# @hex-di/http-client-react — Invariants

Runtime guarantees enforced by the `@hex-di/http-client-react` implementation.

---

## INV-HCR-1: Client Passthrough

`HttpClientProvider` stores and propagates the `HttpClient` instance without modification. The instance provided to the `client` prop is identical (by reference) to the instance returned by `useHttpClient()` in any descendant.

**Source**: `src/provider.tsx` — `HttpClientProvider` stores `props.client` directly in Context.

**Implication**: Combinators applied before passing to `HttpClientProvider` are visible to all descendants. Callers can rely on referential equality: `useHttpClient() === props.client` of the nearest provider.

**Related**: [§9.3](./02-provider.md), [§13.3](./03-hooks.md). FM-HCR-1 in [risk-assessment.md](./risk-assessment.md#per-invariant-fmea).

---

## INV-HCR-2: Never-Throw Hook Contract

`useHttpRequest` and `useHttpMutation` MUST NOT throw in response to network failures or `Err` Results. All errors are captured in the `result` field of the returned state object.

**Source**: `src/hooks/use-http-request.ts`, `src/hooks/use-http-mutation.ts` — `try/catch` wraps the `HttpClient` call; `Err` Results are placed in state.

**Implication**: Components consuming `useHttpRequest` or `useHttpMutation` never need a `try/catch` block to handle HTTP errors. They can rely on `state.status === "error"` and `state.error` instead.

**Related**: [§15.6](./03-hooks.md), [§17.4](./03-hooks.md), [INV-HC-7](../invariants.md#inv-hc-7-never-throw-contract). FM-HCR-2 in [risk-assessment.md](./risk-assessment.md#per-invariant-fmea).

---

## INV-HCR-3: Innermost Provider Wins

When `HttpClientProvider` components are nested, the `HttpClient` resolved by `useHttpClient()` (and all hooks that use it) is always the one from the **nearest** `HttpClientProvider` ancestor, not any outer provider.

**Source**: `src/context.ts` — standard React Context resolution semantics; inner `Provider` value shadows outer.

**Implication**: Scoped clients (e.g., an authenticated client for a sub-tree) are achievable without coordination with the outer provider. Inner providers completely shadow the outer for their subtree.

**Related**: [§9.2](./02-provider.md), [§12](./02-provider.md). FM-HCR-3 in [risk-assessment.md](./risk-assessment.md#per-invariant-fmea).

---

## INV-HCR-4: Abort on Unmount

Any in-flight HTTP request initiated by `useHttpRequest` or `useHttpMutation` is aborted when the component unmounts. State updates are not applied after unmount.

**Source**: `src/hooks/use-http-request.ts`, `src/hooks/use-http-mutation.ts` — `useEffect` cleanup aborts the `AbortController`; state update is guarded by a mounted flag.

**Implication**: No "Can't perform a React state update on an unmounted component" warnings. No leaked network requests or memory after component unmount.

**Related**: [§15.5](./03-hooks.md), [§17.8](./03-hooks.md), [§18.1–§18.3](./03-hooks.md). FM-HCR-4 in [risk-assessment.md](./risk-assessment.md#per-invariant-fmea).

---

## INV-HCR-5: Stable Context Value

When the `client` prop of `HttpClientProvider` is stable across renders (same reference), the Context value is stable. Descendant components that subscribe to the context do not re-render solely because the provider re-rendered.

**Source**: `src/provider.tsx` — `useMemo` on `props.client` ensures context object identity is preserved when `client` is unchanged.

**Implication**: Applications using `useMemo` or stable references for the `HttpClient` avoid unnecessary cascade re-renders in the consumer tree.

**Related**: [§12.1–§12.2](./02-provider.md). FM-HCR-5 in [risk-assessment.md](./risk-assessment.md#per-invariant-fmea).
