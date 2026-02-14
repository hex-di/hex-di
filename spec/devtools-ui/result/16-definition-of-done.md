_Previous: [15-accessibility.md](15-accessibility.md)_

# 16. Definition of Done

All tests required for the Result Panel to be considered complete. Each DoD maps to spec sections and specifies required unit tests, component tests, integration tests, type-level tests, and mutation testing guidance.

---

## 16.1 Test File Conventions

```
packages/devtools-ui/tests/panels/result/
  result-panel.test.tsx                     # Panel rendering, empty states, lifecycle
  result-panel-toolbar.test.tsx             # View switcher, chain/execution selectors
  result-railway-pipeline.test.tsx          # Railway canvas, nodes, tracks, playback
  result-railway-node.test.tsx              # Operation node rendering, states, badges
  result-operation-log.test.tsx             # Step list, value inspector, diff mode
  result-case-explorer.test.tsx             # Path tree, path detail, coverage analysis
  result-case-simulator.test.tsx            # What-If simulation controls and behavior
  result-sankey-statistics.test.tsx         # Sankey diagram, hotspots, sparkline
  result-async-waterfall.test.tsx           # Duration bars, timeline, comparison
  result-combinator-matrix.test.tsx         # Combinator grid, cells, connectors
  result-combinator-statistics.test.tsx     # Aggregate combinator stats, correlation
  result-overview-dashboard.test.tsx        # Stat cards, error distribution, top errors
  result-educational-sidebar.test.tsx       # Glossary, walkthroughs, context-aware content
  result-educational-prompts.test.tsx       # Contextual learning prompts
  result-filter-system.test.tsx             # All filter dimensions and combinations
  result-global-search.test.tsx             # Cross-view search
  result-cross-view-nav.test.tsx            # Navigation between views with context
  result-cross-panel-nav.test.tsx           # Navigation to/from other DevTools panels
  result-real-time.test.tsx                 # Live updates, debouncing, indicators
  result-export.test.ts                     # All export formats (unit)
  result-keyboard.test.tsx                  # Keyboard shortcuts and navigation
  result-accessibility.test.tsx             # ARIA roles, screen reader, focus management
  result-edge-states.test.tsx               # Empty, loading, disconnected, no-tracing
  result-visual-encoding.test.ts            # Color mapping, duration formatting (unit)
  result-path-analysis.test.ts              # Static path enumeration and pruning (unit)
  result-data-source.test.ts               # DataSource interface contract (unit)
  result-pattern-recognition.test.ts        # Pattern detection in chains (unit)
  types/
    result-panel-state.test-d.ts           # Type-level ResultPanelState
    result-chain-descriptor.test-d.ts      # Type-level ResultChainDescriptor
    result-step-trace.test-d.ts            # Type-level ResultStepTrace
    result-path-descriptor.test-d.ts       # Type-level ResultPathDescriptor
    result-navigation.test-d.ts            # Type-level ResultPanelNavigation
    result-filter-state.test-d.ts          # Type-level ResultFilterState
    result-data-source.test-d.ts           # Type-level ResultDataSource
  integration/
    result-data-flow.test.tsx              # DataSource → rendering pipeline
    result-chain-to-views.test.tsx         # Chain selection → all views update
    result-filter-to-render.test.tsx       # Filter state → view content
    result-cross-view-context.test.tsx     # Cross-view navigation preserves context
    result-playground-integration.test.tsx  # Playground auto-tracing → panel
    result-educational-flow.test.tsx       # Walkthrough steps → UI highlights
```

---

## 16.2 DoD 1: Panel Rendering and Lifecycle (Spec Sections 3, 14)

### Component Tests -- `result-panel.test.tsx`

| #   | Test                                                      | Type      |
| --- | --------------------------------------------------------- | --------- |
| 1   | Renders panel with 7 view tabs in toolbar                 | component |
| 2   | Default view is "overview" when no initialState provided  | component |
| 3   | Renders empty state when dataSource returns no chains     | component |
| 4   | Empty state shows message: "No Result chains detected"    | component |
| 5   | Renders status bar with chain context when chain selected | component |
| 6   | Status bar shows Ok/Err counts and stability percentage   | component |
| 7   | Status bar stability badge is green when >= 95%           | component |
| 8   | Status bar stability badge is amber when 80-95%           | component |
| 9   | Status bar stability badge is red when < 80%              | component |
| 10  | Renders loading state when dataSource is pending          | component |
| 11  | ErrorBoundary isolates panel crash and shows fallback     | component |
| 12  | Panel subscribes to dataSource on mount                   | component |
| 13  | Panel unsubscribes from dataSource on unmount             | component |
| 14  | initialState.view opens the specified view                | component |
| 15  | initialState.chainId selects the specified chain          | component |
| 16  | Theme prop applies correct CSS variable values            | component |

### Component Tests -- `result-panel-toolbar.test.tsx`

| #   | Test                                                                       | Type      |
| --- | -------------------------------------------------------------------------- | --------- |
| 1   | View switcher renders 7 buttons with correct labels                        | component |
| 2   | Clicking a view button switches the active view                            | component |
| 3   | Active view button has accent underline                                    | component |
| 4   | Chain selector dropdown lists all registered chains                        | component |
| 5   | Chain selector shows trace icon, label, ok rate, run count                 | component |
| 6   | Chain selector search filters by name (150ms debounce)                     | component |
| 7   | Execution selector shows recent executions (newest first)                  | component |
| 8   | Execution entry shows execution ID, final track badge, timestamp, duration | component |
| 9   | Prev/Next buttons navigate between executions                              | component |
| 10  | `[?]` button toggles educational sidebar                                   | component |
| 11  | Export dropdown lists chain export formats                                 | component |
| 12  | Live indicator shows green dot when connected                              | component |
| 13  | Live indicator shows red dot with "Disconnected" when disconnected         | component |

**Mutation testing target**: >90%. View button-to-view mapping, stability threshold values (95%, 80%), and toolbar control dispatch must be caught.

---

## 16.3 DoD 2: Railway Pipeline View (Spec Section 4)

### Component Tests -- `result-railway-pipeline.test.tsx`

| #   | Test                                                                  | Type      |
| --- | --------------------------------------------------------------------- | --------- |
| 1   | Renders SVG canvas with Ok track (green) and Err track (red) lines    | component |
| 2   | Renders operation nodes at correct positions along tracks             | component |
| 3   | Entry node displays constructor name (e.g., "ok(42)")                 | component |
| 4   | Terminal node displays extraction method (e.g., "match")              | component |
| 5   | Active track has 3px solid stroke, inactive track has 1px dashed      | component |
| 6   | Switch points show diagonal connector between tracks with ⚡ icon     | component |
| 7   | Bypassed operations render at 30% opacity with dashed border          | component |
| 8   | No-execution mode shows all tracks as thin neutral lines              | component |
| 9   | No-execution mode shows both possible arrows for switch-capable nodes | component |
| 10  | Minimap renders overview with viewport rectangle                      | component |
| 11  | Fit button zooms/pans to show entire chain                            | component |
| 12  | Mouse wheel zooms centered on cursor position                         | component |
| 13  | Click+drag on background pans the viewport                            | component |
| 14  | Zoom clamped to 0.2 - 4.0 range                                       | component |

