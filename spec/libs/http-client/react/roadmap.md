# @hex-di/http-client-react — Roadmap

Planned future additions to `@hex-di/http-client-react`.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-HCR-RMP-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/react/roadmap.md` |
| Status | Effective |

---

## useHttpPagination

**Status**: Planned

**Scope**: A hook for cursor- and page-based pagination built on `useHttpRequest`. Provides `fetchNextPage`, `fetchPreviousPage`, `hasNextPage`, and a merged `pages` accumulator. Deduplicates in-flight requests for the same page.

**Deliverable**: TBD — `03-hooks.md §19` extension

---

## useHttpPolling

**Status**: Planned

**Scope**: An `interval` option for `useHttpRequest` that re-executes the request on a fixed interval. Respects `enabled: false` and pauses polling when the document is hidden (Page Visibility API). Clears interval on unmount.

**Deliverable**: TBD — `03-hooks.md §15` option extension

---

## Optimistic Update Utilities

**Status**: Planned

**Scope**: A `useHttpOptimisticMutation` hook (or `optimisticUpdate` option on `useHttpMutation`) that applies a local state update immediately before the mutation completes, then reconciles with the server response. Rolls back on error.

**Note**: This is an application-level concern. The hook would provide the scaffolding but not dictate the state management library.

**Deliverable**: TBD — new `05-optimistic-updates.md` chapter

---

## React Server Components (RSC) Adapter

**Status**: Planned

**Scope**: A server-side helper for use in React Server Components that resolves an `HttpClient` from the DI container without requiring a Context provider. Required because React Context is unavailable in RSC. Candidate API: `createServerHttpClient(container)`.

**Note**: Requires investigation into RSC caching semantics and per-request container scoping.

**Deliverable**: TBD — new `06-server-components.md` chapter

---

## Suspense Integration

**Status**: Planned

**Scope**: A `suspend: true` option for `useHttpRequest` that integrates with React `<Suspense>`. The hook throws a Promise while the request is in-flight (React Suspense protocol), resolving when complete. Falls back to standard state-based API when `suspend: false` (default).

**Note**: Requires coordination with React 18's `use()` hook semantics.

**Deliverable**: TBD — `03-hooks.md §15` option extension

---

## Stale-While-Revalidate (SWR) Option

**Status**: Planned

**Scope**: A `staleTime` option for `useHttpRequest` that returns cached data immediately while re-fetching in the background. Cache keyed on request identity (URL + method + headers). Provides a `isFetching` field to distinguish initial load from background revalidation.

**Note**: This is deliberately kept out of the initial release. Caching semantics (invalidation, shared cache, TTL) are complex enough to warrant a dedicated spec chapter.

**Deliverable**: TBD — new `07-caching.md` chapter
