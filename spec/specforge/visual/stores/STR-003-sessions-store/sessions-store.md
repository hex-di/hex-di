# STR-003 Sessions Store

## Overview

The Sessions Store holds the full list of sessions available to the user. It manages the loading lifecycle and provides sorted and filtered projections of the session list. This store is the data backbone for the session table on the home view.

## State Shape

```
SessionsState
+--------------------------------------------------------------+
| sessions   | Session[]                                       |
|            | The complete list of sessions loaded from the   |
|            | backend                                         |
+--------------+----------------------------------------------+
| isLoading  | boolean                                         |
|            | True while a sessions-load request is in flight |
+--------------------------------------------------------------+

Session
+--------------------------------------------------------------+
| sessionId      | string         (UUID)                       |
| packageName    | string         (@scope/package-name)        |
| specPath       | string         (relative file path)          |
| status         | "idle" | "active" | "discovery" |            |
|                | "spec-generation" | "implementation" |       |
|                | "completed" | "error"                        |
| createdAt      | string         (ISO-8601)                    |
| pipelineMode   | "discovery" | "spec" | "implementation"      |
| lastActivityAt | string         (ISO-8601)                    |
+--------------------------------------------------------------+
```

## Selectors

| Selector           | Signature         | Description                                                                                                          |
| ------------------ | ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| `sortedSessions`   | `() => Session[]` | Returns sessions sorted by `lastActivityAt` descending (most recent activity first).                                 |
| `filteredSessions` | `() => Session[]` | Applies the home view filters from `STR-001-filter-store` (status, pipelineMode, search) on top of `sortedSessions`. |

## Event Flow

| Event                     | Fields Affected     | Description                                                                  |
| ------------------------- | ------------------- | ---------------------------------------------------------------------------- |
| `EVT-003-session-created` | sessions (append)   | A newly created session is appended to the list.                             |
| `EVT-006-sessions-loaded` | sessions, isLoading | The full session list arrives from the backend. Replaces the array entirely. |
| `EVT-007-session-deleted` | sessions (remove)   | A session is removed from the list by matching `sessionId`.                  |

## Design Rationale

- **Separation from active session**: The sessions list (STR-003) and the active session (STR-002) are separate stores. The list is a collection concern; the active session is a selection concern. This prevents the common antipattern of mixing collection state with "which item is selected" state.
- **Full replacement on load**: `EVT-006-sessions-loaded` replaces the entire array rather than merging, avoiding stale-entry bugs when sessions are deleted externally.
- **Cross-store selector**: `filteredSessions` reads from both STR-003 (the data) and STR-001 (the filter criteria). This derived selector is re-computed whenever either store changes.
- **Sort by activity**: The default sort uses `lastActivityAt` rather than `createdAt`, surfacing sessions the user most recently interacted with at the top.
