# 16 - Definition of Done

_Previous: [15 - Appendices](./15-appendices.md)_

---

This document defines all tests required for `@hex-di/query`, `@hex-di/query-react`, and `@hex-di/query-testing` to be considered complete. Each section maps to a spec section and specifies required unit tests, type-level tests, integration tests, e2e tests, and mutation testing guidance.

## Test File Convention

| Test Category          | File Pattern  | Location                             |
| ---------------------- | ------------- | ------------------------------------ |
| Unit tests             | `*.test.ts`   | `libs/query/core/tests/`             |
| Type-level tests       | `*.test-d.ts` | `libs/query/core/tests/`             |
| Integration tests      | `*.test.ts`   | `libs/query/core/tests/integration/` |
| E2E tests              | `*.test.ts`   | `libs/query/core/tests/e2e/`         |
| React hook tests       | `*.test.tsx`  | `libs/query/react/tests/`            |
| React type-level tests | `*.test-d.ts` | `libs/query/react/tests/`            |
| Testing package tests  | `*.test.ts`   | `libs/query/testing/tests/`          |
| Testing React helpers  | `*.test.tsx`  | `libs/query/testing/tests/`          |

---

## DoD 1: Query Ports (Spec Section 03)

### Unit Tests -- `query-port.test.ts`

| #   | Test                                                                                          | Type |
| --- | --------------------------------------------------------------------------------------------- | ---- |
| 1   | `createQueryPort<User[], Params>()({ name: "Users" })` returns an object with `name: "Users"` | unit |
| 2   | Query port has `QueryPortSymbol` property set to `true`                                       | unit |
| 3   | Query port has `config` property containing the provided config                               | unit |
| 4   | Query port with `defaults` carries those defaults in `config.defaults`                        | unit |
| 5   | Query port without `defaults` has `config.defaults` as `undefined`                            | unit |
| 6   | Query port with `dependsOn: [OtherPort]` carries dependency in `config.dependsOn`             | unit |
| 7   | Query port without `dependsOn` has `config.dependsOn` as empty array or `undefined`           | unit |
| 8   | `isQueryPort(queryPort)` returns `true`                                                       | unit |
| 9   | `isQueryPort({})` returns `false`                                                             | unit |
| 10  | `isQueryPort(null)` returns `false`                                                           | unit |
| 11  | `isQueryPort(undefined)` returns `false`                                                      | unit |
| 12  | `isQueryPort(mutationPort)` returns `false`                                                   | unit |
| 13  | Two ports with different names are structurally distinct                                      | unit |
| 14  | Port `name` is the literal string type (not widened to `string`)                              | unit |
| 15  | Default `TError` is `Error` when not specified                                                | unit |
| 16  | Default `TParams` is `void` when not specified                                                | unit |

### Type-Level Tests -- `query-port.test-d.ts`

| #   | Test                                                                                        | Type |
| --- | ------------------------------------------------------------------------------------------- | ---- |
| 1   | `InferQueryData<typeof UsersPort>` resolves to `User[]`                                     | type |
| 2   | `InferQueryParams<typeof UsersPort>` resolves to `{ role?: string }`                        | type |
| 3   | `InferQueryError<typeof UsersPort>` resolves to `Error` (default)                           | type |
| 4   | `InferQueryError<typeof CustomErrorPort>` resolves to `ApiError`                            | type |
| 5   | `InferQueryName<typeof UsersPort>` resolves to `"Users"` literal                            | type |
| 6   | `InferQueryDependsOn<typeof IndependentPort>` resolves to `[]`                              | type |
| 7   | `InferQueryDependsOn<typeof DependentPort>` resolves to the `dependsOn` tuple               | type |
| 8   | `InferQueryTypes<typeof UsersPort>` resolves to correct record shape                        | type |
| 9   | `InferQueryData<string>` produces `InferenceError` with `__source: "InferQueryData"`        | type |
| 10  | `InferQueryData<{ name: "Foo" }>` produces `InferenceError` with `__input: { name: "Foo" }` | type |
| 11  | `InferQueryParams<number>` produces `InferenceError`                                        | type |
| 12  | `InferQueryError<boolean>` produces `InferenceError`                                        | type |
| 13  | `InferQueryName<42>` produces `InferenceError`                                              | type |
| 14  | `QueryPort` is assignable to `DirectedPort<QueryFetcher, TName, "inbound">`                 | type |
| 15  | `HasParams<typeof VoidParamsPort>` resolves to `false`                                      | type |
| 16  | `HasParams<typeof RequiredParamsPort>` resolves to `true`                                   | type |
| 17  | `InferQueryDependencyNames<typeof DependentPort>` resolves to union of dependency names     | type |

### Mutation Testing

**Target: >95% mutation score.** Port factory output (name, brand symbol, config propagation) and `isQueryPort` guard logic are critical -- any mutation to `QueryPortSymbol` checks or config assignment must be caught.

---

## DoD 2: Mutation Ports (Spec Section 04)

### Unit Tests -- `mutation-port.test.ts`

| #   | Test                                                                                                           | Type |
| --- | -------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `createMutationPort<User, CreateUserInput>()({ name: "CreateUser" })` returns object with `name: "CreateUser"` | unit |
| 2   | Mutation port has `MutationPortSymbol` property set to `true`                                                  | unit |
| 3   | Mutation port has `config` property containing the provided config                                             | unit |
| 4   | Mutation port with `effects: { invalidates: [UsersPort] }` carries effects in config                           | unit |
| 5   | Mutation port with `effects: { removes: [UserByIdPort] }` carries removes in config                            | unit |
| 6   | Mutation port with both `invalidates` and `removes` carries both                                               | unit |
| 7   | Mutation port without `effects` has `config.effects` as `undefined`                                            | unit |
| 8   | `isMutationPort(mutationPort)` returns `true`                                                                  | unit |
| 9   | `isMutationPort({})` returns `false`                                                                           | unit |
| 10  | `isMutationPort(null)` returns `false`                                                                         | unit |
| 11  | `isMutationPort(queryPort)` returns `false`                                                                    | unit |
| 12  | Default `TError` is `Error` when not specified                                                                 | unit |
| 13  | Default `TInput` is `void` when not specified                                                                  | unit |
| 14  | Default `TContext` is `unknown` when not specified                                                             | unit |

### Type-Level Tests -- `mutation-port.test-d.ts`

| #   | Test                                                                                           | Type |
| --- | ---------------------------------------------------------------------------------------------- | ---- |
| 1   | `InferMutationData<typeof CreateUserPort>` resolves to `User`                                  | type |
| 2   | `InferMutationInput<typeof CreateUserPort>` resolves to `CreateUserInput`                      | type |
| 3   | `InferMutationError<typeof CreateUserPort>` resolves to `Error` (default)                      | type |
| 4   | `InferMutationError<typeof CustomErrorPort>` resolves to `ValidationError`                     | type |
| 5   | `InferMutationContext<typeof OptimisticPort>` resolves to `{ previousTodos: readonly Todo[] }` | type |
| 6   | `InferMutationName<typeof CreateUserPort>` resolves to `"CreateUser"` literal                  | type |
| 7   | `InferMutationTypes<typeof CreateUserPort>` resolves to correct record shape                   | type |
| 8   | `InferMutationData<string>` produces `InferenceError`                                          | type |
| 9   | `InferInvalidatedPorts<typeof CreateUserPort>` resolves to `"Users"`                           | type |
| 10  | `InferRemovedPorts<typeof DeleteUserPort>` resolves to `"UserById"`                            | type |
| 11  | `MutationPort` is assignable to `DirectedPort<MutationExecutor, TName, "inbound">`             | type |

### Mutation Testing

**Target: >95% mutation score.** Port factory output (name, brand symbol, effects propagation) and `isMutationPort` guard logic must detect all mutations.

---

## DoD 3: Query Adapters (Spec Section 05)

### Unit Tests -- `query-adapter.test.ts`

| #   | Test                                                                                  | Type |
| --- | ------------------------------------------------------------------------------------- | ---- |
| 1   | `createQueryAdapter(port, { factory })` returns an Adapter object                     | unit |
| 2   | Adapter provides the correct query port                                               | unit |
| 3   | Adapter default lifetime is `"singleton"`                                             | unit |
| 4   | Adapter with explicit `lifetime: "scoped"` uses scoped lifetime                       | unit |
| 5   | Adapter with `requires: [HttpClientPort]` declares the dependency                     | unit |
| 6   | Factory receives resolved dependencies object with correct keys                       | unit |
| 7   | Factory returns a `QueryFetcher` function                                             | unit |
| 8   | `QueryFetcher(params, context)` returns `ResultAsync`                                 | unit |
| 9   | `QueryFetcher` receives `FetchContext` with `signal` property                         | unit |
| 10  | `QueryFetcher` receives `FetchContext` with `meta` property when provided             | unit |
| 11  | `QueryFetcher` receives `FetchContext` with `pageParam` for infinite queries          | unit |
| 12  | `QueryFetcher` receives `FetchContext` with `direction` for infinite queries          | unit |
| 13  | `createStreamedQueryAdapter` returns an Adapter with streamed fetcher                 | unit |
| 14  | Streamed fetcher returns `ResultAsync` containing `stream`, `reducer`, `initialValue` | unit |
| 15  | Streamed fetcher `refetchMode` defaults to `"reset"` when not specified               | unit |
| 16  | Mock adapter with no dependencies has empty `requires`                                | unit |