### Component Tests -- `result-railway-node.test.tsx`

| #   | Test                                                         | Type      |
| --- | ------------------------------------------------------------ | --------- |
| 1   | Node renders method name in bold mono font                   | component |
| 2   | Node renders label (truncated to 12 chars)                   | component |
| 3   | Node renders category icon with correct color                | component |
| 4   | Node renders track flow badges ("Ok → Ok", "Ok → Err", etc.) | component |
| 5   | Node renders duration label                                  | component |
| 6   | Node renders ⚡ badge when `switched === true`               | component |
| 7   | Hovered node shows elevation shadow                          | component |
| 8   | Selected node has accent border                              | component |
| 9   | Active (playback) node has glow effect                       | component |
| 10  | Error switch node has red-muted fill                         | component |
| 11  | Recovery switch node has green-muted fill                    | component |
| 12  | Category icon maps correctly for all 9 categories            | component |

### Component Tests -- `result-railway-pipeline.test.tsx` (Playback)

| #   | Test                                                      | Type      |
| --- | --------------------------------------------------------- | --------- |
| 13  | Play button starts particle animation at entry node       | component |
| 14  | Particle flows along active track between nodes           | component |
| 15  | Particle pauses briefly at each node (200ms default)      | component |
| 16  | At switch points, particle crosses between tracks         | component |
| 17  | At terminal, particle fades with color burst              | component |
| 18  | Pause button stops animation at current step              | component |
| 19  | Prev/Next buttons step through operations                 | component |
| 20  | Speed slider adjusts playback speed (0.5x-4x)             | component |
| 21  | With reduced motion, playback uses instant step highlight | component |

**Mutation testing target**: >85%. Track stroke widths, opacity values, switch connector rendering, category icon dispatch, playback timing, and zoom clamping bounds must be caught.

---

## 16.4 DoD 3: Operation Log View (Spec Section 5)

### Component Tests -- `result-operation-log.test.tsx`

| #   | Test                                                                       | Type      |
| --- | -------------------------------------------------------------------------- | --------- |
| 1   | Renders step list with columns: index, method, track, duration             | component |
| 2   | Track column shows color-coded badges (Ok→Ok green, Ok→Err gradient, etc.) | component |
| 3   | Switch rows have amber background tint and ⚡ icon                         | component |
| 4   | Bypassed rows are dimmed with strikethrough method name                    | component |
| 5   | Terminal row has bold text and ■ instead of output track                   | component |
| 6   | Clicking step shows input/output in value inspector                        | component |
| 7   | Value inspector renders JSON tree for objects                              | component |
| 8   | Value inspector shows inline value for primitives                          | component |
| 9   | Value inspector shows "[Circular]" for circular references                 | component |
| 10  | Value inspector shows "[Function: name]" for function references           | component |
| 11  | Value inspector shows "(values not captured)" when captureValues is false  | component |
| 12  | Diff mode shows structural diff between input and output                   | component |
| 13  | Diff shows "SWITCHED" label when tracks differ                             | component |
| 14  | Diff shows "+/-" lines for property changes                                | component |
| 15  | "Switch only" filter shows only steps where switched                       | component |
| 16  | "Err only" filter shows only steps with Err output                         | component |
| 17  | Method filter shows only selected method types                             | component |
| 18  | Duration filter shows only steps exceeding threshold                       | component |
| 19  | Filter summary shows "Showing N of M steps"                                | component |
| 20  | Cross-view link "View in Pipeline" navigates with context                  | component |

**Mutation testing target**: >90%. Filter boolean logic, track badge rendering, diff "SWITCHED" label, and value display dispatch are all pure logic.

---

## 16.5 DoD 4: Case Explorer View (Spec Section 6)

### Component Tests -- `result-case-explorer.test.tsx`

| #   | Test                                                             | Type      |
| --- | ---------------------------------------------------------------- | --------- |
| 1   | Renders path tree with branches at switch-capable operations     | component |
| 2   | Non-switching operations collapsed into badge (e.g., "[2 maps]") | component |
| 3   | Collapsed badge is expandable on click                           | component |
| 4   | Branch labels show "Ok" and "Err" with correct colors            | component |
| 5   | Each path shows frequency percentage and absolute count          | component |
| 6   | Frequency bar width proportional to percentage                   | component |
| 7   | Observed paths show green checkmark icon                         | component |
| 8   | Unobserved paths show amber ghost icon                           | component |
| 9   | Clicking leaf node opens path detail panel                       | component |
| 10  | Path detail shows classification, frequency, switch points       | component |
| 11  | Path detail shows recent executions                              | component |
| 12  | Happy path has checkmark icon                                    | component |
| 13  | Error path has X icon                                            | component |
| 14  | Recovery path has circular arrow icon                            | component |
| 15  | Multi-error path has warning triangle icon                       | component |
| 16  | Unobserved path shows warning: "never observed"                  | component |
| 17  | Chains with >16 paths show "N more paths..." truncation          | component |

### Component Tests -- `result-case-simulator.test.tsx`

| #   | Test                                                       | Type      |
| --- | ---------------------------------------------------------- | --------- |
| 1   | Simulator lists all switch-capable operations              | component |
| 2   | Each operation has Auto / Force Ok / Force Err controls    | component |
| 3   | Forcing Ok highlights the corresponding path               | component |
| 4   | Forcing Err highlights the corresponding path              | component |
| 5   | Auto mode uses most likely outcome from observed data      | component |
| 6   | "Reset All" returns all to Auto                            | component |
| 7   | Unobserved forced path shows warning message               | component |
| 8   | "Apply to Pipeline View" navigates with matching execution | component |

### Unit Tests -- `result-path-analysis.test.ts`

| #   | Test                                                                       | Type |
| --- | -------------------------------------------------------------------------- | ---- |
| 1   | `computePaths` with 0 switch operations returns 1 path (happy path)        | unit |
| 2   | `computePaths` with 1 andThen returns 2 paths                              | unit |
| 3   | `computePaths` with andThen + orElse returns 3 paths (prunes impossible)   | unit |
| 4   | `computePaths` with flip always switches both tracks                       | unit |
| 5   | `computePaths` prunes orElse Ok→Err (impossible: orElse bypassed on Ok)    | unit |
| 6   | `computePaths` prunes andThen Err→Ok (impossible: andThen bypassed on Err) | unit |
| 7   | `computePaths` with 5 andThen operations returns up to 32 paths            | unit |
| 8   | `computePathCoverage` returns correct observed/total ratio                 | unit |
| 9   | `computePathEntropy` returns 0 for single-path chain                       | unit |
| 10  | `computePathEntropy` returns max for uniform distribution                  | unit |
| 11  | `classifyPath` returns "happy" for all-Ok path                             | unit |
| 12  | `classifyPath` returns "error" for terminal-Err path                       | unit |
| 13  | `classifyPath` returns "recovery" for path with Err→Ok switch              | unit |
| 14  | `classifyPath` returns "multi-error" for path with 2+ Ok→Err switches      | unit |

