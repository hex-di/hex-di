# 11 - Appendices

_Previous: [10 - API Reference](./10-api-reference.md)_

---

## Appendix A: Comparison with State Management Libraries

### Overview

| Library           | Reactivity Model   | DI Integration         | Granularity    | Derived State      |
| ----------------- | ------------------ | ---------------------- | -------------- | ------------------ |
| **@hex-di/store** | Signals            | Native (Container)     | Object + Atom  | Computed signals   |
| Effect Atom       | Fiber-based        | Native (Layer/Context) | Atom-only      | Computed atoms     |
| Zustand           | Subscription-based | None                   | Store-level    | Selectors          |
| Jotai             | Atom-based         | None (Provider)        | Atom-only      | Derived atoms      |
| Legend-State      | Proxy-based        | None                   | Property-level | Linked observables |
| XState            | Actor model        | None                   | Machine-level  | Via selectors      |
| Valtio            | Proxy-snapshot     | None                   | Property-level | Derived proxies    |
| TanStack Store    | Subscription-based | None                   | Store-level    | Explicit graph     |
| TC39 Signals      | Signal-based       | None (proposal)        | Signal-level   | Computed           |

### Detailed Comparisons

#### Effect Atom / Ref / SubscriptionRef

**Similarities:**

- Both integrate state with dependency injection
- Both use layers/scopes for state isolation
- Both support computed/derived values

**Differences:**

- Effect uses fiber-based scheduling; @hex-di/store uses synchronous signals
- Effect Atom requires `AtomRuntime` as a bridge; @hex-di/store resolves directly from Container
- Effect's error channel (`Effect<A, E, R>`) provides typed errors; @hex-di/store uses `Result<T, E>` / `ResultAsync<T, E>` for typed operational errors in effects
- Effect is atom-only; @hex-di/store provides both object state (StatePort) and atoms (AtomPort)

**What @hex-di/store borrows:**

- The concept of `AtomRuntime` bridging DI containers with reactive state. In @hex-di/store, Container itself is this bridge.
- Layer composition algebra: Container scoping provides equivalent composition.

#### Zustand

**Similarities:**

- Immutable state with action-based updates
- Selector-based subscriptions for fine-grained rendering
- Middleware/plugin system for cross-cutting concerns

**Differences:**

- Zustand stores are standalone; @hex-di/store ports participate in DI graphs
- Zustand middleware is compositional but untyped ordering; @hex-di/store effects are DI-managed
- Zustand selectors are in components; @hex-di/store derived ports are in the graph
- Zustand has no scoping; @hex-di/store scopes through Container

**What @hex-di/store borrows:**

- The simplicity of `create((set) => ({ count: 0, increment: () => set(s => ...) }))`. Our `createStateAdapter` aims for similar ergonomics with initial state and reducers in the adapter config.
- Zustand's `subscribe` with selector pattern for `StateService.subscribe`.

#### Jotai

**Similarities:**

- Atom-level granularity with independent subscription units
- Derived atoms that auto-track dependencies
- Provider-based scoping for state isolation

**Differences:**

- Jotai atoms are anonymous values; @hex-di/store atoms are named ports in the DI graph
- Jotai's `useAtom` couples reading and writing; @hex-di/store separates `useStateValue` and `useActions`
- Jotai's derived atoms define computation inline; @hex-di/store uses separate adapter for computation
- Jotai's `Provider` creates isolated atom state; @hex-di/store uses Container scopes

**What @hex-di/store borrows:**

- Atom-level granularity: `createAtomPort` provides Jotai-style independent reactive values.
- Atoms-in-atoms: Derived ports can depend on other derived ports, creating computation graphs.

#### Legend-State

**Similarities:**

- Fine-grained property-level subscriptions
- Proxy-based access tracking
- Bidirectional derived (linked) values

**Differences:**

- Legend-State uses mutable proxies; @hex-di/store uses immutable snapshots with signal internals
- Legend-State's reactivity is implicit (proxy traps); @hex-di/store's is explicit (subscribe calls)
- Legend-State has no DI; @hex-di/store is DI-native

**What @hex-di/store borrows:**

- Two-way linked observables: `createLinkedDerivedPort` enables bidirectional derived state.
- Fine-grained proxy tracking: Selector subscriptions use proxy-based path recording.

#### XState

