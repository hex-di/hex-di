# Guard Panel - Implementation Tasks

> Covers all ~350 tests from [16-definition-of-done.md](16-definition-of-done.md).
> Spec: [01-overview.md](01-overview.md) through [15-accessibility.md](15-accessibility.md).
> Target directory: `packages/devtools-ui/tests/panels/guard/`

---

## Phase 1: Foundation

### Task 1.1: Core Data Models & Type-Level Tests

**Spec**: 01-overview.md (1.4), 14-integration.md (14.2)
**Test files**: `types/guard-panel-state.test-d.ts`, `types/guard-evaluation-descriptor.test-d.ts`, `types/guard-evaluation-execution.test-d.ts`, `types/guard-path-descriptor.test-d.ts`, `types/guard-navigation.test-d.ts`, `types/guard-filter-state.test-d.ts`, `types/guard-data-source.test-d.ts`
**Dependencies**: None

Implement all 14 TypeScript interfaces from Section 1.4 and the `GuardDataSource` / `GuardDataEvent` from Section 14.2. Write type-level tests to verify structural correctness.

#### Types to implement

- `GuardEvaluationDescriptor` (1.4.1)
- `PolicyNodeDescriptor` (1.4.2)
- `PolicyLeafData` (1.4.3)
- `GuardEvaluationExecution` (1.4.4)
- `EvaluationNodeTrace` (1.4.5)
- `SerializedSubject` (1.4.6)
- `SerializedValue` (1.4.7)
- `GuardPortStatistics` (1.4.8)
- `GuardPanelSnapshot` (1.4.9)
- `GuardPathDescriptor` (1.4.10)
- `SerializedRole` (1.4.11)
- `GuardFilterState` (1.4.12)
- `GuardPanelNavigation` (1.4.13)
- `GuardViewId` (1.4.13)
- `GuardDataSource` (14.2)
- `GuardDataEvent` (14.2)

#### Type-level tests (~30 assertions across 7 files)

**`guard-panel-state.test-d.ts`**

- [ ] `snapshot.descriptors` is `ReadonlyMap<string, GuardEvaluationDescriptor>`
- [ ] `snapshot.portStats` is `ReadonlyMap<string, GuardPortStatistics>`
- [ ] `snapshot.recentExecutions` is `readonly GuardEvaluationExecution[]`
- [ ] `snapshot.snapshotTimestamp` is `number`
- [ ] `stats.allowRate` is `number`
- [ ] `stats.totalEvaluations` is `number`

**`guard-evaluation-descriptor.test-d.ts`**

- [ ] `descriptor.rootNode` is `PolicyNodeDescriptor`
- [ ] `descriptor.portName` is `string`
- [ ] `descriptor.policyKinds` is `ReadonlySet<PolicyKind>`
- [ ] `node.children` is `readonly PolicyNodeDescriptor[]`
- [ ] `node.kind` is `PolicyKind`
- [ ] `PolicyLeafData` is correct discriminated union with `type` field

**`guard-evaluation-execution.test-d.ts`**

- [ ] `execution.rootTrace` is `EvaluationNodeTrace`
- [ ] `execution.decision` is `"allow" | "deny"`
- [ ] `execution.subject` is `SerializedSubject`
- [ ] `trace.children` is `readonly EvaluationNodeTrace[]`
- [ ] `trace.result` is `"allow" | "deny"`
- [ ] `trace.evaluated` is `boolean`

**`guard-path-descriptor.test-d.ts`**

- [ ] `path.nodeOutcomes` is `readonly ("allow" | "deny" | "skip")[]`
- [ ] `path.finalOutcome` is `"allow" | "deny"`
- [ ] `path.frequency` is `number | undefined`
- [ ] `path.observedCount` is `number`

**`guard-navigation.test-d.ts`**

- [ ] `nav.descriptorId` is `string | undefined`
- [ ] `nav.executionId` is `string | undefined`
- [ ] `nav.view` is `GuardViewId | undefined`
- [ ] `GuardViewId` is `"tree" | "log" | "paths" | "sankey" | "timeline" | "roles" | "overview"`

**`guard-filter-state.test-d.ts`**

- [ ] `filter.decision` is `"all" | "allow" | "deny" | "error"`
- [ ] `filter.policyKind` is `PolicyKind | undefined`
- [ ] `filter.timeRange` union includes preset strings and custom object

**`guard-data-source.test-d.ts`**

- [ ] `ds.getDescriptors` returns `ReadonlyMap<string, GuardEvaluationDescriptor>`
- [ ] `ds.getPortStatistics` returns `ReadonlyMap<string, GuardPortStatistics>`
- [ ] `ds.subscribe` accepts listener and returns unsubscribe
- [ ] `GuardDataEvent` has `type` discriminant field

---

### Task 1.2: Data Source Implementation & Tests

**Spec**: 14-integration.md (14.2)
**Test file**: `guard-data-source.test.ts`
**Dependencies**: Task 1.1
**Mutation target**: >90%

Implement `MockGuardDataSource` (for tests) and the `GuardDataSource` contract. All data source tests are unit tests.

#### Tests (11 unit tests)

