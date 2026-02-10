# @hex-di/query Harmonization Report

**Reviewer:** query-specialist
**Date:** 2026-02-07
**Spec Version:** 0.1.0 (Draft)
**Spec Files Reviewed:** 18 (README.md, 01-overview.md through 16-definition-of-done.md)
**Cross-Library Specs Skimmed:** result, store, saga, flow READMEs

---

## Executive Summary

The @hex-di/query spec is the most architecturally mature of the ecosystem library specs. It deeply integrates with HexDI's hexagonal architecture: query/mutation ports are real `DirectedPort` types, adapters are real `Adapter` types, and the GraphBuilder validates everything at compile time. The spec demonstrates strong consistency with Result, strong awareness of Store/Saga/Flow, and thorough introspection design.

Key findings: 5 consistent patterns, 4 inconsistencies, 3 missing integration points, and 8 concrete recommendations.

---

## 1. Port/Adapter Pattern Consistency

### Consistent Patterns

- **QueryPort extends DirectedPort.** `QueryPort<TName, TData, TParams, TError, TDependsOn>` extends `DirectedPort<QueryFetcher<TData, TParams, TError>, TName, "inbound">`. This is structurally identical to how Store uses `DirectedPort<StateService<T, A>, TName, "outbound">` and Flow uses ports for effects/activities. The `extends` (not wraps) relationship is correct and consistent.

- **Curried generics factory.** `createQueryPort<TData, TParams, TError>()({ name, defaults, dependsOn })` follows the same two-stage pattern as `createPort` in `@hex-di/ports` and `createStatePort` in Store. Stage 1 takes explicit type parameters; Stage 2 takes inferred config. This is ecosystem-consistent.

- **Adapter factory signature.** `createQueryAdapter(port, { requires, lifetime, factory })` follows the `createAdapter` pattern from `@hex-di/core`. The `factory` receives `ResolvedDeps<TupleToUnion<TRequires>>` and returns the service function. Dependencies are explicit via `requires`, not hidden.

- **Symbol branding.** `QueryPortSymbol`, `MutationPortSymbol` with runtime type guards (`isQueryPort`, `isMutationPort`) follow the same branding pattern as `@hex-di/core` ports.

- **GraphBuilder integration.** Query/mutation adapters register via `.provide()` in GraphBuilder. Compile-time validation catches missing adapters, captive dependencies, and circular query dependency chains. This reuses the existing `IsReachable<>` and `AddEdge<>` infrastructure from `@hex-di/graph`.

### Inconsistencies

**I1: Port direction is "inbound" for queries, "outbound" for state.**

- QueryPort: `DirectedPort<..., "inbound">`
- StatePort (Store): `DirectedPort<..., "outbound">`
- This may be architecturally correct (queries fetch FROM external, state exposes TO consumers), but the distinction is not documented anywhere as a convention. A table of which ecosystem ports use which direction would help.

**I2: QueryClient is NOT a port, but QueryInspector IS a port.**

- `createQueryClient(container)` wraps a Container directly (not resolved from graph).
- `QueryInspectorPort = createPort<QueryInspectorAPI>()({ name: "QueryInspector", direction: "outbound" })` is a real port in the graph.
- Store's `StoreInspectorAPI` follows a similar split, but the inconsistency between "client as external wrapper" and "inspector as graph port" should be explicitly justified in a cross-cutting design decision document. The spec does justify the QueryClient decision (Section 44), but does not address the inspector asymmetry.

---

## 2. API Surface Naming Conventions

### Consistent Patterns

- **`create*Port` / `create*Adapter` naming.** `createQueryPort`, `createMutationPort`, `createQueryAdapter`, `createMutationAdapter`, `createStreamedQueryAdapter` all follow the `create*` factory convention used throughout HexDI (`createAdapter`, `createPort`, `createContainer`, `createStatePort`, `createAtomPort`, `createDerivedPort`).

- **`Infer*` type utilities.** `InferQueryData`, `InferQueryParams`, `InferQueryError`, `InferQueryName`, `InferQueryDependsOn`, `InferQueryTypes`, and the mutation equivalents all follow the `Infer*` prefix convention established in `@hex-di/core` (`InferService`, `InferAdapterProvides`).

- **`InferenceError` pattern.** All inference utilities return `InferenceError<Source, Message, Input>` on invalid input, matching the `DebugInferAdapterProvides` pattern from `@hex-di/core`. This is a strong ecosystem consistency point.

- **Tagged union errors with `_tag`.** `QueryResolutionError` uses `_tag` as the discriminant field. This matches `@hex-di/result`'s tagged error union patterns (spec section 49).

### Inconsistencies

**I3: `Validate*` type naming inconsistency.**

