# Store Library Harmonization Report

**Spec reviewed:** `@hex-di/store` (spec/store/, sections 01-11)
**Cross-references:** Result, Query, Saga, Flow spec READMEs
**Date:** 2026-02-07

---

## 1. Consistent Patterns (Strengths)

### 1.1 Port/Adapter Architecture

The Store spec faithfully follows HexDI's hexagonal architecture. State ports extend `DirectedPort<TService, TName, "outbound">` and state adapters extend `Adapter<TProvides, TRequires, TLifetime, TInit>`. This is identical to how `@hex-di/flow` treats `FlowPort`/`FlowAdapter`, and consistent with `@hex-di/query`'s `QueryPort`/`QueryAdapter`.

- Ports are purely phantom-typed tokens carrying no runtime behavior.
- Adapters provide implementations (initial state, reducers, effects, dependencies).
- Registration uses `GraphBuilder.provide()`.
- Resolution uses `container.resolve()`.

### 1.2 Curried Port Factory Pattern

All port factories (`createStatePort`, `createAtomPort`, `createDerivedPort`, `createAsyncDerivedPort`, `createLinkedDerivedPort`) use the same curried form `createXxxPort<TypeParams>()(config)` to separate explicit type parameters from inferred name literals. This is consistent with `@hex-di/flow`'s `createFlowPort` and `@hex-di/query`'s `createQueryPort`.

### 1.3 Branded Phantom Types for Port Definitions

Store uses unique symbol branding (`[__stateType]`, `[__actionsType]`, `[__atomType]`, `[__asyncDerivedErrorType]`) on port definitions to prevent accidental structural matching and enable type inference utilities (`InferStateType`, `InferActionsType`, etc.). This follows the same branding pattern as Flow's `FlowPortDef`.

### 1.4 Container Lifecycle Integration

State lifecycle (mount, unmount, disposal) is fully managed by Container. There is no separate Store runtime. This eliminates the two-runtime synchronization problem and is architecturally consistent with how `@hex-di/flow` machines and `@hex-di/query` queries participate in Container lifecycle.

### 1.5 Scoping Model

Scoped state uses Container scopes (`container.createScope()`). The captive dependency rules (singleton cannot depend on scoped) are enforced at compile time, consistent with `@hex-di/graph`'s existing captive dependency detection. This extends naturally to derived adapters.

### 1.6 Result Integration for Error Handling

Effects return `void | ResultAsync<void, unknown>` from `@hex-di/result`. Async derived adapters return `ResultAsync<T, E>`. This follows the Result spec's philosophy of "errors are values, not exceptions" and clearly separates:

- Programming errors (thrown exceptions: `DisposedStateAccessError`, `CircularDerivedDependencyError`)
- Operational errors (Result values: `EffectFailedError`, `AsyncDerivedSelectError`, `HydrationError`)

The tagged error pattern (`_tag: "EffectFailed"`) is consistent with Result spec's `Tagged Error Unions` (Section 49).

### 1.7 Introspection Pattern

`StoreInspectorAPI` follows the same pattern as Container's `InspectorAPI`:

- Pull-based queries (`getSnapshot()`, `getPortState()`, `getActionHistory()`)
- Push-based subscriptions (`subscribe(listener)`)
- Frozen discriminated union snapshots (`PortSnapshot` by `kind`)
- Explicit registration via `createStoreInspectorAdapter()`

This is the same pattern that `@hex-di/query` uses with its `QueryInspectorAPI`.

### 1.8 Tracing Integration

Trace correlation via `traceId`/`spanId` on `ActionHistoryEntry` and `ActionEvent` enables cross-referencing with `@hex-di/tracing` spans. This is consistent with how Query's `FetchHistoryEntry` also carries trace correlation IDs.

### 1.9 React Integration

Store hooks resolve from `HexDiContainerProvider` (no separate provider). Scoped state uses `HexDiAutoScopeProvider` from `@hex-di/react`. This is consistent with how `@hex-di/query-react` hooks also resolve from the same provider hierarchy.

