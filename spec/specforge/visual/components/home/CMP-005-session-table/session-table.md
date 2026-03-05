# CMP-005 Session Table

**ID:** CMP-005-session-table
**Context:** Home view -- primary content area displaying all available sessions.

---

## Overview

The Session Table is the main data display component on the home view. It renders a tabular list of all sessions with columns for Package, Spec Path, Status, Mode, and Last Activity. Each row is interactive: clicking selects the session, and action buttons allow deletion or resumption.

## ASCII Mockup

```
 Session Table (full width of content area)
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  Package          Spec Path           Status      Mode         Last Activity│
 │  ─────────────────────────────────────────────────────────────────────────  │
 │                                                                             │
 │  ELM-022 Session Table Row                                                  │
 │  ┌─────────────────────────────────────────────────────────────────────────┐│
 │  │ @scope/pkg-a    specs/auth.md      [active]   discovery    2 min ago   ││
 │  │                                     ELM-023               ELM-027 [x]  ││
 │  │                                     badge                 ELM-028 [>]  ││
 │  └─────────────────────────────────────────────────────────────────────────┘│
 │  ┌─────────────────────────────────────────────────────────────────────────┐│
 │  │ @scope/pkg-b    specs/flow.md      [completed] spec        1 hr ago    ││
 │  └─────────────────────────────────────────────────────────────────────────┘│
 │  ┌─────────────────────────────────────────────────────────────────────────┐│
 │  │ @scope/pkg-c    specs/guard.md     [error]     impl        3 hrs ago   ││
 │  └─────────────────────────────────────────────────────────────────────────┘│
 │                                                                             │
 └─────────────────────────────────────────────────────────────────────────────┘

 Empty state:
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                                                                             │
 │                                                                             │
 │              No sessions found. Create one to get started.                  │
 │                                                                             │
 │                                                                             │
 └─────────────────────────────────────────────────────────────────────────────┘
```

## Columns

| Column        | Field            | Width | Sortable | Notes                                     |
| ------------- | ---------------- | ----- | -------- | ----------------------------------------- |
| Package       | `packageName`    | flex  | No       | `@scope/name` format                      |
| Spec Path     | `specPath`       | flex  | No       | Relative file path, truncated w/ ellipsis |
| Status        | `status`         | 120px | No       | Rendered via ELM-023 status badge         |
| Mode          | `pipelineMode`   | 120px | No       | "discovery", "spec", "implementation"     |
| Last Activity | `lastActivityAt` | 160px | Yes      | Relative time format ("2 min ago")        |

## Sorting

The table supports client-side sorting via column header interaction.

| Sort Option   | Field            | Direction  | Default |
| ------------- | ---------------- | ---------- | ------- |
| Last Activity | `lastActivityAt` | Descending | Yes     |
| Created Date  | `createdAt`      | Descending | No      |
| Package Name  | `packageName`    | Ascending  | No      |

Default sort is **Last Activity descending**, surfacing the most recently active sessions at the top. Sort state is derived from `STR-001-filter-store` `home.sort` field.

## Row Interactions

- **Click row**: Selects the session, invoking `onSelectSession(sessionId)`.
- **Delete button** (ELM-027): Invokes `onDeleteSession(sessionId)`. Positioned at row end.
- **Resume button** (ELM-028): Invokes `onResumeSession(sessionId)`. Visible only for paused/idle sessions.

## Store Bindings

| Store                  | Selector            | Component Prop        |
| ---------------------- | ------------------- | --------------------- |
| STR-003 sessions-store | `sortedSessions`    | `sessions`            |
| STR-001 filter-store   | `home.status`       | Filter: status        |
| STR-001 filter-store   | `home.pipelineMode` | Filter: pipeline mode |
| STR-001 filter-store   | `home.search`       | Filter: search query  |
| STR-001 filter-store   | `home.sort`         | Sort field selection  |

## Empty State

When the `sessions` array is empty (after filtering), the table body is replaced with a centered, muted text message:

> "No sessions found. Create one to get started."

Styled with `--sf-text-muted` color and 48px vertical padding.

## Token Usage

| Token              | Usage                       |
| ------------------ | --------------------------- |
| `--sf-text-muted`  | Column headers, empty state |
| `--sf-text`        | Row text content            |
| `--sf-surface-alt` | Alternating row backgrounds |
| `--sf-border`      | Row separator lines         |
| `--sf-font-body`   | All table text              |

## Cross-References

- **Store:** STR-003-sessions-store (session data)
- **Store:** STR-001-filter-store (filter and sort state)
- **Element:** ELM-022-session-table-row (row container)
- **Element:** ELM-023-session-status-badge (status display)
- **Element:** ELM-027-session-delete-button (delete action)
- **Element:** ELM-028-session-resume-button (resume action)
- **Component:** CMP-006-new-session-form (sibling on home view)