- The spec defines `ValidateQueryDependencies`, `ValidateMutationEffects`, and `ValidateQueryAdapterLifetime` as standalone type utilities.
- In `@hex-di/graph`, validation types are internal to `BuilderInternals` and not exposed as standalone utilities. If Query exposes these, other libraries should too, or they should be internal.

**I4: `useQuery` vs `useStateValue` naming divergence.**

- Query: `useQuery(port, params, options)` -- returns `QueryState<TData, TError>`
- Store: `useStateValue(port)` -- returns the state value
- The naming styles differ: Query uses a domain verb (`useQuery`), Store uses a structural description (`useStateValue`). Both are valid React conventions, but the ecosystem lacks a documented naming guideline for hooks.

---

## 3. Integration Points with Other Ecosystem Libraries

### Result Integration (Strong)

- **All fetchers return `ResultAsync<TData, TError>`.** `QueryFetcher` and `MutationExecutor` return `ResultAsync`, never throw. This is the single strongest integration point with `@hex-di/result`.
- **`CacheEntry.result` field.** The cache stores `Result<TData, TError> | undefined` as source of truth. `data` and `error` fields are derived for ergonomics. The `Result.toJSON()` tagged format (`{ _tag: "Ok", value }` / `{ _tag: "Err", error }`) is used for cache persistence serialization.
- **`QueryState.result` field.** React hooks expose `result: Result<TData, TError> | undefined` for exhaustive `result.match()` handling.
- **`useSuspenseQuery` uses `result.expect()`.** Unwraps `Ok` or throws `Err` for error boundary propagation. Clean integration with Result's extraction API.
- **`mutateAsync` returns `ResultAsync<TData, TError>`.** Mutations can be chained with Result combinators.
- **`QueryResolutionError` composes with `TError | QueryResolutionError`.** The tagged union approach avoids class hierarchy conflicts.

### Store Integration (Mentioned but Not Deep)

- The spec mentions that Query and Store can coexist in the same container graph, but there is no formal integration point. No mechanism for:
  - Query result flowing into a state port automatically
  - State changes triggering query invalidation
  - Shared reactivity between Store signals and Query subscriptions

### Saga Integration (Absent)

- The Saga spec mentions integration with other ecosystem libraries but the Query spec has zero references to Saga. Missing patterns:
  - Saga step that performs a query fetch with retry/caching
  - Saga compensation that invalidates query cache
  - Saga-managed mutation sequences with coordinated cache effects

### Flow Integration (Absent)

- The Flow spec mentions effect descriptors that resolve services from the container. A query fetch could be a Flow effect, but this is not addressed. Missing patterns:
  - State machine transition that triggers a query prefetch
  - Flow activity that subscribes to query state changes

### Missing Integration Points

**M1: No Query-Store bridge.**
There is no `createQueryStatePort` or similar utility that bridges a query result into a reactive state signal. In practice, users will want `useStateValue(UserStorePort)` to automatically reflect `useQuery(UserQueryPort)` data. Without this, users must manually synchronize with `useEffect`.

**M2: No Saga-Query integration.**
A saga step that calls `queryClient.fetch()` is an obvious pattern for multi-step workflows that need cached data. The Saga spec's `SagaStepEffect` descriptors should include a query fetch variant.

**M3: No Flow-Query integration.**
Flow effect descriptors should support query operations (fetch, prefetch, invalidate) as first-class effects that the pure interpreter can process.

---

## 4. Cache Management and Lifecycle Patterns

### Consistent Patterns

- **Branded `CacheKey<TName>` type.** The `__cacheKeyBrand` unique symbol prevents ad-hoc tuple construction, ensuring all keys go through `createCacheKey` with `stableStringify`. This is sound.
- **Document-style cache (no normalization).** Explicit design decision (C10) with trade-off documentation. Mutation effects handle cross-query consistency.
- **Observer-based GC.** `observerCount === 0 && cacheTime elapsed` triggers collection. Standard pattern matching TanStack Query v5.
- **Per-scope cache isolation.** `queryClient.createChild(scope)` creates an independent cache. No cross-scope leakage. Disposal cascades from scope to child client.
- **Injectable `Clock` port for deterministic testing.** Avoids `vi.useFakeTimers()`. The Clock is resolved from the container, following hexagonal principles.

### Observations

- **`maxInvalidationDepth` (default: 10) prevents cascade bombs.** Produces `QueryInvalidationCycle` error. The introspection layer detects potential cycles statically via Tarjan's algorithm on the invalidation graph.
- **Structural sharing via `replaceEqualDeep`.** Preserves reference equality for unchanged subtrees, preventing unnecessary React re-renders. Can be opted out per-query.
- **4-step disposal order** (cancel -> stop background -> clear cache -> mark disposed) is well-documented with ordering rationale.

---

## 5. React Integration Patterns

### Consistent Patterns

