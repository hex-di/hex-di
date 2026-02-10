# 04 - Panel Specifications

> Previous: [03-architecture.md](./03-architecture.md) | Next: [05-theming.md](./05-theming.md)

This document specifies the seven built-in panels (plus auto-discovered library panels) that compose the `@hex-di/devtools` overlay. Each panel is described in terms of its purpose, layout, data sources, TypeScript interfaces, interaction model, and rendering requirements. The panels are numbered as sections 8 through 15 (continuing from the architecture document's section numbering).

All panels live under the `<DevToolsOverlay>` component and are rendered into a tab strip. Panels marked "always available" appear unconditionally. Panels marked "conditional" appear only when their data source is present. Panels marked "auto-discovered" appear dynamically as libraries register inspectors.

---

## Table of Contents

- [Section 8: Container Panel](#section-8-container-panel)
- [Section 9: Graph Panel](#section-9-graph-panel)
- [Section 10: Scope Tree Panel](#section-10-scope-tree-panel)
- [Section 11: Tracing Panel](#section-11-tracing-panel)
- [Section 12: Library Panels and Event Log](#section-12-library-panels-and-event-log)
- [Section 13: Unified Overview Panel](#section-13-unified-overview-panel)
- [Section 14: Health & Diagnostics Panel](#section-14-health--diagnostics-panel)
- [Section 15: Library Panel Roadmap](#section-15-library-panel-roadmap)

---

## Section 8: Container Panel

### 8.1 Purpose

The Container Panel is the primary dashboard for container-level inspection. It provides an at-a-glance overview of container health: what kind of container is being inspected, its current lifecycle phase, how many ports are registered, how many singletons have been resolved, and which ports are experiencing errors. Users typically arrive here from the Overview panel when they want to drill into container details.

### 8.2 Availability

Always available. This panel is visible for every container type (root, child, lazy, scope).

### 8.3 Layout

```
+-------------------------------------------------------------+
| CONTAINER OVERVIEW                                           |
+------+----------+----------+----------+----------+-----------+
| Kind | Phase    | Ports    | Singles  | Async    | Errors    |
| root | running  | 24       | 8/24     | 3/3      | 2 ports   |
+------+----------+----------+----------+----------+-----------+
|                                                              |
| PORT REGISTRY                               [Search: ___]   |
| +---------------+----------+----------+-----------+--------+ |
| | Port Name     | Lifetime | Status   | Error Rate| Origin | |
| +---------------+----------+----------+-----------+--------+ |
| | AuthService   | singletn | resolved |   0%      | own    | |
| | UserRepo      | scoped   | pending  |   --      | own    | |
| | PaymentPort   | singletn | resolved |  14% [!]  | own    | |
| | ConfigService | singletn | resolved |   0%      | inhrtd | |
| | SessionSvc    | scoped   | scope-rq |   --      | own    | |
| | ...           |          |          |           |        | |
| +---------------+----------+----------+-----------+--------+ |
|                                                              |
| LIBRARIES REGISTERED: flow, tracing, store                   |
+-------------------------------------------------------------+
```

### 8.4 Data Sources

The Container Panel consumes data from three InspectorAPI methods and two React hooks:

**Primary snapshot data** comes from `useSnapshot()`, which returns a `ContainerSnapshot` (the discriminated union of `RootContainerSnapshot | ChildContainerSnapshot | LazyContainerSnapshot | ScopeSnapshot`). The snapshot provides:

- `snapshot.kind` -- the container type discriminant (`"root" | "child" | "lazy" | "scope"`), displayed in the Kind metric card.
- `snapshot.phase` -- the current lifecycle phase, displayed in the Phase metric card. The valid phases differ by kind: root containers have `"uninitialized" | "initialized" | "disposing" | "disposed"`, child containers have `"initialized" | "disposing" | "disposed"`, lazy containers have `"unloaded" | "loading" | "loaded" | "disposing" | "disposed"`, and scopes have `"active" | "disposing" | "disposed"`.
- `snapshot.singletons` -- a `readonly SingletonEntry[]` where each entry has `portName`, `resolvedAt`, and `isResolved`. The Singletons metric card shows `{resolved count}/{total count}`.
- `snapshot.containerName` -- human-readable name for the header.
- `snapshot.isDisposed` -- when true, the panel renders a disposed state overlay.

For root containers specifically, `snapshot.asyncAdaptersTotal` and `snapshot.asyncAdaptersInitialized` populate the Async metric card. For child containers, `snapshot.inheritanceModes` (a `ReadonlyMap<string, InheritanceMode>`) determines the inheritance indicator in each port row. For lazy containers, `snapshot.isLoaded` controls whether the Async card shows loading state.

**Port registry data** comes from `inspector.getAdapterInfo()`, which returns `readonly AdapterInfo[]`. Each `AdapterInfo` contains:

```typescript
interface AdapterInfo {
  readonly portName: string;
  readonly lifetime: Lifetime; // "singleton" | "scoped" | "transient"
  readonly factoryKind: FactoryKind; // "sync" | "async"
  readonly dependencyNames: readonly string[];
}
```

The port table is built by iterating `getAdapterInfo()` and enriching each row with:

- **Status**: Determined by calling `inspector.isResolved(portName)` for each port. Returns `true` (show "resolved"), `false` (show "pending"), or `"scope-required"` (show "scope-req").
- **Error Rate**: Determined by calling `inspector.getResultStatistics(portName)` which returns `ResultStatistics | undefined`. When defined, the `errorRate` field (a number from 0 to 1) is displayed as a percentage. When undefined (no results recorded yet), display "--".
- **Origin**: For child containers, determined from `inspector.getGraphData().adapters` which returns `VisualizableAdapter[]` entries including `origin: "own" | "inherited" | "overridden"`.

**Library list** comes from `useUnifiedSnapshot()` which returns a `UnifiedSnapshot`. The `registeredLibraries` field (a `readonly string[]`, alphabetically sorted) populates the "LIBRARIES REGISTERED" footer.

**Error highlighting** uses `inspector.getHighErrorRatePorts(0.1)` to identify ports with error rates above 10%. These ports receive a warning indicator `[!]` and the row is visually emphasized.

### 8.5 Container Panel Interfaces

```typescript
/**
 * Props for the ContainerPanel component.
 */
interface ContainerPanelProps {
  readonly inspector: InspectorAPI;
  readonly theme: ResolvedTheme;
}

/**
 * Derived state for a single port row in the registry table.
 */
interface PortRowData {
  readonly portName: string;
  readonly lifetime: Lifetime;
  readonly factoryKind: FactoryKind;
  readonly dependencyNames: readonly string[];
  readonly status: "resolved" | "pending" | "scope-required";
  readonly errorRate: number | undefined;
  readonly origin: ServiceOrigin;
}

/**
 * Derived metric card data computed from the snapshot.
 */
interface ContainerMetrics {
  readonly kind: ContainerKind;
  readonly phase: ContainerPhase;
  readonly totalPorts: number;
  readonly resolvedSingletons: number;
  readonly totalSingletons: number;
  readonly asyncInitialized: number | undefined;
  readonly asyncTotal: number | undefined;
  readonly highErrorPortCount: number;
}
```

### 8.6 Interactions

**Search filter**: The search input at the top of the port registry filters rows by port name using case-insensitive substring matching. The filter is applied client-side against the in-memory `PortRowData[]` array. Debounce input by 150ms to avoid excessive re-filtering during typing.

**Port row click**: Clicking a port row expands an inline detail view below that row. The detail view shows the full `AdapterInfo` for that port: lifetime, factory kind (`sync` or `async`), all dependency names as clickable links (clicking a dependency name scrolls to and highlights that port's row), and origin information. If `ResultStatistics` is available for the port, the detail view also shows `totalCalls`, `okCount`, `errCount`, `errorsByCode` (as a small table of error code to count), and `lastError` (code and timestamp formatted as relative time).

**Error rate warning**: Ports whose `errorRate` exceeds 0.1 (10%) are highlighted with a warning color from the theme and show a `[!]` indicator. Hovering the indicator shows a tooltip with the exact error rate and last error code.

**Phase-specific rendering**: The panel adapts its metric cards based on `snapshot.kind`:

- Root: Shows Kind, Phase, Ports, Singletons, Async Init, Errors.
- Child: Shows Kind, Phase, Ports, Singletons, Parent, Errors. Replaces Async with Parent name (from `ChildContainerSnapshot.parentId`).
- Lazy: Shows Kind, Phase, Ports, Singletons, Load Status, Errors. Replaces Async with loaded/unloaded indicator.
- Scope: Shows Kind, Phase, Ports, Scope ID, Parent Scope, Errors. Shows `ScopeSnapshot.scopeId` and `parentScopeId`.

**Sort**: The port table supports sorting by clicking column headers. Sortable columns: Port Name (alphabetical), Lifetime (alphabetical), Status (resolved first, then pending, then scope-required), Error Rate (descending, undefined sorts last). Default sort is alphabetical by port name.

**Auto-refresh**: The panel re-renders automatically via `useSyncExternalStore` when inspector events fire. No polling is used.

### 8.7 Empty and Edge States

- **No ports registered**: Show "No adapters registered" message in the table area.
- **Container disposed**: Show a full-panel overlay with "Container Disposed" message and the disposed timestamp. The port table remains visible but grayed out.
- **No result statistics**: When `getResultStatistics()` returns undefined for all ports, the Error Rate column shows "--" for every row and the Errors metric card shows "0 ports".

---

## Section 9: Graph Panel

### 9.1 Purpose

The Graph Panel renders an interactive dependency graph visualization showing how ports depend on each other. It transforms the flat `ContainerGraphData` from the inspector into a directed acyclic graph (DAG) layout where nodes represent ports and edges represent dependencies. This panel helps developers understand the structure of their dependency graph, identify circular dependency chains, spot inherited versus overridden adapters, and trace the dependency path from any port back to its roots.

### 9.2 Availability

Always available. The graph is derived from `inspector.getGraphData()` which is available on every container.

### 9.3 Layout

```
+-------------------------------------------------------------+
| DEPENDENCY GRAPH                   [Zoom +] [Zoom -] [Fit]  |
| [Layout: dagre v]  [Show: all v]   [Highlight: none v]      |
+-------------------------------------------------------------+
|                                                              |
|               +------------+                                 |
|               | ConfigSvc  |  (blue = singleton)             |
|               +-----+------+                                 |
|              /      |       \                                |
|        +----v---+   |    +--v-------+                        |
|        |AuthSvc |   |    | UserRepo |  (green = scoped)      |
|        +----+---+   |    +--+-------+                        |
|             |       |       |                                |
|        +----v-------v-------v----+                           |
|        |     PaymentPort         |  (blue = singleton)       |
|        +-------------------------+                           |
|                                                              |
+-------------------------------------------------------------+
| SELECTED: PaymentPort                                        |
| Lifetime: singleton | Factory: sync | Origin: own            |
| Dependencies: AuthSvc, UserRepo, ConfigSvc                   |
| Dependents: (none)                                           |
| Error rate: 14% | Last error: PAYMENT_TIMEOUT (2m ago)       |
+-------------------------------------------------------------+
```

### 9.4 Data Sources

**Graph structure** comes from `inspector.getGraphData()`, which returns a `ContainerGraphData`:

```typescript
interface ContainerGraphData {
  readonly adapters: readonly VisualizableAdapter[];
  readonly containerName: string;
  readonly kind: "root" | "child" | "lazy";
  readonly parentName: string | null;
}
```

Each `VisualizableAdapter` provides the full information needed to render a graph node:

```typescript
interface VisualizableAdapter {
  readonly portName: string;
  readonly lifetime: Lifetime;
  readonly factoryKind: FactoryKind;
  readonly dependencyNames: readonly string[];
  readonly origin: ServiceOrigin; // "own" | "inherited" | "overridden"
  readonly inheritanceMode?: InheritanceMode; // "shared" | "forked" | "isolated"
  readonly isOverride?: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
```

Edges are derived from `dependencyNames`: for each adapter, an edge is drawn from the adapter's node to each of its dependency nodes.

**Error overlays** use `inspector.getHighErrorRatePorts(0.1)` to add warning badges to nodes with elevated error rates.

**Resolution status** uses `inspector.isResolved(portName)` to show which nodes have been resolved at runtime (filled vs outline style).

### 9.5 Graph Rendering

**Layout engine**: The graph layout is computed using dagre (a directed graph layout algorithm). The layout runs client-side in the browser. The existing `@hex-di/visualization` package provides `toDotGraph()` and `toMermaidGraph()` for static export but the DevTools requires interactive rendering, so a separate SVG-based renderer is used.

**SVG rendering**: Nodes and edges are rendered as SVG elements within a container that supports pan and zoom via CSS transforms. This avoids canvas and keeps the rendering accessible to DOM-based interaction handlers.

**Node visual encoding**:

| Property            | Visual Encoding                     |
| ------------------- | ----------------------------------- |
| Lifetime: singleton | Blue fill color                     |
| Lifetime: scoped    | Green fill color                    |
| Lifetime: transient | Orange fill color                   |
| Origin: inherited   | Dashed border                       |
| Origin: overridden  | Double border (inner + outer)       |
| Origin: own         | Solid single border                 |
| Factory: async      | Small lightning bolt icon in corner |
| Resolved: true      | Full opacity                        |
| Resolved: false     | 50% opacity                         |
| High error rate     | Red warning badge on node corner    |

**Edge visual encoding**:

| Property             | Visual Encoding                |
| -------------------- | ------------------------------ |
| Required dependency  | Solid line with arrow          |
| Optional dependency  | Dashed line with arrow         |
| Selected node's deps | Highlighted in accent color    |
| Transitive chain     | Progressive fade for depth > 1 |

### 9.6 Graph Panel Interfaces

```typescript
/**
 * Props for the GraphPanel component.
 */
interface GraphPanelProps {
  readonly inspector: InspectorAPI;
  readonly theme: ResolvedTheme;
}

/**
 * Processed node for rendering in the SVG graph.
 */
interface GraphNode {
  readonly id: string;
  readonly portName: string;
  readonly lifetime: Lifetime;
  readonly factoryKind: FactoryKind;
  readonly origin: ServiceOrigin;
  readonly inheritanceMode: InheritanceMode | undefined;
  readonly isResolved: boolean;
  readonly hasHighErrorRate: boolean;
  readonly errorRate: number | undefined;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Processed edge for rendering in the SVG graph.
 */
interface GraphEdge {
  readonly source: string;
  readonly target: string;
  readonly isHighlighted: boolean;
  readonly points: readonly { readonly x: number; readonly y: number }[];
}

/**
 * State of the graph viewport.
 */
interface GraphViewport {
  readonly panX: number;
  readonly panY: number;
  readonly zoom: number;
}
```

### 9.7 Interactions

**Pan**: Click and drag on the graph background to pan the viewport. The pan offset is stored as `panX` and `panY` in the viewport state and applied as a CSS transform `translate(panX, panY)`.

**Zoom**: Mouse wheel over the graph area adjusts the zoom level. Zoom is clamped between 0.1 (10%) and 3.0 (300%). The zoom center point is the cursor position, not the viewport center. The toolbar buttons "Zoom +" and "Zoom -" adjust zoom in 0.25 increments. The "Fit" button resets zoom and pan to fit all nodes within the visible area.

**Node selection**: Clicking a node selects it and opens the detail panel below the graph. The selected node and its direct dependency edges are highlighted with the accent color. All other nodes and edges dim to 40% opacity. Clicking the background deselects.

**Hover tooltip**: Hovering a node shows a tooltip with port name, lifetime, and origin. The tooltip appears after a 300ms delay and disappears when the cursor leaves the node.

**Dependency chain highlight**: When a node is selected, its full transitive dependency chain (all ancestors) is highlighted with progressively lighter accent colors. Dependents (nodes that depend on the selected node) are highlighted with a secondary color.

**Filter dropdown**: The "Show" dropdown filters which nodes are displayed:

- "all" (default): Show all nodes.
- "singleton": Only singleton nodes and their edges.
- "scoped": Only scoped nodes and their edges.
- "transient": Only transient nodes and their edges.
- "inherited": Only inherited nodes and their edges.
- "overridden": Only overridden nodes and their edges.
- "errors": Only nodes with high error rates and their edges.

**Layout dropdown**: The "Layout" dropdown selects the layout algorithm direction:

- "dagre" (default): Top-to-bottom hierarchical layout.
- "dagre-lr": Left-to-right hierarchical layout.

Re-selecting a layout re-runs the dagre algorithm and animates nodes to their new positions over 300ms.

### 9.8 Graph Analysis Sidebar

The Graph Panel includes a toggleable analysis sidebar that surfaces structural insights from `@hex-di/graph`'s `inspectGraph()` function. The sidebar is activated via an "Analysis" button in the graph toolbar and slides in from the right side of the graph area.

**Data Source**: The sidebar calls `inspectGraph()` on the adapters from `inspector.getGraphData()`, producing a `GraphInspection` object. It also calls `detectAllCaptivesAtRuntime()` for captive dependency detection.

**Sidebar Sections**:

1. **Complexity Score Card** -- A gauge visualization showing the graph complexity score (0-150+). Includes a `performanceRecommendation` badge with three states:
   - `safe` (green badge, `--hex-success`): Score under 50. Normal graph.
   - `monitor` (amber badge, `--hex-warning`): Score 50-100. Growing complexity.
   - `consider-splitting` (red badge, `--hex-error`): Score over 100. Consider splitting the graph.
   - Breakdown row: adapter count, max depth, average fan-out.

2. **Suggestions List** -- Each `GraphSuggestion` rendered as a card with:
   - Type badge with color mapping: `captive-dependency` (red), `circular-dependency` (red), `deep-chain` (amber), `high-fan-out` (amber), `orphan-port` (gray), `missing-dependency` (red), `lifetime-mismatch` (amber), `unused-adapter` (gray).
   - Clickable port name (navigates to graph node selection).
   - Message text and action text.

3. **Captive Dependencies** -- Results from `detectAllCaptivesAtRuntime()`. Each entry shows the scoped port name captured by a singleton, both as clickable links that select the respective graph node.

4. **Orphan Ports** -- Collapsible list from `GraphInspection.orphanPorts`. Each port name is clickable.

5. **Disposal Warnings** -- Warning text blocks for any disposal-order concerns identified by the graph analysis.

6. **Port Filtering** -- Direction/category/tags dropdown filters using `filterPorts()` from `@hex-di/graph`. Filters apply to both the sidebar lists and the main graph visualization simultaneously.

```typescript
/**
 * State for the graph analysis sidebar.
 */
interface GraphAnalysisState {
  readonly isOpen: boolean;
  readonly complexityScore: number;
  readonly recommendation: "safe" | "monitor" | "consider-splitting";
  readonly suggestions: readonly GraphSuggestion[];
  readonly captiveDependencies: readonly { readonly scoped: string; readonly singleton: string }[];
  readonly orphanPorts: readonly string[];
  readonly disposalWarnings: readonly string[];
  readonly activeFilters: {
    readonly direction: "all" | "inbound" | "outbound";
    readonly category: string | undefined;
    readonly tags: readonly string[];
  };
}
```

### 9.9 Performance

For containers with more than 100 adapters, the graph panel employs viewport culling: only nodes and edges within the visible viewport (plus a 200px margin) are rendered as SVG elements. Nodes outside the viewport are removed from the DOM. The dagre layout computation happens once when graph data changes and is cached until the next `getGraphData()` call returns different data (compared by adapter count and port names).

### 9.10 DOT Format Export

Phase 4 of the vision (§4.5.2) specifies a "HexDI-to-GraphViz Adapter" that converts `ContainerGraphData` to GraphViz DOT format. The DevTools Graph panel uses custom SVG rendering for interactive exploration (see Appendix C6 for rationale), but a DOT export button in the graph toolbar provides a complementary non-interactive output. Clicking "Export DOT" copies a GraphViz DOT string to the clipboard. The DOT output includes:

- Nodes for each port, labeled with port name and lifetime
- Directed edges for dependency relationships
- Subgraph clusters grouped by port category (when categories are present)
- Visual markers for cycles, captive dependencies, and orphan ports

This allows developers to paste the DOT output into external tools (GraphViz online, VS Code extensions, documentation generators) for larger-format rendering or inclusion in architecture documents. The existing `@hex-di/visualization` package already provides DOT and Mermaid export utilities; the Graph panel should delegate to those rather than reimplementing the conversion.

---

## Section 10: Scope Tree Panel

### 10.1 Purpose

The Scope Tree Panel visualizes the container's scope hierarchy as an interactive tree. Scopes in HexDI provide isolation for scoped service instances (e.g., per-request or per-session). This panel shows the parent-child relationships between scopes, which scopes are active versus disposed, how many ports each scope has resolved, and the details of any selected scope. It helps developers track scope lifecycles, identify scope leaks (active scopes that should have been disposed), and understand which services are bound to which scope.

### 10.2 Availability

Always available. Even containers without active scopes display the root scope node.

### 10.3 Layout

```
+-------------------------------------------------------------+
| SCOPE TREE                              [Collapse All]       |
+--------------------------+----------------------------------+
| HIERARCHY                | SCOPE DETAIL                     |
|                          |                                   |
| v root-container         | Scope: request-abc                |
|   v request-abc [*]      | Status: active                   |
|     > nested-scope-1     | Parent: root-container            |
|     > nested-scope-2     | Created: 14:32:00.123             |
|   v request-def [*]      |                                   |
|   x request-xyz [x]      | Resolved Ports (3):               |
|                          |   UserRepo (scoped)               |
|                          |   SessionService (scoped)         |
|                          |   RequestContext (transient)       |
|                          |                                   |
|                          | Children: 2 active, 0 disposed    |
|                          | Resolved: 3/24 ports              |
+--------------------------+----------------------------------+
```

### 10.4 Data Sources

**Tree structure** comes from `useScopeTree()`, which returns a `ScopeTree`:

```typescript
interface ScopeTree {
  readonly id: string;
  readonly status: "active" | "disposed";
  readonly resolvedCount: number;
  readonly totalCount: number;
  readonly children: readonly ScopeTree[];
  readonly resolvedPorts: readonly string[];
}
```

The tree is recursive: each `ScopeTree` node contains `children` which are themselves `ScopeTree` nodes. The root node represents the container's root scope.

**Scope detail** for the selected scope is derived directly from the `ScopeTree` node. The `resolvedPorts` array lists port names that have been resolved in that scope. The `resolvedCount` and `totalCount` provide the resolved ratio.

**Real-time updates** come from inspector events. The `useScopeTree()` hook subscribes to inspector events via `useSyncExternalStore` and re-renders when:

- `scope-created` events fire (a new child scope appears in the tree).
- `scope-disposed` events fire (a scope's status changes to "disposed").
- `snapshot-changed` events fire (resolved counts may have changed).

### 10.5 Scope Tree Panel Interfaces

```typescript
/**
 * Props for the ScopeTreePanel component.
 */
interface ScopeTreePanelProps {
  readonly inspector: InspectorAPI;
  readonly theme: ResolvedTheme;
}

/**
 * State for the scope tree panel.
 */
interface ScopeTreePanelState {
  readonly selectedScopeId: string | undefined;
  readonly expandedScopeIds: ReadonlySet<string>;
}

/**
 * Flattened tree node for rendering the tree view.
 */
interface FlattenedScopeNode {
  readonly id: string;
  readonly status: "active" | "disposed";
  readonly resolvedCount: number;
  readonly totalCount: number;
  readonly resolvedPorts: readonly string[];
  readonly childCount: number;
  readonly depth: number;
  readonly isExpanded: boolean;
  readonly hasChildren: boolean;
}
```

### 10.6 Tree Rendering

The tree hierarchy is rendered as a flat list of indented rows (virtual tree pattern). Each row shows:

- **Expand/collapse chevron**: `v` for expanded nodes with children, `>` for collapsed nodes with children. Omitted for leaf nodes.
- **Status indicator**: A colored dot for active scopes (green), an `x` icon for disposed scopes (gray).
- **Scope ID**: The string identifier of the scope, truncated to 20 characters with a tooltip for the full ID.
- **Resolved count badge**: A small `(3/24)` badge showing resolved count versus total count.

The tree starts with all first-level children of the root expanded and deeper levels collapsed. The root node is always visible and cannot be collapsed.

### 10.7 Interactions

**Select scope**: Clicking a scope row selects it and populates the detail panel on the right. Only one scope can be selected at a time.

**Expand/collapse**: Clicking the chevron toggles the expand/collapse state of that node. Keyboard: pressing Enter or Space on a focused row toggles its expansion. The "Collapse All" button in the toolbar collapses all nodes except the root.

**Detail panel contents**: When a scope is selected, the detail panel shows:

- Scope ID (full, untruncated).
- Status: "active" or "disposed" with color indicator.
- Parent: The ID of the parent scope (or "none" for root).
- Created: The timestamp derived from the scope creation event (tracked internally). If unavailable, display "--".
- Resolved Ports: A list of `resolvedPorts` from the `ScopeTree` node, each annotated with the port's lifetime (looked up from `inspector.getAdapterInfo()`).
- Children summary: Count of active children and disposed children.
- Resolved ratio: `resolvedCount` / `totalCount`.

**Scope port click**: Clicking a port name in the detail panel's "Resolved Ports" list navigates to the Container Panel and scrolls to that port's row, selecting it.

**Disposed scope styling**: Disposed scope rows are rendered with reduced opacity (50%) and strikethrough text on the scope ID. They remain in the tree to show the full lifecycle history. A configuration option (in DevToolsConfig) controls whether disposed scopes are shown or hidden.

**Auto-expand on new scope**: When a `scope-created` event fires, the parent scope node is automatically expanded (if not already) to reveal the new child. The new child row briefly flashes with a highlight animation (200ms fade) to draw attention.

### 10.8 Performance

Scope trees are typically shallow (2-4 levels) but can be wide (many request scopes). The tree uses virtualized rendering for the flat list: only rows visible in the scroll viewport (plus a 10-row overscan buffer) are mounted in the DOM. This handles containers with hundreds of concurrent scopes without DOM bloat.

---

## Section 11: Tracing Panel

### 11.1 Purpose

The Tracing Panel provides a timeline visualization of resolution spans collected by the `@hex-di/tracing` library. It shows when each service was resolved, how long the resolution took, whether the result came from cache, and the parent-child relationships between nested resolutions. This panel helps developers identify slow resolutions, understand resolution ordering, and debug resolution failures.

### 11.2 Availability

Conditional. This panel tab appears only when a library inspector named `"tracing"` is registered with the container. The panel checks `inspector.getLibraryInspector("tracing")` on each render cycle. When no tracing inspector is registered, the tab is hidden entirely (not grayed out -- removed from the tab strip).

### 11.3 Layout

```
+-------------------------------------------------------------+
| TRACING TIMELINE                                             |
| Total: 47 spans | Errors: 2 | Avg: 34ms | Cache: 62%       |
+-------------------------------------------------------------+
| [Filter port: ___] [Min dur: ___ms] [Status: all v] [Clear] |
+-------------------------------------------------------------+
|                                                              |
| Time (ms)  0     50    100   150   200   250   300           |
| -----------+-----+-----+-----+-----+-----+-----             |
|                                                              |
| AuthSvc   |=====|                          (45ms, cached)    |
| UserRepo       |============|              (120ms)           |
| PaymentPort           |=====================| (180ms)  [!]   |
|   TokenSvc            |===|                (25ms, cached)    |
|   GatewaySvc               |================| (155ms)        |
|                                                              |
+-------------------------------------------------------------+
| SELECTED: PaymentPort (span: 00f067aa0ba902b7)               |
| Trace ID: 4bf92f3577b34da6a3ce929d0e0e4736                   |
| Duration: 180ms | Status: ok | Cached: no                    |
| Scope: request-abc                                           |
| Children: TokenSvc (25ms), GatewaySvc (155ms)                |
| Attributes:                                                  |
|   hex-di.port.name: PaymentPort                              |
|   hex-di.resolution.cached: false                            |
|   hex-di.scope.id: request-abc                               |
+-------------------------------------------------------------+
```

### 11.4 Data Sources

The Tracing Panel accesses span data through two paths:

**Summary metrics** come from `useTracingSummary()`, which returns:

```typescript
interface TracingSummary {
  readonly totalSpans: number;
  readonly errorCount: number;
  readonly averageDuration: number;
  readonly cacheHitRate: number;
}
```

These four values populate the header metrics bar. When `useTracingSummary()` returns `undefined` (no tracing inspector registered), the entire panel is hidden.

**Detailed span data** comes from `inspector.queryByLibrary("tracing")`, which returns `readonly LibraryQueryResult[]`. Each result entry has `{ library: "tracing", key: string, value: unknown }`. The tracing library inspector's snapshot provides `totalSpans`, `errorCount`, `averageDuration`, and `cacheHitRate` as top-level keys.

For full span access, the panel needs to access the `TracingQueryAPI` through the tracing library inspector. The tracing inspector's snapshot is pull-only (no push events), so the panel re-queries on each render triggered by inspector event subscriptions.

**Span data structure**: Each span is a `SpanData` from `@hex-di/tracing`:

```typescript
interface SpanData {
  readonly context: SpanContext; // { traceId, spanId, traceFlags }
  readonly parentSpanId?: string;
  readonly name: string; // operation name (port name)
  readonly kind: SpanKind; // "internal" | "server" | "client" | ...
  readonly startTime: number; // ms since epoch
  readonly endTime: number; // ms since epoch
  readonly status: SpanStatus; // "unset" | "ok" | "error"
  readonly attributes: Attributes; // key-value pairs
  readonly events: readonly SpanEvent[];
  readonly links: readonly SpanContext[];
}
```

Key attributes used for display:

- `hex-di.port.name` -- the port name (string).
- `hex-di.resolution.cached` -- whether the resolution was a cache hit (boolean).
- `hex-di.scope.id` -- the scope ID, if resolution happened within a scope (string).

**Trace tree construction**: The `TracingQueryAPI.getTraceTree(traceId)` method builds a `TraceTree` (recursive `{ span: SpanData, children: readonly TraceTree[] }`) from all spans sharing a trace ID. This is used to render the nested indentation of child spans under their parent.

### 11.5 Tracing Panel Interfaces

```typescript
/**
 * Props for the TracingPanel component.
 */
interface TracingPanelProps {
  readonly inspector: InspectorAPI;
  readonly theme: ResolvedTheme;
}

/**
 * Filter state for the tracing timeline.
 */
interface TracingFilterState {
  readonly portNameFilter: string;
  readonly minDuration: number | undefined;
  readonly statusFilter: "all" | "ok" | "error" | "unset";
  readonly cachedFilter: "all" | "cached" | "uncached";
}

/**
 * Processed span row for timeline rendering.
 */
interface TimelineSpanRow {
  readonly spanId: string;
  readonly traceId: string;
  readonly portName: string;
  readonly startMs: number;
  readonly durationMs: number;
  readonly isCached: boolean;
  readonly status: SpanStatus;
  readonly scopeId: string | undefined;
  readonly depth: number;
  readonly isExpanded: boolean;
  readonly hasChildren: boolean;
  readonly childSpanIds: readonly string[];
}

/**
 * Timeline viewport state for the time axis.
 */
interface TimelineViewport {
  readonly startMs: number;
  readonly endMs: number;
  readonly pixelsPerMs: number;
}
```

### 11.6 Timeline Rendering

**Time axis**: The horizontal axis represents wall-clock time in milliseconds. The viewport shows a configurable time window. The axis origin (0ms) is the `startTime` of the earliest visible span. Tick marks appear at regular intervals computed to maintain readability (e.g., every 50ms, 100ms, or 500ms depending on zoom level).

**Span bars**: Each span is rendered as a horizontal bar. The bar's left edge is positioned at `(span.startTime - viewportStartMs) * pixelsPerMs` and its width is `(span.endTime - span.startTime) * pixelsPerMs`. The bar's label shows the port name to the left of the bar and the duration to the right.

**Span bar coloring**:

| Condition              | Color                        |
| ---------------------- | ---------------------------- |
| Status: ok, not cached | Default accent color         |
| Status: ok, cached     | Muted accent color (lighter) |
| Status: error          | Red/error color              |
| Status: unset          | Gray/neutral color           |

**Nesting**: Child spans (those with a `parentSpanId` matching another visible span's `spanId`) are indented below their parent. The indentation is 24px per depth level. Parent spans show an expand/collapse triangle. Collapsed parents hide their children. The default state is fully expanded.

**Duration label**: Each bar shows its duration in milliseconds to the right of the bar. Cached spans append "(cached)" to the label. Error spans append "[!]".

### 11.7 Waterfall View (v0.2 Scope)

Phase 4 of the vision (§4.5.4) specifies two visualization modes for tracing data: a flat **timeline** (horizontal bars sorted by start time) and a **waterfall** (nested bars showing parent-child span relationships). In v0.1.0, the Tracing panel implements the timeline view only. The nesting described in Section 11.6 (child spans indented below parents with expand/collapse) provides basic parent-child visibility, but a dedicated waterfall mode -- where indentation depth reflects the full call tree and connecting lines show the invocation hierarchy -- is deferred to v0.2.

The v0.2 waterfall mode will add:

- A toggle button in the filter bar: "Timeline" | "Waterfall"
- In waterfall mode, spans are grouped by trace ID and displayed as a call tree rather than a flat chronological list
- Connecting vertical/horizontal lines between parent and child spans (similar to Chrome DevTools Network waterfall)
- Color banding by depth level for visual clarity

The timeline view in v0.1.0 already renders parent-child nesting (Section 11.6), so the v0.2 waterfall is an enhanced presentation of the same data, not a new data source.

### 11.8 Flow-Tracing Correlation

The `@hex-di/flow` library registers a `FlowTracingHook` that emits tracing spans for state machine transitions, activity execution, and effect processing. These spans carry `hex-di.flow.machine` and `hex-di.flow.transition` attributes. In the Tracing panel, these Flow-originated spans appear alongside container resolution spans in the same timeline. Developers can use the port name filter to isolate Flow spans or use the trace ID to see a full request trace that includes both DI resolution and Flow state transitions.

When a Flow library panel is also registered, clicking a `traceId` on a Flow machine entry in the Flow panel navigates to the Tracing panel filtered to that trace (see cross-panel navigation table in Section 12). Conversely, clicking a span with Flow attributes in the Tracing panel could navigate to the Flow library panel in future versions.

### 11.9 Interactions

**Filter controls**: The filter bar provides four controls:

- **Port name filter**: Text input that filters spans by `hex-di.port.name` attribute, case-insensitive substring match. Debounced by 150ms.
- **Min duration**: Numeric input that hides spans shorter than the given milliseconds. Useful for hiding fast cached resolutions to focus on slow ones.
- **Status filter**: Dropdown with options "all", "ok", "error", "unset".
- **Cached filter**: Dropdown with options "all", "cached", "uncached".

All filters are combined with AND logic.

**Span selection**: Clicking a span bar selects it and opens the detail panel below the timeline. The detail panel shows the full `SpanData` fields: trace ID, span ID, parent span ID, duration, status, cached status, scope ID, and all attributes as a key-value list.

**Timeline zoom**: Mouse wheel over the timeline area adjusts the time scale (pixels per millisecond). Zoom center is the cursor's time position. Minimum zoom: 0.1 px/ms (showing ~10 seconds in a 1000px wide panel). Maximum zoom: 10 px/ms (showing ~100ms in a 1000px wide panel).

**Timeline pan**: Click and drag on the timeline background to pan the time window. The time axis scrolls horizontally.

**Clear button**: The "Clear" button resets all filters to their defaults and deselects any selected span. It does not clear the span data itself (that is managed by the tracing library).

**Expand/collapse**: Clicking the triangle on a parent span row toggles its children's visibility. Keyboard: Enter/Space on a focused span row toggles expansion.

**Cross-panel navigation**: When a span's scope ID is displayed in the detail panel, clicking the scope ID navigates to the Scope Tree Panel and selects that scope. When a port name is displayed, clicking it navigates to the Container Panel and selects that port.

### 11.10 Empty States

- **No tracing inspector**: Panel tab is hidden (not shown at all).
- **Tracing inspector present, zero spans**: Show the header metrics (all zeros) and a centered message: "No spans recorded. Resolve services to see tracing data."
- **All spans filtered out**: Show the header metrics (from unfiltered data) and a centered message: "No spans match the current filters."

---

## Section 12: Library Panels and Event Log

This section covers two distinct panel types: the auto-discovered Library Panels (one per registered library inspector) and the always-available Event Log Panel.

### 12.1 Library Panels -- Purpose

Library Panels provide visibility into ecosystem libraries (Flow, Store, Saga, Query, etc.) that have registered a `LibraryInspector` with the container. Each registered library gets its own tab in the DevTools. The panel renders the library's snapshot as a structured data tree, and optionally renders a custom panel component if the library provides one.

### 12.2 Library Panels -- Availability

Auto-discovered. Library panel tabs appear and disappear dynamically as libraries register and unregister their inspectors. The panel list is derived from `inspector.getLibraryInspectors()` which returns `ReadonlyMap<string, LibraryInspector>`. The tab strip watches for `library-registered` and `library-unregistered` inspector events to add/remove tabs.

### 12.3 Library Panels -- Default Layout (Snapshot Tree)

When a library does not provide a custom panel component, the Library Panel renders the library's snapshot as a collapsible JSON-like tree:

```
+-------------------------------------------------------------+
| FLOW                                          [Refresh]      |
+-------------------------------------------------------------+
|                                                              |
| machineCount: 3                                              |
| v machines:                                                  |
|   v [0]:                                                     |
|       portName: "OrderFlow"                                  |
|       instanceId: "flow-abc"                                 |
|       state: "processing"                                    |
|       scopeId: "request-123"                                 |
|   > [1]: { portName: "AuthFlow", ... }                       |
|   > [2]: { portName: "CartFlow", ... }                       |
| v healthEvents:                                              |
|   v [0]:                                                     |
|       type: "state-transition"                               |
|       source: "OrderFlow"                                    |
|       timestamp: 1705330320123                               |
|   > [1]: { type: "activity-started", ... }                   |
| version: "1.0.0"                                             |
|                                                              |
+-------------------------------------------------------------+
```

### 12.4 Library Panels -- Snapshot Tree Rendering

The snapshot tree renderer takes an arbitrary `Readonly<Record<string, unknown>>` (the library inspector's `getSnapshot()` return value) and renders it as a recursive tree.

**Value type rendering rules**:

| Value Type           | Rendering                                                                          |
| -------------------- | ---------------------------------------------------------------------------------- |
| `string`             | Displayed in green with quotes: `"processing"`                                     |
| `number`             | Displayed in blue: `3`                                                             |
| `boolean`            | Displayed in purple: `true` / `false`                                              |
| `null` / `undefined` | Displayed in gray italic: `null` / `undefined`                                     |
| `object` (plain)     | Collapsible node with `v`/`>` toggle, key count in collapsed preview: `{ 4 keys }` |
| `Array`              | Collapsible node with `v`/`>` toggle, length in collapsed preview: `[ 3 items ]`   |
| `Map` / `Set`        | Converted to array/object representation for display                               |
| Functions            | Displayed as `[Function]` in gray italic                                           |

**Depth limit**: The tree renders up to 10 levels deep. Beyond that, a "..." indicator is shown with a tooltip saying "Maximum depth reached". This prevents rendering issues with deeply nested or circular structures.

**Collapsed preview**: When a node (object or array) is collapsed, a one-line preview is shown: for objects, up to 3 key names followed by "..." if more exist; for arrays, the length.

### 12.5 Library Panels -- Custom Panel Protocol

Libraries may provide a custom panel component for richer visualization. The DevTools checks for a custom panel provider through a convention-based approach:

```typescript
/**
 * Interface that a library's inspector can implement to provide a custom
 * DevTools panel instead of the default snapshot tree view.
 */
interface LibraryPanelProvider {
  /**
   * The React component to render as the panel content.
   * Receives the library snapshot, inspector API, and theme.
   */
  readonly panelComponent: React.ComponentType<LibraryPanelProps>;
}

/**
 * Props passed to custom library panel components.
 */
interface LibraryPanelProps {
  /** The library's current snapshot, re-fetched on each render. */
  readonly snapshot: Readonly<Record<string, unknown>>;
  /** The container's InspectorAPI for cross-cutting queries. */
  readonly inspector: InspectorAPI;
  /** The current DevTools theme for consistent styling. */
  readonly theme: ResolvedTheme;
}
```

The DevTools detects a custom panel by checking if the `LibraryInspector` object has a `panelComponent` property that is a function (React component). If present, the custom component is rendered instead of the default snapshot tree. If the property is absent or not a function, the default tree view is used.

Custom panels are rendered within a sandboxed error boundary. If the custom panel throws during render, the error boundary catches it and falls back to the default snapshot tree with an error banner: "Custom panel failed to render. Showing raw snapshot."

### 12.6 Library Panels -- Data Sources

Each library panel calls `inspector.getLibraryInspector(name)` to get the `LibraryInspector` instance, then calls `getSnapshot()` on it to get the snapshot data. The panel re-renders when inspector events of type `"library"` fire with a matching `source` field, or when `"snapshot-changed"` fires.

The "Refresh" button in the toolbar forces a re-fetch of the snapshot by calling `getSnapshot()` again. This is useful for pull-only library inspectors (like the tracing inspector) that do not emit push events.

### 12.7 Library Panels -- Interfaces

```typescript
/**
 * Props for the LibraryPanel component.
 */
interface LibraryPanelProps {
  readonly libraryName: string;
  readonly inspector: InspectorAPI;
  readonly theme: ResolvedTheme;
}

/**
 * State for the snapshot tree viewer.
 */
interface SnapshotTreeState {
  readonly expandedPaths: ReadonlySet<string>;
}
```

### 12.8 Library Panels -- Interactions

**Expand/collapse**: Click the toggle chevron to expand or collapse any object or array node. Default state: first level expanded, all others collapsed.

**Copy value**: Right-clicking a leaf value (string, number, boolean) shows a context menu with "Copy value" that copies the raw value to the clipboard. Right-clicking an object/array node shows "Copy JSON" that copies the serialized JSON (pretty-printed) to the clipboard.

**Refresh**: The "Refresh" button in the panel toolbar calls `getSnapshot()` again and re-renders the tree. The button shows a brief spinning animation during the re-fetch.

**Search**: A search input in the toolbar filters the tree to show only paths containing the search term (in key names or string values). Matching nodes and their ancestors are shown; non-matching branches are collapsed and hidden.

---

### 12.9 Event Log Panel -- Purpose

The Event Log Panel provides a chronological, filterable log of all inspector events. It is the unified audit trail for everything happening in the container: resolutions, scope lifecycle, library events, phase transitions, and result outcomes. It complements the other panels (which show current state) by showing the history of state changes over time.

### 12.10 Event Log Panel -- Availability

Always available.

### 12.11 Event Log Panel -- Layout

```
+-------------------------------------------------------------+
| EVENT LOG                  [Filter: ___] [Pause] [Clear]     |
| [Source: all v] [Type: all v]          [Auto-scroll: ON]     |
+-------------------------------------------------------------+
|                                                              |
| 14:32:00.123  container  resolution        AuthService       |
| 14:32:00.145  container  scope-created     request-abc       |
| 14:32:00.150  flow       state-transition  OrderFlow         |
| 14:32:00.180  tracing    span-complete     PaymentPort       |
| 14:32:00.200  container  resolution        UserRepo          |
| 14:32:00.220  container  result:ok         AuthService       |
| 14:32:00.250  store      state-changed     cartItems         |
| 14:32:00.300  container  result:err        PaymentPort       |
|   > PAYMENT_TIMEOUT                                          |
| 14:32:01.000  container  scope-disposed    request-xyz       |
| 14:32:01.100  container  phase-changed     initialized       |
|                                                              |
|                    Showing 10 of 234 events                  |
+-------------------------------------------------------------+
```

### 12.12 Event Log Panel -- Data Sources

The Event Log subscribes to the inspector's event stream via `inspector.subscribe(listener)`. Every `InspectorEvent` is captured and stored in an in-memory ring buffer.

The `InspectorEvent` discriminated union includes these event types (each mapped to a log entry):

| Event Type             | Source         | Description                  | Detail Column                             |
| ---------------------- | -------------- | ---------------------------- | ----------------------------------------- |
| `snapshot-changed`     | container      | Container state changed      | --                                        |
| `scope-created`        | container      | New scope created            | `scope.scopeId`                           |
| `scope-disposed`       | container      | Scope was disposed           | `scopeId`                                 |
| `resolution`           | container      | Port was resolved            | `portName` (+ `duration`ms, `isCacheHit`) |
| `phase-changed`        | container      | Lifecycle phase transition   | `phase`                                   |
| `init-progress`        | container      | Async init progress          | `portName` (`current`/`total`)            |
| `child-created`        | container      | Child container created      | `childId` (`childKind`)                   |
| `child-disposed`       | container      | Child container disposed     | `childId`                                 |
| `result:ok`            | container      | Port returned Ok result      | `portName`                                |
| `result:err`           | container      | Port returned Err result     | `portName` (+ `errorCode`)                |
| `result:recovered`     | container      | Port recovered from error    | `portName` (+ `fromCode`)                 |
| `library`              | `event.source` | Library-specific event       | `event.type` (+ `event.payload`)          |
| `library-registered`   | container      | Library inspector registered | `name`                                    |
| `library-unregistered` | container      | Library inspector removed    | `name`                                    |

### 12.13 Event Log Panel -- Ring Buffer

Events are stored in a ring buffer with a configurable maximum size (default: 500 events, configurable via `DevToolsConfig.eventLogBufferSize`). When the buffer is full, the oldest event is evicted to make room for the newest. The buffer is implemented as a fixed-size array with a write cursor that wraps around.

Each buffer entry stores:

```typescript
/**
 * A single entry in the event log ring buffer.
 */
interface EventLogEntry {
  /** Monotonically increasing sequence number for stable ordering. */
  readonly seq: number;
  /** Timestamp when the event was received (Date.now()). */
  readonly timestamp: number;
  /** Source category for filtering. */
  readonly source: string;
  /** Event type string for filtering. */
  readonly eventType: string;
  /** Human-readable summary for the detail column. */
  readonly summary: string;
  /** The original InspectorEvent for detail expansion. */
  readonly rawEvent: InspectorEvent;
}
```

The `source` field is derived from the event:

- For `library` events: `event.event.source` (the library name, e.g., "flow", "store", "tracing").
- For all other events: `"container"`.

The `summary` field is a human-readable string derived from the event type and its key fields. For example, a `resolution` event produces `"AuthService (45ms, cached)"`, a `result:err` event produces `"PaymentPort: PAYMENT_TIMEOUT"`, and a `scope-created` event produces `"request-abc"`.

### 12.14 Event Log Panel -- Interfaces

```typescript
/**
 * Props for the EventLogPanel component.
 */
interface EventLogPanelProps {
  readonly inspector: InspectorAPI;
  readonly theme: ResolvedTheme;
  readonly bufferSize?: number;
}

/**
 * Filter state for the event log.
 */
interface EventLogFilterState {
  readonly textFilter: string;
  readonly sourceFilter: string; // "all" or a specific source name
  readonly eventTypeFilter: string; // "all" or a specific event type
  readonly isPaused: boolean;
}

/**
 * Ring buffer interface for event storage.
 */
interface EventRingBuffer {
  /** Add an event to the buffer. */
  push(entry: EventLogEntry): void;
  /** Get all entries in chronological order (oldest first). */
  getAll(): readonly EventLogEntry[];
  /** Get the total number of events ever added (not just current buffer size). */
  getTotalCount(): number;
  /** Get the current number of entries in the buffer. */
  getSize(): number;
  /** Clear all entries. */
  clear(): void;
}
```

### 12.15 Event Log Panel -- Interactions

**Text filter**: The search input filters entries by substring match against the `summary` field and the `eventType` field. Case-insensitive. Debounced by 150ms.

**Source filter dropdown**: Filters entries by `source` field. Options are dynamically populated:

- "all" (default): Show all sources.
- "container": Show only container events.
- One entry per registered library name (e.g., "flow", "store", "tracing").

The library names are derived from `inspector.getLibraryInspectors().keys()` plus any library names seen in past events (to keep filter options available even after a library unregisters).

**Event type filter dropdown**: Filters entries by `eventType` field. Options include "all" plus every distinct event type seen so far (e.g., "resolution", "scope-created", "result:err", etc.). The option list grows as new event types are encountered.

**Pause/Resume**: The "Pause" button toggles event collection. When paused:

- New events are still received by the ring buffer (so no events are lost).
- The visible log stops updating (frozen in time).
- The button label changes to "Resume".
- A small badge on the button shows the count of new events since pause.

When resumed, the log jumps to the latest entries.

**Clear**: The "Clear" button empties the ring buffer and resets the total count display. This is an irreversible action. No confirmation dialog is needed (events are ephemeral debug data).

**Auto-scroll**: When enabled (default), the log automatically scrolls to the bottom when new events arrive. The "Auto-scroll" toggle in the toolbar turns this on/off. Auto-scroll is automatically disabled when the user manually scrolls up (away from the bottom), and automatically re-enabled when the user scrolls back to the bottom.

**Row expansion**: Clicking an event row expands it to show the full raw event payload as a formatted JSON tree (using the same snapshot tree renderer from Section 12.4). Clicking again collapses it. Only one row can be expanded at a time.

**Color coding**: Each event row is color-coded by source:

- `container`: Default text color (no special highlighting).
- Library events: Each library gets a deterministic color assigned from the theme's library color palette. The color is derived from the library name hash to ensure consistency across sessions. For example, "flow" might always be teal, "store" might always be amber, "tracing" might always be indigo.

Additionally, `result:err` events are rendered with the theme's error text color regardless of source.

### 12.16 Event Log Panel -- Performance

The event log uses virtual scrolling for the entry list. Only entries visible in the scroll viewport (plus a 20-row overscan buffer) are mounted as DOM elements. With the default 500-entry ring buffer, this means at most ~60 DOM elements regardless of how many events have been logged.

The ring buffer push operation is O(1) and allocation-free after initial buffer creation. Filter operations iterate the buffer array directly without creating intermediate arrays.

### 12.17 Event Log Panel -- Empty State

When no events have been received yet, the log area shows a centered message: "No events yet. Interact with the container to see events appear here."

---

## Cross-Panel Navigation Summary

The following cross-panel navigation links exist:

| From Panel      | Trigger                              | Target Panel  | Target Selection                   |
| --------------- | ------------------------------------ | ------------- | ---------------------------------- |
| Container       | Click dependency name in port detail | Container     | Scroll to and select that port row |
| Graph           | Click node                           | Graph         | Select node, show detail below     |
| Scope Tree      | Click port name in scope detail      | Container     | Scroll to and select that port row |
| Tracing         | Click scope ID in span detail        | Scope Tree    | Select that scope                  |
| Tracing         | Click port name in span detail       | Container     | Scroll to and select that port row |
| Event Log       | Click scope event's scope ID         | Scope Tree    | Select that scope                  |
| Event Log       | Click resolution event's port name   | Container     | Scroll to and select that port row |
| Flow (library)  | Click scopeId on machine entry       | Scope Tree    | Select that scope                  |
| Flow (library)  | Click portName on machine entry      | Container     | Scroll to and select that port row |
| Store (library) | Click scopeId on store entry         | Scope Tree    | Select that scope                  |
| Store (library) | Click traceId on dispatched action   | Tracing       | Filter by that traceId             |
| Tracing         | Click scopeId in span attributes     | Scope Tree    | Select that scope                  |
| Saga (library)  | Click portName on saga step          | Container     | Scroll to and select that port row |
| Graph Analysis  | Click portName in suggestion card    | Graph         | Select that node                   |
| Health Panel    | Click portName in diagnostic row     | Graph         | Select that node                   |
| Health Panel    | Click scopeId in scope leak alert    | Scope Tree    | Select that scope                  |
| Overview Panel  | Click library summary card           | Library Panel | Switch to that library's panel tab |
| Overview Panel  | Click container stat section         | Container     | Switch to Container panel          |

**Universal join keys**: Cross-panel navigation relies on three universal correlation identifiers:

- **`scopeId`** -- Correlates scope-related data across Container, Scope Tree, Tracing, and library panels. Any panel displaying a scope ID renders it as a clickable link to the Scope Tree.
- **`portName`** -- Correlates port/adapter data across Container, Graph, and library panels. Any panel displaying a port name renders it as a clickable link to the Container or Graph panel.
- **`traceId` / `spanId`** -- Correlates tracing data across Tracing and library panels. Any panel displaying a trace or span ID renders it as a clickable link to the Tracing panel with that trace filtered.

All cross-panel navigation is implemented via a shared navigation context (a React context providing a `navigateTo(panel, selection)` callback). The tab strip switches to the target panel and the target panel scrolls to / highlights the specified item.

---

## Section 13: Unified Overview Panel

### 13.1 Purpose

The Unified Overview Panel visualizes the "convergence point" described in VISION.md §5 -- the central location where all application self-knowledge comes together. It provides a single-screen summary of the entire DI ecosystem: container health, registered libraries, and headline metrics from each library. This is the starting point for developers who want a bird's-eye view before drilling into specific panels.

### 13.2 Availability

Always available. This is the first tab in the panel (order: 0), appearing before the Container panel.

### 13.3 Layout

```
+-------------------------------------------------------------+
| OVERVIEW                                          [Refresh]  |
+-------------------------------------------------------------+
|                                                              |
| CONTAINER                                                    |
| +----------+----------+----------+----------+                |
| | Phase    | Ports    | Resolved | Errors   |                |
| | running  | 24       | 18/24    | 2 ports  |                |
| +----------+----------+----------+----------+                |
|                                                              |
| LIBRARIES (5 registered)                                     |
| +---------------------------+---------------------------+    |
| | Flow                      | Tracing                   |    |
| | Machines: 3               | Total Spans: 1,247        |    |
| | Health Events: 2          | Error Count: 14           |    |
| +---------------------------+---------------------------+    |
| | Store                     | Saga                      |    |
| | Stores: 5                 | Active: 2                 |    |
| | Subscribers: 12           | Compensations: 0          |    |
| +---------------------------+---------------------------+    |
| | Logger                                                |    |
| | Total Entries: 8,412                                  |    |
| | Error Rate: 1.2%                                      |    |
| +-------------------------------------------------------+    |
|                                                              |
+-------------------------------------------------------------+
```

### 13.4 Data Sources

The Overview Panel consumes data from `inspector.getUnifiedSnapshot()` which returns a `UnifiedSnapshot` containing both `ContainerSnapshot` and all library snapshots.

**Container stat row**: Derived from `snapshot.container`:

- Phase: `snapshot.container.phase`
- Ports: total adapter count from `inspector.getAdapterInfo().length`
- Resolved: count of resolved singletons from `snapshot.container.singletons`
- Errors: count from `inspector.getHighErrorRatePorts(0.05)`

**Library summary cards**: Derived from `snapshot.libraries`. Each card extracts headline metrics based on the library name:

| Library Name | Metric 1                                     | Metric 2                                              |
| ------------ | -------------------------------------------- | ----------------------------------------------------- |
| Flow         | `machineCount` (Machines)                    | `healthEvents.length` (Health Events)                 |
| Tracing      | `totalSpans` (Total Spans)                   | `errorCount` (Error Count)                            |
| Store        | `stores.length` or `storeCount` (Stores)     | sum of `subscriberCount` across stores (Subscribers)  |
| Saga         | `sagas.length` or `activeSagaCount` (Active) | `failedCount` or compensation stats (Compensations)   |
| Logger       | `totalEntries` (Total Entries)               | error rate derived from `entriesByLevel` (Error Rate) |

**Unknown library fallback**: For libraries not in the above table, the card shows the library name and the number of top-level keys in the snapshot: "12 snapshot keys". This ensures new libraries display without requiring DevTools code changes.

### 13.5 Overview Panel Interfaces

```typescript
/**
 * Props for the OverviewPanel component.
 */
interface OverviewPanelProps {
  readonly inspector: InspectorAPI;
  readonly theme: ResolvedTheme;
}

/**
 * Derived headline metrics for a single library card.
 */
interface LibraryHeadlineMetrics {
  readonly libraryName: string;
  readonly metric1: { readonly label: string; readonly value: string | number };
  readonly metric2: { readonly label: string; readonly value: string | number };
}
```

### 13.6 Interactions

**Click library card**: Navigates to the corresponding library's panel tab via the shared navigation context.

**Click container stat section**: Navigates to the Container panel.

**Refresh button**: Forces a re-fetch of the unified snapshot.

**Reactive updates**: The panel subscribes to inspector events and re-renders when any snapshot changes. No polling.

### 13.7 Empty and Edge States

- **No libraries registered**: The library card grid is replaced with a centered message: "No library inspectors registered. Libraries that implement the LibraryInspector protocol will appear here."
- **Container disposed**: Container stat row shows "disposed" phase with grayed-out metrics. Library cards remain visible with their last known values.

---

## Section 14: Health & Diagnostics Panel

### 14.1 Purpose

The Health & Diagnostics Panel provides synthesized diagnostic queries that combine data across multiple layers of the nervous system (VISION.md §7). Instead of inspecting individual panels, this panel surfaces potential issues proactively: graph complexity warnings, blast radius analysis, captive dependency risks, scope leaks, and error hotspots. It is the "doctor's summary" view -- aggregated health signals with actionable insights.

### 14.2 Availability

Always available. Built-in panel with order: 7 (appears after library panels, before Event Log).

### 14.3 Layout

```
+-------------------------------------------------------------+
| HEALTH & DIAGNOSTICS                              [Refresh]  |
+-------------------------------------------------------------+
|                                                              |
| GRAPH HEALTH                                                 |
| +-----------------------------------------------------------+
| | Complexity: 42        [SAFE]                               |
| | 24 adapters | max depth 4 | avg fan-out 2.1               |
| | 3 suggestions | 0 orphans | 0 captive deps                |
| +-----------------------------------------------------------+
|                                                              |
| BLAST RADIUS ANALYSIS                                        |
| +-----------------------------------------------------------+
| | Port: [PaymentGateway v]                                   |
| | Direct dependents: 3                                       |
| |   OrderService, CheckoutService, RefundService             |
| | Transitive dependents: 7                                   |
| |   + CartService, ReceiptService, NotificationService, ...  |
| | Cross-library impact:                                      |
| |   Flow: 2 machines reference this port                     |
| |   Saga: 1 saga step depends on this port                   |
| +-----------------------------------------------------------+
|                                                              |
| CAPTIVE DEPENDENCY RISKS                                     |
| +-----------------------------------------------------------+
| | (none detected)                                            |
| +-----------------------------------------------------------+
|                                                              |
| SCOPE LEAK DETECTION                                         |
| +-----------------------------------------------------------+
| | ⚠ request-abc: active for 8m 32s (threshold: 5m)          |
| | ⚠ request-def: 142 children (threshold: 100)              |
| +-----------------------------------------------------------+
|                                                              |
| ERROR HOTSPOTS                                               |
| +-----------------------------------------------------------+
| | PaymentGateway: 14% error rate (threshold: 5%)             |
| |   Last error: PAYMENT_TIMEOUT (2m ago)                     |
| |   Tracing: 12 error spans in last 100 resolutions          |
| +-----------------------------------------------------------+
|                                                              |
+-------------------------------------------------------------+
```

### 14.4 Data Sources

| Diagnostic Section       | InspectorAPI Methods                                                       | @hex-di/graph Functions                     |
| ------------------------ | -------------------------------------------------------------------------- | ------------------------------------------- |
| Graph Health Summary     | `inspector.getGraphData()`                                                 | `inspectGraph()`, `analyzeComplexity()`     |
| Blast Radius Analysis    | `inspector.getGraphData()`, `inspector.queryLibraries()`                   | `getTransitiveDependents()`                 |
| Captive Dependency Risks | `inspector.getGraphData()`                                                 | `detectAllCaptivesAtRuntime()`              |
| Scope Leak Detection     | `inspector.getScopeTree()`                                                 | (heuristic, no graph function)              |
| Error Hotspots           | `inspector.getHighErrorRatePorts(0.05)`, `inspector.getResultStatistics()` | (cross-referenced with tracing error spans) |

### 14.5 Diagnostic Sections Detail

**1. Graph Health Summary**: Displays the complexity score from `analyzeComplexity()` as a numeric value with a recommendation badge (`safe`/`monitor`/`consider-splitting`). Below the score: adapter count, maximum dependency chain depth, average fan-out. Shows count of suggestions, orphan ports, and captive dependencies. All suggestion types link to the Graph Analysis sidebar.

**2. Blast Radius Analysis**: A port selector dropdown lists all registered ports. When a port is selected, the panel calls `getTransitiveDependents()` to show all ports that would be affected if the selected port fails or changes. Direct dependents are listed first, then transitive dependents. The panel also cross-references via `inspector.queryLibraries()` to show which libraries reference the selected port (e.g., "Flow: 2 machines reference this port").

**3. Captive Dependency Risks**: Results from `detectAllCaptivesAtRuntime()`. Each captive dependency pair (singleton holding a scoped reference) is shown as a warning card. If no captive dependencies are detected, shows "(none detected)" in `--hex-success` color.

**4. Scope Leak Detection**: Applies heuristics on `inspector.getScopeTree()`:

- **Age heuristic**: Any scope with `status: "active"` older than 5 minutes (configurable) is flagged as a potential leak.
- **Children heuristic**: Any scope with more than 100 children (configurable) is flagged.
- Scope age is estimated from the `scope-created` event timestamp tracked by the inspector.

**5. Error Hotspots**: Calls `inspector.getHighErrorRatePorts(0.05)` (5% threshold) and for each high-error port, shows the error rate, last error code (from `getResultStatistics()`), and cross-references with tracing error spans if the tracing library inspector is available.

### 14.6 Health Panel Interfaces

```typescript
/**
 * Props for the HealthPanel component.
 */
interface HealthPanelProps {
  readonly inspector: InspectorAPI;
  readonly theme: ResolvedTheme;
}

/**
 * Aggregated health diagnostics state.
 */
interface HealthDiagnostics {
  readonly complexityScore: number;
  readonly recommendation: "safe" | "monitor" | "consider-splitting";
  readonly adapterCount: number;
  readonly maxDepth: number;
  readonly avgFanOut: number;
  readonly suggestionCount: number;
  readonly orphanCount: number;
  readonly captiveCount: number;
  readonly scopeLeaks: readonly ScopeLeakInfo[];
  readonly errorHotspots: readonly ErrorHotspot[];
}

/**
 * Information about a potentially leaked scope.
 */
interface ScopeLeakInfo {
  readonly scopeId: string;
  readonly reason: "age" | "children";
  readonly value: number;
  readonly threshold: number;
}

/**
 * Result of blast radius analysis for a selected port.
 */
interface BlastRadiusResult {
  readonly portName: string;
  readonly directDependents: readonly string[];
  readonly transitiveDependents: readonly string[];
  readonly libraryImpact: readonly {
    readonly libraryName: string;
    readonly description: string;
  }[];
}

/**
 * A port with elevated error rate.
 */
interface ErrorHotspot {
  readonly portName: string;
  readonly errorRate: number;
  readonly lastErrorCode: string | undefined;
  readonly tracingErrorSpans: number | undefined;
}
```

### 14.7 Interactions

**Port names are clickable**: Clicking any port name in diagnostic rows navigates to the Graph panel and selects that node.

**Scope IDs are clickable**: Clicking any scope ID in scope leak alerts navigates to the Scope Tree panel and selects that scope.

**Library names are clickable**: Clicking a library name in blast radius cross-library impact navigates to that library's panel.

**Blast radius dropdown**: Selecting a port from the dropdown triggers the blast radius computation. The computation is debounced by 300ms to avoid excessive recalculation during rapid dropdown navigation.

**Debounced recalculation**: All diagnostics are recalculated when inspector events fire, debounced by 1 second. This prevents excessive computation during rapid container changes (e.g., during initialization).

**Refresh button**: Forces immediate recalculation of all diagnostics, bypassing the debounce.

### 14.8 Empty and Edge States

- **No graph data**: Graph Health section shows "Graph data not available" in muted text.
- **No high error ports**: Error Hotspots section shows "No error hotspots detected" in `--hex-success` color.
- **No scope leaks**: Scope Leak Detection section shows "No scope leaks detected" in `--hex-success` color.
- **No tracing inspector**: Error hotspot cross-referencing with tracing spans is omitted; the tracing column shows "--".

### 14.9 Relationship to @hex-di/health (Phase 5)

VISION.md Phase 5 (§5.4) defines a future `@hex-di/health` package with a `HealthEngine` that produces a weighted `HealthReport` combining signals from graph complexity, error rates, P95 latency, cache hit rates, scope leak counts, circuit breaker states, dead letter queue sizes, and compensation failures. The Health & Diagnostics Panel in DevTools v0.1.0 implements a subset of those diagnostics using ad-hoc queries against `InspectorAPI` and `@hex-di/graph`.

When `@hex-di/health` is implemented, the Health panel should be refactored to consume the `HealthEngine` as a `LibraryInspector` rather than computing diagnostics internally. The `HealthReport` interface from Phase 5 provides `overallScore`, `status`, `signals[]`, and `recommendations[]` — all of which map directly to the panel's existing sections. This refactoring will:

- Replace the panel's internal complexity scoring with `HealthEngine.assess()`
- Replace the internal scope leak heuristics with the health package's `LeakDetector`
- Add new diagnostic signals (P95 latency, cache hit rate, circuit breakers) that the v0.1.0 panel does not cover
- Unify the scoring model so the DevTools panel and any MCP/A2A diagnostic queries use the same health engine

Until `@hex-di/health` exists, the v0.1.0 panel's internal diagnostics are the correct implementation. The interfaces in Section 14.6 (`HealthDiagnostics`, `ScopeLeakInfo`, `BlastRadiusResult`, `ErrorHotspot`) are intentionally compatible with the Phase 5 `HealthSignal` shape to minimize the future refactoring surface.

---

## Section 15: Library Panel Roadmap

### 15.1 Purpose

This section outlines the evolution of library panels from generic JSON tree views (v0.1.0) to dedicated, domain-specific visualizations (future versions). In v0.1.0, all library panels render their snapshot as a collapsible JSON tree. Future versions will provide rich visualizations tailored to each library's domain.

### 15.2 Roadmap Table

| Library    | v0.1.0 Default Panel                 | Future Dedicated Panel                                                                                                                  |
| ---------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Flow**   | JSON tree of `FlowLibrarySnapshot`   | State machine diagram: statechart visualization showing current state, available transitions, active activities, and transition history |
| **Store**  | JSON tree of `StoreLibrarySnapshot`  | Value inspector: state diff viewer, subscriber dependency graph, action timeline with undo/redo                                         |
| **Saga**   | JSON tree of `SagaLibrarySnapshot`   | Workflow visualization: step sequence diagram, compensation track with status badges, retry counters, and elapsed time per step         |
| **Query**  | JSON tree of `QueryLibrarySnapshot`  | Cache table: sortable key/status/freshness columns, staleness indicators, manual refetch button per entry, background refetch indicator |
| **Logger** | JSON tree of `LoggerLibrarySnapshot` | Log stream: scrollable log entries with level colors, sampling rate indicator, error rate sparkline, and source filter                  |

### 15.3 Delivery Model

Dedicated panels are shipped by each library package, not by `@hex-di/devtools`. Each library registers its custom panel component via the `LibraryPanelProvider` interface (see Section 12.5). This means:

- `@hex-di/flow` ships its own state machine diagram panel component.
- `@hex-di/store` ships its own value inspector panel component.
- `@hex-di/devtools` does not need to depend on any library package.
- New libraries can ship custom panels without modifying `@hex-di/devtools`.

The JSON tree fallback always remains available. If a library's custom panel fails to render, the DevTools error boundary falls back to the JSON tree view.

---

## Data Refresh Strategy

All panels share the same data refresh strategy:

1. **Push-based reactivity**: Panels subscribe to inspector events via `useSyncExternalStore`. When any inspector event fires, the affected hooks re-compute their derived state, and React re-renders only the changed UI.

2. **No polling**: No panel uses `setInterval` or `requestAnimationFrame` for data refresh. All updates are event-driven.

3. **Snapshot stability**: The `useSyncExternalStore` hooks (useSnapshot, useScopeTree, useUnifiedSnapshot, useTracingSummary) employ referential stability checks -- they return the previous snapshot reference when the data has not changed, preventing unnecessary re-renders.

4. **Pull-on-demand for tracing**: The tracing library inspector is pull-only (no subscribe method). The Tracing Panel re-queries span data whenever any inspector event fires, since resolution events may have produced new spans. This is the one exception to pure push-based updates, but it is still event-triggered, not polled.

---

> Previous: [03-architecture.md](./03-architecture.md) | Next: [05-theming.md](./05-theming.md)
