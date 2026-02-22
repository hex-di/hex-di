# 12 - Definition of Done

_Previous: [11 - Appendices](./11-appendices.md)_

---

This document defines all tests required for `@hex-di/store`, `@hex-di/store-react`, and `@hex-di/store-testing` to be considered complete. Each section maps to a spec section and specifies required unit tests, type-level tests, integration tests, e2e tests, and mutation testing guidance.

## Test File Convention

| Test Category           | File Pattern  | Location                              |
| ----------------------- | ------------- | ------------------------------------- |
| Unit tests              | `*.test.ts`   | `libs/store/core/tests/`              |
| Type-level tests        | `*.test-d.ts` | `libs/store/core/tests/`              |
| Integration tests       | `*.test.ts`   | `libs/store/core/tests/integration/`  |
| E2E tests               | `*.test.ts`   | `libs/store/core/tests/e2e/`          |
| Testing package tests   | `*.test.ts`   | `libs/store/testing/tests/`           |
| React unit tests        | `*.test.tsx`  | `libs/store/react/tests/`             |
| React type tests        | `*.test-d.ts` | `libs/store/react/tests/`             |
| React integration tests | `*.test.tsx`  | `libs/store/react/tests/integration/` |

---

## DoD 1: State Ports (Spec Sections 9-11a)

### Unit Tests -- `state-ports.test.ts`

| #   | Test                                                                                   | Type |
| --- | -------------------------------------------------------------------------------------- | ---- |
| 1   | `createStatePort<S, A>()({ name: "Counter" })` returns object with `name: "Counter"`   | unit |
| 2   | State port extends `DirectedPort<StateService, TName, "outbound">`                     | unit |
| 3   | State port has `[__stateType]` phantom property                                        | unit |
| 4   | State port has `[__actionsType]` phantom property                                      | unit |
| 5   | State port with `category: "auth"` propagates to PortMetadata                          | unit |
| 6   | State port with `tags: ["security"]` propagates to PortMetadata                        | unit |
| 7   | `createAtomPort<TValue>()({ name: "Theme" })` returns object with `name: "Theme"`      | unit |
| 8   | Atom port has `[__atomType]` phantom property                                          | unit |
| 9   | Atom port extends `DirectedPort<AtomService, TName, "outbound">`                       | unit |
| 10  | `createDerivedPort<TResult>()({ name: "CartTotal" })` returns object with correct name | unit |
| 11  | Derived port extends `DirectedPort<DerivedService, TName, "outbound">`                 | unit |
| 12  | `createAsyncDerivedPort<T>()({ name: "Rate" })` returns object with correct name       | unit |
| 13  | Async derived port has `[__asyncDerivedErrorType]` phantom property                    | unit |
| 14  | `createAsyncDerivedPort<T, E>()` stores error phantom type E                           | unit |
| 15  | `createAsyncDerivedPort<T>()` defaults error phantom to `never`                        | unit |
| 16  | `createLinkedDerivedPort<T>()({ name: "F" })` returns object with correct name         | unit |
| 17  | Linked derived port extends `DirectedPort<LinkedDerivedService, TName, "outbound">`    | unit |
| 18  | Port `name` is stored as string literal type (not widened to string)                   | unit |
| 19  | Curried form works: explicit TState/TActions, inferred TName                           | unit |
| 20  | Two ports with different names are structurally distinct                               | unit |

### Type-Level Tests -- `state-ports.test-d.ts`

| #   | Test                                                                            | Type |
| --- | ------------------------------------------------------------------------------- | ---- |
| 1   | `InferStateType<typeof CounterPort>` resolves to `CounterState`                 | type |
| 2   | `InferActionsType<typeof CounterPort>` resolves to `CounterActions`             | type |
| 3   | `InferAtomType<typeof ThemePort>` resolves to `"light" \| "dark"`               | type |
| 4   | `InferDerivedType<typeof CartTotalPort>` resolves to `CartTotal`                | type |
| 5   | `InferAsyncDerivedType<typeof RatePort>` resolves to `ExchangeRate`             | type |
| 6   | `InferAsyncDerivedErrorType<typeof ProfilePort>` resolves to `UserProfileError` | type |
| 7   | `InferAsyncDerivedErrorType` defaults to `never` when E omitted                 | type |
| 8   | `InferStateType<string>` resolves to `never` (non-port input)                   | type |
| 9   | `InferActionsType<number>` resolves to `never` (non-port input)                 | type |
| 10  | `InferAtomType<boolean>` resolves to `never` (non-port input)                   | type |
| 11  | State port name inferred as literal `"Counter"` not widened `string`            | type |
| 12  | Atom port name inferred as literal `"Theme"` not widened `string`               | type |
| 13  | Phantom branded types prevent structural matching between unrelated ports       | type |
| 14  | `StatePortDef` carries correct `TState` and `TActions` through phantom slots    | type |
| 15  | `AtomPortDef` carries correct `TValue` through phantom slot                     | type |
| 16  | `AsyncDerivedPortDef` carries correct `TResult` and `E` through phantom slots   | type |

### Mutation Testing

**Target: >95% mutation score.** Port factory output (name, phantom symbols, category/tags propagation) and curried form type inference are critical -- any mutation to phantom property assignment or metadata propagation must be caught.

---

## DoD 2: State Adapters (Spec Sections 13-17)

### Unit Tests -- `state-adapters.test.ts`

| #   | Test                                                                             | Type |
| --- | -------------------------------------------------------------------------------- | ---- |
| 1   | `createStateAdapter({ provides, initial, actions })` returns an Adapter          | unit |
| 2   | State adapter provides the correct port                                          | unit |
| 3   | State adapter default lifetime is `"singleton"`                                  | unit |
| 4   | State adapter with explicit `lifetime: "scoped"` uses scoped lifetime            | unit |
| 5   | State adapter `initial` is type-checked against port's `InferStateType`          | unit |
| 6   | State adapter `actions` are type-checked against port's `InferActionsType`       | unit |
| 7   | State adapter with `requires: [DepPort]` declares the dependency                 | unit |
| 8   | State adapter factory receives resolved deps                                     | unit |
| 9   | State adapter effects: sync effect (void return) runs after reducer              | unit |
| 10  | State adapter effects: async effect (ResultAsync return) runs after reducer      | unit |
| 11  | Effect receives EffectContext with state, prevState, payload                     | unit |
| 12  | `onEffectError` handler receives EffectFailedError context                       | unit |
| 13  | `onEffectError` handler receives actionName, state, prevState, actions           | unit |
| 14  | When no `onEffectError` is provided, effect Err results are swallowed            | unit |
| 15  | `createAtomAdapter({ provides, initial })` returns an Adapter                    | unit |
| 16  | Atom adapter provides the correct port                                           | unit |
| 17  | Atom adapter `initial` is type-checked against port's `InferAtomType`            | unit |
| 18  | Atom adapter default lifetime is `"singleton"`                                   | unit |
| 19  | Atom adapter with `lifetime: "scoped"` uses scoped lifetime                      | unit |
| 20  | `createDerivedAdapter({ provides, requires, select })` returns an Adapter        | unit |
| 21  | Derived adapter provides the correct port                                        | unit |
| 22  | Derived adapter `select` receives resolved DerivedDeps                           | unit |
| 23  | Derived adapter default lifetime is `"singleton"`                                | unit |
| 24  | Derived adapter with `lifetime: "scoped"` uses scoped lifetime                   | unit |
| 25  | Derived adapter with custom `equals` function suppresses duplicate notifications | unit |
| 26  | `createAsyncDerivedAdapter({ provides, requires, select })` returns an Adapter   | unit |
| 27  | Async derived adapter `select` returns `ResultAsync`                             | unit |
| 28  | Async derived adapter `staleTime` configuration stored correctly                 | unit |
| 29  | Async derived adapter `retryCount` configuration stored correctly                | unit |
| 30  | Async derived adapter `retryDelay` as number stored correctly                    | unit |
| 31  | Async derived adapter `retryDelay` as function stored correctly                  | unit |
| 32  | `createLinkedDerivedAdapter` returns an Adapter with select and write            | unit |
| 33  | Linked derived adapter `writesTo` declaration stored correctly                   | unit |
| 34  | Linked derived adapter defaults `writesTo` to all `requires` when omitted        | unit |
| 35  | `createEffectAdapter` returns adapter with `__effectBrand`                       | unit |
| 36  | Effect adapter `factory` receives resolved deps and returns ActionEffect         | unit |
| 37  | Effect adapter is identifiable by `__effectBrand` property check                 | unit |

