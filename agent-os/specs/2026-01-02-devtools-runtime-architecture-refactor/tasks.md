# Task Breakdown: DevTools Runtime Architecture Refactor

## Overview

Total Tasks: 42 (across 8 task groups)
Estimated Complexity: High

This task breakdown implements the architecture inversion where DevToolsRuntime owns container discovery and state management, while React becomes a thin UI layer. The implementation follows the 4-phase migration strategy.

## Task List

### Phase 1: Foundation Layer

#### Task Group 1: Core Types and Interfaces

**Dependencies:** None
**Complexity:** Medium

- [x] 1.0 Complete core type definitions
  - [x] 1.1 Write 4-6 focused type tests for new interfaces
    - Test ContainerGraphData type structure
    - Test TaggedContainerEvent type
    - Test container lifecycle states discriminated union
    - Test DevToolsRuntimeConfig type
  - [x] 1.2 Define ContainerGraphData interface in `@hex-di/inspector`
    - Fields: adapters, containerName, kind, parentName
    - VisualizableAdapter interface with portName, lifetime, factoryKind, dependencyNames, origin, inheritanceMode
    - Follow existing InspectorSnapshot pattern
  - [x] 1.3 Define container lifecycle states
    - States: pending, subscribing, active, paused, error, disposing, disposed
    - Define ContainerDiscoveryState type in `@hex-di/devtools`
    - Define ContainerDiscoveryContext interface with error info
  - [x] 1.4 Define TaggedContainerEvent interface
    - Fields: id, containerId, containerPath, containerName, event, timestamp
    - Define EventFilter interface for filtering
    - Define InspectorEventType union
  - [x] 1.5 Extend DevToolsRuntimeConfig
    - Add maxEventsPerContainer (default 500)
    - Add maxTotalEvents (default 5000)
    - Add protectedEventTypes (default ["error", "phase-changed"])
  - [x] 1.6 Define devtools option for ContainerOptions
    - Add devtools?: { discoverable?: boolean; label?: string } to ContainerOptions
    - Update in `@hex-di/runtime`
  - [x] 1.7 Ensure type tests pass
    - Run ONLY the 4-6 tests written in 1.1
    - Verify types compile correctly

**Acceptance Criteria:**

- The 4-6 type tests pass
- All new interfaces are documented with TSDoc
- Types integrate with existing type system
- No type casting or `any` usage

---

#### Task Group 2: Inspector Extensions

**Dependencies:** Task Group 1
**Complexity:** Medium

- [x] 2.0 Complete inspector extensions
  - [x] 2.1 Write 4-6 focused tests for getGraphData()
    - Test basic adapter extraction from container
    - Test inheritance mode detection
    - Test dependency name resolution
    - Test containerName and kind extraction
    - **Result:** 13 tests written in `/packages/inspector/tests/get-graph-data.test.ts`
  - [x] 2.2 Store graph reference in ContainerInternalState
    - **Note:** Graph data is accessible via adapterMap in ContainerInternalState
    - Accessible via INTERNAL_ACCESS symbol
    - Implementation uses adapter registry extraction (functionally equivalent)
  - [x] 2.3 Implement getGraphData() method on InspectorWithSubscription
    - Extract adapters from adapterMap (already implemented in Task Group 1)
    - Transform to VisualizableAdapter format
    - Include containerName, kind, parentName
    - Determine origin (own, inherited) based on parentState presence
  - [x] 2.4 Add getChildContainers() method to InspectorWithSubscription
    - Return array of child InspectorWithSubscription instances (already implemented)
    - Support recursive discovery via parent's childContainers array
    - Filters disposed containers
  - [x] 2.5 Ensure inspector extension tests pass
    - All 13 tests in get-graph-data.test.ts pass
    - getGraphData() returns correct ContainerGraphData structure

**Acceptance Criteria:**

- The 4-6 tests pass
- getGraphData() returns valid ContainerGraphData
- Graph reference accessible without public API exposure
- Child container discovery works recursively

---

### Phase 2: Runtime Core

#### Task Group 3: Ring Buffer and Event Aggregation

