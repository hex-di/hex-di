# Container Hierarchy

_Previous: [Visual Encoding](04-visual-encoding.md) | Next: [Metadata and Detail](06-metadata-and-detail.md)_

---

## 7. Container Hierarchy View

### 7.1 Multiple Container Display

The container selector dropdown lists all containers returned by the data source. Containers are grouped by hierarchy: root containers first, then child containers indented under their parent, then lazy containers.

### 7.2 Container Kind Badges

Each container name in the selector and header displays a badge:

| Kind  | Badge     | Color                         |
| ----- | --------- | ----------------------------- |
| root  | `[root]`  | `--hex-accent` background     |
| child | `[child]` | `--hex-info` background       |
| lazy  | `[lazy]`  | `--hex-warning` background    |
| scope | `[scope]` | `--hex-text-muted` background |

### 7.3 Inheritance Flow Visualization

When viewing a child container's graph:

- Nodes that are inherited from the parent display with dashed borders.
- Nodes that are overridden display with double borders and an "OVR" badge.
- Each inherited node shows its inheritance mode badge (shared/forked/isolated).
- Edges from inherited nodes use dashed stroke to indicate they originate from the parent graph.

### 7.4 Override Chains

When a node is overridden, the NodeDetailPanel shows an "Override Chain" section:

- Lists the original adapter (from the parent) and the overriding adapter (in the child).
- If a multi-level override exists (grandchild overrides child override of parent), the full chain is displayed.

### 7.5 Comparison Mode

In comparison mode (triggered from the container selector "Compare" option):

- Two containers are rendered side-by-side with synchronized zoom.
- Nodes that exist in both containers are aligned horizontally.
- Nodes unique to one container are highlighted with `--hex-info-muted` background.
- Overridden nodes are connected by a horizontal dotted line between the two panes.

### 7.6 Container Phase Display

The container selector and graph header display the container's current `ContainerPhase`. Phases and their display:

| Phase           | Display                          | Visual             |
| --------------- | -------------------------------- | ------------------ |
| `uninitialized` | "(uninitialized)" badge          | `--hex-text-muted` |
| `initialized`   | No badge (default state)         | —                  |
| `loading`       | "(loading...)" badge + spinner   | `--hex-warning`    |
| `loaded`        | No badge                         | —                  |
| `active`        | No badge (default for root)      | —                  |
| `disposing`     | "(disposing...)" badge + spinner | `--hex-warning`    |
| `disposed`      | "(disposed)" badge               | `--hex-error`      |

Only non-default phases display a badge. The `unloaded` phase applies to lazy containers before first load and is shown as "(not loaded)" with `--hex-text-muted`.
