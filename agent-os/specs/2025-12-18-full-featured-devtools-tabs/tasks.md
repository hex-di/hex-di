# Task Breakdown: Full-Featured DevTools Tabs

## Overview
Total Tasks: 106 sub-tasks across 12 task groups

This implementation builds fully functional DevTools tabs for browser and TUI with complete feature parity, real-time synchronization, and support for all HexDI features.

## Architecture Summary

```
Shared Business Logic (State, View Models, Presenters)
                    |
                    v
         RenderPrimitivesPort
              /         \
             v           v
    DOM Adapter      TUI Adapter
    (Browser)        (Terminal)
```

**Key Principles:**
- All tabs built simultaneously (Graph, Services, Tracing, Inspector)
- Browser and TUI developed in parallel
- Shared business logic with platform-specific adapters only
- Test-driven approach with focused test coverage

---

## Task List

### Phase 1: Foundation Layer

#### Task Group 1: State Management Extensions
**Dependencies:** None
**Parallelizable:** Yes - can work alongside Task Groups 2-3

- [x] 1.0 Complete state management extensions for advanced features
  - [x] 1.1 Write 6 focused tests for new state slices
    - Test time-travel snapshot capture action
    - Test snapshot navigation (prev/next)
    - Test comparison state updates
    - Test container hierarchy state
    - Test filter persistence actions
    - Test sync state (connection, remote actions)
  - [x] 1.2 Extend `DevToolsState` interface with new state slices
    - Add `timeTravel: TimeTravelState` slice
    - Add `comparison: ComparisonState` slice
    - Add `containers: ContainerHierarchyState` slice
    - Add `sync: SyncState` slice for browser/TUI coordination
    - Reference: `/packages/devtools/src/state/devtools.state.ts`
  - [x] 1.3 Add new action types for advanced features
    - `CAPTURE_SNAPSHOT`, `NAVIGATE_SNAPSHOT`, `SET_SNAPSHOT_INDEX`
    - `SET_COMPARISON_LEFT`, `SET_COMPARISON_RIGHT`, `TOGGLE_COMPARISON`
    - `SET_ACTIVE_CONTAINER`, `UPDATE_CONTAINER_HIERARCHY`
    - `SYNC_STATE`, `REMOTE_ACTION_RECEIVED`
    - Reference: `/packages/devtools/src/state/actions.ts`
  - [x] 1.4 Implement reducer cases for new actions
    - Follow immutable update pattern with `Object.freeze`
    - Handle all new action types in switch statement
    - Reference: `/packages/devtools/src/state/reducer.ts`
  - [x] 1.5 Add selectors for derived state
    - `selectCurrentSnapshot`, `selectSnapshotHistory`
    - `selectComparisonDiff`, `selectActiveContainer`
    - `selectContainerHierarchy`, `selectSyncStatus`
    - Reference: `/packages/devtools/src/state/selectors.ts`
  - [x] 1.6 Ensure state management tests pass
    - Run only the 6 tests from 1.1
    - Verify immutability is preserved
    - Verify state transitions are correct

**Acceptance Criteria:**
- All 6 state tests pass
- New state slices properly typed with readonly properties
- Reducer handles all new actions
- Selectors compute derived state correctly

---

#### Task Group 2: View Model Extensions
**Dependencies:** None
**Parallelizable:** Yes - can work alongside Task Groups 1, 3

