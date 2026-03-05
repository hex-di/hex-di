# Task Elements

**IDs:** ELM-049 through ELM-052
**Context:** Task board view (PG-005-task-board), displayed inside CMP-013-kanban-board and CMP-014-dag-list.

---

## ASCII Mockup -- Kanban Column Card

```
 Kanban Column: "In Progress"
 ┌─────────────────────────────────────────────┐
 │                                             │
 │  ELM-049 Task Group Card                    │
 │  ┌─────────────────────────────────────┐    │
 │  │▐                                    │    │
 │  │▐  Auth Token Validation       (1)   │    │  <-- (1) group name, 14px
 │  │▐  REQ-014, REQ-015            (2)   │    │  <-- (2) requirement IDs, 11px muted
 │  │▐  5 tasks / 12 tests         (3)   │    │  <-- (3) ELM-051 task count indicator
 │  │▐  [in-progress]              (4)   │    │  <-- (4) ELM-050 status badge
 │  │▐                                    │    │
 │  └─────────────────────────────────────┘    │
 │  ▲                                          │
 │  │ 3px left border colored by status        │
 │                                             │
 │  ┌─────────────────────────────────────┐    │
 │  │▐  Graph Query Engine                │    │
 │  │▐  REQ-022                           │    │
 │  │▐  3 tasks / 8 tests                │    │
 │  │▐  [in-progress]                    │    │
 │  └─────────────────────────────────────┘    │
 │                                             │
 └─────────────────────────────────────────────┘
```

## ASCII Mockup -- View Mode Toggle

```
 ┌──────────────────────────────┐
 │  ELM-052 View Mode Toggle    │
 │  ┌──────────┬──────────┐     │
 │  │  [=]     │  [DAG]   │     │  <-- two icon buttons
 │  │ (active) │ (default)│     │
 │  └──────────┴──────────┘     │
 └──────────────────────────────┘
   active = accent bg + accent text
   default = surface bg + muted text
```

## ASCII Mockup -- Status Border Colors

```
 Pending       In-Progress     Completed       Blocked
 ┌─────────┐  ┌─────────┐    ┌─────────┐    ┌─────────┐
 │▌ muted  │  │▌ accent │    │▌ #22C55E│    │▌ #FF3B3B│
 │▌        │  │▌        │    │▌        │    │▌        │
 └─────────┘  └─────────┘    └─────────┘    └─────────┘
```

## Visual States

### ELM-049 Task Group Card

| State       | Border-Left Color  | Background             | Extra              |
| ----------- | ------------------ | ---------------------- | ------------------ |
| Default     | (varies by status) | `--sf-surface`         | --                 |
| Hover       | (varies by status) | `rgba(0,240,255,0.03)` | Subtle box shadow  |
| Pending     | `--sf-text-muted`  | --                     | Gray border        |
| In-Progress | `--sf-accent`      | --                     | Cyan/accent border |
| Completed   | `#22C55E`          | --                     | Green border       |
| Blocked     | `#FF3B3B`          | --                     | Red border         |

The card background and border color are orthogonal states: background changes on hover, border-left color is driven by the group's status.

### ELM-050 Task Status Badge

| Status      | Text Color        | Background                  |
| ----------- | ----------------- | --------------------------- |
| Pending     | `--sf-text-muted` | `rgba(148, 163, 184, 0.15)` |
| In-Progress | `--sf-accent`     | `--sf-accent-dim`           |
| Completed   | `#22C55E`         | `rgba(34, 197, 94, 0.12)`   |
| Blocked     | `#FF3B3B`         | `rgba(255, 59, 59, 0.12)`   |

Small pill shape (border-radius: 9999px). 11px text, capitalized.

### ELM-051 Task Count Indicator

- 11px muted text.
- Format: "{taskCount} tasks / {testCount} tests".
- Color: `--sf-text-muted`.

### ELM-052 View Mode Toggle

| State   | Text Color        | Background                |
| ------- | ----------------- | ------------------------- |
| Default | `--sf-text-muted` | `--sf-surface`            |
| Hover   | `--sf-text`       | `rgba(0, 240, 255, 0.05)` |
| Active  | `--sf-accent`     | `--sf-accent-dim`         |

Segmented control with two mutually exclusive icon buttons. Active mode is highlighted.

## Token Usage

| Token             | Usage                                |
| ----------------- | ------------------------------------ |
| `--sf-surface`    | Card background, toggle default bg   |
| `--sf-text`       | Group name text                      |
| `--sf-text-muted` | Requirement IDs, task count, pending |
| `--sf-accent`     | In-progress border, active toggle    |
| `--sf-accent-dim` | In-progress badge bg, active toggle  |
| `--sf-font-body`  | Task count font                      |

## Cross-References

- **Action:** ACT-016-set-filter (view mode toggle click)
- **Component:** CMP-013-kanban-board (parent: kanban layout)
- **Component:** CMP-014-dag-list (parent: DAG layout)
- **Store:** STR-007-task-board-store (task group data source)
- **Store:** STR-001-filter-store (viewMode filter state)