- [ ] 1. `getDescriptors()` returns ReadonlyMap of descriptors
- [ ] 2. `getPortStatistics()` returns ReadonlyMap of port stats
- [ ] 3. `getExecutions(portName)` returns executions for that port
- [ ] 4. `getPaths(descriptorId)` returns paths for that descriptor
- [ ] 5. `getRoleHierarchy()` returns serialized role array
- [ ] 6. `getSnapshot()` returns complete panel snapshot
- [ ] 7. `subscribe()` calls listener on descriptor-registered event
- [ ] 8. `subscribe()` calls listener on execution-added event
- [ ] 9. `subscribe()` calls listener on statistics-updated event
- [ ] 10. `subscribe()` calls listener on connection-lost event
- [ ] 11. `subscribe()` returns unsubscribe function that stops callbacks

---

### Task 1.3: Visual Encoding Utilities & Tests

**Spec**: 10-visual-encoding.md (10.1-10.10)
**Test file**: `guard-visual-encoding.test.ts`
**Dependencies**: Task 1.1
**Mutation target**: >95%

Implement pure utility functions for duration formatting, decision-to-color mapping, policy kind-to-color/icon mapping, and allow rate threshold coloring.

#### Tests (10 unit tests)

- [ ] 1. Allow maps to `--hex-guard-allow` color
- [ ] 2. Deny maps to `--hex-guard-deny` color
- [ ] 3. Error maps to `--hex-guard-error` color
- [ ] 4. Skip maps to `--hex-guard-skip` color
- [ ] 5. All 10 policy kinds map to correct kind color
- [ ] 6. Duration < 0.01ms formats as `<0.01ms`
- [ ] 7. Duration 0.01-0.99ms formats as `N.NNms`
- [ ] 8. Duration 1-999ms formats as `Nms`
- [ ] 9. Duration 1-59s formats as `N.Ns`
- [ ] 10. Duration >= 60s formats as `Nm Ns`

---

### Task 1.4: Path Analysis Engine & Tests

**Spec**: 06-policy-path-explorer.md (6.3)
**Test file**: `guard-path-analysis.test.ts`
**Dependencies**: Task 1.1
**Mutation target**: >90%

Implement static path enumeration for compound policy trees, short-circuit expansion, path explosion limiting, frequency calculation, and coverage computation. All pure functions.

#### Tests (9 unit tests)

- [ ] 1. Single leaf policy produces 2 paths (allow, deny)
- [ ] 2. `AllOf(A, B)` produces 3 paths (including short-circuit)
- [ ] 3. `AnyOf(A, B)` produces 3 paths (including short-circuit)
- [ ] 4. `Not(A)` produces 2 paths (inverted)
- [ ] 5. `AllOf(A, AnyOf(B, C))` produces correct number of paths
- [ ] 6. Path explosion limit caps at 256 paths
- [ ] 7. Frequency calculation matches observed execution distribution
- [ ] 8. Coverage computation identifies unobserved paths
- [ ] 9. Path description auto-generates human-readable summary

---

### Task 1.5: Descriptor Builder & Tests

**Spec**: 02-instrumentation.md (2.2.3)
**Test file**: `guard-descriptor-builder.test.ts`
**Dependencies**: Task 1.1
**Mutation target**: >90%

Implement descriptor construction from `PolicyConstraint` trees: walking the policy tree, assigning stable node IDs, computing leaf count, max depth, policy kind set, and async-capable detection.

#### Tests (11 unit tests)

- [ ] 1. Single `hasPermission` policy produces single-node descriptor
- [ ] 2. `AllOf(A, B)` produces root with 2 children
- [ ] 3. `AnyOf(A, B, C)` produces root with 3 children
- [ ] 4. `Not(A)` produces root with 1 child
- [ ] 5. `Labeled(A)` preserves label in descriptor
- [ ] 6. Nested compound policies produce correct tree depth
- [ ] 7. Leaf count computed correctly for complex trees
- [ ] 8. Max depth computed correctly for complex trees
- [ ] 9. Policy kinds set includes all unique kinds in tree
- [ ] 10. `HasRelationship` / `HasAttribute` flagged as async-capable
- [ ] 11. Node IDs are stable and unique within the tree

---

### Task 1.6: Export Utilities & Tests

**Spec**: 14-integration.md (14.5)
**Test file**: `guard-export.test.ts`
**Dependencies**: Task 1.1
**Mutation target**: >90%

Implement export functions for JSON (full/filtered), CSV (decision log), JSONL (audit trail), SVG (tree/roles/sankey) formats.

#### Tests (8 unit tests)

- [ ] 1. Full snapshot exports as valid JSON
- [ ] 2. Filtered snapshot respects current filter state
- [ ] 3. CSV decision log has correct headers and row format
- [ ] 4. CSV escapes commas and quotes in reason strings
- [ ] 5. JSONL audit trail has one `AuditEntry` per line
- [ ] 6. SVG tree export includes all nodes and edges
- [ ] 7. SVG role graph export includes all role nodes and edges
- [ ] 8. SVG sankey export includes all columns and links

---

## Phase 2: Core Views

### Task 2.1: Panel Shell, Toolbar & Status Bar