- [x] 2.0 Complete view model extensions for all tabs
  - [x] 2.1 Write 8 focused tests for view model factories and types
    - Test `FlameGraphViewModel` creation with trace hierarchy
    - Test `ComparisonViewModel` with diff calculation
    - Test `TimeTravelViewModel` snapshot navigation
    - Test `ContainerHierarchyViewModel` tree structure
    - Test extended `GraphViewModel` with captive warnings
    - Test `ServiceInfoViewModel` with async factory status
    - Test view model immutability (Object.freeze)
    - Test edge cases (empty data, single node)
  - [x] 2.2 Extend `GraphViewModel` for child containers and captive warnings
    - Add `containerGroupings: ContainerGrouping[]`
    - Add `captiveWarnings: CaptiveWarning[]`
    - Add `containerBoundaryEdges: EdgeViewModel[]`
    - Reference: `/packages/devtools/src/view-models/graph.vm.ts`
  - [x] 2.3 Create `FlameGraphViewModel` for performance profiling
    - `frames: FlameFrame[]` with cumulative/self time
    - `depth: number`, `totalDuration: number`
    - `selectedFrameId: string | null`
    - `zoomRange: { start: number; end: number }`
  - [x] 2.4 Create `ComparisonViewModel` for snapshot diffs
    - `leftSnapshot: SnapshotSummary`, `rightSnapshot: SnapshotSummary`
    - `addedServices: string[]`, `removedServices: string[]`
    - `changedServices: ServiceDiff[]`
    - `resolutionDeltas: Map<string, number>`
  - [x] 2.5 Create `TimeTravelViewModel` for debugging history
    - `snapshots: SnapshotSummary[]`
    - `currentIndex: number`
    - `canGoBack: boolean`, `canGoForward: boolean`
    - `stateDiff: StateDiff | null` (diff from previous)
  - [x] 2.6 Create `ContainerHierarchyViewModel`
    - `containers: ContainerNode[]` (tree structure)
    - `activeContainerId: string`
    - `containerPhases: Map<string, ContainerPhase>`
  - [x] 2.7 Extend `ServiceInfoViewModel` in inspector
    - Add `asyncFactoryStatus: 'pending' | 'resolved' | 'error' | null`
    - Add `asyncResolutionTime: number | null`
    - Add `captiveChain: string[]` for captive dependency visualization
    - Reference: `/packages/devtools/src/view-models/inspector.vm.ts`
  - [x] 2.8 Ensure view model tests pass
    - Run only the 8 tests from 2.1

**Acceptance Criteria:**
- All 8 view model tests pass
- All new view models are immutable (frozen)
- Type definitions complete with JSDoc comments
- Factory functions create valid default instances

---

#### Task Group 3: Presenter Extensions
**Dependencies:** Task Group 2 (view models must be defined)
**Parallelizable:** Yes - can work alongside Task Groups 1, 4

- [x] 3.0 Complete presenter extensions for all visualization features
  - [x] 3.1 Write 8 focused tests for presenter transformations
    - Test `GraphPresenter` container grouping
    - Test `GraphPresenter` captive dependency highlighting
    - Test `FlameGraphPresenter` frame aggregation
    - Test `ComparisonPresenter` diff calculation
    - Test `TimeTravelPresenter` snapshot navigation
    - Test `InspectorPresenter` async factory status
    - Test presenter response to state changes
    - Test presenter caching/memoization behavior
  - [x] 3.2 Extend `GraphPresenter` for child containers
    - Add `groupNodesByContainer()` method
    - Add `calculateContainerBoundaries()` method
    - Add `highlightCaptiveDependencies()` method
    - Use existing `PresenterDataSourceContract` pattern
    - Reference: `/packages/devtools/src/presenters/graph.presenter.ts`
  - [x] 3.3 Extend `GraphPresenter` for captive detection
    - Add `detectCaptiveDependencies()` method
    - Return warning data in view model
    - Integrate with filter state for "show only captive issues"
  - [x] 3.4 Create `FlameGraphPresenter`
    - Transform trace hierarchy to flame graph frames
    - Calculate cumulative time (includes children)
    - Calculate self time (excludes children)
    - Support zoom range for drill-down
    - Follow pattern from `GraphPresenter`
  - [x] 3.5 Create `ComparisonPresenter`
    - Accept two `ContainerSnapshot` instances
    - Compute service additions/removals
    - Calculate resolution count deltas
    - Compute timing differences
  - [x] 3.6 Create `TimeTravelPresenter`
    - Manage snapshot history array
    - Compute state diffs between snapshots
    - Efficient delta compression for storage
    - Navigation logic (back/forward/jump)
  - [x] 3.7 Extend `InspectorPresenter` for async factories
    - Transform async factory resolution status
    - Include timing information
    - Display captive dependency chain
    - Reference: `/packages/devtools/src/presenters/inspector.presenter.ts`
  - [x] 3.8 Ensure presenter tests pass
    - Run only the 8 tests from 3.1

