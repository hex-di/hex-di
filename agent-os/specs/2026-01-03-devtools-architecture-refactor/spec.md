# Specification: DevTools Architecture Refactor

## Goal

Consolidate DevTools state management into a single source of truth using `@hex-di/flow` as the runtime core, eliminate redundant abstractions (ADTs, multiple providers), and extract graph visualization as a reusable package.

## User Stories

- As a DevTools consumer, I want a single `DevToolsProvider` with unified hooks so that I have one clear pattern for integrating DevTools into my app
- As a library maintainer, I want the graph visualization to be a standalone package so that it can be reused in other contexts outside DevTools

## Specific Requirements

**Unified DevToolsProvider (Clean Implementation)**

- Single provider component accepting `DevToolsFlowRuntime` instance as prop
- Expose unified `useDevToolsRuntime()` hook via `useSyncExternalStore`
- Internally coordinate three separate FlowService instances
- DELETE `DevToolsContainerProvider` entirely (not deprecate)
- DELETE `DevToolsFlowProvider` entirely (not deprecate)
- Provider is thin adapter layer with no state management logic
- Follow Inversion of Control pattern (runtime created at composition root)
- No backward compatibility shims, migration helpers, or deprecation warnings

**DevToolsFlowRuntime Implementation**

- Singleton coordinator class owning three FlowService instances
- Unified `subscribe()` and `getSnapshot()` API for React 18 compatibility
- Handle cross-machine communication via event forwarding
- Use DIEffectExecutor from `@hex-di/flow` for DI-integrated effect execution
- Expose `dispatch()` method for sending events to appropriate machines
- DI Graph structure using FlowAdapter pattern for each machine

**ContainerTreeMachine**

- States: `idle`, `discovering`, `ready`, `error`
- Manages container hierarchy discovery and lifecycle
- Context holds `containerTree`, `containerStates`, `expandedIds`
- Events: `DISCOVER`, `CONTAINER_ADDED`, `CONTAINER_REMOVED`, `TOGGLE_EXPAND`
- Spawns `ContainerDiscoveryActivity` on transition to `discovering`
- Spawns `InspectorSubscriptionActivity` per container when added

**TracingMachine**

- States: `disabled`, `idle`, `tracing`, `paused`
- Manages trace collection lifecycle
- Context holds `traces`, `filter`, `sortOrder`, `selectedTraceId`
- Events: `ENABLE`, `DISABLE`, `START`, `PAUSE`, `RESUME`, `STOP`, `CLEAR`, `TRACE_RECEIVED`
- Spawns `TraceCollectorActivity` on transition to `tracing`
- Leverage existing `tracingMachine` at `/packages/devtools/src/machines/tracing.machine.ts`

**DevToolsUIMachine**

- States: `closed`, `opening`, `open`, `selecting`
- Manages panel visibility, tab selection, panel size
- Context holds `activeTab`, `selectedIds`, `panelSize`, `isFullscreen`, `position`
- Events: `OPEN`, `CLOSE`, `TOGGLE`, `SELECT_TAB`, `SELECT_CONTAINER`, `RESIZE`
- Leverage existing `devToolsUIMachine` at `/packages/devtools/src/machines/devtools-ui.machine.ts`
- Handle localStorage persistence via entry actions (not effects)

**Activity Implementations**

- `ContainerDiscoveryActivity`: Initial tree discovery using InspectorPlugin
- `InspectorSubscriptionActivity`: Per-container event subscription with cleanup
- `TraceCollectorActivity`: Trace collection with filter support
- All activities use `@hex-di/flow` Effect.spawn/Effect.stop patterns
- Activities receive dependencies via DIEffectExecutor port resolution
- Use AbortSignal for cancellation, EventSink for emitting events

**ADT Removal**

- Delete `/packages/devtools/src/react/types/adt.ts` entirely (262 lines)
- Migrate `use-container-inspector.ts`: Change `Option<InspectorWithSubscription>` to `InspectorWithSubscription | null`
- Migrate `use-inspector-snapshot.ts`: Change `isSome()` checks to null checks
- Migrate `use-container-phase.ts`: Change `isSome()` checks to null checks
- Update `/packages/devtools/src/react/index.ts` to remove ADT exports
- TypeScript `strictNullChecks` provides equivalent compile-time safety

**Graph Visualization Extraction**

- Create new package `@hex-di/graph-viz` in `/packages/graph-viz/`
- Generic `TMetadata` type parameter for domain-agnostic node metadata
- Render props pattern: `renderNode`, `renderTooltip`, `renderEdge`
- Core components: `GraphRenderer`, `GraphNode`, `GraphEdge`, `GraphControls`
- Layout algorithm in `graph-layout.ts` remains generic
- Peer dependencies: `react`, `dagre` (D3 removed - use native SVG)
- DevTools imports from `@hex-di/graph-viz` and provides mapping layer

**DevTools Graph Integration Layer**

- `extractDIMetadata()`: Convert DevTools node to graph-viz metadata
- `renderDINode()`: Render prop for DevTools-specific node styling
- `renderDITooltip()`: Render prop for ownership badges, lifetime icons
- Import graph components from `@hex-di/graph-viz`
- Clean dependency: devtools depends on graph-viz (no re-export)

**devtools-core Alignment**

- Review `/packages/devtools-core/src/types/` for similar ADT patterns
- Align with native TypeScript patterns if ADTs found
- Maintain stable public API for types like `ExportedGraph`, `TracingAPI`
- Keep `ContainerKind`, `ServiceOrigin`, `InheritanceMode` types stable

**Clean Hook API (No Backward Compatibility)**