### Type-Level Tests -- `state-adapters.test-d.ts`

| #   | Test                                                                             | Type |
| --- | -------------------------------------------------------------------------------- | ---- |
| 1   | `createStateAdapter` infers port type from `provides`                            | type |
| 2   | `createStateAdapter` `initial` must match `InferStateType<TPort>`                | type |
| 3   | `createStateAdapter` `actions` must match `InferActionsType<TPort>`              | type |
| 4   | `createAtomAdapter` `initial` must match `InferAtomType<TPort>`                  | type |
| 5   | `createDerivedAdapter` `select` return type must match `InferDerivedType<TPort>` | type |
| 6   | `createDerivedAdapter` `deps` parameter typed as `DerivedDeps<TRequires>`        | type |
| 7   | `createAsyncDerivedAdapter` `select` return type is `ResultAsync<TResult, E>`    | type |
| 8   | `createLinkedDerivedAdapter` `write` receives `InferDerivedType<TPort>` and deps | type |
| 9   | State adapter lifetime is `"singleton" \| "scoped"` (no `"transient"`)           | type |
| 10  | `EffectMap` keys match action names in `TActions`                                | type |
| 11  | `EffectContext` payload type inferred from action reducer signature              | type |
| 12  | `EffectAdapterBrand` uses unique symbol (not assignable from plain object)       | type |

### Mutation Testing

**Target: >95% mutation score.** Adapter factory wiring (provides, requires, lifetime), initial state assignment, effect context population, and brand stamping are critical -- mutations to any of these must be caught.

---

## DoD 3: Service Interfaces (Spec Sections 5-8)

### Unit Tests -- `services.test.ts`

| #   | Test                                                                                | Type |
| --- | ----------------------------------------------------------------------------------- | ---- |
| 1   | `StateService.state` returns `DeepReadonly<TState>`                                 | unit |
| 2   | `StateService.actions` returns `BoundActions<TState, TActions>`                     | unit |
| 3   | `StateService.subscribe(listener)` fires on state change                            | unit |
| 4   | `StateService.subscribe(selector, listener)` fires only when selected value changes | unit |
| 5   | `StateService.subscribe(selector, listener, equalityFn)` uses custom equality       | unit |
| 6   | Unsubscribe function stops listener callbacks                                       | unit |
| 7   | `AtomService.value` returns `DeepReadonly<TValue>`                                  | unit |
| 8   | `AtomService.set(value)` updates the atom value                                     | unit |
| 9   | `AtomService.update(fn)` applies functional update                                  | unit |
| 10  | `AtomService.subscribe(listener)` fires on value change                             | unit |
| 11  | `DerivedService.value` returns `DeepReadonly<TResult>`                              | unit |
| 12  | `DerivedService.subscribe(listener)` fires on recomputation                         | unit |
| 13  | `AsyncDerivedService.snapshot` returns discriminated union on status                | unit |
| 14  | `AsyncDerivedService.status` returns current status string                          | unit |
| 15  | `AsyncDerivedService.isLoading` returns boolean                                     | unit |
| 16  | `AsyncDerivedService.refresh()` triggers re-fetch                                   | unit |
| 17  | `AsyncDerivedService.subscribe(listener)` fires on snapshot change                  | unit |
| 18  | `LinkedDerivedService.value` returns `DeepReadonly<TResult>`                        | unit |
| 19  | `LinkedDerivedService.set(value)` writes back through write function                | unit |
| 20  | `LinkedDerivedService.subscribe(listener)` fires on recomputation                   | unit |
| 21  | `StateService.actions` is referentially stable across accesses                      | unit |
| 22  | Each `actions.X` function is referentially stable across accesses                   | unit |
| 23  | `AtomService.set` is referentially stable across accesses                           | unit |
| 24  | `AtomService.update` is referentially stable across accesses                        | unit |
| 25  | `AsyncDerivedService.refresh` is referentially stable across accesses               | unit |
| 26  | `LinkedDerivedService.set` is referentially stable across accesses                  | unit |

### Type-Level Tests -- `services.test-d.ts`

| #   | Test                                                                                         | Type |
| --- | -------------------------------------------------------------------------------------------- | ---- |
| 1   | `StateService.state` typed as `DeepReadonly<TState>`                                         | type |
| 2   | `StateService.actions` typed as `BoundActions<TState, TActions>`                             | type |
| 3   | `AtomService.value` typed as `DeepReadonly<TValue>`                                          | type |
| 4   | `DerivedService.value` typed as `DeepReadonly<TResult>`                                      | type |
| 5   | `AsyncDerivedService.snapshot` is `AsyncDerivedSnapshot<TResult, E>`                         | type |
| 6   | `AsyncDerivedSnapshot` narrows `data` to `DeepReadonly<TResult>` when `status === "success"` | type |
| 7   | `AsyncDerivedSnapshot` narrows `error` to `E` when `status === "error"` and E declared       | type |
| 8   | `AsyncDerivedSnapshot` narrows `error` to `unknown` when `status === "error"` and E is never | type |
| 9   | `LinkedDerivedService` extends `DerivedService<TResult>`                                     | type |
| 10  | `LinkedDerivedService.set` parameter typed as `TResult`                                      | type |

### Mutation Testing

**Target: >95% mutation score.** Referential stability guarantees, subscription lifecycle (subscribe/unsubscribe), selector-based filtering, and snapshot status narrowing are critical -- mutations to reference creation, listener invocation, or status assignment must be caught.

---

## DoD 4: ActionMap & BoundActions (Spec Section 6)

### Unit Tests -- `action-map.test.ts`

| #   | Test                                                                        | Type |
| --- | --------------------------------------------------------------------------- | ---- |
| 1   | No-payload action reducer `(state) => state` becomes `() => void` bound     | unit |
| 2   | Payload action reducer `(state, payload: P) => state` becomes `(P) => void` | unit |
| 3   | Bound action dispatches reducer and updates state                           | unit |
| 4   | Bound action with payload passes payload to reducer                         | unit |
| 5   | Multiple actions on same port each dispatch independently                   | unit |
| 6   | Action dispatch notifies subscribers with new and previous state            | unit |

### Type-Level Tests -- `action-map.test-d.ts`

