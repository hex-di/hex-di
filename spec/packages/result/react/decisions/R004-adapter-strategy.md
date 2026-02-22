# ADR-R004: Adapter Strategy Over Competition

## Status

Accepted

## Context

The `useResultAsync` hook overlaps significantly with data fetching libraries like TanStack Query and SWR. These libraries provide:
- Caching
- Deduplication
- Background refetching
- Pagination
- Optimistic updates
- DevTools

Reproducing these features would be a massive undertaking and would fragment the ecosystem. Options considered:

1. **Full data fetching library** — Build caching, deduplication, etc. into `useResultAsync`. Compete with TanStack Query.
2. **Adapters only** — Don't provide `useResultAsync` at all. Only provide `toQueryFn` / `toSwrFetcher` adapters.
3. **Minimal hooks + adapters** — Provide `useResultAsync` for simple cases (no caching needed), plus adapters for TanStack Query / SWR integration.

## Decision

Option 3: Provide minimal hooks for simple cases, plus adapters for ecosystem integration.

### useResultAsync scope

`useResultAsync` provides:
- Fetch on mount/deps change
- Abort on cleanup
- Manual refetch
- Loading state
- Optional retry with exponential backoff (`retry`, `retryDelay`, `retryOn`) — see [BEH-R02-001](../behaviors/02-async-hooks.md#beh-r02-001-useresultasync)

It does **not** provide:
- Caching
- Deduplication
- Background refetching
- Stale-while-revalidate

### Adapter scope

Adapters (`toQueryFn`, `toQueryOptions`, `toSwrFetcher`) are thin wrappers that convert between the "errors as values" model and the "errors as exceptions" model expected by these libraries.

### When to use which

| Scenario | Recommended |
| -------- | ----------- |
| One-off fetch, no caching needed | `useResultAsync` |
| Form submission / mutation | `useResultAction` |
| Cached data with background refresh | TanStack Query + `toQueryFn` adapter |
| SWR-style stale-while-revalidate | SWR + `toSwrFetcher` adapter |
| Suspense-first with cache | TanStack Query Suspense mode + adapter |

## Consequences

**Positive**:
- No ecosystem fragmentation
- Leverages mature caching/deduplication from established libraries
- `useResultAsync` covers the simple case without external dependencies
- Adapters are trivially simple to maintain

**Negative**:
- Consumers using TanStack Query lose the "errors as values" model at the query boundary (errors become thrown exceptions inside the adapter)
- Two mental models (Result errors vs TanStack Query errors) when using adapters

**Trade-off accepted**: The adapter boundary is a known impedance mismatch, clearly documented. The alternative — reimplementing a data fetching library — is not viable.