**Acceptance Criteria:**
- All 8 presenter tests pass
- Presenters correctly transform data to view models
- No side effects in presenter methods
- All presenters use `PresenterDataSourceContract` for data access

---

### Phase 2: RenderPrimitivesPort Extensions

#### Task Group 4: New Render Primitives Definition
**Dependencies:** Task Group 2 (view models for prop types)
**Parallelizable:** Yes - can work alongside Task Groups 1-3, 5-6

- [x] 4.0 Complete new render primitives for advanced visualizations
  - [x] 4.1 Write 6 focused tests for primitive contracts
    - Test `FlameGraph` prop types are correct
    - Test `Timeline` (scrubber) prop types
    - Test `DiffView` prop types
    - Test `ContainerTree` prop types
    - Test `PerformanceBadge` prop types
    - Test primitive callbacks (onSelect, onZoom, etc.)
  - [x] 4.2 Define `FlameGraphProps` interface
    - `viewModel: FlameGraphViewModel`
    - `onFrameSelect?: (frameId: string) => void`
    - `onZoomChange?: (range: ZoomRange) => void`
    - `thresholdMs?: number` (filter small frames)
  - [x] 4.3 Define `TimelineScrubberProps` interface
    - `snapshots: SnapshotSummary[]`
    - `currentIndex: number`
    - `onNavigate: (index: number) => void`
    - `onCapture?: () => void`
  - [x] 4.4 Define `DiffViewProps` interface
    - `viewModel: ComparisonViewModel`
    - `onServiceSelect?: (portName: string) => void`
    - `showAdditions?: boolean`
    - `showRemovals?: boolean`
    - `showChanges?: boolean`
  - [x] 4.5 Define `ContainerTreeProps` interface
    - `viewModel: ContainerHierarchyViewModel`
    - `onContainerSelect: (containerId: string) => void`
    - `expandedIds: string[]`
    - `onToggleExpand: (containerId: string) => void`
  - [x] 4.6 Extend `RenderPrimitives<R>` interface
    - Add `FlameGraph: PrimitiveComponent<FlameGraphProps>`
    - Add `TimelineScrubber: PrimitiveComponent<TimelineScrubberProps>`
    - Add `DiffView: PrimitiveComponent<DiffViewProps>`
    - Add `ContainerTree: PrimitiveComponent<ContainerTreeProps>`
    - Add `PerformanceBadge: PrimitiveComponent<PerformanceBadgeProps>`
    - Reference: `/packages/devtools/src/ports/render-primitives.port.ts`
  - [x] 4.7 Ensure primitive contract tests pass
    - Run only the 6 tests from 4.1

**Acceptance Criteria:**
- All 6 primitive contract tests pass
- All new primitive interfaces have complete type definitions
- Interfaces include JSDoc documentation
- Props support both DOM and TUI requirements

---

### Phase 3: Platform Adapters (Parallel Development)

#### Task Group 5: DOM Adapter Implementation
**Dependencies:** Task Group 4 (primitive interfaces defined) - COMPLETED
**Parallelizable:** Yes - work in parallel with Task Group 6

