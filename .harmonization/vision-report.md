# HexDI Vision Alignment Report

## Executive Summary

This report cross-references all 7 ecosystem library specs, 8 harmonization reports, and the 5-phase HexDI Vision to produce a comprehensive alignment assessment. The ecosystem is strongly aligned with Phases 1-2 (complete), has significant architectural groundwork laid in specs for Phases 3-4, but faces structural gaps that must be resolved before Phase 3 implementation can proceed at scale. Phase 5 has partial conceptual coverage through saga compensation, query retry, and flow supervision, but no spec explicitly targets the MAPE-K autonomous loop.

**Key Finding:** The specs collectively cover ~70% of Phase 3 requirements, ~45% of Phase 4 requirements, and ~20% of Phase 5 requirements at the design level. However, cross-library integration gaps and the tagged-error-union vs class-hierarchy tension are the two systemic issues that cut across all phases.

---

## 1. Library x Phase Alignment Matrix

Legend:

- `[====]` Full alignment (spec covers all phase requirements)
- `[=== ]` Strong alignment (spec covers most requirements, minor gaps)
- `[==  ]` Partial alignment (spec covers some requirements, notable gaps)
- `[=   ]` Weak alignment (spec mentions concepts but lacks detail)
- `[    ]` No alignment (phase requirements not addressed in spec)
- `N/A` Phase not applicable to this library

| Library     | P1 Plumbing | P2 Awareness | P3 Reporting | P4 Communication | P5 Autonomy |
| ----------- | ----------- | ------------ | ------------ | ---------------- | ----------- |
| **result**  | `[====]`    | `[=== ]`     | `[==  ]`     | `[=   ]`         | `[=   ]`    |
| **store**   | `[====]`    | `[====]`     | `[=== ]`     | `[==  ]`         | `[=   ]`    |
| **query**   | `[====]`    | `[====]`     | `[=== ]`     | `[==  ]`         | `[==  ]`    |
| **saga**    | `[====]`    | `[=== ]`     | `[=== ]`     | `[==  ]`         | `[==  ]`    |
| **flow**    | `[====]`    | `[=== ]`     | `[=== ]`     | `[=   ]`         | `[==  ]`    |
| **agent**   | `[====]`    | `[=   ]`     | `[=   ]`     | `[==  ]`         | `[    ]`    |
| **tracing** | `[====]`    | `[====]`     | `[==  ]`     | `[====]`         | `[=   ]`    |
| **core**    | `[====]`    | `[=== ]`     | `[==  ]`     | N/A              | N/A         |
| **graph**   | `[====]`    | `[====]`     | `[=== ]`     | N/A              | N/A         |
| **runtime** | `[====]`    | `[=== ]`     | `[==  ]`     | N/A              | `[=   ]`    |

---

## 2. Phase-by-Phase Analysis

### 2.1 Phase 1: Plumbing (100% Complete)

**Status: Fully Aligned.**

All library specs build on the Phase 1 foundation. Every spec uses the `Port<TService, TName>`, `Adapter<TProvides, TRequires, TLifetime, TFactoryKind>`, and container resolution primitives established in Phase 1.

| Library | Port Pattern                              | Adapter Pattern         | Lifetime         | Factory Kind | Resolution           |
| ------- | ----------------------------------------- | ----------------------- | ---------------- | ------------ | -------------------- |
| result  | N/A (utility)                             | N/A                     | N/A              | N/A          | ResultAsync wrapping |
| store   | DirectedPort (outbound)                   | createStateAdapter      | scoped/singleton | sync         | Standard             |
| query   | QueryPort                                 | createQueryAdapter      | singleton        | async        | provideAsync         |
| saga    | SagaPort                                  | createSagaAdapter       | configurable     | sync         | Standard             |
| flow    | FlowPort                                  | createFlowAdapter       | scoped           | sync         | Standard             |
| agent   | ToolPort, AgentPort, LLMPort, ContextPort | Various create\*Adapter | configurable     | sync/async   | Standard             |
| tracing | TracerPort, LoggerPort                    | createTracerAdapter     | singleton        | sync         | Standard             |

**Gaps: None blocking.** All libraries correctly use the Phase 1 primitives.

---

### 2.2 Phase 2: Awareness (100% Complete)

**Status: Strongly Aligned with Minor Gaps.**

Phase 2 has three layers: Structural (graph), State (runtime snapshots), Behavioral (tracing). Each library spec addresses these layers to varying degrees.

#### Layer 1: Structural (Graph Inspection)

