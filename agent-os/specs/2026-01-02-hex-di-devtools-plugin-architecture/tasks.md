# Task Breakdown: DevTools Plugin Architecture

## Overview

Total Tasks: 47
Estimated Complexity: High

This spec transforms HexDiDevTools from a monolithic component into a plugin-based architecture where all business logic lives in a DevTools Runtime (outside React), and plugins contribute tabs through a minimal, statically-registered interface.

## Task List

### Phase 1: Core Runtime Infrastructure

#### Task Group 1: DevTools Runtime Core Types and State

**Dependencies:** None
**Complexity:** Medium

- [x] 1.0 Complete DevTools Runtime type definitions
  - [x] 1.1 Write 4-6 focused tests for runtime state management
    - Test state initialization with default values
    - Test state immutability (state cannot be mutated directly)
    - Test plugin registration and id uniqueness validation
    - Test active tab selection state transitions
  - [x] 1.2 Define `DevToolsRuntimeState` interface
    - `activeTabId: string` - currently selected plugin tab
    - `selectedContainerIds: ReadonlySet<string>` - multi-select container state
    - `tracingEnabled: boolean` - global tracing toggle
    - `tracingPaused: boolean` - pause/resume tracing state
    - `tracingThreshold: number` - slow resolution threshold in ms
    - `plugins: readonly DevToolsPlugin[]` - registered plugins (immutable after creation)
  - [x] 1.3 Define `DevToolsCommand` discriminated union
    - `{ type: "selectTab"; tabId: string }`
    - `{ type: "selectContainers"; ids: ReadonlySet<string> }`
    - `{ type: "toggleTracing" }`
    - `{ type: "pauseTracing" }`
    - `{ type: "resumeTracing" }`
    - `{ type: "setThreshold"; value: number }`
    - `{ type: "clearTraces" }`
  - [x] 1.4 Define `DevToolsEvent` discriminated union
    - `{ type: "tabChanged"; tabId: string }`
    - `{ type: "containersSelected"; ids: ReadonlySet<string> }`
    - `{ type: "tracingStateChanged"; enabled: boolean; paused: boolean }`
    - `{ type: "tracesCleared" }`
  - [x] 1.5 Ensure runtime type tests pass
    - Run type tests with `pnpm test:types`
    - Verify discriminated unions are exhaustive

**Acceptance Criteria:**

- All type definitions compile without errors
- Tests verify state transitions work correctly
- Command and Event types are properly discriminated

---

#### Task Group 2: DevToolsRuntime Implementation

**Dependencies:** Task Group 1
**Complexity:** High

- [x] 2.0 Complete DevToolsRuntime core implementation
  - [x] 2.1 Write 6-8 focused tests for runtime behavior
    - Test `createDevToolsRuntime()` factory with plugins
    - Test `dispatch(command)` updates state correctly
    - Test `subscribe()` notifies listeners on state change
    - Test `getState()` returns current immutable state
    - Test plugin id collision throws error at creation
    - Test `getSnapshot()` returns serializable state for `useSyncExternalStore`
  - [x] 2.2 Implement `createDevToolsRuntime()` factory function
    - Accept `DevToolsRuntimeConfig` with plugins array
    - Validate plugin id uniqueness at creation time
    - Initialize state with first plugin as active tab
    - Return frozen `DevToolsRuntime` instance
    - Location: `packages/devtools/src/runtime/create-runtime.ts`
  - [x] 2.3 Implement `DevToolsRuntime` class/object
    - `dispatch(command: DevToolsCommand): void` - mutate state
    - `subscribe(listener: () => void): () => void` - add/remove listeners
    - `getState(): DevToolsRuntimeState` - return current state
    - `getSnapshot(): DevToolsRuntimeState` - for useSyncExternalStore
    - `getServerSnapshot(): DevToolsRuntimeState` - for SSR
    - Location: `packages/devtools/src/runtime/runtime.ts`
  - [x] 2.4 Implement command handlers (reducer pattern)
    - Each command type maps to a state transition function
    - State transitions are pure functions
    - Emit events after state mutations
    - Location: `packages/devtools/src/runtime/commands.ts`
  - [x] 2.5 Implement event emission system
    - Internal event bus for runtime events
    - Plugins can subscribe to specific event types
    - Events are emitted after state changes
    - Location: `packages/devtools/src/runtime/events.ts`
  - [x] 2.6 Ensure runtime implementation tests pass
    - Run `pnpm test packages/devtools/tests/runtime/`
    - Verify all command handlers work correctly