### Type-Level Tests -- `query-adapter.test-d.ts`

| #   | Test                                                                               | Type        |
| --- | ---------------------------------------------------------------------------------- | ----------- | ---- |
| 1   | `createQueryAdapter` return type matches `Adapter<QueryPort, TRequires, ...>`      | type        |
| 2   | Factory `deps` parameter is typed as `ResolvedDeps<TupleToUnion<TRequires>>`       | type        |
| 3   | `QueryFetcher<TData, TParams, TError>` return type is `ResultAsync<TData, TError>` | type        |
| 4   | `FetchContext.signal` is typed as `AbortSignal`                                    | type        |
| 5   | `FetchContext.pageParam` is typed as `unknown`                                     | type        |
| 6   | `FetchContext.direction` is typed as `"forward"                                    | "backward"` | type |
| 7   | Adapter factory mode is `"async"`                                                  | type        |
| 8   | `StreamedFetcher` return type contains `stream: AsyncIterable<TChunk>`             | type        |

### Mutation Testing

**Target: >90% mutation score.** Factory wiring, dependency resolution, and FetchContext propagation must be verified.

---

## DoD 4: Mutation Adapters (Spec Section 06)

### Unit Tests -- `mutation-adapter.test.ts`

| #   | Test                                                                             | Type |
| --- | -------------------------------------------------------------------------------- | ---- |
| 1   | `createMutationAdapter(port, { factory })` returns an Adapter object             | unit |
| 2   | Adapter provides the correct mutation port                                       | unit |
| 3   | Adapter default lifetime is `"singleton"`                                        | unit |
| 4   | Adapter with `requires: [HttpClientPort]` declares the dependency                | unit |
| 5   | Factory receives resolved dependencies object with correct keys                  | unit |
| 6   | Factory returns a `MutationExecutor` function                                    | unit |
| 7   | `MutationExecutor(input, context)` returns `ResultAsync`                         | unit |
| 8   | `MutationExecutor` receives `MutationContext` with `signal` property             | unit |
| 9   | `MutationExecutor` receives `MutationContext` with `meta` property when provided | unit |
| 10  | Mock mutation adapter with no dependencies works                                 | unit |

### Type-Level Tests -- `mutation-adapter.test-d.ts`

| #   | Test                                                                                  | Type |
| --- | ------------------------------------------------------------------------------------- | ---- |
| 1   | `createMutationAdapter` return type matches `Adapter<MutationPort, TRequires, ...>`   | type |
| 2   | Factory `deps` parameter is typed as `ResolvedDeps<TupleToUnion<TRequires>>`          | type |
| 3   | `MutationExecutor<TData, TInput, TError>` return type is `ResultAsync<TData, TError>` | type |
| 4   | `MutationContext.signal` is typed as `AbortSignal`                                    | type |
| 5   | Adapter factory mode is `"async"`                                                     | type |

### Mutation Testing

**Target: >90% mutation score.** Factory wiring and context propagation must be verified.

---

## DoD 5: Cache Architecture (Spec Section 07)

### Unit Tests -- `cache-key.test.ts`

| #   | Test                                                                                                      | Type |
| --- | --------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `createCacheKey(port, params)` returns tuple `[portName, paramsHash]`                                     | unit |
| 2   | Cache key first element is the port name                                                                  | unit |
| 3   | Cache key second element is the deterministic params hash                                                 | unit |
| 4   | `stableStringify({ a: 1, b: 2 })` equals `stableStringify({ b: 2, a: 1 })` (insertion-order independence) | unit |
| 5   | `stableStringify(null)` returns `"null"`                                                                  | unit |
| 6   | `stableStringify(42)` returns `"42"`                                                                      | unit |
| 7   | `stableStringify("hello")` returns `'"hello"'`                                                            | unit |
| 8   | `stableStringify(true)` returns `"true"`                                                                  | unit |
| 9   | `stableStringify(undefined)` returns expected value                                                       | unit |
| 10  | `stableStringify([1, 2, 3])` preserves array order                                                        | unit |
| 11  | `stableStringify` handles nested objects with sorted keys                                                 | unit |
| 12  | `stableStringify` handles nested arrays within objects                                                    | unit |
| 13  | `stableStringify` handles deeply nested mixed structures                                                  | unit |
| 14  | Same port + same params always produce the same cache key                                                 | unit |
| 15  | Same port + different params produce different cache keys                                                 | unit |
| 16  | Different ports + same params produce different cache keys                                                | unit |
| 17  | `stableStringify({})` returns `'{}'` (void params)                                                        | unit |

### Unit Tests -- `cache.test.ts`

| #   | Test                                                                              | Type |
| --- | --------------------------------------------------------------------------------- | ---- |
| 18  | `cache.get(port, params)` returns `undefined` for absent entry                    | unit |
| 19  | `cache.set(port, params, data)` stores entry retrievable by `get`                 | unit |
| 20  | `cache.has(port, params)` returns `true` for existing entry                       | unit |
| 21  | `cache.has(port, params)` returns `false` for absent entry                        | unit |
| 22  | `cache.remove(port, params)` removes specific entry                               | unit |
| 23  | `cache.remove(port)` without params removes all entries for that port             | unit |
| 24  | `cache.clear()` removes all entries                                               | unit |
| 25  | `cache.size` reflects number of entries                                           | unit |
| 26  | `cache.findByPort(port)` returns all entries for a given port                     | unit |
| 27  | `cache.find(predicate)` returns matching entries                                  | unit |
| 28  | `cache.getAll()` returns all entries as a map                                     | unit |
| 29  | `cache.invalidate(port, params)` marks specific entry as invalidated              | unit |
| 30  | `cache.invalidate(port)` without params marks all entries for port as invalidated | unit |
| 31  | `cache.setError(port, params, error)` stores error entry                          | unit |
| 32  | `cache.getEntry(port, params)` returns `ReactiveCacheEntry` for existing entry    | unit |
| 33  | `cache.getOrCreateEntry(port, params)` creates entry if absent                    | unit |
| 34  | `cache.getSnapshot(port, params)` returns non-reactive `CacheEntrySnapshot`       | unit |
| 35  | Reactive effect on entry fires when `result$` signal changes                      | unit |
| 36  | Reactive effect on entry fires when `fetchStatus$` signal changes                 | unit |
| 37  | Disposing reactive effect stops notification delivery                             | unit |
| 38  | ReactiveCacheEntry has `result$: signal(Ok(data))` after successful set           | unit |
| 39  | ReactiveCacheEntry has `result$: signal(Err(error))` after setError               | unit |
| 40  | ReactiveCacheEntry `data` computed derives from `result$.get()` on Ok             | unit |
| 41  | ReactiveCacheEntry `error` computed derives from `result$.get()` on Err           | unit |
| 42  | ReactiveCacheEntry `data` computed is `undefined` when result is Err              | unit |
| 43  | ReactiveCacheEntry `error` computed is `null` when result is Ok                   | unit |
| 44  | ReactiveCacheEntry `status` computed is `"pending"` when result is `undefined`    | unit |
| 45  | ReactiveCacheEntry `status` computed is `"success"` when result is Ok             | unit |
| 46  | ReactiveCacheEntry `status` computed is `"error"` when result is Err              | unit |
| 47  | ReactiveCacheEntry `dataUpdatedAt$` signal is set on successful fetch             | unit |
| 48  | ReactiveCacheEntry `errorUpdatedAt$` signal is set on error fetch                 | unit |
| 49  | ReactiveCacheEntry `fetchCount$` signal increments on each fetch                  | unit |

### Unit Tests -- `structural-sharing.test.ts`

| #   | Test                                                                           | Type |
| --- | ------------------------------------------------------------------------------ | ---- |
| 50  | `replaceEqualDeep(prev, next)` returns `prev` when referentially equal         | unit |
| 51  | `replaceEqualDeep(prev, next)` returns `prev` when structurally equal (object) | unit |
| 52  | `replaceEqualDeep(prev, next)` returns `prev` when structurally equal (array)  | unit |
| 53  | `replaceEqualDeep` returns new reference when values differ                    | unit |
| 54  | `replaceEqualDeep` preserves reference for unchanged array elements            | unit |
| 55  | `replaceEqualDeep` replaces changed array elements                             | unit |
| 56  | `replaceEqualDeep` preserves reference for unchanged object properties         | unit |
| 57  | `replaceEqualDeep` replaces changed object properties                          | unit |
| 58  | `replaceEqualDeep` handles arrays with different lengths                       | unit |
| 59  | `replaceEqualDeep` handles objects with added keys                             | unit |
| 60  | `replaceEqualDeep` handles objects with removed keys                           | unit |
| 61  | `replaceEqualDeep` handles nested objects with partial changes                 | unit |
| 62  | `replaceEqualDeep` returns `next` for primitive type changes                   | unit |
| 63  | `replaceEqualDeep` returns `next` for type mismatches (object vs array)        | unit |
| 64  | Structural sharing disabled returns `next` without comparison                  | unit |

### Unit Tests -- `garbage-collection.test.ts`