- Single entry: `useDevToolsRuntime()` returns full `DevToolsSnapshot`
- Selector: `useDevToolsSelector(fn)` for performance-critical selections
- Dispatch: `useDevToolsDispatch()` returns stable dispatch function
- DELETE all old hooks entirely (no migration shims):
  - `useContainerRuntime()` - DELETE
  - `useContainerSnapshot()` - DELETE
  - `useContainerSnapshotOptional()` - DELETE
  - `useContainerSelector()` - DELETE
  - `useContainerDispatch()` - DELETE
  - `useDevToolsFlow()` - DELETE
  - `useDevToolsUI()` - DELETE (consolidated into unified hook)
  - `useDevToolsTracing()` - DELETE (consolidated into unified hook)
  - `useRegisterContainerFlow()` - DELETE (already deprecated)

**Plugin Integration Seams**

- Modify `plugin-props-derivation.ts` to derive props from unified snapshot
- Modify `plugin-tab-content.tsx` to use new hook names
- Keep `PluginProps` interface stable as public API
- Do NOT modify the 4 built-in plugin components

## Existing Code to Leverage

**@hex-di/flow Package**

- `FlowService` provides `subscribe()`/`getSnapshot()` API for `useSyncExternalStore`
- `createFlowAdapter()` for DI integration of machines
- `DIEffectExecutor` executes effects with port resolution from container
- `ActivityManager` handles spawn/stop lifecycle of activities
- `transition()` pure function for state machine interpretation

**Existing Machine Definitions**

- `/packages/devtools/src/machines/devtools-ui.machine.ts` (18KB) - UI state machine
- `/packages/devtools/src/machines/tracing.machine.ts` (18KB) - Tracing state machine
- Refactor to use `@hex-di/flow` createMachine API directly
- Preserve state names and event names for continuity

**Existing Activities**

- `/packages/devtools/src/activities/inspector-subscription.activity.ts` - Template for activity pattern
- `/packages/devtools/src/activities/trace-collector.activity.ts` - Trace collection logic
- Refactor to use `@hex-di/flow` activity() factory with typed events

**Graph Visualization Components**

- `/packages/devtools/src/react/graph-visualization/` (10 files, ~70KB)
- `graph-layout.ts` algorithm is already generic, move as-is
- `types.ts` has DevTools-specific types - split generic vs domain-specific
- `graph-renderer.tsx`, `graph-node.tsx`, `graph-edge.tsx` - extract core, keep DI styling

**Container Provider Pattern**

- `/packages/devtools/src/react/providers/devtools-container-provider.tsx` - `useSyncExternalStore` integration pattern
- Reuse the selector hook pattern with ref-based memoization
- Reuse the optional snapshot hook pattern

## Code to DELETE (No Backward Compatibility)

**Provider Files - DELETE Entirely:**

- `/packages/devtools/src/react/providers/devtools-flow-provider.tsx` - Old Flow provider
- `/packages/devtools/src/react/providers/devtools-container-provider.tsx` - Old container provider
- `/packages/devtools/src/react/providers/index.ts` - Rewrite from scratch

**Runtime Files - DELETE Entirely:**

- `/packages/devtools/src/runtime/create-runtime-with-containers.ts` - Old runtime factory
- `/packages/devtools/src/runtime/container-lifecycle-manager.ts` - Replaced by ContainerTreeMachine
- `/packages/devtools/src/runtime/container-discovery.ts` - Moved to ContainerDiscoveryActivity
- `/packages/devtools/src/runtime/event-aggregator.ts` - Replaced by machine context
- `/packages/devtools/src/runtime/ring-buffer.ts` - No longer needed

**Type Files - DELETE Entirely:**

- `/packages/devtools/src/react/types/adt.ts` - ADT types (Option, Result)

**Hook Files - DELETE or Rewrite:**

- `/packages/devtools/src/react/hooks/use-container-inspector.ts` - Rewrite without Option<T>
- `/packages/devtools/src/react/hooks/use-inspector-snapshot.ts` - Rewrite without isSome()
- `/packages/devtools/src/react/hooks/use-container-phase.ts` - Rewrite without isSome()
- `/packages/devtools/src/react/hooks/use-container-scope-tree.ts` - Consolidate into runtime
- `/packages/devtools/src/react/hooks/use-register-container.ts` - DELETE (deprecated)

**Context Files - DELETE:**

- `/packages/devtools/src/react/context/container-tree-context.ts` - Replaced by runtime
- `/packages/devtools/src/react/context/index.ts` - Rewrite

**Machine Files - KEEP but Refactor:**

- `/packages/devtools/src/machines/devtools-ui.machine.ts` - Refactor to @hex-di/flow API
- `/packages/devtools/src/machines/tracing.machine.ts` - Refactor to @hex-di/flow API
- `/packages/devtools/src/machines/container-discovery.machine.ts` - Already deleted, create new ContainerTreeMachine

**Graph Visualization - MOVE to @hex-di/graph-viz:**

- `/packages/devtools/src/react/graph-visualization/` - Extract generic parts
- Keep DI-specific rendering in devtools as mapping layer

## Out of Scope

- `/packages/devtools-network/` - Stable protocol boundary, no React dependencies
- Plugin system core (`/packages/devtools/src/plugins/`) - Already follows Clean Architecture
- The 4 built-in plugin components (graph, services, inspector, tracing)
- `PluginProps` interface modifications - Maintain as stable public API
- Event sourcing for time-travel debugging - Future spec
- React Server Components support - Future spec
- WebSocket-based remote debugging - Future spec
- Performance profiling instrumentation - Future spec
- Browser extension integration - Future spec
- Visual regression testing setup - Future spec
