# Spec Requirements: DevTools Architecture Refactor

## Initial Description

Apply architectural recommendations to simplify the DevTools package. The current architecture has several identified issues:

1. **Multiple overlapping state systems**: DevToolsRuntimeImpl, DevToolsFlowProvider, and FSMs all manage state
2. **Three separate providers**: RuntimeProvider, ContainerProvider, and FlowProvider create confusion
3. **Over-engineered ADTs**: Option<T> and Result<T,E> patterns when TypeScript native patterns suffice
4. **Unclear source of truth**: No single authoritative state system

The refactor aims to consolidate providers, remove ADTs, choose a primary state system, and extract graph visualization as a reusable package.

## Requirements Discussion

### First Round Questions

**Q1:** I assume the consolidated `DevToolsProvider` should internally compose both `DevToolsContainerProvider` (runtime-based with `useSyncExternalStore`) and `DevToolsFlowProvider` (machine-based with `useReducer`) initially, then expose a unified hook API. Is that correct, or should we immediately eliminate one approach during consolidation?

**Answer:** Compose internally - Single `DevToolsProvider` wrapping both `DevToolsContainerProvider` and `DevToolsFlowProvider`, expose unified `useDevTools()` hook. Keep both subscription mechanisms internally (`useSyncExternalStore` for external runtime, `useReducer` for React-managed machines).

**Q2:** Currently, `DevToolsContainerProvider` requires a `DevToolsRuntimeWithContainers` instance passed as a prop, while `DevToolsFlowProvider` creates its own state internally. I'm assuming the new unified provider should follow the runtime pattern (accept a pre-created runtime instance). Is that correct, or should it create the runtime internally?

**Answer:** Pre-created runtime - Accept a pre-created `DevToolsRuntimeWithContainers` instance as a prop. Consumer creates runtime at composition root, provider is a thin adapter. This follows Inversion of Control.

**Q3:** The `adt.ts` file (~262 lines) defines `Option<T>` and `Result<T,E>` types with helper functions (`Some`, `None`, `Ok`, `Err`, `mapOption`, `flatMapResult`, etc.). I see these are well-documented but don't appear to be used extensively. Should we simply delete this file and update any imports, or is there specific migration logic needed for existing usages?

**Answer:** Delete entirely - Remove `adt.ts` (~262 lines). Only 3 files use `Option<T>`, none use `Result<T,E>`. Migrate to native `T | null` patterns. TypeScript's `strictNullChecks` provides identical compile-time safety.

**Q4:** Looking at the two state systems - Runtime approach (`DevToolsRuntimeWithContainers`) uses `useSyncExternalStore`, handles container discovery, dispatch/subscribe pattern. Flow approach (`DevToolsFlowProvider`) uses state machines (`devToolsUIMachine`, `tracingMachine`) via `useReducer`, manages UI state and tracing. I assume we should keep the Runtime approach since it aligns better with React 18's concurrent rendering model and handles the core container discovery. The Flow machines would be consolidated into the runtime's command/reducer pattern. Is that correct, or do you prefer keeping the Flow/machine approach as the primary system?

**Answer:** Use `@hex-di/flow` as the Runtime Implementation - Instead of "Runtime vs Flow", the answer is to use `@hex-di/flow` properly as the DevTools Runtime's core.

**Key Clarification:** `@hex-di/flow` is a self-contained library with:

- Machine definitions (states, events, transitions)
- MachineRunner (pure execution)
- Effects as Data (Effect.spawn, Effect.invoke, Effect.stop, Effect.emit, Effect.delay)
- DIEffectExecutor (executes effects with DI integration)
- ActivityManager (manages long-running activities)
- FlowAdapter (DI integration pattern)
- FlowService (subscribe/snapshot API compatible with useSyncExternalStore)

**No external Effect library needed** - everything is within `@hex-di/flow`.

**Proposed Architecture - DevToolsFlowRuntime:**

1. **Three Separate Machines** (coordinated by runtime):
   - `ContainerTreeMachine` - Container discovery, hierarchy, lifecycle
   - `TracingMachine` - Trace collection lifecycle
   - `DevToolsUIMachine` - Panel visibility, tab selection

2. **Activities** (managed via Effect.spawn/Effect.stop):
   - `ContainerDiscoveryActivity` - Initial tree discovery
   - `InspectorSubscriptionActivity` - Per-container event subscription
   - `TraceCollectorActivity` - Trace collection

3. **DevToolsFlowRuntime** (singleton coordinator):
   - Owns FlowService instances for all three machines
   - Provides unified `subscribe()`/`getSnapshot()` for React
   - Handles cross-machine communication
   - Activity lifecycle via DIEffectExecutor

4. **React Layer** (thin adapter):
   - `useDevToolsRuntime()` via `useSyncExternalStore`
   - Just renders snapshot, no state management

**Benefits:**

- Single source of truth (all state in Flow machines)
- Framework agnostic (can test without React)
- Proper activity lifecycle (spawn/stop in machine transitions)
- React 18+ concurrent rendering safe

**DI Graph Structure:**

```typescript
const devToolsGraph = GraphBuilder.create()
  .provide(ContainerTreeFlowAdapter)
  .provide(TracingFlowAdapter)
  .provide(UIFlowAdapter)
  .provide(DevToolsFlowRuntimeAdapter)
  .build();
```

**Q5:** The graph visualization code (~70KB across 10 files in `graph-visualization/`) includes React components with D3/Dagre dependencies. I assume extracting to `@hex-di/graph-viz` should be a separate package with its own peer dependencies, export pure visualization components without DevTools-specific logic, and remain in the devtools package as well (re-exported) for backward compatibility. Is that correct, or should there be a clean break where devtools depends on graph-viz?

