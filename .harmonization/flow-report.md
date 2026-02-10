# Flow Library Harmonization Report

**Library:** `@hex-di/flow` (+ `@hex-di/flow-react`, `@hex-di/flow-testing`)
**Spec Version:** 0.1.0 (Draft)
**Reviewed:** 2026-02-07
**Reviewer:** Flow Specialist

---

## 1. Consistent Patterns (Aligned with Ecosystem)

### 1.1 Port/Adapter Architecture

Flow fully embraces HexDI's hexagonal architecture. `FlowPort` is a standard `Port<FlowService, TName>`, and `FlowAdapter` is a standard `Adapter<...>` type registered in the container graph. This is consistent with:

- **Store**: `createStatePort` / `createStateAdapter`
- **Query**: `createQueryPort` / `createQueryAdapter`
- **Saga**: `createSagaPort` / `createSagaAdapter`

The `createFlowPort` / `createFlowAdapter` factories follow the same curried `createXPort<T>()(name)` pattern established across the ecosystem.

### 1.2 Result Integration

Flow uses `Result<T, E>` and `ResultAsync<T, E>` from `@hex-di/result` consistently throughout:

- `runner.send()` returns `Result<readonly EffectAny[], TransitionError>`
- `runner.sendAndExecute()` returns `ResultAsync<void, TransitionError | EffectExecutionError>`
- `runner.dispose()` returns `ResultAsync<void, DisposeError>`
- `createFlowAdapter()` returns `Result<FlowAdapter, FlowAdapterError>`
- `serializeMachineState()` returns `Result<SerializedMachineState, SerializationError>`
- `restoreMachineState()` returns `Result<MachineRunner, RestoreError>`

All error types use `_tag` discriminant per Result spec section 49 convention. This is fully consistent with the ecosystem pattern.

### 1.3 Tagged Error Unions

All Flow error types follow the `{ readonly _tag: string; ... }` discriminated union pattern:

- `EffectExecutionError` (6 variants: InvokeError, SpawnError, StopError, ResolutionError, SequenceAborted, ParallelErrors)
- `TransitionError` (4 variants: GuardThrew, ActionThrew, Disposed, QueueOverflow)
- `FlowAdapterError` (3 variants: MetadataInvalid, DuplicateActivityPort, ActivityNotFrozen)
- `SerializationError` (2 variants)
- `RestoreError` (3 variants)
- `CleanupError` (1 variant)
- `DisposeError` (1 variant)

This is consistent with how Store, Query, and Saga define their error hierarchies.

### 1.4 Tracing Integration

Flow integrates with `@hex-di/tracing` via `FlowTracingHook` using `pushSpan`/`popSpan` from the shared tracing infrastructure. Span naming follows the ecosystem convention: `flow:${machineId}/${from}->${to}` for transitions, `flow:effect:invoke:${port}.${method}` for effects. The `createFlowTracingHook` auto-wires when `TracerPort` is available in the container, matching how other libraries integrate tracing.

### 1.5 Introspection & Self-Awareness

The `FlowRegistry`, `FlowInspector`, and health event system follow the same introspection pattern as Store (`StoreInspectorAPI`) and Query (`QueryInspectorAPI`). The `FlowRegistryPort` is a scoped port, consistent with per-scope isolation. Health events (`flow-error`, `flow-degraded`, `flow-recovered`) follow the same pattern as other library health events.

### 1.6 React Integration Patterns

The React package follows the same structure as Store and Query:

- Hooks resolve ports from the container context (via `@hex-di/react`)
- `useSyncExternalStore` for concurrent mode safety
- Separate packages: `@hex-di/flow-react` mirrors `@hex-di/store-react` and `@hex-di/query-react`
- Provider component (`FlowProvider`) follows the same pattern as `StoreProvider` and `QueryClientProvider`

### 1.7 Testing Package Structure

The `@hex-di/flow-testing` package mirrors the ecosystem pattern:

- `testActivity`, `testMachine`, `testGuard`, `testTransition`, `testEffect` -- domain-specific test utilities
- `createTestEventSink`, `createTestSignal`, `createTestDeps` -- test harness factories
- Re-exports from `@hex-di/result-testing` for convenience
- `MocksFor<TRequires>` type for type-safe mocking

### 1.8 Immutability & Branded Types

Machine definitions are deeply frozen at runtime and branded with symbols (`MachineBrandSymbol`, `EventBrandSymbol`, `StateBrandSymbol`) for nominal typing. This is consistent with how the core container uses branded types for ports.

### 1.9 Lifecycle & Disposal

`FlowService.dispose()` returns `ResultAsync<void, DisposeError>`, matching the ecosystem disposal pattern. Adapter finalizers handle cleanup on scope disposal.