**Acceptance Criteria:**

- The 6-8 tests written in 2.1 pass
- Runtime can be created with plugins
- Commands correctly mutate state
- Subscribers are notified on changes
- Plugin id collision is detected and throws

---

#### Task Group 3: Selector System

**Dependencies:** Task Group 2
**Complexity:** Medium

- [x] 3.0 Complete selector system for derived state
  - [x] 3.1 Write 4-6 focused tests for selectors
    - Test `selectActivePlugin()` returns correct plugin
    - Test `selectPluginById()` returns plugin or undefined
    - Test `selectTabList()` returns ordered tab configs
    - Test selectors are memoized (same input = same output reference)
  - [x] 3.2 Implement base selector utilities
    - `createSelector()` memoization utility
    - Selector composition pattern
    - Location: `packages/devtools/src/runtime/selectors/utils.ts`
  - [x] 3.3 Implement plugin selectors
    - `selectPlugins(state)` - all registered plugins
    - `selectActivePlugin(state)` - currently active plugin
    - `selectPluginById(state, id)` - find plugin by id
    - `selectTabList(state)` - plugin configs for tab rendering
    - Location: `packages/devtools/src/runtime/selectors/plugins.ts`
  - [x] 3.4 Implement container selectors
    - `selectSelectedContainers(state)` - selected container ids
    - `selectIsContainerSelected(state, id)` - check if container selected
    - Location: `packages/devtools/src/runtime/selectors/containers.ts`
  - [x] 3.5 Implement tracing selectors
    - `selectTracingState(state)` - { enabled, paused, threshold }
    - `selectIsTracingActive(state)` - enabled && !paused
    - Location: `packages/devtools/src/runtime/selectors/tracing.ts`
  - [x] 3.6 Ensure selector tests pass
    - Run selector tests
    - Verify memoization works correctly

**Acceptance Criteria:**

- The 4-6 tests written in 3.1 pass
- Selectors correctly derive state
- Memoization prevents unnecessary recalculations
- Selectors are composable

---

### Phase 2: Plugin Interface

#### Task Group 4: DevToolsPlugin Interface Definition

**Dependencies:** Task Group 2
**Complexity:** Medium

- [x] 4.0 Complete DevToolsPlugin interface and types
  - [x] 4.1 Write 4-6 focused type tests for plugin interface
    - Test plugin with all required fields compiles
    - Test plugin missing required field fails to compile
    - Test `PluginProps` type includes runtime access
    - Test `PluginShortcut` type structure
  - [x] 4.2 Define `DevToolsPlugin` interface
    - `id: string` - unique identifier
    - `label: string` - display name for tab
    - `icon?: ReactElement` - optional tab icon
    - `shortcuts?: readonly PluginShortcut[]` - keyboard bindings
    - `component: React.ComponentType<PluginProps>` - tab content renderer
    - Location: `packages/devtools/src/runtime/plugin-types.ts`
  - [x] 4.3 Define `PluginProps` interface
    - `runtime: PluginRuntimeAccess` - access to dispatch and state (minimal interface)
    - `state: PluginStateSnapshot` - current snapshot
    - `graph: ExportedGraph` - dependency graph data
    - `tracingAPI?: TracingAPI` - optional tracing access
    - `containers: readonly ContainerEntry[]` - available containers
    - Location: `packages/devtools/src/runtime/plugin-types.ts`
  - [x] 4.4 Define `PluginShortcut` interface
    - `key: string` - keyboard shortcut (e.g., "g", "ctrl+s")
    - `action: () => void` - callback when triggered
    - `description: string` - tooltip/help text
    - Location: `packages/devtools/src/runtime/plugin-types.ts`
  - [x] 4.5 Ensure plugin type tests pass
    - Run `pnpm test:types`
    - Verify all plugin-related types compile correctly