| Library | Graph Compatible | VisualizableAdapter | Port Direction      | Metadata Support                                 |
| ------- | ---------------- | ------------------- | ------------------- | ------------------------------------------------ |
| store   | Yes              | Yes                 | outbound (explicit) | Planned                                          |
| query   | Yes              | Yes                 | **Not defined**     | Planned                                          |
| saga    | Yes              | Yes                 | **Not defined**     | Planned                                          |
| flow    | Yes              | Yes                 | **Not defined**     | **Blocked** (needs VisualizableAdapter.metadata) |
| agent   | Yes              | Yes                 | **Not defined**     | Not specified                                    |

**Gaps:**

- **GAP-V2-1 (HIGH):** `VisualizableAdapter` in `@hex-di/core` lacks the `metadata?: Record<string, unknown>` property. This blocks Flow's `FlowAdapterMetadata` (machine states, events, transitions) from flowing through the graph inspection pipeline. Identified in both core-report and graph-report.
- **GAP-V2-2 (LOW):** Query, Saga, Flow, and Agent ports do not define port direction (`inbound`/`outbound`). This prevents `getInboundPorts()`/`getOutboundPorts()` filtering from categorizing these ports. Only Store uses `DirectedPort<..., "outbound">`.

#### Layer 2: State (Runtime Snapshots)

| Library | InspectorAPI      | Snapshot Type     | Push Events         | Pull Queries                                          |
| ------- | ----------------- | ----------------- | ------------------- | ----------------------------------------------------- |
| store   | StoreInspectorAPI | StoreSnapshot     | StoreInspectorEvent | getSnapshot, getActionHistory, getSubscriberGraph     |
| query   | QueryInspectorAPI | QuerySnapshot     | QueryInspectorEvent | getSnapshot, getFetchHistory, getCacheDependencyGraph |
| saga    | SagaInspector     | SagaSnapshot      | SagaInspectorEvent  | getSnapshot, getStepHistory, getCompensationState     |
| flow    | FlowInspector     | FlowSnapshot      | FlowInspectorEvent  | getSnapshot, getStateHistory, getTransitionGraph      |
| agent   | **Not specified** | **Not specified** | **Not specified**   | **Not specified**                                     |

**Gaps:**

- **GAP-V2-3 (MEDIUM):** Agent spec has no introspection section. No AgentInspectorAPI, no AgentSnapshot, no push/pull observation pattern. Phase 3.8 (Agent Reporting) requires `AgentInspectorAPI` with `getToolExecutionHistory()`, `getDecisionPath()`, `getCostMetrics()`.

#### Layer 3: Behavioral (Tracing)

| Library | Tracing Integration              | Span Creation       | Error Recording                                    |
| ------- | -------------------------------- | ------------------- | -------------------------------------------------- |
| result  | Section 54 (tracing integration) | Result spans        | Error propagation via Result                       |
| store   | State change spans               | Yes                 | Via Result                                         |
| query   | Fetch/cache spans                | Yes                 | Via Result                                         |
| saga    | Step execution spans             | Yes                 | Via Result (partial -- SagaPersister uses Promise) |
| flow    | Transition spans                 | Yes                 | Via Result                                         |
| agent   | Tool execution spans             | Yes                 | Not specified                                      |
| tracing | Core implementation              | MemoryTracer, hooks | Error span recording                               |

**Gaps:**

- **GAP-V2-4 (MEDIUM):** Saga's `SagaPersister` returns `Promise` instead of `ResultAsync`, breaking the tracing-through-Result chain. Identified in saga-report.

---

### 2.3 Phase 3: Reporting (15% Complete)

**Status: Strong Spec Coverage, Implementation Lagging.**

Phase 3 defines 9 components. Here is the alignment of each library spec to these components:

#### Component 3.1: TracingQueryAPI

**Vision requirement:** Query interface over collected trace/span data. Filter by service, time range, status. Aggregate statistics.

| Source       | Coverage                                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------------------- |
| Tracing spec | MemoryTracer collects spans. No query API defined.                                                              |
| Phase 3 doc  | Full `TracingQueryAPI` interface: `querySpans()`, `getSpanTree()`, `getServiceMap()`, `getErrorRateByService()` |

**Gap: Tracing spec does not define a query API over collected spans.** The MemoryTracer stores spans but provides no structured query interface. Phase 3.1 requires `TracingQueryAPI` with filtering, aggregation, and tree reconstruction.

**Recommendation:** Add a `TracingQueryAPI` section to the tracing spec defining the query interface over MemoryTracer data.