### 1.10 Mutation Testing Strategy

The DoD specifies mutation testing targets (80-95%) with Stryker, consistent with the quality bar set by the graph package and other libraries.

---

## 2. Inconsistencies Identified

### 2.1 `createMachine` Alias Retained Despite CLAUDE.md Rules

**Severity: Medium**

The spec defines both `defineMachine` (primary) and `createMachine` (alias), with the API reference explicitly noting `createMachine` is "preserved for backward compatibility." However, CLAUDE.md states:

> - **No backward compatibility** - Always implement the cleanest solution
> - **Delete over deprecate** - Remove unused/redundant code instead of marking it deprecated
> - **No compatibility shims** - Don't add re-exports, aliases, or wrappers for old APIs

**Recommendation:** Remove `createMachine` entirely. `defineMachine` is the sole API. If the two serve different purposes (string shorthand vs full config), rename the low-level one to something that reflects its distinct purpose rather than keeping a compatibility alias.

### 2.2 Port Factory Naming Inconsistency

**Severity: Low**

Flow uses `createFlowPort` while the Activity system uses `activityPort()()` (curried). Within Flow itself:

| Factory             | Pattern                     |
| ------------------- | --------------------------- |
| `createFlowPort`    | `createXPort` prefix        |
| `activityPort`      | No `create` prefix, curried |
| `createFlowAdapter` | `createXAdapter` prefix     |

The Store spec uses `createStatePort`, `createAtomPort`, `createDerivedPort` -- all with the `create` prefix. Query uses `createQueryPort`, `createMutationPort`.

**Recommendation:** Rename `activityPort` to `createActivityPort` for consistency, or adopt the curried-without-prefix pattern ecosystem-wide. The appendix (15-appendices.md, Appendix D) already mentions deprecating `createActivityPort` in favor of `activityPort()()`, so the direction is toward the shorter form -- but this should be an explicit ecosystem-wide decision, not a Flow-specific deviation.

### 2.3 `MissingMockError` Uses Class-Based Error

**Severity: Medium**

The testing package defines `MissingMockError extends Error` as a class, while the entire ecosystem has moved to tagged union error types (`{ _tag: string; ... }`). Every other error in the Flow spec uses the tagged union pattern.

**Recommendation:** Replace with `{ readonly _tag: 'MissingMock'; readonly portName: string }` and return it as `Err(...)` from `createTestDeps` rather than throwing.

### 2.4 Dual Machine Definition API Surface

**Severity: Medium**

Both `defineMachine` and `createMachine` are exported with different input constraints (string shorthand vs full config, optional vs required `initial`). This creates ambiguity about which to use and doubles the documentation surface.

**Recommendation:** Per section 2.1, remove the alias. If both input formats are needed, have `defineMachine` accept both and normalize internally (which it already does for string shorthands).

### 2.5 `FlowEventBus` Lacks Result Integration

**Severity: Low**

`FlowEventBus.emit(event)` returns `void`. Other ecosystem APIs that perform operations return `Result`. While event emission is fire-and-forget by nature, the `subscribe` callback also lacks error handling.

**Recommendation:** Consider if `emit` should remain void (acceptable for in-process event dispatch) or if subscriber errors should be captured. This is a minor point -- keeping `void` is reasonable for a synchronous mediator.

### 2.6 `ActivityStatus` vs Query State Naming

**Severity: Low**

Flow's `ActivityStatus` uses: `"pending" | "running" | "completed" | "failed" | "cancelled"`.
Query's lifecycle uses: `"idle" | "loading" | "success" | "error" | "stale"`.

While the domains are different (long-running process vs data fetch), the inconsistency in terminology (`completed` vs `success`, `failed` vs `error`) may cause cognitive overhead for developers using both.

**Recommendation:** Document the domain-specific terminology choices but do not force alignment -- the semantics genuinely differ between activity lifecycle and query lifecycle.

---

## 3. Missing Integration Points

### 3.1 No `@hex-di/result` Dependency in Package Dependencies

**Severity: High**

The Flow spec lists dependencies as `@hex-di/core`, `@hex-di/runtime` in section 3.3 (Peer Dependencies), but `@hex-di/result` is not listed despite being used pervasively throughout the API surface. Every `Result<T, E>` and `ResultAsync<T, E>` return type requires it.

Compare with the Store spec which explicitly lists `@hex-di/result` as a dependency, and the Query spec which lists it as a dependency and even has it in its package table.

**Recommendation:** Add `@hex-di/result` to the Flow core package dependencies. Add `@hex-di/result-testing` to `@hex-di/flow-testing` dependencies.