For state machine functionality, see [`@hex-di/flow`](../../libs/flow/core) which provides branded types, pure transitions, activities, guards, and effect composition with full HexDI integration.

#### Valtio

**Similarities:**

- Snapshot separation (mutable internal, immutable external)
- Proxy-based change detection
- Structural sharing between snapshots

**Differences:**

- Valtio mutates state directly (`state.count++`); @hex-di/store uses reducer actions
- Valtio's `snapshot()` creates a frozen copy; @hex-di/store's `.state` is always frozen
- Valtio has no DI; @hex-di/store is DI-native

**What @hex-di/store borrows:**

- Mutable-internal/immutable-external duality: Signals hold mutable state; `.state` returns `DeepReadonly` snapshots.
- Structural sharing: Unchanged subtrees share references between snapshots.
- Runtime `Object.freeze` in development for catching mutations.

#### TanStack Store

**Similarities:**

- Explicit dependency tracking for derived values
- Diamond dependency solver for consistent computations
- Subscription-based reactivity

**Differences:**

- TanStack Store is framework-agnostic standalone; @hex-di/store is DI-integrated
- TanStack Store's `__storeToDerived` WeakMap is implementation-level; @hex-di/store's signal graph is structural
- TanStack Store has no scoping; @hex-di/store scopes through Container

**What @hex-di/store borrows:**

- Diamond dependency solver: Topological sorting ensures derived values compute exactly once per change cycle.
- `WeakMap`-based dependency graph tracking pattern.
- Explicit `batch()` function for grouping changes.

#### TC39 Signals Proposal

**Similarities:**

- Signal + Computed + Effect as core primitives
- Automatic dependency tracking through read interception
- Pull-based lazy evaluation for computeds

**Differences:**

- TC39 Signals is a language primitive proposal; @hex-di/store implements signals in userland
- TC39 Signals provides `Signal.subtle.Watcher` for framework integration; @hex-di/store uses `useSyncExternalStore`
- TC39 Signals is minimal (no batching, no effects); @hex-di/store adds batching and effect scheduling

**What @hex-di/store borrows:**

- Signal/Computed/Effect as the core reactivity model.
- The minimal kernel approach: signals are the primitive; everything else is built on top.
- Pull-based lazy evaluation for derived values.

### Feature Matrix

| Feature               | @hex-di/store | Effect | Zustand | Jotai | Legend-State | XState | Valtio | TanStack |
| --------------------- | :-----------: | :----: | :-----: | :---: | :----------: | :----: | :----: | :------: |
| DI integration        |       ●       |   ●    |    ○    |   ○   |      ○       |   ○    |   ○    |    ○     |
| Scoped state          |       ●       |   ●    |    ○    |   ◐   |      ○       |   ○    |   ○    |    ○     |
| Signal reactivity     |       ●       |   ○    |    ○    |   ●   |      ●       |   ○    |   ●    |    ○     |
| Diamond solver        |       ●       |   ○    |    ○    |   ●   |      ●       |   ○    |   ○    |    ●     |
| Glitch-free batching  |       ●       |   ●    |    ○    |   ●   |      ●       |   ●    |   ○    |    ●     |
| Fine-grained subs     |       ●       |   ○    |    ◐    |   ●   |      ●       |   ○    |   ●    |    ◐     |
| Bidirectional derived |       ●       |   ○    |    ○    |   ○   |      ●       |   ○    |   ○    |    ○     |
| Snapshot separation   |       ●       |   ○    |    ○    |   ○   |      ○       |   ●    |   ●    |    ○     |
| Type-safe actions     |       ●       |   ●    |    ◐    |   ●   |      ◐       |   ●    |   ○    |    ◐     |
| Testable effects      |       ●       |   ●    |    ◐    |   ○   |      ○       |   ●    |   ○    |    ○     |
| Typed error channel   |       ●       |   ●    |    ○    |   ○   |      ○       |   ○    |   ○    |    ○     |

Legend: ● = Full support, ◐ = Partial/manual, ○ = Not supported

## Appendix B: Glossary