**Mutation testing target**: >95%. Path enumeration, pruning rules, classification predicates, coverage/entropy formulas, and simulation forcing logic are all pure functions with critical correctness requirements.

---

## 16.6 DoD 5: Sankey Statistics View (Spec Section 7)

### Component Tests -- `result-sankey-statistics.test.tsx`

| #   | Test                                                             | Type      |
| --- | ---------------------------------------------------------------- | --------- |
| 1   | Renders one column per chain operation                           | component |
| 2   | Each column has Ok node and Err node                             | component |
| 3   | Node heights proportional to count                               | component |
| 4   | Ok nodes use `--hex-result-ok` fill                              | component |
| 5   | Err nodes use `--hex-result-err` fill                            | component |
| 6   | Ok→Ok links use green fill at 0.3 opacity                        | component |
| 7   | Ok→Err links use gradient fill at 0.5 opacity                    | component |
| 8   | Err→Ok links use gradient fill at 0.5 opacity                    | component |
| 9   | Err→Err links use red fill at 0.3 opacity                        | component |
| 10  | Hovering node highlights connected links and dims others         | component |
| 11  | Node tooltip shows count, percentage, sources, destinations      | component |
| 12  | Link tooltip shows count, percentage, top error types            | component |
| 13  | Error hotspot table renders ranked by impact                     | component |
| 14  | Hotspot table is sortable by column header click                 | component |
| 15  | Recovery heroes section shows operations with high recovery rate | component |
| 16  | Time range dropdown recomputes all counts                        | component |
| 17  | Port filter "All" shows aggregate across ports                   | component |
| 18  | Min flow filter hides links below threshold                      | component |
| 19  | Stability sparkline renders with color zones (green/amber/red)   | component |
| 20  | Sparkline hover shows exact percentage and timestamp             | component |

**Mutation testing target**: >85%. Link type-to-opacity mapping, link type-to-color mapping, node height computation, hotspot ranking, and sparkline zone thresholds must be caught.

---

## 16.7 DoD 6: Async Waterfall View (Spec Section 8)

### Component Tests -- `result-async-waterfall.test.tsx`

| #   | Test                                                   | Type      |
| --- | ------------------------------------------------------ | --------- |
| 1   | Shows "synchronous chain" message for non-async chains | component |
| 2   | Renders horizontal duration bars for async operations  | component |
| 3   | Bar start position corresponds to operation start time | component |
| 4   | Bar width proportional to duration                     | component |
| 5   | Ok/<p50 bars use emerald at 0.8 opacity                | component |
| 6   | Ok/p50-p90 bars use amber at 0.8 opacity               | component |
| 7   | Ok/>p90 bars use red at 0.6 opacity                    | component |
| 8   | Err bars use red at 0.8 opacity                        | component |
| 9   | Recovery bars use emerald at 0.6 with dashed border    | component |
| 10  | Wait gap renders as muted fill before bar              | component |
| 11  | Nested operations indent with tree-style prefix        | component |
| 12  | Summary bar shows duration breakdown                   | component |
| 13  | Summary shows critical path                            | component |
| 14  | Comparison mode shows two executions side-by-side      | component |
| 15  | Comparison shows delta annotations per bar             | component |
| 16  | Scale dropdown changes horizontal axis                 | component |
| 17  | Mouse wheel zooms horizontally                         | component |
| 18  | Concurrent operations (combinators) show parallel rows | component |

**Mutation testing target**: >80%. Duration bar color dispatch (percentile-based), opacity values, wait gap rendering, and comparison delta computation must be caught.

---

## 16.8 DoD 7: Combinator Matrix View (Spec Section 9)

### Component Tests -- `result-combinator-matrix.test.tsx`

| #   | Test                                                                      | Type      |
| --- | ------------------------------------------------------------------------- | --------- |
| 1   | Shows "no combinator" message for chains without combinators              | component |
| 2   | Renders input cells for each combinator input                             | component |
| 3   | Input cell shows index/name, source label, Ok/Err badge, value preview    | component |
| 4   | Ok inputs have green left border                                          | component |
| 5   | Err inputs have red left border                                           | component |
| 6   | Short-circuit cause input has pulsing label                               | component |
| 7   | Skipped inputs (after short-circuit) are dimmed at 40%                    | component |
| 8   | `collect` inputs show field names instead of indices                      | component |
| 9   | Connector lines colored by input track                                    | component |
| 10  | Combinator box shows name and input counts                                | component |
| 11  | Output box shows combined result badge and value                          | component |
| 12  | Output source note for `all` shows "Failed at input #N" on Err            | component |
| 13  | Output source note for `any` shows "First Ok: input #N" on Ok             | component |
| 14  | `allSettled` output shows collected errors list                           | component |
| 15  | Nested combinator cell is expandable with drill-down                      | component |
| 16  | Educational annotation renders at bottom with correct text per combinator | component |

### Component Tests -- `result-combinator-statistics.test.tsx`

| #   | Test                                                 | Type      |
| --- | ---------------------------------------------------- | --------- |
| 1   | Statistics view shows input success rate bars        | component |
| 2   | Bottleneck identification highlights weakest input   | component |
| 3   | Error combination table shows top 5 failure patterns | component |
| 4   | Correlation heatmap renders for 3+ inputs            | component |
| 5   | Heatmap cells colored by correlation coefficient     | component |
| 6   | High correlation (>0.5) cell uses red tint           | component |
| 7   | Low correlation (<0.2) cell has no tint              | component |

**Mutation testing target**: >85%. Short-circuit logic, input cell state dispatch, combinator-specific source note generation, and correlation threshold coloring must be caught.

---

## 16.9 DoD 8: Overview Dashboard (Spec Section 3.7)

### Component Tests -- `result-overview-dashboard.test.tsx`

| #   | Test                                                          | Type      |
| --- | ------------------------------------------------------------- | --------- |
| 1   | Stat card "Total Calls" shows correct count                   | component |
| 2   | Stat card "Ok Rate" shows percentage with trend indicator     | component |
| 3   | Stat card "Chains" shows traced chain count                   | component |
| 4   | Stat card "Active Err Ports" shows count of ports with errors | component |
| 5   | Error distribution chart renders segments per error type      | component |
| 6   | Clicking chart segment filters top errors list                | component |
| 7   | Stability timeline renders sparkline per port                 | component |
| 8   | Top errors table shows port, error type, count, last seen     | component |
| 9   | Top errors sorted by count descending                         | component |
| 10  | Clicking stat card navigates to related view                  | component |
| 11  | Clicking top error row navigates to Operation Log             | component |
| 12  | Dashboard refreshes when time range changes                   | component |

