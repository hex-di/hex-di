# 17 - Definition of Done: Cross-Library Integration

_Previous: [README](./README.md)_

---

This document defines all tests required for cross-library integration testing to be considered complete. Each section maps to one of the 6 integration pair specs in `spec/integration/` and specifies required integration tests, mock adapter tests, and mutation testing guidance. The test infrastructure lives in `testing/cross-library/`.

## Test File Convention

| Test Category              | File Pattern                  | Location                       |
| -------------------------- | ----------------------------- | ------------------------------ |
| Store + Query tests        | `store-query.test.ts`         | `testing/cross-library/tests/` |
| Flow + Saga tests          | `flow-saga.test.ts`           | `testing/cross-library/tests/` |
| Store + Flow tests         | `store-flow.test.ts`          | `testing/cross-library/tests/` |
| Store + Saga tests         | `store-saga.test.ts`          | `testing/cross-library/tests/` |
| Query + Saga tests         | `query-saga.test.ts`          | `testing/cross-library/tests/` |
| Query + Flow tests         | `query-flow.test.ts`          | `testing/cross-library/tests/` |
| Mock adapter factory tests | `mock-adapters.test.ts`       | `testing/cross-library/tests/` |
| Test graph builder tests   | `test-graph-builders.test.ts` | `testing/cross-library/tests/` |

---

## DoD 1: Store + Query (~25 tests)

Based on `spec/integration/store-query.md` -- 4 patterns and 3 anti-patterns.

### Integration Tests -- `store-query.test.ts`

#### Pattern 1: Cache-to-State Sync

| #   | Test                                                                      | Type        |
| --- | ------------------------------------------------------------------------- | ----------- |
| 1   | Cache sync adapter subscribes to query cache and dispatches store actions | integration |
| 2   | Store state reflects query data after cache update                        | integration |
| 3   | Cache sync adapter handles query error without updating store state       | integration |
| 4   | Cache sync adapter cleanup unsubscribes on stop                           | integration |

#### Pattern 2: Mutation-to-State Coordination

| #   | Test                                                           | Type        |
| --- | -------------------------------------------------------------- | ----------- |
| 5   | Mutation success triggers coordinator to dispatch store action | integration |
| 6   | Mutation failure does not dispatch store action                | integration |

#### Pattern 3: Unified Optimistic Updates

| #   | Test                                                               | Type        |
| --- | ------------------------------------------------------------------ | ----------- |
| 7   | Optimistic add applies pending entry to store immediately          | integration |
| 8   | Mutation success confirms optimistic entry and removes pending     | integration |
| 9   | Mutation failure rolls back optimistic entry to pre-mutation state | integration |
| 10  | Concurrent optimistic mutations track independent pending entries  | integration |

#### Pattern 4: Query-Driven Derived State

| #   | Test                                                                 | Type        |
| --- | -------------------------------------------------------------------- | ----------- |
| 11  | Async derived port delegates computation to query fetcher            | integration |
| 12  | Query caching applies to derived port resolution (staleTime honored) | integration |
| 13  | Reactive subscriptions on derived port re-emit on query cache update | integration |
| 14  | Typed errors from query layer propagate through derived port         | integration |

#### Anti-Patterns

| #   | Test                                                                        | Type        |
| --- | --------------------------------------------------------------------------- | ----------- |
| 15  | Direct query cache access from store adapter is detected as anti-pattern    | integration |
| 16  | Circular sync (store -> query -> store) is detected and prevented           | integration |
| 17  | Dual source of truth (independent store and query for same data) is flagged | integration |

### Mutation Testing

**Target: >90% mutation score.** Cache-to-state sync subscription logic, optimistic update confirm/rollback branches, and anti-pattern detection guards are critical paths.

---

## DoD 2: Flow + Saga (~20 tests)

Based on `spec/integration/flow-saga.md` -- 3 patterns and 3 anti-patterns.

### Integration Tests -- `flow-saga.test.ts`

#### Pattern 1: Flow Triggers Saga

| #   | Test                                                                                          | Type        |
| --- | --------------------------------------------------------------------------------------------- | ----------- |
| 1   | Machine invokes saga via Effect.invoke and receives done.invoke event on success              | integration |
| 2   | Machine receives error.invoke event with SagaError on saga failure                            | integration |
| 3   | Machine context is updated with saga output on done.invoke                                    | integration |
| 4   | Error discrimination on sagaError.\_tag distinguishes StepFailed, CompensationFailed, Timeout | integration |

