# Result Panel - Implementation Tasks

> Covers all ~408 tests from [16-definition-of-done.md](16-definition-of-done.md).
> Spec: [01-overview.md](01-overview.md) through [15-accessibility.md](15-accessibility.md).
> Target directory: `packages/devtools-ui/tests/panels/result/`

---

## Phase 1: Foundation

### Task 1.1: Core Data Models & Type-Level Tests

**Spec**: 01-overview.md (1.4), 14-integration.md (14.2, 14.8)
**Test files**: `types/result-panel-state.test-d.ts`, `types/result-chain-descriptor.test-d.ts`, `types/result-step-trace.test-d.ts`, `types/result-path-descriptor.test-d.ts`, `types/result-navigation.test-d.ts`, `types/result-filter-state.test-d.ts`, `types/result-data-source.test-d.ts`
**Dependencies**: None

Implement all 12 TypeScript interfaces from Section 1.4 and the `ResultPanelState` from Section 14.8. Write type-level tests to verify structural correctness.

#### Types to implement

- `ResultChainDescriptor` (1.4.1)
- `ResultOperationDescriptor` (1.4.2)
- `ResultMethodName` (1.4.3)
- `SerializedValue` (1.4.4)
- `ResultStepTrace` (1.4.5)
- `ResultChainExecution` (1.4.6)
- `ResultPathDescriptor` (1.4.7)
- `ResultPortStatistics` (1.4.8)
- `ResultPanelSnapshot` (1.4.9)
- `ResultOperationCategory` (1.4.10)
- `ResultFilterState` (1.4.11)
- `ResultPanelNavigation` (1.4.12)
- `ResultViewId` (1.4.12)
- `ResultPanelState` (14.8)
- `ResultDataSource` (14.2)
- `ResultDataEvent` (14.2)

#### Type-level tests (~35 assertions across 7 files)

**`result-panel-state.test-d.ts`**

- [ ] `state.selectedChainId` is `string | undefined`
- [ ] `state.selectedExecutionId` is `string | undefined`
- [ ] `state.selectedStepIndex` is `number | undefined`
- [ ] `state.activeView` is `ResultViewId`
- [ ] `state.educationalSidebarOpen` is `boolean`
- [ ] `state.connectionStatus` is `"connected" | "disconnected"`

**`result-chain-descriptor.test-d.ts`**

- [ ] `chain.chainId` is `string`
- [ ] `chain.operations` is `readonly ResultOperationDescriptor[]`
- [ ] `chain.isAsync` is `boolean`
- [ ] `chain.portName` is `string | undefined`
- [ ] `op.method` is `ResultMethodName`
- [ ] `op.inputTrack` is `"ok" | "err" | "both"`
- [ ] `op.canSwitch` is `boolean`
- [ ] `op.isTerminal` is `boolean`

**`result-step-trace.test-d.ts`**

- [ ] `step.inputTrack` is `"ok" | "err"`
- [ ] `step.outputTrack` is `"ok" | "err"`
- [ ] `step.switched` is `boolean`
- [ ] `step.inputValue` is `SerializedValue | undefined`
- [ ] `step.outputValue` is `SerializedValue | undefined`
- [ ] `step.durationMicros` is `number`
- [ ] `step.callbackThrew` is `boolean`
- [ ] `sv.data` is `unknown`
- [ ] `sv.typeName` is `string`
- [ ] `sv.truncated` is `boolean`

**`result-path-descriptor.test-d.ts`**

- [ ] `path.trackSequence` is `readonly ("ok" | "err")[]`
- [ ] `path.switchPoints` is `readonly number[]`
- [ ] `path.observed` is `boolean`
- [ ] `path.frequency` is `number`

**`result-navigation.test-d.ts`**

- [ ] `nav.chainId` is `string | undefined`
- [ ] `nav.executionId` is `string | undefined`
- [ ] `nav.stepIndex` is `number | undefined`
- [ ] `nav.view` is `"railway" | "log" | "cases" | "sankey" | "waterfall" | "combinator" | "overview" | undefined`

**`result-filter-state.test-d.ts`**

- [ ] `filter.chainSearch` is `string`
- [ ] `filter.portName` is `string | undefined`
- [ ] `filter.status` is `"all" | "ok" | "err" | "mixed"`
- [ ] `filter.errorType` is `string | undefined`

**`result-data-source.test-d.ts`**

- [ ] `ds.getChains` returns `ReadonlyMap<string, ResultChainDescriptor>`
- [ ] `ds.getPortStatistics` returns `ReadonlyMap<string, ResultPortStatistics>`
- [ ] `ds.subscribe` accepts listener and returns unsubscribe

---

### Task 1.2: Data Source Implementation & Tests

**Spec**: 14-integration.md (14.2)
**Test file**: `result-data-source.test.ts`
**Dependencies**: Task 1.1
**Mutation target**: >90%

Implement `MockResultDataSource` (for tests) and the `ResultDataSource` contract. All data source tests are unit tests.

#### Tests (12 unit tests)

- [ ] 1. `getChains()` returns empty map initially
- [ ] 2. After `registerChain()`, `getChains()` includes chain
- [ ] 3. `getPortStatistics()` returns stats for all ports
- [ ] 4. `getExecutions(chainId)` returns executions newest first
- [ ] 5. `getExecutions()` respects ring buffer limit
- [ ] 6. `subscribe()` listener called on chain-registered event
- [ ] 7. `subscribe()` listener called on execution-added event
- [ ] 8. `subscribe()` listener called on statistics-updated event
- [ ] 9. `subscribe()` returns unsubscribe function
- [ ] 10. Unsubscribed listener not called on subsequent events
- [ ] 11. `getPaths(chainId)` computes paths from chain descriptor
- [ ] 12. `getSnapshot()` returns complete panel snapshot

---

### Task 1.3: Visual Encoding Utilities & Tests

