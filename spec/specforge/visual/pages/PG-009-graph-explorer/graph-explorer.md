# PG-009 Graph Explorer

**ID:** PG-009-graph-explorer
**Route:** `#graph`
**Layout:** single-column (split view within content area)
**Context:** Text-based knowledge graph explorer with node and edge lists.

---

## Overview

The Graph Explorer page provides visibility into the knowledge graph built during a session. It is currently a text-only explorer with plans for a future D3.js force-directed visualization. The page layout consists of a connection status banner at the very top, a filter bar below it, and a two-column split view showing the node list on the left and the edge list on the right. The connection banner provides real-time feedback on the graph service connection state.

**KEY DESIGN GAP**: This page is currently text-only lists. The specification designs a richer explorer with typed node colors, relationship filtering, and view-mode presets as a stepping stone toward a full graph visualization.

---

## ASCII Wireframe

```
 Graph Explorer Page (single-column, full content width)
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │                                                                                  │
 │  Connection Status Banner (CMP-022, full width)                                  │
 │  ┌──────────────────────────────────────────────────────────────────────────────┐│
 │  │  [*] Connected to graph service            12 nodes  |  18 edges           ││
 │  └──────────────────────────────────────────────────────────────────────────────┘│
 │                                                                                  │
 │  Filter Bar (CMP-004)                                                            │
 │  ┌──────────────────────────────────────────────────────────────────────────────┐│
 │  │                                                                              ││
 │  │  ┌──────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐   ││
 │  │  │ Node Types       │  │ Relationship Types   │  │ Search nodes...      │   ││
 │  │  │  [multi-select]  │  │  [multi-select]      │  │  [text input]        │   ││
 │  │  └──────────────────┘  └──────────────────────┘  └──────────────────────┘   ││
 │  │                                                                              ││
 │  │  View Mode:                                                                  ││
 │  │  ┌────────────┐┌─────────┐┌───────────────┐┌───────────┐                    ││
 │  │  │ Full Graph ││ By Type ││By Relationship││ Specs Only│                    ││
 │  │  └────────────┘└─────────┘└───────────────┘└───────────┘                    ││
 │  │  ┌─────────────┐┌────────────────┐┌────────┐                                ││
 │  │  │ Tasks Only  ││ Findings Only  ││ Custom │                                ││
 │  │  └─────────────┘└────────────────┘└────────┘                                ││
 │  │                                                                              ││
 │  │  Active filters: [spec x] [task x] [implements x]           [Clear All]     ││
 │  └──────────────────────────────────────────────────────────────────────────────┘│
 │                                                                                  │
 │  Split View (50/50, gap 16px)                                                    │
 │  ┌──────────────────────────────┐  ┌──────────────────────────────────────────┐ │
 │  │  Node List (CMP-020)         │  │  Edge List (CMP-021)                     │ │
 │  │  ┌──────────────────────────┐│  │  ┌──────────────────────────────────────┐│ │
 │  │  │  ID         │ Type │ Lbl││  │  │  Source       │ Rel        │ Target  ││ │
 │  │  │  ───────────────────────││  │  │  ─────────────────────────────────── ││ │
 │  │  │             │      │    ││  │  │               │            │         ││ │
 │  │  │  node-001   │ [SP] │ Au││  │  │  node-001     │ defines    │ node-004││ │
 │  │  │             │#4FC3F│ th││  │  │  [SP]#4FC3F7  │            │ [RQ]    ││ │
 │  │  │             │  7   │ .s││  │  │               │            │ #AB47BC ││ │
 │  │  │  ───────────────────────││  │  │  ─────────────────────────────────── ││ │
 │  │  │             │      │    ││  │  │               │            │         ││ │
 │  │  │  node-002   │ [RQ] │ US││  │  │  node-004     │ implements │ node-007││ │
 │  │  │             │#AB47B│ ER││  │  │  [RQ]#AB47BC  │            │ [TK]    ││ │
 │  │  │             │  C   │ -A││  │  │               │            │ #66BB6A ││ │
 │  │  │  ───────────────────────││  │  │  ─────────────────────────────────── ││ │
 │  │  │             │      │    ││  │  │               │            │         ││ │
 │  │  │  node-003   │ [TK] │ Im││  │  │  node-007     │ tests      │ node-010││ │
 │  │  │             │#66BB6│ pl││  │  │  [TK]#66BB6A  │            │ [TS]    ││ │
 │  │  │             │  A   │ em││  │  │               │            │ #FFCA28 ││ │
 │  │  │  ───────────────────────││  │  │  ─────────────────────────────────── ││ │
 │  │  │             │      │    ││  │  │               │            │         ││ │
 │  │  │  node-004   │ [TS] │ Te││  │  │  node-002     │ covers     │ node-001││ │
 │  │  │             │#FFCA2│ st││  │  │  [RQ]#AB47BC  │            │ [SP]    ││ │
 │  │  │             │  8   │ Au││  │  │               │            │ #4FC3F7 ││ │
 │  │  │             │      │    ││  │  │               │            │         ││ │
 │  │  └──────────────────────────┘│  │  └──────────────────────────────────────┘│ │
 │  │                              │  │                                          │ │
 │  │  12 nodes (3 filtered)       │  │  18 edges (4 filtered)                   │ │
 │  └──────────────────────────────┘  └──────────────────────────────────────────┘ │
 │                                                                                  │
 └──────────────────────────────────────────────────────────────────────────────────┘
```

