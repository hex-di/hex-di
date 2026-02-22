# Analysis Sidebar

_Previous: [Filter System](07-filter-system.md) | Next: [Panels Integration](09-panels-integration.md)_

---

## 10. Graph Analysis Sidebar

### 10.1 Complexity Score Gauge

- A horizontal gauge bar showing the `typeComplexityScore` (0-150+ scale).
- Green zone (0-50), amber zone (51-100), red zone (101+).
- The `performanceRecommendation` badge: `[safe]` green, `[monitor]` amber, `[consider-splitting]` red.
- Breakdown row: adapter count, max chain depth, average fan-out (total edges / adapter count).

### 10.2 Suggestions List

Each `GraphSuggestion` renders as a card with:

- Type badge with color: `missing_adapter` (red), `depth_warning` (amber), `orphan_port` (gray), `disposal_warning` (amber), `unnecessary_lazy` (gray), saga-specific types (amber).
- `portName` rendered as a clickable link. Clicking pans the graph to center on that node and selects it.
- `message` as body text.
- `action` as a call-to-action line in `--hex-text-secondary`.

### 10.3 Captive Dependency Detection

Results from `detectAllCaptivesAtRuntime()`. Each entry shows:

- The dependent port (longer-lived, e.g., singleton) and the captive port (shorter-lived, e.g., scoped).
- Both port names are clickable to select the respective graph node.
- A visual "captures" arrow between the two names.

### 10.4 Orphan Ports

Collapsible list from `GraphInspection.orphanPorts`. Each port name is clickable to select and center.

### 10.5 Disposal Warnings

Warning text blocks from `GraphInspection.disposalWarnings`. Each warning mentions port names which are rendered as clickable links.

### 10.6 Unnecessary Lazy Ports

List from `GraphInspection.unnecessaryLazyPorts`. Each port name is clickable.

### 10.7 Dependency Chain Analysis

When a node is selected and the analysis sidebar is open, an additional "Chain Analysis" section appears:

- Shows the full transitive dependency chain from the selected node to all its leaf dependencies.
- Shows the full transitive dependent chain (all nodes that depend on the selected node).
- Displays the depth of the longest chain.

### 10.8 Blast Radius Visualization

Available from the node context menu. When triggered:

- All transitive dependencies AND all transitive dependents of the selected node are highlighted.
- Non-blast-radius nodes dim to 20% opacity.
- A count badge shows: "Blast radius: N nodes".
- Click anywhere on the background to exit blast radius mode.

### 10.9 Depth Warning

When `GraphInspection.depthWarning` is present, a warning banner appears at the top of the analysis sidebar:

- The `depthWarning` text (e.g., "Depth 42 approaching compile-time limit of 50") displayed with `--hex-warning` background.
- When `depthLimitExceeded` is `true`, the banner uses `--hex-error` background and the text changes to: "Depth limit exceeded. Cycle detection may be incomplete — verify manually."
- The `maxChainDepth` value is shown next to the complexity gauge breakdown row.

### 10.10 Initialization Order

A collapsible "Initialization Order" section showing the topological sort of all adapters from `topologicalSort()`:

- Adapters listed in initialization order (layer 0 first, deepest last).
- Each entry shows its layer number (from `computeDependencyLayers()`) as a leading badge.
- Clicking a port name selects and centers that node in the graph.
- When topological sort returns `null` (cycle detected), the section shows "Cycle detected — initialization order unavailable" with `--hex-error` color.
