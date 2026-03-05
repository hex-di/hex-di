# CMP-020: Graph Node List

**ID:** CMP-020-graph-node-list
**Context:** Graph view (PG-009-graph), filterable list of knowledge graph nodes.

**Design Note:** This component addresses a key design gap -- the graph view was previously text-only. This spec defines a rich node display with colored type badges, property counts, and search/filter support.

---

## Overview

The Graph Node List displays a scrollable, filterable list of knowledge graph nodes. Each row shows a colored type badge, the node label, and a property count indicator. Nodes can be filtered by type and searched by label. The list supports all 8 node type categories, each with a distinct color.

---

## ASCII Mockup -- Redesigned Node List

```
 Graph Node List
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │                                                                              │
 │  Node Count: 142                                                            │
 │                                                                              │
 │  ┌──────────────────────────────────────────────────────────────────────┐    │
 │  │  [spec]         auth-module-spec              4 props              │    │
 │  │  #4FC3F7 pill   label text                    muted count          │    │
 │  ├──────────────────────────────────────────────────────────────────────┤    │
 │  │  [requirement]  REQ-014-token-validation       6 props              │    │
 │  │  #A78BFA pill                                                      │    │
 │  ├──────────────────────────────────────────────────────────────────────┤    │
 │  │  [task]         implement-jwt-verify           3 props              │    │
 │  │  #22C55E pill                                                      │    │
 │  ├──────────────────────────────────────────────────────────────────────┤    │
 │  │  [test]         test-token-expiry              2 props              │    │
 │  │  #FFD600 pill                                                      │    │
 │  ├──────────────────────────────────────────────────────────────────────┤    │
 │  │  [finding]      missing-audit-trail            5 props              │    │
 │  │  #FF3B3B pill                                                      │    │
 │  ├──────────────────────────────────────────────────────────────────────┤    │
 │  │  [agent]        gxp-reviewer                   2 props              │    │
 │  │  #F472B6 pill                                                      │    │
 │  ├──────────────────────────────────────────────────────────────────────┤    │
 │  │  [phase]        review                         1 prop               │    │
 │  │  #FF8C00 pill                                                      │    │
 │  ├──────────────────────────────────────────────────────────────────────┤    │
 │  │  [entity]       UserSession                    8 props              │    │
 │  │  #60A5FA pill                                                      │    │
 │  └──────────────────────────────────────────────────────────────────────┘    │
 │                                                                              │
 └──────────────────────────────────────────────────────────────────────────────┘
```

### Row Layout Detail

```
 Single Row (ELM-068-graph-node-row)
 ┌──────────────────────────────────────────────────────────────────────┐
 │                                                                      │
 │  ┌──────────┐                                                        │
 │  │   type   │  node-label-text                          N props     │
 │  └──────────┘                                                        │
 │   pill badge   14px label, --sf-text              11px, --sf-text-muted│
 │   11px, colored                                                      │
 │                                                                      │
 └──────────────────────────────────────────────────────────────────────┘
   padding: 10px 16px
   border-bottom: 1px solid rgba(0, 240, 255, 0.06)
```

### Node Type Colors (8 categories)

```
 spec         #4FC3F7   (light blue)
 requirement  #A78BFA   (purple)
 task         #22C55E   (green)
 test         #FFD600   (yellow)
 finding      #FF3B3B   (red)
 agent        #F472B6   (pink)
 phase        #FF8C00   (orange)
 entity       #60A5FA   (blue)
```

### Empty State

```
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │                                                                              │
 │                      No graph nodes available.                               │
 │                                                                              │
 └──────────────────────────────────────────────────────────────────────────────┘
```

---

## Layout

- **Container:** Full-width flex column, scrollable vertically.
- **Header area:** Node count displayed above the list.
- **Row (ELM-068):** Horizontal flex row with type badge (pill), label text, and property count. Separated by subtle bottom border.
- **Type badge:** Small pill (11px, colored background at 0.15 opacity with solid text).
- **Label:** 14px, `--sf-text`.
- **Property count:** 11px, `--sf-text-muted`, right-aligned.

---

## Node Types (8 categories)

| Type        | Color     | Description                |
| ----------- | --------- | -------------------------- |
| spec        | `#4FC3F7` | Specification documents    |
| requirement | `#A78BFA` | Individual requirements    |
| task        | `#22C55E` | Implementation tasks       |
| test        | `#FFD600` | Test cases and scenarios   |
| finding     | `#FF3B3B` | Findings from agent review |
| agent       | `#F472B6` | Agent instances            |
| phase       | `#FF8C00` | Pipeline phases            |
| entity      | `#60A5FA` | Domain entities            |

---

## Filtering

| Filter     | Source (STR-001)  | Behavior                                  |
| ---------- | ----------------- | ----------------------------------------- |
| Node Types | `graph.nodeTypes` | Show only nodes matching selected type(s) |
| Search     | `graph.search`    | Filter nodes by label substring match     |

When both filters are active they combine with AND logic.

---

## Visual States

### Node Row (ELM-068)

| State   | Background                | Extra                                |
| ------- | ------------------------- | ------------------------------------ |
| Default | `transparent`             | Bottom border `rgba(0,240,255,0.06)` |
| Hover   | `rgba(0, 240, 255, 0.03)` | --                                   |

---

## Token Usage

| Token             | Usage                             |
| ----------------- | --------------------------------- |
| `--sf-surface`    | List container background         |
| `--sf-text`       | Node label text                   |
| `--sf-text-muted` | Property count, node count header |

---

## Cross-References

- **Store:** STR-011-graph-store (nodesByType, nodeCount)
- **Store:** STR-001-filter-store (graph.nodeTypes, graph.search)
- **Elements:** ELM-068-graph-node-row
- **Sibling:** CMP-021-graph-edge-list, CMP-022-connection-status-banner
- **Page:** PG-009-graph (parent page)
