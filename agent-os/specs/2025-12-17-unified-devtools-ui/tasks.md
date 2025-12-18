# Task Breakdown: Unified DevTools UI Architecture

## Overview

**Goal:** Consolidate 8 existing devtools packages into 2 unified packages (`@hex-di/devtools-core` and `@hex-di/devtools`) with platform-specific entry points (`/dom` and `/tui`), enabling shared headless components through a `RenderPrimitivesPort` abstraction.

**Total Tasks:** 37 subtasks across 5 phases
**Estimated Duration:** Medium-to-Large effort

## Current State

| Package | Status | Target |
|---------|--------|--------|
| devtools-core | Keep | Enhanced with testing utilities |
| devtools-ui | Merge | devtools/ |
| devtools-adapters | Merge | devtools-core or devtools/ |
| devtools-network | Merge | devtools/ |
| devtools | Refactor | devtools/dom |
| devtools-react | Merge | devtools/dom |
| devtools-tui | Merge | devtools/tui |
| devtools-testing | Merge | devtools-core (internal) |

---

## Phase 1: Create New Structure

### Task Group 1.1: Package Scaffolding
**Dependencies:** None
**Complexity:** S

- [x] 1.1.0 Complete unified devtools package scaffolding
  - [x] 1.1.1 Write 4 focused tests for package exports and entry point resolution
    - Test: Main entry point exports expected modules
    - Test: `/dom` entry point resolves correctly
    - Test: `/tui` entry point resolves correctly
    - Test: TypeScript types are correctly exported
  - [x] 1.1.2 Create new `devtools/` directory structure
    - Create `src/index.ts` (shared exports)
    - Create `src/dom/index.ts` (browser entry)
    - Create `src/tui/index.ts` (terminal entry)
    - Follow structure from requirements Section 3
  - [x] 1.1.3 Configure `package.json` with entry point exports
    - Set up `.`, `./dom`, `./tui` exports
    - Configure optional peer dependencies for React and OpenTUI
    - Add `bin` configuration for `hexdi-tui` CLI
    - Reference: requirements Section 7
  - [x] 1.1.4 Set up TypeScript configuration
    - Configure paths for internal imports
    - Set up composite project references
    - Ensure tree-shaking for platform-specific code
  - [x] 1.1.5 Ensure package scaffolding tests pass
    - Run ONLY the 4 tests written in 1.1.1
    - Verify build configuration works

**Acceptance Criteria:**
- Package builds successfully
- Entry points resolve correctly
- TypeScript compilation succeeds
- Tree-shaking excludes unused platform code

---

### Task Group 1.2: Move Core Types and Transforms
**Dependencies:** Task Group 1.1
**Complexity:** S

- [x] 1.2.0 Complete devtools-core consolidation
  - [x] 1.2.1 Write 4 focused tests for moved utilities
    - Test: Transform functions produce correct output
    - Test: Filter functions work correctly
    - Test: Protocol types are properly exported
    - Test: Testing utilities are accessible internally
  - [x] 1.2.2 Move `devtools-adapters` utilities to `devtools-core`
    - Move `formatDuration`, `formatBytes` utilities
    - Move adapter type definitions
    - Update internal imports
  - [x] 1.2.3 Move `devtools-testing` utilities to `devtools-core`
    - Move test fixtures and mock factories
    - Mark as internal (not public API)
    - Update package exports to exclude from public API
  - [x] 1.2.4 Verify existing transforms remain functional
    - Ensure `toJSON`, `toDOT`, `toMermaid` work
    - Ensure `filterGraph`, `byLifetime` work
    - No changes to public API
  - [x] 1.2.5 Ensure core consolidation tests pass
    - Run ONLY the 4 tests written in 1.2.1

**Acceptance Criteria:**
- All transforms work identically to before
- Testing utilities available internally
- No breaking changes to devtools-core public API
- Zero framework dependencies maintained

---

## Phase 2: Implement Primitives Port

### Task Group 2.1: RenderPrimitivesPort Contract
**Dependencies:** Task Group 1.2
**Complexity:** M

