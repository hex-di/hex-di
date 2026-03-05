# CMP-014 DAG List

**ID:** CMP-014-dag-list
**Context:** Tasks view -- alternative task visualization when the view mode is "list", showing tasks ordered by dependency topology.

---

## Overview

The DAG List presents task groups as a dependency-ordered vertical list. Indentation conveys dependency depth: tasks that depend on other tasks are indented further to the right. Requirement IDs are shown as inline tags on each group. This view complements the Kanban Board by emphasizing the dependency structure rather than status grouping.

## ASCII Mockup

```
 DAG List (vertical, indented by dependency depth)
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  padding: 16px                                                              │
 │                                                                             │
 │  Depth 0 (no indent)                                                        │
 │  ┌─────────────────────────────────────────────────────────────────────────┐│
 │  │ [ELM-050]  Setup Project Scaffold              [REQ-001] [REQ-002]    ││
 │  └─────────────────────────────────────────────────────────────────────────┘│
 │                                                                             │
 │  Depth 1 (indent: 24px)                                                     │
 │  │                                                                          │
 │  ├─┌───────────────────────────────────────────────────────────────────────┐│
 │  │ │ [ELM-050]  Define Port Interfaces              [REQ-003]            ││
 │  │ └───────────────────────────────────────────────────────────────────────┘│
 │  │                                                                          │
 │  ├─┌───────────────────────────────────────────────────────────────────────┐│
 │  │ │ [ELM-050]  Implement Core Module               [REQ-004] [REQ-005]  ││
 │  │ └───────────────────────────────────────────────────────────────────────┘│
 │  │                                                                          │
 │  │  Depth 2 (indent: 48px)                                                  │
 │  │  │                                                                       │
 │  │  ├─┌────────────────────────────────────────────────────────────────────┐│
 │  │  │ │ [ELM-050]  Write Unit Tests                 [REQ-004]            ││
 │  │  │ └────────────────────────────────────────────────────────────────────┘│
 │  │  │                                                                       │
 │  │  └─┌────────────────────────────────────────────────────────────────────┐│
 │  │    │ [ELM-050]  Write Integration Tests          [REQ-005]            ││
 │  │    └────────────────────────────────────────────────────────────────────┘│
 │  │                                                                          │
 │  └─┌───────────────────────────────────────────────────────────────────────┐│
 │    │ [ELM-050]  Configure CI Pipeline               [REQ-006]            ││
 │    └───────────────────────────────────────────────────────────────────────┘│
 │                                                                             │
 └─────────────────────────────────────────────────────────────────────────────┘

 Row detail:
 ┌────────────────────────────────────────────────────────────────┐
 │  [ELM-050 Badge]  Task Group Name        [REQ-003] [REQ-005] │
 │  status badge     group label (14px)     requirement tags     │
 │                                          (11px, mono, muted)  │
 └────────────────────────────────────────────────────────────────┘

 Requirement tag:
 ┌──────────┐
 │ REQ-003  │  11px, mono, muted text, surface-alt bg
 └──────────┘  padding 2px 6px, border-radius 3px

 Empty state:
 ┌─────────────────────────────────────────────────────────────────┐
 │                                                                 │
 │                   No tasks to display.                          │
 │                    (italic, muted)                              │
 │                                                                 │
 └─────────────────────────────────────────────────────────────────┘
```

## Layout

### List Container

| Property       | Value  | Notes                      |
| -------------- | ------ | -------------------------- |
| display        | flex   | Vertical list              |
| flex-direction | column | Items flow top to bottom   |
| width          | 100%   | Full width of tasks view   |
| gap            | 4px    | Tight spacing between rows |
| padding        | 16px   | Outer padding              |
| overflow-y     | auto   | Scrollable for long lists  |

### Row

| Property       | Value                   | Notes                      |
| -------------- | ----------------------- | -------------------------- |
| display        | flex                    | Horizontal row content     |
| flex-direction | row                     | Badge, name, tags in a row |
| align-items    | center                  | Vertically centered        |
| gap            | 8px                     | Between badge, name, tags  |
| padding        | 8px 12px                | Inner row padding          |
| border-radius  | 6px                     | Rounded row container      |
| hover bg       | `var(--sf-surface-alt)` | Subtle hover feedback      |

## Indentation

Each task group is assigned a dependency depth (0 = root, 1 = depends on a root task, etc.). Depth controls left padding.

| Property  | Value                         | Notes                                |
| --------- | ----------------------------- | ------------------------------------ |
| Unit      | 24px                          | Each level adds 24px of left padding |
| Max depth | 6                             | Capped at 144px maximum indentation  |
| Formula   | `padding-left = depth * 24px` |

## Dependency Lines

Thin connector lines are drawn on the left side to visually link parent tasks to their children.

| Property | Value                                       |
| -------- | ------------------------------------------- |
| Color    | `var(--sf-border)`                          |
| Width    | 1px                                         |
| Style    | Vertical and horizontal L-shaped connectors |

## Requirement Tags

Each task group displays its associated requirement IDs as inline tags at the end of the row.

| Property      | Value                   |
| ------------- | ----------------------- |
| Font size     | 11px                    |
| Font family   | `--sf-font-mono`        |
| Text color    | `--sf-text-muted`       |
| Background    | `var(--sf-surface-alt)` |
| Padding       | 2px 6px                 |
| Border radius | 3px                     |
| Display       | inline-flex             |

## Children

| Element                      | Role                           |
| ---------------------------- | ------------------------------ |
| ELM-049-task-group-card      | Row content for a task group   |
| ELM-050-task-status-badge    | Status badge at row start      |
| ELM-051-task-count-indicator | Sub-task count (if applicable) |

## Empty State

When the `groups` array is empty (after filtering), the list displays a centered, italicized, muted message:

> _No tasks to display._

Styled with `--sf-text-muted` color, centered text, and 48px vertical padding.

## Store Bindings

| Store                    | Selector              | Component Prop         |
| ------------------------ | --------------------- | ---------------------- |
| STR-007 task-board-store | `groups`              | `groups`               |
| STR-001 filter-store     | `tasks.statuses`      | Filter: statuses       |
| STR-001 filter-store     | `tasks.requirementId` | Filter: requirement ID |
| STR-001 filter-store     | `tasks.search`        | Filter: search         |

## Token Usage

| Token              | Usage                                |
| ------------------ | ------------------------------------ |
| `--sf-text`        | Task group name                      |
| `--sf-text-muted`  | Requirement tags, empty state        |
| `--sf-surface-alt` | Row hover background, tag background |
| `--sf-border`      | Dependency connector lines           |
| `--sf-font-body`   | Task group name text                 |
| `--sf-font-mono`   | Requirement tag text                 |

## Cross-References

- **Store:** STR-007-task-board-store (task group data)
- **Store:** STR-001-filter-store (task filters)
- **Element:** ELM-049-task-group-card (task row content)
- **Element:** ELM-050-task-status-badge (status badges)
- **Element:** ELM-051-task-count-indicator (sub-task counts)
- **Component:** CMP-013-kanban-board (alternative task view)
