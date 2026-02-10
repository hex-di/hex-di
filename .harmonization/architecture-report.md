# Hexagonal Architecture Compliance Report

**Reviewer:** Architecture Specialist
**Date:** 2026-02-07
**Scope:** All HexDI ecosystem specs and core implementation
**Sources:** 8 harmonization reports, 6 spec suites (Result, Store, Query, Saga, Flow, Tracing), core/graph/runtime source code

---

## 1. Compliance Matrix

Each library is evaluated against the seven principles of hexagonal architecture as applied to HexDI.

| Principle                            | Core | Graph | Runtime | Result | Store | Query | Saga | Flow | Tracing |
| ------------------------------------ | :--: | :---: | :-----: | :----: | :---: | :---: | :--: | :--: | :-----: |
| 1. Port/Adapter Separation           | PASS | PASS  |  PASS   |  PASS  | PASS  | PASS  | PASS | PASS |  PASS   |
| 2. Dependency Direction              | PASS | PASS  |  PASS   |  PASS  | PASS  | WARN  | PASS | WARN |  PASS   |
| 3. Domain Isolation                  | PASS | PASS  |  PASS   |  PASS  | PASS  | PASS  | PASS | PASS |  PASS   |
| 4. Framework Agnosticism             | PASS | PASS  |  PASS   |  PASS  | PASS  | PASS  | PASS | PASS |  PASS   |
| 5. Testability via Port Substitution | PASS | PASS  |  PASS   |  PASS  | PASS  | PASS  | PASS | PASS |  PASS   |
| 6. Cross-Cutting via Ports           | PASS | PASS  |  WARN   |  WARN  | PASS  | PASS  | WARN | PASS |  PASS   |
| 7. Naming Consistency                | PASS | PASS  |  PASS   |  WARN  | PASS  | PASS  | WARN | WARN |  PASS   |
| 8. Inter-Library Port Composition    | PASS | PASS  |  PASS   |  WARN  | WARN  | WARN  | WARN | WARN |  PASS   |

**Legend:** PASS = fully compliant, WARN = minor violation or gap, FAIL = significant violation

---

## 2. Principle-by-Principle Analysis

### 2.1 Port/Adapter Separation

**Verdict: PASS across all libraries.**

The ecosystem demonstrates exemplary port/adapter separation. The foundational types are clean:

- **Port** (`packages/core/src/ports/types.ts:76-88`): Branded phantom type with `__brand` and `__portName`. Zero runtime behavior -- purely a compile-time token.
- **DirectedPort** (`packages/core/src/ports/types.ts:301-307`): Extends Port with `inbound`/`outbound` direction and metadata. Structurally compatible with base Port.
- **Adapter** (`packages/core/src/adapters/types.ts:147-219`): Captures the full contract: `provides` (port), `requires` (dependencies), `lifetime`, `factory`, `clonable`, `finalizer`.

Every ecosystem library faithfully extends these base types:

| Library | Port Type                                                                                                           | Adapter Type                                                                             | Separation Clean? |
| ------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | :---------------: |
| Store   | `StatePortDef<TName, TState, TActions>` extends `DirectedPort<StateService, TName, "outbound">` with phantom brands | `Adapter<TPort, TRequires, "singleton" \| "scoped", "sync">`                             |        Yes        |
| Query   | `QueryPort<TName, TData, TParams, TError>` extends `DirectedPort<QueryFetcher, TName, "inbound">`                   | `Adapter<QueryPort, TRequires, Lifetime, "async">`                                       |        Yes        |
| Saga    | `SagaPort<TName, TInput, TOutput, TError>` extends `Port<SagaExecutor, TName>` with `SagaPortSymbol` brand          | `SagaAdapter<P>` extends `Adapter<P, TRequires, TLifetime, "sync">`                      |        Yes        |
| Flow    | `FlowPort` = `Port<FlowService<TState, TEvent, TContext>, TName>` via `port()` factory                              | `FlowAdapter` = standard `Adapter<...>`                                                  |        Yes        |
| Tracing | `TracerPort`, `SpanExporterPort`, `SpanProcessorPort` via `createPort<T>(name)`                                     | `NoOpTracerAdapter`, `MemoryTracerAdapter`, `ConsoleTracerAdapter` via `createAdapter()` |        Yes        |