| Term                           | Definition                                                                                                                                                                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Action**                     | A named reducer function that transforms state. Signature declared on the port (phantom types); implementation provided by the adapter.                                                                                                                                         |
| **ActionMap**                  | A record mapping action names to reducer functions.                                                                                                                                                                                                                             |
| **Adapter**                    | A branded type from `@hex-di/core` that provides an implementation for a port.                                                                                                                                                                                                  |
| **Atom**                       | A simple reactive value (get/set/update) without actions. Phantom-branded with `[__atomType]` to prevent structural matching. Initial value provided by `createAtomAdapter`.                                                                                                    |
| **Batch**                      | A group of state changes that notify subscribers once at the end.                                                                                                                                                                                                               |
| **Bound action**               | A reducer converted to a callable function (state parameter removed).                                                                                                                                                                                                           |
| **Computed**                   | An internal signal that derives its value from other signals automatically.                                                                                                                                                                                                     |
| **Container**                  | HexDI's runtime that manages resolution, scoping, and disposal.                                                                                                                                                                                                                 |
| **DeepReadonly**               | A type utility that recursively makes all properties readonly.                                                                                                                                                                                                                  |
| **Derived port**               | A port providing a computed value from other ports.                                                                                                                                                                                                                             |
| **Diamond problem**            | When a derived value depends on multiple paths that share a common source.                                                                                                                                                                                                      |
| **DirectedPort**               | A `Port<T, TName>` extended with hexagonal direction (inbound/outbound).                                                                                                                                                                                                        |
| **Effect (adapter)**           | A side effect triggered after a state change. Lives in the adapter.                                                                                                                                                                                                             |
| **Effect adapter**             | An adapter created with `createEffectAdapter()` that implements `ActionEffect`. Branded with `__effectBrand` for structural discovery.                                                                                                                                          |
| **Effect port**                | A DI-managed port of type `Port<ActionEffect>` that receives action events from the state system.                                                                                                                                                                               |
| **EffectAdapterBrand**         | A branded type (`{ readonly [__effectBrand]: true }`) added to adapters created by `createEffectAdapter()` for structural identification.                                                                                                                                       |
| **Glitch**                     | When a subscriber sees intermediate, inconsistent state during a batch.                                                                                                                                                                                                         |
| **Linked derived**             | A bidirectional derived value that can be written back to its sources. Declares `writesTo` for graph visibility of the reverse data flow.                                                                                                                                       |
| **NoPayload**                  | A branded sentinel type used as the default for `ActionReducer<TState, TPayload>`. Replaces `void` to avoid the `undefined extends void` ambiguity. End users never interact with it directly.                                                                                  |
| **Port**                       | A branded type from `@hex-di/core` that serves as a compile-time contract.                                                                                                                                                                                                      |
| **Reducer**                    | A pure function `(state, payload?) => newState`. Implemented in the adapter.                                                                                                                                                                                                    |
| **Scope**                      | An isolated Container context with its own scoped service instances.                                                                                                                                                                                                            |
| **Signal**                     | An internal reactive primitive that tracks dependents and notifies on change.                                                                                                                                                                                                   |
| **Snapshot**                   | A deeply frozen, immutable view of state.                                                                                                                                                                                                                                       |
| **State port**                 | A port providing reactive state with typed actions.                                                                                                                                                                                                                             |
| **StateService**               | The service interface carried by state ports (state + actions + subscribe).                                                                                                                                                                                                     |
| **Subscription**               | A listener registered to be called when state changes.                                                                                                                                                                                                                          |
| **StoreInspectorAPI**          | Pull-based query + push-based subscription interface for store introspection.                                                                                                                                                                                                   |
| **StoreSnapshot**              | Frozen point-in-time snapshot of all store state.                                                                                                                                                                                                                               |
| **PortSnapshot**               | Discriminated union snapshot of a single port (state, atom, derived, async-derived).                                                                                                                                                                                            |
| **AsyncDerivedPortSnapshot**   | Snapshot of an async derived port including status, data, error, and source ports.                                                                                                                                                                                              |
| **ActionHistoryEntry**         | Record of a single state transition with effect status tracking.                                                                                                                                                                                                                |
| **SubscriberGraph**            | Graph of port dependencies (nodes) and reactive relationships (edges).                                                                                                                                                                                                          |
| **StoreInspectorEvent**        | Discriminated union event emitted on store state changes.                                                                                                                                                                                                                       |
| **Topological sort**           | Ordering computeds by dependency depth for correct evaluation order.                                                                                                                                                                                                            |
| **Writes-to edge**             | A subscriber graph edge from a linked derived port to a source port it mutates via `write()`. Makes bidirectional data flow visible to graph analysis.                                                                                                                          |
| **Trace correlation**          | Linking store actions to distributed tracing spans via `traceId`/`spanId` fields.                                                                                                                                                                                               |
| **Lightweight history**        | Production mode that records action metadata without state snapshots.                                                                                                                                                                                                           |
| **Sampling rate**              | Fraction of actions recorded in lightweight mode (0.0–1.0).                                                                                                                                                                                                                     |
| **EffectFailedError**          | A tagged value (`_tag: "EffectFailed"`) wrapping an effect's `Err` result with port name, action name, and original cause. Used in `onEffectError`, `ActionEvent`, `ActionHistoryEntry`, and `StoreInspectorEvent`.                                                             |
| **AsyncDerivedSelectError**    | A tagged value (`_tag: "AsyncDerivedSelectFailed"`) produced when an async derived adapter's `select` returns `Err` after all retries.                                                                                                                                          |
| **AsyncDerivedExhaustedError** | A programming error (`isProgrammingError = true`) thrown when an async derived adapter's `select` function throws an exception instead of returning `ResultAsync.err()`. Distinct from `AsyncDerivedSelectError`, which is the tagged value for the expected `Err` return path. |
| **HydrationError**             | A convention type (`_tag: "HydrationFailed"`) for hydrator adapter implementations. The store runtime does not produce this — user-written hydrator adapters construct it when wrapping I/O failures.                                                                           |
| **ResultAsync**                | An async Result type from `@hex-di/result` representing a computation that may succeed (`Ok<T>`) or fail (`Err<E>`). Used by effects and async derived adapters instead of raw `Promise`.                                                                                       |
| **Tagged error**               | An error value with a `_tag` string discriminant enabling exhaustive `switch` handling. All operational error types in `@hex-di/store` use this pattern.                                                                                                                        |
| **MCP resource**               | A structured JSON endpoint exposing store introspection data to AI agents.                                                                                                                                                                                                      |