#### Pattern 2: Saga Step Uses Flow

| #   | Test                                                                 | Type        |
| --- | -------------------------------------------------------------------- | ----------- |
| 5   | Saga step invokes Flow-backed port and receives result               | integration |
| 6   | Saga step timeout fires when Flow-backed port exceeds timeout        | integration |
| 7   | Compensation cancels the Flow-backed operation on later step failure | integration |

#### Pattern 3: Saga Progress Feedback

| #   | Test                                                                         | Type        |
| --- | ---------------------------------------------------------------------------- | ----------- |
| 8   | Progress events (StepCompleted) are routed to machine via activity EventSink | integration |
| 9   | Machine context tracks completedSteps and totalSteps from progress events    | integration |
| 10  | CompensationTriggered event transitions machine to compensating state        | integration |
| 11  | Compensation visibility: machine reflects compensation status in context     | integration |

#### Anti-Patterns

| #   | Test                                                                                   | Type        |
| --- | -------------------------------------------------------------------------------------- | ----------- |
| 12  | Tight coupling via direct saga import (bypassing port) is prevented                    | integration |
| 13  | Blocking saga step without timeout is detected                                         | integration |
| 14  | Ignoring compensation events leaves machine in stale state (verifies correct handling) | integration |

### Mutation Testing

**Target: >90% mutation score.** Effect.invoke result mapping (Ok -> done.invoke, Err -> error.invoke), timeout enforcement, and compensation event routing are critical paths.

---

## DoD 3: Store + Flow (~15 tests)

Based on `spec/integration/store-flow.md` -- 3 patterns and 3 anti-patterns.

### Integration Tests -- `store-flow.test.ts`

#### Pattern 1: Machine Transitions Update Store

| #   | Test                                                              | Type        |
| --- | ----------------------------------------------------------------- | ----------- |
| 1   | Effect.invoke dispatches store action on machine transition       | integration |
| 2   | Store state reflects dispatched action after transition completes | integration |
| 3   | Multiple transitions dispatch correct sequence of store actions   | integration |

#### Pattern 2: Store Changes Trigger Machine Events

| #   | Test                                                                          | Type        |
| --- | ----------------------------------------------------------------------------- | ----------- |
| 4   | Activity subscribes to store port and emits events to machine on state change | integration |
| 5   | Machine transitions in response to store-emitted events                       | integration |
| 6   | Activity cleanup unsubscribes from store when machine exits subscribing state | integration |

#### Pattern 3: Shared Domain State Guidelines

| #   | Test                                                                              | Type        |
| --- | --------------------------------------------------------------------------------- | ----------- |
| 7   | Machine context holds transient workflow data, store holds persistent domain data | integration |
| 8   | Machine reads store state via Effect.invoke rather than duplicating in context    | integration |

#### Anti-Patterns

| #   | Test                                                                         | Type        |
| --- | ---------------------------------------------------------------------------- | ----------- |
| 9   | Duplicated domain state in machine context diverges from store state         | integration |
| 10  | Store subscription without activity lifecycle leaks on scope disposal        | integration |
| 11  | Bidirectional sync without change detection creates infinite loop (detected) | integration |

### Mutation Testing

**Target: >90% mutation score.** Effect.invoke dispatch correctness, activity subscription/cleanup lifecycle, and loop detection guards are critical paths.

---

## DoD 4: Store + Saga (~15 tests)

Based on `spec/integration/store-saga.md` -- 3 patterns and 3 anti-patterns.

### Integration Tests -- `store-saga.test.ts`

#### Pattern 1: Saga Step Reads Store State

| #   | Test                                                               | Type        |
| --- | ------------------------------------------------------------------ | ----------- |
| 1   | Saga step resolves StatePort and reads current state from ctx.deps | integration |
| 2   | Step uses store state as input to port invocation                  | integration |

#### Pattern 2: Saga Step Updates Store State

| #   | Test                                                              | Type        |
| --- | ----------------------------------------------------------------- | ----------- |
| 3   | Saga step dispatches store actions via effect port                | integration |
| 4   | Store state reflects dispatched action after step execution       | integration |
| 5   | Compensation dispatches rollback action to restore previous state | integration |