| #   | Test                                                                       | Type |
| --- | -------------------------------------------------------------------------- | ---- |
| 65  | Entry with no active subscribers and expired `cacheTime` is GC-eligible    | unit |
| 66  | Entry with active subscribers (`hasSubscribers(entry)`) is NOT GC-eligible | unit |
| 67  | Entry with no subscribers but within `cacheTime` is NOT GC-eligible        | unit |
| 68  | GC removes eligible entries on interval tick                               | unit |
| 69  | GC is cancelled when new subscriber effect mounts before expiry            | unit |
| 70  | `cacheTime: 0` makes entry GC-eligible immediately when subscribers detach | unit |
| 71  | `cacheTime: Infinity` prevents GC entirely                                 | unit |
| 72  | GC respects injectable Clock port for time source                          | unit |

### Type-Level Tests -- `cache-key.test-d.ts`

| #   | Test                                                                              | Type |
| --- | --------------------------------------------------------------------------------- | ---- |
| 1   | Branded `CacheKey` is not assignable from plain `readonly [string, string]` tuple | type |
| 2   | `createCacheKey` returns `CacheKey<TName>` with correct port name literal         | type |
| 3   | `CacheKey<"Users">` carries the port name in the type                             | type |

### Integration Tests -- `integration/cache-pipeline.test.ts`

| #   | Test                                                                      | Type        |
| --- | ------------------------------------------------------------------------- | ----------- |
| 1   | Set data then get returns the same data                                   | integration |
| 2   | Set then invalidate then get returns entry with `isInvalidated: true`     | integration |
| 3   | Cache persistence: save then restore recovers entries                     | integration |
| 4   | Cache persistence: buster change discards persisted entries               | integration |
| 5   | Cache persistence: entries with expired `maxAge` are discarded on restore | integration |
| 6   | Per-scope cache isolation: parent and child caches are independent        | integration |
| 7   | Scope disposal clears the child cache                                     | integration |
| 8   | Structural sharing across refetches preserves unchanged references        | integration |

### Mutation Testing

**Target: >95% mutation score.** Cache key generation (determinism, insertion-order independence), `stableStringify`, `replaceEqualDeep`, and GC eligibility checks are critical -- wrong keys cause data corruption and wrong sharing causes stale renders.

---

## DoD 5b: Reactivity Module (Signal-Based Reactivity)

### Unit Tests -- `reactivity/signals.test.ts`

| #   | Test                                                                         | Type |
| --- | ---------------------------------------------------------------------------- | ---- |
| 1   | `createSignal(initialValue, system)` creates a signal with initial value     | unit |
| 2   | `signal.get()` returns current value                                         | unit |
| 3   | `signal.set(newValue)` updates value and notifies subscribers                | unit |
| 4   | `signal.peek()` returns current value without tracking dependency            | unit |
| 5   | `createComputed(fn, system)` creates a lazily-evaluated computed             | unit |
| 6   | Computed re-evaluates when upstream signal changes                           | unit |
| 7   | Computed caches value when upstream signal has not changed                   | unit |
| 8   | Diamond dependency: computed with two paths to same signal evaluates once    | unit |
| 9   | `createEffect(fn, system)` runs synchronously on creation                    | unit |
| 10  | Effect re-runs when tracked signal changes                                   | unit |
| 11  | Disposing effect stops re-execution on signal change                         | unit |
| 12  | Effect does not re-run when untracked signal changes (via `peek()`)          | unit |
| 13  | Nested computed: computed depending on another computed propagates correctly | unit |

### Unit Tests -- `reactivity/system-factory.test.ts`

| #   | Test                                                                          | Type |
| --- | ----------------------------------------------------------------------------- | ---- |
| 14  | `createIsolatedReactiveSystem()` creates an isolated reactive system instance | unit |
| 15  | Two isolated systems have independent dependency graphs                       | unit |
| 16  | Signal in system A does not trigger effects in system B                       | unit |
| 17  | Disposing system disposes all effects created within it                       | unit |

### Unit Tests -- `reactivity/batch.test.ts`

| #   | Test                                                                              | Type |
| --- | --------------------------------------------------------------------------------- | ---- |
| 18  | `batch(target, fn, system)` defers subscriber notifications until batch completes | unit |
| 19  | Multiple signal writes within batch produce single effect execution               | unit |
| 20  | Nested batches: inner batch does not flush until outer batch completes            | unit |
| 21  | Batch uses container-scoped depth tracking (WeakMap per target)                   | unit |
| 22  | Cross-container batch isolation: batch in container A does not affect container B | unit |
| 23  | Exception in batch body still decrements depth and flushes                        | unit |

### Unit Tests -- `reactivity/reactive-cache-entry.test.ts`

| #   | Test                                                                                         | Type |
| --- | -------------------------------------------------------------------------------------------- | ---- |
| 24  | `createReactiveCacheEntry(key, system)` creates entry with all signal/computed fields        | unit |
| 25  | Writing to `result$` signal triggers `status` computed re-evaluation                         | unit |
| 26  | Writing to `result$` signal triggers `data` and `error` computed re-evaluation               | unit |
| 27  | Writing to `fetchStatus$` signal triggers `isFetching` computed re-evaluation                | unit |
| 28  | `isLoading` computed is `true` only when `status === "pending" && isFetching`                | unit |
| 29  | `isRefetching` computed is `true` only when `status === "success" && isFetching`             | unit |
| 30  | Structural sharing: writing equal data to `result$` via `replaceEqualDeep` skips propagation | unit |
| 31  | `hasSubscribers(entry)` returns `true` when at least one effect tracks entry signals         | unit |
| 32  | `hasSubscribers(entry)` returns `false` when no effects track entry signals                  | unit |
| 33  | `getSnapshot(entry)` returns non-reactive plain object with current signal values            | unit |

### Type-Level Tests -- `reactivity/reactivity.test-d.ts`

| #   | Test                                                                                  | Type |
| --- | ------------------------------------------------------------------------------------- | ---- |
| 1   | `Signal<T>` has `get(): T`, `set(value: T): void`, `peek(): T`                        | type |
| 2   | `Computed<T>` has `get(): T`, `peek(): T` but no `set`                                | type |
| 3   | `ReactiveEffect` has `dispose(): void`                                                | type |
| 4   | `ReactiveSystemInstance` has `signal`, `computed`, `effect`, `batch` methods          | type |
| 5   | `createIsolatedReactiveSystem()` returns `ReactiveSystemInstance`                     | type |
| 6   | `ReactiveCacheEntry<TData, TError>` signal fields use correct generics                | type |
| 7   | `CacheEntrySnapshot<TData, TError>` has no signal/computed fields (plain values only) | type |

### Mutation Testing

**Target: >95% mutation score.** Signal propagation, computed caching/invalidation, batch depth tracking, and subscriber detection are critical -- mutations to notification logic cause glitches (inconsistent intermediate states), and mutations to batch depth cause premature or missed flushes.

---

## DoD 6: Query Lifecycle (Spec Section 08)

### Unit Tests -- `query-state.test.ts`

| #   | Test                                                                                      | Type |
| --- | ----------------------------------------------------------------------------------------- | ---- |
| 1   | Initial state: `status: "pending"`, `fetchStatus: "idle"`, `result: undefined`            | unit |
| 2   | Loading state: `status: "pending"`, `fetchStatus: "fetching"`, `result: undefined`        | unit |
| 3   | Success state: `status: "success"`, `fetchStatus: "idle"`, `result: ok(data)`             | unit |
| 4   | Error state: `status: "error"`, `fetchStatus: "idle"`, `result: err(error)`               | unit |
| 5   | Refetching state: `status: "success"`, `fetchStatus: "fetching"`, previous data preserved | unit |
| 6   | `isPending` is `true` when `status === "pending"`                                         | unit |
| 7   | `isSuccess` is `true` when `status === "success"`                                         | unit |
| 8   | `isError` is `true` when `status === "error"`                                             | unit |
| 9   | `isFetching` is `true` when `fetchStatus === "fetching"`                                  | unit |
| 10  | `isLoading` is `true` when `isPending && isFetching`                                      | unit |
| 11  | `isRefetching` is `true` when `isSuccess && isFetching`                                   | unit |
| 12  | `isLoading` is `false` when `isPending && !isFetching` (initial idle)                     | unit |
| 13  | `isRefetching` is `false` when `isSuccess && !isFetching` (idle success)                  | unit |
| 14  | `data` is derived from `result.value` when result is Ok                                   | unit |
| 15  | `error` is derived from `result.error` when result is Err                                 | unit |
| 16  | `data` is `undefined` when result is `undefined` (pending)                                | unit |

### Unit Tests -- `staleness.test.ts`

| #   | Test                                                   | Type |
| --- | ------------------------------------------------------ | ---- |
| 17  | Entry is stale when `dataUpdatedAt === undefined`      | unit |
| 18  | Entry is stale when `isInvalidated === true`           | unit |
| 19  | Entry is stale when `now - dataUpdatedAt > staleTime`  | unit |
| 20  | Entry is fresh when `now - dataUpdatedAt <= staleTime` | unit |
| 21  | `staleTime: 0` makes data immediately stale            | unit |
| 22  | `staleTime: Infinity` makes data never stale           | unit |
| 23  | Staleness uses injectable Clock for time source        | unit |

