# Accessibility

_Previous: [Panels Integration](09-panels-integration.md) | Next: [Definition of Done](11-definition-of-done.md)_

---

## 16. Accessibility

### 16.1 ARIA Roles

- The graph SVG has `role="img"` with `aria-label="Dependency graph for {containerName}"`.
- Each node group has `role="button"` with `aria-label="{portName}, {lifetime}, {origin}"`.
- The NodeDetailPanel has `role="complementary"` with `aria-label="Node details for {portName}"`.
- The AnalysisSidebar has `role="complementary"` with `aria-label="Graph analysis"`.
- The container selector uses `role="listbox"` with `role="option"` for each entry.
- Filter panel checkboxes use standard `role="checkbox"` with `aria-checked`.
- Filter panel radio groups use `role="radiogroup"` with `role="radio"`.

### 16.2 Keyboard Navigation

- All nodes are focusable via Tab (tabindex="0" on each node group).
- Arrow keys move focus between nodes in spatial layout order (nearest neighbor in that direction).
- Enter selects the focused node. Shift+Enter toggles multi-selection.
- Escape deselects and closes panels.
- The toolbar, filter panel, and sidebars are in the Tab order after the graph canvas.

### 16.3 Screen Reader Announcements

- When a node is selected: "Selected {portName}, {lifetime} {origin} adapter with {N} dependencies and {M} dependents."
- When a filter is applied: "Filter applied. Showing {N} of {M} adapters."
- When analysis sidebar opens: "Graph analysis: complexity score {N}, {M} suggestions."
- When container switches: "Switched to container {name}, {kind}, {N} adapters."

### 16.4 Color Independence

Color is never the sole indicator of any state. All color-encoded properties have redundant indicators:

- Lifetime: Color + label text ("singleton", "scoped", "transient").
- Origin: Border style (solid/dashed/double) + label text.
- Library kind: Shape + icon/letter badge.
- Error rate: Badge with numeric percentage.
- Inheritance mode: Badge with letter + label text.
- Direction: Arrow icon + label text.

### 16.5 Focus Management

- When selecting a node, focus moves to the NodeDetailPanel's first interactive element.
- When pressing Escape, focus returns to the previously focused node in the graph.
- When opening the filter panel, focus moves to the search input.
- When closing any sidebar, focus returns to the toolbar button that opened it.

---

## 17. Edge States

### 17.1 Empty Graph (No Adapters)

```
+-----------------------------------------------------------------------+
| DEPENDENCY GRAPH                                                      |
+-----------------------------------------------------------------------+
|                                                                       |
|                                                                       |
|                  No adapters registered.                              |
|                                                                       |
|           Register adapters in a graph and create a container         |
|           to see the dependency graph here.                           |
|                                                                       |
+-----------------------------------------------------------------------+
```

Text is centered, `--hex-text-muted`, `--hex-font-size-md`.

### 17.2 Loading State

When graph data is being fetched (data source returns undefined):

```
+-----------------------------------------------------------------------+
| DEPENDENCY GRAPH                                                      |
+-----------------------------------------------------------------------+
|                                                                       |
|                    Loading graph data...                              |
|                    [spinner animation]                                |
|                                                                       |
+-----------------------------------------------------------------------+
```

### 17.3 Container Disposed

When the active container's snapshot shows `isDisposed: true`:

- The graph remains visible but all nodes and edges render at 30% opacity.
- A banner appears at the top: "Container '{name}' has been disposed." with `--hex-warning` background.
- The NodeDetailPanel shows "(disposed)" next to the container name.

### 17.4 Data Source Disconnected

When the data source loses connection (remote transport):

- The graph shows the last known state with a "Disconnected" banner.
- A pulsing red dot indicator appears next to the container name.
- All interactive features remain functional on the stale data.
- When reconnection occurs, the graph updates to the latest data.

### 17.5 Large Graph (100+ Adapters)

- Viewport culling activates automatically.
- A performance warning banner appears at 200+ adapters.
- The minimap becomes especially useful and is auto-shown.
- The filter panel suggests applying a filter to reduce visible nodes.

### 17.6 All Nodes Filtered Out

When the active filter matches zero nodes:

```
+-----------------------------------------------------------------------+
|                                                                       |
|          No adapters match the current filter.                       |
|                                                                       |
|          [Clear Filters]                                              |
|                                                                       |
+-----------------------------------------------------------------------+
```

### 17.7 Single Node Graph

When only one adapter is registered:

- The node is centered in the viewport.
- No edges are rendered.
- The Fit button has no effect (already centered).
- The analysis sidebar shows minimal data (complexity score near 0, no suggestions).

### 17.8 Depth Limit Exceeded

When the graph inspection has `depthLimitExceeded: true`:

- An error banner appears below the toolbar: "Depth limit exceeded. Cycle detection results may be incomplete."
- The banner uses `--hex-error` background with a warning icon.
- The analysis sidebar's depth warning section (10.9) provides additional detail.

### 17.9 Container Loading

When the active container's phase is `"loading"` (lazy container being initialized):

- The graph canvas shows a skeleton layout with placeholder node rectangles at 20% opacity.
- A "Loading container '{name}'..." message with spinner appears centered.
- The toolbar buttons (filter, export, analysis) are disabled during loading.

### 17.10 Container Disposing

When the active container's phase is `"disposing"`:

- The graph remains visible but all interactions are disabled.
- A banner appears: "Container '{name}' is being disposed..." with `--hex-warning` background and a spinner.
- Once the phase transitions to `"disposed"`, the standard disposed state (17.3) takes over.