**Spec**: 03-views-and-wireframes.md (3.1, 3.2), 14-integration.md (14.1)
**Test files**: `guard-panel.test.tsx`, `guard-panel-toolbar.test.tsx`
**Dependencies**: Task 1.1, Task 1.2
**Mutation target**: >90%

Implement `GuardPanel`, `GuardPanelToolbar`, `GuardPanelStatusBar`, and `GuardPanelContent` shell components. Includes view switcher (7 views), port/execution selectors, status bar, error boundary, theme support, and lifecycle.

#### Tests -- `guard-panel.test.tsx` (16 component tests)

- [ ] 1. Renders panel with 7 view tabs in toolbar
- [ ] 2. Default view is "overview" when no initialState provided
- [ ] 3. Renders empty state when dataSource returns no descriptors
- [ ] 4. Empty state shows message: "No guarded ports detected"
- [ ] 5. Renders status bar with port context when port selected
- [ ] 6. Status bar shows Allow/Deny counts and allow rate
- [ ] 7. Status bar allow rate badge is green when >= 95%
- [ ] 8. Status bar allow rate badge is amber when 80-95%
- [ ] 9. Status bar allow rate badge is red when < 80%
- [ ] 10. Renders loading state when dataSource is pending
- [ ] 11. ErrorBoundary isolates panel crash and shows fallback
- [ ] 12. Panel subscribes to dataSource on mount
- [ ] 13. Panel unsubscribes from dataSource on unmount
- [ ] 14. initialState.view opens the specified view
- [ ] 15. initialState.descriptorId selects the specified port
- [ ] 16. Theme prop applies correct CSS variable values

#### Tests -- `guard-panel-toolbar.test.tsx` (13 component tests)

- [ ] 1. View switcher renders 7 buttons with correct labels
- [ ] 2. Clicking a view button switches the active view
- [ ] 3. Active view button has accent underline
- [ ] 4. Port selector dropdown lists all guarded ports
- [ ] 5. Port selector shows policy summary, allow rate, eval count
- [ ] 6. Port selector search filters by name (150ms debounce)
- [ ] 7. Execution selector shows recent executions (newest first)
- [ ] 8. Execution entry shows execution ID, decision badge, subject, timestamp, duration
- [ ] 9. Prev/Next buttons navigate between executions
- [ ] 10. `[?]` button toggles educational sidebar
- [ ] 11. Export dropdown lists export formats
- [ ] 12. Live indicator shows green dot when connected
- [ ] 13. Live indicator shows red dot with "Disconnected" when disconnected

---

### Task 2.2: Policy Evaluation Tree View

**Spec**: 04-policy-evaluation-tree.md (4.1-4.12), 10-visual-encoding.md (10.4, 10.5)
**Test files**: `guard-policy-tree.test.tsx`, `guard-policy-tree-node.test.tsx`
**Dependencies**: Task 1.1, Task 1.2, Task 1.3, Task 1.5, Task 2.1
**Mutation target**: >85%

Implement `PolicyEvaluationTreeView` with canvas tree rendering, compound/leaf nodes, edge rendering, zoom/pan, minimap, port/execution selectors, no-execution mode, playback animation, and node detail panel.

#### Tests -- `guard-policy-tree.test.tsx` (14 canvas + 9 playback = 23 component tests)

**Canvas:**

- [ ] 1. Renders tree canvas with root node at top
- [ ] 2. Renders compound nodes with correct icon and kind label
- [ ] 3. Renders leaf nodes with correct leaf data (permission, role, etc.)
- [ ] 4. Renders edges between parent and child nodes
- [ ] 5. Allow nodes have green border and muted green background
- [ ] 6. Deny nodes have red border and muted red background
- [ ] 7. Skipped nodes have dashed border at 30% opacity
- [ ] 8. No-execution mode shows all nodes in neutral color
- [ ] 9. No-execution mode shows node tooltips with kind descriptions
- [ ] 10. Minimap renders overview with viewport rectangle
- [ ] 11. Fit button zooms/pans to show entire tree
- [ ] 12. Mouse wheel zooms centered on cursor position
- [ ] 13. Click+drag on background pans the viewport
- [ ] 14. Zoom clamped to 0.2 - 4.0 range

**Playback:**

- [ ] 15. Play button starts animation at root node
- [ ] 16. Animation follows depth-first evaluation order
- [ ] 17. AllOf short-circuit: skipped children flash gray
- [ ] 18. AnyOf short-circuit: skipped children flash gray
- [ ] 19. Result propagation ripples back to root
- [ ] 20. Speed control changes animation timing (0.5x to 4x)
- [ ] 21. Pause freezes animation at current node
- [ ] 22. Step advances one node at a time
- [ ] 23. Reset returns to start state

#### Tests -- `guard-policy-tree-node.test.tsx` (12 component tests)

- [ ] 1. Compound node renders kind icon, name, and children summary
- [ ] 2. Leaf node renders kind icon, leaf data, and outcome badge
- [ ] 3. Node renders duration label when execution is selected
- [ ] 4. Node renders decision badge (allow/deny/skip/error)
- [ ] 5. Hovered node shows elevation shadow
- [ ] 6. Selected node has accent border
- [ ] 7. AllOf node shows "N/M children allow" summary
- [ ] 8. AnyOf node shows "N of M allow" summary
- [ ] 9. Not node shows inverted outcome indicator
- [ ] 10. HasAttribute node shows matcher description
- [ ] 11. HasRelationship node shows relation name
- [ ] 12. Policy kind icon maps correctly for all 10 kinds

