# Definition of Done

_Previous: [Accessibility](10-accessibility.md)_

---

## 18. Definition of Done

This section defines all tests required for the Graph Panel to be considered complete. Each DoD maps to spec section(s) and specifies required unit tests, type-level tests, component tests, integration tests, and mutation testing guidance.

---

### 18.1 Test File Conventions

```
packages/devtools-ui/tests/panels/graph/
  graph-panel.test.tsx                  # Panel wrapper rendering and empty states
  graph-header.test.tsx                 # Container selector, kind badges, metrics
  graph-toolbar.test.tsx                # Toolbar buttons, layout toggle, export dropdown
  graph-canvas.test.tsx                 # SVG rendering, pan/zoom, viewport culling
  graph-node.test.tsx                   # Node shape, color, badges, selection
  graph-edge.test.tsx                   # Edge rendering, styles, highlighting
  graph-minimap.test.tsx                # Minimap rendering and viewport dragging
  graph-tooltip.test.tsx                # Hover tooltip content
  graph-filter-panel.test.tsx           # Filter controls and compound mode
  graph-filter-presets.test.tsx         # Saved presets localStorage persistence
  graph-filter-logic.test.ts           # Pure filter predicate functions (unit)
  graph-analysis-sidebar.test.tsx       # Analysis sidebar sections
  graph-node-detail.test.tsx            # Node detail panel content and actions
  graph-metadata-inspector.test.tsx     # Metadata inspector sections
  graph-container-comparison.test.tsx   # Side-by-side comparison view
  graph-context-menu.test.tsx           # Right-click context menu actions
  graph-layout.test.ts                  # Dagre layout computation (unit)
  graph-layout-cache.test.ts           # Layout memoization and cache key (unit)
  graph-enrichment.test.ts             # Node/edge enrichment from raw data (unit)
  graph-library-detection.test.ts      # Library adapter kind identification (unit)
  graph-export.test.ts                 # DOT, Mermaid, SVG, PNG export (unit)
  graph-keyboard.test.tsx              # Keyboard navigation and shortcuts
  graph-real-time.test.tsx             # Live update animations and subscriptions
  graph-cross-panel.test.tsx           # Cross-panel navigation callbacks
  graph-accessibility.test.tsx         # ARIA roles, screen reader, focus management
  graph-performance.test.tsx           # Viewport culling, debounce, large graph warning
  graph-edge-states.test.tsx           # Empty, loading, disposed, disconnected, single node
  graph-audit-correlation.test.tsx      # Audit trail and correlation ID display
  graph-advanced-traversal.test.tsx     # Path finding, common deps, layers
  graph-container-phase.test.tsx        # Container phase lifecycle display
  types/
    graph-panel-state.test-d.ts        # Type-level GraphPanelState tests
    graph-filter-state.test-d.ts       # Type-level GraphFilterState tests
    graph-enriched-node.test-d.ts      # Type-level EnrichedGraphNode tests
    graph-library-kind.test-d.ts       # Type-level LibraryAdapterKind tests
    graph-navigation.test-d.ts         # Type-level GraphNavigationSelection tests
    graph-analysis-state.test-d.ts     # Type-level GraphAnalysisState tests
    graph-multi-container.test-d.ts    # Type-level MultiContainerGraphState tests
    graph-enriched-edge.test-d.ts      # Type-level EnrichedGraphEdge tests
    graph-metadata-state.test-d.ts     # Type-level MetadataDisplayState + SavedFilterPreset tests
  integration/
    graph-data-flow.test.tsx           # DataSource → enrichment → rendering pipeline
    graph-multi-container.test.tsx     # Container switching and hierarchy traversal
    graph-filter-to-render.test.tsx    # Filter state → node visibility → layout
    graph-analysis-to-graph.test.tsx   # Analysis sidebar → graph node highlighting
    graph-cross-panel-nav.test.tsx     # Navigation to/from other panels with state
    graph-audit-traversal.test.tsx     # Audit trail + traversal + phase integration
```

---

### 18.2 DoD 1: Graph Panel Rendering (Spec Sections 3, 4, 6)

#### Component Tests -- `graph-panel.test.tsx`

| #   | Test                                                                     | Type      |
| --- | ------------------------------------------------------------------------ | --------- |
| 1   | Renders graph SVG with nodes from `dataSource.getGraphData()`            | component |
| 2   | Renders empty state when `getGraphData()` returns `undefined`            | component |
| 3   | Renders empty state with message when graph has zero adapters            | component |
| 4   | Renders loading state when `dataSource` has not yet delivered data       | component |
| 5   | Renders disposed container state with 30% opacity and warning banner     | component |
| 6   | Renders disconnected state with "Disconnected" banner and stale data     | component |
| 7   | Renders single-node graph centered in viewport                           | component |
| 8   | Re-renders when `dataSource.subscribe` listener fires `snapshot-changed` | component |
| 9   | Theme prop applies correct CSS variable values (light and dark)          | component |
| 10  | ErrorBoundary isolates panel crash and shows `PanelErrorFallback`        | component |

#### Component Tests -- `graph-node.test.tsx`

| #   | Test                                                                                                                     | Type      |
| --- | ------------------------------------------------------------------------------------------------------------------------ | --------- |
| 1   | Renders rounded rectangle for `core/generic` adapter kind                                                                | component |
| 2   | Renders circle for `store/atom` adapter kind                                                                             | component |
| 3   | Renders diamond for `store/derived` adapter kind                                                                         | component |
| 4   | Renders diamond with dashed outline for `store/async-derived`                                                            | component |
| 5   | Renders diamond with bidirectional arrow for `store/linked-derived`                                                      | component |
| 6   | Renders rectangle with lightning bolt for `store/effect`                                                                 | component |
| 7   | Renders hexagon for `saga/saga` adapter kind                                                                             | component |
| 8   | Renders hexagon with gear for `saga/saga-management`                                                                     | component |
| 9   | Renders octagon for `flow/flow` adapter kind                                                                             | component |
| 10  | Renders octagon with clock for `flow/activity`                                                                           | component |
| 11  | Renders rounded rectangle with "Q" for `query/query`                                                                     | component |
| 12  | Renders rounded rectangle with "M" for `query/mutation`                                                                  | component |
| 13  | Renders rounded rectangle with "~" for `query/streamed-query`                                                            | component |
| 14  | Renders rounded rectangle with "S" for `store/state`                                                                     | component |
| 15  | Renders rounded rectangle with log icon for Logger adapter kinds                                                         | component |
| 16  | Renders rounded rectangle with trace icon for Tracing adapter kinds                                                      | component |
| 17  | Node fill uses `--hex-lifetime-singleton` (indigo) for singleton                                                         | component |
| 18  | Node fill uses `--hex-lifetime-scoped` (green) for scoped                                                                | component |
| 19  | Node fill uses `--hex-lifetime-transient` (amber) for transient                                                          | component |
| 20  | Node border is solid 1px for `origin: "own"`                                                                             | component |
| 21  | Node border is dashed 2px for `origin: "inherited"`                                                                      | component |
| 22  | Node border is double 2px for `origin: "overridden"`                                                                     | component |
| 23  | Async badge (lightning bolt) renders when `factoryKind === "async"`                                                      | component |
| 24  | Error rate badge renders with percentage when `errorRate > 0.10`                                                         | component |
| 25  | Error rate badge does not render when `errorRate <= 0.10`                                                                | component |
| 26  | Override badge "OVR" renders when `isOverride === true`                                                                  | component |
| 27  | Finalizer badge renders when adapter has finalizer                                                                       | component |
| 28  | Inheritance mode badge "S" renders for `shared` mode                                                                     | component |
| 29  | Inheritance mode badge "F" renders for `forked` mode                                                                     | component |
| 30  | Inheritance mode badge "I" renders for `isolated` mode                                                                   | component |
| 31  | Direction indicator right-arrow renders for `inbound`                                                                    | component |
| 32  | Direction indicator left-arrow renders for `outbound`                                                                    | component |
| 33  | Category color bar renders 3px left stripe with mapped color                                                             | component |
| 34  | Node opacity is 1.0 when resolved                                                                                        | component |
| 35  | Node opacity is 0.5 when unresolved                                                                                      | component |
| 36  | Node opacity is 0.15 when filtered out                                                                                   | component |
| 37  | Selected node has `--hex-accent` stroke 3px                                                                              | component |
| 38  | Multi-selected node has `--hex-accent` stroke 2px dashed                                                                 | component |
| 39  | Hovered node has 20% opacity fill overlay                                                                                | component |
| 40  | Port name truncated to 22 chars with "..." when longer                                                                   | component |
| 41  | Node fill opacity is 0.15 for resolved nodes                                                                             | component |
| 42  | Node fill opacity is 0.08 for unresolved nodes                                                                           | component |
| 43  | Error rate 1-10% shows `--hex-warning` badge (not pulsing)                                                               | component |
| 44  | Error rate 10%+ shows `--hex-error` badge with pulsing animation                                                         | component |
| 45  | Inheritance mode badge "S" uses `--hex-info-muted` background, `--hex-info` text                                         | component |
| 46  | Inheritance mode badge "F" uses `--hex-warning-muted` background, `--hex-warning` text                                   | component |
| 47  | Inheritance mode badge "I" uses `--hex-error-muted` background, `--hex-error` text                                       | component |
| 48  | Category color bar maps each of the 12 categories to its spec-defined color (persistence=indigo, messaging=violet, etc.) | component |
| 49  | Node card dimensions are 200x72                                                                                          | component |
| 50  | Node card line 2 shows library kind and lifetime label (e.g. "store/state · singleton")                                  | component |
| 51  | Node card line 3 shows dependency and dependent counts (e.g. "deps: 3 · dependents: 2")                                  | component |
| 52  | Library accent strip renders 4px left strip with library-specific color for non-core adapters                            | component |
| 53  | Library accent strip uses `#059669` for Store adapters                                                                   | component |
| 54  | Library accent strip uses `#0891B2` for Query adapters                                                                   | component |
| 55  | Library accent strip uses `#BE123C` for Saga adapters                                                                    | component |
| 56  | Library accent strip uses `#4338CA` for Flow adapters                                                                    | component |
| 57  | Library accent strip uses `#475569` for Logger adapters                                                                  | component |
| 58  | Library accent strip uses `#D97706` for Tracing adapters                                                                 | component |
| 59  | Core/generic adapters use category bar instead of library accent strip                                                   | component |
| 60  | Node text uses `--hex-text-primary` (not `--hex-text-inverse`) for WCAG AA contrast                                      | component |
| 61  | Scoped node text is readable on green-tinted background                                                                  | component |
| 62  | Transient node text is readable on amber-tinted background                                                               | component |
| 63  | Port name truncated to 22 chars (increased from 14 for wider card)                                                       | component |