**Acceptance Criteria:**

- The 4-6 type tests written in 4.1 pass
- Plugin interface is minimal and focused
- PluginProps provides necessary runtime access
- Types are exported from package entry point

---

#### Task Group 5: Plugin Factory Helpers

**Dependencies:** Task Group 4
**Complexity:** Low

- [x] 5.0 Complete plugin factory and validation utilities
  - [x] 5.1 Write 3-4 focused tests for plugin factories
    - Test `defineDevToolsPlugin()` returns frozen plugin
    - Test plugin validation catches missing required fields
    - Test plugin id validation (no spaces, lowercase)
  - [x] 5.2 Implement `defineDevToolsPlugin()` factory
    - Accepts plugin config object
    - Validates required fields at runtime
    - Returns frozen `DevToolsPlugin` instance
    - Location: `packages/devtools/src/runtime/define-plugin.ts`
  - [x] 5.3 Implement plugin validation utilities
    - `validatePluginId(id)` - format validation
    - `validatePluginConfig(config)` - required field checks
    - Throw descriptive errors for invalid configs
    - Location: `packages/devtools/src/runtime/validation.ts`
  - [x] 5.4 Ensure plugin factory tests pass
    - Run factory tests
    - Verify validation catches invalid plugins

**Acceptance Criteria:**

- The 3-4 tests written in 5.1 pass
- Factory creates valid frozen plugins
- Validation provides helpful error messages

---

### Phase 3: Built-in Plugins Extraction

#### Task Group 6: GraphPlugin Extraction

**Dependencies:** Task Group 4
**Complexity:** Medium

- [x] 6.0 Extract GraphPlugin from monolithic devtools
  - [x] 6.1 Write 4-5 focused tests for GraphPlugin
    - Test plugin renders without errors
    - Test multi-select container integration
    - Test unified graph building from selected containers
    - Test empty state when no containers selected
  - [x] 6.2 Create `GraphPlugin` factory function
    - Return `DevToolsPlugin` with id "graph"
    - Component wraps existing `GraphTabContent`
    - Keyboard shortcut: "g" to focus graph tab
    - Location: `packages/devtools/src/plugins/graph-plugin.ts`
  - [x] 6.3 Refactor `GraphTabContent` for plugin usage
    - Accept `PluginProps` instead of direct props
    - Use runtime selectors for container selection
    - Delegate to existing `DependencyGraph` component
    - Location: `packages/devtools/src/plugins/graph/graph-content.tsx`
  - [x] 6.4 Extract graph utilities to shared module
    - `buildUnifiedGraph()` already exists
    - Ensure utilities work with plugin props
    - Location: `packages/devtools/src/plugins/graph/utils.ts`
  - [x] 6.5 Ensure GraphPlugin tests pass
    - Run plugin tests
    - Verify integration with runtime

**Acceptance Criteria:**

- The 4-5 tests written in 6.1 pass
- GraphPlugin renders existing graph visualization
- Multi-container selection works via runtime state
- Existing GraphTabContent functionality preserved

---

#### Task Group 7: ServicesPlugin Extraction

**Dependencies:** Task Group 4
**Complexity:** Medium

- [x] 7.0 Extract ServicesPlugin from monolithic devtools
  - [x] 7.1 Write 4-5 focused tests for ServicesPlugin
    - Test plugin renders service list
    - Test search/filter functionality
    - Test view mode toggle (list/tree)
    - Test lifetime filter buttons
  - [x] 7.2 Create `ServicesPlugin` factory function
    - Return `DevToolsPlugin` with id "services"
    - Component wraps existing `EnhancedServicesView`
    - Keyboard shortcut: "s" to focus services tab
    - Location: `packages/devtools/src/plugins/services-plugin.ts`
  - [x] 7.3 Refactor `EnhancedServicesView` for plugin usage
    - Accept `PluginProps` instead of direct props
    - Build services from runtime state
    - Preserve all existing search/filter functionality
    - Location: `packages/devtools/src/plugins/services/services-content.tsx`
  - [x] 7.4 Ensure ServicesPlugin tests pass
    - Run plugin tests
    - Verify all existing functionality preserved