---

### Task 2.3: Decision Log View

**Spec**: 05-decision-log.md (5.1-5.13)
**Test files**: `guard-decision-log.test.tsx`, `guard-decision-log-entry.test.tsx`
**Dependencies**: Task 1.1, Task 1.2, Task 1.3, Task 2.1
**Mutation target**: >90%

Implement `DecisionLogView` with sortable table (7 columns), decision badges, inline filters, detail panel (subject, evaluation trace, audit context), action buttons, real-time updates, virtual scrolling, and error entries.

#### Tests -- `guard-decision-log.test.tsx` (17 component tests)

- [ ] 1. Renders table with 7 columns: #, Timestamp, Port, Subject, Decision, Policy, Duration
- [ ] 2. Rows sorted by timestamp descending (newest first) by default
- [ ] 3. Click column header sorts by that column
- [ ] 4. Sort toggle between ascending and descending
- [ ] 5. Active sort column shows arrow indicator
- [ ] 6. Click row opens detail panel
- [ ] 7. Double-click row navigates to Tree view with that execution
- [ ] 8. Allow entries show green "● Allow" badge
- [ ] 9. Deny entries show red "○ Deny" badge
- [ ] 10. Error entries show amber "◆ Error" badge
- [ ] 11. Detail panel shows Subject section with roles and permissions
- [ ] 12. Detail panel shows Evaluation Trace as indented tree
- [ ] 13. Detail panel shows Audit Context with evaluation ID and metadata
- [ ] 14. "View in Tree" button navigates to Tree view
- [ ] 15. "Copy as JSON" copies execution object to clipboard
- [ ] 16. Virtual scrolling renders only visible rows + 10 overscan
- [ ] 17. New real-time entries slide in at top of log

#### Tests -- `guard-decision-log-entry.test.tsx` (4 component tests)

- [ ] 1. Entry renders all 7 column values correctly
- [ ] 2. Subject ID truncated to 12 chars with tooltip for full ID
- [ ] 3. Duration formatted per duration formatting rules
- [ ] 4. Error entry shows error code instead of duration

---

## Phase 3: Analysis Views

### Task 3.1: Policy Path Explorer View

**Spec**: 06-policy-path-explorer.md (6.1-6.8)
**Test files**: `guard-path-explorer.test.tsx`, `guard-path-simulator.test.tsx`
**Dependencies**: Task 1.1, Task 1.2, Task 1.4, Task 2.1
**Mutation target**: >90% (path analysis), >85% (components)

Implement `PolicyPathExplorerView` with path tree, runtime frequency overlay, coverage analysis, what-if subject simulation, path detail panel, and presets.

#### Tests -- `guard-path-explorer.test.tsx` (10 component tests)

- [ ] 1. Renders path tree with all computed paths
- [ ] 2. Each path shows node sequence with per-node outcomes
- [ ] 3. Allow paths have green terminal badge
- [ ] 4. Deny paths have red terminal badge
- [ ] 5. Frequency bars proportional to observed execution count
- [ ] 6. Unobserved paths show "-- (no data)" frequency
- [ ] 7. Coverage section shows path and leaf node coverage percentages
- [ ] 8. Missing paths highlighted in amber
- [ ] 9. Click path opens detail panel with frequency and description
- [ ] 10. Detail panel shows example execution link

#### Tests -- `guard-path-simulator.test.tsx` (8 component tests)

- [ ] 1. Simulation panel allows editing subject roles
- [ ] 2. Simulation panel allows editing subject permissions
- [ ] 3. Simulation panel allows editing subject attributes
- [ ] 4. "Evaluate" button runs simulation and shows result
- [ ] 5. Simulation result highlights the path taken
- [ ] 6. Diff mode shows "was deny, now allow" when change flips result
- [ ] 7. "Empty subject" preset clears all roles/permissions
- [ ] 8. "Recent subject" preset clones from last execution's subject

---

### Task 3.2: Access Flow Statistics View

**Spec**: 07-access-flow-statistics.md (7.1-7.10)
**Test file**: `guard-access-flow-statistics.test.tsx`
**Dependencies**: Task 1.1, Task 1.2, Task 1.3, Task 2.1
**Mutation target**: >85%

Implement `AccessFlowStatisticsView` with SVG Sankey diagram (5 columns: Subjects, Roles, Policies, Ports, Outcomes), node/link rendering, hover highlighting, hotspot detection, flow calculation, toolbar filters (port, time range, min flow), and Level 0 fallback.

#### Tests (13 component tests)