- [x] 5.0 Complete DOM adapter implementations for new primitives
  - [x] 5.1 Write 6 focused tests for DOM primitives
    - Test `DOMFlameGraph` renders SVG correctly
    - Test `DOMFlameGraph` handles click interactions
    - Test `DOMTimelineScrubber` renders timeline correctly
    - Test `DOMDiffView` shows diff markers
    - Test `DOMContainerTree` renders tree structure
    - Test theme integration (CSS variables)
  - [x] 5.2 Implement `DOMFlameGraph` component
    - Use SVG for rendering flame frames
    - Support zoom/pan with mouse drag
    - Color coding by duration (green/yellow/red)
    - Tooltip on hover with frame details
    - Reference: `/packages/devtools/src/dom/primitives.tsx`
  - [x] 5.3 Implement `DOMTimelineScrubber` component
    - Render snapshot markers on timeline
    - Draggable scrubber handle
    - Click-to-navigate functionality
    - Current position indicator
  - [x] 5.4 Implement `DOMDiffView` component
    - Side-by-side diff layout
    - Color-coded additions (green), removals (red), changes (yellow)
    - Collapsible sections for each diff type
    - Service name click navigation
  - [x] 5.5 Implement `DOMContainerTree` component
    - Expandable/collapsible tree nodes
    - Container phase badges (initializing/ready/disposing/disposed)
    - Click to select container
    - Visual hierarchy with indentation
  - [x] 5.6 Extend `DOMPrimitives` export
    - Add all new components to `DOMPrimitives` object
    - Ensure type safety with `RenderPrimitives<'dom'>`
  - [x] 5.7 Ensure DOM adapter tests pass
    - Run only the 6 tests from 5.1

**Acceptance Criteria:**
- All 6 DOM adapter tests pass
- All components render correctly in browser
- Interactions (click, drag, hover) work properly
- Theme CSS variables are respected

---

#### Task Group 6: TUI Adapter Implementation
**Dependencies:** Task Group 4 (primitive interfaces defined)
**Parallelizable:** Yes - work in parallel with Task Group 5

- [x] 6.0 Complete TUI adapter implementations for new primitives
  - [x] 6.1 Write 6 focused tests for TUI primitives
    - Test `TUIFlameGraph` renders ASCII bars
    - Test `TUIFlameGraph` handles keyboard navigation
    - Test `TUITimelineScrubber` renders timeline
    - Test `TUIDiffView` shows diff symbols
    - Test `TUIContainerTree` renders tree with box-drawing
    - Test ANSI color application
  - [x] 6.2 Implement `TUIFlameGraph` component
    - ASCII horizontal bar representation
    - Proportional widths based on duration
    - Color coding with ANSI colors
    - Keyboard navigation (arrow keys)
    - Reference: `/packages/devtools/src/tui/primitives.tsx`
  - [x] 6.3 Implement `TUITimelineScrubber` component
    - Text-based timeline with markers
    - Bracket indicators for current position
    - Number key navigation (1-9 for quick jump)
    - Arrow key navigation (left/right)
  - [x] 6.4 Implement `TUIDiffView` component
    - Text diff format with +/- prefixes
    - ANSI color coding for additions/removals
    - Scrollable sections for long diffs
    - Summary counts at top
  - [x] 6.5 Implement `TUIContainerTree` component
    - Box-drawing characters for tree lines
    - Bracket indicators for expanded/collapsed
    - Container phase shown inline
    - Keyboard navigation (j/k or arrows)
  - [x] 6.6 Extend `TUIPrimitives` export
    - Add all new components to `TUIPrimitives` object
    - Ensure type safety with `RenderPrimitives<'tui'>`
  - [x] 6.7 Ensure TUI adapter tests pass
    - Run only the 6 tests from 6.1

**Acceptance Criteria:**
- All 6 TUI adapter tests pass
- All components render correctly in terminal
- Keyboard navigation works properly
- Mouse support where terminal supports it

---

### Phase 4: Tab Components (All Built Simultaneously)

#### Task Group 7: Graph Tab Full Implementation
**Dependencies:** Task Groups 1-6
**Parallelizable:** Yes - work in parallel with Task Groups 8-10