#### Component Tests -- `graph-edge.test.tsx`

| #   | Test                                                                            | Type      |
| --- | ------------------------------------------------------------------------------- | --------- |
| 1   | Renders SVG path with arrow marker for direct dependency                        | component |
| 2   | Selected node's dependency edge uses `--hex-accent` 2px solid                   | component |
| 3   | Transitive dependency edge uses `--hex-accent-muted` 1px, progressively lighter | component |
| 4   | Dependent edge uses `--hex-info` 1.5px dotted                                   | component |
| 5   | Inherited dependency edge uses `--hex-text-muted` 1px dashed                    | component |
| 6   | Edge tooltip shows "SourcePort -> TargetPort" on hover                          | component |

#### Component Tests -- `graph-toolbar.test.tsx`

| #   | Test                                                                                       | Type      |
| --- | ------------------------------------------------------------------------------------------ | --------- |
| 1   | Toolbar renders all control groups: layout toggle, filter, analysis, export, zoom, minimap | component |
| 2   | Layout direction toggle switches between "TB" and "LR" and triggers re-layout              | component |
| 3   | Export dropdown lists all 6 options: DOT, Mermaid, SVG, PNG, JSON, Structured Logs         | component |
| 4   | Selecting each export option triggers the corresponding export function                    | component |
| 5   | "Copy Link" toolbar button copies URL with encoded graph state to clipboard                | component |
| 6   | All toolbar buttons disabled during container loading phase                                | component |

#### Component Tests -- `graph-tooltip.test.tsx`

| #   | Test                                                                      | Type      |
| --- | ------------------------------------------------------------------------- | --------- |
| 1   | Tooltip renders near cursor position on hover trigger                     | component |
| 2   | Tooltip stays within viewport bounds (repositions near edges)             | component |
| 3   | Tooltip hides on mouse leave from trigger element                         | component |
| 4   | Tooltip hides when trigger element is removed from DOM (adapter disposal) | component |

**Mutation testing target**: >85%. Node shape dispatch, lifetime color assignment, badge visibility predicates, origin border style selection, fill opacity values, error rate tier thresholds, inheritance badge color dispatch, opacity calculations, library accent color mapping, card dimension values, library kind label generation, and dependency/dependent count rendering must be caught.

---

### 18.3 DoD 2: Container Switching and Hierarchy (Spec Section 7)

#### Component Tests -- `graph-header.test.tsx`

| #   | Test                                                                                      | Type      |
| --- | ----------------------------------------------------------------------------------------- | --------- |
| 1   | Container selector dropdown lists all available containers                                | component |
| 2   | Each container entry shows kind badge (`[root]`, `[child]`, `[lazy]`)                     | component |
| 3   | Each container entry shows adapter count                                                  | component |
| 4   | Child containers show parent name and override count                                      | component |
| 5   | Selecting a container updates `selectedContainerName` and re-runs layout                  | component |
| 6   | Switching containers resets viewport to fit-all                                           | component |
| 7   | Container kind badge color: root=`--hex-accent`, child=`--hex-info`, lazy=`--hex-warning` | component |
| 8   | Header displays adapter count, inbound count, outbound count                              | component |
| 9   | "Compare" option opens ContainerComparisonView                                            | component |
| 10  | Lazy container entry shows loaded/unloaded status                                         | component |
| 11  | Container selector groups entries: root first, child indented under parent, lazy last     | component |

#### Component Tests -- `graph-container-comparison.test.tsx`

| #   | Test                                                           | Type      |
| --- | -------------------------------------------------------------- | --------- |
| 1   | Comparison view renders two side-by-side graphs                | component |
| 2   | Synchronized zoom: zooming one pane zooms both                 | component |
| 3   | Nodes in both containers aligned horizontally                  | component |
| 4   | Unique nodes highlighted with `--hex-info-muted` background    | component |
| 5   | Overridden nodes connected by horizontal dotted line           | component |
| 6   | Comparison legend shows inherited/overridden/unique visual key | component |

**Mutation testing target**: >85%. Container kind badge color assignment, override count calculation, parent name resolution, and comparison alignment logic must be caught.

---

### 18.4 DoD 3: Interactions (Spec Section 5)

#### Component Tests -- `graph-canvas.test.tsx`

| #   | Test                                                                     | Type      |
| --- | ------------------------------------------------------------------------ | --------- |
| 1   | Single click on node selects it and opens NodeDetailPanel                | component |
| 2   | Shift+Click on node toggles it in multi-selection set                    | component |
| 3   | Click on background clears all selections and closes NodeDetailPanel     | component |
| 4   | Click on edge selects both source and target nodes                       | component |
| 5   | Selected node dims non-connected nodes to 40% opacity                    | component |
| 6   | Multi-selected nodes highlight all connecting edges                      | component |
| 7   | Zoom in button increases zoom by 0.25                                    | component |
| 8   | Zoom out button decreases zoom by 0.25                                   | component |
| 9   | Zoom clamped to 0.1-3.0 range                                            | component |
| 10  | Fit button centers and scales to show all visible nodes with 20px margin | component |
| 11  | Double-click on background resets zoom=1, panX=0, panY=0                 | component |
| 12  | Mouse wheel zooms with center at cursor position                         | component |
| 13  | Click+drag on background pans the viewport                               | component |
| 14  | Click+hold (200ms)+drag on node repositions it                           | component |
| 15  | Dragged node's connected edges re-route to follow                        | component |
| 16  | Layout engine does not re-run during node drag                           | component |

#### Component Tests -- `graph-context-menu.test.tsx`

| #   | Test                                                                | Type      |
| --- | ------------------------------------------------------------------- | --------- |
| 1   | Right-click on node opens context menu with all 10 options          | component |
| 2   | "Highlight Dependency Chain" highlights all transitive dependencies | component |
| 3   | "Highlight Dependents" highlights all transitive dependents         | component |
| 4   | "Highlight Blast Radius" highlights dependencies + dependents union | component |
| 5   | Blast radius shows count badge "Blast radius: N nodes"              | component |
| 6   | Click background exits blast radius mode                            | component |
| 7   | "View Metadata" opens MetadataInspectorPanel                        | component |
| 8   | "Go to Container Panel" fires `navigateTo("container", ...)`        | component |
| 9   | "Go to Tracing" fires `navigateTo("tracing", ...)`                  | component |
| 10  | "Copy Port Name" copies to clipboard                                | component |
| 11  | "Export Subgraph" exports selected node + transitive deps as DOT    | component |
| 12  | Blast radius mode dims non-blast-radius nodes to 20% opacity        | component |