### Unit Tests -- `dedup.test.ts`

| #   | Test                                                         | Type |
| --- | ------------------------------------------------------------ | ---- |
| 24  | `getOrCreate` returns existing in-flight result for same key | unit |
| 25  | `getOrCreate` creates new result for absent key              | unit |
| 26  | Two concurrent requests for same key produce single fetch    | unit |
| 27  | Two requests for different keys produce separate fetches     | unit |
| 28  | In-flight entry is removed on completion                     | unit |
| 29  | `cancel(key)` aborts the in-flight request                   | unit |
| 30  | `cancelAll()` aborts all in-flight requests                  | unit |
| 31  | `isInFlight(key)` returns `true` for active request          | unit |
| 32  | `isInFlight(key)` returns `false` for absent request         | unit |
| 33  | `size` reflects count of in-flight requests                  | unit |

### Unit Tests -- `retry.test.ts`

| #   | Test                                                                    | Type |
| --- | ----------------------------------------------------------------------- | ---- |
| 34  | Default retry: retries 3 times on failure                               | unit |
| 35  | `retry: 0` disables retries                                             | unit |
| 36  | `retry: false` disables retries                                         | unit |
| 37  | `retry: true` retries indefinitely (up to reasonable limit)             | unit |
| 38  | Custom retry function receives `failureCount` and typed `error`         | unit |
| 39  | Custom retry function returning `false` stops retries                   | unit |
| 40  | Default retry delay: exponential backoff `min(1000 * 2^attempt, 30000)` | unit |
| 41  | Attempt 0 delay is 1000ms                                               | unit |
| 42  | Attempt 1 delay is 2000ms                                               | unit |
| 43  | Attempt 2 delay is 4000ms                                               | unit |
| 44  | Attempt 3+ delay is capped at 30000ms                                   | unit |
| 45  | Custom retry delay function receives `attempt` and typed `error`        | unit |
| 46  | Retry is cancelled when query is cancelled                              | unit |

### Integration Tests -- `integration/lifecycle.test.ts`

| #   | Test                                                               | Type        |
| --- | ------------------------------------------------------------------ | ----------- |
| 1   | Full lifecycle: mount -> loading -> success -> data available      | integration |
| 2   | Full lifecycle: mount -> loading -> error -> retry -> success      | integration |
| 3   | Full lifecycle: mount -> loading -> error -> all retries exhausted | integration |
| 4   | Refetch: success -> invalidate -> refetching -> new success        | integration |
| 5   | Dedup: concurrent mounts trigger single fetch, both receive data   | integration |

### Mutation Testing

**Target: >95% mutation score.** State derivation rules (`isPending`/`isLoading`/`isRefetching` distinctions), staleness checks, deduplication, and retry/backoff logic are critical -- mutations to conditional branches and delay calculations must be caught.

---

## DoD 7: QueryClient (Spec Section 09)

### Unit Tests -- `query-client.test.ts`

| #   | Test                                                                               | Type |
| --- | ---------------------------------------------------------------------------------- | ---- |
| 1   | `createQueryClient(container)` creates a QueryClient                               | unit |
| 2   | `createQueryClient(container, config)` applies default options                     | unit |
| 3   | `fetch(port, params)` returns `ResultAsync<TData, TError \| QueryResolutionError>` | unit |
| 4   | `fetch` returns Ok with data on successful adapter resolution and fetch            | unit |
| 5   | `fetch` returns Err with `QueryAdapterMissing` when no adapter registered          | unit |
| 6   | `fetch` uses cached data when fresh (respects staleTime)                           | unit |
| 7   | `fetch` refetches when data is stale                                               | unit |
| 8   | `fetch` deduplicates concurrent requests for same key                              | unit |
| 9   | `prefetch(port, params)` populates cache without returning data                    | unit |
| 10  | `prefetch` returns `ResultAsync<void, ...>`                                        | unit |
| 11  | `ensureQueryData` returns cached data if fresh                                     | unit |
| 12  | `ensureQueryData` fetches if data is missing                                       | unit |
| 13  | `ensureQueryData` fetches if data is stale                                         | unit |
| 14  | `getQueryData(port, params)` returns data from cache                               | unit |
| 15  | `getQueryData` returns `undefined` for absent entry                                | unit |
| 16  | `getQueryState(port, params)` returns full state object                            | unit |
| 17  | `getQueryState` returns `undefined` for absent entry                               | unit |
| 18  | `setQueryData(port, params, data)` sets data directly in cache                     | unit |
| 19  | `setQueryData` with updater function receives previous data                        | unit |
| 20  | `setQueryData` with updater function receives `undefined` for absent entry         | unit |
| 21  | `invalidate(port, params)` marks specific query as stale                           | unit |
| 22  | `invalidate(port)` without params invalidates all queries for port                 | unit |
| 23  | `invalidateMatching(predicate)` invalidates matching queries                       | unit |
| 24  | `invalidateAll()` invalidates all queries                                          | unit |
| 25  | Active queries (with subscriber effects) refetch after invalidation                | unit |
| 26  | Inactive queries (no subscribers) are only marked stale                            | unit |
| 27  | `remove(port, params)` removes specific entry from cache                           | unit |
| 28  | `remove(port)` without params removes all entries for port                         | unit |
| 29  | `cancel(port, params)` cancels in-flight fetch for specific key                    | unit |
| 30  | `cancel(port)` without params cancels all fetches for port                         | unit |
| 31  | `cancelAll()` cancels all in-flight fetches                                        | unit |
| 32  | `reset(port, params)` removes data and cancels fetches                             | unit |
| 33  | `getReactiveEntry(port, params)` returns `ReactiveCacheEntry` for reactive access  | unit |
| 34  | `createEffect(fn)` creates a reactive effect on the client's reactive system       | unit |
| 35  | `getCache()` returns the underlying QueryCache                                     | unit |
| 36  | `isFetching()` returns count of currently fetching queries                         | unit |
| 37  | `isFetching({ port })` filters by port                                             | unit |
| 38  | `isMutating()` returns count of pending mutations                                  | unit |
| 39  | `clear()` removes all queries and subscriptions                                    | unit |
| 40  | `pause()` stops background operations                                              | unit |
| 41  | `resume()` resumes background operations                                           | unit |

### Unit Tests -- `query-client-mutation.test.ts`

| #   | Test                                                                               | Type |
| --- | ---------------------------------------------------------------------------------- | ---- |
| 42  | `mutate(port, input)` returns `ResultAsync<TData, TError \| QueryResolutionError>` | unit |
| 43  | `mutate` returns Ok with data on successful mutation                               | unit |
| 44  | `mutate` returns Err on mutation failure                                           | unit |
| 45  | Mutation effects: `invalidates` marks target ports as stale                        | unit |
| 46  | Mutation effects: `removes` removes target ports from cache                        | unit |
| 47  | Mutation effects only fire on Ok result                                            | unit |
| 48  | Mutation effects do NOT fire on Err result                                         | unit |
| 49  | `maxInvalidationDepth` prevents unbounded cascades                                 | unit |
| 50  | Exceeding `maxInvalidationDepth` produces `QueryInvalidationCycle` error           | unit |

### Unit Tests -- `query-client-disposal.test.ts`

| #   | Test                                                                  | Type |
| --- | --------------------------------------------------------------------- | ---- |
| 51  | `dispose()` cancels all in-flight queries                             | unit |
| 52  | `dispose()` stops background operations (GC, polling)                 | unit |
| 53  | `dispose()` disposes all reactive effects and clears the cache        | unit |
| 54  | After `dispose()`, `fetch` returns Err with `QueryDisposed`           | unit |
| 55  | After `dispose()`, `prefetch` returns Err with `QueryDisposed`        | unit |
| 56  | After `dispose()`, `ensureQueryData` returns Err with `QueryDisposed` | unit |
| 57  | After `dispose()`, `mutate` returns Err with `QueryDisposed`          | unit |
| 58  | `QueryDisposed` error includes the port name                          | unit |
| 59  | `createChild(scope)` creates a child QueryClient with its own cache   | unit |
| 60  | Child client resolves adapters from the scope                         | unit |
| 61  | Disposing scope disposes the child client                             | unit |
| 62  | Disposing child does not affect parent                                | unit |

### Unit Tests -- `query-resolution-error.test.ts`

| #   | Test                                                                       | Type |
| --- | -------------------------------------------------------------------------- | ---- |
| 63  | `QueryFetchFailed` has correct `_tag`, `portName`, `retryAttempt`, `cause` | unit |
| 64  | `QueryCancelled` has correct `_tag`, `portName`, `params`                  | unit |
| 65  | `QueryTimeout` has correct `_tag`, `portName`, `timeoutMs`                 | unit |
| 66  | `QueryAdapterMissing` has correct `_tag`, `portName`                       | unit |
| 67  | `QueryInvalidationCycle` has correct `_tag`, `chain`, `depth`              | unit |
| 68  | `QueryDisposed` has correct `_tag`, `portName`                             | unit |

### Type-Level Tests -- `query-client.test-d.ts`