#### Pattern 3: Saga Completion Refreshes Store

| #   | Test                                                                 | Type        |
| --- | -------------------------------------------------------------------- | ----------- |
| 6   | Final saga step dispatches refresh actions to store on success       | integration |
| 7   | Refresh step is skipped when compensation runs (earlier step failed) | integration |

#### Anti-Patterns

| #   | Test                                                                         | Type        |
| --- | ---------------------------------------------------------------------------- | ----------- |
| 8   | Direct store mutation from saga step (bypassing port) is prevented           | integration |
| 9   | Using store as saga persistence backend is flagged as anti-pattern           | integration |
| 10  | Reading stale store state across async saga steps produces incorrect results | integration |

### Mutation Testing

**Target: >90% mutation score.** Compensation rollback dispatch, refresh-on-success-only logic, and stale state detection are critical paths.

---

## DoD 5: Query + Saga (~18 tests)

Based on `spec/integration/query-saga.md` -- 3 patterns and 3 anti-patterns.

### Integration Tests -- `query-saga.test.ts`

#### Pattern 1: Saga Step Fetches via Query Port

| #   | Test                                                   | Type        |
| --- | ------------------------------------------------------ | ----------- |
| 1   | Saga step fetches data through QueryPort adapter       | integration |
| 2   | Query cache serves cached data when within staleTime   | integration |
| 3   | Concurrent saga executions deduplicate query fetches   | integration |
| 4   | Query failure propagates as SagaError with typed cause | integration |

#### Pattern 2: Saga Completion Invalidates Queries

| #   | Test                                                                 | Type        |
| --- | -------------------------------------------------------------------- | ----------- |
| 5   | Final saga step invalidates targeted query ports via QueryClientPort | integration |
| 6   | Only affected query ports are invalidated (not all queries)          | integration |
| 7   | Cache invalidation step is skipped when compensation runs            | integration |

#### Pattern 3: Saga-Managed Mutation Sequence

| #   | Test                                                                       | Type        |
| --- | -------------------------------------------------------------------------- | ----------- |
| 8   | Saga executes mutation steps in sequential order                           | integration |
| 9   | Each mutation's cache effects fire on success                              | integration |
| 10  | Saga failure triggers compensation with reverse mutations in reverse order | integration |
| 11  | Reverse mutations trigger their own cache effects during compensation      | integration |

#### Anti-Patterns

| #   | Test                                                                         | Type        |
| --- | ---------------------------------------------------------------------------- | ----------- |
| 12  | Saga step bypassing query cache (direct HTTP) misses cache benefits          | integration |
| 13  | Over-invalidation (invalidateAll) forces unnecessary refetches               | integration |
| 14  | Mutation step without compensation leaves cache inconsistent on saga failure | integration |

### Mutation Testing

**Target: >90% mutation score.** Cache deduplication, targeted invalidation vs over-invalidation, and compensation-triggered cache effects are critical paths.

---

## DoD 6: Query + Flow (~15 tests)

Based on `spec/integration/query-flow.md` -- 3 patterns and 2 anti-patterns.

### Integration Tests -- `query-flow.test.ts`

#### Pattern 1: Machine Effect Triggers Query Fetch

| #   | Test                                                                           | Type        |
| --- | ------------------------------------------------------------------------------ | ----------- |
| 1   | Machine transitions to loading state and invokes query fetch via Effect.invoke | integration |
| 2   | done.invoke event transitions machine to loaded with fetched data              | integration |
| 3   | error.invoke event transitions machine to error with error message             | integration |
| 4   | Retry from error state re-invokes query fetch                                  | integration |

#### Pattern 2: Machine Effect Invalidates Query

| #   | Test                                                      | Type        |
| --- | --------------------------------------------------------- | ----------- |
| 5   | Machine invalidates query cache after successful mutation | integration |
| 6   | Invalidated query is refetched on next mount              | integration |

#### Pattern 3: Query State Drives Machine Transitions