**Mutation testing target**: >85%. Selection state toggling, zoom clamping, viewport reset values, drag threshold (200ms), blast radius computation, blast radius opacity value, and context menu action dispatch must be caught.

---

### 18.5 DoD 4: Keyboard Navigation (Spec Section 5.8)

#### Component Tests -- `graph-keyboard.test.tsx`

| #   | Test                                                            | Type      |
| --- | --------------------------------------------------------------- | --------- |
| 1   | Tab cycles focus between nodes in layout order                  | component |
| 2   | Enter selects focused node and opens detail panel               | component |
| 3   | Shift+Enter toggles focused node in multi-selection             | component |
| 4   | Escape deselects all and closes detail/analysis/metadata panels | component |
| 5   | ArrowUp moves focus to nearest node above                       | component |
| 6   | ArrowDown moves focus to nearest node below                     | component |
| 7   | ArrowLeft moves focus to nearest node left                      | component |
| 8   | ArrowRight moves focus to nearest node right                    | component |
| 9   | `+` key zooms in                                                | component |
| 10  | `-` key zooms out                                               | component |
| 11  | `0` key fits to view                                            | component |
| 12  | `/` key opens filter panel and focuses search input             | component |
| 13  | `a` key toggles analysis sidebar                                | component |
| 14  | `m` key toggles minimap                                         | component |

**Mutation testing target**: >90%. Key-to-action mapping is a lookup table; any mutation silently binds the wrong shortcut.

---

### 18.6 DoD 5: Filter System (Spec Section 9)

#### Unit Tests -- `graph-filter-logic.test.ts`

| #   | Test                                                                     | Type |
| --- | ------------------------------------------------------------------------ | ---- |
| 1   | Text search matches case-insensitive substring on port name              | unit |
| 2   | Text search returns all nodes when search string is empty                | unit |
| 3   | Lifetime filter matches nodes with selected lifetimes (OR within group)  | unit |
| 4   | Lifetime filter returns all when set is empty                            | unit |
| 5   | Origin filter matches nodes with selected origins (OR within group)      | unit |
| 6   | Direction filter returns only inbound nodes when set to `"inbound"`      | unit |
| 7   | Direction filter returns only outbound nodes when set to `"outbound"`    | unit |
| 8   | Direction filter returns all when set to `"all"`                         | unit |
| 9   | Library kind filter matches nodes with selected library kinds            | unit |
| 10  | Category filter matches by prefix (e.g., "pers" matches "persistence")   | unit |
| 11  | Tag filter matches nodes with at least one matching tag (any-match)      | unit |
| 12  | Error rate threshold filters out nodes below threshold                   | unit |
| 13  | Error rate threshold treats nodes with no error data as 0%               | unit |
| 14  | Inheritance mode filter matches inherited nodes by mode                  | unit |
| 15  | Inheritance mode filter is no-op for `origin: "own"` nodes               | unit |
| 16  | Resolution status `"resolved"` shows only resolved nodes                 | unit |
| 17  | Resolution status `"unresolved"` shows only unresolved nodes             | unit |
| 18  | AND compound mode requires all active criteria to match                  | unit |
| 19  | OR compound mode allows any active criterion to match                    | unit |
| 20  | Multiple criteria combined in AND: lifetime=singleton + origin=inherited | unit |
| 21  | Multiple criteria combined in OR: lifetime=singleton OR origin=inherited | unit |
| 22  | Empty filter state (all defaults) matches all nodes                      | unit |

#### Component Tests -- `graph-filter-panel.test.tsx`

| #   | Test                                                                       | Type      |
| --- | -------------------------------------------------------------------------- | --------- |
| 1   | Filter panel renders all filter groups (lifetime, origin, direction, etc.) | component |
| 2   | Typing in search input updates filter with 150ms debounce                  | component |
| 3   | Checking lifetime checkbox updates graph immediately (no debounce)         | component |
| 4   | Checking origin checkbox updates graph immediately                         | component |
| 5   | Selecting direction radio updates graph immediately                        | component |
| 6   | Library kind checkboxes grouped by library name                            | component |
| 7   | Category input provides autocomplete from current graph categories         | component |
| 8   | Tag input renders chips for each active tag                                | component |
| 9   | Tag input adds tag on Enter                                                | component |
| 10  | Error rate input accepts 0.0-1.0 range                                     | component |
| 11  | Inheritance mode checkboxes disabled when viewing root container           | component |
| 12  | "Clear All" resets all filters to defaults                                 | component |
| 13  | "Clear" per-section resets only that section                               | component |
| 14  | Filter badge in toolbar shows count of active filter criteria              | component |
| 15  | Footer shows "Showing N of M adapters" with correct counts                 | component |
| 16  | Compound mode toggle switches between AND and OR                           | component |

#### Component Tests -- `graph-filter-presets.test.tsx`

| #   | Test                                                                                      | Type      |
| --- | ----------------------------------------------------------------------------------------- | --------- |
| 1   | "Save Current" persists current filter to localStorage under `hex-devtools-graph-presets` | component |
| 2   | "Load Preset" dropdown lists all saved presets                                            | component |
| 3   | Selecting a preset applies all its filter criteria                                        | component |
| 4   | Right-click on preset offers delete option                                                | component |
| 5   | Deleting a preset removes it from localStorage                                            | component |
| 6   | Preset survives page reload (read from localStorage on mount)                             | component |

**Mutation testing target**: >95%. Filter predicates are pure boolean logic; any mutation inverts the filter behavior. Debounce timing, compound mode logic, and localStorage key must be caught.

---

### 18.7 DoD 6: Node Detail and Metadata (Spec Sections 3.3, 3.4, 8)

#### Component Tests -- `graph-node-detail.test.tsx`

| #   | Test                                                                                  | Type      |
| --- | ------------------------------------------------------------------------------------- | --------- |
| 1   | Detail panel renders port name, lifetime, factory kind, origin                        | component |
| 2   | Detail panel renders inheritance mode when present                                    | component |
| 3   | Detail panel renders direction and category                                           | component |
| 4   | Detail panel renders library kind label                                               | component |
| 5   | Detail panel renders error rate with percentage                                       | component |
| 6   | Detail panel renders "Last error" with code and relative time                         | component |
| 7   | Detail panel lists direct dependencies with their lifetimes                           | component |
| 8   | Detail panel lists direct dependents with their origins                               | component |
| 9   | Detail panel shows transitive chain depth                                             | component |
| 10  | Detail panel renders tags as inline badge chips                                       | component |
| 11  | "View Full Metadata" button opens MetadataInspectorPanel                              | component |
| 12  | "Navigate to Container Panel" button fires navigation callback                        | component |
| 13  | "Highlight Chain" button highlights transitive dependencies                           | component |
| 14  | Close button closes the detail panel                                                  | component |
| 15  | Override chain section appears for overridden nodes                                   | component |
| 16  | Override chain lists original adapter and overriding adapter                          | component |
| 17  | Override chain shows full multi-level chain (grandchild → child → parent)             | component |
| 18  | Detail panel shows "(disposed)" next to container name for disposed containers        | component |
| 19  | Clicking port name text in detail panel fires `navigateTo("container", { portName })` | component |
| 20  | Dependencies list shows inheritance mode badge for inherited dependencies             | component |

#### Component Tests -- `graph-metadata-inspector.test.tsx`

| #   | Test                                                                                        | Type      |
| --- | ------------------------------------------------------------------------------------------- | --------- |
| 1   | Port metadata section shows description, direction, category, tags                          | component |
| 12  | Direction field uses `--hex-success` color for inbound and `--hex-info` color for outbound  | component |
| 2   | Adapter metadata section shows lifetime, factory kind, origin, inheritance mode, isOverride | component |
| 3   | Custom metadata section renders JSON tree viewer                                            | component |
| 4   | Custom metadata JSON tree expands and collapses nodes                                       | component |
| 5   | Library metadata section shows Flow adapter transition map                                  | component |
| 6   | Library metadata section shows Saga adapter step definitions                                | component |
| 7   | Library metadata section shows Store adapter action names                                   | component |
| 8   | Library metadata section shows Query adapter cache configuration                            | component |
| 9   | Library metadata section shows "(none)" for core/generic                                    | component |
| 10  | Each section is independently collapsible                                                   | component |
| 11  | Close button closes the metadata inspector                                                  | component |