| #   | Test                                                                                  | Type |
| --- | ------------------------------------------------------------------------------------- | ---- |
| 1   | `fetch` return type is `ResultAsync<TData, TError \| QueryResolutionError>`           | type |
| 2   | `prefetch` return type is `ResultAsync<void, TError \| QueryResolutionError>`         | type |
| 3   | `ensureQueryData` return type is `ResultAsync<TData, TError \| QueryResolutionError>` | type |
| 4   | `mutate` return type is `ResultAsync<TData, TError \| QueryResolutionError>`          | type |
| 5   | `getQueryData` return type is `TData \| undefined`                                    | type |
| 6   | `setQueryData` updater receives `TData \| undefined`                                  | type |
| 7   | `QueryResolutionError` is a discriminated union with 6 variants                       | type |
| 8   | Exhaustive switch on `QueryResolutionError._tag` covers all cases                     | type |

### Integration Tests -- `integration/query-client-pipeline.test.ts`

| #   | Test                                                               | Type        |
| --- | ------------------------------------------------------------------ | ----------- |
| 1   | Fetch -> cache -> dedup -> retry pipeline end-to-end               | integration |
| 2   | Mutation -> effects -> invalidation -> refetch pipeline end-to-end | integration |
| 3   | Optimistic update -> rollback on error -> settle                   | integration |
| 4   | Default option resolution order: per-use > port > client > global  | integration |
| 5   | QueryClient with injectable Clock for deterministic staleness      | integration |

### Mutation Testing

**Target: >90% mutation score.** QueryClient operations (fetch/invalidate/cancel/dispose) and mutation effect execution (invalidates vs removes, Ok-only gating) are critical.

---

## DoD 8: Query Introspection (Spec Section 09b)

### Unit Tests -- `query-inspector.test.ts`

| #   | Test                                                                               | Type |
| --- | ---------------------------------------------------------------------------------- | ---- |
| 1   | `getSnapshot()` returns `QuerySnapshot` with timestamp, entries, inFlight, stats   | unit |
| 2   | `getQuerySnapshot(port, params)` returns entry snapshot for existing query         | unit |
| 3   | `getQuerySnapshot(port, params)` returns `undefined` for absent query              | unit |
| 4   | `listQueryPorts()` returns info for all registered query ports                     | unit |
| 5   | `getInvalidationGraph()` returns nodes and edges from mutation effects             | unit |
| 6   | Invalidation graph nodes include all query and mutation ports                      | unit |
| 7   | Invalidation graph edges reflect `invalidates` declarations                        | unit |
| 8   | Invalidation graph edges reflect `removes` declarations                            | unit |
| 9   | `getFetchHistory()` returns recent fetch entries                                   | unit |
| 10  | `getFetchHistory({ portName })` filters by port                                    | unit |
| 11  | `getFetchHistory({ result: "error" })` filters by result                           | unit |
| 12  | `getFetchHistory({ minDurationMs })` filters slow queries                          | unit |
| 13  | `getFetchHistory({ limit })` respects limit                                        | unit |
| 14  | `getFetchHistory({ since })` filters by timestamp                                  | unit |
| 15  | `getFetchHistory({ trigger })` filters by trigger type                             | unit |
| 16  | `getCacheStats()` returns correct `totalEntries`                                   | unit |
| 17  | `getCacheStats()` returns correct `activeEntries` (hasSubscribers)                 | unit |
| 18  | `getCacheStats()` returns correct `staleEntries`                                   | unit |
| 19  | `getCacheStats()` returns correct `inFlightCount`                                  | unit |
| 20  | `getCacheStats()` computes `cacheHitRate`                                          | unit |
| 21  | `getCacheStats()` computes `avgFetchDurationMs`                                    | unit |
| 22  | `getCacheStats()` computes `gcEligibleCount`                                       | unit |
| 23  | `getQueryDependencyGraph()` returns static edges from `dependsOn`                  | unit |
| 24  | `getQueryDependencyGraph()` returns dynamic edges from `enabled` analysis          | unit |
| 25  | `getDiagnosticSummary()` returns aggregate health report                           | unit |
| 26  | `getDiagnosticSummary()` includes `dedupSavings` count                             | unit |
| 27  | `getDiagnosticSummary()` includes `errorsByTag` map                                | unit |
| 28  | `getQuerySuggestions()` returns `stale_query` when refetch rate exceeds threshold  | unit |
| 29  | `getQuerySuggestions()` returns `invalidation_storm` for rapid invalidations       | unit |
| 30  | `getQuerySuggestions()` returns `high_error_rate` for failing ports                | unit |
| 31  | `getQuerySuggestions()` returns `large_cache_entry` for oversized entries          | unit |
| 32  | `subscribe(listener)` fires `fetch-started` event                                  | unit |
| 33  | `subscribe(listener)` fires `fetch-completed` event with `result` and `durationMs` | unit |
| 34  | `subscribe(listener)` fires `fetch-cancelled` event                                | unit |
| 35  | `subscribe(listener)` fires `cache-hit` event                                      | unit |
| 36  | `subscribe(listener)` fires `deduplicated` event                                   | unit |
| 37  | `subscribe(listener)` fires `invalidated` event with source                        | unit |
| 38  | `subscribe(listener)` fires `gc-collected` event                                   | unit |
| 39  | `subscribe(listener)` fires `subscriber-added` event with count                    | unit |
| 40  | `subscribe(listener)` fires `subscriber-removed` event with count                  | unit |
| 41  | `subscribe(listener)` fires `retry` event with attempt and delay                   | unit |
| 42  | Unsubscribe stops event delivery                                                   | unit |

### Integration Tests -- `integration/introspection.test.ts`

| #   | Test                                                                                  | Type        |
| --- | ------------------------------------------------------------------------------------- | ----------- |
| 1   | Invalidation graph cycle detection: detects direct cycle (A -> B -> A)                | integration |
| 2   | Invalidation graph cycle detection: detects transitive cycle                          | integration |
| 3   | Cycle severity classification: `"error"` when longest path >= `maxInvalidationDepth`  | integration |
| 4   | Cycle severity classification: `"warning"` when longest path < `maxInvalidationDepth` | integration |
| 5   | `maxCascadeDepth` computed correctly across all mutation paths                        | integration |
| 6   | Fetch history records trigger type correctly (mount, manual, focus, interval)         | integration |
| 7   | FetchHistoryEntry includes `errorTag` from adapter error `_tag`                       | integration |
| 8   | Diagnostic summary updates across multiple fetch/error cycles                         | integration |

### Mutation Testing

**Target: >85% mutation score.** Introspection is the diagnostics layer -- cache stats calculations, cycle detection algorithm, and event emission are the highest-priority targets.

---

## DoD 9: HexDI Integration (Spec Section 10)

### Type-Level Tests -- `integration/graph-validation.test-d.ts`

| #   | Test                                                                                            | Type |
| --- | ----------------------------------------------------------------------------------------------- | ---- |
| 1   | GraphBuilder compiles when all query adapter dependencies are satisfied                         | type |
| 2   | GraphBuilder produces compile error when query adapter dependency is missing                    | type |
| 3   | `ValidateQueryDependencies`: valid deps pass through                                            | type |
| 4   | `ValidateQueryDependencies`: circular deps produce error string                                 | type |
| 5   | `ValidateQueryDependencies`: transitive cycle (A -> B -> C -> A) produces error                 | type |
| 6   | `ValidateQueryDependencies`: missing port in `dependsOn` produces error with port name          | type |
| 7   | `FindMissingPorts`: returns `never` when all deps exist                                         | type |
| 8   | `FindMissingPorts`: returns missing port name(s)                                                | type |
| 9   | `ValidateMutationEffects`: valid invalidation targets pass                                      | type |
| 10  | `ValidateMutationEffects`: missing invalidation target produces error with port name            | type |
| 11  | `ValidateMutationEffects`: missing remove target produces error with port name                  | type |
| 12  | `ValidateQueryAdapterLifetime`: singleton depending on scoped produces captive dependency error | type |
| 13  | `ValidateQueryAdapterLifetime`: scoped depending on singleton passes                            | type |
| 14  | `ValidateQueryAdapterLifetime`: transient depending on singleton passes                         | type |

### Integration Tests -- `integration/hexdi-integration.test.ts`

| #   | Test                                                                           | Type        |
| --- | ------------------------------------------------------------------------------ | ----------- |
| 1   | Graph with query adapters resolves correctly at runtime                        | integration |
| 2   | Scoped query adapter resolves scoped dependencies correctly                    | integration |
| 3   | Child QueryClient resolves adapters from scope                                 | integration |
| 4   | Scope disposal disposes child QueryClient (in-flight cancelled, cache cleared) | integration |
| 5   | Scope disposal: subsequent fetch returns `QueryDisposed`                       | integration |
| 6   | Resolution hooks fire `beforeResolve`/`afterResolve` during query fetch        | integration |
| 7   | Tracing spans include query-specific attributes (port name, cache hit, dedup)  | integration |
| 8   | Tracing spans record Result outcome (`ok`/`err`) on span                       | integration |
| 9   | Tracing spans include `errorTag` from adapter error                            | integration |
| 10  | Multi-tenant: different scopes resolve different adapter configs               | integration |
| 11  | Multi-tenant: cache isolation between tenants                                  | integration |

### Integration Tests -- `integration/cross-graph-query-deps.test-d.ts`

