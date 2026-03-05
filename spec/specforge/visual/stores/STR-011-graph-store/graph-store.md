# STR-011: Graph Store

## Overview

The Graph Store holds the client-side projection of the Neo4j knowledge graph. It manages the set of nodes and edges visible in the Graph Explorer view along with the connection status to the graph database backend.

**Hook:** `useGraph()`

---

## State Shape

```
+-------------------+----------------------------------------------------------+
| Field             | Type                                                     |
+-------------------+----------------------------------------------------------+
| nodes             | GraphNodeView[]                                          |
| edges             | GraphEdgeView[]                                          |
| connectionStatus  | "disconnected" | "connecting" | "connected" | "error"    |
+-------------------+----------------------------------------------------------+
```

### GraphNodeView

```
+-------------------+----------------------------------------------------------+
| Field             | Type                                                     |
+-------------------+----------------------------------------------------------+
| id                | string                                                   |
| type              | string (e.g., "Requirement", "Decision", "Session")      |
| label             | string (display name)                                    |
| sessionId         | string (originating session)                             |
| properties        | Record<string, unknown> (arbitrary node properties)      |
+-------------------+----------------------------------------------------------+
```

### GraphEdgeView

```
+-------------------+----------------------------------------------------------+
| Field             | Type                                                     |
+-------------------+----------------------------------------------------------+
| id                | string                                                   |
| source            | string (source node id)                                  |
| target            | string (target node id)                                  |
| relationship      | string (e.g., "TRACES_TO", "DEPENDS_ON", "AUTHORED_BY")  |
+-------------------+----------------------------------------------------------+
```

---

## Selectors

| Selector              | Parameters     | Description                                             |
| --------------------- | -------------- | ------------------------------------------------------- |
| `nodesByType`         | `type`         | Filters nodes to those matching the given type string.  |
| `edgesByRelationship` | `relationship` | Filters edges to those matching the given relationship. |
| `nodeCount`           | (none)         | Returns the total number of nodes.                      |
| `edgeCount`           | (none)         | Returns the total number of edges.                      |
| `isConnected`         | (none)         | Returns `true` when `connectionStatus === "connected"`. |

---

## Event Flow

```
EVT-024 (graph-nodes-loaded)
  --> replace nodes[] with payload.nodes (bulk load)

EVT-025 (graph-edges-loaded)
  --> replace edges[] with payload.edges (bulk load)

EVT-026 (graph-node-added)
  --> append single node to nodes[]

EVT-027 (graph-edge-added)
  --> append single edge to edges[]

EVT-028 (graph-connection-status-changed)
  --> set connectionStatus to payload.status

EVT-029 (graph-cleared)
  --> clear both nodes[] and edges[]
```

### Event-to-Field Mapping

| Event   | Field            | Operation |
| ------- | ---------------- | --------- |
| EVT-024 | nodes            | set       |
| EVT-025 | edges            | set       |
| EVT-026 | nodes            | append    |
| EVT-027 | edges            | append    |
| EVT-028 | connectionStatus | set       |
| EVT-029 | nodes, edges     | clear     |

---

## Design Rationale

1. **Separate node and edge lists:** Nodes and edges are stored in separate flat arrays mirroring the graph database's natural structure. This enables independent loading and avoids coupling node updates with edge re-renders.

2. **Connection status as explicit state:** The `connectionStatus` field tracks the WebSocket/Bolt connection health. The `CMP-022-connection-status-banner` component uses this to show a visual indicator and disable query controls when disconnected.

3. **Bulk load + incremental append:** The store supports both bulk replacement (EVT-024/025 for initial load or query results) and incremental additions (EVT-026/027 for real-time graph mutations). This dual pattern supports both the initial view mount and live updates.

4. **Properties as open record:** `GraphNodeView.properties` uses `Record<string, unknown>` because different node types (Requirement, Decision, Session, etc.) carry different property sets. The node inspection panel renders these dynamically.

5. **Clear event:** EVT-029 resets both lists simultaneously, used when switching between query result sets or when the connection drops and cached data becomes stale.

---

## Cross-References

- **Consumers:** CMP-020-graph-node-list, CMP-021-graph-edge-list, CMP-022-connection-status-banner
- **Events:** EVT-024, EVT-025, EVT-026, EVT-027, EVT-028, EVT-029
- **Architecture:** [c3-web-dashboard.md](../../../architecture/c3-web-dashboard.md) -- Graph Explorer View
- **Architecture:** [c3-knowledge-graph.md](../../../architecture/c3-knowledge-graph.md) -- Neo4j schema
- **Behaviors:** [01-graph-operations.md](../../../behaviors/BEH-SF-001-graph-operations.md) -- BEH-SF-001 through BEH-SF-008
