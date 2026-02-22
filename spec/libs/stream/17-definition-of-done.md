# 17 - Definition of Done

## Test Tables

### Stream Core Tests

| Test ID | Description                                                                      | Type | File                     |
| ------- | -------------------------------------------------------------------------------- | ---- | ------------------------ |
| SC-001  | `createStream` creates cold stream -- each subscriber gets independent execution | Unit | `stream.test.ts`         |
| SC-002  | `createStream` teardown function called when last subscriber unsubscribes        | Unit | `stream.test.ts`         |
| SC-003  | `StreamSink.signal` aborted when all subscribers unsubscribe                     | Unit | `stream.test.ts`         |
| SC-004  | After-terminal silence: calls after `complete()` are no-ops                      | Unit | `stream.test.ts`         |
| SC-005  | After-terminal silence: calls after `terminate()` are no-ops                     | Unit | `stream.test.ts`         |
| SC-006  | `Subscription.unsubscribe()` is idempotent                                       | Unit | `subscription.test.ts`   |
| SC-007  | `Subscription.closed` is true after unsubscribe                                  | Unit | `subscription.test.ts`   |
| SC-008  | `of()` emits all values synchronously and completes                              | Unit | `creation.test.ts`       |
| SC-009  | `fromIterable()` emits all values from iterable and completes                    | Unit | `creation.test.ts`       |
| SC-010  | `fromAsyncIterable()` creates independent iteration per subscriber               | Unit | `creation.test.ts`       |
| SC-011  | `fromPromise()` emits resolved value and completes                               | Unit | `creation.test.ts`       |
| SC-012  | `fromPromise()` terminates on rejection                                          | Unit | `creation.test.ts`       |
| SC-013  | `fromResultAsync()` emits value on Ok, error on Err                              | Unit | `creation.test.ts`       |
| SC-014  | `fromEvent()` creates hot stream from event target                               | Unit | `creation.test.ts`       |
| SC-015  | `fromEvent()` removes listener on unsubscribe                                    | Unit | `creation.test.ts`       |
| SC-016  | `interval()` emits sequential integers at period                                 | Unit | `creation.test.ts`       |
| SC-017  | `timer()` emits after delay, optionally repeats                                  | Unit | `creation.test.ts`       |
| SC-018  | `EMPTY` completes immediately with no values                                     | Unit | `creation.test.ts`       |
| SC-019  | `NEVER` never emits and never completes                                          | Unit | `creation.test.ts`       |
| SC-020  | `throwError()` terminates immediately                                            | Unit | `creation.test.ts`       |
| SC-021  | Dual error model: `error()` is recoverable, stream continues                     | Unit | `error-model.test.ts`    |
| SC-022  | Dual error model: `terminate()` ends stream permanently                          | Unit | `error-model.test.ts`    |
| SC-023  | `toAsyncIterable()` yields `Ok` for values, `Err` for recoverable errors         | Unit | `async-iterable.test.ts` |
| SC-024  | `toAsyncIterable()` throws on terminal error                                     | Unit | `async-iterable.test.ts` |
| SC-025  | `[Symbol.asyncIterator]()` supports `for await...of`                             | Unit | `async-iterable.test.ts` |
| SC-026  | Stream instances are frozen (`Object.isFrozen`)                                  | Unit | `stream.test.ts`         |

### Subject Tests

| Test ID | Description                                                     | Type | File                       |
| ------- | --------------------------------------------------------------- | ---- | -------------------------- |
| SJ-001  | `Subject.next()` pushes to all current subscribers              | Unit | `subject.test.ts`          |
| SJ-002  | Late `Subject` subscribers receive only future values           | Unit | `subject.test.ts`          |
| SJ-003  | `Subject.complete()` notifies all subscribers and closes        | Unit | `subject.test.ts`          |
| SJ-004  | `Subject.terminate()` notifies all and closes                   | Unit | `subject.test.ts`          |
| SJ-005  | `Subject.asStream()` hides sink methods                         | Unit | `subject.test.ts`          |
| SJ-006  | `Subject.subscriberCount` reflects active subscribers           | Unit | `subject.test.ts`          |
| SJ-007  | `BehaviorSubject` requires initial value                        | Unit | `behavior-subject.test.ts` |
| SJ-008  | `BehaviorSubject` emits current value on subscribe              | Unit | `behavior-subject.test.ts` |
| SJ-009  | `BehaviorSubject.value` reflects latest emission                | Unit | `behavior-subject.test.ts` |
| SJ-010  | `ReplaySubject` replays buffered values to late subscribers     | Unit | `replay-subject.test.ts`   |
| SJ-011  | `ReplaySubject` ring buffer evicts oldest beyond capacity       | Unit | `replay-subject.test.ts`   |
| SJ-012  | Subject instances are frozen                                    | Unit | `subject.test.ts`          |
| SJ-013  | Closed subject: `next()` is no-op, new subscribers get terminal | Unit | `subject.test.ts`          |