#### Component 3.2: FlowReporting

**Vision requirement:** State machine introspection: current state, transition history, guard evaluation traces, active timers, subscription status.

| Source                 | Coverage                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Flow spec (section 12) | FlowInspector with getSnapshot, getStateHistory, getTransitionGraph, DevTools integration                               |
| Phase 3 doc            | `FlowReportingService`: `getMachineReport()`, `getTransitionTimeline()`, `getGuardEvaluationLog()`, `getActiveTimers()` |

**Alignment: Strong (80%).** Flow spec's introspection section covers most Phase 3.2 requirements. Missing: guard evaluation logging and active timer enumeration are not in the Flow spec.

**Recommendation:** Add guard evaluation trace collection and active timer enumeration to Flow spec section 12.

#### Component 3.3: ReactInspectionHooks

**Vision requirement:** React hooks wrapping InspectorAPI for component-level DI observability. `useContainerHealth()`, `useServiceTrace()`, `useDependencyGraph()`.

| Source      | Coverage                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| Store spec  | `useStoreSnapshot()` mentioned                                                                           |
| Query spec  | `useQuerySnapshot()` mentioned                                                                           |
| Flow spec   | `useFlowSnapshot()` mentioned                                                                            |
| Phase 3 doc | Full hook API: `useContainerHealth()`, `useServiceTrace()`, `useDependencyGraph()`, `usePortInspector()` |

**Alignment: Partial (40%).** Individual library specs define library-specific React hooks, but no spec defines the unified container-level React inspection hooks that Phase 3.3 requires.

**Recommendation:** Create a unified React inspection hooks section (possibly in the existing `@hex-di/react` package spec) that wraps all InspectorAPIs into container-level hooks.

#### Component 3.4: HonoInspection (Diagnostic Routes)

**Vision requirement:** HTTP diagnostic endpoints via Hono middleware. `GET /hexdi/graph`, `GET /hexdi/health`, `GET /hexdi/traces`.

| Source      | Coverage                                                   |
| ----------- | ---------------------------------------------------------- |
| No spec     | No library spec mentions Hono diagnostic routes            |
| Phase 3 doc | Full route definitions, middleware factory, authentication |

**Alignment: None (0%).** No spec addresses HTTP diagnostic endpoints.

**Recommendation:** This is a new package concern (`@hex-di/hono` or `@hex-di/diagnostic-routes`). A spec section should be created once Phase 3 implementation begins.

#### Component 3.5: StoreReporting

**Vision requirement:** Store-specific reporting: state diff timeline, action replay, subscriber dependency visualization, memory pressure analysis.

| Source           | Coverage                                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Store spec (05b) | StoreInspectorAPI with StoreSnapshot, Action History, Subscriber Dependency Graph, MCP Resource Readiness                               |
| Phase 3 doc      | `StoreReportingService`: `getStateDiffTimeline()`, `getActionReplay()`, `getSubscriberDependencyGraph()`, `getMemoryPressureAnalysis()` |

**Alignment: Strong (75%).** Store spec's introspection section directly maps to most Phase 3.5 requirements. Missing: memory pressure analysis and state diff timeline (store spec has action history but not state-diff-level granularity).

#### Component 3.6: QueryReporting

**Vision requirement:** Query-specific reporting: cache hit/miss rates, fetch waterfall, stale data detection, invalidation cascade visualization.

| Source           | Coverage                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Query spec (09b) | QueryInspectorAPI with QuerySnapshot, Fetch History, Cache Dependency Graph, QueryInspectorEvent                           |
| Phase 3 doc      | `QueryReportingService`: `getCacheEfficiency()`, `getFetchWaterfall()`, `getStaleDataReport()`, `getInvalidationCascade()` |

**Alignment: Strong (80%).** Query spec's introspection is the most architecturally mature. The QueryInspectorAPI covers cache dependency graph and fetch history. Missing: explicit stale data detection report and invalidation cascade visualization.

#### Component 3.7: SagaReporting

**Vision requirement:** Saga-specific reporting: step execution timeline, compensation chain visualization, persistence state, retry statistics.

| Source                 | Coverage                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Saga spec (section 14) | SagaInspector with SagaSnapshot, Step History, Compensation State                                                                   |
| Phase 3 doc            | `SagaReportingService`: `getStepTimeline()`, `getCompensationChainVisualization()`, `getPersistenceState()`, `getRetryStatistics()` |

**Alignment: Strong (70%).** Saga spec covers step history and compensation state. Missing: explicit retry statistics aggregation and persistence state reporting interface.