- [x] 7.0 Complete Graph Tab with all features
  - [x] 7.1 Write 6 focused tests for Graph Tab
    - Test node selection and path highlighting
    - Test filtering by lifetime and name pattern
    - Test zoom/pan state management
    - Test child container grouping display
    - Test captive dependency warning indicators
    - Test async factory indicators on nodes
  - [x] 7.2 Enhance `GraphView` shared component
    - Add filter controls (name input, lifetime dropdown)
    - Add async filter toggle
    - Add captive-only filter toggle
    - Integrate container selector dropdown
    - Reference: `/packages/devtools/src/components/GraphView.tsx`
  - [x] 7.3 Implement container hierarchy overlay
    - Visual grouping boxes around container services
    - Labeled container boundaries
    - Different styling for inherited vs container-specific services
    - Cross-container edges with distinct styling
  - [x] 7.4 Implement captive dependency visualization
    - Warning icon overlay on affected nodes
    - Highlight captive chain on selection
    - Tooltip with captive explanation
    - Color-coded warning severity
  - [x] 7.5 Implement async factory indicators
    - Async icon badge on nodes (using existing `factoryKind`)
    - Pending/resolved/error state indicators
    - Spinner animation for pending async resolutions
  - [x] 7.6 Wire Graph Tab actions to presenters and state
    - Connect filter changes to presenter
    - Connect selection to state management
    - Trigger re-render on state changes
  - [x] 7.7 Ensure Graph Tab tests pass
    - Run only the 6 tests from 7.1

**Acceptance Criteria:**
- All 6 Graph Tab tests pass
- All filtering options work correctly
- Node selection highlights dependency paths
- Child containers visualized correctly
- Captive dependencies highlighted with warnings

---

#### Task Group 8: Services Tab Full Implementation
**Dependencies:** Task Groups 1-6
**Parallelizable:** Yes - work in parallel with Task Groups 7, 9-10

- [x] 8.0 Complete Services Tab with all features
  - [x] 8.1 Write 6 focused tests for Services Tab
    - Test service list rendering with all properties
    - Test sorting by name, lifetime, count, duration
    - Test search/filter functionality
    - Test container grouping display
    - Test captive warning badges
    - Test navigation to Inspector tab
  - [x] 8.2 Enhance `StatsView` for Services Tab functionality
    - Add sortable table headers
    - Add search input matching Graph filters
    - Add column: resolution count
    - Add column: cache hit statistics
    - Add column: dependency count (in/out edges)
    - Note: Implemented in `/packages/devtools/src/components/ServicesView.tsx`
  - [x] 8.3 Implement service grouping by container
    - Collapsible container groups
    - Container phase indicator per group
    - Count of services per container
    - Visual separation between containers
  - [x] 8.4 Implement captive warning badges
    - Warning icon on affected service rows
    - Hover tooltip with affected dependencies
    - Filter toggle to show only captive issues
  - [x] 8.5 Implement async factory column
    - Async indicator icon
    - Status badge (pending/resolved/error)
    - Filter toggle for async-only services
  - [x] 8.6 Wire service selection to Inspector navigation
    - Click service name to navigate to Inspector
    - Set selected service in state
    - Switch active tab to inspector
  - [x] 8.7 Ensure Services Tab tests pass
    - Run only the 6 tests from 8.1

**Acceptance Criteria:**
- All 6 Services Tab tests pass
- All columns display correct data
- Sorting works on all sortable columns
- Search filters match Graph tab filters
- Navigation to Inspector works

---

#### Task Group 9: Tracing Tab Full Implementation
**Dependencies:** Task Groups 1-6
**Parallelizable:** Yes - work in parallel with Task Groups 7-8, 10

- [x] 9.0 Complete Tracing Tab with all features
  - [x] 9.1 Write 8 focused tests for Tracing Tab
    - Test live trace stream display
    - Test parent-child hierarchy visualization
    - Test duration color coding (green/yellow/red)
    - Test grouping modes (service, scope, lifetime, time)
    - Test trace persistence (localStorage/file)
    - Test pause/resume functionality
    - Test trace pinning for slow resolutions
    - Test flame graph integration
  - [x] 9.2 Enhance `TimelineView` shared component
    - Add grouping dropdown (none, port, scope, lifetime)
    - Add pause/resume button
    - Add clear traces button
    - Add slow threshold input
    - Reference: `/packages/devtools/src/components/TimelineView.tsx`
  - [x] 9.3 Implement hierarchical trace display
    - Indented child traces under parent
    - Expand/collapse for trace trees
    - Visual connectors for hierarchy
    - Depth indicators
  - [x] 9.4 Implement performance indicators
    - Duration badges with color coding
    - Green: < slowThreshold/2
    - Yellow: < slowThreshold
    - Red: >= slowThreshold
    - Cache hit/miss indicators
  - [x] 9.5 Implement trace persistence
    - Browser: localStorage with trace serialization
    - TUI: File-based persistence (configurable path)
    - Auto-restore on load
    - Export/import functionality hooks (architecture ready)
  - [x] 9.6 Implement trace pinning
    - Pin button on slow trace rows
    - Pinned traces protected from eviction
    - Visual indicator for pinned state
    - Filter to show only pinned
  - [x] 9.7 Integrate flame graph view
    - Toggle between timeline and flame graph modes
    - Generate flame graph from trace hierarchy
    - Click flame frame to select trace
  - [x] 9.8 Ensure Tracing Tab tests pass
    - Run only the 8 tests from 9.1