### Operator Tests

| Test ID | Description                                                    | Type | File                               |
| ------- | -------------------------------------------------------------- | ---- | ---------------------------------- |
| OP-001  | `map` transforms each value                                    | Unit | `operators/map.test.ts`            |
| OP-002  | `map` passes recoverable errors through                        | Unit | `operators/map.test.ts`            |
| OP-003  | `scan` emits intermediate accumulator values                   | Unit | `operators/scan.test.ts`           |
| OP-004  | `filter` emits only values passing predicate                   | Unit | `operators/filter.test.ts`         |
| OP-005  | `filter` supports type guard narrowing                         | Unit | `operators/filter.test.ts`         |
| OP-006  | `take` emits first N values then completes                     | Unit | `operators/take.test.ts`           |
| OP-007  | `take` unsubscribes from source after completing               | Unit | `operators/take.test.ts`           |
| OP-008  | `skip` ignores first N values                                  | Unit | `operators/skip.test.ts`           |
| OP-009  | `distinctUntilChanged` suppresses consecutive duplicates       | Unit | `operators/distinct.test.ts`       |
| OP-010  | `distinctUntilChanged` accepts custom comparator               | Unit | `operators/distinct.test.ts`       |
| OP-011  | `switchMap` cancels previous inner on new source value         | Unit | `operators/switch-map.test.ts`     |
| OP-012  | `switchMap` forwards only latest inner stream values           | Unit | `operators/switch-map.test.ts`     |
| OP-013  | `debounce` emits after silence period                          | Unit | `operators/debounce.test.ts`       |
| OP-014  | `debounce` resets timer on new value                           | Unit | `operators/debounce.test.ts`       |
| OP-015  | `throttle` emits first value, ignores for duration             | Unit | `operators/throttle.test.ts`       |
| OP-016  | `merge` forwards values from all sources concurrently          | Unit | `operators/merge.test.ts`          |
| OP-017  | `merge` completes only when all sources complete               | Unit | `operators/merge.test.ts`          |
| OP-018  | `concat` subscribes to sources sequentially                    | Unit | `operators/concat.test.ts`         |
| OP-019  | `combineLatest` emits tuple when all have emitted              | Unit | `operators/combine-latest.test.ts` |
| OP-020  | `combineLatest` does not emit until every source has emitted   | Unit | `operators/combine-latest.test.ts` |
| OP-021  | `catchError` intercepts recoverable errors                     | Unit | `operators/catch-error.test.ts`    |
| OP-022  | `catchError` does NOT catch terminal errors                    | Unit | `operators/catch-error.test.ts`    |
| OP-023  | `retry` re-subscribes on terminal error up to count times      | Unit | `operators/retry.test.ts`          |
| OP-024  | `retry` with delay uses scheduler                              | Unit | `operators/retry.test.ts`          |
| OP-025  | `share` multicasts via internal Subject (refcounted)           | Unit | `operators/share.test.ts`          |
| OP-026  | `shareReplay` replays buffered values to late subscribers      | Unit | `operators/share-replay.test.ts`   |
| OP-027  | `tap` performs side effects without altering stream            | Unit | `operators/tap.test.ts`            |
| OP-028  | `finalize` runs exactly once on complete/terminate/unsubscribe | Unit | `operators/finalize.test.ts`       |
| OP-029  | `buffer` batches values by notifier emissions                  | Unit | `operators/buffer.test.ts`         |
| OP-030  | `.pipe()` composes operators with correct type inference       | Unit | `operators/pipe.test.ts`           |

### Backpressure Tests