### 1.10 Testing Package Structure

`@hex-di/store-testing` follows the same pattern as `@hex-di/result-testing` and `@hex-di/query-testing`:

- Test container factories (`createStateTestContainer`)
- Mock adapters (`createMockStateAdapter`, `createMockAtomAdapter`)
- Fluent assertion helpers (`expectState`, `expectAtom`, `expectDerived`, `expectAsyncDerived`)
- Scope-isolated testing patterns

---

## 2. Inconsistencies

### 2.1 Port Direction Inconsistency: State Ports vs Effect Ports

**Issue:** State ports use `direction: "outbound"` (they provide state to consumers), while effect ports use `direction: "inbound"` (they receive action events). This is semantically correct for hexagonal architecture, but the Query spec uses `direction: "inbound"` for query ports (they fetch data from external sources). The directional semantics differ:

- Store state ports: `"outbound"` -- provides reactive state to the application
- Store effect ports: `"inbound"` -- receives action events from the state system
- Query ports: `"inbound"` -- fetches data from external sources

**Assessment:** This is actually correct hexagonal architecture (outbound = application provides to infrastructure, inbound = infrastructure provides to application). However, state ports being "outbound" while they are consumed by the application (not by infrastructure) may confuse users. The reasoning is that state "flows outward" to consumers. This could benefit from clearer documentation about the directional semantics in the context of state management.

### 2.2 Error Code Range Allocation Undocumented at Ecosystem Level

**Issue:** Store uses `HEX030-039`. Core uses `HEX001-025`. There is no centralized error code registry across the ecosystem. If Query, Saga, or Flow also define error codes, collisions are possible.

