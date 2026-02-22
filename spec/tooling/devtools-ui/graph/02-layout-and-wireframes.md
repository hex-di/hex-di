# Layout and Wireframes

_Previous: [Overview and Data Model](01-overview.md) | Next: [Interactions](03-interactions.md)_

---

## 3. Layout and Wireframes

### 3.1 Main Graph View

```
+---------------------------------------------------------------------------------+
| DEPENDENCY GRAPH                                                                |
| [Container: appRoot v] [root]  Adapters: 24  Inbound: 8  Outbound: 16          |
+---------------------------------------------------------------------------------+
| Toolbar:                                                                        |
| [Layout: TB v] [Filter (3)] [Analysis] [Export v]  [Zoom +][-][Fit] [Minimap]   |
+------+--------------------------------------------------------------------------+
|      |                                                                          |
| M    |       +===+==================================+                          |
| I    |       |   | ConfigSvc              [OVR]     |  <-- double border        |
| N    |       | A | core · singleton                 |       = overridden        |
| I    |       |   | deps: 0 · dependents: 3          |                          |
| M    |       +===+==================================+                          |
| A    |              /           |           \                                   |
| P    |  +--+------------------+   +--+------------------+                       |
|      |  |  | AuthSvc          |   |  | UserRepo         |  <-- dashed           |
|      |  |  | core · scoped    |   |  | store/state·scop |       = inherited     |
|      |  |  | deps: 1·dpts: 1  |   |  | deps: 1·dpts: 1 |                       |
|      |  +--+------------------+   +--+------------------+                       |
|      |             \                  /                                          |
|      |        +--+--------------------------------------+                       |
|      |        |▓▓| PaymentPort               [⚡]      |  <-- octagon           |
|      |        |▓▓| flow/flow · singleton               |       = flow adapter   |
|      |        |▓▓| deps: 2 · dependents: 0             |                       |
|      |        +--+--------------------------------------+                       |
|      |                                                                          |
+------+--------------------------------------------------------------------------+
| DETAIL: PaymentPort                                                    [x close]|
| Lifetime: singleton | Factory: async | Origin: own | Kind: flow                 |
| Inheritance: -- | Direction: outbound | Category: payment                       |
| Dependencies: AuthSvc, UserRepo, ConfigSvc                                      |
| Dependents: (none) | Error rate: 14% | Last error: PAYMENT_TIMEOUT (2m ago)     |
| Tags: critical, payment-processing                                              |
| [View Metadata] [Go to Container] [Go to Tracing]                              |
+---------------------------------------------------------------------------------+
```

### 3.2 Container Selector Dropdown

```
+-----------------------------------------------+
| [Container: appRoot            v]  [root]      |
|   +-------------------------------------------+
|   | appRoot              [root]   24 adapters  |
|   | authChild            [child]  12 adapters  |
|   |   parent: appRoot                          |
|   |   inherited: 8, overridden: 3              |
|   | lazyPayments         [lazy]   6 adapters   |
|   |   status: loaded                           |
|   +-------------------------------------------+
```

Each entry shows the container name, kind badge, adapter count, and for child containers, the parent name and override count.

### 3.3 Node Detail Panel (Selected Node)

Appears at the bottom of the graph area when a node is selected.

```
+---------------------------------------------------------------------------------+
| DETAIL: UserRepository                                                 [x close]|
+-------------------------------------+-------------------------------------------+
| PROPERTIES                          | DEPENDENCIES                              |
|                                     |                                           |
| Port Name: UserRepository           | Direct Dependencies:                      |
| Lifetime: scoped                    |   DatabasePool (singleton) [shared]        |
| Factory: sync                       |   Logger (singleton)                       |
| Origin: inherited                   |                                           |
| Inheritance Mode: forked            | Direct Dependents:                        |
| Direction: outbound                 |   UserService (scoped) [own]              |
| Category: persistence               |   AuthService (scoped) [own]              |
| Kind: core/generic                  |                                           |
| Error Rate: 0%                      | Transitive Chain Depth: 3                 |
| Tags: database, repository          |                                           |
+-------------------------------------+-------------------------------------------+
| [View Full Metadata] [Navigate to Container Panel] [Highlight Chain]            |
+---------------------------------------------------------------------------------+
```

### 3.4 Metadata Inspector Panel

Slides in from the right when "View Full Metadata" is clicked.