**Strength:** No library conflates port (interface contract) with adapter (implementation). The port carries no runtime behavior; the adapter carries all implementation details. The `GraphBuilder.provide()` registration mechanism ensures adapters are always bound to ports through the DI graph, never through direct instantiation.

### 2.2 Dependency Direction (Inward Only)

**Verdict: PASS with 2 warnings.**

The dependency rule states that dependencies must point inward: infrastructure depends on domain, never the reverse.

**Compliant:**

- Core defines ports and adapters with no knowledge of Store/Query/Saga/Flow
- Store/Query/Saga/Flow depend on Core types (`Port`, `Adapter`, `ResolvedDeps`, `Lifetime`), never the reverse
- Result is zero-dependency and all libraries depend on it, not vice versa
- Tracing defines ports in its own package; backend adapters (OTEL, Jaeger) are separate packages depending on the tracing core

**Warnings:**

**W1: Query `dependsOn` creates port-level data dependencies not reflected in the adapter graph.**

- Location: `spec/query/03-query-ports.md` (section on `dependsOn`)
- The `dependsOn` field on `QueryPort` declares structural data dependencies between query ports. These are port-level metadata, not translated into the adapter's `requires` array. This means the GraphBuilder cannot detect circular dependencies or captive dependency violations in `dependsOn` chains.
- **Impact:** Graph validation is incomplete for query dependency chains. The dependency direction is correct (queries depend on other queries), but the dependency is invisible to the graph validator.
- **Recommendation:** `createQueryAdapter()` should translate `dependsOn` references into the adapter's `requires` array, making all dependencies explicit in the graph.

**W2: Flow's `Effect.invoke` references ports at runtime, creating implicit dependencies.**

- Location: `spec/flow/05-effects.md` (Invoke effect descriptor)
- The `Invoke` effect descriptor references a port by value (`{ _tag: "Invoke", port, method, args }`). This is an implicit dependency that is not part of the adapter's `requires` declaration. The `createFlowAdapter` spec addresses this by requiring all effect-referenced ports to be declared in `requires`, but this is an API-level constraint, not a type-level enforcement.
- **Impact:** If a developer forgets to include a port in `requires` that is used in an `Invoke` effect, the error surfaces at runtime (resolution failure), not at compile time.
- **Recommendation:** Consider a type-level utility that extracts port references from effect descriptors and validates they are a subset of the adapter's `requires`.

### 2.3 Domain Isolation

**Verdict: PASS across all libraries.**

Business rules are isolated from infrastructure in every library:

- **Store:** Reducers (pure functions on state) have no knowledge of HTTP, databases, or React. Effects (side-effect handlers) are declared separately and receive dependencies through the DI graph.
- **Query:** The `QueryFetcher<TData, TParams, TError>` type is a pure function `(params, context) => ResultAsync<TData, TError>`. The fetcher knows nothing about HTTP clients, GraphQL, or caching -- those are adapter concerns. The `FetchContext` explicitly removed the `QueryClient` reference (design note in `spec/query/05-query-adapters.md:176-181`) to maintain this isolation.
- **Saga:** Step definitions are declarative (`defineStep(name).io<I,O,E>().invoke(fn).compensate(fn).build()`). The invocation function receives resolved dependencies, not infrastructure directly.
- **Flow:** Machine definitions are pure data (states, transitions, guards). Effects are descriptors (`{ _tag: "Invoke", ... }`) that reference ports, not implementations. The `DIEffectExecutor` resolves ports from the container, keeping the machine definition infrastructure-free.
- **Tracing:** Tracing is entirely port-based. The `TracerPort` interface is domain-neutral. Backend implementations (OTEL, Jaeger, etc.) are separate packages.

**Strength:** The ecosystem's "effects-as-data" pattern (used by Flow for effect descriptors, by Store for effect maps, and by Saga for step definitions) is a particularly strong domain isolation mechanism. It ensures business logic declares _what_ should happen, while the DI-resolved executors determine _how_.

### 2.4 Framework Agnosticism

**Verdict: PASS across all libraries.**

All libraries properly isolate framework-specific code:

| Library | Core Package                       | React Package                  | Other Framework Packages  |
| ------- | ---------------------------------- | ------------------------------ | ------------------------- |
| Store   | `@hex-di/store` (framework-free)   | `@hex-di/store-react`          | None specified            |
| Query   | `@hex-di/query` (framework-free)   | `@hex-di/query-react`          | None specified            |
| Saga    | `@hex-di/saga` (framework-free)    | `@hex-di/saga-react`           | None specified            |
| Flow    | `@hex-di/flow` (framework-free)    | `@hex-di/flow-react`           | None specified            |
| Tracing | `@hex-di/tracing` (framework-free) | React hooks in tracing package | Hono middleware specified |

**Strength:** React integrations are consistently separated into `-react` suffix packages. All React hooks resolve ports from `HexDiContainerProvider` (provided by `@hex-di/react`), not from library-specific providers. This means switching from React to another framework requires only replacing the `-react` packages.

**Minor observation:** The tracing spec defines React hooks (`useTracer`, `useSpan`, `useTracedCallback`) and a `TracingProvider` component directly in the tracing spec, not in a separate `@hex-di/tracing-react` package. Similarly, the Hono middleware is specified in the main tracing spec. These should be separated into `@hex-di/tracing-react` and `@hex-di/tracing-hono` for consistency with the rest of the ecosystem.

### 2.5 Testability via Port Substitution

**Verdict: PASS across all libraries.**

Every library supports testing through port substitution, which is the hallmark of hexagonal architecture testability:

| Library | Test Strategy                    | Mock Factories                                                                 | Test Harness                                         |
| ------- | -------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Store   | Swap adapters in test graph      | `createMockStateAdapter`, `createMockAtomAdapter`                              | `createStateTestContainer`                           |
| Query   | Swap adapters in test graph      | `createMockQueryAdapter`, `createSpyQueryAdapter`, `createMockMutationAdapter` | `createQueryTestContainer`, `createQueryTestWrapper` |
| Saga    | Swap step adapters in test graph | Step-level mocking via adapter overrides                                       | `createSagaTestHarness`                              |
| Flow    | Swap activity/effect adapters    | `createTestDeps`, `MocksFor<TRequires>`                                        | `testMachine`, `testActivity`, `testGuard`           |
| Tracing | Swap tracer adapter              | `MemoryTracerAdapter` (built-in)                                               | `assertSpanExists` utility                           |

**Strength:** The pattern is consistent: create a test graph with mock adapters, build a container, resolve ports. No library requires special test infrastructure beyond what the DI graph provides. The `GraphBuilder.provide()` / `override()` mechanism is the universal test seam.

**Example pattern (consistent across all libraries):**

```
Production: GraphBuilder.provide(RestUsersAdapter)
Test:       GraphBuilder.provide(MockUsersAdapter)
```

### 2.6 Cross-Cutting Concerns via Ports

**Verdict: PASS with 3 warnings.**

Cross-cutting concerns (tracing, logging, error handling) should be handled through ports, not direct coupling.

**Compliant:**

- **Tracing:** `TracerPort`, `SpanExporterPort`, `SpanProcessorPort` are standard ports. Libraries integrate via optional `TracingHook` configs, not hard dependencies.
- **Flow tracing:** `FlowTracingHook` auto-wires when `TracerPort` is available. No hard dependency on tracing.
- **Query tracing:** Fetch history entries carry `traceId`/`spanId` for correlation.
- **Store tracing:** Action events carry `traceId`/`spanId` for correlation.

**Warnings:**

**W3: Runtime resolution errors are thrown, not returned as Result.**

- Location: `packages/runtime/src/engine.ts` (resolution path)
- The runtime throws `ContainerError` subclasses on resolution failure. Every ecosystem consumer (Saga, Flow, Query) must wrap `resolve()` in try/catch to convert to `Result`. The `resolveResult()` bridge function (`spec/result/12-hexdi-integration.md`) addresses this, but it is defined in the Result spec, not implemented in Core.
- **Impact:** The throw-vs-Result boundary creates a protocol mismatch. Each library independently wraps resolution, leading to duplicated error conversion logic.
- **Recommendation:** Export `resolveResult()` from a shared location (either Core or a new `@hex-di/result/integration` module) so all libraries use the same conversion.

**W4: Saga `SagaPersister` returns `Promise`, not `ResultAsync`.**

