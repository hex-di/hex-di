_Previous: [15-accessibility.md](15-accessibility.md)_

# 16. Definition of Done

All tests required for the Guard Panel to be considered complete. Each DoD maps to spec sections and specifies required unit tests, component tests, integration tests, type-level tests, and mutation testing guidance.

---

## 16.1 Test File Conventions

```
packages/devtools-ui/tests/panels/guard/
  guard-panel.test.tsx                     # Panel rendering, empty states, lifecycle
  guard-panel-toolbar.test.tsx             # View switcher, port/execution selectors
  guard-policy-tree.test.tsx               # Policy tree canvas, nodes, edges, playback
  guard-policy-tree-node.test.tsx          # Individual node rendering, states, badges
  guard-decision-log.test.tsx              # Decision list, detail panel, sorting
  guard-decision-log-entry.test.tsx        # Individual entry rendering
  guard-path-explorer.test.tsx             # Path tree, path detail, coverage analysis
  guard-path-simulator.test.tsx            # What-if simulation controls and behavior
  guard-access-flow-statistics.test.tsx    # Sankey diagram, hotspots, flow calculation
  guard-evaluation-timeline.test.tsx       # Duration bars, timeline, compare mode
  guard-role-hierarchy-graph.test.tsx      # DAG layout, role nodes, cycle detection
  guard-role-detail.test.tsx               # Permission breakdown, SoD analysis
  guard-overview-dashboard.test.tsx        # Stat cards, deny distribution, top denials
  guard-educational-sidebar.test.tsx       # Glossary, walkthroughs, pattern cards
  guard-educational-prompts.test.tsx       # Contextual learning prompts
  guard-filter-system.test.tsx             # All filter dimensions and combinations
  guard-global-search.test.tsx             # Cross-view search
  guard-cross-view-nav.test.tsx            # Navigation between views with context
  guard-cross-panel-nav.test.tsx           # Navigation to/from other DevTools panels
  guard-real-time.test.tsx                 # Live updates, debouncing, indicators
  guard-export.test.ts                     # All export formats (unit)
  guard-keyboard.test.tsx                  # Keyboard shortcuts and navigation
  guard-accessibility.test.tsx             # ARIA roles, screen reader, focus management
  guard-edge-states.test.tsx               # Empty, loading, disconnected, no-tracing
  guard-visual-encoding.test.ts            # Color mapping, duration formatting (unit)
  guard-path-analysis.test.ts              # Static path enumeration and pruning (unit)
  guard-data-source.test.ts               # DataSource interface contract (unit)
  guard-descriptor-builder.test.ts         # Descriptor construction from policies (unit)
  types/
    guard-panel-state.test-d.ts           # Type-level GuardPanelSnapshot
    guard-evaluation-descriptor.test-d.ts  # Type-level GuardEvaluationDescriptor
    guard-evaluation-execution.test-d.ts   # Type-level GuardEvaluationExecution
    guard-path-descriptor.test-d.ts       # Type-level GuardPathDescriptor
    guard-navigation.test-d.ts            # Type-level GuardPanelNavigation
    guard-filter-state.test-d.ts          # Type-level GuardFilterState
    guard-data-source.test-d.ts           # Type-level GuardDataSource
  integration/
    guard-data-flow.test.tsx              # DataSource -> rendering pipeline
    guard-port-to-views.test.tsx          # Port selection -> all views update
    guard-filter-to-render.test.tsx       # Filter state -> view content
    guard-cross-view-context.test.tsx     # Cross-view navigation preserves context
    guard-playground-integration.test.tsx  # Playground auto-tracing -> panel
    guard-educational-flow.test.tsx       # Walkthrough steps -> UI highlights
```

---

## 16.2 DoD 1: Panel Rendering and Lifecycle (Spec Sections 3, 14)

### Component Tests -- `guard-panel.test.tsx`

| #   | Test                                                       | Type      |
| --- | ---------------------------------------------------------- | --------- |
| 1   | Renders panel with 7 view tabs in toolbar                  | component |
| 2   | Default view is "overview" when no initialState provided   | component |
| 3   | Renders empty state when dataSource returns no descriptors | component |
| 4   | Empty state shows message: "No guarded ports detected"     | component |
| 5   | Renders status bar with port context when port selected    | component |
| 6   | Status bar shows Allow/Deny counts and allow rate          | component |
| 7   | Status bar allow rate badge is green when >= 95%           | component |
| 8   | Status bar allow rate badge is amber when 80-95%           | component |
| 9   | Status bar allow rate badge is red when < 80%              | component |
| 10  | Renders loading state when dataSource is pending           | component |
| 11  | ErrorBoundary isolates panel crash and shows fallback      | component |
| 12  | Panel subscribes to dataSource on mount                    | component |
| 13  | Panel unsubscribes from dataSource on unmount              | component |
| 14  | initialState.view opens the specified view                 | component |
| 15  | initialState.descriptorId selects the specified port       | component |
| 16  | Theme prop applies correct CSS variable values             | component |

