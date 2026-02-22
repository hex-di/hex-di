# ADR-HCR-005: SSR (Server-Side Rendering) Handling

## Status

Accepted

## Context

`@hex-di/http-client-react` is used in applications that may render in both browser and server environments (SSR/SSG via Next.js, Remix, Astro, etc.). SSR introduces several constraints:

1. **`useEffect` does not run on the server** — effects are browser-only. Hooks that execute requests inside `useEffect` will not prefetch data during SSR; components will render in the initial idle state.

2. **React Context works on the server** — `createContext` and `useContext` are supported in SSR. `HttpClientProvider` and `useHttpClient()` function correctly during server rendering.

3. **`AbortController` availability** — `AbortController` is available in Node.js 18+ (and in earlier versions via polyfill). No special handling is required for the target runtime (Node ≥ 18).

4. **Hydration mismatch risk** — if server-rendered HTML shows a loading state and client-rendered HTML shows data, React will detect a hydration mismatch. This occurs when hooks execute requests during SSR.

The options for SSR handling are:

1. **Client-only execution** — all requests run in `useEffect` (browser-only). Server renders the idle state. Client hydrates, then fetches. This is the simplest approach.

2. **Suspense/RSC integration** — provide Suspense-compatible resource adapters or React Server Component support for prefetching.

3. **Optional SSR request execution** — allow hooks to accept a pre-fetched `Result` prop for hydration.

## Decision

`@hex-di/http-client-react` v0.1 uses **option 1: client-only request execution**. All HTTP requests are initiated in `useEffect`, which runs only in the browser. The server always renders the idle state (`status: "idle"`, `result: undefined`).

Implications:
- Server-rendered HTML will not contain data-driven content for components using `useHttpRequest`.
- There will be no hydration mismatch because both server and client start in the same idle state.
- Applications that require SSR data prefetching must use a separate mechanism outside of these hooks (e.g., `loader` functions in Remix, `getServerSideProps` in Next.js Pages Router, or React Server Components in Next.js App Router) and pass the prefetched data as props.

Options 2 and 3 are deferred to a future version. They require Suspense resource management or hydration prop APIs that significantly increase package complexity and are out of scope for v0.1.

## Consequences

**Positive**:
- Simplest possible implementation — no SSR-specific code paths.
- No hydration mismatch risk.
- Compatible with all React SSR frameworks (Next.js, Remix, Gatsby, Astro) without special configuration.
- `HttpClientProvider` works on the server — applications can pass a server-side `HttpClient` that uses different base URLs or auth tokens for SSR, even though requests do not fire.

**Negative**:
- Applications using these hooks will have a server-rendered skeleton (loading/idle state) followed by a client-side fetch waterfall. This is the same pattern used by most CSR-first libraries.
- Developers expecting prefetching from hooks need a separate data-fetching strategy for SSR.

**Trade-off accepted**: SSR data prefetching requires significant additional API surface (Suspense resources, `use()` hook integration, or hydration props). The v0.1 client-only approach is correct for the majority of use cases and provides a clean foundation for SSR extensions in a future version.

**Affected invariants**: None directly — this decision establishes a scope boundary rather than a runtime guarantee.

**Affected spec sections**: [§9](../02-provider.md), [§01-overview.md §7](../01-overview.md)