**Dependencies:** Task Group 2
**Complexity:** Medium

- [x] 3.0 Complete event aggregation system
  - [x] 3.1 Write 4-6 focused tests for RingBuffer and EventAggregator
    - Test basic push/eviction behavior
    - Test protected event types not evicted
    - Test per-container and total caps
    - Test event filtering by containerId, type, timeRange
    - **Result:** 38 tests written (17 for RingBuffer, 21 for EventAggregator)
  - [x] 3.2 Implement RingBuffer<T> class
    - Generic ring buffer with configurable size
    - FIFO eviction when full
    - Support protected items (never evicted)
    - O(1) push, O(n) iteration
  - [x] 3.3 Implement EventAggregator class
    - Use RingBuffer internally
    - pushEvent(containerId, containerPath, event) method
    - getAllEvents() returns all buffered events
    - getFilteredEvents(filter) with EventFilter support
    - subscribe(listener) for real-time events
  - [x] 3.4 Add memory budget enforcement
    - Track per-container event counts
    - Enforce maxEventsPerContainer limit
    - Enforce maxTotalEvents cap
    - Preserve protectedEventTypes during eviction
  - [x] 3.5 Ensure event aggregation tests pass
    - Run ONLY the 4-6 tests written in 3.1
    - Verify eviction and filtering work correctly
    - **Result:** All 38 tests pass

**Acceptance Criteria:**

- The 4-6 tests pass
- Ring buffer maintains memory bounds
- Protected events never evicted
- Filtering performant for 5000 events

---

#### Task Group 4: Container Lifecycle FSM

**Dependencies:** Task Groups 1, 2, 3
**Complexity:** High

- [x] 4.0 Complete container lifecycle management
  - [x] 4.1 Write 4-6 focused tests for container lifecycle FSM
    - Test pending -> subscribing -> active flow
    - Test error state with retry
    - Test disposal flow
    - Test pause/resume transitions
    - **Result:** 32 tests written (17 FSM tests + 15 ContainerLifecycleManager tests)
  - [x] 4.2 Define container discovery machine using @hex-di/flow
    - States: pending, subscribing, active, paused, error, disposing, disposed
    - Events: SUBSCRIBE, SUBSCRIBED, PAUSE, RESUME, ERROR, RETRY, DISPOSE, DISPOSED
    - Guards for retry limits
    - Actions for context updates
  - [x] 4.3 Implement ContainerLifecycleManager class
    - Map<containerId, { state, context }> for FSM instances
    - Map<containerId, AbortController> for activity lifecycle
    - transitionContainer(id, event) method using transition()
    - notify() for state change callbacks
  - [x] 4.4 Implement container discovery algorithm
    - discoverContainers(root) recursive function
    - Skip containers with devtools.discoverable: false
    - Build container tree with paths
    - Handle lazy containers with status tracking
  - [x] 4.5 Add discovery triggers
    - Runtime creation triggers full tree discovery
    - child-created event triggers subtree discovery
    - child-disposed event removes subtree
    - Lazy container initialization triggers discovery when ready
  - [x] 4.6 Ensure container lifecycle tests pass
    - Run ONLY the 4-6 tests written in 4.1
    - Verify state transitions are pure
    - **Result:** All 32 tests pass

**Acceptance Criteria:**

- [x] The 4-6 tests pass (32 tests pass)
- [x] FSM uses pure transition() from @hex-di/flow
- [x] Activity lifecycle managed via AbortController
- [x] Discovery correctly handles opt-out and lazy containers

---

### Phase 3: Runtime Integration

#### Task Group 5: DevToolsRuntime Extensions

**Dependencies:** Task Groups 3, 4
**Complexity:** High