```
+-------------------------------------------+
| METADATA: UserRepository         [x close]|
+-------------------------------------------+
| v PORT METADATA                           |
|   Description: "Handles user persistence  |
|     operations against the primary DB"    |
|   Direction: outbound                     |
|   Category: persistence                   |
|   Tags: database, repository, core        |
+-------------------------------------------+
| v ADAPTER METADATA                        |
|   Lifetime: scoped                        |
|   Factory Kind: sync                      |
|   Origin: inherited                       |
|   Inheritance Mode: forked                |
|   Is Override: false                      |
+-------------------------------------------+
| > CUSTOM METADATA (3 entries)             |
|   tableName: "users"                      |
|   connectionPool: "primary"               |
|   retryPolicy: { maxRetries: 3, ... }    |
+-------------------------------------------+
| > LIBRARY METADATA                        |
|   (none -- core/generic adapter)          |
+-------------------------------------------+
```

### 3.5 Filter Panel

Slides in from the left or renders as a popover from the toolbar Filter button.

```
+-------------------------------------------+
| FILTERS                    [Clear All] [x]|
+-------------------------------------------+
| Search: [________________]                |
+-------------------------------------------+
| LIFETIME            [Clear]               |
| [x] singleton  [ ] scoped  [ ] transient  |
+-------------------------------------------+
| ORIGIN              [Clear]               |
| [ ] own  [x] inherited  [x] overridden    |
+-------------------------------------------+
| DIRECTION           [Clear]               |
| ( ) all  ( ) inbound  (x) outbound        |
+-------------------------------------------+
| LIBRARY KIND        [Clear]               |
| [ ] store/state  [ ] store/derived        |
| [x] query/query  [ ] flow/flow            |
| [ ] saga/saga    [ ] core/generic         |
| ... (scrollable)                          |
+-------------------------------------------+
| CATEGORY            [Clear]               |
| [persistence______]                       |
+-------------------------------------------+
| TAGS                [Clear]               |
| [database] [x]  [Add tag...]             |
+-------------------------------------------+
| INHERITANCE MODE    [Clear]               |
| [ ] shared  [x] forked  [ ] isolated      |
+-------------------------------------------+
| ERROR RATE          [Clear]               |
| Min: [0.1____] (10%+)                    |
+-------------------------------------------+
| RESOLUTION STATUS   [Clear]               |
| ( ) all  ( ) resolved  ( ) unresolved     |
+-------------------------------------------+
| COMBINE: (x) AND  ( ) OR                  |
+-------------------------------------------+
| PRESETS                                   |
| [Save Current...] [Load: _________ v]     |
| Saved: "High Error Singletons"            |
|        "Inherited Overrides"              |
+-------------------------------------------+
| Showing 12 of 24 adapters                 |
+-------------------------------------------+
```

### 3.6 Analysis Sidebar

Toggleable sidebar that slides in from the right of the graph area.

```
+-------------------------------------------+
| GRAPH ANALYSIS               [x close]    |
+-------------------------------------------+
| COMPLEXITY                                |
| Score: 67 / 150                           |
| [=========>                        ]      |
| Recommendation: [monitor]                 |
| Adapters: 24 | Depth: 7 | Avg Fan: 2.3   |
+-------------------------------------------+
| SUGGESTIONS (3)                           |
| [!] captive-dependency                    |
|     SessionCache (singleton) captures     |
|     RequestContext (scoped)               |
|     -> Click to highlight                 |
|                                           |
| [!] orphan-port                           |
|     LegacyAdapter is never required       |
|     -> Click to highlight                 |
|                                           |
| [i] deep-chain                            |
|     PaymentFlow chain depth is 7          |
|     -> Click to highlight                 |
+-------------------------------------------+
| CAPTIVE DEPENDENCIES (1)                  |
|   SessionCache (singleton)                |
|     captures RequestContext (scoped)       |
+-------------------------------------------+
| > ORPHAN PORTS (2)                        |
|   LegacyAdapter, DebugHelper              |
+-------------------------------------------+
| > DISPOSAL WARNINGS (1)                   |
|   DatabasePool finalizer depends on       |
|   Logger which has no finalizer           |
+-------------------------------------------+
| > UNNECESSARY LAZY PORTS (0)              |
+-------------------------------------------+
| DIRECTION SUMMARY                         |
|   Inbound: 8  |  Outbound: 16            |
+-------------------------------------------+
| COMPLETENESS                              |
|   [Complete] All requirements satisfied   |
+-------------------------------------------+
```