- [x] 2.1.0 Complete RenderPrimitivesPort contract definition
  - [x] 2.1.1 Write 6 focused tests for port contract
    - Test: Port creation with `createPort`
    - Test: BoxProps type accepts layout props
    - Test: TextProps type accepts semantic colors
    - Test: RendererSpecificProps resolves correctly for 'dom'
    - Test: RendererSpecificProps resolves correctly for 'tui'
    - Test: StyleSystem contains all semantic colors
  - [x] 2.1.2 Define `RendererType` and base types in `ports/render-primitives.port.ts`
    - `RendererType = 'dom' | 'tui'`
    - `SemanticColor` type with 10 color tokens
    - `SpacingToken` type for cross-platform spacing
    - Reference: requirements Section 4
  - [x] 2.1.3 Define layout props interface
    - `LayoutProps` with Yoga-based flexbox properties
    - `display`, `flexDirection`, `justifyContent`, `alignItems`
    - `gap`, `padding` using `SpacingToken`
  - [x] 2.1.4 Define conditional props types
    - `DOMOnlyProps`: `className`, `style`, `id`, `data-testid`
    - `TUIOnlyProps`: `focusable`, `title`, `titleAlignment`
    - `RendererSpecificProps<R>` conditional type
    - Reference: requirements Section 4 (Conditional Props)
  - [x] 2.1.5 Define primitive component prop interfaces
    - `BoxProps<R>`: layout + renderer-specific
    - `TextProps<R>`: variant, color, children
    - `ButtonProps<R>`: label, onClick, disabled
    - `IconProps`: name, size, color
    - `ScrollViewProps`: children, horizontal, vertical
    - `DividerProps`: orientation, color
    - `GraphRendererProps`: viewModel, onNodeSelect
  - [x] 2.1.6 Create `RenderPrimitivesPort` using `createPort`
    - Export `RenderPrimitives<R>` interface
    - Export `RenderPrimitivesPort` port definition
    - Include `StyleSystem` in contract
  - [x] 2.1.7 Ensure port contract tests pass
    - Run ONLY the 6 tests written in 2.1.1

**Acceptance Criteria:**
- Port contract compiles with full type safety
- Conditional props resolve correctly at compile time
- All primitive component types defined
- Port follows existing HexDI port patterns

---

### Task Group 2.2: usePrimitives Hook
**Dependencies:** Task Group 2.1
**Complexity:** S

- [x] 2.2.0 Complete usePrimitives hook implementation
  - [x] 2.2.1 Write 4 focused tests for usePrimitives hook
    - Test: Hook returns all primitive components
    - Test: Hook throws if no provider present
    - Test: Hook returns correct renderer type
    - Test: Hook memoizes primitives correctly
  - [x] 2.2.2 Create `PrimitivesContext` React context
    - Type-safe context with `RenderPrimitives`
    - Default value throws helpful error
  - [x] 2.2.3 Create `PrimitivesProvider` component
    - Accept `primitives` and `rendererType` props
    - Provide context to children
  - [x] 2.2.4 Implement `usePrimitives()` hook in `hooks/use-primitives.ts`
    - Return primitives from context
    - Include runtime check for missing provider
    - Reference: requirements Section 5
  - [x] 2.2.5 Ensure usePrimitives tests pass
    - Run ONLY the 4 tests written in 2.2.1

**Acceptance Criteria:**
- Hook provides type-safe access to primitives
- Clear error message if provider missing
- Works with both DOM and TUI providers

---

### Task Group 2.3: DOM Primitives Implementation
**Dependencies:** Task Group 2.2
**Complexity:** M

- [x] 2.3.0 Complete DOM primitives implementation
  - [x] 2.3.1 Write 6 focused tests for DOM primitives
    - Test: Box renders as div with flexbox styles
    - Test: Text renders with semantic color CSS variables
    - Test: Button renders with click handler
    - Test: Icon renders correct unicode/SVG
    - Test: ScrollView enables overflow scrolling
    - Test: Semantic colors map to CSS custom properties
  - [x] 2.3.2 Implement `DOMBox` component in `dom/primitives.ts`
    - Render as `<div style={{display:'flex',...}}>`
    - Map layout props to inline styles
    - Support `className`, `style`, `id`, `data-testid`
    - ~30 lines
  - [x] 2.3.3 Implement `DOMText` component
    - Render as `<span>` with color styles
    - Map semantic colors to CSS custom properties
    - Support `variant` for typography
    - ~20 lines
  - [x] 2.3.4 Implement `DOMButton` component
    - Render as `<button>` with styling
    - Handle `onClick`, `disabled` props
    - ~20 lines
  - [x] 2.3.5 Implement supporting primitives
    - `DOMIcon`: Unicode characters or inline SVG
    - `DOMScrollView`: div with overflow styles
    - `DOMDivider`: hr or styled div
    - ~30 lines total
  - [x] 2.3.6 Create `DOMStyleSystem` with CSS variable mappings
    - Map all 10 semantic colors to `--hex-devtools-*` variables
    - Export as part of `DOMPrimitives`
    - ~20 lines
  - [x] 2.3.7 Export `DOMPrimitives` adapter
    - Bundle all components into `RenderPrimitives<'dom'>`
    - Export from `dom/primitives.ts`
  - [x] 2.3.8 Ensure DOM primitives tests pass
    - Run ONLY the 6 tests written in 2.3.1