- Location: `spec/saga/08-persistence.md`, section 8.1
- The `SagaPersister` interface methods return `Promise<void>`, `Promise<SagaExecutionState | null>`, etc. This is a system boundary (storage I/O) where failures are expected. The ecosystem convention is `ResultAsync` for all fallible operations.
- **Impact:** Persistence errors bypass the typed error channel.
- **Recommendation:** Change to `ResultAsync<T, PersistenceError>` with a `PersistenceError` tagged union.

**W5: Flow `FlowEventBus.emit()` returns `void`.**

- Location: `spec/flow/07-ports-and-adapters.md` (adapter factory behavior)
- The event bus is a synchronous in-process mediator, so `void` is defensible. However, subscriber errors are silently swallowed.
- **Impact:** Low -- this is acceptable for a synchronous event dispatch mechanism.

### 2.7 Naming Conventions for Ports vs Adapters

**Verdict: PASS with 3 warnings.**

**Consistent patterns:**

- Port names use PascalCase: `"Logger"`, `"UserService"`, `"OrderSaga"`, `"ChatCompletion"`
- Port variables use `XxxPort` suffix: `LoggerPort`, `UsersPort`, `OrderSagaPort`, `TracerPort`
- Adapter variables use `XxxAdapter` suffix: `RestUsersAdapter`, `MockUsersAdapter`, `OrderSagaAdapter`
- Factory functions use `createXxxPort` / `createXxxAdapter` pattern

**Warnings:**

**W6: Saga port factory naming diverges from `create` prefix convention.**

- Saga uses `sagaPort<I,O,E>()({name})` (no `create` prefix, lowercase)
- Flow uses `activityPort<I,O,E>()({name})` (no `create` prefix, lowercase)
- But Store uses `createStatePort<T,A>()({name})` and Query uses `createQueryPort<T,P,E>()({name})`
- **Impact:** Users must learn two naming patterns for port factories.
- **Recommendation:** Adopt one convention ecosystem-wide. The curried-without-prefix pattern (`sagaPort`, `activityPort`) is used when 3+ type parameters require explicit binding. Document this as the convention: `createXxxPort` for single-call factories, `xxxPort` for curried factories.

**W7: Flow machine IDs use lowercase (`id: "order"`) while port names use PascalCase.**

- The `machineId` in `FlowAdapterMetadata` may appear alongside port names in graph visualization.
- **Recommendation:** Clarify that `machineId` is an internal Flow concept separate from the port name.

**W8: Flow retains `createMachine` alias alongside `defineMachine`.**

- Location: `spec/flow/14-api-reference.md`
- This violates the project's CLAUDE.md rule: "No backward compatibility -- No compatibility shims."
- **Recommendation:** Remove `createMachine`. `defineMachine` is the sole API.

### 2.8 Inter-Library Composition Through Ports

**Verdict: PASS with 5 warnings (documentation gaps, not architectural violations).**

The architecture supports inter-library composition through the standard port/adapter mechanism. However, the composition patterns are largely undocumented.

**W9: No Store-Query bridge.**

- Store manages reactive state. Query manages server data. There is no documented pattern for synchronizing query results into store state, or triggering query invalidation from store actions.
- Both specs mention the other exists but provide no integration guidance.
- **Recommendation:** Document the integration through effect ports: a Store effect port observes query changes, a Query mutation effect invalidates store-derived state.

**W10: No Saga-Store integration.**

- Saga orchestrates multi-step workflows. Store manages state. There is no documented pattern for saga steps reading/writing store state, or saga compensation rolling back store changes.
- **Recommendation:** Document that saga steps can depend on Store ports via the graph, with examples.

**W11: No Saga-Query integration.**

- No mechanism for saga steps that perform query fetches with caching, or saga completion triggering query cache invalidation.
- **Recommendation:** Document query cache invalidation on saga completion via effect ports.

**W12: Flow-Saga shared event types undefined.**

- Both specs reference Flow-Saga integration (Flow invoking saga execution, saga progress events fed back to Flow machine). Neither defines the shared event types.
- **Recommendation:** Define `SagaProgressEvent` and `SagaCompensationEvent` as shared types.

**W13: Flow-Store `syncWithStore` helper described but not in API reference.**

