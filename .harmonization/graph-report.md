# HexDi Graph Package -- Ecosystem Compatibility Report

## Executive Summary

The `@hex-di/graph` package is well-architected and broadly compatible with the new ecosystem libraries (`@hex-di/store`, `@hex-di/query`, `@hex-di/saga`, `@hex-di/flow`). Its compile-time validation pipeline, merge semantics, and inspection infrastructure provide a solid foundation. However, several gaps and friction points exist that need attention for full ecosystem harmonization.

**Overall Assessment: Compatible with targeted enhancements needed.**

---

## 1. Graph Composition Patterns

### 1.1 Single Adapter Registration (`provide()`)

All new library adapters follow the standard `Adapter<TProvides, TRequires, TLifetime, TFactoryKind>` contract from `@hex-di/core`. The `provide()` method at `packages/graph/src/builder/builder-provide.ts` validates adapters through a multi-step pipeline:

1. Duplicate check (O(1))
2. Self-dependency check (O(1))
3. Cycle detection (O(depth))
4. Forward captive dependency check (O(requires))
5. Reverse captive dependency check

**Compatibility:**

- **Store adapters** (`createStateAdapter`, `createAtomAdapter`): These return standard `Adapter<TPort, TRequires, "singleton" | "scoped", "sync">`. They compose correctly with `provide()`. The `DirectAdapterLifetime<TAdapter>` type at `packages/graph/src/builder/types/state.ts:119-125` correctly extracts literal lifetimes through pattern matching.
- **Query adapters** (`createQueryAdapter`): These return `Adapter<..., "async">`. They must use `provideAsync()` since `factoryKind` is `"async"`. The async validation path at `provide.ts:892-988` enforces singleton lifetime, which the query spec acknowledges with the default `"singleton"` lifetime.
- **Saga adapters** (`createSagaAdapter`): Standard adapters with `requires` arrays. Saga ports use `SagaPort<TName, TInput, TOutput, TError>` which extends `Port<SagaExecutor<...>, TName>` -- fully compatible with `InferAdapterProvides` and `InferAdapterRequires`.
- **Flow adapters** (`createFlowAdapter`): Standard adapters. The spec explicitly states "FlowAdapter is a standard Adapter type and registers with GraphBuilder.provide() like any other adapter" (spec/flow/07-ports-and-adapters.md:96-98).

**Finding: COMPATIBLE.** No changes needed for basic registration.

### 1.2 Batch Registration (`provideMany()`)

The `ProvideManyResult` type at `packages/graph/src/builder/types/provide.ts:1062-1122` handles batch operations with intra-batch duplicate detection, self-dependency checks, and cycle detection. New library adapters compose correctly in batches.

**Finding: COMPATIBLE.** The batch validation handles mixed adapter types (store + query + saga) without issues since all share the `AdapterConstraint` base.

### 1.3 Graph Merging (`merge()` / `mergeWith()`)

The merge system at `packages/graph/src/builder/types/merge.ts` performs:

1. Lifetime consistency checks (`FindLifetimeInconsistency`)
2. Duplicate detection
3. Cycle detection on merged graphs
4. Captive dependency detection on merged graphs

**Compatibility concern:** When merging a graph containing store adapters (scoped) with a graph containing query adapters (singleton), the `MergeLifetimeMaps` type must correctly handle both lifetimes. The `UnifiedMergeInternals` at `state.ts:603-617` merges dependency graphs and lifetime maps from both builders.

**Finding: COMPATIBLE.** The merge semantics are agnostic to adapter origin. Lifetime and dependency data are structural, not nominal. Store adapters, query adapters, saga adapters, and flow adapters all merge correctly.

### 1.4 Parent-Child Override (`forParent()` / `override()`)

The override system at `merge.ts:767-804` checks:

1. Parent graph existence (`OverrideWithoutParentErrorMessage`)
2. Port name existence in parent (`InvalidOverrideErrorWithAvailable`)
3. Service type compatibility (`IsPortTypeCompatible`)

**Compatibility concern for store/query ports:** Store ports use `StatePortDef` which extends `DirectedPort<StateService<...>, TName, "outbound">` with additional phantom symbols (`__stateType`, `__actionsType`). The `IsServiceCompatible` check at `merge.ts:732-734` uses structural subtyping (`TOverrideService extends TParentService`). This works correctly because the phantom symbols are optional properties and structural compatibility is maintained through the `StateService<TState, TActions>` interface.

