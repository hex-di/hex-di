# PG-005 Task Board

**ID:** PG-005-task-board
**Route:** `#tasks`
**Layout:** single-column

---

## Overview

The Task Board page displays task groups in either a kanban board view or a DAG (directed acyclic graph) list view. A filter bar at the top provides status multi-select, requirement ID filter, text search, and a view mode toggle. The view mode toggle switches between CMP-013 (kanban board with four columns) and CMP-014 (indented DAG list showing dependency ordering).

This page requires an active session. If `STR-002.sessionId` is null, the page redirects to `#home`.

---

## ASCII Wireframe -- Kanban View

```
+------------------------------------------------------------------------+
|                    PG-005 Task Board (kanban view)                     |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-004 Filter Bar                                              |  |
|  |  +------------+ +----------------+ +-----------+  [Kanban|DAG]   |  |
|  |  | Statuses v | | Requirement ID | | Search    |   ^^           |  |
|  |  |  (multi)   | | [____________] | | [_______] |  active        |  |
|  |  +------------+ +----------------+ +-----------+                 |  |
|  |                                                                  |  |
|  |  [Active Chips: status:in-progress  x | status:blocked  x ]     |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-013 Kanban Board                                            |  |
|  |                                                                  |  |
|  |  Pending      In Progress     Completed      Blocked             |  |
|  |  +----------+ +----------+   +----------+   +----------+        |  |
|  |  |          | |          |   |          |   |          |        |  |
|  |  | +------+ | | +------+ |   | +------+ |   | +------+ |        |  |
|  |  | |Task  | | | |Task  | |   | |Task  | |   | |Task  | |        |  |
|  |  | |Group | | | |Group | |   | |Group | |   | |Group | |        |  |
|  |  | |  A   | | | |  B   | |   | |  D   | |   | |  F   | |        |  |
|  |  | |3t/5s | | | |5t/12s| |   | |2t/4s | |   | |4t/8s | |        |  |
|  |  | |REQ-1 | | | |REQ-2 | |   | |REQ-1 | |   | |REQ-3 | |        |  |
|  |  | +------+ | | +------+ |   | +------+ |   | +------+ |        |  |
|  |  |          | |          |   |          |   |          |        |  |
|  |  | +------+ | | +------+ |   | +------+ |   +----------+        |  |
|  |  | |Task  | | | |Task  | |   | |Task  | |                       |  |
|  |  | |Group | | | |Group | |   | |Group | |                       |  |
|  |  | |  C   | | | |  E   | |   | |  G   | |                       |  |
|  |  | |4t/7s | | | |3t/6s | |   | |1t/2s | |                       |  |
|  |  | |REQ-2 | | | |REQ-4 | |   | |REQ-5 | |                       |  |
|  |  | +------+ | | +------+ |   | +------+ |                       |  |
|  |  |          | |          |   |          |                       |  |
|  |  +----------+ +----------+   +----------+                       |  |
|  |                                                                  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+------------------------------------------------------------------------+
```

### DAG View Wireframe

```
+------------------------------------------------------------------------+
|                    PG-005 Task Board (DAG view)                        |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-004 Filter Bar                                              |  |
|  |  +------------+ +----------------+ +-----------+  [Kanban|DAG]   |  |
|  |  | Statuses v | | Requirement ID | | Search    |          ^^    |  |
|  |  |  (multi)   | | [____________] | | [_______] |       active   |  |
|  |  +------------+ +----------------+ +-----------+                 |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-014 DAG List                                                |  |
|  |                                                                  |  |
|  |  +------------------------------------------------------------+  |  |
|  |  | Task Group D     completed   2 tasks / 4 tests   REQ-1    |  |  |
|  |  +------------------------------------------------------------+  |  |
|  |    +----------------------------------------------------------+  |  |
|  |    | Task Group A     pending   3 tasks / 5 tests   REQ-1    |  |  |
|  |    +----------------------------------------------------------+  |  |
|  |    +----------------------------------------------------------+  |  |
|  |    | Task Group B     in-prog.  5 tasks / 12 tests  REQ-2    |  |  |
|  |    +----------------------------------------------------------+  |  |
|  |      +--------------------------------------------------------+  |  |
|  |      | Task Group E   in-prog.  3 tasks / 6 tests   REQ-4    |  |  |
|  |      +--------------------------------------------------------+  |  |
|  |  +------------------------------------------------------------+  |  |
|  |  | Task Group G     completed   1 task / 2 tests    REQ-5    |  |  |
|  |  +------------------------------------------------------------+  |  |
|  |    +----------------------------------------------------------+  |  |
|  |    | Task Group C     pending   4 tasks / 7 tests   REQ-2    |  |  |
|  |    +----------------------------------------------------------+  |  |
|  |  +------------------------------------------------------------+  |  |
|  |  | Task Group F     blocked    4 tasks / 8 tests    REQ-3    |  |  |
|  |  +------------------------------------------------------------+  |  |
|  |                                                                  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+------------------------------------------------------------------------+
```

### Empty State Wireframe