| #   | Test                                                                                    | Type |
| --- | --------------------------------------------------------------------------------------- | ---- |
| 1   | `ActionReducer<S>` (no payload) resolves to `(state: S) => S`                           | type |
| 2   | `ActionReducer<S, P>` (with payload) resolves to `(state: S, payload: P) => S`          | type |
| 3   | `ActionReducer<S, undefined>` does NOT collapse to no-payload form (NoPayload sentinel) | type |
| 4   | `BoundActions` maps no-payload reducer to `() => void`                                  | type |
| 5   | `BoundActions` maps payload reducer to `(payload: P) => void`                           | type |
| 6   | `BoundActions` strips state parameter, preserves payload type                           | type |
| 7   | `NoPayload` sentinel is a unique branded type not assignable from `void` or `undefined` | type |

### Mutation Testing

**Target: >95% mutation score.** BoundActions type mapping (state parameter stripping, payload preservation) and NoPayload sentinel behavior are critical -- mutations to conditional type branches or sentinel checks must be caught.

---

## DoD 5: DeepReadonly & Snapshot Separation (Spec Sections 7, 22)

### Unit Tests -- `deep-readonly.test.ts`

| #   | Test                                                                               | Type |
| --- | ---------------------------------------------------------------------------------- | ---- |
| 1   | `DeepReadonly` makes top-level properties readonly                                 | unit |
| 2   | `DeepReadonly` makes nested object properties readonly recursively                 | unit |
| 3   | `DeepReadonly` makes array elements readonly                                       | unit |
| 4   | `DeepReadonly` preserves function types as-is (no readonly on function properties) | unit |
| 5   | `DeepReadonly` handles `ReadonlyMap` correctly                                     | unit |
| 6   | `DeepReadonly` handles `ReadonlySet` correctly                                     | unit |
| 7   | Structural sharing: unchanged subtrees share references between snapshots          | unit |
| 8   | `Object.freeze` applied in development mode (runtime enforcement)                  | unit |
| 9   | Frozen snapshot throws on mutation attempt in development mode                     | unit |
| 10  | Snapshot after action: changed subtrees get new references                         | unit |
| 11  | Snapshot after action: unchanged subtrees keep same references                     | unit |

### Type-Level Tests -- `deep-readonly.test-d.ts`

| #   | Test                                                                     | Type |
| --- | ------------------------------------------------------------------------ | ---- |
| 1   | `DeepReadonly<{ a: number }>` resolves to `{ readonly a: number }`       | type |
| 2   | `DeepReadonly<{ nested: { b: string } }>` makes nested property readonly | type |
| 3   | `DeepReadonly<number[]>` resolves to `readonly number[]`                 | type |
| 4   | `DeepReadonly<() => void>` preserves function type as-is                 | type |
| 5   | `DeepReadonly<Map<K, V>>` resolves to `ReadonlyMap<K, DeepReadonly<V>>`  | type |
| 6   | `DeepReadonly<Set<U>>` resolves to `ReadonlySet<DeepReadonly<U>>`        | type |
| 7   | `DeepReadonly` applied to state port `.state` accessor                   | type |

### Mutation Testing

**Target: >95% mutation score.** DeepReadonly type recursion branches (function, Map, Set, array, object), structural sharing logic, and freeze enforcement are critical -- mutations to type branches or reference comparison must be caught.

---

## DoD 6: Reactivity Engine (Spec Sections 18-22)

### Unit Tests -- `reactivity.test.ts`

| #   | Test                                                                                   | Type |
| --- | -------------------------------------------------------------------------------------- | ---- |
| 1   | `createSignal(initial)` returns signal with `get()` returning initial value            | unit |
| 2   | `signal.set(value)` updates value returned by `get()`                                  | unit |
| 3   | `signal.peek()` reads value without tracking dependency                                | unit |
| 4   | `createComputed(fn)` returns computed with lazily evaluated `get()`                    | unit |
| 5   | Computed caches result until dependencies change                                       | unit |
| 6   | `computed.peek()` reads without tracking                                               | unit |
| 7   | `createEffect(fn)` runs immediately and tracks dependencies                            | unit |
| 8   | Effect re-runs when tracked signal changes                                             | unit |
| 9   | `effect.dispose()` stops re-runs                                                       | unit |
| 10  | Automatic dependency tracking: computed reads signal.get() and tracks it               | unit |
| 11  | Selector subscription re-notifies only when selected value changes                     | unit |
| 12  | Proxy-based path tracking: only notifies when accessed paths change                    | unit |
| 13  | Custom equality function prevents re-notification for semantically equal values        | unit |
| 14  | `shallowEqual` helper compares object properties shallowly                             | unit |
| 15  | Diamond dependency: A -> B, A -> C, B+C -> D evaluates D exactly once per A change     | unit |
| 16  | Topological sort: computeds evaluated in dependency order (deepest first)              | unit |
| 17  | No glitch: intermediate inconsistent state never visible to subscribers                | unit |
| 18  | `batch(container, fn)` groups changes into single notification cycle                   | unit |
| 19  | Batch: subscribers fire once with final state after batch completes                    | unit |
| 20  | Nested batching: only outermost batch triggers notifications                           | unit |
| 21  | Batch is container-scoped: scope A batch does not defer scope B signals                | unit |
| 22  | Batch callback exception: deferred notifications flushed, `BatchExecutionError` thrown | unit |
| 23  | Structural sharing between snapshots: unchanged subtrees share references              | unit |
| 24  | Multiple signals: changing one does not recompute unrelated computeds                  | unit |

### Integration Tests -- `integration/reactivity.test.ts`

| #   | Test                                                                           | Type        |
| --- | ------------------------------------------------------------------------------ | ----------- |
| 1   | Multi-port chain: state -> derived -> derived propagates correctly             | integration |
| 2   | Cross-port derived: depends on two state ports, recomputes when either changes | integration |
| 3   | Batch across multiple state ports: single notification cycle                   | integration |
| 4   | Diamond dependency with real state and derived adapters: no glitch             | integration |

### Mutation Testing

**Target: >95% mutation score.** Signal get/set/peek semantics, computed caching and invalidation, diamond dependency solving (topological sort), batch depth counter management, and structural sharing logic are critical -- mutations to dependency tracking, evaluation order, or batch gating must be caught.

---

## DoD 7: Effects (Spec Sections 4a, 17)

### Unit Tests -- `effects.test.ts`

| #   | Test                                                                                 | Type |
| --- | ------------------------------------------------------------------------------------ | ---- |
| 1   | Sync effect (void return) fires after reducer completes                              | unit |
| 2   | Async effect (ResultAsync return) fires after reducer completes                      | unit |
| 3   | EffectContext contains correct state (after reducer)                                 | unit |
| 4   | EffectContext contains correct prevState (before reducer)                            | unit |
| 5   | EffectContext contains correct payload for payload actions                           | unit |
| 6   | EffectContext payload is void for no-payload actions                                 | unit |
| 7   | Async effect Ok result: no error handler invocation                                  | unit |
| 8   | Async effect Err result: `onEffectError` receives `EffectFailedError`                | unit |
| 9   | `EffectFailedError` has `_tag: "EffectFailed"`, portName, actionName, cause          | unit |
| 10  | `onEffectError` handler receives bound actions for dispatching compensating actions  | unit |
| 11  | When `onEffectError` itself throws: `EffectErrorHandlerError` logged, no propagation | unit |
| 12  | `EffectErrorHandlerError` captures originalError and handlerError                    | unit |
| 13  | Effect execution is fire-and-forget (does not block state updates)                   | unit |
| 14  | `createEffectAdapter` produces adapter with `__effectBrand`                          | unit |
| 15  | Effect adapter `onAction` receives `ActionEvent` with all required fields            | unit |
| 16  | `ActionEvent.phase` is `"action"` for normal dispatch                                | unit |
| 17  | `ActionEvent.phase` is `"effect-error"` when effect returns Err                      | unit |
| 18  | `ActionEvent.traceId` present when tracing is active                                 | unit |
| 19  | `ActionEvent.traceId` undefined when tracing is not active                           | unit |
| 20  | Effect adapters discovered via `__effectBrand` at first state resolution             | unit |
| 21  | Effect adapter discovery cached after first scan (no re-scan per dispatch)           | unit |
| 22  | Scoped containers build separate effect adapter caches                               | unit |

