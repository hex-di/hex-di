# Panels Integration

_Previous: [Analysis Sidebar](08-analysis-sidebar.md) | Next: [Accessibility](10-accessibility.md)_

---

## 11. Real-Time Updates

### 11.1 Event Subscription

The Graph Panel subscribes to `InspectorDataSource.subscribe()` for `InspectorEvent` updates. The panel re-renders via `useSyncExternalStore` when data changes.

### 11.2 New Adapter Registration

When `getGraphData()` returns a new adapter not present in the previous snapshot:

- The dagre layout re-runs to incorporate the new node.
- The new node animates into position over 300ms using CSS transitions.
- If animations are reduced (`prefers-reduced-motion`), the node appears immediately.

### 11.3 Adapter Disposal

When an adapter disappears from `getGraphData()`:

- The node fades out over 300ms, then is removed from the SVG.
- Connected edges fade out simultaneously.
- The layout re-runs after removal.

### 11.4 Scope Creation/Disposal

Scope events do not directly affect the graph (scopes are visualized in the Scope Tree panel). However, if a scoped adapter's resolution status changes, the node opacity updates.

### 11.5 Resolution Events

When `isResolved` changes for a node:

- The node's fill opacity transitions from 0.5 to 1.0 (or vice versa) over 200ms.

### 11.6 Error Rate Changes

When `ResultStatistics` update for a port:

- The error rate badge updates its value.
- If the error rate crosses the 10% threshold, the warning badge appears/disappears with a fade transition.

### 11.7 Container Hierarchy Changes

When new containers appear (lazy container loads, child container created):

- The container selector dropdown updates.
- A brief highlight animation on the dropdown indicates the change.

### 11.8 Animation Preferences

All animations respect `prefers-reduced-motion`:

- When reduced motion is preferred, transitions are instant (0ms duration).
- Node position changes appear immediately rather than animating.
- Flash highlights are replaced by persistent border highlights lasting 2 seconds.

---

## 12. Cross-Panel Navigation

### 12.1 Outbound Links (Graph Panel -> Other Panels)

| Trigger                                      | Target Panel     | Target Selection                       |
| -------------------------------------------- | ---------------- | -------------------------------------- |
| Click port name in NodeDetailPanel           | Container Panel  | Select that port in the registry table |
| Click "Go to Tracing" in NodeDetailPanel     | Tracing Panel    | Filter by that port name               |
| Click scopeId in NodeDetailPanel (if scoped) | Scope Tree Panel | Select that scope                      |
| Click library kind badge on a store node     | Store Panel      | Select that port                       |
| Click library kind badge on a query node     | Query Panel      | Select that port                       |
| Click library kind badge on a saga node      | Saga Panel       | Select that port                       |
| Click library kind badge on a flow node      | Flow Panel       | Select that port                       |

### 12.2 Inbound Links (Other Panels -> Graph Panel)

| Source Panel | Trigger                              | Graph Panel Behavior                                     |
| ------------ | ------------------------------------ | -------------------------------------------------------- |
| Overview     | Click "Graph" summary card           | Switch to Graph Panel, show full graph                   |
| Container    | Click "View in Graph" on a port row  | Switch to Graph Panel, select that node, center viewport |
| Scope Tree   | Click "View Dependencies" on a scope | Switch to Graph Panel, filter to adapters in that scope  |
| Tracing      | Click port name in a trace entry     | Switch to Graph Panel, select that node                  |

### 12.3 Navigation Implementation

All cross-panel navigation uses the shared `navigateTo(panel, selection)` callback. The Graph Panel reads the `selection` parameter on mount:

```typescript
interface GraphNavigationSelection {
  readonly portName?: string;
  readonly containerName?: string;
  readonly highlightChain?: boolean;
}
```

When `portName` is provided, the panel selects that node and centers the viewport on it. When `containerName` is provided, the container selector switches to that container. When `highlightChain` is true, the transitive dependency chain is highlighted.

---

## 13. Export and Sharing

### 13.1 DOT Format Export

Clicking "Export > DOT" in the toolbar copies a GraphViz DOT string to the clipboard. The export delegates to `@hex-di/graph`'s existing `toDotGraph()` utility. The DOT output includes:

- Nodes for each port, labeled with port name and lifetime.
- Directed edges for dependency relationships.
- Subgraph clusters grouped by category (when categories are present).
- Visual markers for overrides and orphan ports.

### 13.2 Mermaid Format Export

Clicking "Export > Mermaid" copies a Mermaid flowchart string to the clipboard. Delegates to `@hex-di/graph`'s existing `toMermaidGraph()` utility.

### 13.3 PNG/SVG Screenshot

Clicking "Export > PNG" or "Export > SVG" captures the current graph viewport:

- The SVG is serialized from the current DOM, including applied styles.
- For PNG, the SVG is rendered to a canvas and exported as a data URL.
- A download dialog opens with a suggested filename: `hex-graph-{containerName}-{timestamp}.{ext}`.

### 13.4 URL with Selection State

The panel encodes the current selection state into URL query parameters:

- `?graph-container={containerName}&graph-node={portName}&graph-filter={base64EncodedFilter}`
- When the panel loads with these parameters, it restores the selection and filter state.
- "Copy Link" button in the toolbar copies the current URL with these parameters.

### 13.5 JSON Inspection Export

Clicking "Export > JSON" downloads a JSON file containing the full `GraphInspectionJSON` from `inspectionToJSON()`:

- Includes all inspection fields: adapter count, dependency map, suggestions, complexity score, ports, direction summary, correlation ID, and actor (when present).
- The JSON includes a `version: 1` field for forward compatibility.
- Filename follows: `hex-inspection-{containerName}-{timestamp}.json`.
- Useful for CI integration, programmatic analysis, and audit records.

### 13.6 Structured Log Export

Clicking "Export > Structured Logs" downloads a JSON array of structured log entries from `toStructuredLogs()`:

- Each entry contains a severity level, message, and structured fields.
- Suitable for import into log aggregation systems (ELK, Datadog, etc.).
- Filename follows: `hex-logs-{containerName}-{timestamp}.json`.

---

## 14. Performance

### 14.1 Viewport Culling

For containers with more than 50 adapters, the graph panel employs viewport culling: only nodes and edges within the visible viewport (plus a 200px margin) are rendered as SVG elements. Nodes outside the viewport are removed from the DOM but their layout positions are retained.

### 14.2 Layout Caching

The dagre layout computation result is memoized by a cache key derived from: adapter count, sorted port names hash, and layout direction. Layout only re-runs when the cache key changes.

### 14.3 Virtualized Detail Panels

The NodeDetailPanel, MetadataInspectorPanel, and AnalysisSidebar use virtual scrolling for lists longer than 50 items (e.g., many dependencies, many suggestions).

### 14.4 Debounced Filter Application

Filter state changes are debounced by 150ms before triggering a re-render of the graph. The debounce applies to text search, category input, and tag input. Checkbox and radio changes apply immediately.

### 14.5 Web Worker for Layout Computation

When the adapter count exceeds 100, the dagre layout computation is offloaded to a Web Worker to avoid blocking the main thread. The panel shows a brief loading indicator ("Computing layout...") while the worker runs. The worker receives serialized graph data and returns serialized layout positions.

### 14.6 Large Graph Warning

When the adapter count exceeds 200, the panel shows a warning banner: "Large graph ({N} adapters). Consider filtering or splitting into subgraphs for better performance." The warning includes a one-click action to apply the "show only high-error ports" filter preset.