- [ ] 1. Renders Sankey diagram with 5 columns: Subjects, Roles, Policies, Ports, Outcome
- [ ] 2. Node heights proportional to flow volume
- [ ] 3. Link widths proportional to flow volume
- [ ] 4. Allow links colored green, deny links colored red
- [ ] 5. Hover node highlights connected flows and dims unrelated
- [ ] 6. Hover link shows flow detail tooltip
- [ ] 7. Click subject node filters to that subject
- [ ] 8. Click port node navigates to Tree view for that port
- [ ] 9. Hotspot panel lists ports with highest deny rates
- [ ] 10. Hotspot detection uses 2x global average or 10% threshold
- [ ] 11. Minimum flow threshold hides low-volume links
- [ ] 12. Port filter isolates single port's flows
- [ ] 13. Level 0 shows simplified 2-column view (Ports -> Outcomes)

---

## Phase 4: Specialized Views

### Task 4.1: Evaluation Timeline View

**Spec**: 08-evaluation-timeline.md (8.1-8.11)
**Test file**: `guard-evaluation-timeline.test.tsx`
**Dependencies**: Task 1.1, Task 1.2, Task 1.3, Task 2.1
**Mutation target**: >80%

Implement `EvaluationTimelineView` with duration bars per policy node, async resolver detail (queue/resolution/timeout phases), time scale controls, execution selector, compare mode, summary section (total/sync/async/overhead breakdown), critical path highlighting, and bottleneck detection.

#### Tests (11 component tests)

- [ ] 1. Renders timeline rows for each policy node, indented by depth
- [ ] 2. Duration bars sized proportionally to node evaluation time
- [ ] 3. Allow nodes have green bars, deny nodes red, skip nodes no bar
- [ ] 4. Async operations show nested resolver bar in blue
- [ ] 5. Timeout operations show red bar at timeout boundary
- [ ] 6. Summary section shows total, sync, async, and overhead breakdown
- [ ] 7. Critical path highlighted with bold left border
- [ ] 8. Bottleneck node flagged when > 50% of total duration
- [ ] 9. Time scale auto-adjusts to execution duration
- [ ] 10. Compare mode renders two timelines with diff indicators
- [ ] 11. Duration delta shown inline between compared executions

---

### Task 4.2: Role Hierarchy Graph View

**Spec**: 09-role-hierarchy-graph.md (9.1-9.11)
**Test files**: `guard-role-hierarchy-graph.test.tsx`, `guard-role-detail.test.tsx`
**Dependencies**: Task 1.1, Task 1.2, Task 1.3, Task 2.1
**Mutation target**: >85%

Implement `RoleHierarchyGraphView` with DAG layout (Sugiyama algorithm), role nodes (compact/expanded), permission badges, inheritance edges, cycle detection, search/filtering, and detail panel (permission breakdown, redundancy, SoD analysis).

#### Tests -- `guard-role-hierarchy-graph.test.tsx` (10 component tests)

- [ ] 1. Renders DAG with role nodes at correct layers
- [ ] 2. Inheritance edges connect parent to child roles
- [ ] 3. Node shows role name, direct permission count, inherited count
- [ ] 4. Expanded mode shows permission badges inline
- [ ] 5. Click node opens detail panel with permission breakdown
- [ ] 6. Cycle detection highlights circular inheritance in red
- [ ] 7. Cycle warning banner shown when cycles detected
- [ ] 8. Diamond inheritance shows single node with multiple parent edges
- [ ] 9. Search filters roles by name and permission string
- [ ] 10. Unmatched nodes dimmed at 30% opacity during search

#### Tests -- `guard-role-detail.test.tsx` (6 component tests)

- [ ] 1. Detail panel shows direct permissions section
- [ ] 2. Detail panel shows inherited permissions with source role
- [ ] 3. Redundant permissions flagged with "(redundant)" label
- [ ] 4. Flattened total shows deduplicated count
- [ ] 5. Subjects with this role listed (from execution data)
- [ ] 6. SoD conflicts shown when mutually exclusive roles detected

---

### Task 4.3: Overview Dashboard View

**Spec**: 03-views-and-wireframes.md (3.7)
**Test file**: `guard-overview-dashboard.test.tsx`
**Dependencies**: Task 1.1, Task 1.2, Task 1.3, Task 2.1
**Mutation target**: >85%

Implement `OverviewDashboardView` with stat cards (Total Evals, Allow Rate, Guarded Ports, Active Subjects), deny distribution chart, allow rate timeline sparklines, and top denials table.

#### Tests (8 component tests)

- [ ] 1. Renders 4 stat cards: Total Evals, Allow Rate, Guarded Ports, Active Subjects
- [ ] 2. Stat cards show trend indicators (up/down arrows)
- [ ] 3. Deny distribution chart shows breakdown by reason
- [ ] 4. Allow rate timeline shows sparkline per port
- [ ] 5. Top denials table lists ports with most denials
- [ ] 6. Click port stat card navigates to Log filtered to that port
- [ ] 7. Click deny reason navigates to Log filtered to deny decisions
- [ ] 8. Dashboard works with Level 0 data (no tracing required)

---

## Phase 5: Cross-Cutting Features

### Task 5.1: Educational Sidebar & Walkthroughs

**Spec**: 12-educational-features.md (12.1-12.8)
**Test files**: `guard-educational-sidebar.test.tsx`, `guard-educational-prompts.test.tsx`
**Dependencies**: Task 1.1, Task 2.1
**Mutation target**: >85%