| #   | Test                                                                     | Type        |
| --- | ------------------------------------------------------------------------ | ----------- |
| 7   | Activity subscribes to query port and emits QUERY_LOADING event          | integration |
| 8   | Activity emits QUERY_SUCCESS with data on successful fetch               | integration |
| 9   | Activity emits QUERY_ERROR on fetch failure                              | integration |
| 10  | Activity is cancelled via AbortSignal when machine exits observing state | integration |

#### Anti-Patterns

| #   | Test                                                                            | Type        |
| --- | ------------------------------------------------------------------------------- | ----------- |
| 11  | Polling via Effect.delay instead of refetchInterval is detected as anti-pattern | integration |
| 12  | Storing query data in machine context long-term diverges from cache             | integration |

### Mutation Testing

**Target: >90% mutation score.** Effect.invoke result mapping, activity event emission, and AbortSignal cancellation are critical paths.

---

## DoD 7: Mock Adapter Factories (~15 tests)

Tests for the mock adapter factories provided by `testing/cross-library/` for use in integration tests.

### Unit Tests -- `mock-adapters.test.ts`

#### InMemoryStateAdapter

| #   | Test                                                       | Type |
| --- | ---------------------------------------------------------- | ---- |
| 1   | InMemoryStateAdapter factory creates a valid state adapter | unit |
| 2   | Initial state is set correctly from factory options        | unit |
| 3   | Actions dispatch correctly and update state                | unit |
| 4   | Subscribe notifies on state change                         | unit |

#### FakeQueryAdapter

| #   | Test                                                               | Type |
| --- | ------------------------------------------------------------------ | ---- |
| 5   | FakeQueryAdapter factory creates a valid query adapter             | unit |
| 6   | Adapter returns fixed data provided at creation                    | unit |
| 7   | Adapter supports error configuration (returns Err when configured) | unit |

#### FakeMutationAdapter

| #   | Test                                                         | Type |
| --- | ------------------------------------------------------------ | ---- |
| 8   | FakeMutationAdapter factory creates a valid mutation adapter | unit |
| 9   | Adapter records mutation calls with input                    | unit |
| 10  | Adapter returns configurable response                        | unit |

#### MockFlowAdapter

| #   | Test                                                 | Type |
| --- | ---------------------------------------------------- | ---- |
| 11  | MockFlowAdapter factory creates a valid flow adapter | unit |
| 12  | Adapter simulates machine state transitions          | unit |

#### FakeSagaAdapter

| #   | Test                                                            | Type |
| --- | --------------------------------------------------------------- | ---- |
| 13  | FakeSagaAdapter factory creates a valid saga adapter            | unit |
| 14  | Adapter simulates saga execution with configurable result       | unit |
| 15  | Adapter supports failure configuration for compensation testing | unit |

### Mutation Testing

**Target: >95% mutation score.** Mock factories are the foundation of all integration tests -- incorrect mocks would silently invalidate the entire test suite.

---

## DoD 8: Test Graph Builders (~10 tests)

Tests for the test graph builder utilities that compose mock adapters into valid graphs.

### Unit Tests -- `test-graph-builders.test.ts`

| #   | Test                                                               | Type |
| --- | ------------------------------------------------------------------ | ---- |
| 1   | Builder creates a valid graph from mock adapters                   | unit |
| 2   | Builder validates that all required ports are satisfied            | unit |
| 3   | Adapters from different libraries are composable in a single graph | unit |
| 4   | Scope creation from test graph works correctly                     | unit |
| 5   | Builder supports overriding a single adapter for failure testing   | unit |
| 6   | Builder supports mixing real and mock adapters                     | unit |
| 7   | Graph disposal cleans up all adapters                              | unit |
| 8   | Builder rejects duplicate port providers                           | unit |
| 9   | Builder rejects graphs with unsatisfied port dependencies          | unit |
| 10  | Container created from test graph resolves all ports               | unit |

### Mutation Testing

**Target: >95% mutation score.** Builder validation logic must catch all graph composition errors.

---

## Test Count Summary

| Category               | Count   |
| ---------------------- | ------- |
| Store + Query          | 17      |
| Flow + Saga            | 14      |
| Store + Flow           | 11      |
| Store + Saga           | 10      |
| Query + Saga           | 14      |
| Query + Flow           | 12      |
| Mock Adapter Factories | 15      |
| Test Graph Builders    | 10      |
| **Total**              | **103** |

## Verification Checklist