### Type-Level Tests -- `effects.test-d.ts`

| #   | Test                                                           | Type |
| --- | -------------------------------------------------------------- | ---- |
| 1   | `EffectMap` keys constrained to `keyof TActions`               | type |
| 2   | Effect return type is `void \| ResultAsync<void, unknown>`     | type |
| 3   | `EffectContext.payload` inferred from action reducer signature | type |
| 4   | `EffectFailedError._tag` is literal `"EffectFailed"`           | type |
| 5   | `ActionEvent.phase` is `"action" \| "effect-error"`            | type |
| 6   | `EffectAdapterBrand` uses unique symbol                        | type |

### Mutation Testing

**Target: >95% mutation score.** Effect timing (fires after reducer), ResultAsync Ok/Err branching, EffectFailedError construction, onEffectError invocation gating, EffectErrorHandlerError wrapping, and brand-based discovery caching are critical -- mutations to any of these control flow paths must be caught.

---

## DoD 8: Introspection (Spec Section 05b)

### Unit Tests -- `introspection.test.ts`

| #   | Test                                                                                    | Type |
| --- | --------------------------------------------------------------------------------------- | ---- |
| 1   | `StoreInspectorPort` requires explicit registration via `createStoreInspectorAdapter()` | unit |
| 2   | `inspector.getSnapshot()` returns `StoreSnapshot` with timestamp, ports, stats          | unit |
| 3   | `inspector.getPortState(portName)` returns `PortSnapshot` for existing port             | unit |
| 4   | `inspector.getPortState(portName)` returns `undefined` for absent port                  | unit |
| 5   | `inspector.listStatePorts()` returns `StatePortInfo[]` with portName, kind, lifetime    | unit |
| 6   | `StatePortInfo.subscriberCount` reflects active subscribers                             | unit |
| 7   | `StatePortInfo.hasEffects` is true for state ports with effects                         | unit |
| 8   | `inspector.getSubscriberGraph()` returns nodes and edges                                | unit |
| 9   | Subscriber graph contains `"derives-from"` edges for derived ports                      | unit |
| 10  | Subscriber graph contains `"subscribes-to"` edges for effect ports                      | unit |
| 11  | Subscriber graph contains `"writes-to"` edges for linked derived ports                  | unit |
| 12  | `inspector.getActionHistory()` returns `ActionHistoryEntry[]`                           | unit |
| 13  | `ActionHistoryEntry` includes all fields: id, portName, actionName, payload, timestamps | unit |
| 14  | `ActionHistoryEntry` includes traceId and spanId when tracing active                    | unit |
| 15  | `getActionHistory({ portName })` filters by port                                        | unit |
| 16  | `getActionHistory({ actionName })` filters by action name                               | unit |
| 17  | `getActionHistory({ effectStatus: "failed" })` filters by effect status                 | unit |
| 18  | `getActionHistory({ since, until })` filters by time range                              | unit |
| 19  | `getActionHistory({ limit })` respects limit                                            | unit |
| 20  | `getActionHistory({ traceId })` filters by W3C trace ID                                 | unit |
| 21  | ActionHistoryConfig `mode: "full"` records prevState and nextState                      | unit |
| 22  | ActionHistoryConfig `mode: "lightweight"` omits prevState and nextState                 | unit |
| 23  | ActionHistoryConfig `mode: "off"` disables recording                                    | unit |
| 24  | ActionHistoryConfig `maxEntries` evicts oldest entries                                  | unit |
| 25  | ActionHistoryConfig `samplingRate` applies reservoir sampling                           | unit |
| 26  | ActionHistoryConfig `alwaysRecord.effectStatus` overrides sampling for failures         | unit |
| 27  | ActionHistoryConfig `alwaysRecord.portNames` overrides sampling for named ports         | unit |
| 28  | `inspector.subscribe(listener)` fires `"action-dispatched"` event                       | unit |
| 29  | `inspector.subscribe(listener)` fires `"state-changed"` event                           | unit |
| 30  | `inspector.subscribe(listener)` fires `"subscriber-added"` event with count             | unit |
| 31  | `inspector.subscribe(listener)` fires `"subscriber-removed"` event with count           | unit |
| 32  | `inspector.subscribe(listener)` fires `"effect-completed"` event                        | unit |
| 33  | `inspector.subscribe(listener)` fires `"effect-failed"` event with EffectFailedError    | unit |
| 34  | `inspector.subscribe(listener)` fires `"async-derived-failed"` event                    | unit |
| 35  | `inspector.subscribe(listener)` fires `"snapshot-changed"` event                        | unit |
| 36  | Unsubscribe stops event delivery                                                        | unit |
| 37  | Brand-based port classification: state, atom, derived, async-derived (O(1) per adapter) | unit |
| 38  | Scoped instance tracking: active scopes included in snapshot                            | unit |
| 39  | Scoped instance tracking: disposed scopes excluded from snapshot                        | unit |

### Type-Level Tests -- `introspection.test-d.ts`

| #   | Test                                                                                 | Type |
| --- | ------------------------------------------------------------------------------------ | ---- |
| 1   | `PortSnapshot` is discriminated union on `kind`: state, atom, derived, async-derived | type |
| 2   | `StoreInspectorEvent` is discriminated union on `type` with 8 variants               | type |
| 3   | Exhaustive switch on `PortSnapshot.kind` covers all 4 variants                       | type |
| 4   | Exhaustive switch on `StoreInspectorEvent.type` covers all 8 variants                | type |
| 5   | `StatePortInfo.kind` is `"state" \| "atom" \| "derived" \| "async-derived"`          | type |
| 6   | `SubscriberEdge.type` is `"derives-from" \| "subscribes-to" \| "writes-to"`          | type |

### Mutation Testing

**Target: >85% mutation score.** Action history filtering, sampling/alwaysRecord override logic, brand-based classification, scoped instance tracking, and event emission ordering are critical -- mutations to filter predicates, sampling gating, or event type assignment must be caught.

---

## DoD 9: Lifecycle (Spec Sections 23-26)

### Unit Tests -- `lifecycle.test.ts`