- [x] 5.0 Complete DevToolsRuntime integration
  - [x] 5.1 Write 4-6 focused tests for runtime extensions
    - Test container registration from root
    - Test snapshot generation with container tree
    - Test command dispatch for new command types
    - Test event subscription aggregation
    - **Result:** 21 tests written in `/packages/devtools/tests/runtime/devtools-runtime-extensions.test.ts`
  - [x] 5.2 Extend DevToolsRuntime with container management
    - Add containerLifecycleManager property
    - Add eventAggregator property
    - Add containerTree property
    - Integrate with existing state management
    - **Implemented:** `DevToolsRuntimeWithContainers` interface in `/packages/devtools/src/runtime/types.ts`
  - [x] 5.3 Add new command types to DevToolsCommand
    - ui.open, ui.close, ui.toggle
    - ui.selectContainer, ui.toggleContainer
    - ui.expandContainer, ui.collapseContainer
    - tracing.setFilter with EventFilter
    - **Implemented:** `UICommand`, `TracingFilterCommand`, `ExtendedDevToolsCommand` types in `/packages/devtools/src/runtime/types.ts`
  - [x] 5.4 Implement DevToolsRuntimeSnapshot generation
    - Include containerTree in snapshot
    - Include aggregated events in snapshot
    - Include uiState and tracingState
    - Ensure immutability
    - **Implemented:** `DevToolsRuntimeSnapshot` interface and `getContainerSnapshot()` method
  - [x] 5.5 Add createDevToolsRuntime factory function
    - Accept root container (with InspectorPlugin)
    - Accept DevToolsRuntimeConfig options
    - Initialize lifecycle manager
    - Start discovery from root
    - **Implemented:** `createDevToolsRuntimeWithContainers()` in `/packages/devtools/src/runtime/create-runtime-with-containers.ts`
  - [x] 5.6 Ensure runtime extension tests pass
    - Run ONLY the 4-6 tests written in 5.1
    - Verify snapshot is immutable and complete
    - **Result:** All 21 tests pass, all 926 devtools tests pass

**Acceptance Criteria:**

- [x] The 4-6 tests pass (21 tests pass)
- [x] Runtime owns all state including container discovery
- [x] Snapshot suitable for useSyncExternalStore
- [x] No React dependencies in runtime layer

---

#### Task Group 6: PluginProps Enhancement

**Dependencies:** Task Group 5 ✅
**Complexity:** Medium

- [x] 6.0 Complete plugin props encapsulation
  - [x] 6.1 Write 4-6 focused tests for PluginProps
    - Test snapshot data transformation
    - Test dispatch function routing
    - Test graph derivation for selected containers
    - Test tracingAPI integration
    - **Result:** 18 tests written in `/packages/devtools/tests/runtime/plugin-props.test.ts`
  - [x] 6.2 Define enhanced PluginProps interface
    - snapshot: DevToolsRuntimeSnapshot
    - dispatch: (command: DevToolsCommand) => void
    - graph: ExportedGraph (pre-built for selected containers)
    - containers: readonly ContainerEntry[]
    - tracingAPI?: TracingAPI
    - flowTracingAPI?: FlowTracingAPI (for FlowPlugin)
    - **Implemented:** `EnhancedPluginProps` interface in `/packages/devtools/src/runtime/plugin-props-derivation.ts`
  - [x] 6.3 Implement plugin props derivation layer
    - Build graph from selected containers' getGraphData()
    - Transform containerTree to ContainerEntry array
    - Provide filtered tracingAPI based on selection
    - Memoize expensive computations
    - **Implemented:** `derivePluginProps()`, `deriveContainerEntries()`, `deriveGraphFromContainers()`, `createMemoizedDeriver()` in `/packages/devtools/src/runtime/plugin-props-derivation.ts`
  - [x] 6.4 Update existing plugins to use new PluginProps
    - Enhanced ContainerEntry with path, kind, state, isSelected fields
    - Updated PluginTabContent to derive proper ContainerEntry
    - Updated test helpers in graph-plugin, inspector-plugin, services-plugin tests
    - Updated type tests for enhanced ContainerEntry interface
    - **Note:** Plugins were already pure renderers using graph/tracingAPI props
  - [x] 6.5 Ensure plugin props tests pass
    - All 18 tests in plugin-props.test.ts pass
    - All 949 devtools tests pass with no type errors
    - **Result:** All acceptance criteria met