- `spec/flow/13-advanced.md` describes a `syncWithStore(storePort, selector, eventType)` pattern for bidirectional context synchronization. This helper has no type signature in the API reference and no testing pattern.
- **Recommendation:** Either add to the API reference with full types, or explicitly mark as a cookbook pattern.

---

## 3. Specific Violations with References

### VIOLATION V1: Missing `metadata` on `VisualizableAdapter` (Core)

**Location:** `packages/core/src/inspection/inspector-types.ts:67-92`
**Principle:** Port/Adapter Separation (metadata enrichment)
**Description:** The Flow spec requires `VisualizableAdapter` to support `metadata?: Record<string, unknown>` for attaching domain-specific structural data (machine states, events, transitions). The current interface lacks this property. This blocks Vision Layer 1 (Structure) introspection.
**Recommendation:** Add `readonly metadata?: Readonly<Record<string, unknown>>` to `VisualizableAdapter`. Non-breaking additive change.

### VIOLATION V2: Competing Error Paradigms (Core + Ecosystem)

**Location:** `packages/core/src/errors/` (class hierarchy) vs `spec/result/12-hexdi-integration.md` (tagged unions) vs all ecosystem specs (`_tag` discriminants)
**Principle:** Cross-Cutting via Ports
**Description:** Three error paradigms coexist:

1. Core: exception classes with `code` strings (`ContainerError` subclasses)
2. Result: `ResolutionError` tagged union with `_tag` discriminants
3. Type-level: template literal error strings in lifetime position

The `toResolutionError()` mapping function is referenced in the Result spec but not defined. Each ecosystem library must independently convert between throw-based Core errors and Result-based errors.
**Recommendation:**

1. Define `toResolutionError()` explicitly, mapping all `ContainerError` subclasses to `ResolutionError` variants
2. Add `_tag` field to Core `ContainerError` subclasses for forward compatibility
3. Export the mapping from a shared location

### VIOLATION V3: `SagaPersister` Returns `Promise` at System Boundary (Saga)

**Location:** `spec/saga/08-persistence.md`, section 8.1
**Principle:** Cross-Cutting via Ports (typed error channels)
**Description:** `SagaPersister.save()`, `.load()`, `.delete()`, `.list()`, `.update()` all return `Promise<T>`. Storage I/O is a system boundary where failures are expected. The ecosystem convention is `ResultAsync<T, E>` for all fallible operations at boundaries.
**Recommendation:** Change all methods to `ResultAsync<T, PersistenceError>` with `PersistenceError = { _tag: "SerializationFailed" | "StorageUnavailable" | "NotFound" | "ConcurrencyConflict" }`.

### VIOLATION V4: Flow Missing Dependency Declarations (Flow)

**Location:** `spec/flow/01-overview.md`, section 3.3 (Peer Dependencies)
**Principle:** Dependency Direction
**Description:** `@hex-di/result` and `@hex-di/tracing` are not listed in Flow's dependency table, despite being used pervasively throughout the API surface. Every `Result<T,E>` and `ResultAsync<T,E>` return type requires `@hex-di/result`. The `FlowTracingHook` requires `@hex-di/tracing`.
**Recommendation:** Add both to the Flow dependencies table.

### VIOLATION V5: Backward Compatibility Shim in Flow (Flow)

**Location:** `spec/flow/14-api-reference.md` (`createMachine` alias)
**Principle:** Naming Consistency / Project Rules
**Description:** `createMachine` is retained as an alias for `defineMachine`, explicitly described as "preserved for backward compatibility." The project's CLAUDE.md states: "No backward compatibility -- No compatibility shims -- Don't add re-exports, aliases, or wrappers for old APIs."
**Recommendation:** Remove `createMachine`. `defineMachine` is the sole API.

### VIOLATION V6: Port Direction Not Defined for Saga and Flow (Saga, Flow)

**Location:** `spec/saga/05-ports-and-adapters.md`, `spec/flow/07-ports-and-adapters.md`
**Principle:** Naming Consistency / Port metadata
**Description:** Store ports use `DirectedPort<..., "outbound">` and Query ports use `DirectedPort<..., "inbound">`. Saga ports extend `Port<SagaExecutor, TName>` without direction. Flow ports use `Port<FlowService, TName>` without direction. This prevents the graph inspection filtering system (`getInboundPorts`, `getOutboundPorts`) from categorizing these ports.
**Recommendation:**