**Acceptance Criteria:**

- The 4-5 tests written in 7.1 pass
- ServicesPlugin renders enhanced services view
- Search, filters, and view modes work correctly
- Performance unaffected by refactor

---

#### Task Group 8: TracingPlugin Extraction

**Dependencies:** Task Group 4
**Complexity:** Medium

- [x] 8.0 Extract TracingPlugin from monolithic devtools
  - [x] 8.1 Write 4-5 focused tests for TracingPlugin
    - Test plugin renders tracing section
    - Test timeline/tree/summary sub-views
    - Test pause/resume via runtime commands
    - Test threshold control
  - [x] 8.2 Create `TracingPlugin` factory function
    - Return `DevToolsPlugin` with id "tracing"
    - Component wraps existing `ResolutionTracingSection`
    - Keyboard shortcut: "t" to focus tracing tab
    - Location: `packages/devtools/src/plugins/tracing-plugin.ts`
  - [x] 8.3 Refactor tracing controls to use runtime commands
    - Pause/resume dispatches commands to runtime
    - Clear traces dispatches command
    - Threshold changes dispatch commands
    - Location: `packages/devtools/src/plugins/tracing/tracing-content.tsx`
  - [x] 8.4 Move tracing state to runtime
    - `tracingPaused`, `tracingThreshold` in runtime state
    - Tracing controls read from runtime selectors
    - TracingAPI operations triggered by commands
    - Location: Update runtime state and commands
  - [x] 8.5 Ensure TracingPlugin tests pass
    - Run plugin tests
    - Verify tracing controls work through runtime

**Acceptance Criteria:**

- The 4-5 tests written in 8.1 pass
- TracingPlugin renders all sub-views
- Tracing controls dispatch commands
- State managed by runtime, not component

---

#### Task Group 9: InspectorPlugin Extraction

**Dependencies:** Task Group 4
**Complexity:** Medium

- [x] 9.0 Extract InspectorPlugin from monolithic devtools
  - [x] 9.1 Write 4-5 focused tests for InspectorPlugin
    - Test plugin renders container inspector
    - Test scope hierarchy tree
    - Test resolved services list
    - Test container selection from tree
  - [x] 9.2 Create `InspectorPlugin` factory function
    - Return `DevToolsPlugin` with id "inspector"
    - Component wraps existing `ContainerInspector`
    - Keyboard shortcut: "i" to focus inspector tab
    - Location: `packages/devtools/src/plugins/inspector-plugin.ts`
  - [x] 9.3 Refactor `ContainerInspector` for plugin usage
    - Accept `PluginProps` instead of direct props
    - Use runtime state for container selection
    - Preserve scope hierarchy and services display
    - Location: `packages/devtools/src/plugins/inspector/inspector-content.tsx`
  - [x] 9.4 Ensure InspectorPlugin tests pass
    - Run plugin tests
    - Verify container inspection works

**Acceptance Criteria:**

- The 4-5 tests written in 9.1 pass
- InspectorPlugin renders scope hierarchy
- Container selection updates runtime state
- All existing inspection features work

---

### Phase 4: Preset Functions

#### Task Group 10: Plugin Preset Factory Functions

**Dependencies:** Task Groups 6-9
**Complexity:** Low

- [x] 10.0 Complete preset factory functions
  - [x] 10.1 Write 3-4 focused tests for presets
    - Test `defaultPlugins()` returns 4 plugins in order
    - Test `minimalPlugins()` returns 2 plugins
    - Test presets return readonly arrays
    - Test preset composition with spread operator
  - [x] 10.2 Implement `defaultPlugins()` function
    - Returns `readonly [GraphPlugin, ServicesPlugin, TracingPlugin, InspectorPlugin]`
    - Plugins created fresh on each call (factory functions)
    - Location: `packages/devtools/src/plugins/presets.ts`
  - [x] 10.3 Implement `minimalPlugins()` function
    - Returns `readonly [ServicesPlugin, InspectorPlugin]`
    - For lightweight devtools usage
    - Location: `packages/devtools/src/plugins/presets.ts`
  - [x] 10.4 Export presets from package entry point
    - Add to `packages/devtools/src/index.ts`
    - Document usage in JSDoc
  - [x] 10.5 Ensure preset tests pass
    - Run preset tests
    - Verify composition works