**Spec**: 10-visual-encoding.md (10.1-10.15)
**Test file**: `result-visual-encoding.test.ts`
**Dependencies**: Task 1.1
**Mutation target**: >95%

Implement pure utility functions for duration formatting, category-to-color/icon mapping, duration bar coloring, and stability zone coloring.

#### Tests (15 unit tests)

- [ ] 1. `formatDuration` returns `<1us` for 0 microseconds
- [ ] 2. `formatDuration` returns `42us` for 42 microseconds
- [ ] 3. `formatDuration` returns `1.2ms` for 1200 microseconds
- [ ] 4. `formatDuration` returns `145ms` for 145000 microseconds
- [ ] 5. `formatDuration` returns `2.3s` for 2300000 microseconds
- [ ] 6. `formatDuration` returns `1m 23s` for 83000000 microseconds
- [ ] 7. `getCategoryColor` maps all 9 categories to distinct colors
- [ ] 8. `getCategoryIcon` maps all 9 categories to distinct icons
- [ ] 9. `getDurationBarColor` returns ok for < p50
- [ ] 10. `getDurationBarColor` returns warning for p50-p90
- [ ] 11. `getDurationBarColor` returns error for > p90
- [ ] 12. `getDurationBarColor` returns error for Err track
- [ ] 13. `getStabilityZoneColor` returns green for >= 95%
- [ ] 14. `getStabilityZoneColor` returns amber for 80-95%
- [ ] 15. `getStabilityZoneColor` returns red for < 80%

---

### Task 1.4: Path Analysis Engine & Tests

**Spec**: 06-case-explorer.md (6.7)
**Test file**: `result-path-analysis.test.ts`
**Dependencies**: Task 1.1
**Mutation target**: >95%

Implement static path enumeration, pruning, classification, coverage, and entropy computation. All pure functions.

#### Tests (14 unit tests)

- [ ] 1. `computePaths` with 0 switch operations returns 1 path (happy path)
- [ ] 2. `computePaths` with 1 andThen returns 2 paths
- [ ] 3. `computePaths` with andThen + orElse returns 3 paths (prunes impossible)
- [ ] 4. `computePaths` with flip always switches both tracks
- [ ] 5. `computePaths` prunes orElse Ok->Err (impossible: orElse bypassed on Ok)
- [ ] 6. `computePaths` prunes andThen Err->Ok (impossible: andThen bypassed on Err)
- [ ] 7. `computePaths` with 5 andThen operations returns up to 32 paths
- [ ] 8. `computePathCoverage` returns correct observed/total ratio
- [ ] 9. `computePathEntropy` returns 0 for single-path chain
- [ ] 10. `computePathEntropy` returns max for uniform distribution
- [ ] 11. `classifyPath` returns "happy" for all-Ok path
- [ ] 12. `classifyPath` returns "error" for terminal-Err path
- [ ] 13. `classifyPath` returns "recovery" for path with Err->Ok switch
- [ ] 14. `classifyPath` returns "multi-error" for path with 2+ Ok->Err switches

---

### Task 1.5: Pattern Recognition Engine & Tests

**Spec**: 12-educational-features.md (12.6)
**Test file**: `result-pattern-recognition.test.ts`
**Dependencies**: Task 1.1
**Mutation target**: >85%

Implement chain pattern detection for 7 recognized patterns. All pure functions.

#### Tests (8 unit tests)

- [ ] 1. Detects validation chain (2+ sequential andThen)
- [ ] 2. Detects error recovery (orElse after andThen)
- [ ] 3. Detects tap and continue (inspect between operations)
- [ ] 4. Detects fallback cascade (multiple orElse)
- [ ] 5. Detects async pipeline (fromPromise -> andThen -> asyncMap)
- [ ] 6. Detects guard pattern (andThrough before andThen)
- [ ] 7. Detects safe extraction (chain ending with match)
- [ ] 8. Returns empty for chain with no recognized patterns

---

### Task 1.6: Export Utilities & Tests

**Spec**: 14-integration.md (14.5, 14.6)
**Test file**: `result-export.test.ts`
**Dependencies**: Task 1.1
**Mutation target**: >90%

Implement export functions for JSON, Mermaid, DOT, SVG, PNG, CSV formats, plus URL state encoding/decoding.

#### Tests (16 unit tests)

- [ ] 1. `exportChainJson()` produces valid JSON with chain descriptor + executions
- [ ] 2. `exportChainMermaid()` produces valid Mermaid flowchart
- [ ] 3. Mermaid output includes Ok/Err track nodes
- [ ] 4. `exportChainDot()` produces valid DOT format
- [ ] 5. DOT output includes color attributes for tracks
- [ ] 6. `exportChainSvg()` serializes Railway Pipeline SVG
- [ ] 7. `exportChainPng()` renders SVG to canvas data URL
- [ ] 8. `exportExecutionJson()` includes all step traces
- [ ] 9. `exportExecutionCsv()` has correct columns: index, method, inputTrack, outputTrack, duration, switched
- [ ] 10. `exportStatsJson()` includes full ResultPanelSnapshot
- [ ] 11. `exportStatsCsv()` has per-port columns
- [ ] 12. JSON export filename pattern: `hex-result-chain-{label}-{timestamp}.json`
- [ ] 13. Mermaid export filename pattern: `hex-result-chain-{label}-{timestamp}.mmd`
- [ ] 14. Execution CSV filename pattern: `hex-result-exec-{label}-{executionId}.csv`
- [ ] 15. URL state encodes chain, execution, step, view, filter
- [ ] 16. URL state decodes back to correct panel state

---

## Phase 2: Core Views

### Task 2.1: Panel Shell, Toolbar & Status Bar