**Acceptance Criteria:**
- All 8 Tracing Tab tests pass
- Live trace stream updates in real-time
- All grouping modes work correctly
- Performance indicators accurate
- Persistence works across reloads
- Flame graph renders correctly

---

#### Task Group 10: Inspector Tab Full Implementation
**Dependencies:** Task Groups 1-6 (COMPLETED)
**Parallelizable:** Yes - work in parallel with Task Groups 7-9

- [x] 10.0 Complete Inspector Tab with all features
  - [x] 10.1 Write 8 focused tests for Inspector Tab
    - Test detailed service info display
    - Test bidirectional dependency tree
    - Test scope hierarchy visualization
    - Test container snapshot display
    - Test async factory status and timing
    - Test captive dependency chain
    - Test navigation from other tabs
    - Test container phase status display
  - [x] 10.2 Enhance `InspectorView` shared component
    - Add service detail panel layout
    - Add dependency tree section
    - Add scope hierarchy section
    - Add container snapshot section
    - Reference: `/packages/devtools/src/components/InspectorView.tsx`
  - [x] 10.3 Implement bidirectional dependency tree
    - "Dependencies" tree (what this service needs)
    - "Dependents" tree (what needs this service)
    - Expandable tree nodes
    - Click to navigate to another service
  - [x] 10.4 Implement scope hierarchy visualization
    - Tree view of scope parent/child relationships
    - Show resolved ports per scope
    - Scope creation timestamp
    - Active/disposed status
  - [x] 10.5 Implement container snapshot display
    - Singleton pool list with resolution times
    - Active scopes summary
    - Container phase status badge
    - Phase timeline (initializing -> ready -> disposing -> disposed)
  - [x] 10.6 Implement async factory details
    - Resolution status (pending/resolved/error)
    - Resolution timing information
    - Error message display for failed resolutions
    - Re-resolution attempt indicator
  - [x] 10.7 Implement captive dependency chain display
    - Visual chain: singleton -> scoped -> transient
    - Explanation of why this is a captive dependency
    - Link to affected services
  - [x] 10.8 Ensure Inspector Tab tests pass
    - Run only the 8 tests from 10.1

**Acceptance Criteria:**
- All 8 Inspector Tab tests pass
- All service info fields displayed correctly
- Dependency trees navigable
- Scope hierarchy accurate
- Async factory status shown
- Captive chain clearly visualized

---

### Phase 5: Advanced Features

#### Task Group 11: Time-Travel and Comparison Features
**Dependencies:** Task Groups 1-10
**Parallelizable:** No - requires all tabs complete