**Mutation testing target**: >85%. Stat card metric computation, sort order, and navigation targets must be caught.

---

## 16.10 DoD 9: Educational Features (Spec Section 12)

### Component Tests -- `result-educational-sidebar.test.tsx`

| #   | Test                                                                     | Type      |
| --- | ------------------------------------------------------------------------ | --------- |
| 1   | Sidebar opens and closes with `[?]` button                               | component |
| 2   | Sidebar has Glossary and Walkthrough tabs                                | component |
| 3   | Glossary lists all Result methods alphabetically                         | component |
| 4   | Glossary entry shows category, signature, description, equivalents       | component |
| 5   | Glossary search filters by method name                                   | component |
| 6   | Glossary category filter shows only selected categories                  | component |
| 7   | Glossary grouping by category with collapsible sections                  | component |
| 8   | Walkthrough list shows all 10 walkthroughs with step counts              | component |
| 9   | Starting a walkthrough shows step 1 with highlight                       | component |
| 10  | Next button advances to next step                                        | component |
| 11  | Previous button goes back to prior step                                  | component |
| 12  | Skip button exits walkthrough                                            | component |
| 13  | Walkthrough step auto-navigates to correct view when needed              | component |
| 14  | Walkthrough spotlight highlights target elements                         | component |
| 15  | Walkthrough progress saved to localStorage                               | component |
| 16  | Resuming walkthrough continues from saved step                           | component |
| 17  | Context-aware: selecting a node updates sidebar content                  | component |
| 18  | Context-aware: viewing Case Explorer shows path analysis explanation     | component |
| 19  | Comparison cards appear when viewing related operations (map vs andThen) | component |
| 20  | "Try in Playground" link includes correct example code                   | component |
| 21  | Pattern recognition labels validated chains as "Validation Pipeline"     | component |
| 22  | Pattern recognition labels orElse after andThen as "Error Recovery"      | component |

### Component Tests -- `result-educational-prompts.test.tsx`

| #   | Test                                             | Type      |
| --- | ------------------------------------------------ | --------- |
| 1   | Prompt appears for unobserved path (0% coverage) | component |
| 2   | Prompt appears for high recovery rate (>90%)     | component |
| 3   | Prompt appears for first Sankey view             | component |
| 4   | Prompt appears for first async chain             | component |
| 5   | Prompt dismissible with × button                 | component |
| 6   | "Don't show hints" persists to localStorage      | component |
| 7   | Maximum one prompt visible at a time             | component |
| 8   | Prompt auto-dismisses after 10 seconds           | component |

### Component Tests -- first-time experience

| #   | Test                                                        | Type      |
| --- | ----------------------------------------------------------- | --------- |
| 9   | Welcome overlay shows on first visit (no localStorage flag) | component |
| 10  | "Start Guided Tour" launches walkthrough #1                 | component |
| 11  | "Explore on My Own" dismisses overlay                       | component |
| 12  | "Don't show again" checkbox persists dismissal              | component |
| 13  | Overlay does not show on subsequent visits                  | component |

### Unit Tests -- `result-pattern-recognition.test.ts`

| #   | Test                                                      | Type |
| --- | --------------------------------------------------------- | ---- |
| 1   | Detects validation chain (2+ sequential andThen)          | unit |
| 2   | Detects error recovery (orElse after andThen)             | unit |
| 3   | Detects tap and continue (inspect between operations)     | unit |
| 4   | Detects fallback cascade (multiple orElse)                | unit |
| 5   | Detects async pipeline (fromPromise → andThen → asyncMap) | unit |
| 6   | Detects guard pattern (andThrough before andThen)         | unit |
| 7   | Detects safe extraction (chain ending with match)         | unit |
| 8   | Returns empty for chain with no recognized patterns       | unit |

**Mutation testing target**: >85%. Glossary data completeness, walkthrough step progression, context-aware dispatch, pattern detection predicates, prompt trigger conditions, and localStorage key strings must be caught.

---

## 16.11 DoD 10: Filter & Search System (Spec Section 13)

### Component Tests -- `result-filter-system.test.tsx`

| #   | Test                                                  | Type      |
| --- | ----------------------------------------------------- | --------- |
| 1   | Chain search filters by name (150ms debounce)         | component |
| 2   | Port dropdown filters by specific port                | component |
| 3   | Status dropdown filters by Ok/Err/Mixed/All           | component |
| 4   | Error type dropdown filters by error tag              | component |
| 5   | Time range dropdown filters by temporal window        | component |
| 6   | All filters combine with AND logic                    | component |
| 7   | "Clear All" resets all filters                        | component |
| 8   | Active filter count shown as badge                    | component |
| 9   | Railway "Collapse non-switch" collapses sequences     | component |
| 10  | Operation Log combined filters: Switch + method       | component |
| 11  | Case Explorer path classification filter              | component |
| 12  | Case Explorer "observed only" toggle hides unobserved | component |
| 13  | Sankey min flow filter hides low-traffic links        | component |
| 14  | Filter state persists across view switches            | component |

### Component Tests -- `result-global-search.test.tsx`

| #   | Test                                                                 | Type      |
| --- | -------------------------------------------------------------------- | --------- |
| 1   | Search opens with `/` key or search icon                             | component |
| 2   | Results grouped by category: Chains, Operations, Errors, Values      | component |
| 3   | Chain result click navigates to Railway Pipeline view                | component |
| 4   | Operation result click navigates to Operation Log at step            | component |
| 5   | Error result click navigates to Sankey filtered by error type        | component |
| 6   | Value result click navigates to Operation Log at step with execution | component |
| 7   | Search debounced at 200ms                                            | component |
| 8   | Max 10 results per category                                          | component |

**Mutation testing target**: >90%. Filter combination logic, debounce timing, search category-to-navigation mapping, and filter persistence must be caught.

---

## 16.12 DoD 11: Cross-View and Cross-Panel Navigation (Spec Section 11.11, 11.12)

### Component Tests -- `result-cross-view-nav.test.tsx`

| #   | Test                                                         | Type      |
| --- | ------------------------------------------------------------ | --------- |
| 1   | "View in Log" from Railway preserves chain, execution, step  | component |
| 2   | "View in Pipeline" from Log preserves chain, execution, step | component |
| 3   | "View Cases" from Railway preserves chain                    | component |
| 4   | "View Waterfall" from Log preserves chain, execution         | component |
| 5   | Sankey hotspot click opens Railway focused on operation      | component |
| 6   | Overview top error click opens Log filtered to error type    | component |
| 7   | Overview stability dip click opens Sankey with time range    | component |

### Component Tests -- `result-cross-panel-nav.test.tsx`