**Spec**: 03-views-and-wireframes.md (3.1, 3.2), 14-integration.md (14.1, 14.8)
**Test files**: `result-panel.test.tsx`, `result-panel-toolbar.test.tsx`
**Dependencies**: Task 1.1, Task 1.2
**Mutation target**: >90%

Implement `ResultPanel`, `ResultPanelToolbar`, `ResultPanelStatusBar`, and `ResultPanelContent` shell components. Includes view switcher, chain/execution selectors, status bar, error boundary, theme support, and lifecycle.

#### Tests -- `result-panel.test.tsx` (16 component tests)

- [ ] 1. Renders panel with 7 view tabs in toolbar
- [ ] 2. Default view is "overview" when no initialState provided
- [ ] 3. Renders empty state when dataSource returns no chains
- [ ] 4. Empty state shows message: "No Result chains detected"
- [ ] 5. Renders status bar with chain context when chain selected
- [ ] 6. Status bar shows Ok/Err counts and stability percentage
- [ ] 7. Status bar stability badge is green when >= 95%
- [ ] 8. Status bar stability badge is amber when 80-95%
- [ ] 9. Status bar stability badge is red when < 80%
- [ ] 10. Renders loading state when dataSource is pending
- [ ] 11. ErrorBoundary isolates panel crash and shows fallback
- [ ] 12. Panel subscribes to dataSource on mount
- [ ] 13. Panel unsubscribes from dataSource on unmount
- [ ] 14. initialState.view opens the specified view
- [ ] 15. initialState.chainId selects the specified chain
- [ ] 16. Theme prop applies correct CSS variable values

#### Tests -- `result-panel-toolbar.test.tsx` (13 component tests)

- [ ] 1. View switcher renders 7 buttons with correct labels
- [ ] 2. Clicking a view button switches the active view
- [ ] 3. Active view button has accent underline
- [ ] 4. Chain selector dropdown lists all registered chains
- [ ] 5. Chain selector shows trace icon, label, ok rate, run count
- [ ] 6. Chain selector search filters by name (150ms debounce)
- [ ] 7. Execution selector shows recent executions (newest first)
- [ ] 8. Execution entry shows execution ID, final track badge, timestamp, duration
- [ ] 9. Prev/Next buttons navigate between executions
- [ ] 10. `[?]` button toggles educational sidebar
- [ ] 11. Export dropdown lists chain export formats
- [ ] 12. Live indicator shows green dot when connected
- [ ] 13. Live indicator shows red dot with "Disconnected" when disconnected

---

### Task 2.2: Railway Pipeline View

**Spec**: 04-railway-pipeline.md (4.1-4.10), 10-visual-encoding.md (10.5, 10.6, 10.13)
**Test files**: `result-railway-pipeline.test.tsx`, `result-railway-node.test.tsx`
**Dependencies**: Task 1.1, Task 1.2, Task 1.3, Task 2.1
**Mutation target**: >85%

Implement `RailwayPipelineView` with SVG canvas, dual-track rendering, operation nodes, switch connectors, zoom/pan, minimap, no-execution mode, and playback.

#### Tests -- `result-railway-pipeline.test.tsx` (14 canvas + 9 playback = 23 component tests)

**Canvas:**

- [ ] 1. Renders SVG canvas with Ok track (green) and Err track (red) lines
- [ ] 2. Renders operation nodes at correct positions along tracks
- [ ] 3. Entry node displays constructor name (e.g., "ok(42)")
- [ ] 4. Terminal node displays extraction method (e.g., "match")
- [ ] 5. Active track has 3px solid stroke, inactive track has 1px dashed
- [ ] 6. Switch points show diagonal connector between tracks with lightning icon
- [ ] 7. Bypassed operations render at 30% opacity with dashed border
- [ ] 8. No-execution mode shows all tracks as thin neutral lines
- [ ] 9. No-execution mode shows both possible arrows for switch-capable nodes
- [ ] 10. Minimap renders overview with viewport rectangle
- [ ] 11. Fit button zooms/pans to show entire chain
- [ ] 12. Mouse wheel zooms centered on cursor position
- [ ] 13. Click+drag on background pans the viewport
- [ ] 14. Zoom clamped to 0.2 - 4.0 range

**Playback:**

- [ ] 13. Play button starts particle animation at entry node
- [ ] 14. Particle flows along active track between nodes
- [ ] 15. Particle pauses briefly at each node (200ms default)
- [ ] 16. At switch points, particle crosses between tracks
- [ ] 17. At terminal, particle fades with color burst
- [ ] 18. Pause button stops animation at current step
- [ ] 19. Prev/Next buttons step through operations
- [ ] 20. Speed slider adjusts playback speed (0.5x-4x)
- [ ] 21. With reduced motion, playback uses instant step highlight

#### Tests -- `result-railway-node.test.tsx` (12 component tests)

- [ ] 1. Node renders method name in bold mono font
- [ ] 2. Node renders label (truncated to 12 chars)
- [ ] 3. Node renders category icon with correct color
- [ ] 4. Node renders track flow badges ("Ok -> Ok", "Ok -> Err", etc.)
- [ ] 5. Node renders duration label
- [ ] 6. Node renders lightning badge when `switched === true`
- [ ] 7. Hovered node shows elevation shadow
- [ ] 8. Selected node has accent border
- [ ] 9. Active (playback) node has glow effect
- [ ] 10. Error switch node has red-muted fill
- [ ] 11. Recovery switch node has green-muted fill
- [ ] 12. Category icon maps correctly for all 9 categories

---

### Task 2.3: Operation Log View

**Spec**: 05-operation-log.md (5.1-5.7)
**Test file**: `result-operation-log.test.tsx`
**Dependencies**: Task 1.1, Task 1.2, Task 1.3, Task 2.1
**Mutation target**: >90%

Implement `OperationLogView` with step list, value inspector, diff mode, execution selector, filtering, and cross-view links.

#### Tests (20 component tests)

