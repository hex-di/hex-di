# Interactions

_Previous: [Layout and Wireframes](02-layout-and-wireframes.md) | Next: [Visual Encoding](04-visual-encoding.md)_

---

## 5. Interaction Model

### 5.1 Container Switching

- Click the container selector dropdown to reveal all available containers.
- Each entry displays: container name, kind badge (`[root]`, `[child]`, `[lazy]`), adapter count, and for child containers, the parent name.
- Selecting a container updates `selectedContainerName`, triggers a dagre re-layout, and resets the viewport to fit-all.
- A "Compare" option at the bottom opens the multi-container comparison view.

### 5.2 Node Selection and Multi-Selection

- **Single click** on a node selects it, clears any previous selection, and opens the NodeDetailPanel.
- **Shift+Click** on a node toggles it in the multi-selection set.
- **Click on background** clears all selections and closes the NodeDetailPanel.
- When a single node is selected, its direct dependency edges and direct dependent edges are highlighted. All other nodes and edges dim to 40% opacity.
- When multiple nodes are selected, all edges connecting any selected nodes are highlighted.

### 5.3 Edge Following

- **Click** an edge to select both its source and target nodes.
- **Hover** an edge to show a tooltip: "SourcePort -> TargetPort".

### 5.4 Pan, Zoom, Fit

- **Pan**: Click and drag on the graph background.
- **Zoom**: Mouse wheel; zoom center is cursor position. Clamped to 0.1-3.0.
- **Zoom +/-**: Toolbar buttons, increment/decrement by 0.25.
- **Fit**: Toolbar button, computes zoom and pan to fit all visible nodes within the viewport with 20px margin.
- **Reset**: Double-click on background resets to zoom=1, panX=0, panY=0.

### 5.5 Drag to Reposition Nodes

- **Click and hold** on a node (after 200ms) enters drag mode.
- Dragging repositions the node. The layout engine does not re-run; only the dragged node's position updates.
- Connected edges re-route to follow the dragged node.
- Releasing the mouse commits the new position.

### 5.6 Filter Application

- Opening the filter panel reveals all filter controls.
- Changing any filter immediately updates the graph. Nodes that do not match the filter fade to 15% opacity (they remain in the layout to preserve spatial stability).
- The toolbar Filter button shows a badge with the count of active filter criteria.
- Text search in the filter panel is debounced by 150ms.
- "Clear All" resets all filters to their default (no-filter) state.

### 5.7 Metadata Expansion

- Click "View Full Metadata" in the NodeDetailPanel to open the MetadataInspectorPanel.
- Each section (port, adapter, custom, library) is independently collapsible.
- Custom metadata renders as a JSON tree viewer (reuse the shared `JsonTreeViewer` component).

### 5.8 Keyboard Navigation

| Key                       | Context                | Action                                       |
| ------------------------- | ---------------------- | -------------------------------------------- |
| `Tab`                     | Graph focused          | Cycle focus between nodes in layout order    |
| `Enter`                   | Node focused           | Select focused node                          |
| `Escape`                  | Node selected          | Deselect all; close detail panel             |
| `Escape`                  | Analysis/Metadata open | Close sidebar                                |
| `ArrowUp/Down/Left/Right` | Graph focused          | Move focus to nearest node in that direction |
| `+` / `-`                 | Graph focused          | Zoom in/out                                  |
| `0`                       | Graph focused          | Fit to view                                  |
| `/`                       | Graph focused          | Open filter panel, focus search input        |
| `a`                       | Graph focused          | Toggle analysis sidebar                      |
| `m`                       | Graph focused          | Toggle minimap                               |
| `Shift+Click`             | Node                   | Multi-select toggle                          |

### 5.9 Context Menu on Nodes

Right-click on a node opens a context menu:

- **Highlight Dependency Chain**: Highlights all transitive dependencies.
- **Highlight Dependents**: Highlights all transitive dependents.
- **Highlight Blast Radius**: Highlights the union of dependencies and dependents.
- **View Metadata**: Opens the MetadataInspectorPanel.
- **Go to Container Panel**: Navigates to the Container Panel with this port selected.
- **Go to Tracing**: Navigates to the Tracing Panel filtered by this port name.
- **Copy Port Name**: Copies the port name to clipboard.
- **Export Subgraph**: Exports the selected node and its transitive dependencies as DOT.
- **Find Path To...**: Opens a port name search. Selecting a target port highlights the shortest dependency path between the right-clicked node and the target. Uses `findDependencyPath()`.
- **Show Common Dependencies**: (Only in multi-selection context menu.) Highlights all ports that are transitive dependencies of every selected node. Uses `findCommonDependencies()`.

---

### 5.10 Advanced Traversal

When two or more nodes are selected via multi-select:

- The "Show Common Dependencies" context menu option becomes available.
- Common dependencies are highlighted with `--hex-accent-muted` fill. Non-common nodes dim to 40% opacity.
- A count badge shows "N common dependencies".

**Dependency Layers**: The analysis sidebar's "Chain Analysis" section (10.7) includes a layer indicator showing each node's initialization layer from `computeDependencyLayers()`. Layer 0 nodes have no dependencies; higher layers depend on lower layers.