#### Component 3.8: AgentReporting

**Vision requirement:** Agent-specific reporting: tool execution history, decision path trace, cost/token metrics, HITL interaction log.

| Source      | Coverage                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| Agent spec  | No introspection section. Tool execution, HITL described but no AgentInspectorAPI.                                       |
| Phase 3 doc | `AgentReportingService`: `getToolExecutionHistory()`, `getDecisionPath()`, `getCostMetrics()`, `getHITLInteractionLog()` |

**Alignment: Weak (15%).** Agent spec describes the operational aspects (tool ports, HITL) but provides no introspection or reporting interface.

**Recommendation:** Add an introspection section to the Agent spec following the established InspectorAPI pattern (AgentInspectorAPI, AgentSnapshot, AgentInspectorEvent).

#### Component 3.9: UnifiedKnowledgeModel

**Vision requirement:** A unified data model that aggregates all library-specific InspectorAPIs into a single queryable knowledge graph. Cross-library correlation (e.g., "which query caused this saga to run?").

| Source      | Coverage                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------- |
| No spec     | No library spec defines cross-library correlation                                                 |
| Phase 3 doc | `UnifiedKnowledgeModel`: `correlate()`, `query()`, `subscribe()`, cross-library event correlation |

**Alignment: None (0%).** This is the most ambitious Phase 3 component and has no spec coverage. The individual InspectorAPIs provide the building blocks, but the unified aggregation and cross-library correlation layer is entirely unspecified.

**Recommendation:** This should be designed after all individual InspectorAPIs are implemented. It depends on all of 3.1-3.8.

#### Phase 3 Summary Table

| Component                 | Spec Coverage | Key Gap                                       |
| ------------------------- | ------------- | --------------------------------------------- |
| 3.1 TracingQueryAPI       | 30%           | No query API over MemoryTracer data           |
| 3.2 FlowReporting         | 80%           | Guard evaluation logging, timer enumeration   |
| 3.3 ReactInspectionHooks  | 40%           | No unified container-level hooks              |
| 3.4 HonoInspection        | 0%            | No spec exists                                |
| 3.5 StoreReporting        | 75%           | Memory pressure analysis, state diff timeline |
| 3.6 QueryReporting        | 80%           | Stale data detection, invalidation cascade    |
| 3.7 SagaReporting         | 70%           | Retry statistics, persistence state reporting |
| 3.8 AgentReporting        | 15%           | No AgentInspectorAPI at all                   |
| 3.9 UnifiedKnowledgeModel | 0%            | Entirely unspecified                          |

---

### 2.4 Phase 4: Communication (40% Complete)

**Status: OTel Complete, MCP/A2A/REST/DevTools Partially Specified in Library Specs.**

#### 4.1 OTel Export Pipeline (100% Complete)

Fully implemented. Tracing spec defines TracerPort, SpanExporterPort, and the full export pipeline (OTLP HTTP, Batch/Simple Processors, Semantic Conventions, Resource Builder). Jaeger, Zipkin, and Datadog exporter packages are specified.

**Alignment: Complete.** No gaps.

#### 4.2 MCP Server (0% Implemented)

**Vision requirement:** MCP server exposing DI container state as resources, tools, and prompts.

| Library | MCP Resource Coverage                                                                                | URI Pattern       |
| ------- | ---------------------------------------------------------------------------------------------------- | ----------------- |
| store   | Section G: MCP Resource Readiness. Maps StoreSnapshot to `hexdi://store/{name}/snapshot`             | `hexdi://store/*` |
| query   | Section 09b: Maps 7 resources + 2 tools. `hexdi://query/{name}/snapshot`, cache stats, fetch history | `hexdi://query/*` |
| saga    | Section 14: MCP resources under `hexdi://saga/*`                                                     | `hexdi://saga/*`  |
| flow    | Not specified                                                                                        | None              |
| agent   | Not specified                                                                                        | None              |
| graph   | Not specified (Phase 4 doc: `hexdi://graph/*`)                                                       | None              |
| runtime | Not specified (Phase 4 doc: `hexdi://runtime/*`)                                                     | None              |
| tracing | Not specified (Phase 4 doc: `hexdi://tracing/*`)                                                     | None              |

**Alignment: Partial (40%).** Store, Query, and Saga specs pre-plan MCP resource URIs. Flow, Agent, graph, runtime, and tracing do not. The Phase 4 doc defines a comprehensive MCP resource hierarchy (`graph/*`, `runtime/*`, `tracing/*`, `library/*`) that extends beyond what any individual spec covers.