**Answer:** Generalized core - Extract to `@hex-di/graph-viz` with:

- Generic `TMetadata` type parameter
- Render props (`renderNode`, `renderTooltip`) for domain-specific visualization
- DevTools provides mapping layer (`extractDIMetadata`, `renderDINode`)
- Clean break - devtools depends on graph-viz

**Q6:** Should this refactor maintain backward compatibility with the current public API (hooks like `useDevToolsUI`, `useContainerSnapshot`, etc.), or is this an acceptable breaking change that will require documentation updates?

**Answer:** Breaking changes with migration guide - Semver major bump (v2.0.0). Young library, dev-only tooling, internally inconsistent APIs. Provide:

- Migration guide with before/after examples
- Hook migration table
- Optional codemod for mechanical transforms

**Q7:** I'm assuming the `@hex-di/devtools-core` and `@hex-di/devtools-network` packages are out of scope for this refactor and should remain unchanged. Is that correct?

**Answer:**

- `@hex-di/devtools-core`: INCLUDE in scope (50+ imports, tight coupling, has similar ADT patterns that need alignment)
- `@hex-di/devtools-network`: EXCLUDE from scope (loosely coupled, stable protocol boundary, no React dependencies)

**Q8:** Is there anything explicitly **not** to include in this refactor - for example, should we avoid touching the plugin system in `src/plugins/`?

**Answer:** Keep out of scope - Plugin system already follows Clean Architecture. Modify only:

- `plugin-props-derivation.ts` (adapter layer)
- `plugin-tab-content.tsx` (integration seam)
  Keep `PluginProps` interface stable as public API. Do NOT modify the 4 built-in plugin components.

### Existing Code to Reference

- `@hex-di/flow` package - FlowService, FlowAdapter, DIEffectExecutor, ActivityManager patterns
- Existing machine definitions in `/packages/devtools/src/machines/` as starting point for refactored machines

### Follow-up Questions

None required - all questions answered comprehensively.

## Visual Assets

### Files Provided:

No visual assets provided.

### Visual Insights:

N/A

## Requirements Summary

### Functional Requirements

- **Unified Provider**: Create single `DevToolsProvider` component that accepts a `DevToolsFlowRuntime` instance, exposing a unified `useDevToolsRuntime()` hook via `useSyncExternalStore`
- **Flow-Based Runtime**: Implement `DevToolsFlowRuntime` as singleton coordinator owning FlowService instances for three machines:
  - `ContainerTreeMachine` - Container discovery, hierarchy, lifecycle
  - `TracingMachine` - Trace collection lifecycle
  - `DevToolsUIMachine` - Panel visibility, tab selection
- **Activity-Based Side Effects**: Use `@hex-di/flow` Effects as Data pattern for:
  - `ContainerDiscoveryActivity` - Initial tree discovery
  - `InspectorSubscriptionActivity` - Per-container event subscription
  - `TraceCollectorActivity` - Trace collection
- **IoC Pattern**: Provider accepts pre-created `DevToolsFlowRuntime` instance as prop
- **ADT Removal**: Delete `adt.ts` and migrate 3 files using `Option<T>` to native `T | null` patterns
- **Graph Extraction**: Create `@hex-di/graph-viz` package with generic `TMetadata` type parameter and render props pattern
- **Migration Guide**: Provide before/after examples, hook migration table, and optional codemod

### Reusability Opportunities

- `@hex-di/graph-viz` as standalone visualization package usable outside DevTools context
- Generic graph components with render props for domain-specific customization
- DevTools-specific mapping layer (`extractDIMetadata`, `renderDINode`) as integration example
- `@hex-di/flow` patterns (FlowService, FlowAdapter, DIEffectExecutor) as reference implementation

### Scope Boundaries

**In Scope:**

- `/packages/devtools/` - Main refactor target
- `/packages/devtools-core/` - Align ADT patterns, tight coupling requires coordinated changes
- Provider consolidation (`DevToolsContainerProvider`, `DevToolsFlowProvider` -> `DevToolsProvider`)
- ADT removal (`adt.ts` deletion, 3 file migrations)
- Graph visualization extraction to `@hex-di/graph-viz`
- State system unification (Flow machines as single source of truth via `DevToolsFlowRuntime`)
- Plugin integration seams (`plugin-props-derivation.ts`, `plugin-tab-content.tsx`)
- Migration documentation and optional codemod

**Out of Scope:**

- `/packages/devtools-network/` - Stable protocol boundary, no React dependencies
- Plugin system core (`src/plugins/`) - Already follows Clean Architecture
- 4 built-in plugin components - Keep stable
- `PluginProps` interface - Maintain as stable public API
- Event sourcing for time-travel debugging (long-term, separate spec)

### Technical Considerations

- Semver major version bump to v2.0.0 (breaking changes acceptable)
- Use `@hex-di/flow` FlowService for `useSyncExternalStore` compatibility
- Three coordinated machines with cross-machine communication via `DevToolsFlowRuntime`
- Activities managed via Effect.spawn/Effect.stop in machine transitions
- DIEffectExecutor for DI-integrated effect execution
- Graph-viz package requires peer dependencies: react, d3, dagre
- TypeScript `strictNullChecks` provides compile-time safety for `T | null` patterns
- Clean dependency break: devtools depends on graph-viz (not re-export)
- Framework-agnostic design enables testing without React
- DI Graph structure using FlowAdapter pattern for each machine