- [ ] 1. Renders step list with columns: index, method, track, duration
- [ ] 2. Track column shows color-coded badges (Ok->Ok green, Ok->Err gradient, etc.)
- [ ] 3. Switch rows have amber background tint and lightning icon
- [ ] 4. Bypassed rows are dimmed with strikethrough method name
- [ ] 5. Terminal row has bold text and filled-square instead of output track
- [ ] 6. Clicking step shows input/output in value inspector
- [ ] 7. Value inspector renders JSON tree for objects
- [ ] 8. Value inspector shows inline value for primitives
- [ ] 9. Value inspector shows "[Circular]" for circular references
- [ ] 10. Value inspector shows "[Function: name]" for function references
- [ ] 11. Value inspector shows "(values not captured)" when captureValues is false
- [ ] 12. Diff mode shows structural diff between input and output
- [ ] 13. Diff shows "SWITCHED" label when tracks differ
- [ ] 14. Diff shows "+/-" lines for property changes
- [ ] 15. "Switch only" filter shows only steps where switched
- [ ] 16. "Err only" filter shows only steps with Err output
- [ ] 17. Method filter shows only selected method types
- [ ] 18. Duration filter shows only steps exceeding threshold
- [ ] 19. Filter summary shows "Showing N of M steps"
- [ ] 20. Cross-view link "View in Pipeline" navigates with context

---

## Phase 3: Analysis Views

### Task 3.1: Case Explorer View

**Spec**: 06-case-explorer.md (6.1-6.7)
**Test files**: `result-case-explorer.test.tsx`, `result-case-simulator.test.tsx`
**Dependencies**: Task 1.1, Task 1.2, Task 1.4, Task 2.1
**Mutation target**: >95% (path analysis), >85% (components)

Implement `CaseExplorerView` with path tree, path detail panel, coverage metrics, and What-If simulator.

#### Tests -- `result-case-explorer.test.tsx` (17 component tests)

- [ ] 1. Renders path tree with branches at switch-capable operations
- [ ] 2. Non-switching operations collapsed into badge (e.g., "[2 maps]")
- [ ] 3. Collapsed badge is expandable on click
- [ ] 4. Branch labels show "Ok" and "Err" with correct colors
- [ ] 5. Each path shows frequency percentage and absolute count
- [ ] 6. Frequency bar width proportional to percentage
- [ ] 7. Observed paths show green checkmark icon
- [ ] 8. Unobserved paths show amber ghost icon
- [ ] 9. Clicking leaf node opens path detail panel
- [ ] 10. Path detail shows classification, frequency, switch points
- [ ] 11. Path detail shows recent executions
- [ ] 12. Happy path has checkmark icon
- [ ] 13. Error path has X icon
- [ ] 14. Recovery path has circular arrow icon
- [ ] 15. Multi-error path has warning triangle icon
- [ ] 16. Unobserved path shows warning: "never observed"
- [ ] 17. Chains with >16 paths show "N more paths..." truncation

#### Tests -- `result-case-simulator.test.tsx` (8 component tests)

- [ ] 1. Simulator lists all switch-capable operations
- [ ] 2. Each operation has Auto / Force Ok / Force Err controls
- [ ] 3. Forcing Ok highlights the corresponding path
- [ ] 4. Forcing Err highlights the corresponding path
- [ ] 5. Auto mode uses most likely outcome from observed data
- [ ] 6. "Reset All" returns all to Auto
- [ ] 7. Unobserved forced path shows warning message
- [ ] 8. "Apply to Pipeline View" navigates with matching execution

---

### Task 3.2: Sankey Statistics View

**Spec**: 07-sankey-statistics.md (7.1-7.8), 10-visual-encoding.md (10.9, 10.12)
**Test file**: `result-sankey-statistics.test.tsx`
**Dependencies**: Task 1.1, Task 1.2, Task 1.3, Task 2.1
**Mutation target**: >85%

Implement `SankeyStatisticsView` with SVG Sankey diagram, node/link rendering, hover tooltips, error hotspot table, recovery heroes, multi-port aggregate, time range, min flow filter, and stability sparkline.

#### Tests (20 component tests)

- [ ] 1. Renders one column per chain operation
- [ ] 2. Each column has Ok node and Err node
- [ ] 3. Node heights proportional to count
- [ ] 4. Ok nodes use `--hex-result-ok` fill
- [ ] 5. Err nodes use `--hex-result-err` fill
- [ ] 6. Ok->Ok links use green fill at 0.3 opacity
- [ ] 7. Ok->Err links use gradient fill at 0.5 opacity
- [ ] 8. Err->Ok links use gradient fill at 0.5 opacity
- [ ] 9. Err->Err links use red fill at 0.3 opacity
- [ ] 10. Hovering node highlights connected links and dims others
- [ ] 11. Node tooltip shows count, percentage, sources, destinations
- [ ] 12. Link tooltip shows count, percentage, top error types
- [ ] 13. Error hotspot table renders ranked by impact
- [ ] 14. Hotspot table is sortable by column header click
- [ ] 15. Recovery heroes section shows operations with high recovery rate
- [ ] 16. Time range dropdown recomputes all counts
- [ ] 17. Port filter "All" shows aggregate across ports
- [ ] 18. Min flow filter hides links below threshold
- [ ] 19. Stability sparkline renders with color zones (green/amber/red)
- [ ] 20. Sparkline hover shows exact percentage and timestamp

---

## Phase 4: Specialized Views

### Task 4.1: Async Waterfall View

**Spec**: 08-async-waterfall.md (8.1-8.9), 10-visual-encoding.md (10.10)
**Test file**: `result-async-waterfall.test.tsx`
**Dependencies**: Task 1.1, Task 1.2, Task 1.3, Task 2.1
**Mutation target**: >80%

Implement `AsyncWaterfallView` with duration bars, timeline axis, nesting, summary breakdown, comparison mode, scale controls, and concurrent operation display.