**Gaps:**

- **GAP-V4-1 (MEDIUM):** Flow spec lacks MCP resource mapping. Flow's state machine structure is highly valuable as an MCP resource.
- **GAP-V4-2 (MEDIUM):** Agent spec lacks MCP resource mapping. Agent tool registries and execution logs are natural MCP resources.
- **GAP-V4-3 (LOW):** No spec defines the `hexdi://graph/*` or `hexdi://runtime/*` core MCP resources. These are container-level concerns, not library-level.

**Recommendation:** Add MCP resource readiness sections to Flow and Agent specs. Core MCP resources (graph, runtime, tracing) should be defined in a dedicated `@hex-di/mcp-server` spec.

#### 4.3 A2A Protocol (0% Implemented)

**Vision requirement:** Agent-to-Agent protocol. Publish DI container capabilities as A2A skills. Agent Card with skills like `inspect-architecture`, `diagnose-issue`, `state-inspector`, `tool-executor`.

| Library | A2A Coverage                                           |
| ------- | ------------------------------------------------------ |
| saga    | Mentions A2A skill publishing (section on integration) |
| agent   | Natural candidate but no A2A section                   |
| Others  | No coverage                                            |

**Alignment: Weak (10%).** Only Saga spec briefly mentions A2A. The Agent spec, which is the most natural host for A2A integration, does not address it.

**Recommendation:** A2A is a container-level concern. Define it in a `@hex-di/a2a` package spec, not within individual library specs. The Agent spec should reference A2A as an integration point.

#### 4.4 REST Diagnostic API (0% Implemented)

No spec coverage. This is a Phase 3.4 deliverable (Hono diagnostic routes) that feeds into Phase 4.

**Alignment: None (0%).**

#### 4.5 DevTools Dashboard (10% Implemented)

Static graph visualization exists. Flow spec section 12 mentions DevTools integration for state machine visualization. No other spec addresses DevTools.

**Alignment: Weak (15%).**

#### Phase 4 Summary Table

| Component        | Spec Coverage | Key Gap                                   |
| ---------------- | ------------- | ----------------------------------------- |
| 4.1 OTel         | 100%          | None                                      |
| 4.2 MCP Server   | 40%           | Flow, Agent, core-level resources missing |
| 4.3 A2A Protocol | 10%           | Agent spec lacks A2A section              |
| 4.4 REST API     | 0%            | No spec exists                            |
| 4.5 DevTools     | 15%           | Only static graph + flow mention          |

---

### 2.5 Phase 5: Autonomy (0% Complete)

**Status: Partial Conceptual Coverage, No Direct Specification.**

Phase 5 defines four pillars: Auto-Healing, Auto-Optimization, MAPE-K Loop, Health Assessment.

#### 5.1 Auto-Healing

| Sub-component                  | Library Coverage | Spec Reference                                                                                                                          |
| ------------------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 5.1.1 Saga Compensation Engine | **Strong**       | Saga spec chapter 6: full compensation architecture with forward/backward compensation, compensation ordering, compensation persistence |
| 5.1.2 Circuit Breaker          | **None**         | No spec defines circuit breaker patterns                                                                                                |
| 5.1.3 Retry with Backoff       | **Partial**      | Query spec section 38: retry and backoff strategies for failed fetches                                                                  |
| 5.1.4 Scope Leak Detection     | **None**         | No spec defines scope leak detection                                                                                                    |
| 5.1.5 Dead Letter Queue        | **None**         | No spec defines DLQ patterns                                                                                                            |

**Alignment: Partial (30%).** Saga compensation is well-specified and directly maps to Phase 5.1.1. Query retry aligns with 5.1.3. Circuit breaker, scope leak detection, and DLQ are absent from all specs.

#### 5.2 Auto-Optimization

| Sub-component                    | Library Coverage | Spec Reference                       |
| -------------------------------- | ---------------- | ------------------------------------ |
| 5.2.1 Pre-Warming Engine         | **None**         | No spec addresses pre-warming        |
| 5.2.2 Adaptive Scope Pooling     | **None**         | No spec addresses scope pooling      |
| 5.2.3 Lifetime Promotion Advisor | **None**         | No spec addresses lifetime promotion |
| 5.2.4 Slow Resolution Alerting   | **None**         | No spec addresses resolution timing  |

**Alignment: None (0%).** Auto-optimization is entirely absent from library specs. These are runtime-level concerns.

#### 5.3 MAPE-K Loop

