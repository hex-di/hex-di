# CMP-013 Kanban Board

**ID:** CMP-013-kanban-board
**Context:** Tasks view -- the primary task visualization when the view mode is "kanban".

---

## Overview

The Kanban Board displays task groups organized into status columns: Pending, In Progress, Completed, and Blocked. Each column has a header showing the status label and task count. Task group cards populate the columns based on their status. Empty columns display a muted "No tasks" message.

## ASCII Mockup

```
 Kanban Board (horizontal flex, overflow-x: auto)
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  padding: 16px                                                              │
 │                                                                             │
 │  gap: 16px                                                                  │
 │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
 │  │   Pending (3) │  │ In Progress  │  │  Completed   │  │   Blocked    │   │
 │  │               │  │    (2)       │  │    (5)       │  │    (1)       │   │
 │  │  ─────────── │  │  ─────────── │  │  ─────────── │  │  ─────────── │   │
 │  │               │  │               │  │               │  │               │   │
 │  │  ELM-049      │  │  ELM-049      │  │  ELM-049      │  │  ELM-049      │   │
 │  │  ┌──────────┐│  │  ┌──────────┐│  │  ┌──────────┐│  │  ┌──────────┐│   │
 │  │  │ Task Grp ││  │  │ Task Grp ││  │  │ Task Grp ││  │  │ Task Grp ││   │
 │  │  │ REQ-001  ││  │  │ REQ-003  ││  │  │ REQ-002  ││  │  │ REQ-007  ││   │
 │  │  └──────────┘│  │  └──────────┘│  │  └──────────┘│  │  └──────────┘│   │
 │  │               │  │               │  │               │  │               │   │
 │  │  ┌──────────┐│  │  ┌──────────┐│  │  ┌──────────┐│  │               │   │
 │  │  │ Task Grp ││  │  │ Task Grp ││  │  │ Task Grp ││  │               │   │
 │  │  │ REQ-004  ││  │  │ REQ-005  ││  │  │ REQ-006  ││  │               │   │
 │  │  └──────────┘│  │  └──────────┘│  │  └──────────┘│  │               │   │
 │  │               │  │               │  │               │  │               │   │
 │  │  ┌──────────┐│  │               │  │  ┌──────────┐│  │               │   │
 │  │  │ Task Grp ││  │               │  │  │ Task Grp ││  │               │   │
 │  │  │ REQ-008  ││  │               │  │  │ REQ-009  ││  │               │   │
 │  │  └──────────┘│  │               │  │  └──────────┘│  │               │   │
 │  │               │  │               │  │               │  │               │   │
 │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
 │                                                                             │
 └─────────────────────────────────────────────────────────────────────────────┘

 Column detail:
 ┌────────────────────┐
 │  In Progress (2)   │  <-- Header: label (13px, 600) + ELM-051 count
 │  ──────────────── │  <-- 1px border-bottom
 │                     │  <-- gap: 8px between cards
 │  ┌────────────────┐│
 │  │ [ELM-050]      ││  <-- ELM-049 task group card
 │  │ Task Group Name││
 │  │ REQ-003        ││
 │  └────────────────┘│
 │                     │
 │  ┌────────────────┐│
 │  │ [ELM-050]      ││
 │  │ Task Group Name││
 │  │ REQ-005        ││
 │  └────────────────┘│
 │                     │
 └────────────────────┘

 Empty column:
 ┌────────────────────┐
 │  Blocked (0)       │
 │  ──────────────── │
 │                     │
 │                     │
 │     No tasks        │
 │   (italic, muted)   │
 │                     │
 │                     │
 └────────────────────┘
```

## Layout

### Board Container

| Property       | Value | Notes                                 |
| -------------- | ----- | ------------------------------------- |
| display        | flex  | Horizontal column layout              |
| flex-direction | row   | Columns side by side                  |
| gap            | 16px  | Space between columns                 |
| width          | 100%  | Full width of tasks view              |
| overflow-x     | auto  | Horizontal scroll on narrow viewports |
| padding        | 16px  | Outer padding                         |
| min-height     | 0     | Prevents flex overflow issues         |

### Column

| Property       | Value                   | Notes                     |
| -------------- | ----------------------- | ------------------------- |
| display        | flex                    | Vertical card stack       |
| flex-direction | column                  | Cards flow top to bottom  |
| flex           | 1 1 0                   | Equal-width columns       |
| min-width      | 240px                   | Minimum column width      |
| gap            | 8px                     | Between cards             |
| background     | `var(--sf-surface-alt)` | Subtle column background  |
| border-radius  | 8px                     | Rounded column containers |
| padding        | 12px                    | Inner padding             |

## Columns

| Column      | Status        | Header Color      |
| ----------- | ------------- | ----------------- |
| Pending     | `pending`     | `--sf-text-muted` |
| In Progress | `in-progress` | `--sf-accent`     |
| Completed   | `completed`   | `--sf-success`    |
| Blocked     | `blocked`     | `--sf-error`      |

### Column Header

Each column header displays the status label and a count indicator (ELM-051).

| Property        | Value                        |
| --------------- | ---------------------------- |
| Layout          | flex row, space-between      |
| Label font size | 13px                         |
| Label weight    | 600                          |
| Count element   | ELM-051-task-count-indicator |
| Bottom border   | 1px solid `--sf-border`      |
| Bottom padding  | 8px                          |

## Children

| Element                      | Role                          |
| ---------------------------- | ----------------------------- |
| ELM-049-task-group-card      | Individual task group card    |
| ELM-050-task-status-badge    | Status badge on each card     |
| ELM-051-task-count-indicator | Count badge in column headers |

## Empty State

Each column independently shows an empty state when no task groups match that column's status.

| Property   | Value             |
| ---------- | ----------------- |
| Message    | "No tasks"        |
| Color      | `--sf-text-muted` |
| Font size  | 12px              |
| Font style | italic            |
| Alignment  | center            |
| Padding    | 24px 0            |

## Store Bindings

| Store                    | Selector              | Component Prop         |
| ------------------------ | --------------------- | ---------------------- |
| STR-007 task-board-store | `groupsByStatus`      | `groups`               |
| STR-001 filter-store     | `tasks.statuses`      | Filter: statuses       |
| STR-001 filter-store     | `tasks.requirementId` | Filter: requirement ID |
| STR-001 filter-store     | `tasks.search`        | Filter: search         |

## Token Usage

| Token              | Usage                               |
| ------------------ | ----------------------------------- |
| `--sf-text`        | Card text, header labels            |
| `--sf-text-muted`  | Pending header, empty state, counts |
| `--sf-accent`      | In Progress header color            |
| `--sf-success`     | Completed header color              |
| `--sf-error`       | Blocked header color                |
| `--sf-surface-alt` | Column background                   |
| `--sf-border`      | Column header separator             |
| `--sf-font-body`   | All text                            |

## Cross-References

- **Store:** STR-007-task-board-store (task group data by status)
- **Store:** STR-001-filter-store (task filters)
- **Element:** ELM-049-task-group-card (task cards)
- **Element:** ELM-050-task-status-badge (status badges)
- **Element:** ELM-051-task-count-indicator (column counts)
- **Component:** CMP-014-dag-list (alternative task view)