| Test ID | Description                                                           | Type | File                   |
| ------- | --------------------------------------------------------------------- | ---- | ---------------------- |
| BP-001  | Default buffer: capacity 256, drop-oldest                             | Unit | `backpressure.test.ts` |
| BP-002  | `drop-oldest` evicts oldest on overflow                               | Unit | `backpressure.test.ts` |
| BP-003  | `drop-newest` discards incoming on overflow                           | Unit | `backpressure.test.ts` |
| BP-004  | `error` strategy terminates on overflow                               | Unit | `backpressure.test.ts` |
| BP-005  | `unbounded` strategy allows unlimited buffering                       | Unit | `backpressure.test.ts` |
| BP-006  | AsyncIterable applies natural backpressure                            | Unit | `backpressure.test.ts` |
| BP-007  | AsyncIterable: producer pauses until consumer calls next()            | Unit | `backpressure.test.ts` |
| BP-008  | AsyncIterable: breaking out of loop triggers AbortSignal              | Unit | `backpressure.test.ts` |
| BP-009  | `onOverflow` callback fires on drop-oldest eviction                   | Unit | `backpressure.test.ts` |
| BP-010  | `onOverflow` callback fires on drop-newest discard                    | Unit | `backpressure.test.ts` |
| BP-011  | `onOverflow` exception forwarded to `onDiagnostic` handler            | Unit | `backpressure.test.ts` |
| BP-012  | `onOverflow` exception logged to console.error without `onDiagnostic` | Unit | `backpressure.test.ts` |

### Port & Adapter Tests

| Test ID | Description                                                  | Type        | File                        |
| ------- | ------------------------------------------------------------ | ----------- | --------------------------- |
| PA-001  | `createStreamPort` returns frozen port with correct brand    | Unit        | `stream-port.test.ts`       |
| PA-002  | `createSubjectPort` returns frozen port with correct brand   | Unit        | `subject-port.test.ts`      |
| PA-003  | `createOperatorPort` returns frozen port with correct brand  | Unit        | `operator-port.test.ts`     |
| PA-004  | `isStreamPort` correctly identifies stream ports             | Unit        | `guards.test.ts`            |
| PA-005  | `isSubjectPort` correctly identifies subject ports           | Unit        | `guards.test.ts`            |
| PA-006  | `isOperatorPort` correctly identifies operator ports         | Unit        | `guards.test.ts`            |
| PA-007  | `createStreamAdapter` returns Result.ok with valid config    | Unit        | `stream-adapter.test.ts`    |
| PA-008  | `createStreamAdapter` factory receives resolved deps         | Unit        | `stream-adapter.test.ts`    |
| PA-009  | `createSubjectAdapter` defaults to singleton lifetime        | Unit        | `subject-adapter.test.ts`   |
| PA-010  | `createOperatorAdapter` produces valid operator adapter      | Unit        | `operator-adapter.test.ts`  |
| PA-011  | Stream adapters participate in GraphBuilder validation       | Integration | `graph-integration.test.ts` |
| PA-012  | `InferOperatorInput` extracts input type from OperatorPort   | Unit        | `operator-port.test-d.ts`   |
| PA-013  | `InferOperatorOutput` extracts output type from OperatorPort | Unit        | `operator-port.test-d.ts`   |

### Container Observation Tests

| Test ID | Description                                                        | Type | File                        |
| ------- | ------------------------------------------------------------------ | ---- | --------------------------- |
| CO-001  | `observePort` emits current value immediately (Behavior semantics) | Unit | `observe-port.test.ts`      |
| CO-002  | `observePort` emits new value on adapter replacement               | Unit | `observe-port.test.ts`      |
| CO-003  | `observePort` completes when scope is disposed                     | Unit | `observe-port.test.ts`      |
| CO-004  | `observeContainer` emits adapter-registered events                 | Unit | `observe-container.test.ts` |
| CO-005  | `observeContainer` emits scope-created/disposed events             | Unit | `observe-container.test.ts` |
| CO-006  | `observeContainer` emits port-resolved events                      | Unit | `observe-container.test.ts` |
| CO-007  | `observeContainer` is hot (shared across subscribers)              | Unit | `observe-container.test.ts` |
| CO-008  | `ContainerEvent` includes `correlationId`                          | Unit | `observe-container.test.ts` |
| CO-009  | `ContainerEvent` includes `sequenceNumber`                         | Unit | `observe-container.test.ts` |

### Introspection Tests