### Component Tests -- `guard-panel-toolbar.test.tsx`

| #   | Test                                                                             | Type      |
| --- | -------------------------------------------------------------------------------- | --------- |
| 1   | View switcher renders 7 buttons with correct labels                              | component |
| 2   | Clicking a view button switches the active view                                  | component |
| 3   | Active view button has accent underline                                          | component |
| 4   | Port selector dropdown lists all guarded ports                                   | component |
| 5   | Port selector shows policy summary, allow rate, eval count                       | component |
| 6   | Port selector search filters by name (150ms debounce)                            | component |
| 7   | Execution selector shows recent executions (newest first)                        | component |
| 8   | Execution entry shows execution ID, decision badge, subject, timestamp, duration | component |
| 9   | Prev/Next buttons navigate between executions                                    | component |
| 10  | `[?]` button toggles educational sidebar                                         | component |
| 11  | Export dropdown lists export formats                                             | component |
| 12  | Live indicator shows green dot when connected                                    | component |
| 13  | Live indicator shows red dot with "Disconnected" when disconnected               | component |

**Mutation testing target**: >90%. View button-to-view mapping, allow rate threshold values (95%, 80%), and toolbar control dispatch must be caught.

---

## 16.3 DoD 2: Policy Evaluation Tree View (Spec Section 4)

### Component Tests -- `guard-policy-tree.test.tsx`

| #   | Test                                                               | Type      |
| --- | ------------------------------------------------------------------ | --------- |
| 1   | Renders tree canvas with root node at top                          | component |
| 2   | Renders compound nodes with correct icon and kind label            | component |
| 3   | Renders leaf nodes with correct leaf data (permission, role, etc.) | component |
| 4   | Renders edges between parent and child nodes                       | component |
| 5   | Allow nodes have green border and muted green background           | component |
| 6   | Deny nodes have red border and muted red background                | component |
| 7   | Skipped nodes have dashed border at 30% opacity                    | component |
| 8   | No-execution mode shows all nodes in neutral color                 | component |
| 9   | No-execution mode shows node tooltips with kind descriptions       | component |
| 10  | Minimap renders overview with viewport rectangle                   | component |
| 11  | Fit button zooms/pans to show entire tree                          | component |
| 12  | Mouse wheel zooms centered on cursor position                      | component |
| 13  | Click+drag on background pans the viewport                         | component |
| 14  | Zoom clamped to 0.2 - 4.0 range                                    | component |

### Component Tests -- `guard-policy-tree-node.test.tsx`

| #   | Test                                                        | Type      |
| --- | ----------------------------------------------------------- | --------- |
| 1   | Compound node renders kind icon, name, and children summary | component |
| 2   | Leaf node renders kind icon, leaf data, and outcome badge   | component |
| 3   | Node renders duration label when execution is selected      | component |
| 4   | Node renders decision badge (allow/deny/skip/error)         | component |
| 5   | Hovered node shows elevation shadow                         | component |
| 6   | Selected node has accent border                             | component |
| 7   | AllOf node shows "N/M children allow" summary               | component |
| 8   | AnyOf node shows "N of M allow" summary                     | component |
| 9   | Not node shows inverted outcome indicator                   | component |
| 10  | HasAttribute node shows matcher description                 | component |
| 11  | HasRelationship node shows relation name                    | component |
| 12  | Policy kind icon maps correctly for all 10 kinds            | component |

### Component Tests -- `guard-policy-tree.test.tsx` (Playback)

| #   | Test                                                | Type      |
| --- | --------------------------------------------------- | --------- |
| 15  | Play button starts animation at root node           | component |
| 16  | Animation follows depth-first evaluation order      | component |
| 17  | AllOf short-circuit: skipped children flash gray    | component |
| 18  | AnyOf short-circuit: skipped children flash gray    | component |
| 19  | Result propagation ripples back to root             | component |
| 20  | Speed control changes animation timing (0.5x to 4x) | component |
| 21  | Pause freezes animation at current node             | component |
| 22  | Step advances one node at a time                    | component |
| 23  | Reset returns to start state                        | component |