- Saga: Use `DirectedPort<SagaExecutor, TName, "inbound">` (domain requests execution)
- Saga Management: Use `DirectedPort<..., "outbound">` (infrastructure management)
- Flow: Document that `FlowPort` intentionally omits direction (bidirectional: events in, state out), or use `"inbound"` since the primary interaction is sending events.

### VIOLATION V7: `SagaErrorBase` Field Mismatch (Saga)

**Location:** `spec/saga/09-error-handling.md` vs `spec/saga/15-api-reference.md`
**Principle:** Domain Isolation (internal consistency)
**Description:** Two sections of the same spec define `SagaErrorBase` with different fields. SS9 omits `message: string`; SS15 includes it. Error variant field distributions differ.
**Recommendation:** Reconcile. Use SS15 (with `message`) as canonical and update SS9 to match.

### VIOLATION V8: `useSagaHistory` Uses `Error | null` (Saga)

**Location:** `spec/saga/11-react-integration.md`, section 11.3
**Principle:** Cross-Cutting via Ports (typed error channels)
**Description:** The `useSagaHistory` hook returns `{ error: Error | null }` using a class-based `Error`, while the ecosystem convention is typed error generics or tagged union errors.
**Recommendation:** Change to `error: ManagementError | null` or `error: SagaError<ManagementError> | null`.

### VIOLATION V9: `MissingMockError` Uses Class-Based Error (Flow)

**Location:** `spec/flow/11-testing.md` (testing package)
**Principle:** Cross-Cutting via Ports (error conventions)
**Description:** `MissingMockError extends Error` is a class in the Flow testing package, while every other error in the ecosystem uses tagged unions.
**Recommendation:** Replace with `{ readonly _tag: 'MissingMock'; readonly portName: string }` returned as `Err(...)`.

---

## 4. Recommendations Summary

### Priority 1: Must Fix (Architectural Violations)

| #   | Issue                                     | Library     | Action                                                           |
| --- | ----------------------------------------- | ----------- | ---------------------------------------------------------------- |
| 1   | Add `metadata` to `VisualizableAdapter`   | Core        | Add `readonly metadata?: Readonly<Record<string, unknown>>`      |
| 2   | Define `toResolutionError()` mapping      | Core/Result | Export canonical error mapping function                          |
| 3   | Add `_tag` to `ContainerError` subclasses | Core        | Forward-compatible tagged union bridge                           |
| 4   | Make `SagaPersister` return `ResultAsync` | Saga        | Replace all `Promise<T>` with `ResultAsync<T, PersistenceError>` |
| 5   | Add `@hex-di/result` to Flow dependencies | Flow        | Update dependency table                                          |
| 6   | Remove `createMachine` alias              | Flow        | Delete backward compatibility shim                               |

### Priority 2: Should Fix (Consistency Gaps)

| #   | Issue                                       | Library    | Action                                                  |
| --- | ------------------------------------------- | ---------- | ------------------------------------------------------- |
| 7   | Translate `dependsOn` to adapter `requires` | Query      | Make query data dependencies visible to graph validator |
| 8   | Add port direction to Saga/Flow ports       | Saga, Flow | Use `DirectedPort` or document intentional omission     |
| 9   | Reconcile `SagaErrorBase` definitions       | Saga       | Pick canonical definition, update both sections         |
| 10  | Document port factory naming convention     | All        | `createXxxPort` for single-call, `xxxPort` for curried  |
| 11  | Fix `useSagaHistory` error type             | Saga       | Use typed error instead of `Error \| null`              |
| 12  | Replace `MissingMockError` class            | Flow       | Use tagged union error                                  |
| 13  | Document inter-library composition patterns | All        | Add cross-library integration appendices                |

### Priority 3: Nice to Have (Polish)