| Test ID | Description                                                      | Type        | File                       |
| ------- | ---------------------------------------------------------------- | ----------- | -------------------------- |
| IN-001  | `StreamRegistry.register()` adds entry                           | Unit        | `registry.test.ts`         |
| IN-002  | `StreamRegistry.unregister()` removes entry                      | Unit        | `registry.test.ts`         |
| IN-003  | `StreamRegistry` emits events on register/unregister             | Unit        | `registry.test.ts`         |
| IN-004  | `StreamInspector.getSnapshot()` returns frozen snapshot          | Unit        | `inspector.test.ts`        |
| IN-005  | `StreamInspector.listStreams()` returns all stream info          | Unit        | `inspector.test.ts`        |
| IN-006  | `StreamInspector.subscribe()` emits events                       | Unit        | `inspector.test.ts`        |
| IN-007  | Inspector discovers stream adapters by brand symbol              | Unit        | `inspector.test.ts`        |
| IN-008  | Inspector tracks scoped stream instances                         | Integration | `inspector-scoped.test.ts` |
| IN-009  | `sequenceNumber` increments monotonically across registry events | Unit        | `registry.test.ts`         |
| IN-010  | Inspector with `locked: true` ignores reconfiguration attempts   | Unit        | `inspector.test.ts`        |
| IN-011  | `StreamInspectorEvent` includes `timestamp`                      | Unit        | `inspector.test.ts`        |
| IN-012  | `registry-disposed` event fires before cleanup with entry count  | Unit        | `registry.test.ts`         |
| IN-013  | `StreamSnapshot` includes `sequenceNumber`                       | Unit        | `inspector.test.ts`        |
| IN-014  | Inspector emits `reconfiguration-rejected` when locked           | Unit        | `inspector.test.ts`        |

### React Integration Tests

| Test ID | Description                                              | Type        | File                        |
| ------- | -------------------------------------------------------- | ----------- | --------------------------- |
| RC-001  | `useStream` subscribes on mount, unsubscribes on unmount | Integration | `use-stream.test.tsx`       |
| RC-002  | `useStream` returns StreamState with latest value        | Integration | `use-stream.test.tsx`       |
| RC-003  | `useStream` re-subscribes when port changes              | Integration | `use-stream.test.tsx`       |
| RC-004  | `useStream` respects `enabled` option                    | Integration | `use-stream.test.tsx`       |
| RC-005  | `useStreamValue` returns latest value or default         | Integration | `use-stream-value.test.tsx` |
| RC-006  | `useSubject` provides both subscribe and push            | Integration | `use-subject.test.tsx`      |
| RC-007  | `StreamProvider` overrides default config                | Integration | `stream-provider.test.tsx`  |
| RC-008  | `createStreamHooks` produces typed hooks                 | Integration | `factory.test.tsx`          |

## Type-Level Tests

| Test ID | Description                                                | File                      |
| ------- | ---------------------------------------------------------- | ------------------------- |
| TL-001  | `InferStreamData` extracts data type from StreamPort       | `stream-port.test-d.ts`   |
| TL-002  | `InferStreamError` extracts error type from StreamPort     | `stream-port.test-d.ts`   |
| TL-003  | `InferStreamName` extracts name literal from StreamPort    | `stream-port.test-d.ts`   |
| TL-004  | `InferStreamTypes` extracts all types as object            | `stream-port.test-d.ts`   |
| TL-005  | `InferStreamData<string>` produces InferenceError          | `stream-port.test-d.ts`   |
| TL-006  | `StreamPort` extends `DirectedPort`                        | `stream-port.test-d.ts`   |
| TL-007  | `SubjectPort` extends `DirectedPort`                       | `subject-port.test-d.ts`  |
| TL-008  | `.pipe()` infers intermediate types through operator chain | `operators.test-d.ts`     |
| TL-009  | `filter` with type guard narrows stream type               | `operators.test-d.ts`     |
| TL-010  | `combineLatest` produces correct tuple type                | `operators.test-d.ts`     |
| TL-011  | `switchMap` unions source and inner error types            | `operators.test-d.ts`     |
| TL-012  | `BehaviorSubject.value` has correct type                   | `subjects.test-d.ts`      |
| TL-013  | `Subject` extends both `Stream` and `StreamSink`           | `subjects.test-d.ts`      |
| TL-014  | `CombineLatestResult` maps stream tuple to value tuple     | `type-utils.test-d.ts`    |
| TL-015  | `CombineLatestError` unions all stream error types         | `type-utils.test-d.ts`    |
| TL-016  | `InferOperatorInput<string>` produces InferenceError       | `operator-port.test-d.ts` |
| TL-017  | `InferOperatorOutput` extracts output type correctly       | `operator-port.test-d.ts` |