**Acceptance Criteria:**

- The 3-4 tests written in 10.1 pass
- Presets return correct plugins in correct order
- Presets are composable with custom plugins
- Exported from package entry point

---

### Phase 5: React Integration Layer

#### Task Group 11: React Context and Hooks

**Dependencies:** Task Group 3
**Complexity:** Medium

- [x] 11.0 Complete React integration layer
  - [x] 11.1 Write 5-6 focused tests for React hooks
    - Test `DevToolsRuntimeProvider` provides context
    - Test `useDevToolsRuntime()` returns runtime
    - Test `useDevToolsState()` subscribes to state
    - Test `useDevToolsSelector()` with custom selector
    - Test hooks throw outside provider
  - [x] 11.2 Create `DevToolsRuntimeContext`
    - React context holding `DevToolsRuntime | null`
    - Location: `packages/devtools/src/react/runtime-context.ts`
  - [x] 11.3 Create `DevToolsRuntimeProvider` component
    - Accept `runtime` prop
    - Provide runtime via context
    - Location: `packages/devtools/src/react/runtime-provider.tsx`
  - [x] 11.4 Implement `useDevToolsRuntime()` hook
    - Returns runtime from context
    - Throws if used outside provider
    - Location: `packages/devtools/src/react/hooks/use-runtime.ts`
  - [x] 11.5 Implement `useDevToolsState()` hook
    - Uses `useSyncExternalStore`
    - Subscribes to runtime state changes
    - Returns current state snapshot
    - Location: `packages/devtools/src/react/hooks/use-state.ts`
  - [x] 11.6 Implement `useDevToolsSelector()` hook
    - Accept selector function
    - Returns selected slice of state
    - Memoized to prevent unnecessary re-renders
    - Location: `packages/devtools/src/react/hooks/use-selector.ts`
  - [x] 11.7 Ensure React integration tests pass
    - Run React hook tests
    - Verify hooks work with runtime

**Acceptance Criteria:**

- The 5-6 tests written in 11.1 pass
- Provider correctly provides runtime
- Hooks use useSyncExternalStore pattern
- Re-renders are minimized

---

#### Task Group 12: Tab Navigation Integration

**Dependencies:** Task Groups 10, 11
**Complexity:** Medium

- [x] 12.0 Complete tab navigation with plugin architecture
  - [x] 12.1 Write 4-5 focused tests for tab navigation
    - Test tabs render from plugin list
    - Test tab click dispatches selectTab command
    - Test active tab styling from runtime state
    - Test keyboard navigation between tabs
  - [x] 12.2 Refactor `TabNavigation` to use plugins
    - Read tab configs from runtime selector
    - Remove hardcoded `TAB_CONFIGS`
    - Tab click dispatches `selectTab` command
    - Location: `packages/devtools/src/react/tab-navigation.tsx`
  - [x] 12.3 Create `PluginTabContent` component
    - Renders active plugin's component
    - Passes `PluginProps` to component
    - Only renders when tab is active (for performance)
    - Location: `packages/devtools/src/react/plugin-tab-content.tsx`
  - [x] 12.4 Preserve ARIA accessibility
    - Tab roles and aria-selected
    - Tabpanel roles with aria-labelledby
    - Keyboard navigation (arrow keys, home, end)
  - [x] 12.5 Ensure tab navigation tests pass
    - Run tab navigation tests
    - Verify plugin integration works

**Acceptance Criteria:**

- The 4-5 tests written in 12.1 pass
- Tabs dynamically render from plugins
- Tab selection updates runtime state
- Full keyboard accessibility preserved

---

#### Task Group 13: DevToolsPanel Refactor