| #   | Test                                                                               | Type |
| --- | ---------------------------------------------------------------------------------- | ---- |
| 12  | Merged graph validates `dependsOn` across graph boundaries                         | type |
| 13  | Merged graph: missing dependency from unmerged graph produces compile error        | type |
| 14  | `forParent`: child graph `dependsOn` referencing parent port compiles              | type |
| 15  | `forParent`: child graph `dependsOn` referencing absent parent port produces error | type |
| 16  | Cross-graph cycle detection: cycle visible only after merge is caught              | type |

### Mutation Testing

**Target: >85% mutation score.** Integration boundary -- graph validation, scope resolution, and tracing attribute propagation are the key targets.

---

## DoD 10: React Integration (Spec Section 11)

### Unit Tests -- `use-query.test.tsx`

| #   | Test                                                                         | Type |
| --- | ---------------------------------------------------------------------------- | ---- |
| 1   | `useQuery(port, params)` returns `QueryState` with loading state on mount    | unit |
| 2   | `useQuery` transitions to success state after fetch completes                | unit |
| 3   | `useQuery` transitions to error state on fetch failure                       | unit |
| 4   | `useQuery` returns `data` from cache when fresh                              | unit |
| 5   | `useQuery` refetches when data is stale on mount                             | unit |
| 6   | `useQuery` with `enabled: false` does not fetch                              | unit |
| 7   | `useQuery` with `enabled` transitioning to `true` triggers fetch             | unit |
| 8   | `useQuery` with `select` transforms data                                     | unit |
| 9   | `useQuery` with `placeholderData` shows previous data during param change    | unit |
| 10  | `useQuery` with `refetchInterval` polls periodically                         | unit |
| 11  | `useQuery` stops polling when `refetchInterval: false`                       | unit |
| 12  | `useQuery` with `throwOnError: true` throws error to error boundary          | unit |
| 13  | `useQuery` with `throwOnError` function: selectively throws based on error   | unit |
| 14  | `useQuery` with `structuralSharing: false` does not apply structural sharing | unit |
| 15  | `useQuery` unmount disposes subscriber effect (no active subscribers)        | unit |
| 16  | `useQuery` re-mount creates new subscriber effect (active subscribers)       | unit |
| 17  | `refetch()` triggers immediate refetch                                       | unit |
| 18  | `useQuery` result field contains `Result<TData, TError>` after completion    | unit |

### Unit Tests -- `use-mutation.test.tsx`

| #   | Test                                                                    | Type |
| --- | ----------------------------------------------------------------------- | ---- |
| 19  | `useMutation(port)` returns idle state initially                        | unit |
| 20  | `mutate(input)` transitions to pending state                            | unit |
| 21  | `mutate` transitions to success state on Ok result                      | unit |
| 22  | `mutate` transitions to error state on Err result                       | unit |
| 23  | `onMutate` callback fires before mutation executes                      | unit |
| 24  | `onMutate` return value is available as `context`                       | unit |
| 25  | `onSuccess` callback fires with `(data, input, context)` on Ok          | unit |
| 26  | `onError` callback fires with `(error, input, context)` on Err          | unit |
| 27  | `onSettled` callback fires on both Ok and Err                           | unit |
| 28  | `mutateAsync(input)` returns `ResultAsync`                              | unit |
| 29  | `reset()` returns mutation state to idle                                | unit |
| 30  | Mutation effects: `invalidates` triggers query refetch on success       | unit |
| 31  | Mutation effects: `removes` removes query from cache on success         | unit |
| 32  | Mutation result field contains `Result<TData, TError>` after completion | unit |
| 33  | `scope: { id }` enforces serial mutation execution                      | unit |

### Unit Tests -- `use-queries.test.tsx`

| #   | Test                                                           | Type |
| --- | -------------------------------------------------------------- | ---- |
| 34  | `useQueries([...configs])` returns array of QueryState objects | unit |
| 35  | All queries execute in parallel                                | unit |
| 36  | Individual query states are independent                        | unit |
| 37  | Dynamic query list updates correctly                           | unit |

### Unit Tests -- `use-infinite-query.test.tsx`

| #   | Test                                                                  | Type |
| --- | --------------------------------------------------------------------- | ---- |
| 38  | `useInfiniteQuery` returns initial page data                          | unit |
| 39  | `fetchNextPage()` appends next page                                   | unit |
| 40  | `fetchPreviousPage()` prepends previous page                          | unit |
| 41  | `hasNextPage` is `true` when `getNextPageParam` returns non-undefined | unit |
| 42  | `hasNextPage` is `false` when `getNextPageParam` returns `undefined`  | unit |
| 43  | `isFetchingNextPage` is `true` while fetching next page               | unit |
| 44  | `pages` and `pageParams` arrays grow with each fetch                  | unit |
| 45  | `maxPages` limits the number of cached pages                          | unit |

### Unit Tests -- `use-suspense-query.test.tsx`

| #   | Test                                                                  | Type |
| --- | --------------------------------------------------------------------- | ---- |
| 46  | `useSuspenseQuery` suspends until data is available                   | unit |
| 47  | `useSuspenseQuery` returns `data: TData` (never undefined) on success | unit |
| 48  | `useSuspenseQuery` throws error to error boundary on Err              | unit |
| 49  | `useSuspenseQuery` supports `refetch()`                               | unit |

### Unit Tests -- `use-query-client.test.tsx`

| #   | Test                                                         | Type |
| --- | ------------------------------------------------------------ | ---- |
| 50  | `useQueryClient()` returns QueryClient from nearest provider | unit |
| 51  | `useQueryClient()` throws if no provider exists              | unit |

### Unit Tests -- `use-is-fetching.test.tsx`

| #   | Test                                                     | Type |
| --- | -------------------------------------------------------- | ---- |
| 52  | `useIsFetching()` returns count of all fetching queries  | unit |
| 53  | `useIsFetching({ port })` returns count filtered by port | unit |
| 54  | Count updates when queries start/complete                | unit |

### Unit Tests -- `query-client-provider.test.tsx`

| #   | Test                                                      | Type |
| --- | --------------------------------------------------------- | ---- |
| 55  | `QueryClientProvider` provides client to child components | unit |
| 56  | Nested `QueryClientProvider` overrides parent client      | unit |

### Type-Level Tests -- `react-hooks.test-d.ts`

| #   | Test                                                                                    | Type |
| --- | --------------------------------------------------------------------------------------- | ---- |
| 1   | `useQuery` overload 1: returns `QueryState<TData, TError>`                              | type |
| 2   | `useQuery` overload 2: with `select` returns `QueryState<TSelected, TError>`            | type |
| 3   | `useQuery` overload 3: params mapper receives `DependencyData<TDependsOn>`              | type |
| 4   | `DependencyData` maps dependency tuple to `{ [PortName]: PortData }` record             | type |
| 5   | `DependencyParamsMap` maps dependency tuple to `{ [PortName]: PortParams }` record      | type |
| 6   | `useMutation` returns `MutationResult<TData, TInput, TError, TContext>`                 | type |
| 7   | `mutateAsync` return type is `ResultAsync<TData, TError>`                               | type |
| 8   | `onMutate` return type must match `TContext`                                            | type |
| 9   | `onError` error parameter is typed as `TError`                                          | type |
| 10  | `useSuspenseQuery` returns `SuspenseQueryState<TData, TError>` with non-optional `data` | type |
| 11  | `useInfiniteQuery` returns `InfiniteQueryState<TData, TError>`                          | type |
| 12  | `DehydratedState` has correct shape with version field                                  | type |

### Mutation Testing

**Target: >85% mutation score.** React hook state transitions, subscriber effect lifecycle (mount/unmount/dispose), useSyncExternalStore bridge correctness, and callback invocation order are the highest-priority targets.

---

## DoD 11: Testing Utilities (Spec Section 12)

### Unit Tests -- `mock-adapters.test.ts`

| #   | Test                                                                                | Type |
| --- | ----------------------------------------------------------------------------------- | ---- |
| 1   | `createMockQueryAdapter(port, { data })` returns static data as `ResultAsync.ok`    | unit |
| 2   | `createMockQueryAdapter(port, { data: fn })` returns dynamic data based on params   | unit |
| 3   | `createMockQueryAdapter(port, { error })` returns `ResultAsync.err`                 | unit |
| 4   | `createMockQueryAdapter(port, { delay })` delays response                           | unit |
| 5   | `createMockQueryAdapter` returns a valid Adapter with singleton lifetime            | unit |
| 6   | `createMockMutationAdapter(port, { data })` returns static data as `ResultAsync.ok` | unit |
| 7   | `createMockMutationAdapter(port, { data: fn })` returns dynamic data based on input | unit |
| 8   | `createMockMutationAdapter(port, { error })` returns `ResultAsync.err`              | unit |
| 9   | `createMockMutationAdapter(port, { delay })` delays response                        | unit |

### Unit Tests -- `spy-adapters.test.ts`

| #   | Test                                                    | Type |
| --- | ------------------------------------------------------- | ---- |
| 10  | `createSpyQueryAdapter` records all fetch calls         | unit |
| 11  | `spy.calls` contains params and timestamp for each call | unit |
| 12  | `spy.lastCall` returns the most recent call             | unit |
| 13  | `spy.callCount` reflects total number of calls          | unit |
| 14  | `spy.reset()` clears recorded calls                     | unit |
| 15  | Spy adapter delegates to provided implementation        | unit |