**Finding: COMPATIBLE.** Override validation handles branded port types correctly because it checks structural compatibility of the service interface, not the port wrapper.

---

## 2. Dependency Declaration and Port Computation

### 2.1 Port Name Extraction

The type-level port name extraction uses `AdapterProvidesName<TAdapter>` and `AdapterRequiresNames<TAdapter>` from `@hex-di/core`. These rely on `__portName` which all new library ports provide (state ports via `DirectedPort`, query ports via `QueryPort extends Port`, saga ports via `SagaPort extends Port`, flow ports via `FlowPort` wrapping `Port`).

**Finding: COMPATIBLE.** All new port types carry `__portName` through their `Port` base.

### 2.2 Lazy Port Transformation

The `TransformLazyToOriginal` and `TransformLazyPortNamesToOriginal` types transform lazy port references back to their originals for dependency tracking. This is critical for cycle-breaking patterns.

**Compatibility concern:** If store, query, or saga ports use `lazyPort()` wrappers, the transformation must correctly handle the branded phantom types. Since lazy transformation operates on port names (strings), not port structures, the branded phantoms are irrelevant.

**Finding: COMPATIBLE.**

### 2.3 Query Port `dependsOn` Declarations

The query spec defines `dependsOn` as a structural data dependency between query ports (spec/query/03-query-ports.md:35-46). This dependency is declared at the port level, not the adapter level.

**GAP IDENTIFIED:** The current `@hex-di/graph` package validates dependencies declared via `adapter.requires` (port tuple). Query port `dependsOn` declarations are NOT automatically translated into adapter-level `requires`. This means:

- The GraphBuilder will not detect circular dependencies between query ports connected via `dependsOn`
- The GraphBuilder will not detect captive dependencies for `dependsOn` chains
- The topological sort in `traversal.ts:91-149` will not include `dependsOn` edges

**Recommendation:** The `@hex-di/query` package must translate `dependsOn` port references into the adapter's `requires` array during `createQueryAdapter()`. Alternatively, the graph inspection system could accept supplementary dependency edges, but this would be a more invasive change.

**Impact: MEDIUM.** Without this, query dependency chains bypass graph validation entirely.

---

## 3. Adapter Composition and Merging

### 3.1 Lifetime Validation

The captive dependency detection at `provide.ts:232-269` uses `LifetimeLevel` to compare adapter lifetimes:

- Singleton = 1 (longest)
- Scoped = 2
- Transient = 3 (shortest)

**Store adapters:** Default to `"scoped"` or `"singleton"` -- both are valid.
**Query adapters:** Default to `"singleton"` via `provideAsync()` which enforces singleton.
**Saga adapters:** The spec describes configurable lifetimes.
**Flow adapters:** Default to `"scoped"` (spec/flow/07-ports-and-adapters.md:209).

**Compatibility concern:** A flow adapter (scoped) depending on a query adapter (singleton) is valid (scoped can depend on singleton). A saga adapter (singleton) depending on a store adapter (scoped) would trigger a captive dependency error -- this is correct behavior and prevents bugs.

**Finding: COMPATIBLE.** The lifetime validation correctly enforces safety across all library combinations.

### 3.2 Async Adapter Handling

Query adapters are `"async"` factory kind. The `provideAsync()` path at `provide.ts:981-988` enforces singleton lifetime and tracks async ports via `TAsyncPorts`. The `Graph` type at `graph-types.ts:42` carries `TAsyncPorts` as a phantom parameter.

**Finding: COMPATIBLE.** The runtime can use `TAsyncPorts` to determine initialization order for query adapters.

### 3.3 Finalizer Awareness

Flow adapters include finalizers for disposal (spec/flow/07-ports-and-adapters.md:214-217). The graph inspection system tracks `portsWithFinalizers` at `inspector.ts:185-186` via `getPortsWithFinalizers()`. Store adapters with subscription cleanup may also need finalizers.

**Finding: COMPATIBLE.** The graph already tracks finalizer presence for disposal warning generation.

---

## 4. Type-Level Graph Validation

### 4.1 Compile-Time Cycle Detection

The `WouldCreateCycle` type traverses the dependency graph up to `MaxDepth` (default 50, configurable via `withMaxDepth<N>()`). The three-way result (`true` / `false` / `DepthExceededResult`) at `provide.ts:399-456` handles deep graphs gracefully.

**Compatibility concern for enterprise graphs:** Applications combining store, query, saga, and flow adapters could easily exceed 50 nodes. The `withMaxDepth<100>()` escape hatch exists, but users may not know to use it.