---

## 16.4 DoD 3: Decision Log View (Spec Section 5)

### Component Tests -- `guard-decision-log.test.tsx`

| #   | Test                                                                                  | Type      |
| --- | ------------------------------------------------------------------------------------- | --------- |
| 1   | Renders table with 7 columns: #, Timestamp, Port, Subject, Decision, Policy, Duration | component |
| 2   | Rows sorted by timestamp descending (newest first) by default                         | component |
| 3   | Click column header sorts by that column                                              | component |
| 4   | Sort toggle between ascending and descending                                          | component |
| 5   | Active sort column shows arrow indicator                                              | component |
| 6   | Click row opens detail panel                                                          | component |
| 7   | Double-click row navigates to Tree view with that execution                           | component |
| 8   | Allow entries show green "● Allow" badge                                              | component |
| 9   | Deny entries show red "○ Deny" badge                                                  | component |
| 10  | Error entries show amber "◆ Error" badge                                              | component |
| 11  | Detail panel shows Subject section with roles and permissions                         | component |
| 12  | Detail panel shows Evaluation Trace as indented tree                                  | component |
| 13  | Detail panel shows Audit Context with evaluation ID and metadata                      | component |
| 14  | "View in Tree" button navigates to Tree view                                          | component |
| 15  | "Copy as JSON" copies execution object to clipboard                                   | component |
| 16  | Virtual scrolling renders only visible rows + 10 overscan                             | component |
| 17  | New real-time entries slide in at top of log                                          | component |

### Component Tests -- `guard-decision-log-entry.test.tsx`

| #   | Test                                                      | Type      |
| --- | --------------------------------------------------------- | --------- |
| 1   | Entry renders all 7 column values correctly               | component |
| 2   | Subject ID truncated to 12 chars with tooltip for full ID | component |
| 3   | Duration formatted per duration formatting rules          | component |
| 4   | Error entry shows error code instead of duration          | component |

---

## 16.5 DoD 4: Policy Path Explorer View (Spec Section 6)

### Component Tests -- `guard-path-explorer.test.tsx`

| #   | Test                                                           | Type      |
| --- | -------------------------------------------------------------- | --------- |
| 1   | Renders path tree with all computed paths                      | component |
| 2   | Each path shows node sequence with per-node outcomes           | component |
| 3   | Allow paths have green terminal badge                          | component |
| 4   | Deny paths have red terminal badge                             | component |
| 5   | Frequency bars proportional to observed execution count        | component |
| 6   | Unobserved paths show "-- (no data)" frequency                 | component |
| 7   | Coverage section shows path and leaf node coverage percentages | component |
| 8   | Missing paths highlighted in amber                             | component |
| 9   | Click path opens detail panel with frequency and description   | component |
| 10  | Detail panel shows example execution link                      | component |

### Component Tests -- `guard-path-simulator.test.tsx`

| #   | Test                                                           | Type      |
| --- | -------------------------------------------------------------- | --------- |
| 1   | Simulation panel allows editing subject roles                  | component |
| 2   | Simulation panel allows editing subject permissions            | component |
| 3   | Simulation panel allows editing subject attributes             | component |
| 4   | "Evaluate" button runs simulation and shows result             | component |
| 5   | Simulation result highlights the path taken                    | component |
| 6   | Diff mode shows "was deny, now allow" when change flips result | component |
| 7   | "Empty subject" preset clears all roles/permissions            | component |
| 8   | "Recent subject" preset clones from last execution's subject   | component |

**Mutation testing target**: >90%. Path computation logic, frequency calculations, and simulation evaluation dispatch must be caught.

---

## 16.6 DoD 5: Access Flow Statistics View (Spec Section 7)

### Component Tests -- `guard-access-flow-statistics.test.tsx`

| #   | Test                                                                             | Type      |
| --- | -------------------------------------------------------------------------------- | --------- |
| 1   | Renders Sankey diagram with 5 columns: Subjects, Roles, Policies, Ports, Outcome | component |
| 2   | Node heights proportional to flow volume                                         | component |
| 3   | Link widths proportional to flow volume                                          | component |
| 4   | Allow links colored green, deny links colored red                                | component |
| 5   | Hover node highlights connected flows and dims unrelated                         | component |
| 6   | Hover link shows flow detail tooltip                                             | component |
| 7   | Click subject node filters to that subject                                       | component |
| 8   | Click port node navigates to Tree view for that port                             | component |
| 9   | Hotspot panel lists ports with highest deny rates                                | component |
| 10  | Hotspot detection uses 2x global average or 10% threshold                        | component |
| 11  | Minimum flow threshold hides low-volume links                                    | component |
| 12  | Port filter isolates single port's flows                                         | component |
| 13  | Level 0 shows simplified 2-column view (Ports -> Outcomes)                       | component |

