# Task Breakdown: DevTools Architecture Visualization

## Overview

Total Tasks: 36 tasks across 7 task groups

This feature enables visualization of complete DI architecture including container hierarchies, port/adapter relationships, and 3-state adapter ownership (own/inherited/overridden) across the container tree.

## Task List

### Runtime & Core Changes

#### Task Group 1: Runtime Override Tracking

**Dependencies:** None
**Estimated Time:** 3-4 hours

- [x] 1.0 Complete runtime override tracking
  - [x] 1.1 Write 4-6 focused tests for override tracking functionality
    - Test that `overridePorts` Set is populated when child container uses override adapters
    - Test that `isOverride(portName)` returns correct boolean for overridden vs inherited ports
    - Test that override tracking works across multiple child container levels
    - Test that `ServiceOrigin` correctly returns `"overridden"` for override ports
  - [x] 1.2 Add `overridePorts: Set<string>` to AdapterRegistry
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/runtime/src/container/adapter-registry.ts`
    - Add new field to track which ports have been overridden from parent
    - Initialize empty Set in registry creation
  - [x] 1.3 Implement `isOverride(portName: string): boolean` method
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/runtime/src/container/adapter-registry.ts`
    - Check if portName exists in `overridePorts` Set
    - Method should be available on child container internal state
  - [x] 1.4 Update ServiceOrigin type to include "overridden"
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools-core/src/types.ts`
    - Change `ServiceOrigin = "own" | "inherited"` to `"own" | "inherited" | "overridden"`
  - [x] 1.5 Populate `overridePorts` during child container creation
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/runtime/src/container/child-impl.ts`
    - When processing `overrides` map, add port names to `overridePorts` Set
    - Ensure this happens before adapter registration
  - [x] 1.6 Ensure runtime override tests pass
    - Run ONLY the 4-6 tests written in 1.1
    - Verify override tracking works correctly

**Acceptance Criteria:**

- `overridePorts` Set correctly tracks overridden port names
- `isOverride()` method returns accurate results
- `ServiceOrigin` type includes `"overridden"` state
- Child containers correctly identify overridden vs inherited adapters

---

#### Task Group 2: Inspector API Extension

**Dependencies:** Task Group 1
**Estimated Time:** 2-3 hours

- [x] 2.0 Complete inspector API extension for override visibility
  - [x] 2.1 Write 4-5 focused tests for inspector override support
    - Test `VisualizableAdapter` includes `isOverride: boolean` field
    - Test `getGraphData()` returns correct origin for overridden adapters
    - Test override information is visible through inspector API
    - Test child container graph data shows "overridden" origin
  - [x] 2.2 Add `isOverride` flag to `VisualizableAdapter` interface
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/inspector/src/types.ts`
    - Add `readonly isOverride?: boolean` to `VisualizableAdapter`
  - [x] 2.3 Update `getGraphData()` to populate `isOverride` flag
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/inspector/src/plugin.ts`
    - Query child container's `isOverride()` method for each adapter
    - Set origin to `"overridden"` when `isOverride` is true
  - [x] 2.4 Update `buildUnifiedGraph()` to preserve override state
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/utils/build-graph-from-container.ts`
    - Ensure override information flows through to unified graph nodes
    - Added new `buildExportedGraphFromVisualizableAdapters()` function
    - Updated `buildUnifiedGraph()` to use `getGraphData()` for proper origin info
  - [x] 2.5 Ensure inspector API tests pass
    - Run ONLY the 4-5 tests written in 2.1
    - Verify override information is correctly exposed
    - All 5 tests pass

**Acceptance Criteria:**

- `VisualizableAdapter` has `isOverride` flag
- `getGraphData()` correctly identifies overridden adapters
- Override state is preserved in unified graph building

---

### Graph Visualization Types

#### Task Group 3: Graph Type Extensions

**Dependencies:** Task Group 2
**Estimated Time:** 2-3 hours

- [x] 3.0 Complete graph visualization type extensions
  - [x] 3.1 Write 3-4 focused type tests for graph types
    - Test `PositionedNode` accepts `ownership` field with 3-state type
    - Test `ExportedNode` includes ownership and containerOwnership fields
    - Test type compatibility between graph types and components
    - Created `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/tests/graph-type-extensions.test-d.ts` with 8 type tests
  - [x] 3.2 Add `ownership` field to `PositionedNode`
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/graph-visualization/types.ts`
    - Add `readonly ownership?: "own" | "inherited" | "overridden"`
    - Document visual styling implications in JSDoc
  - [x] 3.3 Add container ownership metadata to `ExportedNode`
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools-core/src/types.ts`
    - Add `readonly ownership?: "own" | "inherited" | "overridden"`
    - Add `readonly containerOwnership?: ReadonlyArray<{ containerId: string; ownership: "own" | "inherited" | "overridden" }>`
    - Added `ContainerOwnershipEntry` interface and exported from index
  - [x] 3.4 Update `DependencyGraphProps` node type
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/graph-visualization/types.ts`
    - Add ownership and containerOwnership fields to node type in props
    - Added `ContainerOwnershipEntry` interface and exported from index
  - [x] 3.5 Ensure type tests pass
    - Run ONLY the 3-4 type tests written in 3.1
    - Verify type compatibility across packages
    - All 8 type tests pass