**Dependencies:** Task Group 12
**Complexity:** High

- [x] 13.0 Refactor DevToolsPanel to use plugin architecture
  - [x] 13.1 Write 5-6 focused tests for refactored panel
    - Test panel renders with default plugins
    - Test panel renders with custom plugins
    - Test panel creates runtime internally when not provided
    - Test panel accepts external runtime
    - Test sections mode still works (backward compat)
  - [x] 13.2 Update `DevToolsPanel` to create runtime
    - Create runtime from plugins prop or use default
    - Wrap children with `DevToolsRuntimeProvider`
    - Pass runtime to tab navigation
    - Location: `packages/devtools/src/react/devtools-panel.tsx`
  - [x] 13.3 Remove hardcoded tab content
    - Replace inline tab content with `PluginTabContent`
    - Remove direct imports of GraphTabContent, etc.
    - Let plugins render their own content
  - [x] 13.4 Add `plugins` prop to panel
    - Accept `readonly DevToolsPlugin[]`
    - Default to `defaultPlugins()` if not provided
    - Allow custom plugin composition
  - [x] 13.5 Preserve backward compatibility
    - Keep `mode="sections"` support
    - Keep `initialTab` prop (maps to initial state)
    - Keep existing prop types for graph/container
  - [x] 13.6 Ensure refactored panel tests pass
    - Run panel tests
    - Verify both modes work
    - Verify custom plugins work

**Acceptance Criteria:**

- The 5-6 tests written in 13.1 pass
- Panel works with default and custom plugins
- Backward compatibility preserved
- No breaking changes to existing API

---

### Phase 6: Testing and Documentation

#### Task Group 14: Integration Testing

**Dependencies:** Task Groups 1-13
**Complexity:** Medium

- [x] 14.0 Complete integration testing
  - [x] 14.1 Review all tests from previous task groups
    - Review runtime tests (Task 2.1)
    - Review selector tests (Task 3.1)
    - Review plugin tests (Tasks 6.1, 7.1, 8.1, 9.1)
    - Review React hook tests (Task 11.1)
    - Review panel tests (Task 13.1)
  - [x] 14.2 Identify critical integration gaps
    - Full flow: create runtime -> render panel -> interact
    - Plugin lifecycle: mount -> receive props -> unmount
    - State synchronization across components
  - [x] 14.3 Write up to 8 additional integration tests
    - Test full devtools flow with tracing
    - Test custom plugin integration
    - Test multi-container selection flow
    - Test keyboard shortcut handling
  - [x] 14.4 Run all feature-specific tests
    - Run `pnpm test packages/devtools/tests/`
    - Verify all tests pass
    - Fix any regressions

**Acceptance Criteria:**

- All tests from previous groups pass
- Critical integration flows covered
- No regressions in existing functionality
- Total test count reasonable (approx 50-60 tests)

---

#### Task Group 15: Exports and Package Structure

**Dependencies:** Task Group 14
**Complexity:** Low

- [x] 15.0 Finalize package exports
  - [x] 15.1 Update `packages/devtools/src/index.ts`
    - Export `createDevToolsRuntime`
    - Export `DevToolsRuntime`, `DevToolsRuntimeState` types
    - Export `DevToolsPlugin`, `PluginProps` types
    - Export `defineDevToolsPlugin`
    - Export `defaultPlugins`, `minimalPlugins`
  - [x] 15.2 Update `packages/devtools/src/react/index.ts`
    - Export `DevToolsRuntimeProvider`
    - Export `useDevToolsRuntime`, `useDevToolsState`, `useDevToolsSelector`
    - Export refactored `DevToolsPanel`
  - [x] 15.3 Export individual plugins
    - Export `GraphPlugin`, `ServicesPlugin`, `TracingPlugin`, `InspectorPlugin`
    - Allow users to import individual plugins
  - [x] 15.4 Verify exports with TypeScript
    - Run `pnpm typecheck`
    - Ensure all exports are properly typed
    - Test import paths work correctly

**Acceptance Criteria:**