## Appendix C: Design Decisions

### D1: Reducers in adapters, not ports

**Decision:** Action reducers and initial state are defined in `createStateAdapter`, not in `createStatePort`. The port carries only phantom types for the state shape and action signatures.

**Rationale:** In the HexDI ecosystem, ports are purely phantom-typed tokens — they carry type information but no runtime behavior. `@hex-di/flow`'s `createFlowPort` only wraps `port<FlowService>()({ name })` — the machine definition lives in `FlowAdapterConfig.machine`. Following this precedent, `createStatePort` declares the service type contract (state shape and action signatures as phantom types), and `createStateAdapter` provides the implementation (initial state, reducer functions, lifetime, effects). This keeps ports minimal and consistent across the ecosystem.

**Alternatives considered:** Reducers in ports (Zustand-like pattern where port IS the contract). Rejected because it violates the HexDI port convention where ports are phantom-typed tokens, and it prevents testing flexibility — with reducers in the adapter, tests can provide different initial states or simplified reducers while the port's phantom types ensure type safety.

**Code review checklist for reducers:**

1. Is the reducer pure? (no API calls, no DOM access, no `Date.now()`, no `Math.random()`)
2. Is it under 10 lines? (extract complex transformations to tested helper functions)
3. Are complex transformations in separate tested helpers? (thin reducers calling pure functions)
4. Does it only touch its own state? (no reading globals, other ports, or external state)

### D1a: Branded effect discovery over tag-based discovery

**Decision:** Effect adapters are identified by a `__effectBrand` property added by `createEffectAdapter()`, not by a magic string `"action-effect"` tag on the port.

**Rationale:** Tag-based discovery relies on a string convention — forgetting to add `tags: ["action-effect"]` silently breaks effect wiring with no compile-time error. A branded type on the adapter itself makes effect adapters structurally identifiable. The `createEffectAdapter()` factory wraps `createAdapter()` with domain-specific config (similar to how `createFlowAdapter()` wraps `createAdapter()`), ensuring the brand is always present. Tags remain available for metadata and graph visualization but are not used for critical runtime wiring.

**Alternatives considered:** Port tag-based discovery (`tags: ["action-effect"]`). Rejected because it's convention-dependent, not type-safe, and creates a silent failure mode when the tag is omitted.

### D1b: NoPayload sentinel over void default