**Recommendation:** Create a shared error code registry document (or a section in each spec's README) that reserves ranges:

- `HEX001-025`: Core/Runtime/Graph
- `HEX030-039`: Store
- `HEX040-049`: Query
- `HEX050-059`: Saga
- `HEX060-069`: Flow
- `HEX070-079`: Result

### 2.3 Adapter Factory Naming: `createEffectAdapter` vs Other Ecosystem Factories

**Issue:** The Store spec introduces `createEffectAdapter` as a factory that wraps `createAdapter` with branding. This is analogous to how `@hex-di/flow` might have `createFlowAdapter` wrapping `createAdapter`. However, the name `createEffectAdapter` could collide conceptually with side-effect handling in other libraries. Within the Store spec, "effect" means two things:

1. Adapter-level effects (`effects` field in `createStateAdapter`) -- side effects after reducers
2. Effect ports/adapters (`createEffectAdapter`) -- DI-managed cross-cutting observers

**Recommendation:** The dual meaning is documented in the spec (Section 8 clarifies "reactive effect" vs "DI effect"), but a naming audit across the ecosystem would help. Consider whether `createActionObserverAdapter` would be clearer than `createEffectAdapter`, or accept the dual meaning with prominent documentation.

### 2.4 `DerivedDeps` vs `ResolvedDeps` -- Unnecessary Type Alias

**Issue:** The Store spec defines `DerivedDeps<TRequires>` as a local alias that is semantically equivalent to `ResolvedDeps<TupleToUnion<TRequires>>` from `@hex-di/core`. The spec acknowledges this: "DerivedDeps uses the same underlying type mapping as ResolvedDeps."

**Recommendation:** While the alias adds readability for derived adapter context, it adds a type to the API surface that users must learn is identical to the core type. Consider either:

- Dropping `DerivedDeps` and using `ResolvedDeps` directly (consistent with how `createStateAdapter`'s `effects` callback uses `ResolvedDeps`), or
- Documenting the equivalence more prominently

### 2.5 Section Numbering Gaps

**Issue:** The spec has numbering gaps (e.g., section 12 is missing between 11a and 13; section 16 is missing between 15a and 17; section 38 is missing between 37 and 39). While these may be intentional reserves for future content, they create confusion in the ToC.

**Recommendation:** Either fill gaps or use sub-numbering (e.g., 15a, 15b) consistently.

---

## 3. Missing Integration Points

### 3.1 Store + Query Integration

**Gap:** The Store and Query specs both manage application data but their integration is not specified. Common patterns need explicit guidance:

- **Cache-to-store synchronization:** When a `useQuery` hook fetches data, how does that data flow into a Store state port? Is there a pattern for `createStateAdapter` effects that observe query cache changes?
- **Mutation-to-state coordination:** When a `useMutation` succeeds, how should store state be updated? Through query invalidation only, or through direct state port action dispatch?
- **Optimistic update coordination:** Both Store (Section 39) and Query (Section 25) define optimistic update patterns independently. A unified pattern for coordinating store-level optimistic state with query cache optimistic updates is missing.

**Recommendation:** Add a cross-library integration section or appendix showing:

```
Query fetch success --> Store action dispatch (via effect port)
Store action dispatch --> Query invalidation (via effect port)
Mutation success --> Store state update + Query cache invalidation
```

### 3.2 Store + Flow Integration

**Gap:** The Store spec acknowledges Flow for state machines (Section D6) but does not specify how Store state ports interact with Flow machine instances. Common scenarios:

- A Flow machine transition triggers a Store action (e.g., checkout machine completing updates order state)
- Store state changes trigger Flow machine events (e.g., cart becoming empty triggers checkout machine reset)
- Flow machine context and Store state coexisting for the same domain concept

**Recommendation:** Add integration guidance for Flow-Store coordination, likely through effect ports that observe both systems. The Flow spec should reciprocally reference Store integration.

### 3.3 Store + Saga Integration

**Gap:** Saga orchestrates multi-step async workflows. Store manages state. The interaction is not specified:

- How does a Saga step read current Store state?
- How does a Saga step dispatch Store actions?
- How does a Saga compensation undo Store state changes?
- Does Saga use `@hex-di/result` the same way Store does for its step errors?

**Recommendation:** The Saga spec mentions "Flow Integration" (Section 15) but not Store Integration. Add a Store integration section to Saga spec, and a Saga integration mention to the Store spec's advanced patterns.

### 3.4 Missing `useSelector`-style Hook for Cross-Port Derived State in React

**Gap:** The current React hooks each target a single port. There is no hook for ad-hoc cross-port selectors that don't warrant a full `DerivedPort` + `DerivedAdapter` registration:

```typescript
// Missing pattern: ad-hoc selector across multiple ports
const canCheckout = useCombinedSelector(
  [AuthPort, CartPort],
  (auth, cart) => auth.state.status === "authenticated" && cart.state.items.length > 0
);
```

**Assessment:** This may be intentional -- the spec philosophy is "derived state lives in the graph." But the ceremony of creating a port + adapter for simple cross-port selectors in components is high. Consider whether a `useCombinedSelector` hook would reduce boilerplate for simple cases.

### 3.5 No Store + Result Error Composition Pattern

**Gap:** While Store correctly uses `ResultAsync` for effects and async derived, there is no documented pattern for composing Store errors with Result's combinators. For example:

```typescript
// How does a consumer combine multiple store operations with Result?
const result = await safeTry(async function* () {
  const order = yield* createOrder(cart).safeUnwrap();
  const payment = yield* processPayment(order).safeUnwrap();
  return { order, payment };
});
```

**Recommendation:** Add examples showing how Store effects interoperate with Result's `safeTry` generator pattern and `Result.all` combinators.

---

## 4. Concrete Recommendations

### R1: Establish Ecosystem-Wide Error Code Registry

Create `/spec/ERROR_CODES.md` reserving code ranges per library. This prevents collision as more libraries are added.

### R2: Add Cross-Library Integration Appendix to Store Spec

Add a new appendix (or expand Section 09) with concrete integration patterns for:

- Store + Query (cache sync, mutation coordination)
- Store + Flow (machine-state bidirectional events)
- Store + Saga (workflow step to state action mapping)

### R3: Harmonize Async Derived with Query

Store's `AsyncDerivedPort` and Query's `QueryPort` solve overlapping problems (async data fetching with loading/error/success states). Clarify when to use which:

| Use `createAsyncDerivedPort` when...                        | Use `createQueryPort` when...            |
| ----------------------------------------------------------- | ---------------------------------------- |
| Derived from local state (transformation of existing state) | Fetching from external API               |
| No caching needed beyond signal memoization                 | Need stale-while-revalidate, GC, dedup   |
| Computation is deterministic given inputs                   | Response varies over time (polling, SSE) |
| No retry/refresh beyond basic retry config                  | Full retry/backoff/cancellation needed   |

### R4: Validate `ResultAsync` Usage Consistency Across Specs

Ensure all specs use `ResultAsync` from `@hex-di/result` for async fallible operations:

- Store effects: `ResultAsync<void, unknown>` -- correct
- Store async derived `select`: `ResultAsync<T, E>` -- correct
- Query adapter fetch: needs verification against Query spec
- Saga step execution: needs verification against Saga spec
- Flow effect execution: needs verification against Flow spec

### R5: Align Testing Package Patterns

Store's `createStateTestContainer` should follow the same pattern as Query's test container factory and Flow's test harness. Verify all testing packages export:

- Test container/harness factory
- Mock adapter factories
- Fluent assertion helpers
- Scope-isolated test patterns
- Action/event recorder utilities

### R6: Document MCP Resource URI Namespace Convention

Store defines `hexdi://store/*` URIs. Query likely defines `hexdi://query/*`. Establish a namespace convention document to prevent URI collision and enable unified MCP resource discovery.

### R7: Clarify `batch()` Interaction with Query Client

The Store spec defines `batch(container, fn)` for grouping state changes. If a batch callback also triggers query invalidation (via effect ports), clarify whether query refetches are also deferred until the batch completes, or whether they fire immediately.

### R8: Consider `expectAsyncDerived` Alignment with Query's `expectQuery`

Both Store and Query have async state with loading/error/success patterns. Align the assertion API shapes:

- Store: `expectAsyncDerived(container, port).toBeSuccess(value)`
- Query: likely has `expectQuery(container, port).toHaveData(value)`

Consistent assertion verb choices (`toBeSuccess` vs `toHaveData`) reduce cognitive load.

---

## 5. Pattern Compliance Summary

| Pattern                     | Store Compliance | Notes                                  |
| --------------------------- | :--------------: | -------------------------------------- |
| Ports extend `DirectedPort` |       Yes        | All state/atom/derived ports           |
| Adapters extend `Adapter`   |       Yes        | All state/atom/derived/effect adapters |
| Curried factory pattern     |       Yes        | All `create*Port` factories            |
| Phantom type branding       |       Yes        | Unique symbols for type inference      |
| Container lifecycle         |       Yes        | No separate runtime                    |
| Scope isolation             |       Yes        | Captive dependency rules enforced      |
| Result-based errors         |       Yes        | Effects, async derived, hydration      |
| InspectorAPI pattern        |       Yes        | `StoreInspectorAPI`                    |
| Tracing integration         |       Yes        | `traceId`/`spanId` correlation         |
| React provider reuse        |       Yes        | `HexDiContainerProvider`               |
| Testing package             |       Yes        | Matches ecosystem conventions          |
| MCP resource readiness      |       Yes        | Serializable snapshots                 |
| No backward compat shims    |       Yes        | Clean API surface                      |

---

## 6. Overall Assessment

The Store spec is well-harmonized with the HexDI ecosystem. It faithfully extends the core port/adapter architecture into reactive state management without introducing parallel runtime concepts. The signal-based reactivity model (via `alien-signals`) is a sound technical choice that enables diamond solving and glitch-free batching.

The primary harmonization gaps are in cross-library integration documentation -- specifically how Store interacts with Query, Saga, and Flow at runtime. These gaps do not indicate architectural misalignment; they indicate missing documentation for patterns that the architecture naturally supports through effect ports and Container's dependency graph.

The secondary gap is the absence of ecosystem-wide coordination artifacts (error code registry, MCP URI namespace, assertion API conventions) that will become important as more libraries ship.