## Integration Tests

| Test ID | Description                                                             | File                              |
| ------- | ----------------------------------------------------------------------- | --------------------------------- |
| IT-001  | Stream adapter resolved from container produces working stream          | `container-integration.test.ts`   |
| IT-002  | Subject adapter resolved from container allows push/subscribe           | `container-integration.test.ts`   |
| IT-003  | Operator adapter resolved from container transforms stream              | `container-integration.test.ts`   |
| IT-004  | Scoped stream adapter creates per-scope instances                       | `scoped-streams.test.ts`          |
| IT-005  | Scope disposal unsubscribes all scoped streams                          | `scoped-streams.test.ts`          |
| IT-006  | `observePort` + container adapter replacement triggers emission         | `observation-integration.test.ts` |
| IT-007  | Stream inspector reports correct state after complex lifecycle          | `inspector-integration.test.ts`   |
| IT-008  | Tracing bridge creates spans for stream lifecycle (when tracer present) | `tracing-integration.test.ts`     |
| IT-009  | Stream + store integration: stream feeds state updates                  | `cross-library.test.ts`           |
| IT-010  | Stream + query integration: stream adapter as query source              | `cross-library.test.ts`           |

## E2E Tests

| Test ID | Description                                                                  | File                         |
| ------- | ---------------------------------------------------------------------------- | ---------------------------- |
| E2E-001 | Full pipeline: adapter → stream → operators → React hook → render            | `e2e-pipeline.test.tsx`      |
| E2E-002 | Subject: push from one component, subscribe in another                       | `e2e-subject.test.tsx`       |
| E2E-003 | Scope lifecycle: create scope, resolve stream, dispose scope, verify cleanup | `e2e-lifecycle.test.ts`      |
| E2E-004 | Backpressure: fast producer + slow AsyncIterable consumer                    | `e2e-backpressure.test.ts`   |
| E2E-005 | Error recovery: retry + catchError + fallback stream                         | `e2e-error-recovery.test.ts` |

## Mutation Testing

All stream core modules must achieve **mutation score ≥ 90%** using Stryker:

| Module                         | Target Score | Priority |
| ------------------------------ | ------------ | -------- |
| `stream/stream.ts`             | ≥ 90%        | Critical |
| `stream/sink.ts`               | ≥ 90%        | Critical |
| `subjects/subject.ts`          | ≥ 90%        | Critical |
| `subjects/behavior-subject.ts` | ≥ 90%        | Critical |
| `subjects/replay-subject.ts`   | ≥ 90%        | Critical |
| `operators/*.ts` (each)        | ≥ 90%        | High     |
| `backpressure/*.ts`            | ≥ 90%        | High     |
| `ports/*.ts`                   | ≥ 85%        | Medium   |
| `adapters/*.ts`                | ≥ 85%        | Medium   |
| `observation/*.ts`             | ≥ 85%        | Medium   |
| `introspection/*.ts`           | ≥ 85%        | Medium   |

## Verification Checklist

- [ ] All 18 files exist under `spec/stream/`
- [ ] `README.md` has complete table of contents linking all sections
- [ ] Each file has prev/next navigation links
- [ ] All public APIs have TypeScript type signatures in code blocks
- [ ] All concepts have usage examples
- [ ] Design decisions have rationale tables (Appendix C)
- [ ] Error codes are documented with descriptions (§89)
- [ ] Type inference utilities follow `InferenceError` pattern from `@hex-di/core`
- [ ] Port types extend `DirectedPort` (structural subtyping verified)
- [ ] Adapter factories bridge to `@hex-di/core` `createAdapter`
- [ ] Inspector/Registry follow `@hex-di/store` patterns
- [ ] MCP resource URIs are documented for AI consumption
- [ ] React hooks use `useSyncExternalStore` internally
- [ ] Test scheduler enables deterministic time-dependent testing
- [ ] Backpressure model is fully specified with all 4 overflow strategies
- [ ] Dual error model documented with AsyncIterable mapping table
- [ ] All 20 operators have signatures and examples
- [ ] Bundle size target: core < 10KB gzipped (TBD after implementation)
- [ ] No `any` types in public API signatures
- [ ] No type casts (`as X`) in specification examples

---

_Previous: [16 - Appendices](./16-appendices.md)_

_End of specification_