| #   | Test                                                            | Type      |
| --- | --------------------------------------------------------------- | --------- |
| 1   | Click port name navigates to Graph Panel with port selected     | component |
| 2   | Click "View Container" navigates to Container Panel             | component |
| 3   | Click scope ID navigates to Scope Tree Panel                    | component |
| 4   | Inbound from Graph Panel sets chain selector                    | component |
| 5   | Inbound from Container Panel sets chain selector                | component |
| 6   | Navigation without matching chain shows "Chain not found" toast | component |

**Mutation testing target**: >90%. Navigation target strings and context parameter passing must be caught.

---

## 16.13 DoD 12: Real-Time Updates (Spec Section 11.14)

### Component Tests -- `result-real-time.test.tsx`

| #   | Test                                                                  | Type      |
| --- | --------------------------------------------------------------------- | --------- |
| 1   | New execution updates execution selector dropdown                     | component |
| 2   | New chain registered updates chain selector                           | component |
| 3   | Statistics update refreshes status bar (debounced at 200ms)           | component |
| 4   | Aggregate statistics debounced at 500ms                               | component |
| 5   | Sankey diagram debounced at 1000ms                                    | component |
| 6   | Connection lost shows "Disconnected" indicator                        | component |
| 7   | Connection restored removes "Disconnected" indicator and updates data | component |
| 8   | Stale data remains interactive when disconnected                      | component |
| 9   | `prefers-reduced-motion` disables all update animations               | component |

**Mutation testing target**: >80%. Debounce timing values, connection status indicator rendering, and reduced-motion check must be caught.

---

## 16.14 DoD 13: Export (Spec Section 14.5)

### Unit Tests -- `result-export.test.ts`

| #   | Test                                                                                                   | Type |
| --- | ------------------------------------------------------------------------------------------------------ | ---- |
| 1   | `exportChainJson()` produces valid JSON with chain descriptor + executions                             | unit |
| 2   | `exportChainMermaid()` produces valid Mermaid flowchart                                                | unit |
| 3   | Mermaid output includes Ok/Err track nodes                                                             | unit |
| 4   | `exportChainDot()` produces valid DOT format                                                           | unit |
| 5   | DOT output includes color attributes for tracks                                                        | unit |
| 6   | `exportChainSvg()` serializes Railway Pipeline SVG                                                     | unit |
| 7   | `exportChainPng()` renders SVG to canvas data URL                                                      | unit |
| 8   | `exportExecutionJson()` includes all step traces                                                       | unit |
| 9   | `exportExecutionCsv()` has correct columns: index, method, inputTrack, outputTrack, duration, switched | unit |
| 10  | `exportStatsJson()` includes full ResultPanelSnapshot                                                  | unit |
| 11  | `exportStatsCsv()` has per-port columns                                                                | unit |
| 12  | JSON export filename pattern: `hex-result-chain-{label}-{timestamp}.json`                              | unit |
| 13  | Mermaid export filename pattern: `hex-result-chain-{label}-{timestamp}.mmd`                            | unit |
| 14  | Execution CSV filename pattern: `hex-result-exec-{label}-{executionId}.csv`                            | unit |
| 15  | URL state encodes chain, execution, step, view, filter                                                 | unit |
| 16  | URL state decodes back to correct panel state                                                          | unit |

**Mutation testing target**: >90%. Export format strings, filename patterns, CSV column order, and URL parameter names are all silent-corruption targets.

---

## 16.15 DoD 14: Visual Encoding (Spec Section 10)

### Unit Tests -- `result-visual-encoding.test.ts`

| #   | Test                                                        | Type |
| --- | ----------------------------------------------------------- | ---- |
| 1   | `formatDuration` returns `<1us` for 0 microseconds          | unit |
| 2   | `formatDuration` returns `42us` for 42 microseconds         | unit |
| 3   | `formatDuration` returns `1.2ms` for 1200 microseconds      | unit |
| 4   | `formatDuration` returns `145ms` for 145000 microseconds    | unit |
| 5   | `formatDuration` returns `2.3s` for 2300000 microseconds    | unit |
| 6   | `formatDuration` returns `1m 23s` for 83000000 microseconds | unit |
| 7   | `getCategoryColor` maps all 9 categories to distinct colors | unit |
| 8   | `getCategoryIcon` maps all 9 categories to distinct icons   | unit |
| 9   | `getDurationBarColor` returns ok for < p50                  | unit |
| 10  | `getDurationBarColor` returns warning for p50-p90           | unit |
| 11  | `getDurationBarColor` returns error for > p90               | unit |
| 12  | `getDurationBarColor` returns error for Err track           | unit |
| 13  | `getStabilityZoneColor` returns green for >= 95%            | unit |
| 14  | `getStabilityZoneColor` returns amber for 80-95%            | unit |
| 15  | `getStabilityZoneColor` returns red for < 80%               | unit |

**Mutation testing target**: >95%. Duration formatting thresholds, category color/icon dispatch tables, bar color percentile thresholds, and stability zone boundaries are all pure lookup/threshold functions.

---

## 16.16 DoD 15: Keyboard Navigation (Spec Section 11.13)

### Component Tests -- `result-keyboard.test.tsx`

| #   | Test                                                  | Type      |
| --- | ----------------------------------------------------- | --------- |
| 1   | `1`-`7` keys switch to views 1-7                      | component |
| 2   | `Tab` cycles focus between interactive elements       | component |
| 3   | `Enter` activates focused element                     | component |
| 4   | `Escape` closes open panel/overlay                    | component |
| 5   | `Space` toggles playback in Railway Pipeline          | component |
| 6   | `←` / `→` step through operations in Railway playback | component |
| 7   | `↑` / `↓` move step selection in Operation Log        | component |
| 8   | `+` / `-` zoom in/out in Railway Pipeline             | component |
| 9   | `0` fits Railway Pipeline to view                     | component |
| 10  | `d` toggles diff mode in Operation Log                | component |
| 11  | `f` opens filter controls                             | component |
| 12  | `?` toggles educational sidebar                       | component |
| 13  | `/` opens global search                               | component |
| 14  | `s` opens What-If Simulator in Case Explorer          | component |

**Mutation testing target**: >90%. Key-to-action mapping is a dispatch table; any mutation silently binds the wrong shortcut.

---

## 16.17 DoD 16: Accessibility (Spec Section 15)

### Component Tests -- `result-accessibility.test.tsx`