Before marking the cross-library integration spec as "implemented," the following must all pass:

| Check                               | Command                                                                      | Expected   |
| ----------------------------------- | ---------------------------------------------------------------------------- | ---------- |
| All integration tests pass          | `pnpm --filter testing-cross-library test`                                   | 0 failures |
| Typecheck passes                    | `pnpm --filter testing-cross-library typecheck`                              | 0 errors   |
| Lint passes                         | `pnpm --filter testing-cross-library lint`                                   | 0 errors   |
| No `any` types in source            | `grep -r "any" testing/cross-library/src/`                                   | 0 matches  |
| No type casts in source             | `grep -r " as " testing/cross-library/src/`                                  | 0 matches  |
| No eslint-disable in source         | `grep -r "eslint-disable" testing/cross-library/src/`                        | 0 matches  |
| Store + Query mutation score        | `pnpm --filter testing-cross-library stryker -- --mutate src/store-query/**` | >90%       |
| Flow + Saga mutation score          | `pnpm --filter testing-cross-library stryker -- --mutate src/flow-saga/**`   | >90%       |
| Store + Flow mutation score         | `pnpm --filter testing-cross-library stryker -- --mutate src/store-flow/**`  | >90%       |
| Store + Saga mutation score         | `pnpm --filter testing-cross-library stryker -- --mutate src/store-saga/**`  | >90%       |
| Query + Saga mutation score         | `pnpm --filter testing-cross-library stryker -- --mutate src/query-saga/**`  | >90%       |
| Query + Flow mutation score         | `pnpm --filter testing-cross-library stryker -- --mutate src/query-flow/**`  | >90%       |
| Mock adapter factory mutation score | `pnpm --filter testing-cross-library stryker -- --mutate src/mocks/**`       | >95%       |
| Test graph builder mutation score   | `pnpm --filter testing-cross-library stryker -- --mutate src/builders/**`    | >95%       |

## Mutation Testing Strategy

### Why Mutation Testing Matters for Cross-Library Integration

Integration tests verify that port composition wires libraries together correctly. A test suite that merely checks "adapter resolves" or "no exception thrown" would miss mutations like:

- Cache-to-state sync dispatching to the wrong store action
- Optimistic update confirming instead of rolling back on mutation failure
- Saga step reading stale store state instead of resolving fresh
- Compensation skipping a reverse mutation
- Activity failing to unsubscribe on AbortSignal
- Query invalidation targeting the wrong ports

Mutation testing catches these subtle behavioral inversions that are invisible to superficial assertions.

### Mutation Targets by Priority

| Priority | Module                    | Target Score | Rationale                                                                            |
| -------- | ------------------------- | ------------ | ------------------------------------------------------------------------------------ |
| Critical | Mock adapter factories    | >95%         | Foundation of all integration tests. Incorrect mocks silently invalidate everything. |
| Critical | Test graph builders       | >95%         | Graph validation ensures test infrastructure is sound.                               |
| High     | Store + Query integration | >90%         | Most commonly combined pair. Optimistic update logic is subtle.                      |
| High     | Flow + Saga integration   | >90%         | Effect.invoke mapping and compensation event routing are critical.                   |
| High     | Store + Flow integration  | >90%         | Bidirectional sync and activity lifecycle management are error-prone.                |
| High     | Store + Saga integration  | >90%         | Compensation rollback and stale state detection are critical.                        |
| High     | Query + Saga integration  | >90%         | Cache invalidation targeting and compensation cache effects are subtle.              |
| High     | Query + Flow integration  | >90%         | Activity event emission and AbortSignal cancellation are critical.                   |

### Mutation Operators to Prioritize

- **Conditional boundary mutations**: `===` to `!==`, `>` to `>=` (catches guard logic in sync adapters and change detection)
- **Return value mutations**: `ok(x)` to `err(x)` (catches result variant confusion in adapters)
- **Block removal**: Removing `unsubscribe()` calls (catches cleanup omissions)
- **Method call mutations**: `dispatch("setProcessing")` to `dispatch("reset")` (catches wrong action dispatch)
- **Argument swap mutations**: `confirm({ id })` to `rollback({ id })` (catches optimistic update confusion)

---

_Previous: [README](./README.md)_

_End of Definition of Done_