**Recommendation:** The inspection system's `typeComplexityScore` at `inspector.ts:179-184` should factor in the number of distinct library types (store/query/saga/flow) as a complexity multiplier, since mixed-library graphs tend to be deeper.

**Finding: COMPATIBLE with enhancement opportunity.**

### 4.2 Multi-Error Reporting

The `CollectAdapterErrors` type at `provide.ts:607-687` runs all validations in parallel (no short-circuiting) and returns a tuple of errors. The `MultiErrorMessage` formatter presents all issues at once.

**Finding: COMPATIBLE.** New library adapters benefit from multi-error reporting without changes.

### 4.3 Depth-Exceeded Warning Tracking

The `BuilderInternals` at `state.ts:182-213` tracks `TDepthExceededWarning` and `TUncheckedUsed` flags. These are preserved through merge operations via `UnifiedMergeInternals` at `state.ts:603-617`.

**Finding: COMPATIBLE.** Warning propagation works across merged sub-graphs from different libraries.

---

## 5. Introspection and Reporting

### 5.1 Graph Inspection (`inspectGraph()`)

The `inspectGraph()` function at `inspector.ts:110-237` produces a comprehensive `GraphInspection` object including:

- `ports: PortInfo[]` with direction, category, tags
- `dependencyMap` for visualization
- `disposalWarnings` for finalizer analysis
- `typeComplexityScore` for performance recommendations
- `suggestions` for actionable guidance

**Compatibility with new libraries:**

- **Store ports:** Use `DirectedPort<..., "outbound">` so `getPortDirection()` returns `"outbound"`. Category and tags from `createStatePort()` propagate through `getPortMetadata()`. **COMPATIBLE.**
- **Query ports:** Must expose direction via port metadata. The query spec doesn't explicitly state port direction. **GAP: Direction should be defined.**
- **Saga ports:** Use branded ports extending `Port<SagaExecutor<...>, TName>`. No explicit direction. **GAP: Direction should be defined.**
- **Flow ports:** Use `port<FlowService<...>>()` from core. No explicit direction. **GAP: Direction should be defined.**

**Recommendation:** Query ports, saga ports, and flow ports should use `DirectedPort` or explicitly set port metadata for direction, enabling the graph inspection filtering system (`filter.ts:131-153`) to categorize ports by hexagonal architecture role.

### 5.2 Port Filtering System

The `filterPorts()` function at `filter.ts:131-153` supports filtering by direction, category prefix, and tags. Convenience functions (`getInboundPorts`, `getOutboundPorts`, `getPortsByCategory`, `getPortsByTags`) enable structured queries.

**For new libraries:**

- Store ports with `category: "auth"` and `tags: ["security", "session"]` are discoverable via `getPortsByCategory(ports, "auth")`.
- Query ports should follow the same pattern for discoverability.
- Saga ports should use categories like `"saga"` or `"orchestration"`.

**Finding: COMPATIBLE.** The filtering system is generic and works with any port that provides metadata.

### 5.3 Graph Traversal Utilities

The `traversal.ts` module provides:

- `buildDependencyMap()` -- adjacency list construction
- `topologicalSort()` -- initialization ordering via Kahn's algorithm
- `getTransitiveDependencies()` / `getTransitiveDependents()` -- impact analysis
- `findDependencyPath()` -- path finding between ports
- `computeDependencyLayers()` / `getPortsByLayer()` -- parallel initialization layers

**These are critical for new library runtime needs:**

- **Flow's `DIEffectExecutor`** needs `container.resolveResult(port)` ordering, which relies on topological sort.
- **Saga's step ordering** may benefit from `computeDependencyLayers()` for parallel step execution.
- **Query's `dependsOn` chains** should be reflected in the dependency map for traversal utilities to work correctly (see Gap #2.3 above).

**Finding: COMPATIBLE, contingent on dependency completeness.**

### 5.4 VisualizableAdapter and Metadata

The `VisualizableAdapter` interface at `packages/core/src/inspection/inspector-types.ts:67-92` currently has:

- `portName`, `lifetime`, `factoryKind`, `dependencyNames`
- `origin` (own/inherited/overridden), `inheritanceMode`, `isOverride`

**GAP IDENTIFIED:** The flow spec (spec/flow/07-ports-and-adapters.md:184-187) requires `VisualizableAdapter` to support an optional `metadata?: Record<string, unknown>` property for flow adapter metadata enrichment (machine states, events, transitions). This property does NOT currently exist on `VisualizableAdapter`.