| #   | Test                                                                  | Type      |
| --- | --------------------------------------------------------------------- | --------- |
| 1   | Panel root has `role="region"` with `aria-label`                      | component |
| 2   | View switcher has `role="tablist"`                                    | component |
| 3   | View buttons have `role="tab"` with `aria-selected`                   | component |
| 4   | Active view has `role="tabpanel"`                                     | component |
| 5   | Railway SVG has `role="img"` with `aria-label`                        | component |
| 6   | Operation nodes have `role="button"` with descriptive `aria-label`    | component |
| 7   | Operation Log has `role="grid"`                                       | component |
| 8   | Path tree has `role="tree"` with `role="treeitem"` children           | component |
| 9   | Sankey SVG has `role="img"` with `aria-label`                         | component |
| 10  | Status bar has `role="status"` with `aria-live="polite"`              | component |
| 11  | Screen reader announces view switch                                   | component |
| 12  | Screen reader announces chain selection                               | component |
| 13  | Screen reader announces step selection with track info                | component |
| 14  | Screen reader announces track switch detection                        | component |
| 15  | Screen reader announces filter application                            | component |
| 16  | Screen reader announces playback start/pause/end                      | component |
| 17  | Screen reader announces connection status changes                     | component |
| 18  | Focus moves to detail panel on node select                            | component |
| 19  | Escape returns focus to previously focused element                    | component |
| 20  | View switch moves focus to first interactive element                  | component |
| 21  | Color not sole indicator for Ok/Err (filled/empty circle + text)      | component |
| 22  | Color not sole indicator for switch (⚡ icon + "switched" text)       | component |
| 23  | Color not sole indicator for duration severity (text + label)         | component |
| 24  | Color not sole indicator for stability zone (percentage text + label) | component |
| 25  | All text meets WCAG AA 4.5:1 contrast ratio                           | component |
| 26  | Reduced motion disables all animations                                | component |
| 27  | Touch targets minimum 44x44px                                         | component |

**Mutation testing target**: >90%. ARIA role strings, `aria-label` templates, announcement text, focus management targets, and reduced-motion guard must be caught.

---

## 16.18 DoD 17: Edge States (Spec Section 14)

### Component Tests -- `result-edge-states.test.tsx`

| #   | Test                                                                                     | Type      |
| --- | ---------------------------------------------------------------------------------------- | --------- |
| 1   | No chains: "No Result chains detected" message                                           | component |
| 2   | No executions for chain: "No executions recorded" message                                | component |
| 3   | Level 0 only (no tracing): Railway/Log views show "Enable tracing..."                    | component |
| 4   | Disconnected: stale data + "Disconnected" banner                                         | component |
| 5   | Reconnected: data refreshes, banner removed                                              | component |
| 6   | Empty Sankey (no stats): "No statistics available"                                       | component |
| 7   | Async Waterfall for sync chain: "This chain is synchronous" message                      | component |
| 8   | Combinator Matrix for non-combinator chain: "No combinator operations"                   | component |
| 9   | Chain with 100+ operations: viewport culling active                                      | component |
| 10  | Large chain (50+ paths): path tree paginates                                             | component |
| 11  | Value serialization exceeded: "(truncated)" label shown                                  | component |
| 12  | Values not captured: "(values not captured)" placeholder                                 | component |
| 13  | View crash: ErrorBoundary shows fallback with error message                              | component |
| 14  | View crash: "Retry This View" remounts crashed view                                      | component |
| 15  | View crash: "Switch to Overview" navigates to Overview Dashboard                         | component |
| 16  | View crash: "Copy Error Details" copies error to clipboard                               | component |
| 17  | View crash: preserved state (chainId, filter) survives crash                             | component |
| 18  | View crash: auto-retry on data source event re-renders view                              | component |
| 19  | Disconnected: reconnection retries at exponential backoff (1s, 2s, 4s, 8s, 16s, 30s cap) | component |
| 20  | Disconnected: after 5 min shows permanent "Connection lost" with manual Reconnect        | component |
| 21  | Reconnected: full snapshot fetched and all views re-render                               | component |

**Mutation testing target**: >85%. Edge state detection predicates, fallback UI message strings, reconnection backoff values, and error boundary recovery dispatch must be caught.

---

## 16.19 DoD 18: Data Source (Spec Section 14.2)

### Unit Tests -- `result-data-source.test.ts`

| #   | Test                                                      | Type |
| --- | --------------------------------------------------------- | ---- |
| 1   | `getChains()` returns empty map initially                 | unit |
| 2   | After `registerChain()`, `getChains()` includes chain     | unit |
| 3   | `getPortStatistics()` returns stats for all ports         | unit |
| 4   | `getExecutions(chainId)` returns executions newest first  | unit |
| 5   | `getExecutions()` respects ring buffer limit              | unit |
| 6   | `subscribe()` listener called on chain-registered event   | unit |
| 7   | `subscribe()` listener called on execution-added event    | unit |
| 8   | `subscribe()` listener called on statistics-updated event | unit |
| 9   | `subscribe()` returns unsubscribe function                | unit |
| 10  | Unsubscribed listener not called on subsequent events     | unit |
| 11  | `getPaths(chainId)` computes paths from chain descriptor  | unit |
| 12  | `getSnapshot()` returns complete panel snapshot           | unit |

**Mutation testing target**: >90%. Event type dispatch, ring buffer ordering, and unsubscribe behavior must be caught.

---

## 16.20 Type-Level Tests

### `result-panel-state.test-d.ts`

```typescript
import { expectTypeOf } from "vitest";

declare const state: ResultPanelState;
expectTypeOf(state.selectedChainId).toEqualTypeOf<string | undefined>();
expectTypeOf(state.selectedExecutionId).toEqualTypeOf<string | undefined>();
expectTypeOf(state.selectedStepIndex).toEqualTypeOf<number | undefined>();
expectTypeOf(state.activeView).toEqualTypeOf<ResultViewId>();
expectTypeOf(state.educationalSidebarOpen).toEqualTypeOf<boolean>();
expectTypeOf(state.connectionStatus).toEqualTypeOf<"connected" | "disconnected">();
```

### `result-chain-descriptor.test-d.ts`

```typescript
import { expectTypeOf } from "vitest";

declare const chain: ResultChainDescriptor;
expectTypeOf(chain.chainId).toEqualTypeOf<string>();
expectTypeOf(chain.operations).toEqualTypeOf<readonly ResultOperationDescriptor[]>();
expectTypeOf(chain.isAsync).toEqualTypeOf<boolean>();
expectTypeOf(chain.portName).toEqualTypeOf<string | undefined>();

declare const op: ResultOperationDescriptor;
expectTypeOf(op.method).toEqualTypeOf<ResultMethodName>();
expectTypeOf(op.inputTrack).toEqualTypeOf<"ok" | "err" | "both">();
expectTypeOf(op.canSwitch).toEqualTypeOf<boolean>();
expectTypeOf(op.isTerminal).toEqualTypeOf<boolean>();
```

### `result-step-trace.test-d.ts`

```typescript
import { expectTypeOf } from "vitest";

declare const step: ResultStepTrace;
expectTypeOf(step.inputTrack).toEqualTypeOf<"ok" | "err">();
expectTypeOf(step.outputTrack).toEqualTypeOf<"ok" | "err">();
expectTypeOf(step.switched).toEqualTypeOf<boolean>();
expectTypeOf(step.inputValue).toEqualTypeOf<SerializedValue | undefined>();
expectTypeOf(step.outputValue).toEqualTypeOf<SerializedValue | undefined>();
expectTypeOf(step.durationMicros).toEqualTypeOf<number>();
expectTypeOf(step.callbackThrew).toEqualTypeOf<boolean>();

declare const sv: SerializedValue;
expectTypeOf(sv.data).toEqualTypeOf<unknown>();
expectTypeOf(sv.typeName).toEqualTypeOf<string>();
expectTypeOf(sv.truncated).toEqualTypeOf<boolean>();
```