**Decision:** `ActionReducer<TState, TPayload>` defaults `TPayload` to a branded `NoPayload` sentinel type instead of `void`.

**Rationale:** In TypeScript, `undefined extends void` is `true`, which causes `ActionReducer<S, undefined>` to incorrectly collapse to the no-payload branch `(state: S) => S` instead of the payload branch `(state: S, payload: undefined) => S`. The `[TPayload] extends [NoPayload]` distribution guard prevents both union distribution and the void/undefined ambiguity. `NoPayload` is an internal type — end users never interact with it.

**Alternatives considered:** Using `void` (original). Rejected because of the `undefined extends void` edge case that breaks type inference for `ActionReducer<S, undefined>`.

### D2: No separate Store runtime

**Decision:** Container manages all state. No `createStore()`, no `StoreProvider`.

**Rationale:** A separate Store runtime creates two independent systems that must be synchronized. Container already handles instance creation, scoping, disposal, and dependency resolution. Adding state as regular adapters leverages all existing infrastructure.

**Alternatives considered:** Store as Container wrapper. Rejected because it adds indirection without benefit -- you'd still call `store.resolve(port)` instead of `container.resolve(port)`.

### D3: Signal-based reactivity over subscription-based

**Decision:** Use signals (TC39-inspired) as the internal reactivity primitive.

**Rationale:** Signals provide automatic dependency tracking, lazy evaluation, and glitch-free propagation. Subscription-based systems (Zustand, TanStack Store) require manual dependency declarations and are vulnerable to diamond problems.

**Alternatives considered:** Pure subscription model (simpler implementation). Rejected because diamond dependency solving and automatic tracking are essential for derived ports.

### D4: Effect ports over middleware

**Decision:** Cross-cutting concerns are DI-managed effect ports, not a global middleware pipeline.

**Rationale:** Middleware cannot declare dependencies, cannot be scoped, and has fragile ordering. Effect ports participate in the DI graph, get proper dependency injection, scope with Container, and are testable through adapter swapping.

**Alternatives considered:** Middleware with DI injection (hybrid). Rejected because middleware ordering remains fragile and the middleware concept adds unnecessary complexity when adapters already provide the same capability.

### D5: Atoms as separate concept from state ports

**Decision:** Provide both `createStatePort` (object state with actions) and `createAtomPort` (single values with get/set).

**Rationale:** Forcing simple values (theme, locale, sidebar expanded) through the action/reducer pattern adds ceremony without benefit. Atoms provide a simpler API for simple needs while sharing the same reactivity engine and Container integration.

**Alternatives considered:** Single `createStatePort` for everything. Rejected because defining a separate port type, action interface, and adapter with `createStateAdapter({ initial: true, actions: { toggle: (s) => !s } })` is excessive for a boolean toggle.

### D6: State machines via @hex-di/flow

**Decision:** State machines are provided by [`@hex-di/flow`](../../libs/flow/core), not `@hex-di/store`.

**Rationale:** State machines are a fundamentally different model (finite states + validated transitions) from reducer-based state (arbitrary state shape + arbitrary transitions). `@hex-di/flow` provides branded types, pure transitions, activities, guards, and effect composition with full HexDI integration. Keeping state machines separate avoids scope creep in `@hex-di/store` while delivering a more capable machine implementation.

### D7: Curried port factories

**Decision:** Port factories use curried form: `createStatePort<TState, TActions>()(config)`.

**Rationale:** TypeScript cannot partially infer generic parameters. The curried form separates the explicit type parameters (`TState`, `TActions`) from the inferred one (`TName`). Without currying, users would need to specify all generic parameters manually.

**Alternatives considered:** Non-curried with explicit generics. Rejected because `createStatePort<{ count: number }, CounterActions, "Counter">({ ... })` is verbose and error-prone.

### D8: Snapshot separation via DeepReadonly

**Decision:** State reads return `DeepReadonly<T>` snapshots, not mutable references.

**Rationale:** Accidental state mutation is the most common bug in state management. `DeepReadonly` catches mutations at compile time. Runtime `Object.freeze` in development catches mutations that bypass TypeScript (e.g., untyped third-party code). Structural sharing between snapshots makes this efficient.

**Alternatives considered:** Mutable state with proxy-based change detection (Legend-State/Valtio approach). Rejected because mutable state creates foot-guns that TypeScript cannot prevent, and proxy-based detection adds complexity and potential gotchas.