```
+------------------------------------------------------------------------+
|                  PG-005 Task Board (empty)                             |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-004 Filter Bar (disabled)                                   |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |                                                                  |  |
|  |              No tasks have been generated yet.                   |  |
|  |          Run the pipeline to generate task groups.               |  |
|  |                                                                  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+------------------------------------------------------------------------+
```

### No-Session State Wireframe

```
+------------------------------------------------------------------------+
|                PG-005 Task Board (no session)                          |
|                                                                        |
|                                                                        |
|                    No active session selected.                         |
|                                                                        |
|                  [Go to Home to select a session]                      |
|                                                                        |
|                                                                        |
+------------------------------------------------------------------------+
```

---

## Component Inventory

| Component ID | Name         | Position     | Condition                    | Description                           |
| ------------ | ------------ | ------------ | ---------------------------- | ------------------------------------- |
| CMP-004      | Filter Bar   | Top          | Always (when session active) | Statuses, requirement, search, toggle |
| CMP-013      | Kanban Board | Main content | `viewMode === 'kanban'`      | Four-column kanban layout             |
| CMP-014      | DAG List     | Main content | `viewMode === 'dag'`         | Indented dependency-ordered list      |

---

## States

### No-Session State

- **Condition:** `STR-002.sessionId === null`
- **Behavior:** All page components are hidden. A centered prompt is displayed with a link to `#home`.

### Empty State

- **Condition:** `taskGroups.length === 0`
- **Behavior:** Filter bar is visible but disabled. The content area shows a centered message: "No tasks have been generated yet. Run the pipeline to generate task groups."

### Loading State

- **Condition:** Task data is being loaded
- **Behavior:** Filter bar is disabled. The kanban view shows skeleton cards in each column. The DAG view shows skeleton list items at various indent levels.

### Populated State

- **Condition:** `taskGroups.length > 0`
- **Behavior:** Filter bar is fully interactive. The view mode toggle switches between CMP-013 (kanban) and CMP-014 (DAG list). Task group cards show name, status badge, task/test counts, and requirement IDs. Cards are colored by status via the left border (see ELM-049).

---

## Kanban Columns

| Column      | Status Filter | Header Color      | Description                     |
| ----------- | ------------- | ----------------- | ------------------------------- |
| Pending     | `pending`     | `--sf-text-muted` | Tasks not yet started           |
| In Progress | `in-progress` | `--sf-accent`     | Tasks currently being worked on |
| Completed   | `completed`   | `#22C55E`         | Tasks finished successfully     |
| Blocked     | `blocked`     | `#FF3B3B`         | Tasks blocked by dependencies   |

---

## Token / Design Token Usage

| Token             | Usage                                            |
| ----------------- | ------------------------------------------------ |
| `--sf-bg`         | Page background                                  |
| `--sf-surface`    | Task cards, column backgrounds                   |
| `--sf-text`       | Task group name, column headers                  |
| `--sf-text-muted` | Requirement IDs, task/test counts, pending color |
| `--sf-accent`     | In-progress column header, active cards border   |
| `--sf-accent-dim` | In-progress status badge background              |
| `#22C55E`         | Completed column header, completed card border   |
| `#FF3B3B`         | Blocked column header, blocked card border       |
| `--sf-border`     | Column separators, card borders                  |
| `--sf-font-body`  | Card text, filter labels                         |

---

## Interaction Flow

1. **Page Guard:** On navigation to `#tasks`, the guard checks `STR-002.sessionId`. If null, redirect to `#home`.
2. **Initial Load:** Read `STR-007-task-board-store`. If no task groups, show empty state. Otherwise render the current view mode.
3. **View Mode Toggle:** Clicking the kanban/DAG toggle dispatches `EVT-018-filter-changed` with `{ view: "tasks", key: "viewMode", value: "kanban"|"dag" }`. The content area switches between CMP-013 and CMP-014. Only one is rendered at a time.
4. **Status Filter:** Selecting statuses in the multi-select dispatches `EVT-018-filter-changed` with `{ view: "tasks", key: "statuses", value: [...] }`. Cards not matching any selected status are hidden. Empty selection shows all.
5. **Requirement ID Filter:** Typing a requirement ID dispatches `EVT-018-filter-changed` with `{ view: "tasks", key: "requirementId", value }`. Only task groups whose `requirementIds` include the filter value are shown.
6. **Search Filter:** Typing search text dispatches `EVT-018-filter-changed` with `{ view: "tasks", key: "search", value }` (debounced 300ms). Matches against group name and requirement IDs.
7. **Card Interaction:** Clicking a task group card may expand it to show task-level detail (future enhancement).

---

## Cross-References

- **Components:** CMP-004 (filter-bar), CMP-013 (kanban-board), CMP-014 (dag-list)
- **Elements:** ELM-049 (task-group-card), ELM-050 (task-status-badge), ELM-051 (task-count-indicator), ELM-052 (view-mode-toggle)
- **Stores:** STR-007 (task-board-store), STR-001 (filter-store, tasks slice), STR-002 (active-session-store)
- **Events:** EVT-018 (filter-changed)
- **Guard:** Requires STR-002.sessionId to be non-null
- **Navigation:** Redirects to PG-001-home if no active session