| #   | Issue                                                | Library | Action                                                         |
| --- | ---------------------------------------------------- | ------- | -------------------------------------------------------------- |
| 14  | Expand `SuggestedCategory` with ecosystem categories | Core    | Add `"state"`, `"query"`, `"saga"`, `"flow"`, `"effect"`       |
| 15  | Document phantom brand extension pattern             | Core    | Guide for extending `DirectedPort` with `unique symbol` brands |
| 16  | Create ecosystem-wide error code registry            | All     | Reserve `HEX` code ranges per library                          |
| 17  | Separate tracing React/Hono integrations             | Tracing | Create `@hex-di/tracing-react`, `@hex-di/tracing-hono`         |
| 18  | Clarify Flow `machineId` vs port name casing         | Flow    | Document internal vs public naming                             |

---

## 5. Overall Architectural Health Assessment

### Grade: B+ (Strong Foundation, Targeted Refinements Needed)

**What the ecosystem gets right:**

1. **Port/Adapter separation is exemplary.** Every library faithfully implements the hexagonal pattern. Ports are phantom-typed tokens with zero runtime behavior. Adapters capture full implementation contracts. The `GraphBuilder.provide()` mechanism ensures all wiring goes through the DI graph.

2. **Dependency direction is correct.** Infrastructure packages (React adapters, backend exporters) depend on domain packages, never the reverse. The package boundary between `@hex-di/xxx` (core) and `@hex-di/xxx-react` (framework adapter) is consistently maintained.

3. **The `effects-as-data` pattern is a strong innovation.** Flow's effect descriptors, Store's effect maps, and Saga's step definitions all declare _what_ should happen without binding to _how_. This is textbook hexagonal architecture applied to state management, data fetching, and workflow orchestration.

4. **Testability is built-in.** Every library supports testing through port substitution. Mock adapter factories, test harnesses, and type-level tests are consistently provided. No library requires MSW, network mocking, or framework-specific test utilities for core logic.

5. **The DI graph is the single source of truth.** All dependencies are declared in the graph. Compile-time validation (cycle detection, captive dependency checking, missing adapter detection) catches configuration errors before runtime. This is the backbone of the hexagonal architecture.

**What needs attention:**

1. **The throw-vs-Result boundary is the ecosystem's primary architectural tension.** Core throws exceptions; ecosystem libraries return Result. The bridge (`resolveResult`) is specified but not centrally implemented. Every consumer independently wraps resolution. This should be resolved with a shared, canonical conversion utility.

2. **Inter-library composition is architecturally supported but undocumented.** The port/adapter mechanism naturally enables Store-Query, Saga-Store, Flow-Saga composition. But no spec documents how to wire these integrations. Users will struggle to combine libraries without guidance.

3. **Port metadata consistency is uneven.** Store ports have rich metadata (direction, category, tags). Query ports have direction. Saga and Flow ports lack direction metadata. This affects the graph inspection and visualization capabilities.

4. **Error taxonomy is fragmented.** Core uses exception classes with `HEX` codes. The ecosystem uses tagged unions with `_tag`. The mapping between them is ad-hoc. A unified error taxonomy would reduce friction.

### Architectural Risks

| Risk                                                                                        | Severity | Mitigation                                                  |
| ------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------- |
| Error paradigm fragmentation leads to inconsistent error handling across library boundaries | Medium   | Centralize `toResolutionError()`, add `_tag` to Core errors |
| Query `dependsOn` bypasses graph validation                                                 | Medium   | Translate to adapter `requires` in `createQueryAdapter()`   |
| Inter-library integration patterns are ad-hoc                                               | Low      | Document composition cookbook with standard patterns        |
| Port direction metadata gaps affect graph visualization                                     | Low      | Add direction to Saga/Flow ports                            |

### Conclusion

The HexDI ecosystem has a strong hexagonal architecture foundation. The core `Port`/`Adapter`/`GraphBuilder` infrastructure is well-designed and consistently used. All libraries correctly separate domain from infrastructure, isolate business rules, support testing through port substitution, and properly isolate framework-specific code.

The six Priority 1 items (V1-V6) represent genuine architectural violations that should be resolved before the ecosystem ships. The remaining items are consistency improvements and documentation gaps that would improve developer experience but do not compromise the architectural integrity.

The ecosystem's greatest architectural strength is the `GraphBuilder` as the universal composition mechanism -- every library, every dependency, every lifecycle concern flows through it. This single integration point makes the hexagonal architecture enforceable, not just aspirational.

---

_End of Architecture Compliance Report_