### Unit Tests -- `assertions.test.ts`

| #   | Test                                                                                   | Type |
| --- | -------------------------------------------------------------------------------------- | ---- |
| 16  | `expectQueryState(state).toBeLoading()` passes for loading state                       | unit |
| 17  | `expectQueryState(state).toBeLoading()` fails for non-loading state                    | unit |
| 18  | `expectQueryState(state).toBeSuccess()` passes for success state                       | unit |
| 19  | `expectQueryState(state).toBeSuccess(data)` checks data equality                       | unit |
| 20  | `expectQueryState(state).toBeError()` passes for error state                           | unit |
| 21  | `expectQueryState(state).toBeError(error)` checks error equality                       | unit |
| 22  | `expectQueryState(state).toBeRefetching()` passes for refetching state                 | unit |
| 23  | `expectQueryState(state).toBeFresh()` passes for fresh data                            | unit |
| 24  | `expectQueryState(state).toBeStale()` passes for stale data                            | unit |
| 25  | `expectCacheEntry(client, port, params).toExist()` passes for existing entry           | unit |
| 26  | `expectCacheEntry(client, port, params).toNotExist()` passes for absent entry          | unit |
| 27  | `expectCacheEntry(client, port, params).toHaveData(expected)` checks data              | unit |
| 28  | `expectCacheEntry(client, port, params).toBeStale()` checks staleness                  | unit |
| 29  | `expectCacheEntry(client, port, params).toBeFresh()` checks freshness                  | unit |
| 30  | `expectCacheEntry(client, port, params).toHaveSubscribers()` checks active subscribers | unit |
| 31  | `expectQueryResult(result).toBeOk()` passes for Ok result                              | unit |
| 32  | `expectQueryResult(result).toBeOk(data)` checks data equality                          | unit |
| 33  | `expectQueryResult(result).toBeErr()` passes for Err result                            | unit |
| 34  | `expectQueryResult(result).toBeErr(error)` checks error equality                       | unit |
| 35  | `expectQueryResult(undefined).toBeUndefined()` passes                                  | unit |

### Unit Tests -- `test-containers.test.ts`

| #   | Test                                                                     | Type |
| --- | ------------------------------------------------------------------------ | ---- |
| 36  | `createQueryTestContainer([adapters])` returns container and queryClient | unit |
| 37  | `createQueryTestContainer` dispose cancels pending and clears cache      | unit |
| 38  | `useQueryTestContainer([adapters])` provides fresh container per test    | unit |
| 39  | `useQueryTestContainer` auto-disposes after each test                    | unit |
| 40  | `createQueryTestScope([adapters])` creates isolated scope with client    | unit |
| 41  | `createQueryTestScope` dispose cancels pending and clears scope          | unit |

### Unit Tests -- `react-test-helpers.test.tsx`

| #   | Test                                                                  | Type |
| --- | --------------------------------------------------------------------- | ---- |
| 42  | `createQueryTestWrapper([adapters])` wraps component with providers   | unit |
| 43  | `renderWithQueryContainer(ui, { adapters })` renders with providers   | unit |
| 44  | `renderWithQueryContainer` returns `queryClient` for cache assertions | unit |

### Integration Tests -- `integration/test-utilities.test.ts`

| #   | Test                                                                 | Type        |
| --- | -------------------------------------------------------------------- | ----------- |
| 1   | Full test flow: create container -> fetch -> assert cache -> dispose | integration |
| 2   | Scope isolation: two test scopes have independent caches             | integration |
| 3   | Spy adapter tracks calls through full fetch pipeline                 | integration |

### Mutation Testing

**Target: >90% mutation score.** Testing utilities are the foundation for all other tests -- mock adapter data/error routing, spy recording, and assertion logic must be reliable.

---

## DoD 12: Advanced Patterns & SSR (Spec Section 13)

### Integration Tests -- `integration/dependent-queries.test.ts`

| #   | Test                                                                  | Type        |
| --- | --------------------------------------------------------------------- | ----------- |
| 1   | Dependent query defers until dependency has data                      | integration |
| 2   | Dependent query auto-fetches when dependency data becomes available   | integration |
| 3   | Chained dependencies: A -> B -> C executes in order                   | integration |
| 4   | Dependency data is passed to params mapper correctly                  | integration |
| 5   | Dynamic dependency via `enabled` defers correctly                     | integration |
| 6   | `safeTry` chains multiple query fetches with typed error accumulation | integration |
| 7   | `safeTry` short-circuits on first Err in query chain                  | integration |

### Integration Tests -- `integration/parallel-queries.test.ts`

| #   | Test                                                        | Type        |
| --- | ----------------------------------------------------------- | ----------- |
| 8   | `ResultAsync.collect` executes multiple fetches in parallel | integration |
| 9   | Parallel prefetch populates cache for multiple ports        | integration |

### Integration Tests -- `integration/optimistic-updates.test.ts`

| #   | Test                                                                              | Type        |
| --- | --------------------------------------------------------------------------------- | ----------- |
| 10  | Optimistic update: `onMutate` snapshot -> optimistic set -> success -> invalidate | integration |
| 11  | Optimistic update: `onMutate` snapshot -> optimistic set -> error -> rollback     | integration |
| 12  | Optimistic update: `onSettled` fires after both Ok and Err                        | integration |
| 13  | Optimistic update: cancel in-flight queries before snapshot                       | integration |

### Integration Tests -- `integration/polling.test.ts`

| #   | Test                                                                        | Type        |
| --- | --------------------------------------------------------------------------- | ----------- |
| 14  | `refetchInterval` triggers periodic refetches                               | integration |
| 15  | `refetchIntervalInBackground: false` pauses polling when window loses focus | integration |
| 16  | Conditional polling stops when condition returns `false`                    | integration |

### Integration Tests -- `integration/window-focus-reconnect.test.ts`

| #   | Test                                                             | Type        |
| --- | ---------------------------------------------------------------- | ----------- |
| 17  | `refetchOnWindowFocus: true` refetches stale data on focus       | integration |
| 18  | `refetchOnWindowFocus: "always"` refetches fresh data on focus   | integration |
| 19  | `refetchOnReconnect: true` refetches stale data on reconnect     | integration |
| 20  | `refetchOnReconnect: "always"` refetches fresh data on reconnect | integration |

### Integration Tests -- `integration/cache-persistence.test.ts`

| #   | Test                                                          | Type        |
| --- | ------------------------------------------------------------- | ----------- |
| 21  | Persist on cache update: entry is saved to persister          | integration |
| 22  | Restore on client creation: entries are loaded from persister | integration |
| 23  | Buster change discards all persisted entries                  | integration |
| 24  | Stale persisted entries trigger refetch on restore            | integration |
| 25  | Cache entry serializes via `Result.toJSON()` round-trip       | integration |

### E2E Tests -- `e2e/ssr.test.ts`

| #   | Test                                                                    | Type |
| --- | ----------------------------------------------------------------------- | ---- |
| 1   | SSR: prefetch -> dehydrate -> hydrate -> client finds data in cache     | e2e  |
| 2   | SSR: hydrated data is fresh (no client re-fetch)                        | e2e  |
| 3   | SSR: `DehydratedState` includes version field for forward compatibility | e2e  |
| 4   | SSR: scope disposal after render cleans up server-side resources        | e2e  |

### E2E Tests -- `e2e/streaming-ssr.test.ts`

| #   | Test                                                                        | Type |
| --- | --------------------------------------------------------------------------- | ---- |
| 5   | Streaming SSR: shell renders immediately                                    | e2e  |
| 6   | Streaming SSR: Suspense boundaries resolve during streaming                 | e2e  |
| 7   | Streaming SSR: dehydrated state appended at stream end captures all queries | e2e  |

### E2E Tests -- `e2e/react-lifecycle.test.tsx`

| #   | Test                                                               | Type |
| --- | ------------------------------------------------------------------ | ---- |
| 8   | Component lifecycle: mount -> loading spinner -> success data      | e2e  |
| 9   | Component lifecycle: mount -> loading -> error display             | e2e  |
| 10  | Component lifecycle: success -> refetch -> updated data            | e2e  |
| 11  | Component lifecycle: stale data shown while refetching             | e2e  |
| 12  | Mutation: submit -> optimistic update visible -> server confirm    | e2e  |
| 13  | Mutation: submit -> optimistic update -> server reject -> rollback | e2e  |

### E2E Tests -- `e2e/infinite-query.test.tsx`

| #   | Test                                                           | Type |
| --- | -------------------------------------------------------------- | ---- |
| 14  | Infinite query: initial load -> fetchNextPage -> appended data | e2e  |
| 15  | Infinite query: `hasNextPage` reflects available pages         | e2e  |

### E2E Tests -- `e2e/dependent-queries.test.tsx`

| #   | Test                                                                           | Type |
| --- | ------------------------------------------------------------------------------ | ---- |
| 16  | Dependent query: dependency loading -> dependency success -> dependent fetches | e2e  |
| 17  | Dependent query: component renders loading state for each stage                | e2e  |

### E2E Tests -- `e2e/scope-lifecycle.test.tsx`