#### Tests (18 component tests)

- [ ] 1. Shows "synchronous chain" message for non-async chains
- [ ] 2. Renders horizontal duration bars for async operations
- [ ] 3. Bar start position corresponds to operation start time
- [ ] 4. Bar width proportional to duration
- [ ] 5. Ok/<p50 bars use emerald at 0.8 opacity
- [ ] 6. Ok/p50-p90 bars use amber at 0.8 opacity
- [ ] 7. Ok/>p90 bars use red at 0.6 opacity
- [ ] 8. Err bars use red at 0.8 opacity
- [ ] 9. Recovery bars use emerald at 0.6 with dashed border
- [ ] 10. Wait gap renders as muted fill before bar
- [ ] 11. Nested operations indent with tree-style prefix
- [ ] 12. Summary bar shows duration breakdown
- [ ] 13. Summary shows critical path
- [ ] 14. Comparison mode shows two executions side-by-side
- [ ] 15. Comparison shows delta annotations per bar
- [ ] 16. Scale dropdown changes horizontal axis
- [ ] 17. Mouse wheel zooms horizontally
- [ ] 18. Concurrent operations (combinators) show parallel rows

---

### Task 4.2: Combinator Matrix View

**Spec**: 09-combinator-matrix.md (9.1-9.14), 10-visual-encoding.md (10.11)
**Test files**: `result-combinator-matrix.test.tsx`, `result-combinator-statistics.test.tsx`
**Dependencies**: Task 1.1, Task 1.2, Task 1.3, Task 2.1
**Mutation target**: >85%

Implement `CombinatorMatrixView` with input cells, combinator box, output box, connector lines, short-circuit visualization, playback, nested combinators, educational annotations, aggregate statistics, and correlation heatmap.

#### Tests -- `result-combinator-matrix.test.tsx` (16 component tests)

- [ ] 1. Shows "no combinator" message for chains without combinators
- [ ] 2. Renders input cells for each combinator input
- [ ] 3. Input cell shows index/name, source label, Ok/Err badge, value preview
- [ ] 4. Ok inputs have green left border
- [ ] 5. Err inputs have red left border
- [ ] 6. Short-circuit cause input has pulsing label
- [ ] 7. Skipped inputs (after short-circuit) are dimmed at 40%
- [ ] 8. `collect` inputs show field names instead of indices
- [ ] 9. Connector lines colored by input track
- [ ] 10. Combinator box shows name and input counts
- [ ] 11. Output box shows combined result badge and value
- [ ] 12. Output source note for `all` shows "Failed at input #N" on Err
- [ ] 13. Output source note for `any` shows "First Ok: input #N" on Ok
- [ ] 14. `allSettled` output shows collected errors list
- [ ] 15. Nested combinator cell is expandable with drill-down
- [ ] 16. Educational annotation renders at bottom with correct text per combinator

#### Tests -- `result-combinator-statistics.test.tsx` (7 component tests)

- [ ] 1. Statistics view shows input success rate bars
- [ ] 2. Bottleneck identification highlights weakest input
- [ ] 3. Error combination table shows top 5 failure patterns
- [ ] 4. Correlation heatmap renders for 3+ inputs
- [ ] 5. Heatmap cells colored by correlation coefficient
- [ ] 6. High correlation (>0.5) cell uses red tint
- [ ] 7. Low correlation (<0.2) cell has no tint

---

### Task 4.3: Overview Dashboard View

**Spec**: 03-views-and-wireframes.md (3.7), 11-interactions.md (11.10)
**Test file**: `result-overview-dashboard.test.tsx`
**Dependencies**: Task 1.1, Task 1.2, Task 1.3, Task 2.1
**Mutation target**: >85%

Implement `OverviewDashboardView` with stat cards, error distribution chart, stability timeline sparklines, and top errors table.

#### Tests (12 component tests)

- [ ] 1. Stat card "Total Calls" shows correct count
- [ ] 2. Stat card "Ok Rate" shows percentage with trend indicator
- [ ] 3. Stat card "Chains" shows traced chain count
- [ ] 4. Stat card "Active Err Ports" shows count of ports with errors
- [ ] 5. Error distribution chart renders segments per error type
- [ ] 6. Clicking chart segment filters top errors list
- [ ] 7. Stability timeline renders sparkline per port
- [ ] 8. Top errors table shows port, error type, count, last seen
- [ ] 9. Top errors sorted by count descending
- [ ] 10. Clicking stat card navigates to related view
- [ ] 11. Clicking top error row navigates to Operation Log
- [ ] 12. Dashboard refreshes when time range changes

---

## Phase 5: Cross-Cutting Features

### Task 5.1: Educational Sidebar & Walkthroughs

**Spec**: 12-educational-features.md (12.1-12.9)
**Test files**: `result-educational-sidebar.test.tsx`, `result-educational-prompts.test.tsx`
**Dependencies**: Task 1.1, Task 1.5, Task 2.1
**Mutation target**: >85%

Implement `EducationalSidebar` with glossary (searchable, filterable, grouped), walkthroughs (10 tours with step progression, spotlight, auto-navigate, localStorage persistence), context-aware content, comparison cards, pattern recognition labels, and "Try in Playground" links.

#### Tests -- `result-educational-sidebar.test.tsx` (22 component tests)