| #   | Test                                                                                   | Type |
| --- | -------------------------------------------------------------------------------------- | ---- |
| 1   | State port service created on first `container.resolve()` (lazy mount)                 | unit |
| 2   | Second `container.resolve()` returns same singleton instance                           | unit |
| 3   | `container.dispose()` disposes all state signals                                       | unit |
| 4   | `container.dispose()` cancels all subscriptions                                        | unit |
| 5   | `container.dispose()` stops all reactive effects                                       | unit |
| 6   | Scoped state: `scope.resolve(ScopedPort)` returns independent instance per scope       | unit |
| 7   | Scoped state: changes in scope A do not affect scope B                                 | unit |
| 8   | Scoped state: singleton resolved from scope returns root container's instance          | unit |
| 9   | `scope.dispose()` disposes only scoped resources                                       | unit |
| 10  | `scope.dispose()` does not dispose singleton state from parent                         | unit |
| 11  | Accessing `.state` after container disposal throws `DisposedStateAccessError`          | unit |
| 12  | Accessing `.value` after container disposal throws `DisposedStateAccessError`          | unit |
| 13  | Calling `.actions.X()` after disposal throws `DisposedStateAccessError`                | unit |
| 14  | Calling `.set()` after disposal throws `DisposedStateAccessError`                      | unit |
| 15  | Calling `.subscribe()` after disposal throws `DisposedStateAccessError`                | unit |
| 16  | `DisposedStateAccessError` includes portName, containerName, operation                 | unit |
| 17  | Disposal order: effects -> subscriptions -> computeds -> signals -> finalizers -> refs | unit |
| 18  | No subscription callback fires after disposal begins                                   | unit |
| 19  | No derived value recomputes after disposal begins                                      | unit |

### Integration Tests -- `integration/lifecycle.test.ts`

| #   | Test                                                                           | Type        |
| --- | ------------------------------------------------------------------------------ | ----------- |
| 1   | Container lifecycle: resolve -> use -> dispose with state adapters             | integration |
| 2   | Scoped derived adapter: depends on scoped + singleton sources, works correctly | integration |
| 3   | Scope disposal with active subscriptions: all cleaned up                       | integration |
| 4   | Multiple scopes created and disposed independently                             | integration |

### Mutation Testing

**Target: >95% mutation score.** Lazy initialization, disposal order, DisposedStateAccessError gating (per-operation checks), scope isolation, and scoped vs singleton distinction are critical -- mutations to disposal sequencing, error field assignment, or scope routing must be caught.

---

## DoD 10: Error Classes (Spec Section 42a)

### Unit Tests -- `errors.test.ts`

| #   | Test                                                                                     | Type |
| --- | ---------------------------------------------------------------------------------------- | ---- |
| 1   | `DisposedStateAccessError` has code `"DISPOSED_STATE_ACCESS"` (HEX030)                   | unit |
| 2   | `DisposedStateAccessError` has `isProgrammingError: true`                                | unit |
| 3   | `DisposedStateAccessError` includes portName, containerName, operation                   | unit |
| 4   | `DerivedComputationError` has code `"DERIVED_COMPUTATION_FAILED"` (HEX031)               | unit |
| 5   | `DerivedComputationError` has `isProgrammingError: false`                                | unit |
| 6   | `DerivedComputationError` includes portName and cause                                    | unit |
| 7   | `AsyncDerivedExhaustedError` has code `"ASYNC_DERIVED_EXHAUSTED"` (HEX032)               | unit |
| 8   | `AsyncDerivedExhaustedError` has `isProgrammingError: true`                              | unit |
| 9   | `AsyncDerivedExhaustedError` includes portName, attempts, cause                          | unit |
| 10  | `CircularDerivedDependencyError` has code `"CIRCULAR_DERIVED_DEPENDENCY"` (HEX033)       | unit |
| 11  | `CircularDerivedDependencyError` has `isProgrammingError: true`                          | unit |
| 12  | `CircularDerivedDependencyError` includes dependencyChain                                | unit |
| 13  | `BatchExecutionError` has code `"BATCH_EXECUTION_FAILED"` (HEX034)                       | unit |
| 14  | `BatchExecutionError` has `isProgrammingError: false`                                    | unit |
| 15  | `BatchExecutionError` includes cause                                                     | unit |
| 16  | `EffectErrorHandlerError` has code `"EFFECT_ERROR_HANDLER_FAILED"` (HEX035)              | unit |
| 17  | `EffectErrorHandlerError` has `isProgrammingError: false`                                | unit |
| 18  | `EffectErrorHandlerError` includes portName, actionName, originalError, handlerError     | unit |
| 19  | `WaitForStateTimeoutError` has code `"WAIT_FOR_STATE_TIMEOUT"` (HEX036)                  | unit |
| 20  | `WaitForStateTimeoutError` has `isProgrammingError: false`                               | unit |
| 21  | `WaitForStateTimeoutError` includes portName, timeoutMs                                  | unit |
| 22  | All error classes extend `ContainerError`                                                | unit |
| 23  | `EffectFailedError` tagged value has `_tag: "EffectFailed"`, portName, actionName, cause | unit |
| 24  | `AsyncDerivedSelectError` tagged value has `_tag: "AsyncDerivedSelectFailed"`            | unit |
| 25  | `AsyncDerivedSelectError` includes portName, attempts, cause                             | unit |
| 26  | `HydrationError` tagged value has `_tag: "HydrationFailed"`, portName, cause             | unit |

### Type-Level Tests -- `errors.test-d.ts`

| #   | Test                                                                       | Type |
| --- | -------------------------------------------------------------------------- | ---- |
| 1   | `DisposedStateAccessError.code` is literal `"DISPOSED_STATE_ACCESS"`       | type |
| 2   | `DisposedStateAccessError.operation` is union of operation string literals | type |
| 3   | `EffectFailedError._tag` is literal `"EffectFailed"`                       | type |
| 4   | `AsyncDerivedSelectError._tag` is literal `"AsyncDerivedSelectFailed"`     | type |
| 5   | `HydrationError._tag` is literal `"HydrationFailed"`                       | type |
| 6   | All error classes have `isProgrammingError` as boolean literal type        | type |

### Mutation Testing

**Target: >95% mutation score.** Error code constants, `isProgrammingError` flags, `_tag` discriminant values, and error field assignment are critical -- mutations to any string literal, boolean literal, or field name must be caught.

---

## DoD 11: React Hooks (Spec Sections 27-32)

### Unit Tests -- `libs/store/react/tests/use-state-value.test.tsx`

| #   | Test                                                                        | Type |
| --- | --------------------------------------------------------------------------- | ---- |
| 1   | `useStateValue(port)` returns full state on mount                           | unit |
| 2   | `useStateValue(port)` re-renders when state changes                         | unit |
| 3   | `useStateValue(port, selector)` returns selected value                      | unit |
| 4   | `useStateValue(port, selector)` re-renders only when selected value changes | unit |
| 5   | `useStateValue(port, selector, equalityFn)` uses custom equality            | unit |
| 6   | `useStateValue` uses `useSyncExternalStore` internally                      | unit |

### Unit Tests -- `libs/store/react/tests/use-actions.test.tsx`

| #   | Test                                                                   | Type |
| --- | ---------------------------------------------------------------------- | ---- |
| 7   | `useActions(port)` returns `BoundActions`                              | unit |
| 8   | `useActions(port)` is referentially stable across renders              | unit |
| 9   | `useActions(port)` does not cause re-render on state change            | unit |
| 10  | Individual action functions from `useActions` are referentially stable | unit |

### Unit Tests -- `libs/store/react/tests/use-state-port.test.tsx`

| #   | Test                                                 | Type |
| --- | ---------------------------------------------------- | ---- |
| 11  | `useStatePort(port)` returns `{ state, actions }`    | unit |
| 12  | `useStatePort(port)` re-renders when state changes   | unit |
| 13  | `useStatePort(port).actions` is referentially stable | unit |