- **`QueryClientProvider` accepts client directly.** Does not resolve from container. Matches the explicit dependency principle (no hidden service location).
- **`useQuery` overloads.** Three overloads: basic, with select, with dependsOn mapper. The select overload lifts `TSelected` to the options type parameter, which is the correct TypeScript approach (inline generics on properties don't work).
- **No `onSuccess/onError/onSettled` on queries.** Follows TanStack Query v5 precedent (C8 design decision). Mutations keep callbacks because they are imperative (fire-once). This is well-justified.
- **`useSuspenseQuery` guarantees `data: TData` (never undefined).** Uses `result.expect()` internally.
- **`result` field on QueryState and MutationResult.** Enables exhaustive `result.match()` rendering. This is a unique value-add over TanStack Query.

### Inconsistencies

- Store uses `useStateValue(port)` (one arg), `useActions(port)` (one arg). Query uses `useQuery(port, params, options)` (two-three args). The difference is structural (state ports don't have params), so this is acceptable, but the `useStatePort(port)` convenience hook in Store that returns `[value, actions]` has no Query equivalent like `useQueryPort(port, params)` returning `[data, refetch]`. This is minor but notable.

### Observations

- **`useQueries` for parallel queries.** Maps an array of query configs to a tuple of states. Matches TanStack Query's API.
- **`useInfiniteQuery` for pagination.** Provides `fetchNextPage`/`fetchPreviousPage` returning `ResultAsync`. The `Omit<TParams, "cursor">` base params type is a pragmatic choice.
- **`useIsFetching(filters?)` for global loading indicators.** Port-filtered counting.
- **`QueryClientProvider` is separate from `ContainerProvider`.** Users must nest both. This is explicit but adds boilerplate.

---

## 6. Testing Patterns

### Consistent Patterns

- **Adapter swapping as primary test strategy.** `createMockQueryAdapter(port, { data|error, delay })` and `createMockMutationAdapter` replace production adapters in the graph. No MSW or network mocking. This aligns with hexagonal architecture principles.
- **`createSpyQueryAdapter` for call recording.** Returns `{ adapter, calls, lastCall, callCount, reset }`. Matches testing-library conventions.
- **`createQueryTestContainer` and `createQueryTestWrapper`.** Convenience wrappers that create isolated container + QueryClient for tests. The React wrapper provides `{ wrapper }` for React Testing Library.
- **Type-level tests in `.test-d.ts` files.** Uses `expectTypeOf` from Vitest. Matches `@hex-di/graph` convention.
- **`useQueryTestContainer` Vitest hook.** Matches `useTestContainer` pattern from `@hex-di/testing`.
- **`renderWithQueryContainer` for React tests.** Extends `renderWithContainer` pattern.

### Observations

- **`expectQueryState` custom assertions.** `.toBeLoading()`, `.toBeSuccess(data)`, `.toBeError()`, `.toBeRefetching()`, `.toBeFresh()`, `.toBeStale()`. Domain-specific assertions that improve test readability.
- **`expectCacheEntry` assertions.** `.toExist()`, `.toHaveData()`, `.toBeStale()`, `.toBeFresh()`, `.toHaveObserverCount()`. Cache-aware assertions.
- **`expectQueryResult` wraps Result assertions.** `.toBeOk(data)`, `.toBeErr(error)`, `.toBeUndefined()`. Bridges query testing with result testing.
- **~549 tests specified in DoD.** Comprehensive coverage across 12 DoD sections: unit (~380), type-level (~76), integration (~65), e2e (~28). Mutation testing targets: critical >95%, high >90%, medium >85%.

---

## 7. QueryClient and Introspection Design

### QueryClient Design

- **Container extension pattern.** `createQueryClient(container, config?)` wraps a container. Not a port in the graph. Zero graph footprint. This avoids service locator anti-pattern and graph pollution.
- **Port-based fetch.** All operations take `QueryPort`/`MutationPort` as first argument instead of string keys. Type-safe throughout.
- **All async methods return `ResultAsync<T, TError | QueryResolutionError>`.** No thrown exceptions. Uniform error handling.
- **`createChild(scope)` for scoped clients.** Each child has independent cache. Parent disposal cascades to children.
- **`pause()`/`resume()` for background operations.** Controls GC, polling, focus refetch.

### Introspection Design

- **`QueryInspectorAPI` follows the InspectorAPI pattern.** Pull-based snapshots + push-based event subscriptions. Matches `StoreInspectorAPI` from Store and `SagaInspector` from Saga.
- **`QuerySuggestion` follows `GraphSuggestion` shape.** `{ type, portName, message, action }` -- identical shape to `@hex-di/graph`'s `GraphSuggestion`. MCP consumers process all suggestions with the same schema.
- **6 suggestion types.** `stale_query`, `invalidation_storm`, `high_error_rate`, `unused_observer`, `missing_adapter`, `large_cache_entry`. Each has trigger conditions, example messages, and actions documented.
- **`QueryInspectorEvent` discriminated union.** 11 event kinds covering the full query lifecycle. Uses `kind` as discriminant (consistent with Store's event types).
- **MCP resource mapping.** 7 resources + 2 tools mapped to `hexdi://query/*` URIs. Matches the VISION.md Phase 3 central nervous system concept.
- **Invalidation graph with cycle detection.** Tarjan's algorithm on mutation effects. `cycles` array with `severity: "warning" | "error"`. `maxCascadeDepth` computation.
- **Fetch history with full context.** `FetchHistoryEntry` includes trigger type, error classification, scope ID, trace span ID. Links to `@hex-di/tracing`.

---

## Recommendations

### R1: Document port direction conventions across ecosystem

Create a cross-cutting specification document that defines when ports use `"inbound"` vs `"outbound"` direction. Current state:

- Query/Mutation ports: `"inbound"` (fetchers are inbound adapters)
- State ports: `"outbound"` (state services exposed outbound)
- Effect ports (Store): `"outbound"`
- QueryInspector: `"outbound"`
- CachePersister: `"outbound"`

The pattern appears to be: "if the application calls into it, inbound; if it exposes state, outbound." This should be explicitly documented.

### R2: Define Query-Store bridge specification

Add a section (or separate spec) for `createQueryStatePort` or similar utility that automatically bridges query results into reactive state signals. This would:

- Subscribe to query data changes
- Feed into a Store signal/atom
- Enable Store-derived computations over query data
- Avoid manual `useEffect` synchronization

### R3: Add Saga-Query integration section

Add a specification for Saga steps that interact with the query cache:

- `queryFetch(port, params)` as a saga step effect
- `queryInvalidate(port, params?)` as a compensation action
- `queryPrefetch(port, params)` as a saga side effect

### R4: Add Flow-Query effect descriptors

Add query-related effect descriptors to the Flow spec:

- `effects.queryFetch(port, params)` for state machine transitions that need data
- `effects.queryInvalidate(port)` for cleanup transitions
- `effects.queryPrefetch(port, params)` for preloading in anticipation states

### R5: Harmonize validation type exposure

Decide whether `ValidateQueryDependencies`, `ValidateMutationEffects`, and `ValidateQueryAdapterLifetime` are public API or internal to GraphBuilder. If public, establish a naming convention (`Validate*`) and ensure Store/Saga/Flow expose equivalent validation types. If internal, remove from API reference.

### R6: Document hook naming convention

Create an ecosystem-wide guideline for React hook naming:

- Domain verb style: `useQuery`, `useMutation`, `useInfiniteQuery`
- Structural style: `useStateValue`, `useActions`, `useAtom`
- Convenience combo style: `useStatePort` (Store), potentially `useQueryPort` (Query)

Both styles are valid; the guideline should explain when to use which.

### R7: Align inspector event discriminant field

- Query uses `kind` for `QueryInspectorEvent` and `QueryEntrySnapshot.kind`
- Store uses `kind` for `StoreInspectorEvent` (per README)
- Result uses `_tag` for error discrimination
- `QueryResolutionError` uses `_tag`

The `kind` vs `_tag` split appears to be: `_tag` for error types (Result influence), `kind` for event types. This should be documented as an explicit convention so Saga and Flow follow it consistently.

### R8: Add `DehydratedState` version field to cross-library hydration spec

The Query spec defines `DehydratedState` with a version field for SSR. If Store, Saga, or Flow also support hydration, they should follow the same versioned dehydration format. This should be a cross-cutting pattern document.

---

## Summary Table

| Dimension                     | Score    | Notes                                                    |
| ----------------------------- | -------- | -------------------------------------------------------- |
| Port/Adapter Consistency      | 9/10     | Strong. Minor direction convention gap.                  |
| API Naming                    | 8/10     | Good. Hook naming diverges from Store.                   |
| Result Integration            | 10/10    | Exemplary. ResultAsync throughout, tagged errors, match. |
| Store Integration             | 3/10     | No formal bridge. Manual sync only.                      |
| Saga Integration              | 0/10     | Absent. No cross-references.                             |
| Flow Integration              | 0/10     | Absent. No cross-references.                             |
| Cache Management              | 10/10    | Comprehensive. Branded keys, GC, persistence, scoping.   |
| React Integration             | 9/10     | Strong. Suspense, infinite, parallel. Minor naming gap.  |
| Testing Patterns              | 9/10     | Thorough. Adapter swapping, type tests, ~549 tests.      |
| QueryClient Design            | 10/10    | Clean container extension. Port-based API. ResultAsync.  |
| Introspection                 | 10/10    | Full InspectorAPI, MCP mapping, cycle detection.         |
| **Overall Ecosystem Harmony** | **8/10** | Strong core patterns. Cross-library bridges missing.     |

---

_End of Harmonization Report_