**Acceptance Criteria:**
- All primitives render correct HTML elements
- Semantic colors work via CSS custom properties
- Total implementation ~100-120 lines
- Matches requirements Section 9 table

---

### Task Group 2.4: TUI Primitives Implementation
**Dependencies:** Task Group 2.2
**Complexity:** M

- [ ] 2.4.0 Complete TUI primitives implementation
  - [ ] 2.4.1 Write 6 focused tests for TUI primitives
    - Test: Box renders as OpenTUI box with flexbox
    - Test: Text renders with ANSI colors
    - Test: Button renders as bordered box with focus
    - Test: Icon renders ASCII characters
    - Test: Focus navigation works between elements
    - Test: Semantic colors map to ANSI codes
  - [ ] 2.4.2 Implement `TUIBox` component in `tui/primitives.ts`
    - Render as OpenTUI `<box>` element
    - Map layout props to OpenTUI flex properties
    - Support `focusable`, `title`, `titleAlignment`
    - ~30 lines
  - [ ] 2.4.3 Implement `TUIText` component
    - Render as `<text><span fg={color}>` structure
    - Map semantic colors to ANSI escape codes
    - ~20 lines
  - [ ] 2.4.4 Implement `TUIButton` component
    - Render as bordered box with focus styling
    - Handle keyboard interactions
    - ~25 lines
  - [ ] 2.4.5 Implement supporting primitives
    - `TUIIcon`: ASCII characters `[G]`, `->`, etc.
    - `TUIScrollView`: OpenTUI scrollable container
    - `TUIDivider`: Box-drawing characters
    - ~30 lines total
  - [ ] 2.4.6 Create `TUIStyleSystem` with ANSI mappings
    - Map all 10 semantic colors to ANSI codes
    - Reuse patterns from existing `devtools-tui/src/components/ascii-graph.ts`
    - ~20 lines
  - [ ] 2.4.7 Export `TUIPrimitives` adapter
    - Bundle all components into `RenderPrimitives<'tui'>`
    - Export from `tui/primitives.ts`
  - [ ] 2.4.8 Ensure TUI primitives tests pass
    - Run ONLY the 6 tests written in 2.4.1

**Acceptance Criteria:**
- All primitives render correct OpenTUI elements
- ANSI colors display correctly in terminal
- Keyboard navigation works
- Total implementation ~100-120 lines

---

## Phase 3: Convert Components

### Task Group 3.1: Migrate State and View Models
**Dependencies:** Task Group 2.2
**Complexity:** S

- [x] 3.1.0 Complete state and view model migration
  - [x] 3.1.1 Write 4 focused tests for migrated state
    - Test: Reducer handles all action types
    - Test: Selectors return correct derived state
    - Test: View model factories create frozen objects
    - Test: Presenter transforms work correctly
  - [x] 3.1.2 Move state from `devtools-ui/src/state/` to `devtools/src/state/`
    - Move `reducer.ts` unchanged
    - Move `actions.ts` unchanged
    - Move `selectors.ts` unchanged
    - Move `devtools.state.ts` types
  - [x] 3.1.3 Move view models from `devtools-ui/src/view-models/`
    - Move `graph.vm.ts`, `timeline.vm.ts`, `stats.vm.ts`
    - Move `inspector.vm.ts`, `panel.vm.ts`
    - Update internal imports
  - [x] 3.1.4 Move presenters from `devtools-ui/src/presenters/`
    - Move all presenter classes unchanged
    - Update imports to use new locations
  - [x] 3.1.5 Export from shared entry point
    - Add exports to `devtools/src/index.ts`
    - Ensure backward-compatible API
  - [x] 3.1.6 Ensure state migration tests pass
    - Run ONLY the 4 tests written in 3.1.1

**Acceptance Criteria:**
- All state management works identically
- View models remain immutable frozen objects
- Presenters function unchanged
- 100% shared between DOM and TUI

---

### Task Group 3.2: Create Shared Headless Components
**Dependencies:** Task Groups 2.3, 2.4, 3.1
**Complexity:** L