### Unit Tests -- `libs/store/react/tests/use-atom.test.tsx`

| #   | Test                                                           | Type |
| --- | -------------------------------------------------------------- | ---- |
| 14  | `useAtom(port)` returns `[value, setter]` tuple                | unit |
| 15  | `useAtom(port)` re-renders when atom value changes             | unit |
| 16  | Setter accepts direct value: `setTheme("dark")`                | unit |
| 17  | Setter accepts functional update: `setCount(prev => prev + 1)` | unit |
| 18  | Setter is referentially stable across renders                  | unit |

### Unit Tests -- `libs/store/react/tests/use-derived.test.tsx`

| #   | Test                                                               | Type |
| --- | ------------------------------------------------------------------ | ---- |
| 19  | `useDerived(port)` returns `DeepReadonly<TResult>`                 | unit |
| 20  | `useDerived(port)` re-renders when derived value changes           | unit |
| 21  | `useDerived(port)` does not re-render when unrelated state changes | unit |

### Unit Tests -- `libs/store/react/tests/use-async-derived.test.tsx`

| #   | Test                                                                  | Type |
| --- | --------------------------------------------------------------------- | ---- |
| 22  | `useAsyncDerived(port)` returns `{ snapshot, refresh }`               | unit |
| 23  | Snapshot status transitions: idle -> loading -> success               | unit |
| 24  | Snapshot status transitions: idle -> loading -> error                 | unit |
| 25  | Snapshot discriminated union narrows `data` on `status === "success"` | unit |
| 26  | `refresh()` is referentially stable                                   | unit |
| 27  | `refresh()` triggers re-fetch                                         | unit |

### Unit Tests -- `libs/store/react/tests/use-async-derived-suspense.test.tsx`

| #   | Test                                                                              | Type |
| --- | --------------------------------------------------------------------------------- | ---- |
| 28  | `useAsyncDerivedSuspense(port)` throws Promise on loading (triggers Suspense)     | unit |
| 29  | `useAsyncDerivedSuspense(port)` throws error on failure (caught by ErrorBoundary) | unit |
| 30  | `useAsyncDerivedSuspense(port)` returns `{ data, refresh }` on success            | unit |
| 31  | `data` is guaranteed non-undefined on success                                     | unit |
| 32  | `refresh()` is referentially stable                                               | unit |

### Unit Tests -- `libs/store/react/tests/scoped-state.test.tsx`

| #   | Test                                                                        | Type |
| --- | --------------------------------------------------------------------------- | ---- |
| 33  | No separate StoreProvider needed (uses `HexDiContainerProvider`)            | unit |
| 34  | `HexDiAutoScopeProvider` creates scoped state for nested components         | unit |
| 35  | Multiple `HexDiAutoScopeProvider` instances create independent scoped state | unit |

### Type-Level Tests -- `libs/store/react/tests/react-hooks.test-d.ts`

| #   | Test                                                                               | Type |
| --- | ---------------------------------------------------------------------------------- | ---- |
| 1   | `useStateValue(port)` return type is `DeepReadonly<TState>`                        | type |
| 2   | `useStateValue(port, selector)` return type is `TSelected`                         | type |
| 3   | `useActions(port)` return type is `BoundActions<TState, TActions>`                 | type |
| 4   | `useStatePort(port)` return type has `state: DeepReadonly<TState>` and `actions`   | type |
| 5   | `useAtom(port)` return type is `[DeepReadonly<TValue>, setter]`                    | type |
| 6   | `useAtom` setter accepts `TValue \| ((prev: TValue) => TValue)`                    | type |
| 7   | `useDerived(port)` return type is `DeepReadonly<TResult>`                          | type |
| 8   | `useAsyncDerived(port)` returns `{ snapshot: AsyncDerivedSnapshot, refresh }`      | type |
| 9   | `useAsyncDerivedSuspense(port)` returns `{ data: DeepReadonly<TResult>, refresh }` | type |
| 10  | `useAsyncDerivedSuspense` `data` is non-optional `DeepReadonly<TResult>`           | type |

### Integration Tests -- `libs/store/react/tests/integration/react-integration.test.tsx`

| #   | Test                                                                 | Type        |
| --- | -------------------------------------------------------------------- | ----------- |
| 1   | Hooks resolve state ports from `HexDiContainerProvider` container    | integration |
| 2   | Scoped hooks resolve from `HexDiAutoScopeProvider` scope             | integration |
| 3   | Full flow: render -> dispatch action -> re-render with updated state | integration |
| 4   | Multiple components sharing same state port see consistent state     | integration |

### Mutation Testing

**Target: >90% mutation score.** Hook return type correctness, referential stability of actions/setter/refresh, selector-based re-render gating, Suspense throw logic (Promise vs error), and useSyncExternalStore wiring are critical -- mutations to subscribe/getSnapshot callbacks or throw conditions must be caught.

---

## DoD 12: Testing Utilities (Spec Sections 33-36)

### Unit Tests -- `libs/store/testing/tests/testing-utilities.test.ts`

| #   | Test                                                                              | Type |
| --- | --------------------------------------------------------------------------------- | ---- |
| 1   | `createStateTestContainer({ adapters })` returns a Container                      | unit |
| 2   | Container resolves registered state adapters                                      | unit |
| 3   | `overrides` with `[StatePort, partialState]` applies initial state override       | unit |
| 4   | `overrides` with `[AtomPort, value]` applies initial atom override                | unit |
| 5   | `derived` adapters registered and functional in test container                    | unit |
| 6   | `effects` adapters registered and functional in test container                    | unit |
| 7   | `expectState(container, port).toBe(expected)` passes for matching state           | unit |
| 8   | `expectState(container, port).toBe(expected)` fails for non-matching state        | unit |
| 9   | `expectState(container, port).toMatch(partial)` checks partial match              | unit |
| 10  | `expectState(container, port).toSatisfy(predicate)` checks predicate              | unit |
| 11  | `expectAtom(container, port).toBe(expected)` passes for matching value            | unit |
| 12  | `expectAtom(container, port).toSatisfy(predicate)` checks predicate               | unit |
| 13  | `expectDerived(container, port).toBe(expected)` passes for matching value         | unit |
| 14  | `expectDerived(container, port).toMatch(partial)` checks partial match            | unit |
| 15  | `expectDerived(container, port).toSatisfy(predicate)` checks predicate            | unit |
| 16  | `expectAsyncDerived(container, port).toBeLoading()` passes during loading         | unit |
| 17  | `expectAsyncDerived(container, port).toBeSuccess(data)` passes on success         | unit |
| 18  | `expectAsyncDerived(container, port).toBeError()` passes on error                 | unit |
| 19  | `expectAsyncDerived(container, port).toHaveStatus(status)` checks status          | unit |
| 20  | `createMockStateAdapter({ provides, initial })` returns adapter and spies         | unit |
| 21  | Mock state adapter spies track action calls                                       | unit |
| 22  | `createMockAtomAdapter({ provides, initial })` returns adapter, setSpy, updateSpy | unit |
| 23  | Mock atom adapter setSpy tracks set calls                                         | unit |
| 24  | Mock atom adapter updateSpy tracks update calls                                   | unit |
| 25  | `createActionRecorder(container)` records all dispatched actions                  | unit |
| 26  | `recorder.getEventsForPort(portName)` filters by port                             | unit |
| 27  | `recorder.clear()` clears recorded events                                         | unit |
| 28  | `recorder.dispose()` stops recording                                              | unit |
| 29  | `waitForState(container, port, predicate)` resolves when predicate becomes true   | unit |
| 30  | `waitForState` rejects with `WaitForStateTimeoutError` on timeout                 | unit |
| 31  | Scope-isolated test: two scopes have independent state                            | unit |