| Agent     | Library Coverage                                                              |
| --------- | ----------------------------------------------------------------------------- |
| Monitor   | Tracing (MemoryTracer), InspectorAPIs (all libraries) provide monitoring data |
| Analyze   | No spec defines analysis patterns over monitoring data                        |
| Plan      | No spec defines remediation planning                                          |
| Execute   | Flow supervision (section 31) provides supervised execution patterns          |
| Knowledge | No spec defines a knowledge base for autonomic decisions                      |

**Alignment: Weak (15%).** The monitoring data is available through Phase 2/3 infrastructure, and Flow's supervision provides an execution framework, but the analysis, planning, and knowledge components are absent.

#### 5.4 Health Assessment

| Sub-component         | Library Coverage                                                                |
| --------------------- | ------------------------------------------------------------------------------- |
| Scoring Engine        | No spec defines health scoring                                                  |
| Degradation Detection | Flow spec section 31 (error recovery) has partial overlap                       |
| Report Generation     | InspectorAPI snapshots could feed into reports, but no spec defines aggregation |

**Alignment: Weak (10%).**

#### Phase 5 Summary Table

| Component             | Spec Coverage | Key Gap                                            |
| --------------------- | ------------- | -------------------------------------------------- |
| 5.1 Auto-Healing      | 30%           | Circuit breaker, scope leak detection, DLQ missing |
| 5.2 Auto-Optimization | 0%            | Entirely unspecified                               |
| 5.3 MAPE-K Loop       | 15%           | Analysis, planning, knowledge agents missing       |
| 5.4 Health Assessment | 10%           | No health scoring or degradation detection         |

---

## 3. Cross-Cutting Gap Analysis

### 3.1 Systemic Issue: Tagged Error Unions vs Class Hierarchy

**Affects: All Phases (2-5)**

The ecosystem uses tagged union errors (`{ _tag: "QueryError"; ... }`) via `@hex-di/result`, while `@hex-di/core` uses a class-based `ContainerError` hierarchy. This tension surfaces in:

- **Phase 2:** `ResolutionError` variants don't fully map to core error classes (result-report)
- **Phase 3:** Reporting must normalize errors from both systems for unified display
- **Phase 4:** MCP/A2A must serialize errors -- tagged unions serialize cleanly, class instances do not
- **Phase 5:** Auto-healing must pattern-match on error types -- tagged unions enable this, class hierarchies require `instanceof`

**Recommendation:** Align on tagged union errors throughout. Add `ResolutionError` as a tagged union to `@hex-di/core` (as recommended in core-report). This is the single highest-impact cross-cutting change.

### 3.2 Systemic Issue: Cross-Library Integration Contracts

**Affects: Phases 3-5**

Multiple harmonization reports identify missing cross-library integration:

| Integration   | Status              | Report Source                                 |
| ------------- | ------------------- | --------------------------------------------- |
| Store + Query | Not specified       | store-report, query-report                    |
| Store + Flow  | Not specified       | store-report                                  |
| Store + Saga  | Not specified       | store-report                                  |
| Query + Saga  | Not specified       | saga-report                                   |
| Flow + Saga   | Partially specified | flow-report (shared integration types needed) |
| Agent + Flow  | Not specified       | Neither spec                                  |
| Agent + Saga  | Not specified       | Neither spec                                  |

**Impact:** Phase 3.9 (UnifiedKnowledgeModel) depends on understanding how libraries interact. Without cross-library integration contracts, the unified knowledge model cannot correlate events across library boundaries.

**Recommendation:** Create a `spec/integration/` directory with cross-library integration specs. Prioritize Store+Query (data feeding) and Flow+Saga (orchestration) as the two most common integration patterns.

### 3.3 Systemic Issue: Query `dependsOn` Not in Graph

**Affects: Phases 2-3**

Query port `dependsOn` declarations are port-level metadata, not reflected in adapter `requires` arrays (graph-report GAP 2). This means:

- Phase 2 graph inspection misses query dependency edges
- Phase 3 query reporting cannot use graph traversal utilities for `dependsOn` chains
- Cycle detection and captive dependency validation skip `dependsOn` edges

**Recommendation:** `createQueryAdapter()` should translate `dependsOn` references into the adapter's `requires` array during adapter construction.

### 3.4 Systemic Issue: SagaPersister Promise vs ResultAsync

**Affects: Phases 2-5**

SagaPersister returns `Promise` instead of `ResultAsync` (saga-report HIGH finding). This breaks:

- Phase 2 behavioral tracing (Result chain lost)
- Phase 3 saga reporting (error type information lost)
- Phase 5 auto-healing (cannot pattern-match on persistence errors)