**Mutation testing target**: >85%. Property rendering (label-value pairs), override chain traversal, JSON tree expansion state, and library kind dispatch for metadata display must be caught.

---

### 18.8 DoD 7: Analysis Sidebar (Spec Section 10)

#### Component Tests -- `graph-analysis-sidebar.test.tsx`

| #   | Test                                                                                          | Type      |
| --- | --------------------------------------------------------------------------------------------- | --------- |
| 1   | Complexity gauge renders score value and horizontal bar                                       | component |
| 2   | Gauge green zone for score 0-50                                                               | component |
| 3   | Gauge amber zone for score 51-100                                                             | component |
| 4   | Gauge red zone for score 101+                                                                 | component |
| 5   | Recommendation badge: `[safe]` green, `[monitor]` amber, `[consider-splitting]` red           | component |
| 6   | Breakdown row shows adapter count, max chain depth, average fan-out                           | component |
| 7   | Suggestions list renders one card per `GraphSuggestion`                                       | component |
| 8   | Suggestion card shows type badge with color (`missing_adapter`=red, `orphan_port`=gray, etc.) | component |
| 9   | Clicking suggestion port name selects node and pans graph to center on it                     | component |
| 10  | Captive dependency list shows all pairs with "captures" relationship                          | component |
| 11  | Both port names in captive pair are clickable                                                 | component |
| 12  | Orphan ports list renders as collapsible section with clickable port names                    | component |
| 13  | Disposal warnings render as text blocks mentioning port names as links                        | component |
| 14  | Unnecessary lazy ports list renders as collapsible section                                    | component |
| 15  | Direction summary shows inbound and outbound counts                                           | component |
| 16  | Completeness card shows `[Complete]` when `isComplete === true`                               | component |
| 17  | Completeness card shows unsatisfied requirements list when `isComplete === false`             | component |
| 18  | Chain analysis section appears when a node is selected + sidebar open                         | component |
| 19  | Chain analysis shows transitive dependency chain to leaf nodes                                | component |
| 20  | Chain analysis shows transitive dependent chain                                               | component |
| 21  | Toggle button opens/closes the sidebar                                                        | component |
| 22  | Suggestion card renders `action` line in `--hex-text-secondary`                               | component |
| 23  | Chain analysis displays longest chain depth value                                             | component |

**Mutation testing target**: >85%. Gauge zone thresholds (50, 100), recommendation badge selection, suggestion type-to-color mapping, suggestion action line rendering, chain analysis depth display, captive pair rendering, and completeness boolean must be caught.

---

### 18.9 DoD 8: Cross-Panel Navigation (Spec Section 12)

#### Component Tests -- `graph-cross-panel.test.tsx`

| #   | Test                                                                      | Type      |
| --- | ------------------------------------------------------------------------- | --------- |
| 1   | "Go to Container Panel" fires `navigateTo("container", { portName })`     | component |
| 2   | "Go to Tracing" fires `navigateTo("tracing", { portName })`               | component |
| 3   | Click scopeId fires `navigateTo("scope-tree", { scopeId })`               | component |
| 4   | Click store library badge fires `navigateTo("store", { portName })`       | component |
| 5   | Click query library badge fires `navigateTo("query", { portName })`       | component |
| 6   | Click saga library badge fires `navigateTo("saga", { portName })`         | component |
| 7   | Click flow library badge fires `navigateTo("flow", { portName })`         | component |
| 8   | Inbound navigation with `portName` selects node and centers viewport      | component |
| 9   | Inbound navigation with `containerName` switches container selector       | component |
| 10  | Inbound navigation with `highlightChain: true` highlights transitive deps | component |
| 11  | Navigation without matching `portName` shows "Node not found" toast       | component |

**Mutation testing target**: >90%. Panel name strings in navigation calls and selection parameter passing must be caught; any mutation routes to the wrong panel.

---

### 18.10 DoD 9: Real-Time Updates (Spec Section 11)

#### Component Tests -- `graph-real-time.test.tsx`

| #   | Test                                                                        | Type      |
| --- | --------------------------------------------------------------------------- | --------- |
| 1   | New adapter in `getGraphData()` triggers layout re-computation              | component |
| 2   | New node animates into position over 300ms                                  | component |
| 3   | Removed adapter fades out over 300ms then removed from DOM                  | component |
| 4   | Connected edges fade out with removed adapter                               | component |
| 5   | Resolution status change transitions node opacity 0.5 → 1.0 over 200ms      | component |
| 6   | Error rate crossing 10% threshold shows warning badge                       | component |
| 7   | Error rate dropping below 10% hides warning badge                           | component |
| 8   | New container appearing updates the container selector dropdown             | component |
| 9   | New container triggers highlight animation on dropdown                      | component |
| 10  | `prefers-reduced-motion` disables all transitions (0ms duration)            | component |
| 11  | With reduced motion, flash highlights replaced by 2s border highlights      | component |
| 12  | Layout re-runs after adapter removal completes (remaining nodes reposition) | component |

**Mutation testing target**: >80%. Animation durations, removal-triggered re-layout, and the `prefers-reduced-motion` check are the key mutation targets. Lower target reflects the difficulty of asserting animation timing precisely.

---

### 18.11 DoD 10: Export (Spec Section 13)

#### Unit Tests -- `graph-export.test.ts`

| #   | Test                                                                                                                         | Type |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `exportDot()` produces valid DOT format string                                                                               | unit |
| 2   | DOT output includes nodes labeled with port name and lifetime                                                                | unit |
| 3   | DOT output includes directed edges for dependencies                                                                          | unit |
| 4   | DOT output includes subgraph clusters grouped by category                                                                    | unit |
| 5   | `exportMermaid()` produces valid Mermaid flowchart string                                                                    | unit |
| 6   | Mermaid output includes nodes and dependency edges                                                                           | unit |
| 7   | `exportSvg()` serializes current SVG from DOM                                                                                | unit |
| 8   | SVG output includes applied inline styles                                                                                    | unit |
| 9   | `exportPng()` renders SVG to canvas and returns data URL                                                                     | unit |
| 10  | PNG filename follows pattern `hex-graph-{containerName}-{timestamp}.png`                                                     | unit |
| 11  | URL state encodes `graph-container`, `graph-node`, `graph-filter` params                                                     | unit |
| 12  | URL state decodes back to correct selection and filter state                                                                 | unit |
| 13  | "Copy Link" copies URL with encoded state to clipboard                                                                       | unit |
| 14  | Subgraph export includes only selected node and transitive deps                                                              | unit |
| 15  | `exportInspectionJson()` produces valid JSON with `version: 1` field                                                         | unit |
| 16  | JSON export includes adapter count, dependency map, suggestions, complexity, ports, direction summary, correlation ID, actor | unit |
| 17  | JSON export filename follows `hex-inspection-{containerName}-{timestamp}.json`                                               | unit |
| 18  | `exportStructuredLogs()` produces JSON array with severity, message, and structured fields per entry                         | unit |
| 19  | Structured log export filename follows `hex-logs-{containerName}-{timestamp}.json`                                           | unit |
| 20  | DOT output includes visual markers for overridden nodes and orphan ports                                                     | unit |
| 21  | SVG export filename follows `hex-graph-{containerName}-{timestamp}.svg`                                                      | unit |

**Mutation testing target**: >90%. Export format integrity is critical; mutations to DOT syntax, Mermaid keywords, override/orphan markers, filename patterns, or URL parameter names silently corrupt output.

---

### 18.12 DoD 11: Layout Engine (Spec Sections 14.1-14.2)

#### Unit Tests -- `graph-layout.test.ts`

| #   | Test                                                                        | Type |
| --- | --------------------------------------------------------------------------- | ---- |
| 1   | `computeGraphLayout()` positions all nodes with valid x, y, width, height   | unit |
| 2   | Layout assigns correct `rankdir` from `layoutDirection` prop ("TB" or "LR") | unit |
| 3   | Layout uses `nodesep: 40`, `ranksep: 60`, `marginx: 20`, `marginy: 20`      | unit |
| 4   | Layout edges include points array with valid coordinates                    | unit |
| 5   | Layout returns total width and height of computed graph                     | unit |
| 6   | Empty graph (0 adapters) returns empty nodes/edges with 0 dimensions        | unit |
| 7   | Single node graph positions node at margin offset                           | unit |
| 8   | Dependency edges go from provider (source) to consumer (target)             | unit |