### Mutation Testing

**Target: >85% mutation score.** Test container construction (adapter registration, override application), assertion logic (toBe/toMatch/toSatisfy), mock adapter spy recording, and waitForState timeout gating are critical -- mutations to override merging, assertion comparisons, or timeout conditions must be caught.

---

## DoD 13: Advanced Patterns (Spec Sections 37-42)

### Unit Tests -- `advanced-patterns.test.ts`

| #   | Test                                                                                | Type |
| --- | ----------------------------------------------------------------------------------- | ---- |
| 1   | Linked derived: `fahrenheit.value` computes from celsius source                     | unit |
| 2   | Linked derived: `fahrenheit.set(212)` writes back to celsius source (sets to 100)   | unit |
| 3   | Linked derived: bidirectional update propagates correctly                           | unit |
| 4   | Optimistic update: optimisticAdd sets optimistic state immediately                  | unit |
| 5   | Optimistic update: confirm removes pending entry                                    | unit |
| 6   | Optimistic update: rollback restores previous state                                 | unit |
| 7   | Optimistic update: onEffectError triggers rollback on Err                           | unit |
| 8   | Undo/redo: push adds to past, clears future                                         | unit |
| 9   | Undo/redo: undo moves present to future, past.pop() to present                      | unit |
| 10  | Undo/redo: redo moves present to past, future.pop() to present                      | unit |
| 11  | Multi-tenant: scoped port produces independent state per tenant scope               | unit |
| 12  | Multi-tenant: tenant A changes do not affect tenant B                               | unit |
| 13  | Hydration: `StateHydrator.hydrate()` returns `ResultAsync<unknown, HydrationError>` | unit |
| 14  | Hydration: `StateHydrator.dehydrate()` returns `ResultAsync<void, HydrationError>`  | unit |
| 15  | Hydration: localStorage adapter round-trip (dehydrate then hydrate)                 | unit |
| 16  | Hydration: missing key returns Ok(undefined) not error                              | unit |
| 17  | Hydration: `HydrationError` has `_tag: "HydrationFailed"`, portName, cause          | unit |

### Mutation Testing

**Target: >85% mutation score.** Linked derived bidirectional propagation, optimistic update rollback logic, undo/redo stack manipulation (push/pop ordering), scope isolation, and hydration Result wrapping are critical -- mutations to write-back functions, stack operations, or Result branching must be caught.

---

## DoD 14: Integration Tests

### Integration Tests -- `integration/container-lifecycle.test.ts`

| #   | Test                                                                               | Type        |
| --- | ---------------------------------------------------------------------------------- | ----------- |
| 1   | Full lifecycle: build graph -> create container -> resolve state -> act -> dispose | integration |
| 2   | Multi-port reactivity: state port change propagates through derived chain          | integration |
| 3   | Scope inheritance: scoped derived depends on singleton + scoped sources            | integration |
| 4   | Captive dependency detection: singleton derived with scoped source rejected        | integration |

### Integration Tests -- `integration/tracing.test.ts`

| #   | Test                                                                       | Type        |
| --- | -------------------------------------------------------------------------- | ----------- |
| 5   | Tracing integration: action dispatch creates span with correct attributes  | integration |
| 6   | Tracing integration: batch creates parent span with child spans per action | integration |
| 7   | Tracing integration: TracerPort absent produces no spans and no overhead   | integration |

### Integration Tests -- `integration/effect-ports.test.ts`

| #   | Test                                                                       | Type        |
| --- | -------------------------------------------------------------------------- | ----------- |
| 8   | Effect-as-port: action logger receives events from all state ports         | integration |
| 9   | Effect-as-port: state persister writes to storage on matching port actions | integration |
| 10  | Effect-as-port: multiple effect adapters all receive same action event     | integration |
| 11  | Effect-as-port: scoped effect adapter only receives events from its scope  | integration |

### Mutation Testing

**Target: >85% mutation score.** Integration boundary -- graph validation, scope resolution, tracing attribute propagation, and effect port fan-out are the key targets.

---

## DoD 15: E2E Tests

### E2E Tests -- `e2e/counter.test.ts`

| #   | Test                                                                               | Type |
| --- | ---------------------------------------------------------------------------------- | ---- |
| 1   | Counter app: create container -> resolve -> increment -> decrement -> verify state | e2e  |
| 2   | Counter app: derived DoubleCount stays in sync with Counter                        | e2e  |

### E2E Tests -- `e2e/todo-list.test.ts`

| #   | Test                                                                | Type |
| --- | ------------------------------------------------------------------- | ---- |
| 3   | Todo list: add items -> toggle -> filter -> verify filtered results | e2e  |
| 4   | Todo list: clearCompleted removes done items                        | e2e  |

### E2E Tests -- `e2e/cart-with-totals.test.ts`

| #   | Test                                                                    | Type |
| --- | ----------------------------------------------------------------------- | ---- |
| 5   | Cart: add items -> derived CartTotal computes subtotal, discount, total | e2e  |
| 6   | Cart: remove item -> CartTotal updates                                  | e2e  |

### E2E Tests -- `e2e/async-derived.test.ts`

| #   | Test                                                                | Type |
| --- | ------------------------------------------------------------------- | ---- |
| 7   | Async derived: exchange rate transitions idle -> loading -> success | e2e  |
| 8   | Async derived: error path with retry exhaustion                     | e2e  |
| 9   | Async derived: refresh triggers re-fetch                            | e2e  |

### E2E Tests -- `e2e/scope-lifecycle.test.ts`

| #   | Test                                                                    | Type |
| --- | ----------------------------------------------------------------------- | ---- |
| 10  | Scope lifecycle: create scope -> resolve scoped state -> act -> dispose | e2e  |
| 11  | Scope lifecycle: disposed scope throws on state access                  | e2e  |

### E2E Tests -- `e2e/react-rendering.test.tsx`

| #   | Test                                                                     | Type |
| --- | ------------------------------------------------------------------------ | ---- |
| 12  | React: component renders state value, updates on action dispatch         | e2e  |
| 13  | React: selector prevents re-render when unrelated state changes          | e2e  |
| 14  | React: scoped state via HexDiAutoScopeProvider isolated between siblings | e2e  |
| 15  | React: Suspense boundary shows fallback during async derived loading     | e2e  |

### Mutation Testing

**Target: >85% mutation score.** E2E scenarios validate end-to-end correctness -- mutations to reducer logic, derived computation, async status transitions, and scope isolation must be caught.

---

## Test Count Summary

| Category          | @hex-di/store | @hex-di/store-react | @hex-di/store-testing | Total    |
| ----------------- | ------------- | ------------------- | --------------------- | -------- |
| Unit tests        | ~215          | ~35                 | ~31                   | ~281     |
| Type-level tests  | ~68           | ~10                 | --                    | ~78      |
| Integration tests | ~19           | ~4                  | --                    | ~23      |
| E2E tests         | ~15           | --                  | --                    | ~15      |
| **Total**         | **~317**      | **~49**             | **~31**               | **~397** |

## Verification Checklist

Before marking the spec as "implemented," the following must all pass:

| Check                               | Command                                                                | Expected   |
| ----------------------------------- | ---------------------------------------------------------------------- | ---------- |
| All unit tests pass                 | `pnpm --filter @hex-di/store test`                                     | 0 failures |
| All type tests pass                 | `pnpm --filter @hex-di/store test:types`                               | 0 failures |
| All integration tests pass          | `pnpm --filter @hex-di/store test -- --dir integration`                | 0 failures |
| All e2e tests pass                  | `pnpm --filter @hex-di/store test -- --dir e2e`                        | 0 failures |
| React unit tests pass               | `pnpm --filter @hex-di/store-react test`                               | 0 failures |
| React type tests pass               | `pnpm --filter @hex-di/store-react test:types`                         | 0 failures |
| React integration tests pass        | `pnpm --filter @hex-di/store-react test -- --dir integration`          | 0 failures |
| Testing package tests pass          | `pnpm --filter @hex-di/store-testing test`                             | 0 failures |
| Typecheck passes (core)             | `pnpm --filter @hex-di/store typecheck`                                | 0 errors   |
| Typecheck passes (react)            | `pnpm --filter @hex-di/store-react typecheck`                          | 0 errors   |
| Typecheck passes (testing)          | `pnpm --filter @hex-di/store-testing typecheck`                        | 0 errors   |
| Lint passes (core)                  | `pnpm --filter @hex-di/store lint`                                     | 0 errors   |
| Lint passes (react)                 | `pnpm --filter @hex-di/store-react lint`                               | 0 errors   |
| Lint passes (testing)               | `pnpm --filter @hex-di/store-testing lint`                             | 0 errors   |
| No `any` types in core source       | `grep -r "any" libs/store/core/src/`                                   | 0 matches  |
| No type casts in core source        | `grep -r " as " libs/store/core/src/`                                  | 0 matches  |
| No eslint-disable in core source    | `grep -r "eslint-disable" libs/store/core/src/`                        | 0 matches  |
| No `any` types in react source      | `grep -r "any" libs/store/react/src/`                                  | 0 matches  |
| No type casts in react source       | `grep -r " as " libs/store/react/src/`                                 | 0 matches  |
| No eslint-disable in react source   | `grep -r "eslint-disable" libs/store/react/src/`                       | 0 matches  |
| No `any` types in testing source    | `grep -r "any" libs/store/testing/src/`                                | 0 matches  |
| No type casts in testing source     | `grep -r " as " libs/store/testing/src/`                               | 0 matches  |
| No eslint-disable in testing source | `grep -r "eslint-disable" libs/store/testing/src/`                     | 0 matches  |
| Mutation score (ports)              | `pnpm --filter @hex-di/store stryker -- --mutate src/ports/**`         | >95%       |
| Mutation score (adapters)           | `pnpm --filter @hex-di/store stryker -- --mutate src/adapters/**`      | >95%       |
| Mutation score (services)           | `pnpm --filter @hex-di/store stryker -- --mutate src/services/**`      | >95%       |
| Mutation score (reactivity)         | `pnpm --filter @hex-di/store stryker -- --mutate src/reactivity/**`    | >95%       |
| Mutation score (effects)            | `pnpm --filter @hex-di/store stryker -- --mutate src/effects/**`       | >95%       |
| Mutation score (actions)            | `pnpm --filter @hex-di/store stryker -- --mutate src/actions/**`       | >95%       |
| Mutation score (lifecycle)          | `pnpm --filter @hex-di/store stryker -- --mutate src/lifecycle/**`     | >95%       |
| Mutation score (errors)             | `pnpm --filter @hex-di/store stryker -- --mutate src/errors/**`        | >95%       |
| Mutation score (introspection)      | `pnpm --filter @hex-di/store stryker -- --mutate src/introspection/**` | >85%       |
| Mutation score (react hooks)        | `pnpm --filter @hex-di/store-react stryker -- --mutate src/**`         | >90%       |
| Mutation score (testing utilities)  | `pnpm --filter @hex-di/store-testing stryker -- --mutate src/**`       | >85%       |

## Mutation Testing Strategy

### Why Mutation Testing Matters for @hex-di/store

The store system has critical behavioral invariants around reactivity, snapshot immutability, and action dispatch semantics. A test suite that merely checks "state updated" or "subscriber called" would miss mutations like:

- Diamond dependency solver evaluating a computed twice (glitch) instead of once
- Batch depth counter not decrementing on nested batch exit
- Structural sharing returning new reference when data is unchanged (causes unnecessary re-renders)
- Structural sharing returning old reference when data changed (shows stale data)
- Effect firing before reducer instead of after
- `onEffectError` invoked on `Ok` instead of `Err`
- `DisposedStateAccessError` not thrown after disposal
- Scoped state leaking between scopes
- BoundActions including the state parameter instead of stripping it
- `NoPayload` sentinel collapsing with `undefined` (void/undefined ambiguity)
- Selector subscription firing on every state change instead of selected value change

Mutation testing catches these subtle behavioral inversions.

### Mutation Targets by Priority

| Priority | Module                                                | Target Score | Rationale                                                        |
| -------- | ----------------------------------------------------- | ------------ | ---------------------------------------------------------------- |
| Critical | Ports (factories, phantom types)                      | >95%         | Port type safety is the contract between domain and adapter.     |
| Critical | Adapters (factory wiring, brand stamping)             | >95%         | Adapter construction drives all runtime behavior.                |
| Critical | Services (state/actions/subscribe contracts)          | >95%         | Service interface is the public API surface.                     |
| Critical | Reactivity (signals, computeds, diamond solver)       | >95%         | Reactivity correctness is the core guarantee of the store.       |
| Critical | Effects (timing, ResultAsync branching, discovery)    | >95%         | Effect lifecycle and error handling must be precise.             |
| Critical | Actions (BoundActions, NoPayload, reducers)           | >95%         | Action type mapping and dispatch are foundational.               |
| Critical | Lifecycle (disposal, scope isolation)                 | >95%         | Disposal guarantees prevent resource leaks and stale access.     |
| Critical | Errors (codes, tags, fields)                          | >95%         | Error discriminants and field assignments must be exact.         |
| Medium   | Introspection (queries, history, events)              | >85%         | Observability layer. Important but not on critical path.         |
| High     | React hooks (state management, referential stability) | >90%         | UI binding layer. Referential stability is performance-critical. |
| Medium   | Testing utilities (assertions, mocks, containers)     | >85%         | Test infrastructure. Reliable but lower priority.                |

### Mutation Operators to Prioritize

- **Conditional boundary mutations**: `===` -> `!==`, `>` -> `>=` (catches disposal checks, batch depth comparisons, staleness thresholds)
- **Return value mutations**: `return Ok(x)` -> `return Err(x)` (catches effect success/failure inversion)
- **Block removal**: Removing `if (disposed) throw ...` (catches missing disposal guard)
- **Method call mutations**: `signal.set(newState)` -> skip (catches missing state update after reducer)
- **Boolean literal mutations**: `true` -> `false` in `isProgrammingError`, `isLoading` flags
- **Arithmetic mutations**: `count * 2` -> `count + 2` (catches derived computation formulas)
- **Loop direction mutations**: Removing `Object.freeze()` call (catches missing runtime enforcement)
- **Reference identity mutations**: `return cachedRef` -> `return newRef` (catches broken referential stability)

---

_Previous: [11 - Appendices](./11-appendices.md)_

_End of Definition of Done_