**Acceptance Criteria:**

- `PositionedNode` supports 3-state ownership
- `ExportedNode` includes per-container ownership metadata
- Types are consistent across devtools-core and devtools packages

---

### Container Tree Sidebar

#### Task Group 4: Container Tree View Enhancement

**Dependencies:** Task Group 2
**Estimated Time:** 4-5 hours

- [x] 4.0 Complete container tree sidebar enhancement
  - [x] 4.1 Write 5-6 focused tests for container tree
    - Test tree renders hierarchical parent-child relationships
    - Test `ContainerKindBadge` shows correct badge (root/child/lazy)
    - Test multi-select checkboxes filter graph view
    - Test "All" and "None" quick selection buttons work
    - Test proper indentation for nested containers
    - Test lifecycle state indicators for different phases
    - Test container count in header and selected count
    - Test expand/collapse chevron toggles visibility
    - Test keyboard navigation with Space and Ctrl+A
    - Test file: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/tests/react/container-multi-select.test.tsx`
  - [x] 4.2 Add lifecycle state indicator to tree nodes
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/container-multi-select.tsx`
    - Add phase badge/indicator next to container name
    - Use existing `ContainerPhase` type from devtools-core
    - Style: Pending (gray pulsing), Ready (green), Disposing (orange), Disposed (red)
  - [x] 4.3 Add container count badge to header
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/container-multi-select.tsx`
    - Show "Containers (N)" in header where N is total count
    - Show "N selected" when not all containers are selected
  - [x] 4.4 Add expand/collapse for tree branches
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/container-multi-select.tsx`
    - Add chevron icon for containers with children
    - Implement expand/collapse state per node
    - Default to expanded for containers with < 5 children
  - [x] 4.5 Implement keyboard navigation
    - Arrow keys for tree navigation (ArrowUp, ArrowDown, Home, End)
    - ArrowRight/ArrowLeft for expand/collapse
    - Space to toggle selection
    - Ctrl+A for select all
  - [x] 4.6 Ensure container tree tests pass
    - Run ONLY the 5-6 tests written in 4.1
    - Verify tree functionality works correctly
    - All 10 tests pass

**Acceptance Criteria:**

- Tree displays container hierarchy with proper indentation
- Lifecycle states are visually indicated
- Multi-select filters graph view correctly
- Keyboard navigation works

---

### Ownership Visual Treatments

#### Task Group 5: Node Ownership Styling

**Dependencies:** Task Groups 3, 4
**Estimated Time:** 4-5 hours