---

## 16.7 DoD 6: Evaluation Timeline View (Spec Section 8)

### Component Tests -- `guard-evaluation-timeline.test.tsx`

| #   | Test                                                             | Type      |
| --- | ---------------------------------------------------------------- | --------- |
| 1   | Renders timeline rows for each policy node, indented by depth    | component |
| 2   | Duration bars sized proportionally to node evaluation time       | component |
| 3   | Allow nodes have green bars, deny nodes red, skip nodes no bar   | component |
| 4   | Async operations show nested resolver bar in blue                | component |
| 5   | Timeout operations show red bar at timeout boundary              | component |
| 6   | Summary section shows total, sync, async, and overhead breakdown | component |
| 7   | Critical path highlighted with bold left border                  | component |
| 8   | Bottleneck node flagged when > 50% of total duration             | component |
| 9   | Time scale auto-adjusts to execution duration                    | component |
| 10  | Compare mode renders two timelines with diff indicators          | component |
| 11  | Duration delta shown inline between compared executions          | component |

---

## 16.8 DoD 7: Role Hierarchy Graph View (Spec Section 9)

### Component Tests -- `guard-role-hierarchy-graph.test.tsx`

| #   | Test                                                             | Type      |
| --- | ---------------------------------------------------------------- | --------- |
| 1   | Renders DAG with role nodes at correct layers                    | component |
| 2   | Inheritance edges connect parent to child roles                  | component |
| 3   | Node shows role name, direct permission count, inherited count   | component |
| 4   | Expanded mode shows permission badges inline                     | component |
| 5   | Click node opens detail panel with permission breakdown          | component |
| 6   | Cycle detection highlights circular inheritance in red           | component |
| 7   | Cycle warning banner shown when cycles detected                  | component |
| 8   | Diamond inheritance shows single node with multiple parent edges | component |
| 9   | Search filters roles by name and permission string               | component |
| 10  | Unmatched nodes dimmed at 30% opacity during search              | component |

### Component Tests -- `guard-role-detail.test.tsx`

| #   | Test                                                       | Type      |
| --- | ---------------------------------------------------------- | --------- |
| 1   | Detail panel shows direct permissions section              | component |
| 2   | Detail panel shows inherited permissions with source role  | component |
| 3   | Redundant permissions flagged with "(redundant)" label     | component |
| 4   | Flattened total shows deduplicated count                   | component |
| 5   | Subjects with this role listed (from execution data)       | component |
| 6   | SoD conflicts shown when mutually exclusive roles detected | component |

---

## 16.9 DoD 8: Overview Dashboard (Spec Section 3.7)

### Component Tests -- `guard-overview-dashboard.test.tsx`

| #   | Test                                                                          | Type      |
| --- | ----------------------------------------------------------------------------- | --------- |
| 1   | Renders 4 stat cards: Total Evals, Allow Rate, Guarded Ports, Active Subjects | component |
| 2   | Stat cards show trend indicators (up/down arrows)                             | component |
| 3   | Deny distribution chart shows breakdown by reason                             | component |
| 4   | Allow rate timeline shows sparkline per port                                  | component |
| 5   | Top denials table lists ports with most denials                               | component |
| 6   | Click port stat card navigates to Log filtered to that port                   | component |
| 7   | Click deny reason navigates to Log filtered to deny decisions                 | component |
| 8   | Dashboard works with Level 0 data (no tracing required)                       | component |

---

## 16.10 DoD 9: Educational Features (Spec Section 12)

### Component Tests -- `guard-educational-sidebar.test.tsx`

| #   | Test                                                            | Type      |
| --- | --------------------------------------------------------------- | --------- |
| 1   | Sidebar opens on `[?]` click with 320px width                   | component |
| 2   | Sidebar closes on `[X]` click                                   | component |
| 3   | Glossary tab lists all 10 policy kinds with descriptions        | component |
| 4   | Patterns tab shows RBAC, ABAC, ReBAC, Compound, and other cards | component |
| 5   | Tours tab lists all 7 walkthroughs                              | component |
| 6   | Context-aware glossary scrolls to selected node's kind          | component |
| 7   | Matcher reference table shows all 11 matcher expressions        | component |
| 8   | Error code reference lists all relevant ACL codes               | component |