### Node Type Badges

```
 Node Type Badges (2-letter abbreviation + color)
 ┌──────────────────────────────────────────────────────┐
 │                                                      │
 │  [SP] spec        #4FC3F7    [TS] test     #FFCA28  │
 │  [RQ] requirement #AB47BC    [FN] finding  #FF3B3B  │
 │  [TK] task        #66BB6A    [AG] agent    #FF7043  │
 │  [PH] phase       #26C6DA    [EN] entity   #78909C  │
 │                                                      │
 │  Badge: 2-letter code, color text, color bg at 12%  │
 │  border-radius: 4px, font: mono 11px                │
 │                                                      │
 └──────────────────────────────────────────────────────┘
```

### Connection Status Banner States

```
 Connected:
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │  [*] Connected to graph service              12 nodes  |  18 edges         │
 └──────────────────────────────────────────────────────────────────────────────┘
  bg: rgba(34, 197, 94, 0.08)  text: #22C55E  dot: #22C55E solid

 Connecting:
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │  [~] Connecting to graph service...                                         │
 └──────────────────────────────────────────────────────────────────────────────┘
  bg: rgba(255, 202, 40, 0.08)  text: #FFCA28  dot: #FFCA28 pulsing

 Disconnected:
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │  [x] Disconnected from graph service.  Data may be stale.    [Reconnect]   │
 └──────────────────────────────────────────────────────────────────────────────┘
  bg: rgba(255, 59, 59, 0.08)  text: #FF3B3B  dot: #FF3B3B solid

 Error:
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │  [!] Graph service error: Connection refused.                 [Retry]       │
 └──────────────────────────────────────────────────────────────────────────────┘
  bg: rgba(255, 59, 59, 0.08)  text: #FF3B3B  dot: #FF3B3B solid
```

### No-Session State

```
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │                                                                                  │
 │                                                                                  │
 │                    Select a session to explore the knowledge graph.               │
 │                                                                                  │
 │                                                                                  │
 └──────────────────────────────────────────────────────────────────────────────────┘
```

### Empty State

```
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │  [*] Connected to graph service              0 nodes  |  0 edges               │
 ├──────────────────────────────────────────────────────────────────────────────────┤
 │  Filter Bar (disabled)                                                          │
 ├──────────────────────────────────────────────────────────────────────────────────┤
 │                                                                                  │
 │                   No graph data yet. Run the pipeline to populate.               │
 │                                                                                  │
 └──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Inventory

| Component                | Ref                              | Role                                          |
| ------------------------ | -------------------------------- | --------------------------------------------- |
| Connection Status Banner | CMP-022-connection-status-banner | Real-time connection state indicator          |
| Filter Bar               | CMP-004-filter-bar               | Node type, relationship, search, view presets |
| Graph Node List          | CMP-020-graph-node-list          | Scrollable table of graph nodes               |
| Graph Edge List          | CMP-021-graph-edge-list          | Scrollable table of graph edges               |

---

## States

| State        | Condition                                                  | Behavior                                                                                                  |
| ------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| no-session   | `STR-002.sessionId === null`                               | Center message: "Select a session to explore the knowledge graph." All components hidden.                 |
| disconnected | `STR-011.connectionStatus === "disconnected"` or `"error"` | Banner shows disconnected/error state with stale data warning. Lists show last-known data (greyed).       |
| empty        | Session active, `STR-011.nodes.length === 0`               | Banner connected. Filter bar disabled. Center message: "No graph data yet. Run the pipeline to populate." |
| loading      | Graph data is being fetched                                | Skeleton rows in both lists (5 per list). Banner shows "Connecting...".                                   |
| populated    | `STR-011.nodes.length > 0`                                 | All components active. Node and edge lists populated. Banner shows connected with counts.                 |

---

## Node Type Colors (8 Types)

| Node Type   | Abbreviation | Color     | Usage                    |
| ----------- | ------------ | --------- | ------------------------ |
| spec        | SP           | `#4FC3F7` | Badge text and bg at 12% |
| requirement | RQ           | `#AB47BC` | Badge text and bg at 12% |
| task        | TK           | `#66BB6A` | Badge text and bg at 12% |
| test        | TS           | `#FFCA28` | Badge text and bg at 12% |
| finding     | FN           | `#FF3B3B` | Badge text and bg at 12% |
| agent       | AG           | `#FF7043` | Badge text and bg at 12% |
| phase       | PH           | `#26C6DA` | Badge text and bg at 12% |
| entity      | EN           | `#78909C` | Badge text and bg at 12% |