### 3.7 Multi-Container Comparison View

When the user selects "Compare" from the container selector, the graph area splits vertically.

```
+-------------------------------------+-------------------------------------+
| appRoot [root] -- 24 adapters       | authChild [child] -- 12 adapters    |
+-------------------------------------+-------------------------------------+
|                                     |                                     |
|    +----------+                     |    +- - - - - +                     |
|    | ConfigSvc|                     |    | ConfigSvc| (inherited, shared)  |
|    +----+-----+                     |    +- - -+- - +                     |
|         |                           |          |                          |
|    +----v-----+                     |    +====v=====+                     |
|    | AuthSvc  |                     |    || AuthSvc || (overridden)        |
|    +----------+                     |    +==========+                     |
|                                     |                                     |
+-------------------------------------+-------------------------------------+
```

### 3.8 Minimap

Small overlay in the bottom-left corner of the graph area.

```
+--------+
|  .--.  |   <-- full graph outline (simplified)
| |    | |
| | [] | |   <-- viewport rectangle (draggable)
|  '--'  |
+--------+
```

The minimap shows all nodes as dots, edges as thin lines, and a semi-transparent rectangle representing the current viewport. Clicking/dragging the rectangle pans the main graph.

---

## 4. Component Tree

```
GraphPanel (root)
  |
  +-- GraphHeader
  |     Contains container selector dropdown, container kind badge,
  |     adapter count, and direction summary metrics.
  |
  +-- GraphToolbar
  |     Contains layout direction toggle, filter button (with active count badge),
  |     analysis toggle, export dropdown, zoom controls, and minimap toggle.
  |
  +-- GraphFilterPanel (conditional, shown when filterPanelOpen)
  |     +-- FilterSearchInput
  |     +-- FilterCheckboxGroup (one per: lifetime, origin, library kind, inheritance mode)
  |     +-- FilterRadioGroup (one per: direction, resolution status, compound mode)
  |     +-- FilterTextInput (category)
  |     +-- FilterTagInput (tags)
  |     +-- FilterRangeInput (error rate)
  |     +-- FilterPresetManager
  |           +-- PresetSaveDialog
  |           +-- PresetSelector
  |
  +-- GraphCanvas (main SVG rendering area)
  |     +-- GraphSVG
  |     |     +-- SVGDefs (arrowhead markers, gradient definitions)
  |     |     +-- GraphEdgeLayer
  |     |     |     +-- EnrichedGraphEdgeComponent (one per visible edge)
  |     |     +-- GraphNodeLayer
  |     |           +-- EnrichedGraphNodeComponent (one per visible node)
  |     |                 +-- NodeShape (varies by library kind)
  |     |                 +-- NodeLabel
  |     |                 +-- NodeBadges (async, error rate, override)
  |     |                 +-- InheritanceModeBadge (conditional)
  |     +-- GraphMinimap (conditional, overlay)
  |     +-- GraphTooltip (conditional, follows hover)
  |
  +-- NodeDetailPanel (conditional, shown when a node is selected)
  |     +-- NodeProperties
  |     +-- NodeDependencyList
  |     +-- NodeDependentList
  |     +-- NodeActionBar (metadata, navigate, highlight chain)
  |
  +-- MetadataInspectorPanel (conditional, slides from right)
  |     +-- PortMetadataSection (collapsible)
  |     +-- AdapterMetadataSection (collapsible)
  |     +-- CustomMetadataSection (collapsible, JSON tree)
  |     +-- LibraryMetadataSection (collapsible)
  |
  +-- GraphAnalysisSidebar (conditional, slides from right)
  |     +-- ComplexityScoreCard
  |     |     +-- ScoreGauge
  |     |     +-- RecommendationBadge
  |     |     +-- BreakdownRow
  |     +-- SuggestionsList
  |     |     +-- SuggestionCard (one per suggestion, clickable)
  |     +-- CaptiveDependencyList
  |     +-- OrphanPortsList (collapsible)
  |     +-- DisposalWarningsList (collapsible)
  |     +-- UnnecessaryLazyPortsList (collapsible)
  |     +-- DirectionSummaryCard
  |     +-- CompletenessCard
  |
  +-- ContainerComparisonView (conditional, replaces GraphCanvas in compare mode)
        +-- SplitGraphCanvas (left)
        +-- SplitGraphCanvas (right)
        +-- ComparisonLegend
```