### Component Tests -- `guard-educational-prompts.test.tsx`

| #   | Test                                                            | Type      |
| --- | --------------------------------------------------------------- | --------- |
| 1   | First deny viewed triggers "Denials trace back to..." prompt    | component |
| 2   | First compound tree triggers "AllOf requires ALL..." prompt     | component |
| 3   | First short-circuit triggers "Gray dashed nodes were..." prompt | component |
| 4   | First async timeline triggers "Blue bars show..." prompt        | component |
| 5   | Prompt auto-dismisses after 10 seconds                          | component |
| 6   | "Got it" marks prompt as seen (won't show again in session)     | component |
| 7   | Maximum 1 prompt visible at a time                              | component |
| 8   | Prompts suppressed after related walkthrough completed          | component |

---

## 16.11 DoD 10: Filter & Search (Spec Section 13)

### Component Tests -- `guard-filter-system.test.tsx`

| #   | Test                                                          | Type      |
| --- | ------------------------------------------------------------- | --------- |
| 1   | Port filter dropdown lists all guarded ports with eval counts | component |
| 2   | Port filter search filters by name with 150ms debounce        | component |
| 3   | Subject filter lists subjects with eval counts and roles      | component |
| 4   | Decision filter toggles between All, Allow, Deny, Error       | component |
| 5   | Policy kind filter groups by category with icons              | component |
| 6   | Time range filter supports preset and custom ranges           | component |
| 7   | Active filter badge shows count of active filters             | component |
| 8   | "Clear All" resets all filters to defaults                    | component |
| 9   | Filters persist across view switches                          | component |
| 10  | Filters saved to and restored from localStorage               | component |
| 11  | Inapplicable filters hidden for current view                  | component |

### Component Tests -- `guard-global-search.test.tsx`

| #   | Test                                                              | Type      |
| --- | ----------------------------------------------------------------- | --------- |
| 1   | Search opens on Ctrl+F                                            | component |
| 2   | Minimum 2 characters to trigger search                            | component |
| 3   | Results grouped by category (Ports, Decisions, Permissions, etc.) | component |
| 4   | Click result navigates to appropriate view                        | component |
| 5   | Search debounced at 200ms                                         | component |
| 6   | Maximum 50 results per category with "show more"                  | component |

---

## 16.12 DoD 11: Cross-View and Cross-Panel Navigation (Spec Section 11)

### Component Tests -- `guard-cross-view-nav.test.tsx`

| #   | Test                                                                | Type      |
| --- | ------------------------------------------------------------------- | --------- |
| 1   | Log double-click navigates to Tree with correct execution           | component |
| 2   | Tree "View Paths" button navigates to Paths with correct descriptor | component |
| 3   | Paths click execution link navigates to Tree with correct execution | component |
| 4   | Sankey double-click port navigates to Tree for that port            | component |
| 5   | Sankey click hotspot navigates to Log filtered to that port         | component |
| 6   | Timeline click node row navigates to Tree with correct node         | component |
| 7   | Overview click port stat navigates to Log filtered to that port     | component |
| 8   | Navigation preserves filter state when applicable                   | component |

### Component Tests -- `guard-cross-panel-nav.test.tsx`

| #   | Test                                                              | Type      |
| --- | ----------------------------------------------------------------- | --------- |
| 1   | Graph Panel guard badge click opens Guard Panel with correct port | component |
| 2   | Guard Panel port name click sends highlight to Graph Panel        | component |
| 3   | Result Panel guard error click opens Guard Panel log view         | component |
| 4   | Guard Panel sends correct GuardPanelNavigation context            | component |

---

## 16.13 DoD 12: Real-Time Updates (Spec Section 11.10)

### Component Tests -- `guard-real-time.test.tsx`

| #   | Test                                                   | Type      |
| --- | ------------------------------------------------------ | --------- |
| 1   | New evaluation events appear in Decision Log           | component |
| 2   | New events batched per animation frame (16ms debounce) | component |
| 3   | Statistics update debounced at 500ms                   | component |
| 4   | Live indicator shows green dot when connected          | component |
| 5   | Live indicator shows red dot when connection lost      | component |
| 6   | Pause/resume toggle stops and starts real-time updates | component |
| 7   | Queued events applied on resume (max 1000)             | component |
| 8   | Auto-scroll follows new entries when scrolled to top   | component |
| 9   | Auto-scroll stops when user scrolls away               | component |

---

## 16.14 DoD 13: Export (Spec Section 14.5)

### Unit Tests -- `guard-export.test.ts`

| #   | Test                                                    | Type |
| --- | ------------------------------------------------------- | ---- |
| 1   | Full snapshot exports as valid JSON                     | unit |
| 2   | Filtered snapshot respects current filter state         | unit |
| 3   | CSV decision log has correct headers and row format     | unit |
| 4   | CSV escapes commas and quotes in reason strings         | unit |
| 5   | JSONL audit trail has one AuditEntry per line           | unit |
| 6   | SVG tree export includes all nodes and edges            | unit |
| 7   | SVG role graph export includes all role nodes and edges | unit |
| 8   | SVG sankey export includes all columns and links        | unit |

---

## 16.15 DoD 14: Keyboard Navigation (Spec Section 11)

### Component Tests -- `guard-keyboard.test.tsx`

| #   | Test                                              | Type      |
| --- | ------------------------------------------------- | --------- |
| 1   | Number keys 1-7 switch between views              | component |
| 2   | `?` toggles educational sidebar                   | component |
| 3   | Escape closes detail panel and sidebar            | component |
| 4   | Ctrl+F focuses search input                       | component |
| 5   | Ctrl+E focuses port selector                      | component |
| 6   | Ctrl+[ and Ctrl+] navigate between executions     | component |
| 7   | Arrow keys navigate tree nodes (tree pattern)     | component |
| 8   | Arrow keys navigate log entries (table pattern)   | component |
| 9   | Arrow keys navigate role graph (tree pattern)     | component |
| 10  | Arrow keys navigate Sankey nodes (column pattern) | component |
| 11  | Enter activates selected element                  | component |
| 12  | Space toggles expand/collapse in tree views       | component |

---

## 16.16 DoD 15: Accessibility (Spec Section 15)

### Component Tests -- `guard-accessibility.test.tsx`

| #   | Test                                                       | Type      |
| --- | ---------------------------------------------------------- | --------- |
| 1   | Panel has role="region" with aria-label                    | component |
| 2   | Toolbar has role="toolbar" with tab buttons                | component |
| 3   | Policy tree has role="tree" with treeitem nodes            | component |
| 4   | Decision log has role="table" with sortable column headers | component |
| 5   | Role graph has role="tree" with treeitem nodes             | component |
| 6   | Sankey has role="img" with text alternative                | component |
| 7   | Decision badges have aria-label (not just color)           | component |
| 8   | Sort direction announced via aria-sort                     | component |
| 9   | New real-time entries announced via aria-live              | component |
| 10  | Cycle detection warning announced via aria-live            | component |
| 11  | Focus indicators visible on all interactive elements       | component |
| 12  | Focus trap works in educational sidebar                    | component |
| 13  | Focus restored when closing detail panel                   | component |
| 14  | prefers-reduced-motion disables all animations             | component |
| 15  | prefers-contrast:more increases border widths              | component |
| 16  | All text meets 4.5:1 contrast ratio                        | component |

---

## 16.17 DoD 16: Edge States (Spec Section 3-9)

### Component Tests -- `guard-edge-states.test.tsx`

| #   | Test                                                             | Type      |
| --- | ---------------------------------------------------------------- | --------- |
| 1   | Empty state shown when no guarded ports detected                 | component |
| 2   | Empty tree message when port selected but no executions          | component |
| 3   | Empty log message when no evaluations recorded                   | component |
| 4   | Loading state shown when data source is pending                  | component |
| 5   | Disconnected state shown when connection lost                    | component |
| 6   | No-tracing state shown when Level 1 features accessed at Level 0 | component |
| 7   | Single leaf policy renders without tree structure                | component |
| 8   | Very deep tree (>10 levels) auto-switches to left-right layout   | component |
| 9   | Very wide tree (>30 leaves) auto-switches to radial layout       | component |
| 10  | Path explosion limit (256 paths) shows truncation message        | component |
| 11  | All paths deny shows warning message                             | component |
| 12  | All paths allow shows info message                               | component |
| 13  | Role graph with no roles shows empty message                     | component |
| 14  | Subject with very long ID truncated in log                       | component |

---

## 16.18 DoD 17: Visual Encoding (Spec Section 10)

### Unit Tests -- `guard-visual-encoding.test.ts`

| #   | Test                                          | Type |
| --- | --------------------------------------------- | ---- |
| 1   | Allow maps to `--hex-guard-allow` color       | unit |
| 2   | Deny maps to `--hex-guard-deny` color         | unit |
| 3   | Error maps to `--hex-guard-error` color       | unit |
| 4   | Skip maps to `--hex-guard-skip` color         | unit |
| 5   | All 10 policy kinds map to correct kind color | unit |
| 6   | Duration < 0.01ms formats as "<0.01ms"        | unit |
| 7   | Duration 0.01-0.99ms formats as "N.NNms"      | unit |
| 8   | Duration 1-999ms formats as "Nms"             | unit |
| 9   | Duration 1-59s formats as "N.Ns"              | unit |
| 10  | Duration >= 60s formats as "Nm Ns"            | unit |

---

## 16.19 DoD 18: Path Analysis (Spec Section 6.3)

### Unit Tests -- `guard-path-analysis.test.ts`

| #   | Test                                                          | Type |
| --- | ------------------------------------------------------------- | ---- |
| 1   | Single leaf policy produces 2 paths (allow, deny)             | unit |
| 2   | AllOf(A, B) produces 3 paths (including short-circuit)        | unit |
| 3   | AnyOf(A, B) produces 3 paths (including short-circuit)        | unit |
| 4   | Not(A) produces 2 paths (inverted)                            | unit |
| 5   | AllOf(A, AnyOf(B, C)) produces correct number of paths        | unit |
| 6   | Path explosion limit caps at 256 paths                        | unit |
| 7   | Frequency calculation matches observed execution distribution | unit |
| 8   | Coverage computation identifies unobserved paths              | unit |
| 9   | Path description auto-generates human-readable summary        | unit |

---

## 16.20 DoD 19: Descriptor Builder (Spec Section 2.2.3)

### Unit Tests -- `guard-descriptor-builder.test.ts`

| #   | Test                                                        | Type |
| --- | ----------------------------------------------------------- | ---- |
| 1   | Single hasPermission policy produces single-node descriptor | unit |
| 2   | AllOf(A, B) produces root with 2 children                   | unit |
| 3   | AnyOf(A, B, C) produces root with 3 children                | unit |
| 4   | Not(A) produces root with 1 child                           | unit |
| 5   | Labeled(A) preserves label in descriptor                    | unit |
| 6   | Nested compound policies produce correct tree depth         | unit |
| 7   | Leaf count computed correctly for complex trees             | unit |
| 8   | Max depth computed correctly for complex trees              | unit |
| 9   | Policy kinds set includes all unique kinds in tree          | unit |
| 10  | HasRelationship/HasAttribute flagged as async-capable       | unit |
| 11  | Node IDs are stable and unique within the tree              | unit |

---

## 16.21 DoD 20: Data Source Contract (Spec Section 14.2)

### Unit Tests -- `guard-data-source.test.ts`

| #   | Test                                                          | Type |
| --- | ------------------------------------------------------------- | ---- |
| 1   | getDescriptors() returns ReadonlyMap of descriptors           | unit |
| 2   | getPortStatistics() returns ReadonlyMap of port stats         | unit |
| 3   | getExecutions(portName) returns executions for that port      | unit |
| 4   | getPaths(descriptorId) returns paths for that descriptor      | unit |
| 5   | getRoleHierarchy() returns serialized role array              | unit |
| 6   | getSnapshot() returns complete panel snapshot                 | unit |
| 7   | subscribe() calls listener on descriptor-registered event     | unit |
| 8   | subscribe() calls listener on execution-added event           | unit |
| 9   | subscribe() calls listener on statistics-updated event        | unit |
| 10  | subscribe() calls listener on connection-lost event           | unit |
| 11  | subscribe() returns unsubscribe function that stops callbacks | unit |

---

## 16.22 Type-Level Tests

### `types/guard-panel-state.test-d.ts`

- `GuardPanelSnapshot` has required readonly properties
- `GuardPortStatistics` has correct numeric fields
- `snapshotTimestamp` is `number`

### `types/guard-evaluation-descriptor.test-d.ts`

- `GuardEvaluationDescriptor` has `rootNode: PolicyNodeDescriptor`
- `PolicyNodeDescriptor` has recursive `children` field
- `PolicyLeafData` is correct discriminated union

### `types/guard-evaluation-execution.test-d.ts`

- `GuardEvaluationExecution` has `rootTrace: EvaluationNodeTrace`
- `EvaluationNodeTrace` has recursive `children` field
- `decision` field is `"allow" | "deny"`

### `types/guard-path-descriptor.test-d.ts`

- `GuardPathDescriptor` has `nodeOutcomes` array
- `finalOutcome` is `"allow" | "deny"`

### `types/guard-navigation.test-d.ts`

- `GuardPanelNavigation` has optional fields
- `GuardViewId` is correct 7-member union

### `types/guard-filter-state.test-d.ts`

- `GuardFilterState` has correct field types
- `timeRange` union includes preset strings and custom object

### `types/guard-data-source.test-d.ts`

- `GuardDataSource` methods return correct types
- `GuardDataEvent` is correct discriminated union

---

## 16.23 Integration Tests

### `integration/guard-data-flow.test.tsx`

| #   | Test                                                   | Type        |
| --- | ------------------------------------------------------ | ----------- |
| 1   | DataSource snapshot renders correct overview dashboard | integration |
| 2   | DataSource execution data renders correct tree view    | integration |
| 3   | DataSource update triggers re-render of affected views | integration |

### `integration/guard-port-to-views.test.tsx`

| #   | Test                                                          | Type        |
| --- | ------------------------------------------------------------- | ----------- |
| 1   | Selecting a port updates Tree, Log, Paths, and Timeline views | integration |
| 2   | Port selection persists across view switches                  | integration |

### `integration/guard-filter-to-render.test.tsx`

| #   | Test                                                   | Type        |
| --- | ------------------------------------------------------ | ----------- |
| 1   | Decision=Deny filter shows only deny entries in log    | integration |
| 2   | Port filter restricts all views to that port's data    | integration |
| 3   | Time range filter restricts log and overview to window | integration |

### `integration/guard-cross-view-context.test.tsx`

| #   | Test                                                       | Type        |
| --- | ---------------------------------------------------------- | ----------- |
| 1   | Navigating from Log to Tree preserves execution context    | integration |
| 2   | Navigating from Paths to Tree preserves descriptor context | integration |
| 3   | Navigating from Sankey to Log preserves port filter        | integration |

### `integration/guard-playground-integration.test.tsx`

| #   | Test                                                        | Type        |
| --- | ----------------------------------------------------------- | ----------- |
| 1   | Playground auto-traces all guard evaluations                | integration |
| 2   | Policy tree updates when playground code changes            | integration |
| 3   | Subject changes in playground sidebar trigger re-evaluation | integration |

### `integration/guard-educational-flow.test.tsx`

| #   | Test                                              | Type        |
| --- | ------------------------------------------------- | ----------- |
| 1   | Walkthrough step highlights correct UI element    | integration |
| 2   | Completing walkthrough suppresses related prompts | integration |

---

## 16.24 Mutation Testing

### Global Target

- **Statement coverage**: > 95%
- **Branch coverage**: > 90%
- **Mutation score**: > 85%

### Critical Mutation Targets

| Component             | Must-Catch Mutations                                       |
| --------------------- | ---------------------------------------------------------- |
| Path analysis         | Path count, short-circuit logic, outcome determination     |
| Descriptor builder    | Tree structure, depth/leaf counting, kind detection        |
| Filter system         | Filter application, combination logic, clear behavior      |
| Visual encoding       | Color mapping, duration formatting, threshold values       |
| Decision badges       | Allow/deny/error/skip mapping                              |
| Hotspot detection     | Threshold logic (2x average, 10%)                          |
| Allow rate thresholds | 95% green, 80% amber boundary values                       |
| Sort logic            | Ascending/descending, column mapping                       |
| Playback              | Evaluation order, short-circuit behavior, speed multiplier |
| Cycle detection       | Cycle identification, warning display                      |

---

## 16.25 Acceptance Criteria Summary

The Guard Panel is complete when:

1. All 16+ test files pass with 0 failures
2. Statement coverage > 95% across all Guard Panel source files
3. Branch coverage > 90% across all Guard Panel source files
4. Mutation testing score > 85% on critical components
5. All 7 type-level test files compile without errors
6. All 6 integration test files pass
7. WCAG 2.1 AA compliance verified for tree, table, and graph views
8. Performance budgets met for all views (see [Section 14.6](14-integration.md))
9. All 7 export formats produce valid output
10. Cross-panel navigation works bidirectionally with Graph, Result, and Container panels

_Previous: [15-accessibility.md](15-accessibility.md)_