- [ ] 1. Sidebar opens and closes with `[?]` button
- [ ] 2. Sidebar has Glossary and Walkthrough tabs
- [ ] 3. Glossary lists all Result methods alphabetically
- [ ] 4. Glossary entry shows category, signature, description, equivalents
- [ ] 5. Glossary search filters by method name
- [ ] 6. Glossary category filter shows only selected categories
- [ ] 7. Glossary grouping by category with collapsible sections
- [ ] 8. Walkthrough list shows all 10 walkthroughs with step counts
- [ ] 9. Starting a walkthrough shows step 1 with highlight
- [ ] 10. Next button advances to next step
- [ ] 11. Previous button goes back to prior step
- [ ] 12. Skip button exits walkthrough
- [ ] 13. Walkthrough step auto-navigates to correct view when needed
- [ ] 14. Walkthrough spotlight highlights target elements
- [ ] 15. Walkthrough progress saved to localStorage
- [ ] 16. Resuming walkthrough continues from saved step
- [ ] 17. Context-aware: selecting a node updates sidebar content
- [ ] 18. Context-aware: viewing Case Explorer shows path analysis explanation
- [ ] 19. Comparison cards appear when viewing related operations (map vs andThen)
- [ ] 20. "Try in Playground" link includes correct example code
- [ ] 21. Pattern recognition labels validated chains as "Validation Pipeline"
- [ ] 22. Pattern recognition labels orElse after andThen as "Error Recovery"

#### Tests -- `result-educational-prompts.test.tsx` (13 component tests)

**Contextual prompts:**

- [ ] 1. Prompt appears for unobserved path (0% coverage)
- [ ] 2. Prompt appears for high recovery rate (>90%)
- [ ] 3. Prompt appears for first Sankey view
- [ ] 4. Prompt appears for first async chain
- [ ] 5. Prompt dismissible with X button
- [ ] 6. "Don't show hints" persists to localStorage
- [ ] 7. Maximum one prompt visible at a time
- [ ] 8. Prompt auto-dismisses after 10 seconds

**First-time experience:**

- [ ] 9. Welcome overlay shows on first visit (no localStorage flag)
- [ ] 10. "Start Guided Tour" launches walkthrough #1
- [ ] 11. "Explore on My Own" dismisses overlay
- [ ] 12. "Don't show again" checkbox persists dismissal
- [ ] 13. Overlay does not show on subsequent visits

---

### Task 5.2: Filter System & Global Search

**Spec**: 13-filter-and-search.md (13.1-13.11)
**Test files**: `result-filter-system.test.tsx`, `result-global-search.test.tsx`
**Dependencies**: Task 2.1, Task 2.2, Task 2.3, Task 3.1, Task 3.2
**Mutation target**: >90%

Implement global chain filter bar, view-specific filters (Railway, Log, Case Explorer, Sankey, Waterfall, Combinator, Dashboard), and global search with cross-view navigation.

#### Tests -- `result-filter-system.test.tsx` (14 component tests)

- [ ] 1. Chain search filters by name (150ms debounce)
- [ ] 2. Port dropdown filters by specific port
- [ ] 3. Status dropdown filters by Ok/Err/Mixed/All
- [ ] 4. Error type dropdown filters by error tag
- [ ] 5. Time range dropdown filters by temporal window
- [ ] 6. All filters combine with AND logic
- [ ] 7. "Clear All" resets all filters
- [ ] 8. Active filter count shown as badge
- [ ] 9. Railway "Collapse non-switch" collapses sequences
- [ ] 10. Operation Log combined filters: Switch + method
- [ ] 11. Case Explorer path classification filter
- [ ] 12. Case Explorer "observed only" toggle hides unobserved
- [ ] 13. Sankey min flow filter hides low-traffic links
- [ ] 14. Filter state persists across view switches

#### Tests -- `result-global-search.test.tsx` (8 component tests)

- [ ] 1. Search opens with `/` key or search icon
- [ ] 2. Results grouped by category: Chains, Operations, Errors, Values
- [ ] 3. Chain result click navigates to Railway Pipeline view
- [ ] 4. Operation result click navigates to Operation Log at step
- [ ] 5. Error result click navigates to Sankey filtered by error type
- [ ] 6. Value result click navigates to Operation Log at step with execution
- [ ] 7. Search debounced at 200ms
- [ ] 8. Max 10 results per category

---

### Task 5.3: Cross-View & Cross-Panel Navigation

**Spec**: 11-interactions.md (11.11, 11.12)
**Test files**: `result-cross-view-nav.test.tsx`, `result-cross-panel-nav.test.tsx`
**Dependencies**: Task 2.1, Task 2.2, Task 2.3, Task 3.1, Task 3.2, Task 4.1, Task 4.3
**Mutation target**: >90%

Implement all cross-view navigation links (preserving chain/execution/step context) and cross-panel navigation callbacks (Graph Panel, Container Panel, Scope Tree Panel).

#### Tests -- `result-cross-view-nav.test.tsx` (7 component tests)

- [ ] 1. "View in Log" from Railway preserves chain, execution, step
- [ ] 2. "View in Pipeline" from Log preserves chain, execution, step
- [ ] 3. "View Cases" from Railway preserves chain
- [ ] 4. "View Waterfall" from Log preserves chain, execution
- [ ] 5. Sankey hotspot click opens Railway focused on operation
- [ ] 6. Overview top error click opens Log filtered to error type
- [ ] 7. Overview stability dip click opens Sankey with time range

#### Tests -- `result-cross-panel-nav.test.tsx` (6 component tests)

- [ ] 1. Click port name navigates to Graph Panel with port selected
- [ ] 2. Click "View Container" navigates to Container Panel
- [ ] 3. Click scope ID navigates to Scope Tree Panel
- [ ] 4. Inbound from Graph Panel sets chain selector
- [ ] 5. Inbound from Container Panel sets chain selector
- [ ] 6. Navigation without matching chain shows "Chain not found" toast

---

### Task 5.4: Real-Time Updates

**Spec**: 11-interactions.md (11.14)
**Test file**: `result-real-time.test.tsx`
**Dependencies**: Task 1.2, Task 2.1
**Mutation target**: >80%

Implement live update handling with debouncing, connection status indicators, and reduced-motion compliance.

#### Tests (9 component tests)