- [x] 5.0 Complete ownership visual styling for graph nodes
  - [x] 5.1 Write 5-6 focused tests for ownership styling
    - Test "own" nodes render with solid 2px border, full opacity
    - Test "inherited" nodes render with dashed 4-2 border, 85% opacity
    - Test "overridden" nodes render with double 3px border, OVR badge
    - Test inheritance mode badge (S/F/I) appears on inherited nodes
    - Test count badge appears for ports with 3+ adapters
    - Test file: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/tests/react/graph-node-ownership.test.tsx`
    - All 9 tests pass
  - [x] 5.2 Create ownership style constants
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/graph-visualization/graph-styles.ts`
    - Define `OWNERSHIP_STYLES` constant with border, opacity, badge configurations
    - `own`: solid 2px border, opacity 1.0
    - `inherited`: dashed "4 2" border, opacity 0.85
    - `overridden`: double 3px border, opacity 1.0
  - [x] 5.3 Implement `getOwnershipStyle()` utility function
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/graph-visualization/graph-styles.ts`
    - Return appropriate CSS properties based on ownership state
    - Handle undefined ownership (default to "own" styling)
  - [x] 5.4 Update `GraphNode` component with ownership styling
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/graph-visualization/graph-node.tsx`
    - Apply ownership-based border styles
    - Apply opacity based on ownership
    - Render inheritance mode badge (S/F/I) for inherited nodes
  - [x] 5.5 Implement OVR badge for overridden nodes
    - Create small badge component or inline element
    - Position in top-right corner of node
    - Use distinct color (orange/amber - #fab387)
  - [x] 5.6 Implement count badge for multi-adapter ports
    - Show count when port has 3+ adapters from different containers
    - Position badge in bottom-right corner
    - Format: "+N" where N is additional adapter count
  - [x] 5.7 Ensure ownership styling tests pass
    - Run ONLY the 5-6 tests written in 5.1
    - Verify visual treatments render correctly
    - All 9 tests pass

**Acceptance Criteria:**

- Own, inherited, and overridden nodes have distinct visual styles
- Inheritance mode badges (S/F/I) appear on inherited nodes
- OVR badge appears on overridden nodes
- Count badge appears for ports with 3+ adapters

---

### Tooltip & Details Enhancement

#### Task Group 6: Enhanced Tooltip & Filtering

**Dependencies:** Task Groups 3, 5
**Estimated Time:** 4-5 hours

- [x] 6.0 Complete tooltip and filtering enhancements
  - [x] 6.1 Write 5-6 focused tests for tooltip and filtering
    - Test tooltip shows ownership state with appropriate label
    - Test tooltip shows container list with per-container ownership
    - Test filter chips filter by lifetime/container/ownership
    - Test quick presets ("Overrides Only", "Async Services", etc.)
    - Test port name search with fuzzy matching
    - Test file: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/tests/react/tooltip-and-filtering.test.tsx`
    - All 16 tests pass
  - [x] 6.2 Extend `GraphTooltip` with ownership information
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/graph-visualization/graph-tooltip.tsx`
    - Add "Ownership" row showing "Own", "Inherited", or "Overridden"
    - Color-code ownership status (green for own, gray for inherited, orange for overridden)
  - [x] 6.3 Enhance container list in tooltip
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/graph-visualization/graph-tooltip.tsx`
    - Show ownership state next to each container in the list
    - Format: "ContainerName (own)" or "ContainerName (inherited [S])"
  - [x] 6.4 Create filter chip components
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/components/filter-chips.tsx` (new file)
    - Implement `FilterChip` component with label, active state, click handler
    - Implement `FilterChipGroup` for grouping related chips
    - Style to match existing DevTools design
  - [x] 6.5 Implement filter state management
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/hooks/use-graph-filters.ts` (new file)
    - Create `useGraphFilters()` hook for managing filter state
    - Support filters: lifetime, container, ownership, search term
    - Return filtered nodes and active filter count
  - [x] 6.6 Add quick preset buttons
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/components/filter-presets.tsx` (new file)
    - "Overrides Only" - filter to ownership === "overridden"
    - "Async Services" - filter to factoryKind === "async"
    - "Current Container" - filter to first selected container
    - "Inherited Only" - filter to ownership === "inherited"
  - [x] 6.7 Add search input for port names
    - Implemented in `useGraphFilters()` hook
    - Fuzzy search using simple substring matching
    - Debounce input (300ms) to avoid excessive re-renders
    - Show match count indicator
  - [x] 6.8 Ensure tooltip and filtering tests pass
    - Run ONLY the 5-6 tests written in 6.1
    - Verify tooltip shows correct information
    - Verify filters work correctly
    - All 16 tests pass

**Acceptance Criteria:**

- Tooltip shows ownership state and per-container ownership in list
- Filter chips work for lifetime, container, and ownership
- Quick presets filter graph as expected
- Port name search filters nodes with fuzzy matching

---

### Lifecycle & Integration

#### Task Group 7: Lifecycle Updates & Integration

**Dependencies:** Task Groups 4, 5, 6
**Estimated Time:** 5-6 hours

- [x] 7.0 Complete lifecycle updates and integration
  - [x] 7.1 Write 6-8 focused tests for lifecycle and integration
    - Test container enter animation (250ms fade-in)
    - Test container exit animation (200ms fade-out)
    - Test state change animation (150ms badge transition)
    - Test `ContainerLifecycleEmitter` emits correct events
    - Test `useSyncExternalStore` subscription prevents tearing
    - Test unified graph displays correctly in `GraphTabContent`
    - Test file: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/tests/react/lifecycle-and-integration.test.tsx`
    - All 16 tests pass
  - [x] 7.2 Create `ContainerLifecycleEmitter`
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/hooks/use-container-lifecycle.ts` (new file)
    - Follow existing `ScopeLifecycleEmitter` pattern from runtime
    - Emit events: `container-created`, `container-phase-changed`, `container-disposed`
    - Use `queueMicrotask` for deferred event emission
  - [x] 7.3 Implement `useContainerLifecycle()` hook
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/hooks/use-container-lifecycle.ts`
    - Use `useSyncExternalStore` for concurrent-safe subscriptions
    - Return container phase and transition state
    - Memoize snapshots using version counter
  - [x] 7.4 Add animation styles for container state changes
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/styles.ts`
    - Define CSS keyframes for enter (fade-in), exit (fade-out)
    - Define badge color transitions (150ms ease)
    - Stagger timing for sibling containers (50ms)
  - [x] 7.5 Apply animations to `ContainerMultiSelect` tree nodes
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/container-multi-select.tsx`
    - Track presence state (entering/entered/exiting/exited)
    - Apply appropriate animation class based on presence
  - [x] 7.6 Wire filtering into `GraphTabContent`
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/graph-tab-content.tsx`
    - Add filter toolbar above graph view
    - Connect `useGraphFilters()` hook
    - Pass filtered nodes to `DependencyGraph` component
  - [x] 7.7 Add filter toolbar layout to `GraphTabContent`
    - File: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/graph-tab-content.tsx`
    - Place filter chips and search in a horizontal toolbar
    - Add preset buttons as a secondary row or dropdown
    - Show active filter count badge
  - [x] 7.8 Integration testing and polish
    - Verify all components work together
    - Check for visual consistency
    - Ensure no console errors or warnings
  - [x] 7.9 Ensure lifecycle and integration tests pass
    - Run ONLY the 6-8 tests written in 7.1
    - Verify animations and subscriptions work correctly
    - All 16 tests pass

**Acceptance Criteria:**

- Container lifecycle animations work smoothly
- `ContainerLifecycleEmitter` follows existing patterns
- `useSyncExternalStore` prevents React concurrent tearing
- Filter toolbar integrates cleanly with graph view
- All components work together in `GraphTabContent`

---

### Testing & Quality Assurance

#### Task Group 8: Test Review & Gap Analysis

**Dependencies:** Task Groups 1-7
**Estimated Time:** 2-3 hours

- [x] 8.0 Review existing tests and fill critical gaps only
  - [x] 8.1 Review tests from Task Groups 1-7
    - Reviewed 8 tests from Task Group 1 (runtime override tracking)
    - Reviewed 5 tests from Task Group 2 (inspector API)
    - Reviewed 8 type tests from Task Group 3 (graph types)
    - Reviewed 10 tests from Task Group 4 (container tree)
    - Reviewed 9 tests from Task Group 5 (ownership styling)
    - Reviewed 16 tests from Task Group 6 (tooltip/filtering)
    - Reviewed 16 tests from Task Group 7 (lifecycle/integration)
    - Total existing tests: 72 tests (exceeded initial estimate)
  - [x] 8.2 Analyze test coverage gaps for this feature only
    - Identified critical end-to-end workflows lacking coverage
    - Focused on integration between runtime, inspector, and UI
    - Prioritized user-facing scenarios over internal implementation
  - [x] 8.3 Write up to 8 additional strategic tests maximum
    - E2E test: Override created in child container appears with correct origin (DONE)
    - E2E test: Selecting multiple containers shows unified graph with ownership (DONE)
    - E2E test: Filter presets (Overrides Only, Inherited Only, Async Services) correctly filter nodes (DONE)
    - E2E test: Container lifecycle state changes trigger visual updates (DONE)
    - Integration test: Inspector API correctly propagates override state to DevTools (DONE)
    - Integration test: Combined filters produce correct intersection (DONE)
    - Integration test: Container tree multi-select updates unified graph (DONE)
    - Integration test: Search combines with filters correctly (DONE)
    - Test file: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/tests/react/architecture-visualization-e2e.test.tsx`
    - All 10 tests pass (8 E2E + integration tests as specified, with 2 additional sub-tests)
  - [x] 8.4 Run feature-specific tests only
    - All tests from Task Groups 1-7 pass
    - All 10 E2E/integration tests from Task Group 8 pass
    - Final total: 82 tests for this feature

**Acceptance Criteria:**

- All feature-specific tests pass
- Critical user workflows have adequate coverage
- No more than 8 additional tests added (wrote 8 test blocks with 10 total tests)
- Testing focused exclusively on architecture visualization feature

---

## Execution Order

Recommended implementation sequence:

```
Phase 1: Runtime Foundation (Days 1-2)
  1. Task Group 1: Runtime Override Tracking
  2. Task Group 2: Inspector API Extension

Phase 2: Type System (Day 2)
  3. Task Group 3: Graph Type Extensions

Phase 3: UI Components (Days 3-4)
  4. Task Group 4: Container Tree View Enhancement
  5. Task Group 5: Node Ownership Styling
  6. Task Group 6: Enhanced Tooltip & Filtering

Phase 4: Integration (Day 5)
  7. Task Group 7: Lifecycle Updates & Integration

Phase 5: Quality (Day 5)
  8. Task Group 8: Test Review & Gap Analysis
```

---

## File Summary

### Files to Modify

| File                                                                                                         | Task Groups |
| ------------------------------------------------------------------------------------------------------------ | ----------- |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/runtime/src/container/adapter-registry.ts`                | 1           |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/runtime/src/container/child-impl.ts`                      | 1           |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/runtime/src/inspector/types.ts`                           | 1           |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools-core/src/types.ts`                               | 1, 3        |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/inspector/src/types.ts`                                   | 2           |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/inspector/src/plugin.ts`                                  | 2           |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/utils/build-graph-from-container.ts`   | 2           |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/graph-visualization/types.ts`          | 2, 3        |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/graph-visualization/graph-layout.ts`   | 2           |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/container-multi-select.tsx`            | 4, 7        |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/graph-visualization/graph-styles.ts`   | 5           |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/graph-visualization/graph-node.tsx`    | 5           |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/graph-visualization/graph-tooltip.tsx` | 6           |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/graph-tab-content.tsx`                 | 7           |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/styles.ts`                             | 7           |

### New Files to Create

| File                                                                                                             | Task Group | Purpose                               |
| ---------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------- |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/runtime/tests/override-tracking.test.ts`                      | 1          | Override tracking tests               |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/inspector/tests/inspector-override-support.test.ts`           | 2          | Inspector override support tests      |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/tests/graph-type-extensions.test-d.ts`               | 3          | Graph type extension type tests       |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/tests/react/container-multi-select.test.tsx`         | 4          | Container tree enhancement tests      |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/tests/react/graph-node-ownership.test.tsx`           | 5          | Ownership styling tests               |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/components/filter-chips.tsx`               | 6          | Filter chip UI components             |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/components/filter-presets.tsx`             | 6          | Quick preset filter buttons           |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/hooks/use-graph-filters.ts`                | 6          | Filter state management hook          |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/hooks/use-container-lifecycle.ts`          | 7          | Container lifecycle subscription hook |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/tests/react/lifecycle-and-integration.test.tsx`      | 7          | Lifecycle and integration tests       |
| `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/tests/react/architecture-visualization-e2e.test.tsx` | 8          | E2E and integration tests             |

---

## Technical Notes

### Pattern References

- **ScopeLifecycleEmitter pattern:** See `/Users/mohammadalmechkor/Projects/hex-di/packages/runtime/src/scope/lifecycle-events.ts`
- **Existing filter infrastructure:** Reuse patterns from existing DevTools components
- **useSyncExternalStore:** React 18 hook for external store subscriptions

### Visual Design Specifications

- **Own nodes:** Solid 2px border, opacity 1.0
- **Inherited nodes:** Dashed "4 2" border, opacity 0.85, S/F/I badge
- **Overridden nodes:** Double 3px border, opacity 1.0, OVR badge
- **Animation timing:** Enter 250ms, Exit 200ms, State change 150ms

### Performance Targets

- Target scale: <50 containers
- No virtualization needed initially
- Apply `React.memo` only when profiling shows need
