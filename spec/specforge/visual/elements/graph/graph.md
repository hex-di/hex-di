# Graph Elements

**IDs:** ELM-068 through ELM-071
**Context:** Graph explorer view (PG-009-graph-explorer), displayed inside CMP-020-graph-node-list, CMP-021-graph-edge-list, and CMP-022-connection-status-banner.

---

## ASCII Mockup -- Node List Panel

```
 Node List (sidebar panel)
 ┌──────────────────────────────────────────────────┐
 │ ELM-068 Graph Node Row                           │
 │ ┌────────────────────────────────────────────┐   │
 │ │ [REQ]  Token Validation         REQ-014   │   │
 │ │  ▲      ▲ label 13px            ▲ id 11px │   │
 │ │  type badge                     mono muted │   │
 │ │  10px uppercase                             │   │
 │ └────────────────────────────────────────────┘   │
 │ ┌────────────────────────────────────────────┐   │
 │ │ [TASK] Implement Auth Handler   TSK-042   │   │  <-- hover state
 │ └────────────────────────────────────────────┘   │
 │ ┌────────────────────────────────────────────┐   │
 │ │ [SRC]  auth/token.ts            FILE-089  │   │  <-- selected state
 │ │  (accent-dim background, accent text)      │   │
 │ └────────────────────────────────────────────┘   │
 │                                                  │
 └──────────────────────────────────────────────────┘
```

## ASCII Mockup -- Node Type Badge Colors

```
 ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
 │ REQUIREMENT │ │ TASK        │ │ SOURCE-FILE │ │ TEST-FILE   │
 │  #6366F1    │ │  #14B8A6    │ │  #3B82F6    │ │  #10B981    │
 └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
 ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
 │ FINDING     │ │ AGENT-SESS  │ │ SESS-CHUNK  │ │ PACKAGE     │
 │  #EC4899    │ │  #F97316    │ │  #F59E0B    │ │  #8B5CF6    │
 └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
 ┌─────────────┐ ┌─────────────┐
 │ DECISION    │ │ INVARIANT   │
 │  #EF4444    │ │  #64748B    │
 └─────────────┘ └─────────────┘
   10px uppercase, white text on colored bg
```

## ASCII Mockup -- Edge List Panel

```
 Edge List
 ┌────────────────────────────────────────────────────────────────┐
 │ ELM-069 Graph Edge Row                                        │
 │ ┌────────────────────────────────────────────────────────┐    │
 │ │ REQ-014  -> TRACES_TO ->  TSK-042                     │    │
 │ │ ▲ source    ▲ relationship  ▲ target                   │    │
 │ │ 12px        10px accent     12px                       │    │
 │ └────────────────────────────────────────────────────────┘    │
 │ ┌────────────────────────────────────────────────────────┐    │
 │ │ TSK-042  -> IMPLEMENTS ->  FILE-089                   │    │
 │ └────────────────────────────────────────────────────────┘    │
 │ ┌────────────────────────────────────────────────────────┐    │
 │ │ FILE-089 -> TESTED_BY  ->  TEST-201                   │    │
 │ └────────────────────────────────────────────────────────┘    │
 └────────────────────────────────────────────────────────────────┘
```

## ASCII Mockup -- Connection Status Banner

```
 ┌──────────────────────────────────────────────────────────────┐
 │  (o) Connected to Neo4j at bolt://localhost:7687            │
 │   ▲                                                          │
 │   ELM-070 connection status dot                              │
 │   green = connected (pulsing)                                │
 │   red = disconnected (static)                                │
 └──────────────────────────────────────────────────────────────┘
```

## ASCII Mockup -- View Mode Selector

```
 ┌─────────────────────────────────────────────────────┐
 │  ELM-071 Graph View Mode Selector                   │
 │  ┌───────────────────────────────┐                  │
 │  │ Full Graph            [v]    │                  │
 │  ├───────────────────────────────┤                  │
 │  │  Full Graph                   │  <-- 7 presets   │
 │  │  By Type                      │                  │
 │  │  By Relationship              │                  │
 │  │  Requirements Only            │                  │
 │  │  Traceability Chain           │                  │
 │  │  Orphans                      │                  │
 │  │  Impact Analysis              │                  │
 │  └───────────────────────────────┘                  │
 └─────────────────────────────────────────────────────┘
```

## Visual States

### ELM-068 Graph Node Row

| State    | Background                | Text Color    | Extra                 |
| -------- | ------------------------- | ------------- | --------------------- |
| Default  | `transparent`             | `--sf-text`   | --                    |
| Hover    | `rgba(0, 240, 255, 0.05)` | `--sf-text`   | --                    |
| Selected | `--sf-accent-dim`         | `--sf-accent` | Highlighted for focus |

Type badge is colored by node category (10 distinct types). Label text truncates with ellipsis if too long.

### ELM-069 Graph Edge Row

| State   | Background                |
| ------- | ------------------------- |
| Default | `transparent`             |
| Hover   | `rgba(0, 240, 255, 0.03)` |

Format: `{source} -> {RELATIONSHIP} -> {target}`. The relationship label is in accent color, uppercase.

### ELM-070 Connection Status Dot

| State        | Color         | Animation                     |
| ------------ | ------------- | ----------------------------- |
| Connected    | `--sf-accent` | Pulse 2s ease-in-out infinite |
| Disconnected | `#FF3B3B`     | None                          |

8px circle. Pulse animation gives a breathing effect when connected.

### ELM-071 Graph View Mode Selector

| State   | Text Color        | Background                | Border Color      |
| ------- | ----------------- | ------------------------- | ----------------- |
| Default | `--sf-text-muted` | `--sf-surface`            | `--sf-border`     |
| Hover   | `--sf-text`       | `rgba(0, 240, 255, 0.05)` | `--sf-text-muted` |
| Open    | `--sf-accent`     | `--sf-accent-dim`         | `--sf-accent`     |

Dropdown with 7 view presets. Selecting a preset triggers ACT-016-set-filter.

## Token Usage

| Token             | Usage                                  |
| ----------------- | -------------------------------------- |
| `--sf-surface`    | Selector default bg                    |
| `--sf-text`       | Node label, source/target text         |
| `--sf-text-muted` | Node ID, arrows, default selector text |
| `--sf-accent`     | Relationship label, connected dot      |
| `--sf-accent-dim` | Selected node bg, open selector bg     |
| `--sf-border`     | Selector default border                |
| `--sf-font-mono`  | Node ID display                        |

## Cross-References

- **Action:** ACT-016-set-filter (view mode preset selection)
- **Component:** CMP-020-graph-node-list (parent node list container)
- **Component:** CMP-021-graph-edge-list (parent edge list container)
- **Component:** CMP-022-connection-status-banner (connection banner)
- **Store:** STR-011-graph-store (graph node/edge data source)
- **Store:** STR-001-filter-store (graph filter state)
- **Page:** PG-009-graph-explorer (parent page)