**Recommendation:** Change `SagaPersister` interface to return `ResultAsync` throughout.

---

## 4. Recommendations

### Priority 1: Blocking Phase 3 Progress (Address First)

| #   | Recommendation                                                                      | Affected Phase | Source Report              | Effort |
| --- | ----------------------------------------------------------------------------------- | -------------- | -------------------------- | ------ |
| R1  | Add `metadata?: Record<string, unknown>` to `VisualizableAdapter` in `@hex-di/core` | P2, P3         | core-report, graph-report  | Small  |
| R2  | Add `ResolutionError` tagged union to `@hex-di/core` alongside class errors         | P2-P5          | result-report, core-report | Medium |
| R3  | Translate query `dependsOn` into adapter `requires` in `createQueryAdapter()`       | P2, P3         | graph-report               | Medium |
| R4  | Change `SagaPersister` to return `ResultAsync`                                      | P2-P5          | saga-report                | Small  |
| R5  | Add AgentInspectorAPI to Agent spec (following InspectorAPI pattern)                | P3             | Agent spec gap             | Medium |

### Priority 2: Enabling Phase 3 Implementation

| #   | Recommendation                                                             | Affected Phase | Source Report | Effort |
| --- | -------------------------------------------------------------------------- | -------------- | ------------- | ------ |
| R6  | Add TracingQueryAPI section to tracing spec                                | P3             | Phase 3 doc   | Medium |
| R7  | Add guard evaluation logging and timer enumeration to Flow spec section 12 | P3             | Phase 3 doc   | Small  |
| R8  | Define unified React inspection hooks (container-level) in `@hex-di/react` | P3             | Phase 3 doc   | Medium |
| R9  | Define port direction for Query, Saga, Flow, Agent ports                   | P2, P3         | graph-report  | Small  |
| R10 | Add retry statistics and persistence state reporting to Saga introspection | P3             | Phase 3 doc   | Small  |

### Priority 3: Enabling Phase 4

| #   | Recommendation                                                                    | Affected Phase | Source Report    | Effort |
| --- | --------------------------------------------------------------------------------- | -------------- | ---------------- | ------ |
| R11 | Add MCP resource readiness section to Flow spec                                   | P4             | Phase 4 doc      | Small  |
| R12 | Add MCP resource readiness section to Agent spec                                  | P4             | Phase 4 doc      | Small  |
| R13 | Create `@hex-di/mcp-server` spec for core MCP resources (graph, runtime, tracing) | P4             | Phase 4 doc      | Large  |
| R14 | Create cross-library integration specs (Store+Query, Flow+Saga priority)          | P3-P5          | Multiple reports | Large  |

### Priority 4: Preparing Phase 5

| #   | Recommendation                                                       | Affected Phase | Source Report | Effort |
| --- | -------------------------------------------------------------------- | -------------- | ------------- | ------ |
| R15 | Add circuit breaker pattern to runtime or flow spec                  | P5             | Phase 5 doc   | Medium |
| R16 | Add scope leak detection to runtime spec                             | P5             | Phase 5 doc   | Medium |
| R17 | Design MAPE-K knowledge base schema leveraging UnifiedKnowledgeModel | P5             | Phase 5 doc   | Large  |

---

## 5. Phase Coherence Analysis (P1 -> P5 Data Flow)

The HexDI Vision defines a progressive data flow: Plumbing produces structure -> Awareness observes it -> Reporting queries observations -> Communication exports reports -> Autonomy acts on exports.

### Data Flow Integrity Check