- All public APIs exported from entry points
- TypeScript compilation succeeds
- Import paths documented in JSDoc
- No accidental internal exports

---

## Execution Order

Recommended implementation sequence:

1. **Phase 1: Core Runtime Infrastructure** (Task Groups 1-3)
   - Foundation for all other work
   - Must be complete before plugins can be built

2. **Phase 2: Plugin Interface** (Task Groups 4-5)
   - Define how plugins interact with runtime
   - Required before extracting built-in plugins

3. **Phase 3: Built-in Plugins Extraction** (Task Groups 6-9)
   - Extract existing functionality into plugins
   - Can be parallelized across developers

4. **Phase 4: Preset Functions** (Task Group 10)
   - Convenience functions for common setups
   - Quick once plugins exist

5. **Phase 5: React Integration Layer** (Task Groups 11-13)
   - Connect runtime to React components
   - Refactor DevToolsPanel last

6. **Phase 6: Testing and Documentation** (Task Groups 14-15)
   - Ensure quality and proper exports
   - Final polish

## Files to Create/Modify

### New Files

- `packages/devtools/src/runtime/create-runtime.ts`
- `packages/devtools/src/runtime/runtime.ts`
- `packages/devtools/src/runtime/commands.ts`
- `packages/devtools/src/runtime/events.ts`
- `packages/devtools/src/runtime/types.ts`
- `packages/devtools/src/runtime/plugin-types.ts`
- `packages/devtools/src/runtime/define-plugin.ts`
- `packages/devtools/src/runtime/validation.ts`
- `packages/devtools/src/runtime/selectors/utils.ts`
- `packages/devtools/src/runtime/selectors/plugins.ts`
- `packages/devtools/src/runtime/selectors/containers.ts`
- `packages/devtools/src/runtime/selectors/tracing.ts`
- `packages/devtools/src/runtime/selectors/index.ts`
- `packages/devtools/src/plugins/graph-plugin.ts`
- `packages/devtools/src/plugins/services-plugin.ts`
- `packages/devtools/src/plugins/tracing-plugin.ts`
- `packages/devtools/src/plugins/inspector-plugin.ts`
- `packages/devtools/src/plugins/presets.ts`
- `packages/devtools/src/plugins/index.ts`
- `packages/devtools/src/plugins/graph/graph-content.tsx`
- `packages/devtools/src/plugins/services/services-content.tsx`
- `packages/devtools/src/plugins/tracing/tracing-content.tsx`
- `packages/devtools/src/plugins/inspector/inspector-content.tsx`
- `packages/devtools/src/react/runtime-context.ts`
- `packages/devtools/src/react/runtime-provider.tsx`
- `packages/devtools/src/react/plugin-tab-content.tsx`
- `packages/devtools/src/react/hooks/use-runtime.ts`
- `packages/devtools/src/react/hooks/use-state.ts`
- `packages/devtools/src/react/hooks/use-selector.ts`

### Files to Modify

- `packages/devtools/src/react/devtools-panel.tsx` - Major refactor
- `packages/devtools/src/react/tab-navigation.tsx` - Plugin-based tabs
- `packages/devtools/src/index.ts` - New exports
- `packages/devtools/src/react/index.ts` - New exports

### Test Files

- `packages/devtools/tests/runtime/runtime.test.ts`
- `packages/devtools/tests/runtime/commands.test.ts`
- `packages/devtools/tests/runtime/selectors.test.ts`
- `packages/devtools/tests/plugins/graph-plugin.test.tsx`
- `packages/devtools/tests/plugins/services-plugin.test.tsx`
- `packages/devtools/tests/plugins/tracing-plugin.test.tsx`
- `packages/devtools/tests/plugins/inspector-plugin.test.tsx`
- `packages/devtools/tests/plugins/presets.test.ts`
- `packages/devtools/tests/react/runtime-provider.test.tsx`
- `packages/devtools/tests/react/hooks.test.tsx`
- `packages/devtools/tests/react/tab-navigation.test.tsx`
- `packages/devtools/tests/react/devtools-panel.test.tsx`
- `packages/devtools/tests/types.test-d.ts`