**Impact: HIGH for Vision Layer 1.** Without `metadata`, flow adapters cannot expose `FlowAdapterMetadata` through the graph inspection pipeline. The `FlowInspector.getStructuralMetadata()` query path (spec/flow/07-ports-and-adapters.md:191-194) would be blocked.

**Recommendation:** Add `readonly metadata?: Record<string, unknown>` to `VisualizableAdapter` in `@hex-di/core`. This is a non-breaking additive change. All new libraries (store, query, saga, flow) can then attach domain-specific metadata for graph-level introspection.

### 5.5 Summary Mode (`GraphSummary`)

The lightweight `GraphSummary` at `inspector.ts:244-301` provides quick health checks. It includes `adapterCount`, `asyncAdapterCount`, `isComplete`, `missingPorts`, `isValid`, `errors`, `provides`.

**Finding: COMPATIBLE.** New library adapters are counted and validated in summary mode without changes.

---

## 6. Gaps and Required Changes

### Gap 1: `VisualizableAdapter.metadata` Missing (HIGH)

**Location:** `packages/core/src/inspection/inspector-types.ts:67-92`
**Issue:** No `metadata` property exists on `VisualizableAdapter`.
**Required by:** Flow spec (07-ports-and-adapters.md:184), Vision Layer 1 (Structure).
**Fix:** Add `readonly metadata?: Record<string, unknown>` to the interface.
**Impact:** Non-breaking. All existing adapters continue to work (property is optional).

### Gap 2: Query `dependsOn` Not Reflected in Graph (MEDIUM)

**Location:** Graph validation pipeline (`provide.ts`, `traversal.ts`)
**Issue:** Query port `dependsOn` declarations are port-level metadata, not reflected in adapter `requires` arrays.
**Required by:** Query spec (03-query-ports.md:35-46).
**Fix:** `createQueryAdapter()` should translate `dependsOn` references into the adapter's `requires` array, or the graph should accept supplementary dependency declarations.
**Impact:** Without this, query dependency cycles and captive violations go undetected.

### Gap 3: Port Direction Not Defined for Query/Saga/Flow (LOW)

**Location:** Port creation in new libraries
**Issue:** Only store ports explicitly use `DirectedPort<..., "outbound">`. Query, saga, and flow ports default to no direction metadata.
**Required by:** Graph inspection filtering (`filter.ts`), hexagonal architecture consistency.
**Fix:** New library port factories should use `DirectedPort` or set direction in port metadata.
**Impact:** Affects filtering and reporting, not validation.

### Gap 4: No Library-Type-Aware Complexity Scoring (LOW)

**Location:** `packages/graph/src/graph/inspection/complexity.ts`
**Issue:** `typeComplexityScore` doesn't account for mixed-library graph complexity.
**Fix:** Consider factoring in adapter diversity (number of distinct library types) as a complexity dimension.
**Impact:** Enhancement, not a blocker.

---

## 7. Strengths

1. **Type-level validation is comprehensive.** The 5-step validation pipeline (duplicate, self-dep, cycle, forward-captive, reverse-captive) catches real bugs at compile time for all adapter types.

2. **Merge semantics are robust.** The `UnifiedMergeInternals` pattern with pre-resolved `maxDepth` eliminates code duplication and handles all merge scenarios (symmetric, first, second, min).

3. **Inspection is rich.** The `GraphInspection` interface provides 18+ fields covering every aspect of graph health, from disposal warnings to unnecessary lazy ports.

4. **Traversal utilities are complete.** The traversal module covers all common graph analysis operations: topological sort, transitive closure, path finding, layer computation, common dependencies.

5. **Builder type state is well-encapsulated.** The `BuilderInternals` grouping reduces IDE tooltip noise from 8 parameters to 5, while the Get*/With* lens pattern makes state transformations composable.

6. **Error messages are actionable.** Error types like `InvalidOverrideErrorWithAvailable` include available ports and "did you mean?" suggestions.

---

## 8. Conclusion

The `@hex-di/graph` package is architecturally sound and largely compatible with all new ecosystem libraries. The primary gap is the missing `metadata` property on `VisualizableAdapter`, which blocks the Vision's Layer 1 (Structure) introspection capabilities for flow adapters and would benefit all new libraries. The secondary gap around query `dependsOn` dependency tracking should be addressed at the `@hex-di/query` adapter layer rather than in the graph package itself. All other composition patterns, validation checks, and introspection features work correctly with the new library adapter types.