### 3.2 Missing `@hex-di/tracing` Dependency

**Severity: Medium**

The Flow spec references `@hex-di/tracing` for `Tracer`, `pushSpan`/`popSpan`, and `FlowTracingHook` integration, and the dependency graph (section 3.1) shows `@hex-di/tracing` as a dependency. However, it is not listed in the peer dependencies table (section 3.3).

**Recommendation:** Add `@hex-di/tracing` to the dependencies table for `@hex-di/flow`.

### 3.3 Store Integration Pattern Incomplete

**Severity: Medium**

The advanced patterns spec (13-advanced.md) describes `syncWithStore(storePort, selector, eventType)` for bidirectional context sync between Flow and Store. However:

- The helper is described conceptually but not present in the API reference (14-api-reference.md)
- No types are defined for `syncWithStore` in the consolidated type signatures
- No testing pattern is provided for store-flow sync scenarios

**Recommendation:** Either add `syncWithStore` to the API reference with full type signatures, or explicitly mark it as a pattern guide (not an API) and provide a cookbook example instead of a missing export.

### 3.4 Query Integration Pattern Incomplete

**Severity: Medium**

Similar to Store integration, the Query integration pattern (`Effect.invoke(QueryPort, 'fetch', [queryKey])`) is described conceptually in 13-advanced.md but:

- No helper function is provided to bridge Query cache state into machine context
- The `getCache` method referenced on the Query port is not defined in the Query spec
- No testing pattern for query-flow integration scenarios

**Recommendation:** Define the integration boundary explicitly. Either provide `createQueryEffect(queryPort, key)` as a helper that wraps `Effect.invoke`, or document that raw `Effect.invoke` is the intended integration mechanism and provide cookbook examples.

### 3.5 Saga Integration Needs Bidirectional Spec Alignment

**Severity: High**

The Flow spec (13-advanced.md) describes invoking a SagaPort from a Flow machine:

```
Effect.invoke(SagaPort, 'execute', [sagaDefinition])
```

The Saga spec (section 15 - Flow Integration in 10-integration.md) also describes this integration from the Saga side. However:

- The compensation event routing pattern (saga -> flow machine for UI feedback) needs explicit type-level specification
- The `SagaPort` interface's `execute` method must accept saga definitions and return `ResultAsync` compatible with Flow's effect execution
- Neither spec defines the shared event types for saga progress/compensation feedback

**Recommendation:** Create a shared integration contract type between Flow and Saga. Define `SagaProgressEvent` and `SagaCompensationEvent` types that both specs reference. Ensure the `SagaPort.execute()` return type is `ResultAsync<SagaResult, SagaError>` compatible with Flow's `EffectExecutionError.InvokeError` wrapping.

### 3.6 No DirectedPort Usage

**Severity: Low**

The Store spec uses `DirectedPort<StateService, TName, "outbound">` and Query uses `DirectedPort<QueryFetcher, TName, "inbound">` to indicate port directionality. The Flow spec uses plain `Port<FlowService, TName>` for `FlowPort`.

While a FlowPort doesn't have a natural "inbound" or "outbound" direction (it's bidirectional -- you send events and read state), the absence should be noted as a conscious decision, not an oversight.

**Recommendation:** Document that `FlowPort` intentionally uses undirected `Port` because flow services are bidirectional (send events in, read state out). This should be noted in the ports-and-adapters section.

### 3.7 Missing Container Extension Pattern

**Severity: Low**

The Query spec defines `QueryClient` as a container extension (`QueryClient as Container Extension`, section 44). The Flow spec does not describe any container extension pattern -- all functionality is accessed through standard port resolution.

This is not necessarily a problem (port resolution is the preferred pattern), but the absence of discussion about whether a `FlowClient` container extension would be useful (e.g., for cross-machine coordination, global event dispatch) is notable.

**Recommendation:** Add a brief note in the ports-and-adapters section explaining that Flow intentionally does not use a container extension and why port-based resolution is sufficient.

---

## 4. State Machine Definition & Runner Patterns

### 4.1 Pure Interpreter Design

The `transition()` function as a pure function `(machine, snapshot, event) => TransitionResult` is a strong design. It enables:

- Unit testing transitions without runtime infrastructure
- Deterministic replay
- Effect inspection before execution