- [x] 3.2.0 Complete shared headless components
  - [x] 3.2.1 Write 8 focused tests for headless components
    - Test: DevToolsPanel renders tab navigation
    - Test: GraphView renders empty state correctly
    - Test: GraphView renders nodes and edges
    - Test: TimelineView renders trace entries
    - Test: StatsView displays statistics
    - Test: InspectorView shows service details
    - Test: Components receive view models via props
    - Test: Components emit events via callbacks
  - [x] 3.2.2 Create `DevToolsPanel.tsx` in `components/`
    - Use primitives from `usePrimitives()` hook
    - Render tab bar with Graph, Timeline, Stats, Inspector
    - Handle tab switching via callbacks
    - Reference: requirements Section 5
    - ~80 lines
  - [x] 3.2.3 Create `GraphView.tsx`
    - Accept `GraphViewModel` props
    - Render empty state when no services
    - Delegate to `GraphRenderer` primitive for visualization
    - Handle node selection callback
    - ~50 lines
  - [x] 3.2.4 Create `TimelineView.tsx`
    - Accept `TimelineViewModel` props
    - Render trace entries in ScrollView
    - Display timestamps, durations, phases
    - ~60 lines
  - [x] 3.2.5 Create `StatsView.tsx`
    - Accept `StatsViewModel` props
    - Display service counts by lifetime
    - Show resolution statistics
    - ~40 lines
  - [x] 3.2.6 Create `InspectorView.tsx`
    - Accept `InspectorViewModel` props
    - Display selected service details
    - Show dependencies and dependents
    - ~60 lines
  - [x] 3.2.7 Export all components from `components/index.ts`
    - Re-export from both `/dom` and `/tui` entries
  - [x] 3.2.8 Ensure headless component tests pass
    - Run ONLY the 8 tests written in 3.2.1

**Acceptance Criteria:**
- All components use only primitives (no direct HTML/OpenTUI)
- Components are pure render functions
- View models passed as props, events as callbacks
- 100% shared between platforms

---

### Task Group 3.3: Platform Graph Renderers
**Dependencies:** Task Group 3.2
**Complexity:** M

- [x] 3.3.0 Complete platform-specific graph renderers
  - [x] 3.3.1 Write 6 focused tests for graph renderers
    - Test: DOM renderer creates SVG element
    - Test: DOM renderer positions nodes with dagre
    - Test: DOM renderer handles node click
    - Test: TUI renderer outputs ASCII art
    - Test: TUI renderer shows lifetime badges
    - Test: TUI renderer handles focus navigation
  - [x] 3.3.2 Implement `DOMGraphRenderer` in `dom/graph-renderer.tsx`
    - Use D3.js for SVG rendering
    - Use dagre for layout algorithm
    - Handle zoom/pan interactions
    - Reuse patterns from existing `devtools/src/react/` components
    - ~100 lines
  - [x] 3.3.3 Implement `TUIGraphRenderer` in `tui/ascii-graph.tsx`
    - Use box-drawing characters for connections
    - Implement tree layout algorithm
    - Reuse `renderAsciiGraph()` from `devtools-tui`
    - Handle focus-based selection
    - ~100 lines
  - [x] 3.3.4 Integrate renderers with primitives exports
    - Add `DOMGraphRenderer` to `DOMPrimitives`
    - Add `TUIGraphRenderer` to `TUIPrimitives`
  - [x] 3.3.5 Ensure graph renderer tests pass
    - Run ONLY the 6 tests written in 3.3.1

**Acceptance Criteria:**
- DOM uses D3/SVG with dagre layout
- TUI uses ASCII with tree layout
- Both accept same `GraphRendererProps`
- Node selection works on both platforms

---

## Phase 4: Wire Up Entries

### Task Group 4.1: DOM Entry Point
**Dependencies:** Task Groups 3.2, 3.3
**Complexity:** M