- [ ] 11.0 Complete time-travel debugging and comparison features
  - [ ] 11.1 Write 6 focused tests for advanced features
    - Test snapshot capture on resolution
    - Test timeline scrubber navigation
    - Test state diff calculation
    - Test snapshot comparison selection
    - Test side-by-side diff display
    - Test delta compression efficiency
  - [ ] 11.2 Implement snapshot capture system
    - Hook into trace events for auto-capture
    - Manual capture button in UI
    - Efficient delta compression (only store changes)
    - Integration with existing `ContainerSnapshot` type
  - [ ] 11.3 Implement timeline scrubber in all tabs
    - Shared scrubber component at panel bottom
    - Navigate to any historical state
    - Current position indicator
    - Preview tooltip on hover
  - [ ] 11.4 Implement state diff visualization
    - Show what changed between snapshots
    - Added/removed services highlighted
    - Changed resolution counts
    - Timing differences
  - [ ] 11.5 Implement comparison view
    - Named snapshot capture (manual)
    - Snapshot selector for left/right
    - Side-by-side diff panel
    - Highlight added/removed/changed
  - [ ] 11.6 Implement memory tracking integration
    - Track estimated instance counts by lifetime
    - Singleton pool size display
    - Scoped instance distribution
    - Memory growth trends in Stats tab
  - [ ] 11.7 Ensure advanced feature tests pass
    - Run only the 6 tests from 11.1

**Acceptance Criteria:**
- All 6 advanced feature tests pass
- Snapshots capture accurately
- Time-travel navigation smooth
- Comparison diff accurate
- Memory tracking displays correctly

---

### Phase 6: Real-Time Synchronization

#### Task Group 12: Browser/TUI Synchronization
**Dependencies:** Task Groups 1-11
**Parallelizable:** No - requires all features complete

- [ ] 12.0 Complete real-time browser/TUI synchronization
  - [ ] 12.1 Write 6 focused tests for synchronization
    - Test WebSocket state broadcasting
    - Test bidirectional action sync
    - Test selection state sync
    - Test filter preference sync
    - Test connection/disconnection handling
    - Test multi-client support
  - [ ] 12.2 Extend WebSocket protocol for sync
    - Add `SYNC_STATE` method for full state sync
    - Add `SYNC_ACTION` notification for incremental updates
    - Add `SYNC_PREFERENCES` for filter/view settings
    - Reference: `/packages/devtools-network/src/server/protocol.ts`
  - [ ] 12.3 Implement browser state broadcaster
    - Broadcast state changes via WebSocket
    - Debounce rapid updates
    - Prioritize selection changes (immediate)
    - Batch filter changes (debounced)
  - [ ] 12.4 Implement TUI state receiver
    - Connect to browser WebSocket server
    - Apply received state updates
    - Merge with local state
    - Handle conflicts (remote wins for data, local wins for UI)
  - [ ] 12.5 Implement bidirectional action sync
    - TUI can trigger actions in browser
    - Browser can trigger actions in TUI
    - Action replay on reconnection
    - Action conflict resolution
  - [ ] 12.6 Implement connection management
    - Auto-reconnection with backoff
    - Connection status in UI (header)
    - Graceful degradation on disconnect
    - Support multiple TUI clients observing same app
    - Reference: `/packages/devtools-network/src/server/websocket-server.ts`
  - [ ] 12.7 Ensure sync tests pass
    - Run only the 6 tests from 12.1

**Acceptance Criteria:**
- All 6 sync tests pass
- Browser and TUI stay synchronized
- Selection changes reflect immediately
- Filter changes sync within debounce window
- Multiple TUI clients supported
- Reconnection works smoothly

---

### Phase 7: Testing and Integration

#### Task Group 13: Test Review and Integration Testing
**Dependencies:** Task Groups 1-12

- [ ] 13.0 Review tests and fill critical gaps
  - [ ] 13.1 Review all tests from Task Groups 1-12
    - Review 6 tests from state management (Task 1.1)
    - Review 8 tests from view models (Task 2.1)
    - Review 8 tests from presenters (Task 3.1)
    - Review 6 tests from primitive contracts (Task 4.1)
    - Review 6 tests from DOM adapters (Task 5.1)
    - Review 6 tests from TUI adapters (Task 6.1)
    - Review 6 tests from Graph Tab (Task 7.1)
    - Review 6 tests from Services Tab (Task 8.1)
    - Review 8 tests from Tracing Tab (Task 9.1)
    - Review 8 tests from Inspector Tab (Task 10.1)
    - Review 6 tests from advanced features (Task 11.1)
    - Review 6 tests from sync (Task 12.1)
    - Total existing: ~80 tests
  - [ ] 13.2 Analyze critical gaps for this feature
    - Focus on end-to-end workflows
    - Identify cross-tab navigation gaps
    - Check browser/TUI feature parity
    - Verify real-time update flows
  - [ ] 13.3 Write up to 10 additional integration tests
    - Test: Full panel render with all tabs
    - Test: Tab navigation preserves state
    - Test: Filter changes propagate across tabs
    - Test: Service selection navigates to Inspector
    - Test: Trace selection shows in Inspector
    - Test: Container switching updates all views
    - Test: Time-travel affects all tabs
    - Test: Comparison view from any tab
    - Test: Theme toggle applies everywhere
    - Test: Sync reconnection restores state
  - [ ] 13.4 Run complete feature test suite
    - Run all ~90 tests for this feature
    - Verify browser functionality
    - Verify TUI functionality
    - Verify sync between environments