---

## Relationship Types

| Relationship | Description                               |
| ------------ | ----------------------------------------- |
| defines      | Spec defines a requirement                |
| implements   | Task implements a requirement             |
| tests        | Test tests a task                         |
| covers       | Requirement covers a spec section         |
| uses         | Entity uses another entity                |
| produces     | Agent produces a finding                  |
| consumes     | Agent consumes a finding or clarification |

---

## View Mode Presets

| Preset          | Applied Filters                                |
| --------------- | ---------------------------------------------- |
| full-graph      | No filters (show all nodes and edges)          |
| by-type         | Group display by node type                     |
| by-relationship | Group display by relationship type             |
| specs-only      | `nodeTypes: [spec]`                            |
| tasks-only      | `nodeTypes: [task]`                            |
| findings-only   | `nodeTypes: [finding]`                         |
| custom          | User-defined filters (no auto-applied presets) |

Clicking a preset applies the corresponding filters. The active preset button uses `--sf-accent` background with `--sf-bg` text. Selecting any filter manually switches view mode to "custom".

---

## Split View Layout

The node list and edge list are displayed side-by-side in a 50/50 split:

| Property              | Value                        |
| --------------------- | ---------------------------- |
| display               | grid                         |
| grid-template-columns | 1fr 1fr                      |
| gap                   | 16px                         |
| overflow-y            | auto (per list, independent) |

Each list includes a footer showing total count and filtered count (e.g., "12 nodes (3 filtered)").

---

## Design Token Usage

| Token             | Usage                                           |
| ----------------- | ----------------------------------------------- |
| `--sf-surface`    | List backgrounds, banner background base        |
| `--sf-bg`         | Filter bar background                           |
| `--sf-text`       | Node labels, edge source/target text            |
| `--sf-text-muted` | Column headers, IDs, footer counts, empty state |
| `--sf-accent`     | Active view-mode button, active filter chips    |
| `--sf-accent-dim` | Active filter chip background                   |
| `--sf-border`     | Row separators, list borders                    |
| `--sf-font-mono`  | Node IDs, edge IDs (JetBrains Mono)             |
| `--sf-font-body`  | Labels, relationship names (Inter)              |

---

## Interaction Notes

1. **Connection banner**: Always visible at the top of the page when a session is active. Clicking "Reconnect" or "Retry" in the disconnected/error banner triggers a reconnection attempt.
2. **Node click**: Clicking a node row highlights all edges connected to that node in the edge list.
3. **Edge click**: Clicking an edge row highlights the source and target nodes in the node list.
4. **View-mode presets**: Presets are mutually exclusive. Only one can be active. Manually adjusting any filter switches to "custom" mode.
5. **Search**: Filters the node list by label or ID (case-insensitive). Edges connected to hidden nodes are also hidden.
6. **Stale data warning**: When disconnected, both lists are rendered with 40% opacity and a banner warns that data may be stale.
7. **Future: D3.js visualization**: A force-directed graph visualization is planned as a future enhancement to replace or supplement the text-only lists. The current split-view layout is designed to be swappable.

---

## Cross-References

- **Components:** CMP-022-connection-status-banner, CMP-004-filter-bar, CMP-020-graph-node-list, CMP-021-graph-edge-list
- **Stores:** STR-011-graph-store, STR-001-filter-store, STR-002-active-session-store
- **Shell:** PG-010-app-shell (parent layout)
- **Nav:** CMP-001-nav-rail view="graph"