### `result-path-descriptor.test-d.ts`

```typescript
import { expectTypeOf } from "vitest";

declare const path: ResultPathDescriptor;
expectTypeOf(path.trackSequence).toEqualTypeOf<readonly ("ok" | "err")[]>();
expectTypeOf(path.switchPoints).toEqualTypeOf<readonly number[]>();
expectTypeOf(path.observed).toEqualTypeOf<boolean>();
expectTypeOf(path.frequency).toEqualTypeOf<number>();
```

### `result-navigation.test-d.ts`

```typescript
import { expectTypeOf } from "vitest";

declare const nav: ResultPanelNavigation;
expectTypeOf(nav.chainId).toEqualTypeOf<string | undefined>();
expectTypeOf(nav.executionId).toEqualTypeOf<string | undefined>();
expectTypeOf(nav.stepIndex).toEqualTypeOf<number | undefined>();
expectTypeOf(nav.view).toEqualTypeOf<
  "railway" | "log" | "cases" | "sankey" | "waterfall" | "combinator" | "overview" | undefined
>();
```

### `result-filter-state.test-d.ts`

```typescript
import { expectTypeOf } from "vitest";

declare const filter: ResultFilterState;
expectTypeOf(filter.chainSearch).toEqualTypeOf<string>();
expectTypeOf(filter.portName).toEqualTypeOf<string | undefined>();
expectTypeOf(filter.status).toEqualTypeOf<"all" | "ok" | "err" | "mixed">();
expectTypeOf(filter.errorType).toEqualTypeOf<string | undefined>();
```

### `result-data-source.test-d.ts`

```typescript
import { expectTypeOf } from "vitest";

declare const ds: ResultDataSource;
expectTypeOf(ds.getChains).toEqualTypeOf<() => ReadonlyMap<string, ResultChainDescriptor>>();
expectTypeOf(ds.getPortStatistics).toEqualTypeOf<() => ReadonlyMap<string, ResultPortStatistics>>();
expectTypeOf(ds.subscribe).toEqualTypeOf<
  (listener: (event: ResultDataEvent) => void) => () => void
>();
```

---

## 16.21 Integration Tests

### `result-data-flow.test.tsx`

| #   | Test                                                               | Type        |
| --- | ------------------------------------------------------------------ | ----------- |
| 1   | DataSource with chains → panel renders chain selector with entries | integration |
| 2   | DataSource emits execution → Railway Pipeline updates              | integration |
| 3   | DataSource emits stats update → Overview Dashboard refreshes       | integration |

### `result-chain-to-views.test.tsx`

| #   | Test                                                           | Type        |
| --- | -------------------------------------------------------------- | ----------- |
| 1   | Selecting chain updates Railway Pipeline with chain operations | integration |
| 2   | Selecting chain updates Case Explorer with computed paths      | integration |
| 3   | Selecting chain updates Sankey with port statistics            | integration |
| 4   | Selecting execution updates Operation Log with step traces     | integration |

### `result-filter-to-render.test.tsx`

| #   | Test                                                     | Type        |
| --- | -------------------------------------------------------- | ----------- |
| 1   | Port filter → only matching chain shown in selector      | integration |
| 2   | Error type filter → Log shows only matching executions   | integration |
| 3   | Time range filter → Sankey recomputes with filtered data | integration |

### `result-cross-view-context.test.tsx`

| #   | Test                                                                 | Type        |
| --- | -------------------------------------------------------------------- | ----------- |
| 1   | Railway → "View in Log" → Log shows correct step selected            | integration |
| 2   | Log → "View in Pipeline" → Railway scrolls to correct node           | integration |
| 3   | Case Explorer → "View in Pipeline" → Railway with matching execution | integration |
| 4   | Overview → top error click → Log filtered to error type              | integration |

### `result-playground-integration.test.tsx`

| #   | Test                                                        | Type        |
| --- | ----------------------------------------------------------- | ----------- |
| 1   | Playground auto-patches ok/err → chain traced automatically | integration |
| 2   | Code edit → re-execution → panel updates with new execution | integration |
| 3   | Level 1 tracing enabled by default in Playground context    | integration |

### `result-educational-flow.test.tsx`

| #   | Test                                                             | Type        |
| --- | ---------------------------------------------------------------- | ----------- |
| 1   | Starting walkthrough → steps highlight correct elements          | integration |
| 2   | Walkthrough view-switch step → panel navigates to specified view | integration |
| 3   | Context-aware sidebar → selecting node → sidebar content updates | integration |

---

## 16.22 Test Count Summary

| Category                                                     | Count                    |
| ------------------------------------------------------------ | ------------------------ |
| Component tests (panel + toolbar)                            | 29                       |
| Component tests (Railway Pipeline + nodes + playback)        | 35                       |
| Component tests (Operation Log)                              | 20                       |
| Component tests (Case Explorer + simulator)                  | 25                       |
| Component tests (Sankey Statistics)                          | 20                       |
| Component tests (Async Waterfall)                            | 18                       |
| Component tests (Combinator Matrix + statistics)             | 23                       |
| Component tests (Overview Dashboard)                         | 12                       |
| Component tests (Educational sidebar + prompts + first-time) | 35                       |
| Component tests (Filter system + global search)              | 22                       |
| Component tests (Cross-view + cross-panel navigation)        | 13                       |
| Component tests (Real-time updates)                          | 9                        |
| Component tests (Keyboard navigation)                        | 14                       |
| Component tests (Accessibility)                              | 27                       |
| Component tests (Edge states + error boundaries)             | 21                       |
| Unit tests (path analysis)                                   | 14                       |
| Unit tests (visual encoding)                                 | 15                       |
| Unit tests (export)                                          | 16                       |
| Unit tests (data source)                                     | 12                       |
| Unit tests (pattern recognition)                             | 8                        |
| Type-level tests                                             | 7 files (~35 assertions) |
| Integration tests                                            | 20                       |
| **Total**                                                    | **~408 tests**           |

### Breakdown by Test Type

| Type                  | Count    |
| --------------------- | -------- |
| Unit tests            | ~65      |
| Component tests       | ~323     |
| Integration tests     | ~20      |
| Type-level test files | ~7       |
| **Total**             | **~408** |

---

## 16.23 Mutation Testing Strategy

### Why Mutation Testing Matters for the Result Panel

The Result Panel combines:

- **Pure logic** (path enumeration, filter predicates, duration formatting, pattern detection)
- **Dispatch tables** (category→color, method→icon, track→badge, percentile→color)
- **Threshold decisions** (stability zones, duration severity, correlation levels)
- **Navigation routing** (view IDs, panel names, context parameters)
- **Visual encoding** (opacity values, stroke widths, animation timings)

Standard coverage cannot verify correctness of these. Mutation testing catches:

- Path pruning that incorrectly allows impossible paths
- Category-to-color swap that renders wrong colors
- Stability threshold shifted from 95% to 94%
- Navigation target string changed from "log" to "railway"
- Duration bar opacity changed from 0.8 to 0.6

### Mutation Targets by Priority

| Priority | Module                       | Target Score | Rationale                                         |
| -------- | ---------------------------- | ------------ | ------------------------------------------------- |
| Critical | Path analysis                | >95%         | Core algorithm; wrong paths = wrong visualization |
| Critical | Visual encoding (formatting) | >95%         | Pure lookup/threshold functions                   |
| Critical | Filter logic                 | >90%         | Boolean predicates; mutation inverts behavior     |
| Critical | Export                       | >90%         | Format strings; silent corruption                 |
| Critical | Cross-panel navigation       | >90%         | Panel name strings; wrong routing                 |
| Critical | Keyboard shortcuts           | >90%         | Key-to-action dispatch table                      |
| High     | Pattern recognition          | >85%         | Detection predicates; wrong labels                |
| High     | Sankey rendering             | >85%         | Link type-to-color/opacity mapping                |
| High     | Combinator matrix            | >85%         | Short-circuit logic, state dispatch               |
| High     | Educational sidebar          | >85%         | Context-aware dispatch, walkthrough steps         |
| High     | Data source                  | >90%         | Event dispatch, ring buffer ordering              |
| High     | Accessibility                | >90%         | ARIA strings, focus management                    |
| Medium   | Railway Pipeline             | >85%         | SVG rendering, playback timing                    |
| Medium   | Operation Log                | >90%         | Filter logic, value display dispatch              |
| Medium   | Async Waterfall              | >80%         | Duration bar color dispatch                       |
| Medium   | Overview Dashboard           | >85%         | Metric computation, sort order                    |
| Medium   | Real-time updates            | >80%         | Debounce timing, connection check                 |

### Mutation Operators to Prioritize

- **Boolean mutations**: `switched` → `!switched`, `observed` → `!observed`
- **String literal mutations**: `"railway"` → `"log"`, `"Ok"` → `"Err"`, `"connected"` → `"disconnected"`
- **Numeric boundary mutations**: `>= 95` → `>= 94`, `0.3` → `0.4`, `150` → `200`
- **Conditional removal**: Removing pruning rules, removing reduced-motion guards
- **Object property omission**: Dropping `stepIndex` from navigation context, dropping `switched` from step trace

---

## 16.24 Verification Checklist

Before marking the Result Panel as "implemented":

| Check                                                  | Command                                                                  | Expected   |
| ------------------------------------------------------ | ------------------------------------------------------------------------ | ---------- |
| All unit tests pass                                    | `pnpm --filter @hex-di/devtools-ui test -- --grep "result-"`             | 0 failures |
| All component tests pass                               | `pnpm --filter @hex-di/devtools-ui test -- --grep "result-"`             | 0 failures |
| All type-level tests pass                              | `pnpm --filter @hex-di/devtools-ui test:types`                           | 0 failures |
| All integration tests pass                             | `pnpm --filter @hex-di/devtools-ui test -- --grep "integration/result-"` | 0 failures |
| Typecheck passes                                       | `pnpm --filter @hex-di/devtools-ui typecheck`                            | 0 errors   |
| Lint passes                                            | `pnpm --filter @hex-di/devtools-ui lint`                                 | 0 errors   |
| No `any` types in source                               | `grep -r "any" packages/devtools-ui/src/panels/result/`                  | 0 matches  |
| No type casts in source                                | `grep -r " as " packages/devtools-ui/src/panels/result/`                 | 0 matches  |
| No eslint-disable in source                            | `grep -r "eslint-disable" packages/devtools-ui/src/panels/result/`       | 0 matches  |
| Mutation score (path analysis)                         | `stryker -- --mutate src/panels/result/path-analysis.*`                  | >95%       |
| Mutation score (visual encoding)                       | `stryker -- --mutate src/panels/result/visual-encoding.*`                | >95%       |
| Mutation score (filter logic)                          | `stryker -- --mutate src/panels/result/filter-logic.*`                   | >90%       |
| Mutation score (export)                                | `stryker -- --mutate src/panels/result/export.*`                         | >90%       |
| Mutation score (navigation)                            | `stryker -- --mutate src/panels/result/navigation.*`                     | >90%       |
| Mutation score (keyboard)                              | `stryker -- --mutate src/panels/result/keyboard.*`                       | >90%       |
| Mutation score (data source)                           | `stryker -- --mutate src/panels/result/data-source.*`                    | >90%       |
| Mutation score (accessibility)                         | `stryker -- --mutate src/panels/result/accessibility.*`                  | >90%       |
| Mutation score (operation log)                         | `stryker -- --mutate src/panels/result/operation-log.*`                  | >90%       |
| Mutation score (pattern recognition)                   | `stryker -- --mutate src/panels/result/pattern-recognition.*`            | >85%       |
| Mutation score (sankey)                                | `stryker -- --mutate src/panels/result/sankey.*`                         | >85%       |
| Mutation score (combinator matrix)                     | `stryker -- --mutate src/panels/result/combinator-matrix.*`              | >85%       |
| Mutation score (educational)                           | `stryker -- --mutate src/panels/result/educational.*`                    | >85%       |
| Mutation score (railway pipeline)                      | `stryker -- --mutate src/panels/result/railway-pipeline.*`               | >85%       |
| Mutation score (overview dashboard)                    | `stryker -- --mutate src/panels/result/overview-dashboard.*`             | >85%       |
| Mutation score (waterfall)                             | `stryker -- --mutate src/panels/result/async-waterfall.*`                | >80%       |
| Mutation score (real-time)                             | `stryker -- --mutate src/panels/result/real-time.*`                      | >80%       |
| Visual verification: Railway Pipeline (light + dark)   | Manual screenshot comparison                                             | Pass       |
| Visual verification: Operation Log (light + dark)      | Manual screenshot comparison                                             | Pass       |
| Visual verification: Case Explorer (light + dark)      | Manual screenshot comparison                                             | Pass       |
| Visual verification: Sankey Statistics (light + dark)  | Manual screenshot comparison                                             | Pass       |
| Visual verification: Async Waterfall (light + dark)    | Manual screenshot comparison                                             | Pass       |
| Visual verification: Combinator Matrix (light + dark)  | Manual screenshot comparison                                             | Pass       |
| Visual verification: Overview Dashboard (light + dark) | Manual screenshot comparison                                             | Pass       |

_Previous: [15-accessibility.md](15-accessibility.md)_