#### Unit Tests -- `graph-layout-cache.test.ts`

| #   | Test                                                         | Type |
| --- | ------------------------------------------------------------ | ---- |
| 1   | Same graph data returns cached layout (referential equality) | unit |
| 2   | Different adapter count invalidates cache                    | unit |
| 3   | Different port names hash invalidates cache                  | unit |
| 4   | Different layout direction invalidates cache                 | unit |
| 5   | Same adapters in different order produces same cache key     | unit |

#### Unit Tests -- `graph-enrichment.test.ts`

| #   | Test                                                                | Type |
| --- | ------------------------------------------------------------------- | ---- |
| 1   | `enrichNode()` merges adapter data with layout position             | unit |
| 2   | `enrichNode()` sets `isResolved` from inspector `isResolved()`      | unit |
| 3   | `enrichNode()` sets `errorRate` from `ResultStatistics`             | unit |
| 4   | `enrichNode()` sets `hasHighErrorRate` when `errorRate > 0.10`      | unit |
| 5   | `enrichNode()` sets `direction` from `PortInfo`                     | unit |
| 6   | `enrichNode()` sets `category` and `tags` from `PortInfo`           | unit |
| 7   | `enrichNode()` sets `dependentCount` from reverse dependency map    | unit |
| 8   | `enrichNode()` sets `matchesFilter` from filter predicate           | unit |
| 9   | `enrichEdge()` sets `isHighlighted` when connected to selected node | unit |
| 10  | `enrichEdge()` sets `transitiveDepth` relative to selected node     | unit |
| 11  | `enrichEdge()` sets `isInherited` from source adapter origin        | unit |
| 12  | `enrichNode()` sets `totalCalls` from `ResultStatistics`            | unit |
| 13  | `enrichNode()` sets `okCount` from `ResultStatistics`               | unit |
| 14  | `enrichNode()` sets `errCount` from `ResultStatistics`              | unit |
| 15  | `enrichNode()` sets `errorsByCode` from `ResultStatistics`          | unit |
| 16  | `enrichEdge()` sets `isOverridden` from source adapter isOverride   | unit |

#### Unit Tests -- `graph-library-detection.test.ts`

| #   | Test                                                              | Type |
| --- | ----------------------------------------------------------------- | ---- |
| 1   | Detects `store/state` from adapter metadata brand symbol          | unit |
| 2   | Detects `store/atom` from adapter metadata                        | unit |
| 3   | Detects `store/derived` from adapter metadata                     | unit |
| 4   | Detects `store/async-derived` from adapter metadata               | unit |
| 5   | Detects `store/linked-derived` from adapter metadata              | unit |
| 6   | Detects `store/effect` from adapter metadata                      | unit |
| 7   | Detects `query/query` from port symbol                            | unit |
| 8   | Detects `query/mutation` from port symbol                         | unit |
| 9   | Detects `query/streamed-query` from port symbol                   | unit |
| 10  | Detects `saga/saga` from port symbol                              | unit |
| 11  | Detects `saga/saga-management` from port symbol                   | unit |
| 12  | Detects `flow/flow` from adapter metadata `machineId`             | unit |
| 13  | Detects `flow/activity` from adapter metadata `activityPortNames` | unit |
| 14  | Returns `core/generic` when no library markers detected           | unit |
| 15  | Returns `undefined` when adapter has no metadata at all           | unit |
| 16  | Detects `logger/console` from adapter metadata                    | unit |
| 17  | Detects `logger/scoped` from adapter metadata                     | unit |
| 18  | Detects `tracing/memory` from adapter metadata                    | unit |
| 19  | Detects `tracing/console` from adapter metadata                   | unit |
| 20  | Detects `logger/memory` from adapter metadata                     | unit |
| 21  | Detects `logger/noop` from adapter metadata                       | unit |
| 22  | Detects `tracing/noop` from adapter metadata                      | unit |

**Mutation testing target**: >95%. Layout parameters, cache key computation, enrichment field assignments, and library detection dispatch are all pure logic with no visual ambiguity.

---

### 18.13 DoD 12: Performance (Spec Section 14)

#### Component Tests -- `graph-performance.test.tsx`

| #   | Test                                                                                                | Type      |
| --- | --------------------------------------------------------------------------------------------------- | --------- |
| 1   | Graph with 100 nodes renders with viewport culling (fewer SVG DOM nodes than total)                 | component |
| 2   | Nodes outside viewport + 200px margin are not in the DOM                                            | component |
| 3   | Scrolling/panning adds previously culled nodes and removes newly offscreen nodes                    | component |
| 4   | Filter text input debounces: no re-render within 150ms of typing                                    | component |
| 15  | Filter category input debounces: no re-render within 150ms of typing                                | component |
| 16  | Filter tag input debounces: no re-render within 150ms of adding a tag                               | component |
| 5   | Checkbox/radio filter changes apply immediately (no debounce)                                       | component |
| 6   | Layout computation for 50 nodes completes within 100ms                                              | component |
| 7   | Graph with 200+ nodes shows large graph warning banner                                              | component |
| 8   | Warning banner includes one-click "filter high-error ports" action                                  | component |
| 9   | Minimap auto-shown when adapter count > 100                                                         | component |
| 10  | Detail panel lists >50 dependencies use virtual scrolling (fewer DOM nodes than list length)        | component |
| 11  | Layout computation offloaded to Web Worker when adapter count > 100                                 | component |
| 12  | MetadataInspectorPanel lists >50 entries use virtual scrolling (fewer DOM nodes than list length)   | component |
| 13  | AnalysisSidebar suggestion list >50 items uses virtual scrolling (fewer DOM nodes than list length) | component |
| 14  | "Computing layout..." indicator shown while Web Worker computes layout                              | component |

**Mutation testing target**: >80%. Viewport culling threshold (50 nodes), debounce timing (150ms), large graph warning threshold (200 nodes), virtual scroll threshold (50 items), and Web Worker threshold (100 adapters) must be caught.

---

### 18.14 DoD 13: Accessibility (Spec Section 16)

#### Component Tests -- `graph-accessibility.test.tsx`

| #   | Test                                                                                       | Type      |
| --- | ------------------------------------------------------------------------------------------ | --------- |
| 1   | Graph SVG has `role="img"` with `aria-label="Dependency graph for {containerName}"`        | component |
| 2   | Each node group has `role="button"` with `aria-label="{portName}, {lifetime}, {origin}"`   | component |
| 3   | NodeDetailPanel has `role="complementary"` with `aria-label="Node details for {portName}"` | component |
| 4   | AnalysisSidebar has `role="complementary"` with `aria-label="Graph analysis"`              | component |
| 5   | Container selector has `role="listbox"` with `role="option"` per entry                     | component |
| 6   | Filter checkboxes use `role="checkbox"` with `aria-checked`                                | component |
| 7   | Filter radio groups use `role="radiogroup"` with `role="radio"`                            | component |
| 8   | All nodes are focusable via Tab (`tabindex="0"`)                                           | component |
| 9   | Screen reader announces on node selection: "Selected {portName}, {lifetime} {origin}..."   | component |
| 10  | Screen reader announces on filter: "Filter applied. Showing {N} of {M} adapters."          | component |
| 11  | Screen reader announces on container switch: "Switched to container {name}..."             | component |
| 12  | Screen reader announces on analysis open: "Graph analysis: complexity score {N}..."        | component |
| 13  | Focus moves to NodeDetailPanel first interactive element on node select                    | component |
| 14  | Escape returns focus to previously focused graph node                                      | component |
| 15  | Opening filter panel moves focus to search input                                           | component |
| 16  | Closing sidebar returns focus to toolbar button that opened it                             | component |
| 17  | Color is not sole indicator for lifetime (color + label text)                              | component |
| 18  | Color is not sole indicator for origin (border style + label text)                         | component |
| 19  | Color is not sole indicator for library kind (shape + icon/letter badge)                   | component |
| 20  | Color is not sole indicator for error rate (badge with numeric percentage)                 | component |
| 21  | Color is not sole indicator for inheritance mode (badge letter + label text)               | component |
| 22  | Color is not sole indicator for direction (arrow icon + label text)                        | component |
| 23  | Tab order flows: graph nodes → toolbar → filter panel → sidebars                           | component |

**Mutation testing target**: >90%. ARIA attribute strings, focus management targets, tab order sequence, and screen reader announcement templates must be caught.

---

### 18.15 DoD 14: Edge States (Spec Section 17)

#### Component Tests -- `graph-edge-states.test.tsx`