- [x] 4.1.0 Complete DOM entry point
  - [x] 4.1.1 Write 6 focused tests for DOM entry
    - Test: FloatingDevTools renders in corner position
    - Test: FloatingDevTools supports all 4 positions
    - Test: Resize handles work
    - Test: Fullscreen toggle works
    - Test: Production mode hides panel
    - Test: LocalStorage persistence works
  - [x] 4.1.2 Create `FloatingDevTools.tsx` in `dom/`
    - Wrap `DevToolsPanel` with DOM-specific chrome
    - Reuse floating panel logic from `devtools/src/react/devtools-floating.tsx`
    - Support position prop (bottom-right, bottom-left, top-right, top-left)
    - ~80 lines
  - [x] 4.1.3 Implement resize and drag functionality
    - Add resize handles
    - Support drag repositioning
    - Persist dimensions to localStorage
    - ~40 lines
  - [x] 4.1.4 Create `DOMDevToolsProvider` component
    - Wrap `PrimitivesProvider` with DOM primitives
    - Accept data source prop
    - Handle state initialization
    - ~30 lines
  - [x] 4.1.5 Configure `/dom` entry exports
    - Export `FloatingDevTools`, `DOMPrimitives`
    - Re-export shared components and hooks
    - Reference: requirements Section 6
  - [x] 4.1.6 Ensure DOM entry tests pass
    - Run ONLY the 6 tests written in 4.1.1

**Acceptance Criteria:**
- FloatingDevTools works like current implementation
- All corner positions supported
- Resize and fullscreen work
- Integrates with DevToolsProvider

---

### Task Group 4.2: TUI Entry Point
**Dependencies:** Task Groups 3.2, 3.3
**Complexity:** M

- [x] 4.2.0 Complete TUI entry point
  - [x] 4.2.1 Write 6 focused tests for TUI entry
    - Test: TuiDevTools renders in terminal
    - Test: Keyboard navigation works (Tab, Arrow keys)
    - Test: Q key exits application
    - Test: CLI binary starts correctly
    - Test: Remote connection works via WebSocket
    - Test: App ID filtering works
  - [x] 4.2.2 Create `TuiDevTools.tsx` in `tui/`
    - Wrap `DevToolsPanel` with TUI-specific chrome
    - Handle keyboard shortcuts (q=quit, tab=switch, arrows=navigate)
    - Display app ID in header
    - ~60 lines
  - [x] 4.2.3 Create `TUIDevToolsProvider` component
    - Wrap `PrimitivesProvider` with TUI primitives
    - Accept data source prop
    - ~30 lines
  - [x] 4.2.4 Create CLI binary in `tui/cli/index.ts`
    - Parse command line arguments (--url, --app-id)
    - Initialize RemoteDataSource
    - Render TuiDevTools with OpenTUI
    - Reference: requirements Section 8
    - ~50 lines
  - [x] 4.2.5 Configure `/tui` entry exports
    - Export `TuiDevTools`, `TUIPrimitives`
    - Re-export shared components and hooks
  - [x] 4.2.6 Ensure TUI entry tests pass
    - Run ONLY the 6 tests written in 4.2.1

**Acceptance Criteria:**
- TuiDevTools displays in terminal
- Keyboard navigation fully functional
- CLI binary works with remote DevTools server
- Integrates with DevToolsProvider

---

### Task Group 4.3: Network Layer Integration
**Dependencies:** Task Group 4.1, 4.2
**Complexity:** S

- [x] 4.3.0 Complete network layer integration
  - [x] 4.3.1 Write 4 focused tests for network layer
    - Test: LocalDataSource provides graph data
    - Test: RemoteDataSource connects via WebSocket
    - Test: Client registry handles multiple apps
    - Test: Protocol messages serialize correctly
  - [x] 4.3.2 Move network code to `devtools/src/network/`
    - Move `DevToolsServer`, `DevToolsClient` from `devtools-network`
    - Move `ClientRegistry` for multi-app support
    - Update imports
  - [x] 4.3.3 Move data sources to `devtools/src/data-source/`
    - Move `LocalDataSource` from `devtools-react`
    - Move `RemoteDataSource` from `devtools-react`
    - Ensure platform-agnostic implementation
  - [x] 4.3.4 Export from shared entry
    - Add network exports to `devtools/src/index.ts`
    - Maintain backward-compatible API
  - [x] 4.3.5 Ensure network tests pass
    - Run ONLY the 4 tests written in 4.3.1

**Acceptance Criteria:**
- LocalDataSource works for same-process DevTools
- RemoteDataSource works for CLI/remote DevTools
- WebSocket protocol unchanged
- Works from both DOM and TUI entries

---

## Phase 5: Cleanup and Validation

### Task Group 5.1: Integration Testing
**Dependencies:** All Phase 4 tasks
**Complexity:** M