### D9: No automatic rollback on effect failure

**Decision:** When an effect returns `Err`, the state transition stands. Recovery happens through explicit `onEffectError` callbacks that dispatch compensating actions. The error is wrapped in an `EffectFailedError` tagged value before being passed to the handler.

**Rationale:** Reducers are deterministic state transitions. Effects are side effects. The reducer successfully computed valid new state -- rolling it back because a side effect failed conflates two independent concerns. Compensating actions are explicit, testable, visible in action history, and subject to the same reducer/effect pipeline as any other action. The `EffectFailedError` wrapper provides structured context (`_tag`, `portName`, `actionName`, `cause`) for diagnostics without requiring pattern matching on raw `unknown` values.

**Alternatives considered:**

1. Automatic rollback to `prevState`. Rejected because it silently undoes valid state transitions, creates invisible state changes, and makes debugging harder.
2. Effect errors propagated as rejected promises to callers. Rejected because `actions.increment()` is synchronous -- there's no caller to propagate to. Effects are fire-and-forget by design.
3. Global error boundary. Rejected because it cannot dispatch port-specific compensating actions.

### D10: Store introspection follows InspectorAPI pattern with explicit registration

**Decision:** Store introspection uses a `StoreInspectorAPI` interface accessed through `StoreInspectorPort`, following the same patterns as Container's `InspectorAPI`. Registration is explicit via `createStoreInspectorAdapter()`.

**Rationale:** The codebase already has proven patterns for runtime introspection:

- `InspectorAPI` for pull queries + push subscriptions (Container inspection)
- `ContainerSnapshot` for frozen discriminated union snapshots
- `TracingAPI` for tree-structured data with `parentId`/`childIds`
- `InspectorEvent` for discriminated union events

Reusing these patterns ensures consistency, reduces learning curve, and leverages existing mental models. Store introspection is just another port -- no special runtime APIs, no global singletons, no devtools-only code paths.

Registration is explicit rather than automatic. Auto-registration (injecting the inspector whenever a state adapter is detected) would require the graph builder to have store-specific knowledge, violating the principle that `GraphBuilder` is domain-agnostic. Explicit registration keeps the graph builder clean and gives users control over whether introspection is enabled (e.g., disabling it in production for minimal overhead).

**Alternatives considered:**

1. Global `Store.inspect()` API. Rejected because it creates a parallel access path outside the DI graph.
2. React DevTools-only introspection. Rejected because non-React consumers need the same visibility.
3. Tracing-only observability (no pull queries). Rejected because developers need point-in-time snapshots for debugging, not just event streams.
4. Auto-registration when state adapters are detected. Rejected because it requires store-specific logic in the graph builder and removes user control over introspection enablement.

### D11: Container-scoped batching (not global)

**Decision:** `batch(container, fn)` takes a container/scope as context instead of using a global flag.

**Rationale:** A global batch flag creates hidden shared state. In multi-scope applications (multi-tenant, SSR with concurrent requests), a global batch in one scope defers notifications in all scopes -- a subtle timing bug. Container-scoped batching ensures each scope's notification cycle is independent, consistent with the principle that every signal flows through the container.

**Alternatives considered:** Global `batch(() => { ... })` (simpler API). Rejected because it violates the nervous system principle of no hidden global state and causes cross-scope interference.

### D12: Trace correlation via traceId/spanId

**Decision:** `ActionHistoryEntry` and `ActionEvent` carry optional `traceId` and `spanId` fields linking to `@hex-di/tracing` spans.

**Rationale:** VISION.md's diagnostic port scenario requires cross-referencing store actions with distributed tracing spans. An AI agent querying "why did checkout fail?" needs to follow the causal chain from a store action to the resolution trace that triggered it. Without correlation IDs, the store and tracing systems are isolated knowledge silos that cannot be joined.

**Alternatives considered:** Using a separate correlation table. Rejected because it creates indirection and the data is naturally available at action dispatch time when a tracing span is active.

### D13: Derived adapter lifetime matches source lifetime

**Decision:** Derived adapters support `lifetime: "scoped"` and must use it when depending on scoped sources.

**Rationale:** A singleton derived adapter cannot correctly track scoped sources because scoped ports produce independent instances per scope. A singleton would see only the first scope's instance and miss all others. This is the same captive dependency problem that `@hex-di/graph` already prevents for regular adapters -- extending it to derived state adapters is consistent and prevents a class of correctness bugs.