**Acceptance Criteria:**
- All ~90 feature-specific tests pass
- End-to-end workflows covered
- No critical gaps in test coverage
- Feature parity verified between browser and TUI

---

## Execution Order

**Recommended implementation sequence with parallelization:**

### Sprint 1: Foundation (Parallelizable)
Execute simultaneously:
- Task Group 1: State Management Extensions
- Task Group 2: View Model Extensions
- Task Group 3: Presenter Extensions
- Task Group 4: New Render Primitives Definition

### Sprint 2: Platform Adapters (Parallelizable)
Execute simultaneously after Sprint 1:
- Task Group 5: DOM Adapter Implementation
- Task Group 6: TUI Adapter Implementation

### Sprint 3: All Tabs (Parallelizable)
Execute simultaneously after Sprint 2:
- Task Group 7: Graph Tab Full Implementation
- Task Group 8: Services Tab Full Implementation
- Task Group 9: Tracing Tab Full Implementation
- Task Group 10: Inspector Tab Full Implementation

### Sprint 4: Advanced Features (Sequential)
Execute after Sprint 3:
- Task Group 11: Time-Travel and Comparison Features

### Sprint 5: Sync and Integration (Sequential)
Execute after Sprint 4:
- Task Group 12: Browser/TUI Synchronization
- Task Group 13: Test Review and Integration Testing

---

## Key Files Reference

**State Management:**
- `/packages/devtools/src/state/devtools.state.ts`
- `/packages/devtools/src/state/actions.ts`
- `/packages/devtools/src/state/reducer.ts`
- `/packages/devtools/src/state/selectors.ts`

**View Models:**
- `/packages/devtools/src/view-models/graph.vm.ts`
- `/packages/devtools/src/view-models/timeline.vm.ts`
- `/packages/devtools/src/view-models/stats.vm.ts`
- `/packages/devtools/src/view-models/services.vm.ts`
- `/packages/devtools/src/view-models/inspector.vm.ts`
- `/packages/devtools/src/view-models/panel.vm.ts`

**Presenters:**
- `/packages/devtools/src/presenters/graph.presenter.ts`
- `/packages/devtools/src/presenters/timeline.presenter.ts`
- `/packages/devtools/src/presenters/stats.presenter.ts`
- `/packages/devtools/src/presenters/services.presenter.ts`
- `/packages/devtools/src/presenters/inspector.presenter.ts`

**Render Primitives:**
- `/packages/devtools/src/ports/render-primitives.port.ts`
- `/packages/devtools/src/dom/primitives.tsx`
- `/packages/devtools/src/tui/primitives.tsx`

**Shared Components:**
- `/packages/devtools/src/components/DevToolsPanel.tsx`
- `/packages/devtools/src/components/GraphView.tsx`
- `/packages/devtools/src/components/TimelineView.tsx`
- `/packages/devtools/src/components/StatsView.tsx`
- `/packages/devtools/src/components/ServicesView.tsx`
- `/packages/devtools/src/components/InspectorView.tsx`

**Network/Sync:**
- `/packages/devtools-network/src/server/websocket-server.ts`
- `/packages/devtools-network/src/server/protocol.ts`

**Core Types:**
- `/packages/devtools-core/src/types.ts`