```
P1 (Plumbing)
  |-- Ports, Adapters, Lifetimes, Scopes, Resolution
  |
P2 (Awareness)
  |-- Layer 1: Graph inspection reads P1 structure
  |     STATUS: INTACT (graph package reads builder internals)
  |     GAP: VisualizableAdapter.metadata missing (R1)
  |
  |-- Layer 2: Runtime snapshots read P1 resolution state
  |     STATUS: INTACT (InspectorAPI reads container state)
  |     GAP: Resolution errors thrown not Result (runtime-report GAP-R4)
  |
  |-- Layer 3: Tracing hooks observe P1 resolution behavior
  |     STATUS: INTACT (tracing hooks fire on resolve/create/dispose)
  |     GAP: Hook context lacks trace/span IDs (runtime-report)
  |
P3 (Reporting)
  |-- 3.1-3.8: Library reporters query P2 awareness data
  |     STATUS: PARTIALLY INTACT
  |     GAP: TracingQueryAPI missing (R6)
  |     GAP: AgentInspectorAPI missing (R5)
  |     GAP: Cross-library correlation missing (R14)
  |
  |-- 3.9: UnifiedKnowledgeModel aggregates all reporters
  |     STATUS: NOT INTACT (depends on all 3.1-3.8)
  |
P4 (Communication)
  |-- 4.1 OTel: Reads P2.L3 tracing data
  |     STATUS: INTACT (fully implemented)
  |
  |-- 4.2 MCP: Reads P3 reports as MCP resources
  |     STATUS: PARTIALLY INTACT
  |     GAP: Core MCP resources unspecified (R13)
  |     GAP: Flow, Agent MCP resources unspecified (R11, R12)
  |
  |-- 4.3 A2A: Publishes P3 capabilities as A2A skills
  |     STATUS: NOT INTACT (no spec foundation)
  |
  |-- 4.4 REST: Exposes P3 via HTTP
  |     STATUS: NOT INTACT (no spec foundation)
  |
  |-- 4.5 DevTools: Renders P3 visually
  |     STATUS: MINIMAL (static graph only)
  |
P5 (Autonomy)
  |-- Reads P4 data streams
  |-- Acts on P1 container (scope creation, resolution, disposal)
  |     STATUS: NOT INTACT
  |     GAP: MAPE-K loop unspecified
  |     GAP: Health assessment unspecified
  |     PARTIAL: Saga compensation (5.1.1), Query retry (5.1.3), Flow supervision (5.3.E)
```

### Coherence Assessment

The P1->P2 data flow is intact. The P2->P3 flow is partially intact but blocked by missing InspectorAPIs (Agent) and missing query interfaces (TracingQueryAPI). The P3->P4 flow has OTel working but MCP/A2A/REST blocked on P3 completion. P4->P5 has no established data flow.

**The critical path for unblocking the entire pipeline is Phase 3.** All downstream phases depend on it. The recommendations in Priority 1 and 2 directly target Phase 3 readiness.

---

## 6. Execution Strategy Alignment

The Vision's 7-wave execution strategy maps to the gaps identified:

| Wave   | Vision Scope                                     | Spec Readiness | Blocking Gaps                                           |
| ------ | ------------------------------------------------ | -------------- | ------------------------------------------------------- |
| Wave 1 | P3.1 TracingQueryAPI                             | 30%            | R6 (TracingQueryAPI spec)                               |
| Wave 2 | P3.2 FlowReporting + P3.5 StoreReporting         | 75-80%         | R1 (VisualizableAdapter.metadata), R7 (guard/timer)     |
| Wave 3 | P3.6 QueryReporting + P3.7 SagaReporting         | 70-80%         | R3 (dependsOn), R4 (SagaPersister), R10 (retry stats)   |
| Wave 4 | P3.3 ReactInspectionHooks + P3.4 HonoInspection  | 0-40%          | R8 (unified hooks), new Hono spec needed                |
| Wave 5 | P3.8 AgentReporting + P3.9 UnifiedKnowledgeModel | 0-15%          | R5 (AgentInspectorAPI), R14 (cross-library integration) |
| Wave 6 | P4.2-P4.5 MCP + A2A + REST + DevTools            | 10-40%         | R11-R13 (MCP specs), A2A spec, REST spec                |
| Wave 7 | P5.1-P5.4 Autonomy                               | 0-30%          | R15-R17, MAPE-K spec                                    |

**Waves 1-3 can proceed with targeted spec amendments (R1-R4, R6-R7, R10). Waves 4-5 require new spec work (R5, R8, R14). Waves 6-7 require entirely new specifications.**

---

## 7. Conclusion

The HexDI ecosystem has a solid foundation through Phases 1-2 and strong spec-level preparation for Phase 3. The individual library InspectorAPIs (Store, Query, Saga, Flow) follow a consistent pattern that will compose well into the Phase 3 reporting layer. The primary risks are:

1. **The tagged-error-union tension** (R2) is the deepest architectural issue and affects every phase
2. **Missing VisualizableAdapter.metadata** (R1) is a small change with outsized impact on the inspection pipeline
3. **Cross-library integration contracts** (R14) are the largest missing piece for Phase 3.9 and Phase 5
4. **Agent introspection** (R5) is the only library without an InspectorAPI, breaking the uniform pattern

Addressing the 5 Priority 1 recommendations (R1-R5) would advance the overall ecosystem from ~60% Phase 3 spec readiness to ~80%, unblocking Waves 1-3 of the execution strategy.
