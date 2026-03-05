# STR-007 Task Board Store

## Overview

The Task Board Store manages the task group data that powers the kanban board and DAG list views. Each task group represents a logical unit of work (e.g., "Implement auth module") with an aggregate status, task count, test count, and linked requirement IDs. The store provides selectors for grouping by status and computing completion metrics.

## State Shape

```
TaskBoardState
+--------------------------------------------------------------+
| groups | TaskGroupView[]                                      |
|        | Ordered list of task groups for the active session    |
+--------------------------------------------------------------+

TaskGroupView
+--------------------------------------------------------------+
| groupId        | string                                       |
|                | Unique identifier for the task group          |
+----------------+---------------------------------------------+
| name           | string                                       |
|                | Human-readable name (e.g. "Auth Module")     |
+----------------+---------------------------------------------+
| status         | "pending" | "in-progress" |                   |
|                | "completed" | "blocked"                      |
|                | Aggregate status of the group                |
+----------------+---------------------------------------------+
| taskCount      | number                                       |
|                | Total individual tasks in this group         |
+----------------+---------------------------------------------+
| testCount      | number                                       |
|                | Number of test files/suites in this group    |
+----------------+---------------------------------------------+
| requirementIds | string[]                                     |
|                | Spec requirement IDs this group satisfies    |
+--------------------------------------------------------------+
```

### Task Group Status

| Status        | Meaning                                                    |
| ------------- | ---------------------------------------------------------- |
| `pending`     | No work has started on this group.                         |
| `in-progress` | At least one task in the group is being worked on.         |
| `completed`   | All tasks in the group have been completed and tests pass. |
| `blocked`     | The group cannot proceed due to a dependency or error.     |

## Selectors

| Selector            | Signature                               | Description                                                                                                                                      |
| ------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `groupsByStatus`    | `() => Record<Status, TaskGroupView[]>` | Partitions groups into four arrays keyed by status: `pending`, `inProgress`, `completed`, `blocked`. Used by the kanban board to render columns. |
| `totalTasks`        | `() => number`                          | Sums `taskCount` across all groups. Displayed in the task view header.                                                                           |
| `completionPercent` | `() => number`                          | `(completed groups / total groups) * 100`, rounded to the nearest integer. Returns 0 when no groups exist.                                       |

## Event Flow

| Event                               | Fields Affected                 | Description                                                          |
| ----------------------------------- | ------------------------------- | -------------------------------------------------------------------- |
| `EVT-021-task-groups-loaded`        | groups (full replace)           | The complete task group list arrives from the backend.               |
| `EVT-022-task-group-status-changed` | groups[matching].status         | A single group's status transitions (e.g., pending to in-progress).  |
| `EVT-023-task-group-updated`        | groups[matching] (full replace) | A group's data is refreshed (counts, requirements may have changed). |

## Design Rationale

- **Group-level granularity**: The store operates at the task-group level, not individual tasks. Individual task details are loaded on demand when a user expands a group. This keeps the store lightweight and the kanban board performant.
- **Status-based partitioning**: The `groupsByStatus` selector directly maps to kanban columns, making the board component a thin rendering layer over the store's output.
- **Separate status event**: `EVT-022` handles the common case of a status-only change without replacing the entire group object, reducing unnecessary re-renders.
- **Requirement traceability**: Each group carries `requirementIds` linking back to spec requirements. This enables the coverage view (STR-008) to show which requirements have associated implementation work.