Implement `EducationalSidebar` with 3 tabs (Glossary, Patterns, Tours): policy kind glossary (10 entries, context-aware), access control pattern cards (7 patterns: RBAC/ABAC/ReBAC/Compound/FieldMask/Compliance/SoD), guided walkthroughs (7 tours), matcher expression reference, and error code reference.

#### Tests -- `guard-educational-sidebar.test.tsx` (8 component tests)

- [ ] 1. Sidebar opens on `[?]` click with 320px width
- [ ] 2. Sidebar closes on `[X]` click
- [ ] 3. Glossary tab lists all 10 policy kinds with descriptions
- [ ] 4. Patterns tab shows RBAC, ABAC, ReBAC, Compound, and other cards
- [ ] 5. Tours tab lists all 7 walkthroughs
- [ ] 6. Context-aware glossary scrolls to selected node's kind
- [ ] 7. Matcher reference table shows all 11 matcher expressions
- [ ] 8. Error code reference lists all relevant ACL codes

#### Tests -- `guard-educational-prompts.test.tsx` (8 component tests)

- [ ] 1. First deny viewed triggers "Denials trace back to..." prompt
- [ ] 2. First compound tree triggers "AllOf requires ALL..." prompt
- [ ] 3. First short-circuit triggers "Gray dashed nodes were..." prompt
- [ ] 4. First async timeline triggers "Blue bars show..." prompt
- [ ] 5. Prompt auto-dismisses after 10 seconds
- [ ] 6. "Got it" marks prompt as seen (won't show again in session)
- [ ] 7. Maximum 1 prompt visible at a time
- [ ] 8. Prompts suppressed after related walkthrough completed

---

### Task 5.2: Filter System & Global Search

**Spec**: 13-filter-and-search.md (13.1-13.12)
**Test files**: `guard-filter-system.test.tsx`, `guard-global-search.test.tsx`
**Dependencies**: Task 2.1, Task 2.2, Task 2.3, Task 3.1, Task 3.2
**Mutation target**: >90%

Implement 6 filter dimensions (Port, Subject, Role, Decision, Policy Kind, Time Range), per-view filter visibility, filter persistence, active filter badge, and global search with cross-view navigation.

#### Tests -- `guard-filter-system.test.tsx` (11 component tests)

- [ ] 1. Port filter dropdown lists all guarded ports with eval counts
- [ ] 2. Port filter search filters by name with 150ms debounce
- [ ] 3. Subject filter lists subjects with eval counts and roles
- [ ] 4. Decision filter toggles between All, Allow, Deny, Error
- [ ] 5. Policy kind filter groups by category with icons
- [ ] 6. Time range filter supports preset and custom ranges
- [ ] 7. Active filter badge shows count of active filters
- [ ] 8. "Clear All" resets all filters to defaults
- [ ] 9. Filters persist across view switches
- [ ] 10. Filters saved to and restored from localStorage
- [ ] 11. Inapplicable filters hidden for current view

#### Tests -- `guard-global-search.test.tsx` (6 component tests)

- [ ] 1. Search opens on Ctrl+F
- [ ] 2. Minimum 2 characters to trigger search
- [ ] 3. Results grouped by category (Ports, Decisions, Permissions, etc.)
- [ ] 4. Click result navigates to appropriate view
- [ ] 5. Search debounced at 200ms
- [ ] 6. Maximum 50 results per category with "show more"

---

### Task 5.3: Cross-View & Cross-Panel Navigation

**Spec**: 11-interactions.md (11.8, 11.9)
**Test files**: `guard-cross-view-nav.test.tsx`, `guard-cross-panel-nav.test.tsx`
**Dependencies**: Task 2.1, Task 2.2, Task 2.3, Task 3.1, Task 3.2, Task 4.1, Task 4.3
**Mutation target**: >90%

Implement all 12 cross-view navigation links (preserving descriptor/execution/node context) and 4 cross-panel navigation callbacks (Graph, Result, Container panels).

#### Tests -- `guard-cross-view-nav.test.tsx` (8 component tests)

- [ ] 1. Log double-click navigates to Tree with correct execution
- [ ] 2. Tree "View Paths" button navigates to Paths with correct descriptor
- [ ] 3. Paths click execution link navigates to Tree with correct execution
- [ ] 4. Sankey double-click port navigates to Tree for that port
- [ ] 5. Sankey click hotspot navigates to Log filtered to that port
- [ ] 6. Timeline click node row navigates to Tree with correct node
- [ ] 7. Overview click port stat navigates to Log filtered to that port
- [ ] 8. Navigation preserves filter state when applicable

#### Tests -- `guard-cross-panel-nav.test.tsx` (4 component tests)

- [ ] 1. Graph Panel guard badge click opens Guard Panel with correct port
- [ ] 2. Guard Panel port name click sends highlight to Graph Panel
- [ ] 3. Result Panel guard error click opens Guard Panel log view
- [ ] 4. Guard Panel sends correct GuardPanelNavigation context

---

### Task 5.4: Real-Time Updates

**Spec**: 11-interactions.md (11.10)
**Test file**: `guard-real-time.test.tsx`
**Dependencies**: Task 1.2, Task 2.1
**Mutation target**: >80%

Implement live update handling with debouncing, connection status indicators, pause/resume toggle, queue management, and auto-scroll behavior.

#### Tests (9 component tests)

- [ ] 1. New evaluation events appear in Decision Log
- [ ] 2. New events batched per animation frame (16ms debounce)
- [ ] 3. Statistics update debounced at 500ms
- [ ] 4. Live indicator shows green dot when connected
- [ ] 5. Live indicator shows red dot when connection lost
- [ ] 6. Pause/resume toggle stops and starts real-time updates
- [ ] 7. Queued events applied on resume (max 1000)
- [ ] 8. Auto-scroll follows new entries when scrolled to top
- [ ] 9. Auto-scroll stops when user scrolls away

---

## Phase 6: Quality & Compliance

### Task 6.1: Keyboard Navigation

**Spec**: 11-interactions.md (11.1-11.7), 15-accessibility.md (15.3)
**Test file**: `guard-keyboard.test.tsx`
**Dependencies**: Task 2.1, Task 2.2, Task 2.3, Task 3.1, Task 4.2, Task 5.1, Task 5.2
**Mutation target**: >90%

Implement all global keyboard shortcuts and view-specific keyboard controls for Tree, Log, Paths, Sankey, Timeline, and Roles views.

#### Tests (12 component tests)

- [ ] 1. Number keys 1-7 switch between views
- [ ] 2. `?` toggles educational sidebar
- [ ] 3. Escape closes detail panel and sidebar
- [ ] 4. Ctrl+F focuses search input
- [ ] 5. Ctrl+E focuses port selector
- [ ] 6. Ctrl+[ and Ctrl+] navigate between executions
- [ ] 7. Arrow keys navigate tree nodes (tree pattern)
- [ ] 8. Arrow keys navigate log entries (table pattern)
- [ ] 9. Arrow keys navigate role graph (tree pattern)
- [ ] 10. Arrow keys navigate Sankey nodes (column pattern)
- [ ] 11. Enter activates selected element
- [ ] 12. Space toggles expand/collapse in tree views

---

### Task 6.2: Accessibility

**Spec**: 15-accessibility.md (15.1-15.13)
**Test file**: `guard-accessibility.test.tsx`
**Dependencies**: All Phase 2-5 tasks
**Mutation target**: >90%

Implement WCAG 2.1 AA compliance: ARIA roles/labels for all views, screen reader announcements, focus management, color independence, contrast ratios, motion preferences, text sizing, and high contrast mode.

#### Tests (16 component tests)

- [ ] 1. Panel has `role="region"` with `aria-label`
- [ ] 2. Toolbar has `role="toolbar"` with tab buttons
- [ ] 3. Policy tree has `role="tree"` with treeitem nodes
- [ ] 4. Decision log has `role="table"` with sortable column headers
- [ ] 5. Role graph has `role="tree"` with treeitem nodes
- [ ] 6. Sankey has `role="img"` with text alternative
- [ ] 7. Decision badges have `aria-label` (not just color)
- [ ] 8. Sort direction announced via `aria-sort`
- [ ] 9. New real-time entries announced via `aria-live`
- [ ] 10. Cycle detection warning announced via `aria-live`
- [ ] 11. Focus indicators visible on all interactive elements
- [ ] 12. Focus trap works in educational sidebar
- [ ] 13. Focus restored when closing detail panel
- [ ] 14. `prefers-reduced-motion` disables all animations
- [ ] 15. `prefers-contrast:more` increases border widths
- [ ] 16. All text meets 4.5:1 contrast ratio

---

### Task 6.3: Edge States & Error Boundaries

**Spec**: 03-views-and-wireframes.md through 09-role-hierarchy-graph.md (edge case tables), 14-integration.md (14.7)
**Test file**: `guard-edge-states.test.tsx`
**Dependencies**: Task 2.1, Task 1.2
**Mutation target**: >85%

Implement all edge state handling: empty states per view, no-tracing fallbacks (Level 0 vs Level 1), disconnection, loading, single leaf policy, very deep/wide trees, path explosion, all-allow/all-deny warnings, and error boundaries.

#### Tests (14 component tests)

- [ ] 1. Empty state shown when no guarded ports detected
- [ ] 2. Empty tree message when port selected but no executions
- [ ] 3. Empty log message when no evaluations recorded
- [ ] 4. Loading state shown when data source is pending
- [ ] 5. Disconnected state shown when connection lost
- [ ] 6. No-tracing state shown when Level 1 features accessed at Level 0
- [ ] 7. Single leaf policy renders without tree structure
- [ ] 8. Very deep tree (>10 levels) auto-switches to left-right layout
- [ ] 9. Very wide tree (>30 leaves) auto-switches to radial layout
- [ ] 10. Path explosion limit (256 paths) shows truncation message
- [ ] 11. All paths deny shows warning message
- [ ] 12. All paths allow shows info message
- [ ] 13. Role graph with no roles shows empty message
- [ ] 14. Subject with very long ID truncated in log

---

### Task 6.4: Integration Tests

**Spec**: All sections
**Test files**: `integration/guard-data-flow.test.tsx`, `integration/guard-port-to-views.test.tsx`, `integration/guard-filter-to-render.test.tsx`, `integration/guard-cross-view-context.test.tsx`, `integration/guard-playground-integration.test.tsx`, `integration/guard-educational-flow.test.tsx`
**Dependencies**: All previous tasks

End-to-end integration tests verifying data flows through the full component tree.

#### Tests -- `integration/guard-data-flow.test.tsx` (3 integration tests)

- [ ] 1. DataSource snapshot renders correct overview dashboard
- [ ] 2. DataSource execution data renders correct tree view
- [ ] 3. DataSource update triggers re-render of affected views

#### Tests -- `integration/guard-port-to-views.test.tsx` (2 integration tests)

- [ ] 1. Selecting a port updates Tree, Log, Paths, and Timeline views
- [ ] 2. Port selection persists across view switches

#### Tests -- `integration/guard-filter-to-render.test.tsx` (3 integration tests)

- [ ] 1. Decision=Deny filter shows only deny entries in log
- [ ] 2. Port filter restricts all views to that port's data
- [ ] 3. Time range filter restricts log and overview to window

#### Tests -- `integration/guard-cross-view-context.test.tsx` (3 integration tests)

- [ ] 1. Navigating from Log to Tree preserves execution context
- [ ] 2. Navigating from Paths to Tree preserves descriptor context
- [ ] 3. Navigating from Sankey to Log preserves port filter

#### Tests -- `integration/guard-playground-integration.test.tsx` (3 integration tests)

- [ ] 1. Playground auto-traces all guard evaluations
- [ ] 2. Policy tree updates when playground code changes
- [ ] 3. Subject changes in playground sidebar trigger re-evaluation

#### Tests -- `integration/guard-educational-flow.test.tsx` (2 integration tests)

- [ ] 1. Walkthrough step highlights correct UI element
- [ ] 2. Completing walkthrough suppresses related prompts

---

## Test Count Summary

| Phase     | Category                                  | Count                    |
| --------- | ----------------------------------------- | ------------------------ |
| 1         | Type-level tests                          | ~30 assertions (7 files) |
| 1         | Unit: data source                         | 11                       |
| 1         | Unit: visual encoding                     | 10                       |
| 1         | Unit: path analysis                       | 9                        |
| 1         | Unit: descriptor builder                  | 11                       |
| 1         | Unit: export                              | 8                        |
| 2         | Component: panel + toolbar                | 29                       |
| 2         | Component: policy tree + nodes + playback | 35                       |
| 2         | Component: decision log + entries         | 21                       |
| 3         | Component: path explorer + simulator      | 18                       |
| 3         | Component: access flow statistics         | 13                       |
| 4         | Component: evaluation timeline            | 11                       |
| 4         | Component: role hierarchy graph + detail  | 16                       |
| 4         | Component: overview dashboard             | 8                        |
| 5         | Component: educational sidebar + prompts  | 16                       |
| 5         | Component: filter system + global search  | 17                       |
| 5         | Component: cross-view + cross-panel nav   | 12                       |
| 5         | Component: real-time updates              | 9                        |
| 6         | Component: keyboard navigation            | 12                       |
| 6         | Component: accessibility                  | 16                       |
| 6         | Component: edge states                    | 14                       |
| 6         | Integration tests                         | 16                       |
| **Total** |                                           | **~352**                 |

---

## Mutation Testing Targets

| Priority | Module                    | Target | Task |
| -------- | ------------------------- | ------ | ---- |
| Critical | Path analysis             | >90%   | 1.4  |
| Critical | Visual encoding           | >95%   | 1.3  |
| Critical | Descriptor builder        | >90%   | 1.5  |
| Critical | Filter logic              | >90%   | 5.2  |
| Critical | Export                    | >90%   | 1.6  |
| Critical | Cross-panel navigation    | >90%   | 5.3  |
| Critical | Keyboard shortcuts        | >90%   | 6.1  |
| Critical | Data source               | >90%   | 1.2  |
| Critical | Accessibility             | >90%   | 6.2  |
| Critical | Decision log              | >90%   | 2.3  |
| Critical | Panel + toolbar           | >90%   | 2.1  |
| High     | Path explorer + simulator | >90%   | 3.1  |
| High     | Sankey rendering          | >85%   | 3.2  |
| High     | Role hierarchy graph      | >85%   | 4.2  |
| High     | Policy evaluation tree    | >85%   | 2.2  |
| High     | Educational sidebar       | >85%   | 5.1  |
| High     | Overview dashboard        | >85%   | 4.3  |
| High     | Edge states               | >85%   | 6.3  |
| Medium   | Evaluation timeline       | >80%   | 4.1  |
| Medium   | Real-time updates         | >80%   | 5.4  |

---

## Verification Checklist

Run before marking complete:

```bash
# All tests pass
pnpm --filter @hex-di/devtools-ui test -- --grep "guard-"
pnpm --filter @hex-di/devtools-ui test:types

# Code quality
pnpm --filter @hex-di/devtools-ui typecheck
pnpm --filter @hex-di/devtools-ui lint

# No prohibited patterns in source
# (no `any`, no `as` casts, no eslint-disable)
```