| #   | Test                                                               | Type |
| --- | ------------------------------------------------------------------ | ---- |
| 18  | Multi-tenant: switching tenant creates new scope with fresh cache  | e2e  |
| 19  | Scope disposal during active fetches: queries cancelled gracefully | e2e  |
| 20  | Scope disposal: components see error state for disposed queries    | e2e  |

### E2E Tests -- `e2e/error-boundary.test.tsx`

| #   | Test                                                          | Type |
| --- | ------------------------------------------------------------- | ---- |
| 21  | `throwOnError: true` propagates error to React error boundary | e2e  |
| 22  | Error boundary renders fallback UI                            | e2e  |
| 23  | Error boundary recovery: retry after error boundary catch     | e2e  |

### E2E Tests -- `e2e/suspense.test.tsx`

| #   | Test                                                               | Type |
| --- | ------------------------------------------------------------------ | ---- |
| 24  | `useSuspenseQuery` shows Suspense fallback during loading          | e2e  |
| 25  | `useSuspenseQuery` renders data after suspension resolves          | e2e  |
| 26  | `useSuspenseQuery` error propagates to ErrorBoundary, not Suspense | e2e  |

### E2E Tests -- `e2e/select-composition.test.tsx`

| #   | Test                                                              | Type |
| --- | ----------------------------------------------------------------- | ---- |
| 27  | Multiple components with different `select` share one cache entry | e2e  |
| 28  | `select` re-renders only when selected value changes              | e2e  |

### Mutation Testing

**Target: >85% mutation score.** SSR dehydrate/hydrate protocol, optimistic update rollback, and dependent query deferral are the highest-priority targets.

---

## Test Count Summary

| Category          | Count    |
| ----------------- | -------- |
| Unit tests        | ~420     |
| Type-level tests  | ~83      |
| Integration tests | ~65      |
| E2E tests         | ~28      |
| **Total**         | **~596** |

## Verification Checklist

Before marking the spec as "implemented," the following must all pass:

| Check                               | Command                                                                | Expected   |
| ----------------------------------- | ---------------------------------------------------------------------- | ---------- |
| All unit tests pass                 | `pnpm --filter @hex-di/query test`                                     | 0 failures |
| All type tests pass                 | `pnpm --filter @hex-di/query test:types`                               | 0 failures |
| All integration tests pass          | `pnpm --filter @hex-di/query test -- --dir integration`                | 0 failures |
| All e2e tests pass                  | `pnpm --filter @hex-di/query test -- --dir e2e`                        | 0 failures |
| React hook tests pass               | `pnpm --filter @hex-di/query-react test`                               | 0 failures |
| Testing package tests pass          | `pnpm --filter @hex-di/query-testing test`                             | 0 failures |
| Typecheck passes                    | `pnpm --filter @hex-di/query typecheck`                                | 0 errors   |
| React typecheck passes              | `pnpm --filter @hex-di/query-react typecheck`                          | 0 errors   |
| Testing typecheck passes            | `pnpm --filter @hex-di/query-testing typecheck`                        | 0 errors   |
| Lint passes                         | `pnpm --filter @hex-di/query lint`                                     | 0 errors   |
| React lint passes                   | `pnpm --filter @hex-di/query-react lint`                               | 0 errors   |
| Testing lint passes                 | `pnpm --filter @hex-di/query-testing lint`                             | 0 errors   |
| No `any` types in source            | `grep -r "any" libs/query/core/src/`                                   | 0 matches  |
| No type casts in source             | `grep -r " as " libs/query/core/src/`                                  | 0 matches  |
| No eslint-disable in source         | `grep -r "eslint-disable" libs/query/core/src/`                        | 0 matches  |
| Mutation score (cache key)          | `pnpm --filter @hex-di/query stryker -- --mutate src/cache/key/**`     | >95%       |
| Mutation score (state)              | `pnpm --filter @hex-di/query stryker -- --mutate src/state/**`         | >95%       |
| Mutation score (structural sharing) | `pnpm --filter @hex-di/query stryker -- --mutate src/cache/sharing/**` | >95%       |
| Mutation score (dedup)              | `pnpm --filter @hex-di/query stryker -- --mutate src/dedup/**`         | >95%       |
| Mutation score (retry)              | `pnpm --filter @hex-di/query stryker -- --mutate src/retry/**`         | >95%       |
| Mutation score (client)             | `pnpm --filter @hex-di/query stryker -- --mutate src/client/**`        | >90%       |
| Mutation score (mutation effects)   | `pnpm --filter @hex-di/query stryker -- --mutate src/mutation/**`      | >90%       |
| Mutation score (reactivity)         | `pnpm --filter @hex-di/query stryker -- --mutate src/reactivity/**`    | >95%       |
| Mutation score (GC)                 | `pnpm --filter @hex-di/query stryker -- --mutate src/gc/**`            | >90%       |
| Mutation score (introspection)      | `pnpm --filter @hex-di/query stryker -- --mutate src/inspector/**`     | >85%       |
| Mutation score (React hooks)        | `pnpm --filter @hex-di/query-react stryker`                            | >85%       |

## Mutation Testing Strategy

### Why Mutation Testing Matters for @hex-di/query

The query system has several critical behavioral invariants where test suites that merely check "method exists" or "returns data" would miss subtle inversions:

- Signal propagation: skipping `signal.set()` silently drops state updates; using `peek()` instead of `get()` breaks dependency tracking and prevents re-evaluation
- Batch integrity: missing `startBatch()`/`endBatch()` calls cause glitches (subscribers see intermediate inconsistent state during multi-signal writes)
- Computed caching: failing to invalidate a computed when upstream changes serves stale derived state; over-invalidating causes redundant computation
- Per-scope isolation: leaking signals across reactive system boundaries causes cross-tenant interference
- Cache key determinism: `stableStringify` key ordering mutations cause cache misses for equivalent parameters
- State derivation: `isLoading` vs `isPending` vs `isRefetching` are distinct combinations of `status` and `fetchStatus` -- swapping conditions produces subtly wrong UI states
- Structural sharing: returning `next` instead of `prev` when data is unchanged causes unnecessary re-renders; returning `prev` when data changed shows stale data
- Deduplication: failing to deduplicate causes redundant network requests; over-deduplicating returns stale data to new subscribers
- Retry backoff: exponential cap mutations cause either immediate retries (no backoff) or infinite waits (cap too high)
- Mutation effects: firing effects on Err instead of Ok corrupts the cache; skipping invalidation leaves stale data visible
- Optimistic updates: rolling back on Ok instead of Err, or failing to rollback on Err, corrupts displayed data
- Subscriber-tracked GC: `hasSubscribers()` returning wrong result either leaks entries (false negative) or prematurely collects active data (false positive)

### Mutation Targets by Priority

| Priority | Module                                                     | Target Score | Rationale                                     |
| -------- | ---------------------------------------------------------- | ------------ | --------------------------------------------- |
| Critical | Reactivity (signals, computeds, batch, system isolation)   | >95%         | Foundation: wrong propagation = glitches      |
| Critical | Cache key generation (`stableStringify`, `createCacheKey`) | >95%         | Wrong keys = data corruption and cache misses |
| Critical | State derivation (`isPending`/`isLoading`/`isRefetching`)  | >95%         | Wrong booleans = wrong UI states              |
| Critical | Structural sharing (`replaceEqualDeep`)                    | >95%         | Reference stability = React performance       |
| Critical | Deduplication manager                                      | >95%         | Double-fetch prevention                       |
| Critical | Retry/backoff                                              | >95%         | Exponential cap and retry-count gating        |
| High     | QueryClient operations (fetch/invalidate/cancel/dispose)   | >90%         | Core API surface                              |
| High     | Mutation effects (invalidates vs removes)                  | >90%         | Ok-only gating is critical distinction        |
| High     | GC eligibility checks                                      | >90%         | Memory management correctness                 |
| Medium   | Introspection (inspector, diagnostics, suggestions)        | >85%         | Diagnostics layer, not critical path          |
| Medium   | React hooks (useQuery, useMutation state management)       | >85%         | Framework binding layer                       |

### Mutation Operators to Prioritize

- **Conditional boundary mutations**: `===` -> `!==`, `>` -> `>=` (catches staleness checks, GC eligibility, retry count comparisons)
- **Return value mutations**: `return Ok(x)` -> `return Err(x)` (catches variant confusion in adapter results)
- **Block removal**: Removing `if (result.isErr()) return` (catches missing short-circuit on error)
- **Method call mutations**: `invalidate(port)` -> skip (catches missing cache effect execution)
- **Boolean literal mutations**: `true` -> `false` in `isInvalidated`, `isFetching` flags
- **Arithmetic mutations**: `2 ** attempt` -> `2 * attempt` (catches exponential backoff formula)
- **Signal mutations**: `signal.set(x)` -> skip (catches missing propagation), `signal.get()` -> `signal.peek()` (catches lost dependency tracking)
- **Batch mutations**: `startBatch()` -> skip, `endBatch()` -> skip (catches missing batching causing glitches or premature flushes)
- **Computed mutations**: Removing computed dependency reads (catches missing reactive tracking in derived state)

---

_Previous: [15 - Appendices](./15-appendices.md)_

_End of Definition of Done_