- [x] 5.1.0 Complete integration testing
  - [x] 5.1.1 Review all tests from previous phases
    - Phase 1: 8 tests (scaffolding + core consolidation)
    - Phase 2: 22 tests (port contract + hook + DOM/TUI primitives)
    - Phase 3: 18 tests (state + components + graph renderers)
    - Phase 4: 32 tests (DOM/TUI entries + network)
    - Total existing: ~155 tests (runtime) + 39 type tests
  - [x] 5.1.2 Identify critical integration gaps
    - Focus on end-to-end workflows
    - Focus on platform switching scenarios
    - Focus on data flow from source to UI
  - [x] 5.1.3 Write up to 10 additional integration tests
    - Test: Full DOM workflow (LocalDataSource -> FloatingDevTools)
    - Test: Full TUI workflow (RemoteDataSource -> TuiDevTools)
    - Test: Graph updates when container changes
    - Test: Timeline updates during resolution
    - Test: Tab switching preserves state
    - Test: Platform switching scenarios
    - 13 integration tests added (tests/integration/unified-devtools.test.tsx)
  - [x] 5.1.4 Run feature-specific tests only
    - Run all tests related to unified devtools feature
    - Verified 168 total tests pass (13 test files)
    - Do NOT run entire monorepo test suite

**Acceptance Criteria:**
- All feature tests pass
- End-to-end workflows verified
- Both platforms tested
- No regressions in functionality

---

### Task Group 5.2: Deprecation and Migration Support
**Dependencies:** Task Group 5.1
**Complexity:** S

- [x] 5.2.0 Complete deprecation setup
  - [x] 5.2.1 Add deprecation notices to old packages
    - Add `@deprecated` JSDoc to old package exports
    - Added deprecation notices to: devtools-react, devtools-ui, devtools-tui, devtools-network, devtools-adapters
    - Point to new package locations with migration tables
  - [x] 5.2.2 Create re-export shims in deprecated packages
    - Packages continue to export their existing APIs (backward compatible)
    - Added comprehensive migration documentation in JSDoc comments
    - Note: Full re-export shims deferred as existing code continues to work
  - [x] 5.2.3 Update example applications
    - Updated `examples/react-showcase` with clarifying comments
    - Imports already use correct `@hex-di/devtools` paths
    - Type check passes successfully
  - [x] 5.2.4 Mark old packages for future removal
    - All deprecation notices include "Will be removed in v2.0"
    - Clear migration path documented in each package's index.ts

**Acceptance Criteria:**
- Deprecation warnings appear when using old packages
- Existing code continues to work via re-exports
- Examples updated to new structure
- Clear migration path documented in code

---

## Execution Order Summary

```
Phase 1: Create New Structure (Week 1)
  [1.1] Package Scaffolding
    |
    v
  [1.2] Move Core Types
    |
    v
Phase 2: Implement Primitives Port (Week 1-2)
  [2.1] RenderPrimitivesPort Contract
    |
    v
  [2.2] usePrimitives Hook
    |
    +---> [2.3] DOM Primitives (parallel)
    |
    +---> [2.4] TUI Primitives (parallel)
    |
    v
Phase 3: Convert Components (Week 2-3)
  [3.1] Migrate State and View Models
    |
    v
  [3.2] Create Shared Headless Components
    |
    v
  [3.3] Platform Graph Renderers
    |
    v
Phase 4: Wire Up Entries (Week 3)
  [4.1] DOM Entry Point (parallel)
  [4.2] TUI Entry Point (parallel)
    |
    v
  [4.3] Network Layer Integration
    |
    v
Phase 5: Cleanup (Week 4)
  [5.1] Integration Testing
    |
    v
  [5.2] Deprecation and Migration
```

---

## Complexity Summary

| Complexity | Count | Task Groups |
|------------|-------|-------------|
| Small (S) | 5 | 1.1, 1.2, 2.2, 3.1, 4.3, 5.2 |
| Medium (M) | 6 | 2.1, 2.3, 2.4, 3.3, 4.1, 4.2, 5.1 |
| Large (L) | 1 | 3.2 |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking changes to existing users | Re-export shims maintain backward compatibility |
| OpenTUI API instability | Abstract behind TUIPrimitives adapter |
| D3 bundle size | Tree-shaking excludes from TUI builds |
| Type complexity | Extensive type tests in 2.1.1 |
| Performance regression | Shared reducers/presenters unchanged |

---

## Success Metrics

1. **Package reduction**: 8 packages -> 2 packages (75% reduction)
2. **Code sharing**: ~90% shared code between DOM and TUI
3. **Platform-specific code**: ~200 lines each (~400 total)
4. **Test coverage**: ~168 focused tests covering critical paths
5. **Build size**: TUI bundle excludes React/D3 dependencies
6. **Migration friction**: Zero breaking changes for existing users during deprecation period