| #   | Test                                                                                    | Type      |
| --- | --------------------------------------------------------------------------------------- | --------- |
| 1   | Empty graph (no adapters): centered message "No adapters registered"                    | component |
| 2   | Loading state: "Loading graph data..." with spinner                                     | component |
| 3   | Disposed container: graph at 30% opacity + warning banner with container name           | component |
| 4   | Disconnected data source: stale graph + "Disconnected" banner + pulsing red dot         | component |
| 5   | All interactive features work on stale (disconnected) data                              | component |
| 6   | Large graph (100+): viewport culling + minimap auto-shown                               | component |
| 7   | Large graph (200+): warning banner with filter action                                   | component |
| 8   | All nodes filtered out: "No adapters match the current filter" + [Clear Filters] button | component |
| 9   | "Clear Filters" button resets filter and shows all nodes                                | component |
| 10  | Single node graph: centered, no edges, Fit button no-op                                 | component |
| 11  | Single node analysis: complexity near 0, no suggestions                                 | component |
| 12  | Reconnection after disconnect: graph updates to latest data, banner removed             | component |
| 13  | Large graph (200+): filter panel suggests applying filter to reduce visible nodes       | component |

**Mutation testing target**: >85%. Edge state detection predicates (isDisposed, isDisconnected, adapterCount thresholds) and fallback UI rendering must be caught.

---

### 18.16 DoD 15: Minimap (Spec Section 3.8)

#### Component Tests -- `graph-minimap.test.tsx`

| #   | Test                                                        | Type      |
| --- | ----------------------------------------------------------- | --------- |
| 1   | Minimap renders in bottom-left corner as overlay            | component |
| 2   | All nodes rendered as dots, edges as thin lines             | component |
| 3   | Viewport rectangle renders as semi-transparent rectangle    | component |
| 4   | Viewport rectangle position matches current pan/zoom        | component |
| 5   | Clicking minimap pans the main graph to clicked position    | component |
| 6   | Dragging viewport rectangle pans the main graph             | component |
| 7   | Minimap toggle button shows/hides the minimap               | component |
| 8   | Minimap respects current filter (filtered-out nodes dimmed) | component |

**Mutation testing target**: >80%.

---

### 18.17 DoD 16: Audit Trail and Correlation (Spec Sections 8.5, 8.6)

#### Component Tests -- `graph-audit-correlation.test.tsx`

| #   | Test                                                                | Type      |
| --- | ------------------------------------------------------------------- | --------- |
| 1   | Result statistics section shows totalCalls, okCount, errCount       | component |
| 2   | Error rate displays with `--hex-error` color when above 10%         | component |
| 3   | Errors by code table renders sorted by count descending             | component |
| 4   | Errors by code table is collapsible                                 | component |
| 5   | Last error shows code and relative timestamp                        | component |
| 6   | Result statistics section hidden when no ResultStatistics available | component |
| 7   | Audit trail section shows actor type badge and ID                   | component |
| 8   | Audit trail section shows actor name when present                   | component |
| 9   | Correlation ID displayed in monospace with Copy button              | component |
| 10  | Copy button copies correlation ID to clipboard                      | component |
| 11  | Audit trail section hidden when actor is undefined                  | component |

**Mutation testing target**: >85%. Actor type badge dispatch, error threshold coloring, and correlation ID copy target must be caught.

---

### 18.18 DoD 17: Advanced Traversal (Spec Sections 5.10, 10.10)

#### Component Tests -- `graph-advanced-traversal.test.tsx`

| #   | Test                                                                      | Type      |
| --- | ------------------------------------------------------------------------- | --------- |
| 1   | "Find Path To..." opens port search and highlights shortest path          | component |
| 2   | Path highlight shows intermediate nodes with `--hex-accent` stroke        | component |
| 3   | "Find Path To..." shows "No path found" when ports are disconnected       | component |
| 4   | "Show Common Dependencies" available only in multi-selection context menu | component |
| 5   | Common dependencies highlighted with `--hex-accent-muted` fill            | component |
| 6   | Count badge shows "N common dependencies"                                 | component |
| 7   | Initialization order section lists ports in topological order             | component |
| 8   | Layer badges show correct layer numbers from `computeDependencyLayers()`  | component |
| 9   | Clicking port name in initialization order selects and centers node       | component |
| 10  | Cycle detected: section shows error message instead of list               | component |
| 11  | Tag filter "all" mode requires every tag to match                         | component |
| 12  | Tag filter mode toggle switches between "any" and "all"                   | component |
| 13  | "Show Common Dependencies" dims non-common nodes to 40% opacity           | component |

**Mutation testing target**: >85%. Path-finding result handling, common dependency set computation, common deps opacity value, layer number assignment, and tag mode toggle must be caught.

---

### 18.19 DoD 18: Container Phase and Depth States (Spec Sections 7.6, 10.9, 17.8-17.10)

#### Component Tests -- `graph-container-phase.test.tsx`

| #   | Test                                                                                               | Type      |
| --- | -------------------------------------------------------------------------------------------------- | --------- |
| 1   | Container selector shows "(loading...)" badge for loading phase                                    | component |
| 2   | Container selector shows "(disposing...)" badge for disposing phase                                | component |
| 3   | Container selector shows "(not loaded)" for unloaded lazy container                                | component |
| 4   | Container selector shows "(uninitialized)" badge for uninitialized phase                           | component |
| 5   | No badge shown for initialized/loaded/active phases                                                | component |
| 6   | Scope container kind shows `[scope]` badge with muted color                                        | component |
| 7   | Loading container shows skeleton layout with placeholder nodes at 20% opacity and disabled toolbar | component |
| 8   | Disposing container shows warning banner and disables interactions                                 | component |
| 9   | Depth warning banner appears when `depthWarning` is present                                        | component |
| 10  | Depth limit exceeded banner uses `--hex-error` background                                          | component |
| 11  | Depth limit exceeded banner text warns about incomplete cycle detection                            | component |
| 12  | Container selector shows "(disposed)" badge with `--hex-error` for disposed phase                  | component |
| 13  | Loading container shows centered "Loading container '{name}'..." message with spinner              | component |

**Mutation testing target**: >85%. Phase-to-badge mapping (including disposed), phase-to-interaction-disabled logic, loading message text, and depth warning severity threshold must be caught.

---

### 18.20 Type-Level Tests

#### `graph-panel-state.test-d.ts`

```typescript
import { expectTypeOf } from "vitest";

// GraphPanelState fields are readonly
declare const state: GraphPanelState;
expectTypeOf(state.selectedNodes).toEqualTypeOf<ReadonlySet<string>>();
expectTypeOf(state.viewport).toMatchTypeOf<GraphViewportState>();
expectTypeOf(state.filter).toMatchTypeOf<GraphFilterState>();
expectTypeOf(state.layoutDirection).toEqualTypeOf<"TB" | "LR">();
```

#### `graph-filter-state.test-d.ts`

```typescript
import { expectTypeOf } from "vitest";

// GraphFilterState compound mode is strictly typed
declare const filter: GraphFilterState;
expectTypeOf(filter.compoundMode).toEqualTypeOf<"and" | "or">();
expectTypeOf(filter.direction).toEqualTypeOf<"all" | "inbound" | "outbound">();
expectTypeOf(filter.resolutionStatus).toEqualTypeOf<"all" | "resolved" | "unresolved">();
expectTypeOf(filter.lifetimes).toEqualTypeOf<ReadonlySet<"singleton" | "scoped" | "transient">>();
expectTypeOf(filter.origins).toEqualTypeOf<ReadonlySet<"own" | "inherited" | "overridden">>();
expectTypeOf(filter.inheritanceModes).toEqualTypeOf<
  ReadonlySet<"shared" | "forked" | "isolated">
>();
expectTypeOf(filter.tagMode).toEqualTypeOf<"any" | "all">();
```

#### `graph-enriched-node.test-d.ts`

```typescript
import { expectTypeOf } from "vitest";

// EnrichedGraphNode extends VisualizableAdapter data
declare const node: EnrichedGraphNode;
expectTypeOf(node.adapter).toMatchTypeOf<VisualizableAdapter>();
expectTypeOf(node.libraryKind).toEqualTypeOf<LibraryAdapterKind | undefined>();
expectTypeOf(node.errorRate).toEqualTypeOf<number | undefined>();
expectTypeOf(node.direction).toEqualTypeOf<"inbound" | "outbound" | undefined>();
expectTypeOf(node.tags).toEqualTypeOf<readonly string[]>();
expectTypeOf(node.totalCalls).toEqualTypeOf<number>();
expectTypeOf(node.okCount).toEqualTypeOf<number>();
expectTypeOf(node.errCount).toEqualTypeOf<number>();
expectTypeOf(node.errorsByCode).toEqualTypeOf<ReadonlyMap<string, number>>();
```