This pattern has no equivalent in Store, Query, or Saga (they don't need one), but it is well-designed for Flow's domain.

### 4.2 Effects-as-Data

The effect descriptor pattern (`{ _tag: "Invoke", port, method, args }`) is Flow's primary innovation. It cleanly separates the "what" (effect descriptor) from the "how" (executor). This maps well to the hexagonal architecture principle -- effects reference ports, executors resolve them.

### 4.3 Activity System

The `ActivityPort` extending `Port` is a good design that reuses all DI infrastructure. Activities declare `requires` (port dependencies), `emits` (typed events), and have lifecycle management (`AbortSignal`, cleanup, timeouts). This is consistent with how other libraries use ports.

### 4.4 Runner History Buffers

The runner supports optional history buffers (disabled by default for zero overhead). This is a performance-conscious design that avoids the overhead of recording history when not needed, while supporting debugging when enabled.

---

## 5. Concrete Recommendations

### Priority 1 (Must Fix Before Implementation)

1. **Add `@hex-di/result` to Flow dependencies** (section 3.3) -- Without this, the package cannot compile.

2. **Add `@hex-di/tracing` to Flow dependencies** (section 3.3) -- Required for `FlowTracingHook`.

3. **Remove `createMachine` alias** -- Per CLAUDE.md rules, no backward compatibility shims. `defineMachine` is the sole API.

4. **Define Flow-Saga integration contract types** -- Both specs reference the integration but neither defines the shared types. Create `SagaProgressEvent`, `SagaCompensationEvent`, and ensure `SagaPort.execute()` return type is compatible.

### Priority 2 (Should Fix)

5. **Replace `MissingMockError` class with tagged union** -- `{ readonly _tag: 'MissingMock'; readonly portName: string }` returned as `Err(...)`.

6. **Add `syncWithStore` to API reference or mark as cookbook pattern** -- Currently described in advanced patterns but missing from the API surface.

7. **Add `createQueryEffect` helper or document raw `Effect.invoke` as the integration path** for Query integration.

8. **Resolve `activityPort` vs `createActivityPort` naming** -- Make an ecosystem-wide decision on the port factory naming convention (curried-no-prefix vs create-prefix).

### Priority 3 (Nice to Have)

9. **Document `FlowPort` as intentionally undirected** -- Note the conscious decision to use `Port` instead of `DirectedPort`.

10. **Document why no container extension** -- Explain that FlowService is accessed via standard port resolution, not a container extension.

11. **Add `sendBatch` to `FlowService` interface** -- The runner supports `sendBatch`, but the `FlowService` interface (the DI-resolved service) does not expose it. If batch processing is a supported use case, it should be accessible through the port.

12. **Align `Appendix D: Migration`** -- The appendix mentions `createActivityPort` being deprecated in favor of `activityPort()()`, but per CLAUDE.md, there should be no deprecation path -- just remove the old API.

---

## 6. Cross-Library Integration Matrix

| Integration      | Flow Spec Status                          | Other Library Spec Status                 | Gap                                        |
| ---------------- | ----------------------------------------- | ----------------------------------------- | ------------------------------------------ |
| Flow <-> Result  | Fully specified                           | Result section 53 covers container errors | Missing: Result dependency not listed      |
| Flow <-> Store   | Pattern described (13-advanced.md)        | Store has no Flow section                 | Missing: No `syncWithStore` in API ref     |
| Flow <-> Query   | Pattern described (13-advanced.md)        | Query has no Flow section                 | Missing: No helper, no `getCache` in Query |
| Flow <-> Saga    | Pattern described (13-advanced.md)        | Saga section 15 covers Flow               | Gap: Shared event types undefined          |
| Flow <-> Tracing | Fully specified (12-introspection.md)     | Tracing provides pushSpan/popSpan         | Missing: Dependency not listed             |
| Flow <-> Core    | Fully specified (port/adapter)            | Core provides Port, Adapter, Container    | Aligned                                    |
| Flow <-> React   | Fully specified (10-react-integration.md) | React provides usePort, ScopeProvider     | Aligned                                    |

---

## 7. Summary

The Flow spec is the most comprehensive in the ecosystem, with 16 spec files covering machine definitions, effects, activities, runners, React integration, testing, introspection, and advanced patterns. It demonstrates strong alignment with HexDI conventions in most areas.

**Key strengths:**

- Deep Result integration with typed error unions throughout
- Effects-as-data pattern cleanly separates concerns
- Activity system reuses DI infrastructure
- Comprehensive testing utilities
- Thorough mutation testing strategy

**Key gaps:**

- Missing dependency declarations (`@hex-di/result`, `@hex-di/tracing`)
- Backward compatibility shim (`createMachine` alias) violates project rules
- Cross-library integration types (especially Flow-Saga) need explicit shared contracts
- Store and Query integration helpers are conceptual but not in the API surface

Overall harmonization score: **7.5/10** -- Strong foundation with specific gaps in dependency declarations and cross-library integration contracts that need resolution before implementation.