- [ ] 1. New execution updates execution selector dropdown
- [ ] 2. New chain registered updates chain selector
- [ ] 3. Statistics update refreshes status bar (debounced at 200ms)
- [ ] 4. Aggregate statistics debounced at 500ms
- [ ] 5. Sankey diagram debounced at 1000ms
- [ ] 6. Connection lost shows "Disconnected" indicator
- [ ] 7. Connection restored removes "Disconnected" indicator and updates data
- [ ] 8. Stale data remains interactive when disconnected
- [ ] 9. `prefers-reduced-motion` disables all update animations

---

## Phase 6: Quality & Compliance

### Task 6.1: Keyboard Navigation

**Spec**: 11-interactions.md (11.13), 15-accessibility.md (15.2)
**Test file**: `result-keyboard.test.tsx`
**Dependencies**: Task 2.1, Task 2.2, Task 2.3, Task 3.1, Task 5.1, Task 5.2
**Mutation target**: >90%

Implement all keyboard shortcuts and view-specific keyboard controls.

#### Tests (14 component tests)

- [ ] 1. `1`-`7` keys switch to views 1-7
- [ ] 2. `Tab` cycles focus between interactive elements
- [ ] 3. `Enter` activates focused element
- [ ] 4. `Escape` closes open panel/overlay
- [ ] 5. `Space` toggles playback in Railway Pipeline
- [ ] 6. Left/Right step through operations in Railway playback
- [ ] 7. Up/Down move step selection in Operation Log
- [ ] 8. `+`/`-` zoom in/out in Railway Pipeline
- [ ] 9. `0` fits Railway Pipeline to view
- [ ] 10. `d` toggles diff mode in Operation Log
- [ ] 11. `f` opens filter controls
- [ ] 12. `?` toggles educational sidebar
- [ ] 13. `/` opens global search
- [ ] 14. `s` opens What-If Simulator in Case Explorer

---

### Task 6.2: Accessibility

**Spec**: 15-accessibility.md (15.1-15.10)
**Test file**: `result-accessibility.test.tsx`
**Dependencies**: All Phase 2-5 tasks
**Mutation target**: >90%

Implement WCAG 2.1 AA compliance: ARIA roles/labels for all views, screen reader announcements, focus management, color independence, reduced motion, contrast requirements, touch targets, and high contrast mode.

#### Tests (27 component tests)

- [ ] 1. Panel root has `role="region"` with `aria-label`
- [ ] 2. View switcher has `role="tablist"`
- [ ] 3. View buttons have `role="tab"` with `aria-selected`
- [ ] 4. Active view has `role="tabpanel"`
- [ ] 5. Railway SVG has `role="img"` with `aria-label`
- [ ] 6. Operation nodes have `role="button"` with descriptive `aria-label`
- [ ] 7. Operation Log has `role="grid"`
- [ ] 8. Path tree has `role="tree"` with `role="treeitem"` children
- [ ] 9. Sankey SVG has `role="img"` with `aria-label`
- [ ] 10. Status bar has `role="status"` with `aria-live="polite"`
- [ ] 11. Screen reader announces view switch
- [ ] 12. Screen reader announces chain selection
- [ ] 13. Screen reader announces step selection with track info
- [ ] 14. Screen reader announces track switch detection
- [ ] 15. Screen reader announces filter application
- [ ] 16. Screen reader announces playback start/pause/end
- [ ] 17. Screen reader announces connection status changes
- [ ] 18. Focus moves to detail panel on node select
- [ ] 19. Escape returns focus to previously focused element
- [ ] 20. View switch moves focus to first interactive element
- [ ] 21. Color not sole indicator for Ok/Err (filled/empty circle + text)
- [ ] 22. Color not sole indicator for switch (lightning icon + "switched" text)
- [ ] 23. Color not sole indicator for duration severity (text + label)
- [ ] 24. Color not sole indicator for stability zone (percentage text + label)
- [ ] 25. All text meets WCAG AA 4.5:1 contrast ratio
- [ ] 26. Reduced motion disables all animations
- [ ] 27. Touch targets minimum 44x44px

---

### Task 6.3: Edge States & Error Boundaries

**Spec**: 14-integration.md (14.8, 14.9)
**Test file**: `result-edge-states.test.tsx`
**Dependencies**: Task 2.1, Task 1.2
**Mutation target**: >85%

Implement all edge state handling: empty states, no-tracing states, disconnection/reconnection with exponential backoff, view-level error boundaries with fallback UI and recovery actions, viewport culling, and pagination.

#### Tests (21 component tests)

- [ ] 1. No chains: "No Result chains detected" message
- [ ] 2. No executions for chain: "No executions recorded" message
- [ ] 3. Level 0 only (no tracing): Railway/Log views show "Enable tracing..."
- [ ] 4. Disconnected: stale data + "Disconnected" banner
- [ ] 5. Reconnected: data refreshes, banner removed
- [ ] 6. Empty Sankey (no stats): "No statistics available"
- [ ] 7. Async Waterfall for sync chain: "This chain is synchronous" message
- [ ] 8. Combinator Matrix for non-combinator chain: "No combinator operations"
- [ ] 9. Chain with 100+ operations: viewport culling active
- [ ] 10. Large chain (50+ paths): path tree paginates
- [ ] 11. Value serialization exceeded: "(truncated)" label shown
- [ ] 12. Values not captured: "(values not captured)" placeholder
- [ ] 13. View crash: ErrorBoundary shows fallback with error message
- [ ] 14. View crash: "Retry This View" remounts crashed view
- [ ] 15. View crash: "Switch to Overview" navigates to Overview Dashboard
- [ ] 16. View crash: "Copy Error Details" copies error to clipboard
- [ ] 17. View crash: preserved state (chainId, filter) survives crash
- [ ] 18. View crash: auto-retry on data source event re-renders view
- [ ] 19. Disconnected: reconnection retries at exponential backoff (1s, 2s, 4s, 8s, 16s, 30s cap)
- [ ] 20. Disconnected: after 5 min shows permanent "Connection lost" with manual Reconnect
- [ ] 21. Reconnected: full snapshot fetched and all views re-render