#### `graph-library-kind.test-d.ts`

```typescript
import { expectTypeOf } from "vitest";

// LibraryAdapterKind is exhaustive discriminated union
declare const kind: LibraryAdapterKind;
if (kind.library === "store") {
  expectTypeOf(kind.kind).toEqualTypeOf<
    "state" | "atom" | "derived" | "async-derived" | "linked-derived" | "effect"
  >();
}
if (kind.library === "query") {
  expectTypeOf(kind.kind).toEqualTypeOf<"query" | "mutation" | "streamed-query">();
}
if (kind.library === "saga") {
  expectTypeOf(kind.kind).toEqualTypeOf<"saga" | "saga-management">();
}
if (kind.library === "flow") {
  expectTypeOf(kind.kind).toEqualTypeOf<"flow" | "activity">();
}
if (kind.library === "logger") {
  expectTypeOf(kind.kind).toEqualTypeOf<"console" | "memory" | "noop" | "scoped">();
}
if (kind.library === "tracing") {
  expectTypeOf(kind.kind).toEqualTypeOf<"console" | "memory" | "noop">();
}
if (kind.library === "core") {
  expectTypeOf(kind.kind).toEqualTypeOf<"generic">();
}
```

#### `graph-navigation.test-d.ts`

```typescript
import { expectTypeOf } from "vitest";

// GraphNavigationSelection fields are optional
declare const sel: GraphNavigationSelection;
expectTypeOf(sel.portName).toEqualTypeOf<string | undefined>();
expectTypeOf(sel.containerName).toEqualTypeOf<string | undefined>();
expectTypeOf(sel.highlightChain).toEqualTypeOf<boolean | undefined>();
```

#### `graph-analysis-state.test-d.ts`

```typescript
import { expectTypeOf } from "vitest";

// GraphAnalysisState fields are readonly
declare const analysis: GraphAnalysisState;
expectTypeOf(analysis.complexityScore).toEqualTypeOf<number>();
expectTypeOf(analysis.recommendation).toEqualTypeOf<"safe" | "monitor" | "consider-splitting">();
expectTypeOf(analysis.correlationId).toEqualTypeOf<string>();
expectTypeOf(analysis.depthWarning).toEqualTypeOf<string | undefined>();
expectTypeOf(analysis.depthLimitExceeded).toEqualTypeOf<boolean>();
expectTypeOf(analysis.actor).toEqualTypeOf<
  | { readonly type: "user" | "system" | "process"; readonly id: string; readonly name?: string }
  | undefined
>();
```

#### `graph-multi-container.test-d.ts`

```typescript
import { expectTypeOf } from "vitest";

declare const state: MultiContainerGraphState;
expectTypeOf(state.containers).toEqualTypeOf<ReadonlyMap<string, ContainerGraphData>>();
expectTypeOf(state.parentMap).toEqualTypeOf<ReadonlyMap<string, string>>();
expectTypeOf(state.activeGraph).toEqualTypeOf<ContainerGraphData | undefined>();
```

#### `graph-enriched-edge.test-d.ts`

```typescript
import { expectTypeOf } from "vitest";

declare const edge: EnrichedGraphEdge;
expectTypeOf(edge.source).toEqualTypeOf<string>();
expectTypeOf(edge.target).toEqualTypeOf<string>();
expectTypeOf(edge.isHighlighted).toEqualTypeOf<boolean>();
expectTypeOf(edge.transitiveDepth).toEqualTypeOf<number>();
expectTypeOf(edge.isInherited).toEqualTypeOf<boolean>();
expectTypeOf(edge.isOverridden).toEqualTypeOf<boolean>();
```

#### `graph-metadata-state.test-d.ts`

```typescript
import { expectTypeOf } from "vitest";

// MetadataDisplayState
declare const meta: MetadataDisplayState;
expectTypeOf(meta.portName).toEqualTypeOf<string>();
expectTypeOf(meta.expandedSections).toEqualTypeOf<
  ReadonlySet<"port" | "adapter" | "library" | "custom">
>();

// SavedFilterPreset
declare const preset: SavedFilterPreset;
expectTypeOf(preset.name).toEqualTypeOf<string>();
expectTypeOf(preset.filter).toMatchTypeOf<GraphFilterState>();
expectTypeOf(preset.createdAt).toEqualTypeOf<number>();
```

---

### 18.21 Integration Tests

#### `graph-data-flow.test.tsx`

| #   | Test                                                                                 | Type        |
| --- | ------------------------------------------------------------------------------------ | ----------- |
| 1   | DataSource with populated graph → enrichment → SVG renders nodes at layout positions | integration |
| 2   | DataSource update → enrichment re-run → SVG updates with new nodes                   | integration |
| 3   | ResultStatistics update → error rate badge appears on affected node                  | integration |

#### `graph-multi-container.test.tsx`

| #   | Test                                                                                | Type        |
| --- | ----------------------------------------------------------------------------------- | ----------- |
| 1   | DataSource with 3 containers → selector lists all → switching renders correct graph | integration |
| 2   | Child container graph shows inherited nodes with dashed borders                     | integration |
| 3   | Overridden nodes show "OVR" badge and double border in child view                   | integration |
| 4   | Comparison view renders two containers side-by-side with aligned nodes              | integration |

#### `graph-filter-to-render.test.tsx`

| #   | Test                                                                                           | Type        |
| --- | ---------------------------------------------------------------------------------------------- | ----------- |
| 1   | Applying lifetime filter → non-matching nodes at 15% opacity → layout stable                   | integration |
| 2   | Applying text search → matching nodes at full opacity, others dimmed → correct count in footer | integration |
| 3   | Applying compound AND filter → only nodes matching all criteria visible                        | integration |
| 4   | Saving preset → reloading → loading preset → same filter applied                               | integration |

#### `graph-analysis-to-graph.test.tsx`

| #   | Test                                                                                   | Type        |
| --- | -------------------------------------------------------------------------------------- | ----------- |
| 1   | Opening analysis sidebar → clicking suggestion → graph pans to and selects target node | integration |
| 2   | Captive dependency click → both nodes selected and highlighted                         | integration |
| 3   | Orphan port click → node selected, centered, and detail panel opens                    | integration |

#### `graph-cross-panel-nav.test.tsx`

| #   | Test                                                                      | Type        |
| --- | ------------------------------------------------------------------------- | ----------- |
| 1   | Outbound: graph → container panel with portName selection preserved       | integration |
| 2   | Inbound: container panel → graph with node selected and viewport centered | integration |
| 3   | Inbound with containerName: switches container then selects node          | integration |

#### `graph-audit-traversal.test.tsx`

| #   | Test                                                                                        | Type        |
| --- | ------------------------------------------------------------------------------------------- | ----------- |
| 1   | DataSource with ResultStatistics → node detail shows full stats breakdown                   | integration |
| 2   | Find Path To between two ports → path nodes highlighted in graph                            | integration |
| 3   | Container phase transitions loading → active → graph updates from skeleton to full          | integration |
| 4   | Container phase transitions disposing → disposed → graph shows 30% opacity + warning banner | integration |

---

### 18.22 Test Count Summary

| Category                                                    | Count                    |
| ----------------------------------------------------------- | ------------------------ |
| Component tests (panel rendering)                           | 10                       |
| Component tests (node rendering)                            | 63                       |
| Component tests (edge rendering)                            | 6                        |
| Component tests (toolbar)                                   | 6                        |
| Component tests (tooltip)                                   | 4                        |
| Component tests (container header + comparison)             | 17                       |
| Component tests (interactions + context menu)               | 28                       |
| Component tests (keyboard navigation)                       | 14                       |
| Unit tests (filter logic)                                   | 22                       |
| Component tests (filter panel + presets)                    | 22                       |
| Component tests (node detail + metadata)                    | 32                       |
| Component tests (analysis sidebar)                          | 23                       |
| Component tests (cross-panel navigation)                    | 11                       |
| Component tests (real-time updates)                         | 12                       |
| Unit tests (export)                                         | 21                       |
| Unit tests (layout engine + cache + enrichment + detection) | 51                       |
| Component tests (performance)                               | 16                       |
| Component tests (accessibility)                             | 23                       |
| Component tests (edge states)                               | 13                       |
| Component tests (minimap)                                   | 8                        |
| Component tests (audit + correlation)                       | 11                       |
| Component tests (advanced traversal)                        | 13                       |
| Component tests (container phase + depth)                   | 13                       |
| Type-level tests                                            | 9 files (~40 assertions) |
| Integration tests                                           | 21                       |
| **Total**                                                   | **~477 tests**           |

