# @hex-di/http-client-react — Competitor Comparison

> **Regulatory disclaimer**: This document is informational, not normative. Feature comparisons reflect publicly documented behavior of each library. Scores are subjective assessments for architectural decision guidance.

---

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-HCR-CMP-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/react/comparisons/competitors.md` |
| Status | Effective |

---

## Compared Libraries

| Library | Package | Version | Weekly Downloads (approx.) | Stars (approx.) | Last Release |
|---------|---------|---------|--------------------------|-----------------|--------------|
| `@hex-di/http-client-react` | `@hex-di/http-client-react` | 0.1.0 | N/A (new) | N/A | 2026 |
| TanStack Query | `@tanstack/react-query` | v5.x | 4M+ | 40k+ | Active |
| SWR | `swr` | v2.x | 1M+ | 30k+ | Active |
| React `use()` + Suspense | built-in | React 19 | N/A | N/A | 2024 |
| Apollo Client | `@apollo/client` | v3.x | 1M+ | 19k+ | Active |

---

## Scoring Dimensions

| Dimension | Definition |
|-----------|-----------|
| **Type safety** | Whether error cases are typed at compile time without `any` or `unknown` casts |
| **No-throw guarantee** | Whether hooks never throw on network errors (errors are returned, not thrown) |
| **DI integration** | Whether the HTTP client is injected via a composable DI system, not a global |
| **No global cache** | Whether the library avoids a global query cache that couples components |
| **Result-typed state** | Whether error values are `Result<T, E>` vs. `error: unknown` or `error: Error` |
| **Clean architecture** | Whether domain code is free of React imports and framework coupling |
| **GxP compatibility** | Whether audit trail, immutable requests, and ALCOA+ guarantees are preserved through the hook layer |
| **Minimal bundle** | No dependency on a full data-fetching framework just for React wiring |
| **Testability** | Whether the client can be replaced in tests via the provider without global mocks |

---

## Feature Matrix

| Dimension | hex-di/http-client-react | TanStack Query v5 | SWR v2 | React `use()` | Apollo Client |
|-----------|:---:|:---:|:---:|:---:|:---:|
| **Type safety** | 10 | 8 | 7 | 6 | 7 |
| **No-throw guarantee** | 10 | 6 | 6 | 2 | 5 |
| **DI integration** | 10 | 3 | 2 | 0 | 4 |
| **No global cache** | 10 | 4 | 3 | 10 | 2 |
| **Result-typed state** | 10 | 3 | 2 | 1 | 2 |
| **Clean architecture** | 10 | 5 | 5 | 5 | 3 |
| **GxP compatibility** | 10 | 2 | 2 | 1 | 2 |
| **Minimal bundle** | 10 | 5 | 8 | 10 | 3 |
| **Testability** | 10 | 7 | 6 | 4 | 5 |
| **Weighted average** | **10.0** | **4.8** | **4.6** | **4.3** | **3.7** |

---

## Dimension-by-Dimension Analysis

### Type Safety

**hex-di**: `UseHttpRequestState<E extends HttpRequestError>` — error type is a generic parameter. Components can narrow to specific error subtypes (`NetworkError`, `HttpResponseError`) without any casts. No `any` in the public API.

**TanStack Query**: `useQuery<TData, TError>` — generic parameter for error. However, TanStack Query 5's `throwOnError` mode can bypass Result-based flow. Default `error` type is `Error | null` in v5 without custom error type setup.

**SWR**: Error type is `any` by default. Typed errors require custom fetcher typing.

**React `use()`**: Suspense-integrated; errors surface as thrown exceptions caught by ErrorBoundary. No typed error discrimination at the component level.

**Apollo**: Apollo Client 3 `error: ApolloError | undefined`. Not extensible to custom error discriminated unions.

---

### No-Throw Guarantee

**hex-di**: `useHttpRequest` and `useHttpMutation` MUST NOT throw. All errors are placed in `state.result` as `Err(...)` values. See [INV-HCR-2](../invariants.md#inv-hcr-2-never-throw-hook-contract).

**TanStack Query**: By default, errors are placed in `error` field and do not throw. However, `throwOnError: true` (v5) or `suspense: true` mode will throw from the hook, breaking Error Boundary discipline.

**SWR**: Errors are placed in `error` field by default. With `suspense: true`, SWR throws to the nearest Suspense boundary.

**React `use()`**: Always integrates with Suspense — errors are thrown and caught by ErrorBoundary. No Result-based error flow.

**Apollo**: Errors are split between `error: ApolloError` (network/GraphQL errors) and `data` (partial data with errors). Complex error handling required for all-or-nothing semantics.

---

### DI Integration

**hex-di**: `HttpClientProvider` receives an `HttpClient` instance created outside React by a DI graph. The graph controls the client's lifetime, combinators, and transport adapter. Swapping implementations for tests or environments requires changing the graph — no React-level mocking needed.

**TanStack Query**: Provides `QueryClient` via `QueryClientProvider`. `QueryClient` is a data-fetching framework class, not an interface. Requires custom wrapper to integrate with a DI-based HTTP abstraction. No mechanism to inject typed HTTP clients with combinator pipelines.

**SWR**: Global `SWRConfig` for shared configuration. No typed HTTP client injection — fetcher is a plain function. Integrating a DI-managed `HttpClient` requires a custom fetcher factory per-hook.

**React `use()`**: No integration concept — `use(promise)` accepts any Promise directly. DI must be wired entirely at the call site in imperative code.

**Apollo Client**: `ApolloProvider` injects `ApolloClient` globally. Tightly coupled to GraphQL — not applicable to REST/HTTP-client DI.

---

### No Global Cache

**hex-di**: No cache. Each `useHttpRequest` call tracks the state of its specific `HttpRequest` instance. State is local to the component. There is no `staleTime`, `cacheTime`, or invalidation infrastructure — by design. The HTTP client layer is not responsible for application-level caching.

**TanStack Query**: Built around a global `QueryCache`. Queries are identified by cache keys and shared across components. Powerful for data synchronization but introduces shared mutable state that can produce subtle bugs in multi-tenant or per-user scenarios.

**SWR**: Uses a global `SWRCache` (configurable via `SWRConfig`). Deduplication and revalidation are core features — not separable.

**React `use()`**: No built-in cache. Use of React Cache (experimental) or external memoization required.

**Apollo**: `InMemoryCache` is central to Apollo's model. Normalized cache with entity identification. Powerful for GraphQL but adds significant complexity for REST use cases.

---

### Result-Typed State

**hex-di**:

```typescript
const state = useHttpRequest(request);
// state.result: Result<HttpResponse, HttpRequestError> | undefined
if (state.result?.isOk()) {
  const response = state.result.value; // HttpResponse
} else if (state.result?.isErr()) {
  const error = state.result.error; // HttpRequestError — fully typed
}
```

No `null` checks on data and error simultaneously. Exhaustive matching with `.match()` is possible.

**TanStack Query**:

```typescript
const { data, error, isLoading } = useQuery({ queryKey: [...], queryFn });
// data: TData | undefined
// error: TError | null
// Both can be non-null simultaneously during background refetch
```

`data` and `error` can both be non-null at the same time during background refetching, requiring guards for both.

**SWR**:

```typescript
const { data, error, isLoading } = useSWR(key, fetcher);
// data: TData | undefined
// error: any (untyped by default)
```

---

### Clean Architecture

**hex-di**: The `@hex-di/http-client` package (core) has zero React dependency. Domain code defines `HttpClient` usages independently of React. The React integration (`@hex-di/http-client-react`) is an adapter layer — the core library is portable to Node.js, Deno, and Bun without modification. See [ADR-HC-003](../../decisions/003-result-only-error-channel.md).

**TanStack Query / SWR**: While `useQuery`/`useSWR` can wrap an `HttpClient`-based fetcher, the fetcher function is defined at the React layer. Domain logic that calls HTTP APIs must either live inside React components or accept React-specific patterns (e.g., query keys as arrays).

---

### GxP Compatibility

**hex-di**: The `HttpClient` injected into `HttpClientProvider` carries all GxP combinators from the DI graph (HTTPS enforcement, credential protection, payload integrity, audit trail). The React hook layer is a thin pass-through — it never bypasses or wraps the client in ways that could lose audit entries or mutate requests. See [compliance/gxp.md](../compliance/gxp.md).

**Others**: No GxP-specific design. Audit trail continuity, request immutability, and ALCOA+ guarantees must be implemented by the caller wrapping the third-party hook — with no structural enforcement.

---

## When to Choose Each Library

| Scenario | Recommended Choice |
|----------|--------------------|
| New feature in a hex-di application | `@hex-di/http-client-react` |
| Rich server-state synchronization, optimistic updates, background refetching | TanStack Query |
| Existing SWR codebase, stale-while-revalidate pattern | SWR |
| GraphQL API | Apollo Client |
| React 19 Suspense-first architecture with server components | React `use()` |
| GxP-regulated application requiring audit trail through the React layer | `@hex-di/http-client-react` |

---

## Key Differentiators of `@hex-di/http-client-react`

1. **Result<T, E> state** — errors are values, not thrown exceptions. No `try/catch`, no ErrorBoundary required for HTTP errors.
2. **Zero global state** — no query cache, no deduplication infrastructure. State is local to the component.
3. **DI graph owns the client** — the React layer is a thin Provider/hook adapter. The client is constructed and configured entirely outside React.
4. **GxP through-wire** — all audit trail, HTTPS enforcement, and ALCOA+ guarantees configured on the client are preserved by the hooks.
5. **No framework lock-in** — domain code using `HttpClient` directly is portable to any runtime or framework.