### D14: Lightweight production history mode

**Decision:** Action history supports three modes (`"full"`, `"lightweight"`, `"off"`) with sampling and priority recording.

**Rationale:** VISION.md's nervous system must remain partially active in production -- a system that goes blind in production cannot diagnose production issues. Full state snapshots per action are too expensive, but action metadata (port, action, timestamp, effect status, traceId) is cheap. Lightweight mode with sampling keeps the behavioral layer alive at ~1% of the memory cost. Priority recording (`alwaysRecord`) ensures error paths are never dropped, which is what matters most for production diagnostics.

### D15: alien-signals over custom signal engine

**Decision:** Use [`alien-signals`](https://github.com/nicepkg/alien-signals) as the reactive primitive foundation rather than building a custom signal engine from scratch.

**Rationale:** Building a correct signal engine with diamond dependency solving, topological evaluation, and glitch-free propagation is a multi-week effort with subtle correctness requirements (e.g., the Stale-Clean-Check optimization, proper handling of conditional dependencies, and cycle detection in computed chains). `alien-signals` provides all of this in ~1KB gzipped with zero dependencies and best-in-class performance.

The store adds a thin adapter layer for HexDI-specific concerns (container-scoped batching, disposal integration, snapshot separation, subscriber counting) that `alien-signals` does not handle. This keeps the reactive core battle-tested while the HexDI-specific behavior is a small, auditable surface.

**Alternatives considered:**

1. **Custom signal engine from scratch.** Rejected because the correctness bar is high (TanStack Store's diamond solver took multiple iterations to get right), the maintenance burden is ongoing (new edge cases surface over time), and the performance optimization required is significant. Building from scratch would consume weeks that are better spent on store-specific features.
2. **`@preact/signals-core`.** Viable alternative with a larger community. Rejected because `alien-signals` benchmarks significantly faster, has a smaller bundle size, and its API maps more directly to the TC39 Signals proposal. `@preact/signals-core` also has global effect scheduling that conflicts with container-scoped batching.
3. **TC39 Signals polyfill (`signal-polyfill`).** Rejected because the TC39 proposal is still Stage 1, the polyfill is not production-ready, and it lacks the `batch()` primitive that `@hex-di/store` needs. When TC39 Signals reaches Stage 3+, migrating from `alien-signals` to the native API would be a minimal adapter change because both follow the same signal/computed/effect model.

**Migration path:** If `alien-signals` is abandoned or a better option emerges, the adapter layer isolates the dependency. Users interact with `StateService`/`AtomService`/`DerivedService` -- they never see raw signals. Swapping the reactive primitive requires only changes to the internal `reactivity/` directory.

### D16: Atom initial value in adapter, not port

**Decision:** `AtomPortDef` does not carry an `initial` value. The initial value is provided by `createAtomAdapter`, consistent with how `createStateAdapter` provides `initial` state.

**Rationale:** In the HexDI ecosystem, ports are purely phantom-typed tokens -- they carry type information but no runtime behavior. `StatePortDef` does not carry `initial`; `FlowPortDef` does not carry the machine definition. Having `AtomPortDef` carry `initial` would be the only exception to this rule. While atoms are simpler than state ports, architectural consistency across all port types outweighs the minor ergonomic benefit of `createAtomPort<"light" | "dark">()({ name: "Theme", initial: "light" })` over providing `initial` in the adapter.

**Alternatives considered:** `initial` on the port (original design). Rejected because it violates the "ports are phantom-typed tokens" invariant that holds for every other port type in HexDI, including `StatePortDef`, `DerivedPortDef`, `AsyncDerivedPortDef`, `LinkedDerivedPortDef`, `FlowPortDef`, and core `Port<T, TName>`.

### D17: Result-based effects over exception-based effects

**Decision:** Effects return `void | ResultAsync<void, unknown>` instead of `void | Promise<void>`. The runtime inspects the `ResultAsync` return value: `Ok` means success, `Err` means failure. Errors are wrapped in `EffectFailedError` (a tagged value with `_tag: "EffectFailed"`, `portName`, `actionName`, `cause`) before being passed to `onEffectError` or surfaced in `ActionEvent`, `ActionHistoryEntry`, and `StoreInspectorEvent`.

**Rationale:**

1. **Programming errors vs operational errors.** `DisposedStateAccessError` and `CircularDerivedDependencyError` are programming errors — they indicate bugs that must be fixed, so they remain thrown exceptions. Effect failures (API timeouts, network errors, storage quota exceeded) are operational errors — expected failure modes that consumers handle. `ResultAsync` makes this boundary explicit at the type level.
2. **Ergonomics.** `void` return for infallible synchronous effects (the common case) costs nothing. Only effects that perform I/O use `ResultAsync`, and `ResultAsync.fromPromise()` wraps existing Promise-based code with minimal ceremony.
3. **Typed error surfaces.** `EffectFailedError` with `_tag` enables exhaustive `switch` handling in `onEffectError`, meaningful error statistics in the inspector (filter by `_tag`), and structured logging without `instanceof` checks.
4. **Per-action error types are NOT tracked in `EffectMap`.** Tracking `E` per action in the `EffectMap` type would create an explosion of type parameters (`EffectMap<TState, TActions, E1, E2, ...>`) without practical benefit — `onEffectError` is a single handler for all actions, so it receives `EffectFailedError` uniformly. The original error is available via `cause`.

**Alternatives considered:**

1. `Promise<void>` with `try/catch` (original). Rejected because `unknown` catches lose all type information, forcing `instanceof` chains that are fragile and non-exhaustive.
2. Per-action typed `ResultAsync<void, E>` in `EffectMap`. Rejected because it adds excessive type complexity without matching the runtime model (single `onEffectError` handler).
3. Effect-style typed error channel (`Effect<void, E, R>`). Rejected as over-engineered for the store context — `ResultAsync` provides sufficient typed error handling without requiring an effect runtime.

### D18: AsyncDerivedSnapshot gains error type parameter

**Decision:** `AsyncDerivedSnapshot<TResult>` becomes `AsyncDerivedSnapshot<TResult, E = never>`. The error variant's `error` field is typed as `[E] extends [never] ? unknown : E`. The `E` parameter flows from `createAsyncDerivedPort<TResult, E>()` → `AsyncDerivedPortDef<TName, TResult, E>` → `AsyncDerivedService<TResult, E>` → `AsyncDerivedSnapshot<TResult, E>`.

**Rationale:**

1. **Backward compatibility.** `E` defaults to `never`, so `AsyncDerivedSnapshot<TResult>` still compiles with `error: unknown` in the error variant. Existing code is unaffected.
2. **Typed error narrowing.** When `E` is a tagged union (e.g., `NetworkError | AuthError`), consumers get exhaustive `switch` handling on `snapshot.error._tag` instead of `instanceof` chains on `unknown`.
3. **Port-to-snapshot flow.** The error type is declared once at the port level and propagates mechanically through the service and snapshot types. The adapter's `select` function returns `ResultAsync<T, E>`, ensuring the error type is consistent from declaration to consumption.
4. **Phantom type branding.** `AsyncDerivedPortDef` gains a `[__asyncDerivedErrorType]: E` phantom property branded with a unique symbol. This enables `InferAsyncDerivedErrorType<P>` to extract `E` from the port type for adapter type checking, consistent with how `[__stateType]` and `[__actionsType]` work for state ports.

**Sync derived vs async derived error asymmetry:** Synchronous derived computations throw `DerivedComputationError` (a programming error) because their `select` functions are pure computations that should never fail at runtime — a failure indicates a bug in the select logic. Async derived computations use `ResultAsync` because their `select` functions perform I/O (API calls, lazy imports) where failure is an expected operational condition, not a bug. This split is reflected in the error types: `DerivedComputationError` is a thrown exception class with `isProgrammingError = false` (a sync select that throws is unexpected but may reflect bad input data), while `AsyncDerivedSelectError` is a tagged value for the `Err` return path and `AsyncDerivedExhaustedError` (with `isProgrammingError = true`) catches the case where async `select` throws instead of returning `ResultAsync.err()`.

**Alternatives considered:**

1. Always `unknown` (original). Rejected because it forces every consumer to use `instanceof` checks and loses type information at the snapshot boundary.
2. `E` on the service only (not the port). Rejected because the port is the declaration site — `E` must flow from port to adapter to service for consistency.

---

_Previous: [10 - API Reference](./10-api-reference.md)_

---

_End of Specification_