### Breakdown by Test Type

| Type                  | Count    |
| --------------------- | -------- |
| Unit tests            | ~94      |
| Component tests       | ~345     |
| Integration tests     | ~21      |
| Type-level test files | ~9       |
| **Total**             | **~477** |

---

### 18.23 Mutation Testing Strategy

#### Why Mutation Testing Matters for the Graph Panel

The Graph Panel combines pure logic (filter predicates, enrichment, layout, detection) with visual rendering (SVG shapes, colors, badges, animations). Standard coverage cannot verify:

- **Filter predicate inversion**: Negating a boolean in a filter predicate shows excluded nodes and hides included nodes
- **Library kind dispatch**: Swapping shape selection renders state machines as diamonds and derived stores as hexagons
- **Lifetime color assignment**: Swapping `--hex-lifetime-singleton` and `--hex-lifetime-transient` produces visually wrong but non-crashing output
- **Badge threshold mutations**: Changing `> 0.10` to `>= 0.10` or `> 0.11` shifts error rate visibility
- **Cache key computation**: Omitting layout direction from the cache key causes stale layouts after direction changes
- **Keyboard shortcut mapping**: Swapping key codes routes the wrong shortcut to the wrong action
- **Navigation panel names**: Changing `"container"` to `"tracing"` in a navigation call silently routes to the wrong panel
- **Zoom clamping**: Changing `0.1` to `0.0` or `3.0` to `30.0` allows extreme zoom states
- **ARIA strings**: Mutating role names or announcement templates silently breaks screen readers

#### Mutation Targets by Priority

| Priority | Module                                     | Target Score | Rationale                                              |
| -------- | ------------------------------------------ | ------------ | ------------------------------------------------------ |
| Critical | Filter logic (`filter-logic.ts`)           | >95%         | Pure boolean predicates; any mutation inverts behavior |
| Critical | Layout cache (`layout-cache.ts`)           | >95%         | Cache key computation; stale layout on mutation        |
| Critical | Library detection (`library-detection.ts`) | >95%         | Dispatch table; wrong detection = wrong shapes         |
| Critical | Export (`export.ts`)                       | >90%         | Format strings; corruption is silent                   |
| Critical | Cross-panel navigation                     | >90%         | Panel name strings; wrong panel on mutation            |
| High     | Enrichment (`enrichment.ts`)               | >90%         | Field assignment; wrong enrichment = wrong rendering   |
| High     | Keyboard shortcuts                         | >90%         | Key-to-action table; wrong binding on mutation         |
| High     | Filter panel components                    | >85%         | Debounce timing, checkbox immediate apply              |
| High     | Node detail + metadata                     | >85%         | Property display, override chain traversal             |
| High     | Analysis sidebar                           | >85%         | Gauge thresholds, suggestion type badges               |
| High     | Accessibility                              | >90%         | ARIA attributes, focus management targets              |
| High     | Edge states                                | >85%         | State detection predicates, threshold values           |
| High     | Result statistics display                  | >85%         | Error threshold coloring, count rendering              |
| High     | Advanced traversal                         | >85%         | Path-finding null handling, layer assignment           |
| High     | Container phase                            | >85%         | Phase-to-badge dispatch table                          |
| Medium   | Node rendering                             | >85%         | SVG shapes, colors, opacity (visual)                   |
| Medium   | Edge rendering                             | >80%         | Path rendering, style dispatch                         |
| Medium   | Real-time updates                          | >80%         | Animation timing, reduced-motion check                 |
| Medium   | Minimap                                    | >80%         | Viewport rectangle positioning                         |
| Medium   | Performance                                | >80%         | Culling threshold, debounce timing                     |

#### Mutation Operators to Prioritize

- **Boolean mutations**: `matchesFilter` → `!matchesFilter`, `isResolved` → `!isResolved`, `hasHighErrorRate` → `!hasHighErrorRate`
- **String literal mutations**: `"singleton"` → `"scoped"`, `"container"` → `"tracing"`, `"role"` → `"button"`
- **Numeric boundary mutations**: `> 0.10` → `>= 0.10`, `50` → `49`, `200` → `201`, `0.25` → `0.5`
- **Conditional removal**: Removing `if (prefers-reduced-motion)` guard, removing `if (filter.lifetimes.size === 0)` early return
- **Object property omission**: Dropping `layoutDirection` from cache key hash, dropping `tags` from enrichment
- **Block removal**: Removing `setSelectedNodes(new Set())` on background click, removing `writeActivePanel()` on tab switch

---

### 18.24 Verification Checklist

Before marking the Graph Panel as "implemented," the following must all pass.

| Check                                   | Command                                                                                    | Expected   |
| --------------------------------------- | ------------------------------------------------------------------------------------------ | ---------- |
| All unit tests pass                     | `pnpm --filter @hex-di/devtools-ui test -- --grep "graph-"`                                | 0 failures |
| All component tests pass                | `pnpm --filter @hex-di/devtools-ui test -- --grep "graph-"`                                | 0 failures |
| All type-level tests pass               | `pnpm --filter @hex-di/devtools-ui test:types`                                             | 0 failures |
| All integration tests pass              | `pnpm --filter @hex-di/devtools-ui test -- --grep "integration/graph-"`                    | 0 failures |
| Typecheck passes                        | `pnpm --filter @hex-di/devtools-ui typecheck`                                              | 0 errors   |
| Lint passes                             | `pnpm --filter @hex-di/devtools-ui lint`                                                   | 0 errors   |
| No `any` types in source                | `grep -r "any" packages/devtools-ui/src/panels/graph/`                                     | 0 matches  |
| No type casts in source                 | `grep -r " as " packages/devtools-ui/src/panels/graph/`                                    | 0 matches  |
| No eslint-disable in source             | `grep -r "eslint-disable" packages/devtools-ui/src/panels/graph/`                          | 0 matches  |
| Mutation score (filter logic)           | `stryker -- --mutate src/panels/graph/filter-logic.*`                                      | >95%       |
| Mutation score (layout cache)           | `stryker -- --mutate src/panels/graph/layout-cache.*`                                      | >95%       |
| Mutation score (library detection)      | `stryker -- --mutate src/panels/graph/library-detection.*`                                 | >95%       |
| Mutation score (export)                 | `stryker -- --mutate src/panels/graph/export.*`                                            | >90%       |
| Mutation score (enrichment)             | `stryker -- --mutate src/panels/graph/enrichment.*`                                        | >90%       |
| Mutation score (keyboard)               | `stryker -- --mutate src/panels/graph/keyboard.*`                                          | >90%       |
| Mutation score (accessibility)          | `stryker -- --mutate src/panels/graph/accessibility.*`                                     | >90%       |
| Mutation score (navigation)             | `stryker -- --mutate src/panels/graph/navigation.*`                                        | >90%       |
| Mutation score (node rendering)         | `stryker -- --mutate src/panels/graph/graph-node.*`                                        | >85%       |
| Mutation score (analysis sidebar)       | `stryker -- --mutate src/panels/graph/analysis.*`                                          | >85%       |
| Mutation score (filter panel)           | `stryker -- --mutate src/panels/graph/filter-panel.*`                                      | >85%       |
| Mutation score (detail + metadata)      | `stryker -- --mutate src/panels/graph/node-detail.*,src/panels/graph/metadata-inspector.*` | >85%       |
| Mutation score (real-time)              | `stryker -- --mutate src/panels/graph/real-time.*`                                         | >80%       |
| Mutation score (minimap)                | `stryker -- --mutate src/panels/graph/minimap.*`                                           | >80%       |
| Mutation score (audit + correlation)    | `stryker -- --mutate src/panels/graph/audit-*,src/panels/graph/correlation-*`              | >85%       |
| Mutation score (traversal)              | `stryker -- --mutate src/panels/graph/traversal.*`                                         | >85%       |
| Mutation score (container phase)        | `stryker -- --mutate src/panels/graph/container-phase.*`                                   | >85%       |
| Visual verification: dark mode          | Manual: all panels have dark background, text readable                                     | Pass       |
| Visual verification: light mode         | Manual: all panels have light background, text readable                                    | Pass       |
| Visual verification: all 17 node shapes | Manual: screenshot comparison with spec wireframes                                         | Pass       |