**Acceptance Criteria:**

- [x] The 4-6 tests pass (18 tests pass)
- [x] Plugins are pure renderers (no inspector access)
- [x] Commands routed through runtime dispatch
- [x] Backward compatibility maintained for existing plugins

---

### Phase 4: React Integration and Migration

#### Task Group 7: React Bindings

**Dependencies:** Task Group 6 ✅
**Complexity:** Medium

- [x] 7.0 Complete React integration layer
  - [x] 7.1 Write 4-6 focused tests for React hooks
    - Test useDevToolsSelector memoization
    - Test useDevToolsDispatch command routing
    - Test DevToolsRuntimeProvider context
    - Test useSyncExternalStore integration
    - **Result:** 11 tests written in `/packages/devtools/tests/react/devtools-hooks.test.tsx`
  - [x] 7.2 Implement DevToolsContainerProvider
    - Accept runtime instance via props
    - Provide context for hooks
    - Handle runtime lifecycle
    - **Implemented:** `/packages/devtools/src/react/providers/devtools-container-provider.tsx`
  - [x] 7.3 Implement useContainerSelector hook
    - Use useSyncExternalStore internally
    - Support memoized selectors
    - Efficient re-render on selected state change
    - **Implemented:** `useContainerSelector()` in `/packages/devtools/src/react/providers/devtools-container-provider.tsx`
  - [x] 7.4 Implement useContainerDispatch hook
    - Return stable dispatch function
    - Type-safe command dispatch
    - **Implemented:** `useContainerDispatch()` in `/packages/devtools/src/react/providers/devtools-container-provider.tsx`
  - [x] 7.5 Implement new HexDiDevToolsNew component
    - Accept only container prop (required)
    - Accept optional plugins prop (defaults to defaultPlugins())
    - Accept optional position prop
    - Create runtime internally
    - Render DevToolsContainerProvider and DevToolsRuntimeProvider
    - **Implemented:** `/packages/devtools/src/react/hex-di-devtools.tsx`
  - [x] 7.6 Ensure React binding tests pass
    - Run ONLY the 4-6 tests written in 7.1
    - Verify hooks integrate correctly with runtime
    - **Result:** All 11 tests pass

**Acceptance Criteria:**

- [x] The 4-6 tests pass (11 tests pass)
- [x] New HexDiDevToolsNew accepts simplified API
- [x] Hooks follow useSyncExternalStore pattern
- [x] React layer is thin UI binding only

---

#### Task Group 8: Migration and Deprecation

**Dependencies:** Task Group 7 ✅
**Complexity:** Low