---

### Task 6.4: Integration Tests

**Spec**: All sections
**Test files**: `integration/result-data-flow.test.tsx`, `integration/result-chain-to-views.test.tsx`, `integration/result-filter-to-render.test.tsx`, `integration/result-cross-view-context.test.tsx`, `integration/result-playground-integration.test.tsx`, `integration/result-educational-flow.test.tsx`
**Dependencies**: All previous tasks

End-to-end integration tests verifying data flows through the full component tree.

#### Tests -- `result-data-flow.test.tsx` (3 integration tests)

- [ ] 1. DataSource with chains -> panel renders chain selector with entries
- [ ] 2. DataSource emits execution -> Railway Pipeline updates
- [ ] 3. DataSource emits stats update -> Overview Dashboard refreshes

#### Tests -- `result-chain-to-views.test.tsx` (4 integration tests)

- [ ] 1. Selecting chain updates Railway Pipeline with chain operations
- [ ] 2. Selecting chain updates Case Explorer with computed paths
- [ ] 3. Selecting chain updates Sankey with port statistics
- [ ] 4. Selecting execution updates Operation Log with step traces

#### Tests -- `result-filter-to-render.test.tsx` (3 integration tests)

- [ ] 1. Port filter -> only matching chain shown in selector
- [ ] 2. Error type filter -> Log shows only matching executions
- [ ] 3. Time range filter -> Sankey recomputes with filtered data

#### Tests -- `result-cross-view-context.test.tsx` (4 integration tests)

- [ ] 1. Railway -> "View in Log" -> Log shows correct step selected
- [ ] 2. Log -> "View in Pipeline" -> Railway scrolls to correct node
- [ ] 3. Case Explorer -> "View in Pipeline" -> Railway with matching execution
- [ ] 4. Overview -> top error click -> Log filtered to error type

#### Tests -- `result-playground-integration.test.tsx` (3 integration tests)

- [ ] 1. Playground auto-patches ok/err -> chain traced automatically
- [ ] 2. Code edit -> re-execution -> panel updates with new execution
- [ ] 3. Level 1 tracing enabled by default in Playground context

#### Tests -- `result-educational-flow.test.tsx` (3 integration tests)

- [ ] 1. Starting walkthrough -> steps highlight correct elements
- [ ] 2. Walkthrough view-switch step -> panel navigates to specified view
- [ ] 3. Context-aware sidebar -> selecting node -> sidebar content updates

---

## Test Count Summary

| Phase     | Category                                       | Count                    |
| --------- | ---------------------------------------------- | ------------------------ |
| 1         | Type-level tests                               | ~35 assertions (7 files) |
| 1         | Unit: data source                              | 12                       |
| 1         | Unit: visual encoding                          | 15                       |
| 1         | Unit: path analysis                            | 14                       |
| 1         | Unit: pattern recognition                      | 8                        |
| 1         | Unit: export                                   | 16                       |
| 2         | Component: panel + toolbar                     | 29                       |
| 2         | Component: railway pipeline + nodes + playback | 35                       |
| 2         | Component: operation log                       | 20                       |
| 3         | Component: case explorer + simulator           | 25                       |
| 3         | Component: sankey statistics                   | 20                       |
| 4         | Component: async waterfall                     | 18                       |
| 4         | Component: combinator matrix + statistics      | 23                       |
| 4         | Component: overview dashboard                  | 12                       |
| 5         | Component: educational sidebar + prompts       | 35                       |
| 5         | Component: filter system + global search       | 22                       |
| 5         | Component: cross-view + cross-panel nav        | 13                       |
| 5         | Component: real-time updates                   | 9                        |
| 6         | Component: keyboard navigation                 | 14                       |
| 6         | Component: accessibility                       | 27                       |
| 6         | Component: edge states                         | 21                       |
| 6         | Integration tests                              | 20                       |
| **Total** |                                                | **~408**                 |

---

## Mutation Testing Targets

| Priority | Module                 | Target | Task |
| -------- | ---------------------- | ------ | ---- |
| Critical | Path analysis          | >95%   | 1.4  |
| Critical | Visual encoding        | >95%   | 1.3  |
| Critical | Filter logic           | >90%   | 5.2  |
| Critical | Export                 | >90%   | 1.6  |
| Critical | Cross-panel navigation | >90%   | 5.3  |
| Critical | Keyboard shortcuts     | >90%   | 6.1  |
| Critical | Data source            | >90%   | 1.2  |
| Critical | Accessibility          | >90%   | 6.2  |
| Critical | Operation log          | >90%   | 2.3  |
| Critical | Panel + toolbar        | >90%   | 2.1  |
| High     | Pattern recognition    | >85%   | 1.5  |
| High     | Sankey rendering       | >85%   | 3.2  |
| High     | Combinator matrix      | >85%   | 4.2  |
| High     | Educational sidebar    | >85%   | 5.1  |
| High     | Railway pipeline       | >85%   | 2.2  |
| High     | Overview dashboard     | >85%   | 4.3  |
| High     | Edge states            | >85%   | 6.3  |
| Medium   | Async waterfall        | >80%   | 4.1  |
| Medium   | Real-time updates      | >80%   | 5.4  |

---

## Verification Checklist

Run before marking complete:

```bash
# All tests pass
pnpm --filter @hex-di/devtools-ui test -- --grep "result-"
pnpm --filter @hex-di/devtools-ui test:types

# Code quality
pnpm --filter @hex-di/devtools-ui typecheck
pnpm --filter @hex-di/devtools-ui lint

# No prohibited patterns in source
# (no `any`, no `as` casts, no eslint-disable)
```