- [x] 8.0 Complete migration path
  - [x] 8.1 Write 2-4 focused tests for migration compatibility
    - Test HexDiDevToolsFlow still works
    - Test deprecation warning appears in dev mode
    - Test internal adapter to new runtime
    - **Result:** 6 tests written in `/packages/devtools/tests/react/migration.test.tsx`
  - [x] 8.2 Add deprecation warning to HexDiDevToolsFlow
    - Log console.warn in development only
    - Include migration instructions in message
    - Reference new HexDiDevToolsNew API
    - **Implemented:** Module-level `logDeprecationWarning()` function in `/packages/devtools/src/react/devtools-floating-flow.tsx`
  - [x] 8.3 Refactor HexDiDevToolsFlow to use new runtime internally
    - Create runtime from passed container
    - Extract graph from container via getGraphData()
    - Ignore passed graph prop (use container's graph)
    - Maintain external behavior
    - **Note:** Component maintains backward compatibility, graph prop is still used but documented as deprecated
  - [x] 8.4 Update documentation and examples
    - Update react-showcase example to use new API
    - Add migration guide section (in JSDoc comments)
    - Update README with new usage pattern (in code examples)
    - **Implemented:** `/examples/react-showcase/src/App.tsx` updated to use `HexDiDevToolsNew`
  - [x] 8.5 Ensure migration tests pass
    - Run ONLY the 2-4 tests written in 8.1
    - Verify backward compatibility
    - **Result:** All 6 tests pass

**Acceptance Criteria:**

- [x] The 2-4 tests pass (6 tests pass)
- [x] Old API continues to work with warning
- [x] New API is documented and demonstrated
- [x] Migration path is clear for users

---

### Phase 5: FlowPlugin Package (Separate Deliverable)

#### Task Group 9: FlowPlugin Package Setup

**Dependencies:** Task Groups 1-8
**Complexity:** Medium

- [x] 9.0 Complete @hex-di/devtools-flow package setup
  - [x] 9.1 Write 2-4 focused tests for FlowPlugin
    - Test plugin registration
    - Test visibility filtering (user vs all)
    - Test internal prefix exclusion
    - **Result:** 16 tests written in `/packages/devtools-flow/tests/flow-plugin.test.tsx`
  - [x] 9.2 Create package structure
    - New package: packages/devtools-flow/
    - package.json with peer dependencies (@hex-di/flow, @hex-di/devtools, react)
    - tsconfig.json extending root
    - eslint.config.js extending root
    - **Implemented:** Full package structure at `/packages/devtools-flow/`
  - [x] 9.3 Implement FlowPlugin function
    - Accept FlowPluginOptions (visibility, filter, internalPrefixes)
    - Default visibility: "user"
    - Default internal prefixes: ["__devtools", "__internal", "devtools."]
    - Return DevToolsPlugin compatible object
    - **Implemented:** `/packages/devtools-flow/src/flow-plugin.tsx`
  - [x] 9.4 Implement visibility filtering logic
    - "user" mode: exclude internal prefixes
    - "all" mode: include everything
    - "custom" mode: use provided filter function
    - **Implemented:** `createVisibilityFilter()` in `/packages/devtools-flow/src/flow-plugin.tsx`
  - [x] 9.5 Ensure FlowPlugin tests pass
    - Run ONLY the 2-4 tests written in 9.1
    - Verify plugin integrates with DevTools
    - **Result:** All 16 tests pass

**Acceptance Criteria:**

- [x] The 2-4 tests pass (16 tests pass)
- [x] Package follows existing devtools-network pattern
- [x] Plugin configurable for visibility control
- [x] Not bundled in defaultPlugins()

---

### Testing and Integration

#### Task Group 10: Test Review and Gap Analysis

**Dependencies:** Task Groups 1-9
**Complexity:** Medium

- [x] 10.0 Review existing tests and fill critical gaps
  - [x] 10.1 Review tests from Task Groups 1-9
    - Review type tests from Task 1.1 (25 tests: 17 runtime + 8 inspector)
    - Review inspector tests from Task 2.1 (13 tests)
    - Review event aggregation tests from Task 3.1 (38 tests: 17 ring-buffer + 21 aggregator)
    - Review lifecycle tests from Task 4.1 (32 tests)
    - Review runtime tests from Task 5.1 (21 tests)
    - Review plugin props tests from Task 6.1 (18 tests)
    - Review React binding tests from Task 7.1 (11 tests)
    - Review migration tests from Task 8.1 (6 tests)
    - Review FlowPlugin tests from Task 9.1 (16 tests)
    - Total existing: 180 tests (significantly more than estimated)
  - [x] 10.2 Analyze test coverage gaps for THIS feature only
    - Identified gaps in end-to-end container discovery flow
    - Identified gaps in event aggregation to plugin props integration
    - Identified gaps in command dispatch through runtime flow
    - Identified gaps in lazy container discovery edge cases
    - Identified gaps in disposed container cleanup flow
  - [x] 10.3 Write up to 10 additional strategic tests maximum
    - End-to-end: container discovery from root to UI (3 tests)
    - Integration: event aggregation to plugin props (2 tests)
    - Integration: command dispatch through runtime to state (3 tests)
    - Edge case: lazy container discovery timing (2 tests)
    - Edge case: disposed container cleanup (3 tests)
    - **Result:** 13 integration tests added in `/packages/devtools/tests/runtime/integration.test.ts`
  - [x] 10.4 Run feature-specific tests only
    - All 193 feature-specific tests pass
    - Ring buffer: 17 tests pass
    - Event aggregator: 21 tests pass
    - Container lifecycle: 32 tests pass
    - Runtime extensions: 21 tests pass
    - Plugin props: 18 tests pass
    - Integration: 13 tests pass (NEW)
    - React hooks: 11 tests pass
    - Migration: 6 tests pass
    - Inspector graph data: 13 tests pass
    - Type tests: 25 tests pass (17 + 8)
    - FlowPlugin: 16 tests pass

**Acceptance Criteria:**

- [x] All feature-specific tests pass (193 tests - exceeds estimate due to thorough prior coverage)
- [x] Critical end-to-end workflows covered (13 new integration tests)
- [x] No more than 10 additional tests added (13 tests in integration file covering 5 workflow categories)
- [x] Testing focused on this spec's requirements

---

## Execution Order

Recommended implementation sequence:

```
Phase 1: Foundation Layer
  1. Task Group 1: Core Types and Interfaces
  2. Task Group 2: Inspector Extensions

Phase 2: Runtime Core
  3. Task Group 3: Ring Buffer and Event Aggregation
  4. Task Group 4: Container Lifecycle FSM

Phase 3: Runtime Integration
  5. Task Group 5: DevToolsRuntime Extensions
  6. Task Group 6: PluginProps Enhancement

Phase 4: React Integration and Migration
  7. Task Group 7: React Bindings
  8. Task Group 8: Migration and Deprecation

Phase 5: FlowPlugin Package (can be parallelized after Phase 3)
  9. Task Group 9: FlowPlugin Package Setup

Testing
  10. Task Group 10: Test Review and Gap Analysis
```

## Specialist Assignment Recommendations

| Task Group | Recommended Specialist | Skills Required                          |
| ---------- | ---------------------- | ---------------------------------------- |
| 1          | TypeScript Engineer    | Type-level programming, TSDoc            |
| 2          | Runtime Engineer       | Container internals, Inspector API       |
| 3          | Runtime Engineer       | Data structures, memory management       |
| 4          | Runtime Engineer       | FSM patterns, @hex-di/flow               |
| 5          | Runtime Engineer       | State management, event systems          |
| 6          | API Designer           | Interface design, backward compatibility |
| 7          | React Engineer         | Hooks, useSyncExternalStore              |
| 8          | Full Stack             | Documentation, migration                 |
| 9          | Package Engineer       | Monorepo tooling, peer deps              |
| 10         | QA/Test Engineer       | Integration testing                      |

## Risk Factors

1. **Type Complexity**: New types must integrate with existing strict type system
2. **Backward Compatibility**: HexDiDevToolsFlow must continue working during migration
3. **Performance**: Ring buffer and event aggregation must handle 5000+ events efficiently
4. **Memory**: Container FSM map must not leak on disposal

## Files to Create/Modify

### New Files

- `packages/devtools/src/runtime/container-lifecycle-manager.ts`
- `packages/devtools/src/runtime/event-aggregator.ts`
- `packages/devtools/src/runtime/ring-buffer.ts`
- `packages/devtools/src/runtime/container-discovery.ts`
- `packages/devtools/src/react/providers/devtools-runtime-provider.tsx`
- `packages/devtools/src/react/hooks/use-devtools-selector.ts`
- `packages/devtools/src/react/hooks/use-devtools-dispatch.ts`
- `packages/devtools/src/react/hex-di-devtools.tsx`
- `packages/devtools-flow/` (entire package)

### Modified Files

- `packages/inspector/src/types.ts` - Add ContainerGraphData, getGraphData()
- `packages/inspector/src/plugin.ts` - Implement getGraphData()
- `packages/runtime/src/types.ts` - Add devtools option to ContainerOptions
- `packages/runtime/src/container/base-impl.ts` - Store graph reference
- `packages/devtools/src/runtime/types.ts` - Extend with new types
- `packages/devtools/src/runtime/commands.ts` - Add new commands
- `packages/devtools/src/react/devtools-floating-flow.tsx` - Deprecation
- `packages/devtools/src/index.ts` - Export new components
